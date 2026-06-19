class RaceEngine {
  static simulateRace(runners, raceDistance, ground, trackName) {
    const numSteps = 200;
    const positions = [];
    const commentary = [];

    const runnerStates = runners.map((r) => {
      const weight = r.weight || GAME_DATA.rules.baseWeight;
      const ability = HorseGenerator.getOverallAbility(r.horse, raceDistance, ground, weight);
      const jockeyBonus = r.jockey ? r.jockey.skill * 0.15 : 0;
      const totalAbility = ability + jockeyBonus;
      const temperamentRoll = r.horse.stats.temperament / 100;

      let style = r.jockey?.style || "versatile";
      const styleFactors = {
        "front-runner": { early: 1.15, mid: 1.0, late: 0.9 },
        stalker: { early: 0.95, mid: 1.1, late: 1.05 },
        closer: { early: 0.85, mid: 0.95, late: 1.25 },
        versatile: { early: 1.0, mid: 1.0, late: 1.0 },
      };

      return {
        horse: r.horse,
        jockey: r.jockey,
        weight,
        ability: totalAbility,
        position: 0,
        finished: false,
        finishStep: null,
        style: styleFactors[style] || styleFactors.versatile,
        temperament: temperamentRoll,
        fatigue: 0,
        staminaFactor: r.horse.stats.stamina / 100,
        accelFactor: r.horse.stats.acceleration / 100,
        luck: 0.95 + Math.random() * 0.1,
      };
    });

    for (let step = 0; step < numSteps; step++) {
      const progress = step / numSteps;
      let phaseFactor;
      if (progress < 0.3) phaseFactor = "early";
      else if (progress < 0.7) phaseFactor = "mid";
      else phaseFactor = "late";

      for (const rs of runnerStates) {
        if (rs.finished) continue;

        const baseSpeed = (rs.ability / numSteps) * 3;
        const styleMult = rs.style[phaseFactor];

        let fatiguePenalty = 1;
        if (progress > 0.5) {
          const fatigueRate = 1 - rs.staminaFactor * 0.5;
          rs.fatigue += fatigueRate * 0.01;
          fatiguePenalty = Math.max(0.7, 1 - rs.fatigue);
        }

        const accelBoost = phaseFactor === "late" ? 1 + rs.accelFactor * 0.15 : 1;
        const tempRoll = rs.temperament > Math.random() ? 1 : 0.92 + Math.random() * 0.05;
        const randomness = 0.97 + Math.random() * 0.06;

        const speed = baseSpeed * styleMult * fatiguePenalty * accelBoost * tempRoll * randomness * rs.luck;
        rs.position += speed;

        if (rs.position >= 100 && !rs.finished) {
          rs.finished = true;
          rs.finishStep = step + (100 - (rs.position - speed)) / speed;
        }
      }

      const snapshot = runnerStates.map((rs) => ({
        id: rs.horse.id,
        position: Math.min(100, rs.position),
        finished: rs.finished,
      }));
      positions.push(snapshot);

      if (step === Math.floor(numSteps * 0.02)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        const jName = sorted[0].jockey ? ` under ${sorted[0].jockey.name}` : "";
        commentary.push({ step, text: `They're off! ${sorted[0].horse.name}${jName} breaks quickly from the stalls.` });
      }
      if (step === Math.floor(numSteps * 0.25)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        commentary.push({ step, text: `Into the first quarter — ${sorted[0].horse.name} leads from ${sorted[1].horse.name} and ${sorted[2]?.horse.name || "the pack"}.` });
      }
      if (step === Math.floor(numSteps * 0.5)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        commentary.push({ step, text: `Halfway now. ${sorted[0].horse.name} still at the head of affairs. The field is tightly bunched behind.` });
      }
      if (step === Math.floor(numSteps * 0.75)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        const gap = sorted[0].position - sorted[1].position;
        const gapText = gap > 3 ? "clear daylight" : gap > 1 ? "a narrow advantage" : "barely a nose";
        const j2 = sorted[1].jockey ? `${sorted[1].jockey.name} on ` : "";
        commentary.push({ step, text: `Turning for home! ${sorted[0].horse.name} has ${gapText}. ${j2}${sorted[1].horse.name} beginning to challenge!` });
      }
      if (step === Math.floor(numSteps * 0.9)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        const j1 = sorted[0].jockey ? `${sorted[0].jockey.name} drives ` : "";
        commentary.push({ step, text: `Inside the final furlong! ${j1}${sorted[0].horse.name} — ${sorted[1].horse.name} closing fast!` });
      }
    }

    for (const rs of runnerStates) {
      if (!rs.finished) {
        rs.finishStep = numSteps + (100 - rs.position);
      }
    }

    const sortedResults = [...runnerStates].sort((a, b) => a.finishStep - b.finishStep);
    const results = sortedResults.map((rs, idx) => {
      const gap = idx === 0 ? 0 : rs.finishStep - sortedResults[0].finishStep;
      let gapText = "";
      if (idx > 0) {
        if (gap < 0.5) gapText = "short head";
        else if (gap < 1) gapText = "head";
        else if (gap < 2) gapText = "neck";
        else if (gap < 3) gapText = "half length";
        else if (gap < 5) gapText = `${Math.max(1, Math.floor(gap / 2))} length${gap >= 4 ? "s" : ""}`;
        else gapText = `${Math.floor(gap / 2)} lengths`;
      }
      return {
        position: idx + 1,
        horse: rs.horse,
        jockey: rs.jockey,
        weight: rs.weight,
        gap: gapText,
        finishStep: rs.finishStep,
      };
    });

    const winner = results[0];
    const wJ = winner.jockey ? ` (${winner.jockey.name})` : "";
    commentary.push({
      step: numSteps,
      text: `${winner.horse.name}${wJ} wins${results[1] ? ` by ${results[1].gap || "a short head"} from ${results[1].horse.name}` : ""}! ${results[2] ? results[2].horse.name + " finishes third." : ""}`,
    });

    return { positions, results, commentary };
  }

  static generateRaceCard(gameState) {
    const { week, month } = gameState.calendar;
    const races = [];

    for (const champRace of GAME_DATA.championRaces) {
      const champWeek = champRace.week || 2;
      if (champRace.month === month && champWeek === week) {
        const track = GAME_DATA.tracks.find((t) => t.name === champRace.track);
        races.push(RaceEngine.createChampionshipRace(champRace, track, gameState));
      }
    }

    const isFlatSeason = GAME_DATA.rules.flatSeasonMonths.includes(month);
    const isNHSeason = GAME_DATA.rules.nhSeasonMonths.includes(month);

    const numRaces = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numRaces; i++) {
      let eligibleTracks = GAME_DATA.tracks.filter((t) => {
        if (t.surface === "AW") return true;
        if (t.type === "flat" && isFlatSeason) return true;
        if (t.type === "nh" && isNHSeason) return true;
        return false;
      });

      if (eligibleTracks.length === 0) {
        eligibleTracks = GAME_DATA.tracks.filter((t) => t.surface === "AW");
      }

      const track = eligibleTracks[Math.floor(Math.random() * eligibleTracks.length)];
      const distance = track.distances[Math.floor(Math.random() * track.distances.length)];

      let classIdx;
      if (track.prestige <= 2) classIdx = 4 + Math.floor(Math.random() * 3);
      else if (track.prestige <= 4) classIdx = 2 + Math.floor(Math.random() * 4);
      else classIdx = Math.floor(Math.random() * 4);

      const raceClass = GAME_DATA.raceClasses[Math.min(classIdx, GAME_DATA.raceClasses.length - 1)];
      const ground = track.surface === "AW" ? "Standard" : HorseGenerator.getSeasonalGround(month);

      const numRunners = 6 + Math.floor(Math.random() * 10);
      const aiRunners = RaceEngine.generateAIRunners(numRunners, raceClass, track.type, distance, ground);

      let sexRestriction = null;
      if (Math.random() > 0.75) sexRestriction = "fillies";

      races.push({
        id: HorseGenerator.nextId++,
        name: RaceEngine.generateRaceName(track, distance, raceClass),
        track: track.name,
        trackData: track,
        surface: track.surface,
        distance,
        class: raceClass,
        ground,
        prize: Math.floor(raceClass.prizeMoney * (0.8 + Math.random() * 0.4)),
        runners: aiRunners,
        playerEntries: [],
        isChampionship: false,
        ageRestriction: Math.random() > 0.75 ? 3 : null,
        sexRestriction,
        type: track.type,
      });
    }

    return races;
  }

  static generateAIRunners(count, raceClass, type, distance, ground) {
    const runners = [];
    for (let j = 0; j < count; j++) {
      const quality = raceClass.minRating + Math.floor(Math.random() * (raceClass.maxRating - raceClass.minRating));
      const horse = HorseGenerator.generateHorse({ quality, owner: "ai", type: type || "flat" });
      let jockey;
      if (quality > 60 || Math.random() > 0.5) {
        const realJockey = HorseGenerator.pickRealJockey(type, quality);
        jockey = HorseGenerator.createJockeyFromReal(realJockey);
      } else {
        jockey = HorseGenerator.createAIJockey(type, quality);
      }
      const weight = HorseGenerator.calculateWeight(horse, { distance, class: raceClass, isChampionship: false, sexRestriction: null });
      runners.push({ horse, jockey, weight });
    }
    return runners;
  }

  static createChampionshipRace(champRace, track, gameState) {
    const ground = track && track.surface === "Dirt"
      ? "Fast"
      : HorseGenerator.getSeasonalGround(champRace.month);

    const maxField = champRace.name === "Grand National" ? GAME_DATA.rules.grandNationalMaxField : GAME_DATA.rules.maxFieldSize;
    const numRunners = Math.min(maxField, 10 + Math.floor(Math.random() * 10));
    const isNH = champRace.type === "nh";
    const aiRunners = [];

    for (let j = 0; j < numRunners; j++) {
      const quality = 90 + Math.floor(Math.random() * 50);
      const horse = HorseGenerator.generateHorse({ quality, owner: "ai" });
      if (champRace.sexRestriction === "fillies") horse.sex = "Filly";
      if (champRace.sexRestriction === "colts") horse.sex = "Colt";
      const realJockey = HorseGenerator.pickRealJockey(isNH ? "nh" : "flat", quality);
      const jockey = HorseGenerator.createJockeyFromReal(realJockey);
      const raceForWeight = { distance: champRace.distance, class: GAME_DATA.raceClasses[GAME_DATA.raceClasses.length - 1], isChampionship: true, sexRestriction: champRace.sexRestriction };
      const weight = HorseGenerator.calculateWeight(horse, raceForWeight);
      aiRunners.push({ horse, jockey, weight });
    }

    return {
      id: HorseGenerator.nextId++,
      name: champRace.name,
      track: champRace.track,
      surface: track?.surface || "Turf",
      distance: champRace.distance,
      class: GAME_DATA.raceClasses[GAME_DATA.raceClasses.length - 1],
      ground,
      prize: champRace.prize,
      runners: aiRunners,
      playerEntries: [],
      isChampionship: true,
      ageRestriction: champRace.ageRestriction,
      sexRestriction: champRace.sexRestriction || null,
      type: champRace.type,
      country: champRace.country,
    };
  }

  static generateRaceName(track, distance, raceClass) {
    const types = raceClass.type === "handicap"
      ? ["Handicap", "Handicap", "Nursery Handicap", "Heritage Handicap"]
      : ["Stakes", "Stakes", "Cup", "Trophy", "Plate", "Challenge", "Prize"];
    const type = types[Math.floor(Math.random() * types.length)];
    return `${track.name} ${HorseGenerator.formatDistance(distance)} ${type}`.trim();
  }

  static canEnterRace(horse, race, gameState) {
    if (horse.injured) return { ok: false, reason: "Horse is injured" };
    if (horse.fitness < 30) return { ok: false, reason: "Horse not fit enough (min 30%)" };
    if (horse.health < 50) return { ok: false, reason: "Horse not healthy enough" };

    if (race.ageRestriction && horse.age !== race.ageRestriction) {
      return { ok: false, reason: `Restricted to ${race.ageRestriction} year olds only` };
    }

    if (race.sexRestriction === "fillies" && horse.sex !== "Filly") {
      return { ok: false, reason: "Fillies/mares only" };
    }
    if (race.sexRestriction === "colts" && horse.sex !== "Colt") {
      return { ok: false, reason: "Colts/geldings only" };
    }

    if (race.class.minRating > 0 && horse.rating < race.class.minRating - 10) {
      return { ok: false, reason: `Rating too low (need ${race.class.minRating}+)` };
    }
    if (horse.rating > race.class.maxRating + 10 && race.class.class > 0) {
      return { ok: false, reason: "Rating too high for this class" };
    }

    if (gameState) {
      const totalWeek = gameState.calendar.year * 52 + gameState.calendar.month * 4 + gameState.calendar.week;
      const lastRan = horse.lastRanWeek || -99;
      if (totalWeek - lastRan < 1) {
        return { ok: false, reason: "Must wait at least 1 week between runs" };
      }
    }

    if (horse.age < 2) return { ok: false, reason: "Too young to race" };

    if (race.type === "nh" && horse.age < 4) {
      return { ok: false, reason: "Must be 4+ for National Hunt racing" };
    }

    if (horse.type && race.type) {
      if (race.type === "nh" && horse.type === "flat") {
        return { ok: false, reason: "Flat horse cannot enter National Hunt races" };
      }
      if (race.type === "flat" && horse.type === "nh") {
        return { ok: false, reason: "NH horse cannot enter Flat races" };
      }
    }

    return { ok: true };
  }

  static processRaceResults(results, race, gameState) {
    const updates = [];
    const prizeDistrib = GAME_DATA.rules.prizeDistribution;

    for (const result of results) {
      if (result.horse.owner !== "player") continue;

      const horse = gameState.horses.find((h) => h.id === result.horse.id);
      if (!horse) continue;

      horse.careerStats.runs++;
      horse.form.push(result.position);
      if (horse.form.length > 10) horse.form.shift();

      const totalWeek = gameState.calendar.year * 52 + gameState.calendar.month * 4 + gameState.calendar.week;
      horse.lastRanWeek = totalWeek;

      horse.fitness = Math.max(20, horse.fitness - 10 - Math.floor(Math.random() * 10));
      horse.health = Math.max(60, horse.health - Math.floor(Math.random() * 5));

      const prizePct = prizeDistrib[result.position] || 0;
      let earnings = Math.floor(race.prize * prizePct);

      if (result.position === 1) {
        horse.careerStats.wins++;
        horse.morale = Math.min(100, horse.morale + 15);
        horse.rating = Math.min(150, horse.rating + 3 + Math.floor(Math.random() * 3));
        const jockeyBonus = result.jockey ? ` — Jockey: ${result.jockey.name}` : "";
        updates.push({ horse: horse.name, text: `WON! +£${earnings.toLocaleString()}${jockeyBonus}`, type: "win" });
      } else if (result.position === 2) {
        horse.careerStats.places++;
        horse.morale = Math.min(100, horse.morale + 5);
        horse.rating = Math.min(150, horse.rating + 1);
        updates.push({ horse: horse.name, text: `2nd place (${result.gap}). +£${earnings.toLocaleString()}`, type: "place" });
      } else if (result.position === 3) {
        horse.careerStats.shows++;
        horse.morale = Math.min(100, horse.morale + 2);
        updates.push({ horse: horse.name, text: `3rd place (${result.gap}). +£${earnings.toLocaleString()}`, type: "show" });
      } else if (result.position <= 6 && earnings > 0) {
        updates.push({ horse: horse.name, text: `Finished ${result.position}${RaceEngine.ordinal(result.position)}. +£${earnings.toLocaleString()}`, type: "loss" });
      } else {
        horse.morale = Math.max(0, horse.morale - 5);
        horse.rating = Math.max(0, horse.rating - (result.position <= 5 ? 1 : 2));
        updates.push({ horse: horse.name, text: `Finished ${result.position}${RaceEngine.ordinal(result.position)}`, type: "loss" });
      }

      horse.careerStats.earnings += earnings;
      gameState.finances.balance += earnings;
      gameState.finances.totalEarnings += earnings;

      if (Math.random() < 0.05) {
        const weeks = 2 + Math.floor(Math.random() * 8);
        horse.injured = true;
        horse.injuryWeeksLeft = weeks;
        horse.training = "rest";
        updates.push({ horse: horse.name, text: `Picked up an injury! Out for ${weeks} weeks.`, type: "injury" });
      }
    }
    return updates;
  }

  static ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }
}
