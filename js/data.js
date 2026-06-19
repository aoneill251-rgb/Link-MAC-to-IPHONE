const GAME_DATA = {
  horseNames: [
    "Thunder Star", "Storm Light", "Shadow Fire", "Golden Wind", "Silver Rain",
    "Dark Cloud", "Bright Moon", "Wild Sun", "Royal Spirit", "Noble Heart",
    "Swift Dream", "Midnight Song", "Dawn Dance", "Crimson Storm", "Iron Blaze",
    "Diamond Flash", "Emerald Arrow", "Sapphire Bolt", "Ruby Strike", "Crystal Quest",
    "Phantom Glory", "Dragon Pride", "Phoenix Honor", "Eagle Grace", "Falcon Charm",
    "Raven Wonder", "Arctic Marvel", "Desert Legend", "Ocean Fury", "Mountain Force",
    "Velvet Power", "Silk Reign", "Steel Knight", "Copper Prince", "Bronze King",
    "Amber Queen", "Ivory Dancer", "Ebony Runner", "Scarlet Chaser", "Azure Flyer",
    "Lucky Whisper", "Brave Echo", "Fierce Shadow", "Gentle Flame", "Proud Frost",
    "Bold Breeze", "Mystic Gale", "Magic Tempest", "Secret Majesty", "Silent Victory",
    "Flying Triumph", "Dancing Fortune", "Blazing Destiny", "Roaring Phantom", "Whispering Express",
    "Galloping Missile", "Soaring Rocket", "Shining Comet", "Glowing Meteor", "Dazzling Galaxy",
    "Northern Dancer", "Sea Thunder", "Desert Prince", "Mountain King", "Valley Star",
    "Harbour Light", "Castle Rock", "Spring Meadow", "Autumn Gold", "Winter Frost",
    "Summer Blaze", "Morning Dew", "Evening Star", "Night Rider", "Day Dreamer",
    "Red Baron", "Blue Diamond", "Green Spirit", "Purple Reign", "Orange Flame",
    "Platinum Star", "Titanium Rose", "Carbon Copy", "Mercury Rising", "Jupiter King",
    "Saturn Ring", "Mars Attack", "Venus Dawn", "Neptune Reign", "Pluto Dark",
    "Celtic Cross", "Viking Sword", "Roman Eagle", "Greek Fire", "Persian Gold",
    "Spanish Main", "French Kiss", "Italian Job", "German Steel", "Irish Spirit",
    "Tornado Alley", "Hurricane Bay", "Cyclone Pass", "Monsoon Rain", "Blizzard Peak",
    "Lightning Rod", "Solar Flare", "Lunar Eclipse", "Stellar Wind", "Cosmic Ray",
  ],

  sireNames: [
    "Frankel", "Galileo", "Dubawi", "Sea The Stars", "Kingman",
    "Night Of Thunder", "Lope De Vega", "Dark Angel", "Kodiac", "Exceed And Excel",
    "Invincible Spirit", "Shamardal", "Pivotal", "Oasis Dream", "Nathaniel",
    "Siyouni", "Zoffany", "Australia", "Camelot", "Gleneagles",
    "No Nay Never", "Churchill", "Saxon Warrior", "Roaring Lion", "Too Darn Hot",
    "Baaeed", "St Mark's Basilica", "Pinatubo", "Palace Pier", "Ghaiyyath",
    "American Pharoah", "Justify", "Gun Runner", "Into Mischief", "Quality Road",
    "Curlin", "Tapit", "War Front", "Uncle Mo", "Medaglia d'Oro",
    "Deep Impact", "Lord Kanaloa", "Heart's Cry", "King Kamehameha", "Epiphaneia",
    "Fastnet Rock", "I Am Invincible", "Snitzel", "Written Tycoon", "Zoustar",
  ],

  damNames: [
    "Dancing Rain", "Moonlight Cloud", "Starlight Express", "Misty Morning", "Crystal Clear",
    "Golden Rose", "Silver Lining", "Ruby Tuesday", "Pearl Harbour", "Diamond Belle",
    "Sapphire Princess", "Emerald Isle", "Amethyst Dream", "Topaz Queen", "Jade Garden",
    "Velvet Rose", "Silk Ribbon", "Satin Doll", "Lace Veil", "Cotton Candy",
    "Aurora Borealis", "Celestial Being", "Heaven Sent", "Angel Eyes", "Fairy Tale",
    "Lady Luck", "Duchess Of York", "Countess Star", "Princess Royal", "Queen Bee",
    "Wild Flower", "Meadow Sweet", "River Dance", "Lake Shore", "Forest Queen",
    "Mountain Mist", "Valley Song", "Desert Bloom", "Island Girl", "Coral Reef",
    "Autumn Breeze", "Spring Rain", "Summer Love", "Winter Wonder", "Twilight Zone",
    "Midnight Rose", "Sunrise Glory", "Sunset Gold", "Starry Night", "Moonbeam",
  ],

  coatColors: [
    { name: "Bay", color: "#8B4513", mane: "#1a1a1a", frequency: 0.3 },
    { name: "Chestnut", color: "#CD853F", mane: "#8B4513", frequency: 0.2 },
    { name: "Dark Bay", color: "#5C3317", mane: "#1a1a1a", frequency: 0.15 },
    { name: "Grey", color: "#A0A0A0", mane: "#808080", frequency: 0.1 },
    { name: "Black", color: "#2a2a2a", mane: "#1a1a1a", frequency: 0.08 },
    { name: "Palomino", color: "#DAA520", mane: "#F5DEB3", frequency: 0.05 },
    { name: "Roan", color: "#BC8F8F", mane: "#6B3A3A", frequency: 0.05 },
    { name: "Dun", color: "#C4A265", mane: "#5C4033", frequency: 0.04 },
    { name: "Pinto", color: "#D2B48C", mane: "#1a1a1a", frequency: 0.02 },
    { name: "White", color: "#F0EAD6", mane: "#E0D8C0", frequency: 0.01 },
  ],

  // ── REAL JOCKEYS ──
  realJockeys: {
    flat: [
      { name: "William Buick", nationality: "GB", skill: 92, experience: 95, style: "stalker", retainerFee: 3500, rideFee: 500, winBonus: 1500, wins: 2847, rides: 14200 },
      { name: "Ryan Moore", nationality: "GB", skill: 95, experience: 98, style: "versatile", retainerFee: 5000, rideFee: 600, winBonus: 2000, wins: 3256, rides: 15800 },
      { name: "Tom Marquand", nationality: "GB", skill: 88, experience: 82, style: "stalker", retainerFee: 2800, rideFee: 400, winBonus: 1200, wins: 1456, rides: 8900 },
      { name: "Oisin Murphy", nationality: "IE", skill: 90, experience: 85, style: "versatile", retainerFee: 3200, rideFee: 450, winBonus: 1400, wins: 1789, rides: 9600 },
      { name: "James Doyle", nationality: "GB", skill: 89, experience: 90, style: "closer", retainerFee: 3000, rideFee: 450, winBonus: 1300, wins: 1934, rides: 10200 },
      { name: "Hollie Doyle", nationality: "GB", skill: 86, experience: 78, style: "front-runner", retainerFee: 2400, rideFee: 350, winBonus: 1000, wins: 987, rides: 6800 },
      { name: "Rossa Ryan", nationality: "IE", skill: 85, experience: 72, style: "stalker", retainerFee: 2200, rideFee: 350, winBonus: 900, wins: 756, rides: 5400 },
      { name: "Christophe Soumillon", nationality: "FR", skill: 91, experience: 96, style: "closer", retainerFee: 4000, rideFee: 550, winBonus: 1800, wins: 3102, rides: 14800 },
      { name: "Frankie Dettori", nationality: "IT", skill: 88, experience: 99, style: "closer", retainerFee: 4500, rideFee: 600, winBonus: 2000, wins: 3456, rides: 17500 },
      { name: "Jim Crowley", nationality: "GB", skill: 86, experience: 88, style: "versatile", retainerFee: 2500, rideFee: 380, winBonus: 1000, wins: 1678, rides: 9800 },
      { name: "Daniel Tudhope", nationality: "GB", skill: 85, experience: 85, style: "stalker", retainerFee: 2200, rideFee: 350, winBonus: 900, wins: 1345, rides: 8200 },
      { name: "Silvestre de Sousa", nationality: "BR", skill: 87, experience: 90, style: "versatile", retainerFee: 2600, rideFee: 400, winBonus: 1100, wins: 1856, rides: 10400 },
      { name: "Rob Havlin", nationality: "GB", skill: 82, experience: 86, style: "front-runner", retainerFee: 1800, rideFee: 300, winBonus: 800, wins: 1123, rides: 7600 },
      { name: "Cieren Fallon", nationality: "GB", skill: 83, experience: 68, style: "stalker", retainerFee: 1900, rideFee: 300, winBonus: 800, wins: 534, rides: 3800 },
      { name: "David Egan", nationality: "IE", skill: 84, experience: 72, style: "versatile", retainerFee: 2000, rideFee: 320, winBonus: 850, wins: 678, rides: 4600 },
      { name: "Benoit de la Sayette", nationality: "FR", skill: 81, experience: 62, style: "stalker", retainerFee: 1600, rideFee: 280, winBonus: 700, wins: 345, rides: 2800 },
      { name: "Kieran Shoemark", nationality: "GB", skill: 83, experience: 76, style: "closer", retainerFee: 1900, rideFee: 300, winBonus: 800, wins: 567, rides: 4200 },
      { name: "Jason Watson", nationality: "GB", skill: 82, experience: 70, style: "front-runner", retainerFee: 1700, rideFee: 280, winBonus: 750, wins: 489, rides: 3600 },
      { name: "Andrea Atzeni", nationality: "IT", skill: 86, experience: 88, style: "versatile", retainerFee: 2400, rideFee: 370, winBonus: 1000, wins: 1234, rides: 7800 },
      { name: "Pat Dobbs", nationality: "GB", skill: 80, experience: 90, style: "front-runner", retainerFee: 1500, rideFee: 260, winBonus: 650, wins: 1089, rides: 7200 },
      { name: "Mickael Barzalona", nationality: "FR", skill: 87, experience: 84, style: "closer", retainerFee: 2800, rideFee: 420, winBonus: 1200, wins: 1456, rides: 8200 },
      { name: "Maxime Guyon", nationality: "FR", skill: 86, experience: 86, style: "stalker", retainerFee: 2600, rideFee: 400, winBonus: 1100, wins: 1345, rides: 8000 },
      { name: "Irad Ortiz Jr", nationality: "US", skill: 93, experience: 88, style: "stalker", retainerFee: 4000, rideFee: 550, winBonus: 1800, wins: 2678, rides: 12400 },
      { name: "Flavien Prat", nationality: "FR", skill: 91, experience: 84, style: "closer", retainerFee: 3500, rideFee: 500, winBonus: 1600, wins: 2123, rides: 10800 },
      { name: "Joel Rosario", nationality: "US", skill: 90, experience: 92, style: "versatile", retainerFee: 3200, rideFee: 480, winBonus: 1500, wins: 2567, rides: 13200 },
      { name: "John Velazquez", nationality: "US", skill: 88, experience: 98, style: "stalker", retainerFee: 3000, rideFee: 450, winBonus: 1400, wins: 3012, rides: 16800 },
      { name: "Luis Saez", nationality: "US", skill: 87, experience: 82, style: "front-runner", retainerFee: 2600, rideFee: 400, winBonus: 1100, wins: 1789, rides: 10200 },
      { name: "James McDonald", nationality: "AU", skill: 94, experience: 88, style: "closer", retainerFee: 4500, rideFee: 580, winBonus: 1900, wins: 2456, rides: 11200 },
      { name: "Hugh Bowman", nationality: "AU", skill: 90, experience: 94, style: "versatile", retainerFee: 3500, rideFee: 500, winBonus: 1600, wins: 2789, rides: 14600 },
      { name: "Jamie Kah", nationality: "AU", skill: 88, experience: 78, style: "stalker", retainerFee: 3000, rideFee: 450, winBonus: 1300, wins: 1234, rides: 6800 },
      { name: "Joao Moreira", nationality: "BR", skill: 94, experience: 90, style: "versatile", retainerFee: 5000, rideFee: 600, winBonus: 2000, wins: 2987, rides: 13400 },
      { name: "Zac Purton", nationality: "AU", skill: 93, experience: 92, style: "closer", retainerFee: 4500, rideFee: 580, winBonus: 1900, wins: 2876, rides: 13800 },
      { name: "Christophe Lemaire", nationality: "FR", skill: 92, experience: 94, style: "stalker", retainerFee: 4200, rideFee: 560, winBonus: 1800, wins: 2654, rides: 12600 },
      { name: "Yutaka Take", nationality: "JP", skill: 86, experience: 99, style: "versatile", retainerFee: 3000, rideFee: 450, winBonus: 1300, wins: 4443, rides: 24800 },
      { name: "Sean Bowen", nationality: "GB", skill: 84, experience: 72, style: "front-runner", retainerFee: 2000, rideFee: 300, winBonus: 850, wins: 623, rides: 4200 },
    ],
    nh: [
      { name: "Paul Townend", nationality: "IE", skill: 92, experience: 88, style: "stalker", retainerFee: 3500, rideFee: 500, winBonus: 1500, wins: 1456, rides: 6800, nh: true },
      { name: "Rachael Blackmore", nationality: "IE", skill: 90, experience: 82, style: "versatile", retainerFee: 3200, rideFee: 480, winBonus: 1400, wins: 1123, rides: 5600, nh: true },
      { name: "Nico de Boinville", nationality: "GB", skill: 88, experience: 84, style: "stalker", retainerFee: 2800, rideFee: 420, winBonus: 1200, wins: 978, rides: 5200, nh: true },
      { name: "Harry Cobden", nationality: "GB", skill: 87, experience: 78, style: "front-runner", retainerFee: 2600, rideFee: 400, winBonus: 1100, wins: 834, rides: 4800, nh: true },
      { name: "Sam Twiston-Davies", nationality: "GB", skill: 85, experience: 82, style: "front-runner", retainerFee: 2200, rideFee: 350, winBonus: 950, wins: 1067, rides: 6200, nh: true },
      { name: "Harry Skelton", nationality: "GB", skill: 86, experience: 80, style: "versatile", retainerFee: 2400, rideFee: 370, winBonus: 1000, wins: 1189, rides: 6800, nh: true },
      { name: "Aidan Coleman", nationality: "GB", skill: 84, experience: 86, style: "stalker", retainerFee: 2000, rideFee: 320, winBonus: 850, wins: 1234, rides: 7400, nh: true },
      { name: "Jordan Gainford", nationality: "IE", skill: 83, experience: 66, style: "versatile", retainerFee: 1800, rideFee: 280, winBonus: 750, wins: 456, rides: 3200, nh: true },
      { name: "Danny Mullins", nationality: "IE", skill: 82, experience: 78, style: "closer", retainerFee: 1600, rideFee: 260, winBonus: 700, wins: 678, rides: 4600, nh: true },
      { name: "Mark Walsh", nationality: "IE", skill: 85, experience: 84, style: "stalker", retainerFee: 2200, rideFee: 340, winBonus: 900, wins: 923, rides: 5800, nh: true },
    ],
  },

  // ── REAL TRAINERS ──
  realTrainers: [
    { name: "Aidan O'Brien", nationality: "IE", skill: 98, specialty: "flat", stable: "Ballydoyle", silksColor: "#000080" },
    { name: "John & Thady Gosden", nationality: "GB", skill: 95, specialty: "flat", stable: "Clarehaven", silksColor: "#800020" },
    { name: "Charlie Appleby", nationality: "GB", skill: 94, specialty: "flat", stable: "Moulton Paddocks", silksColor: "#0066CC" },
    { name: "William Haggas", nationality: "GB", skill: 92, specialty: "flat", stable: "Somerville Lodge", silksColor: "#228B22" },
    { name: "Roger Varian", nationality: "GB", skill: 91, specialty: "flat", stable: "Carlburg", silksColor: "#8B0000" },
    { name: "Andrew Balding", nationality: "GB", skill: 90, specialty: "flat", stable: "Kingsclere", silksColor: "#4B0082" },
    { name: "Karl Burke", nationality: "GB", skill: 87, specialty: "flat", stable: "Spigot Lodge", silksColor: "#FF6600" },
    { name: "Ralph Beckett", nationality: "GB", skill: 88, specialty: "flat", stable: "Kimpton Down", silksColor: "#006400" },
    { name: "Richard Hannon", nationality: "GB", skill: 86, specialty: "flat", stable: "Herridge", silksColor: "#B22222" },
    { name: "Clive Cox", nationality: "GB", skill: 85, specialty: "flat", stable: "Beechdown Farm", silksColor: "#DAA520" },
    { name: "Sir Michael Stoute", nationality: "GB", skill: 93, specialty: "flat", stable: "Freemason Lodge", silksColor: "#2F4F4F" },
    { name: "Richard Fahey", nationality: "GB", skill: 85, specialty: "flat", stable: "Musley Bank", silksColor: "#CC5500" },
    { name: "Mark Johnston", nationality: "GB", skill: 88, specialty: "flat", stable: "Kingsley House", silksColor: "#333399" },
    { name: "Hugo Palmer", nationality: "GB", skill: 84, specialty: "flat", stable: "Kremlin House", silksColor: "#556B2F" },
    { name: "Ed Walker", nationality: "GB", skill: 83, specialty: "flat", stable: "Douro House", silksColor: "#708090" },
    { name: "Bob Baffert", nationality: "US", skill: 94, specialty: "flat", stable: "Santa Anita", silksColor: "#DC143C" },
    { name: "Todd Pletcher", nationality: "US", skill: 93, specialty: "flat", stable: "Belmont Park", silksColor: "#4169E1" },
    { name: "Chad Brown", nationality: "US", skill: 92, specialty: "flat", stable: "Belmont Park", silksColor: "#8B4513" },
    { name: "Brad Cox", nationality: "US", skill: 90, specialty: "flat", stable: "Churchill Downs", silksColor: "#6B8E23" },
    { name: "Andre Fabre", nationality: "FR", skill: 95, specialty: "flat", stable: "Chantilly", silksColor: "#191970" },
    { name: "Jean-Claude Rouget", nationality: "FR", skill: 92, specialty: "flat", stable: "Pau", silksColor: "#B8860B" },
    { name: "Francis-Henri Graffard", nationality: "FR", skill: 89, specialty: "flat", stable: "Chantilly", silksColor: "#483D8B" },
    { name: "Chris Waller", nationality: "AU", skill: 95, specialty: "flat", stable: "Rosehill", silksColor: "#FF4500" },
    { name: "James Cummings", nationality: "AU", skill: 90, specialty: "flat", stable: "Flemington", silksColor: "#1E90FF" },
    { name: "Willie Mullins", nationality: "IE", skill: 98, specialty: "nh", stable: "Closutton", silksColor: "#006633" },
    { name: "Gordon Elliott", nationality: "IE", skill: 92, specialty: "nh", stable: "Cullentra House", silksColor: "#CC0000" },
    { name: "Henry de Bromhead", nationality: "IE", skill: 91, specialty: "nh", stable: "Knockeen", silksColor: "#FFD700" },
    { name: "Nicky Henderson", nationality: "GB", skill: 93, specialty: "nh", stable: "Seven Barrows", silksColor: "#000080" },
    { name: "Paul Nicholls", nationality: "GB", skill: 92, specialty: "nh", stable: "Ditcheat", silksColor: "#8B0000" },
    { name: "Dan Skelton", nationality: "GB", skill: 89, specialty: "nh", stable: "Lodge Hill", silksColor: "#2E8B57" },
    { name: "Nigel Twiston-Davies", nationality: "GB", skill: 85, specialty: "nh", stable: "Grange Hill Farm", silksColor: "#B8860B" },
    { name: "Jonjo O'Neill", nationality: "IE", skill: 84, specialty: "nh", stable: "Jackdaws Castle", silksColor: "#4B0082" },
  ],

  // ── REAL OWNERS ──
  realOwners: [
    { name: "Godolphin", principal: "Sheikh Mohammed", silksColor: "#0066CC", silksSecondary: "#0066CC", wealth: 10, specialty: "flat" },
    { name: "Coolmore", principal: "Magnier/Tabor/Smith", silksColor: "#000080", silksSecondary: "#FFFFFF", wealth: 10, specialty: "flat" },
    { name: "Juddmonte", principal: "Prince Khalid Abdullah", silksColor: "#FF69B4", silksSecondary: "#228B22", wealth: 9, specialty: "flat" },
    { name: "King Charles III", principal: "Royal Colours", silksColor: "#800080", silksSecondary: "#FFD700", wealth: 8, specialty: "flat" },
    { name: "Aga Khan", principal: "Aga Khan IV", silksColor: "#006400", silksSecondary: "#FF0000", wealth: 9, specialty: "flat" },
    { name: "Wathnan Racing", principal: "Qatar Investment", silksColor: "#8B0000", silksSecondary: "#DAA520", wealth: 10, specialty: "flat" },
    { name: "Cheveley Park Stud", principal: "Thompson Family", silksColor: "#FF4500", silksSecondary: "#FFFFFF", wealth: 8, specialty: "flat" },
    { name: "Qatar Racing", principal: "Sheikh Fahad", silksColor: "#800020", silksSecondary: "#DAA520", wealth: 9, specialty: "flat" },
    { name: "Moyglare Stud", principal: "Eva Maria Bucher-Haefner", silksColor: "#006400", silksSecondary: "#FFFFFF", wealth: 8, specialty: "flat" },
    { name: "Shadwell Estate", principal: "Sheikh Hamdan", silksColor: "#87CEEB", silksSecondary: "#FFFFFF", wealth: 9, specialty: "flat" },
    { name: "Khalid bin Hamad Al Thani", principal: "Sheikh Khalid", silksColor: "#800080", silksSecondary: "#FFFFFF", wealth: 8, specialty: "flat" },
    { name: "Ballylinch Stud", principal: "John Osborne", silksColor: "#228B22", silksSecondary: "#000000", wealth: 7, specialty: "flat" },
    { name: "Spendthrift Farm", principal: "B. Wayne Hughes", silksColor: "#FF0000", silksSecondary: "#000000", wealth: 8, specialty: "flat" },
    { name: "Stonestreet Stables", principal: "Barbara Banke", silksColor: "#FF69B4", silksSecondary: "#000000", wealth: 8, specialty: "flat" },
    { name: "Winx Syndicate", principal: "Peter Tighe", silksColor: "#000080", silksSecondary: "#FF4500", wealth: 7, specialty: "flat" },
    { name: "JP McManus", principal: "JP McManus", silksColor: "#006400", silksSecondary: "#FFD700", wealth: 9, specialty: "nh" },
    { name: "Gigginstown House Stud", principal: "Michael O'Leary", silksColor: "#800020", silksSecondary: "#FFFFFF", wealth: 8, specialty: "nh" },
    { name: "Cheveley Park Stud (NH)", principal: "Thompson Family", silksColor: "#FF4500", silksSecondary: "#FFFFFF", wealth: 8, specialty: "nh" },
    { name: "Mrs S Ricci", principal: "Susannah Ricci", silksColor: "#FF69B4", silksSecondary: "#000000", wealth: 7, specialty: "nh" },
    { name: "Simon Munir & Isaac Souede", principal: "Munir/Souede", silksColor: "#000080", silksSecondary: "#FFD700", wealth: 7, specialty: "nh" },
    { name: "The Stewart Family", principal: "Andy Stewart", silksColor: "#DAA520", silksSecondary: "#000000", wealth: 7, specialty: "nh" },
  ],

  // ── TRACKS ──
  tracks: [
    { name: "Royal Ascot", country: "GB", surface: "Turf", type: "flat", prestige: 5, distances: [1000, 1200, 1400, 1600, 2000, 2400, 4000], direction: "Right-handed", description: "Home of Royal Racing" },
    { name: "Epsom Downs", country: "GB", surface: "Turf", type: "flat", prestige: 5, distances: [1200, 1400, 1600, 2400], direction: "Left-handed", description: "Undulating Derby course" },
    { name: "Newmarket (Rowley)", country: "GB", surface: "Turf", type: "flat", prestige: 5, distances: [1000, 1200, 1400, 1600, 2000, 2400], direction: "Right-handed", description: "Headquarters of racing" },
    { name: "Newmarket (July)", country: "GB", surface: "Turf", type: "flat", prestige: 4, distances: [1000, 1200, 1400, 1600, 2000], direction: "Right-handed", description: "Summer course" },
    { name: "York", country: "GB", surface: "Turf", type: "flat", prestige: 5, distances: [1000, 1200, 1400, 1600, 2000, 2400], direction: "Left-handed", description: "The Knavesmire" },
    { name: "Goodwood", country: "GB", surface: "Turf", type: "flat", prestige: 4, distances: [1000, 1200, 1600, 2000, 2400], direction: "Right-handed", description: "Glorious Goodwood" },
    { name: "Sandown", country: "GB", surface: "Turf", type: "flat", prestige: 3, distances: [1000, 1200, 1400, 1600, 2000], direction: "Right-handed", description: "Esher Park course" },
    { name: "Doncaster", country: "GB", surface: "Turf", type: "flat", prestige: 4, distances: [1000, 1200, 1400, 1600, 2000, 2400, 2800], direction: "Left-handed", description: "Town Moor — Home of the St Leger" },
    { name: "Newbury", country: "GB", surface: "Turf", type: "flat", prestige: 3, distances: [1000, 1200, 1400, 1600, 2000], direction: "Left-handed", description: "Premier Berkshire track" },
    { name: "Chester", country: "GB", surface: "Turf", type: "flat", prestige: 3, distances: [1000, 1200, 1400, 1600, 2000, 2200], direction: "Left-handed", description: "Tight, circular Roodee course" },
    { name: "Haydock", country: "GB", surface: "Turf", type: "flat", prestige: 3, distances: [1000, 1200, 1400, 1600, 2000], direction: "Left-handed", description: "Lancashire Park racecourse" },
    { name: "Kempton", country: "GB", surface: "AW", type: "flat", prestige: 3, distances: [1000, 1200, 1400, 1600, 2000], direction: "Right-handed", description: "All-weather polytrack" },
    { name: "Wolverhampton", country: "GB", surface: "AW", type: "flat", prestige: 1, distances: [1200, 1400, 1600, 2000], direction: "Left-handed", description: "Tapeta all-weather" },
    { name: "Lingfield", country: "GB", surface: "AW", type: "flat", prestige: 2, distances: [1000, 1200, 1400, 1600, 2000], direction: "Left-handed", description: "Polytrack all-weather" },
    { name: "Newcastle", country: "GB", surface: "AW", type: "flat", prestige: 2, distances: [1000, 1200, 1400, 1600, 2000], direction: "Left-handed", description: "Gosforth Park tapeta" },
    { name: "Catterick", country: "GB", surface: "Turf", type: "flat", prestige: 1, distances: [1000, 1200, 1400, 1600], direction: "Left-handed", description: "Sharp, undulating track" },
    { name: "The Curragh", country: "IE", surface: "Turf", type: "flat", prestige: 5, distances: [1000, 1200, 1400, 1600, 2000, 2400], direction: "Right-handed", description: "HQ of Irish racing" },
    { name: "Leopardstown", country: "IE", surface: "Turf", type: "flat", prestige: 4, distances: [1200, 1400, 1600, 2000, 2400], direction: "Left-handed", description: "Dublin's premier course" },
    { name: "Longchamp", country: "FR", surface: "Turf", type: "flat", prestige: 5, distances: [1200, 1400, 1600, 2000, 2400, 4000], direction: "Right-handed", description: "Home of the Arc" },
    { name: "Chantilly", country: "FR", surface: "Turf", type: "flat", prestige: 4, distances: [1200, 1600, 2000, 2400], direction: "Right-handed", description: "French training centre" },
    { name: "Deauville", country: "FR", surface: "Turf", type: "flat", prestige: 4, distances: [1200, 1400, 1600, 2000, 2400], direction: "Right-handed", description: "Normandy seaside course" },
    { name: "Meydan", country: "UAE", surface: "Dirt", type: "flat", prestige: 5, distances: [1200, 1600, 1800, 2000, 2400], direction: "Left-handed", description: "Dubai World Cup venue" },
    { name: "Churchill Downs", country: "US", surface: "Dirt", type: "flat", prestige: 5, distances: [1200, 1400, 1600, 2000], direction: "Left-handed", description: "Home of the Kentucky Derby" },
    { name: "Saratoga", country: "US", surface: "Dirt", type: "flat", prestige: 4, distances: [1200, 1400, 1600, 1800, 2000], direction: "Left-handed", description: "The Graveyard of Champions" },
    { name: "Del Mar", country: "US", surface: "Dirt", type: "flat", prestige: 4, distances: [1200, 1400, 1600, 1800, 2000], direction: "Left-handed", description: "Where the Turf Meets the Surf" },
    { name: "Flemington", country: "AU", surface: "Turf", type: "flat", prestige: 5, distances: [1200, 1400, 1600, 2000, 2400, 3200], direction: "Left-handed", description: "Home of the Melbourne Cup" },
    { name: "Randwick", country: "AU", surface: "Turf", type: "flat", prestige: 5, distances: [1200, 1400, 1600, 2000, 2400], direction: "Left-handed", description: "Royal Randwick" },
    { name: "Sha Tin", country: "HK", surface: "Turf", type: "flat", prestige: 5, distances: [1200, 1400, 1600, 2000, 2400], direction: "Right-handed", description: "HKJC showcase racecourse" },
    { name: "Tokyo", country: "JP", surface: "Turf", type: "flat", prestige: 5, distances: [1400, 1600, 1800, 2000, 2400, 3200], direction: "Left-handed", description: "Japan Cup venue" },
    { name: "Cheltenham", country: "GB", surface: "Turf", type: "nh", prestige: 5, distances: [3200, 4000, 4800, 5200], direction: "Left-handed", description: "The Festival — NH HQ" },
    { name: "Aintree", country: "GB", surface: "Turf", type: "nh", prestige: 5, distances: [3200, 4000, 5200, 7200], direction: "Left-handed", description: "Home of the Grand National" },
    { name: "Kempton (NH)", country: "GB", surface: "Turf", type: "nh", prestige: 4, distances: [3200, 4000, 4800], direction: "Right-handed", description: "King George venue" },
    { name: "Ascot (NH)", country: "GB", surface: "Turf", type: "nh", prestige: 4, distances: [3200, 4000, 4200], direction: "Right-handed", description: "Winter jumping at Ascot" },
    { name: "Sandown (NH)", country: "GB", surface: "Turf", type: "nh", prestige: 3, distances: [3200, 4000, 4800], direction: "Right-handed", description: "Season finale at Sandown" },
    { name: "Leopardstown (NH)", country: "IE", surface: "Turf", type: "nh", prestige: 4, distances: [3200, 4000, 4800], direction: "Left-handed", description: "Christmas Festival venue" },
    { name: "Punchestown", country: "IE", surface: "Turf", type: "nh", prestige: 5, distances: [3200, 4000, 4800, 5200], direction: "Right-handed", description: "Season-ending Festival" },
    { name: "Plumpton", country: "GB", surface: "Turf", type: "nh", prestige: 1, distances: [3200, 4000], direction: "Left-handed", description: "Tight Sussex track" },
    { name: "Fontwell", country: "GB", surface: "Turf", type: "nh", prestige: 1, distances: [3200, 4000, 4800], direction: "Left-handed", description: "Figure-of-eight chase course" },
  ],

  // ── RACE CLASSES ──
  raceClasses: [
    { class: 7, name: "Class 7", minRating: 0, maxRating: 45, prizeMoney: 3500, type: "handicap" },
    { class: 6, name: "Class 6", minRating: 0, maxRating: 55, prizeMoney: 5500, type: "handicap" },
    { class: 5, name: "Class 5", minRating: 46, maxRating: 65, prizeMoney: 8000, type: "handicap" },
    { class: 4, name: "Class 4", minRating: 56, maxRating: 75, prizeMoney: 13000, type: "handicap" },
    { class: 3, name: "Class 3", minRating: 66, maxRating: 85, prizeMoney: 25000, type: "handicap" },
    { class: 2, name: "Class 2", minRating: 76, maxRating: 100, prizeMoney: 45000, type: "conditions" },
    { class: 1, name: "Listed", minRating: 86, maxRating: 115, prizeMoney: 80000, type: "pattern" },
    { class: 0, name: "Group 3", minRating: 100, maxRating: 125, prizeMoney: 130000, type: "pattern" },
    { class: -1, name: "Group 2", minRating: 110, maxRating: 135, prizeMoney: 225000, type: "pattern" },
    { class: -2, name: "Group 1", minRating: 120, maxRating: 150, prizeMoney: 500000, type: "pattern" },
  ],

  groundTypes: ["Hard", "Firm", "Good to Firm", "Good", "Good to Soft", "Soft", "Heavy"],

  // Ground probability by month (index 0-6 maps to groundTypes)
  seasonalGround: {
    0:  [0, 0.02, 0.08, 0.15, 0.25, 0.30, 0.20],  // Jan
    1:  [0, 0.03, 0.10, 0.20, 0.25, 0.25, 0.17],  // Feb
    2:  [0, 0.05, 0.15, 0.30, 0.25, 0.18, 0.07],  // Mar
    3:  [0, 0.08, 0.22, 0.35, 0.20, 0.12, 0.03],  // Apr
    4:  [0.02, 0.12, 0.28, 0.35, 0.15, 0.06, 0.02], // May
    5:  [0.05, 0.18, 0.30, 0.30, 0.12, 0.04, 0.01], // Jun
    6:  [0.08, 0.22, 0.30, 0.25, 0.10, 0.04, 0.01], // Jul
    7:  [0.05, 0.15, 0.28, 0.30, 0.14, 0.06, 0.02], // Aug
    8:  [0.02, 0.10, 0.22, 0.30, 0.20, 0.12, 0.04], // Sep
    9:  [0, 0.05, 0.12, 0.25, 0.28, 0.20, 0.10],   // Oct
    10: [0, 0.02, 0.08, 0.18, 0.28, 0.28, 0.16],   // Nov
    11: [0, 0.01, 0.05, 0.12, 0.25, 0.32, 0.25],   // Dec
  },

  trainingRegimes: [
    { id: "rest", name: "Rest", icon: "🛏️", fitnessChange: -5, staminaChange: 0, speedChange: -1, healthRisk: 0, moraleChange: 3, description: "Complete rest. Recovers morale and reduces fitness." },
    { id: "light", name: "Light Work", icon: "🚶", fitnessChange: 2, staminaChange: 1, speedChange: 0, healthRisk: 0.01, moraleChange: 1, description: "Easy canters and walking. Gentle fitness building." },
    { id: "moderate", name: "Moderate", icon: "🏃", fitnessChange: 5, staminaChange: 2, speedChange: 1, healthRisk: 0.03, moraleChange: 0, description: "Regular gallops. Balanced training approach." },
    { id: "intense", name: "Intense", icon: "💪", fitnessChange: 8, staminaChange: 3, speedChange: 2, healthRisk: 0.08, moraleChange: -2, description: "Hard training. Fast improvement but injury risk." },
    { id: "speed", name: "Speed Work", icon: "⚡", fitnessChange: 3, staminaChange: -1, speedChange: 4, healthRisk: 0.06, moraleChange: -1, description: "Sprint drills. Boosts speed at cost of stamina." },
    { id: "stamina", name: "Endurance", icon: "🏔️", fitnessChange: 4, staminaChange: 4, speedChange: -1, healthRisk: 0.04, moraleChange: -1, description: "Long distance work. Builds staying power." },
    { id: "swim", name: "Swimming", icon: "🏊", fitnessChange: 3, staminaChange: 2, speedChange: 0, healthRisk: 0.005, moraleChange: 2, description: "Pool sessions. Low impact, good recovery." },
    { id: "hills", name: "Hill Work", icon: "⛰️", fitnessChange: 6, staminaChange: 3, speedChange: 2, healthRisk: 0.05, moraleChange: -1, description: "Uphill gallops. Builds power and stamina." },
  ],

  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],

  // ── REAL RACE CALENDAR ──
  // month: 0-indexed. week: 1-4. type: flat/nh
  championRaces: [
    // FLAT — British Classics & Group 1s
    { name: "2000 Guineas", track: "Newmarket (Rowley)", distance: 1600, month: 4, week: 1, type: "flat", sexRestriction: "colts", ageRestriction: 3, prize: 1000000, country: "GB" },
    { name: "1000 Guineas", track: "Newmarket (Rowley)", distance: 1600, month: 4, week: 1, type: "flat", sexRestriction: "fillies", ageRestriction: 3, prize: 800000, country: "GB" },
    { name: "The Derby", track: "Epsom Downs", distance: 2400, month: 5, week: 1, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 1750000, country: "GB" },
    { name: "The Oaks", track: "Epsom Downs", distance: 2400, month: 5, week: 1, type: "flat", sexRestriction: "fillies", ageRestriction: 3, prize: 850000, country: "GB" },
    { name: "St James's Palace Stakes", track: "Royal Ascot", distance: 1600, month: 5, week: 3, type: "flat", sexRestriction: "colts", ageRestriction: 3, prize: 600000, country: "GB" },
    { name: "Coronation Stakes", track: "Royal Ascot", distance: 1600, month: 5, week: 3, type: "flat", sexRestriction: "fillies", ageRestriction: 3, prize: 600000, country: "GB" },
    { name: "Gold Cup", track: "Royal Ascot", distance: 4000, month: 5, week: 3, type: "flat", sexRestriction: null, ageRestriction: null, prize: 1000000, country: "GB" },
    { name: "Diamond Jubilee Stakes", track: "Royal Ascot", distance: 1200, month: 5, week: 4, type: "flat", sexRestriction: null, ageRestriction: null, prize: 700000, country: "GB" },
    { name: "King George VI & Queen Elizabeth Stakes", track: "Royal Ascot", distance: 2400, month: 6, week: 4, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 1250000, country: "GB" },
    { name: "Sussex Stakes", track: "Goodwood", distance: 1600, month: 7, week: 1, type: "flat", sexRestriction: null, ageRestriction: null, prize: 1000000, country: "GB" },
    { name: "Juddmonte International", track: "York", distance: 2100, month: 7, week: 3, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 1085000, country: "GB" },
    { name: "Nunthorpe Stakes", track: "York", distance: 1000, month: 7, week: 3, type: "flat", sexRestriction: null, ageRestriction: null, prize: 500000, country: "GB" },
    { name: "St Leger", track: "Doncaster", distance: 2800, month: 8, week: 2, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 700000, country: "GB" },
    { name: "Sprint Cup", track: "Haydock", distance: 1200, month: 8, week: 1, type: "flat", sexRestriction: null, ageRestriction: null, prize: 400000, country: "GB" },
    { name: "Champion Stakes", track: "Royal Ascot", distance: 2000, month: 9, week: 3, type: "flat", sexRestriction: null, ageRestriction: null, prize: 1300000, country: "GB" },
    { name: "Queen Elizabeth II Stakes", track: "Royal Ascot", distance: 1600, month: 9, week: 3, type: "flat", sexRestriction: null, ageRestriction: null, prize: 1000000, country: "GB" },
    { name: "British Champions Sprint", track: "Royal Ascot", distance: 1200, month: 9, week: 3, type: "flat", sexRestriction: null, ageRestriction: null, prize: 600000, country: "GB" },

    // FLAT — Irish Classics
    { name: "Irish 2000 Guineas", track: "The Curragh", distance: 1600, month: 4, week: 4, type: "flat", sexRestriction: "colts", ageRestriction: 3, prize: 600000, country: "IE" },
    { name: "Irish 1000 Guineas", track: "The Curragh", distance: 1600, month: 4, week: 4, type: "flat", sexRestriction: "fillies", ageRestriction: 3, prize: 500000, country: "IE" },
    { name: "Irish Derby", track: "The Curragh", distance: 2400, month: 5, week: 4, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 1500000, country: "IE" },
    { name: "Irish Oaks", track: "The Curragh", distance: 2400, month: 6, week: 3, type: "flat", sexRestriction: "fillies", ageRestriction: 3, prize: 600000, country: "IE" },
    { name: "Irish Champion Stakes", track: "Leopardstown", distance: 2000, month: 8, week: 2, type: "flat", sexRestriction: null, ageRestriction: null, prize: 1250000, country: "IE" },

    // FLAT — French Group 1s
    { name: "Poule d'Essai des Poulains", track: "Longchamp", distance: 1600, month: 4, week: 3, type: "flat", sexRestriction: "colts", ageRestriction: 3, prize: 600000, country: "FR" },
    { name: "Poule d'Essai des Pouliches", track: "Longchamp", distance: 1600, month: 4, week: 3, type: "flat", sexRestriction: "fillies", ageRestriction: 3, prize: 600000, country: "FR" },
    { name: "Prix du Jockey Club", track: "Chantilly", distance: 2100, month: 5, week: 1, type: "flat", sexRestriction: "colts", ageRestriction: 3, prize: 1500000, country: "FR" },
    { name: "Prix de Diane", track: "Chantilly", distance: 2100, month: 5, week: 3, type: "flat", sexRestriction: "fillies", ageRestriction: 3, prize: 1000000, country: "FR" },
    { name: "Prix de l'Arc de Triomphe", track: "Longchamp", distance: 2400, month: 9, week: 1, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 5000000, country: "FR" },

    // FLAT — International
    { name: "Dubai World Cup", track: "Meydan", distance: 2000, month: 2, week: 4, type: "flat", sexRestriction: null, ageRestriction: null, prize: 12000000, country: "UAE" },
    { name: "Dubai Sheema Classic", track: "Meydan", distance: 2400, month: 2, week: 4, type: "flat", sexRestriction: null, ageRestriction: null, prize: 6000000, country: "UAE" },
    { name: "Dubai Turf", track: "Meydan", distance: 1800, month: 2, week: 4, type: "flat", sexRestriction: null, ageRestriction: null, prize: 4000000, country: "UAE" },
    { name: "Kentucky Derby", track: "Churchill Downs", distance: 2000, month: 4, week: 1, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 3000000, country: "US" },
    { name: "Preakness Stakes", track: "Churchill Downs", distance: 1900, month: 4, week: 3, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 1650000, country: "US" },
    { name: "Belmont Stakes", track: "Saratoga", distance: 2400, month: 5, week: 2, type: "flat", sexRestriction: null, ageRestriction: 3, prize: 2000000, country: "US" },
    { name: "Breeders' Cup Classic", track: "Del Mar", distance: 2000, month: 10, week: 1, type: "flat", sexRestriction: null, ageRestriction: null, prize: 7000000, country: "US" },
    { name: "Breeders' Cup Turf", track: "Del Mar", distance: 2400, month: 10, week: 1, type: "flat", sexRestriction: null, ageRestriction: null, prize: 4000000, country: "US" },
    { name: "Breeders' Cup Mile", track: "Del Mar", distance: 1600, month: 10, week: 1, type: "flat", sexRestriction: null, ageRestriction: null, prize: 2000000, country: "US" },
    { name: "Melbourne Cup", track: "Flemington", distance: 3200, month: 10, week: 1, type: "flat", sexRestriction: null, ageRestriction: null, prize: 5000000, country: "AU" },
    { name: "Cox Plate", track: "Randwick", distance: 2040, month: 9, week: 4, type: "flat", sexRestriction: null, ageRestriction: null, prize: 3000000, country: "AU" },
    { name: "Hong Kong Cup", track: "Sha Tin", distance: 2000, month: 11, week: 2, type: "flat", sexRestriction: null, ageRestriction: null, prize: 4000000, country: "HK" },
    { name: "Hong Kong Mile", track: "Sha Tin", distance: 1600, month: 11, week: 2, type: "flat", sexRestriction: null, ageRestriction: null, prize: 3000000, country: "HK" },
    { name: "Hong Kong Sprint", track: "Sha Tin", distance: 1200, month: 11, week: 2, type: "flat", sexRestriction: null, ageRestriction: null, prize: 2500000, country: "HK" },
    { name: "Japan Cup", track: "Tokyo", distance: 2400, month: 10, week: 4, type: "flat", sexRestriction: null, ageRestriction: null, prize: 6000000, country: "JP" },

    // NATIONAL HUNT
    { name: "Champion Hurdle", track: "Cheltenham", distance: 3200, month: 2, week: 2, type: "nh", sexRestriction: null, ageRestriction: null, prize: 500000, country: "GB" },
    { name: "Queen Mother Champion Chase", track: "Cheltenham", distance: 3200, month: 2, week: 3, type: "nh", sexRestriction: null, ageRestriction: null, prize: 475000, country: "GB" },
    { name: "Stayers' Hurdle", track: "Cheltenham", distance: 4800, month: 2, week: 3, type: "nh", sexRestriction: null, ageRestriction: null, prize: 400000, country: "GB" },
    { name: "Cheltenham Gold Cup", track: "Cheltenham", distance: 5200, month: 2, week: 4, type: "nh", sexRestriction: null, ageRestriction: null, prize: 625000, country: "GB" },
    { name: "Triumph Hurdle", track: "Cheltenham", distance: 3200, month: 2, week: 4, type: "nh", sexRestriction: null, ageRestriction: 4, prize: 175000, country: "GB" },
    { name: "Grand National", track: "Aintree", distance: 7200, month: 3, week: 2, type: "nh", sexRestriction: null, ageRestriction: null, prize: 1000000, country: "GB" },
    { name: "Aintree Hurdle", track: "Aintree", distance: 4000, month: 3, week: 2, type: "nh", sexRestriction: null, ageRestriction: null, prize: 300000, country: "GB" },
    { name: "Melling Chase", track: "Aintree", distance: 4000, month: 3, week: 2, type: "nh", sexRestriction: null, ageRestriction: null, prize: 350000, country: "GB" },
    { name: "King George VI Chase", track: "Kempton (NH)", distance: 4800, month: 11, week: 4, type: "nh", sexRestriction: null, ageRestriction: null, prize: 500000, country: "GB" },
    { name: "Betfair Chase", track: "Haydock", distance: 4800, month: 10, week: 3, type: "nh", sexRestriction: null, ageRestriction: null, prize: 250000, country: "GB" },
    { name: "Fighting Fifth Hurdle", track: "Newcastle", distance: 3200, month: 10, week: 4, type: "nh", sexRestriction: null, ageRestriction: null, prize: 150000, country: "GB" },
    { name: "Punchestown Gold Cup", track: "Punchestown", distance: 5200, month: 3, week: 4, type: "nh", sexRestriction: null, ageRestriction: null, prize: 400000, country: "IE" },
    { name: "Irish Gold Cup", track: "Leopardstown (NH)", distance: 4800, month: 1, week: 1, type: "nh", sexRestriction: null, ageRestriction: null, prize: 250000, country: "IE" },
  ],

  // ── RACING RULES ──
  rules: {
    // Weight for Age scale (lbs) - simplified. Difference from standard 9st (126lbs) for 3yo vs older at given distance
    weightForAge: {
      1000: { "2": -18, "3": -3, "4": 0, "5+": 0 },
      1200: { "2": -19, "3": -5, "4": 0, "5+": 0 },
      1400: { "2": -21, "3": -7, "4": 0, "5+": 0 },
      1600: { "2": -24, "3": -9, "4": 0, "5+": 0 },
      2000: { "2": -28, "3": -10, "4": 0, "5+": 0 },
      2400: { "2": -30, "3": -11, "4": 0, "5+": 0 },
      2800: { "2": null, "3": -12, "4": 0, "5+": 0 },
      3200: { "2": null, "3": -14, "4": -1, "5+": 0 },
    },
    fillySexAllowance: 3,   // Fillies receive 3lb allowance in mixed-sex Group races
    winPenalty: 3,           // 3lb penalty for a previous winner in handicaps
    baseWeight: 126,         // 9st 0lb in pounds
    minWeight: 112,          // 8st 0lb minimum
    maxWeight: 140,          // 10st 0lb max in handicaps
    maxFieldSize: 20,        // Maximum runners per race (except Grand National: 40)
    grandNationalMaxField: 40,
    minDaysBetweenRuns: 7,   // Minimum 7 days between races
    flatSeasonMonths: [2, 3, 4, 5, 6, 7, 8, 9, 10],  // March - November
    nhSeasonMonths: [0, 1, 2, 3, 9, 10, 11],          // Oct - April
    awAllYear: true,          // All-weather racing runs year round
    breedingSeason: [1, 2, 3, 4, 5],   // Feb - June (Northern Hemisphere)
    retirementAgeFlat: 10,
    retirementAgeNH: 14,

    // Prize money distribution (% of total)
    prizeDistribution: {
      1: 0.567,   // 1st gets 56.7%
      2: 0.217,   // 2nd gets 21.7%
      3: 0.108,   // 3rd gets 10.8%
      4: 0.054,   // 4th gets 5.4%
      5: 0.027,   // 5th gets 2.7%
      6: 0.027,   // 6th gets 2.7%
    },
  },

  distanceCategories: [
    { name: "Sprint", min: 1000, max: 1200 },
    { name: "Miler", min: 1400, max: 1600 },
    { name: "Middle Distance", min: 1800, max: 2400 },
    { name: "Stayer", min: 2800, max: 4000 },
    { name: "Extreme", min: 4000, max: 8000 },
  ],

  weeklyExpenses: {
    perHorse: 350,
    stableUpkeep: 500,
    jockeyRetainer: 200,
  },
};
