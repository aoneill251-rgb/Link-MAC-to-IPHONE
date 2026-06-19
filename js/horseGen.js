class HorseGenerator {
  static nextId = 1;

  static generateName() {
    const names = GAME_DATA.horseNames;
    return names[Math.floor(Math.random() * names.length)];
  }

  static generateSireName() {
    return GAME_DATA.sireNames[Math.floor(Math.random() * GAME_DATA.sireNames.length)];
  }

  static generateDamName() {
    return GAME_DATA.damNames[Math.floor(Math.random() * GAME_DATA.damNames.length)];
  }

  static pickCoat() {
    let r = Math.random();
    for (const coat of GAME_DATA.coatColors) {
      r -= coat.frequency;
      if (r <= 0) return { ...coat };
    }
    return { ...GAME_DATA.coatColors[0] };
  }

  static generateStat(base, variance = 20) {
    return Math.max(1, Math.min(100, base + Math.floor((Math.random() - 0.5) * variance)));
  }

  static generateGroundPreference() {
    const prefs = {};
    const peak = Math.floor(Math.random() * 7);
    GAME_DATA.groundTypes.forEach((g, i) => {
      const dist = Math.abs(i - peak);
      prefs[g] = Math.max(0.4, 1 - dist * 0.2 + (Math.random() - 0.5) * 0.1);
    });
    return prefs;
  }

  static generateDistancePreference() {
    const idealDistance = 1000 + Math.floor(Math.random() * 6) * 400;
    return {
      ideal: idealDistance,
      range: 400 + Math.floor(Math.random() * 400),
    };
  }

  static pickTrainer(type = "flat") {
    const trainers = GAME_DATA.realTrainers.filter((t) => t.specialty === type || type === "any");
    return trainers[Math.floor(Math.random() * trainers.length)];
  }

  static pickOwner(type = "flat") {
    const owners = GAME_DATA.realOwners.filter((o) => o.specialty === type || o.specialty === "both");
    return owners[Math.floor(Math.random() * owners.length)];
  }

  static pickRealJockey(type = "flat", quality = 50) {
    const pool = type === "nh" ? GAME_DATA.realJockeys.nh : GAME_DATA.realJockeys.flat;
    if (quality > 80) {
      const top = pool.filter((j) => j.skill >= 88);
      if (top.length > 0) return { ...top[Math.floor(Math.random() * top.length)] };
    }
    if (quality > 50) {
      const mid = pool.filter((j) => j.skill >= 82 && j.skill < 92);
      if (mid.length > 0) return { ...mid[Math.floor(Math.random() * mid.length)] };
    }
    return { ...pool[Math.floor(Math.random() * pool.length)] };
  }

  static createJockeyFromReal(realJockey) {
    return {
      id: HorseGenerator.nextId++,
      name: realJockey.name,
      nationality: realJockey.nationality,
      skill: realJockey.skill,
      experience: realJockey.experience || HorseGenerator.generateStat(realJockey.skill, 15),
      fitness: 70 + Math.floor(Math.random() * 30),
      style: realJockey.style,
      retainerFee: realJockey.retainerFee,
      rideFee: realJockey.rideFee,
      winBonus: realJockey.winBonus,
      available: true,
      wins: realJockey.wins,
      rides: realJockey.rides,
      nh: realJockey.nh || false,
    };
  }

  static generateHorse(options = {}) {
    const age = options.age || (2 + Math.floor(Math.random() * 8));
    const quality = options.quality || (20 + Math.floor(Math.random() * 60));
    const sex = options.sex || (Math.random() > 0.5 ? "Colt" : "Filly");
    const coat = HorseGenerator.pickCoat();
    const distPref = HorseGenerator.generateDistancePreference();

    const trainer = options.trainer || (options.owner !== "player" ? HorseGenerator.pickTrainer() : null);
    const aiOwner = options.owner !== "player" && options.owner !== "auction"
      ? HorseGenerator.pickOwner()
      : null;

    const horse = {
      id: HorseGenerator.nextId++,
      name: options.name || HorseGenerator.generateName(),
      age,
      sex,
      coat,
      sire: options.sire || HorseGenerator.generateSireName(),
      dam: options.dam || HorseGenerator.generateDamName(),
      trainer: trainer ? trainer.name : null,
      aiOwner: aiOwner ? aiOwner.name : null,
      stats: {
        speed: HorseGenerator.generateStat(quality, 25),
        stamina: HorseGenerator.generateStat(quality, 25),
        acceleration: HorseGenerator.generateStat(quality, 25),
        jumping: HorseGenerator.generateStat(quality * 0.6, 30),
        temperament: HorseGenerator.generateStat(60, 40),
      },
      fitness: options.fitness || (40 + Math.floor(Math.random() * 30)),
      morale: options.morale || (50 + Math.floor(Math.random() * 30)),
      health: 100,
      injured: false,
      injuryWeeksLeft: 0,
      distancePreference: distPref,
      groundPreference: HorseGenerator.generateGroundPreference(),
      training: "light",
      form: [],
      careerStats: { runs: 0, wins: 0, places: 0, shows: 0, earnings: 0 },
      rating: Math.max(0, quality + Math.floor((Math.random() - 0.5) * 20)),
      potential: quality + Math.floor(Math.random() * 30),
      maturity: age >= 4 ? 0.9 + Math.random() * 0.1 : 0.5 + (age - 2) * 0.15 + Math.random() * 0.1,
      weight: GAME_DATA.rules.baseWeight,
      lastRanWeek: -99,
      owner: options.owner || "player",
    };

    if (age < 3) {
      horse.stats.speed = Math.floor(horse.stats.speed * 0.7);
      horse.stats.stamina = Math.floor(horse.stats.stamina * 0.7);
    }

    return horse;
  }

  static calculateValue(horse) {
    const statAvg = (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration) / 3;
    const ageFactor = horse.age <= 3 ? 1.3 : horse.age <= 6 ? 1.0 : horse.age <= 9 ? 0.7 : 0.3;
    const formFactor = horse.form.length > 0
      ? 0.8 + (horse.form.slice(-3).reduce((a, b) => a + (b <= 3 ? 0.1 : 0), 0))
      : 0.9;
    const potentialFactor = 1 + (horse.potential - statAvg) / 200;
    const base = statAvg * 500;
    return Math.floor(base * ageFactor * formFactor * potentialFactor);
  }

  static breedHorse(sire, dam) {
    const inheritStat = (sireStat, damStat) => {
      const parent = Math.random() > 0.5 ? sireStat : damStat;
      const mutation = (Math.random() - 0.5) * 15;
      return Math.max(1, Math.min(100, Math.floor(parent + mutation)));
    };

    const foal = HorseGenerator.generateHorse({
      age: 0,
      sex: Math.random() > 0.5 ? "Colt" : "Filly",
      sire: sire.name,
      dam: dam.name,
      quality: Math.floor((sire.potential + dam.potential) / 2),
      owner: "player",
    });

    foal.stats.speed = inheritStat(sire.stats.speed, dam.stats.speed);
    foal.stats.stamina = inheritStat(sire.stats.stamina, dam.stats.stamina);
    foal.stats.acceleration = inheritStat(sire.stats.acceleration, dam.stats.acceleration);
    foal.stats.jumping = inheritStat(sire.stats.jumping, dam.stats.jumping);
    foal.stats.temperament = inheritStat(sire.stats.temperament, dam.stats.temperament);
    foal.potential = Math.floor((sire.potential + dam.potential) / 2 + (Math.random() - 0.4) * 20);
    foal.fitness = 30;
    foal.maturity = 0.2;
    foal.rating = 0;
    foal.trainer = null;

    foal.stats.speed = Math.floor(foal.stats.speed * 0.4);
    foal.stats.stamina = Math.floor(foal.stats.stamina * 0.4);

    return foal;
  }

  static getDistanceFitness(horse, raceDistance) {
    const diff = Math.abs(raceDistance - horse.distancePreference.ideal);
    const range = horse.distancePreference.range;
    if (diff <= range) return 1.0;
    return Math.max(0.5, 1.0 - (diff - range) / 2000);
  }

  static getGroundFitness(horse, ground) {
    return horse.groundPreference[ground] || 0.7;
  }

  static calculateWeight(horse, race) {
    let weight = GAME_DATA.rules.baseWeight;

    if (race.class.type === "pattern" || race.isChampionship) {
      const ageKey = horse.age >= 5 ? "5+" : String(horse.age);
      const closestDist = Object.keys(GAME_DATA.rules.weightForAge)
        .map(Number)
        .sort((a, b) => Math.abs(a - race.distance) - Math.abs(b - race.distance))[0];
      const wfa = GAME_DATA.rules.weightForAge[closestDist];
      if (wfa && wfa[ageKey] !== null && wfa[ageKey] !== undefined) {
        weight += wfa[ageKey];
      }
      if (race.sexRestriction === null && horse.sex === "Filly") {
        weight -= GAME_DATA.rules.fillySexAllowance;
      }
    } else {
      const ratingDiff = horse.rating - (race.class.maxRating + race.class.minRating) / 2;
      weight += Math.floor(ratingDiff * 0.3);
      if (horse.careerStats.wins > 0 && race.class.type === "handicap") {
        weight += GAME_DATA.rules.winPenalty;
      }
      if (horse.sex === "Filly") {
        weight -= GAME_DATA.rules.fillySexAllowance;
      }
    }

    return Math.max(GAME_DATA.rules.minWeight, Math.min(GAME_DATA.rules.maxWeight, weight));
  }

  static getWeightEffect(weight) {
    const diff = weight - GAME_DATA.rules.baseWeight;
    return 1 - diff * 0.003;
  }

  static getOverallAbility(horse, distance, ground, weight) {
    const distFit = HorseGenerator.getDistanceFitness(horse, distance);
    const groundFit = HorseGenerator.getGroundFitness(horse, ground);
    const fitnessFactor = horse.fitness / 100;
    const moraleFactor = 0.8 + (horse.morale / 100) * 0.2;
    const healthFactor = horse.health / 100;
    const maturityFactor = horse.maturity;
    const weightEffect = weight ? HorseGenerator.getWeightEffect(weight) : 1;

    const rawAbility =
      horse.stats.speed * 0.35 +
      horse.stats.stamina * 0.25 +
      horse.stats.acceleration * 0.2 +
      horse.stats.temperament * 0.2;

    return rawAbility * distFit * groundFit * fitnessFactor * moraleFactor * healthFactor * maturityFactor * weightEffect;
  }

  static getDistanceLabel(meters) {
    if (meters <= 1200) return "Sprint";
    if (meters <= 1600) return "Mile";
    if (meters <= 2400) return "Middle";
    if (meters <= 4000) return "Staying";
    return "Extreme";
  }

  static formatDistance(meters) {
    const furlongs = meters / 200;
    const miles = Math.floor(furlongs / 8);
    const remFurlongs = furlongs % 8;
    if (miles === 0) return `${remFurlongs}f`;
    if (remFurlongs === 0) return `${miles}m`;
    return `${miles}m ${remFurlongs}f`;
  }

  static formatWeight(lbs) {
    const stones = Math.floor(lbs / 14);
    const remainLbs = lbs % 14;
    return `${stones}st ${remainLbs}lb`;
  }

  static getSeasonalGround(month) {
    const probs = GAME_DATA.seasonalGround[month];
    let r = Math.random();
    for (let i = 0; i < probs.length; i++) {
      r -= probs[i];
      if (r <= 0) return GAME_DATA.groundTypes[i];
    }
    return "Good";
  }
}
