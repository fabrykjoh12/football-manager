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

  const Data = {
    ATTRIBUTES,
    ATTRIBUTE_LABELS,
    POSITIONS,
    POSITION_WEIGHTS,
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
