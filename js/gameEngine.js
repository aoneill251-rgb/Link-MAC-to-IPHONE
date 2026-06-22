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
    const numFlat = Math.ceil(diff.startHorses / 2);
    const numNH = diff.startHorses - numFlat;
    for (let i = 0; i < numFlat; i++) {
      horses.push(
        HorseGenerator.generateHorse({
          quality: diff.startQuality + Math.floor(Math.random() * 15),
          owner: "player",
          type: "flat",
          fitness: 50 + Math.floor(Math.random() * 20),
          morale: 60 + Math.floor(Math.random() * 20),
        })
      );
    }
    for (let i = 0; i < numNH; i++) {
      horses.push(
        HorseGenerator.generateHorse({
          quality: diff.startQuality + Math.floor(Math.random() * 15),
          owner: "player",
          type: "nh",
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
      baseCountry: "GB",
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
      stableView: "all",
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
      patronHorses: [],
      patronageReputation: 0,
      bets: [],
      activeBets: [],
      betHistory: [],
      antePostBets: [],
      bettingBalance: 5000,
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

    const totalWeek = this.state.calendar.year * 52 + this.state.calendar.month * 4 + this.state.calendar.week;
    if (totalWeek % (GAME_DATA.patronageThresholds.checkInterval || 4) === 0) {
      this.checkPatronage(updates);
    }

    this.generateWeeklyContent();
    this.state.notifications = updates;
    this.state.weekLog = updates;

    this.saveGame();
    return updates;
  }

  processYearEnd(updates) {
    for (const horse of this.state.horses) {
      horse.age++;
      const retireAge = horse.type === "nh" ? GAME_DATA.rules.retirementAgeNH : GAME_DATA.rules.retirementAgeFlat;
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

  // ── Owner Patronage System ──
  checkPatronage(updates) {
    const thresholds = GAME_DATA.patronageThresholds;
    const totalRaces = this.state.stats.totalRaces;
    const winRate = totalRaces > 0 ? this.state.stats.totalWins / totalRaces : 0;
    const patronCount = (this.state.patronHorses || []).length;

    if (patronCount >= thresholds.maxPatronHorses) return;
    if (winRate < thresholds.minWinRate && this.state.stats.totalWins < thresholds.minTotalWins) return;
    if (this.state.stats.groupWins < thresholds.minGroupWins && winRate < 0.2) return;

    const chance = Math.min(0.4, winRate * 0.5 + this.state.stats.groupWins * 0.05);
    if (Math.random() > chance) return;

    const eligibleOwners = GAME_DATA.realOwners.filter((o) =>
      !(this.state.patronHorses || []).find((ph) => ph.patronOwner === o.name)
    );
    if (eligibleOwners.length === 0) return;

    const owner = eligibleOwners[Math.floor(Math.random() * eligibleOwners.length)];
    const type = owner.specialty === "nh" ? "nh" : owner.specialty === "flat" ? "flat" : (Math.random() > 0.5 ? "flat" : "nh");
    const quality = 50 + Math.floor(Math.random() * 40);
    const horse = HorseGenerator.generateHorse({ quality, type, owner: "patron" });
    horse.patronOwner = owner.name;
    horse.patronSilksColor = owner.silksColor;
    horse.patronSilksSecondary = owner.silksSecondary;
    horse.training = "light";
    horse.trainer = this.state.stableName;

    if (!this.state.patronHorses) this.state.patronHorses = [];
    this.state.patronHorses.push(horse);
    this.state.horses.push(horse);
    this.state.patronageReputation = (this.state.patronageReputation || 0) + 1;

    updates.push({
      text: `${owner.name} has sent ${horse.name} (${type.toUpperCase()}, R${horse.rating}) to your stable! Running in their silks.`,
      type: "success",
    });
  }

  // ── Betting System ──
  generateOdds(runners, raceDistance, ground) {
    const abilities = runners.map((r) => {
      const ability = HorseGenerator.getOverallAbility(r.horse, raceDistance, ground, r.weight || 126);
      const jockeyBonus = r.jockey ? r.jockey.skill * 0.1 : 0;
      return ability + jockeyBonus + Math.random() * 5;
    });

    const maxAbility = Math.max(...abilities);
    const odds = abilities.map((a) => {
      const raw = maxAbility / a;
      const margin = 1.15 + Math.random() * 0.1;
      return Math.max(1.1, raw * margin * (1 + Math.random() * 0.3));
    });

    return odds.map((o) => {
      if (o < 2) return { decimal: parseFloat(o.toFixed(2)), fractional: `${Math.round((o - 1) * 4)}/4` };
      if (o < 3) return { decimal: parseFloat(o.toFixed(2)), fractional: `${Math.round(o - 1)}/1` };
      if (o < 10) return { decimal: parseFloat(o.toFixed(1)), fractional: `${Math.round(o - 1)}/1` };
      return { decimal: parseFloat(o.toFixed(1)), fractional: `${Math.round(o - 1)}/1` };
    });
  }

  placeBet(bet) {
    if (!this.state.bettingBalance) this.state.bettingBalance = 5000;
    if (bet.stake > this.state.bettingBalance) {
      return { success: false, message: "Insufficient betting funds" };
    }
    if (bet.stake < 1) return { success: false, message: "Minimum bet is £1" };

    this.state.bettingBalance -= bet.stake;
    bet.id = HorseGenerator.nextId++;
    bet.placed = `Week ${this.state.calendar.week}, ${GAME_DATA.months[this.state.calendar.month]} ${this.state.calendar.year}`;
    bet.settled = false;

    if (bet.antePost) {
      if (!this.state.antePostBets) this.state.antePostBets = [];
      this.state.antePostBets.push(bet);
    } else {
      if (!this.state.activeBets) this.state.activeBets = [];
      this.state.activeBets.push(bet);
    }

    this.saveGame();
    return { success: true, message: `Bet placed: £${bet.stake} ${bet.type} on ${bet.horseName} at ${bet.odds.fractional}` };
  }

  settleBets(raceId, results) {
    if (!this.state.activeBets) return [];
    const settled = [];
    const raceBets = this.state.activeBets.filter((b) => b.raceId === raceId);

    for (const bet of raceBets) {
      bet.settled = true;
      const horseResult = results.find((r) => r.horse.id === bet.horseId);
      if (!horseResult) { bet.won = false; settled.push(bet); continue; }

      let winnings = 0;
      const position = horseResult.position;

      if (bet.type === "win") {
        if (position === 1) {
          winnings = bet.stake * bet.odds.decimal;
          bet.won = true;
        }
      } else if (bet.type === "place") {
        if (position <= 3) {
          winnings = bet.stake * (1 + (bet.odds.decimal - 1) / 4);
          bet.won = true;
        }
      } else if (bet.type === "eachway") {
        const halfStake = bet.stake / 2;
        if (position === 1) {
          winnings = halfStake * bet.odds.decimal + halfStake * (1 + (bet.odds.decimal - 1) / 4);
          bet.won = true;
        } else if (position <= 3) {
          winnings = halfStake * (1 + (bet.odds.decimal - 1) / 4);
          bet.won = true;
        }
      } else if (bet.type === "forecast") {
        if (position === 1 && bet.secondHorseId) {
          const second = results.find((r) => r.horse.id === bet.secondHorseId);
          if (second && second.position === 2) {
            winnings = bet.stake * bet.odds.decimal * 3;
            bet.won = true;
          }
        }
      } else if (bet.type === "tricast") {
        if (position === 1 && bet.secondHorseId && bet.thirdHorseId) {
          const second = results.find((r) => r.horse.id === bet.secondHorseId);
          const third = results.find((r) => r.horse.id === bet.thirdHorseId);
          if (second && second.position === 2 && third && third.position === 3) {
            winnings = bet.stake * bet.odds.decimal * 8;
            bet.won = true;
          }
        }
      }

      bet.winnings = Math.floor(winnings);
      if (!bet.won) bet.won = false;
      if (bet.winnings > 0) this.state.bettingBalance += bet.winnings;
      settled.push(bet);
    }

    this.state.activeBets = this.state.activeBets.filter((b) => !b.settled);
    if (!this.state.betHistory) this.state.betHistory = [];
    this.state.betHistory.push(...settled);
    if (this.state.betHistory.length > 100) this.state.betHistory = this.state.betHistory.slice(-100);

    this.saveGame();
    return settled;
  }

  settleAntePostBets(raceName, results) {
    if (!this.state.antePostBets) return [];
    const settled = [];
    const matching = this.state.antePostBets.filter((b) => b.raceName === raceName);

    for (const bet of matching) {
      bet.settled = true;
      const winner = results[0];
      if (winner && winner.horse.name === bet.horseName) {
        bet.won = true;
        bet.winnings = Math.floor(bet.stake * bet.odds.decimal);
        this.state.bettingBalance += bet.winnings;
      } else {
        bet.won = false;
        bet.winnings = 0;
      }
      settled.push(bet);
    }

    this.state.antePostBets = this.state.antePostBets.filter((b) => !b.settled);
    if (!this.state.betHistory) this.state.betHistory = [];
    this.state.betHistory.push(...settled);
    this.saveGame();
    return settled;
  }

  getInternationalRaces() {
    const base = this.state.baseCountry || "GB";
    return GAME_DATA.championRaces.filter((r) => r.country !== base);
  }

  getLocalRaces() {
    const base = this.state.baseCountry || "GB";
    return GAME_DATA.championRaces.filter((r) => r.country === base);
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

    const settledBets = this.settleBets(raceId, result.results);
    if (race.isChampionship) {
      this.settleAntePostBets(race.name, result.results);
    }
    result.settledBets = settledBets;

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
