(function (global) {
  "use strict";

  const Data = global.FMLData || (typeof require !== "undefined" ? require("./data.js") : null);
  const MatchEngine = global.FMLMatchEngine || (typeof require !== "undefined" ? require("./match-engine.js") : null);
  const VERSION = "1.6.0";
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
  const DEFAULT_TACTICS = {
    mentality: "balanced",
    pressing: "standard",
    tempo: "balanced",
    width: "balanced",
    line: "standard",
    focus: "mixed"
  };
  const RATING_MODEL_VERSION = 3;

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
        nextAssignmentId: 1
      },
      transfers: {
        marketIds: [],
        offers: [],
        shortlist: [],
        preAgreements: [],
        history: [],
        news: [],
        freeAgentIds: []
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
      const potentialLift = player.age <= 21 ? 8 : player.age <= 24 ? 5 : player.age <= 27 ? 2 : 0;
      player.potential = Math.round(clamp(Math.max(player.potential || player.currentAbility, player.currentAbility + potentialLift), player.currentAbility, 99));
      player.ratingModelVersion = RATING_MODEL_VERSION;
      player.displayName = footballDisplayName(rating.c || rating.n || player.name);
      player.source = player.source || {};
      player.source.fc26 = {
        matched: true,
        name: rating.n,
        commonName: rating.c || null,
        source: Data.FC26_RATINGS_SOURCE.name,
        ovr: rating.o,
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
      source: "Generated EAFC-style projection",
      ...fc26StyleStats(player)
    };
    return false;
  }

  function fc26StyleStats(player) {
    if (player && player.source && player.source.fc26 && Number.isFinite(player.source.fc26.ovr)) {
      const rating = player.source.fc26;
      return {
        source: rating.source || "EAFC-style",
        matched: !!rating.matched,
        ovr: rating.ovr,
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
        source: "Generated EAFC-style projection",
        matched: false,
        ovr: player.currentAbility,
        pac: Math.round(averageNumbers([a.diving, a.reflexes], player.currentAbility)),
        sho: Math.round(averageNumbers([a.handling, a.oneOnOnes], player.currentAbility)),
        pas: Math.round(averageNumbers([a.kicking, a.distribution, a.passing], player.currentAbility)),
        dri: Math.round(averageNumbers([a.reflexes, a.agility], player.currentAbility)),
        def: Math.round(averageNumbers([a.commandOfArea, a.aerialReach], player.currentAbility)),
        phy: Math.round(averageNumbers([a.positioning, a.strength, a.composure], player.currentAbility))
      };
    }
    return {
      source: "Generated EAFC-style projection",
      matched: false,
      ovr: player.currentAbility,
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
        formation: index % 3 === 0 ? "4-2-3-1" : index % 3 === 1 ? "4-3-3" : "4-4-2",
        tactics: defaultTactics(index),
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

    state.league.schedule = generateSchedule(state.league.clubs, state.season, state.calendar.seasonStartDate);
    refreshTransferMarket(state);
    addInbox(state, "Board", `Welcome to ${getClub(state, state.activeClubId).name}. The board expects a competitive Premier League season and sustainable squad building.`);
    addInbox(state, "Recruitment", "Initial scouting files are incomplete. Scout confidence improves each time you watch a target.");
    return state;
  }

  function getClub(state, clubId) {
    return state.league.clubs.find((club) => club.id === clubId) || null;
  }

  function getPlayer(state, playerId) {
    return normalizePlayerState(state.players[playerId] || null);
  }

  function clubPlayers(state, clubId) {
    const club = getClub(state, clubId);
    if (!club) return [];
    return club.squad.map((id) => normalizePlayerState(state.players[id])).filter(Boolean);
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
    const players = clubPlayers(state, clubId).filter((player) => player.fitness > 18 && !isUnavailable(state, player));
    const selected = [];
    formation.forEach((slot) => {
      const available = players.filter((player) => !selected.includes(player.id));
      const exact = available
        .filter((player) => player.position === slot || player.secondaryPositions.includes(slot))
        .sort((a, b) => playerPositionScore(b, slot) - playerPositionScore(a, slot));
      const fallback = available.sort((a, b) => b.currentAbility - a.currentAbility);
      const player = exact[0] || fallback[0];
      if (player) selected.push(player.id);
    });
    return selected.slice(0, 11);
  }

  function playerPositionScore(player, slot) {
    const match = player.position === slot ? 8 : player.secondaryPositions.includes(slot) ? 3 : 0;
    return player.currentAbility + match + player.fitness * 0.08 + player.sharpness * 0.04 + player.morale * 0.03;
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
    const lineup = ensureLineup(state, clubId)
      .map((id, index) => ({ player: state.players[id], slot: formation[index] }))
      .filter((item) => item.player);
    const attackers = lineup.filter((item) => ["ST", "LW", "RW", "AM"].includes(item.slot));
    const midfielders = lineup.filter((item) => ["DM", "CM", "AM"].includes(item.slot));
    const defenders = lineup.filter((item) => ["RB", "LB", "CB", "DM"].includes(item.slot));
    const keepers = lineup.filter((item) => item.slot === "GK");
    const attack = average((attackers.length ? attackers : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "attack")));
    const midfield = average((midfielders.length ? midfielders : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "midfield")));
    const defense = average((defenders.length ? defenders : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "defense")));
    const keeper = average((keepers.length ? keepers : lineup).map((item) => adjustedRoleScore(item.player, item.slot, "keeper")));
    const overall = attack * 0.28 + midfield * 0.28 + defense * 0.28 + keeper * 0.16;
    return { attack, midfield, defense, keeper, overall };
  }

  function adjustedRoleScore(player, slot, role) {
    return roleScore(player, role) - slotPenalty(player, slot);
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
    const individual = INDIVIDUAL_PLANS[player.individualPlan] || INDIVIDUAL_PLANS.normal;
    const resistance = averageExisting(player.attributes || {}, ["injuryResistance", "naturalFitness", "stamina"], 60);
    const fitnessRisk = player.fitness < 58 ? 36 : player.fitness < 72 ? 22 : player.fitness < 84 ? 10 : 3;
    const ageRisk = player.age >= 32 ? 14 : player.age <= 21 ? 6 : 0;
    const historyRisk = Math.min(12, (player.careerTotals && player.careerTotals.injuries || 0) * 3);
    const workloadRisk = (plan.load || 1) * 8 * (individual.loadMultiplier || 1);
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
    return ensureLineup(state, club.id)
      .map((id, index) => ({ player: state.players[id], slot: formation[index] || (state.players[id] ? state.players[id].position : "CM") }))
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
    pushForm(homeClub, homeWon ? "W" : awayWon ? "L" : "D");
    pushForm(awayClub, awayWon ? "W" : homeWon ? "L" : "D");
    updateBiggestWinRecord(state, fixture);

    fixture.playerRatings.forEach((rating) => {
      const player = state.players[rating.playerId];
      if (!player) return;
      player.seasonStats.apps += 1;
      player.seasonStats.ratingTotal += rating.rating;
      player.seasonStats.ratingApps += 1;
      player.careerTotals.apps += 1;
      player.careerTotals.ratingTotal += rating.rating;
      player.careerTotals.ratingApps += 1;
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
    return state.league.schedule.every((roundData) => roundData.fixtures.every((fixture) => fixture.played));
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
      recovery: plan.recovery + recoveryBonus,
      sharpness: plan.sharpness + prep.sharpness + sharpnessBonus,
      morale: plan.morale,
      injuryRisk: plan.injuryRisk * injuryMultiplier,
      growthRate: plan.growthRate * loadMultiplier,
      familiarity: plan.familiarity * loadMultiplier + prep.familiarity * (daysToNext !== null && daysToNext <= 6 ? 1.35 : 0.75),
      attributes: plan.attributes,
      daysToNext,
      daysSinceLast
    };
  }

  function recoverSquadsDaily(state) {
    const reports = {};
    state.league.clubs.forEach((club) => {
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
    state.league.clubs.forEach((club) => {
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
    state.scouting.assignments.forEach((assignment) => {
      if (assignment.status !== "active") return;
      assignment.daysRemaining = assignment.daysRemaining === undefined ? Math.max(7, (assignment.roundsRemaining || 3) * 7) : assignment.daysRemaining;
      assignment.daysRemaining = Math.max(0, assignment.daysRemaining - 1);
      assignment.roundsRemaining = Math.ceil(assignment.daysRemaining / 7);
      if (assignment.daysRemaining % 5 === 0 || assignment.daysRemaining === 0) {
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
      }
    });
    state.scouting.assignments = state.scouting.assignments.slice(0, 30);
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
    return { rounds: dueRounds, fixtures, activeMatch };
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
    processScoutingAssignmentsDaily(state);
    const clubEvent = maybeGenerateDailyClubEvent(state);
    const offer = maybeGenerateDailyAiOffer(state);
    const aiMarketMove = maybeProcessDailyAiClubTransfer(state);
    const matchday = simulateFixturesForDate(state, processedDate);
    if (clubEvent || offer || aiMarketMove || calendar.day % 7 === 0 || matchday.fixtures.length) refreshTransferMarket(state);

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
      clubEvent,
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
    return latestInboxEvent(state, before.inbox) || latestTransferNewsEvent(state, before.news) || (result.clubEvent ? { type: result.clubEvent.type, title: result.clubEvent.title } : null) || (result.aiMarketMove ? { type: "market", title: "Market Activity" } : null) || (result.offer ? { type: "offer", title: "Transfer Offer" } : null);
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
      return finishSeason(state);
    }
    if (roundData.date) state.calendar.currentDate = roundData.date;
    processTransferPreAgreements(state);
    let activeMatch = null;
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
    refreshTransferMarket(state);

    if (state.league.currentRound >= state.league.schedule.length) {
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
    state.league.history.unshift({
      season: completedSeason,
      championClubId: finalTable[0].clubId,
      championName: finalTable[0].clubName,
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
    state.league.schedule = generateSchedule(state.league.clubs, state.season, state.calendar.seasonStartDate);
    state.transfers.offers = state.transfers.offers.filter((offer) => offer.status === "pending" || offer.status === "countered").slice(0, 12);
    refreshTransferMarket(state);
    processTransferPreAgreements(state);
    addInbox(state, "Season Complete", `${finalTable[0].clubName} won Season ${completedSeason}. New budgets have been set.`);

    return {
      type: "season",
      season: completedSeason,
      standings,
      awards,
      activeFinish: activeRow ? activeRow.position : null,
      championName: finalTable[0].clubName
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

  function processLoansAndContracts(state) {
    Object.values(state.players).forEach((player) => {
      if (player.loanUntilSeason && player.loanUntilSeason <= state.season + 1 && player.parentClubId) {
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
    const activeClub = getClub(state, state.activeClubId);
    const activeIds = new Set(activeClub ? activeClub.squad : []);
    const pool = Object.values(state.players)
      .filter((player) => !activeIds.has(player.id) && !player.loanUntilSeason)
      .sort((a, b) => b.currentAbility + b.potential * 0.35 - (a.currentAbility + a.potential * 0.35));
    const selected = pool.filter((_, index) => index < 54 || random(state) > 0.75).slice(0, 72);
    state.transfers.marketIds = selected.map((player) => player.id);
  }

  function scoutPlayer(state, playerId, mode) {
    const player = getPlayer(state, playerId);
    if (!player) return null;
    const existing = state.scouting.reports[playerId] || {
      playerId,
      confidence: randomInt(state, 18, 42),
      observedAbility: 0,
      observedPotential: 0,
      notes: []
    };
    const gain = mode === "assignment" ? randomInt(state, 10, 18) : randomInt(state, 18, 32);
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

  function abilityRange(value, confidence) {
    const spread = Math.round(clamp((100 - confidence) / 5, 1, 14));
    return {
      min: Math.round(clamp(value - spread, 1, 100)),
      max: Math.round(clamp(value + spread, 1, 100))
    };
  }

  function assignScout(state, playerId) {
    const player = getPlayer(state, playerId);
    if (!player) return { ok: false, message: "Player not found." };
    const active = state.scouting.assignments.find((assignment) => assignment.playerId === playerId && assignment.status === "active");
    if (active) return { ok: false, message: "This player is already being scouted." };
    const assignment = {
      id: `sa-${state.scouting.nextAssignmentId++}`,
      playerId,
      status: "active",
      startedSeason: state.season,
      startedRound: state.league.currentRound + 1,
      startedDate: state.calendar ? state.calendar.currentDate : null,
      roundsRemaining: 3,
      daysRemaining: 14
    };
    state.scouting.assignments.unshift(assignment);
    scoutPlayer(state, playerId, "assignment");
    return { ok: true, message: `${player.name} assigned for a three-match scouting run.` };
  }

  function processScoutingAssignments(state) {
    state.scouting.assignments.forEach((assignment) => {
      if (assignment.status !== "active") return;
      const report = scoutPlayer(state, assignment.playerId, "assignment");
      assignment.roundsRemaining -= 1;
      assignment.daysRemaining = assignment.daysRemaining === undefined ? Math.max(0, assignment.roundsRemaining * 7) : Math.max(0, assignment.daysRemaining - 7);
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
  }

  function scoutNote(player, confidence) {
    if (confidence > 84) return `${player.name}'s report is now highly reliable.`;
    if (player.age <= 21 && player.potential - player.currentAbility > 12) return `${player.name} shows strong long-term upside.`;
    if (player.currentAbility > 76) return `${player.name} looks ready for a leading role.`;
    if (player.value < 6000000 && player.currentAbility > 64) return `${player.name} could be a value opportunity.`;
    return `${player.name}'s profile is clearer after another scouting pass.`;
  }

  function getScoutView(state, playerId) {
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
    player.value = calculatePlayerValue(player);
    player.loanUntilSeason = null;
    player.parentClubId = null;
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
    const years = player.age >= 31 ? 2 : randomInt(state, 3, 5);
    const wageLift = player.contractYears <= 0 ? 1.28 : player.contractYears === 1 ? 1.16 : 1.08;
    const newWage = moneyRound(player.wage * wageLift + player.currentAbility * 650);
    const currentSpend = weeklyWageSpend(state, club.id) - player.wage;
    if (currentSpend + newWage > club.wageBudget) return { ok: false, message: "Wage budget is too low for the renewal." };
    player.wage = newWage;
    player.contractYears = years;
    player.morale = Math.round(clamp(player.morale + randomInt(state, 4, 10), 0, 100));
    addInbox(state, "Contract Renewed", `${player.name} signed a ${years}-year deal worth ${formatMoney(newWage)} per week.`);
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
    for (let i = state.league.currentRound; i < state.league.schedule.length; i += 1) {
      const fixture = state.league.schedule[i].fixtures.find((item) => item.homeClubId === clubId || item.awayClubId === clubId);
      if (fixture && !fixture.played) return fixture;
    }
    return null;
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
    state.scouting.reports = state.scouting.reports || {};
    state.scouting.assignments = state.scouting.assignments || [];
    state.scouting.nextAssignmentId = state.scouting.nextAssignmentId || state.scouting.assignments.length + 1;
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
      club.lineup = club.lineup || [];
      club.bench = club.bench || [];
    });
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
          source: "Generated EAFC-style projection",
          ...fc26StyleStats(player)
        };
      }
    });
    (state.scouting.assignments || []).forEach((assignment) => {
      assignment.daysRemaining = assignment.status === "active" ? assignment.daysRemaining === undefined ? Math.max(1, (assignment.roundsRemaining || 1) * 7) : assignment.daysRemaining : 0;
      assignment.startedDate = assignment.startedDate || state.calendar.currentDate;
    });
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
    DEFAULT_TACTICS,
    trainingFocusLabel,
    trainingPlanLabel,
    matchPrepLabel,
    individualPlanLabel,
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
    setTrainingPlan,
    setMatchPrep,
    autoSetTrainingPlan,
    setIndividualPlan,
    restPlayer,
    tacticalProfile,
    teamStrength,
    scoutPlayer,
    assignScout,
    processScoutingAssignments,
    getScoutView,
    setTrainingFocus,
    makeTransferOffer,
    loanPlayer,
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
