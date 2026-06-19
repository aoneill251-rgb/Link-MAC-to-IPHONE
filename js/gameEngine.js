class GameEngine {
  constructor() {
    this.state = null;
    this.ui = null;
  }

  newGame(stableName, difficulty = "normal", silksColor = "#f59e0b", silksSecondary = "#000000") {
    const diffSettings = {
      easy: { startMoney: 200000, startHorses: 4, startQuality: 50 },
      normal: { startMoney: 100000, startHorses: 3, startQuality: 40 },
      hard: { startMoney: 50000, startHorses: 2, startQuality: 30 },
    };
    const diff = diffSettings[difficulty] || diffSettings.normal;

    const horses = [];
    for (let i = 0; i < diff.startHorses; i++) {
      horses.push(
        HorseGenerator.generateHorse({
          quality: diff.startQuality + Math.floor(Math.random() * 15),
          owner: "player",
          fitness: 50 + Math.floor(Math.random() * 20),
          morale: 60 + Math.floor(Math.random() * 20),
        })
      );
    }

    const jockeys = this.generateJockeyPool();

    this.state = {
      stableName,
      difficulty,
      silksColor: silksColor || "#f59e0b",
      silksSecondary: silksSecondary || "#000000",
      horses,
      jockeys,
      retainedJockeys: [],
      calendar: { year: 2026, month: 0, week: 1 },
      finances: {
        balance: diff.startMoney,
        totalEarnings: 0,
        totalExpenses: 0,
        history: [],
      },
      currentRaces: [],
      raceResults: [],
      achievements: [],
      stats: {
        totalWins: 0,
        totalRaces: 0,
        groupWins: 0,
        champWins: 0,
        bestRating: 0,
        yearlyWins: {},
      },
      notifications: [],
      auctionHorses: [],
      playerAuctionHorses: [],
      breedingStallions: [],
      gameOver: false,
      weekLog: [],
    };

    this.generateWeeklyContent();
    return this.state;
  }

  generateJockeyPool() {
    const allFlat = GAME_DATA.realJockeys.flat.map((j) => HorseGenerator.createJockeyFromReal(j));
    const allNH = GAME_DATA.realJockeys.nh.map((j) => HorseGenerator.createJockeyFromReal(j));
    return [...allFlat, ...allNH];
  }

  generateWeeklyContent() {
    this.state.currentRaces = RaceEngine.generateRaceCard(this.state);
    this.generateAuction();
    this.generateBreedingStallions();
  }

  generateAuction() {
    const numLots = 6 + Math.floor(Math.random() * 6);
    this.state.auctionHorses = [];
    for (let i = 0; i < numLots; i++) {
      const quality = 20 + Math.floor(Math.random() * 60);
      const age = 1 + Math.floor(Math.random() * 6);
      const horse = HorseGenerator.generateHorse({ quality, age, owner: "auction" });
      horse.auctionPrice = HorseGenerator.calculateValue(horse);
      horse.reservePrice = Math.floor(horse.auctionPrice * (0.7 + Math.random() * 0.3));
      this.state.auctionHorses.push(horse);
    }
  }

  generateBreedingStallions() {
    this.state.breedingStallions = [];
    for (let i = 0; i < 5; i++) {
      const quality = 50 + Math.floor(Math.random() * 45);
      const stallion = HorseGenerator.generateHorse({ quality, age: 5 + Math.floor(Math.random() * 8), sex: "Colt" });
      stallion.studFee = Math.floor(quality * 100 + Math.random() * 2000);
      this.state.breedingStallions.push(stallion);
    }
  }

  advanceWeek() {
    const updates = [];
    this.state.weekLog = [];

    const expenses = this.calculateWeeklyExpenses();
    this.state.finances.balance -= expenses;
    this.state.finances.totalExpenses += expenses;

    for (const horse of this.state.horses) {
      if (horse.injured) {
        horse.injuryWeeksLeft--;
        if (horse.injuryWeeksLeft <= 0) {
          horse.injured = false;
          horse.injuryWeeksLeft = 0;
          horse.fitness = 30;
          updates.push({ text: `${horse.name} has recovered from injury!`, type: "recovery" });
        }
        continue;
      }

      const regime = GAME_DATA.trainingRegimes.find((r) => r.id === horse.training) || GAME_DATA.trainingRegimes[1];

      horse.fitness = Math.max(0, Math.min(100, horse.fitness + regime.fitnessChange));
      horse.morale = Math.max(0, Math.min(100, horse.morale + regime.moraleChange));
      horse.health = Math.min(100, horse.health + 2);

      if (horse.maturity < 1) {
        horse.maturity = Math.min(1, horse.maturity + 0.005 + Math.random() * 0.005);
        const gain = Math.floor(regime.speedChange * horse.maturity);
        horse.stats.speed = Math.min(horse.potential, horse.stats.speed + gain);
        horse.stats.stamina = Math.min(horse.potential, horse.stats.stamina + Math.floor(regime.staminaChange * 0.5));
      } else {
        horse.stats.speed = Math.min(100, horse.stats.speed + Math.floor(regime.speedChange * 0.3));
        horse.stats.stamina = Math.min(100, horse.stats.stamina + Math.floor(regime.staminaChange * 0.3));
      }

      if (Math.random() < regime.healthRisk) {
        const severity = Math.random();
        if (severity > 0.7) {
          const weeks = 2 + Math.floor(Math.random() * 6);
          horse.injured = true;
          horse.injuryWeeksLeft = weeks;
          horse.training = "rest";
          updates.push({ text: `${horse.name} injured in training! Out for ${weeks} weeks.`, type: "injury" });
        } else {
          horse.health = Math.max(50, horse.health - 10);
          updates.push({ text: `${horse.name} picked up a minor knock in training.`, type: "warning" });
        }
      }

      if (horse.age > 10 && Math.random() < 0.02) {
        horse.stats.speed = Math.max(1, horse.stats.speed - 1);
        horse.stats.stamina = Math.max(1, horse.stats.stamina - 1);
      }
    }

    this.state.calendar.week++;
    if (this.state.calendar.week > 4) {
      this.state.calendar.week = 1;
      this.state.calendar.month++;
      if (this.state.calendar.month >= 12) {
        this.state.calendar.month = 0;
        this.state.calendar.year++;
        this.processYearEnd(updates);
      }
    }

    if (this.state.finances.balance < -50000) {
      updates.push({ text: "You are deeply in debt! Consider selling horses.", type: "danger" });
    }

    this.processAuctions(updates);
    this.generateWeeklyContent();
    this.state.notifications = updates;
    this.state.weekLog = updates;

    this.saveGame();
    return updates;
  }

  processYearEnd(updates) {
    for (const horse of this.state.horses) {
      horse.age++;
      const retireAge = horse.stats.jumping > 40 ? GAME_DATA.rules.retirementAgeNH : GAME_DATA.rules.retirementAgeFlat;
      if (horse.age > retireAge) {
        updates.push({ text: `${horse.name} (age ${horse.age}) should be retired.`, type: "warning" });
      }
    }
    const wins = this.state.stats.totalWins;
    updates.push({ text: `Year ${this.state.calendar.year - 1} complete! Total career wins: ${wins}`, type: "info" });
  }

  calculateWeeklyExpenses() {
    const horseCount = this.state.horses.length;
    const retainerCost = this.state.retainedJockeys.reduce((sum, j) => sum + j.retainerFee, 0);
    return horseCount * GAME_DATA.weeklyExpenses.perHorse +
      GAME_DATA.weeklyExpenses.stableUpkeep +
      retainerCost;
  }

  buyHorse(horse) {
    const price = horse.auctionPrice || HorseGenerator.calculateValue(horse);
    if (this.state.finances.balance < price) {
      return { success: false, message: "Not enough funds!" };
    }
    if (this.state.horses.length >= 20) {
      return { success: false, message: "Stable is full! (max 20 horses)" };
    }
    this.state.finances.balance -= price;
    this.state.finances.totalExpenses += price;
    horse.owner = "player";
    horse.training = "light";
    horse.trainer = null;
    horse.aiOwner = null;
    this.state.horses.push(horse);
    this.state.auctionHorses = this.state.auctionHorses.filter((h) => h.id !== horse.id);
    this.saveGame();
    return { success: true, message: `${horse.name} purchased for £${price.toLocaleString()}!` };
  }

  sellHorse(horseId) {
    const idx = this.state.horses.findIndex((h) => h.id === horseId);
    if (idx === -1) return { success: false, message: "Horse not found" };
    const horse = this.state.horses[idx];
    const value = HorseGenerator.calculateValue(horse);
    horse.auctionPrice = value;
    horse.reservePrice = Math.floor(value * 0.7);
    horse.owner = "player-auction";
    horse.auctionWeeksLeft = 2;
    horse.currentBid = 0;
    horse.bidderName = null;
    if (!this.state.playerAuctionHorses) this.state.playerAuctionHorses = [];
    this.state.playerAuctionHorses.push(horse);
    this.state.horses.splice(idx, 1);
    this.saveGame();
    return { success: true, message: `${horse.name} sent to auction! Guide price: £${value.toLocaleString()}. Bidding runs for 2 weeks.` };
  }

  processAuctions(updates) {
    if (!this.state.playerAuctionHorses) this.state.playerAuctionHorses = [];
    for (const horse of this.state.playerAuctionHorses) {
      const value = horse.auctionPrice || HorseGenerator.calculateValue(horse);
      const interest = Math.random();
      if (interest > 0.3) {
        const bidAmount = Math.floor(value * (0.6 + Math.random() * 0.6));
        if (bidAmount > horse.currentBid) {
          const bidder = HorseGenerator.pickOwner();
          horse.currentBid = bidAmount;
          horse.bidderName = bidder.name;
        }
      }
      horse.auctionWeeksLeft--;
    }
    const sold = this.state.playerAuctionHorses.filter((h) => h.auctionWeeksLeft <= 0);
    for (const horse of sold) {
      if (horse.currentBid >= horse.reservePrice) {
        this.state.finances.balance += horse.currentBid;
        this.state.finances.totalEarnings += horse.currentBid;
        updates.push({ text: `${horse.name} SOLD at auction to ${horse.bidderName} for £${horse.currentBid.toLocaleString()}!`, type: "success" });
      } else {
        horse.owner = "player";
        horse.auctionPrice = undefined;
        horse.reservePrice = undefined;
        horse.currentBid = undefined;
        horse.bidderName = undefined;
        horse.auctionWeeksLeft = undefined;
        this.state.horses.push(horse);
        updates.push({ text: `${horse.name} failed to sell at auction (reserve not met). Returned to stable.`, type: "warning" });
      }
    }
    this.state.playerAuctionHorses = this.state.playerAuctionHorses.filter((h) => h.auctionWeeksLeft > 0);
  }

  retainJockey(jockey) {
    if (this.state.retainedJockeys.length >= 5) {
      return { success: false, message: "Max 5 retained jockeys" };
    }
    if (this.state.retainedJockeys.find((j) => j.id === jockey.id)) {
      return { success: false, message: "Already retained" };
    }
    this.state.retainedJockeys.push(jockey);
    this.state.jockeys = this.state.jockeys.filter((j) => j.id !== jockey.id);
    this.saveGame();
    return { success: true, message: `${jockey.name} retained! (£${jockey.retainerFee.toLocaleString()}/week)` };
  }

  releaseJockey(jockeyId) {
    const jockey = this.state.retainedJockeys.find((j) => j.id === jockeyId);
    if (jockey) {
      this.state.jockeys.push(jockey);
    }
    this.state.retainedJockeys = this.state.retainedJockeys.filter((j) => j.id !== jockeyId);
    this.saveGame();
    return { success: true };
  }

  breedHorse(dam, stallion) {
    if (dam.sex !== "Filly") return { success: false, message: "Only fillies/mares can breed" };
    if (dam.age < 4) return { success: false, message: "Too young to breed (min 4)" };
    const currentMonth = this.state.calendar.month;
    if (!GAME_DATA.rules.breedingSeason.includes(currentMonth)) {
      return { success: false, message: `Breeding season is February-June only (currently ${GAME_DATA.months[currentMonth]})` };
    }
    const fee = stallion.studFee || 5000;
    if (this.state.finances.balance < fee) return { success: false, message: "Can't afford stud fee" };
    if (this.state.horses.length >= 20) return { success: false, message: "Stable full!" };

    this.state.finances.balance -= fee;
    this.state.finances.totalExpenses += fee;

    const foal = HorseGenerator.breedHorse(stallion, dam);
    foal.owner = "player";
    foal.age = 1;
    this.state.horses.push(foal);
    this.saveGame();
    return { success: true, message: `A new foal is born: ${foal.name}! (by ${stallion.name} out of ${dam.name})`, foal };
  }

  enterRace(raceId, horseId, jockeyId) {
    const race = this.state.currentRaces.find((r) => r.id === raceId);
    const horse = this.state.horses.find((h) => h.id === horseId);
    if (!race || !horse) return { success: false, message: "Race or horse not found" };

    const check = RaceEngine.canEnterRace(horse, race, this.state);
    if (!check.ok) return { success: false, message: check.reason };

    if (race.playerEntries.find((e) => e.horse.id === horseId)) {
      return { success: false, message: "Horse already entered" };
    }

    const jockey = jockeyId
      ? this.state.retainedJockeys.find((j) => j.id === jockeyId) || this.state.jockeys.find((j) => j.id === jockeyId)
      : this.state.jockeys[Math.floor(Math.random() * this.state.jockeys.length)];

    const weight = HorseGenerator.calculateWeight(horse, race);
    const entryFee = Math.floor(race.prize * 0.02);
    this.state.finances.balance -= entryFee;

    race.playerEntries.push({ horse, jockey, weight });
    this.saveGame();
    return {
      success: true,
      message: `${horse.name} entered with ${jockey?.name || "freelance jockey"} (${HorseGenerator.formatWeight(weight)}). Entry fee: £${entryFee.toLocaleString()}`,
    };
  }

  runRace(raceId) {
    const race = this.state.currentRaces.find((r) => r.id === raceId);
    if (!race) return null;
    if (race.playerEntries.length === 0 && race.runners.length === 0) return null;

    const allRunners = [...race.runners, ...race.playerEntries];
    const result = RaceEngine.simulateRace(allRunners, race.distance, race.ground, race.track);

    const updates = RaceEngine.processRaceResults(result.results, race, this.state);

    for (const res of result.results) {
      if (res.horse.owner === "player" && res.position === 1) {
        this.state.stats.totalWins++;
        if (race.isChampionship) this.state.stats.champWins++;
        if (race.class.class <= 0) this.state.stats.groupWins++;
      }
      if (res.horse.owner === "player") {
        this.state.stats.totalRaces++;
        if (res.horse.rating > this.state.stats.bestRating) {
          this.state.stats.bestRating = res.horse.rating;
        }
      }
    }

    result.race = race;
    result.updates = updates;
    this.state.raceResults.push({
      raceName: race.name,
      track: race.track,
      date: `${GAME_DATA.months[this.state.calendar.month]} ${this.state.calendar.year}`,
      top3: result.results.slice(0, 3).map((r) => ({
        name: r.horse.name,
        jockey: r.jockey?.name,
        trainer: r.horse.trainer,
        owner: r.horse.aiOwner || (r.horse.owner === "player" ? this.state.stableName : ""),
        weight: r.weight,
      })),
    });

    if (this.state.raceResults.length > 50) {
      this.state.raceResults = this.state.raceResults.slice(-50);
    }

    this.saveGame();
    return result;
  }

  saveGame() {
    try {
      localStorage.setItem("startersOrders_save", JSON.stringify(this.state));
    } catch {}
  }

  loadGame() {
    try {
      const data = localStorage.getItem("startersOrders_save");
      if (data) {
        this.state = JSON.parse(data);
        const maxId = this.findMaxId(this.state);
        HorseGenerator.nextId = maxId + 1;
        return true;
      }
    } catch {}
    return false;
  }

  findMaxId(obj) {
    let max = 0;
    if (typeof obj === "object" && obj !== null) {
      if (obj.id && typeof obj.id === "number") max = Math.max(max, obj.id);
      for (const val of Object.values(obj)) {
        max = Math.max(max, this.findMaxId(val));
      }
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        max = Math.max(max, this.findMaxId(item));
      }
    }
    return max;
  }
}
