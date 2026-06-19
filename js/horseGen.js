class HorseGenerator {
  static nextId = 1;

  static generateName() {
    const first = GAME_DATA.firstNames[Math.floor(Math.random() * GAME_DATA.firstNames.length)];
    const last = GAME_DATA.lastNames[Math.floor(Math.random() * GAME_DATA.lastNames.length)];
    return `${first} ${last}`;
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

  static generateHorse(options = {}) {
    const age = options.age || (2 + Math.floor(Math.random() * 8));
    const quality = options.quality || (20 + Math.floor(Math.random() * 60));
    const sex = options.sex || (Math.random() > 0.5 ? "Colt" : "Filly");
    const coat = HorseGenerator.pickCoat();
    const distPref = HorseGenerator.generateDistancePreference();

    const horse = {
      id: HorseGenerator.nextId++,
      name: options.name || HorseGenerator.generateName(),
      age,
      sex,
      coat,
      sire: options.sire || HorseGenerator.generateName(),
      dam: options.dam || HorseGenerator.generateName(),
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
      owner: options.owner || "player",
    };

    if (age < 3) {
      horse.stats.speed = Math.floor(horse.stats.speed * 0.7);
      horse.stats.stamina = Math.floor(horse.stats.stamina * 0.7);
    }

    return horse;
  }

  static generateJockey(options = {}) {
    const first = GAME_DATA.jockeyFirstNames[Math.floor(Math.random() * GAME_DATA.jockeyFirstNames.length)];
    const last = GAME_DATA.jockeySurnames[Math.floor(Math.random() * GAME_DATA.jockeySurnames.length)];
    const quality = options.quality || (30 + Math.floor(Math.random() * 50));

    return {
      id: HorseGenerator.nextId++,
      name: `${first} ${last}`,
      skill: HorseGenerator.generateStat(quality, 20),
      experience: HorseGenerator.generateStat(quality, 30),
      fitness: 70 + Math.floor(Math.random() * 30),
      style: ["front-runner", "stalker", "closer", "versatile"][Math.floor(Math.random() * 4)],
      retainerFee: Math.floor(quality * 50 + Math.random() * 500),
      rideFee: Math.floor(100 + quality * 5),
      winBonus: Math.floor(quality * 20),
      available: true,
      wins: Math.floor(Math.random() * quality * 2),
      rides: Math.floor(quality * 3 + Math.random() * 100),
    };
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

  static getOverallAbility(horse, distance, ground) {
    const distFit = HorseGenerator.getDistanceFitness(horse, distance);
    const groundFit = HorseGenerator.getGroundFitness(horse, ground);
    const fitnessFactor = horse.fitness / 100;
    const moraleFactor = 0.8 + (horse.morale / 100) * 0.2;
    const healthFactor = horse.health / 100;
    const maturityFactor = horse.maturity;

    const rawAbility =
      horse.stats.speed * 0.35 +
      horse.stats.stamina * 0.25 +
      horse.stats.acceleration * 0.2 +
      horse.stats.temperament * 0.2;

    return rawAbility * distFit * groundFit * fitnessFactor * moraleFactor * healthFactor * maturityFactor;
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
}
