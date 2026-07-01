(function (global) {
  "use strict";

  const Data = global.FMLData || (typeof require !== "undefined" ? require("./data.js") : null);

  const ENGINE_VERSION = "deep-match-v2";
  const DEFAULT_TACTICS = {
    mentality: "balanced",
    pressing: "standard",
    tempo: "balanced",
    width: "balanced",
    line: "standard",
    focus: "mixed",
    passingStyle: "balanced",
    creativeFreedom: "balanced"
  };

  const ROLE_WEIGHTS = {
    "Traditional Goalkeeper": { reflexes: 0.2, handling: 0.18, diving: 0.17, positioning: 0.16, oneOnOnes: 0.12, aerialReach: 0.08, commandOfArea: 0.06, kicking: 0.03 },
    "Sweeper Keeper": { reflexes: 0.17, oneOnOnes: 0.15, positioning: 0.14, distribution: 0.14, kicking: 0.12, decisions: 0.1, commandOfArea: 0.09, pace: 0.09 },
    "Central Defender": { marking: 0.18, tackling: 0.18, positioning: 0.16, strength: 0.12, heading: 0.12, concentration: 0.1, bravery: 0.08, pace: 0.06 },
    "Ball Playing Defender": { passing: 0.18, composure: 0.15, decisions: 0.14, marking: 0.12, tackling: 0.12, positioning: 0.1, technique: 0.09, heading: 0.06, strength: 0.04 },
    "Stopper": { tackling: 0.2, aggression: 0.14, bravery: 0.13, strength: 0.13, marking: 0.12, heading: 0.1, positioning: 0.1, concentration: 0.08 },
    "Cover Defender": { pace: 0.18, acceleration: 0.14, positioning: 0.14, anticipation: 0.13, marking: 0.12, tackling: 0.11, concentration: 0.1, composure: 0.08 },
    "Defensive Fullback": { tackling: 0.17, marking: 0.16, positioning: 0.14, stamina: 0.12, pace: 0.1, concentration: 0.1, teamwork: 0.08, crossing: 0.07, decisions: 0.06 },
    "Attacking Fullback": { crossing: 0.18, stamina: 0.14, pace: 0.13, acceleration: 0.1, dribbling: 0.1, passing: 0.1, workRate: 0.1, tackling: 0.08, positioning: 0.07 },
    "Wingback": { stamina: 0.16, crossing: 0.15, pace: 0.13, workRate: 0.12, dribbling: 0.1, tackling: 0.1, positioning: 0.09, acceleration: 0.08, teamwork: 0.07 },
    "Ball Winning Midfielder": { tackling: 0.18, workRate: 0.15, aggression: 0.12, stamina: 0.12, positioning: 0.11, anticipation: 0.1, strength: 0.08, passing: 0.07, teamwork: 0.07 },
    "Deep Lying Playmaker": { passing: 0.24, vision: 0.2, decisions: 0.16, firstTouch: 0.12, composure: 0.1, positioning: 0.08, stamina: 0.06, teamwork: 0.04 },
    Anchor: { positioning: 0.2, marking: 0.16, tackling: 0.15, concentration: 0.14, strength: 0.1, decisions: 0.1, teamwork: 0.08, passing: 0.07 },
    "Box to Box Midfielder": { stamina: 0.17, workRate: 0.14, passing: 0.12, tackling: 0.11, decisions: 0.11, firstTouch: 0.1, offTheBall: 0.09, teamwork: 0.08, finishing: 0.08 },
    Playmaker: { passing: 0.22, vision: 0.2, technique: 0.13, firstTouch: 0.12, decisions: 0.12, composure: 0.09, flair: 0.07, teamwork: 0.05 },
    "Advanced Midfielder": { vision: 0.16, passing: 0.15, offTheBall: 0.14, flair: 0.12, technique: 0.11, firstTouch: 0.1, dribbling: 0.09, decisions: 0.08, finishing: 0.05 },
    "Traditional Winger": { crossing: 0.2, pace: 0.14, dribbling: 0.14, acceleration: 0.12, technique: 0.1, workRate: 0.09, firstTouch: 0.08, passing: 0.07, stamina: 0.06 },
    "Inside Forward": { finishing: 0.18, offTheBall: 0.15, dribbling: 0.14, pace: 0.12, composure: 0.11, firstTouch: 0.1, acceleration: 0.09, technique: 0.07, flair: 0.04 },
    "Wide Playmaker": { vision: 0.18, passing: 0.17, technique: 0.14, firstTouch: 0.12, dribbling: 0.11, decisions: 0.1, flair: 0.08, crossing: 0.06, workRate: 0.04 },
    "Advanced Forward": { finishing: 0.22, offTheBall: 0.16, pace: 0.14, composure: 0.14, firstTouch: 0.1, acceleration: 0.1, decisions: 0.08, strength: 0.06 },
    "Target Forward": { heading: 0.18, strength: 0.17, jumping: 0.14, firstTouch: 0.12, finishing: 0.11, composure: 0.09, bravery: 0.08, offTheBall: 0.06, teamwork: 0.05 },
    "Pressing Forward": { workRate: 0.17, stamina: 0.15, pace: 0.12, aggression: 0.11, finishing: 0.11, acceleration: 0.1, offTheBall: 0.1, teamwork: 0.08, decisions: 0.06 },
    Poacher: { finishing: 0.28, offTheBall: 0.18, composure: 0.16, anticipation: 0.13, firstTouch: 0.1, acceleration: 0.08, decisions: 0.07 },
    "Complete Forward": { finishing: 0.16, offTheBall: 0.13, composure: 0.12, firstTouch: 0.1, strength: 0.1, pace: 0.09, heading: 0.09, passing: 0.08, technique: 0.07, decisions: 0.06 }
  };

  const FORMATION_MODIFIERS = {
    "4-3-3": { wideThreat: 7, pressingStrength: 5, attackingSupport: 5, chanceCreation: 3, defensiveTransition: -2 },
    "4-2-3-1": { centralThreat: 6, midfieldControl: 4, chanceCreation: 4, defensiveStability: 2, strikerSupport: -2 },
    "4-4-2": { setPieceThreat: 4, attackingSupport: 4, defensiveWidth: 4, midfieldControl: -2, centralThreat: -2 },
    "4-1-4-1": { midfieldControl: 5, defensiveStability: 4, chancePrevention: 4, attackingSupport: -3 },
    "3-4-3": { wideThreat: 5, pressingStrength: 4, attackingSupport: 7, defensiveWidth: -4, defensiveTransition: -3 },
    "3-5-2": { midfieldControl: 6, centralThreat: 4, counterAttackThreat: 4, defensiveWidth: -2, wideThreat: -1 },
    "5-2-3": { defensiveStability: 7, counterAttackThreat: 5, wideThreat: 3, midfieldControl: -4, chanceCreation: -2 },
    "5-3-2": { defensiveStability: 8, chancePrevention: 6, centralThreat: 2, counterAttackThreat: 5, possession: -3, wideThreat: -3 },
    "4-2-2-2": { centralThreat: 5, attackingSupport: 6, pressingStrength: 3, defensiveWidth: -3, wideThreat: -2 }
  };

  const ATTACK_TYPES = ["central", "wideLeft", "wideRight", "counter", "setPiece", "longShot", "direct", "pressTurnover"];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, precision) {
    const factor = Math.pow(10, precision || 0);
    return Math.round(value * factor) / factor;
  }

  function random(state) {
    state.randomSeed = (state.randomSeed * 1664525 + 1013904223) >>> 0;
    return state.randomSeed / 4294967296;
  }

  function randomFloat(state, min, max) {
    return random(state) * (max - min) + min;
  }

  function randomInt(state, min, max) {
    return Math.floor(random(state) * (max - min + 1)) + min;
  }

  function average(values) {
    const usable = values.filter((value) => Number.isFinite(value));
    return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
  }

  function attr(player, key) {
    const attrs = player && player.attributes ? player.attributes : {};
    return Number(attrs[key] || fallbackAttribute(player, key));
  }

  function fallbackAttribute(player, key) {
    const base = player ? player.currentAbility || 58 : 58;
    if (key === "injuryResistance" || key === "naturalFitness") return clamp(base + 4, 35, 88);
    if (["reflexes", "handling", "diving", "oneOnOnes", "aerialReach", "commandOfArea", "distribution", "kicking"].includes(key)) {
      return player && player.position === "GK" ? clamp(base + 6, 36, 94) : clamp(base - 12, 18, 70);
    }
    if (key === "aggression") return clamp(48 + (player ? player.currentAbility || 58 : 58) * 0.18, 28, 78);
    return clamp(base, 24, 90);
  }

  function weightedRating(player, weights) {
    let total = 0;
    let weightTotal = 0;
    Object.keys(weights).forEach((key) => {
      total += attr(player, key) * weights[key];
      weightTotal += weights[key];
    });
    return weightTotal ? total / weightTotal : player.currentAbility || 58;
  }

  function roleForSlot(slot, formation, tactics) {
    const focus = tactics.focus || "mixed";
    const mentality = tactics.mentality || "balanced";
    const pressing = tactics.pressing || "standard";
    const width = tactics.width || "balanced";
    const tempo = tactics.tempo || "balanced";
    if (slot === "GK") return tactics.line === "high" ? "Sweeper Keeper" : "Traditional Goalkeeper";
    if (slot === "CB") {
      if (tactics.line === "high") return "Cover Defender";
      if (tactics.passingStyle === "short" || tempo === "patient" || focus === "central") return "Ball Playing Defender";
      return pressing === "relentless" || pressing === "high" ? "Stopper" : "Central Defender";
    }
    if (slot === "RB" || slot === "LB") {
      if (formation.startsWith("5") || formation.startsWith("3") || width === "wide") return "Wingback";
      return mentality === "cautious" || mentality === "defensive" ? "Defensive Fullback" : "Attacking Fullback";
    }
    if (slot === "DM") {
      if (focus === "central" || tempo === "patient" || tactics.passingStyle === "short") return "Deep Lying Playmaker";
      if (mentality === "cautious" || mentality === "defensive") return "Anchor";
      return "Ball Winning Midfielder";
    }
    if (slot === "CM") {
      if (focus === "central" || tempo === "patient" || tactics.passingStyle === "short") return "Playmaker";
      return mentality === "attacking" || mentality === "veryAttacking" ? "Advanced Midfielder" : "Box to Box Midfielder";
    }
    if (slot === "AM") return focus === "central" || tactics.creativeFreedom === "expressive" ? "Playmaker" : "Advanced Midfielder";
    if (slot === "RW" || slot === "LW") {
      if (focus === "flanks" || width === "wide") return "Traditional Winger";
      if (focus === "central" || tactics.creativeFreedom === "expressive") return "Wide Playmaker";
      return "Inside Forward";
    }
    if (focus === "setPieces" || (focus === "flanks" && (tactics.passingStyle === "direct" || tempo === "direct"))) return "Target Forward";
    if (pressing === "relentless" || pressing === "high" || pressing === "gegenpress" || pressing === "highPress") return "Pressing Forward";
    if (mentality === "attacking" || mentality === "veryAttacking") return "Advanced Forward";
    if (tactics.creativeFreedom === "expressive") return "Complete Forward";
    return "Poacher";
  }

  function normalizeTactics(tactics) {
    const normalized = { ...DEFAULT_TACTICS, ...(tactics || {}) };
    if (normalized.pressing === "regroup") normalized.pressing = "lowBlock";
    if (normalized.pressing === "standard") normalized.pressing = "midBlock";
    if (normalized.pressing === "high") normalized.pressing = "highPress";
    if (normalized.pressing === "relentless") normalized.pressing = "gegenpress";
    if (normalized.mentality === "positive") normalized.mentality = "attacking";
    if (normalized.mentality === "attacking" && tactics && tactics.focus === "allOut") normalized.mentality = "veryAttacking";
    if (normalized.tempo === "patient") normalized.tempo = "slow";
    if (normalized.tempo === "balanced") normalized.tempo = "normal";
    if (normalized.tempo === "direct") normalized.tempo = "fast";
    if (normalized.tempo === "vertical") normalized.tempo = "veryFast";
    if (!tactics || !tactics.passingStyle) {
      normalized.passingStyle = normalized.tempo === "slow" ? "short" : normalized.tempo === "veryFast" ? "direct" : "balanced";
    }
    return normalized;
  }

  function tacticValue(tactics, group) {
    const maps = {
      mentality: { defensive: -2, cautious: -1, balanced: 0, attacking: 1, veryAttacking: 2 },
      pressing: { lowBlock: -1.5, midBlock: 0, highPress: 1, gegenpress: 1.8 },
      tempo: { slow: -1, normal: 0, fast: 1, veryFast: 1.7 },
      width: { narrow: -1, balanced: 0, wide: 1 },
      line: { low: -1, deep: -1, standard: 0, high: 1 },
      passingStyle: { direct: -1, balanced: 0, short: 1 },
      creativeFreedom: { disciplined: -1, balanced: 0, expressive: 1 }
    };
    return maps[group] && maps[group][tactics[group]] !== undefined ? maps[group][tactics[group]] : 0;
  }

  function moraleFormModifier(player) {
    const morale = clamp(((player.morale || 50) - 50) / 520, -0.06, 0.08);
    const formAvg = player.form && player.form.length ? average(player.form.slice(-5)) : 6.5;
    const form = clamp((formAvg - 6.5) * 0.025, -0.06, 0.08);
    return 1 + morale + form;
  }

  function fitnessModifier(player, energy) {
    const fitness = clamp((player.fitness || 85) / 100, 0.45, 1.04);
    const energyMod = clamp(energy / 100, 0.52, 1.02);
    return 0.72 + fitness * 0.16 + energyMod * 0.12;
  }

  function positionBand(position) {
    if (position === "GK") return "keeper";
    if (["RB", "LB", "CB"].includes(position)) return "defense";
    if (["DM", "CM", "AM"].includes(position)) return "midfield";
    if (["RW", "LW"].includes(position)) return "wide";
    return "forward";
  }

  function slotPenalty(player, slot) {
    if (!slot || player.position === slot) return 0;
    if ((player.secondaryPositions || []).includes(slot)) return 2.2;
    if (positionBand(player.position) === positionBand(slot)) return 5;
    return slot === "GK" || player.position === "GK" ? 22 : 10;
  }

  function calculateRoleRating(player, role, slot, energy) {
    const raw = weightedRating(player, ROLE_WEIGHTS[role] || ROLE_WEIGHTS["Box to Box Midfielder"]);
    return clamp(raw * moraleFormModifier(player) * fitnessModifier(player, energy) - slotPenalty(player, slot), 20, 105);
  }

  function buildTeamContext(input, side) {
    const club = side === "home" ? input.homeClub : input.awayClub;
    const opponent = side === "home" ? input.awayClub : input.homeClub;
    const lineup = side === "home" ? input.homeLineup : input.awayLineup;
    const bench = side === "home" ? input.homeBench || [] : input.awayBench || [];
    const formation = club.formation || "4-3-3";
    const tactics = normalizeTactics(club.tactics);
    const items = lineup.map((item, index) => {
      const player = item.player || item;
      const slot = item.slot || (Data.FORMATIONS[formation] || Data.FORMATIONS["4-3-3"])[index] || player.position;
      const role = roleForSlot(slot, formation, tactics);
      return {
        player,
        slot,
        role,
        roleRating: calculateRoleRating(player, role, slot, 100),
        energy: clamp(player.fitness || 88, 45, 100),
        onMinute: 0,
        offMinute: 90,
        started: true
      };
    });
    const benchItems = bench.map((item, index) => {
      const player = item.player || item;
      const slot = item.slot || player.position;
      const role = roleForSlot(slot, formation, tactics);
      return {
        player,
        slot,
        role,
        roleRating: calculateRoleRating(player, role, slot, clamp((player.fitness || 88) + 8, 55, 100)),
        energy: clamp((player.fitness || 88) + 8, 55, 100),
        benchIndex: item.benchIndex !== undefined ? item.benchIndex : index,
        started: false
      };
    });

    return {
      side,
      club,
      opponent,
      formation,
      tactics,
      players: items,
      bench: benchItems,
      usedPlayers: items.slice(),
      subsUsed: 0,
      substitutions: [],
      score: 0,
      reds: 0,
      yellows: {},
      phases: calculatePhaseStrengths(items, formation, tactics, side === "home")
    };
  }

  function formationModifier(formation, key) {
    const mods = FORMATION_MODIFIERS[formation] || {};
    return mods[key] || 0;
  }

  function averageSlots(players, slots, attrs) {
    const selected = players.filter((item) => slots.includes(item.slot) || slots.includes(item.player.position));
    const pool = selected.length ? selected : players;
    return average(pool.map((item) => average(attrs.map((key) => attr(item.player, key))) * 0.62 + item.roleRating * 0.38));
  }

  function calculatePhaseStrengths(players, formation, tactics, isHome) {
    const mentality = tacticValue(tactics, "mentality");
    const press = tacticValue(tactics, "pressing");
    const tempo = tacticValue(tactics, "tempo");
    const width = tacticValue(tactics, "width");
    const line = tacticValue(tactics, "line");
    const passing = tacticValue(tactics, "passingStyle");
    const creative = tacticValue(tactics, "creativeFreedom");
    const home = isHome ? 5.2 : 0;

    const keeper = averageSlots(players, ["GK"], ["reflexes", "handling", "diving", "oneOnOnes", "positioning"]);
    const centerBacks = averageSlots(players, ["CB"], ["marking", "tackling", "positioning", "concentration", "heading"]);
    const fullbacks = averageSlots(players, ["RB", "LB"], ["pace", "crossing", "tackling", "stamina", "positioning"]);
    const midfield = averageSlots(players, ["DM", "CM", "AM"], ["passing", "vision", "decisions", "firstTouch", "teamwork"]);
    const creators = averageSlots(players, ["AM", "CM", "RW", "LW"], ["vision", "passing", "technique", "flair", "decisions"]);
    const wide = averageSlots(players, ["RW", "LW", "RB", "LB"], ["crossing", "dribbling", "pace", "acceleration", "technique"]);
    const forwards = averageSlots(players, ["ST", "RW", "LW", "AM"], ["finishing", "composure", "offTheBall", "firstTouch", "pace"]);
    const aerial = averageSlots(players, ["CB", "ST", "DM"], ["heading", "jumping", "strength", "bravery", "anticipation"]);
    const legs = average(players.map((item) => average([attr(item.player, "stamina"), attr(item.player, "naturalFitness"), attr(item.player, "workRate")]) * ((item.player.fitness || 85) / 100)));
    const roleFit = average(players.map((item) => 100 - slotPenalty(item.player, item.slot) * 5));
    const chemistry = clamp(roleFit * 0.12 + average(players.map((item) => item.player.morale || 55)) * 0.08, 8, 18);

    return {
      attackStrength: forwards + mentality * 3.8 + tempo * 1.3 + formationModifier(formation, "attackingSupport") + home,
      midfieldControl: midfield + passing * 3.5 - tempo * 1.4 + formationModifier(formation, "midfieldControl") + home * 0.5,
      defensiveStability: centerBacks * 0.62 + fullbacks * 0.25 + keeper * 0.13 - mentality * 2.2 - line * 1.3 + formationModifier(formation, "defensiveStability"),
      wideThreat: wide + width * 5 + formationModifier(formation, "wideThreat"),
      centralThreat: creators * 0.55 + forwards * 0.35 + midfield * 0.1 + (tactics.focus === "central" ? 5 : 0) + formationModifier(formation, "centralThreat"),
      pressingStrength: legs * 0.48 + midfield * 0.26 + forwards * 0.14 + press * 7 + line * 2 + formationModifier(formation, "pressingStrength"),
      counterAttackThreat: averageSlots(players, ["ST", "RW", "LW", "AM"], ["pace", "acceleration", "offTheBall", "vision"]) + (tactics.focus === "counter" ? 7 : 0) + tempo * 2 + formationModifier(formation, "counterAttackThreat"),
      setPieceThreat: aerial * 0.62 + average(players.map((item) => attr(item.player, "setPieces") || attr(item.player, "crossing"))) * 0.38 + formationModifier(formation, "setPieceThreat"),
      goalkeeperStrength: keeper,
      buildUpQuality: midfield * 0.62 + keeper * 0.1 + centerBacks * 0.13 + passing * 3 - press * 1.2 + home,
      chanceCreation: creators * 0.4 + forwards * 0.35 + midfield * 0.15 + creative * 3 + mentality * 2.5 + formationModifier(formation, "chanceCreation"),
      chancePrevention: centerBacks * 0.48 + midfield * 0.18 + keeper * 0.14 + fullbacks * 0.15 - mentality * 1.6 + formationModifier(formation, "chancePrevention"),
      defensiveTransition: legs * 0.28 + centerBacks * 0.34 + midfield * 0.22 - line * 3 - mentality * 2 + formationModifier(formation, "defensiveTransition"),
      attackingTransition: averageSlots(players, ["ST", "RW", "LW", "AM"], ["pace", "acceleration", "offTheBall", "passing"]) + tempo * 3,
      defensiveWidth: fullbacks + width * 1.5 + formationModifier(formation, "defensiveWidth"),
      fitness: legs,
      roleFit,
      chemistry
    };
  }

  function initialTeamStats() {
    return {
      goals: 0,
      xG: 0,
      shots: 0,
      shotsOnTarget: 0,
      possessionTouches: 0,
      passesAttempted: 0,
      passesCompleted: 0,
      corners: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      offsides: 0,
      bigChances: 0,
      bigChancesMissed: 0,
      counterattacks: 0,
      setPieceXG: 0,
      openPlayXG: 0,
      tacklesWon: 0,
      interceptions: 0,
      saves: 0,
      fieldTilt: 0,
      momentum: 0,
      mistakes: 0,
      pressTurnovers: 0,
      substitutions: 0
    };
  }

  function initialPlayerStats(player) {
    return {
      playerId: player.id,
      clubId: player.clubId,
      minutes: 0,
      appeared: false,
      started: false,
      goals: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      xG: 0,
      xA: 0,
      passesAttempted: 0,
      passesCompleted: 0,
      keyPasses: 0,
      chancesCreated: 0,
      crossesAttempted: 0,
      crossesCompleted: 0,
      dribblesAttempted: 0,
      dribblesCompleted: 0,
      tacklesAttempted: 0,
      tacklesWon: 0,
      interceptions: 0,
      blocks: 0,
      clearances: 0,
      aerialDuelsAttempted: 0,
      aerialDuelsWon: 0,
      foulsCommitted: 0,
      foulsWon: 0,
      yellowCards: 0,
      redCards: 0,
      mistakes: 0,
      mistakesLeadingToShot: 0,
      mistakesLeadingToGoal: 0,
      distanceCovered: 0,
      saves: 0,
      goalsConceded: 0,
      xGFaced: 0,
      claims: 0,
      punches: 0,
      rating: 6.5
    };
  }

  function makeStats(home, away) {
    const playerStats = {};
    home.players.concat(home.bench || [], away.players, away.bench || []).forEach((item) => {
      if (!playerStats[item.player.id]) playerStats[item.player.id] = initialPlayerStats(item.player);
    });
    home.players.concat(away.players).forEach((item) => {
      playerStats[item.player.id].appeared = true;
      playerStats[item.player.id].started = true;
      playerStats[item.player.id].minutes = 90;
    });
    return {
      team: { home: initialTeamStats(), away: initialTeamStats() },
      player: playerStats
    };
  }

  function chooseWeighted(state, entries) {
    const usable = entries.filter((entry) => entry && entry.weight > 0);
    const total = usable.reduce((sum, entry) => sum + entry.weight, 0);
    if (!total) return usable[0] ? usable[0].value : null;
    let marker = random(state) * total;
    for (const entry of usable) {
      marker -= entry.weight;
      if (marker <= 0) return entry.value;
    }
    return usable[usable.length - 1].value;
  }

  function selectPlayer(state, team, slots, attributes) {
    const pool = team.players.filter((item) => slots.includes(item.slot) || slots.includes(item.player.position));
    const usable = pool.length ? pool : team.players;
    return chooseWeighted(
      state,
      usable.map((item) => ({
        value: item,
        weight: Math.max(1, item.roleRating * 0.55 + average(attributes.map((key) => attr(item.player, key))) * 0.45)
      }))
    );
  }

  function teamSide(team) {
    return team.side;
  }

  function opponentOf(match, team) {
    return team.side === "home" ? match.away : match.home;
  }

  function scoreStateModifier(team, opponent, minute) {
    const diff = team.score - opponent.score;
    if (minute < 55) return 0;
    if (diff < 0) return 0.08 + (minute > 75 ? 0.04 : 0);
    if (diff > 0) return -0.05 - (minute > 75 ? 0.04 : 0);
    if (minute > 65) return clamp(((team.matchEdge || 0) - (opponent.matchEdge || 0)) / 95 + tacticValue(team.tactics, "mentality") * 0.014, -0.045, 0.085);
    return 0;
  }

  function possessionProbability(home, away, minute) {
    const h = home.phases.midfieldControl + home.phases.buildUpQuality * 0.55 - away.phases.pressingStrength * 0.22 + home.phases.chemistry;
    const a = away.phases.midfieldControl + away.phases.buildUpQuality * 0.55 - home.phases.pressingStrength * 0.22 + away.phases.chemistry;
    const scoreMod = scoreStateModifier(home, away, minute) - scoreStateModifier(away, home, minute);
    const redMod = (away.reds - home.reds) * 0.08;
    return clamp(h / Math.max(1, h + a) + scoreMod + redMod, 0.22, 0.78);
  }

  function attackProbability(team, opponent, minute) {
    const tempo = tacticValue(team.tactics, "tempo");
    const mentality = tacticValue(team.tactics, "mentality");
    const behind = team.score < opponent.score ? 0.055 : 0;
    const late = minute > 72 ? 0.035 : 0;
    const fatigueDrag = clamp((64 - currentTeamEnergy(team)) / 850, 0, 0.045);
    return clamp(0.36 + tempo * 0.04 + mentality * 0.035 + behind + late + (team.matchEdge || 0) * 0.006 - fatigueDrag - team.reds * 0.06, 0.22, 0.64);
  }

  function currentTeamEnergy(team) {
    return average(team.players.map((item) => item.energy));
  }

  function shouldConsiderSubstitution(state, team, opponent, minute) {
    if (team.subsUsed >= 5 || !(team.bench || []).length || minute < 55 || minute > 84) return false;
    const plannedWindows = [58, 64, 70, 76, 82];
    if (plannedWindows.includes(minute)) return true;
    const lowEnergyCount = team.players.filter((item) => item.slot !== "GK" && item.energy < (minute > 70 ? 63 : 57)).length;
    const cardRisk = team.players.some((item) => team.yellows[item.player.id] && item.energy < 68);
    if (lowEnergyCount || cardRisk) return random(state) < 0.28;
    const chasing = team.score < opponent.score && minute > 65;
    return random(state) < (chasing ? 0.055 : 0.025);
  }

  function substitutionNeedScore(match, team, opponent, item, minute) {
    if (!item || item.slot === "GK") return -100;
    const ps = match.stats.player[item.player.id] || {};
    const energyNeed = clamp((68 - item.energy) * 1.25, 0, 48);
    const yellowRisk = team.yellows[item.player.id] ? 13 + Math.max(0, 70 - item.energy) * 0.12 : 0;
    const mistakeDrag = (ps.mistakes || 0) * 4 + (ps.mistakesLeadingToShot || 0) * 5 + (ps.mistakesLeadingToGoal || 0) * 12;
    const chanceDrag = (ps.bigChancesMissed || 0) * 5;
    const positiveDrag = (ps.goals || 0) * 8 + (ps.assists || 0) * 5 + (ps.keyPasses || 0) * 1.2;
    const highLoad = ["RB", "LB", "RW", "LW", "CM", "DM"].includes(item.slot) ? 4 : 0;
    const lateGame = minute > 74 ? 5 : minute > 64 ? 2 : 0;
    const chasingShape = team.score < opponent.score && minute > 68 && ["DM", "CB", "RB", "LB"].includes(item.slot) ? 3 : 0;
    return energyNeed + yellowRisk + mistakeDrag + chanceDrag + highLoad + lateGame + chasingShape - positiveDrag;
  }

  function chooseOutgoingSubstitution(match, team, opponent, minute) {
    const threshold = minute < 62 ? 14 : minute < 72 ? 10 : minute < 80 ? 7 : 4;
    const ranked = team.players
      .filter((item) => item.slot !== "GK")
      .map((item) => ({ item, score: substitutionNeedScore(match, team, opponent, item, minute) }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    if (!top || top.score < threshold) return null;
    return top.item;
  }

  function chooseIncomingSubstitution(state, team, outgoing, minute) {
    if (!outgoing || !(team.bench || []).length) return null;
    const role = roleForSlot(outgoing.slot, team.formation, team.tactics);
    const pool = team.bench.filter((item) => (outgoing.slot === "GK" ? item.player.position === "GK" : item.player.position !== "GK"));
    const usable = pool.length ? pool : team.bench;
    return usable
      .map((item) => {
        const energy = clamp((item.player.fitness || 86) + randomFloat(state, -2, 7), 52, 100);
        const fit = calculateRoleRating(item.player, role, outgoing.slot, energy);
        const freshness = clamp(energy - outgoing.energy, -12, 26) * 0.28;
        const versatility = (item.player.position === outgoing.slot || (item.player.secondaryPositions || []).includes(outgoing.slot)) ? 4 : 0;
        return { item, score: fit + freshness + versatility, energy };
      })
      .sort((a, b) => b.score - a.score)[0] || null;
  }

  function substitutionReason(outgoing, incoming, minute) {
    if (outgoing.energy < 56) return "fitness";
    if (minute > 74) return "fresh legs";
    if (incoming.score > outgoing.roleRating + 8) return "tactical";
    return "rotation";
  }

  function maybeMakeSubstitution(state, match, team, opponent, minute) {
    if (!shouldConsiderSubstitution(state, team, opponent, minute)) return;
    const outgoing = chooseOutgoingSubstitution(match, team, opponent, minute);
    if (!outgoing) return;
    const incomingChoice = chooseIncomingSubstitution(state, team, outgoing, minute);
    if (!incomingChoice) return;
    makeSubstitution(state, match, team, minute, outgoing, incomingChoice);
  }

  function makeSubstitution(state, match, team, minute, outgoing, incomingChoice) {
    const activeIndex = team.players.indexOf(outgoing);
    if (activeIndex < 0) return;
    const incomingBenchItem = incomingChoice.item;
    const incomingPlayer = incomingBenchItem.player;
    const role = roleForSlot(outgoing.slot, team.formation, team.tactics);
    const incoming = {
      player: incomingPlayer,
      slot: outgoing.slot,
      role,
      roleRating: calculateRoleRating(incomingPlayer, role, outgoing.slot, incomingChoice.energy),
      energy: incomingChoice.energy,
      onMinute: minute,
      offMinute: 90,
      started: false,
      subbedIn: true
    };
    const reason = substitutionReason(outgoing, incomingChoice, minute);
    outgoing.offMinute = minute;
    outgoing.subbedOut = true;
    team.players[activeIndex] = incoming;
    team.bench = team.bench.filter((item) => item.player.id !== incomingPlayer.id);
    team.usedPlayers.push(incoming);
    team.subsUsed += 1;
    team.phases = calculatePhaseStrengths(team.players, team.formation, team.tactics, team.side === "home");

    const outStats = match.stats.player[outgoing.player.id] || initialPlayerStats(outgoing.player);
    const inStats = match.stats.player[incomingPlayer.id] || initialPlayerStats(incomingPlayer);
    outStats.appeared = true;
    outStats.minutes = Math.max(1, minute - (outgoing.onMinute || 0));
    inStats.appeared = true;
    inStats.started = false;
    inStats.minutes = Math.max(1, 90 - minute);
    match.stats.player[outgoing.player.id] = outStats;
    match.stats.player[incomingPlayer.id] = inStats;
    match.stats.team[team.side].substitutions += 1;

    const substitution = {
      minute,
      teamId: team.club.id,
      playerInId: incomingPlayer.id,
      playerOutId: outgoing.player.id,
      slot: outgoing.slot,
      reason
    };
    team.substitutions.push(substitution);
    match.substitutions.push(substitution);
    addEvent(match, {
      minute,
      type: "substitution",
      teamId: team.club.id,
      playerId: incomingPlayer.id,
      secondaryPlayerId: outgoing.player.id,
      outcome: reason,
      importance: "low"
    });
    pushCommentary(match, minute, "substitution", team, incomingPlayer, "Substitution", `${incomingPlayer.name} replaces ${outgoing.player.name} for ${team.club.name}.`);
  }

  function attackTypeWeights(team, opponent) {
    const t = team.tactics;
    const p = team.phases;
    const op = opponent.phases;
    const width = tacticValue(t, "width");
    const passing = tacticValue(t, "passingStyle");
    const tempo = tacticValue(t, "tempo");
    const press = tacticValue(t, "pressing");
    return [
      { value: "central", weight: 24 + (p.centralThreat - op.chancePrevention) * 0.18 + (t.focus === "central" ? 12 : 0) + passing * 5 },
      { value: "wideLeft", weight: 15 + p.wideThreat * 0.12 - op.defensiveWidth * 0.06 + width * 7 + (t.focus === "flanks" ? 9 : 0) },
      { value: "wideRight", weight: 15 + p.wideThreat * 0.12 - op.defensiveWidth * 0.06 + width * 7 + (t.focus === "flanks" ? 9 : 0) },
      { value: "counter", weight: 8 + p.counterAttackThreat * 0.12 + Math.max(0, tacticValue(opponent.tactics, "mentality")) * 6 + (t.focus === "counter" ? 12 : 0) },
      { value: "setPiece", weight: 7 + p.setPieceThreat * 0.08 + (t.focus === "setPieces" ? 9 : 0) },
      { value: "longShot", weight: 7 + tempo * 2 + (t.creativeFreedom === "expressive" ? 5 : 0) },
      { value: "direct", weight: 8 + Math.max(0, -passing) * 9 + tempo * 4 },
      { value: "pressTurnover", weight: 5 + Math.max(0, press) * 8 + Math.max(0, p.pressingStrength - op.buildUpQuality) * 0.12 }
    ];
  }

  function simulateMatch(input) {
    const home = buildTeamContext(input, "home");
    const away = buildTeamContext(input, "away");
    home.matchEdge = randomFloat(input.state, -4.8, 4.8) + (home.phases.roleFit - away.phases.roleFit) * 0.04;
    away.matchEdge = randomFloat(input.state, -4.8, 4.8) + (away.phases.roleFit - home.phases.roleFit) * 0.04;
    const stats = makeStats(home, away);
    const events = [];
    const commentary = [];
    const goals = [];
    const xGTimeline = [];
    const momentumTimeline = [];
    const substitutions = [];
    const match = { input, home, away, stats, events, commentary, goals, substitutions, xGTimeline, momentumTimeline };

    pushCommentary(match, 1, "kickoff", null, null, "Kick Off", "The match begins with both teams settling into their shapes.");

    for (let minute = 1; minute <= 90; minute += 1) {
      applyMinuteFatigue(home, minute, stats);
      applyMinuteFatigue(away, minute, stats);
      maybeMakeSubstitution(input.state, match, home, away, minute);
      maybeMakeSubstitution(input.state, match, away, home, minute);
      addPossessionAndPassing(input.state, match, minute);
      maybeFoulOrCard(input.state, match, minute);
      maybeMistake(input.state, match, minute);
      maybeAttack(input.state, match, minute);
      maybeLateDecisiveMoment(input.state, match, minute);
      addTimelinePoint(match, minute);
    }

    finalizeMatch(match);
    return buildResult(match);
  }

  function addPossessionAndPassing(state, match, minute) {
    const homeProb = possessionProbability(match.home, match.away, minute);
    const possessionTeam = random(state) < homeProb ? match.home : match.away;
    const opponent = opponentOf(match, possessionTeam);
    const side = teamSide(possessionTeam);
    const p = possessionTeam.phases;
    const passingStability = clamp(0.72 + (p.buildUpQuality - opponent.phases.pressingStrength) / 520 + tacticValue(possessionTeam.tactics, "passingStyle") * 0.025 - tacticValue(possessionTeam.tactics, "tempo") * 0.02 - possessionTeam.reds * 0.035, 0.58, 0.91);
    const attempts = randomInt(state, 4, 10) + Math.round((p.midfieldControl - 60) / 14);
    const completed = clamp(Math.round(attempts * passingStability), 1, attempts);
    match.stats.team[side].possessionTouches += 1;
    match.stats.team[side].passesAttempted += attempts;
    match.stats.team[side].passesCompleted += completed;

    const passer = selectPlayer(state, possessionTeam, ["DM", "CM", "AM", "CB", "RB", "LB"], ["passing", "decisions", "firstTouch"]);
    if (passer && match.stats.player[passer.player.id]) {
      match.stats.player[passer.player.id].passesAttempted += attempts;
      match.stats.player[passer.player.id].passesCompleted += completed;
    }
  }

  function applyMinuteFatigue(team, minute, stats) {
    const press = Math.max(0, tacticValue(team.tactics, "pressing"));
    const tempo = Math.max(0, tacticValue(team.tactics, "tempo"));
    const mentality = Math.max(0, tacticValue(team.tactics, "mentality"));
    const base = 0.052 + press * 0.022 + tempo * 0.016 + mentality * 0.01 + team.reds * 0.012;
    team.players.forEach((item) => {
      const player = item.player;
      const resistance = (attr(player, "stamina") + attr(player, "naturalFitness")) / 200;
      const age = player.age > 31 ? 1.12 : player.age < 23 ? 0.95 : 1;
      const roleLoad = ["RB", "LB", "RW", "LW", "CM"].includes(item.slot) ? 1.08 : item.slot === "ST" ? 0.98 : 1;
      item.energy = clamp(item.energy - base * roleLoad * age * (1.28 - resistance), 36, 100);
      const ps = stats.player[player.id];
      if (ps) ps.distanceCovered += base * roleLoad * (1 + attr(player, "workRate") / 110);
    });
  }

  function maybeAttack(state, match, minute) {
    const homeProb = possessionProbability(match.home, match.away, minute);
    const team = random(state) < homeProb ? match.home : match.away;
    const opponent = opponentOf(match, team);
    if (random(state) > attackProbability(team, opponent, minute)) return;
    const type = chooseWeighted(state, attackTypeWeights(team, opponent));
    resolveAttack(state, match, minute, team, opponent, type, false);
  }

  function maybeLateDecisiveMoment(state, match, minute) {
    if (minute < 77 || match.home.score !== match.away.score) return;
    if (random(state) > 0.11) return;
    const homePush = 50 + (match.home.matchEdge || 0) * 4 + tacticValue(match.home.tactics, "mentality") * 8 - match.home.reds * 12;
    const awayPush = 50 + (match.away.matchEdge || 0) * 4 + tacticValue(match.away.tactics, "mentality") * 8 - match.away.reds * 12;
    const team = random(state) < homePush / Math.max(1, homePush + awayPush) ? match.home : match.away;
    const opponent = opponentOf(match, team);
    const type = team.tactics.focus === "counter" ? "counter" : team.tactics.focus === "flanks" ? (random(state) < 0.5 ? "wideLeft" : "wideRight") : "central";
    resolveAttack(state, match, minute, team, opponent, type, true);
  }

  function maybeMistake(state, match, minute) {
    const homePress = match.home.phases.pressingStrength;
    const awayPress = match.away.phases.pressingStrength;
    const vulnerable = random(state) < homePress / Math.max(1, homePress + awayPress) ? match.away : match.home;
    const opponent = opponentOf(match, vulnerable);
    const pressure = opponent.phases.pressingStrength - vulnerable.phases.buildUpQuality;
    const fatigue = 100 - currentTeamEnergy(vulnerable);
    const risk = clamp(0.006 + pressure / 3600 + fatigue / 3400 + vulnerable.reds * 0.006, 0.003, 0.035);
    if (random(state) > risk) return;
    const culprit = selectPlayer(state, vulnerable, ["CB", "RB", "LB", "DM", "CM", "GK"], ["concentration", "decisions", "composure"]);
    if (!culprit) return;
    const ps = match.stats.player[culprit.player.id];
    if (ps) ps.mistakes += 1;
    match.stats.team[vulnerable.side].mistakes += 1;
    addEvent(match, {
      minute,
      type: "mistake",
      teamId: vulnerable.club.id,
      playerId: culprit.player.id,
      outcome: "lost possession",
      importance: "medium"
    });
    pushCommentary(match, minute, "mistake", vulnerable, culprit.player, "Mistake", `${culprit.player.name} loses the ball under pressure.`);
    if (random(state) < 0.46) {
      if (ps) ps.mistakesLeadingToShot += 1;
      resolveAttack(state, match, minute, opponent, vulnerable, "pressTurnover", true, culprit.player.id);
    }
  }

  function maybeFoulOrCard(state, match, minute) {
    const team = random(state) < 0.5 ? match.home : match.away;
    const opponent = opponentOf(match, team);
    const press = Math.max(0, tacticValue(team.tactics, "pressing"));
    const fatigue = 100 - currentTeamEnergy(team);
    const risk = clamp(0.075 + press * 0.024 + fatigue / 2100, 0.045, 0.16);
    if (random(state) > risk) return;
    const tackler = selectPlayer(state, team, ["CB", "RB", "LB", "DM", "CM"], ["aggression", "tackling", "workRate"]);
    const fouled = selectPlayer(state, opponent, ["ST", "RW", "LW", "AM", "CM"], ["dribbling", "pace", "balance"]);
    if (!tackler || !fouled) return;
    const side = team.side;
    const ps = match.stats.player[tackler.player.id];
    const ops = match.stats.player[fouled.player.id];
    match.stats.team[side].fouls += 1;
    if (ps) ps.foulsCommitted += 1;
    if (ops) ops.foulsWon += 1;
    const severity = attr(tackler.player, "aggression") * 0.42 + (100 - attr(tackler.player, "tackling")) * 0.3 + fatigue * 0.22 + randomFloat(state, -18, 22);
    if (severity > 57) {
      team.yellows[tackler.player.id] = (team.yellows[tackler.player.id] || 0) + 1;
      match.stats.team[side].yellowCards += 1;
      if (ps) ps.yellowCards += 1;
      addEvent(match, { minute, type: "card", teamId: team.club.id, playerId: tackler.player.id, outcome: "yellow", importance: "medium" });
      pushCommentary(match, minute, "card", team, tackler.player, "Yellow Card", `${tackler.player.name} is booked after mistiming the challenge.`);
      if (team.yellows[tackler.player.id] > 1 || severity > 92) {
        if (random(state) < 0.22 || severity > 96) {
          team.reds += 1;
          match.stats.team[side].redCards += 1;
          if (ps) ps.redCards += 1;
          addEvent(match, { minute, type: "card", teamId: team.club.id, playerId: tackler.player.id, outcome: "red", importance: "high" });
          pushCommentary(match, minute, "card", team, tackler.player, "Red Card", `${tackler.player.name} is sent off, and the shape has to survive with ten men.`);
        }
      }
    }
  }

  function resolveAttack(state, match, minute, team, opponent, type, forced, mistakePlayerId) {
    const side = team.side;
    const oppSide = opponent.side;
    if (type === "counter") match.stats.team[side].counterattacks += 1;
    if (type === "pressTurnover") match.stats.team[side].pressTurnovers += 1;
    if (type === "setPiece") match.stats.team[side].corners += random(state) < 0.55 ? 1 : 0;

    const phase = attackPhaseValue(team, type);
    const resistance = defensiveResistance(opponent, type);
    const fatigue = currentTeamEnergy(team) - currentTeamEnergy(opponent);
    const chanceProb = forced ? 0.8 : clamp(0.45 + (phase - resistance) / 180 + ((team.matchEdge || 0) - (opponent.matchEdge || 0)) / 140 + fatigue / 850 + scoreStateModifier(team, opponent, minute), 0.17, 0.78);
    if (random(state) > chanceProb) {
      if (random(state) < 0.18) {
        const defender = selectPlayer(state, opponent, ["CB", "RB", "LB", "DM"], ["tackling", "interceptions", "positioning"]);
        if (defender && match.stats.player[defender.player.id]) {
          match.stats.player[defender.player.id].interceptions += 1;
          match.stats.team[oppSide].interceptions += 1;
        }
      }
      return;
    }

    const shooter = selectShooter(state, team, type);
    const assister = selectAssister(state, team, type, shooter ? shooter.player.id : null);
    const defender = selectPlayer(state, opponent, ["CB", "RB", "LB", "DM"], ["marking", "positioning", "concentration"]);
    const goalkeeper = selectPlayer(state, opponent, ["GK"], ["reflexes", "diving", "oneOnOnes"]);
    if (!shooter) return;
    const chance = createChance(state, team, opponent, type, shooter, assister, defender, goalkeeper, forced);
    resolveShot(state, match, minute, team, opponent, chance, shooter, assister, defender, goalkeeper, mistakePlayerId);
  }

  function attackPhaseValue(team, type) {
    const p = team.phases;
    const map = {
      central: p.centralThreat * 0.7 + p.chanceCreation * 0.3,
      wideLeft: p.wideThreat * 0.74 + p.chanceCreation * 0.26,
      wideRight: p.wideThreat * 0.74 + p.chanceCreation * 0.26,
      counter: p.counterAttackThreat * 0.8 + p.attackingTransition * 0.2,
      setPiece: p.setPieceThreat,
      longShot: p.chanceCreation * 0.62 + p.centralThreat * 0.2,
      direct: p.attackStrength * 0.56 + p.counterAttackThreat * 0.3,
      pressTurnover: p.pressingStrength * 0.7 + p.attackStrength * 0.22
    };
    return map[type] || p.chanceCreation;
  }

  function defensiveResistance(team, type) {
    const p = team.phases;
    const map = {
      central: p.defensiveStability * 0.44 + p.chancePrevention * 0.44 + p.midfieldControl * 0.12,
      wideLeft: p.defensiveWidth * 0.42 + p.defensiveStability * 0.34 + p.goalkeeperStrength * 0.12,
      wideRight: p.defensiveWidth * 0.42 + p.defensiveStability * 0.34 + p.goalkeeperStrength * 0.12,
      counter: p.defensiveTransition * 0.72 + p.goalkeeperStrength * 0.16,
      setPiece: p.defensiveStability * 0.35 + p.goalkeeperStrength * 0.25 + p.chancePrevention * 0.2,
      longShot: p.chancePrevention * 0.5 + p.goalkeeperStrength * 0.3,
      direct: p.defensiveTransition * 0.42 + p.defensiveStability * 0.36 + p.goalkeeperStrength * 0.12,
      pressTurnover: p.defensiveTransition * 0.52 + p.goalkeeperStrength * 0.22
    };
    return (map[type] || p.chancePrevention) - team.reds * 5;
  }

  function selectShooter(state, team, type) {
    const slotsByType = {
      central: ["ST", "AM", "CM"],
      wideLeft: ["LW", "ST", "AM"],
      wideRight: ["RW", "ST", "AM"],
      counter: ["ST", "RW", "LW", "AM"],
      setPiece: ["CB", "ST", "DM"],
      longShot: ["AM", "CM", "DM", "ST"],
      direct: ["ST", "RW", "LW"],
      pressTurnover: ["ST", "AM", "RW", "LW"]
    };
    return selectPlayer(state, team, slotsByType[type] || ["ST"], ["finishing", "composure", "offTheBall", "longShots", "heading"]);
  }

  function selectAssister(state, team, type, shooterId) {
    const slotsByType = {
      central: ["AM", "CM", "DM"],
      wideLeft: ["LB", "LW", "CM"],
      wideRight: ["RB", "RW", "CM"],
      counter: ["CM", "AM", "RW", "LW"],
      setPiece: ["RB", "LB", "CM", "AM"],
      longShot: ["CM", "AM", "DM"],
      direct: ["GK", "CB", "DM", "CM"],
      pressTurnover: ["AM", "CM", "RW", "LW"]
    };
    const teamCopy = { ...team, players: team.players.filter((item) => item.player.id !== shooterId) };
    return selectPlayer(state, teamCopy, slotsByType[type] || ["CM"], ["passing", "vision", "crossing", "technique", "setPieces"]);
  }

  function createChance(state, team, opponent, type, shooter, assister, defender, goalkeeper, forced) {
    const baseRanges = {
      longShot: [0.025, 0.075],
      wideLeft: [0.055, 0.16],
      wideRight: [0.055, 0.16],
      central: [0.09, 0.28],
      counter: [0.12, 0.34],
      setPiece: [0.055, 0.19],
      direct: [0.07, 0.23],
      pressTurnover: [0.14, 0.38]
    };
    const range = baseRanges[type] || [0.06, 0.2];
    let xg = randomFloat(state, range[0], range[1]);
    const shooterQuality = average([attr(shooter.player, "offTheBall"), attr(shooter.player, "composure"), attr(shooter.player, "finishing")]);
    const assistQuality = assister ? average([attr(assister.player, "vision"), attr(assister.player, "passing"), attr(assister.player, "crossing"), attr(assister.player, "setPieces")]) : 58;
    const pressure = defender ? average([attr(defender.player, "marking"), attr(defender.player, "positioning"), attr(defender.player, "concentration")]) : 58;
    const gkPositioning = goalkeeper ? average([attr(goalkeeper.player, "positioning"), attr(goalkeeper.player, "commandOfArea")]) : 58;
    xg *= clamp(1 + (shooterQuality - 64) / 380 + (assistQuality - 64) / 480 - (pressure - 64) / 430 - (gkPositioning - 64) / 700, 0.55, 1.58);
    if (forced) xg *= 1.25;
    if (type === "setPiece" && team.tactics.focus === "setPieces") xg *= 1.12;
    const fatiguePenalty = (100 - shooter.energy) / 410;
    xg *= clamp(1 - fatiguePenalty, 0.76, 1);
    return {
      type,
      xG: round(clamp(xg, 0.015, type === "pressTurnover" || type === "counter" ? 0.52 : 0.42), 3),
      bigChance: xg >= 0.22 || forced,
      setPiece: type === "setPiece"
    };
  }

  function resolveShot(state, match, minute, team, opponent, chance, shooter, assister, defender, goalkeeper, mistakePlayerId) {
    const side = team.side;
    const oppSide = opponent.side;
    const shooterStats = match.stats.player[shooter.player.id];
    const assistStats = assister ? match.stats.player[assister.player.id] : null;
    const gkStats = goalkeeper ? match.stats.player[goalkeeper.player.id] : null;
    const defenderStats = defender ? match.stats.player[defender.player.id] : null;

    match.stats.team[side].shots += 1;
    match.stats.team[side].xG += chance.xG;
    match.stats.team[side].momentum += chance.xG * 8;
    if (chance.bigChance) match.stats.team[side].bigChances += 1;
    if (chance.setPiece) match.stats.team[side].setPieceXG += chance.xG;
    else match.stats.team[side].openPlayXG += chance.xG;
    if (shooterStats) {
      shooterStats.shots += 1;
      shooterStats.xG += chance.xG;
    }
    if (assistStats) {
      assistStats.keyPasses += 1;
      assistStats.chancesCreated += 1;
      assistStats.xA += chance.xG;
    }
    if (gkStats) gkStats.xGFaced += chance.xG;

    const finishing = average([attr(shooter.player, "finishing"), attr(shooter.player, "composure"), attr(shooter.player, "technique")]);
    const form = moraleFormModifier(shooter.player);
    const fatigue = clamp(shooter.energy / 100, 0.62, 1.04);
    const gk = goalkeeper ? average([attr(goalkeeper.player, "reflexes"), attr(goalkeeper.player, "diving"), attr(goalkeeper.player, "oneOnOnes"), attr(goalkeeper.player, "positioning")]) : 58;
    const pressure = defender ? average([attr(defender.player, "marking"), attr(defender.player, "tackling"), attr(defender.player, "concentration")]) : 58;
    const goalProb = clamp(chance.xG * (1.17 + (finishing - 62) / 245) * form * fatigue * (1 - (gk - 62) / 920) * (1 - (pressure - 62) / 1120), 0.012, 0.86);
    const onTargetProb = clamp(0.34 + chance.xG * 1.1 + (finishing - 60) / 360 - (pressure - 60) / 520, 0.18, 0.82);
    const onTarget = random(state) < onTargetProb || random(state) < goalProb * 1.15;
    if (onTarget) {
      match.stats.team[side].shotsOnTarget += 1;
      if (shooterStats) shooterStats.shotsOnTarget += 1;
    }

    if (random(state) < goalProb) {
      team.score += 1;
      match.stats.team[side].goals += 1;
      if (shooterStats) shooterStats.goals += 1;
      if (assistStats && random(state) < 0.88) assistStats.assists += 1;
      if (gkStats) gkStats.goalsConceded += 1;
      if (mistakePlayerId && match.stats.player[mistakePlayerId]) match.stats.player[mistakePlayerId].mistakesLeadingToGoal += 1;
      const goal = {
        minute,
        clubId: team.club.id,
        playerId: shooter.player.id,
        assistId: assistStats && assistStats.assists > 0 ? assister.player.id : null,
        fixtureId: match.input.fixture.id,
        xG: chance.xG,
        type: chance.type
      };
      match.goals.push(goal);
      addEvent(match, {
        minute,
        type: "goal",
        teamId: team.club.id,
        playerId: shooter.player.id,
        secondaryPlayerId: goal.assistId,
        xG: chance.xG,
        zone: chance.type,
        outcome: "goal",
        importance: "high"
      });
      pushCommentary(match, minute, "goal", team, shooter.player, "Goal", goalText(chance, shooter.player, team.club.name));
      return;
    }

    if (chance.bigChance) match.stats.team[side].bigChancesMissed += 1;
    if (onTarget && gkStats) {
      match.stats.team[oppSide].saves += 1;
      gkStats.saves += 1;
      addEvent(match, { minute, type: "save", teamId: opponent.club.id, playerId: goalkeeper.player.id, secondaryPlayerId: shooter.player.id, xG: chance.xG, zone: chance.type, outcome: "saved", importance: chance.bigChance ? "high" : "medium" });
      if (chance.xG > 0.16) pushCommentary(match, minute, "save", opponent, goalkeeper.player, "Save", `${goalkeeper.player.name} makes a sharp save to deny ${shooter.player.name}.`);
    } else {
      addEvent(match, { minute, type: "shot", teamId: team.club.id, playerId: shooter.player.id, secondaryPlayerId: assister ? assister.player.id : null, xG: chance.xG, zone: chance.type, outcome: onTarget ? "saved" : "off target", importance: chance.bigChance ? "high" : "low" });
      if (chance.xG > 0.15) pushCommentary(match, minute, "chance", team, shooter.player, "Chance", `${shooter.player.name} gets a good look but cannot finish the ${chance.typeLabel || chance.type} chance.`);
    }

    if (!onTarget && defenderStats && random(state) < 0.22) {
      defenderStats.blocks += 1;
      match.stats.team[oppSide].tacklesWon += 1;
    }
    if (random(state) < 0.16 + (chance.xG > 0.14 ? 0.08 : 0)) {
      match.stats.team[side].corners += 1;
    }
  }

  function goalText(chance, playerName, teamName) {
    if (chance.type === "counter") return `${playerName.name} finishes a fast break for ${teamName}.`;
    if (chance.type === "pressTurnover") return `${playerName.name} punishes the turnover with a calm finish.`;
    if (chance.type === "setPiece") return `${playerName.name} attacks the set piece and scores.`;
    if (chance.type === "wideLeft" || chance.type === "wideRight") return `${playerName.name} arrives from the wide move and turns it in.`;
    if (chance.xG > 0.28) return `${playerName.name} converts a huge chance from close range.`;
    return `${playerName.name} finds the corner for ${teamName}.`;
  }

  function addEvent(match, event) {
    match.events.push(event);
  }

  function pushCommentary(match, minute, type, team, player, title, text) {
    match.commentary.push({
      minute,
      type,
      title,
      text,
      teamId: team ? team.club.id : null,
      playerId: player ? player.id : null
    });
  }

  function addTimelinePoint(match, minute) {
    if (minute % 5 !== 0 && minute !== 90) return;
    match.xGTimeline.push({
      minute,
      home: round(match.stats.team.home.xG, 2),
      away: round(match.stats.team.away.xG, 2)
    });
    match.momentumTimeline.push({
      minute,
      home: round(match.stats.team.home.momentum + match.stats.team.home.possessionTouches * 0.08, 2),
      away: round(match.stats.team.away.momentum + match.stats.team.away.possessionTouches * 0.08, 2)
    });
  }

  function finalizeMatch(match) {
    ["home", "away"].forEach((side) => {
      const team = side === "home" ? match.home : match.away;
      const opponent = side === "home" ? match.away : match.home;
      const ts = match.stats.team[side];
      ts.possession = 0;
      ts.passAccuracy = ts.passesAttempted ? Math.round((ts.passesCompleted / ts.passesAttempted) * 100) : 0;
      ts.fieldTilt = Math.round(clamp(45 + (ts.xG - match.stats.team[opponent.side].xG) * 11 + (ts.shots - match.stats.team[opponent.side].shots) * 1.2, 20, 80));
      (team.usedPlayers || team.players).forEach((item) => {
        const ps = match.stats.player[item.player.id];
        if (!ps || !ps.appeared) return;
        ps.minutes = Math.max(1, (item.offMinute || 90) - (item.onMinute || 0));
        ps.distanceCovered = round(ps.distanceCovered, 1);
        ps.cleanSheet = item.slot === "GK" || ["RB", "LB", "CB"].includes(item.slot) ? opponent.score === 0 : false;
        ps.rating = calculatePlayerRating(ps, item, team, opponent);
      });
    });
    const touches = match.stats.team.home.possessionTouches + match.stats.team.away.possessionTouches;
    match.stats.team.home.possession = touches ? Math.round((match.stats.team.home.possessionTouches / touches) * 100) : 50;
    match.stats.team.away.possession = 100 - match.stats.team.home.possession;
  }

  function calculatePlayerRating(ps, item, team, opponent) {
    let rating = 6.45;
    rating += ps.goals * 0.82 + ps.assists * 0.42 + ps.keyPasses * 0.06 + ps.chancesCreated * 0.04;
    rating += ps.shotsOnTarget * 0.04 + ps.tacklesWon * 0.04 + ps.interceptions * 0.05 + ps.blocks * 0.05 + ps.clearances * 0.03;
    rating += ps.saves * 0.12 + (ps.cleanSheet ? 0.24 : 0);
    rating += ps.passesAttempted >= 18 && ps.passesCompleted / Math.max(1, ps.passesAttempted) > 0.86 ? 0.12 : 0;
    rating -= ps.bigChancesMissed ? ps.bigChancesMissed * 0.22 : 0;
    rating -= ps.mistakesLeadingToGoal * 0.65 + ps.mistakesLeadingToShot * 0.22 + ps.mistakes * 0.07;
    rating -= ps.yellowCards * 0.18 + ps.redCards * 1.25;
    rating -= ps.goalsConceded * (item.slot === "GK" ? 0.14 : 0.04);
    rating += (item.roleRating - 65) / 220;
    rating += team.score > opponent.score ? 0.16 : team.score === opponent.score ? 0.03 : -0.12;
    return round(clamp(rating, 4.2, 9.9), 1);
  }

  function buildResult(match) {
    const ratings = Object.values(match.stats.player)
      .filter((ps) => ps.appeared && ps.minutes > 0)
      .map((ps) => ({
        playerId: ps.playerId,
        clubId: ps.clubId,
        rating: ps.rating,
        minutes: ps.minutes,
        started: !!ps.started
      }));
    const motm = ratings.slice().sort((a, b) => b.rating - a.rating)[0] || null;
    const analysis = buildAnalysis(match);
    return {
      engineVersion: ENGINE_VERSION,
      homeGoals: match.home.score,
      awayGoals: match.away.score,
      stats: {
        possession: { home: match.stats.team.home.possession, away: match.stats.team.away.possession },
        xg: { home: round(match.stats.team.home.xG, 2), away: round(match.stats.team.away.xG, 2) },
        shots: { home: match.stats.team.home.shots, away: match.stats.team.away.shots },
        shotsOnTarget: { home: match.stats.team.home.shotsOnTarget, away: match.stats.team.away.shotsOnTarget },
        corners: { home: match.stats.team.home.corners, away: match.stats.team.away.corners },
        fouls: { home: match.stats.team.home.fouls, away: match.stats.team.away.fouls },
        passAccuracy: { home: match.stats.team.home.passAccuracy, away: match.stats.team.away.passAccuracy },
        passes: { home: match.stats.team.home.passesAttempted, away: match.stats.team.away.passesAttempted },
        yellowCards: { home: match.stats.team.home.yellowCards, away: match.stats.team.away.yellowCards },
        redCards: { home: match.stats.team.home.redCards, away: match.stats.team.away.redCards },
        bigChances: { home: match.stats.team.home.bigChances, away: match.stats.team.away.bigChances },
        bigChancesMissed: { home: match.stats.team.home.bigChancesMissed, away: match.stats.team.away.bigChancesMissed },
        counterattacks: { home: match.stats.team.home.counterattacks, away: match.stats.team.away.counterattacks },
        setPieceXG: { home: round(match.stats.team.home.setPieceXG, 2), away: round(match.stats.team.away.setPieceXG, 2) },
        openPlayXG: { home: round(match.stats.team.home.openPlayXG, 2), away: round(match.stats.team.away.openPlayXG, 2) },
        saves: { home: match.stats.team.home.saves, away: match.stats.team.away.saves },
        fieldTilt: { home: match.stats.team.home.fieldTilt, away: match.stats.team.away.fieldTilt },
        pressTurnovers: { home: match.stats.team.home.pressTurnovers, away: match.stats.team.away.pressTurnovers },
        mistakes: { home: match.stats.team.home.mistakes, away: match.stats.team.away.mistakes },
        substitutions: { home: match.stats.team.home.substitutions, away: match.stats.team.away.substitutions }
      },
      goals: match.goals.sort((a, b) => a.minute - b.minute),
      substitutions: match.substitutions.sort((a, b) => a.minute - b.minute),
      events: match.events.sort((a, b) => a.minute - b.minute),
      commentary: match.commentary.sort((a, b) => a.minute - b.minute || eventImportance(b) - eventImportance(a)),
      playerStats: match.stats.player,
      playerRatings: ratings,
      manOfMatch: motm ? motm.playerId : null,
      tactics: {
        home: normalizeTactics(match.home.club.tactics),
        away: normalizeTactics(match.away.club.tactics)
      },
      teamPhaseStrengths: {
        home: sanitizePhases(match.home.phases),
        away: sanitizePhases(match.away.phases)
      },
      xGTimeline: match.xGTimeline,
      momentumTimeline: match.momentumTimeline,
      analysis
    };
  }

  function eventImportance(event) {
    if (event.type === "goal") return 5;
    if (event.type === "card") return event.outcome === "red" ? 4 : 2;
    if (event.type === "save" || event.type === "chance") return 3;
    return 1;
  }

  function sanitizePhases(phases) {
    const result = {};
    Object.keys(phases).forEach((key) => {
      result[key] = round(phases[key], 1);
    });
    return result;
  }

  function buildAnalysis(match) {
    const home = match.home;
    const away = match.away;
    const homeStats = match.stats.team.home;
    const awayStats = match.stats.team.away;
    const summary = `${home.club.name} ${home.score}-${away.score} ${away.club.name}: ${resultReason(home, away, homeStats, awayStats)}.`;
    return {
      summary,
      homeStrengths: teamStrengthNotes(match, home, away, homeStats, awayStats),
      homeWeaknesses: teamWeaknessNotes(match, home, away, homeStats, awayStats),
      awayStrengths: teamStrengthNotes(match, away, home, awayStats, homeStats),
      awayWeaknesses: teamWeaknessNotes(match, away, home, awayStats, homeStats),
      keyFactors: keyFactors(match)
    };
  }

  function resultReason(team, opponent, stats, oppStats) {
    if (team.score > opponent.score && stats.xG >= oppStats.xG + 0.35) return "the chance quality matched the result";
    if (team.score > opponent.score && stats.xG < oppStats.xG) return "finishing and goalkeeping swung a difficult match";
    if (team.score < opponent.score && stats.xG > oppStats.xG) return "the scoreboard went against the quality of chances";
    if (stats.shotsOnTarget <= 2 && team.score <= opponent.score) return "chance creation never fully opened up";
    return "the tactical battle was close in the key phases";
  }

  function teamStrengthNotes(match, team, opponent, stats, oppStats) {
    const notes = [];
    if (stats.possession >= 56) notes.push(`Controlled possession with ${stats.possession}%.`);
    if (stats.xG >= oppStats.xG + 0.35) notes.push(`Created the better chances (${round(stats.xG, 2)} xG).`);
    if (stats.pressTurnovers >= 3) notes.push(`The press created ${stats.pressTurnovers} dangerous turnovers.`);
    if (stats.setPieceXG >= 0.28) notes.push(`Set pieces generated ${round(stats.setPieceXG, 2)} xG.`);
    if (stats.saves >= 4) notes.push(`The goalkeeper made ${stats.saves} saves.`);
    if ((team.substitutions || []).length >= 3 && currentTeamEnergy(team) >= currentTeamEnergy(opponent) + 2) notes.push("The bench helped preserve late energy.");
    if (team.phases.wideThreat > opponent.phases.defensiveWidth + 5) notes.push("Wide overloads consistently stretched the opponent.");
    if (team.phases.midfieldControl > opponent.phases.midfieldControl + 5) notes.push("Midfield role fit gave the team control between the lines.");
    return notes.length ? notes.slice(0, 4) : ["Had enough structure to stay competitive in the match phases."];
  }

  function teamWeaknessNotes(match, team, opponent, stats, oppStats) {
    const notes = [];
    if (stats.mistakes >= 2) notes.push(`${stats.mistakes} notable mistakes invited pressure.`);
    if (oppStats.counterattacks >= 3 && team.tactics.line === "high") notes.push("The high defensive line left space for counters.");
    if (stats.passAccuracy < 68) notes.push(`Passing was unstable at ${stats.passAccuracy}%.`);
    if (oppStats.setPieceXG >= 0.28) notes.push(`Set-piece defending allowed ${round(oppStats.setPieceXG, 2)} xG.`);
    if (currentTeamEnergy(team) < 62) notes.push("The team faded physically late in the game.");
    if ((team.substitutions || []).length <= 1 && currentTeamEnergy(team) < 65) notes.push("More bench intervention may have helped the late physical drop.");
    if (stats.redCards) notes.push("The red card changed the control of the match.");
    if (stats.bigChancesMissed >= 2) notes.push(`${stats.bigChancesMissed} big chances were missed.`);
    return notes.length ? notes.slice(0, 4) : ["No major structural weakness stood out from the match data."];
  }

  function keyFactors(match) {
    const factors = [];
    const hs = match.stats.team.home;
    const as = match.stats.team.away;
    const xgDiff = hs.xG - as.xG;
    if (Math.abs(xgDiff) > 0.45) factors.push(`${xgDiff > 0 ? match.home.club.name : match.away.club.name} won the xG battle by ${round(Math.abs(xgDiff), 2)}.`);
    if (Math.abs(hs.possession - as.possession) >= 12) factors.push(`${hs.possession > as.possession ? match.home.club.name : match.away.club.name} controlled possession.`);
    if (hs.pressTurnovers + as.pressTurnovers >= 5) factors.push("Pressing turnovers were a major source of attacks.");
    if (hs.redCards || as.redCards) factors.push("A red card materially changed the tactical balance.");
    if (hs.setPieceXG + as.setPieceXG >= 0.55) factors.push("Set pieces carried real chance value.");
    if (hs.mistakes + as.mistakes >= 3) factors.push("Mistakes under pressure shaped the chance quality.");
    if ((match.substitutions || []).length >= 5) factors.push(`${match.substitutions.length} substitutions changed the second-half rhythm.`);
    return factors.length ? factors.slice(0, 5) : ["The match was decided by small chance-quality margins rather than one dominant pattern."];
  }

  const MatchEngine = {
    ENGINE_VERSION,
    ROLE_WEIGHTS,
    calculateRoleRating,
    calculatePhaseStrengths,
    simulateMatch,
    normalizeTactics
  };

  global.FMLMatchEngine = MatchEngine;
  if (typeof module !== "undefined") {
    module.exports = MatchEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);
