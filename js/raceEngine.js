class RaceEngine {
  static simulateRace(runners, raceDistance, ground, trackName) {
    const numSteps = 200;
    const positions = [];
    const commentary = [];

    const runnerStates = runners.map((r) => {
      const ability = HorseGenerator.getOverallAbility(r.horse, raceDistance, ground);
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
        segments: [],
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

        const baseSpeed = rs.ability / numSteps * 3;
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
        commentary.push({
          step,
          text: `They're off! ${sorted[0].horse.name} breaks quickly from the gates.`,
        });
      }
      if (step === Math.floor(numSteps * 0.25)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        commentary.push({
          step,
          text: `Into the first quarter, ${sorted[0].horse.name} leads from ${sorted[1].horse.name}.`,
        });
      }
      if (step === Math.floor(numSteps * 0.5)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        commentary.push({
          step,
          text: `Halfway now — ${sorted[0].horse.name} still at the head of affairs. The pack is bunching up behind.`,
        });
      }
      if (step === Math.floor(numSteps * 0.75)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        const gap = sorted[0].position - sorted[1].position;
        const gapText = gap > 3 ? "clear daylight" : gap > 1 ? "a narrow lead" : "barely a head";
        commentary.push({
          step,
          text: `Turning for home! ${sorted[0].horse.name} has ${gapText} over ${sorted[1].horse.name}. ${sorted[2]?.horse.name || "Others"} making a move!`,
        });
      }
      if (step === Math.floor(numSteps * 0.9)) {
        const sorted = [...runnerStates].sort((a, b) => b.position - a.position);
        commentary.push({
          step,
          text: `Inside the final furlong! ${sorted[0].horse.name} and ${sorted[1].horse.name} locked in battle!`,
        });
      }
    }

    for (const rs of runnerStates) {
      if (!rs.finished) {
        rs.finishStep = numSteps + (100 - rs.position);
      }
    }

    const results = runnerStates
      .sort((a, b) => a.finishStep - b.finishStep)
      .map((rs, idx) => {
        const gap = idx === 0 ? 0 : rs.finishStep - runnerStates[0].finishStep;
        let gapText = "";
        if (idx > 0) {
          if (gap < 0.5) gapText = "short head";
          else if (gap < 1) gapText = "head";
          else if (gap < 2) gapText = "neck";
          else if (gap < 4) gapText = `${Math.floor(gap / 2)} length${gap >= 4 ? "s" : ""}`;
          else gapText = `${Math.floor(gap / 2)} lengths`;
        }
        return {
          position: idx + 1,
          horse: rs.horse,
          jockey: rs.jockey,
          gap: gapText,
          finishStep: rs.finishStep,
        };
      });

    const winner = results[0];
    commentary.push({
      step: numSteps,
      text: `🏆 ${winner.horse.name} wins${results[1] ? ` by ${results[1].gap || "a short head"} from ${results[1].horse.name}` : ""}! ${results[2] ? results[2].horse.name + " finishes third." : ""}`,
    });

    return { positions, results, commentary };
  }

  static generateRaceCard(gameState) {
    const { week, month, year } = gameState.calendar;
    const races = [];
    const numRaces = 3 + Math.floor(Math.random() * 4);

    for (const champRace of GAME_DATA.championRaces) {
      if (champRace.month === month && week === 2) {
        const track = GAME_DATA.tracks.find((t) => t.name === champRace.track);
        races.push(RaceEngine.createChampionshipRace(champRace, track, gameState));
      }
    }

    for (let i = 0; i < numRaces; i++) {
      const track = GAME_DATA.tracks[Math.floor(Math.random() * GAME_DATA.tracks.length)];
      const distance = track.distances[Math.floor(Math.random() * track.distances.length)];

      let classIdx;
      if (track.prestige <= 2) classIdx = 4 + Math.floor(Math.random() * 3);
      else if (track.prestige <= 4) classIdx = 2 + Math.floor(Math.random() * 4);
      else classIdx = Math.floor(Math.random() * 4);

      const raceClass = GAME_DATA.raceClasses[Math.min(classIdx, GAME_DATA.raceClasses.length - 1)];
      const ground = GAME_DATA.groundTypes[Math.floor(Math.random() * GAME_DATA.groundTypes.length)];

      const numRunners = 6 + Math.floor(Math.random() * 10);
      const aiRunners = [];
      for (let j = 0; j < numRunners; j++) {
        const quality = raceClass.minRating + Math.floor(Math.random() * (raceClass.maxRating - raceClass.minRating));
        const horse = HorseGenerator.generateHorse({ quality, owner: "ai" });
        const jockey = HorseGenerator.generateJockey({ quality: quality * 0.8 });
        aiRunners.push({ horse, jockey });
      }

      races.push({
        id: HorseGenerator.nextId++,
        name: RaceEngine.generateRaceName(track, distance, raceClass),
        track: track.name,
        surface: track.surface,
        distance,
        class: raceClass,
        ground,
        prize: Math.floor(raceClass.prizeMoney * (0.8 + Math.random() * 0.4)),
        runners: aiRunners,
        playerEntries: [],
        isChampionship: false,
        ageRestriction: Math.random() > 0.7 ? 3 : null,
      });
    }

    return races;
  }

  static createChampionshipRace(champRace, track, gameState) {
    const ground = GAME_DATA.groundTypes[2 + Math.floor(Math.random() * 3)];
    const numRunners = 10 + Math.floor(Math.random() * 8);
    const aiRunners = [];

    for (let j = 0; j < numRunners; j++) {
      const quality = 90 + Math.floor(Math.random() * 50);
      const horse = HorseGenerator.generateHorse({ quality, owner: "ai" });
      const jockey = HorseGenerator.generateJockey({ quality: 60 + Math.floor(Math.random() * 35) });
      aiRunners.push({ horse, jockey });
    }

    return {
      id: HorseGenerator.nextId++,
      name: champRace.name,
      track: champRace.track,
      surface: champRace.surface || track?.surface || "Turf",
      distance: champRace.distance,
      class: GAME_DATA.raceClasses[GAME_DATA.raceClasses.length - 1],
      ground,
      prize: champRace.prize,
      runners: aiRunners,
      playerEntries: [],
      isChampionship: true,
      ageRestriction: champRace.ageRestriction,
    };
  }

  static generateRaceName(track, distance, raceClass) {
    const prefixes = ["The", ""];
    const types = [
      "Stakes", "Handicap", "Cup", "Trophy", "Plate", "Sprint",
      "Mile", "Classic", "Challenge", "Prize", "Memorial",
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    return `${prefix} ${track.name} ${HorseGenerator.formatDistance(distance)} ${type}`.trim();
  }

  static canEnterRace(horse, race) {
    if (horse.injured) return { ok: false, reason: "Horse is injured" };
    if (horse.fitness < 30) return { ok: false, reason: "Horse not fit enough (min 30%)" };
    if (horse.health < 50) return { ok: false, reason: "Horse not healthy enough" };
    if (race.ageRestriction && horse.age !== race.ageRestriction) {
      return { ok: false, reason: `Age restricted to ${race.ageRestriction} year olds` };
    }
    if (race.class.minRating > 0 && horse.rating < race.class.minRating - 10) {
      return { ok: false, reason: `Rating too low (need ${race.class.minRating}+)` };
    }
    if (horse.rating > race.class.maxRating + 10 && race.class.class > 0) {
      return { ok: false, reason: `Rating too high for this class` };
    }
    return { ok: true };
  }

  static processRaceResults(results, race, gameState) {
    const updates = [];
    for (const result of results) {
      if (result.horse.owner !== "player") continue;

      const horse = gameState.horses.find((h) => h.id === result.horse.id);
      if (!horse) continue;

      horse.careerStats.runs++;
      horse.form.push(result.position);
      if (horse.form.length > 10) horse.form.shift();

      horse.fitness = Math.max(20, horse.fitness - 10 - Math.floor(Math.random() * 10));
      horse.health = Math.max(60, horse.health - Math.floor(Math.random() * 5));

      let earnings = 0;
      if (result.position === 1) {
        horse.careerStats.wins++;
        earnings = race.prize;
        horse.morale = Math.min(100, horse.morale + 15);
        horse.rating = Math.min(150, horse.rating + 3 + Math.floor(Math.random() * 3));
        updates.push({ horse: horse.name, text: `🥇 WON! +£${earnings.toLocaleString()}`, type: "win" });
      } else if (result.position === 2) {
        horse.careerStats.places++;
        earnings = Math.floor(race.prize * 0.35);
        horse.morale = Math.min(100, horse.morale + 5);
        horse.rating = Math.min(150, horse.rating + 1);
        updates.push({ horse: horse.name, text: `🥈 2nd place. +£${earnings.toLocaleString()}`, type: "place" });
      } else if (result.position === 3) {
        horse.careerStats.shows++;
        earnings = Math.floor(race.prize * 0.15);
        horse.morale = Math.min(100, horse.morale + 2);
        updates.push({ horse: horse.name, text: `🥉 3rd place. +£${earnings.toLocaleString()}`, type: "show" });
      } else {
        horse.morale = Math.max(0, horse.morale - 5);
        if (result.position <= 5) {
          horse.rating = Math.max(0, horse.rating - 1);
        } else {
          horse.rating = Math.max(0, horse.rating - 2);
        }
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
        updates.push({ horse: horse.name, text: `⚠️ Picked up an injury! Out for ${weeks} weeks.`, type: "injury" });
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
