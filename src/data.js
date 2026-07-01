(function (global) {
  "use strict";

  const ATTRIBUTES = [
    "pace",
    "acceleration",
    "agility",
    "balance",
    "finishing",
    "longShots",
    "passing",
    "vision",
    "crossing",
    "dribbling",
    "firstTouch",
    "heading",
    "tackling",
    "positioning",
    "marking",
    "strength",
    "stamina",
    "jumping",
    "injuryResistance",
    "naturalFitness",
    "technique",
    "setPieces",
    "penalties",
    "composure",
    "decisions",
    "anticipation",
    "concentration",
    "leadership",
    "workRate",
    "teamwork",
    "aggression",
    "bravery",
    "flair",
    "offTheBall",
    "reflexes",
    "handling",
    "diving",
    "oneOnOnes",
    "aerialReach",
    "commandOfArea",
    "distribution",
    "kicking"
  ];

  const ATTRIBUTE_LABELS = {
    pace: "Pace",
    acceleration: "Acceleration",
    agility: "Agility",
    balance: "Balance",
    finishing: "Finishing",
    longShots: "Long Shots",
    passing: "Passing",
    vision: "Vision",
    crossing: "Crossing",
    dribbling: "Dribbling",
    firstTouch: "First Touch",
    heading: "Heading",
    tackling: "Tackling",
    positioning: "Positioning",
    marking: "Marking",
    strength: "Strength",
    stamina: "Stamina",
    jumping: "Jumping",
    injuryResistance: "Injury Resistance",
    naturalFitness: "Natural Fitness",
    technique: "Technique",
    setPieces: "Set Pieces",
    penalties: "Penalties",
    composure: "Composure",
    decisions: "Decisions",
    anticipation: "Anticipation",
    concentration: "Concentration",
    leadership: "Leadership",
    workRate: "Work Rate",
    teamwork: "Teamwork",
    aggression: "Aggression",
    bravery: "Bravery",
    flair: "Flair",
    offTheBall: "Off The Ball",
    reflexes: "Reflexes",
    handling: "Handling",
    diving: "Diving",
    oneOnOnes: "One-on-Ones",
    aerialReach: "Aerial Reach",
    commandOfArea: "Command Area",
    distribution: "Distribution",
    kicking: "Kicking"
  };

  const POSITIONS = ["GK", "RB", "CB", "LB", "DM", "CM", "AM", "RW", "LW", "ST"];

  const POSITION_WEIGHTS = {
    GK: { reflexes: 1.35, diving: 1.25, handling: 1.2, positioning: 1.2, oneOnOnes: 1.15, aerialReach: 1.1, commandOfArea: 1.0, distribution: 0.95, decisions: 0.95 },
    RB: { pace: 1.1, acceleration: 1.0, crossing: 1.1, tackling: 1.1, marking: 1.0, stamina: 1.1, workRate: 1.1, positioning: 1.0, teamwork: 0.95 },
    LB: { pace: 1.1, acceleration: 1.0, crossing: 1.1, tackling: 1.1, marking: 1.0, stamina: 1.1, workRate: 1.1, positioning: 1.0, teamwork: 0.95 },
    CB: { heading: 1.2, tackling: 1.2, marking: 1.2, positioning: 1.2, strength: 1.1, jumping: 1.1, concentration: 1.05, bravery: 1.0, composure: 0.9 },
    DM: { tackling: 1.15, positioning: 1.15, passing: 1.05, decisions: 1.1, anticipation: 1.0, stamina: 1.05, workRate: 1.1, teamwork: 1.0 },
    CM: { passing: 1.2, vision: 1.1, decisions: 1.1, firstTouch: 1.05, technique: 1.0, stamina: 1.0, teamwork: 1.0, workRate: 1.0 },
    AM: { passing: 1.1, vision: 1.2, dribbling: 1.1, firstTouch: 1.1, technique: 1.05, flair: 1.0, offTheBall: 1.0, longShots: 1.0, decisions: 1.0 },
    RW: { pace: 1.15, acceleration: 1.1, crossing: 1.1, dribbling: 1.2, technique: 1.0, offTheBall: 1.0, firstTouch: 1.0, finishing: 0.95 },
    LW: { pace: 1.15, acceleration: 1.1, crossing: 1.1, dribbling: 1.2, technique: 1.0, offTheBall: 1.0, firstTouch: 1.0, finishing: 0.95 },
    ST: { finishing: 1.35, composure: 1.2, offTheBall: 1.15, firstTouch: 1.05, heading: 1.0, strength: 0.95, decisions: 1.0, anticipation: 1.0 }
  };

  const CLUB_TEMPLATES = [
    { id: "northbridge", name: "Northbridge Albion", city: "Northbridge", reputation: 74, balance: 52000000, transferBudget: 15500000, wageBudget: 1180000 },
    { id: "kingsport", name: "Kingsport City", city: "Kingsport", reputation: 78, balance: 68000000, transferBudget: 20500000, wageBudget: 1420000 },
    { id: "harbour", name: "Harbour FC", city: "Harbour", reputation: 70, balance: 42000000, transferBudget: 11200000, wageBudget: 980000 },
    { id: "meridian", name: "Meridian United", city: "Meridian", reputation: 72, balance: 48000000, transferBudget: 13500000, wageBudget: 1050000 },
    { id: "ironvale", name: "Ironvale Athletic", city: "Ironvale", reputation: 67, balance: 35000000, transferBudget: 8400000, wageBudget: 810000 },
    { id: "solford", name: "Solford Rovers", city: "Solford", reputation: 65, balance: 31000000, transferBudget: 7200000, wageBudget: 760000 },
    { id: "eastmere", name: "Eastmere Town", city: "Eastmere", reputation: 62, balance: 28000000, transferBudget: 6200000, wageBudget: 680000 },
    { id: "valence", name: "Valence Wanderers", city: "Valence", reputation: 69, balance: 39000000, transferBudget: 9800000, wageBudget: 900000 }
  ];

  const NATIONALITIES = [
    "England",
    "Norway",
    "France",
    "Spain",
    "Germany",
    "Portugal",
    "Italy",
    "Netherlands",
    "Denmark",
    "Sweden",
    "Brazil",
    "Argentina",
    "Croatia",
    "Belgium",
    "Ghana",
    "Japan"
  ];

  const FIRST_NAMES = [
    "Noah",
    "Leo",
    "Oscar",
    "Elias",
    "Mateo",
    "Felix",
    "Jonas",
    "Milan",
    "Theo",
    "Adam",
    "Lucas",
    "Nico",
    "Victor",
    "Adrian",
    "Samuel",
    "Daniel",
    "Rafael",
    "Ivan",
    "Marco",
    "Julian",
    "Tomas",
    "Hugo",
    "Emil",
    "Marius"
  ];

  const LAST_NAMES = [
    "Berg",
    "Hansen",
    "Meyer",
    "Costa",
    "Silva",
    "Martin",
    "Rossi",
    "Jansen",
    "Schmidt",
    "Dubois",
    "Santos",
    "Garcia",
    "Larsen",
    "Nilsen",
    "Eriksen",
    "Kovac",
    "Hayes",
    "Walker",
    "Reed",
    "Bennett",
    "Morgan",
    "Vega",
    "Moreau",
    "Ito"
  ];

  const SQUAD_BLUEPRINT = [
    "GK",
    "GK",
    "RB",
    "RB",
    "CB",
    "CB",
    "CB",
    "CB",
    "LB",
    "LB",
    "DM",
    "DM",
    "CM",
    "CM",
    "CM",
    "AM",
    "AM",
    "RW",
    "RW",
    "LW",
    "LW",
    "ST",
    "ST",
    "ST"
  ];

  const FORMATIONS = {
    "4-3-3": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "CM", "RW", "LW", "ST"],
    "4-2-3-1": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "AM", "RW", "LW", "ST"],
    "4-4-2": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "LW", "ST", "ST"],
    "4-1-4-1": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "CM", "RW", "LW", "ST"],
    "3-4-3": ["GK", "CB", "CB", "CB", "CM", "CM", "RW", "LW", "AM", "ST", "ST"],
    "3-5-2": ["GK", "CB", "CB", "CB", "DM", "CM", "CM", "RW", "LW", "ST", "ST"],
    "5-2-3": ["GK", "RB", "CB", "CB", "CB", "LB", "CM", "CM", "RW", "LW", "ST"],
    "5-3-2": ["GK", "RB", "CB", "CB", "CB", "LB", "DM", "CM", "CM", "ST", "ST"],
    "4-2-2-2": ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "AM", "AM", "ST", "ST"]
  };

  const TACTIC_GROUPS = [
    {
      key: "mentality",
      label: "Mentality",
      description: "How much risk the team accepts when building attacks.",
      options: [
        { value: "cautious", label: "Cautious", detail: "Protects space, lowers chance volume." },
        { value: "balanced", label: "Balanced", detail: "Keeps risk and control neutral." },
        { value: "positive", label: "Positive", detail: "Adds attacking runners with moderate exposure." },
        { value: "attacking", label: "Attacking", detail: "Maximizes pressure and chance creation." }
      ]
    },
    {
      key: "pressing",
      label: "Pressing",
      description: "How aggressively the team tries to win the ball back.",
      options: [
        { value: "regroup", label: "Regroup", detail: "Drops into shape and saves legs." },
        { value: "standard", label: "Standard", detail: "Presses in common trigger moments." },
        { value: "high", label: "High", detail: "Compresses the pitch and forces mistakes." },
        { value: "relentless", label: "Relentless", detail: "Huge intensity with more fouls and fatigue." }
      ]
    },
    {
      key: "tempo",
      label: "Tempo",
      description: "How quickly possession turns into attacks.",
      options: [
        { value: "patient", label: "Patient", detail: "Improves passing and control." },
        { value: "balanced", label: "Balanced", detail: "Varies speed by situation." },
        { value: "direct", label: "Direct", detail: "Creates shots earlier with lower accuracy." },
        { value: "vertical", label: "Vertical", detail: "Fast, forward-first attacks." }
      ]
    },
    {
      key: "width",
      label: "Width",
      description: "Where the team prefers to overload the pitch.",
      options: [
        { value: "narrow", label: "Narrow", detail: "Crowds central zones and midfield." },
        { value: "balanced", label: "Balanced", detail: "Keeps both central and wide routes open." },
        { value: "wide", label: "Wide", detail: "Uses touchline width, crosses, and corners." }
      ]
    },
    {
      key: "line",
      label: "Defensive Line",
      description: "How high the back line holds territory.",
      options: [
        { value: "deep", label: "Deep", detail: "Reduces space behind but sacrifices territory." },
        { value: "standard", label: "Standard", detail: "Keeps the back line compact." },
        { value: "high", label: "High", detail: "Pins opponents back but invites balls behind." }
      ]
    },
    {
      key: "focus",
      label: "Attack Focus",
      description: "The main route used to create chances.",
      options: [
        { value: "mixed", label: "Mixed", detail: "Balances chance creation across roles." },
        { value: "central", label: "Central", detail: "Uses midfielders and creators between lines." },
        { value: "flanks", label: "Flanks", detail: "Prioritizes wingers, fullbacks, and crossing." },
        { value: "setPieces", label: "Set Pieces", detail: "Leans into corners, heading, and dead balls." },
        { value: "counter", label: "Counter", detail: "Invites pressure, then attacks space quickly." }
      ]
    }
  ];

  const COMMENTARY = {
    kickoff: ["The match begins with both teams settling into shape.", "A sharp start as the midfield battle takes hold."],
    chance: [
      "{team} work the ball into a dangerous pocket.",
      "{player} finds space between the lines for {team}.",
      "{team} move quickly after winning the second ball."
    ],
    goal: [
      "{player} finishes low into the corner.",
      "{player} scores after a clean cutback.",
      "{player} bends one beyond the goalkeeper.",
      "{player} arrives late and buries the chance."
    ],
    save: [
      "Huge save from the goalkeeper to deny {player}.",
      "{player} gets the shot away, but the keeper stands tall.",
      "A strong hand pushes {player}'s effort wide."
    ],
    card: [
      "{player} is booked after stopping the break.",
      "Yellow card for {player} after a late challenge.",
      "{player} goes into the referee's book."
    ],
    close: [
      "{player} heads over from a promising position.",
      "{player} drags a shot just wide.",
      "{player} cannot keep the volley down."
    ],
    fullTime: ["Full time."]
  };

  const FC26_RATINGS_SOURCE = {
    name: "Premier League Rating Profiles",
    url: "https://www.ea.com/en/games/ea-sports-fc/ratings/leagues-ratings/premier-league/13",
    captured: "2026-07-01",
    note: "Compact OVR/POT/PAC/SHO/PAS/DRI/DEF/PHY overlay."
  };

  const FC26_PREMIER_LEAGUE_RATINGS = [
    { n: "Mohamed Salah", pos: "RM", o: 91, p: 91, pac: 89, sho: 88, pas: 86, dri: 90, def: 45, phy: 76 },
    { n: "Rodrigo Hernández Cascante", c: "Rodri", pos: "CDM", o: 90, p: 90, pac: 65, sho: 80, pas: 86, dri: 84, def: 86, phy: 85 },
    { n: "Virgil van Dijk", pos: "CB", o: 90, p: 90, pac: 73, sho: 60, pas: 72, dri: 72, def: 90, phy: 87 },
    { n: "Erling Haaland", pos: "ST", o: 90, p: 92, pac: 86, sho: 91, pas: 70, dri: 80, def: 45, phy: 88 },
    { n: "Gianluigi Donnarumma", pos: "GK", o: 89, p: 91, pac: 90, sho: 83, pas: 70, dri: 90, def: 52, phy: 87 },
    { n: "Alisson Ramses Becker", c: "Alisson", pos: "GK", o: 89, p: 89, pac: 86, sho: 85, pas: 86, dri: 89, def: 56, phy: 90 },
    { n: "Florian Wirtz", pos: "CAM", o: 89, p: 93, pac: 80, sho: 82, pas: 88, dri: 90, def: 54, phy: 67 },
    { n: "Alexander Isak", pos: "ST", o: 88, p: 89, pac: 83, sho: 89, pas: 73, dri: 85, def: 39, phy: 76 },
    { n: "Gabriel dos S. Magalhães", c: "Gabriel", pos: "CB", o: 88, p: 88, pac: 64, sho: 44, pas: 64, dri: 65, def: 88, phy: 84 },
    { n: "Bukayo Saka", pos: "RW", o: 88, p: 90, pac: 84, sho: 82, pas: 85, dri: 88, def: 60, phy: 73 },
    { n: "Cole Palmer", pos: "CAM", o: 87, p: 90, pac: 75, sho: 83, pas: 87, dri: 87, def: 50, phy: 65 },
    { n: "Moisés Caicedo", pos: "CDM", o: 87, p: 89, pac: 71, sho: 64, pas: 78, dri: 81, def: 84, phy: 82 },
    { n: "Declan Rice", pos: "CDM", o: 87, p: 88, pac: 72, sho: 73, pas: 84, dri: 80, def: 83, phy: 83 },
    { n: "Bruno Miguel Borges Fernandes", c: "Bruno Fernandes", pos: "CAM", o: 87, p: 87, pac: 67, sho: 83, pas: 89, dri: 83, def: 65, phy: 75 },
    { n: "William Saliba", pos: "CB", o: 87, p: 89, pac: 77, sho: 39, pas: 68, dri: 72, def: 87, phy: 83 },
    { n: "Alexis Mac Allister", pos: "CM", o: 87, p: 88, pac: 66, sho: 82, pas: 85, dri: 85, def: 78, phy: 76 },
    { n: "Martin Ødegaard", pos: "CM", o: 87, p: 89, pac: 68, sho: 79, pas: 88, dri: 87, def: 67, phy: 65 },
    { n: "David Raya Martin", c: "David Raya", pos: "GK", o: 87, p: 87, pac: 86, sho: 84, pas: 87, dri: 87, def: 62, phy: 85 },
    { n: "Viktor Gyökeres", pos: "ST", o: 87, p: 88, pac: 90, sho: 86, pas: 73, dri: 81, def: 36, phy: 91 },
    { n: "Rúben Santos Gato Alves Dias", c: "Rúben Dias", pos: "CB", o: 86, p: 87, pac: 59, sho: 39, pas: 69, dri: 69, def: 86, phy: 84 },
    { n: "Bruno Guimarães Moura", c: "Bruno Guimarães", pos: "CM", o: 86, p: 87, pac: 66, sho: 75, pas: 84, dri: 84, def: 79, phy: 81 },
    { n: "Ibrahima Konaté", pos: "CB", o: 86, p: 87, pac: 77, sho: 34, pas: 63, dri: 69, def: 86, phy: 85 },
    { n: "Sandro Tonali", pos: "CDM", o: 86, p: 88, pac: 79, sho: 74, pas: 82, dri: 80, def: 81, phy: 83 },
    { n: "Tijjani Reijnders", pos: "CM", o: 86, p: 87, pac: 79, sho: 79, pas: 82, dri: 85, def: 77, phy: 77 },
    { n: "Ryan Gravenberch", pos: "CDM", o: 85, p: 88, pac: 76, sho: 76, pas: 81, dri: 85, def: 81, phy: 81 },
    { n: "Emiliano Martínez", pos: "GK", o: 85, p: 85, pac: 83, sho: 82, pas: 82, dri: 85, def: 56, phy: 85 },
    { n: "Bryan Mbeumo", pos: "RW", o: 85, p: 86, pac: 88, sho: 84, pas: 79, dri: 84, def: 49, phy: 76 },
    { n: "Phil Foden", pos: "RW", o: 85, p: 88, pac: 81, sho: 81, pas: 82, dri: 89, def: 57, phy: 57 },
    { n: "Youri Tielemans", pos: "CM", o: 85, p: 85, pac: 54, sho: 79, pas: 85, dri: 80, def: 75, phy: 72 },
    { n: "Granit Xhaka", pos: "CDM", o: 85, p: 85, pac: 47, sho: 75, pas: 85, dri: 74, def: 78, phy: 82 },
    { n: "Jordan Pickford", pos: "GK", o: 84, p: 84, pac: 84, sho: 78, pas: 88, dri: 87, def: 53, phy: 81 },
    { n: "Joško Gvardiol", pos: "LB", o: 84, p: 87, pac: 78, sho: 71, pas: 75, dri: 78, def: 84, phy: 82 },
    { n: "Marc Cucurella Saseta", c: "Marc Cucurella", pos: "LB", o: 84, p: 85, pac: 75, sho: 64, pas: 79, dri: 80, def: 82, phy: 79 },
    { n: "Enzo Fernández", pos: "CM", o: 84, p: 87, pac: 68, sho: 75, pas: 85, dri: 81, def: 73, phy: 75 },
    { n: "Giorgi Mamardashvili", pos: "GK", o: 84, p: 87, pac: 84, sho: 81, pas: 72, dri: 84, def: 48, phy: 84 },
    { n: "Xavi Simons", pos: "CAM", o: 84, p: 87, pac: 77, sho: 77, pas: 80, dri: 87, def: 61, phy: 70 },
    { n: "Cody Gakpo", pos: "LM", o: 84, p: 85, pac: 83, sho: 82, pas: 80, dri: 83, def: 47, phy: 74 },
    { n: "Bernardo Mota Carvalho e Silva", c: "Bernardo Silva", pos: "CM", o: 84, p: 84, pac: 61, sho: 78, pas: 83, dri: 89, def: 71, phy: 65 },
    { n: "Ollie Watkins", pos: "ST", o: 84, p: 84, pac: 77, sho: 83, pas: 73, dri: 80, def: 50, phy: 80 },
    { n: "James Maddison", pos: "CM", o: 84, p: 84, pac: 67, sho: 81, pas: 86, dri: 85, def: 58, phy: 64 },
    { n: "Omar Marmoush", pos: "ST", o: 84, p: 85, pac: 89, sho: 85, pas: 76, dri: 86, def: 34, phy: 71 },
    { n: "Dominik Szoboszlai", pos: "CAM", o: 83, p: 86, pac: 79, sho: 82, pas: 84, dri: 82, def: 67, phy: 76 },
    { n: "Dejan Kulusevski", pos: "CM", o: 83, p: 86, pac: 74, sho: 79, pas: 84, dri: 85, def: 62, phy: 81 },
    { n: "Mikel Merino Zazón", c: "Mikel Merino", pos: "CM", o: 83, p: 83, pac: 63, sho: 79, pas: 80, dri: 80, def: 81, phy: 80 },
    { n: "Anthony Gordon", pos: "LW", o: 83, p: 86, pac: 91, sho: 79, pas: 78, dri: 83, def: 50, phy: 71 },
    { n: "Mateo Kovačić", pos: "CM", o: 83, p: 83, pac: 67, sho: 74, pas: 81, dri: 83, def: 73, phy: 72 },
    { n: "Jeremie Frimpong", pos: "RB", o: 83, p: 85, pac: 94, sho: 62, pas: 74, dri: 84, def: 72, phy: 63 },
    { n: "Matheus Santos Carneiro da Cunha", c: "Matheus Cunha", pos: "CAM", o: 83, p: 85, pac: 77, sho: 85, pas: 79, dri: 84, def: 44, phy: 75 },
    { n: "Martín Zubimendi Ibáñez", c: "Zubimendi", pos: "CDM", o: 83, p: 87, pac: 66, sho: 67, pas: 79, dri: 79, def: 80, phy: 73 },
    { n: "Matz Sels", pos: "GK", o: 83, p: 83, pac: 82, sho: 80, pas: 79, dri: 83, def: 36, phy: 83 },
    { n: "Eberechi Eze", pos: "CAM", o: 83, p: 84, pac: 74, sho: 80, pas: 81, dri: 87, def: 50, phy: 68 },
    { n: "João Maria Palhinha Gonçalves", c: "Palhinha", pos: "CDM", o: 83, p: 83, pac: 56, sho: 68, pas: 70, dri: 72, def: 84, phy: 85 },
    { n: "Jarrod Bowen", pos: "RM", o: 83, p: 83, pac: 76, sho: 81, pas: 78, dri: 82, def: 46, phy: 70 },
    { n: "Murillo Costa dos Santos", c: "Murillo", pos: "CB", o: 83, p: 87, pac: 80, sho: 48, pas: 67, dri: 71, def: 83, phy: 83 },
    { n: "Boubacar Kamara", pos: "CDM", o: 83, p: 85, pac: 64, sho: 55, pas: 74, dri: 75, def: 83, phy: 80 },
    { n: "Nathan Aké", pos: "CB", o: 83, p: 83, pac: 72, sho: 53, pas: 72, dri: 75, def: 84, phy: 74 },
    { n: "Piero Hincapié", pos: "CB", o: 83, p: 89, pac: 84, sho: 41, pas: 65, dri: 72, def: 84, phy: 82 },
    { n: "Hugo Ekitiké", pos: "ST", o: 83, p: 88, pac: 86, sho: 78, pas: 69, dri: 85, def: 33, phy: 73 },
    { n: "Leandro Trossard", pos: "LW", o: 83, p: 83, pac: 80, sho: 81, pas: 80, dri: 85, def: 30, phy: 60 },
    { n: "Benjamin White", pos: "RB", o: 83, p: 83, pac: 70, sho: 35, pas: 75, dri: 75, def: 83, phy: 78 }
  ];

  const Data = {
    ATTRIBUTES,
    ATTRIBUTE_LABELS,
    POSITIONS,
    POSITION_WEIGHTS,
    FC26_RATINGS_SOURCE,
    FC26_PREMIER_LEAGUE_RATINGS,
    CLUB_TEMPLATES,
    NATIONALITIES,
    FIRST_NAMES,
    LAST_NAMES,
    SQUAD_BLUEPRINT,
    FORMATIONS,
    TACTIC_GROUPS,
    COMMENTARY
  };

  global.FMLData = Data;
  if (typeof module !== "undefined") {
    module.exports = Data;
  }
})(typeof window !== "undefined" ? window : globalThis);
