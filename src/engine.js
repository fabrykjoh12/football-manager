(function (global) {
  "use strict";

  const Data = global.FMLData || (typeof require !== "undefined" ? require("./data.js") : null);
  const MatchEngine = global.FMLMatchEngine || (typeof require !== "undefined" ? require("./match-engine.js") : null);
  const VERSION = "1.12.0";
  const BENCH_SIZE = 7;
  const BASE_SEASON_YEAR = 2026;
  const TRAINING_FOCUS = {
    balanced: [],
    finishing: ["finishing", "composure", "firstTouch", "longShots"],
    playmaking: ["passing", "vision", "decisions", "firstTouch"],
    defending: ["tackling", "marking", "positioning", "strength"],
    physical: ["pace", "acceleration", "stamina", "strength", "jumping"],
    mentality: ["decisions", "leadership", "workRate", "composure"]
  };
  const TRAINING_PLANS = {
    balanced: {
      label: "Balanced",
      description: "Keeps the squad ticking over with manageable load.",
      load: 1,
      recovery: 1,
      sharpness: 1,
      morale: 0.2,
      injuryRisk: 1,
      growthRate: 0.012,
      familiarity: 1.8,
      attributes: ["teamwork", "decisions", "firstTouch", "stamina"]
    },
    recovery: {
      label: "Recovery",
      description: "Prioritises freshness, morale, and reducing soft-tissue risk.",
      load: 0.25,
      recovery: 3.2,
      sharpness: -0.4,
      morale: 0.8,
      injuryRisk: 0.48,
      growthRate: 0.004,
      familiarity: 0.8,
      attributes: ["naturalFitness", "injuryResistance", "stamina"]
    },
    tactical: {
      label: "Tactical",
      description: "Builds structure, cohesion, decision-making, and role familiarity.",
      load: 0.8,
      recovery: 0.4,
      sharpness: 1.8,
      morale: 0.1,
      injuryRisk: 0.82,
      growthRate: 0.01,
      familiarity: 3.8,
      attributes: ["decisions", "positioning", "teamwork", "concentration", "passing"]
    },
    attacking: {
      label: "Attacking",
      description: "Chance creation, finishing, combinations, and final-third rhythm.",
      load: 1.2,
      recovery: -0.2,
      sharpness: 2.1,
      morale: 0.2,
      injuryRisk: 1.08,
      growthRate: 0.014,
      familiarity: 2.4,
      attributes: ["finishing", "passing", "vision", "offTheBall", "dribbling", "firstTouch"]
    },
    defensive: {
      label: "Defensive",
      description: "Shape, pressure coverage, duel work, and transition security.",
      load: 1.05,
      recovery: 0,
      sharpness: 1.7,
      morale: 0.1,
      injuryRisk: 0.96,
      growthRate: 0.013,
      familiarity: 2.8,
      attributes: ["tackling", "marking", "positioning", "concentration", "strength"]
    },
    physical: {
      label: "Physical",
      description: "Heavy conditioning block for stamina, pace, power, and intensity.",
      load: 2.35,
      recovery: -2.1,
      sharpness: 0.7,
      morale: -0.4,
      injuryRisk: 1.58,
      growthRate: 0.018,
      familiarity: 0.6,
      attributes: ["pace", "acceleration", "stamina", "strength", "jumping", "naturalFitness"]
    }
  };
  const MATCH_PREP = {
    balanced: {
      label: "Balanced Prep",
      description: "Light opponent prep across all phases.",
      sharpness: 0.4,
      familiarity: 1.2,
      phase: "chemistry"
    },
    defensiveShape: {
      label: "Defensive Shape",
      description: "Back-line distances, compactness, and box protection.",
      sharpness: 0.5,
      familiarity: 2.2,
      phase: "defense"
    },
    attackingPatterns: {
      label: "Attacking Patterns",
      description: "Automatisms for chance creation and final-third timing.",
      sharpness: 0.8,
      familiarity: 2.2,
      phase: "attack"
    },
    setPieces: {
      label: "Set Pieces",
      description: "Corners, wide free kicks, blockers, and second balls.",
      sharpness: 0.6,
      familiarity: 2,
      phase: "setPieces"
    },
    pressingTraps: {
      label: "Pressing Traps",
      description: "Trigger work, counter-press lanes, and forced turnovers.",
      sharpness: 0.9,
      familiarity: 2.3,
      phase: "pressing"
    }
  };
  const INDIVIDUAL_PLANS = {
    normal: {
      label: "Normal",
      description: "Standard first-team workload.",
      loadMultiplier: 1,
      recovery: 0,
      sharpness: 0,
      morale: 0,
      growthMultiplier: 1,
      injuryRisk: 1
    },
    recovery: {
      label: "Recovery",
      description: "Lower load with extra freshness work.",
      loadMultiplier: 0.35,
      recovery: 3.2,
      sharpness: -0.7,
      morale: 0.6,
      growthMultiplier: 0.45,
      injuryRisk: 0.42
    },
    extra: {
      label: "Extra Development",
      description: "More technical reps for improving players.",
      loadMultiplier: 1.32,
      recovery: -0.8,
      sharpness: 0.7,
      morale: -0.1,
      growthMultiplier: 1.55,
      injuryRisk: 1.28
    },
    rehab: {
      label: "Rehab",
      description: "Medical-led work for players returning from injury.",
      loadMultiplier: 0.18,
      recovery: 4.4,
      sharpness: -1.2,
      morale: 0.3,
      growthMultiplier: 0.2,
      injuryRisk: 0.3
    }
  };
  const SQUAD_ROLES = {
    star: {
      label: "Star Player",
      description: "Expected to start almost every important match.",
      expectedStartRate: 0.74,
      expectedMinuteRate: 0.72,
      wageMultiplier: 1.22,
      patience: 0.72,
      order: 5
    },
    important: {
      label: "Important Player",
      description: "Expected to be a regular starter.",
      expectedStartRate: 0.58,
      expectedMinuteRate: 0.56,
      wageMultiplier: 1.12,
      patience: 0.82,
      order: 4
    },
    rotation: {
      label: "Rotation",
      description: "Expected to rotate into the XI and play steady minutes.",
      expectedStartRate: 0.34,
      expectedMinuteRate: 0.36,
      wageMultiplier: 1,
      patience: 1,
      order: 3
    },
    prospect: {
      label: "Prospect",
      description: "Development role with selective minutes.",
      expectedStartRate: 0.16,
      expectedMinuteRate: 0.18,
      wageMultiplier: 0.86,
      patience: 1.28,
      order: 2
    },
    backup: {
      label: "Backup",
      description: "Depth option with limited minutes expected.",
      expectedStartRate: 0.1,
      expectedMinuteRate: 0.12,
      wageMultiplier: 0.82,
      patience: 1.4,
      order: 1
    }
  };
  const STAFF_DEPARTMENTS = {
    assistant: {
      label: "Assistant Manager",
      description: "Daily advice, auto-selection quality, dressing-room read, and opponent preparation.",
      baseCost: 900000,
      weeklyCost: 18000
    },
    coaching: {
      label: "Coaching Team",
      description: "Technical work, player growth, match sharpness, and first-team training detail.",
      baseCost: 1200000,
      weeklyCost: 26000
    },
    medical: {
      label: "Medical Team",
      description: "Recovery planning, injury prevention, rehab quality, and availability management.",
      baseCost: 1100000,
      weeklyCost: 23000
    },
    analysis: {
      label: "Analysis Unit",
      description: "Match preparation, role reports, opposition insight, and tactical familiarity.",
      baseCost: 950000,
      weeklyCost: 16000
    },
    scouting: {
      label: "Scouting Team",
      description: "Assignment speed, confidence growth, regional coverage, and discovery reliability.",
      baseCost: 1000000,
      weeklyCost: 19000
    }
  };
  const TACTICAL_ROLES = {
    goalkeeper: {
      label: "Goalkeeper",
      description: "Holds position, protects the box, and keeps distribution simple.",
      positions: ["GK"],
      attributes: ["positioning", "decisions", "handling", "reflexes", "composure"],
      phases: { keeper: 1, defense: 0.2 }
    },
    sweeperKeeper: {
      label: "Sweeper Keeper",
      description: "Higher starting position with more involvement in build-up.",
      positions: ["GK"],
      attributes: ["positioning", "decisions", "passing", "pace", "composure"],
      phases: { keeper: 0.8, midfield: 0.35, defense: 0.1 }
    },
    fullBack: {
      label: "Full Back",
      description: "Balanced wide defender who supports attacks without leaving the back line exposed.",
      positions: ["RB", "LB"],
      attributes: ["tackling", "marking", "positioning", "stamina", "crossing", "pace"],
      phases: { defense: 0.8, attack: 0.28, midfield: 0.1 }
    },
    wingBack: {
      label: "Wing Back",
      description: "Aggressive wide runner who stretches play and carries crossing threat.",
      positions: ["RB", "LB"],
      attributes: ["stamina", "pace", "crossing", "dribbling", "workRate", "tackling"],
      phases: { attack: 0.7, midfield: 0.35, defense: -0.15 }
    },
    centreBack: {
      label: "Centre Back",
      description: "Primary box defender focused on duels, positioning, and clearances.",
      positions: ["CB"],
      attributes: ["tackling", "marking", "positioning", "heading", "strength", "concentration"],
      phases: { defense: 0.95 }
    },
    ballPlayingDefender: {
      label: "Ball-Playing Defender",
      description: "Build-up defender who can progress possession from the back line.",
      positions: ["CB"],
      attributes: ["passing", "vision", "decisions", "composure", "positioning", "tackling"],
      phases: { defense: 0.55, midfield: 0.55 }
    },
    stopper: {
      label: "Stopper",
      description: "Front-foot defender who attacks duels and breaks up direct play.",
      positions: ["CB"],
      attributes: ["strength", "aggression", "tackling", "heading", "bravery", "positioning"],
      phases: { defense: 1.1, midfield: -0.1 }
    },
    anchor: {
      label: "Anchor",
      description: "Screens the centre backs and keeps the midfield structure stable.",
      positions: ["DM"],
      attributes: ["positioning", "marking", "tackling", "strength", "decisions", "concentration"],
      phases: { defense: 0.85, midfield: 0.25 }
    },
    deepPlaymaker: {
      label: "Deep Playmaker",
      description: "Controls build-up tempo from deeper midfield zones.",
      positions: ["DM", "CM"],
      attributes: ["passing", "vision", "decisions", "composure", "firstTouch", "positioning"],
      phases: { midfield: 0.85, defense: 0.2, attack: 0.12 }
    },
    boxToBox: {
      label: "Box-to-Box",
      description: "High-energy midfielder who contributes in both penalty areas.",
      positions: ["CM", "DM"],
      attributes: ["stamina", "workRate", "passing", "tackling", "offTheBall", "finishing"],
      phases: { midfield: 0.65, attack: 0.3, defense: 0.25 }
    },
    ballWinner: {
      label: "Ball Winner",
      description: "Wins duels, presses loose touches, and protects transitions.",
      positions: ["CM", "DM"],
      attributes: ["tackling", "aggression", "workRate", "stamina", "marking", "bravery"],
      phases: { midfield: 0.55, defense: 0.45 }
    },
    advancedPlaymaker: {
      label: "Advanced Playmaker",
      description: "Final-third connector who creates between the lines.",
      positions: ["CM", "AM"],
      attributes: ["passing", "vision", "firstTouch", "technique", "decisions", "composure"],
      phases: { midfield: 0.75, attack: 0.5 }
    },
    winger: {
      label: "Winger",
      description: "Stretches wide, attacks full backs, and creates from crosses.",
      positions: ["RW", "LW"],
      attributes: ["pace", "acceleration", "crossing", "dribbling", "stamina", "workRate"],
      phases: { attack: 0.7, midfield: 0.2 }
    },
    insideForward: {
      label: "Inside Forward",
      description: "Cuts inside to combine and attack shots from wide starting positions.",
      positions: ["RW", "LW"],
      attributes: ["finishing", "dribbling", "pace", "offTheBall", "composure", "firstTouch"],
      phases: { attack: 0.9, midfield: -0.05 }
    },
    widePlaymaker: {
      label: "Wide Playmaker",
      description: "Comes inside from wide areas to connect possession and slide passes through.",
      positions: ["RW", "LW", "AM"],
      attributes: ["passing", "vision", "technique", "firstTouch", "decisions", "dribbling"],
      phases: { midfield: 0.55, attack: 0.45 }
    },
    shadowStriker: {
      label: "Shadow Striker",
      description: "Arrives beyond the striker and attacks the box from central pockets.",
      positions: ["AM", "ST"],
      attributes: ["finishing", "offTheBall", "composure", "pace", "longShots", "decisions"],
      phases: { attack: 0.8, midfield: 0.2 }
    },
    advancedForward: {
      label: "Advanced Forward",
      description: "Leads the line, runs in behind, and prioritises goal threat.",
      positions: ["ST"],
      attributes: ["finishing", "pace", "offTheBall", "composure", "firstTouch", "acceleration"],
      phases: { attack: 1 }
    },
    pressingForward: {
      label: "Pressing Forward",
      description: "Starts the press, forces rushed passes, and keeps attacking pressure high.",
      positions: ["ST"],
      attributes: ["workRate", "stamina", "pace", "aggression", "finishing", "strength"],
      phases: { attack: 0.65, midfield: 0.35, defense: 0.15 }
    },
    targetForward: {
      label: "Target Forward",
      description: "Occupies centre backs, wins aerials, and links direct attacks.",
      positions: ["ST"],
      attributes: ["heading", "jumping", "strength", "firstTouch", "composure", "finishing"],
      phases: { attack: 0.75, midfield: 0.25 }
    }
  };
  const PLAYER_INSTRUCTIONS = {
    balanced: {
      label: "Balanced",
      description: "Follow the role without extra risk or restrictions.",
      positions: ["*"],
      attributes: ["decisions", "teamwork", "concentration"],
      phases: {},
      matchPhases: {},
      load: 0,
      risk: 0,
      difficulty: 0.8
    },
    stayBack: {
      label: "Stay Back",
      description: "Hold a safer position and prioritise defensive rest shape.",
      positions: ["RB", "LB", "CB", "DM", "CM"],
      attributes: ["positioning", "concentration", "tackling", "decisions"],
      phases: { defense: 0.75, attack: -0.35, midfield: 0.08 },
      matchPhases: { defensiveStability: 2.2, chancePrevention: 1.6, defensiveTransition: 1.8, attackStrength: -1.1, wideThreat: -0.8 },
      load: -0.06,
      risk: -0.05,
      difficulty: 1
    },
    getForward: {
      label: "Get Forward",
      description: "Arrive higher, support attacks, and accept transition risk.",
      positions: ["RB", "LB", "DM", "CM", "AM", "RW", "LW", "ST"],
      attributes: ["offTheBall", "stamina", "pace", "decisions", "finishing"],
      phases: { attack: 0.82, midfield: 0.22, defense: -0.42 },
      matchPhases: { attackStrength: 2.4, chanceCreation: 1.6, attackingTransition: 1.4, defensiveTransition: -1.4, chancePrevention: -0.8 },
      load: 0.12,
      risk: 0.12,
      difficulty: 1.15
    },
    pressMore: {
      label: "Press More",
      description: "Jump to press and force rushed passes in nearby zones.",
      positions: ["RB", "LB", "CB", "DM", "CM", "AM", "RW", "LW", "ST"],
      attributes: ["workRate", "stamina", "aggression", "pace", "decisions"],
      phases: { midfield: 0.42, defense: 0.35, attack: 0.18 },
      matchPhases: { pressingStrength: 3.4, counterAttackThreat: 1.1, defensiveTransition: 0.7, fitness: -1.2, chemistry: -0.25 },
      load: 0.2,
      risk: 0.16,
      difficulty: 1.18
    },
    conserveEnergy: {
      label: "Conserve Energy",
      description: "Reduce pressing and sprint volume to preserve late fitness.",
      positions: ["*"],
      attributes: ["decisions", "positioning", "teamwork", "naturalFitness"],
      phases: { defense: 0.16, midfield: -0.18, attack: -0.1 },
      matchPhases: { fitness: 2.2, defensiveStability: 0.7, pressingStrength: -2.4, attackingTransition: -0.8 },
      load: -0.18,
      risk: -0.12,
      difficulty: 0.9
    },
    holdWidth: {
      label: "Hold Width",
      description: "Stay wide to stretch the pitch and protect the touchline.",
      positions: ["RB", "LB", "RW", "LW"],
      attributes: ["crossing", "stamina", "positioning", "pace", "teamwork"],
      phases: { attack: 0.38, midfield: 0.28, defense: 0.12 },
      matchPhases: { wideThreat: 3.2, defensiveWidth: 2, chanceCreation: 0.8, centralThreat: -0.7 },
      load: 0.08,
      risk: 0.04,
      difficulty: 1
    },
    roam: {
      label: "Roam",
      description: "Find pockets away from the assigned lane and connect play.",
      positions: ["CM", "AM", "RW", "LW", "ST"],
      attributes: ["offTheBall", "vision", "dribbling", "flair", "decisions"],
      phases: { attack: 0.55, midfield: 0.42, defense: -0.28 },
      matchPhases: { chanceCreation: 2.2, centralThreat: 1.6, buildUpQuality: 1, chemistry: -0.6, defensiveTransition: -0.7 },
      load: 0.08,
      risk: 0.16,
      difficulty: 1.25
    },
    takeMoreRisks: {
      label: "Take Risks",
      description: "Attempt harder passes, carries, and aggressive final actions.",
      positions: ["CB", "DM", "CM", "AM", "RW", "LW", "ST"],
      attributes: ["vision", "passing", "technique", "composure", "decisions"],
      phases: { attack: 0.62, midfield: 0.32, defense: -0.18 },
      matchPhases: { chanceCreation: 2.6, buildUpQuality: 1.4, centralThreat: 1.1, chancePrevention: -0.7, defensiveTransition: -0.5 },
      load: 0.05,
      risk: 0.22,
      difficulty: 1.35
    }
  };
  const ACADEMY_PLANS = {
    balanced: {
      label: "Balanced",
      description: "Broad technical, tactical, and physical development.",
      attributes: ["firstTouch", "passing", "decisions", "stamina", "teamwork"],
      growthRate: 0.034,
      readiness: 0.9,
      morale: 0.3
    },
    technical: {
      label: "Technical",
      description: "Extra ball work for touch, technique, dribbling, and passing.",
      attributes: ["technique", "firstTouch", "dribbling", "passing", "vision"],
      growthRate: 0.041,
      readiness: 0.78,
      morale: 0.15
    },
    physical: {
      label: "Athletic",
      description: "Strength, stamina, speed, and durability blocks.",
      attributes: ["pace", "acceleration", "stamina", "strength", "naturalFitness"],
      growthRate: 0.038,
      readiness: 0.82,
      morale: -0.05
    },
    playmaker: {
      label: "Playmaker",
      description: "Passing range, vision, decisions, and composure.",
      attributes: ["passing", "vision", "decisions", "composure", "technique"],
      growthRate: 0.039,
      readiness: 0.84,
      morale: 0.1
    },
    finishing: {
      label: "Finishing",
      description: "Final-third movement, finishing, composure, and ball striking.",
      attributes: ["finishing", "offTheBall", "composure", "longShots", "firstTouch"],
      growthRate: 0.039,
      readiness: 0.84,
      morale: 0.1
    },
    defensive: {
      label: "Defensive",
      description: "Duel work, positioning, tackling, concentration, and bravery.",
      attributes: ["tackling", "marking", "positioning", "concentration", "bravery"],
      growthRate: 0.039,
      readiness: 0.86,
      morale: 0.1
    }
  };
  const YOUTH_LOAN_DESTINATIONS = [
    {
      id: "loan-sunderland",
      name: "Sunderland",
      city: "Sunderland",
      shortName: "SUN",
      level: "Championship",
      reputation: 73,
      playingTimeBias: 6,
      focus: "physical",
      secondaryFocus: ["defensive", "finishing"],
      style: "High-energy, direct, competitive minutes",
      roleBias: { GK: "goalkeeper", CB: "stopper", RB: "wingBack", LB: "wingBack", DM: "anchor", CM: "boxToBox", AM: "advancedPlaymaker", RW: "winger", LW: "winger", ST: "pressingForward" }
    },
    {
      id: "loan-west-brom",
      name: "West Bromwich Albion",
      city: "West Bromwich",
      shortName: "WBA",
      level: "Championship",
      reputation: 71,
      playingTimeBias: 8,
      focus: "defensive",
      secondaryFocus: ["physical", "balanced"],
      style: "Structured side with strong defensive coaching",
      roleBias: { GK: "goalkeeper", CB: "centreBack", RB: "fullBack", LB: "fullBack", DM: "anchor", CM: "ballWinner", AM: "advancedPlaymaker", RW: "widePlaymaker", LW: "widePlaymaker", ST: "targetForward" }
    },
    {
      id: "loan-swansea",
      name: "Swansea City",
      city: "Swansea",
      shortName: "SWA",
      level: "Championship",
      reputation: 68,
      playingTimeBias: 10,
      focus: "technical",
      secondaryFocus: ["playmaker", "balanced"],
      style: "Possession football and technical development",
      roleBias: { GK: "sweeperKeeper", CB: "ballPlayingDefender", RB: "fullBack", LB: "fullBack", DM: "deepPlaymaker", CM: "advancedPlaymaker", AM: "advancedPlaymaker", RW: "widePlaymaker", LW: "widePlaymaker", ST: "advancedForward" }
    },
    {
      id: "loan-middlesbrough",
      name: "Middlesbrough",
      city: "Middlesbrough",
      shortName: "MID",
      level: "Championship",
      reputation: 70,
      playingTimeBias: 7,
      focus: "playmaker",
      secondaryFocus: ["technical", "defensive"],
      style: "Balanced tactical platform for midfielders and creators",
      roleBias: { GK: "goalkeeper", CB: "ballPlayingDefender", RB: "fullBack", LB: "fullBack", DM: "deepPlaymaker", CM: "boxToBox", AM: "advancedPlaymaker", RW: "insideForward", LW: "insideForward", ST: "advancedForward" }
    },
    {
      id: "loan-ipswich",
      name: "Ipswich Town",
      city: "Ipswich",
      shortName: "IPS",
      level: "Championship",
      reputation: 74,
      playingTimeBias: 3,
      focus: "balanced",
      secondaryFocus: ["technical", "physical"],
      style: "Aggressive top-end loan with Premier League-adjacent demands",
      roleBias: { GK: "sweeperKeeper", CB: "ballPlayingDefender", RB: "wingBack", LB: "wingBack", DM: "deepPlaymaker", CM: "boxToBox", AM: "shadowStriker", RW: "insideForward", LW: "insideForward", ST: "pressingForward" }
    },
    {
      id: "loan-charlton",
      name: "Charlton Athletic",
      city: "London",
      shortName: "CHA",
      level: "League One",
      reputation: 61,
      playingTimeBias: 17,
      focus: "finishing",
      secondaryFocus: ["physical", "technical"],
      style: "High-minutes pathway for raw attackers and late developers",
      roleBias: { GK: "goalkeeper", CB: "centreBack", RB: "fullBack", LB: "fullBack", DM: "ballWinner", CM: "boxToBox", AM: "shadowStriker", RW: "winger", LW: "winger", ST: "advancedForward" }
    }
  ];
  const SCOUTING_REGIONS = {
    england: {
      label: "England & Ireland",
      description: "Homegrown talent, Championship standouts, and academy releases.",
      nationalities: ["England", "Norway", "Denmark", "Sweden"],
      positionBias: ["CM", "CB", "RB", "LB", "ST"],
      days: 12,
      difficulty: 0.9,
      ceiling: 92,
      discoverChance: 0.48
    },
    scandinavia: {
      label: "Scandinavia",
      description: "High-work-rate prospects, value signings, and physical profiles.",
      nationalities: ["Norway", "Denmark", "Sweden"],
      positionBias: ["CM", "DM", "CB", "ST", "GK"],
      days: 14,
      difficulty: 0.78,
      ceiling: 90,
      discoverChance: 0.52
    },
    westernEurope: {
      label: "Western Europe",
      description: "Technical players from France, Spain, Portugal, Germany, and Italy.",
      nationalities: ["France", "Spain", "Portugal", "Germany", "Italy", "Netherlands", "Belgium"],
      positionBias: ["AM", "RW", "LW", "CM", "CB"],
      days: 16,
      difficulty: 1.02,
      ceiling: 95,
      discoverChance: 0.44
    },
    southAmerica: {
      label: "South America",
      description: "High-upside attackers, creators, and late-blooming value targets.",
      nationalities: ["Brazil", "Argentina"],
      positionBias: ["RW", "LW", "AM", "ST", "CM"],
      days: 18,
      difficulty: 1.12,
      ceiling: 97,
      discoverChance: 0.4
    },
    global: {
      label: "Global Prospects",
      description: "Wide discovery brief for unknown prospects in every role.",
      nationalities: null,
      positionBias: null,
      days: 20,
      difficulty: 1.2,
      ceiling: 98,
      discoverChance: 0.38
    }
  };
  const SCOUTING_FOCUS = {
    balanced: {
      label: "Balanced",
      description: "Best overall fit for the current recruitment plan.",
      ageMin: 17,
      ageMax: 24,
      abilityLift: 0,
      potentialLift: 0
    },
    prospects: {
      label: "Wonderkids",
      description: "Younger, higher-ceiling players with more uncertainty.",
      ageMin: 16,
      ageMax: 20,
      abilityLift: -4,
      potentialLift: 7
    },
    value: {
      label: "Value",
      description: "Affordable players who can become squad options quickly.",
      ageMin: 18,
      ageMax: 25,
      abilityLift: 2,
      potentialLift: -1
    },
    firstTeam: {
      label: "First-Team Ready",
      description: "Older discoveries with a shorter path to senior minutes.",
      ageMin: 20,
      ageMax: 26,
      abilityLift: 6,
      potentialLift: -4
    }
  };
  const DEFAULT_TACTICS = {
    mentality: "balanced",
    pressing: "standard",
    tempo: "balanced",
    width: "balanced",
    line: "standard",
    focus: "mixed"
  };
  const TACTICAL_PRESETS = {
    balanced: {
      label: "Balanced Plan",
      description: "Keeps the side compact without overcommitting in either direction.",
      tactics: { mentality: "balanced", pressing: "standard", tempo: "balanced", width: "balanced", line: "standard", focus: "mixed" }
    },
    control: {
      label: "Control Game",
      description: "Slows the match down through possession, central support, and safer pressing.",
      tactics: { mentality: "positive", pressing: "standard", tempo: "patient", width: "narrow", line: "standard", focus: "central" }
    },
    highPress: {
      label: "High Press",
      description: "Raises pressure and territory to force mistakes high up the pitch.",
      tactics: { mentality: "positive", pressing: "high", tempo: "direct", width: "balanced", line: "high", focus: "mixed" }
    },
    protectLead: {
      label: "Protect Lead",
      description: "Drops risk, protects central spaces, and preserves legs late in the match.",
      tactics: { mentality: "cautious", pressing: "regroup", tempo: "patient", width: "narrow", line: "deep", focus: "counter" }
    },
    chaseGame: {
      label: "Chase Goal",
      description: "Adds runners, tempo, and pressing to force late chances.",
      tactics: { mentality: "attacking", pressing: "high", tempo: "vertical", width: "balanced", line: "high", focus: "mixed" }
    },
    counterAway: {
      label: "Counter Plan",
      description: "Absorbs pressure, protects depth, and attacks space quickly.",
      tactics: { mentality: "cautious", pressing: "regroup", tempo: "direct", width: "balanced", line: "deep", focus: "counter" }
    },
    wideService: {
      label: "Wide Service",
      description: "Uses touchline width, crossing, and set-piece pressure.",
      tactics: { mentality: "positive", pressing: "standard", tempo: "direct", width: "wide", line: "standard", focus: "flanks" }
    }
  };
  const DOMESTIC_CUP_ROUNDS = [
    { key: "playoff", label: "Third Round Play-Off", date: [9, 22], prize: 450000 },
    { key: "round16", label: "Round of 16", date: [10, 27], prize: 700000 },
    { key: "quarterFinal", label: "Quarter-Final", date: [1, 13], prize: 1100000 },
    { key: "semiFinal", label: "Semi-Final", date: [3, 10], prize: 1800000 },
    { key: "final", label: "Final", date: [5, 16], prize: 3200000 }
  ];
  const EUROPEAN_COMPETITION_NAME = "Continental Cup";
  const EUROPEAN_ROUNDS = [
    { key: "group1", label: "Group Matchday 1", date: [9, 17], stage: "group", prize: 900000 },
    { key: "group2", label: "Group Matchday 2", date: [10, 21], stage: "group", prize: 1100000 },
    { key: "group3", label: "Group Matchday 3", date: [11, 25], stage: "group", prize: 1300000 },
    { key: "semiFinal", label: "Semi-Final", date: [3, 18], stage: "knockout", prize: 4200000 },
    { key: "final", label: "Final", date: [5, 6], stage: "knockout", prize: 8500000 }
  ];
  const EUROPEAN_GROUP_PAIRINGS = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]]
  ];
  const EUROPEAN_CLUB_TEMPLATES = [
    { id: "eur-real-madrid", name: "Real Madrid", city: "Madrid", shortName: "RMA", reputation: 95, balance: 255000000, transferBudget: 115000000, wageBudget: 3600000 },
    { id: "eur-barcelona", name: "Barcelona", city: "Barcelona", shortName: "BAR", reputation: 92, balance: 168000000, transferBudget: 82000000, wageBudget: 3200000 },
    { id: "eur-bayern", name: "Bayern Munich", city: "Munich", shortName: "BAY", reputation: 93, balance: 215000000, transferBudget: 96000000, wageBudget: 3350000 },
    { id: "eur-psg", name: "Paris Saint-Germain", city: "Paris", shortName: "PSG", reputation: 91, balance: 205000000, transferBudget: 108000000, wageBudget: 3450000 },
    { id: "eur-inter", name: "Inter Milan", city: "Milan", shortName: "INT", reputation: 89, balance: 126000000, transferBudget: 64000000, wageBudget: 2550000 },
    { id: "eur-juventus", name: "Juventus", city: "Turin", shortName: "JUV", reputation: 87, balance: 114000000, transferBudget: 58000000, wageBudget: 2400000 },
    { id: "eur-dortmund", name: "Borussia Dortmund", city: "Dortmund", shortName: "BVB", reputation: 86, balance: 118000000, transferBudget: 60000000, wageBudget: 2150000 },
    { id: "eur-atletico", name: "Atletico Madrid", city: "Madrid", shortName: "ATM", reputation: 88, balance: 122000000, transferBudget: 62000000, wageBudget: 2350000 },
    { id: "eur-milan", name: "AC Milan", city: "Milan", shortName: "MIL", reputation: 86, balance: 104000000, transferBudget: 56000000, wageBudget: 2200000 },
    { id: "eur-leverkusen", name: "Bayer Leverkusen", city: "Leverkusen", shortName: "B04", reputation: 84, balance: 88000000, transferBudget: 46000000, wageBudget: 1800000 }
  ];
  const BOARD_OBJECTIVE_WEIGHTS = {
    league: 36,
    cup: 18,
    finance: 16,
    wages: 14,
    youth: 8,
    style: 8
  };
  const RATING_MODEL_VERSION = 4;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, precision) {
    const factor = Math.pow(10, precision || 0);
    return Math.round(value * factor) / factor;
  }

  function ordinalNumber(value) {
    const number = Number(value) || 0;
    const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
    return `${number}${suffix}`;
  }

  function random(state) {
    state.randomSeed = (state.randomSeed * 1664525 + 1013904223) >>> 0;
    return state.randomSeed / 4294967296;
  }

  function randomInt(state, min, max) {
    return Math.floor(random(state) * (max - min + 1)) + min;
  }

  function randomFloat(state, min, max) {
    return random(state) * (max - min) + min;
  }

  function pick(state, items) {
    return items[Math.floor(random(state) * items.length)];
  }

  function shuffle(state, items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random(state) * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function uniqueIds(ids) {
    return Array.from(new Set((ids || []).filter(Boolean)));
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  function moneyRound(value) {
    return Math.max(0, Math.round(value / 25000) * 25000);
  }

  function toId(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 34);
  }

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function dateString(year, month, day) {
    return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
  }

  function parseDate(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(Date.UTC(year || BASE_SEASON_YEAR, (month || 1) - 1, day || 1));
  }

  function toDateString(date) {
    return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`;
  }

  function addDays(value, days) {
    const date = parseDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return toDateString(date);
  }

  function daysBetween(from, to) {
    const ms = parseDate(to).getTime() - parseDate(from).getTime();
    return Math.round(ms / 86400000);
  }

  function compareDates(left, right) {
    return daysBetween(right, left);
  }

  function createSeasonCalendar(season) {
    const year = BASE_SEASON_YEAR + Math.max(0, (season || 1) - 1);
    return {
      currentDate: dateString(year, 7, 1),
      preseasonStartDate: dateString(year, 7, 1),
      seasonStartDate: dateString(year, 8, 15),
      seasonEndDate: dateString(year + 1, 5, 23),
      day: 1
    };
  }

  function transferWindowsForSeason(season) {
    const year = BASE_SEASON_YEAR + Math.max(0, (season || 1) - 1);
    return [
      {
        key: "summer",
        name: "Summer Window",
        opensOn: dateString(year, 7, 1),
        closesOn: dateString(year, 8, 31)
      },
      {
        key: "winter",
        name: "January Window",
        opensOn: dateString(year + 1, 1, 1),
        closesOn: dateString(year + 1, 2, 1)
      }
    ];
  }

  function transferWindowStatus(state, dateValue) {
    const calendar = ensureCalendar(state);
    const date = dateValue || calendar.currentDate;
    const windows = transferWindowsForSeason(state.season || 1);
    const openWindow = windows.find((window) => compareDates(date, window.opensOn) >= 0 && compareDates(date, window.closesOn) <= 0);
    if (openWindow) {
      const daysRemaining = Math.max(0, daysBetween(date, openWindow.closesOn));
      return {
        isOpen: true,
        window: openWindow,
        label: openWindow.name,
        opensOn: openWindow.opensOn,
        closesOn: openWindow.closesOn,
        daysRemaining,
        isDeadlineDay: daysRemaining <= 1,
        nextWindow: openWindow
      };
    }
    const upcoming = windows.find((window) => compareDates(window.opensOn, date) > 0) || transferWindowsForSeason((state.season || 1) + 1)[0];
    return {
      isOpen: false,
      window: null,
      label: "Closed",
      opensOn: upcoming.opensOn,
      closesOn: upcoming.closesOn,
      daysRemaining: Math.max(0, daysBetween(date, upcoming.opensOn)),
      isDeadlineDay: false,
      nextWindow: upcoming
    };
  }

  function createStateShell(seed) {
    const calendar = createSeasonCalendar(1);
    return {
      version: VERSION,
      randomSeed: seed || Date.now(),
      nextPlayerId: 1,
      nextOfferId: 1,
      season: 1,
      activeClubId: null,
      manager: {
        name: "Alex Morgan",
        reputation: 46,
        trophies: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        careerHistory: []
      },
      players: {},
      league: {
        name: "Premier Division",
        dataSource: null,
        clubs: [],
        schedule: [],
        currentRound: 0,
        history: [],
        records: {
          highestPoints: null,
          biggestWin: null,
          recordFee: null,
          longestWinStreak: null
        }
      },
      calendar,
      scouting: {
        reports: {},
        assignments: [],
        discoveries: [],
        network: {
          level: 2,
          activeRegions: []
        },
        nextAssignmentId: 1,
        nextDiscoveryId: 1
      },
      academy: {
        clubId: null,
        level: 3,
        prospects: [],
        reports: [],
        nextProspectId: 1,
        lastEventDay: -999,
        lastIntakeSeason: 0
      },
      board: {
        clubId: null,
        confidence: 64,
        status: "stable",
        objectives: {},
        youthPromotions: 0,
        lastReviewDay: -999,
        lastConfidence: 64,
        reviews: []
      },
      cups: {
        domestic: null,
        history: []
      },
      europe: {
        clubs: [],
        competition: null,
        history: [],
        qualifiedClubIds: []
      },
      loanClubs: [],
      transfers: {
        marketIds: [],
        offers: [],
        shortlist: [],
        preAgreements: [],
        history: [],
        news: [],
        freeAgentIds: [],
        outgoingLoans: [],
        nextLoanId: 1
      },
      inbox: [],
      lastMatch: null,
      createdAt: new Date().toISOString(),
      lastSavedAt: null
    };
  }

  function generateName(state) {
    return `${pick(state, Data.FIRST_NAMES)} ${pick(state, Data.LAST_NAMES)}`;
  }

  function ensureScoutingState(state) {
    state.scouting = state.scouting || {};
    state.scouting.reports = state.scouting.reports || {};
    state.scouting.assignments = state.scouting.assignments || [];
    state.scouting.discoveries = state.scouting.discoveries || [];
    state.scouting.network = state.scouting.network || { level: 2, activeRegions: [] };
    state.scouting.network.level = Math.round(clamp(state.scouting.network.level || 2, 1, 5));
    state.scouting.network.activeRegions = state.scouting.network.activeRegions || [];
    const maxAssignment = state.scouting.assignments.reduce((max, assignment) => {
      const number = Number(String(assignment.id || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    const maxDiscovery = state.scouting.discoveries.reduce((max, discovery) => {
      const number = Number(String(discovery.id || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    state.scouting.nextAssignmentId = Math.max(state.scouting.nextAssignmentId || 1, maxAssignment + 1);
    state.scouting.nextDiscoveryId = Math.max(state.scouting.nextDiscoveryId || 1, maxDiscovery + 1);
    state.scouting.assignments.forEach((assignment) => {
      assignment.type = assignment.type || "player";
      assignment.status = assignment.status || "active";
      assignment.discoveries = assignment.discoveries || [];
      if (assignment.type === "region") {
        const region = SCOUTING_REGIONS[assignment.regionId] || SCOUTING_REGIONS.england;
        assignment.focus = SCOUTING_FOCUS[assignment.focus] ? assignment.focus : "balanced";
        assignment.daysTotal = assignment.daysTotal || region.days;
        assignment.daysRemaining = assignment.status === "active" ? assignment.daysRemaining === undefined ? region.days : assignment.daysRemaining : 0;
      }
    });
    return state.scouting;
  }

  function ensureAcademyState(state) {
    state.academy = state.academy || {};
    state.academy.clubId = state.academy.clubId || state.activeClubId;
    state.academy.level = Math.round(clamp(state.academy.level || 3, 1, 5));
    state.academy.prospects = state.academy.prospects || [];
    state.academy.reports = state.academy.reports || [];
    state.academy.nextProspectId = state.academy.nextProspectId || 1;
    state.academy.lastEventDay = Number.isFinite(state.academy.lastEventDay) ? state.academy.lastEventDay : -999;
    state.academy.lastIntakeSeason = state.academy.lastIntakeSeason || 0;
    const maxProspect = state.academy.prospects.reduce((max, prospect) => {
      const number = Number(String(prospect.id || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    state.academy.nextProspectId = Math.max(state.academy.nextProspectId, maxProspect + 1);
    state.academy.prospects = state.academy.prospects.map((prospect) => normalizeAcademyProspect(state, prospect)).filter(Boolean);
    if (state.activeClubId && !state.academy.prospects.length && !state.academy._creatingIntake) {
      state.academy._creatingIntake = true;
      createAcademyIntake(state, 8, { silent: true, initial: true });
      delete state.academy._creatingIntake;
    }
    return state.academy;
  }

  function ensureLoanClubsState(state) {
    state.loanClubs = Array.isArray(state.loanClubs) ? state.loanClubs : [];
    const existingById = new Map(state.loanClubs.map((club) => [club.id, club]));
    state.loanClubs = YOUTH_LOAN_DESTINATIONS.map((destination) => {
      const existing = existingById.get(destination.id) || {};
      return {
        id: destination.id,
        name: destination.name,
        city: destination.city,
        shortName: destination.shortName,
        level: destination.level,
        reputation: destination.reputation,
        balance: existing.balance || 0,
        transferBudget: existing.transferBudget || 0,
        wageBudget: existing.wageBudget || 0,
        squad: Array.isArray(existing.squad) ? existing.squad : [],
        lineup: Array.isArray(existing.lineup) ? existing.lineup : [],
        bench: Array.isArray(existing.bench) ? existing.bench : [],
        virtual: true,
        loanDestination: true
      };
    });
    return state.loanClubs;
  }

  function leagueObjectiveForClub(club) {
    const reputation = club ? club.reputation || 70 : 70;
    if (reputation >= 90) return { targetPosition: 4, label: "Qualify for Europe", description: "Finish in the top four and stay in the title conversation." };
    if (reputation >= 84) return { targetPosition: 6, label: "European Places", description: "Finish in the top six." };
    if (reputation >= 77) return { targetPosition: 8, label: "Top Half Push", description: "Compete for the top eight." };
    if (reputation >= 70) return { targetPosition: 12, label: "Mid-Table Stability", description: "Finish comfortably in mid-table." };
    return { targetPosition: 17, label: "Stay Up", description: "Avoid relegation pressure and finish 17th or higher." };
  }

  function cupObjectiveForClub(club) {
    const reputation = club ? club.reputation || 70 : 70;
    if (reputation >= 88) return { targetRoundIndex: 3, label: "Reach the Semi-Final" };
    if (reputation >= 78) return { targetRoundIndex: 2, label: "Reach the Quarter-Final" };
    return { targetRoundIndex: 1, label: "Reach the Round of 16" };
  }

  function defaultBoardObjectives(state, club) {
    const league = leagueObjectiveForClub(club);
    const cup = cupObjectiveForClub(club);
    const wagePressure = club ? weeklyWageSpend(state, club.id) / Math.max(1, club.wageBudget) * 100 : 88;
    return {
      league: {
        key: "league",
        label: league.label,
        description: league.description,
        targetPosition: league.targetPosition,
        weight: BOARD_OBJECTIVE_WEIGHTS.league
      },
      cup: {
        key: "cup",
        label: cup.label,
        description: `Board target: ${cup.label.toLowerCase()} in the domestic cup.`,
        targetRoundIndex: cup.targetRoundIndex,
        targetRoundLabel: DOMESTIC_CUP_ROUNDS[cup.targetRoundIndex].label,
        weight: BOARD_OBJECTIVE_WEIGHTS.cup
      },
      finance: {
        key: "finance",
        label: "Protect Club Balance",
        description: "Keep the club balance above the board's safe cash line.",
        minBalance: moneyRound((club ? club.balance : 50000000) * 0.64),
        weight: BOARD_OBJECTIVE_WEIGHTS.finance
      },
      wages: {
        key: "wages",
        label: "Control Wage Pressure",
        description: "Keep weekly wages inside the agreed wage budget.",
        maxPressure: Math.max(86, Math.min(98, Math.round(wagePressure + 8))),
        weight: BOARD_OBJECTIVE_WEIGHTS.wages
      },
      youth: {
        key: "youth",
        label: "Develop Pathway",
        description: "Promote academy players when they are ready.",
        targetPromotions: club && club.reputation < 78 ? 2 : 1,
        weight: BOARD_OBJECTIVE_WEIGHTS.youth
      },
      style: {
        key: "style",
        label: "Clear Playing Identity",
        description: "Maintain strong tactical role fit in the first XI.",
        minRoleFit: club && club.reputation >= 84 ? 72 : 66,
        weight: BOARD_OBJECTIVE_WEIGHTS.style
      }
    };
  }

  function ensureBoardState(state) {
    state.board = state.board || {};
    const club = getClub(state, state.activeClubId);
    const needsReset = state.board.clubId !== state.activeClubId || state.board.season !== state.season || !state.board.objectives || !Object.keys(state.board.objectives).length;
    if (needsReset) {
      state.board = {
        clubId: state.activeClubId,
        season: state.season || 1,
        confidence: state.board.confidence || 64,
        status: state.board.status || "stable",
        objectives: defaultBoardObjectives(state, club),
        youthPromotions: 0,
        lastReviewDay: -999,
        lastConfidence: state.board.confidence || 64,
        reviews: []
      };
    } else {
      state.board.confidence = Number.isFinite(state.board.confidence) ? state.board.confidence : 64;
      state.board.status = state.board.status || "stable";
      state.board.youthPromotions = state.board.youthPromotions || 0;
      state.board.lastReviewDay = Number.isFinite(state.board.lastReviewDay) ? state.board.lastReviewDay : -999;
      state.board.lastConfidence = Number.isFinite(state.board.lastConfidence) ? state.board.lastConfidence : state.board.confidence;
      state.board.reviews = state.board.reviews || [];
      state.board.objectives = { ...defaultBoardObjectives(state, club), ...(state.board.objectives || {}) };
    }
    return state.board;
  }

  function cupRoundDateForSeason(season, roundIndex) {
    const round = DOMESTIC_CUP_ROUNDS[roundIndex] || DOMESTIC_CUP_ROUNDS[0];
    const [month, day] = round.date;
    const year = BASE_SEASON_YEAR + Math.max(0, (season || 1) - 1) + (month <= 6 ? 1 : 0);
    return dateString(year, month, day);
  }

  function makeCupFixture(season, roundIndex, homeClubId, awayClubId, date) {
    const round = DOMESTIC_CUP_ROUNDS[roundIndex];
    const fixture = makeFixture(season, roundIndex + 1, homeClubId, awayClubId, date);
    fixture.id = `cup-s${season}-${round.key}-${homeClubId}-${awayClubId}`;
    fixture.competitionType = "cup";
    fixture.competitionName = "Domestic Cup";
    fixture.roundName = round.label;
    fixture.knockout = true;
    fixture.winnerClubId = null;
    fixture.penalties = null;
    return fixture;
  }

  function drawCupFixtures(state, cup, roundIndex, clubIds) {
    const date = cupRoundDateForSeason(cup.season, roundIndex);
    const ids = shuffle(state, clubIds.slice());
    const fixtures = [];
    for (let i = 0; i < ids.length; i += 2) {
      if (!ids[i + 1]) break;
      fixtures.push(makeCupFixture(cup.season, roundIndex, ids[i], ids[i + 1], date));
    }
    return fixtures;
  }

  function createDomesticCup(state) {
    const season = state.season || 1;
    const clubs = (state.league.clubs || []).slice().sort((a, b) => b.reputation - a.reputation || a.name.localeCompare(b.name));
    const byeClubIds = clubs.slice(0, 12).map((club) => club.id);
    const playoffClubIds = clubs.slice(12).map((club) => club.id);
    const cup = {
      id: `domestic-cup-s${season}`,
      name: "Domestic Cup",
      season,
      status: "active",
      currentRoundIndex: 0,
      championClubId: null,
      championName: null,
      rounds: DOMESTIC_CUP_ROUNDS.map((round, index) => ({
        key: round.key,
        label: round.label,
        date: cupRoundDateForSeason(season, index),
        fixtures: [],
        completed: false,
        byeClubIds: index === 0 ? byeClubIds : []
      }))
    };
    cup.rounds[0].fixtures = drawCupFixtures(state, cup, 0, playoffClubIds);
    return cup;
  }

  function ensureDomesticCupState(state) {
    state.cups = state.cups || {};
    state.cups.history = state.cups.history || [];
    if (!state.cups.domestic || state.cups.domestic.season !== state.season) {
      state.cups.domestic = createDomesticCup(state);
    }
    state.cups.domestic.rounds = state.cups.domestic.rounds || [];
    DOMESTIC_CUP_ROUNDS.forEach((round, index) => {
      state.cups.domestic.rounds[index] = {
        key: round.key,
        label: round.label,
        date: cupRoundDateForSeason(state.cups.domestic.season || state.season || 1, index),
        fixtures: [],
        completed: false,
        byeClubIds: [],
        ...(state.cups.domestic.rounds[index] || {})
      };
      state.cups.domestic.rounds[index].fixtures = state.cups.domestic.rounds[index].fixtures || [];
    });
    return state.cups.domestic;
  }

  function cupFixtureWinner(state, fixture) {
    if (fixture.winnerClubId) return fixture.winnerClubId;
    if (fixture.homeGoals > fixture.awayGoals) return fixture.homeClubId;
    if (fixture.awayGoals > fixture.homeGoals) return fixture.awayClubId;
    const homeStrength = teamStrength(state, fixture.homeClubId).overall + 2;
    const awayStrength = teamStrength(state, fixture.awayClubId).overall;
    return random(state) < homeStrength / Math.max(1, homeStrength + awayStrength) ? fixture.homeClubId : fixture.awayClubId;
  }

  function awardCupPrizeMoney(state, fixture) {
    if (fixture.cupPrizeAwarded) return;
    const round = DOMESTIC_CUP_ROUNDS[Math.max(0, (fixture.round || 1) - 1)] || DOMESTIC_CUP_ROUNDS[0];
    const winner = getClub(state, fixture.winnerClubId);
    const loserId = fixture.winnerClubId === fixture.homeClubId ? fixture.awayClubId : fixture.homeClubId;
    const loser = getClub(state, loserId);
    const participation = moneyRound(round.prize * 0.32);
    [winner, loser].filter(Boolean).forEach((club) => {
      club.balance += participation;
      club.seasonFinance = club.seasonFinance || {};
      club.seasonFinance.prizeMoney = (club.seasonFinance.prizeMoney || 0) + participation;
    });
    if (winner) {
      winner.balance += round.prize;
      winner.seasonFinance.prizeMoney = (winner.seasonFinance.prizeMoney || 0) + round.prize;
    }
    fixture.cupPrizeAwarded = true;
  }

  function resolveCupFixture(state, fixture) {
    if (!fixture || fixture.competitionType !== "cup" || !fixture.played) return fixture;
    const wasDraw = fixture.homeGoals === fixture.awayGoals;
    fixture.winnerClubId = cupFixtureWinner(state, fixture);
    if (wasDraw && !fixture.penalties) {
      const winnerHome = fixture.winnerClubId === fixture.homeClubId;
      const winnerPens = randomInt(state, 4, 6);
      const loserPens = Math.max(1, winnerPens - randomInt(state, 1, 2));
      fixture.penalties = {
        home: winnerHome ? winnerPens : loserPens,
        away: winnerHome ? loserPens : winnerPens
      };
    }
    awardCupPrizeMoney(state, fixture);
    if (fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId) {
      const won = fixture.winnerClubId === state.activeClubId;
      const opponentId = fixture.homeClubId === state.activeClubId ? fixture.awayClubId : fixture.homeClubId;
      addInbox(state, won ? "Cup Progress" : "Cup Exit", won ? `${getClub(state, state.activeClubId).name} advanced past ${getClub(state, opponentId).name} in the ${fixture.roundName}.` : `${getClub(state, state.activeClubId).name} were knocked out by ${getClub(state, opponentId).name} in the ${fixture.roundName}.`);
      state.lastMatch = JSON.parse(JSON.stringify(fixture));
    }
    return fixture;
  }

  function completeDomesticCup(state, cup, championClubId) {
    if (cup.status === "complete") return null;
    const champion = getClub(state, championClubId);
    cup.status = "complete";
    cup.championClubId = championClubId;
    cup.championName = champion ? champion.name : "Unknown";
    const summary = {
      season: cup.season,
      competitionName: cup.name,
      championClubId,
      championName: cup.championName,
      rounds: cup.rounds.map((round) => ({
        key: round.key,
        label: round.label,
        date: round.date,
        fixtures: round.fixtures.map((fixture) => JSON.parse(JSON.stringify(fixture)))
      }))
    };
    state.cups.history.unshift(summary);
    state.cups.history = state.cups.history.slice(0, 8);
    if (championClubId === state.activeClubId) {
      state.manager.trophies += 1;
      state.manager.reputation = Math.round(clamp(state.manager.reputation + 3.5, 1, 100));
      addInbox(state, "Cup Winners", `${cup.championName} lifted the ${cup.name}.`);
    } else {
      addInbox(state, "Cup Final", `${cup.championName} won the ${cup.name}.`);
    }
    return { type: "cup", title: "Cup Complete", championClubId, championName: cup.championName };
  }

  function advanceDomesticCup(state) {
    const cup = ensureDomesticCupState(state);
    if (cup.status === "complete") return null;
    let event = null;
    for (let index = 0; index < cup.rounds.length; index += 1) {
      const round = cup.rounds[index];
      if (!round.fixtures.length || round.completed) continue;
      if (!round.fixtures.every((fixture) => fixture.played && fixture.winnerClubId)) break;
      round.completed = true;
      let qualified = round.fixtures.map((fixture) => fixture.winnerClubId);
      if (index === 0) qualified = (round.byeClubIds || []).concat(qualified);
      if (qualified.length <= 1 || index >= cup.rounds.length - 1) {
        event = event || completeDomesticCup(state, cup, qualified[0]);
        break;
      }
      const nextRound = cup.rounds[index + 1];
      if (!nextRound.fixtures.length) {
        nextRound.fixtures = drawCupFixtures(state, cup, index + 1, qualified);
        cup.currentRoundIndex = index + 1;
        const activeFixture = nextRound.fixtures.find((fixture) => fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId);
        if (activeFixture) {
          const opponentId = activeFixture.homeClubId === state.activeClubId ? activeFixture.awayClubId : activeFixture.homeClubId;
          addInbox(state, "Cup Draw", `${getClub(state, state.activeClubId).name} will face ${getClub(state, opponentId).name} in the ${nextRound.label}.`);
          event = event || { type: "cup", title: "Cup Draw", fixtureId: activeFixture.id };
        }
      }
    }
    return event;
  }

  function domesticCupFixtures(state) {
    const cup = ensureDomesticCupState(state);
    return cup.rounds.flatMap((round) => round.fixtures.map((fixture) => ({ ...fixture, roundName: fixture.roundName || round.label, date: fixture.date || round.date })));
  }

  function domesticCupReport(state) {
    const cup = ensureDomesticCupState(state);
    const activeClubId = state.activeClubId;
    const fixtures = domesticCupFixtures(state);
    const activeFixtures = fixtures.filter((fixture) => fixture.homeClubId === activeClubId || fixture.awayClubId === activeClubId);
    const playedActive = activeFixtures.filter((fixture) => fixture.played);
    const activeEliminated = playedActive.some((fixture) => fixture.winnerClubId && fixture.winnerClubId !== activeClubId);
    const bestRound = activeFixtures.reduce((best, fixture) => Math.max(best, Math.max(0, (fixture.round || 1) - 1)), -1);
    const nextFixture = activeFixtures.filter((fixture) => !fixture.played).sort((a, b) => compareDates(a.date, b.date))[0] || null;
    return {
      cup,
      name: cup.name,
      status: cup.status,
      championClubId: cup.championClubId,
      championName: cup.championName,
      rounds: cup.rounds,
      activeEliminated,
      activeAlive: cup.status !== "complete" && !activeEliminated,
      bestRoundIndex: bestRound,
      bestRoundLabel: bestRound >= 0 ? DOMESTIC_CUP_ROUNDS[bestRound].label : "Not entered",
      nextFixture,
      fixtures
    };
  }

  function europeanRoundDateForSeason(season, roundIndex) {
    const round = EUROPEAN_ROUNDS[roundIndex] || EUROPEAN_ROUNDS[0];
    const [month, day] = round.date;
    const year = BASE_SEASON_YEAR + Math.max(0, (season || 1) - 1) + (month <= 6 ? 1 : 0);
    return dateString(year, month, day);
  }

  function europeanSeasonPrizeToClub(club, amount) {
    if (!club || !amount) return;
    club.balance += amount;
    club.seasonFinance = club.seasonFinance || {};
    club.seasonFinance.prizeMoney = (club.seasonFinance.prizeMoney || 0) + amount;
  }

  function createEuropeanClub(state, template, index) {
    const formation = index % 3 === 0 ? "4-3-3" : index % 3 === 1 ? "4-2-3-1" : "4-4-2";
    const club = {
      id: template.id,
      sourceTeamId: template.id,
      name: template.name,
      city: template.city,
      shortName: template.shortName,
      realWorld: true,
      virtualEuropeanClub: true,
      reputation: template.reputation,
      balance: template.balance,
      transferBudget: template.transferBudget,
      wageBudget: template.wageBudget,
      form: [],
      squad: [],
      lineup: [],
      bench: [],
      formation,
      roleAssignments: defaultRoleAssignments(formation),
      playerInstructions: defaultPlayerInstructions(formation),
      tactics: defaultTactics(index + 7),
      staff: defaultStaffRoom(template, index + 20),
      trainingPlan: "balanced",
      matchPrep: "balanced",
      matchPrepFamiliarity: defaultMatchPrepFamiliarity(),
      trainingReport: null,
      seasonFinance: {
        prizeMoney: 0,
        transferIncome: 0,
        transferSpend: 0,
        wageSpend: 0
      }
    };
    Data.SQUAD_BLUEPRINT.forEach((position, playerIndex) => {
      const player = generatePlayer(state, club, position, playerIndex);
      player.displayName = footballDisplayName(player.name);
      player.source = {
        provider: "European Pool",
        generatedDate: state.calendar ? state.calendar.currentDate : null,
        fc26: {
          matched: false,
          source: "Generated projection",
          ...fc26StyleStats(player)
        }
      };
      state.players[player.id] = player;
      club.squad.push(player.id);
    });
    return club;
  }

  function ensureEuropeState(state) {
    state.europe = state.europe || {};
    state.europe.clubs = Array.isArray(state.europe.clubs) ? state.europe.clubs : [];
    state.europe.history = Array.isArray(state.europe.history) ? state.europe.history : [];
    state.europe.qualifiedClubIds = uniqueIds(state.europe.qualifiedClubIds || []);
    ensureEuropeanClubPool(state);
    if (!state.europe.competition || state.europe.competition.season !== state.season) {
      const qualifiers = state.europe.qualifiedClubIds.length ? state.europe.qualifiedClubIds : initialEuropeanQualifiers(state);
      state.europe.competition = createEuropeanCompetition(state, qualifiers, state.season || 1);
    }
    normalizeEuropeanCompetition(state.europe.competition, state.season || 1);
    return state.europe;
  }

  function ensureEuropeanClubPool(state) {
    state.europe = state.europe || {};
    state.europe.clubs = Array.isArray(state.europe.clubs) ? state.europe.clubs : [];
    EUROPEAN_CLUB_TEMPLATES.forEach((template, index) => {
      if (state.europe.clubs.some((club) => club.id === template.id)) return;
      const club = createEuropeanClub(state, template, index);
      state.europe.clubs.push(club);
      club.lineup = autoSelectLineup(state, club.id);
      club.bench = autoSelectBench(state, club.id);
    });
    state.europe.clubs.forEach((club, index) => {
      club.virtualEuropeanClub = true;
      club.realWorld = club.realWorld !== false;
      club.form = club.form || [];
      club.squad = club.squad || [];
      club.lineup = club.lineup || [];
      club.bench = club.bench || [];
      club.formation = Data.FORMATIONS[club.formation] ? club.formation : index % 2 === 0 ? "4-3-3" : "4-2-3-1";
      club.tactics = normalizeTactics(club.tactics);
      club.roleAssignments = club.roleAssignments || defaultRoleAssignments(club.formation);
      normalizeRoleAssignments(club);
      normalizePlayerInstructions(club);
      normalizeTrainingSetup(club);
      normalizeStaffRoom(club, index + 20);
      club.seasonFinance = {
        prizeMoney: 0,
        transferIncome: 0,
        transferSpend: 0,
        wageSpend: 0,
        ...(club.seasonFinance || {})
      };
      if (club.lineup.length !== 11) club.lineup = autoSelectLineup(state, club.id);
      if (!club.bench.length) club.bench = autoSelectBench(state, club.id);
    });
  }

  function initialEuropeanQualifiers(state) {
    return (state.league.clubs || [])
      .slice()
      .sort((a, b) => b.reputation - a.reputation || a.name.localeCompare(b.name))
      .slice(0, 4)
      .map((club) => club.id);
  }

  function europeanQualifiersFromTable(state, finalTable, cupSummary) {
    const leagueClubIds = new Set((state.league.clubs || []).map((club) => club.id));
    const qualifiers = (finalTable || []).slice(0, 4).map((row) => row.clubId).filter((id) => leagueClubIds.has(id));
    const cupChampionId = cupSummary && cupSummary.championClubId;
    if (cupChampionId && leagueClubIds.has(cupChampionId) && !qualifiers.includes(cupChampionId)) {
      qualifiers.push(cupChampionId);
    }
    return uniqueIds(qualifiers).slice(0, 5);
  }

  function normalizeEuropeanCompetition(competition, season) {
    if (!competition) return null;
    competition.name = competition.name || EUROPEAN_COMPETITION_NAME;
    competition.status = competition.status || "active";
    competition.season = competition.season || season || 1;
    competition.teams = uniqueIds(competition.teams || []);
    competition.qualifiedClubIds = uniqueIds(competition.qualifiedClubIds || []);
    competition.groups = competition.groups || { A: [], B: [] };
    competition.rounds = competition.rounds || [];
    EUROPEAN_ROUNDS.forEach((round, index) => {
      competition.rounds[index] = {
        key: round.key,
        label: round.label,
        stage: round.stage,
        date: europeanRoundDateForSeason(competition.season, index),
        fixtures: [],
        completed: false,
        ...(competition.rounds[index] || {})
      };
      competition.rounds[index].fixtures = competition.rounds[index].fixtures || [];
    });
    return competition;
  }

  function createEuropeanCompetition(state, qualifiedClubIds, season) {
    ensureEuropeanClubPool(state);
    const leagueClubIds = new Set((state.league.clubs || []).map((club) => club.id));
    const premierQualifiers = uniqueIds(qualifiedClubIds || [])
      .filter((clubId) => leagueClubIds.has(clubId))
      .slice(0, 5);
    const europeanPool = (state.europe.clubs || [])
      .slice()
      .sort((a, b) => b.reputation - a.reputation || a.name.localeCompare(b.name))
      .map((club) => club.id);
    const teams = uniqueIds(premierQualifiers.concat(europeanPool)).slice(0, 8);
    const shuffled = shuffle(state, teams);
    const groups = {
      A: shuffled.slice(0, 4),
      B: shuffled.slice(4, 8)
    };
    const competition = normalizeEuropeanCompetition({
      id: `continental-cup-s${season}`,
      name: EUROPEAN_COMPETITION_NAME,
      season,
      status: "active",
      qualifiedClubIds: premierQualifiers,
      teams,
      groups,
      championClubId: null,
      championName: null,
      groupComplete: false,
      rounds: EUROPEAN_ROUNDS.map((round, index) => ({
        key: round.key,
        label: round.label,
        stage: round.stage,
        date: europeanRoundDateForSeason(season, index),
        fixtures: [],
        completed: false
      }))
    }, season);

    Object.keys(groups).forEach((groupKey) => {
      const ids = groups[groupKey] || [];
      EUROPEAN_GROUP_PAIRINGS.forEach((pairings, roundIndex) => {
        const round = competition.rounds[roundIndex];
        pairings.forEach(([homeIndex, awayIndex], pairIndex) => {
          if (!ids[homeIndex] || !ids[awayIndex]) return;
          round.fixtures.push(makeEuropeanFixture(season, roundIndex, ids[homeIndex], ids[awayIndex], round.date, {
            group: groupKey,
            stage: "group",
            fixtureIndex: pairIndex
          }));
        });
      });
    });
    return competition;
  }

  function makeEuropeanFixture(season, roundIndex, homeClubId, awayClubId, date, options) {
    const round = EUROPEAN_ROUNDS[roundIndex];
    const fixture = makeFixture(season, roundIndex + 1, homeClubId, awayClubId, date);
    const group = options && options.group ? options.group : null;
    const stage = options && options.stage ? options.stage : round.stage;
    fixture.id = `eur-s${season}-${round.key}-${group || "ko"}-${homeClubId}-${awayClubId}`;
    fixture.competitionType = "europe";
    fixture.competitionName = EUROPEAN_COMPETITION_NAME;
    fixture.roundName = group ? `${round.label} | Group ${group}` : round.label;
    fixture.stage = stage;
    fixture.group = group;
    fixture.knockout = stage === "knockout";
    fixture.winnerClubId = null;
    fixture.penalties = null;
    return fixture;
  }

  function europeanFixtures(state) {
    const europe = ensureEuropeState(state);
    const competition = europe.competition;
    if (!competition) return [];
    return competition.rounds.flatMap((round) => (round.fixtures || []).map((fixture) => ({
      ...fixture,
      roundName: fixture.roundName || round.label,
      date: fixture.date || round.date,
      stage: fixture.stage || round.stage
    })));
  }

  function europeanFixtureWinner(state, fixture) {
    if (fixture.winnerClubId) return fixture.winnerClubId;
    if (fixture.homeGoals > fixture.awayGoals) return fixture.homeClubId;
    if (fixture.awayGoals > fixture.homeGoals) return fixture.awayClubId;
    const homeStrength = teamStrength(state, fixture.homeClubId).overall + 1.4;
    const awayStrength = teamStrength(state, fixture.awayClubId).overall;
    return random(state) < homeStrength / Math.max(1, homeStrength + awayStrength) ? fixture.homeClubId : fixture.awayClubId;
  }

  function awardEuropeanPrizeMoney(state, fixture) {
    if (fixture.europePrizeAwarded) return;
    const round = EUROPEAN_ROUNDS[Math.max(0, (fixture.round || 1) - 1)] || EUROPEAN_ROUNDS[0];
    const home = getClub(state, fixture.homeClubId);
    const away = getClub(state, fixture.awayClubId);
    const participation = moneyRound(round.prize * (fixture.knockout ? 0.42 : 0.34));
    europeanSeasonPrizeToClub(home, participation);
    europeanSeasonPrizeToClub(away, participation);
    if (fixture.knockout) {
      const winner = getClub(state, fixture.winnerClubId);
      europeanSeasonPrizeToClub(winner, round.prize);
    } else if (fixture.homeGoals === fixture.awayGoals) {
      europeanSeasonPrizeToClub(home, moneyRound(round.prize * 0.34));
      europeanSeasonPrizeToClub(away, moneyRound(round.prize * 0.34));
    } else {
      const winner = getClub(state, fixture.homeGoals > fixture.awayGoals ? fixture.homeClubId : fixture.awayClubId);
      europeanSeasonPrizeToClub(winner, round.prize);
    }
    fixture.europePrizeAwarded = true;
  }

  function applyEuropeanTravelFatigue(state, fixture) {
    if (fixture.europeTravelFatigueApplied) return;
    (fixture.playerRatings || []).forEach((rating) => {
      const player = state.players[rating.playerId];
      if (!player) return;
      const awayCost = player.clubId === fixture.awayClubId ? randomInt(state, 2, 5) : randomInt(state, 1, 3);
      player.fitness = Math.round(clamp(player.fitness - awayCost, 20, 100));
      player.sharpness = Math.round(clamp(player.sharpness + 1, 0, 100));
    });
    fixture.europeTravelFatigueApplied = true;
  }

  function resolveEuropeanFixture(state, fixture) {
    if (!fixture || fixture.competitionType !== "europe" || !fixture.played) return fixture;
    const wasDraw = fixture.homeGoals === fixture.awayGoals;
    if (fixture.knockout) {
      fixture.winnerClubId = europeanFixtureWinner(state, fixture);
      if (wasDraw && !fixture.penalties) {
        const winnerHome = fixture.winnerClubId === fixture.homeClubId;
        const winnerPens = randomInt(state, 4, 6);
        const loserPens = Math.max(1, winnerPens - randomInt(state, 1, 2));
        fixture.penalties = {
          home: winnerHome ? winnerPens : loserPens,
          away: winnerHome ? loserPens : winnerPens
        };
      }
    }
    awardEuropeanPrizeMoney(state, fixture);
    applyEuropeanTravelFatigue(state, fixture);
    if (fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId) {
      const activeHome = fixture.homeClubId === state.activeClubId;
      const gf = activeHome ? fixture.homeGoals : fixture.awayGoals;
      const ga = activeHome ? fixture.awayGoals : fixture.homeGoals;
      const opponentId = activeHome ? fixture.awayClubId : fixture.homeClubId;
      const opponent = getClub(state, opponentId);
      if (fixture.knockout) {
        const won = fixture.winnerClubId === state.activeClubId;
        addInbox(state, won ? "European Progress" : "European Exit", won ? `${getClub(state, state.activeClubId).name} advanced past ${opponent ? opponent.name : "their opponent"} in the ${fixture.roundName}.` : `${getClub(state, state.activeClubId).name} were knocked out by ${opponent ? opponent.name : "their opponent"} in the ${fixture.roundName}.`);
      } else {
        const result = gf > ga ? "beat" : gf === ga ? "drew with" : "lost to";
        addInbox(state, "European Night", `${getClub(state, state.activeClubId).name} ${result} ${opponent ? opponent.name : "their opponent"} ${gf}-${ga} in ${fixture.roundName}.`);
      }
      state.lastMatch = JSON.parse(JSON.stringify(fixture));
    }
    return fixture;
  }

  function calculateEuropeanGroupTables(state, competition) {
    const comp = competition || normalizeEuropeanCompetition(ensureEuropeState(state).competition, state.season || 1);
    const tables = {};
    Object.keys(comp.groups || {}).forEach((groupKey) => {
      const rows = {};
      (comp.groups[groupKey] || []).forEach((clubId) => {
        const club = getClub(state, clubId);
        rows[clubId] = {
          group: groupKey,
          clubId,
          clubName: club ? club.name : clubId,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      });
      (comp.rounds || []).forEach((round) => {
        (round.fixtures || []).forEach((fixture) => {
          if (!fixture.played || fixture.group !== groupKey || fixture.stage !== "group") return;
          const home = rows[fixture.homeClubId];
          const away = rows[fixture.awayClubId];
          if (!home || !away) return;
          home.played += 1;
          away.played += 1;
          home.goalsFor += fixture.homeGoals;
          home.goalsAgainst += fixture.awayGoals;
          away.goalsFor += fixture.awayGoals;
          away.goalsAgainst += fixture.homeGoals;
          if (fixture.homeGoals > fixture.awayGoals) {
            home.wins += 1;
            home.points += 3;
            away.losses += 1;
          } else if (fixture.awayGoals > fixture.homeGoals) {
            away.wins += 1;
            away.points += 3;
            home.losses += 1;
          } else {
            home.draws += 1;
            away.draws += 1;
            home.points += 1;
            away.points += 1;
          }
        });
      });
      Object.values(rows).forEach((row) => {
        row.goalDifference = row.goalsFor - row.goalsAgainst;
      });
      tables[groupKey] = Object.values(rows).sort((a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        (teamStrength(state, b.clubId).overall - teamStrength(state, a.clubId).overall)
      ).map((row, index) => ({ ...row, position: index + 1 }));
    });
    return tables;
  }

  function completeEuropeanCompetition(state, competition, championClubId) {
    if (!competition || competition.status === "complete") return null;
    const champion = getClub(state, championClubId);
    competition.status = "complete";
    competition.championClubId = championClubId;
    competition.championName = champion ? champion.name : "Unknown";
    const summary = {
      season: competition.season,
      competitionName: competition.name,
      championClubId,
      championName: competition.championName,
      qualifiedClubIds: competition.qualifiedClubIds || [],
      groups: competition.groups,
      rounds: competition.rounds.map((round) => ({
        key: round.key,
        label: round.label,
        date: round.date,
        stage: round.stage,
        fixtures: round.fixtures.map((fixture) => JSON.parse(JSON.stringify(fixture)))
      }))
    };
    state.europe.history.unshift(summary);
    state.europe.history = state.europe.history.slice(0, 8);
    if (championClubId === state.activeClubId) {
      state.manager.trophies += 1;
      state.manager.reputation = Math.round(clamp(state.manager.reputation + 6, 1, 100));
      addInbox(state, "European Winners", `${competition.championName} lifted the ${competition.name}.`);
    } else {
      addInbox(state, "European Final", `${competition.championName} won the ${competition.name}.`);
    }
    return { type: "europe", title: "European Complete", championClubId, championName: competition.championName };
  }

  function advanceEuropeanCompetition(state) {
    const europe = ensureEuropeState(state);
    const competition = europe.competition;
    if (!competition || competition.status === "complete") return null;
    let event = null;
    const groupRounds = competition.rounds.filter((round) => round.stage === "group");
    const groupComplete = groupRounds.every((round) => round.fixtures.length && round.fixtures.every((fixture) => fixture.played));
    const semiRound = competition.rounds[3];
    const finalRound = competition.rounds[4];

    if (groupComplete && !semiRound.fixtures.length) {
      const tables = calculateEuropeanGroupTables(state, competition);
      const a = tables.A || [];
      const b = tables.B || [];
      if (a[0] && a[1] && b[0] && b[1]) {
        semiRound.fixtures = [
          makeEuropeanFixture(competition.season, 3, a[0].clubId, b[1].clubId, semiRound.date, { stage: "knockout" }),
          makeEuropeanFixture(competition.season, 3, b[0].clubId, a[1].clubId, semiRound.date, { stage: "knockout" })
        ];
        competition.groupComplete = true;
        const activeSemi = semiRound.fixtures.find((fixture) => fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId);
        if (activeSemi) {
          const opponentId = activeSemi.homeClubId === state.activeClubId ? activeSemi.awayClubId : activeSemi.homeClubId;
          const opponent = getClub(state, opponentId);
          addInbox(state, "European Knockout Draw", `${getClub(state, state.activeClubId).name} will face ${opponent ? opponent.name : "their opponent"} in the ${semiRound.label}.`);
          event = event || { type: "europe", title: "European Draw", fixtureId: activeSemi.id };
        } else if ((competition.teams || []).includes(state.activeClubId) && !competition.activeGroupExitNotified) {
          competition.activeGroupExitNotified = true;
          addInbox(state, "European Exit", `${getClub(state, state.activeClubId).name} were eliminated in the group stage.`);
          event = event || { type: "europe", title: "European Exit" };
        }
      }
    }

    if (semiRound.fixtures.length && semiRound.fixtures.every((fixture) => fixture.played && fixture.winnerClubId) && !finalRound.fixtures.length) {
      finalRound.fixtures = [makeEuropeanFixture(competition.season, 4, semiRound.fixtures[0].winnerClubId, semiRound.fixtures[1].winnerClubId, finalRound.date, { stage: "knockout" })];
      semiRound.completed = true;
      const activeFinal = finalRound.fixtures.find((fixture) => fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId);
      if (activeFinal) {
        const opponentId = activeFinal.homeClubId === state.activeClubId ? activeFinal.awayClubId : activeFinal.homeClubId;
        const opponent = getClub(state, opponentId);
        addInbox(state, "European Final", `${getClub(state, state.activeClubId).name} will face ${opponent ? opponent.name : "their opponent"} in the ${finalRound.label}.`);
        event = event || { type: "europe", title: "European Final", fixtureId: activeFinal.id };
      }
    }

    if (finalRound.fixtures.length && finalRound.fixtures.every((fixture) => fixture.played && fixture.winnerClubId)) {
      finalRound.completed = true;
      event = event || completeEuropeanCompetition(state, competition, finalRound.fixtures[0].winnerClubId);
    }
    competition.rounds.forEach((round) => {
      round.completed = round.fixtures.length ? round.fixtures.every((fixture) => fixture.played && (!fixture.knockout || fixture.winnerClubId)) : round.completed;
    });
    return event;
  }

  function simulateEuropeanFixturesForDate(state, date) {
    const europe = ensureEuropeState(state);
    const competition = europe.competition;
    if (!competition || competition.status === "complete") return { fixtures: [], activeMatch: null, europeEvent: null };
    let activeMatch = null;
    const fixtures = [];
    competition.rounds.forEach((round) => {
      if (compareDates(round.date, date) > 0) return;
      (round.fixtures || []).forEach((fixture) => {
        if (fixture.played) return;
        fixture.date = fixture.date || round.date;
        fixture.roundName = fixture.roundName || round.label;
        fixture.competitionName = EUROPEAN_COMPETITION_NAME;
        fixture.competitionType = "europe";
        const result = simulateFixture(state, fixture);
        resolveEuropeanFixture(state, fixture);
        fixtures.push(JSON.parse(JSON.stringify(result)));
        if (fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId) {
          activeMatch = JSON.parse(JSON.stringify(fixture));
        }
      });
    });
    const europeEvent = advanceEuropeanCompetition(state);
    return { fixtures, activeMatch, europeEvent };
  }

  function europeanReport(state) {
    const europe = ensureEuropeState(state);
    const competition = europe.competition;
    const activeClubId = state.activeClubId;
    const fixtures = europeanFixtures(state);
    const activeFixtures = fixtures.filter((fixture) => fixture.homeClubId === activeClubId || fixture.awayClubId === activeClubId);
    const nextFixture = activeFixtures.filter((fixture) => !fixture.played).sort((a, b) => compareDates(a.date, b.date))[0] || null;
    const groupTables = calculateEuropeanGroupTables(state, competition);
    const activeGroup = Object.keys(competition.groups || {}).find((groupKey) => (competition.groups[groupKey] || []).includes(activeClubId)) || null;
    const knockoutLoss = activeFixtures.some((fixture) => fixture.played && fixture.knockout && fixture.winnerClubId && fixture.winnerClubId !== activeClubId);
    const groupComplete = competition.rounds.filter((round) => round.stage === "group").every((round) => round.fixtures.length && round.fixtures.every((fixture) => fixture.played));
    const activeQualified = (competition.teams || []).includes(activeClubId);
    const hasKnockoutFixture = activeFixtures.some((fixture) => fixture.stage === "knockout");
    const activeEliminated = activeQualified && (knockoutLoss || competition.status === "complete" && competition.championClubId !== activeClubId || groupComplete && !hasKnockoutFixture);
    const activeStage = competition.championClubId === activeClubId ? "Winners" :
      activeFixtures.some((fixture) => fixture.round === 5) ? "Final" :
      activeFixtures.some((fixture) => fixture.round === 4) ? "Semi-Final" :
      activeQualified ? "Group Stage" : "Not Qualified";
    const progressScore = !activeQualified ? 0 :
      competition.championClubId === activeClubId ? 100 :
      activeFixtures.some((fixture) => fixture.round === 5) ? (activeEliminated ? 86 : 92) :
      activeFixtures.some((fixture) => fixture.round === 4) ? (activeEliminated ? 72 : 80) :
      activeEliminated ? 46 :
      nextFixture ? 62 : 58;
    return {
      europe,
      competition,
      name: competition.name,
      status: competition.status,
      championClubId: competition.championClubId,
      championName: competition.championName,
      qualifiedClubIds: competition.qualifiedClubIds || [],
      teams: competition.teams || [],
      rounds: competition.rounds,
      groups: competition.groups || {},
      groupTables,
      activeGroup,
      activeGroupTable: activeGroup ? groupTables[activeGroup] || [] : [],
      activeQualified,
      activeEliminated,
      activeAlive: activeQualified && competition.status !== "complete" && !activeEliminated,
      activeStage,
      progressScore,
      nextFixture,
      fixtures
    };
  }

  function boardStatus(confidence) {
    if (confidence >= 78) return { key: "secure", label: "Secure", tone: "green" };
    if (confidence >= 58) return { key: "stable", label: "Stable", tone: "blue" };
    if (confidence >= 40) return { key: "pressure", label: "Pressure", tone: "amber" };
    return { key: "atRisk", label: "At Risk", tone: "red" };
  }

  function scoreBoardObjectives(state) {
    const board = ensureBoardState(state);
    const club = getClub(state, state.activeClubId);
    const table = calculateTable(state);
    const activeRow = table.find((row) => row.clubId === state.activeClubId);
    const cup = domesticCupReport(state);
    const wagePressure = club ? Math.round(weeklyWageSpend(state, club.id) / Math.max(1, club.wageBudget) * 100) : 100;
    const roleReport = club ? tacticalRoleReport(state, club.id) : null;
    const objective = board.objectives;
    const rows = [];

    const position = activeRow ? table.indexOf(activeRow) + 1 : 20;
    const leagueScore = Math.round(clamp(100 - Math.max(0, position - objective.league.targetPosition) * 10 + Math.max(0, objective.league.targetPosition - position) * 2, 18, 100));
    rows.push({
      ...objective.league,
      progress: leagueScore,
      detail: `${ordinalNumber(position)} now | target ${ordinalNumber(objective.league.targetPosition)}`,
      tone: leagueScore >= 80 ? "green" : leagueScore >= 58 ? "blue" : leagueScore >= 40 ? "amber" : "red"
    });

    const cupRoundScore = cup.activeEliminated ? (cup.bestRoundIndex >= objective.cup.targetRoundIndex ? 100 : 34 + Math.max(0, cup.bestRoundIndex + 1) * 16) : cup.status === "complete" && cup.championClubId === state.activeClubId ? 100 : 60 + Math.min(cup.bestRoundIndex + 1, objective.cup.targetRoundIndex + 1) * 12;
    rows.push({
      ...objective.cup,
      progress: Math.round(clamp(cupRoundScore, 20, 100)),
      detail: cup.championClubId === state.activeClubId ? "Cup winners" : cup.activeEliminated ? `Exited: ${cup.bestRoundLabel}` : cup.nextFixture ? `Next: ${cup.nextFixture.roundName}` : "Awaiting draw",
      tone: cupRoundScore >= 80 ? "green" : cupRoundScore >= 58 ? "blue" : cupRoundScore >= 40 ? "amber" : "red"
    });

    const europe = europeanReport(state);
    if (europe.activeQualified) {
      const europeScore = Math.round(clamp(europe.progressScore, 20, 100));
      rows.push({
        key: "europe",
        label: "European Campaign",
        description: "Compete well against continental opponents.",
        weight: 10,
        progress: europeScore,
        detail: europe.championClubId === state.activeClubId ? "European winners" : europe.activeEliminated ? `Exited: ${europe.activeStage}` : europe.nextFixture ? `Next: ${europe.nextFixture.roundName}` : europe.activeStage,
        tone: europeScore >= 82 ? "green" : europeScore >= 62 ? "blue" : europeScore >= 44 ? "amber" : "red"
      });
    }

    const financeScore = club ? Math.round(clamp(club.balance / Math.max(1, objective.finance.minBalance) * 86, 20, 100)) : 50;
    rows.push({
      ...objective.finance,
      progress: financeScore,
      detail: `${club ? formatMoney(club.balance) : "-"} | safe line ${formatMoney(objective.finance.minBalance)}`,
      tone: financeScore >= 82 ? "green" : financeScore >= 60 ? "blue" : financeScore >= 42 ? "amber" : "red"
    });

    const wageScore = Math.round(clamp(100 - Math.max(0, wagePressure - objective.wages.maxPressure) * 4, 20, 100));
    rows.push({
      ...objective.wages,
      progress: wageScore,
      detail: `${wagePressure}% wage pressure | limit ${objective.wages.maxPressure}%`,
      tone: wageScore >= 82 ? "green" : wageScore >= 60 ? "blue" : wageScore >= 42 ? "amber" : "red"
    });

    const youthScore = Math.round(clamp((board.youthPromotions || 0) / Math.max(1, objective.youth.targetPromotions) * 100, 15, 100));
    rows.push({
      ...objective.youth,
      progress: youthScore,
      detail: `${board.youthPromotions || 0}/${objective.youth.targetPromotions} promoted`,
      tone: youthScore >= 100 ? "green" : youthScore >= 50 ? "blue" : "amber"
    });

    const roleFit = roleReport ? roleReport.averageFit : 62;
    const styleScore = Math.round(clamp(roleFit / Math.max(1, objective.style.minRoleFit) * 88, 20, 100));
    rows.push({
      ...objective.style,
      progress: styleScore,
      detail: `${roleFit}% role fit | target ${objective.style.minRoleFit}%`,
      tone: styleScore >= 82 ? "green" : styleScore >= 60 ? "blue" : styleScore >= 42 ? "amber" : "red"
    });

    return rows;
  }

  function boardReport(state) {
    const board = ensureBoardState(state);
    const objectives = scoreBoardObjectives(state);
    const weighted = objectives.reduce((total, objective) => total + objective.progress * objective.weight, 0);
    const weight = objectives.reduce((total, objective) => total + objective.weight, 0) || 1;
    const confidence = Math.round(clamp(weighted / weight, 1, 100));
    const status = boardStatus(confidence);
    board.confidence = confidence;
    board.status = status.key;
    return {
      confidence,
      status,
      objectives,
      reviews: board.reviews || [],
      youthPromotions: board.youthPromotions || 0
    };
  }

  function processBoardDaily(state) {
    const board = ensureBoardState(state);
    const report = boardReport(state);
    const day = state.calendar ? state.calendar.day || 1 : 1;
    if (day - board.lastReviewDay < 14 && Math.abs(report.confidence - (board.lastConfidence || report.confidence)) < 12) return null;
    board.lastReviewDay = day;
    const delta = report.confidence - (board.lastConfidence || report.confidence);
    board.lastConfidence = report.confidence;
    const weakest = report.objectives.slice().sort((a, b) => a.progress - b.progress)[0];
    const review = {
      date: state.calendar ? state.calendar.currentDate : null,
      season: state.season || 1,
      confidence: report.confidence,
      status: report.status.label,
      weakest: weakest ? weakest.label : null,
      delta
    };
    board.reviews.unshift(review);
    board.reviews = board.reviews.slice(0, 8);
    if (day < 7 && Math.abs(delta) < 12) return null;
    addInbox(state, "Board Review", `Board confidence is ${report.status.label.toLowerCase()} at ${report.confidence}/100. Focus area: ${weakest ? weakest.label : "overall progress"}.`);
    return { type: "board", title: "Board Review", confidence: report.confidence, status: report.status.key };
  }

  function secondaryPositions(state, position) {
    const map = {
      GK: [],
      RB: ["LB", "CB"],
      LB: ["RB", "CB"],
      CB: ["DM", "RB", "LB"],
      DM: ["CM", "CB"],
      CM: ["DM", "AM"],
      AM: ["CM", "RW", "LW"],
      RW: ["LW", "AM", "ST"],
      LW: ["RW", "AM", "ST"],
      ST: ["RW", "LW", "AM"]
    };
    const pool = map[position] || [];
    return shuffle(state, pool).slice(0, random(state) > 0.55 ? 2 : 1);
  }

  function academyPlanLabel(plan) {
    return ACADEMY_PLANS[plan] ? ACADEMY_PLANS[plan].label : ACADEMY_PLANS.balanced.label;
  }

  function academyPlanOptions() {
    return Object.keys(ACADEMY_PLANS).map((key) => ({
      key,
      ...ACADEMY_PLANS[key]
    }));
  }

  function academyNationality(state, club) {
    const homeBias = ["England", "England", "England", "Norway", "Denmark", "Sweden", "France", "Netherlands"];
    const pool = club && club.realWorld ? homeBias : Data.NATIONALITIES;
    return pick(state, pool);
  }

  function normalizeAcademyProspect(state, prospect) {
    if (!prospect) return null;
    const position = Data.POSITIONS.includes(prospect.position) ? prospect.position : pick(state, Data.POSITIONS);
    prospect.position = position;
    prospect.name = prospect.name || generateName(state);
    prospect.displayName = prospect.displayName || footballDisplayName(prospect.name);
    prospect.age = Math.round(clamp(prospect.age || randomInt(state, 15, 18), 15, 19));
    prospect.nationality = prospect.nationality || pick(state, Data.NATIONALITIES);
    prospect.foot = prospect.foot || (random(state) > 0.25 ? "Right" : "Left");
    prospect.secondaryPositions = prospect.secondaryPositions || secondaryPositions(state, position);
    prospect.height = prospect.height || (position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 181, 196) : randomInt(state, 168, 187));
    prospect.weight = prospect.weight || (position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 72, 88) : randomInt(state, 62, 80));
    prospect.trainingPlan = ACADEMY_PLANS[prospect.trainingPlan] ? prospect.trainingPlan : "balanced";
    prospect.morale = Math.round(clamp(prospect.morale || randomInt(state, 56, 84), 0, 100));
    prospect.fitness = Math.round(clamp(prospect.fitness || randomInt(state, 78, 100), 0, 100));
    prospect.currentAbility = Math.round(clamp(prospect.currentAbility || 45, 1, 100));
    prospect.potential = Math.round(clamp(prospect.potential || prospect.currentAbility + 12, prospect.currentAbility, 99));
    prospect.attributes = normalizeAttributeSet(prospect.attributes || generateAttributes(state, position, prospect.currentAbility), position, prospect.currentAbility);
    prospect.currentAbility = calculateAbilityFromAttributes({ ...prospect, clubId: state.activeClubId });
    prospect.potential = Math.max(prospect.potential, prospect.currentAbility);
    prospect.developmentEvents = prospect.developmentEvents || [];
    prospect.createdSeason = prospect.createdSeason || state.season || 1;
    prospect.createdDate = prospect.createdDate || (state.calendar ? state.calendar.currentDate : null);
    prospect.status = prospect.status || "academy";
    return prospect;
  }

  function generateAcademyProspect(state, club, options) {
    const academy = ensureAcademyState(state);
    const level = academy.level || 3;
    const positionPool = options && options.position ? [options.position] : shuffle(state, Data.SQUAD_BLUEPRINT).slice(0, 10);
    const position = pick(state, positionPool);
    const age = options && options.age ? options.age : randomInt(state, 15, 18);
    const reputation = club && club.reputation ? club.reputation : 70;
    const rareLift = random(state) > 0.9 ? randomFloat(state, 5, 12) : 0;
    const currentAbility = Math.round(clamp(reputation - 27 + level * 1.6 + randomFloat(state, -8, 8) + (age - 16) * 1.4, 34, 66));
    const potential = Math.round(clamp(currentAbility + randomFloat(state, 10, 27) + level * 1.8 + rareLift, currentAbility + 4, 96));
    const prospect = {
      id: `yp${academy.nextProspectId++}`,
      name: generateName(state),
      age,
      nationality: academyNationality(state, club),
      foot: random(state) > 0.25 ? "Right" : "Left",
      position,
      secondaryPositions: secondaryPositions(state, position),
      height: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 181, 196) : randomInt(state, 168, 187),
      weight: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 72, 88) : randomInt(state, 62, 80),
      currentAbility,
      potential,
      attributes: generateAttributes(state, position, currentAbility),
      trainingPlan: options && options.trainingPlan && ACADEMY_PLANS[options.trainingPlan] ? options.trainingPlan : "balanced",
      morale: randomInt(state, 56, 84),
      fitness: randomInt(state, 78, 100),
      developmentEvents: [],
      createdSeason: state.season || 1,
      createdDate: state.calendar ? state.calendar.currentDate : null,
      intakeSeason: state.season || 1,
      status: "academy"
    };
    return normalizeAcademyProspect(state, prospect);
  }

  function createAcademyIntake(state, count, options) {
    const academy = ensureAcademyState(state);
    const club = getClub(state, academy.clubId || state.activeClubId);
    const total = count || randomInt(state, 4, 7);
    const prospects = [];
    for (let i = 0; i < total; i += 1) {
      prospects.push(generateAcademyProspect(state, club, options || {}));
    }
    academy.prospects = academy.prospects.concat(prospects)
      .sort((a, b) => b.potential - a.potential || b.currentAbility - a.currentAbility)
      .slice(0, 22);
    academy.lastIntakeSeason = state.season || 1;
    const report = {
      date: state.calendar ? state.calendar.currentDate : null,
      season: state.season || 1,
      type: options && options.initial ? "initial" : "intake",
      count: prospects.length,
      topProspectId: prospects[0] ? prospects.slice().sort((a, b) => b.potential - a.potential)[0].id : null
    };
    academy.reports.unshift(report);
    academy.reports = academy.reports.slice(0, 12);
    if (!(options && options.silent)) {
      const top = report.topProspectId ? academy.prospects.find((prospect) => prospect.id === report.topProspectId) : null;
      addInbox(state, "Youth Intake", `${prospects.length} academy players joined the intake${top ? `. ${top.name} is the standout prospect.` : "."}`);
    }
    return prospects;
  }

  function academyReadinessScore(state, prospect) {
    const academy = ensureAcademyState(state);
    const club = getClub(state, academy.clubId || state.activeClubId);
    const benchmark = club ? Math.max(48, club.reputation - 22) : 54;
    const ageLift = prospect.age >= 18 ? 12 : prospect.age === 17 ? 7 : prospect.age === 16 ? 3 : 0;
    const abilityScore = clamp((prospect.currentAbility - (benchmark - 16)) * 3.4, 0, 82);
    const mentality = averageExisting(prospect.attributes || {}, ["decisions", "workRate", "composure", "teamwork"], 55);
    return round(clamp(abilityScore + ageLift + (mentality - 55) * 0.35, 0, 100), 0);
  }

  function academyProspectTone(readiness) {
    if (readiness >= 76) return "green";
    if (readiness >= 56) return "blue";
    if (readiness >= 36) return "amber";
    return "red";
  }

  function academyProspects(state) {
    return ensureAcademyState(state).prospects
      .map((prospect) => normalizeAcademyProspect(state, prospect))
      .sort((a, b) => b.potential - a.potential || b.currentAbility - a.currentAbility);
  }

  function academyReport(state) {
    const academy = ensureAcademyState(state);
    const prospects = academyProspects(state);
    const rows = prospects.map((prospect) => {
      const readiness = academyReadinessScore(state, prospect);
      return {
        prospect,
        readiness,
        tone: academyProspectTone(readiness),
        growthRoom: Math.max(0, prospect.potential - prospect.currentAbility),
        topAttributes: topProspectAttributes(prospect, 3)
      };
    });
    const top = rows[0] || null;
    const ready = rows.filter((row) => row.readiness >= 64 || row.prospect.currentAbility >= 60);
    const highCeiling = rows.filter((row) => row.prospect.potential >= 78);
    return {
      level: academy.level,
      prospects: rows,
      top,
      ready,
      highCeiling,
      averagePotential: round(average(rows.map((row) => row.prospect.potential)), 1),
      averageReadiness: round(average(rows.map((row) => row.readiness)), 1),
      reports: academy.reports || []
    };
  }

  function topProspectAttributes(prospect, limit) {
    return Object.keys(prospect.attributes || {})
      .map((key) => ({ key, label: Data.ATTRIBUTE_LABELS[key] || key, value: prospect.attributes[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit || 3);
  }

  function setAcademyPlan(state, prospectId, plan) {
    const academy = ensureAcademyState(state);
    const prospect = academy.prospects.find((item) => item.id === prospectId);
    if (!prospect || !ACADEMY_PLANS[plan]) return { ok: false, message: "Academy plan unavailable." };
    prospect.trainingPlan = plan;
    prospect.morale = Math.round(clamp(prospect.morale + 1, 0, 100));
    return { ok: true, message: `${prospect.name} moved to ${academyPlanLabel(plan)} training.` };
  }

  function promoteAcademyProspect(state, prospectId) {
    const academy = ensureAcademyState(state);
    const club = getClub(state, academy.clubId || state.activeClubId);
    const index = academy.prospects.findIndex((prospect) => prospect.id === prospectId);
    if (!club || index < 0) return { ok: false, message: "Academy prospect not found." };
    const prospect = normalizeAcademyProspect(state, academy.prospects[index]);
    if (prospect.age < 16) return { ok: false, message: "Prospect is too young for senior registration." };
    const player = {
      id: `p${state.nextPlayerId++}`,
      name: prospect.name,
      displayName: prospect.displayName || footballDisplayName(prospect.name),
      age: prospect.age,
      nationality: prospect.nationality,
      foot: prospect.foot,
      position: prospect.position,
      secondaryPositions: prospect.secondaryPositions || [],
      height: prospect.height,
      weight: prospect.weight,
      clubId: club.id,
      value: 0,
      wage: 0,
      contractYears: prospect.age <= 17 ? 3 : 2,
      morale: Math.round(clamp(prospect.morale + 4, 0, 100)),
      fitness: prospect.fitness,
      sharpness: randomInt(state, 44, 72),
      form: [],
      trainingFocus: "balanced",
      individualPlan: "extra",
      squadRole: "prospect",
      happiness: {
        lastConcernDay: -999,
        lastContractDay: -999,
        lastPromiseDay: -999
      },
      promises: {},
      potential: prospect.potential,
      currentAbility: prospect.currentAbility,
      attributes: normalizeAttributeSet({ ...prospect.attributes }, prospect.position, prospect.currentAbility),
      seasonStats: freshPlayerStats(),
      careerTotals: freshPlayerStats(),
      history: [],
      development: [],
      developmentEvents: prospect.developmentEvents || [],
      transferListed: false,
      loanUntilSeason: null,
      parentClubId: null,
      injury: null,
      suspension: null,
      source: {
        provider: "Youth Academy",
        academyId: prospect.id,
        promotedSeason: state.season,
        promotedDate: state.calendar ? state.calendar.currentDate : null
      }
    };
    player.currentAbility = calculateAbilityFromAttributes(player);
    player.value = calculatePlayerValue(player);
    player.wage = moneyRound(calculateWage(player) * 0.42);
    player.development.push(snapshotDevelopment(player, state.season || 1));
    state.players[player.id] = player;
    club.squad.push(player.id);
    academy.prospects.splice(index, 1);
    if (club.id === state.activeClubId) {
      ensureBoardState(state).youthPromotions += 1;
      createPathwayPromise(state, player, {
        source: "academy-promotion",
        trainingFocus: pathwayTrainingFocusForPlayer(player),
        tacticalRoleKey: bestTacticalRoleForPlayer(player, player.position),
        requiredMinutes: player.age <= 17 ? 300 : 420,
        requiredStarts: player.age <= 17 ? 3 : 5,
        dueDate: state.calendar ? addDays(state.calendar.currentDate, 168) : null
      });
    }
    repairMatchdaySquad(state, club.id);
    addInbox(state, "Academy Promotion", `${player.name} signed a senior contract and joined the first-team squad as a prospect. Staff have set a first-team pathway promise.`);
    return { ok: true, message: `${player.name} promoted to the senior squad.`, playerId: player.id };
  }

  function releaseAcademyProspect(state, prospectId) {
    const academy = ensureAcademyState(state);
    const prospect = academy.prospects.find((item) => item.id === prospectId);
    if (!prospect) return { ok: false, message: "Academy prospect not found." };
    academy.prospects = academy.prospects.filter((item) => item.id !== prospectId);
    return { ok: true, message: `${prospect.name} released from the academy.` };
  }

  function calculateAbilityFromAttributes(player) {
    const weights = Data.POSITION_WEIGHTS[player.position] || {};
    let total = 0;
    let weightTotal = 0;
    Data.ATTRIBUTES.forEach((attr) => {
      const weight = weights[attr] || 0.72;
      total += player.attributes[attr] * weight;
      weightTotal += weight;
    });
    return Math.round(total / weightTotal);
  }

  function calculatePlayerValue(player) {
    const ageCurve = player.age < 22 ? 1.2 : player.age > 31 ? 0.72 : 1;
    const potentialBonus = 1 + Math.max(0, player.potential - player.currentAbility) / 95;
    const contractFactor = clamp(player.contractYears / 4, 0.45, 1.25);
    const base = Math.pow(player.currentAbility, 2.65) * 42;
    return moneyRound(base * ageCurve * potentialBonus * contractFactor);
  }

  function calculateWage(player) {
    const seniority = player.age > 28 ? 1.12 : player.age < 21 ? 0.78 : 1;
    return moneyRound(Math.pow(player.currentAbility, 2.18) * 5.7 * seniority);
  }

  function squadRoleLabel(role) {
    return SQUAD_ROLES[role] ? SQUAD_ROLES[role].label : SQUAD_ROLES.rotation.label;
  }

  function inferSquadRole(player, club, seedPlayer) {
    const starts = Number(seedPlayer && seedPlayer.starts || 0);
    const minutes = Number(seedPlayer && seedPlayer.minutes || 0);
    const abilityGap = player.currentAbility - (club && club.reputation ? club.reputation : 68);
    if (player.age <= 21 && player.potential - player.currentAbility >= 9 && player.currentAbility < 76) return "prospect";
    if (player.currentAbility >= 86 || starts >= 28 || minutes >= 2500 || abilityGap >= 12) return "star";
    if (player.currentAbility >= 79 || starts >= 20 || minutes >= 1700 || abilityGap >= 6) return "important";
    if (starts <= 6 && minutes < 700 || player.currentAbility < 60 && player.age > 23) return "backup";
    return "rotation";
  }

  function roleExpectation(role) {
    return SQUAD_ROLES[role] || SQUAD_ROLES.rotation;
  }

  function roleTone(role) {
    if (role === "star") return "green";
    if (role === "important") return "blue";
    if (role === "prospect") return "amber";
    if (role === "backup") return "";
    return "blue";
  }

  function squadRoleOptions() {
    return Object.keys(SQUAD_ROLES).map((key) => ({
      key,
      ...SQUAD_ROLES[key]
    }));
  }

  function generateAttributes(state, position, targetAbility) {
    const weights = Data.POSITION_WEIGHTS[position] || {};
    const attributes = {};
    Data.ATTRIBUTES.forEach((attr) => {
      const roleLift = ((weights[attr] || 0.72) - 0.72) * 24;
      attributes[attr] = Math.round(clamp(targetAbility + roleLift + randomFloat(state, -13, 13), 24, 96));
    });
    return normalizeAttributeSet(attributes, position, targetAbility);
  }

  function normalizeAttributeSet(attributes, position, targetAbility) {
    const base = targetAbility || 58;
    Data.ATTRIBUTES.forEach((attr) => {
      if (!Number.isFinite(attributes[attr])) attributes[attr] = inferredAttribute(attributes, attr, position, base);
      attributes[attr] = Math.round(clamp(attributes[attr], 1, 100));
    });
    if (position === "GK") {
      ["finishing", "longShots", "dribbling", "crossing"].forEach((attr) => {
        attributes[attr] = Math.round(clamp(attributes[attr] - 18, 8, 72));
      });
    } else {
      ["reflexes", "handling", "diving", "oneOnOnes", "aerialReach", "commandOfArea", "distribution", "kicking"].forEach((attr) => {
        attributes[attr] = Math.round(clamp(attributes[attr] - 16, 6, 74));
      });
    }
    return attributes;
  }

  function inferredAttribute(attributes, attr, position, base) {
    const source = attributes || {};
    const averagePhysical = averageExisting(source, ["pace", "acceleration", "stamina", "strength", "jumping"], base);
    const averageTechnical = averageExisting(source, ["passing", "firstTouch", "dribbling", "crossing", "finishing"], base);
    const averageMental = averageExisting(source, ["decisions", "composure", "positioning", "leadership", "workRate"], base);
    const map = {
      agility: averageExisting(source, ["pace", "acceleration", "balance"], averagePhysical),
      balance: averageExisting(source, ["strength", "agility", "firstTouch"], averagePhysical),
      injuryResistance: clamp(averageExisting(source, ["stamina", "strength", "naturalFitness"], base) + (position === "GK" ? 3 : 0), 24, 94),
      naturalFitness: averageExisting(source, ["stamina", "workRate", "pace"], averagePhysical),
      technique: averageTechnical,
      setPieces: averageExisting(source, ["crossing", "passing", "technique"], averageTechnical),
      penalties: averageExisting(source, ["finishing", "composure", "technique"], averageTechnical),
      anticipation: averageExisting(source, ["positioning", "decisions", "offTheBall"], averageMental),
      concentration: averageExisting(source, ["decisions", "positioning", "composure"], averageMental),
      teamwork: averageExisting(source, ["workRate", "leadership", "passing"], averageMental),
      aggression: clamp(48 + (source.tackling || base) * 0.18 + (source.workRate || base) * 0.12, 18, 90),
      bravery: averageExisting(source, ["strength", "heading", "leadership"], averagePhysical),
      flair: averageExisting(source, ["dribbling", "technique", "vision"], averageTechnical),
      offTheBall: averageExisting(source, ["positioning", "pace", "decisions"], averageMental),
      reflexes: position === "GK" ? averageExisting(source, ["positioning", "jumping", "composure"], base + 8) : base - 12,
      handling: position === "GK" ? averageExisting(source, ["composure", "strength", "positioning"], base + 6) : base - 14,
      diving: position === "GK" ? averageExisting(source, ["jumping", "agility", "pace"], base + 6) : base - 14,
      oneOnOnes: position === "GK" ? averageExisting(source, ["positioning", "decisions", "composure"], base + 5) : base - 14,
      aerialReach: position === "GK" ? averageExisting(source, ["jumping", "height", "strength"], base + 5) : base - 14,
      commandOfArea: position === "GK" ? averageExisting(source, ["leadership", "positioning", "decisions"], base + 4) : base - 14,
      distribution: position === "GK" ? averageExisting(source, ["passing", "decisions", "kicking"], base) : base - 10,
      kicking: position === "GK" ? averageExisting(source, ["passing", "strength", "distribution"], base) : base - 10
    };
    return Math.round(clamp(map[attr] !== undefined ? map[attr] : base, 1, 100));
  }

  function averageExisting(source, keys, fallback) {
    const values = keys.map((key) => Number(source[key])).filter((value) => Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  }

  function averageNumbers(values, fallback) {
    const valid = values.filter((value) => Number.isFinite(value));
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : fallback;
  }

  function normalizeNameKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function compactNameKey(value) {
    return normalizeNameKey(value).replace(/\b[a-z]\b/g, "").replace(/\s+/g, " ").trim();
  }

  function nameLastToken(value) {
    const parts = normalizeNameKey(value).split(" ").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  }

  function footballDisplayName(name) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const particles = new Set(["da", "de", "del", "dos", "van", "von", "di", "la", "le", "du"]);
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    const previous = parts[parts.length - 2];
    if (previous && particles.has(previous.toLowerCase())) return `${previous} ${last}`;
    return last;
  }

  function playerDisplayName(player, style) {
    if (!player) return "";
    if (style === "full") return player.name || player.displayName || "";
    return player.displayName || footballDisplayName(player.name);
  }

  function findFc26Rating(playerLike) {
    const ratings = Data.FC26_PREMIER_LEAGUE_RATINGS || [];
    if (!ratings.length || !playerLike) return null;
    const candidates = [
      playerLike.name,
      playerLike.displayName,
      playerLike.webName,
      playerLike.source && playerLike.source.webName
    ].filter(Boolean);
    const keys = new Set(candidates.flatMap((candidate) => {
      const normalized = normalizeNameKey(candidate);
      const compact = compactNameKey(candidate);
      const last = nameLastToken(candidate);
      return [normalized, compact, last].filter((item) => item && item.length >= 3);
    }));
    const direct = ratings.find((rating) => {
      const names = [rating.n, rating.c].filter(Boolean);
      return names.some((name) => keys.has(normalizeNameKey(name)) || keys.has(compactNameKey(name)));
    });
    if (direct) return direct;
    return ratings.find((rating) => {
      const aliases = [rating.n, rating.c].filter(Boolean).map(nameLastToken).filter((item) => item.length >= 5);
      return aliases.some((alias) => keys.has(alias));
    }) || null;
  }

  function eafcAttributePatch(position, rating) {
    const r = rating || {};
    const ovr = Number(r.o || r.ovr || 60);
    const pac = Number(r.pac || ovr);
    const sho = Number(r.sho || ovr);
    const pas = Number(r.pas || ovr);
    const dri = Number(r.dri || ovr);
    const def = Number(r.def || ovr);
    const phy = Number(r.phy || ovr);
    if (position === "GK") {
      return {
        pace: Math.round(clamp((pac + phy) / 2 - 16, 24, 78)),
        acceleration: Math.round(clamp(pac - 32, 18, 74)),
        agility: Math.round(clamp(dri - 6, 32, 94)),
        balance: Math.round(clamp(dri - 14, 24, 88)),
        reflexes: Math.round(clamp(dri, 40, 98)),
        diving: Math.round(clamp(pac, 40, 98)),
        handling: Math.round(clamp(sho, 40, 98)),
        kicking: Math.round(clamp(pas, 35, 98)),
        distribution: Math.round(clamp((pas + dri) / 2, 35, 98)),
        oneOnOnes: Math.round(clamp((dri + ovr) / 2, 40, 98)),
        aerialReach: Math.round(clamp((def + phy) / 2, 38, 98)),
        commandOfArea: Math.round(clamp(phy, 38, 98)),
        positioning: Math.round(clamp(phy, 38, 98)),
        strength: Math.round(clamp(phy - 8, 30, 92)),
        composure: Math.round(clamp(ovr, 40, 96)),
        decisions: Math.round(clamp((ovr + pas) / 2, 36, 96))
      };
    }
    const attackingPositioning = Math.round(clamp((sho + dri + pac) / 3, 22, 96));
    return {
      pace: Math.round(clamp(pac, 18, 98)),
      acceleration: Math.round(clamp(pac + (dri - ovr) * 0.18, 18, 98)),
      agility: Math.round(clamp((pac + dri * 1.35) / 2.35, 18, 98)),
      balance: Math.round(clamp((dri + phy) / 2, 18, 98)),
      finishing: Math.round(clamp(sho + (["ST", "RW", "LW", "AM"].includes(position) ? 3 : -4), 8, 98)),
      longShots: Math.round(clamp((sho + pas) / 2, 8, 98)),
      passing: Math.round(clamp(pas, 12, 98)),
      vision: Math.round(clamp(pas + (position === "AM" || position === "CM" ? 3 : 0), 12, 98)),
      crossing: Math.round(clamp(pas + (["RB", "LB", "RW", "LW"].includes(position) ? 3 : -2), 8, 98)),
      dribbling: Math.round(clamp(dri, 12, 98)),
      firstTouch: Math.round(clamp((dri + ovr) / 2, 12, 98)),
      heading: Math.round(clamp((phy + def + (position === "ST" || position === "CB" ? 8 : -4)) / 2, 8, 98)),
      tackling: Math.round(clamp(def, 8, 98)),
      positioning: position === "ST" || position === "RW" || position === "LW" || position === "AM" ? attackingPositioning : Math.round(clamp(def + 2, 8, 98)),
      marking: Math.round(clamp(def + (["CB", "RB", "LB", "DM"].includes(position) ? 2 : -5), 8, 98)),
      strength: Math.round(clamp(phy, 16, 98)),
      stamina: Math.round(clamp((phy + pac) / 2, 16, 98)),
      jumping: Math.round(clamp((phy + pac) / 2 + (position === "CB" || position === "ST" ? 3 : 0), 16, 98)),
      injuryResistance: Math.round(clamp((phy + ovr) / 2, 18, 96)),
      naturalFitness: Math.round(clamp((phy + pac + ovr) / 3, 18, 96)),
      technique: Math.round(clamp((dri + pas + sho) / 3, 12, 98)),
      setPieces: Math.round(clamp((pas + sho) / 2, 8, 98)),
      penalties: Math.round(clamp((sho + ovr) / 2, 8, 98)),
      composure: Math.round(clamp((ovr + dri + sho) / 3, 12, 98)),
      decisions: Math.round(clamp((ovr + pas) / 2, 12, 98)),
      anticipation: Math.round(clamp((ovr + def + attackingPositioning) / 3, 12, 98)),
      concentration: Math.round(clamp((ovr + def) / 2, 12, 98)),
      leadership: Math.round(clamp(ovr - 8, 10, 92)),
      workRate: Math.round(clamp((phy + def + pas) / 3, 12, 98)),
      teamwork: Math.round(clamp((pas + ovr) / 2, 12, 98)),
      aggression: Math.round(clamp((phy + def) / 2, 12, 98)),
      bravery: Math.round(clamp((phy + def + ovr) / 3, 12, 98)),
      flair: Math.round(clamp((dri + sho + pac) / 3, 8, 98)),
      offTheBall: attackingPositioning
    };
  }

  function applyFc26Profile(player, seedPlayer) {
    const rating = findFc26Rating({ ...player, ...(seedPlayer || {}) });
    if (rating) {
      Object.assign(player.attributes, eafcAttributePatch(player.position, rating));
      normalizeAttributeSet(player.attributes, player.position, rating.o);
      player.currentAbility = Math.round(clamp(rating.o, 1, 99));
      const ratedPotential = Number(rating.p || rating.pot || rating.potential);
      if (Number.isFinite(ratedPotential)) {
        player.potential = Math.round(clamp(ratedPotential, player.currentAbility, 99));
      } else {
        const potentialLift = player.age <= 21 ? 8 : player.age <= 24 ? 5 : player.age <= 27 ? 2 : 0;
        player.potential = Math.round(clamp(Math.max(player.potential || player.currentAbility, player.currentAbility + potentialLift), player.currentAbility, 99));
      }
      player.ratingModelVersion = RATING_MODEL_VERSION;
      player.displayName = footballDisplayName(rating.c || rating.n || player.name);
      player.source = player.source || {};
      player.source.fc26 = {
        matched: true,
        name: rating.n,
        commonName: rating.c || null,
        source: "Matched rating profile",
        ovr: rating.o,
        pot: player.potential,
        pac: rating.pac,
        sho: rating.sho,
        pas: rating.pas,
        dri: rating.dri,
        def: rating.def,
        phy: rating.phy
      };
      return true;
    }
    player.ratingModelVersion = RATING_MODEL_VERSION;
    player.displayName = player.displayName || footballDisplayName(player.name);
    player.source = player.source || {};
    player.source.fc26 = {
      matched: false,
      source: "Generated projection",
      ...fc26StyleStats(player)
    };
    return false;
  }

  function fc26StyleStats(player) {
    if (player && player.source && player.source.fc26 && Number.isFinite(player.source.fc26.ovr)) {
      const rating = player.source.fc26;
      return {
        source: rating.source || "Rating profile",
        matched: !!rating.matched,
        ovr: rating.ovr,
        pot: rating.pot || player.potential,
        pac: rating.pac,
        sho: rating.sho,
        pas: rating.pas,
        dri: rating.dri,
        def: rating.def,
        phy: rating.phy
      };
    }
    if (!player) return null;
    const a = player.attributes || {};
    if (player.position === "GK") {
      return {
        source: "Generated projection",
        matched: false,
        ovr: player.currentAbility,
        pot: player.potential,
        pac: Math.round(averageNumbers([a.diving, a.reflexes], player.currentAbility)),
        sho: Math.round(averageNumbers([a.handling, a.oneOnOnes], player.currentAbility)),
        pas: Math.round(averageNumbers([a.kicking, a.distribution, a.passing], player.currentAbility)),
        dri: Math.round(averageNumbers([a.reflexes, a.agility], player.currentAbility)),
        def: Math.round(averageNumbers([a.commandOfArea, a.aerialReach], player.currentAbility)),
        phy: Math.round(averageNumbers([a.positioning, a.strength, a.composure], player.currentAbility))
      };
    }
    return {
      source: "Generated projection",
      matched: false,
      ovr: player.currentAbility,
      pot: player.potential,
      pac: Math.round(averageNumbers([a.pace, a.acceleration], player.currentAbility)),
      sho: Math.round(averageNumbers([a.finishing, a.longShots, a.composure], player.currentAbility)),
      pas: Math.round(averageNumbers([a.passing, a.vision, a.crossing], player.currentAbility)),
      dri: Math.round(averageNumbers([a.dribbling, a.firstTouch, a.agility], player.currentAbility)),
      def: Math.round(averageNumbers([a.tackling, a.marking, a.positioning], player.currentAbility)),
      phy: Math.round(averageNumbers([a.strength, a.stamina, a.jumping], player.currentAbility))
    };
  }

  function generatePlayer(state, club, position, index) {
    const reputation = club.reputation || 65;
    const age = random(state) < 0.28 ? randomInt(state, 17, 22) : randomInt(state, 23, 33);
    const ageLift = age >= 24 && age <= 29 ? randomFloat(state, 1, 5) : age < 21 ? randomFloat(state, -5, 2) : randomFloat(state, -4, 2);
    const currentAbility = Math.round(clamp(reputation + ageLift + randomFloat(state, -10, 9), 42, 88));
    const potential = Math.round(clamp(currentAbility + (age < 23 ? randomFloat(state, 8, 22) : randomFloat(state, 0, 10)), currentAbility, 96));
    const attributes = generateAttributes(state, position, currentAbility);
    const player = {
      id: `p${state.nextPlayerId++}`,
      name: generateName(state),
      age,
      nationality: pick(state, Data.NATIONALITIES),
      foot: random(state) > 0.26 ? "Right" : "Left",
      position,
      secondaryPositions: secondaryPositions(state, position),
      height: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 183, 199) : randomInt(state, 170, 188),
      weight: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 76, 92) : randomInt(state, 66, 84),
      clubId: club.id,
      value: 0,
      wage: 0,
      contractYears: randomInt(state, 1, 5),
      morale: randomInt(state, 48, 82),
      fitness: randomInt(state, 78, 100),
      sharpness: randomInt(state, 52, 86),
      form: [],
      trainingFocus: "balanced",
      individualPlan: "normal",
      squadRole: "rotation",
      happiness: {
        lastConcernDay: -999,
        lastContractDay: -999,
        lastPromiseDay: -999
      },
      promises: {},
      potential,
      currentAbility,
      attributes,
      seasonStats: freshPlayerStats(),
      careerTotals: freshPlayerStats(),
      history: [],
      development: [],
      developmentEvents: [],
      transferListed: false,
      loanUntilSeason: null,
      parentClubId: null,
      injury: null,
      suspension: null
    };
    player.currentAbility = calculateAbilityFromAttributes(player);
    player.squadRole = inferSquadRole(player, club);
    player.value = calculatePlayerValue(player);
    player.wage = calculateWage(player);
    player.development.push(snapshotDevelopment(player, 1));
    if (index === 0 && position !== "GK" && random(state) > 0.92) {
      player.leadership = true;
    }
    return player;
  }

  function generateSeededPlayer(state, club, seedPlayer, position, index) {
    const age = seedPlayer.age || (seedPlayer.elementType === 1 ? randomInt(state, 22, 34) : randomInt(state, 18, 32));
    const currentAbility = calculateSeededAbility(seedPlayer, club);
    const potential = calculateSeededPotential(state, seedPlayer, age, currentAbility);
    const attributes = generateAttributes(state, position, currentAbility);
    biasSeededAttributes(attributes, seedPlayer, position);
    const player = {
      id: `p${state.nextPlayerId++}`,
      name: seedPlayer.name || seedPlayer.webName || generateName(state),
      displayName: seedPlayer.webName || seedPlayer.name,
      age,
      nationality: "Unknown",
      foot: random(state) > 0.24 ? "Right" : "Left",
      position,
      secondaryPositions: secondaryPositions(state, position),
      height: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 183, 199) : randomInt(state, 170, 188),
      weight: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 76, 92) : randomInt(state, 66, 84),
      clubId: club.id,
      value: 0,
      wage: 0,
      contractYears: randomInt(state, 1, 5),
      morale: randomInt(state, 55, 86),
      fitness: randomInt(state, 78, 100),
      sharpness: Math.round(clamp(45 + seedPlayer.starts * 1.2 + seedPlayer.minutes / 130, 45, 95)),
      form: [],
      trainingFocus: "balanced",
      individualPlan: "normal",
      squadRole: "rotation",
      happiness: {
        lastConcernDay: -999,
        lastContractDay: -999,
        lastPromiseDay: -999
      },
      promises: {},
      potential,
      currentAbility,
      attributes,
      seasonStats: freshPlayerStats(),
      careerTotals: freshPlayerStats(),
      history: [],
      development: [],
      developmentEvents: [],
      transferListed: false,
      loanUntilSeason: null,
      parentClubId: null,
      injury: null,
      suspension: null,
      realWorld: true,
      source: {
        provider: "Fantasy Premier League",
        fplId: seedPlayer.fplId,
        webName: seedPlayer.webName,
        birthDate: seedPlayer.birthDate,
        elementType: seedPlayer.elementType,
        cost: seedPlayer.cost,
        totalPoints: seedPlayer.totalPoints,
        minutes: seedPlayer.minutes,
        starts: seedPlayer.starts,
        goals: seedPlayer.goals,
        assists: seedPlayer.assists,
        cleanSheets: seedPlayer.cleanSheets
      }
    };
    applyFc26Profile(player, seedPlayer);
    player.squadRole = inferSquadRole(player, club, seedPlayer);
    player.value = calculatePlayerValue(player);
    player.wage = calculateWage(player);
    player.development.push(snapshotDevelopment(player, 1));
    return player;
  }

  function calculateSeededAbility(seedPlayer, club) {
    const cost = Number(seedPlayer.cost || 40);
    const points = Number(seedPlayer.totalPoints || 0);
    const starts = Number(seedPlayer.starts || 0);
    const minutes = Number(seedPlayer.minutes || 0);
    const clubLift = (club.reputation || 65) * 0.13;
    const score = 43 + Math.max(0, cost - 35) * 0.32 + Math.min(18, points / 12) + Math.min(7, starts / 5.5) + Math.min(4, minutes / 900) + clubLift;
    return Math.round(clamp(score, 48, 90));
  }

  function calculateSeededPotential(state, seedPlayer, age, currentAbility) {
    const youthLift = age <= 20 ? randomFloat(state, 8, 16) : age <= 23 ? randomFloat(state, 5, 12) : age <= 26 ? randomFloat(state, 2, 7) : randomFloat(state, 0, 4);
    const marketLift = seedPlayer.cost >= 70 ? 2 : seedPlayer.cost >= 55 ? 1 : 0;
    return Math.round(clamp(currentAbility + youthLift + marketLift, currentAbility, 98));
  }

  function biasSeededAttributes(attributes, seedPlayer, position) {
    const goals = Number(seedPlayer.goals || 0);
    const assists = Number(seedPlayer.assists || 0);
    const cleanSheets = Number(seedPlayer.cleanSheets || 0);
    const starts = Number(seedPlayer.starts || 0);
    const threat = Number(seedPlayer.threat || 0);
    const creativity = Number(seedPlayer.creativity || 0);
    const influence = Number(seedPlayer.influence || 0);

    attributes.stamina = Math.round(clamp(attributes.stamina + Math.min(8, starts / 5), 20, 99));
    attributes.workRate = Math.round(clamp(attributes.workRate + Math.min(7, starts / 6), 20, 99));
    attributes.decisions = Math.round(clamp(attributes.decisions + Math.min(5, influence / 160), 20, 99));

    if (["ST", "LW", "RW", "AM"].includes(position)) {
      attributes.finishing = Math.round(clamp(attributes.finishing + Math.min(12, goals * 1.5 + threat / 140), 20, 99));
      attributes.composure = Math.round(clamp(attributes.composure + Math.min(8, goals + influence / 180), 20, 99));
      attributes.dribbling = Math.round(clamp(attributes.dribbling + Math.min(7, threat / 180), 20, 99));
    }

    if (["CM", "AM", "RW", "LW", "DM"].includes(position)) {
      attributes.passing = Math.round(clamp(attributes.passing + Math.min(10, assists * 1.2 + creativity / 180), 20, 99));
      attributes.vision = Math.round(clamp(attributes.vision + Math.min(10, assists + creativity / 150), 20, 99));
      attributes.crossing = Math.round(clamp(attributes.crossing + Math.min(8, assists + creativity / 220), 20, 99));
    }

    if (["GK", "CB", "RB", "LB", "DM"].includes(position)) {
      attributes.positioning = Math.round(clamp(attributes.positioning + Math.min(8, cleanSheets + influence / 220), 20, 99));
      attributes.marking = Math.round(clamp(attributes.marking + Math.min(7, cleanSheets + influence / 260), 20, 99));
      attributes.tackling = Math.round(clamp(attributes.tackling + Math.min(7, cleanSheets + influence / 260), 20, 99));
    }
  }

  function seededPosition(seedPlayer, roleCounts) {
    const roleCycles = {
      1: ["GK"],
      2: ["CB", "RB", "LB", "CB", "RB", "LB", "CB", "CB"],
      3: ["CM", "AM", "RW", "LW", "DM", "CM", "AM", "RW", "LW"],
      4: ["ST"]
    };
    const type = Number(seedPlayer.elementType || 3);
    roleCounts[type] = roleCounts[type] || 0;
    const cycle = roleCycles[type] || roleCycles[3];
    const position = cycle[roleCounts[type] % cycle.length];
    roleCounts[type] += 1;
    return position;
  }

  function seedPlayersByClub() {
    const seed = Data.PREMIER_LEAGUE_SEED;
    if (!seed || !Array.isArray(seed.players)) return null;
    return seed.players.reduce((groups, player) => {
      if (!groups[player.teamId]) groups[player.teamId] = [];
      groups[player.teamId].push(player);
      return groups;
    }, {});
  }

  function freshPlayerStats() {
    return {
      apps: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      starts: 0,
      minutes: 0,
      ratingTotal: 0,
      ratingApps: 0,
      motm: 0,
      yellows: 0,
      reds: 0,
      shots: 0,
      shotsOnTarget: 0,
      xG: 0,
      keyPasses: 0,
      tacklesWon: 0,
      interceptions: 0,
      mistakes: 0,
      injuries: 0
    };
  }

  function snapshotDevelopment(player, season) {
    return {
      season,
      age: player.age,
      currentAbility: player.currentAbility,
      potential: player.potential,
      attributes: {
        passing: player.attributes.passing,
        finishing: player.attributes.finishing,
        pace: player.attributes.pace,
        tackling: player.attributes.tackling,
        decisions: player.attributes.decisions
      },
      value: player.value
    };
  }

  function createNewSave(options) {
    const state = createStateShell(options && options.seed ? options.seed : Date.now() >>> 0);
    const realSeed = Data.PREMIER_LEAGUE_SEED || null;
    const seededPlayers = seedPlayersByClub();
    const selectedTemplateId = options && options.selectedClubId ? options.selectedClubId : Data.CLUB_TEMPLATES[0].id;
    const customName = options && options.customClubName ? options.customClubName.trim() : "";
    const customCity = customName ? customName.split(/\s+/)[0] : "";

    state.manager.name = options && options.managerName ? options.managerName.trim() || state.manager.name : state.manager.name;
    state.league.name = realSeed ? realSeed.leagueName : state.league.name;
    state.league.dataSource = realSeed
      ? {
          name: realSeed.sourceName,
          url: realSeed.sourceUrl,
          asOf: realSeed.asOf,
          teams: realSeed.teams.length,
          players: realSeed.players.length
        }
      : null;

    state.league.clubs = Data.CLUB_TEMPLATES.map((template, index) => {
      const selected = template.id === selectedTemplateId;
      const clubName = selected && customName ? customName : template.name;
      const formation = index % 3 === 0 ? "4-2-3-1" : index % 3 === 1 ? "4-3-3" : "4-4-2";
      const club = {
        id: selected && customName ? `club-${toId(customName) || "custom"}` : template.id,
        sourceTeamId: template.id,
        name: clubName,
        city: selected && customName ? customCity : template.city,
        shortName: template.shortName || clubName.slice(0, 3).toUpperCase(),
        realWorld: !!template.realWorld,
        reputation: template.reputation,
        balance: template.balance,
        transferBudget: template.transferBudget,
        wageBudget: template.wageBudget,
        form: [],
        squad: [],
        lineup: [],
        bench: [],
        formation,
        roleAssignments: defaultRoleAssignments(formation),
        playerInstructions: defaultPlayerInstructions(formation),
        tactics: defaultTactics(index),
        staff: defaultStaffRoom(template, index),
        trainingPlan: "balanced",
        matchPrep: "balanced",
        matchPrepFamiliarity: defaultMatchPrepFamiliarity(),
        trainingReport: null,
        seasonFinance: {
          prizeMoney: 0,
          transferIncome: 0,
          transferSpend: 0,
          wageSpend: 0
        }
      };
      return club;
    });

    const selectedClub = state.league.clubs.find((club) => (customName ? club.id === `club-${toId(customName) || "custom"}` : club.id === selectedTemplateId));
    state.activeClubId = selectedClub ? selectedClub.id : state.league.clubs[0].id;

    state.league.clubs.forEach((club) => {
      const sourcePlayers = seededPlayers && seededPlayers[club.sourceTeamId] ? seededPlayers[club.sourceTeamId] : null;
      if (sourcePlayers) {
        const roleCounts = {};
        sourcePlayers.forEach((seedPlayer, index) => {
          const position = seededPosition(seedPlayer, roleCounts);
          const player = generateSeededPlayer(state, club, seedPlayer, position, index);
          state.players[player.id] = player;
          club.squad.push(player.id);
        });
      } else {
        Data.SQUAD_BLUEPRINT.forEach((position, index) => {
          const player = generatePlayer(state, club, position, index);
          state.players[player.id] = player;
          club.squad.push(player.id);
        });
      }
      club.lineup = autoSelectLineup(state, club.id);
      club.bench = autoSelectBench(state, club.id);
    });

    ensureScoutingState(state);
    ensureAcademyState(state);
    ensureLoanClubsState(state);
    ensureBoardState(state);
    state.league.schedule = generateSchedule(state.league.clubs, state.season, state.calendar.seasonStartDate);
    ensureDomesticCupState(state);
    ensureEuropeState(state);
    refreshTransferMarket(state);
    addInbox(state, "Board", `Welcome to ${getClub(state, state.activeClubId).name}. The board expects a competitive Premier League season and sustainable squad building.`);
    addInbox(state, "Recruitment", "Initial scouting files are incomplete. Scout confidence improves each time you watch a target.");
    addInbox(state, "Academy", "The academy staff have delivered the first development group. Review plans before the season begins.");
    return state;
  }

  function getClub(state, clubId) {
    return (state.league.clubs || []).find((club) => club.id === clubId) ||
      (state.europe && state.europe.clubs ? state.europe.clubs.find((club) => club.id === clubId) : null) ||
      (state.loanClubs || []).find((club) => club.id === clubId) ||
      null;
  }

  function getPlayer(state, playerId) {
    return normalizePlayerState(state.players[playerId] || null);
  }

  function clubPlayers(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return [];
    return club.squad.map((id) => normalizePlayerState(state.players[id])).filter(Boolean);
  }

  function allCompetitionClubs(state) {
    return (state.league.clubs || []).concat(state.europe && state.europe.clubs ? state.europe.clubs : []);
  }

  function roundDateForIndex(startDate, roundIndex) {
    const festivePush = roundIndex >= 17 ? 4 : 0;
    const springPush = roundIndex >= 28 ? 3 : 0;
    return addDays(startDate, roundIndex * 7 + festivePush + springPush);
  }

  function generateSchedule(clubs, season, startDate) {
    const ids = clubs.map((club) => club.id);
    const rotation = ids.slice();
    const rounds = [];
    const roundCount = ids.length - 1;
    const firstDate = startDate || createSeasonCalendar(season).seasonStartDate;

    for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
      const fixtures = [];
      const date = roundDateForIndex(firstDate, roundIndex);
      for (let i = 0; i < ids.length / 2; i += 1) {
        const left = rotation[i];
        const right = rotation[rotation.length - 1 - i];
        const homeFirst = (roundIndex + i) % 2 === 0;
        fixtures.push(makeFixture(season, roundIndex + 1, homeFirst ? left : right, homeFirst ? right : left, date));
      }
      rounds.push({ number: roundIndex + 1, date, fixtures });
      rotation.splice(1, 0, rotation.pop());
    }

    const secondHalf = rounds.map((round, index) => {
      const number = round.number + roundCount;
      const date = roundDateForIndex(firstDate, index + roundCount);
      return {
        number,
        date,
        fixtures: round.fixtures.map((fixture) => makeFixture(season, number, fixture.awayClubId, fixture.homeClubId, date))
      };
    });

    return rounds.concat(secondHalf);
  }

  function makeFixture(season, round, homeClubId, awayClubId, date) {
    return {
      id: `s${season}-r${round}-${homeClubId}-${awayClubId}`,
      season,
      round,
      date,
      homeClubId,
      awayClubId,
      played: false,
      homeGoals: null,
      awayGoals: null,
      stats: null,
      commentary: [],
      playerRatings: [],
      goals: [],
      substitutions: [],
      manOfMatch: null
    };
  }

  function autoSelectLineup(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return [];
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    normalizeRoleAssignments(club);
    const players = clubPlayers(state, clubId).filter((player) => player.fitness > 18 && !isUnavailable(state, player));
    const selected = [];
    formation.forEach((slot, index) => {
      const roleKey = club.roleAssignments[String(index)] || defaultRoleForSlot(slot);
      const available = players.filter((player) => !selected.includes(player.id));
      const exact = available
        .filter((player) => player.position === slot || player.secondaryPositions.includes(slot))
        .sort((a, b) => playerPositionScore(b, slot, roleKey) - playerPositionScore(a, slot, roleKey));
      const fallback = available.sort((a, b) => playerPositionScore(b, slot, roleKey) - playerPositionScore(a, slot, roleKey));
      const player = exact[0] || fallback[0];
      if (player) selected.push(player.id);
    });
    return selected.slice(0, 11);
  }

  function playerPositionScore(player, slot, roleKey) {
    const match = player.position === slot ? 8 : player.secondaryPositions.includes(slot) ? 3 : 0;
    const roleFit = roleKey ? playerRoleFit(player, roleKey, slot) : 62;
    return player.currentAbility + match + (roleFit - 62) * 0.12 + player.fitness * 0.08 + player.sharpness * 0.04 + player.morale * 0.03;
  }

  function ensureLineup(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return [];
    const squadIds = new Set(club.squad);
    const valid = (club.lineup || []).filter((id) => squadIds.has(id) && state.players[id] && !isUnavailable(state, state.players[id]));
    if (valid.length !== 11) {
      club.lineup = autoSelectLineup(state, clubId);
    } else {
      club.lineup = valid;
    }
    return club.lineup;
  }

  function autoSelectBench(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return [];
    const lineupIds = new Set((club.lineup && club.lineup.length === 11 ? club.lineup : autoSelectLineup(state, clubId)).slice(0, 11));
    const candidates = clubPlayers(state, clubId)
      .filter((player) => !lineupIds.has(player.id) && player.fitness > 18 && !isUnavailable(state, player));
    const selected = [];

    function takeBest(predicate, slot) {
      if (selected.length >= BENCH_SIZE) return;
      const existing = new Set(selected);
      const player = candidates
        .filter((candidate) => !existing.has(candidate.id) && predicate(candidate))
        .sort((a, b) => playerPositionScore(b, slot || b.position) - playerPositionScore(a, slot || a.position))[0];
      if (player) selected.push(player.id);
    }

    takeBest((player) => player.position === "GK", "GK");
    takeBest((player) => ["CB", "RB", "LB"].includes(player.position), "CB");
    takeBest((player) => ["RB", "LB", "CB"].includes(player.position), "RB");
    takeBest((player) => ["DM", "CM"].includes(player.position), "CM");
    takeBest((player) => ["AM", "RW", "LW", "CM"].includes(player.position), "AM");
    takeBest((player) => ["RW", "LW", "ST"].includes(player.position), "RW");
    takeBest((player) => player.position === "ST" || (player.secondaryPositions || []).includes("ST"), "ST");

    candidates
      .filter((player) => !selected.includes(player.id))
      .sort((a, b) => playerPositionScore(b, b.position) - playerPositionScore(a, a.position))
      .forEach((player) => {
        if (selected.length < BENCH_SIZE) selected.push(player.id);
      });

    return selected.slice(0, BENCH_SIZE);
  }

  function ensureBench(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return [];
    const squadIds = new Set(club.squad || []);
    const lineupIds = new Set(ensureLineup(state, clubId));
    const valid = (club.bench || []).filter((id, index, source) => {
      const player = state.players[id];
      return (
        source.indexOf(id) === index &&
        squadIds.has(id) &&
        player &&
        !lineupIds.has(id) &&
        !isUnavailable(state, player)
      );
    });
    const autoBench = autoSelectBench(state, clubId);
    autoBench.forEach((id) => {
      if (valid.length < BENCH_SIZE && !valid.includes(id) && !lineupIds.has(id)) valid.push(id);
    });
    club.bench = valid.slice(0, BENCH_SIZE);
    return club.bench;
  }

  function repairMatchdaySquad(state, clubId) {
    ensureLineup(state, clubId);
    ensureBench(state, clubId);
  }

  function setLineup(state, clubId, playerIds) {
    const club = getClub(state, clubId);
    if (!club) return { ok: false, message: "Club not found." };
    const squadIds = new Set(club.squad);
    const unique = Array.from(new Set(playerIds)).filter((id) => squadIds.has(id) && state.players[id] && !isUnavailable(state, state.players[id]));
    if (unique.length !== 11) {
      return { ok: false, message: "Select exactly 11 players." };
    }
    normalizeRoleAssignments(club);
    club.lineup = unique;
    club.bench = ensureBench(state, clubId);
    return { ok: true, message: "Lineup saved." };
  }

  function setBench(state, clubId, playerIds) {
    const club = getClub(state, clubId);
    if (!club) return { ok: false, message: "Club not found." };
    const squadIds = new Set(club.squad || []);
    const lineupIds = new Set(ensureLineup(state, clubId));
    const unique = Array.from(new Set(playerIds)).filter((id) => {
      const player = state.players[id];
      return squadIds.has(id) && player && !lineupIds.has(id) && !isUnavailable(state, player);
    });
    club.bench = unique.slice(0, BENCH_SIZE);
    return { ok: true, message: "Bench saved." };
  }

  function setFormation(state, clubId, formation) {
    const club = getClub(state, clubId);
    if (!club || !Data.FORMATIONS[formation]) return;
    club.formation = formation;
    club.roleAssignments = defaultRoleAssignments(formation);
    club.playerInstructions = defaultPlayerInstructions(formation);
    club.lineup = autoSelectLineup(state, clubId);
    club.bench = autoSelectBench(state, clubId);
  }

  function tacticGroup(key) {
    return (Data.TACTIC_GROUPS || []).find((group) => group.key === key) || null;
  }

  function tacticOption(group, value) {
    return group && group.options ? group.options.find((option) => option.value === value) : null;
  }

  function normalizeTactics(tactics) {
    const normalized = { ...DEFAULT_TACTICS, ...(tactics || {}) };
    (Data.TACTIC_GROUPS || []).forEach((group) => {
      if (!tacticOption(group, normalized[group.key])) {
        normalized[group.key] = DEFAULT_TACTICS[group.key] || (group.options[0] && group.options[0].value);
      }
    });
    return normalized;
  }

  function defaultTactics(index) {
    const variants = [
      {},
      { mentality: "positive", pressing: "high", line: "high" },
      { mentality: "cautious", pressing: "regroup", line: "deep", focus: "counter" },
      { tempo: "patient", width: "narrow", focus: "central" },
      { tempo: "direct", width: "wide", focus: "flanks" }
    ];
    return normalizeTactics(variants[index % variants.length]);
  }

  function staffDepartmentKeys() {
    return Object.keys(STAFF_DEPARTMENTS);
  }

  function staffDepartmentLabel(key) {
    return STAFF_DEPARTMENTS[key] ? STAFF_DEPARTMENTS[key].label : key || "-";
  }

  function defaultStaffLevel(club, index, key) {
    const reputation = club && Number.isFinite(club.reputation) ? club.reputation : 70;
    const base = reputation >= 88 ? 5 : reputation >= 80 ? 4 : reputation >= 70 ? 3 : 2;
    const bias = { assistant: 0, coaching: 0, medical: 0, analysis: -1, scouting: -1 }[key] || 0;
    const rhythm = ((index || 0) + staffDepartmentKeys().indexOf(key)) % 5 === 0 ? 1 : 0;
    return Math.round(clamp(base + bias + rhythm, 1, 5));
  }

  function defaultStaffName(key, level) {
    const tier = ["Local", "League", "Senior", "Elite", "World-Class"][Math.round(clamp(level, 1, 5)) - 1];
    return `${tier} ${staffDepartmentLabel(key)}`;
  }

  function defaultStaffRoom(club, index) {
    return staffDepartmentKeys().reduce((staff, key) => {
      const level = defaultStaffLevel(club, index, key);
      staff[key] = {
        level,
        name: defaultStaffName(key, level)
      };
      return staff;
    }, {});
  }

  function normalizeStaffRoom(club, index) {
    if (!club) return null;
    const current = club.staff || {};
    const normalized = {};
    staffDepartmentKeys().forEach((key) => {
      const existing = current[key] || {};
      const level = Math.round(clamp(Number(existing.level) || defaultStaffLevel(club, index, key), 1, 5));
      normalized[key] = {
        ...existing,
        level,
        name: existing.name || defaultStaffName(key, level)
      };
    });
    club.staff = normalized;
    return club.staff;
  }

  function staffDepartmentLevel(state, clubId, key) {
    const club = getClub(state, clubId);
    if (!club || !STAFF_DEPARTMENTS[key]) return 3;
    normalizeStaffRoom(club, 0);
    return club.staff[key].level;
  }

  function staffEffectsForClub(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) {
      return {
        coachingGrowthMultiplier: 1,
        sharpnessBonus: 0,
        recoveryBonus: 0,
        injuryRiskMultiplier: 1,
        familiarityMultiplier: 1,
        scoutingDaysMultiplier: 1,
        scoutingConfidenceBonus: 0,
        assistantInsight: 0
      };
    }
    normalizeStaffRoom(club, 0);
    const coaching = club.staff.coaching.level - 3;
    const medical = club.staff.medical.level - 3;
    const analysis = club.staff.analysis.level - 3;
    const scouting = club.staff.scouting.level - 3;
    const assistant = club.staff.assistant.level - 3;
    return {
      coachingGrowthMultiplier: round(clamp(1 + coaching * 0.045, 0.9, 1.12), 3),
      sharpnessBonus: round(coaching * 0.16, 2),
      recoveryBonus: round(medical * 0.22, 2),
      injuryRiskMultiplier: round(clamp(1 - medical * 0.055, 0.82, 1.12), 3),
      familiarityMultiplier: round(clamp(1 + analysis * 0.065, 0.9, 1.15), 3),
      scoutingDaysMultiplier: round(clamp(1 - scouting * 0.055, 0.84, 1.12), 3),
      scoutingConfidenceBonus: Math.round(clamp(scouting * 3, -5, 7)),
      assistantInsight: Math.round(clamp(assistant * 5, -8, 10))
    };
  }

  function staffUpgradeCost(club, key) {
    const department = STAFF_DEPARTMENTS[key];
    if (!club || !department) return 0;
    normalizeStaffRoom(club, 0);
    const level = club.staff[key].level;
    if (level >= 5) return 0;
    const reputationMultiplier = 0.86 + (club.reputation || 70) / 260;
    return moneyRound(department.baseCost * (0.72 + level * 0.42) * reputationMultiplier);
  }

  function staffEffectSummary(key, effects) {
    if (key === "coaching") {
      const growth = Math.round((effects.coachingGrowthMultiplier - 1) * 100);
      return `${growth >= 0 ? "+" : ""}${growth}% growth, ${effects.sharpnessBonus >= 0 ? "+" : ""}${effects.sharpnessBonus} sharpness`;
    }
    if (key === "medical") {
      const risk = Math.round((1 - effects.injuryRiskMultiplier) * 100);
      return `${risk >= 0 ? "-" : "+"}${Math.abs(risk)}% injury risk, ${effects.recoveryBonus >= 0 ? "+" : ""}${effects.recoveryBonus} recovery`;
    }
    if (key === "analysis") {
      const familiarity = Math.round((effects.familiarityMultiplier - 1) * 100);
      return `${familiarity >= 0 ? "+" : ""}${familiarity}% prep familiarity`;
    }
    if (key === "scouting") {
      const speed = Math.round((1 - effects.scoutingDaysMultiplier) * 100);
      return `${speed >= 0 ? "-" : "+"}${Math.abs(speed)}% assignment days, ${effects.scoutingConfidenceBonus >= 0 ? "+" : ""}${effects.scoutingConfidenceBonus} confidence`;
    }
    return `${effects.assistantInsight >= 0 ? "+" : ""}${effects.assistantInsight} staff insight`;
  }

  function staffRoomReport(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return null;
    normalizeStaffRoom(club, 0);
    const effects = staffEffectsForClub(state, clubId);
    const departments = staffDepartmentKeys().map((key) => {
      const info = STAFF_DEPARTMENTS[key];
      const staff = club.staff[key];
      return {
        key,
        label: info.label,
        description: info.description,
        level: staff.level,
        name: staff.name,
        maxed: staff.level >= 5,
        upgradeCost: staffUpgradeCost(club, key),
        weeklyCost: Math.round(info.weeklyCost * (0.62 + staff.level * 0.24)),
        effect: staffEffectSummary(key, effects)
      };
    });
    const recommendations = [];
    if (club.staff.medical.level <= 2) recommendations.push({ tone: "amber", title: "Medical Capacity", body: "Upgrade medical support to protect fitness through congested weeks." });
    if (club.staff.analysis.level <= 2) recommendations.push({ tone: "blue", title: "Analysis Detail", body: "A stronger analysis unit helps match prep familiarity and role reporting." });
    if (club.staff.coaching.level <= 2) recommendations.push({ tone: "amber", title: "Training Quality", body: "Coaching upgrades improve growth and session sharpness over time." });
    if (club.staff.scouting.level <= 2) recommendations.push({ tone: "blue", title: "Scouting Speed", body: "Scouting upgrades shorten assignments and improve report confidence." });
    if (!recommendations.length) recommendations.push({ tone: "green", title: "Staff Room", body: "Department balance is strong. Target upgrades where your save strategy needs it most." });
    return {
      averageLevel: round(average(departments.map((department) => department.level)), 1),
      weeklyCost: departments.reduce((total, department) => total + department.weeklyCost, 0),
      departments,
      effects,
      recommendations
    };
  }

  function upgradeStaffDepartment(state, clubId, key) {
    const club = getClub(state, clubId);
    if (!club || !STAFF_DEPARTMENTS[key]) return { ok: false, message: "Staff department unavailable." };
    normalizeStaffRoom(club, 0);
    if (club.staff[key].level >= 5) return { ok: false, message: `${staffDepartmentLabel(key)} is already world-class.` };
    const cost = staffUpgradeCost(club, key);
    const staff = club.staff[key];
    if (club.balance < cost) return { ok: false, message: `Balance is too low. Upgrade costs ${formatMoney(cost)}.` };
    club.balance = Math.max(0, club.balance - cost);
    club.seasonFinance = club.seasonFinance || {};
    club.seasonFinance.staffSpend = (club.seasonFinance.staffSpend || 0) + cost;
    staff.level += 1;
    staff.name = defaultStaffName(key, staff.level);
    if (club.id === state.activeClubId) {
      addInbox(state, "Staff Upgrade", `${staffDepartmentLabel(key)} upgraded to level ${staff.level} for ${formatMoney(cost)}.`);
    }
    return { ok: true, message: `${staffDepartmentLabel(key)} upgraded to level ${staff.level}.` };
  }

  function defaultRoleForSlot(position) {
    const defaults = {
      GK: "goalkeeper",
      RB: "fullBack",
      LB: "fullBack",
      CB: "centreBack",
      DM: "anchor",
      CM: "boxToBox",
      AM: "advancedPlaymaker",
      RW: "winger",
      LW: "winger",
      ST: "advancedForward"
    };
    return defaults[position] || "boxToBox";
  }

  function tacticalRoleLabel(roleKey) {
    return TACTICAL_ROLES[roleKey] ? TACTICAL_ROLES[roleKey].label : roleKey || "-";
  }

  function playerInstructionLabel(instructionKey) {
    return PLAYER_INSTRUCTIONS[instructionKey] ? PLAYER_INSTRUCTIONS[instructionKey].label : PLAYER_INSTRUCTIONS.balanced.label;
  }

  function isRoleValidForPosition(roleKey, position) {
    const role = TACTICAL_ROLES[roleKey];
    return !!(role && role.positions.includes(position));
  }

  function roleOptionsForPosition(position) {
    return Object.keys(TACTICAL_ROLES)
      .filter((key) => isRoleValidForPosition(key, position))
      .map((key) => ({ key, ...TACTICAL_ROLES[key] }));
  }

  function isInstructionValidForPosition(instructionKey, position) {
    const instruction = PLAYER_INSTRUCTIONS[instructionKey];
    return !!(instruction && (instruction.positions.includes("*") || instruction.positions.includes(position) || instruction.positions.includes(positionBand(position))));
  }

  function instructionOptionsForPosition(position) {
    return Object.keys(PLAYER_INSTRUCTIONS)
      .filter((key) => isInstructionValidForPosition(key, position))
      .map((key) => ({ key, ...PLAYER_INSTRUCTIONS[key] }));
  }

  function defaultRoleAssignments(formation) {
    const slots = Data.FORMATIONS[formation] || Data.FORMATIONS["4-3-3"];
    return slots.reduce((assignments, position, index) => {
      assignments[String(index)] = defaultRoleForSlot(position);
      return assignments;
    }, {});
  }

  function defaultInstructionForSlot(position) {
    return "balanced";
  }

  function defaultPlayerInstructions(formation) {
    const slots = Data.FORMATIONS[formation] || Data.FORMATIONS["4-3-3"];
    return slots.reduce((assignments, position, index) => {
      assignments[String(index)] = defaultInstructionForSlot(position);
      return assignments;
    }, {});
  }

  function normalizeRoleAssignments(club) {
    if (!club) return {};
    const slots = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const current = club.roleAssignments || {};
    const normalized = {};
    slots.forEach((position, index) => {
      const existing = current[String(index)];
      normalized[String(index)] = isRoleValidForPosition(existing, position) ? existing : defaultRoleForSlot(position);
    });
    club.roleAssignments = normalized;
    return club.roleAssignments;
  }

  function normalizePlayerInstructions(club) {
    if (!club) return {};
    const slots = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const current = club.playerInstructions || {};
    const normalized = {};
    slots.forEach((position, index) => {
      const existing = current[String(index)];
      normalized[String(index)] = isInstructionValidForPosition(existing, position) ? existing : defaultInstructionForSlot(position);
    });
    club.playerInstructions = normalized;
    return club.playerInstructions;
  }

  function averageRoleAttributes(player, role) {
    const values = (role.attributes || []).map((key) => player.attributes && Number(player.attributes[key])).filter(Number.isFinite);
    return values.length ? average(values) : player.currentAbility || 50;
  }

  function normalizeRoleDevelopment(player) {
    player.roleDevelopment = player.roleDevelopment || {};
    player.roleDevelopment.roles = player.roleDevelopment.roles || {};
    player.roleDevelopment.instructions = player.roleDevelopment.instructions || {};
    player.roleDevelopment.events = Array.isArray(player.roleDevelopment.events) ? player.roleDevelopment.events : [];
    player.roleDevelopment.lastAdviceDay = Number.isFinite(player.roleDevelopment.lastAdviceDay) ? player.roleDevelopment.lastAdviceDay : -999;
    return player.roleDevelopment;
  }

  function developmentEntry(container, key, baseline) {
    container[key] = container[key] || {
      mastery: baseline,
      sessions: 0,
      matches: 0,
      lastMilestone: Math.floor(baseline / 20) * 20
    };
    container[key].mastery = round(clamp(container[key].mastery, 1, 100), 1);
    container[key].sessions = container[key].sessions || 0;
    container[key].matches = container[key].matches || 0;
    container[key].lastMilestone = container[key].lastMilestone || Math.floor(container[key].mastery / 20) * 20;
    return container[key];
  }

  function roleMastery(player, roleKey) {
    if (!player || !roleKey) return 50;
    normalizeRoleDevelopment(player);
    const baseline = round(clamp(34 + (player.currentAbility || 58) * 0.24 + (player.age <= 21 ? 5 : 0), 28, 72), 1);
    return developmentEntry(player.roleDevelopment.roles, roleKey, baseline).mastery;
  }

  function instructionMastery(player, instructionKey) {
    if (!player || !instructionKey) return 50;
    normalizeRoleDevelopment(player);
    const baseline = instructionKey === "balanced" ? 74 : round(clamp(32 + (player.currentAbility || 58) * 0.2 + (player.age <= 21 ? 4 : 0), 24, 66), 1);
    return developmentEntry(player.roleDevelopment.instructions, instructionKey, baseline).mastery;
  }

  function playerRoleFit(player, roleKey, slot) {
    const role = TACTICAL_ROLES[roleKey];
    if (!player || !role) return 0;
    const direct = role.positions.includes(player.position);
    const secondary = (player.secondaryPositions || []).some((position) => role.positions.includes(position));
    const bandFit = role.positions.some((position) => positionBand(position) === positionBand(player.position));
    const slotBonus = slot ? -slotPenalty(player, slot) * 1.4 : 0;
    const positionBonus = direct ? 8 : secondary ? 3 : bandFit ? -4 : player.position === "GK" || role.positions.includes("GK") ? -28 : -12;
    const profile = averageRoleAttributes(player, role);
    const availability = player.fitness * 0.035 + player.sharpness * 0.035 + player.morale * 0.015;
    const mastery = roleMastery(player, roleKey);
    return Math.round(clamp(profile + positionBonus + slotBonus + availability + (mastery - 50) * 0.12 - 5, 1, 100));
  }

  function playerInstructionFit(player, instructionKey, slot, roleKey) {
    const instruction = PLAYER_INSTRUCTIONS[instructionKey] || PLAYER_INSTRUCTIONS.balanced;
    if (!player || !instruction) return 0;
    if (!isInstructionValidForPosition(instructionKey, slot || player.position)) return 0;
    const values = (instruction.attributes || []).map((key) => player.attributes && Number(player.attributes[key])).filter(Number.isFinite);
    const profile = values.length ? average(values) : player.currentAbility || 58;
    const mastery = instructionMastery(player, instructionKey);
    const roleFit = roleKey ? playerRoleFit(player, roleKey, slot || player.position) : 62;
    const workloadFit = instruction.load > 0 ? averageExisting(player.attributes || {}, ["stamina", "workRate", "naturalFitness"], 58) : 64;
    const riskControl = instruction.risk > 0 ? averageExisting(player.attributes || {}, ["decisions", "composure", "concentration"], 58) : 64;
    return Math.round(clamp(profile * 0.46 + mastery * 0.22 + roleFit * 0.18 + workloadFit * 0.08 + riskControl * 0.06, 1, 100));
  }

  function instructionEffectScale(player, instructionKey, slot, roleKey) {
    const instruction = PLAYER_INSTRUCTIONS[instructionKey] || PLAYER_INSTRUCTIONS.balanced;
    if (!player || instructionKey === "balanced") return 0;
    const fit = playerInstructionFit(player, instructionKey, slot, roleKey);
    const mastery = instructionMastery(player, instructionKey);
    return clamp(0.24 + fit / 135 + mastery / 210 - (instruction.difficulty || 1) * 0.08, fit < 45 ? 0.08 : 0.28, 1.25);
  }

  function instructionPhaseBonus(player, instructionKey, phase, slot, roleKey) {
    const instruction = PLAYER_INSTRUCTIONS[instructionKey] || PLAYER_INSTRUCTIONS.balanced;
    if (!instruction || !instruction.phases || !instruction.phases[phase]) return 0;
    return instruction.phases[phase] * instructionEffectScale(player, instructionKey, slot, roleKey);
  }

  function instructionMatchPhaseModifiers(player, instructionKey, slot, roleKey) {
    const instruction = PLAYER_INSTRUCTIONS[instructionKey] || PLAYER_INSTRUCTIONS.balanced;
    const scale = instructionEffectScale(player, instructionKey, slot, roleKey);
    const modifiers = {};
    Object.entries(instruction.matchPhases || {}).forEach(([phase, value]) => {
      modifiers[phase] = round(value * scale, 2);
    });
    return modifiers;
  }

  function instructionLoadModifier(player, instructionKey, slot, roleKey) {
    const instruction = PLAYER_INSTRUCTIONS[instructionKey] || PLAYER_INSTRUCTIONS.balanced;
    if (!instruction || instructionKey === "balanced") return 0;
    return round(instruction.load * instructionEffectScale(player, instructionKey, slot, roleKey), 3);
  }

  function instructionExecutionLift(player, instructionKey, slot, roleKey) {
    const instruction = PLAYER_INSTRUCTIONS[instructionKey] || PLAYER_INSTRUCTIONS.balanced;
    if (!player || !instruction || instructionKey === "balanced") return 0;
    const fit = playerInstructionFit(player, instructionKey, slot, roleKey);
    const mastery = instructionMastery(player, instructionKey);
    const riskPenalty = Math.max(0, instruction.risk || 0) * 0.35;
    const loadPenalty = Math.max(0, instruction.load || 0) * 0.45;
    const conservationLift = instruction.load < 0 ? 0.08 : 0;
    return round(clamp((fit - 62) * 0.018 + (mastery - 50) * 0.012 + conservationLift - riskPenalty - loadPenalty, -1.4, 1.2), 3);
  }

  function roleFitTone(fit) {
    if (fit >= 78) return "green";
    if (fit >= 64) return "blue";
    if (fit >= 50) return "amber";
    return "red";
  }

  function rolePhaseBonus(player, roleKey, phase, slot) {
    const role = TACTICAL_ROLES[roleKey];
    if (!role || !role.phases || !role.phases[phase]) return 0;
    const fit = playerRoleFit(player, roleKey, slot);
    return role.phases[phase] * clamp(0.45 + fit / 85, 0.35, 1.55);
  }

  function bestTacticalRoleForPlayer(player, position) {
    const options = roleOptionsForPosition(position);
    if (!options.length) return defaultRoleForSlot(position);
    return options
      .slice()
      .sort((a, b) => playerRoleFit(player, b.key, position) - playerRoleFit(player, a.key, position))[0].key;
  }

  function roleFitForSlot(state, club, slotIndex) {
    if (!club) return null;
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const position = formation[slotIndex];
    if (!position) return null;
    normalizeRoleAssignments(club);
    normalizePlayerInstructions(club);
    const lineup = ensureLineup(state, club.id);
    const player = state.players[lineup[slotIndex]];
    const roleKey = club.roleAssignments[String(slotIndex)] || defaultRoleForSlot(position);
    const instructionKey = club.playerInstructions[String(slotIndex)] || defaultInstructionForSlot(position);
    const role = TACTICAL_ROLES[roleKey] || TACTICAL_ROLES[defaultRoleForSlot(position)];
    const fit = player ? playerRoleFit(player, roleKey, position) : 0;
    const instructionFit = player ? playerInstructionFit(player, instructionKey, position, roleKey) : 0;
    return {
      slotIndex,
      position,
      roleKey,
      roleLabel: role.label,
      description: role.description,
      instructionKey,
      instructionLabel: playerInstructionLabel(instructionKey),
      instructionDescription: PLAYER_INSTRUCTIONS[instructionKey] ? PLAYER_INSTRUCTIONS[instructionKey].description : "",
      playerId: player ? player.id : null,
      playerName: player ? playerDisplayName(player) : "Empty",
      fit,
      tone: roleFitTone(fit),
      instructionFit,
      instructionTone: roleFitTone(instructionFit),
      roleMastery: player ? roleMastery(player, roleKey) : 0,
      instructionMastery: player ? instructionMastery(player, instructionKey) : 0,
      instructionLoad: player ? instructionLoadModifier(player, instructionKey, position, roleKey) : 0,
      instructionModifiers: player ? instructionMatchPhaseModifiers(player, instructionKey, position, roleKey) : {},
      options: roleOptionsForPosition(position),
      instructionOptions: instructionOptionsForPosition(position)
    };
  }

  function tacticalRoleReport(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return null;
    normalizeRoleAssignments(club);
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const slots = formation.map((_, index) => roleFitForSlot(state, club, index)).filter(Boolean);
    const weakFits = slots.filter((slot) => slot.fit < 58);
    const instructionWarnings = slots.filter((slot) => slot.instructionKey !== "balanced" && slot.instructionFit < 58);
    const phaseBias = slots.reduce((bias, slot) => {
      const role = TACTICAL_ROLES[slot.roleKey];
      Object.entries(role && role.phases ? role.phases : {}).forEach(([phase, value]) => {
        bias[phase] = round((bias[phase] || 0) + value, 2);
      });
      Object.entries(slot.instructionModifiers || {}).forEach(([phase, value]) => {
        bias[phase] = round((bias[phase] || 0) + value, 2);
      });
      return bias;
    }, {});
    return {
      formation: club.formation,
      averageFit: round(average(slots.map((slot) => slot.fit)), 1),
      averageInstructionFit: round(average(slots.map((slot) => slot.instructionFit || 0)), 1),
      weakFits,
      instructionWarnings,
      slots,
      phaseBias
    };
  }

  function setTacticalRole(state, clubId, slotIndex, roleKey) {
    const club = getClub(state, clubId);
    const index = Number(slotIndex);
    if (!club || !Number.isInteger(index)) return { ok: false, message: "Tactical slot unavailable." };
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const position = formation[index];
    if (!position || !isRoleValidForPosition(roleKey, position)) {
      return { ok: false, message: "Role does not fit this position." };
    }
    normalizeRoleAssignments(club);
    club.roleAssignments[String(index)] = roleKey;
    return { ok: true, message: `${position} role set to ${tacticalRoleLabel(roleKey)}.` };
  }

  function setPlayerInstruction(state, clubId, slotIndex, instructionKey) {
    const club = getClub(state, clubId);
    const index = Number(slotIndex);
    if (!club || !Number.isInteger(index)) return { ok: false, message: "Instruction slot unavailable." };
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const position = formation[index];
    if (!position || !isInstructionValidForPosition(instructionKey, position)) {
      return { ok: false, message: "Instruction does not fit this position." };
    }
    normalizePlayerInstructions(club);
    club.playerInstructions[String(index)] = instructionKey;
    return { ok: true, message: `${position} instruction set to ${playerInstructionLabel(instructionKey)}.` };
  }

  function playerRoleSlotContext(state, playerId, clubId) {
    const club = getClub(state, clubId || (state.players[playerId] && state.players[playerId].clubId));
    if (!club) return null;
    normalizeRoleAssignments(club);
    normalizePlayerInstructions(club);
    const lineup = ensureLineup(state, club.id);
    const slotIndex = lineup.indexOf(playerId);
    if (slotIndex < 0) return null;
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const position = formation[slotIndex];
    const roleKey = club.roleAssignments[String(slotIndex)] || defaultRoleForSlot(position);
    const instructionKey = club.playerInstructions[String(slotIndex)] || defaultInstructionForSlot(position);
    return {
      club,
      slotIndex,
      position,
      roleKey,
      instructionKey
    };
  }

  function improveMasteryEntry(state, player, group, key, amount, source, label) {
    normalizeRoleDevelopment(player);
    const container = group === "role" ? player.roleDevelopment.roles : player.roleDevelopment.instructions;
    const baseline = group === "role"
      ? round(clamp(34 + (player.currentAbility || 58) * 0.24 + (player.age <= 21 ? 5 : 0), 28, 72), 1)
      : key === "balanced" ? 74 : round(clamp(32 + (player.currentAbility || 58) * 0.2 + (player.age <= 21 ? 4 : 0), 24, 66), 1);
    const entry = developmentEntry(container, key, baseline);
    const before = entry.mastery;
    const ageFactor = player.age <= 21 ? 1.18 : player.age <= 25 ? 1.05 : player.age >= 31 ? 0.78 : 0.95;
    const ceilingFactor = clamp((103 - before) / 55, 0.18, 1.15);
    entry.mastery = round(clamp(before + amount * ageFactor * ceilingFactor, 1, 100), 1);
    if (source === "match") entry.matches += 1;
    else entry.sessions += 1;
    const beforeBand = Math.floor(before / 20) * 20;
    const afterBand = Math.floor(entry.mastery / 20) * 20;
    if (afterBand > beforeBand && entry.mastery >= 60 && afterBand > (entry.lastMilestone || 0)) {
      entry.lastMilestone = afterBand;
      const event = {
        date: state.calendar ? state.calendar.currentDate : null,
        type: "role-milestone",
        source,
        group,
        key,
        label,
        mastery: entry.mastery
      };
      player.roleDevelopment.events.unshift(event);
      player.roleDevelopment.events = player.roleDevelopment.events.slice(0, 12);
      return event;
    }
    return null;
  }

  function improveRoleDevelopment(state, player, context, amount, source) {
    if (!player || !context) return null;
    const roleEvent = improveMasteryEntry(state, player, "role", context.roleKey, amount, source, tacticalRoleLabel(context.roleKey));
    const instructionEvent = improveMasteryEntry(state, player, "instruction", context.instructionKey, amount * 0.88, source, playerInstructionLabel(context.instructionKey));
    return roleEvent || instructionEvent;
  }

  function roleDevelopmentReport(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player) return null;
    normalizeRoleDevelopment(player);
    const context = playerRoleSlotContext(state, player.id, player.clubId) || null;
    const roles = Object.entries(player.roleDevelopment.roles || {}).map(([key, entry]) => ({
      key,
      label: tacticalRoleLabel(key),
      mastery: round(entry.mastery || 0, 1),
      matches: entry.matches || 0,
      sessions: entry.sessions || 0
    })).sort((a, b) => b.mastery - a.mastery);
    const instructions = Object.entries(player.roleDevelopment.instructions || {}).map(([key, entry]) => ({
      key,
      label: playerInstructionLabel(key),
      mastery: round(entry.mastery || 0, 1),
      matches: entry.matches || 0,
      sessions: entry.sessions || 0
    })).sort((a, b) => b.mastery - a.mastery);
    const current = context ? {
      ...context,
      roleLabel: tacticalRoleLabel(context.roleKey),
      instructionLabel: playerInstructionLabel(context.instructionKey),
      roleFit: playerRoleFit(player, context.roleKey, context.position),
      instructionFit: playerInstructionFit(player, context.instructionKey, context.position, context.roleKey),
      roleMastery: roleMastery(player, context.roleKey),
      instructionMastery: instructionMastery(player, context.instructionKey)
    } : null;
    return {
      playerId: player.id,
      current,
      roles,
      instructions,
      events: player.roleDevelopment.events || []
    };
  }

  function autoSetTacticalRoles(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return { ok: false, message: "Club not found." };
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    const lineup = ensureLineup(state, clubId);
    const assignments = {};
    formation.forEach((position, index) => {
      const player = state.players[lineup[index]];
      assignments[String(index)] = player ? bestTacticalRoleForPlayer(player, position) : defaultRoleForSlot(position);
    });
    club.roleAssignments = assignments;
    return { ok: true, message: "Tactical roles matched to the current XI." };
  }

  function defaultMatchPrepFamiliarity() {
    return Object.keys(MATCH_PREP).reduce((result, key) => {
      result[key] = key === "balanced" ? 28 : 12;
      return result;
    }, {});
  }

  function trainingPlanLabel(plan) {
    return TRAINING_PLANS[plan] ? TRAINING_PLANS[plan].label : TRAINING_PLANS.balanced.label;
  }

  function matchPrepLabel(prep) {
    return MATCH_PREP[prep] ? MATCH_PREP[prep].label : MATCH_PREP.balanced.label;
  }

  function individualPlanLabel(plan) {
    return INDIVIDUAL_PLANS[plan] ? INDIVIDUAL_PLANS[plan].label : INDIVIDUAL_PLANS.normal.label;
  }

  function normalizePlayerState(player) {
    if (!player) return null;
    player.trainingFocus = TRAINING_FOCUS[player.trainingFocus] ? player.trainingFocus : "balanced";
    player.individualPlan = INDIVIDUAL_PLANS[player.individualPlan] ? player.individualPlan : "normal";
    player.developmentEvents = Array.isArray(player.developmentEvents) ? player.developmentEvents : [];
    player.suspension = player.suspension || null;
    player.form = Array.isArray(player.form) ? player.form : [];
    player.secondaryPositions = Array.isArray(player.secondaryPositions) ? player.secondaryPositions : [];
    player.displayName = player.displayName || footballDisplayName(player.name);
    player.squadRole = SQUAD_ROLES[player.squadRole] ? player.squadRole : inferSquadRole(player, null, player.source);
    player.happiness = {
      lastConcernDay: -999,
      lastContractDay: -999,
      lastPromiseDay: -999,
      ...(player.happiness || {})
    };
    player.promises = player.promises || {};
    player.loanDevelopment = player.loanDevelopment || null;
    normalizeRoleDevelopment(player);
    return player;
  }

  function normalizeTrainingSetup(club) {
    if (!club) return null;
    club.trainingPlan = TRAINING_PLANS[club.trainingPlan] ? club.trainingPlan : "balanced";
    club.matchPrep = MATCH_PREP[club.matchPrep] ? club.matchPrep : "balanced";
    club.matchPrepFamiliarity = { ...defaultMatchPrepFamiliarity(), ...(club.matchPrepFamiliarity || {}) };
    club.trainingReport = club.trainingReport || null;
    return club;
  }

  function setTrainingPlan(state, clubId, plan) {
    const club = normalizeTrainingSetup(getClub(state, clubId));
    if (!club || !TRAINING_PLANS[plan]) return { ok: false, message: "Training plan unavailable." };
    club.trainingPlan = plan;
    return { ok: true, message: `Weekly training set to ${trainingPlanLabel(plan)}.` };
  }

  function setMatchPrep(state, clubId, prep) {
    const club = normalizeTrainingSetup(getClub(state, clubId));
    if (!club || !MATCH_PREP[prep]) return { ok: false, message: "Match preparation unavailable." };
    club.matchPrep = prep;
    return { ok: true, message: `Match preparation set to ${matchPrepLabel(prep)}.` };
  }

  function daysUntilNextFixture(state, clubId, fromDate) {
    ensureCalendar(state);
    const fixture = getNextFixture(state, clubId);
    if (!fixture || !fixture.date) return null;
    return Math.max(0, daysBetween(fromDate || state.calendar.currentDate, fixture.date));
  }

  function daysSinceLastFixture(state, clubId, fromDate) {
    ensureCalendar(state);
    const date = fromDate || state.calendar.currentDate;
    const played = [];
    state.league.schedule.forEach((roundData) => {
      roundData.fixtures.forEach((fixture) => {
        if (!fixture.played || fixture.homeClubId !== clubId && fixture.awayClubId !== clubId || !fixture.date) return;
        if (compareDates(fixture.date, date) < 0) played.push(fixture);
      });
    });
    domesticCupFixtures(state).forEach((fixture) => {
      if (!fixture.played || fixture.homeClubId !== clubId && fixture.awayClubId !== clubId || !fixture.date) return;
      if (compareDates(fixture.date, date) < 0) played.push(fixture);
    });
    europeanFixtures(state).forEach((fixture) => {
      if (!fixture.played || fixture.homeClubId !== clubId && fixture.awayClubId !== clubId || !fixture.date) return;
      if (compareDates(fixture.date, date) < 0) played.push(fixture);
    });
    if (!played.length) return null;
    played.sort((a, b) => compareDates(b.date, a.date));
    return Math.max(0, daysBetween(played[0].date, date));
  }

  function autoSetTrainingPlan(state, clubId) {
    const club = normalizeTrainingSetup(getClub(state, clubId));
    if (!club) return { ok: false, message: "Club not found." };
    const squad = clubPlayers(state, clubId);
    const avgFitness = average(squad.map((player) => player.fitness || 75));
    const injuryCount = squad.filter((player) => isInjured(state, player)).length;
    const daysToNext = daysUntilNextFixture(state, clubId);
    const strength = teamStrength(state, clubId);
    if (avgFitness < 68 || injuryCount >= 3 || daysToNext !== null && daysToNext <= 2) {
      club.trainingPlan = "recovery";
    } else if (daysToNext !== null && daysToNext <= 5) {
      club.trainingPlan = strength.defense < strength.attack - 4 ? "defensive" : strength.attack < strength.defense - 4 ? "attacking" : "tactical";
    } else if (avgFitness > 86 && daysToNext !== null && daysToNext >= 8) {
      club.trainingPlan = "physical";
    } else {
      club.trainingPlan = "balanced";
    }
    const next = getNextFixture(state, clubId);
    const opponentId = next ? (next.homeClubId === clubId ? next.awayClubId : next.homeClubId) : null;
    const opponent = opponentId ? teamStrength(state, opponentId) : null;
    if (!opponent) club.matchPrep = "balanced";
    else if (opponent.attack > strength.defense + 5) club.matchPrep = "defensiveShape";
    else if (strength.attack > opponent.defense + 5) club.matchPrep = "attackingPatterns";
    else if (average(ensureLineup(state, clubId).map((id) => state.players[id]).filter(Boolean).map((player) => player.attributes.heading + player.attributes.jumping)) / 2 > 74) club.matchPrep = "setPieces";
    else club.matchPrep = "pressingTraps";
    return { ok: true, message: `Staff set ${trainingPlanLabel(club.trainingPlan)} with ${matchPrepLabel(club.matchPrep)}.` };
  }

  function setTactic(state, clubId, key, value) {
    const club = getClub(state, clubId);
    const group = tacticGroup(key);
    if (!club || !group || !tacticOption(group, value)) {
      return { ok: false, message: "Tactic option not available." };
    }
    club.tactics = normalizeTactics(club.tactics);
    club.tactics[key] = value;
    return { ok: true, message: "Tactics updated." };
  }

  function tacticalPresetOptions() {
    return Object.entries(TACTICAL_PRESETS).map(([key, preset]) => ({
      key,
      label: preset.label,
      description: preset.description,
      tactics: normalizeTactics(preset.tactics)
    }));
  }

  function tacticalPresetLabel(presetKey) {
    return TACTICAL_PRESETS[presetKey] ? TACTICAL_PRESETS[presetKey].label : presetKey || "-";
  }

  function applyTacticalPreset(state, clubId, presetKey) {
    const club = getClub(state, clubId);
    const preset = TACTICAL_PRESETS[presetKey];
    if (!club || !preset) return { ok: false, message: "Tactical preset unavailable." };
    club.tactics = normalizeTactics({ ...club.tactics, ...preset.tactics });
    return {
      ok: true,
      message: `${preset.label} applied.`,
      presetKey,
      label: preset.label,
      tactics: normalizeTactics(club.tactics)
    };
  }

  function autoSetTactics(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return { ok: false, message: "Club not found." };
    const next = getNextFixture(state, clubId);
    const ownStrength = teamStrength(state, clubId);
    const opponentId = next ? (next.homeClubId === clubId ? next.awayClubId : next.homeClubId) : null;
    const opponentStrength = opponentId ? teamStrength(state, opponentId) : { overall: ownStrength.overall };
    const lineup = ensureLineup(state, clubId).map((id) => state.players[id]).filter(Boolean);
    const stamina = average(lineup.map((player) => player.attributes.stamina + player.attributes.workRate)) / 2;
    const wingerScore = average(lineup.filter((player) => ["RB", "LB", "RW", "LW"].includes(player.position)).map((player) => player.attributes.crossing + player.attributes.pace)) / 2;
    const creatorScore = average(lineup.filter((player) => ["CM", "AM", "DM"].includes(player.position)).map((player) => player.attributes.passing + player.attributes.vision)) / 2;
    const aerialScore = average(lineup.map((player) => player.attributes.heading + player.attributes.jumping)) / 2;
    const paceScore = average(lineup.map((player) => player.attributes.pace + player.attributes.acceleration)) / 2;
    const diff = ownStrength.overall - opponentStrength.overall;
    const tactics = normalizeTactics(club.tactics);

    tactics.mentality = diff > 6 ? "positive" : diff < -6 ? "cautious" : "balanced";
    tactics.pressing = stamina > 72 && diff > -4 ? "high" : stamina < 60 || diff < -8 ? "regroup" : "standard";
    tactics.line = diff > 5 && stamina > 68 ? "high" : diff < -7 ? "deep" : "standard";
    tactics.tempo = paceScore > 72 && diff <= 2 ? "direct" : creatorScore > 72 ? "patient" : "balanced";
    tactics.width = wingerScore > creatorScore + 3 ? "wide" : creatorScore > wingerScore + 5 ? "narrow" : "balanced";
    tactics.focus = aerialScore > 75 ? "setPieces" : diff < -5 && paceScore > 68 ? "counter" : wingerScore > creatorScore + 3 ? "flanks" : creatorScore > wingerScore + 4 ? "central" : "mixed";

    club.tactics = tactics;
    return { ok: true, message: "Match plan updated." };
  }

  function tacticalProfile(club) {
    normalizeTrainingSetup(club);
    const tactics = normalizeTactics(club && club.tactics);
    const profile = {
      attack: 0,
      midfield: 0,
      defense: 0,
      xg: 0,
      xgAgainst: 0,
      possession: 0,
      shotVolume: 0,
      passAccuracy: 0,
      corners: 0,
      fouls: 0,
      pressure: 0,
      fatigue: 0,
      injuryRisk: 1,
      rating: 0,
      intensity: 50,
      tactics
    };

    if (tactics.mentality === "cautious") Object.assign(profile, addProfile(profile, { attack: -1.5, midfield: 0.6, defense: 2, xg: -0.18, xgAgainst: -0.16, possession: -1, shotVolume: -0.4, passAccuracy: 1, intensity: -6 }));
    if (tactics.mentality === "positive") Object.assign(profile, addProfile(profile, { attack: 1.4, midfield: 0.4, defense: -0.6, xg: 0.12, xgAgainst: 0.05, possession: 1, shotVolume: 0.35, intensity: 5 }));
    if (tactics.mentality === "attacking") Object.assign(profile, addProfile(profile, { attack: 2.6, midfield: 0.4, defense: -1.4, xg: 0.24, xgAgainst: 0.14, possession: 1, shotVolume: 0.8, fatigue: 1, injuryRisk: 0.08, intensity: 11 }));

    if (tactics.pressing === "regroup") Object.assign(profile, addProfile(profile, { attack: -0.5, midfield: -0.5, defense: 1.4, xg: -0.07, xgAgainst: -0.09, possession: -1, fouls: -2, fatigue: -1, passAccuracy: 1, intensity: -10 }));
    if (tactics.pressing === "high") Object.assign(profile, addProfile(profile, { attack: 0.8, midfield: 1.1, defense: -0.8, xg: 0.08, xgAgainst: 0.08, possession: 2, fouls: 3, pressure: 1.5, fatigue: 2, injuryRisk: 0.1, intensity: 13 }));
    if (tactics.pressing === "relentless") Object.assign(profile, addProfile(profile, { attack: 1.1, midfield: 1.6, defense: -1.6, xg: 0.14, xgAgainst: 0.16, possession: 3, fouls: 5, pressure: 2.5, fatigue: 3.5, injuryRisk: 0.2, intensity: 22 }));

    if (tactics.tempo === "patient") Object.assign(profile, addProfile(profile, { defense: 0.5, xg: -0.03, possession: 3, shotVolume: -0.5, passAccuracy: 3, intensity: -2 }));
    if (tactics.tempo === "direct") Object.assign(profile, addProfile(profile, { attack: 0.7, xg: 0.07, possession: -2, shotVolume: 0.7, passAccuracy: -3, fatigue: 0.5, intensity: 4 }));
    if (tactics.tempo === "vertical") Object.assign(profile, addProfile(profile, { attack: 1.2, xg: 0.11, xgAgainst: 0.05, possession: -3, shotVolume: 1.1, passAccuracy: -5, fatigue: 1, intensity: 8 }));

    if (tactics.width === "narrow") Object.assign(profile, addProfile(profile, { midfield: 1.1, defense: 0.4, possession: 1, corners: -1 }));
    if (tactics.width === "wide") Object.assign(profile, addProfile(profile, { attack: 0.8, defense: -0.4, possession: -0.5, corners: 2, passAccuracy: -1 }));

    if (tactics.line === "deep") Object.assign(profile, addProfile(profile, { attack: -0.8, defense: 1.8, xg: -0.06, xgAgainst: -0.13, possession: -2, fatigue: -0.5, intensity: -5 }));
    if (tactics.line === "high") Object.assign(profile, addProfile(profile, { attack: 0.8, defense: -1, xg: 0.07, xgAgainst: 0.11, possession: 1, fatigue: 1, intensity: 7 }));

    if (tactics.focus === "central") Object.assign(profile, addProfile(profile, { midfield: 0.8, passAccuracy: 1, corners: -1 }));
    if (tactics.focus === "flanks") Object.assign(profile, addProfile(profile, { attack: 0.8, corners: 2, passAccuracy: -1 }));
    if (tactics.focus === "setPieces") Object.assign(profile, addProfile(profile, { xg: 0.04, corners: 1, shotVolume: -0.2 }));
    if (tactics.focus === "counter") Object.assign(profile, addProfile(profile, { defense: 0.8, xg: 0.06, possession: -4, shotVolume: 0.5, passAccuracy: -2 }));

    const prep = club && MATCH_PREP[club.matchPrep] ? club.matchPrep : "balanced";
    const familiarity = club && club.matchPrepFamiliarity ? clamp((club.matchPrepFamiliarity[prep] || 0) / 100, 0, 1) : 0;
    if (prep === "defensiveShape") Object.assign(profile, addProfile(profile, { defense: 0.8 + familiarity * 1.4, xgAgainst: -0.04 - familiarity * 0.09, passAccuracy: familiarity * 0.8 }));
    if (prep === "attackingPatterns") Object.assign(profile, addProfile(profile, { attack: 0.8 + familiarity * 1.4, xg: 0.04 + familiarity * 0.09, shotVolume: familiarity * 0.4 }));
    if (prep === "setPieces") Object.assign(profile, addProfile(profile, { xg: 0.03 + familiarity * 0.07, corners: 1 + familiarity * 2 }));
    if (prep === "pressingTraps") Object.assign(profile, addProfile(profile, { midfield: familiarity * 1.1, pressure: 0.7 + familiarity * 1.4, fouls: familiarity * 1.2, fatigue: familiarity * 0.4 }));
    if (prep === "balanced") Object.assign(profile, addProfile(profile, { rating: familiarity * 0.4, passAccuracy: familiarity * 0.5 }));

    profile.intensity = Math.round(clamp(profile.intensity, 20, 92));
    profile.injuryRisk = clamp(profile.injuryRisk, 0.72, 1.35);
    return profile;
  }

  function addProfile(profile, modifier) {
    const next = {};
    Object.keys(modifier).forEach((key) => {
      next[key] = (profile[key] || 0) + modifier[key];
    });
    return next;
  }

  function teamStrength(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return { attack: 50, midfield: 50, defense: 50, keeper: 50, overall: 50 };
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    normalizeRoleAssignments(club);
    normalizePlayerInstructions(club);
    const lineup = ensureLineup(state, clubId)
      .map((id, index) => ({ player: state.players[id], slot: formation[index], roleKey: club.roleAssignments[String(index)], instructionKey: club.playerInstructions[String(index)] }))
      .filter((item) => item.player);
    const attackers = lineup.filter((item) => ["ST", "LW", "RW", "AM"].includes(item.slot));
    const midfielders = lineup.filter((item) => ["DM", "CM", "AM"].includes(item.slot));
    const defenders = lineup.filter((item) => ["RB", "LB", "CB", "DM"].includes(item.slot));
    const keepers = lineup.filter((item) => item.slot === "GK");
    const attack = average((attackers.length ? attackers : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "attack", item.roleKey, item.instructionKey)));
    const midfield = average((midfielders.length ? midfielders : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "midfield", item.roleKey, item.instructionKey)));
    const defense = average((defenders.length ? defenders : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "defense", item.roleKey, item.instructionKey)));
    const keeper = average((keepers.length ? keepers : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "keeper", item.roleKey, item.instructionKey)));
    const overall = attack * 0.28 + midfield * 0.28 + defense * 0.28 + keeper * 0.16;
    return { attack, midfield, defense, keeper, overall };
  }

  function activeMatchSide(match, clubId) {
    if (!match || !clubId) return null;
    if (match.homeClubId === clubId) return "home";
    if (match.awayClubId === clubId) return "away";
    return null;
  }

  function sideClubId(match, side) {
    return side === "home" ? match.homeClubId : match.awayClubId;
  }

  function oppositeSide(side) {
    return side === "home" ? "away" : "home";
  }

  function matchStat(match, key, side) {
    const row = match && match.stats && match.stats[key];
    const value = row && Number(row[side]);
    return Number.isFinite(value) ? value : 0;
  }

  function scoreAtMinute(match, minute, visibleGoals) {
    if (!match) return { home: 0, away: 0 };
    const useVisible = Array.isArray(visibleGoals) && visibleGoals.length;
    const goals = useVisible ? visibleGoals : (match.goals || []).filter((goal) => !Number.isFinite(minute) || minute >= 90 || Number(goal.minute || 0) <= minute);
    if (!useVisible && Number.isFinite(minute) && minute >= 90) return { home: match.homeGoals || 0, away: match.awayGoals || 0 };
    return {
      home: goals.filter((goal) => goal.clubId === match.homeClubId).length,
      away: goals.filter((goal) => goal.clubId === match.awayClubId).length
    };
  }

  function phaseValue(match, side, key) {
    const phases = match && match.teamPhaseStrengths && match.teamPhaseStrengths[side];
    const value = phases && Number(phases[key]);
    return Number.isFinite(value) ? value : 0;
  }

  function phaseLabel(key) {
    const labels = {
      attackStrength: "Attack",
      chanceCreation: "Chance Creation",
      buildUpQuality: "Build-Up",
      pressingStrength: "Press",
      defensiveStability: "Defensive Shape",
      chancePrevention: "Chance Prevention",
      wideThreat: "Wide Threat",
      centralThreat: "Central Threat",
      defensiveTransition: "Defensive Transition",
      instructionCohesion: "Instruction Cohesion"
    };
    return labels[key] || key;
  }

  function pushAssistantAdvice(list, tone, title, body, action) {
    list.push({
      tone,
      title,
      body,
      key: action && action.key,
      value: action && action.value,
      presetKey: action && action.presetKey,
      actionLabel: action && action.label
    });
  }

  function liveMatchAssistantReport(state, match, minute, visibleGoals, liveTactics) {
    if (!state || !match) return null;
    const side = activeMatchSide(match, state.activeClubId);
    if (!side) return null;
    const other = oppositeSide(side);
    const club = getClub(state, state.activeClubId);
    const opponent = getClub(state, sideClubId(match, other));
    const score = scoreAtMinute(match, minute, visibleGoals);
    const ownScore = side === "home" ? score.home : score.away;
    const opponentScore = side === "home" ? score.away : score.home;
    const scoreDiff = ownScore - opponentScore;
    const ownXg = matchStat(match, "xg", side);
    const opponentXg = matchStat(match, "xg", other);
    const ownShots = matchStat(match, "shots", side);
    const opponentShots = matchStat(match, "shots", other);
    const passAccuracy = matchStat(match, "passAccuracy", side);
    const pressTurnovers = matchStat(match, "pressTurnovers", side);
    const opponentCounters = matchStat(match, "counterattacks", other);
    const currentTactics = normalizeTactics(liveTactics || (match.tactics && match.tactics[side]) || (club && club.tactics));
    const staff = staffEffectsForClub(state, state.activeClubId);
    const phaseRows = ["attackStrength", "chanceCreation", "buildUpQuality", "pressingStrength", "defensiveStability", "chancePrevention", "instructionCohesion"].map((key) => {
      const own = phaseValue(match, side, key);
      const opp = phaseValue(match, other, key);
      return {
        key,
        label: phaseLabel(key),
        own,
        opponent: opp,
        edge: round(own - opp, 1),
        tone: own >= opp + 4 ? "green" : own <= opp - 4 ? "amber" : "blue"
      };
    });
    const advice = [];

    if (scoreDiff < 0 && minute >= 50) {
      pushAssistantAdvice(advice, "red", "Chase The Game", `${opponent ? opponent.name : "The opponent"} are ahead. Add runners and tempo before the match settles.`, { presetKey: "chaseGame", label: "Chase Goal" });
    }
    if (scoreDiff > 0 && minute >= 62) {
      pushAssistantAdvice(advice, "green", "Protect The Lead", "The scoreline is yours. Lower the line and reduce transition risk.", { presetKey: "protectLead", label: "Protect Lead" });
    }
    if (opponentCounters >= 3 && currentTactics.line === "high") {
      pushAssistantAdvice(advice, "amber", "Space Behind", "The high line is inviting counters. Drop the back line before another transition lands.", { key: "line", value: "standard", label: "Drop Line" });
    }
    if (passAccuracy && passAccuracy < 68) {
      pushAssistantAdvice(advice, "amber", "Passing Stability", `Passing accuracy is only ${passAccuracy}%. Slower tempo should help the first pass out.`, { key: "tempo", value: "patient", label: "Slow Tempo" });
    }
    if (ownXg < opponentXg - 0.35 && scoreDiff <= 0 && minute >= 35) {
      pushAssistantAdvice(advice, "amber", "Chance Quality", "The chance quality is slipping. Shift the focus to more direct creation.", { key: "focus", value: "central", label: "Go Central" });
    }
    if (phaseValue(match, side, "wideThreat") > phaseValue(match, other, "defensiveWidth") + 5 && currentTactics.focus !== "flanks") {
      pushAssistantAdvice(advice, "blue", "Wide Advantage", "Wide matchups are favourable. Move the attack toward the flanks.", { presetKey: "wideService", label: "Use Width" });
    }
    if (phaseValue(match, side, "pressingStrength") > phaseValue(match, other, "buildUpQuality") + 5 && pressTurnovers < 3 && currentTactics.pressing !== "high") {
      pushAssistantAdvice(advice, "blue", "Press Trigger", "The matchup can support more pressure. A higher press could force rushed passes.", { key: "pressing", value: "high", label: "Press Higher" });
    }
    if (phaseValue(match, side, "instructionCohesion") < -1.5) {
      pushAssistantAdvice(advice, "amber", "Instruction Cohesion", "Several individual instructions are pulling against the team shape. Simplify duties next time.", null);
    }
    if (!advice.length) {
      pushAssistantAdvice(advice, "blue", "Stay Connected", `${club ? club.name : "Your team"} are close enough in the key phases. Keep the plan stable for now.`, { presetKey: currentTactics.mentality === "cautious" ? "counterAway" : "balanced", label: "Hold Shape" });
    }

    const assistantConfidence = Math.round(clamp(66 + staff.assistantInsight + Math.max(0, minute - 45) * 0.15, 45, 92));
    return {
      side,
      opponentClubId: sideClubId(match, other),
      minute,
      score: { own: ownScore, opponent: opponentScore, diff: scoreDiff },
      xg: { own: ownXg, opponent: opponentXg, diff: round(ownXg - opponentXg, 2) },
      shots: { own: ownShots, opponent: opponentShots },
      currentTactics,
      assistantConfidence,
      advice: advice.slice(0, 4),
      substitutions: substitutionRecommendations(state, match, side, minute).slice(0, 3),
      phaseRows
    };
  }

  function substitutionRecommendations(state, match, side, minute) {
    if (!state || !match || minute < 45) return [];
    const clubId = sideClubId(match, side);
    const club = getClub(state, clubId);
    if (!club) return [];
    const appeared = new Set((match.playerRatings || []).filter((rating) => rating.clubId === clubId).map((rating) => rating.playerId));
    const starters = (match.playerRatings || [])
      .filter((rating) => rating.clubId === clubId && rating.started)
      .map((rating) => ({ rating, player: getPlayer(state, rating.playerId), stats: match.playerStats && match.playerStats[rating.playerId] ? match.playerStats[rating.playerId] : {} }))
      .filter((row) => row.player);
    let bench = (club.bench || []).map((id) => getPlayer(state, id)).filter(Boolean).filter((player) => !isUnavailable(state, player) && !appeared.has(player.id));
    if (!bench.length) bench = (club.bench || []).map((id) => getPlayer(state, id)).filter(Boolean).filter((player) => !isUnavailable(state, player));

    return starters
      .map((row) => {
        const risk = substitutionRiskScore(row.player, row.rating, row.stats, minute);
        const candidate = bestSubstitutionCandidate(row.player, bench);
        if (!candidate || risk < 8) return null;
        const tacticalGain = round(candidate.score - row.player.currentAbility * 0.1, 1);
        return {
          playerOutId: row.player.id,
          playerInId: candidate.player.id,
          score: Math.round(clamp(risk + Math.max(0, tacticalGain), 1, 100)),
          tone: risk >= 24 ? "red" : risk >= 15 ? "amber" : "blue",
          reason: substitutionReasonLabel(row.player, row.rating, row.stats),
          detail: `${playerDisplayName(candidate.player)} covers ${candidate.fitLabel} with ${Math.round(candidate.player.fitness || 70)}% fitness.`,
          minute
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  function substitutionRiskScore(player, rating, stats, minute) {
    const matchRating = rating && Number.isFinite(rating.rating) ? rating.rating : 6.6;
    const fitness = Number(player.fitness || 72);
    const yellow = stats && stats.yellowCards ? 1 : 0;
    const mistakes = stats && stats.mistakes ? stats.mistakes : 0;
    const minutes = stats && Number.isFinite(stats.minutes) ? stats.minutes : minute;
    return clamp(
      (matchRating < 6.5 ? (6.7 - matchRating) * 14 : 0) +
      (fitness < 70 ? (70 - fitness) * 0.5 : 0) +
      (minutes >= 65 ? 4 : 0) +
      yellow * 7 +
      mistakes * 5,
      0,
      60
    );
  }

  function bestSubstitutionCandidate(outgoing, bench) {
    if (!outgoing || !bench.length) return null;
    return bench
      .map((player) => {
        const exact = player.position === outgoing.position;
        const secondary = (player.secondaryPositions || []).includes(outgoing.position);
        const band = positionBand(player.position) === positionBand(outgoing.position);
        const positionFit = exact ? 18 : secondary ? 13 : band ? 8 : player.position === "GK" || outgoing.position === "GK" ? -25 : 0;
        const fitnessLift = (player.fitness || 70) * 0.08;
        const formLift = average(player.form || []) * 1.8;
        const score = player.currentAbility * 0.1 + positionFit + fitnessLift + formLift;
        return {
          player,
          score,
          fitLabel: exact ? outgoing.position : secondary ? `${outgoing.position} cover` : band ? positionBand(outgoing.position) : "emergency cover"
        };
      })
      .sort((a, b) => b.score - a.score)[0] || null;
  }

  function substitutionReasonLabel(player, rating, stats) {
    if (stats && stats.yellowCards) return "card risk";
    if (stats && stats.mistakes >= 2) return "mistakes";
    if (rating && rating.rating < 6.4) return "low rating";
    if (player && player.fitness < 68) return "fatigue";
    return "fresh legs";
  }

  function postMatchTacticalReview(state, match) {
    if (!state || !match) return null;
    const side = activeMatchSide(match, state.activeClubId);
    if (!side) return null;
    const other = oppositeSide(side);
    const scoreDiff = (side === "home" ? match.homeGoals - match.awayGoals : match.awayGoals - match.homeGoals) || 0;
    const xgDiff = round(matchStat(match, "xg", side) - matchStat(match, "xg", other), 2);
    const phaseRows = ["chanceCreation", "buildUpQuality", "pressingStrength", "defensiveStability", "chancePrevention", "instructionCohesion"].map((key) => {
      const own = phaseValue(match, side, key);
      const opponent = phaseValue(match, other, key);
      return {
        key,
        label: phaseLabel(key),
        own,
        opponent,
        edge: round(own - opponent, 1),
        tone: own >= opponent + 4 ? "green" : own <= opponent - 4 ? "amber" : "blue"
      };
    });
    const phaseScore = average(phaseRows.map((row) => row.edge));
    const reviewScore = Math.round(clamp(62 + scoreDiff * 10 + xgDiff * 10 + phaseScore * 0.35, 28, 96));
    const grade = reviewScore >= 86 ? "A" : reviewScore >= 74 ? "B" : reviewScore >= 62 ? "C" : reviewScore >= 50 ? "D" : "E";
    const notes = [];
    if (xgDiff >= 0.35) notes.push({ tone: "green", title: "Chance Quality", body: `Your chance quality led by ${xgDiff} xG.` });
    if (xgDiff <= -0.35) notes.push({ tone: "amber", title: "Chance Quality", body: `You lost the xG battle by ${Math.abs(xgDiff)}.` });
    const bestPhase = phaseRows.slice().sort((a, b) => b.edge - a.edge)[0];
    const weakestPhase = phaseRows.slice().sort((a, b) => a.edge - b.edge)[0];
    if (bestPhase && bestPhase.edge > 2) notes.push({ tone: "green", title: bestPhase.label, body: `This phase gave you a ${bestPhase.edge > 0 ? "+" : ""}${bestPhase.edge} edge.` });
    if (weakestPhase && weakestPhase.edge < -2) notes.push({ tone: "amber", title: weakestPhase.label, body: `This phase trailed by ${Math.abs(weakestPhase.edge)} and needs attention.` });
    if (matchStat(match, "pressTurnovers", side) >= 3) notes.push({ tone: "blue", title: "Pressing Output", body: `${matchStat(match, "pressTurnovers", side)} dangerous turnovers came from pressure.` });
    if (matchStat(match, "substitutions", side) <= 1 && matchStat(match, "substitutions", other) >= 3) notes.push({ tone: "amber", title: "Bench Timing", body: "The opponent changed the rhythm with more bench intervention." });
    if (!notes.length) notes.push({ tone: "blue", title: "Tactical Balance", body: "The match was decided by small margins across the main phases." });
    return {
      side,
      grade,
      score: reviewScore,
      summary: `${grade} tactical review | ${scoreDiff > 0 ? "Result protected" : scoreDiff < 0 ? "Result escaped" : "Balanced result"} | ${xgDiff > 0 ? "+" : ""}${xgDiff} xG edge.`,
      notes: notes.slice(0, 5),
      phaseRows
    };
  }

  function adjustedRoleScore(player, slot, role, tacticalRoleKey, instructionKey) {
    const masteryLift = (roleMastery(player, tacticalRoleKey) - 50) * 0.025;
    const instructionKeySafe = instructionKey || "balanced";
    const instructionLift = instructionPhaseBonus(player, instructionKeySafe, role, slot, tacticalRoleKey) + instructionExecutionLift(player, instructionKeySafe, slot, tacticalRoleKey);
    return roleScore(player, role) - slotPenalty(player, slot) + rolePhaseBonus(player, tacticalRoleKey, role, slot) + masteryLift + instructionLift;
  }

  function slotPenalty(player, slot) {
    if (!slot || player.position === slot) return 0;
    if ((player.secondaryPositions || []).includes(slot)) return 2;
    if (positionBand(player.position) === positionBand(slot)) return 4.5;
    return slot === "GK" || player.position === "GK" ? 18 : 8.5;
  }

  function positionBand(position) {
    if (position === "GK") return "keeper";
    if (["RB", "LB", "CB"].includes(position)) return "defense";
    if (["DM", "CM", "AM"].includes(position)) return "midfield";
    if (["RW", "LW"].includes(position)) return "wide";
    return "forward";
  }

  function roleScore(player, role) {
    const a = player.attributes;
    const physical = player.fitness * 0.06 + player.sharpness * 0.06 + player.morale * 0.04;
    if (role === "attack") {
      return average([a.finishing, a.composure, a.firstTouch, a.dribbling, a.pace, a.decisions]) + physical;
    }
    if (role === "midfield") {
      return average([a.passing, a.vision, a.decisions, a.firstTouch, a.workRate, a.stamina]) + physical;
    }
    if (role === "defense") {
      return average([a.tackling, a.marking, a.positioning, a.strength, a.heading, a.decisions]) + physical;
    }
    return average([a.positioning, a.decisions, a.jumping, a.composure, a.leadership, a.strength]) + physical;
  }

  function isInjured(state, player) {
    if (!player || !player.injury) return false;
    if (player.injury.returnDate && state.calendar && state.calendar.currentDate) {
      return compareDates(player.injury.returnDate, state.calendar.currentDate) > 0;
    }
    if (player.injury.returnSeason > state.season) return true;
    return player.injury.returnSeason === state.season && player.injury.returnRound > state.league.currentRound;
  }

  function isSuspended(state, player) {
    if (!player || !player.suspension) return false;
    if (player.suspension.returnDate && state.calendar && state.calendar.currentDate) {
      return compareDates(player.suspension.returnDate, state.calendar.currentDate) > 0;
    }
    if (player.suspension.returnSeason > state.season) return true;
    return player.suspension.returnSeason === state.season && player.suspension.returnRound > state.league.currentRound;
  }

  function isUnavailable(state, player) {
    return !player || player.contractYears <= 0 || isInjured(state, player) || isSuspended(state, player);
  }

  function injuryWeeksRemaining(state, player) {
    if (!player || !player.injury) return 0;
    if (player.injury.returnDate && state.calendar && state.calendar.currentDate) {
      return Math.max(1, Math.ceil(daysBetween(state.calendar.currentDate, player.injury.returnDate) / 7));
    }
    if (player.injury.returnSeason > state.season) {
      return player.injury.returnRound + (state.league.schedule.length - state.league.currentRound);
    }
    return Math.max(1, player.injury.returnRound - state.league.currentRound);
  }

  function suspensionDaysRemaining(state, player) {
    if (!player || !player.suspension) return 0;
    if (player.suspension.returnDate && state.calendar && state.calendar.currentDate) {
      return Math.max(1, daysBetween(state.calendar.currentDate, player.suspension.returnDate));
    }
    return Math.max(1, ((player.suspension.returnRound || state.league.currentRound + 1) - state.league.currentRound) * 7);
  }

  function injuryRiskLevel(state, player) {
    if (!player) return { key: "unknown", label: "-", tone: "amber", score: 0, detail: "No player selected" };
    if (isInjured(state, player)) {
      return { key: "injured", label: "Injured", tone: "red", score: 100, detail: availabilityLabel(state, player) };
    }
    const club = getClub(state, player.clubId);
    const plan = club ? TRAINING_PLANS[club.trainingPlan] || TRAINING_PLANS.balanced : TRAINING_PLANS.balanced;
    const staff = club ? staffEffectsForClub(state, club.id) : staffEffectsForClub(state, null);
    const individual = INDIVIDUAL_PLANS[player.individualPlan] || INDIVIDUAL_PLANS.normal;
    const resistance = averageExisting(player.attributes || {}, ["injuryResistance", "naturalFitness", "stamina"], 60);
    const fitnessRisk = player.fitness < 58 ? 36 : player.fitness < 72 ? 22 : player.fitness < 84 ? 10 : 3;
    const ageRisk = player.age >= 32 ? 14 : player.age <= 21 ? 6 : 0;
    const historyRisk = Math.min(12, (player.careerTotals && player.careerTotals.injuries || 0) * 3);
    const workloadRisk = (plan.load || 1) * 8 * (individual.loadMultiplier || 1) * staff.injuryRiskMultiplier;
    const score = round(clamp(fitnessRisk + ageRisk + historyRisk + workloadRisk + (62 - resistance) * 0.45, 0, 100), 0);
    if (score >= 58) return { key: "high", label: "High", tone: "red", score, detail: "Reduce load or rest" };
    if (score >= 34) return { key: "medium", label: "Medium", tone: "amber", score, detail: "Monitor workload" };
    return { key: "low", label: "Low", tone: "green", score, detail: "Managed load" };
  }

  function playerAvailabilityStatus(state, player) {
    normalizePlayerState(player);
    if (!player) return { key: "unknown", label: "-", tone: "amber", detail: "No player selected" };
    if (isInjured(state, player)) {
      const weeks = injuryWeeksRemaining(state, player);
      return {
        key: "injured",
        label: `${player.injury.type} (${weeks}w)`,
        tone: "red",
        detail: player.injury.returnDate ? `Back ${formatGameDate(player.injury.returnDate)}` : "Medical room"
      };
    }
    if (isSuspended(state, player)) {
      const days = suspensionDaysRemaining(state, player);
      return {
        key: "suspended",
        label: "Suspended",
        tone: "red",
        detail: `${days} day${days === 1 ? "" : "s"} remaining`
      };
    }
    if (player.contractYears <= 0) return { key: "contract", label: "Out of contract", tone: "red", detail: "Cannot be selected" };
    if (player.fitness < 55) return { key: "unfit", label: "Low fitness", tone: "amber", detail: `${player.fitness}% fitness` };
    if (injuryRiskLevel(state, player).key === "high") return { key: "doubtful", label: "Doubtful", tone: "amber", detail: "High injury risk" };
    if (player.contractYears === 1) return { key: "expiring", label: "Expiring", tone: "amber", detail: "Contract ends soon" };
    return { key: "available", label: "Available", tone: "green", detail: `${player.fitness}% fitness` };
  }

  function clubMatchesPlayed(state, clubId) {
    if (!state || !state.league || !Array.isArray(state.league.schedule)) return 0;
    return state.league.schedule.reduce((total, roundData) => {
      return total + (roundData.fixtures || []).filter((fixture) => fixture.played && (fixture.homeClubId === clubId || fixture.awayClubId === clubId)).length;
    }, 0);
  }

  function playerPlayingTimeProfile(state, player) {
    normalizePlayerState(player);
    const matches = Math.max(0, clubMatchesPlayed(state, player.clubId));
    const stats = player.seasonStats || freshPlayerStats();
    const role = roleExpectation(player.squadRole);
    const starts = Number(stats.starts || 0);
    const minutes = Number(stats.minutes || 0);
    const startRate = matches ? starts / matches : 0;
    const minuteRate = matches ? minutes / Math.max(1, matches * 90) : 0;
    if (matches < 3) {
      return {
        matches,
        starts,
        minutes,
        startRate: round(startRate * 100, 0),
        minuteRate: round(minuteRate * 100, 0),
        expectedStartRate: round(role.expectedStartRate * 100, 0),
        expectedMinuteRate: round(role.expectedMinuteRate * 100, 0),
        pressure: 0,
        label: "Early Season",
        tone: "blue"
      };
    }
    const grace = matches < 5 ? 0.18 : matches < 9 ? 0.08 : 0;
    const startGap = Math.max(0, role.expectedStartRate - startRate - grace);
    const minuteGap = Math.max(0, role.expectedMinuteRate - minuteRate - grace);
    const pressure = round(clamp((startGap * 70 + minuteGap * 62) / role.patience, 0, 100), 0);
    const label = pressure >= 62 ? "Underplayed" : pressure >= 36 ? "Wants Minutes" : pressure >= 18 ? "Monitor" : "Satisfied";
    const tone = pressure >= 62 ? "red" : pressure >= 36 ? "amber" : pressure >= 18 ? "blue" : "green";
    return {
      matches,
      starts,
      minutes,
      startRate: round(startRate * 100, 0),
      minuteRate: round(minuteRate * 100, 0),
      expectedStartRate: round(role.expectedStartRate * 100, 0),
      expectedMinuteRate: round(role.expectedMinuteRate * 100, 0),
      pressure,
      label,
      tone
    };
  }

  function playerPromiseStatus(state, player, playingTime) {
    const promise = player.promises && player.promises.playingTime;
    if (!promise || promise.status === "fulfilled" || promise.status === "broken") return null;
    if (playingTime.pressure <= 16) {
      return { key: "ready", label: "Promise improving", tone: "green", detail: "Playing-time pressure has eased" };
    }
    if (promise.dueDate && compareDates(state.calendar.currentDate, promise.dueDate) > 0) {
      return { key: "overdue", label: "Promise at risk", tone: "red", detail: `Due ${formatGameDate(promise.dueDate)}` };
    }
    return { key: "active", label: "Promise active", tone: "amber", detail: promise.dueDate ? `Review by ${formatGameDate(promise.dueDate)}` : "Review pending" };
  }

  function playerHappinessReport(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player) return null;
    const playingTime = playerPlayingTimeProfile(state, player);
    const recentRating = player.form && player.form.length ? average(player.form) : 6.6;
    const contractPressure = player.contractYears <= 0 ? 38 : player.contractYears === 1 ? 18 : player.contractYears === 2 ? 6 : 0;
    const transferPressure = ensureTransferState(state).offers.some((offer) => offer.playerId === player.id && offer.status === "pending") ? 6 : 0;
    const promiseStatus = playerPromiseStatus(state, player, playingTime);
    const promisePenalty = promiseStatus && promiseStatus.key === "overdue" ? 16 : promiseStatus && promiseStatus.key === "active" ? 5 : 0;
    const formLift = clamp((recentRating - 6.6) * 8, -9, 10);
    const moraleLift = (player.morale - 55) * 0.58;
    const score = round(clamp(58 + moraleLift + formLift - playingTime.pressure * 0.42 - contractPressure - transferPressure - promisePenalty, 0, 100), 0);
    const reasons = [];
    if (playingTime.pressure >= 36) reasons.push(`${playingTime.label}: ${playingTime.starts}/${playingTime.matches} starts`);
    if (contractPressure >= 18) reasons.push(player.contractYears <= 0 ? "Out of contract" : "Contract expiring");
    if (promiseStatus) reasons.push(promiseStatus.label);
    if (transferPressure) reasons.push("Transfer interest");
    if (player.morale < 42) reasons.push("Low morale");
    if (recentRating >= 7.2) reasons.push("Strong form");
    if (!reasons.length) reasons.push("No major concerns");
    const label = score >= 74 ? "Happy" : score >= 56 ? "Content" : score >= 38 ? "Concerned" : "Unhappy";
    const tone = score >= 74 ? "green" : score >= 56 ? "blue" : score >= 38 ? "amber" : "red";
    return {
      playerId: player.id,
      score,
      label,
      tone,
      role: player.squadRole,
      roleLabel: squadRoleLabel(player.squadRole),
      roleTone: roleTone(player.squadRole),
      playingTime,
      contractPressure,
      promiseStatus,
      reasons
    };
  }

  function squadHappinessReport(state, clubId) {
    const squad = clubPlayers(state, clubId);
    const rows = squad.map((player) => ({ player, happiness: playerHappinessReport(state, player.id) })).filter((item) => item.happiness);
    const averageScore = round(average(rows.map((item) => item.happiness.score)), 0);
    const tone = averageScore >= 74 ? "green" : averageScore >= 56 ? "blue" : averageScore >= 38 ? "amber" : "red";
    return {
      averageScore,
      tone,
      unhappy: rows
        .filter((item) => item.happiness.score < 48 || item.happiness.playingTime.pressure >= 42)
        .sort((a, b) => a.happiness.score - b.happiness.score || b.happiness.playingTime.pressure - a.happiness.playingTime.pressure)
        .slice(0, 6),
      expiring: rows
        .filter((item) => item.player.contractYears <= 1)
        .sort((a, b) => b.player.currentAbility - a.player.currentAbility)
        .slice(0, 6),
      promises: rows.filter((item) => item.player.promises && item.player.promises.playingTime && item.player.promises.playingTime.status === "active").length
    };
  }

  function contractRenewalProfile(state, playerId) {
    const player = getPlayer(state, playerId);
    const club = player ? getClub(state, player.clubId) : null;
    if (!player || !club) return null;
    const happiness = playerHappinessReport(state, player.id);
    const role = roleExpectation(player.squadRole);
    const years = player.age >= 32 ? 2 : player.age >= 29 ? 3 : player.squadRole === "star" || player.squadRole === "important" || player.squadRole === "prospect" ? 4 : 3;
    const expiringLift = player.contractYears <= 0 ? 1.28 : player.contractYears === 1 ? 1.16 : player.contractYears === 2 ? 1.08 : 1.02;
    const happinessLift = happiness.score < 36 ? 1.22 : happiness.score < 52 ? 1.12 : happiness.score >= 74 ? 0.98 : 1.04;
    const demandWage = moneyRound(Math.max(player.wage * expiringLift * happinessLift, calculateWage(player) * role.wageMultiplier));
    const wageRoom = Math.max(0, club.wageBudget - (weeklyWageSpend(state, club.id) - player.wage));
    const interest = round(clamp(42 + happiness.score * 0.48 + (player.contractYears <= 1 ? 8 : 0) - (happiness.playingTime.pressure >= 54 ? 14 : 0), 0, 100), 0);
    const warnings = [];
    if (demandWage > wageRoom) warnings.push("Wage budget stretch");
    if (happiness.playingTime.pressure >= 54) warnings.push("Playing-time promise expected");
    if (happiness.score < 38) warnings.push("Player happiness is low");
    if (player.age >= 32 && years > 2) warnings.push("Veteran contract length risk");
    const label = interest >= 72 ? "Willing" : interest >= 50 ? "Negotiable" : interest >= 30 ? "Needs Convincing" : "Reluctant";
    const tone = interest >= 72 ? "green" : interest >= 50 ? "blue" : interest >= 30 ? "amber" : "red";
    return {
      playerId: player.id,
      years,
      requestedWage: demandWage,
      wageRoom,
      interest,
      label,
      tone,
      happiness,
      warnings
    };
  }

  function availabilityLabel(state, player) {
    return playerAvailabilityStatus(state, player).label;
  }

  function sampleGoals(state, xg) {
    const lambda = clamp(xg, 0.05, 4.8);
    const threshold = Math.exp(-lambda);
    let product = 1;
    let goals = 0;
    do {
      goals += 1;
      product *= random(state);
    } while (product > threshold);
    return clamp(goals - 1, 0, 8);
  }

  function chanceWeightedPlayer(state, players, weights) {
    const scored = players.map((player) => ({ player, weight: Math.max(1, weights(player)) }));
    const total = scored.reduce((sum, item) => sum + item.weight, 0);
    let marker = random(state) * total;
    for (const item of scored) {
      marker -= item.weight;
      if (marker <= 0) return item.player;
    }
    return scored[0] ? scored[0].player : null;
  }

  function lineupContext(state, club) {
    const formation = Data.FORMATIONS[club.formation] || Data.FORMATIONS["4-3-3"];
    normalizeRoleAssignments(club);
    normalizePlayerInstructions(club);
    return ensureLineup(state, club.id)
      .map((id, index) => {
        const player = state.players[id];
        const slot = formation[index] || (player ? player.position : "CM");
        const roleKey = club.roleAssignments[String(index)] || defaultRoleForSlot(slot);
        const instructionKey = club.playerInstructions[String(index)] || defaultInstructionForSlot(slot);
        return {
          player,
          slot,
          roleKey,
          instructionKey,
          instructionLabel: playerInstructionLabel(instructionKey),
          instructionFit: player ? playerInstructionFit(player, instructionKey, slot, roleKey) : 0,
          instructionMastery: player ? instructionMastery(player, instructionKey) : 0,
          instructionLoad: player ? instructionLoadModifier(player, instructionKey, slot, roleKey) : 0,
          instructionPhases: player ? instructionMatchPhaseModifiers(player, instructionKey, slot, roleKey) : {}
        };
      })
      .filter((item) => item.player);
  }

  function benchContext(state, club) {
    return ensureBench(state, club.id)
      .map((id, index) => ({ player: state.players[id], slot: state.players[id] ? state.players[id].position : "CM", benchIndex: index }))
      .filter((item) => item.player);
  }

  function applyDeepMatchResult(fixture, result) {
    fixture.played = true;
    fixture.homeGoals = result.homeGoals;
    fixture.awayGoals = result.awayGoals;
    fixture.stats = result.stats;
    fixture.commentary = result.commentary;
    fixture.playerRatings = result.playerRatings;
    fixture.goals = result.goals;
    fixture.substitutions = result.substitutions || [];
    fixture.events = result.events;
    fixture.playerStats = result.playerStats;
    fixture.tactics = result.tactics;
    fixture.teamPhaseStrengths = result.teamPhaseStrengths;
    fixture.xGTimeline = result.xGTimeline;
    fixture.momentumTimeline = result.momentumTimeline;
    fixture.analysis = result.analysis;
    fixture.engineVersion = result.engineVersion;
    fixture.manOfMatch = result.manOfMatch;
  }

  function simulateFixture(state, fixture) {
    if (fixture.played) return fixture;
    const homeClub = getClub(state, fixture.homeClubId);
    const awayClub = getClub(state, fixture.awayClubId);
    if (MatchEngine && MatchEngine.simulateMatch) {
      const homeLineupContext = lineupContext(state, homeClub);
      const awayLineupContext = lineupContext(state, awayClub);
      const homeBenchContext = benchContext(state, homeClub);
      const awayBenchContext = benchContext(state, awayClub);
      const result = MatchEngine.simulateMatch({
        state,
        fixture,
        homeClub,
        awayClub,
        homeLineup: homeLineupContext,
        awayLineup: awayLineupContext,
        homeBench: homeBenchContext,
        awayBench: awayBenchContext
      });
      applyDeepMatchResult(fixture, result);
      updateAfterFixture(state, fixture);
      const appearedIds = new Set((result.playerRatings || []).map((rating) => rating.playerId));
      applyMatchInjuries(
        state,
        fixture,
        Array.from(appearedIds)
          .map((id) => state.players[id])
          .filter(Boolean)
      );
      return fixture;
    }
    const homeLineup = ensureLineup(state, homeClub.id).map((id) => state.players[id]).filter(Boolean);
    const awayLineup = ensureLineup(state, awayClub.id).map((id) => state.players[id]).filter(Boolean);
    const homeStrength = teamStrength(state, homeClub.id);
    const awayStrength = teamStrength(state, awayClub.id);
    const homeTactical = tacticalProfile(homeClub);
    const awayTactical = tacticalProfile(awayClub);
    const homeAttack = homeStrength.attack + homeTactical.attack;
    const awayAttack = awayStrength.attack + awayTactical.attack;
    const homeMidfield = homeStrength.midfield + homeTactical.midfield;
    const awayMidfield = awayStrength.midfield + awayTactical.midfield;
    const homeDefense = homeStrength.defense + homeTactical.defense;
    const awayDefense = awayStrength.defense + awayTactical.defense;

    const homeClubQuality = (homeClub.reputation - awayClub.reputation) * 0.018;
    const awayClubQuality = (awayClub.reputation - homeClub.reputation) * 0.018;
    const homePower = (homeAttack - awayDefense) * 0.024 + (homeMidfield - awayMidfield) * 0.012 + homeClubQuality;
    const awayPower = (awayAttack - homeDefense) * 0.024 + (awayMidfield - homeMidfield) * 0.012 + awayClubQuality;
    const homeXg = clamp(1.36 + homePower + homeTactical.xg + awayTactical.xgAgainst + randomFloat(state, -0.18, 0.22), 0.18, 3.75);
    const awayXg = clamp(1.1 + awayPower + awayTactical.xg + homeTactical.xgAgainst + randomFloat(state, -0.18, 0.22), 0.14, 3.45);
    const homeGoals = sampleGoals(state, homeXg);
    const awayGoals = sampleGoals(state, awayXg);
    const homePossession = Math.round(clamp(50 + (homeMidfield - awayMidfield) * 0.42 + 3 + homeTactical.possession - awayTactical.possession + randomFloat(state, -5, 5), 28, 72));
    const awayPossession = 100 - homePossession;

    const homeShots = Math.max(homeGoals + randomInt(state, 4, 10), Math.round(homeXg * (5 + homeTactical.shotVolume) + randomInt(state, 3, 8)));
    const awayShots = Math.max(awayGoals + randomInt(state, 3, 9), Math.round(awayXg * (5 + awayTactical.shotVolume) + randomInt(state, 2, 8)));
    const homeOnTarget = clamp(homeGoals + randomInt(state, 1, 5), homeGoals, homeShots);
    const awayOnTarget = clamp(awayGoals + randomInt(state, 1, 5), awayGoals, awayShots);

    const homeGoalEvents = createGoalEvents(state, fixture, homeClub, homeLineup, homeGoals, homeTactical);
    const awayGoalEvents = createGoalEvents(state, fixture, awayClub, awayLineup, awayGoals, awayTactical);
    const commentary = buildCommentary(state, homeClub, awayClub, homeLineup, awayLineup, homeGoalEvents.concat(awayGoalEvents));
    const ratings = buildRatings(state, fixture, homeLineup, awayLineup, homeGoalEvents.concat(awayGoalEvents), homeGoals, awayGoals, homeTactical, awayTactical);
    const motm = ratings.slice().sort((a, b) => b.rating - a.rating)[0] || null;

    fixture.played = true;
    fixture.homeGoals = homeGoals;
    fixture.awayGoals = awayGoals;
    fixture.stats = {
      possession: { home: homePossession, away: awayPossession },
      xg: { home: round(homeXg, 2), away: round(awayXg, 2) },
      shots: { home: homeShots, away: awayShots },
      shotsOnTarget: { home: homeOnTarget, away: awayOnTarget },
      corners: { home: clamp(randomInt(state, 1, 9) + Math.round(homeTactical.corners), 0, 14), away: clamp(randomInt(state, 0, 8) + Math.round(awayTactical.corners), 0, 14) },
      fouls: { home: clamp(randomInt(state, 6, 16) + Math.round(homeTactical.fouls), 3, 24), away: clamp(randomInt(state, 6, 16) + Math.round(awayTactical.fouls), 3, 24) },
      passAccuracy: {
        home: Math.round(clamp(72 + (homeMidfield - 55) * 0.25 + homeTactical.passAccuracy - awayTactical.pressure + randomFloat(state, -4, 5), 56, 93)),
        away: Math.round(clamp(71 + (awayMidfield - 55) * 0.25 + awayTactical.passAccuracy - homeTactical.pressure + randomFloat(state, -4, 5), 55, 92))
      }
    };
    fixture.tactics = {
      home: normalizeTactics(homeClub.tactics),
      away: normalizeTactics(awayClub.tactics)
    };
    fixture.commentary = commentary;
    fixture.playerRatings = ratings;
    fixture.goals = homeGoalEvents.concat(awayGoalEvents).sort((a, b) => a.minute - b.minute);
    fixture.manOfMatch = motm ? motm.playerId : null;

    updateAfterFixture(state, fixture);
    applyMatchInjuries(state, fixture, homeLineup.concat(awayLineup));
    return fixture;
  }

  function createGoalEvents(state, fixture, club, lineup, goals, tactical) {
    const events = [];
    for (let i = 0; i < goals; i += 1) {
      const scorer = chanceWeightedPlayer(state, lineup, (player) => {
        let weight = 1.1 + player.attributes.heading / 40;
        if (player.position === "ST") weight = 8 + player.attributes.finishing / 12;
        if (["RW", "LW", "AM"].includes(player.position)) weight = 5 + player.attributes.finishing / 16;
        if (["CM", "DM"].includes(player.position)) weight = 2.2 + player.attributes.longShots / 30;
        return weight * tacticalScorerMultiplier(player, tactical);
      });
      const assist = chanceWeightedPlayer(
        state,
        lineup.filter((player) => player.id !== scorer.id),
        (player) => {
          let weight = 1.8 + player.attributes.passing / 32;
          if (["AM", "CM", "RW", "LW"].includes(player.position)) weight = 7 + player.attributes.passing / 12 + player.attributes.vision / 18;
          if (["RB", "LB"].includes(player.position)) weight = 4 + player.attributes.crossing / 14;
          return weight * tacticalAssistMultiplier(player, tactical);
        }
      );
      events.push({
        minute: randomInt(state, 4, 90),
        clubId: club.id,
        playerId: scorer.id,
        assistId: assist ? assist.id : null,
        fixtureId: fixture.id
      });
    }
    return events;
  }

  function tacticalScorerMultiplier(player, tactical) {
    const focus = tactical && tactical.tactics ? tactical.tactics.focus : "mixed";
    if (focus === "central" && ["ST", "AM", "CM"].includes(player.position)) return 1.18;
    if (focus === "flanks" && ["RW", "LW", "ST"].includes(player.position)) return 1.16;
    if (focus === "setPieces" && ["CB", "ST", "DM"].includes(player.position)) return 1.2 + (player.attributes.heading + player.attributes.jumping) / 320;
    if (focus === "counter" && ["ST", "RW", "LW", "AM"].includes(player.position)) return 1.14 + (player.attributes.pace + player.attributes.acceleration) / 420;
    return 1;
  }

  function tacticalAssistMultiplier(player, tactical) {
    const focus = tactical && tactical.tactics ? tactical.tactics.focus : "mixed";
    if (focus === "central" && ["CM", "AM", "DM"].includes(player.position)) return 1.2;
    if (focus === "flanks" && ["RB", "LB", "RW", "LW"].includes(player.position)) return 1.22;
    if (focus === "setPieces" && ["RB", "LB", "CM", "AM"].includes(player.position)) return 1.12 + player.attributes.crossing / 280;
    if (focus === "counter" && ["CM", "AM", "RW", "LW"].includes(player.position)) return 1.12 + player.attributes.vision / 340;
    return 1;
  }

  function buildCommentary(state, homeClub, awayClub, homeLineup, awayLineup, goalEvents) {
    const events = [
      { minute: 1, title: "Kick Off", text: pick(state, Data.COMMENTARY.kickoff) }
    ];

    goalEvents.forEach((goal) => {
      const scorer = state.players[goal.playerId];
      events.push({
        minute: goal.minute,
        title: "Goal",
        text: template(pick(state, Data.COMMENTARY.goal), { player: scorer.name, team: getClub(state, goal.clubId).name })
      });
    });

    const totalExtra = randomInt(state, 7, 12);
    const allPlayers = homeLineup.concat(awayLineup);
    for (let i = 0; i < totalExtra; i += 1) {
      const player = pick(state, allPlayers);
      const club = getClub(state, player.clubId);
      const typeRoll = random(state);
      const type = typeRoll > 0.78 ? "card" : typeRoll > 0.52 ? "save" : typeRoll > 0.28 ? "chance" : "close";
      events.push({
        minute: randomInt(state, 6, 88),
        title: type === "card" ? "Yellow Card" : type === "save" ? "Save" : type === "chance" ? "Chance" : "Close",
        text: template(pick(state, Data.COMMENTARY[type]), { player: player.name, team: club.name })
      });
    }

    events.push({ minute: 90, title: "Full Time", text: pick(state, Data.COMMENTARY.fullTime) });
    return events.sort((a, b) => a.minute - b.minute || a.title.localeCompare(b.title));
  }

  function template(text, values) {
    return text.replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
  }

  function buildRatings(state, fixture, homeLineup, awayLineup, goals, homeGoals, awayGoals, homeTactical, awayTactical) {
    const contribution = new Map();
    goals.forEach((goal) => {
      contribution.set(goal.playerId, (contribution.get(goal.playerId) || 0) + 0.78);
      if (goal.assistId) contribution.set(goal.assistId, (contribution.get(goal.assistId) || 0) + 0.42);
    });

    function rate(player, isHome) {
      const goalsFor = isHome ? homeGoals : awayGoals;
      const goalsAgainst = isHome ? awayGoals : homeGoals;
      const tactical = isHome ? homeTactical : awayTactical;
      const resultLift = goalsFor > goalsAgainst ? 0.34 : goalsFor === goalsAgainst ? 0.05 : -0.22;
      const cleanSheet = goalsAgainst === 0 && ["GK", "RB", "CB", "LB", "DM"].includes(player.position) ? 0.24 : 0;
      const systemLift = tacticalRatingLift(player, tactical);
      const roleNoise = randomFloat(state, -0.38, 0.48);
      const rating = clamp(6.32 + resultLift + cleanSheet + systemLift + (contribution.get(player.id) || 0) + roleNoise, 4.8, 9.8);
      return {
        playerId: player.id,
        clubId: player.clubId,
        rating: round(rating, 1)
      };
    }

    return homeLineup.map((player) => rate(player, true)).concat(awayLineup.map((player) => rate(player, false)));
  }

  function tacticalRatingLift(player, tactical) {
    const tactics = tactical && tactical.tactics ? tactical.tactics : DEFAULT_TACTICS;
    let lift = 0;
    if (tactics.pressing === "high" && ["DM", "CM", "AM", "RW", "LW"].includes(player.position)) lift += player.attributes.workRate > 70 ? 0.08 : -0.03;
    if (tactics.pressing === "relentless") lift += player.attributes.stamina > 74 ? 0.1 : -0.08;
    if (tactics.tempo === "patient" && ["DM", "CM", "AM"].includes(player.position)) lift += player.attributes.decisions > 70 ? 0.08 : 0;
    if (tactics.tempo === "vertical" && ["ST", "RW", "LW", "AM"].includes(player.position)) lift += player.attributes.pace > 72 ? 0.07 : -0.02;
    if (tactics.focus === "central" && ["CM", "AM", "ST"].includes(player.position)) lift += 0.05;
    if (tactics.focus === "flanks" && ["RB", "LB", "RW", "LW"].includes(player.position)) lift += 0.06;
    if (tactics.focus === "setPieces" && ["CB", "ST"].includes(player.position)) lift += player.attributes.heading > 72 ? 0.07 : 0;
    if (tactics.focus === "counter" && ["ST", "RW", "LW"].includes(player.position)) lift += player.attributes.acceleration > 72 ? 0.06 : 0;
    return lift;
  }

  function updateAfterFixture(state, fixture) {
    const homeClub = getClub(state, fixture.homeClubId);
    const awayClub = getClub(state, fixture.awayClubId);
    const homeWon = fixture.homeGoals > fixture.awayGoals;
    const awayWon = fixture.awayGoals > fixture.homeGoals;
    let roleMilestoneNotified = false;
    pushForm(homeClub, homeWon ? "W" : awayWon ? "L" : "D");
    pushForm(awayClub, awayWon ? "W" : homeWon ? "L" : "D");
    if (!fixture.competitionType) updateBiggestWinRecord(state, fixture);

    fixture.playerRatings.forEach((rating) => {
      const player = state.players[rating.playerId];
      if (!player) return;
      player.seasonStats.apps += 1;
      player.seasonStats.ratingTotal += rating.rating;
      player.seasonStats.ratingApps += 1;
      player.careerTotals.apps += 1;
      player.careerTotals.ratingTotal += rating.rating;
      player.careerTotals.ratingApps += 1;
      const started = rating.started !== false;
      const minutesPlayed = Number.isFinite(rating.minutes) ? rating.minutes : started ? 90 : 0;
      if (started) {
        player.seasonStats.starts += 1;
        player.careerTotals.starts += 1;
      }
      addPlayerStat(player.seasonStats, "minutes", minutesPlayed);
      addPlayerStat(player.careerTotals, "minutes", minutesPlayed);
      const matchStats = fixture.playerStats && fixture.playerStats[player.id] ? fixture.playerStats[player.id] : null;
      if (matchStats) {
        addPlayerStat(player.seasonStats, "yellows", matchStats.yellowCards);
        addPlayerStat(player.careerTotals, "yellows", matchStats.yellowCards);
        addPlayerStat(player.seasonStats, "reds", matchStats.redCards);
        addPlayerStat(player.careerTotals, "reds", matchStats.redCards);
        addPlayerStat(player.seasonStats, "shots", matchStats.shots);
        addPlayerStat(player.careerTotals, "shots", matchStats.shots);
        addPlayerStat(player.seasonStats, "shotsOnTarget", matchStats.shotsOnTarget);
        addPlayerStat(player.careerTotals, "shotsOnTarget", matchStats.shotsOnTarget);
        addPlayerStat(player.seasonStats, "xG", matchStats.xG);
        addPlayerStat(player.careerTotals, "xG", matchStats.xG);
        addPlayerStat(player.seasonStats, "keyPasses", matchStats.keyPasses);
        addPlayerStat(player.careerTotals, "keyPasses", matchStats.keyPasses);
        addPlayerStat(player.seasonStats, "tacklesWon", matchStats.tacklesWon);
        addPlayerStat(player.careerTotals, "tacklesWon", matchStats.tacklesWon);
        addPlayerStat(player.seasonStats, "interceptions", matchStats.interceptions);
        addPlayerStat(player.careerTotals, "interceptions", matchStats.interceptions);
        addPlayerStat(player.seasonStats, "mistakes", matchStats.mistakes);
        addPlayerStat(player.careerTotals, "mistakes", matchStats.mistakes);
        applyDisciplinarySuspension(state, player, matchStats, fixture);
      }
      player.form.push(rating.rating);
      player.form = player.form.slice(-5);
      const club = getClub(state, player.clubId);
      const tactical = tacticalProfile(club);
      player.fitness = Math.round(clamp(player.fitness - randomInt(state, 5, 13) - tactical.fatigue, 30, 100));
      player.sharpness = Math.round(clamp(player.sharpness + randomInt(state, 2, 8), 0, 100));
      player.morale = Math.round(clamp(player.morale + (rating.rating >= 7 ? 3 : rating.rating < 6 ? -3 : 0), 0, 100));
      const roleContext = playerRoleSlotContext(state, player.id, player.clubId);
      if (roleContext && minutesPlayed > 0) {
        const masteryGain = 0.28 + minutesPlayed / 210 + Math.max(0, rating.rating - 6.5) * 0.18;
        const milestone = improveRoleDevelopment(state, player, roleContext, masteryGain, "match");
        if (milestone && !roleMilestoneNotified && player.clubId === state.activeClubId) {
          roleMilestoneNotified = true;
          addInbox(state, "Role Milestone", `${player.name} reached ${Math.round(milestone.mastery)} mastery in ${milestone.label} after the match.`);
        }
      }
      if ((player.clubId === fixture.homeClubId && fixture.awayGoals === 0) || (player.clubId === fixture.awayClubId && fixture.homeGoals === 0)) {
        if (["GK", "RB", "CB", "LB"].includes(player.position)) {
          player.seasonStats.cleanSheets += 1;
          player.careerTotals.cleanSheets += 1;
        }
      }
    });

    fixture.goals.forEach((goal) => {
      const scorer = state.players[goal.playerId];
      if (scorer) {
        scorer.seasonStats.goals += 1;
        scorer.careerTotals.goals += 1;
      }
      if (goal.assistId) {
        const assister = state.players[goal.assistId];
        if (assister) {
          assister.seasonStats.assists += 1;
          assister.careerTotals.assists += 1;
        }
      }
    });

    if (fixture.manOfMatch && state.players[fixture.manOfMatch]) {
      state.players[fixture.manOfMatch].seasonStats.motm += 1;
      state.players[fixture.manOfMatch].careerTotals.motm += 1;
    }

    if (fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId) {
      const activeHome = fixture.homeClubId === state.activeClubId;
      const gf = activeHome ? fixture.homeGoals : fixture.awayGoals;
      const ga = activeHome ? fixture.awayGoals : fixture.homeGoals;
      state.manager.goalsFor += gf;
      state.manager.goalsAgainst += ga;
      if (gf > ga) state.manager.wins += 1;
      else if (gf === ga) state.manager.draws += 1;
      else state.manager.losses += 1;
      state.manager.reputation = Math.round(clamp(state.manager.reputation + (gf > ga ? 0.6 : gf === ga ? 0.12 : -0.25), 1, 100));
      state.lastMatch = JSON.parse(JSON.stringify(fixture));
    }
  }

  function addPlayerStat(stats, key, value) {
    stats[key] = (stats[key] || 0) + (Number(value) || 0);
  }

  function applyMatchInjuries(state, fixture, players) {
    players.forEach((player) => {
      const club = getClub(state, player.clubId);
      const tactical = tacticalProfile(club);
      const fatigueRisk = player.fitness < 55 ? 0.012 : player.fitness < 70 ? 0.006 : 0.003;
      const ageRisk = player.age > 31 ? 0.003 : 0;
      const resistance = averageExisting(player.attributes || {}, ["injuryResistance", "naturalFitness", "stamina"], 58);
      const resistanceFactor = clamp(1.22 - resistance / 135, 0.52, 1.08);
      if (random(state) > (fatigueRisk + ageRisk) * tactical.injuryRisk * resistanceFactor) return;
      const duration = randomInt(state, 1, player.fitness < 55 ? 8 : 5);
      const types = duration >= 6 ? ["Hamstring strain", "Ankle injury", "Knee sprain"] : ["Knock", "Tight calf", "Bruised foot", "Minor strain"];
      const returnPoint = injuryReturnPoint(state, duration);
      player.injury = {
        type: pick(state, types),
        returnSeason: returnPoint.season,
        returnRound: returnPoint.round,
        returnDate: returnPoint.date,
        fixtureId: fixture.id
      };
      player.fitness = Math.round(clamp(player.fitness - randomInt(state, 12, 26), 10, 70));
      player.seasonStats.injuries += 1;
      player.careerTotals.injuries += 1;
      if (player.clubId === state.activeClubId) {
        addInbox(state, "Injury Update", `${player.name} suffered a ${player.injury.type} and is expected back in ${duration} week${duration === 1 ? "" : "s"}.`);
      }
    });
  }

  function injuryReturnPoint(state, duration) {
    ensureCalendar(state);
    const returnDate = addDays(state.calendar.currentDate, duration * 7);
    const seasonLength = state.league.schedule.length || 38;
    let returnRound = state.league.schedule.findIndex((roundData) => compareDates(roundData.date, returnDate) >= 0);
    if (returnRound < 0) returnRound = state.league.currentRound + duration;
    let returnSeason = state.season;
    while (returnRound >= seasonLength) {
      returnRound -= seasonLength;
      returnSeason += 1;
    }
    return { season: returnSeason, round: returnRound, date: returnDate };
  }

  function suspensionReturnPoint(state, clubId, fromDate) {
    ensureCalendar(state);
    const date = fromDate || state.calendar.currentDate;
    const fixture = state.league.schedule
      .flatMap((roundData) => roundData.fixtures.map((fixture) => ({ ...fixture, roundNumber: roundData.number, roundDate: roundData.date })))
      .filter((fixture) => !fixture.played && fixture.date && compareDates(fixture.date, date) > 0 && (fixture.homeClubId === clubId || fixture.awayClubId === clubId))
      .sort((a, b) => compareDates(a.date, b.date))[0];
    const returnDate = fixture ? addDays(fixture.date, 1) : addDays(date, 14);
    const returnRound = fixture ? Math.max(0, (fixture.roundNumber || state.league.currentRound + 1) - 1) : state.league.currentRound + 2;
    return { season: state.season, round: returnRound, date: returnDate };
  }

  function applyDisciplinarySuspension(state, player, matchStats, fixture) {
    if (!player || !matchStats) return;
    let type = null;
    if ((matchStats.redCards || 0) > 0) type = "Red card";
    else if ((matchStats.yellowCards || 0) > 0 && player.seasonStats.yellows > 0 && player.seasonStats.yellows % 5 === 0) type = "Yellow accumulation";
    if (!type) return;
    const returnPoint = suspensionReturnPoint(state, player.clubId, fixture.date || (state.calendar && state.calendar.currentDate));
    player.suspension = {
      type,
      matches: 1,
      returnSeason: returnPoint.season,
      returnRound: returnPoint.round,
      returnDate: returnPoint.date,
      fixtureId: fixture.id
    };
    if (player.clubId === state.activeClubId) {
      addInbox(state, "Suspension", `${player.name} is suspended for the next match after ${type.toLowerCase()}.`);
    }
  }

  function pushForm(club, result) {
    club.form.push(result);
    club.form = club.form.slice(-5);
  }

  function updateBiggestWinRecord(state, fixture) {
    const margin = Math.abs(fixture.homeGoals - fixture.awayGoals);
    if (!margin) return;
    const record = state.league.records.biggestWin;
    if (!record || margin > record.margin) {
      state.league.records.biggestWin = {
        season: state.season,
        fixtureId: fixture.id,
        margin,
        homeClubId: fixture.homeClubId,
        awayClubId: fixture.awayClubId,
        score: `${fixture.homeGoals}-${fixture.awayGoals}`
      };
    }
  }

  function calculateTable(state) {
    const rows = state.league.clubs.map((club) => ({
      clubId: club.id,
      clubName: club.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: club.form.slice(-5)
    }));
    const byClub = new Map(rows.map((row) => [row.clubId, row]));

    state.league.schedule.forEach((roundData) => {
      roundData.fixtures.forEach((fixture) => {
        if (!fixture.played) return;
        const home = byClub.get(fixture.homeClubId);
        const away = byClub.get(fixture.awayClubId);
        home.played += 1;
        away.played += 1;
        home.goalsFor += fixture.homeGoals;
        home.goalsAgainst += fixture.awayGoals;
        away.goalsFor += fixture.awayGoals;
        away.goalsAgainst += fixture.homeGoals;
        if (fixture.homeGoals > fixture.awayGoals) {
          home.wins += 1;
          away.losses += 1;
          home.points += 3;
        } else if (fixture.homeGoals < fixture.awayGoals) {
          away.wins += 1;
          home.losses += 1;
          away.points += 3;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }
      });
    });

    rows.forEach((row) => {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
    });

    return rows.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.clubName.localeCompare(b.clubName));
  }

  function ensureCalendar(state) {
    state.calendar = { ...createSeasonCalendar(state.season || 1), ...(state.calendar || {}) };
    ensureScheduleDates(state);
    return state.calendar;
  }

  function ensureScheduleDates(state) {
    if (!state.league || !state.league.schedule || !state.league.schedule.length) return;
    const calendar = state.calendar || createSeasonCalendar(state.season || 1);
    state.league.schedule.forEach((roundData, index) => {
      const date = roundData.date || roundDateForIndex(calendar.seasonStartDate, index);
      roundData.date = date;
      (roundData.fixtures || []).forEach((fixture) => {
        fixture.date = fixture.date || date;
      });
    });
    const lastRound = state.league.schedule[state.league.schedule.length - 1];
    if (lastRound && (!calendar.seasonEndDate || compareDates(lastRound.date, calendar.seasonEndDate) > 0)) {
      calendar.seasonEndDate = addDays(lastRound.date, 7);
    }
    state.calendar = calendar;
  }

  function syncCurrentRound(state) {
    const index = state.league.schedule.findIndex((roundData) => roundData.fixtures.some((fixture) => !fixture.played));
    state.league.currentRound = index === -1 ? state.league.schedule.length : index;
    return state.league.currentRound;
  }

  function allFixturesPlayed(state) {
    const leagueDone = state.league.schedule.every((roundData) => roundData.fixtures.every((fixture) => fixture.played));
    const cup = ensureDomesticCupState(state);
    const europe = ensureEuropeState(state).competition;
    return leagueDone && (!cup || cup.status === "complete") && (!europe || europe.status === "complete");
  }

  function processInjuryReturns(state) {
    Object.values(state.players).forEach((player) => {
      normalizePlayerState(player);
      if (player.injury && !isInjured(state, player)) {
        const injuryType = player.injury.type || "injury";
        player.injury = null;
        player.individualPlan = player.individualPlan === "rehab" ? "recovery" : player.individualPlan;
        player.fitness = Math.round(clamp(Math.max(player.fitness, 58) + randomInt(state, 0, 8), 0, 100));
        player.sharpness = Math.round(clamp(player.sharpness - randomInt(state, 2, 7), 0, 100));
        if (player.clubId === state.activeClubId) {
          addInbox(state, "Player Returned", `${player.name} has returned from ${injuryType}.`);
        }
      }
      if (player.suspension && !isSuspended(state, player)) {
        const suspensionType = player.suspension.type || "suspension";
        player.suspension = null;
        if (player.clubId === state.activeClubId) {
          addInbox(state, "Suspension Served", `${player.name} is available after ${suspensionType.toLowerCase()}.`);
        }
      }
    });
  }

  function trainingSessionForClub(state, clubId, date) {
    ensureCalendar(state);
    const club = normalizeTrainingSetup(getClub(state, clubId));
    const currentDate = date || state.calendar.currentDate;
    const plan = TRAINING_PLANS[club && club.trainingPlan] || TRAINING_PLANS.balanced;
    const prep = MATCH_PREP[club && club.matchPrep] || MATCH_PREP.balanced;
    const staff = staffEffectsForClub(state, clubId);
    const daysToNext = daysUntilNextFixture(state, clubId, currentDate);
    const daysSinceLast = daysSinceLastFixture(state, clubId, currentDate);
    const day = parseDate(currentDate).getUTCDay();
    let type = plan.label;
    let loadMultiplier = 1;
    let recoveryBonus = 0;
    let sharpnessBonus = 0;
    let injuryMultiplier = 1;

    if (daysToNext === 0) {
      type = "Matchday Activation";
      loadMultiplier = 0.12;
      recoveryBonus = 0.2;
      sharpnessBonus = 1.1;
      injuryMultiplier = 0.24;
    } else if (daysSinceLast === 1) {
      type = "Post-Match Recovery";
      loadMultiplier = 0.18;
      recoveryBonus = 2.6;
      sharpnessBonus = -0.3;
      injuryMultiplier = 0.36;
    } else if (daysToNext === 1) {
      type = "Pre-Match Taper";
      loadMultiplier = 0.35;
      recoveryBonus = 1.1;
      sharpnessBonus = 1.2;
      injuryMultiplier = 0.42;
    } else if (day === 0 && daysToNext !== 2) {
      type = "Rest Day";
      loadMultiplier = 0;
      recoveryBonus = 3.4;
      sharpnessBonus = -0.8;
      injuryMultiplier = 0.08;
    }

    const load = plan.load * loadMultiplier;
    return {
      date: currentDate,
      type,
      planKey: club ? club.trainingPlan : "balanced",
      planLabel: plan.label,
      prepKey: club ? club.matchPrep : "balanced",
      prepLabel: prep.label,
      load,
      recovery: plan.recovery + recoveryBonus + staff.recoveryBonus,
      sharpness: plan.sharpness + prep.sharpness + sharpnessBonus + staff.sharpnessBonus,
      morale: plan.morale,
      injuryRisk: plan.injuryRisk * injuryMultiplier * staff.injuryRiskMultiplier,
      growthRate: plan.growthRate * loadMultiplier * staff.coachingGrowthMultiplier,
      familiarity: (plan.familiarity * loadMultiplier + prep.familiarity * (daysToNext !== null && daysToNext <= 6 ? 1.35 : 0.75)) * staff.familiarityMultiplier,
      staffEffects: staff,
      attributes: plan.attributes,
      daysToNext,
      daysSinceLast
    };
  }

  function recoverSquadsDaily(state) {
    const reports = {};
    allCompetitionClubs(state).forEach((club) => {
      normalizeTrainingSetup(club);
      const session = trainingSessionForClub(state, club.id);
      const report = {
        date: session.date,
        type: session.type,
        plan: session.planKey,
        planLabel: session.planLabel,
        matchPrep: session.prepKey,
        matchPrepLabel: session.prepLabel,
        load: round(session.load, 2),
        injuries: 0,
        development: 0,
        growth: [],
        averageFitness: 0,
        averageSharpness: 0
      };
      clubPlayers(state, club.id).forEach((player) => applyTrainingToPlayer(state, club, player, session, report));
      const squad = clubPlayers(state, club.id);
      report.averageFitness = round(average(squad.map((player) => player.fitness)), 1);
      report.averageSharpness = round(average(squad.map((player) => player.sharpness)), 1);
      club.trainingReport = report;
      reports[club.id] = report;
    });
    return reports;
  }

  function applyTrainingToPlayer(state, club, player, session, report) {
    normalizePlayerState(player);
    const individual = INDIVIDUAL_PLANS[player.individualPlan] || INDIVIDUAL_PLANS.normal;
    if (isInjured(state, player)) {
      const rehabBoost = player.individualPlan === "rehab" ? individual.recovery : 0;
      player.fitness = Math.round(clamp(player.fitness + randomInt(state, 0, 1) + rehabBoost, 0, 84));
      player.sharpness = Math.round(clamp(player.sharpness - randomInt(state, 0, 2) + individual.sharpness, 0, 100));
      return;
    }
    const natural = averageExisting(player.attributes || {}, ["naturalFitness", "stamina", "injuryResistance"], 60);
    const baseRecovery = player.fitness < 62 ? randomFloat(state, 2.2, 5.2) : randomFloat(state, 0.8, 2.8);
    const naturalLift = natural >= 76 ? 0.8 : natural < 55 ? -0.7 : 0;
    const load = session.load * individual.loadMultiplier;
    const loadCost = load * (player.age > 31 ? 1.18 : player.age < 23 ? 0.92 : 1);
    const fitnessDelta = baseRecovery + naturalLift + session.recovery + individual.recovery - loadCost;
    const sharpnessDelta = session.sharpness + individual.sharpness + (load > 0 ? randomFloat(state, -0.4, 0.8) : 0);
    player.fitness = Math.round(clamp(player.fitness + fitnessDelta, 0, 100));
    player.sharpness = Math.round(clamp(player.sharpness + sharpnessDelta, 0, 100));
    player.morale = Math.round(clamp(player.morale + session.morale + individual.morale + (session.type === "Rest Day" ? 0.5 : 0), 0, 100));
    const individualSession = {
      ...session,
      load,
      growthRate: session.growthRate * individual.growthMultiplier,
      injuryRisk: session.injuryRisk * individual.injuryRisk
    };
    maybeApplyTrainingGrowth(state, player, individualSession, report);
    maybeApplyTrainingInjury(state, club, player, individualSession, report);
  }

  function maybeApplyTrainingGrowth(state, player, session, report) {
    if (!session.growthRate || !session.attributes || !session.attributes.length) return;
    const ageFactor = player.age <= 21 ? 1.75 : player.age <= 25 ? 1.25 : player.age <= 29 ? 0.8 : 0.35;
    const ceiling = Math.max(player.currentAbility, player.potential || player.currentAbility);
    if (random(state) > session.growthRate * ageFactor * clamp((ceiling - player.currentAbility + 8) / 20, 0.2, 1.4)) return;
    const focusPool = TRAINING_FOCUS[player.trainingFocus] && TRAINING_FOCUS[player.trainingFocus].length ? TRAINING_FOCUS[player.trainingFocus] : [];
    const pool = session.attributes.concat(focusPool);
    const key = pick(state, pool);
    if (!player.attributes[key]) return;
    const before = player.attributes[key];
    const beforeAbility = player.currentAbility;
    player.attributes[key] = Math.round(clamp(player.attributes[key] + 1, 18, 99));
    player.currentAbility = calculateAbilityFromAttributes(player);
    player.value = calculatePlayerValue(player);
    const event = {
      date: session.date,
      attribute: key,
      before,
      after: player.attributes[key],
      abilityBefore: beforeAbility,
      abilityAfter: player.currentAbility,
      plan: session.planKey,
      focus: player.trainingFocus
    };
    player.developmentEvents.push(event);
    player.developmentEvents = player.developmentEvents.slice(-12);
    if (report) {
      report.development += 1;
      report.growth.push({
        playerId: player.id,
        playerName: player.name,
        attribute: key,
        before,
        after: player.attributes[key]
      });
      report.growth = report.growth.slice(-6);
    }
  }

  function maybeApplyTrainingInjury(state, club, player, session, report) {
    if (!session.injuryRisk || session.type === "Rest Day") return;
    const resistance = averageExisting(player.attributes || {}, ["injuryResistance", "naturalFitness", "stamina"], 60);
    const fatigue = player.fitness < 58 ? 1.9 : player.fitness < 72 ? 1.25 : 0.82;
    const ageRisk = player.age > 31 ? 1.3 : 1;
    const risk = 0.00085 * session.injuryRisk * Math.max(0.25, session.load) * fatigue * ageRisk * clamp(1.2 - resistance / 135, 0.52, 1.12);
    if (random(state) > risk) return;
    const duration = randomInt(state, 1, session.load > 1.8 ? 4 : 2);
    const returnPoint = injuryReturnPoint(state, duration);
    const types = session.load > 1.7 ? ["Training strain", "Hamstring tightness", "Calf strain"] : ["Training knock", "Minor tightness"];
    player.injury = {
      type: pick(state, types),
      returnSeason: returnPoint.season,
      returnRound: returnPoint.round,
      returnDate: returnPoint.date,
      fixtureId: `training-${session.date}`
    };
    player.fitness = Math.round(clamp(player.fitness - randomInt(state, 8, 18), 10, 76));
    player.seasonStats.injuries += 1;
    player.careerTotals.injuries += 1;
    report.injuries += 1;
    if (club.id === state.activeClubId) {
      addInbox(state, "Training Injury", `${player.name} picked up ${player.injury.type} in ${session.planLabel.toLowerCase()} training.`);
    }
  }

  function updateMatchPrepFamiliarity(state) {
    allCompetitionClubs(state).forEach((club) => {
      normalizeTrainingSetup(club);
      const session = trainingSessionForClub(state, club.id);
      Object.keys(MATCH_PREP).forEach((key) => {
        const decay = key === club.matchPrep ? 0 : 0.28;
        club.matchPrepFamiliarity[key] = round(clamp((club.matchPrepFamiliarity[key] || 0) - decay, 0, 100), 1);
      });
      club.matchPrepFamiliarity[club.matchPrep] = round(clamp((club.matchPrepFamiliarity[club.matchPrep] || 0) + session.familiarity, 0, 100), 1);
    });
  }

  function fixtureForClubOnDate(state, clubId, date) {
    for (const roundData of state.league.schedule || []) {
      const fixture = (roundData.fixtures || []).find((item) => !item.played && item.date === date && (item.homeClubId === clubId || item.awayClubId === clubId));
      if (fixture) return fixture;
    }
    const cupFixture = domesticCupFixtures(state).find((item) => !item.played && item.date === date && (item.homeClubId === clubId || item.awayClubId === clubId));
    if (cupFixture) return cupFixture;
    const europeFixture = europeanFixtures(state).find((item) => !item.played && item.date === date && (item.homeClubId === clubId || item.awayClubId === clubId));
    if (europeFixture) return europeFixture;
    return null;
  }

  function getTrainingCalendar(state, clubId, days) {
    ensureCalendar(state);
    const count = days || 10;
    const club = normalizeTrainingSetup(getClub(state, clubId));
    if (!club) return [];
    return Array.from({ length: count }, (_, index) => {
      const date = addDays(state.calendar.currentDate, index);
      const fixture = fixtureForClubOnDate(state, clubId, date);
      const session = trainingSessionForClub(state, clubId, date);
      return {
        date,
        label: formatGameDate(date),
        type: fixture ? "Matchday" : session.type,
        plan: session.planKey,
        planLabel: session.planLabel,
        matchPrep: session.prepKey,
        matchPrepLabel: session.prepLabel,
        load: round(session.load, 2),
        fixtureId: fixture ? fixture.id : null,
        opponentId: fixture ? (fixture.homeClubId === clubId ? fixture.awayClubId : fixture.homeClubId) : null,
        venue: fixture ? (fixture.homeClubId === clubId ? "Home" : "Away") : null
      };
    });
  }

  function trainingRecommendations(state, clubId) {
    ensureCalendar(state);
    const club = normalizeTrainingSetup(getClub(state, clubId));
    if (!club) return [];
    const squad = clubPlayers(state, clubId);
    const avgFitness = round(average(squad.map((player) => player.fitness || 75)), 1);
    const avgSharpness = round(average(squad.map((player) => player.sharpness || 55)), 1);
    const injured = squad.filter((player) => isInjured(state, player));
    const tired = squad.filter((player) => !isInjured(state, player) && player.fitness < 68);
    const daysToNext = daysUntilNextFixture(state, clubId);
    const report = club.trainingReport;
    const recs = [];
    if (daysToNext === 0) recs.push({ tone: "green", title: "Matchday", body: `${matchPrepLabel(club.matchPrep)} is locked in for today's fixture.` });
    if (daysToNext !== null && daysToNext <= 2 && club.trainingPlan !== "recovery") recs.push({ tone: "amber", title: "Taper Load", body: "Recovery training is advised inside 48 hours of a match." });
    if (avgFitness < 70) recs.push({ tone: "amber", title: "Squad Fatigue", body: `Average fitness is ${avgFitness}%. Reduce load to protect availability.` });
    if (avgSharpness < 52 && avgFitness > 78) recs.push({ tone: "blue", title: "Sharpness", body: "The squad is fresh enough for tactical or attacking work." });
    if (injured.length >= 3) recs.push({ tone: "red", title: "Injury List", body: `${injured.length} players are unavailable. Avoid physical blocks.` });
    if (tired.length >= 5) recs.push({ tone: "amber", title: "Recovery Group", body: `${tired.length} players are under 68% fitness.` });
    if (club.trainingPlan === "physical" && daysToNext !== null && daysToNext <= 5) recs.push({ tone: "red", title: "Heavy Load", body: "Physical training this close to a match increases injury risk." });
    if (report && report.injuries > 0) recs.push({ tone: "red", title: "Training Injury", body: `${report.injuries} training injury${report.injuries === 1 ? "" : "ies"} reported yesterday.` });
    if (!recs.length) recs.push({ tone: "green", title: "Staff View", body: "Current load is appropriate for the upcoming fixture rhythm." });
    return recs.slice(0, 6);
  }

  function processScoutingAssignmentsDaily(state) {
    ensureScoutingState(state);
    let event = null;
    state.scouting.assignments.forEach((assignment) => {
      if (assignment.status !== "active") return;
      if (assignment.type === "region") {
        event = event || advanceRegionalScoutingAssignment(state, assignment, 1);
        return;
      }
      assignment.daysRemaining = assignment.daysRemaining === undefined ? Math.max(7, (assignment.roundsRemaining || 3) * 7) : assignment.daysRemaining;
      const before = assignment.daysRemaining;
      const staff = staffEffectsForClub(state, state.activeClubId);
      assignment.daysRemaining = Math.max(0, assignment.daysRemaining - 1 / staff.scoutingDaysMultiplier);
      assignment.roundsRemaining = Math.ceil(assignment.daysRemaining / 7);
      if (Math.floor(before / 5) !== Math.floor(assignment.daysRemaining / 5) || assignment.daysRemaining === 0) {
        scoutPlayer(state, assignment.playerId, "assignment");
      }
      if (assignment.daysRemaining <= 0) {
        assignment.status = "complete";
        assignment.completedSeason = state.season;
        assignment.completedRound = state.league.currentRound + 1;
        assignment.completedDate = state.calendar ? state.calendar.currentDate : null;
        const player = getPlayer(state, assignment.playerId);
        const report = player ? state.scouting.reports[player.id] : null;
        if (player && report) {
          addInbox(state, "Scout Report Complete", `${player.name}'s report reached ${report.confidence}% confidence.`);
        }
        event = event || { type: "scouting", title: "Scout Report Complete", playerId: player ? player.id : assignment.playerId };
      }
    });
    state.scouting.assignments = state.scouting.assignments.slice(0, 30);
    return event;
  }

  function maybeGenerateDailyAiOffer(state) {
    const window = transferWindowStatus(state);
    const chance = window.isOpen ? window.isDeadlineDay ? 0.22 : 0.085 : 0.025;
    if (random(state) > chance) return null;
    return maybeGenerateAiOffer(state);
  }

  function maybeProcessDailyAiClubTransfer(state) {
    const window = transferWindowStatus(state);
    if (!window.isOpen) return null;
    const chance = dailyAiMarketChance(state, window);
    if (random(state) > chance) return null;
    return processAiClubMarketActivity(state, {
      allowRumor: true,
      allowBid: true,
      allowFailed: true,
      allowDeadlineStory: true,
      allowLoan: true
    });
  }

  function maybeGenerateDailyClubEvent(state) {
    const club = getClub(state, state.activeClubId);
    if (!club || random(state) > 0.11) return null;
    const squad = clubPlayers(state, club.id).filter((player) => !isUnavailable(state, player));
    if (!squad.length) return null;
    const roll = random(state);
    if (roll < 0.32) {
      const player = pick(state, squad.slice().sort((a, b) => b.potential - b.currentAbility - (a.potential - a.currentAbility)).slice(0, 8));
      player.sharpness = Math.round(clamp(player.sharpness + randomInt(state, 3, 7), 0, 100));
      player.morale = Math.round(clamp(player.morale + randomInt(state, 2, 6), 0, 100));
      addInbox(state, "Training Standout", `${player.name} impressed staff in training and looks sharper for the next match.`);
      return { type: "training", title: "Training Standout", playerId: player.id };
    }
    if (roll < 0.58) {
      const leaders = squad.slice().sort((a, b) => b.currentAbility + b.morale - (a.currentAbility + a.morale)).slice(0, 6);
      const player = pick(state, leaders);
      squad.forEach((item) => {
        if (random(state) < 0.28) item.morale = Math.round(clamp(item.morale + randomInt(state, 1, 4), 0, 100));
      });
      addInbox(state, "Squad Mood", `${player.name} helped lift the dressing room after a strong team meeting.`);
      return { type: "morale", title: "Squad Mood", playerId: player.id };
    }
    if (roll < 0.78) {
      const player = pick(state, squad.slice().sort((a, b) => b.seasonStats.ratingTotal - a.seasonStats.ratingTotal).slice(0, 10));
      player.morale = Math.round(clamp(player.morale + randomInt(state, 1, 5), 0, 100));
      addInbox(state, "Media Watch", `${player.name} drew positive media attention ahead of the next fixture.`);
      return { type: "media", title: "Media Watch", playerId: player.id };
    }
    const candidates = squad.filter((player) => player.fitness > 52 && !player.injury);
    const player = candidates.length ? pick(state, candidates) : pick(state, squad);
    player.fitness = Math.round(clamp(player.fitness - randomInt(state, 5, 11), 0, 100));
    player.sharpness = Math.round(clamp(player.sharpness - randomInt(state, 1, 4), 0, 100));
    addInbox(state, "Minor Knock", `${player.name} took a knock in training. Medical staff expect them to be available, but fitness has dipped.`);
    return { type: "knock", title: "Minor Knock", playerId: player.id };
  }

  function processSquadHappinessDaily(state) {
    const club = getClub(state, state.activeClubId);
    if (!club || !state.calendar) return null;
    const day = state.calendar.day || 1;
    let event = null;
    const squad = clubPlayers(state, club.id);
    squad.forEach((player) => {
      normalizePlayerState(player);
      const report = playerHappinessReport(state, player.id);
      if (!report) return;
      const promise = player.promises.playingTime;
      if (promise && promise.status === "active") {
        if (report.playingTime.pressure <= 16) {
          promise.status = "fulfilled";
          player.morale = Math.round(clamp(player.morale + randomInt(state, 3, 8), 0, 100));
          if (!event) {
            addInbox(state, "Promise Kept", `${player.name} is happier with their recent playing time.`);
            event = { type: "promise", title: "Promise Kept", playerId: player.id };
          }
        } else if (promise.dueDate && compareDates(state.calendar.currentDate, promise.dueDate) > 0) {
          promise.status = "broken";
          player.morale = Math.round(clamp(player.morale - randomInt(state, 8, 15), 0, 100));
          if (!event) {
            addInbox(state, "Promise Broken", `${player.name} feels their playing-time promise has not been met.`);
            event = { type: "promise", title: "Promise Broken", playerId: player.id };
          }
        }
      }

      if (!event && report.playingTime.matches >= 6 && report.playingTime.pressure >= 54 && day - (player.happiness.lastConcernDay || -999) >= 22) {
        player.happiness.lastConcernDay = day;
        player.happiness.lastPromiseDay = day;
        player.promises.playingTime = {
          status: "active",
          createdDate: state.calendar.currentDate,
          dueDate: addDays(state.calendar.currentDate, 28),
          role: player.squadRole,
          expectedStartRate: roleExpectation(player.squadRole).expectedStartRate
        };
        player.morale = Math.round(clamp(player.morale - randomInt(state, 4, 9), 0, 100));
        addInbox(state, "Playing-Time Concern", `${player.name} expects more starts as a ${squadRoleLabel(player.squadRole)}. Staff will review the next month.`);
        event = { type: "happiness", title: "Playing-Time Concern", playerId: player.id };
      }

      if (!event && player.contractYears <= 1 && report.score < 64 && player.currentAbility >= club.reputation - 4 && day - (player.happiness.lastContractDay || -999) >= 28 && random(state) < 0.2) {
        player.happiness.lastContractDay = day;
        player.morale = Math.round(clamp(player.morale - randomInt(state, 2, 6), 0, 100));
        const renewal = contractRenewalProfile(state, player.id);
        addInbox(state, "Contract Demand", `${player.name}'s agent wants talks. Early demand: ${formatMoney(renewal.requestedWage)} per week for ${renewal.years} years.`);
        event = { type: "contract", title: "Contract Demand", playerId: player.id };
      }
    });
    return event;
  }

  function processRoleDevelopmentDaily(state) {
    if (!state.calendar) return null;
    let event = null;
    allCompetitionClubs(state).forEach((club) => {
      normalizeRoleAssignments(club);
      normalizePlayerInstructions(club);
      const staff = staffEffectsForClub(state, club.id);
      const tacticalPlanLift = club.trainingPlan === "tactical" ? 0.16 : club.matchPrep !== "balanced" ? 0.08 : 0;
      const base = (0.13 + tacticalPlanLift) * staff.familiarityMultiplier;
      const lineup = ensureLineup(state, club.id);
      lineup.forEach((playerId, slotIndex) => {
        const player = getPlayer(state, playerId);
        if (!player) return;
        const context = playerRoleSlotContext(state, player.id, club.id);
        if (!context) return;
        const gain = base * (player.individualPlan === "extra" ? 1.16 : player.individualPlan === "recovery" ? 0.7 : 1);
        const milestone = improveRoleDevelopment(state, player, context, gain, "training");
        if (!event && milestone && club.id === state.activeClubId) {
          addInbox(state, "Role Development", `${player.name} reached ${Math.round(milestone.mastery)} mastery in ${milestone.label}.`);
          event = { type: "role-development", title: "Role Development", playerId: player.id };
        }
      });
    });

    const activeClub = getClub(state, state.activeClubId);
    if (activeClub) {
      const day = state.calendar.day || 1;
      const report = tacticalRoleReport(state, activeClub.id);
      const issue = report && (report.instructionWarnings[0] || report.weakFits[0]);
      if (issue && day - (activeClub.lastInstructionAdviceDay || -999) >= 18) {
        activeClub.lastInstructionAdviceDay = day;
        const player = issue.playerId ? getPlayer(state, issue.playerId) : null;
        addInbox(state, "Staff Instruction Advice", player ? `${player.name} is not fully comfortable with ${issue.instructionLabel || issue.roleLabel}. Consider a simpler instruction or more tactical training.` : "Staff flagged an instruction mismatch in the match plan.");
        event = event || { type: "role-advice", title: "Staff Instruction Advice", playerId: player ? player.id : null };
      }
    }
    return event;
  }

  function applyAcademyDevelopment(state, prospect, report) {
    normalizeAcademyProspect(state, prospect);
    const academy = ensureAcademyState(state);
    const plan = ACADEMY_PLANS[prospect.trainingPlan] || ACADEMY_PLANS.balanced;
    const ageFactor = prospect.age <= 16 ? 1.24 : prospect.age === 17 ? 1.08 : 0.9;
    const ceilingFactor = clamp((prospect.potential - prospect.currentAbility + 8) / 28, 0.28, 1.35);
    prospect.fitness = Math.round(clamp(prospect.fitness + randomFloat(state, -0.9, 1.4), 50, 100));
    prospect.morale = Math.round(clamp(prospect.morale + plan.morale + randomFloat(state, -0.5, 0.7), 0, 100));
    if (random(state) > plan.growthRate * ageFactor * ceilingFactor * (1 + academy.level * 0.08)) return null;
    const attribute = pick(state, plan.attributes);
    const before = prospect.attributes[attribute] || prospect.currentAbility;
    const abilityBefore = prospect.currentAbility;
    prospect.attributes[attribute] = Math.round(clamp(before + 1, 18, 99));
    prospect.currentAbility = calculateAbilityFromAttributes({ ...prospect, clubId: academy.clubId || state.activeClubId });
    const event = {
      date: state.calendar ? state.calendar.currentDate : null,
      attribute,
      before,
      after: prospect.attributes[attribute],
      abilityBefore,
      abilityAfter: prospect.currentAbility,
      plan: prospect.trainingPlan
    };
    prospect.developmentEvents.unshift(event);
    prospect.developmentEvents = prospect.developmentEvents.slice(0, 10);
    report.development += 1;
    report.growth.push({
      prospectId: prospect.id,
      prospectName: prospect.name,
      attribute,
      before,
      after: prospect.attributes[attribute]
    });
    return event;
  }

  function processAcademyDaily(state) {
    const academy = ensureAcademyState(state);
    const report = {
      date: state.calendar ? state.calendar.currentDate : null,
      season: state.season || 1,
      type: "daily",
      development: 0,
      growth: []
    };
    let event = null;
    academy.prospects.forEach((prospect) => {
      const growth = applyAcademyDevelopment(state, prospect, report);
      if (!event && growth && prospect.currentAbility > growth.abilityBefore && prospect.potential >= 74) {
        event = { type: "academy", title: "Academy Development", prospectId: prospect.id };
      }
    });
    if (report.development) {
      academy.reports.unshift(report);
      academy.reports = academy.reports.slice(0, 12);
    }

    const day = state.calendar ? state.calendar.day || 1 : 1;
    if (!event && academy.prospects.length && day - (academy.lastEventDay || -999) >= 14 && random(state) < 0.045) {
      const standout = academy.prospects.slice().sort((a, b) => b.potential + b.currentAbility - (a.potential + a.currentAbility))[0];
      standout.morale = Math.round(clamp(standout.morale + randomInt(state, 3, 7), 0, 100));
      academy.lastEventDay = day;
      addInbox(state, "Academy Standout", `${standout.name} impressed staff in the academy block. Current internal view: ${standout.currentAbility} CA / ${standout.potential} PA.`);
      event = { type: "academy", title: "Academy Standout", prospectId: standout.id };
    } else if (event) {
      const prospect = academy.prospects.find((item) => item.id === event.prospectId);
      if (prospect && day - (academy.lastEventDay || -999) >= 10) {
        academy.lastEventDay = day;
        addInbox(state, "Academy Development", `${prospect.name} improved in ${academyPlanLabel(prospect.trainingPlan)} work and is now rated ${prospect.currentAbility} CA.`);
      }
    }
    return event;
  }

  function processAcademySeasonRollover(state) {
    const academy = ensureAcademyState(state);
    academy.prospects.forEach((prospect) => {
      prospect.age += 1;
      prospect.fitness = randomInt(state, 78, 100);
      prospect.morale = Math.round(clamp(prospect.morale + randomInt(state, -5, 6), 0, 100));
      if (prospect.age <= 18 && random(state) > 0.82) {
        prospect.potential = Math.round(clamp(prospect.potential + randomFloat(state, 0, 2.4), prospect.currentAbility, 99));
      }
    });
    academy.prospects = academy.prospects
      .filter((prospect) => prospect.age <= 19 || academyReadinessScore(state, prospect) >= 58)
      .sort((a, b) => b.potential - a.potential || b.currentAbility - a.currentAbility)
      .slice(0, 18);
    if (academy.lastIntakeSeason < (state.season || 1)) {
      createAcademyIntake(state, randomInt(state, 4, 7), { silent: false });
    }
  }

  function simulateCupFixturesForDate(state, date) {
    const cup = ensureDomesticCupState(state);
    if (!cup || cup.status === "complete") return { fixtures: [], activeMatch: null, cupEvent: null };
    let activeMatch = null;
    const fixtures = [];
    cup.rounds.forEach((round) => {
      if (compareDates(round.date, date) > 0) return;
      round.fixtures.forEach((fixture) => {
        if (fixture.played) return;
        fixture.date = fixture.date || round.date;
        fixture.roundName = fixture.roundName || round.label;
        const result = simulateFixture(state, fixture);
        resolveCupFixture(state, fixture);
        fixtures.push(JSON.parse(JSON.stringify(result)));
        if (fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId) {
          activeMatch = JSON.parse(JSON.stringify(fixture));
        }
      });
    });
    const cupEvent = advanceDomesticCup(state);
    return { fixtures, activeMatch, cupEvent };
  }

  function simulateFixturesForDate(state, date) {
    const dueRounds = state.league.schedule.filter((roundData) => {
      const hasUnplayed = roundData.fixtures.some((fixture) => !fixture.played);
      return hasUnplayed && compareDates(roundData.date, date) <= 0;
    });
    let activeMatch = null;
    const fixtures = [];
    dueRounds.forEach((roundData) => {
      roundData.fixtures.forEach((fixture) => {
        if (fixture.played) return;
        fixture.date = fixture.date || roundData.date;
        const result = simulateFixture(state, fixture);
        fixtures.push(JSON.parse(JSON.stringify(result)));
        if (fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId) {
          activeMatch = JSON.parse(JSON.stringify(result));
        }
      });
    });
    syncCurrentRound(state);
    const cup = simulateCupFixturesForDate(state, date);
    const europe = simulateEuropeanFixturesForDate(state, date);
    return {
      rounds: dueRounds,
      fixtures: fixtures.concat(cup.fixtures, europe.fixtures),
      activeMatch: europe.activeMatch || cup.activeMatch || activeMatch,
      cupEvent: cup.cupEvent,
      europeEvent: europe.europeEvent,
      cupFixtures: cup.fixtures,
      europeFixtures: europe.fixtures
    };
  }

  function simulateNextDay(state) {
    const calendar = ensureCalendar(state);
    if (allFixturesPlayed(state)) {
      const seasonSummary = finishSeason(state);
      return {
        type: "day",
        date: calendar.currentDate,
        currentDate: state.calendar.currentDate,
        rounds: [],
        fixtures: [],
        activeMatch: null,
        matchday: false,
        seasonEnded: true,
        seasonSummary
      };
    }

    const processedDate = calendar.currentDate;
    processInjuryReturns(state);
    processTransferPreAgreements(state);
    recoverSquadsDaily(state);
    updateMatchPrepFamiliarity(state);
    const roleDevelopmentEvent = processRoleDevelopmentDaily(state);
    const scoutingEvent = processScoutingAssignmentsDaily(state);
    const academyEvent = processAcademyDaily(state);
    const loanEvent = processOutgoingLoansDaily(state);
    const clubEvent = maybeGenerateDailyClubEvent(state);
    const offer = maybeGenerateDailyAiOffer(state);
    const aiMarketMove = maybeProcessDailyAiClubTransfer(state);
    const matchday = simulateFixturesForDate(state, processedDate);
    const happinessEvent = processSquadHappinessDaily(state);
    const pathwayEvent = processPathwayPromisesDaily(state);
    const boardEvent = processBoardDaily(state);
    if (clubEvent || happinessEvent || pathwayEvent || roleDevelopmentEvent || scoutingEvent || academyEvent || loanEvent || boardEvent || matchday.cupEvent || matchday.europeEvent || offer || aiMarketMove || calendar.day % 7 === 0 || matchday.fixtures.length) refreshTransferMarket(state);

    let seasonEnded = false;
    let seasonSummary = null;
    if (allFixturesPlayed(state)) {
      seasonSummary = finishSeason(state);
      seasonEnded = true;
    } else {
      state.calendar.currentDate = addDays(processedDate, 1);
      state.calendar.day = (state.calendar.day || 1) + 1;
    }

    return {
      type: "day",
      date: processedDate,
      currentDate: state.calendar.currentDate,
      rounds: matchday.rounds,
      fixtures: matchday.fixtures,
      activeMatch: matchday.activeMatch,
      matchday: matchday.fixtures.length > 0,
      scoutingEvent,
      academyEvent,
      loanEvent,
      roleDevelopmentEvent,
      boardEvent,
      pathwayEvent,
      cupEvent: matchday.cupEvent,
      europeEvent: matchday.europeEvent,
      clubEvent,
      happinessEvent,
      offer,
      aiMarketMove,
      seasonEnded,
      seasonSummary
    };
  }

  function latestInboxEvent(state, beforeCount) {
    const items = state.inbox || [];
    if (items.length <= beforeCount) return null;
    const item = items[0];
    return item ? { type: "inbox", title: item.title, body: item.body, id: item.id } : null;
  }

  function latestTransferNewsEvent(state, beforeCount) {
    const news = state.transfers && state.transfers.news ? state.transfers.news : [];
    if (news.length <= beforeCount) return null;
    const item = news[0];
    return item ? { type: "transfer-news", title: item.title, body: item.body, id: item.id } : null;
  }

  function describeDayEvent(state, before, result) {
    if (result.activeMatch) return { type: "match", title: "Matchday", body: "The next match is ready." };
    if (result.seasonEnded) return { type: "season", title: "Season Complete", body: result.seasonSummary ? `${result.seasonSummary.championName} won the league.` : "The season has finished." };
    return latestInboxEvent(state, before.inbox) || latestTransferNewsEvent(state, before.news) || (result.europeEvent ? { type: result.europeEvent.type, title: result.europeEvent.title } : null) || (result.cupEvent ? { type: result.cupEvent.type, title: result.cupEvent.title } : null) || (result.boardEvent ? { type: result.boardEvent.type, title: result.boardEvent.title } : null) || (result.loanEvent ? { type: result.loanEvent.type, title: result.loanEvent.title } : null) || (result.pathwayEvent ? { type: result.pathwayEvent.type, title: result.pathwayEvent.title } : null) || (result.roleDevelopmentEvent ? { type: result.roleDevelopmentEvent.type, title: result.roleDevelopmentEvent.title } : null) || (result.scoutingEvent ? { type: result.scoutingEvent.type, title: result.scoutingEvent.title } : null) || (result.academyEvent ? { type: result.academyEvent.type, title: result.academyEvent.title } : null) || (result.happinessEvent ? { type: result.happinessEvent.type, title: result.happinessEvent.title } : null) || (result.clubEvent ? { type: result.clubEvent.type, title: result.clubEvent.title } : null) || (result.aiMarketMove ? { type: "market", title: "Market Activity" } : null) || (result.offer ? { type: "offer", title: "Transfer Offer" } : null);
  }

  function simulateUntilNextEvent(state, options) {
    const maxDays = options && options.maxDays ? options.maxDays : 21;
    const days = [];
    let lastResult = null;
    for (let i = 0; i < maxDays; i += 1) {
      const before = {
        inbox: (state.inbox || []).length,
        news: state.transfers && state.transfers.news ? state.transfers.news.length : 0
      };
      const result = simulateNextDay(state);
      const event = describeDayEvent(state, before, result);
      result.significantEvent = event;
      days.push(result);
      lastResult = result;
      if (event || result.activeMatch || result.seasonEnded) {
        return { ...result, daysAdvanced: days.length, skippedDays: Math.max(0, days.length - 1), days, significantEvent: event };
      }
    }
    return { ...lastResult, daysAdvanced: days.length, skippedDays: Math.max(0, days.length - 1), days, significantEvent: null };
  }

  function simulateNextRound(state) {
    ensureCalendar(state);
    const roundData = state.league.schedule[state.league.currentRound];
    if (!roundData) {
      const cup = ensureDomesticCupState(state);
      if (cup && cup.status !== "complete") return simulateNextDay(state);
      const europe = ensureEuropeState(state).competition;
      if (europe && europe.status !== "complete") return simulateNextDay(state);
      return finishSeason(state);
    }
    if (roundData.date) state.calendar.currentDate = roundData.date;
    processTransferPreAgreements(state);
    const cupMatches = roundData.date ? simulateCupFixturesForDate(state, roundData.date) : { activeMatch: null };
    const europeMatches = roundData.date ? simulateEuropeanFixturesForDate(state, roundData.date) : { activeMatch: null };
    let activeMatch = europeMatches.activeMatch || cupMatches.activeMatch || null;
    roundData.fixtures.forEach((fixture) => {
      const result = simulateFixture(state, fixture);
      if (fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId) {
        activeMatch = JSON.parse(JSON.stringify(result));
      }
    });
    state.league.currentRound += 1;
    if (roundData.date) {
      const nextRound = state.league.schedule[state.league.currentRound];
      state.calendar.currentDate = nextRound ? nextRound.date : addDays(roundData.date, 1);
      state.calendar.day = Math.max(state.calendar.day || 1, daysBetween(state.calendar.preseasonStartDate, state.calendar.currentDate) + 1);
    }
    recoverSquads(state);
    processTransferPreAgreements(state);
    processScoutingAssignments(state);
    maybeGenerateAiOffer(state);
    maybeProcessDailyAiClubTransfer(state);
    processBoardDaily(state);
    refreshTransferMarket(state);

    if (state.league.currentRound >= state.league.schedule.length) {
      const cup = ensureDomesticCupState(state);
      if (cup && cup.status !== "complete") {
        return {
          type: "round",
          round: roundData,
          activeMatch,
          seasonEnded: false,
          cupPending: true
        };
      }
      const europe = ensureEuropeState(state).competition;
      if (europe && europe.status !== "complete") {
        return {
          type: "round",
          round: roundData,
          activeMatch,
          seasonEnded: false,
          europePending: true
        };
      }
      const seasonSummary = finishSeason(state);
      return {
        type: "round",
        round: roundData,
        activeMatch,
        seasonEnded: true,
        seasonSummary
      };
    }

    return {
      type: "round",
      round: roundData,
      activeMatch,
      seasonEnded: false
    };
  }

  function recoverSquads(state) {
    Object.values(state.players).forEach((player) => {
      player.fitness = Math.round(clamp(player.fitness + randomInt(state, 4, 10), 0, 100));
      player.sharpness = Math.round(clamp(player.sharpness - randomInt(state, 0, 2), 0, 100));
    });
  }

  function maybeGenerateAiOffer(state) {
    if (random(state) < 0.48) return null;
    const activePlayers = clubPlayers(state, state.activeClubId)
      .filter((player) => !player.loanUntilSeason && player.age < 34 && player.currentAbility > 54)
      .sort((a, b) => b.value - a.value);
    if (!activePlayers.length) return null;
    const player = pick(state, activePlayers.slice(0, Math.min(activePlayers.length, 12)));
    const fromClub = pick(state, state.league.clubs.filter((club) => club.id !== state.activeClubId));
    const fee = moneyRound(player.value * randomFloat(state, 0.82, 1.28));
    const offer = {
      id: `o${state.nextOfferId++}`,
      type: "incoming",
      playerId: player.id,
      fromClubId: fromClub.id,
      toClubId: state.activeClubId,
      fee,
      wage: player.wage,
      status: "pending",
      createdSeason: state.season,
      createdRound: state.league.currentRound
    };
    state.transfers.offers.unshift(offer);
    addInbox(state, "Transfer Offer", `${fromClub.name} submitted an offer for ${player.name}.`);
    return offer;
  }

  function finishSeason(state) {
    const finalTable = calculateTable(state);
    const activeRow = finalTable.find((row) => row.clubId === state.activeClubId);
    const awards = calculateAwards(state, finalTable);
    const standings = finalTable.map((row, index) => ({ ...row, position: index + 1 }));
    const completedSeason = state.season;
    const cupSummary = domesticCupReport(state);
    const europeSummary = europeanReport(state);
    const nextEuropeanQualifiers = europeanQualifiersFromTable(state, finalTable, cupSummary);
    state.league.history.unshift({
      season: completedSeason,
      championClubId: finalTable[0].clubId,
      championName: finalTable[0].clubName,
      cup: {
        championClubId: cupSummary.championClubId,
        championName: cupSummary.championName,
        competitionName: cupSummary.name
      },
      europe: {
        championClubId: europeSummary.championClubId,
        championName: europeSummary.championName,
        competitionName: europeSummary.name,
        qualifiedClubIds: europeSummary.qualifiedClubIds || []
      },
      standings,
      awards,
      fixtures: archiveFixtures(state),
      completedAt: new Date().toISOString()
    });

    if (!state.league.records.highestPoints || finalTable[0].points > state.league.records.highestPoints.points) {
      state.league.records.highestPoints = {
        season: completedSeason,
        clubId: finalTable[0].clubId,
        clubName: finalTable[0].clubName,
        points: finalTable[0].points
      };
    }

    finalTable.forEach((row, index) => {
      const club = getClub(state, row.clubId);
      const prize = moneyRound(8000000 + (finalTable.length - index) * 1200000 + row.points * 120000);
      club.balance += prize;
      club.transferBudget = moneyRound(clamp(club.transferBudget * 0.28 + prize * 0.48 + club.balance * 0.04, 3000000, 42000000));
      club.wageBudget = moneyRound(clamp(club.wageBudget * 0.86 + club.reputation * 9500 + (8 - index) * 24000, 520000, 1900000));
      club.previousSeasonFinance = { ...club.seasonFinance, prizeMoney: prize };
      club.seasonFinance = {
        prizeMoney: prize,
        transferIncome: 0,
        transferSpend: 0,
        wageSpend: 0
      };
      club.form = [];
    });

    if (activeRow && activeRow.clubId === finalTable[0].clubId) {
      state.manager.trophies += 1;
      state.manager.reputation = Math.round(clamp(state.manager.reputation + 7, 1, 100));
    } else if (activeRow) {
      state.manager.reputation = Math.round(clamp(state.manager.reputation + (9 - activeRow.position) * 0.8, 1, 100));
    }

    if (activeRow) {
      state.manager.careerHistory.unshift({
        season: completedSeason,
        clubId: state.activeClubId,
        clubName: getClub(state, state.activeClubId).name,
        finish: activeRow.position,
        points: activeRow.points,
        wins: activeRow.wins,
        draws: activeRow.draws,
        losses: activeRow.losses
      });
    }

    archivePlayerSeasons(state, completedSeason);
    developPlayers(state);
    processLoansAndContracts(state);
    processExpiredContracts(state);
    state.season += 1;
    state.league.currentRound = 0;
    state.calendar = createSeasonCalendar(state.season);
    processAcademySeasonRollover(state);
    state.league.schedule = generateSchedule(state.league.clubs, state.season, state.calendar.seasonStartDate);
    state.cups = state.cups || { history: [] };
    state.cups.domestic = createDomesticCup(state);
    state.europe = state.europe || { clubs: [], history: [], qualifiedClubIds: [] };
    state.europe.qualifiedClubIds = nextEuropeanQualifiers;
    state.europe.competition = createEuropeanCompetition(state, nextEuropeanQualifiers, state.season);
    ensureBoardState(state);
    state.transfers.offers = state.transfers.offers.filter((offer) => offer.status === "pending" || offer.status === "countered").slice(0, 12);
    refreshTransferMarket(state);
    processTransferPreAgreements(state);
    addInbox(state, "Season Complete", `${finalTable[0].clubName} won Season ${completedSeason}. New budgets have been set.`);
    if (nextEuropeanQualifiers.includes(state.activeClubId)) {
      addInbox(state, "European Qualification", `${getClub(state, state.activeClubId).name} qualified for next season's ${EUROPEAN_COMPETITION_NAME}.`);
    }

    return {
      type: "season",
      season: completedSeason,
      standings,
      awards,
      activeFinish: activeRow ? activeRow.position : null,
      championName: finalTable[0].clubName,
      cupChampionName: cupSummary.championName,
      europeChampionName: europeSummary.championName,
      europeanQualifiers: nextEuropeanQualifiers
    };
  }

  function calculateAwards(state, finalTable) {
    const players = Object.values(state.players);
    const rated = players.filter((player) => player.seasonStats.ratingApps >= 5);
    const topScorer = players.slice().sort((a, b) => b.seasonStats.goals - a.seasonStats.goals || b.seasonStats.assists - a.seasonStats.assists)[0];
    const topAssister = players.slice().sort((a, b) => b.seasonStats.assists - a.seasonStats.assists || b.seasonStats.goals - a.seasonStats.goals)[0];
    const bestAverage = rated
      .slice()
      .sort((a, b) => averageRating(b.seasonStats) - averageRating(a.seasonStats))[0];
    const cleanSheets = players.filter((player) => player.position === "GK").sort((a, b) => b.seasonStats.cleanSheets - a.seasonStats.cleanSheets)[0];
    return {
      champion: { clubId: finalTable[0].clubId, clubName: finalTable[0].clubName },
      goldenBoot: topScorer ? playerAward(topScorer, topScorer.seasonStats.goals, "goals") : null,
      playmaker: topAssister ? playerAward(topAssister, topAssister.seasonStats.assists, "assists") : null,
      goldenGlove: cleanSheets ? playerAward(cleanSheets, cleanSheets.seasonStats.cleanSheets, "clean sheets") : null,
      playerOfSeason: bestAverage ? playerAward(bestAverage, averageRating(bestAverage.seasonStats), "avg rating") : null
    };
  }

  function playerAward(player, value, stat) {
    return {
      playerId: player.id,
      playerName: player.name,
      clubId: player.clubId,
      value: round(value, 2),
      stat
    };
  }

  function archiveFixtures(state) {
    return state.league.schedule.map((roundData) => ({
      number: roundData.number,
      date: roundData.date,
      fixtures: roundData.fixtures.map((fixture) => ({
        id: fixture.id,
        date: fixture.date,
        homeClubId: fixture.homeClubId,
        awayClubId: fixture.awayClubId,
        homeGoals: fixture.homeGoals,
        awayGoals: fixture.awayGoals,
        stats: fixture.stats,
        tactics: fixture.tactics,
        events: fixture.events,
        playerStats: fixture.playerStats,
        teamPhaseStrengths: fixture.teamPhaseStrengths,
        xGTimeline: fixture.xGTimeline,
        momentumTimeline: fixture.momentumTimeline,
        analysis: fixture.analysis,
        goals: fixture.goals,
        substitutions: fixture.substitutions,
        manOfMatch: fixture.manOfMatch
      }))
    }));
  }

  function averageRating(stats) {
    return stats.ratingApps ? stats.ratingTotal / stats.ratingApps : 0;
  }

  function archivePlayerSeasons(state, season) {
    Object.values(state.players).forEach((player) => {
      const club = getClub(state, player.clubId);
      player.history.unshift({
        season,
        clubId: player.clubId,
        clubName: club ? club.name : "Free Agent",
        apps: player.seasonStats.apps,
        goals: player.seasonStats.goals,
        assists: player.seasonStats.assists,
        cleanSheets: player.seasonStats.cleanSheets,
        averageRating: round(averageRating(player.seasonStats), 2),
        value: player.value
      });
      player.seasonStats = freshPlayerStats();
    });
  }

  function developPlayers(state) {
    Object.values(state.players).forEach((player) => {
      normalizePlayerState(player);
      player.age += 1;
      player.contractYears -= 1;
      const growthWindow = player.age <= 23 ? randomFloat(state, 0.8, 3.4) : player.age <= 27 ? randomFloat(state, 0.1, 1.5) : player.age <= 31 ? randomFloat(state, -0.3, 0.7) : randomFloat(state, -2.2, -0.3);
      const performance = averageRating(player.history[0] ? { ratingApps: 1, ratingTotal: player.history[0].averageRating || 6.5 } : player.seasonStats) - 6.5;
      const targetChange = clamp(growthWindow + performance * 0.75, -4, Math.max(0, player.potential - player.currentAbility));
      const focusAttributes = TRAINING_FOCUS[player.trainingFocus] || [];
      Data.ATTRIBUTES.forEach((attr) => {
        const roleImportant = (Data.POSITION_WEIGHTS[player.position] && Data.POSITION_WEIGHTS[player.position][attr]) || 0.72;
        const focusBoost = focusAttributes.includes(attr) && player.age <= 29 ? 0.35 : 0;
        const balancePenalty = focusAttributes.length && !focusAttributes.includes(attr) ? -0.08 : 0;
        const attrChange = targetChange * (0.25 + roleImportant / 2.2) + focusBoost + balancePenalty + randomFloat(state, -0.7, 0.9);
        player.attributes[attr] = Math.round(clamp(player.attributes[attr] + attrChange, 18, 99));
      });
      player.currentAbility = calculateAbilityFromAttributes(player);
      if (player.age < 24 && random(state) > 0.82) {
        player.potential = Math.round(clamp(player.potential + randomFloat(state, 0, 2.6), player.currentAbility, 99));
      }
      player.value = calculatePlayerValue(player);
      player.wage = calculateWage(player);
      player.fitness = randomInt(state, 82, 100);
      player.sharpness = randomInt(state, 45, 78);
      player.morale = Math.round(clamp(player.morale + randomInt(state, -8, 8), 10, 96));
      player.development.push(snapshotDevelopment(player, state.season + 1));
    });
    refillThinSquads(state);
  }

  function setIndividualPlan(state, playerId, plan) {
    const player = getPlayer(state, playerId);
    if (!player || !INDIVIDUAL_PLANS[plan]) return { ok: false, message: "Individual plan unavailable." };
    if (player.clubId !== state.activeClubId) return { ok: false, message: "You can only manage your own players." };
    player.individualPlan = plan;
    return { ok: true, message: `${player.name} moved to ${individualPlanLabel(plan)}.` };
  }

  function setSquadRole(state, playerId, role) {
    const player = getPlayer(state, playerId);
    if (!player || !SQUAD_ROLES[role]) return { ok: false, message: "Squad role unavailable." };
    if (player.clubId !== state.activeClubId) return { ok: false, message: "You can only manage your own players." };
    const previous = player.squadRole;
    if (previous === role) return { ok: true, message: `${player.name} is already ${squadRoleLabel(role)}.` };
    const oldOrder = roleExpectation(previous).order;
    const newOrder = roleExpectation(role).order;
    player.squadRole = role;
    if (newOrder > oldOrder) {
      player.morale = Math.round(clamp(player.morale + 5 + (newOrder - oldOrder), 0, 100));
      if (player.promises && player.promises.playingTime && player.promises.playingTime.status === "active") {
        player.promises.playingTime.role = role;
      }
      return { ok: true, message: `${player.name} promoted to ${squadRoleLabel(role)}.` };
    }
    player.morale = Math.round(clamp(player.morale - Math.max(2, (oldOrder - newOrder) * 4), 0, 100));
    if (player.promises && player.promises.playingTime && player.promises.playingTime.status === "active" && roleExpectation(role).expectedStartRate <= roleExpectation(previous).expectedStartRate * 0.72) {
      player.promises.playingTime.status = "reset";
    }
    return { ok: true, message: `${player.name}'s role changed to ${squadRoleLabel(role)}.` };
  }

  function restPlayer(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player) return { ok: false, message: "Player not found." };
    if (player.clubId !== state.activeClubId) return { ok: false, message: "You can only manage your own players." };
    player.individualPlan = isInjured(state, player) ? "rehab" : "recovery";
    if (!isInjured(state, player) && !isSuspended(state, player)) {
      player.fitness = Math.round(clamp(player.fitness + 5, 0, 100));
      player.sharpness = Math.round(clamp(player.sharpness - 1, 0, 100));
      player.morale = Math.round(clamp(player.morale + 1, 0, 100));
    }
    return { ok: true, message: `${player.name} assigned to ${individualPlanLabel(player.individualPlan)}.` };
  }

  function developmentDelta(player) {
    normalizePlayerState(player);
    const latest = player.development && player.development.length ? player.development[player.development.length - 1] : null;
    return latest ? player.currentAbility - latest.currentAbility : 0;
  }

  function topAttributes(player, limit) {
    normalizePlayerState(player);
    return Object.keys(player.attributes || {})
      .map((key) => ({ key, label: Data.ATTRIBUTE_LABELS[key] || key, value: player.attributes[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit || 5);
  }

  function roleFitReport(player) {
    normalizePlayerState(player);
    return Data.POSITIONS.map((position) => ({
      position,
      score: round(playerPositionScore(player, position) - slotPenalty(player, position), 1),
      natural: player.position === position || (player.secondaryPositions || []).includes(position)
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }

  function playerDevelopmentReport(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player) return null;
    const growthRoom = Math.max(0, (player.potential || player.currentAbility) - player.currentAbility);
    const delta = developmentDelta(player);
    const recentRating = player.form && player.form.length ? round(average(player.form), 2) : null;
    const progress = player.potential ? round(clamp(player.currentAbility / player.potential * 100, 0, 100), 1) : 100;
    const stage = player.age <= 21 ? "Emerging" : player.age <= 25 ? "Developing" : player.age <= 29 ? "Prime" : player.age <= 32 ? "Experienced" : "Declining";
    const events = (player.developmentEvents || []).slice(-5).reverse();
    return {
      playerId: player.id,
      availability: playerAvailabilityStatus(state, player),
      risk: injuryRiskLevel(state, player),
      happiness: playerHappinessReport(state, player.id),
      individualPlan: player.individualPlan,
      growthRoom,
      progress,
      stage,
      delta,
      recentRating,
      topAttributes: topAttributes(player, 5),
      roleFits: roleFitReport(player),
      events
    };
  }

  function squadAvailabilityReport(state, clubId) {
    const squad = clubPlayers(state, clubId);
    const statuses = squad.map((player) => ({ player, status: playerAvailabilityStatus(state, player), risk: injuryRiskLevel(state, player) }));
    const count = (predicate) => statuses.filter(predicate).length;
    return {
      total: squad.length,
      available: count((item) => !isUnavailable(state, item.player) && item.player.fitness >= 55),
      injured: count((item) => item.status.key === "injured"),
      suspended: count((item) => item.status.key === "suspended"),
      lowFitness: count((item) => item.status.key === "unfit"),
      doubtful: count((item) => item.status.key === "doubtful"),
      highRisk: count((item) => item.risk.key === "high"),
      list: statuses
        .filter((item) => item.status.key !== "available" || item.risk.key === "high")
        .sort((a, b) => (b.risk.score || 0) - (a.risk.score || 0))
        .slice(0, 8)
    };
  }

  function squadDevelopmentReport(state, clubId) {
    const squad = clubPlayers(state, clubId);
    const rows = squad.map((player) => ({
      player,
      delta: developmentDelta(player),
      growthRoom: Math.max(0, (player.potential || player.currentAbility) - player.currentAbility),
      recentEvents: (player.developmentEvents || []).length
    }));
    return {
      prospects: rows
        .filter((row) => row.player.age <= 23 && row.growthRoom >= 5)
        .sort((a, b) => b.growthRoom - a.growthRoom || b.player.potential - a.player.potential)
        .slice(0, 5),
      risers: rows
        .filter((row) => row.delta > 0 || row.recentEvents > 0)
        .sort((a, b) => b.delta - a.delta || b.recentEvents - a.recentEvents)
        .slice(0, 5),
      concerns: rows
        .filter((row) => row.player.age >= 31 || row.delta < 0)
        .sort((a, b) => a.delta - b.delta || b.player.age - a.player.age)
        .slice(0, 5)
    };
  }

  function ensureTransferState(state) {
    state.transfers = state.transfers || {};
    state.transfers.marketIds = state.transfers.marketIds || [];
    state.transfers.offers = state.transfers.offers || [];
    state.transfers.shortlist = state.transfers.shortlist || [];
    state.transfers.preAgreements = state.transfers.preAgreements || [];
    state.transfers.history = state.transfers.history || [];
    state.transfers.news = state.transfers.news || [];
    state.transfers.freeAgentIds = state.transfers.freeAgentIds || [];
    state.transfers.outgoingLoans = Array.isArray(state.transfers.outgoingLoans) ? state.transfers.outgoingLoans : [];
    const maxLoan = state.transfers.outgoingLoans.reduce((max, loan) => {
      const number = Number(String(loan.id || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    state.transfers.nextLoanId = Math.max(state.transfers.nextLoanId || 1, maxLoan + 1);
    return state.transfers;
  }

  function desiredDepth(position) {
    const depths = {
      GK: 2,
      RB: 2,
      CB: 4,
      LB: 2,
      DM: 2,
      CM: 3,
      AM: 2,
      RW: 2,
      LW: 2,
      ST: 2
    };
    return depths[position] || 2;
  }

  function recruitmentNeedReport(state, clubId) {
    const club = getClub(state, clubId || state.activeClubId);
    if (!club) return { needs: [], primary: null };
    const squad = clubPlayers(state, club.id);
    const benchmark = clamp((club.reputation || 65) - 1, 54, 86);
    const needs = Data.POSITIONS.map((position) => {
      const exact = squad.filter((player) => player.position === position);
      const cover = squad.filter((player) => player.position === position || (player.secondaryPositions || []).includes(position));
      const available = cover.filter((player) => !isUnavailable(state, player) && player.fitness >= 55);
      const scores = cover.map((player) => playerPositionScore(player, position) - slotPenalty(player, position));
      const bestScore = scores.length ? Math.max(...scores) : 0;
      const avgScore = scores.length ? average(scores) : 0;
      const avgAge = cover.length ? average(cover.map((player) => player.age)) : 0;
      const expiring = cover.filter((player) => player.contractYears <= 1).length;
      const injured = cover.filter((player) => isInjured(state, player)).length;
      const suspended = cover.filter((player) => isSuspended(state, player)).length;
      const depthGap = Math.max(0, desiredDepth(position) - cover.length);
      const availabilityGap = Math.max(0, Math.min(desiredDepth(position), 2) - available.length);
      const qualityGap = Math.max(0, benchmark - bestScore);
      const agePressure = avgAge >= 30 ? (avgAge - 29) * 5 : 0;
      const score = round(clamp(depthGap * 26 + availabilityGap * 18 + qualityGap * 1.35 + expiring * 6 + injured * 9 + suspended * 5 + agePressure, 0, 100), 0);
      const status = score >= 70 ? "Critical" : score >= 46 ? "Priority" : score >= 24 ? "Monitor" : "Covered";
      const tone = score >= 70 ? "red" : score >= 46 ? "amber" : score >= 24 ? "blue" : "green";
      const reasons = [];
      if (depthGap) reasons.push(`${depthGap} depth gap`);
      if (availabilityGap) reasons.push(`${availabilityGap} availability gap`);
      if (qualityGap > 0) reasons.push(`${round(qualityGap, 1)} quality gap`);
      if (expiring) reasons.push(`${expiring} expiring`);
      if (injured) reasons.push(`${injured} injured`);
      if (!reasons.length) reasons.push("Healthy coverage");
      return {
        position,
        score,
        status,
        tone,
        depth: cover.length,
        naturalDepth: exact.length,
        available: available.length,
        desiredDepth: desiredDepth(position),
        bestScore: round(bestScore, 1),
        averageScore: round(avgScore, 1),
        averageAge: round(avgAge, 1),
        expiring,
        injured,
        reasons
      };
    }).sort((a, b) => b.score - a.score || a.position.localeCompare(b.position));
    return { needs, primary: needs[0] || null };
  }

  function transferAffordability(state, player) {
    const activeClub = getClub(state, state.activeClubId);
    if (!activeClub || !player) return { label: "-", tone: "amber", score: 0, fee: 0, wageRoom: 0 };
    const fee = player.clubId ? player.value : 0;
    const wageRoom = Math.max(0, activeClub.wageBudget - weeklyWageSpend(state, activeClub.id));
    const feeRatio = fee / Math.max(1, activeClub.transferBudget);
    const wageRatio = player.wage / Math.max(1, wageRoom);
    const feeScore = fee === 0 ? 100 : clamp(110 - feeRatio * 92, 0, 100);
    const wageScore = clamp(110 - wageRatio * 82, 0, 100);
    const score = round(clamp(feeScore * 0.62 + wageScore * 0.38, 0, 100), 0);
    const label = fee > activeClub.transferBudget || player.wage > wageRoom ? "Stretch" : score >= 72 ? "Affordable" : score >= 46 ? "Manageable" : "Expensive";
    const tone = label === "Affordable" ? "green" : label === "Manageable" ? "blue" : label === "Expensive" ? "amber" : "red";
    return { label, tone, score, fee, wageRoom };
  }

  function targetNeedFit(needs, player) {
    const positions = [player.position].concat(player.secondaryPositions || []);
    const ranked = needs.filter((need) => positions.includes(need.position));
    return ranked.sort((a, b) => b.score - a.score)[0] || needs[0] || null;
  }

  function recruitmentTargetScore(state, playerId) {
    const player = getPlayer(state, playerId);
    const activeClub = getClub(state, state.activeClubId);
    if (!player || !activeClub) return null;
    const needReport = recruitmentNeedReport(state, activeClub.id);
    const need = targetNeedFit(needReport.needs, player);
    const scout = getScoutView(state, player.id);
    const affordability = transferAffordability(state, player);
    const growthRoom = Math.max(0, (player.potential || player.currentAbility) - player.currentAbility);
    const ageFit = player.age <= 21 ? 12 : player.age <= 24 ? 10 : player.age <= 28 ? 7 : player.age <= 31 ? 2 : -7;
    const abilityFit = clamp((player.currentAbility - Math.max(54, activeClub.reputation - 12)) * 1.15, -14, 28);
    const upsideFit = clamp(growthRoom * 1.15, 0, 22);
    const needFit = need ? need.score * 0.32 : 0;
    const scoutFit = scout ? clamp(scout.confidence / 100 * 8, 0, 8) : 0;
    const riskPenalty = injuryRiskLevel(state, player).score >= 58 ? 9 : 0;
    const score = round(clamp(28 + needFit + abilityFit + upsideFit + ageFit + affordability.score * 0.15 + scoutFit - riskPenalty, 0, 100), 0);
    const priority = score >= 82 ? "A" : score >= 68 ? "B" : score >= 52 ? "C" : "Watch";
    return {
      playerId: player.id,
      score,
      priority,
      need,
      affordability,
      scoutConfidence: scout ? scout.confidence : 0,
      growthRoom,
      ageFit,
      risk: injuryRiskLevel(state, player)
    };
  }

  function recruitmentRecommendations(state, limit) {
    ensureTransferState(state);
    const activeClub = getClub(state, state.activeClubId);
    if (!activeClub) return [];
    const activeIds = new Set(activeClub.squad || []);
    const candidateIds = Array.from(new Set((state.transfers.marketIds || []).concat(state.transfers.freeAgentIds || [], state.transfers.shortlist || [])));
    return candidateIds
      .map((id) => getPlayer(state, id))
      .filter((player) => player && !activeIds.has(player.id) && !player.loanUntilSeason)
      .map((player) => ({ player, recruitment: recruitmentTargetScore(state, player.id), scout: getScoutView(state, player.id) }))
      .filter((item) => item.recruitment)
      .sort((a, b) => b.recruitment.score - a.recruitment.score || b.player.potential - a.player.potential)
      .slice(0, limit || 10);
  }

  function shortlistPlayers(state) {
    ensureTransferState(state);
    return state.transfers.shortlist.map((id) => getPlayer(state, id)).filter(Boolean);
  }

  function isShortlisted(state, playerId) {
    ensureTransferState(state);
    return state.transfers.shortlist.includes(playerId);
  }

  function addToShortlist(state, playerId) {
    ensureTransferState(state);
    const player = getPlayer(state, playerId);
    if (!player || player.clubId === state.activeClubId) return { ok: false, message: "Player cannot be shortlisted." };
    if (!state.transfers.shortlist.includes(playerId)) state.transfers.shortlist.unshift(playerId);
    state.transfers.shortlist = state.transfers.shortlist.slice(0, 40);
    return { ok: true, message: `${player.name} added to the shortlist.` };
  }

  function removeFromShortlist(state, playerId) {
    ensureTransferState(state);
    const player = getPlayer(state, playerId);
    state.transfers.shortlist = state.transfers.shortlist.filter((id) => id !== playerId);
    return { ok: true, message: `${player ? player.name : "Player"} removed from the shortlist.` };
  }

  function recruitmentProfile(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player) return null;
    const recruitment = recruitmentTargetScore(state, player.id);
    const scout = getScoutView(state, player.id);
    const pros = [];
    const cons = [];
    if (recruitment.need && recruitment.need.score >= 46) pros.push(`Fills ${recruitment.need.position} priority`);
    if (recruitment.growthRoom >= 10) pros.push("High upside");
    if (recruitment.affordability.score >= 70) pros.push("Financially realistic");
    if (player.currentAbility >= 76) pros.push("Immediate first-team level");
    if (scout && scout.confidence < 45) cons.push("Low scouting confidence");
    if (recruitment.affordability.score < 42) cons.push("Budget stretch");
    if (recruitment.risk.key === "high") cons.push("High injury risk");
    if (player.age >= 32) cons.push("Limited resale value");
    if (!pros.length) pros.push("Useful market option");
    if (!cons.length) cons.push("No major red flags");
    return { player, recruitment, scout, pros, cons, shortlisted: isShortlisted(state, player.id) };
  }

  function sellerStance(state, player) {
    if (!player || !player.clubId) {
      return { key: "free", label: "Free Agent", tone: "blue", askingMultiplier: 0, reason: "No selling club" };
    }
    const seller = getClub(state, player.clubId);
    if (!seller) return { key: "unknown", label: "Unknown", tone: "amber", askingMultiplier: 1.1, reason: "Seller unknown" };
    const squad = clubPlayers(state, seller.id);
    const roleRank = squad.slice().sort((a, b) => b.currentAbility - a.currentAbility).findIndex((item) => item.id === player.id);
    const keyPlayer = roleRank >= 0 && roleRank < 5;
    const expiring = player.contractYears <= 1;
    const unhappy = player.morale < 42;
    const veteran = player.age >= 31;
    let score = 48 + (keyPlayer ? 25 : 0) + (player.currentAbility - seller.reputation) * 0.65 - (expiring ? 22 : 0) - (unhappy ? 14 : 0) - (veteran ? 7 : 0);
    score = clamp(score, 0, 100);
    if (score >= 78) return { key: "notForSale", label: "Not For Sale", tone: "red", askingMultiplier: 1.75, reason: "Key player for selling club" };
    if (score >= 58) return { key: "expensive", label: "Hard Sell", tone: "amber", askingMultiplier: 1.36, reason: "Seller wants a premium" };
    if (score >= 34) return { key: "negotiable", label: "Negotiable", tone: "blue", askingMultiplier: expiring ? 0.92 : 1.12, reason: expiring ? "Contract leverage" : "Open to a fair offer" };
    return { key: "available", label: "Available", tone: "green", askingMultiplier: expiring || unhappy ? 0.82 : 0.96, reason: unhappy ? "Player could move" : "Seller open to sale" };
  }

  function playerInterest(state, player) {
    const activeClub = getClub(state, state.activeClubId);
    const currentClub = player && player.clubId ? getClub(state, player.clubId) : null;
    if (!player || !activeClub) return { key: "unknown", label: "Unknown", tone: "amber", score: 0, wageMultiplier: 1.15, reason: "Unknown" };
    const reputationLift = activeClub.reputation - (currentClub ? currentClub.reputation : activeClub.reputation - 6);
    const wageRoom = Math.max(0, activeClub.wageBudget - weeklyWageSpend(state, activeClub.id));
    const wageRoomLift = wageRoom > player.wage * 1.4 ? 10 : wageRoom > player.wage ? 4 : -14;
    const playingTimeLift = player.currentAbility >= teamStrength(state, activeClub.id).overall - 2 ? 10 : player.age <= 22 ? 5 : -4;
    const moraleLift = player.morale < 42 ? 10 : player.morale > 76 && currentClub ? -6 : 0;
    const contractLift = player.contractYears <= 1 ? 9 : 0;
    const score = round(clamp(52 + reputationLift * 1.15 + wageRoomLift + playingTimeLift + moraleLift + contractLift, 0, 100), 0);
    if (score >= 78) return { key: "veryInterested", label: "Very Interested", tone: "green", score, wageMultiplier: 1.02, reason: "Move is appealing" };
    if (score >= 58) return { key: "interested", label: "Interested", tone: "blue", score, wageMultiplier: 1.1, reason: "Likely to listen" };
    if (score >= 38) return { key: "unsure", label: "Unsure", tone: "amber", score, wageMultiplier: 1.24, reason: "Needs convincing" };
    return { key: "reluctant", label: "Reluctant", tone: "red", score, wageMultiplier: 1.45, reason: "Club or role concerns" };
  }

  function negotiationProfile(state, playerId) {
    const player = getPlayer(state, playerId);
    const activeClub = getClub(state, state.activeClubId);
    if (!player || !activeClub) return null;
    const stance = sellerStance(state, player);
    const interest = playerInterest(state, player);
    const window = transferWindowStatus(state);
    const affordability = transferAffordability(state, player);
    const suggestedFee = player.clubId ? moneyRound(Math.max(player.value * stance.askingMultiplier, player.value * 0.75)) : 0;
    const suggestedWage = moneyRound(Math.max(player.wage * interest.wageMultiplier, player.currentAbility * 900));
    const warnings = [];
    if (suggestedFee > activeClub.transferBudget) warnings.push("Transfer budget stretch");
    if (weeklyWageSpend(state, activeClub.id) + suggestedWage > activeClub.wageBudget) warnings.push("Wage budget stretch");
    if (stance.key === "notForSale") warnings.push("Seller may reject below premium");
    if (interest.key === "reluctant") warnings.push("Player needs convincing");
    if (!window.isOpen) warnings.push(`Registers on ${formatGameDate(window.opensOn)}`);
    return {
      playerId: player.id,
      stance,
      interest,
      affordability,
      suggestedFee,
      suggestedWage,
      window,
      registration: window.isOpen ? "Immediate" : "Pre-Agreement",
      warnings
    };
  }

  function deadlineDayReport(state) {
    const window = transferWindowStatus(state);
    const transfers = ensureTransferState(state);
    const active = window.isOpen && window.daysRemaining <= 1;
    const pendingOffers = transfers.offers.filter((offer) => offer.status === "pending").length;
    const negotiations = transfers.offers.filter((offer) => offer.status === "countered").length;
    const preAgreements = transfers.preAgreements.filter((agreement) => agreement.status === "pending").length;
    return {
      active,
      label: active ? "Deadline Day" : window.isOpen ? "Window Open" : "Window Closed",
      tone: active ? "amber" : window.isOpen ? "green" : "blue",
      window,
      pendingOffers,
      negotiations,
      preAgreements,
      activity: active ? "High" : window.isOpen ? "Normal" : "Planning"
    };
  }

  function loanDestinationDefinition(destinationId) {
    return YOUTH_LOAN_DESTINATIONS.find((destination) => destination.id === destinationId) || null;
  }

  function loanFocusLabel(focus) {
    return ACADEMY_PLANS[focus] ? ACADEMY_PLANS[focus].label : ACADEMY_PLANS.balanced.label;
  }

  function pathwayFocusForPlayer(player) {
    if (!player) return "balanced";
    if (player.trainingFocus === "finishing") return "finishing";
    if (player.trainingFocus === "playmaking") return "playmaker";
    if (player.trainingFocus === "defending") return "defensive";
    if (player.trainingFocus === "physical") return "physical";
    if (["RW", "LW", "AM"].includes(player.position)) return "technical";
    if (player.position === "ST") return "finishing";
    if (["CB", "RB", "LB", "DM"].includes(player.position)) return "defensive";
    if (["CM"].includes(player.position)) return "playmaker";
    return "balanced";
  }

  function pathwayTrainingFocusForPlayer(player) {
    const focus = pathwayFocusForPlayer(player);
    if (focus === "playmaker" || focus === "technical") return "playmaking";
    if (focus === "defensive") return "defending";
    if (focus === "physical") return "physical";
    if (focus === "finishing") return "finishing";
    return "balanced";
  }

  function preferredLoanRoleForDestination(player, destination) {
    const roleBias = destination && destination.roleBias ? destination.roleBias[player.position] || destination.roleBias[positionBand(player.position)] : null;
    const options = roleOptionsForPosition(player.position).map((role) => role.key);
    if (roleBias && options.includes(roleBias)) return roleBias;
    return bestTacticalRoleForPlayer(player, player.position);
  }

  function loanDestinationFit(state, player, destination) {
    const focus = pathwayFocusForPlayer(player);
    const roleKey = preferredLoanRoleForDestination(player, destination);
    const roleFit = playerRoleFit(player, roleKey, player.position);
    const targetAbility = destination.reputation - (destination.level === "League One" ? 10 : 5);
    const overLevel = Math.max(0, player.currentAbility - targetAbility);
    const underLevel = Math.max(0, targetAbility - player.currentAbility);
    const playingTime = round(clamp(58 + overLevel * 3.4 - underLevel * 5.2 + destination.playingTimeBias, 12, 98), 0);
    const levelFit = round(clamp(96 - Math.abs(player.currentAbility - targetAbility) * 3.8 - Math.max(0, player.currentAbility - destination.reputation - 14) * 2.2, 12, 98), 0);
    const focusScore = destination.focus === focus
      ? 92
      : (destination.secondaryFocus || []).includes(focus)
        ? 78
        : focus === "balanced" || destination.focus === "balanced"
          ? 68
          : 52;
    const reputationFit = round(clamp(42 + destination.reputation * 0.64 + (destination.level === "Championship" ? 7 : -2), 30, 94), 0);
    const score = round(clamp(playingTime * 0.34 + levelFit * 0.24 + roleFit * 0.2 + focusScore * 0.14 + reputationFit * 0.08, 1, 100), 0);
    const tone = score >= 82 ? "green" : score >= 68 ? "blue" : score >= 52 ? "amber" : "red";
    const notes = [
      `${playingTime}/100 playing time`,
      `${levelFit}/100 level fit`,
      `${roleFit}/100 ${tacticalRoleLabel(roleKey)} fit`,
      `${loanFocusLabel(destination.focus)} focus`
    ];
    return {
      destinationId: destination.id,
      name: destination.name,
      clubId: destination.id,
      level: destination.level,
      reputation: destination.reputation,
      style: destination.style,
      focus,
      destinationFocus: destination.focus,
      focusLabel: loanFocusLabel(destination.focus),
      roleKey,
      roleLabel: tacticalRoleLabel(roleKey),
      playingTime,
      levelFit,
      roleFit,
      focusScore,
      reputationFit,
      score,
      tone,
      notes
    };
  }

  function loanDestinationOptions(state, playerId) {
    ensureLoanClubsState(state);
    const player = getPlayer(state, playerId);
    if (!player) return [];
    return YOUTH_LOAN_DESTINATIONS
      .map((destination) => loanDestinationFit(state, player, destination))
      .sort((a, b) => b.score - a.score || b.playingTime - a.playingTime || b.reputation - a.reputation);
  }

  function isYouthLoanCandidate(state, player) {
    const club = getClub(state, state.activeClubId);
    if (!club || !player || player.clubId !== club.id || player.loanUntilSeason) return false;
    normalizePlayerState(player);
    if (player.age > 23) return false;
    if (isUnavailable(state, player)) return false;
    const firstTeamLocked = ["star", "important"].includes(player.squadRole) && player.currentAbility >= (club.reputation || 72) - 3;
    if (firstTeamLocked) return false;
    return player.squadRole === "prospect" || player.squadRole === "backup" || player.age <= 21 || player.potential - player.currentAbility >= 7;
  }

  function activeOutgoingLoanForPlayer(state, playerId) {
    const transfers = ensureTransferState(state);
    return transfers.outgoingLoans.find((loan) => loan.playerId === playerId && loan.status === "active") || null;
  }

  function createPathwayPromise(state, player, options) {
    if (!player) return null;
    normalizePlayerState(player);
    const source = options && options.source ? options.source : "pathway";
    const loanRequired = !!(options && options.loanRequired);
    const focus = options && options.trainingFocus ? options.trainingFocus : pathwayTrainingFocusForPlayer(player);
    const roleKey = options && options.tacticalRoleKey ? options.tacticalRoleKey : bestTacticalRoleForPlayer(player, player.position);
    const currentDate = state.calendar ? state.calendar.currentDate : createSeasonCalendar(state.season || 1).currentDate;
    const dueDate = options && options.dueDate ? options.dueDate : addDays(currentDate, loanRequired ? 250 : 154);
    player.promises.pathway = {
      status: "active",
      source,
      createdDate: currentDate,
      dueDate,
      requiredMinutes: options && Number.isFinite(options.requiredMinutes) ? options.requiredMinutes : loanRequired ? 900 : player.squadRole === "prospect" ? 360 : 540,
      requiredStarts: options && Number.isFinite(options.requiredStarts) ? options.requiredStarts : loanRequired ? 10 : 4,
      squadRole: options && options.squadRole ? options.squadRole : player.squadRole,
      trainingFocus: focus,
      tacticalRoleKey: roleKey,
      loanRequired,
      loanId: options && options.loanId ? options.loanId : null,
      loanClubId: options && options.loanClubId ? options.loanClubId : null,
      lastAlertDay: -999,
      outcome: null
    };
    return player.promises.pathway;
  }

  function pathwayPromiseReport(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player || !player.promises || !player.promises.pathway) return null;
    const promise = player.promises.pathway;
    const loan = promise.loanId
      ? ensureTransferState(state).outgoingLoans.find((item) => item.id === promise.loanId)
      : activeOutgoingLoanForPlayer(state, player.id);
    const loanMinutes = loan ? Number(loan.minutes || 0) : 0;
    const loanStarts = loan ? Number(loan.starts || 0) : 0;
    const seniorMinutes = Number(player.seasonStats && player.seasonStats.minutes || 0);
    const seniorStarts = Number(player.seasonStats && player.seasonStats.starts || 0);
    const minutes = Math.max(seniorMinutes, loanMinutes);
    const starts = Math.max(seniorStarts, loanStarts);
    const minutesProgress = round(clamp(minutes / Math.max(1, promise.requiredMinutes || 1) * 100, 0, 120), 0);
    const startsProgress = round(clamp(starts / Math.max(1, promise.requiredStarts || 1) * 100, 0, 120), 0);
    const roleProgress = roleExpectation(player.squadRole).order >= roleExpectation(promise.squadRole || "prospect").order ? 100 : 54;
    const trainingProgress = player.trainingFocus === promise.trainingFocus || player.individualPlan === "extra" ? 100 : 56;
    const tacticalProgress = promise.tacticalRoleKey ? playerRoleFit(player, promise.tacticalRoleKey, player.position) : 68;
    const loanProgress = promise.loanRequired
      ? loan ? round(clamp((loan.fitScore || 60) * 0.42 + minutesProgress * 0.34 + (loan.averageRating || 6.6) * 7.2, 0, 100), 0) : 0
      : loan ? round(clamp(76 + (loan.fitScore || 60) * 0.18, 0, 100), 0) : 64;
    const weighted = promise.loanRequired
      ? loanProgress * 0.48 + minutesProgress * 0.22 + tacticalProgress * 0.14 + trainingProgress * 0.1 + roleProgress * 0.06
      : Math.max(minutesProgress, startsProgress) * 0.44 + roleProgress * 0.18 + trainingProgress * 0.18 + tacticalProgress * 0.14 + loanProgress * 0.06;
    const progress = round(clamp(weighted, 0, 100), 0);
    const today = state.calendar ? state.calendar.currentDate : createSeasonCalendar(state.season || 1).currentDate;
    const daysRemaining = promise.dueDate ? daysBetween(today, promise.dueDate) : 0;
    const effectiveStatus = promise.status || "active";
    const label = effectiveStatus === "fulfilled"
      ? "Promise Kept"
      : effectiveStatus === "broken"
        ? "Promise Broken"
        : progress >= 78
          ? "On Track"
          : daysRemaining <= 21 && progress < 58
            ? "At Risk"
            : "Developing";
    const tone = effectiveStatus === "fulfilled" ? "green" : effectiveStatus === "broken" ? "red" : label === "On Track" ? "green" : label === "At Risk" ? "amber" : "blue";
    return {
      playerId: player.id,
      promise,
      loan,
      status: effectiveStatus,
      label,
      tone,
      progress,
      daysRemaining,
      minutes,
      starts,
      minutesProgress,
      startsProgress,
      roleProgress,
      trainingProgress,
      tacticalProgress,
      loanProgress,
      roleLabel: tacticalRoleLabel(promise.tacticalRoleKey),
      focusLabel: trainingFocusLabel(promise.trainingFocus),
      dueDate: promise.dueDate,
      detail: promise.loanRequired
        ? loan ? `${loan.appearances || 0} loan apps at ${loan.destinationName}` : "Loan pathway still needed"
        : `${minutes}/${promise.requiredMinutes} minutes`
    };
  }

  function playerLoanReport(state, playerId) {
    const transfers = ensureTransferState(state);
    const loan = transfers.outgoingLoans.find((item) => item.playerId === playerId && item.status === "active") ||
      transfers.outgoingLoans.find((item) => item.playerId === playerId && item.status === "complete");
    if (!loan) return null;
    return {
      loan,
      club: getClub(state, loan.toClubId),
      promise: pathwayPromiseReport(state, playerId),
      averageRating: loan.ratingApps ? round(loan.ratingTotal / loan.ratingApps, 2) : 0,
      progress: round(clamp((loan.fitScore || 60) * 0.42 + (loan.minutes || 0) / 12 + (loan.averageRating || 6.6) * 6, 0, 100), 0)
    };
  }

  function youthPathwayReport(state) {
    const club = getClub(state, state.activeClubId);
    const transfers = ensureTransferState(state);
    ensureLoanClubsState(state);
    const candidates = club ? clubPlayers(state, club.id)
      .filter((player) => isYouthLoanCandidate(state, player))
      .map((player) => {
        const destinations = loanDestinationOptions(state, player.id).slice(0, 3);
        return {
          player,
          destinations,
          bestDestination: destinations[0] || null,
          promise: pathwayPromiseReport(state, player.id)
        };
      })
      .sort((a, b) => (b.bestDestination ? b.bestDestination.score : 0) - (a.bestDestination ? a.bestDestination.score : 0) || b.player.potential - a.player.potential)
      .slice(0, 12) : [];
    const activeLoans = transfers.outgoingLoans
      .filter((loan) => loan.status === "active")
      .map((loan) => ({
        loan,
        player: getPlayer(state, loan.playerId),
        club: getClub(state, loan.toClubId),
        promise: pathwayPromiseReport(state, loan.playerId)
      }))
      .filter((row) => row.player)
      .sort((a, b) => (b.promise ? b.promise.progress : 0) - (a.promise ? a.promise.progress : 0));
    const promises = Object.values(state.players || {})
      .map((player) => pathwayPromiseReport(state, player.id))
      .filter(Boolean)
      .filter((report) => {
        const player = getPlayer(state, report.playerId);
        return player && (player.clubId === state.activeClubId || player.parentClubId === state.activeClubId);
      })
      .sort((a, b) => a.progress - b.progress);
    return {
      destinations: ensureLoanClubsState(state),
      candidates,
      activeLoans,
      promises,
      kept: promises.filter((promise) => promise.status === "fulfilled").length,
      atRisk: promises.filter((promise) => promise.label === "At Risk" || promise.status === "broken").length
    };
  }

  function loanOutYouthPlayer(state, playerId, destinationId) {
    const player = getPlayer(state, playerId);
    const activeClub = getClub(state, state.activeClubId);
    const window = transferWindowStatus(state);
    if (!player || !activeClub || player.clubId !== activeClub.id) return { ok: false, message: "Player is not available for an outgoing loan." };
    if (!isYouthLoanCandidate(state, player)) return { ok: false, message: "This player is too established or unavailable for a youth pathway loan." };
    if (!window.isOpen) return { ok: false, message: `Youth loans can start when the ${window.nextWindow.name} opens on ${formatGameDate(window.opensOn)}.` };
    const options = loanDestinationOptions(state, player.id);
    const destination = options.find((item) => item.destinationId === destinationId) || options[0];
    const destinationClub = destination ? getClub(state, destination.destinationId) : null;
    if (!destination || !destinationClub) return { ok: false, message: "Loan destination unavailable." };

    const transfers = ensureTransferState(state);
    const loanId = `yl-${state.season}-${transfers.nextLoanId++}`;
    const loan = {
      id: loanId,
      playerId: player.id,
      fromClubId: activeClub.id,
      toClubId: destinationClub.id,
      destinationName: destinationClub.name,
      destinationLevel: destination.level,
      focus: destination.destinationFocus,
      focusLabel: destination.focusLabel,
      roleKey: destination.roleKey,
      roleLabel: destination.roleLabel,
      fitScore: destination.score,
      playingTimeScore: destination.playingTime,
      levelFit: destination.levelFit,
      roleFit: destination.roleFit,
      reputationFit: destination.reputationFit,
      status: "active",
      startedDate: state.calendar ? state.calendar.currentDate : null,
      dueSeason: state.season + 1,
      lastReportDay: state.calendar ? state.calendar.day || 1 : 1,
      daysOnLoan: 0,
      appearances: 0,
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      ratingTotal: 0,
      ratingApps: 0,
      averageRating: 0,
      progressNotes: []
    };
    transfers.outgoingLoans.unshift(loan);
    transfers.outgoingLoans = transfers.outgoingLoans.slice(0, 80);

    movePlayerBetweenClubs(state, player.id, activeClub.id, destinationClub.id);
    player.parentClubId = activeClub.id;
    player.loanUntilSeason = state.season + 1;
    player.loanDevelopment = {
      loanId,
      destinationName: destinationClub.name,
      focus: destination.destinationFocus,
      roleKey: destination.roleKey,
      fitScore: destination.score,
      startedDate: loan.startedDate
    };
    createPathwayPromise(state, player, {
      source: "loan-pathway",
      loanRequired: true,
      loanId,
      loanClubId: destinationClub.id,
      trainingFocus: pathwayTrainingFocusForPlayer(player),
      tacticalRoleKey: destination.roleKey,
      requiredMinutes: destination.playingTime >= 78 ? 1200 : 900,
      requiredStarts: destination.playingTime >= 78 ? 14 : 10,
      dueDate: state.calendar ? state.calendar.seasonEndDate : addDays(loan.startedDate, 250)
    });
    recordTransfer(state, {
      type: "loan",
      playerId: player.id,
      playerName: player.name,
      fromClubId: activeClub.id,
      toClubId: destinationClub.id,
      fee: 0,
      wage: player.wage
    });
    addInbox(state, "Youth Loan Agreed", `${player.name} joined ${destinationClub.name} on loan. Fit: ${destination.score}/100, role: ${destination.roleLabel}, focus: ${destination.focusLabel}.`);
    refreshTransferMarket(state);
    return { ok: true, message: `${player.name} loaned to ${destinationClub.name}.`, loanId, destination };
  }

  function recordLoanAppearance(state, player, loan, started, minutes, rating) {
    loan.appearances += 1;
    loan.starts += started ? 1 : 0;
    loan.minutes += minutes;
    loan.ratingTotal += rating;
    loan.ratingApps += 1;
    loan.averageRating = round(loan.ratingTotal / Math.max(1, loan.ratingApps), 2);
    const goalChance = player.position === "ST" ? 0.24 : ["RW", "LW", "AM"].includes(player.position) ? 0.15 : ["CM"].includes(player.position) ? 0.06 : 0.02;
    const assistChance = ["AM", "RW", "LW", "CM"].includes(player.position) ? 0.18 : ["RB", "LB", "DM"].includes(player.position) ? 0.09 : 0.05;
    const goals = random(state) < goalChance + Math.max(0, rating - 7) * 0.08 ? 1 : 0;
    const assists = random(state) < assistChance + Math.max(0, rating - 7) * 0.06 ? 1 : 0;
    loan.goals += goals;
    loan.assists += assists;
    addPlayerStat(player.seasonStats, "apps", 1);
    addPlayerStat(player.careerTotals, "apps", 1);
    if (started) {
      addPlayerStat(player.seasonStats, "starts", 1);
      addPlayerStat(player.careerTotals, "starts", 1);
    }
    addPlayerStat(player.seasonStats, "minutes", minutes);
    addPlayerStat(player.careerTotals, "minutes", minutes);
    addPlayerStat(player.seasonStats, "goals", goals);
    addPlayerStat(player.careerTotals, "goals", goals);
    addPlayerStat(player.seasonStats, "assists", assists);
    addPlayerStat(player.careerTotals, "assists", assists);
    addPlayerStat(player.seasonStats, "ratingTotal", rating);
    addPlayerStat(player.careerTotals, "ratingTotal", rating);
    addPlayerStat(player.seasonStats, "ratingApps", 1);
    addPlayerStat(player.careerTotals, "ratingApps", 1);
    player.form.unshift(rating);
    player.form = player.form.slice(0, 5);
    player.sharpness = Math.round(clamp(player.sharpness + (started ? 2 : 1), 0, 100));
    player.fitness = Math.round(clamp(player.fitness - randomFloat(state, 1.4, 4.2), 35, 100));
    player.morale = Math.round(clamp(player.morale + (rating >= 7 ? 2 : rating < 6.3 ? -1 : 1), 0, 100));
  }

  function processOutgoingLoansDaily(state) {
    const transfers = ensureTransferState(state);
    if (!transfers.outgoingLoans.length || !state.calendar) return null;
    const day = state.calendar.day || 1;
    let event = null;
    transfers.outgoingLoans.forEach((loan) => {
      if (loan.status !== "active") return;
      const player = getPlayer(state, loan.playerId);
      if (!player || player.parentClubId !== state.activeClubId) {
        loan.status = "complete";
        return;
      }
      loan.daysOnLoan = Math.max(0, daysBetween(loan.startedDate || state.calendar.currentDate, state.calendar.currentDate));
      if (day % 7 === 0) {
        const appearanceChance = clamp((loan.playingTimeScore || 60) / 100 * 0.88 + Math.max(0, player.currentAbility - 58) / 220, 0.18, 0.94);
        if (random(state) < appearanceChance) {
          const started = random(state) < clamp((loan.playingTimeScore || 60) / 112, 0.32, 0.88);
          const minutes = started ? randomInt(state, 62, 96) : randomInt(state, 16, 36);
          const rating = round(clamp(6.15 + (loan.fitScore - 60) / 70 + (player.currentAbility - 58) / 130 + randomFloat(state, -0.55, 0.85), 5.6, 8.6), 2);
          recordLoanAppearance(state, player, loan, started, minutes, rating);
          if (random(state) < 0.16 + (loan.fitScore || 60) / 900) {
            const plan = ACADEMY_PLANS[loan.focus] || ACADEMY_PLANS.balanced;
            const attribute = pick(state, plan.attributes);
            const before = player.attributes[attribute] || player.currentAbility;
            player.attributes[attribute] = Math.round(clamp(before + 1, 18, 99));
            player.currentAbility = calculateAbilityFromAttributes(player);
            player.potential = Math.max(player.potential, player.currentAbility);
            player.value = calculatePlayerValue(player);
            const developmentEvent = {
              date: state.calendar.currentDate,
              attribute,
              before,
              after: player.attributes[attribute],
              focus: player.trainingFocus,
              source: "loan"
            };
            player.developmentEvents.unshift(developmentEvent);
            player.developmentEvents = player.developmentEvents.slice(0, 18);
          }
        }
      }
      if (day - (loan.lastReportDay || -999) >= 28) {
        loan.lastReportDay = day;
        const report = pathwayPromiseReport(state, player.id);
        const note = `${player.name} has ${loan.appearances} apps, ${loan.minutes} minutes and a ${loan.averageRating || "-"} average rating at ${loan.destinationName}.`;
        loan.progressNotes.unshift({ date: state.calendar.currentDate, note, progress: report ? report.progress : 0 });
        loan.progressNotes = loan.progressNotes.slice(0, 8);
        addInbox(state, "Loan Progress", `${note} Pathway status: ${report ? report.label : "Developing"}.`);
        if (!event) event = { type: "loan", title: "Loan Progress", playerId: player.id, loanId: loan.id };
      }
    });
    return event;
  }

  function processPathwayPromisesDaily(state) {
    if (!state.calendar) return null;
    const day = state.calendar.day || 1;
    let event = null;
    Object.values(state.players || {}).forEach((player) => {
      normalizePlayerState(player);
      const promise = player.promises && player.promises.pathway;
      if (!promise || promise.status !== "active") return;
      if (player.clubId !== state.activeClubId && player.parentClubId !== state.activeClubId) return;
      const report = pathwayPromiseReport(state, player.id);
      if (!report) return;
      if (report.progress >= 86) {
        promise.status = "fulfilled";
        promise.outcome = "kept";
        player.morale = Math.round(clamp(player.morale + randomInt(state, 4, 9), 0, 100));
        addInbox(state, "Pathway Promise Kept", `${player.name}'s development pathway is on track. ${report.detail}.`);
        if (!event) event = { type: "pathway", title: "Pathway Promise Kept", playerId: player.id };
      } else if (promise.dueDate && compareDates(state.calendar.currentDate, promise.dueDate) > 0) {
        promise.status = "broken";
        promise.outcome = "broken";
        player.morale = Math.round(clamp(player.morale - randomInt(state, 8, 16), 0, 100));
        addInbox(state, "Pathway Promise Broken", `${player.name}'s pathway promise was missed. ${report.detail}.`);
        if (!event) event = { type: "pathway", title: "Pathway Promise Broken", playerId: player.id };
      } else if (report.label === "At Risk" && day - (promise.lastAlertDay || -999) >= 21) {
        promise.lastAlertDay = day;
        player.morale = Math.round(clamp(player.morale - randomInt(state, 1, 4), 0, 100));
        addInbox(state, "Pathway Promise Risk", `${player.name}'s pathway needs attention before ${formatGameDate(promise.dueDate)}. ${report.detail}.`);
        if (!event) event = { type: "pathway", title: "Pathway Promise Risk", playerId: player.id };
      }
    });
    return event;
  }

  function addTransferNews(state, news) {
    const transfers = ensureTransferState(state);
    const suffix = transfers.news.length + transfers.history.length + transfers.offers.length + transfers.preAgreements.length + 1;
    const record = {
      id: `news-${state.season}-${state.calendar ? state.calendar.day || 0 : 0}-${suffix}`,
      season: state.season,
      round: state.league.currentRound + 1,
      date: state.calendar ? state.calendar.currentDate : null,
      type: news.type || "market",
      tone: news.tone || "blue",
      priority: news.priority || "normal",
      title: news.title,
      body: news.body,
      playerId: news.playerId || null,
      fromClubId: news.fromClubId || null,
      toClubId: news.toClubId || null,
      fee: news.fee || 0
    };
    transfers.news.unshift(record);
    transfers.news = transfers.news.slice(0, 80);
    return record;
  }

  function leaguePosition(state, clubId) {
    const table = calculateTable(state);
    const index = table.findIndex((row) => row.clubId === clubId);
    return index >= 0 ? index + 1 : table.length;
  }

  function isDirectMarketRival(state, clubId) {
    const activeClub = getClub(state, state.activeClubId);
    const club = getClub(state, clubId);
    if (!activeClub || !club || club.id === activeClub.id) return false;
    const reputationRival = Math.abs((club.reputation || 0) - (activeClub.reputation || 0)) <= 5;
    const positionRival = Math.abs(leaguePosition(state, club.id) - leaguePosition(state, activeClub.id)) <= 4;
    return reputationRival || positionRival;
  }

  function addTransferNewsFromRecord(state, transferRecord) {
    if (!["transfer", "loan", "free-agent"].includes(transferRecord.type)) return null;
    const player = getPlayer(state, transferRecord.playerId) || { name: transferRecord.playerName, currentAbility: 0, position: "Player" };
    const fromClub = transferRecord.fromClubId ? getClub(state, transferRecord.fromClubId) : null;
    const toClub = transferRecord.toClubId ? getClub(state, transferRecord.toClubId) : null;
    if (!player || !toClub) return null;
    const activeInvolved = transferRecord.fromClubId === state.activeClubId || transferRecord.toClubId === state.activeClubId;
    const rivalInvolved = isDirectMarketRival(state, transferRecord.fromClubId) || isDirectMarketRival(state, transferRecord.toClubId);
    const major = activeInvolved || transferRecord.fee >= 22000000 || player.currentAbility >= 80;
    const rivalAlert = rivalInvolved && (transferRecord.fee >= 8000000 || player.currentAbility >= 72 || transferRecord.type === "loan");
    let title = "";
    let body = "";
    let tone = "blue";
    if (transferRecord.type === "transfer") {
      title = `${toClub.name} sign ${player.name}`;
      body = `${fromClub ? fromClub.name : "Free agency"} accepted ${formatMoney(transferRecord.fee)} for the ${player.position}.`;
      tone = major ? "green" : "blue";
    } else if (transferRecord.type === "loan") {
      title = `${player.name} joins ${toClub.name} on loan`;
      body = `${fromClub ? fromClub.name : "Parent club"} sanctioned a season-long loan move.`;
      tone = "amber";
    } else {
      title = `${toClub.name} sign free agent ${player.name}`;
      body = `${player.name} agreed terms after leaving their previous club.`;
      tone = "green";
    }
    const item = addTransferNews(state, {
      type: transferRecord.type,
      tone,
      priority: major ? "major" : rivalAlert ? "rival" : "normal",
      title,
      body,
      playerId: transferRecord.playerId,
      fromClubId: transferRecord.fromClubId,
      toClubId: transferRecord.toClubId,
      fee: transferRecord.fee
    });
    if ((major || rivalAlert) && !activeInvolved) {
      addInbox(state, rivalAlert ? "Rival Market News" : "Market News", `${title}. ${body}`);
    }
    return item;
  }

  function fixturesInWindow(state, clubId, days) {
    const currentDate = state.calendar ? state.calendar.currentDate : createSeasonCalendar(state.season).currentDate;
    return state.league.schedule.reduce((count, roundData) => {
      if (!roundData || !roundData.date) return count;
      const distance = daysBetween(currentDate, roundData.date);
      if (distance < 0 || distance > days) return count;
      const hasClub = roundData.fixtures.some((fixture) => fixture.homeClubId === clubId || fixture.awayClubId === clubId);
      return count + (hasClub ? 1 : 0);
    }, 0);
  }

  function aiClubMarketUrgency(state, club, report) {
    const needs = report || recruitmentNeedReport(state, club.id);
    const primaryNeed = needs.primary ? needs.primary.score : 0;
    const squad = clubPlayers(state, club.id);
    const injuries = squad.filter((player) => isInjured(state, player)).length;
    const lowFitness = squad.filter((player) => player.fitness < 55 && !isUnavailable(state, player)).length;
    const fixtureLoad = fixturesInWindow(state, club.id, 14);
    const position = leaguePosition(state, club.id);
    const ambition = clamp((club.reputation || 65) - 58, 0, 35);
    const pressure = position <= 6 ? 14 : position >= 15 ? 11 : 5;
    const budgetFlex = clamp(club.transferBudget / 22000000, 0, 16);
    return round(primaryNeed * 0.55 + injuries * 9 + lowFitness * 2.5 + Math.max(0, fixtureLoad - 2) * 4 + ambition + pressure + budgetFlex, 1);
  }

  function dailyAiMarketChance(state, window) {
    const base = window.isDeadlineDay ? 0.34 : window.daysRemaining <= 7 ? 0.16 : 0.08;
    const injuredClubs = state.league.clubs.filter((club) => club.id !== state.activeClubId && clubPlayers(state, club.id).some((player) => isInjured(state, player))).length;
    const congestedClubs = state.league.clubs.filter((club) => club.id !== state.activeClubId && fixturesInWindow(state, club.id, 14) >= 3).length;
    const pressureLift = clamp((injuredClubs + congestedClubs) * 0.006, 0, 0.06);
    return clamp(base + pressureLift, 0.04, window.isDeadlineDay ? 0.44 : 0.22);
  }

  function sellerCanLosePlayer(state, seller, player) {
    if (!seller || !player || seller.id === state.activeClubId) return false;
    if ((seller.squad || []).length <= 22) return false;
    const squad = clubPlayers(state, seller.id);
    const depth = squad.filter((item) => item.position === player.position || (item.secondaryPositions || []).includes(player.position)).length;
    const roleRank = squad.slice().sort((a, b) => b.currentAbility - a.currentAbility).findIndex((item) => item.id === player.id);
    const keyPlayer = roleRank >= 0 && roleRank < 5;
    if (depth <= desiredDepth(player.position) && keyPlayer && player.contractYears > 1 && player.morale >= 42) return false;
    return true;
  }

  function aiEstimatedTransferCost(state, player) {
    const stance = sellerStance(state, player);
    const leverage = player.contractYears <= 1 ? 0.9 : player.age >= 31 ? 0.94 : 1;
    return moneyRound(Math.max(player.value * 0.72, player.value * stance.askingMultiplier * leverage));
  }

  function aiTransferCandidateScore(state, buyer, need, player, estimatedFee) {
    const positions = [player.position].concat(player.secondaryPositions || []);
    const positionFit = positions.includes(need.position) ? 18 : -6;
    const ageFit = player.age <= 22 ? 12 : player.age <= 26 ? 9 : player.age <= 29 ? 5 : player.age <= 32 ? -3 : -10;
    const growth = clamp((player.potential || player.currentAbility) - player.currentAbility, 0, 20);
    const feeFit = clamp(36 - estimatedFee / Math.max(1, buyer.transferBudget) * 34, -16, 36);
    const contractFit = player.contractYears <= 1 ? 8 : 0;
    const qualityFit = clamp((player.currentAbility - Math.max(54, buyer.reputation - 11)) * 1.2, -18, 28);
    return round(need.score * 0.38 + player.currentAbility * 0.28 + positionFit + ageFit + growth * 0.45 + feeFit + contractFit + qualityFit, 1);
  }

  function aiTransferCandidates(state, buyer, need) {
    const wageRoom = Math.max(0, buyer.wageBudget - weeklyWageSpend(state, buyer.id));
    return Object.values(state.players)
      .filter((player) => {
        if (!player || !player.clubId || player.clubId === buyer.id || player.clubId === state.activeClubId || player.loanUntilSeason) return false;
        const seller = getClub(state, player.clubId);
        if (!seller || seller.id === state.activeClubId || !sellerCanLosePlayer(state, seller, player)) return false;
        const positions = [player.position].concat(player.secondaryPositions || []);
        if (!positions.includes(need.position)) return false;
        const estimatedFee = aiEstimatedTransferCost(state, player);
        const estimatedWage = moneyRound(player.wage * 1.12);
        if (estimatedFee > buyer.transferBudget * 0.82) return false;
        if (weeklyWageSpend(state, buyer.id) + estimatedWage > buyer.wageBudget || estimatedWage > wageRoom) return false;
        return player.currentAbility >= Math.max(50, buyer.reputation - 18);
      })
      .map((player) => {
        const estimatedFee = aiEstimatedTransferCost(state, player);
        return {
          player,
          estimatedFee,
          score: aiTransferCandidateScore(state, buyer, need, player, estimatedFee)
        };
      })
      .sort((a, b) => b.score - a.score || b.player.currentAbility - a.player.currentAbility);
  }

  function aiBuyerPool(state, options) {
    const forcedBuyer = options && options.buyerClubId ? getClub(state, options.buyerClubId) : null;
    const candidates = forcedBuyer ? [forcedBuyer] : state.league.clubs;
    return shuffle(state, candidates.filter((club) => {
      if (!club || club.id === state.activeClubId || club.transferBudget < 250000) return false;
      return weeklyWageSpend(state, club.id) < club.wageBudget;
    }))
      .map((club) => {
        const report = recruitmentNeedReport(state, club.id);
        return { club, report, urgency: aiClubMarketUrgency(state, club, report) + randomFloat(state, 0, 12) };
      })
      .sort((a, b) => b.urgency - a.urgency);
  }

  function aiNeedList(report, options) {
    const needs = options && options.needPosition
      ? report.needs.filter((need) => need.position === options.needPosition)
      : report.needs.filter((need) => need.score >= 24).slice(0, 5);
    return needs.length ? needs : report.needs.slice(0, 3);
  }

  function addAiTransferRumor(state, buyer, player, need) {
    const seller = getClub(state, player.clubId);
    return addTransferNews(state, {
      type: "rumor",
      tone: "amber",
      priority: player.currentAbility >= 78 ? "major" : "normal",
      title: `${buyer.name} eye ${player.name}`,
      body: `${buyer.name} are monitoring ${player.name} as a ${need.position} option before the window closes.`,
      playerId: player.id,
      fromClubId: seller ? seller.id : null,
      toClubId: buyer.id,
      fee: aiEstimatedTransferCost(state, player)
    });
  }

  function addAiBidNews(state, buyer, player, need, fee) {
    const seller = getClub(state, player.clubId);
    return addTransferNews(state, {
      type: "bid",
      tone: "blue",
      priority: player.currentAbility >= 78 || isDirectMarketRival(state, buyer.id) ? "rival" : "normal",
      title: `${buyer.name} bid for ${player.name}`,
      body: `${seller ? seller.name : "The selling club"} are considering ${formatMoney(fee)} for a ${need.position} target.`,
      playerId: player.id,
      fromClubId: seller ? seller.id : null,
      toClubId: buyer.id,
      fee
    });
  }

  function addAiFailedBidNews(state, buyer, player, need, fee, reason) {
    const seller = getClub(state, player.clubId);
    return addTransferNews(state, {
      type: "failed-bid",
      tone: "red",
      priority: player.currentAbility >= 78 || isDirectMarketRival(state, buyer.id) ? "rival" : "normal",
      title: `${buyer.name} miss out on ${player.name}`,
      body: `${seller ? seller.name : "The selling club"} walked away from ${formatMoney(fee)}. ${reason || `${buyer.name} still want ${need.position} depth.`}`,
      playerId: player.id,
      fromClubId: seller ? seller.id : null,
      toClubId: buyer.id,
      fee
    });
  }

  function addDeadlineMarketPulse(state) {
    const window = transferWindowStatus(state);
    if (!window.isDeadlineDay) return null;
    const buyers = aiBuyerPool(state, {});
    const urgent = buyers.find((item) => item.urgency >= 58) || buyers[0];
    if (!urgent) return null;
    const need = urgent.report.primary || urgent.report.needs[0];
    return addTransferNews(state, {
      type: "deadline",
      tone: "amber",
      priority: isDirectMarketRival(state, urgent.club.id) ? "rival" : "normal",
      title: `${urgent.club.name} working late`,
      body: `${urgent.club.name} are pushing for ${need.position} cover before the ${window.window.name.toLowerCase()} closes.`,
      toClubId: urgent.club.id
    });
  }

  function sellerCanLoanPlayer(state, seller, player) {
    if (!seller || !player || seller.id === state.activeClubId || player.loanUntilSeason) return false;
    if ((seller.squad || []).length <= 22) return false;
    const squad = clubPlayers(state, seller.id);
    const depth = squad.filter((item) => item.position === player.position || (item.secondaryPositions || []).includes(player.position)).length;
    const roleRank = squad.slice().sort((a, b) => b.currentAbility - a.currentAbility).findIndex((item) => item.id === player.id);
    const sellerStrength = teamStrength(state, seller.id).overall;
    if (player.realWorld && player.source && (player.source.cost >= 55 || player.source.starts >= 14 || player.source.minutes >= 1200)) return false;
    if (roleRank >= 0 && roleRank < 9) return false;
    if (player.currentAbility >= sellerStrength - 2) return false;
    const growthRoom = (player.potential || player.currentAbility) - player.currentAbility;
    const backup = roleRank >= 13 || player.currentAbility < sellerStrength - 6;
    const developmentLoan = player.age <= 22 && growthRoom >= 7 && player.currentAbility < sellerStrength - 4;
    return depth > desiredDepth(player.position) && (backup || developmentLoan);
  }

  function aiLoanCandidateScore(state, buyer, need, player) {
    const positions = [player.position].concat(player.secondaryPositions || []);
    const positionFit = positions.includes(need.position) ? 22 : -10;
    const development = clamp((player.potential || player.currentAbility) - player.currentAbility, 0, 22);
    const ageFit = player.age <= 20 ? 13 : player.age <= 23 ? 10 : player.age <= 26 ? 3 : -8;
    const roleFit = clamp((player.currentAbility - Math.max(48, buyer.reputation - 20)) * 1.1, -16, 24);
    const wageFit = clamp(18 - player.wage / Math.max(1, buyer.wageBudget - weeklyWageSpend(state, buyer.id)) * 18, -12, 18);
    return round(need.score * 0.45 + positionFit + development * 0.55 + ageFit + roleFit + wageFit, 1);
  }

  function aiLoanCandidates(state, buyer, need) {
    const wageRoom = Math.max(0, buyer.wageBudget - weeklyWageSpend(state, buyer.id));
    return Object.values(state.players)
      .filter((player) => {
        if (!player || !player.clubId || player.clubId === buyer.id || player.clubId === state.activeClubId || player.loanUntilSeason) return false;
        const seller = getClub(state, player.clubId);
        if (!seller || seller.id === state.activeClubId || !sellerCanLoanPlayer(state, seller, player)) return false;
        const positions = [player.position].concat(player.secondaryPositions || []);
        if (!positions.includes(need.position)) return false;
        if (player.wage > wageRoom) return false;
        return player.currentAbility >= Math.max(46, buyer.reputation - 22);
      })
      .map((player) => ({ player, score: aiLoanCandidateScore(state, buyer, need, player) }))
      .sort((a, b) => b.score - a.score || b.player.potential - a.player.potential);
  }

  function addAiLoanRumor(state, buyer, player, need) {
    const seller = getClub(state, player.clubId);
    return addTransferNews(state, {
      type: "loan-rumor",
      tone: "amber",
      priority: isDirectMarketRival(state, buyer.id) ? "rival" : "normal",
      title: `${buyer.name} discuss ${player.name} loan`,
      body: `${buyer.name} want short-term ${need.position} cover and ${seller ? seller.name : "the parent club"} could sanction a loan.`,
      playerId: player.id,
      fromClubId: seller ? seller.id : null,
      toClubId: buyer.id,
      fee: 0
    });
  }

  function completeAiClubLoan(state, buyer, player) {
    const seller = getClub(state, player.clubId);
    if (!seller || seller.id === state.activeClubId || buyer.id === state.activeClubId) return null;
    if (weeklyWageSpend(state, buyer.id) + player.wage > buyer.wageBudget) return null;
    completeLoanMove(state, player.id, seller.id, buyer.id);
    return {
      type: "loan",
      playerId: player.id,
      playerName: player.name,
      fromClubId: seller.id,
      toClubId: buyer.id,
      fee: 0,
      wage: player.wage,
      recordId: state.transfers.history[0] ? state.transfers.history[0].id : null
    };
  }

  function completeAiClubTransfer(state, buyer, player, estimatedFee) {
    const seller = getClub(state, player.clubId);
    if (!seller || seller.id === state.activeClubId || buyer.id === state.activeClubId) return null;
    const fee = moneyRound(estimatedFee * randomFloat(state, 0.96, 1.1));
    const wage = moneyRound(player.wage * randomFloat(state, 1.02, 1.2));
    if (fee > buyer.transferBudget) return null;
    if (weeklyWageSpend(state, buyer.id) + wage > buyer.wageBudget) return null;
    transferPlayer(state, player.id, seller.id, buyer.id, fee, wage);
    return {
      type: "transfer",
      playerId: player.id,
      playerName: player.name,
      fromClubId: seller.id,
      toClubId: buyer.id,
      fee,
      wage,
      recordId: state.transfers.history[0] ? state.transfers.history[0].id : null
    };
  }

  function completeAiFreeAgentSigning(state, buyer, need) {
    const wageRoom = Math.max(0, buyer.wageBudget - weeklyWageSpend(state, buyer.id));
    const candidates = (state.transfers.freeAgentIds || [])
      .map((id) => getPlayer(state, id))
      .filter((player) => {
        if (!player || player.clubId || player.loanUntilSeason) return false;
        const positions = [player.position].concat(player.secondaryPositions || []);
        return positions.includes(need.position) && player.wage * 1.1 <= wageRoom && player.currentAbility >= Math.max(48, buyer.reputation - 20);
      })
      .sort((a, b) => b.currentAbility - a.currentAbility || b.potential - a.potential);
    const player = candidates[0];
    if (!player) return null;
    const wage = moneyRound(player.wage * randomFloat(state, 1.02, 1.18));
    completeFreeAgentSigning(state, player.id, buyer.id, wage);
    return {
      type: "free-agent",
      playerId: player.id,
      playerName: player.name,
      fromClubId: null,
      toClubId: buyer.id,
      fee: 0,
      wage,
      recordId: state.transfers.history[0] ? state.transfers.history[0].id : null
    };
  }

  function processAiClubTransfer(state, options) {
    ensureTransferState(state);
    const window = transferWindowStatus(state);
    if (!window.isOpen) return null;
    const buyers = aiBuyerPool(state, options || {});
    for (const item of buyers) {
      const buyer = item.club;
      const needs = aiNeedList(item.report, options || {});
      for (const need of needs) {
        const candidates = aiTransferCandidates(state, buyer, need);
        if (candidates.length) {
          const target = pick(state, candidates.slice(0, Math.min(5, candidates.length)));
          if (options && options.allowRumor && random(state) < (window.isDeadlineDay ? 0.12 : 0.22)) {
            return {
              type: "rumor",
              playerId: target.player.id,
              fromClubId: target.player.clubId,
              toClubId: buyer.id,
              newsId: addAiTransferRumor(state, buyer, target.player, need).id
            };
          }
          if (options && options.allowBid && random(state) < (window.isDeadlineDay ? 0.12 : 0.18)) {
            return {
              type: "bid",
              playerId: target.player.id,
              fromClubId: target.player.clubId,
              toClubId: buyer.id,
              newsId: addAiBidNews(state, buyer, target.player, need, target.estimatedFee).id
            };
          }
          if (options && options.allowFailed && random(state) < (window.isDeadlineDay ? 0.16 : 0.1)) {
            const reason = target.estimatedFee > target.player.value * 1.2 ? "The asking price stayed too high." : "Personal terms slowed the move.";
            return {
              type: "failed-bid",
              playerId: target.player.id,
              fromClubId: target.player.clubId,
              toClubId: buyer.id,
              newsId: addAiFailedBidNews(state, buyer, target.player, need, target.estimatedFee, reason).id
            };
          }
          const completed = completeAiClubTransfer(state, buyer, target.player, target.estimatedFee);
          if (completed) return completed;
        }
        const freeAgent = completeAiFreeAgentSigning(state, buyer, need);
        if (freeAgent) return freeAgent;
      }
    }
    return null;
  }

  function processAiClubLoan(state, options) {
    ensureTransferState(state);
    const window = transferWindowStatus(state);
    if (!window.isOpen) return null;
    const buyers = aiBuyerPool(state, options || {});
    for (const item of buyers) {
      const buyer = item.club;
      const needs = aiNeedList(item.report, options || {});
      for (const need of needs) {
        const candidates = aiLoanCandidates(state, buyer, need);
        if (!candidates.length) continue;
        const target = pick(state, candidates.slice(0, Math.min(5, candidates.length)));
        if (options && options.allowRumor && random(state) < (window.isDeadlineDay ? 0.1 : 0.2)) {
          return {
            type: "loan-rumor",
            playerId: target.player.id,
            fromClubId: target.player.clubId,
            toClubId: buyer.id,
            newsId: addAiLoanRumor(state, buyer, target.player, need).id
          };
        }
        if (options && options.allowFailed && random(state) < (window.isDeadlineDay ? 0.12 : 0.08)) {
          return {
            type: "failed-bid",
            playerId: target.player.id,
            fromClubId: target.player.clubId,
            toClubId: buyer.id,
            newsId: addAiFailedBidNews(state, buyer, target.player, need, 0, "The parent club wanted stronger squad-cover guarantees.").id
          };
        }
        const completed = completeAiClubLoan(state, buyer, target.player);
        if (completed) return completed;
      }
    }
    return null;
  }

  function processAiClubMarketActivity(state, options) {
    const window = transferWindowStatus(state);
    if (!window.isOpen) return null;
    if (options && options.allowDeadlineStory && window.isDeadlineDay && random(state) < 0.14) {
      const pulse = addDeadlineMarketPulse(state);
      if (pulse) return { type: "deadline", newsId: pulse.id, toClubId: pulse.toClubId };
    }
    const loanFirst = options && options.preferLoan ? true : options && options.allowLoan && random(state) < (window.isDeadlineDay ? 0.36 : 0.28);
    const first = loanFirst ? processAiClubLoan : processAiClubTransfer;
    const second = loanFirst ? processAiClubTransfer : processAiClubLoan;
    const firstResult = first(state, options || {});
    if (firstResult) return firstResult;
    if (options && options.allowLoan !== false) return second(state, options || {});
    return null;
  }

  function queuePreAgreement(state, agreement) {
    const transfers = ensureTransferState(state);
    const player = getPlayer(state, agreement.playerId);
    if (!player) return { ok: false, message: "Player not found." };
    const window = transferWindowStatus(state);
    const nextWindow = window.isOpen ? window.window : window.nextWindow;
    const existing = transfers.preAgreements.find((item) => item.status === "pending" && item.playerId === agreement.playerId && item.toClubId === agreement.toClubId);
    const record = existing || {
      id: `pa${state.nextOfferId++}`,
      status: "pending",
      agreedSeason: state.season,
      agreedRound: state.league.currentRound + 1,
      agreedDate: state.calendar ? state.calendar.currentDate : null
    };
    Object.assign(record, {
      ...agreement,
      executeDate: nextWindow.opensOn,
      windowName: nextWindow.name
    });
    if (!existing) transfers.preAgreements.unshift(record);
    transfers.preAgreements = transfers.preAgreements.slice(0, 60);
    if (agreement.offerId) {
      const offer = transfers.offers.find((item) => item.id === agreement.offerId);
      if (offer) offer.status = "pre-agreed";
    }
    addInbox(state, "Deal Pre-Agreed", `${player.name} is scheduled to move when the ${nextWindow.name.toLowerCase()} opens on ${formatGameDate(nextWindow.opensOn)}.`);
    return {
      ok: true,
      preAgreement: true,
      agreementId: record.id,
      message: `${player.name} pre-agreed for ${formatGameDate(nextWindow.opensOn)}.`
    };
  }

  function failPreAgreement(state, agreement, reason) {
    agreement.status = "failed";
    agreement.failedDate = state.calendar ? state.calendar.currentDate : null;
    agreement.failureReason = reason;
    const player = getPlayer(state, agreement.playerId);
    if (agreement.toClubId === state.activeClubId || agreement.fromClubId === state.activeClubId) {
      addInbox(state, "Pre-Agreement Failed", `${player ? player.name : "A player"} could not complete their move. ${reason}`);
    }
    return { ok: false, reason };
  }

  function executePreAgreement(state, agreement) {
    const player = getPlayer(state, agreement.playerId);
    if (!player) return failPreAgreement(state, agreement, "Player no longer exists.");
    if (agreement.kind === "transfer") {
      if (player.clubId !== agreement.fromClubId) return failPreAgreement(state, agreement, "The player changed clubs before the window opened.");
      const toClub = getClub(state, agreement.toClubId);
      if (!toClub) return failPreAgreement(state, agreement, "Buying club no longer exists.");
      if (agreement.fee > toClub.transferBudget) return failPreAgreement(state, agreement, "Transfer budget is no longer sufficient.");
      if (weeklyWageSpend(state, toClub.id) + agreement.wage > toClub.wageBudget) return failPreAgreement(state, agreement, "Wage budget is no longer sufficient.");
      transferPlayer(state, player.id, agreement.fromClubId, agreement.toClubId, agreement.fee, agreement.wage);
    } else if (agreement.kind === "free-agent") {
      if (player.clubId) return failPreAgreement(state, agreement, "The player is no longer a free agent.");
      const toClub = getClub(state, agreement.toClubId);
      if (!toClub) return failPreAgreement(state, agreement, "Signing club no longer exists.");
      if (weeklyWageSpend(state, toClub.id) + agreement.wage > toClub.wageBudget) return failPreAgreement(state, agreement, "Wage budget is no longer sufficient.");
      completeFreeAgentSigning(state, player.id, toClub.id, agreement.wage);
    } else if (agreement.kind === "loan") {
      if (player.clubId !== agreement.fromClubId) return failPreAgreement(state, agreement, "The player changed clubs before the window opened.");
      const toClub = getClub(state, agreement.toClubId);
      if (!toClub) return failPreAgreement(state, agreement, "Loan club no longer exists.");
      if (weeklyWageSpend(state, toClub.id) + player.wage > toClub.wageBudget) return failPreAgreement(state, agreement, "Wage budget is no longer sufficient.");
      completeLoanMove(state, player.id, agreement.fromClubId, toClub.id);
    }
    agreement.status = "completed";
    agreement.completedDate = state.calendar ? state.calendar.currentDate : null;
    if (agreement.toClubId === state.activeClubId || agreement.fromClubId === state.activeClubId) {
      addInbox(state, "Pre-Agreement Completed", `${player.name}'s pre-agreed move has been registered.`);
    }
    return { ok: true };
  }

  function processTransferPreAgreements(state) {
    const transfers = ensureTransferState(state);
    const window = transferWindowStatus(state);
    if (!window.isOpen) return [];
    const currentDate = state.calendar ? state.calendar.currentDate : null;
    const processed = [];
    transfers.preAgreements.forEach((agreement) => {
      if (agreement.status !== "pending") return;
      if (agreement.executeDate && currentDate && compareDates(currentDate, agreement.executeDate) < 0) return;
      processed.push({ agreement, result: executePreAgreement(state, agreement) });
    });
    return processed;
  }

  function setTrainingFocus(state, playerId, focus) {
    const player = getPlayer(state, playerId);
    if (!player || !TRAINING_FOCUS[focus]) return { ok: false, message: "Training focus unavailable." };
    player.trainingFocus = focus;
    return { ok: true, message: `${player.name} is now training ${trainingFocusLabel(focus)}.` };
  }

  function trainingFocusLabel(focus) {
    const labels = {
      balanced: "Balanced",
      finishing: "Finishing",
      playmaking: "Playmaking",
      defending: "Defending",
      physical: "Physical",
      mentality: "Mentality"
    };
    return labels[focus] || focus;
  }

  function refillThinSquads(state) {
    state.league.clubs.forEach((club) => {
      while (club.squad.length < 22) {
        const position = pick(state, Data.SQUAD_BLUEPRINT);
        const player = generatePlayer(state, club, position, club.squad.length);
        player.age = randomInt(state, 17, 20);
        player.potential = Math.round(clamp(player.currentAbility + randomFloat(state, 10, 24), player.currentAbility, 95));
        player.value = calculatePlayerValue(player);
        player.wage = calculateWage(player);
        state.players[player.id] = player;
        club.squad.push(player.id);
      }
      club.lineup = autoSelectLineup(state, club.id);
      club.bench = autoSelectBench(state, club.id);
    });
  }

  function completeOutgoingLoanDevelopment(state, loan, player) {
    if (!loan || !player || loan.status === "complete") return null;
    const plan = ACADEMY_PLANS[loan.focus] || ACADEMY_PLANS.balanced;
    const average = loan.ratingApps ? loan.ratingTotal / loan.ratingApps : 6.4;
    const minutesScore = clamp((loan.minutes || 0) / 1500 * 100, 0, 100);
    const appearanceScore = clamp((loan.appearances || 0) / 24 * 100, 0, 100);
    const ratingScore = clamp((average - 5.8) * 42, 0, 100);
    const outcomeScore = round(clamp((loan.fitScore || 60) * 0.26 + minutesScore * 0.28 + appearanceScore * 0.18 + ratingScore * 0.28, 0, 100), 0);
    const growth = outcomeScore >= 82 ? 3 : outcomeScore >= 68 ? 2 : outcomeScore >= 52 ? 1 : 0;
    const beforeAbility = player.currentAbility;
    for (let i = 0; i < growth; i += 1) {
      const attribute = pick(state, plan.attributes);
      player.attributes[attribute] = Math.round(clamp((player.attributes[attribute] || player.currentAbility) + 1, 18, 99));
    }
    player.currentAbility = calculateAbilityFromAttributes(player);
    if (outcomeScore >= 78 && player.age <= 22) {
      player.potential = Math.round(clamp(player.potential + randomFloat(state, 0, 1.8), player.currentAbility, 99));
    }
    player.value = calculatePlayerValue(player);
    player.morale = Math.round(clamp(player.morale + (outcomeScore >= 68 ? randomInt(state, 4, 10) : outcomeScore < 46 ? -randomInt(state, 4, 10) : randomInt(state, -1, 4)), 0, 100));
    loan.status = "complete";
    loan.returnedDate = state.calendar ? state.calendar.currentDate : null;
    loan.outcomeScore = outcomeScore;
    loan.outcome = outcomeScore >= 78 ? "Excellent" : outcomeScore >= 62 ? "Successful" : outcomeScore >= 48 ? "Mixed" : "Disappointing";
    loan.growth = Math.max(0, player.currentAbility - beforeAbility);
    loan.finalAbility = player.currentAbility;
    player.loanDevelopment = {
      ...(player.loanDevelopment || {}),
      status: "complete",
      outcome: loan.outcome,
      outcomeScore,
      growth: loan.growth,
      returnedDate: loan.returnedDate
    };
    const promise = player.promises && player.promises.pathway && player.promises.pathway.loanId === loan.id ? player.promises.pathway : null;
    if (promise && promise.status === "active") {
      if (outcomeScore >= 58 || (loan.minutes || 0) >= (promise.requiredMinutes || 900) * 0.72) {
        promise.status = "fulfilled";
        promise.outcome = "kept";
      } else {
        promise.status = "broken";
        promise.outcome = "broken";
      }
    }
    if (player.parentClubId === state.activeClubId) {
      addInbox(state, "Loan Return", `${player.name} returned from ${loan.destinationName}: ${loan.outcome}, ${loan.appearances} apps, ${loan.minutes} minutes, ${loan.averageRating || "-"} avg rating.`);
    }
    return loan;
  }

  function processLoansAndContracts(state) {
    const transfers = ensureTransferState(state);
    Object.values(state.players).forEach((player) => {
      if (player.loanUntilSeason && player.loanUntilSeason <= state.season + 1 && player.parentClubId) {
        const loan = transfers.outgoingLoans.find((item) => item.status === "active" && item.playerId === player.id && item.fromClubId === player.parentClubId);
        if (loan) completeOutgoingLoanDevelopment(state, loan, player);
        movePlayerBetweenClubs(state, player.id, player.clubId, player.parentClubId);
        player.loanUntilSeason = null;
        player.parentClubId = null;
      }
    });
  }

  function processExpiredContracts(state) {
    state.transfers.freeAgentIds = state.transfers.freeAgentIds || [];
    Object.values(state.players).forEach((player) => {
      if (!player.clubId || player.contractYears >= 0 || player.loanUntilSeason) return;
      const oldClub = getClub(state, player.clubId);
      if (!oldClub) return;
      oldClub.squad = oldClub.squad.filter((id) => id !== player.id);
      oldClub.lineup = oldClub.lineup.filter((id) => id !== player.id);
      oldClub.bench = (oldClub.bench || []).filter((id) => id !== player.id);
      player.clubId = null;
      player.parentClubId = null;
      player.loanUntilSeason = null;
      player.morale = Math.round(clamp(player.morale - randomInt(state, 4, 14), 0, 100));
      if (!state.transfers.freeAgentIds.includes(player.id)) state.transfers.freeAgentIds.push(player.id);
      recordTransfer(state, {
        type: "released",
        playerId: player.id,
        playerName: player.name,
        fromClubId: oldClub.id,
        toClubId: null,
        fee: 0,
        wage: 0
      });
      if (oldClub.id === state.activeClubId) {
        addInbox(state, "Contract Expired", `${player.name} left ${oldClub.name} after their contract expired.`);
      }
    });
    refillThinSquads(state);
  }

  function refreshTransferMarket(state) {
    ensureTransferState(state);
    ensureScoutingState(state);
    const activeClub = getClub(state, state.activeClubId);
    const activeIds = new Set(activeClub ? activeClub.squad : []);
    const pool = Object.values(state.players)
      .filter((player) => !activeIds.has(player.id) && !player.loanUntilSeason)
      .sort((a, b) => b.currentAbility + b.potential * 0.35 - (a.currentAbility + a.potential * 0.35));
    const selected = pool.filter((_, index) => index < 54 || random(state) > 0.75).slice(0, 72);
    const discoveryIds = (state.scouting.discoveries || []).map((discovery) => discovery.playerId);
    const shortlistIds = state.transfers.shortlist || [];
    const freeAgentIds = state.transfers.freeAgentIds || [];
    state.transfers.marketIds = uniqueIds(selected.map((player) => player.id).concat(discoveryIds, shortlistIds, freeAgentIds)).slice(0, 90);
  }

  function scoutPlayer(state, playerId, mode) {
    ensureScoutingState(state);
    const player = getPlayer(state, playerId);
    if (!player) return null;
    const existing = state.scouting.reports[playerId] || {
      playerId,
      confidence: randomInt(state, 18, 42),
      observedAbility: 0,
      observedPotential: 0,
      notes: []
    };
    const staff = staffEffectsForClub(state, state.activeClubId);
    const gain = Math.max(4, (mode === "assignment" ? randomInt(state, 10, 18) : randomInt(state, 18, 32)) + staff.scoutingConfidenceBonus);
    existing.confidence = Math.round(clamp(existing.confidence + gain, 0, 100));
    const noise = (100 - existing.confidence) / 100;
    existing.observedAbility = Math.round(clamp(player.currentAbility + randomFloat(state, -18, 18) * noise, 1, 100));
    existing.observedPotential = Math.round(clamp(player.potential + randomFloat(state, -20, 20) * noise, 1, 100));
    existing.currentRange = abilityRange(existing.observedAbility, existing.confidence);
    existing.potentialRange = abilityRange(existing.observedPotential, existing.confidence);
    existing.notes.unshift(scoutNote(player, existing.confidence));
    existing.updatedAt = new Date().toISOString();
    state.scouting.reports[playerId] = existing;
    return existing;
  }

  function scoutingRegionOptions() {
    return Object.keys(SCOUTING_REGIONS).map((key) => ({
      key,
      ...SCOUTING_REGIONS[key]
    }));
  }

  function scoutingFocusOptions() {
    return Object.keys(SCOUTING_FOCUS).map((key) => ({
      key,
      ...SCOUTING_FOCUS[key]
    }));
  }

  function scoutingFocusLabel(focus) {
    return SCOUTING_FOCUS[focus] ? SCOUTING_FOCUS[focus].label : SCOUTING_FOCUS.balanced.label;
  }

  function scoutingRegionLabel(regionId) {
    return SCOUTING_REGIONS[regionId] ? SCOUTING_REGIONS[regionId].label : SCOUTING_REGIONS.england.label;
  }

  function discoveryFitScore(state, player) {
    const recruitment = recruitmentTargetScore(state, player.id);
    const scout = getScoutView(state, player.id);
    const upside = clamp((player.potential - player.currentAbility) * 2.8, 0, 42);
    const confidence = scout ? scout.confidence * 0.18 : 0;
    return Math.round(clamp((recruitment ? recruitment.score * 0.64 : 42) + upside + confidence, 0, 100));
  }

  function generateScoutingDiscovery(state, assignment) {
    const scouting = ensureScoutingState(state);
    const transfers = ensureTransferState(state);
    const activeClub = getClub(state, state.activeClubId);
    const region = SCOUTING_REGIONS[assignment.regionId] || SCOUTING_REGIONS.england;
    const focus = SCOUTING_FOCUS[assignment.focus] || SCOUTING_FOCUS.balanced;
    const needs = activeClub ? recruitmentNeedReport(state, activeClub.id).needs : [];
    const primaryNeed = needs[0] || null;
    const positionPool = region.positionBias || Data.POSITIONS;
    const position = primaryNeed && random(state) < 0.38 ? primaryNeed.position : pick(state, positionPool);
    const age = randomInt(state, focus.ageMin, focus.ageMax);
    const nationalityPool = region.nationalities || Data.NATIONALITIES;
    const reputation = activeClub ? activeClub.reputation : 70;
    const rawAbility = reputation - 17 + focus.abilityLift + randomFloat(state, -8, 8) - region.difficulty * 2 + (age >= 22 ? 3 : 0);
    const currentAbility = Math.round(clamp(rawAbility, 43, focus === SCOUTING_FOCUS.firstTeam ? 80 : 75));
    const rareLift = random(state) > 0.88 ? randomFloat(state, 5, 13) : 0;
    const potential = Math.round(clamp(currentAbility + randomFloat(state, 6, 22) + focus.potentialLift + rareLift, currentAbility + 1, region.ceiling));
    const player = {
      id: `p${state.nextPlayerId++}`,
      name: generateName(state),
      displayName: null,
      age,
      nationality: pick(state, nationalityPool),
      foot: random(state) > 0.25 ? "Right" : "Left",
      position,
      secondaryPositions: secondaryPositions(state, position),
      height: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 181, 197) : randomInt(state, 168, 188),
      weight: position === "GK" || position === "CB" || position === "ST" ? randomInt(state, 74, 91) : randomInt(state, 63, 82),
      clubId: null,
      value: 0,
      wage: 0,
      contractYears: 0,
      morale: randomInt(state, 50, 78),
      fitness: randomInt(state, 76, 100),
      sharpness: randomInt(state, 42, 76),
      form: [],
      trainingFocus: "balanced",
      individualPlan: "normal",
      squadRole: age <= 20 ? "prospect" : "rotation",
      happiness: {
        lastConcernDay: -999,
        lastContractDay: -999,
        lastPromiseDay: -999
      },
      promises: {},
      potential,
      currentAbility,
      attributes: generateAttributes(state, position, currentAbility),
      seasonStats: freshPlayerStats(),
      careerTotals: freshPlayerStats(),
      history: [],
      development: [],
      developmentEvents: [],
      transferListed: false,
      loanUntilSeason: null,
      parentClubId: null,
      injury: null,
      suspension: null,
      source: {
        provider: "Scouting Network",
        regionId: assignment.regionId,
        region: region.label,
        focus: assignment.focus,
        discoveredDate: state.calendar ? state.calendar.currentDate : null
      }
    };
    player.displayName = footballDisplayName(player.name);
    player.currentAbility = calculateAbilityFromAttributes(player);
    player.value = moneyRound(calculatePlayerValue(player) * 0.72);
    player.wage = moneyRound(calculateWage(player) * (age <= 20 ? 0.52 : 0.7));
    player.development.push(snapshotDevelopment(player, state.season || 1));
    player.source.fc26 = {
      matched: false,
      source: "Generated projection",
      ...fc26StyleStats(player)
    };
    state.players[player.id] = player;
    if (!transfers.freeAgentIds.includes(player.id)) transfers.freeAgentIds.push(player.id);

    const staff = staffEffectsForClub(state, state.activeClubId);
    const confidence = randomInt(state, 34, 62) + Math.round((scouting.network.level || 2) * 2) + staff.scoutingConfidenceBonus;
    const report = {
      playerId: player.id,
      confidence: Math.round(clamp(confidence, 0, 100)),
      observedAbility: player.currentAbility,
      observedPotential: player.potential,
      currentRange: abilityRange(player.currentAbility, confidence),
      potentialRange: abilityRange(player.potential, confidence),
      notes: [`${player.name} was discovered by the ${region.label} network as a ${scoutingFocusLabel(assignment.focus).toLowerCase()} target.`],
      regionId: assignment.regionId,
      focus: assignment.focus,
      updatedAt: new Date().toISOString()
    };
    state.scouting.reports[player.id] = report;
    const discovery = {
      id: `sd-${scouting.nextDiscoveryId++}`,
      playerId: player.id,
      playerName: player.name,
      regionId: assignment.regionId,
      focus: assignment.focus,
      assignmentId: assignment.id,
      date: state.calendar ? state.calendar.currentDate : null,
      season: state.season || 1,
      score: discoveryFitScore(state, player),
      status: "new"
    };
    scouting.discoveries.unshift(discovery);
    scouting.discoveries = scouting.discoveries.slice(0, 40);
    assignment.discoveries = assignment.discoveries || [];
    assignment.discoveries.unshift(discovery.id);
    refreshTransferMarket(state);
    return discovery;
  }

  function advanceRegionalScoutingAssignment(state, assignment, days) {
    const region = SCOUTING_REGIONS[assignment.regionId] || SCOUTING_REGIONS.england;
    const staff = staffEffectsForClub(state, state.activeClubId);
    const effectiveDays = days / staff.scoutingDaysMultiplier;
    assignment.focus = SCOUTING_FOCUS[assignment.focus] ? assignment.focus : "balanced";
    assignment.daysTotal = assignment.daysTotal || region.days;
    const before = assignment.daysRemaining === undefined ? assignment.daysTotal : assignment.daysRemaining;
    assignment.daysRemaining = Math.max(0, before - effectiveDays);
    assignment.roundsRemaining = Math.ceil(assignment.daysRemaining / 7);
    assignment.progress = Math.round(clamp((assignment.daysTotal - assignment.daysRemaining) / Math.max(1, assignment.daysTotal) * 100, 0, 100));
    let discovery = null;
    const crossedCheckpoint = Math.floor(before / 5) !== Math.floor(assignment.daysRemaining / 5);
    if ((assignment.daysRemaining === 0 || crossedCheckpoint) && (assignment.daysRemaining === 0 || random(state) < region.discoverChance)) {
      discovery = generateScoutingDiscovery(state, assignment);
    }
    if (assignment.daysRemaining <= 0) {
      if (!assignment.discoveries || !assignment.discoveries.length) discovery = generateScoutingDiscovery(state, assignment);
      assignment.status = "complete";
      assignment.completedSeason = state.season;
      assignment.completedRound = state.league.currentRound + 1;
      assignment.completedDate = state.calendar ? state.calendar.currentDate : null;
      const count = assignment.discoveries ? assignment.discoveries.length : 0;
      addInbox(state, "Regional Scout Report", `${scoutingRegionLabel(assignment.regionId)} assignment complete with ${count} discovered target${count === 1 ? "" : "s"}.`);
    }
    return discovery ? { type: "scouting", title: "Scouting Discovery", discoveryId: discovery.id, playerId: discovery.playerId } : null;
  }

  function abilityRange(value, confidence) {
    const spread = Math.round(clamp((100 - confidence) / 5, 1, 14));
    return {
      min: Math.round(clamp(value - spread, 1, 100)),
      max: Math.round(clamp(value + spread, 1, 100))
    };
  }

  function assignScout(state, playerId) {
    ensureScoutingState(state);
    const player = getPlayer(state, playerId);
    if (!player) return { ok: false, message: "Player not found." };
    const active = state.scouting.assignments.find((assignment) => assignment.playerId === playerId && assignment.status === "active");
    if (active) return { ok: false, message: "This player is already being scouted." };
    const staff = staffEffectsForClub(state, state.activeClubId);
    const daysTotal = Math.max(8, Math.round(14 * staff.scoutingDaysMultiplier));
    const assignment = {
      id: `sa-${state.scouting.nextAssignmentId++}`,
      playerId,
      status: "active",
      startedSeason: state.season,
      startedRound: state.league.currentRound + 1,
      startedDate: state.calendar ? state.calendar.currentDate : null,
      roundsRemaining: Math.ceil(daysTotal / 7),
      daysRemaining: daysTotal,
      daysTotal
    };
    state.scouting.assignments.unshift(assignment);
    scoutPlayer(state, playerId, "assignment");
    return { ok: true, message: `${player.name} assigned for a three-match scouting run.` };
  }

  function assignRegionalScout(state, regionId, focus) {
    const scouting = ensureScoutingState(state);
    const region = SCOUTING_REGIONS[regionId];
    if (!region) return { ok: false, message: "Scouting region unavailable." };
    const activeRegions = scouting.assignments.filter((assignment) => assignment.type === "region" && assignment.status === "active");
    if (activeRegions.length >= 3) return { ok: false, message: "All regional scouting slots are active." };
    if (activeRegions.some((assignment) => assignment.regionId === regionId)) return { ok: false, message: `${region.label} is already being scouted.` };
    const staff = staffEffectsForClub(state, state.activeClubId);
    const daysTotal = Math.max(8, Math.round(region.days * staff.scoutingDaysMultiplier));
    const assignment = {
      id: `sa-${scouting.nextAssignmentId++}`,
      type: "region",
      regionId,
      focus: SCOUTING_FOCUS[focus] ? focus : "balanced",
      status: "active",
      startedSeason: state.season,
      startedRound: state.league.currentRound + 1,
      startedDate: state.calendar ? state.calendar.currentDate : null,
      roundsRemaining: Math.ceil(daysTotal / 7),
      daysRemaining: daysTotal,
      daysTotal,
      progress: 0,
      discoveries: []
    };
    scouting.assignments.unshift(assignment);
    return { ok: true, message: `${region.label} assignment started: ${scoutingFocusLabel(assignment.focus)}.` };
  }

  function processScoutingAssignments(state) {
    ensureScoutingState(state);
    let event = null;
    state.scouting.assignments.forEach((assignment) => {
      if (assignment.status !== "active") return;
      if (assignment.type === "region") {
        event = event || advanceRegionalScoutingAssignment(state, assignment, 7);
        return;
      }
      const report = scoutPlayer(state, assignment.playerId, "assignment");
      const staff = staffEffectsForClub(state, state.activeClubId);
      assignment.roundsRemaining -= 1;
      assignment.daysRemaining = assignment.daysRemaining === undefined ? Math.max(0, assignment.roundsRemaining * 7) : Math.max(0, assignment.daysRemaining - 7 / staff.scoutingDaysMultiplier);
      if (assignment.roundsRemaining <= 0) {
        assignment.status = "complete";
        assignment.completedSeason = state.season;
        assignment.completedRound = state.league.currentRound + 1;
        assignment.completedDate = state.calendar ? state.calendar.currentDate : null;
        const player = getPlayer(state, assignment.playerId);
        if (player && report) {
          addInbox(state, "Scout Report Complete", `${player.name}'s report reached ${report.confidence}% confidence.`);
        }
      }
    });
    state.scouting.assignments = state.scouting.assignments.slice(0, 30);
    return event;
  }

  function scoutNote(player, confidence) {
    if (confidence > 84) return `${player.name}'s report is now highly reliable.`;
    if (player.age <= 21 && player.potential - player.currentAbility > 12) return `${player.name} shows strong long-term upside.`;
    if (player.currentAbility > 76) return `${player.name} looks ready for a leading role.`;
    if (player.value < 6000000 && player.currentAbility > 64) return `${player.name} could be a value opportunity.`;
    return `${player.name}'s profile is clearer after another scouting pass.`;
  }

  function getScoutView(state, playerId) {
    ensureScoutingState(state);
    const player = getPlayer(state, playerId);
    const report = state.scouting.reports[playerId];
    if (!player) return null;
    if (!report) {
      return {
        confidence: 0,
        currentAbility: null,
        potential: null,
        currentStars: "Unknown",
        potentialStars: "Unknown"
      };
    }
    return {
      confidence: report.confidence,
      currentAbility: report.observedAbility,
      potential: report.observedPotential,
      currentRange: report.currentRange || abilityRange(report.observedAbility, report.confidence),
      potentialRange: report.potentialRange || abilityRange(report.observedPotential, report.confidence),
      currentStars: stars(report.observedAbility),
      potentialStars: stars(report.observedPotential)
    };
  }

  function scoutingDiscoveryPlayers(state) {
    ensureScoutingState(state);
    return state.scouting.discoveries
      .map((discovery) => ({ discovery, player: getPlayer(state, discovery.playerId), report: state.scouting.reports[discovery.playerId] }))
      .filter((item) => item.player);
  }

  function scoutingNetworkReport(state) {
    const scouting = ensureScoutingState(state);
    const assignments = scouting.assignments || [];
    const discoveries = scoutingDiscoveryPlayers(state);
    const regions = scoutingRegionOptions().map((region) => {
      const active = assignments.find((assignment) => assignment.type === "region" && assignment.regionId === region.key && assignment.status === "active");
      const regionDiscoveries = discoveries.filter((item) => item.discovery.regionId === region.key);
      return {
        ...region,
        active,
        discoveries: regionDiscoveries,
        lastDiscovery: regionDiscoveries[0] || null
      };
    });
    return {
      level: scouting.network.level || 2,
      activeAssignments: assignments.filter((assignment) => assignment.status === "active"),
      completedAssignments: assignments.filter((assignment) => assignment.status === "complete"),
      regions,
      discoveries,
      discoveryCount: discoveries.length,
      assignmentSlots: 3
    };
  }

  function stars(value) {
    const full = Math.round(clamp(value, 1, 100) / 20);
    return `${"*".repeat(full)}${"-".repeat(5 - full)}`;
  }

  function makeTransferOffer(state, playerId, fee, wage) {
    ensureTransferState(state);
    const player = getPlayer(state, playerId);
    const activeClub = getClub(state, state.activeClubId);
    const seller = player ? getClub(state, player.clubId) : null;
    if (!player || !activeClub || player.clubId === activeClub.id) {
      return { ok: false, message: "Transfer target is not available." };
    }
    if (!seller) {
      return signFreeAgent(state, playerId, wage);
    }
    if (fee > activeClub.transferBudget) {
      return { ok: false, message: "Transfer budget is too low." };
    }
    if (weeklyWageSpend(state, activeClub.id) + wage > activeClub.wageBudget) {
      return { ok: false, message: "Wage budget is too low." };
    }
    const feeRatio = fee / Math.max(1, player.value);
    const wageRatio = wage / Math.max(1, player.wage);
    const sellerResistance = 0.78 + seller.reputation / 260;
    const playerInterest = activeClub.reputation + activeClub.transferBudget / 1000000 - seller.reputation * 0.62;
    const accepted = feeRatio >= sellerResistance && wageRatio >= 0.88 && playerInterest > -18;
    if (!accepted) {
      const counter = createOutgoingCounter(state, player, activeClub, seller, fee, wage, sellerResistance, wageRatio);
      const reason = feeRatio < sellerResistance ? "The selling club countered with a stronger fee." : wageRatio < 0.88 ? "The player countered with a better wage." : "The player needs more convincing.";
      return { ok: false, message: `${reason} A negotiation has been opened.`, negotiationId: counter.id };
    }
    if (!transferWindowStatus(state).isOpen) {
      return queuePreAgreement(state, {
        kind: "transfer",
        playerId: player.id,
        fromClubId: seller.id,
        toClubId: activeClub.id,
        fee,
        wage
      });
    }
    transferPlayer(state, player.id, seller.id, activeClub.id, fee, wage);
    addInbox(state, "Transfer Complete", `${player.name} joined ${activeClub.name} for ${formatMoney(fee)}.`);
    return { ok: true, message: `${player.name} signed.` };
  }

  function createOutgoingCounter(state, player, activeClub, seller, fee, wage, sellerResistance, wageRatio) {
    const existing = state.transfers.offers.find((offer) => offer.status === "countered" && offer.type === "outgoing" && offer.playerId === player.id);
    if (existing) {
      existing.fee = fee;
      existing.wage = wage;
      existing.counterFee = moneyRound(Math.max(existing.counterFee, player.value * Math.max(sellerResistance, 1.02)));
      existing.counterWage = moneyRound(Math.max(existing.counterWage, player.wage * Math.max(0.92, wageRatio < 0.88 ? 1.08 : 0.95)));
      return existing;
    }
    const counter = {
      id: `o${state.nextOfferId++}`,
      type: "outgoing",
      status: "countered",
      playerId: player.id,
      buyerClubId: activeClub.id,
      sellerClubId: seller.id,
      fee,
      wage,
      counterFee: moneyRound(player.value * Math.max(sellerResistance, 1.02)),
      counterWage: moneyRound(player.wage * Math.max(0.95, wageRatio < 0.88 ? 1.08 : 0.98)),
      createdSeason: state.season,
      createdRound: state.league.currentRound
    };
    state.transfers.offers.unshift(counter);
    addInbox(state, "Negotiation Opened", `${seller.name} countered your offer for ${player.name}.`);
    return counter;
  }

  function acceptCounterOffer(state, offerId) {
    const offer = state.transfers.offers.find((item) => item.id === offerId);
    if (!offer || offer.type !== "outgoing" || offer.status !== "countered") return { ok: false, message: "Negotiation is no longer active." };
    const player = getPlayer(state, offer.playerId);
    const activeClub = getClub(state, state.activeClubId);
    const seller = player ? getClub(state, player.clubId) : null;
    if (!player || !activeClub || !seller || activeClub.id !== offer.buyerClubId) return { ok: false, message: "Negotiation is no longer valid." };
    if (offer.counterFee > activeClub.transferBudget) return { ok: false, message: "Transfer budget is too low for the counter." };
    if (weeklyWageSpend(state, activeClub.id) + offer.counterWage > activeClub.wageBudget) return { ok: false, message: "Wage budget is too low for the counter." };
    if (!transferWindowStatus(state).isOpen) {
      return queuePreAgreement(state, {
        kind: "transfer",
        playerId: player.id,
        fromClubId: seller.id,
        toClubId: activeClub.id,
        fee: offer.counterFee,
        wage: offer.counterWage,
        offerId: offer.id
      });
    }
    transferPlayer(state, player.id, seller.id, activeClub.id, offer.counterFee, offer.counterWage);
    offer.status = "accepted";
    addInbox(state, "Negotiation Complete", `${player.name} joined after you accepted the counter offer.`);
    return { ok: true, message: `${player.name} signed after accepting the counter.` };
  }

  function withdrawNegotiation(state, offerId) {
    const offer = state.transfers.offers.find((item) => item.id === offerId);
    if (!offer || offer.type !== "outgoing" || offer.status !== "countered") return { ok: false, message: "Negotiation is no longer active." };
    offer.status = "withdrawn";
    return { ok: true, message: "Negotiation withdrawn." };
  }

  function loanPlayer(state, playerId) {
    const player = getPlayer(state, playerId);
    const activeClub = getClub(state, state.activeClubId);
    const parentClub = player ? getClub(state, player.clubId) : null;
    if (!player || !activeClub || !parentClub || player.clubId === activeClub.id) {
      return { ok: false, message: "Loan target is not available." };
    }
    if (player.age > 24 || player.currentAbility > 75) {
      return { ok: false, message: "The club will only loan younger squad players." };
    }
    if (weeklyWageSpend(state, activeClub.id) + player.wage > activeClub.wageBudget) {
      return { ok: false, message: "Wage budget is too low." };
    }
    if (!transferWindowStatus(state).isOpen) {
      return queuePreAgreement(state, {
        kind: "loan",
        playerId: player.id,
        fromClubId: parentClub.id,
        toClubId: activeClub.id,
        fee: 0,
        wage: player.wage
      });
    }
    completeLoanMove(state, player.id, parentClub.id, activeClub.id);
    return { ok: true, message: `${player.name} joined on loan.` };
  }

  function completeLoanMove(state, playerId, fromClubId, toClubId) {
    const player = getPlayer(state, playerId);
    const parentClub = getClub(state, fromClubId);
    const toClub = getClub(state, toClubId);
    if (!player || !parentClub || !toClub) return null;
    movePlayerBetweenClubs(state, player.id, parentClub.id, toClub.id);
    player.parentClubId = parentClub.id;
    player.loanUntilSeason = state.season + 1;
    recordTransfer(state, {
      type: "loan",
      playerId: player.id,
      playerName: player.name,
      fromClubId: parentClub.id,
      toClubId: toClub.id,
      fee: 0,
      wage: player.wage
    });
    if (toClub.id === state.activeClubId) {
      addInbox(state, "Loan Complete", `${player.name} joined on loan until the end of the season.`);
    }
    refreshTransferMarket(state);
    return player;
  }

  function transferPlayer(state, playerId, fromClubId, toClubId, fee, wage) {
    const player = getPlayer(state, playerId);
    const fromClub = getClub(state, fromClubId);
    const toClub = getClub(state, toClubId);
    movePlayerBetweenClubs(state, playerId, fromClubId, toClubId);
    if (fromClub) {
      fromClub.balance += fee;
      fromClub.seasonFinance.transferIncome += fee;
    }
    if (toClub) {
      toClub.transferBudget = Math.max(0, toClub.transferBudget - fee);
      toClub.balance = Math.max(0, toClub.balance - fee);
      toClub.seasonFinance.transferSpend += fee;
    }
    player.wage = wage;
    player.contractYears = Math.max(player.contractYears, randomInt(state, 3, 5));
    player.squadRole = inferSquadRole(player, toClub);
    player.promises = {};
    player.happiness = { ...player.happiness, lastConcernDay: -999, lastContractDay: -999, lastPromiseDay: -999 };
    player.morale = Math.round(clamp(Math.max(player.morale, 58) + randomInt(state, 1, 6), 0, 100));
    player.value = calculatePlayerValue(player);
    player.loanUntilSeason = null;
    player.parentClubId = null;
    if (toClub && toClub.id === state.activeClubId && player.age <= 21 && player.squadRole === "prospect") {
      createPathwayPromise(state, player, {
        source: "young-signing",
        trainingFocus: pathwayTrainingFocusForPlayer(player),
        tacticalRoleKey: bestTacticalRoleForPlayer(player, player.position),
        requiredMinutes: player.currentAbility >= toClub.reputation - 7 ? 540 : 360,
        requiredStarts: player.currentAbility >= toClub.reputation - 7 ? 6 : 4,
        dueDate: state.calendar ? addDays(state.calendar.currentDate, 168) : null
      });
    }
    if (!state.league.records.recordFee || fee > state.league.records.recordFee.fee) {
      state.league.records.recordFee = {
        season: state.season,
        playerId,
        playerName: player.name,
        fromClubId,
        toClubId,
        fee
      };
    }
    recordTransfer(state, {
      type: "transfer",
      playerId,
      playerName: player.name,
      fromClubId,
      toClubId,
      fee,
      wage
    });
    if (fromClub) repairMatchdaySquad(state, fromClub.id);
    if (toClub) repairMatchdaySquad(state, toClub.id);
    refreshTransferMarket(state);
  }

  function signFreeAgent(state, playerId, wage) {
    const player = getPlayer(state, playerId);
    const activeClub = getClub(state, state.activeClubId);
    if (!player || !activeClub || player.clubId) return { ok: false, message: "Player is not a free agent." };
    const requestedWage = wage || player.wage;
    if (weeklyWageSpend(state, activeClub.id) + requestedWage > activeClub.wageBudget) {
      return { ok: false, message: "Wage budget is too low." };
    }
    if (!transferWindowStatus(state).isOpen) {
      return queuePreAgreement(state, {
        kind: "free-agent",
        playerId: player.id,
        fromClubId: null,
        toClubId: activeClub.id,
        fee: 0,
        wage: requestedWage
      });
    }
    completeFreeAgentSigning(state, player.id, activeClub.id, requestedWage);
    return { ok: true, message: `${player.name} signed as a free agent.` };
  }

  function completeFreeAgentSigning(state, playerId, toClubId, wage) {
    const player = getPlayer(state, playerId);
    const club = getClub(state, toClubId);
    if (!player || !club || player.clubId) return null;
    const requestedWage = wage || player.wage;
    club.squad.push(player.id);
    player.clubId = club.id;
    player.wage = requestedWage;
    player.contractYears = randomInt(state, 2, 4);
    player.squadRole = inferSquadRole(player, club);
    player.promises = {};
    player.morale = Math.round(clamp(Math.max(player.morale, 56) + randomInt(state, 0, 5), 0, 100));
    if (club.id === state.activeClubId && player.age <= 21 && player.squadRole === "prospect") {
      createPathwayPromise(state, player, {
        source: "young-signing",
        trainingFocus: pathwayTrainingFocusForPlayer(player),
        tacticalRoleKey: bestTacticalRoleForPlayer(player, player.position),
        requiredMinutes: player.currentAbility >= club.reputation - 7 ? 540 : 360,
        requiredStarts: player.currentAbility >= club.reputation - 7 ? 6 : 4,
        dueDate: state.calendar ? addDays(state.calendar.currentDate, 168) : null
      });
    }
    state.transfers.freeAgentIds = (state.transfers.freeAgentIds || []).filter((id) => id !== player.id);
    repairMatchdaySquad(state, club.id);
    recordTransfer(state, {
      type: "free-agent",
      playerId: player.id,
      playerName: player.name,
      fromClubId: null,
      toClubId: club.id,
      fee: 0,
      wage: requestedWage
    });
    if (club.id === state.activeClubId) {
      addInbox(state, "Free Agent Signed", `${player.name} joined ${club.name} as a free agent.`);
    }
    refreshTransferMarket(state);
    return player;
  }

  function renewContract(state, playerId) {
    const player = getPlayer(state, playerId);
    const club = player ? getClub(state, player.clubId) : null;
    if (!player || !club || club.id !== state.activeClubId) return { ok: false, message: "Contract cannot be renewed." };
    const profile = contractRenewalProfile(state, player.id);
    if (!profile) return { ok: false, message: "Contract profile unavailable." };
    if (profile.interest < 25) {
      player.morale = Math.round(clamp(player.morale - 4, 0, 100));
      addInbox(state, "Contract Talks Stalled", `${player.name}'s camp is reluctant to renew because of ${profile.happiness.reasons[0].toLowerCase()}.`);
      return { ok: false, message: `${player.name} is reluctant to renew right now.` };
    }
    const years = profile.years;
    const newWage = profile.requestedWage;
    const currentSpend = weeklyWageSpend(state, club.id) - player.wage;
    if (currentSpend + newWage > club.wageBudget) return { ok: false, message: "Wage budget is too low for the renewal." };
    player.wage = newWage;
    player.contractYears = years;
    player.morale = Math.round(clamp(player.morale + randomInt(state, 4, 10), 0, 100));
    if (player.promises && player.promises.playingTime && player.promises.playingTime.status === "active" && profile.happiness.playingTime.pressure < 36) {
      player.promises.playingTime.status = "fulfilled";
    }
    addInbox(state, "Contract Renewed", `${player.name} signed a ${years}-year deal worth ${formatMoney(newWage)} per week. ${profile.warnings[0] || profile.label}.`);
    return { ok: true, message: `${player.name} renewed for ${years} seasons.` };
  }

  function recordTransfer(state, record) {
    state.transfers.history = state.transfers.history || [];
    const savedRecord = {
      id: `tr-${state.season}-${state.league.currentRound}-${state.transfers.history.length + 1}`,
      season: state.season,
      round: state.league.currentRound + 1,
      date: state.calendar ? state.calendar.currentDate : null,
      createdAt: new Date().toISOString(),
      ...record
    };
    state.transfers.history.unshift(savedRecord);
    state.transfers.history = state.transfers.history.slice(0, 1000);
    addTransferNewsFromRecord(state, savedRecord);
    return savedRecord;
  }

  function movePlayerBetweenClubs(state, playerId, fromClubId, toClubId) {
    const fromClub = getClub(state, fromClubId);
    const toClub = getClub(state, toClubId);
    if (fromClub) {
      fromClub.squad = fromClub.squad.filter((id) => id !== playerId);
      fromClub.lineup = (fromClub.lineup || []).filter((id) => id !== playerId);
      fromClub.bench = (fromClub.bench || []).filter((id) => id !== playerId);
    }
    if (toClub && !toClub.squad.includes(playerId)) toClub.squad.push(playerId);
    if (state.players[playerId]) state.players[playerId].clubId = toClubId;
    if (fromClub) repairMatchdaySquad(state, fromClub.id);
    if (toClub) repairMatchdaySquad(state, toClub.id);
  }

  function acceptOffer(state, offerId) {
    const offer = state.transfers.offers.find((item) => item.id === offerId);
    if (!offer || offer.status !== "pending") return { ok: false, message: "Offer is no longer available." };
    const player = getPlayer(state, offer.playerId);
    if (!player || player.clubId !== state.activeClubId) return { ok: false, message: "Player is no longer at your club." };
    if (!transferWindowStatus(state).isOpen) {
      return queuePreAgreement(state, {
        kind: "transfer",
        playerId: player.id,
        fromClubId: state.activeClubId,
        toClubId: offer.fromClubId,
        fee: offer.fee,
        wage: offer.wage,
        offerId: offer.id
      });
    }
    transferPlayer(state, player.id, state.activeClubId, offer.fromClubId, offer.fee, offer.wage);
    offer.status = "accepted";
    addInbox(state, "Player Sold", `${player.name} left for ${formatMoney(offer.fee)}.`);
    return { ok: true, message: `${player.name} sold.` };
  }

  function rejectOffer(state, offerId) {
    const offer = state.transfers.offers.find((item) => item.id === offerId);
    if (!offer) return { ok: false, message: "Offer not found." };
    offer.status = "rejected";
    return { ok: true, message: "Offer rejected." };
  }

  function weeklyWageSpend(state, clubId) {
    return clubPlayers(state, clubId).reduce((total, player) => total + player.wage, 0);
  }

  function addInbox(state, title, body) {
    state.inbox.unshift({
      id: `m-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      title,
      body,
      season: state.season,
      round: state.league.currentRound + 1,
      read: false
    });
    state.inbox = state.inbox.slice(0, 30);
  }

  function calculateLeaders(state) {
    const players = Object.values(state.players);
    return {
      goals: players.slice().sort((a, b) => b.seasonStats.goals - a.seasonStats.goals).slice(0, 10),
      assists: players.slice().sort((a, b) => b.seasonStats.assists - a.seasonStats.assists).slice(0, 10),
      cleanSheets: players.filter((player) => player.position === "GK").sort((a, b) => b.seasonStats.cleanSheets - a.seasonStats.cleanSheets).slice(0, 10),
      averageRating: players
        .filter((player) => player.seasonStats.ratingApps >= 2)
        .sort((a, b) => averageRating(b.seasonStats) - averageRating(a.seasonStats))
        .slice(0, 10)
    };
  }

  function getNextFixture(state, clubId) {
    const fixtures = [];
    for (let i = state.league.currentRound; i < state.league.schedule.length; i += 1) {
      const fixture = state.league.schedule[i].fixtures.find((item) => item.homeClubId === clubId || item.awayClubId === clubId);
      if (fixture && !fixture.played) fixtures.push(fixture);
    }
    domesticCupFixtures(state).forEach((fixture) => {
      if (!fixture.played && (fixture.homeClubId === clubId || fixture.awayClubId === clubId)) fixtures.push(fixture);
    });
    europeanFixtures(state).forEach((fixture) => {
      if (!fixture.played && (fixture.homeClubId === clubId || fixture.awayClubId === clubId)) fixtures.push(fixture);
    });
    return fixtures
      .filter((fixture) => fixture.date)
      .sort((a, b) => compareDates(a.date, b.date))[0] || fixtures[0] || null;
  }

  function formatGameDate(value) {
    if (!value) return "-";
    const date = parseDate(value);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }

  function formatMoney(value) {
    if (value >= 1000000) return `GBP ${(value / 1000000).toFixed(value >= 10000000 ? 1 : 2)}m`;
    if (value >= 1000) return `GBP ${(value / 1000).toFixed(0)}k`;
    return `GBP ${Math.round(value)}`;
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function migrateState(state) {
    if (!state || !state.version) return null;
    const hadCalendar = !!(state.calendar && state.calendar.currentDate);
    const savedRound = state.league && Number.isFinite(state.league.currentRound) ? state.league.currentRound : 0;
    state.version = VERSION;
    state.calendar = { ...createSeasonCalendar(state.season || 1), ...(state.calendar || {}) };
    state.league.records = state.league.records || {};
    ensureTransferState(state);
    ensureScoutingState(state);
    ensureLoanClubsState(state);
    ensureScheduleDates(state);
    if (!hadCalendar && savedRound > 0 && state.league.schedule && state.league.schedule.length) {
      const previousRound = state.league.schedule[Math.min(savedRound - 1, state.league.schedule.length - 1)];
      state.calendar.currentDate = previousRound && previousRound.date ? addDays(previousRound.date, 1) : state.calendar.currentDate;
      state.calendar.day = Math.max(1, daysBetween(state.calendar.preseasonStartDate, state.calendar.currentDate) + 1);
    }
    (state.league.clubs || []).forEach((club, index) => {
      club.formation = Data.FORMATIONS[club.formation] ? club.formation : index % 3 === 0 ? "4-2-3-1" : index % 3 === 1 ? "4-3-3" : "4-4-2";
      club.tactics = normalizeTactics(club.tactics);
      normalizeTrainingSetup(club);
      normalizeStaffRoom(club, index);
      normalizeRoleAssignments(club);
      normalizePlayerInstructions(club);
      club.lineup = club.lineup || [];
      club.bench = club.bench || [];
    });
    ensureEuropeState(state);
    ensureAcademyState(state);
    Object.values(state.players || {}).forEach((player) => {
      player.attributes = normalizeAttributeSet(player.attributes || {}, player.position, player.currentAbility || 58);
      player.seasonStats = player.seasonStats || freshPlayerStats();
      player.careerTotals = player.careerTotals || freshPlayerStats();
      backfillPlayerStats(player.seasonStats);
      backfillPlayerStats(player.careerTotals);
      player.history = player.history || [];
      player.development = player.development || [snapshotDevelopment(player, state.season || 1)];
      player.injury = player.injury || null;
      normalizePlayerState(player);
      if (player.realWorld && player.ratingModelVersion !== RATING_MODEL_VERSION) {
        applyFc26Profile(player);
        player.value = calculatePlayerValue(player);
      } else if (!player.source || !player.source.fc26) {
        player.source = player.source || {};
        player.source.fc26 = {
          matched: false,
          source: "Generated projection",
          ...fc26StyleStats(player)
        };
      }
    });
    (state.scouting.assignments || []).forEach((assignment) => {
      if (assignment.type === "region") {
        const region = SCOUTING_REGIONS[assignment.regionId] || SCOUTING_REGIONS.england;
        assignment.daysTotal = assignment.daysTotal || region.days;
        assignment.daysRemaining = assignment.status === "active" ? assignment.daysRemaining === undefined ? region.days : assignment.daysRemaining : 0;
        assignment.focus = SCOUTING_FOCUS[assignment.focus] ? assignment.focus : "balanced";
      } else {
        assignment.daysRemaining = assignment.status === "active" ? assignment.daysRemaining === undefined ? Math.max(1, (assignment.roundsRemaining || 1) * 7) : assignment.daysRemaining : 0;
      }
      assignment.startedDate = assignment.startedDate || state.calendar.currentDate;
    });
    ensureBoardState(state);
    ensureDomesticCupState(state);
    advanceDomesticCup(state);
    advanceEuropeanCompetition(state);
    (state.league.clubs || []).forEach((club) => repairMatchdaySquad(state, club.id));
    syncCurrentRound(state);
    return state;
  }

  function backfillPlayerStats(stats) {
    const fresh = freshPlayerStats();
    Object.keys(fresh).forEach((key) => {
      stats[key] = stats[key] || 0;
    });
  }

  const Engine = {
    VERSION,
    createNewSave,
    migrateState,
    cloneState,
    getClub,
    getPlayer,
    clubPlayers,
    calculateTable,
    calculateLeaders,
    calculatePlayerValue,
    calculateWage,
    averageRating,
    weeklyWageSpend,
    playerDisplayName,
    fc26StyleStats,
    availabilityLabel,
    isInjured,
    isSuspended,
    isUnavailable,
    injuryRiskLevel,
    playerAvailabilityStatus,
    TRAINING_FOCUS,
    TRAINING_PLANS,
    MATCH_PREP,
    INDIVIDUAL_PLANS,
    SQUAD_ROLES,
    ACADEMY_PLANS,
    SCOUTING_REGIONS,
    SCOUTING_FOCUS,
    YOUTH_LOAN_DESTINATIONS,
    STAFF_DEPARTMENTS,
    TACTICAL_ROLES,
    PLAYER_INSTRUCTIONS,
    TACTICAL_PRESETS,
    DOMESTIC_CUP_ROUNDS,
    EUROPEAN_ROUNDS,
    DEFAULT_TACTICS,
    trainingFocusLabel,
    trainingPlanLabel,
    matchPrepLabel,
    individualPlanLabel,
    squadRoleLabel,
    squadRoleOptions,
    academyPlanLabel,
    academyPlanOptions,
    academyProspects,
    academyReport,
    setAcademyPlan,
    promoteAcademyProspect,
    releaseAcademyProspect,
    scoutingRegionOptions,
    scoutingFocusOptions,
    scoutingFocusLabel,
    scoutingRegionLabel,
    scoutingNetworkReport,
    scoutingDiscoveryPlayers,
    staffDepartmentLabel,
    staffDepartmentLevel,
    staffRoomReport,
    upgradeStaffDepartment,
    staffEffectsForClub,
    boardReport,
    domesticCupReport,
    europeanReport,
    roleOptionsForPosition,
    tacticalRoleLabel,
    playerRoleFit,
    instructionOptionsForPosition,
    playerInstructionLabel,
    playerInstructionFit,
    tacticalRoleReport,
    setTacticalRole,
    setPlayerInstruction,
    autoSetTacticalRoles,
    roleDevelopmentReport,
    playerHappinessReport,
    squadHappinessReport,
    youthPathwayReport,
    loanDestinationOptions,
    pathwayPromiseReport,
    playerLoanReport,
    contractRenewalProfile,
    transferWindowStatus,
    processTransferPreAgreements,
    getNextFixture,
    getTrainingCalendar,
    trainingRecommendations,
    playerDevelopmentReport,
    squadAvailabilityReport,
    squadDevelopmentReport,
    recruitmentNeedReport,
    recruitmentRecommendations,
    recruitmentTargetScore,
    recruitmentProfile,
    negotiationProfile,
    deadlineDayReport,
    processAiClubTransfer,
    processAiClubLoan,
    processAiClubMarketActivity,
    shortlistPlayers,
    isShortlisted,
    addToShortlist,
    removeFromShortlist,
    simulateNextDay,
    simulateUntilNextEvent,
    simulateNextRound,
    simulateFixture,
    finishSeason,
    autoSelectLineup,
    autoSelectBench,
    setLineup,
    setBench,
    setFormation,
    setTactic,
    autoSetTactics,
    tacticalPresetOptions,
    tacticalPresetLabel,
    applyTacticalPreset,
    liveMatchAssistantReport,
    postMatchTacticalReview,
    setTrainingPlan,
    setMatchPrep,
    autoSetTrainingPlan,
    setIndividualPlan,
    restPlayer,
    tacticalProfile,
    teamStrength,
    scoutPlayer,
    assignScout,
    assignRegionalScout,
    processScoutingAssignments,
    getScoutView,
    setTrainingFocus,
    setSquadRole,
    makeTransferOffer,
    loanPlayer,
    loanOutYouthPlayer,
    renewContract,
    signFreeAgent,
    acceptCounterOffer,
    withdrawNegotiation,
    acceptOffer,
    rejectOffer,
    maybeGenerateAiOffer,
    refreshTransferMarket,
    formatMoney,
    formatGameDate,
    daysBetween,
    stars
  };

  global.FMLEngine = Engine;
  if (typeof module !== "undefined") {
    module.exports = Engine;
  }
})(typeof window !== "undefined" ? window : globalThis);
