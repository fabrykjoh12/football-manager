(function (global) {
  "use strict";

  const Data = global.FMLData;
  const Engine = global.FMLEngine;
  const Storage = global.FMLStorage;
  const app = document.getElementById("app");

  let state = Storage.load();
  const ui = {
    screen: "dashboard",
    theme: global.localStorage.getItem("touchline-lite-theme") || "dark",
    setupClubId: Data.CLUB_TEMPLATES[0].id,
    setupMode: "existing",
    squadSearch: "",
    squadPosition: "all",
    squadAvailability: "all",
    squadSort: "currentAbility",
    squadDir: "desc",
    marketSearch: "",
    marketPosition: "all",
    marketView: "all",
    marketSort: "recruitmentScore",
    marketDir: "desc",
    regionalFocus: "balanced",
    selectedPlayerId: null,
    lineupSelection: new Set(),
    liveMatch: null,
    liveTactics: null,
    liveOrders: [],
    commentaryCount: 0,
    commentaryPlaying: false,
    draggedPlayerId: null,
    modal: null,
    toasts: []
  };

  const NAV = [
    ["dashboard", "Dashboard"],
    ["squad", "Squad"],
    ["lineup", "Lineup"],
    ["tactics", "Tactics"],
    ["training", "Training"],
    ["staff", "Staff"],
    ["academy", "Academy"],
    ["match", "Match Day"],
    ["league", "League"],
    ["transfers", "Transfers"],
    ["scouting", "Scouting"],
    ["stats", "Statistics"],
    ["history", "History"],
    ["finances", "Finances"],
    ["manager", "Manager"]
  ];

  const FORMATION_LAYOUTS = {
    "4-3-3": [
      [50, 90], [84, 72], [61, 74], [39, 74], [16, 72], [50, 58], [34, 46], [66, 46], [84, 28], [16, 28], [50, 18]
    ],
    "4-2-3-1": [
      [50, 90], [84, 72], [61, 74], [39, 74], [16, 72], [38, 56], [62, 56], [50, 39], [82, 34], [18, 34], [50, 18]
    ],
    "4-4-2": [
      [50, 90], [84, 72], [61, 74], [39, 74], [16, 72], [38, 52], [62, 52], [84, 44], [16, 44], [40, 20], [60, 20]
    ],
    "4-1-4-1": [
      [50, 90], [84, 72], [61, 74], [39, 74], [16, 72], [50, 60], [36, 46], [64, 46], [84, 36], [16, 36], [50, 18]
    ],
    "3-4-3": [
      [50, 90], [72, 74], [50, 76], [28, 74], [36, 56], [64, 56], [84, 40], [16, 40], [50, 34], [38, 18], [62, 18]
    ],
    "3-5-2": [
      [50, 90], [72, 74], [50, 76], [28, 74], [50, 62], [38, 50], [62, 50], [84, 42], [16, 42], [40, 18], [60, 18]
    ],
    "5-2-3": [
      [50, 90], [90, 70], [68, 74], [50, 76], [32, 74], [10, 70], [38, 52], [62, 52], [84, 28], [16, 28], [50, 18]
    ],
    "5-3-2": [
      [50, 90], [90, 70], [68, 74], [50, 76], [32, 74], [10, 70], [50, 58], [36, 46], [64, 46], [40, 18], [60, 18]
    ],
    "4-2-2-2": [
      [50, 90], [84, 72], [61, 74], [39, 74], [16, 72], [38, 56], [62, 56], [35, 36], [65, 36], [40, 18], [60, 18]
    ]
  };

  function init() {
    applyTheme();
    if (state) syncLineupSelection();
    app.addEventListener("click", handleClick);
    app.addEventListener("keydown", handleKeydown);
    app.addEventListener("change", handleChange);
    app.addEventListener("input", handleInput);
    app.addEventListener("dragstart", handleDragStart);
    app.addEventListener("dragover", handleDragOver);
    app.addEventListener("dragleave", handleDragLeave);
    app.addEventListener("drop", handleDrop);
    app.addEventListener("dragend", handleDragEnd);
    render();
  }

  function render() {
    applyTheme();
    if (!state) {
      app.innerHTML = renderSetup();
      return;
    }

    const club = activeClub();
    const next = Engine.getNextFixture(state, club.id);
    const table = Engine.calculateTable(state);
    const activeRow = table.find((row) => row.clubId === club.id);
    const rank = activeRow ? table.indexOf(activeRow) + 1 : "-";
    const board = Engine.boardReport(state);
    const happiness = Engine.squadHappinessReport(state, club.id);
    const currentDate = state.calendar ? Engine.formatGameDate(state.calendar.currentDate) : "";
    const wageSpend = Engine.weeklyWageSpend(state, club.id);
    const wagePressure = Math.round(wageSpend / Math.max(1, club.wageBudget) * 100);
    const moraleTone = happiness.averageScore >= 72 ? "green" : happiness.averageScore >= 55 ? "blue" : happiness.averageScore >= 40 ? "amber" : "red";
    app.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">TL</div>
            <div>
              <div class="brand-title">Touchline Lite</div>
              <div class="brand-subtitle">Season ${state.season} | ${state.league.name}</div>
            </div>
          </div>
          <div class="sidebar-context">
            <div>
              <span>Club</span>
              <strong>${escapeHtml(club.name)}</strong>
            </div>
            <div>
              <span>Date</span>
              <strong>${escapeHtml(currentDate)}</strong>
            </div>
            <div>
              <span>Reputation</span>
              <strong>${state.manager.reputation}/100</strong>
            </div>
          </div>
          <nav class="nav">
            ${renderNav()}
          </nav>
          <div class="save-tools">
            <button data-action="save-game">Save</button>
            <button data-action="open-export">Export</button>
            <button data-action="open-import">Import</button>
            <button data-action="toggle-theme" aria-label="Toggle color theme">${ui.theme === "dark" ? "Light Mode" : "Dark Mode"}</button>
            <button data-action="new-save">New Save</button>
          </div>
        </aside>
        <main class="main">
          <header class="topbar">
            <div class="club-line">
              <div class="eyebrow">${escapeHtml(state.league.name)}</div>
              <div class="club-name">${escapeHtml(club.name)}</div>
              <div class="club-meta">${escapeHtml(currentDate)} | ${next ? nextFixtureLabel(next) : "Season complete"} | Round ${Math.min(state.league.currentRound + 1, state.league.schedule.length)} of ${state.league.schedule.length}</div>
            </div>
            <div class="top-match">
              <span>Next Match</span>
              <strong>${next ? escapeHtml(nextFixtureLabel(next).replace(/^.*?: /, "")) : "Season complete"}</strong>
            </div>
            <div class="top-stats">
              <span class="pill blue">${activeRow ? ordinal(rank) : "-"} | ${activeRow ? activeRow.points : 0} pts</span>
              <span class="pill ${board.status.tone}">Board ${board.confidence}/100</span>
              <span class="pill ${moraleTone}">Morale ${happiness.averageScore}/100</span>
              <span class="pill green">${Engine.formatMoney(club.transferBudget)} transfers</span>
              <span class="pill amber">${wagePressure}% wages</span>
              <button class="btn-green top-continue" data-action="simulate-round" ${ui.commentaryPlaying ? "disabled" : ""}>Continue</button>
            </div>
          </header>
          <section class="content">${renderScreen()}</section>
        </main>
      </div>
      ${renderModal()}
      ${renderToasts()}
    `;
    scrollCommentaryToBottom();
  }

  function renderSetup() {
    const selected = Data.CLUB_TEMPLATES.find((club) => club.id === ui.setupClubId) || Data.CLUB_TEMPLATES[0];
    return `
      <section class="setup">
        <div class="setup-inner">
          <div class="setup-hero">
            <div>
              <div class="eyebrow">Premier League management</div>
              <h1>Touchline Lite</h1>
              <p class="setup-copy">A fast, statistics-first Premier League management save built around scouting, squad building, transfers, development, tables, and season history.</p>
            </div>
            <div class="segmented">
              <button class="${ui.setupMode === "existing" ? "active" : ""}" aria-pressed="${ui.setupMode === "existing" ? "true" : "false"}" data-action="setup-mode" data-mode="existing">Existing Club</button>
              <button class="${ui.setupMode === "custom" ? "active" : ""}" aria-pressed="${ui.setupMode === "custom" ? "true" : "false"}" data-action="setup-mode" data-mode="custom">Custom Club</button>
            </div>
          </div>

          <div class="setup-layout">
            <div class="panel">
              <h2 class="panel-title">Choose Club</h2>
              <div class="club-grid">
                ${Data.CLUB_TEMPLATES.map((club) => `
                  <div class="club-card ${ui.setupClubId === club.id ? "selected" : ""}" role="button" tabindex="0" aria-pressed="${ui.setupClubId === club.id ? "true" : "false"}" data-action="setup-club" data-club-id="${club.id}">
                    <h3>${escapeHtml(club.name)}</h3>
                    <div class="club-card-row"><span>Reputation</span><strong>${club.reputation}</strong></div>
                    <div class="club-card-row"><span>Balance</span><strong>${Engine.formatMoney(club.balance)}</strong></div>
                    <div class="club-card-row"><span>Transfer Budget</span><strong>${Engine.formatMoney(club.transferBudget)}</strong></div>
                    <div class="club-card-row"><span>Wage Budget</span><strong>${Engine.formatMoney(club.wageBudget)}</strong></div>
                  </div>
                `).join("")}
              </div>
            </div>

            <div class="panel">
              <h2 class="panel-title">New Save</h2>
              <div class="setup-form">
                <div class="field">
                  <label for="manager-name">Manager Name</label>
                  <input id="manager-name" value="Alex Morgan" maxlength="32">
                </div>
                ${ui.setupMode === "custom" ? `
                  <div class="field">
                    <label for="custom-club-name">Club Name</label>
                    <input id="custom-club-name" value="${escapeAttr(selected.city)} FC" maxlength="40">
                  </div>
                  <div class="message">Your custom club replaces ${escapeHtml(selected.name)} in the first season.</div>
                ` : `
                  <div class="message">Selected club: <strong>${escapeHtml(selected.name)}</strong></div>
                `}
                <button class="btn-primary" data-action="start-save">Start Save</button>
                ${Storage.hasSave() ? `<button data-action="load-save">Load Saved Game</button>` : ""}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderNav() {
    const groups = [
      { label: "Command", screens: ["dashboard", "match", "league", "history"] },
      { label: "Squad", screens: ["squad", "lineup", "tactics", "training", "staff", "academy"] },
      { label: "Market", screens: ["transfers", "scouting", "stats", "finances", "manager"] }
    ];
    return groups.map((group) => `
      <div class="nav-group">
        <span>${escapeHtml(group.label)}</span>
        ${group.screens.map((screenId) => {
          const navItem = NAV.find(([id]) => id === screenId);
          if (!navItem) return "";
          const [id, label] = navItem;
          return `<button class="${ui.screen === id ? "active" : ""}" ${ui.screen === id ? 'aria-current="page"' : ""} data-action="nav" data-screen="${id}"><span>${escapeHtml(label)}</span></button>`;
        }).join("")}
      </div>
    `).join("");
  }

  function renderScreen() {
    const title = NAV.find(([id]) => id === ui.screen);
    const heading = title ? title[1] : "Dashboard";
    const renderer = {
      dashboard: renderDashboard,
      squad: renderSquad,
      lineup: renderLineup,
      tactics: renderTactics,
      training: renderTraining,
      staff: renderStaff,
      academy: renderAcademy,
      match: renderMatchDay,
      league: renderLeague,
      transfers: renderTransfers,
      scouting: renderScouting,
      stats: renderStats,
      history: renderHistory,
      finances: renderFinances,
      manager: renderManager
    }[ui.screen] || renderDashboard;

    return `
      <div class="screen-head">
        <div>
          <h1 class="screen-title">${heading}</h1>
          <div class="screen-subtitle">${screenSubtitle(ui.screen)}</div>
        </div>
        ${screenAction(ui.screen)}
      </div>
      <div class="screen-body ${ui.commentaryPlaying ? "live-refresh" : ""}">${renderer()}</div>
    `;
  }

  function screenSubtitle(screen) {
    const club = activeClub();
    const table = Engine.calculateTable(state);
    const rank = table.findIndex((row) => row.clubId === club.id) + 1 || "-";
    const copy = {
      dashboard: `${club.name} are ${rank} in the table.`,
      squad: "Current ability, potential, contracts, morale, fitness, form.",
      lineup: "Pick exactly 11 starters or let the staff select by role fit.",
      tactics: "Shape, intensity, risk, and attacking routes for the next match.",
      training: "Plan the week, manage load, and prepare for the next opponent.",
      staff: "Upgrade departments that shape training, medical, analysis, and scouting.",
      academy: "Youth prospects, development plans, and first-team promotion.",
      match: "Continue through the calendar and review matchday reports.",
      league: "Table, goal difference, points, and recent form.",
      transfers: "Scout, shortlist, buy, loan, sell, and manage offers.",
      scouting: "Regional assignments, discoveries, target reports, and scout confidence.",
      stats: "League leaders, club leaders, and career production.",
      history: "Champions, awards, manager seasons, and league records.",
      finances: "Balance, budgets, wage pressure, and transfer movement.",
      manager: "Reputation, career history, trophies, and win percentage."
    };
    return copy[screen] || "";
  }

  function screenAction(screen) {
    if (screen === "match") {
      return `<button class="btn-green" data-action="simulate-round" ${ui.commentaryPlaying ? "disabled" : ""}>Continue Day</button>`;
    }
    if (screen === "lineup") {
      return `<button class="btn-primary" data-action="auto-lineup">Auto Select</button>`;
    }
    if (screen === "tactics") {
      return `<div class="screen-actions"><button class="btn-primary" data-action="auto-tactics">Auto Match Plan</button><button data-action="auto-roles">Auto Roles</button></div>`;
    }
    if (screen === "training") {
      return `<div class="screen-actions"><button class="btn-primary" data-action="auto-training">Auto Week</button><button class="btn-green" data-action="simulate-round" ${ui.commentaryPlaying ? "disabled" : ""}>Continue Day</button></div>`;
    }
    if (screen === "transfers") {
      return `<button class="btn-primary" data-action="invite-offers">Invite Offers</button>`;
    }
    return "";
  }

  function renderDashboard() {
    const club = activeClub();
    const table = Engine.calculateTable(state);
    const leaders = Engine.calculateLeaders(state);
    const next = Engine.getNextFixture(state, club.id);
    const board = Engine.boardReport(state);
    const cup = Engine.domesticCupReport(state);
    const europe = Engine.europeanReport(state);
    const daysToNext = next && state.calendar ? Math.max(0, Engine.daysBetween(state.calendar.currentDate, next.date)) : null;
    const activeRow = table.find((row) => row.clubId === club.id);
    const squad = Engine.clubPlayers(state, club.id);
    const avgAge = round(avg(squad.map((player) => player.age)), 1);
    const avgAbility = round(avg(squad.map((player) => player.currentAbility)), 1);
    const availability = Engine.squadAvailabilityReport(state, club.id);
    const development = Engine.squadDevelopmentReport(state, club.id);
    const happiness = Engine.squadHappinessReport(state, club.id);
    const topScorer = leaders.goals.find((player) => player.seasonStats.goals > 0);
    const bestPerformer = leaders.averageRating[0];
    const breakout = (development.risers[0] || development.prospects[0] || {}).player;
    const last = state.lastMatch;
    const rank = activeRow ? table.indexOf(activeRow) + 1 : "-";

    return `
      <div class="dashboard-hero">
        <div class="hero-copy">
          <div class="eyebrow">Club control room</div>
          <h2>${escapeHtml(club.name)}</h2>
          <p>${next ? `Next up: ${escapeHtml(nextFixtureLabel(next))}.` : "The season is complete."} Keep the board close, rotate through cup and European weeks, and protect the wage structure across the long save.</p>
        </div>
        <div class="hero-kpis">
          <div class="hero-kpi"><span>Position</span><strong>${activeRow ? ordinal(rank) : "-"}</strong></div>
          <div class="hero-kpi"><span>Points</span><strong>${activeRow ? activeRow.points : 0}</strong></div>
          <div class="hero-kpi"><span>Form</span><strong>${activeRow ? activeRow.form.join("") || "-" : "-"}</strong></div>
        </div>
      </div>
      ${renderActionQueue()}
      <div class="dashboard-command section-gap">
        <div class="next-match-card">
          <div class="eyebrow">Next Match</div>
          <h3>${next ? escapeHtml(nextFixtureLabel(next).replace(/^.*?: /, "")) : "Season complete"}</h3>
          <div class="match-meta-row">
            <span>${next ? escapeHtml(next.competitionName || state.league.name) : "Calendar"}</span>
            <span>${next && next.date ? escapeHtml(Engine.formatGameDate(next.date)) : "-"}</span>
            <span>${next ? `${daysToNext} day${daysToNext === 1 ? "" : "s"}` : "Done"}</span>
          </div>
          ${next ? renderFixture(next) : `<div class="empty-state">No fixture available.</div>`}
          <button class="btn-green command-button" data-action="simulate-round" ${ui.commentaryPlaying ? "disabled" : ""}>Continue Day</button>
        </div>
        <div class="pulse-grid">
          ${metric("Board Confidence", `${board.confidence}/100`, board.status.label)}
          ${metric("Squad Morale", `${happiness.averageScore}/100`, `${happiness.unhappy.length} concerns`)}
          ${metric("Availability", availability.available, `${availability.injured} injured | ${availability.suspended} suspended`)}
          ${metric("Europe", europe.activeQualified ? europe.activeStage : "Not Qualified", europe.nextFixture ? nextFixtureLabel(europe.nextFixture) : europe.championName || "Qualification race")}
        </div>
        <div class="insight-stack">
          ${dashboardInsight("Top Scorer", topScorer ? displayPlayerName(topScorer) : "-", topScorer ? `${topScorer.seasonStats.goals} goals` : "No scorer yet", "green")}
          ${dashboardInsight("Best Performer", bestPerformer ? displayPlayerName(bestPerformer) : "-", bestPerformer ? `${round(Engine.averageRating(bestPerformer.seasonStats), 2)} avg rating` : "Awaiting ratings", "blue")}
          ${dashboardInsight("Breakout Player", breakout ? displayPlayerName(breakout) : "-", breakout ? `${breakout.currentAbility}/${breakout.potential} ability` : "No development trend yet", "amber")}
        </div>
      </div>
      <div class="grid four section-gap">
        ${metric("Today", state.calendar ? Engine.formatGameDate(state.calendar.currentDate) : "-", next ? `${daysToNext} day${daysToNext === 1 ? "" : "s"} to match` : "Season complete")}
        ${metric("League Position", activeRow ? ordinal(rank) : "-", `${activeRow ? activeRow.points : 0} points`)}
        ${metric("Cup Run", cup.activeEliminated ? "Eliminated" : cup.championClubId === club.id ? "Winners" : cup.bestRoundLabel, cup.nextFixture ? nextFixtureLabel(cup.nextFixture) : cup.championName || "Awaiting draw")}
        ${metric("Squad Profile", `${avgAbility} CA`, `${avgAge} avg age`)}
      </div>
      <div class="grid three" style="margin-top:14px">
        <div class="panel">
          <h2 class="panel-title">Season Objectives</h2>
          ${renderBoardObjectives({ ...board, objectives: board.objectives.slice(0, 4), reviews: [] })}
        </div>
        <div class="panel">
          <h2 class="panel-title">League Snapshot</h2>
          ${renderMiniTable(table.slice(0, 6))}
        </div>
        <div class="panel">
          <h2 class="panel-title">Inbox</h2>
          ${renderInbox()}
        </div>
      </div>
      <div class="grid two" style="margin-top:14px">
        <div class="panel">
          <h2 class="panel-title">Last Match</h2>
          ${last ? renderMatchSummary(last) : `<div class="empty-state">No match played yet.</div>`}
        </div>
        <div class="panel">
          <h2 class="panel-title">League Leaders</h2>
          <div class="grid two">
            ${leaderList("Goals", leaders.goals, "goals")}
            ${leaderList("Assists", leaders.assists, "assists")}
          </div>
        </div>
      </div>
    `;
  }

  function renderSquad() {
    const club = activeClub();
    let players = Engine.clubPlayers(state, club.id);
    players = filterPlayers(players, ui.squadSearch, ui.squadPosition, ui.squadAvailability);
    players = sortPlayers(players, ui.squadSort, ui.squadDir);
    const selected = ui.selectedPlayerId ? Engine.getPlayer(state, ui.selectedPlayerId) : players[0];
    if (selected && selected.clubId === club.id) ui.selectedPlayerId = selected.id;
    const availability = Engine.squadAvailabilityReport(state, club.id);
    const development = Engine.squadDevelopmentReport(state, club.id);
    const happiness = Engine.squadHappinessReport(state, club.id);

    return `
      <div class="grid four">
        ${metric("Available", availability.available, `${availability.total} player squad`)}
        ${metric("Injured", availability.injured, `${availability.suspended} suspended`)}
        ${metric("Fitness Watch", availability.lowFitness + availability.doubtful, `${availability.highRisk} high risk`)}
        ${metric("Prospects", development.prospects.length, `${development.risers.length} improving`)}
        ${metric("Happiness", `${happiness.averageScore}/100`, `${happiness.unhappy.length} concerns | ${happiness.promises} promises`)}
      </div>
      <div class="squad-insights">
        ${renderAvailabilityWatch(availability)}
        ${renderDevelopmentWatch(development)}
        ${renderHappinessWatch(happiness)}
      </div>
      ${renderPlayerToolbar("squad")}
      <div class="grid ${selected ? "two" : ""}">
        <div class="panel">
          <h2 class="panel-title">Squad</h2>
          ${renderPlayerTable(players, "squad")}
        </div>
        ${selected ? `<div class="panel">${renderPlayerDetail(selected)}</div>` : ""}
      </div>
    `;
  }

  function renderAvailabilityWatch(report) {
    const items = report.list || [];
    return `
      <div class="panel">
        <div class="ratings-heading">
          <h2 class="panel-title">Availability Watch</h2>
          <span class="pill ${report.highRisk ? "amber" : "green"}">${report.highRisk} high risk</span>
        </div>
        ${items.length ? `
          <div class="watch-list">
            ${items.slice(0, 5).map((item) => `
              <button class="watch-item" data-action="view-player" data-player-id="${escapeAttr(item.player.id)}">
                <span>
                  <strong title="${escapeAttr(item.player.name)}">${escapeHtml(displayPlayerName(item.player))}</strong>
                  <small>${escapeHtml(item.status.detail)} | ${item.player.fitness}% fit</small>
                </span>
                <em class="badge ${item.status.tone}">${escapeHtml(item.status.label)}</em>
              </button>
            `).join("")}
          </div>
        ` : `<div class="empty-state">No immediate availability issues.</div>`}
      </div>
    `;
  }

  function renderDevelopmentWatch(report) {
    const risers = report.risers || [];
    const prospects = report.prospects || [];
    const rows = risers.length ? risers : prospects;
    return `
      <div class="panel">
        <div class="ratings-heading">
          <h2 class="panel-title">Development Watch</h2>
          <span class="pill blue">${prospects.length} prospects</span>
        </div>
        ${rows.length ? `
          <div class="watch-list">
            ${rows.slice(0, 5).map((row) => `
              <button class="watch-item" data-action="view-player" data-player-id="${escapeAttr(row.player.id)}">
                <span>
                  <strong title="${escapeAttr(row.player.name)}">${escapeHtml(displayPlayerName(row.player))}</strong>
                  <small>${row.player.age} yrs | ${row.growthRoom} growth room | ${Engine.trainingFocusLabel(row.player.trainingFocus)}</small>
                </span>
                <em class="badge ${row.delta > 0 ? "green" : "blue"}">${developmentDeltaLabel(row.delta)}</em>
              </button>
            `).join("")}
          </div>
        ` : `<div class="empty-state">No development movement yet.</div>`}
      </div>
    `;
  }

  function renderHappinessWatch(report) {
    const rows = report.unhappy.length ? report.unhappy : report.expiring;
    return `
      <div class="panel">
        <div class="ratings-heading">
          <h2 class="panel-title">Happiness Watch</h2>
          <span class="pill ${report.tone}">${report.averageScore}/100</span>
        </div>
        ${rows.length ? `
          <div class="watch-list">
            ${rows.slice(0, 5).map((row) => `
              <button class="watch-item" data-action="view-player" data-player-id="${escapeAttr(row.player.id)}">
                <span>
                  <strong title="${escapeAttr(row.player.name)}">${escapeHtml(displayPlayerName(row.player))}</strong>
                  <small>${escapeHtml(row.happiness.roleLabel)} | ${escapeHtml(row.happiness.reasons[0])}</small>
                </span>
                <em class="badge ${row.happiness.tone}">${escapeHtml(row.happiness.label)}</em>
              </button>
            `).join("")}
          </div>
        ` : `<div class="empty-state">No happiness or contract pressure right now.</div>`}
      </div>
    `;
  }

  function renderLineup() {
    const club = activeClub();
    const lineup = currentLineupIds(club);
    const bench = currentBenchIds(club, lineup);
    const selected = new Set(lineup);
    const matchday = new Set(lineup.concat(bench));
    const squad = sortPlayers(filterPlayers(Engine.clubPlayers(state, club.id), ui.squadSearch, ui.squadPosition), "position", "asc");
    const pool = squad.filter((player) => !matchday.has(player.id));
    const strength = Engine.teamStrength(state, club.id);

    return `
      <div class="grid four">
        ${metric("Overall", round(strength.overall, 1), "Starting XI strength")}
        ${metric("Attack", round(strength.attack, 1), "Final third")}
        ${metric("Midfield", round(strength.midfield, 1), "Control and chance supply")}
        ${metric("Defense", round(strength.defense, 1), "Back line and keeper")}
      </div>
      <div class="lineup-layout" style="margin-top:14px">
        <div class="panel lineup-pitch-panel">
          <div class="toolbar lineup-toolbar">
            <div class="field-inline">
              <label for="lineup-formation">Formation</label>
              <select id="lineup-formation" data-action="set-formation">
                ${Object.keys(Data.FORMATIONS).map((formation) => `<option value="${formation}" ${club.formation === formation ? "selected" : ""}>${formation}</option>`).join("")}
              </select>
            </div>
            <button data-action="save-lineup" class="btn-primary">Save Lineup</button>
            <button data-action="auto-lineup">Auto Select</button>
            <span class="pill ${selected.size === 11 ? "green" : "amber"}">${selected.size}/11 starters</span>
          </div>
          ${renderFormationPitch(club, lineup)}
        </div>
        <div class="panel lineup-pool-panel">
          <div class="lineup-side-stack">
            <section class="lineup-bench-section">
              <div class="ratings-heading">
                <h2 class="panel-title">Bench</h2>
                <div class="toolbar mini-toolbar">
                  <button data-action="auto-bench">Auto Bench</button>
                  <span class="pill ${bench.length === 7 ? "green" : "amber"}">${bench.length}/7 subs</span>
                </div>
              </div>
              ${renderBench(bench)}
            </section>
            <section>
              <div class="ratings-heading">
                <h2 class="panel-title">Squad Pool</h2>
                <span class="pill blue">${pool.length} available</span>
              </div>
              <div class="toolbar compact-toolbar">
                <input class="grow" data-ui="squadSearch" placeholder="Search squad" value="${escapeAttr(ui.squadSearch)}">
                <select data-ui="squadPosition">
                  <option value="all" ${ui.squadPosition === "all" ? "selected" : ""}>All Positions</option>
                  ${Data.POSITIONS.map((position) => `<option value="${position}" ${ui.squadPosition === position ? "selected" : ""}>${position}</option>`).join("")}
                </select>
              </div>
              ${renderSquadPool(pool)}
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function renderFormationPitch(club, lineup) {
    const slots = formationSlots(club.formation);
    return `
      <div class="formation-pitch" data-drop-pitch>
        <div class="pitch-halfway"></div>
        <div class="pitch-circle"></div>
        <div class="pitch-box pitch-box-top"></div>
        <div class="pitch-box pitch-box-bottom"></div>
        ${slots.map((slot) => renderFormationSlot(slot, Engine.getPlayer(state, lineup[slot.index]))).join("")}
      </div>
    `;
  }

  function renderFormationSlot(slot, player) {
    return `
      <div class="formation-slot" style="--x:${slot.x}%;--y:${slot.y}%" data-drop-slot data-slot-index="${slot.index}">
        <div class="slot-role">${escapeHtml(slot.role)}</div>
        ${player ? renderLineupCard(player, "slot", slot.index) : `<div class="lineup-card empty">Empty</div>`}
      </div>
    `;
  }

  function renderSquadPool(players) {
    return `
      <div class="lineup-pool" data-drop-pool>
        ${players.length ? players.map((player) => renderLineupCard(player, "pool", null)).join("") : `<div class="empty-state">No available players match the filter.</div>`}
      </div>
    `;
  }

  function renderBench(bench) {
    const slots = Array.from({ length: 7 }, (_, index) => Engine.getPlayer(state, bench[index]));
    return `
      <div class="bench-list">
        ${slots.map((player, index) => renderBenchSlot(player, index)).join("")}
      </div>
    `;
  }

  function renderBenchSlot(player, index) {
    return `
      <div class="bench-slot" data-drop-bench-slot data-bench-index="${index}">
        <div class="bench-index">${index + 1}</div>
        ${player ? renderLineupCard(player, "bench", index) : `<div class="bench-empty">Drop sub</div>`}
      </div>
    `;
  }

  function renderLineupCard(player, source, slotIndex) {
    const unavailable = Engine.isUnavailable(state, player);
    return `
      <div
        class="lineup-card ${source === "pool" ? "pool-card" : ""} ${source === "bench" ? "bench-card" : ""} ${unavailable ? "unavailable" : ""}"
        draggable="${unavailable ? "false" : "true"}"
        data-drag-player
        data-drop-player
        data-source="${source}"
        data-player-id="${escapeAttr(player.id)}"
        ${source === "slot" && slotIndex !== null && slotIndex !== undefined ? `data-slot-index="${slotIndex}"` : ""}
        ${source === "bench" && slotIndex !== null && slotIndex !== undefined ? `data-bench-index="${slotIndex}"` : ""}
      >
        <div class="lineup-card-main">
          ${playerNameButton(player, "name-button")}
          <span>${positionBadge(player.position)}<em>CA ${player.currentAbility}</em></span>
        </div>
        <div class="lineup-card-side">
          <span class="${player.fitness < 58 ? "low" : player.fitness > 78 ? "good" : ""}">${player.fitness}</span>
          <small>FIT</small>
        </div>
      </div>
    `;
  }

  function renderTactics() {
    const club = activeClub();
    const next = Engine.getNextFixture(state, club.id);
    const opponentId = next ? (next.homeClubId === club.id ? next.awayClubId : next.homeClubId) : null;
    const opponent = opponentId ? Engine.getClub(state, opponentId) : null;
    const profile = Engine.tacticalProfile(club);
    const opponentProfile = opponent ? Engine.tacticalProfile(opponent) : null;
    const strength = Engine.teamStrength(state, club.id);
    const roleReport = Engine.tacticalRoleReport(state, club.id);

    return `
      <div class="grid four">
        ${metric("Formation", club.formation || "-", `${Data.FORMATIONS[club.formation] ? Data.FORMATIONS[club.formation].join(" ") : "XI"}`)}
        ${metric("Mentality", tacticLabel("mentality", club.tactics && club.tactics.mentality), tacticLabel("pressing", club.tactics && club.tactics.pressing))}
        ${metric("Intensity", profile.intensity, profile.fatigue > 1 ? "High player load" : "Managed load")}
        ${metric("Role Fit", `${roleReport ? roleReport.averageFit : "-"}%`, roleReport && roleReport.weakFits.length ? `${roleReport.weakFits.length} weak fits` : `${round(strength.overall, 1)} team strength`)}
        ${metric("Instruction Fit", `${roleReport ? roleReport.averageInstructionFit : "-"}%`, roleReport && roleReport.instructionWarnings.length ? `${roleReport.instructionWarnings.length} concerns` : "Role instructions stable")}
      </div>
      <div class="tactics-layout" style="margin-top:14px">
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Match Plan</h2>
            <span class="pill blue">${escapeHtml(club.formation || "Formation")}</span>
          </div>
          <div class="tactic-grid">
            ${Data.TACTIC_GROUPS.map((group) => renderTacticCard(group, club)).join("")}
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Tactical Effects</h2>
          <div class="effect-stack">
            ${effectMeter("Attacking Intent", 50 + profile.attack * 7 + profile.xg * 70 + profile.shotVolume * 5, "Higher chance volume")}
            ${effectMeter("Defensive Security", 50 + profile.defense * 7 - profile.xgAgainst * 70, "Resistance to chances")}
            ${effectMeter("Possession Bias", 50 + profile.possession * 5 + profile.midfield * 4, "Territory and control")}
            ${effectMeter("Passing Stability", 50 + profile.passAccuracy * 7 - profile.pressure * 5, "Accuracy under pressure")}
            ${effectMeter("Set Play Threat", 50 + profile.corners * 8, "Corners and aerial routes")}
            ${effectMeter("Player Load", profile.intensity + profile.fatigue * 7, "Fitness and injury pressure")}
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Plan Presets</h2>
          ${renderTacticalPresetPanel("apply-tactical-preset")}
        </div>
        <div class="panel">
          <h2 class="panel-title">Next Opposition</h2>
          ${next && opponent ? renderTacticalPreview(club, opponent, profile, opponentProfile, next) : `<div class="empty-state">No upcoming fixture.</div>`}
        </div>
        <div class="panel tactical-roles-panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Tactical Roles</h2>
            <span class="pill ${roleReport && roleReport.averageFit >= 72 ? "green" : roleReport && roleReport.averageFit >= 58 ? "blue" : "amber"}">${roleReport ? roleReport.averageFit : "-"} avg fit</span>
          </div>
          ${roleReport ? renderTacticalRolesPanel(roleReport) : `<div class="empty-state">Role report unavailable.</div>`}
        </div>
      </div>
    `;
  }

  function renderTacticalRolesPanel(report) {
    return `
      <div class="role-layout">
        <div class="role-table">
          ${report.slots.map((slot) => renderRoleSlot(slot)).join("")}
        </div>
        <div class="role-sidebar">
          <div class="preview-row"><span>Formation</span><strong>${escapeHtml(report.formation)}</strong></div>
          <div class="preview-row"><span>Attack Bias</span><strong>${round(report.phaseBias.attack || 0, 1)}</strong></div>
          <div class="preview-row"><span>Midfield Bias</span><strong>${round(report.phaseBias.midfield || 0, 1)}</strong></div>
          <div class="preview-row"><span>Defensive Bias</span><strong>${round(report.phaseBias.defense || 0, 1)}</strong></div>
          <div class="preview-row"><span>Instruction Fit</span><strong>${report.averageInstructionFit}</strong></div>
          ${report.weakFits.length ? `
            <div class="message warn">
              <strong>Role Mismatch</strong><br>
              ${report.weakFits.slice(0, 3).map((slot) => `${escapeHtml(slot.playerName)} as ${escapeHtml(slot.roleLabel)}`).join("<br>")}
            </div>
          ` : `<div class="message good"><strong>Role Cohesion</strong><br>The current XI fits the assigned roles well.</div>`}
          ${report.instructionWarnings.length ? `
            <div class="message warn">
              <strong>Instruction Concern</strong><br>
              ${report.instructionWarnings.slice(0, 3).map((slot) => `${escapeHtml(slot.playerName)}: ${escapeHtml(slot.instructionLabel)}`).join("<br>")}
            </div>
          ` : `<div class="message good"><strong>Instruction Clarity</strong><br>Player instructions match the current roles.</div>`}
        </div>
      </div>
    `;
  }

  function renderRoleSlot(slot) {
    const selectId = `role-${slot.slotIndex}`;
    const instructionId = `instruction-${slot.slotIndex}`;
    return `
      <div class="role-row">
        <div class="role-player">
          <span class="role-index">${slot.slotIndex + 1}</span>
          <div>
            <strong>${escapeHtml(slot.playerName)}</strong>
            <small>${positionBadge(slot.position)} ${escapeHtml(slot.roleLabel)} | ${escapeHtml(slot.instructionLabel)}</small>
          </div>
        </div>
        <div class="role-controls">
          <label class="sr-only" for="${selectId}">Role for ${escapeAttr(slot.playerName)}</label>
          <select id="${selectId}" data-action="set-tactical-role" data-slot-index="${slot.slotIndex}">
            ${slot.options.map((option) => `<option value="${escapeAttr(option.key)}" ${option.key === slot.roleKey ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
          </select>
          <label class="sr-only" for="${instructionId}">Instruction for ${escapeAttr(slot.playerName)}</label>
          <select id="${instructionId}" data-action="set-player-instruction" data-slot-index="${slot.slotIndex}">
            ${slot.instructionOptions.map((option) => `<option value="${escapeAttr(option.key)}" ${option.key === slot.instructionKey ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
          </select>
        </div>
        <div class="role-fit-stack">
          <div class="role-fit">
            <span class="badge ${slot.tone}">Role ${slot.fit}</span>
            ${bar(slot.fit, slot.tone)}
          </div>
          <div class="role-fit">
            <span class="badge ${slot.instructionTone}">Inst ${slot.instructionFit}</span>
            ${bar(slot.instructionFit, slot.instructionTone)}
          </div>
          <div class="role-mastery-line">
            <span>${round(slot.roleMastery, 0)} role</span>
            <span>${round(slot.instructionMastery, 0)} instr</span>
            ${slot.instructionLoad ? `<span>${slot.instructionLoad > 0 ? "+" : ""}${round(slot.instructionLoad * 100, 0)}% load</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  function renderTraining() {
    const club = activeClub();
    const next = Engine.getNextFixture(state, club.id);
    const calendar = Engine.getTrainingCalendar(state, club.id, 10);
    const recommendations = Engine.trainingRecommendations(state, club.id);
    const report = club.trainingReport;
    const familiarity = club.matchPrepFamiliarity || {};
    const activePrep = club.matchPrep || "balanced";
    const squad = Engine.clubPlayers(state, club.id);
    const avgFitness = round(avg(squad.map((player) => player.fitness)), 1);
    const avgSharpness = round(avg(squad.map((player) => player.sharpness)), 1);
    const load = report ? report.load : calendar[0] ? calendar[0].load : 0;

    return `
      <div class="grid four">
        ${metric("Weekly Plan", Engine.trainingPlanLabel(club.trainingPlan || "balanced"), `${loadTone(load)} load`)}
        ${metric("Match Prep", Engine.matchPrepLabel(activePrep), `${round(familiarity[activePrep] || 0, 1)} familiarity`)}
        ${metric("Fitness", `${avgFitness}%`, `${avgSharpness}% sharpness`)}
        ${metric("Next Match", next ? Engine.formatGameDate(next.date) : "-", next ? nextFixtureLabel(next) : "Season complete")}
      </div>
      <div class="training-layout" style="margin-top:14px">
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Weekly Training</h2>
            <span class="pill ${load > 1.6 ? "amber" : "green"}">${loadTone(load)}</span>
          </div>
          <div class="training-controls">
            <div class="tactic-card">
              <label for="weekly-training-plan">Training Plan</label>
              <select id="weekly-training-plan" data-action="set-training-plan">
                ${Object.entries(Engine.TRAINING_PLANS).map(([key, plan]) => `<option value="${escapeAttr(key)}" ${club.trainingPlan === key ? "selected" : ""}>${escapeHtml(plan.label)}</option>`).join("")}
              </select>
              <p>${escapeHtml((Engine.TRAINING_PLANS[club.trainingPlan] || Engine.TRAINING_PLANS.balanced).description)}</p>
            </div>
            <div class="tactic-card">
              <label for="match-prep-plan">Match Preparation</label>
              <select id="match-prep-plan" data-action="set-match-prep">
                ${Object.entries(Engine.MATCH_PREP).map(([key, prep]) => `<option value="${escapeAttr(key)}" ${activePrep === key ? "selected" : ""}>${escapeHtml(prep.label)}</option>`).join("")}
              </select>
              <p>${escapeHtml((Engine.MATCH_PREP[activePrep] || Engine.MATCH_PREP.balanced).description)}</p>
            </div>
          </div>
          <div class="effect-stack" style="margin-top:12px">
            ${effectMeter("Load", load * 35, "Training intensity and injury pressure")}
            ${effectMeter("Prep Familiarity", familiarity[activePrep] || 0, "How ready the team is for the selected prep")}
            ${effectMeter("Squad Freshness", avgFitness, "Condition across the squad")}
            ${effectMeter("Match Sharpness", avgSharpness, "Rhythm and training tempo")}
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Staff Recommendations</h2>
          <div class="recommendation-list">
            ${recommendations.map((item) => `
              <div class="message ${item.tone === "red" ? "bad" : item.tone === "amber" ? "warn" : item.tone === "green" ? "good" : ""}">
                <strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.body)}
              </div>
            `).join("")}
          </div>
        </div>
        <div class="panel training-calendar-panel">
          <h2 class="panel-title">Training Calendar</h2>
          <div class="training-calendar">
            ${calendar.map((day) => renderTrainingDay(day)).join("")}
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Latest Session</h2>
          ${report ? renderTrainingReport(report) : `<div class="empty-state">Continue a day to generate the first training report.</div>`}
        </div>
      </div>
    `;
  }

  function renderTrainingDay(day) {
    const match = !!day.fixtureId;
    const tone = match ? "match" : day.type === "Rest Day" || day.type === "Post-Match Recovery" ? "recovery" : day.load > 1.5 ? "heavy" : "normal";
    return `
      <div class="training-day ${tone}">
        <div>
          <strong>${escapeHtml(day.label)}</strong>
          <span>${escapeHtml(day.type)}</span>
        </div>
        <div>
          <em>${match ? `${escapeHtml(day.venue)} vs ${escapeHtml(clubName(day.opponentId))}` : escapeHtml(day.planLabel)}</em>
          <small>${escapeHtml(day.matchPrepLabel)} | ${loadTone(day.load)}</small>
        </div>
      </div>
    `;
  }

  function renderTrainingReport(report) {
    return `
      <div class="training-report">
        <div class="preview-row"><span>Date</span><strong>${escapeHtml(Engine.formatGameDate(report.date))}</strong></div>
        <div class="preview-row"><span>Session</span><strong>${escapeHtml(report.type)}</strong></div>
        <div class="preview-row"><span>Plan</span><strong>${escapeHtml(report.planLabel)}</strong></div>
        <div class="preview-row"><span>Match Prep</span><strong>${escapeHtml(report.matchPrepLabel)}</strong></div>
        <div class="preview-row"><span>Average Fitness</span><strong>${report.averageFitness}%</strong></div>
        <div class="preview-row"><span>Average Sharpness</span><strong>${report.averageSharpness}%</strong></div>
        <div class="preview-row"><span>Training Injuries</span><strong>${report.injuries}</strong></div>
        <div class="preview-row"><span>Development</span><strong>${report.development || 0}</strong></div>
        ${(report.growth || []).length ? `
          <div class="timeline compact-timeline">
            ${report.growth.map((item) => `
              <div class="timeline-item">
                <strong>${escapeHtml(item.playerName)}</strong>
                <span>${escapeHtml(attributeLabel(item.attribute))} ${item.before} -> ${item.after}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderStaff() {
    const club = activeClub();
    const report = Engine.staffRoomReport(state, club.id);
    if (!report) return `<div class="empty-state">Staff report unavailable.</div>`;
    const strongest = report.departments.slice().sort((a, b) => b.level - a.level)[0];
    const nextUpgrade = report.departments.filter((department) => !department.maxed).sort((a, b) => a.upgradeCost - b.upgradeCost)[0];

    return `
      <div class="grid four">
        ${metric("Staff Level", report.averageLevel, strongest ? `${strongest.label} level ${strongest.level}` : "No departments")}
        ${metric("Weekly Staff Cost", Engine.formatMoney(report.weeklyCost), "Operational overhead")}
        ${metric("Balance", Engine.formatMoney(club.balance), nextUpgrade ? `${Engine.formatMoney(nextUpgrade.upgradeCost)} next upgrade` : "All departments maxed")}
        ${metric("Prep Edge", `${Math.round((report.effects.familiarityMultiplier - 1) * 100)}%`, "Analysis familiarity modifier")}
      </div>
      <div class="staff-layout section-gap">
        <div class="panel staff-departments-panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Departments</h2>
            <span class="pill blue">${report.departments.length} units</span>
          </div>
          <div class="staff-grid">
            ${report.departments.map(renderStaffDepartment).join("")}
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Department Effects</h2>
          <div class="effect-stack">
            ${effectMeter("Training Growth", report.effects.coachingGrowthMultiplier * 82, `${Math.round((report.effects.coachingGrowthMultiplier - 1) * 100)}% modifier`)}
            ${effectMeter("Medical Control", (2 - report.effects.injuryRiskMultiplier) * 78, `${Math.round((1 - report.effects.injuryRiskMultiplier) * 100)}% injury risk`)}
            ${effectMeter("Match Prep Detail", report.effects.familiarityMultiplier * 78, `${Math.round((report.effects.familiarityMultiplier - 1) * 100)}% familiarity`)}
            ${effectMeter("Scouting Speed", (2 - report.effects.scoutingDaysMultiplier) * 76, `${Math.round((1 - report.effects.scoutingDaysMultiplier) * 100)}% assignment days`)}
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Staff Recommendations</h2>
          <div class="recommendation-list">
            ${report.recommendations.map((item) => `
              <div class="message ${item.tone === "red" ? "bad" : item.tone === "amber" ? "warn" : item.tone === "green" ? "good" : ""}">
                <strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.body)}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderStaffDepartment(department) {
    return `
      <div class="staff-card">
        <div class="staff-card-head">
          <div>
            <strong>${escapeHtml(department.label)}</strong>
            <span>${escapeHtml(department.name)}</span>
          </div>
          <span class="badge ${department.level >= 4 ? "green" : department.level >= 3 ? "blue" : "amber"}">Lvl ${department.level}</span>
        </div>
        <div class="level-dots" aria-label="${escapeAttr(department.label)} level ${department.level}">
          ${Array.from({ length: 5 }, (_, index) => `<span class="${index < department.level ? "filled" : ""}"></span>`).join("")}
        </div>
        <p>${escapeHtml(department.description)}</p>
        <div class="preview-row"><span>Effect</span><strong>${escapeHtml(department.effect)}</strong></div>
        <div class="preview-row"><span>Weekly Cost</span><strong>${Engine.formatMoney(department.weeklyCost)}</strong></div>
        <button class="${department.maxed ? "" : "btn-primary"}" data-action="upgrade-staff" data-staff-key="${escapeAttr(department.key)}" ${department.maxed ? "disabled" : ""}>
          ${department.maxed ? "Max Level" : `Upgrade ${Engine.formatMoney(department.upgradeCost)}`}
        </button>
      </div>
    `;
  }

  function renderAcademy() {
    const report = Engine.academyReport(state);
    const pathway = Engine.youthPathwayReport(state);
    const top = report.top ? report.top.prospect : null;
    return `
      <div class="grid four">
        ${metric("Academy Level", report.level, "Development setup")}
        ${metric("Prospects", report.prospects.length, `${report.highCeiling.length} high ceiling`)}
        ${metric("Avg Potential", report.averagePotential || "-", `${report.averageReadiness || 0}/100 readiness`)}
        ${metric("Standout", top ? top.displayName || top.name : "-", top ? `${top.currentAbility}/${top.potential} CA/PA` : "No prospects")}
        ${metric("Active Loans", pathway.activeLoans.length, `${pathway.candidates.length} candidates`)}
        ${metric("Pathway Risk", pathway.atRisk, `${pathway.kept} kept`)}
      </div>

      <div class="grid two section-gap academy-layout">
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Academy Squad</h2>
            <span class="pill blue">${report.ready.length} close to senior level</span>
          </div>
          ${renderAcademyProspects(report.prospects)}
        </div>
        <div class="panel">
          <h2 class="panel-title">Talent Watch</h2>
          ${renderAcademyWatch(report)}
        </div>
      </div>

      <div class="panel section-gap">
        <div class="ratings-heading">
          <h2 class="panel-title">Loan Pathway</h2>
          <span class="pill ${pathway.atRisk ? "amber" : "green"}">${pathway.promises.length} active promises</span>
        </div>
        ${renderYouthPathway(pathway)}
      </div>

      <div class="panel section-gap">
        <h2 class="panel-title">Academy Reports</h2>
        ${renderAcademyReports(report.reports)}
      </div>
    `;
  }

  function renderYouthPathway(pathway) {
    return `
      <div class="grid two pathway-layout">
        <div>
          <h3 class="panel-title">Active Loan Spells</h3>
          ${renderActiveYouthLoans(pathway.activeLoans)}
        </div>
        <div>
          <h3 class="panel-title">Recommended Outgoing Loans</h3>
          ${renderYouthLoanCandidates(pathway.candidates)}
        </div>
      </div>
      ${pathway.promises.length ? `
        <div class="pathway-promise-strip">
          ${pathway.promises.slice(0, 5).map((report) => {
            const player = Engine.getPlayer(state, report.playerId);
            return `
              <button class="pathway-promise" data-action="view-player" data-player-id="${escapeAttr(report.playerId)}">
                <span>
                  <strong>${player ? escapeHtml(displayPlayerName(player)) : "Player"}</strong>
                  <small>${escapeHtml(report.detail)} | due ${escapeHtml(Engine.formatGameDate(report.dueDate))}</small>
                </span>
                <em class="badge ${report.tone}">${report.progress}% ${escapeHtml(report.label)}</em>
              </button>
            `;
          }).join("")}
        </div>
      ` : ""}
    `;
  }

  function renderActiveYouthLoans(rows) {
    if (!rows.length) return `<div class="empty-state">No prospects are currently out on pathway loans.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Club</th><th>Fit</th><th>Apps</th><th>Mins</th><th>Avg</th><th>Promise</th></tr></thead>
          <tbody>
            ${rows.map(({ player, club, loan, promise }) => `
              <tr>
                <td>${playerNameButton(player)}</td>
                <td>
                  <strong>${escapeHtml(club ? club.name : loan.destinationName)}</strong>
                  <div class="small-muted">${escapeHtml(loan.destinationLevel || "Loan")}</div>
                </td>
                <td><span class="badge ${loan.fitScore >= 82 ? "green" : loan.fitScore >= 68 ? "blue" : "amber"}">${loan.fitScore}/100</span></td>
                <td>${loan.appearances || 0}</td>
                <td>${loan.minutes || 0}</td>
                <td>${loan.averageRating || "-"}</td>
                <td>${promise ? `<span class="badge ${promise.tone}">${promise.progress}% ${escapeHtml(promise.label)}</span>` : "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderYouthLoanCandidates(rows) {
    if (!rows.length) return `<div class="empty-state">No suitable senior prospects need a loan right now.</div>`;
    return `
      <div class="pathway-candidate-list">
        ${rows.slice(0, 6).map(({ player, bestDestination, destinations, promise }) => `
          <article class="pathway-candidate">
            <div class="pathway-candidate-head">
              <span>
                ${playerNameButton(player)}
                <small>${positionBadge(player.position)} ${player.age} yrs | ${player.currentAbility}/${player.potential} CA/PA | ${Engine.squadRoleLabel(player.squadRole)}</small>
              </span>
              ${promise ? `<em class="badge ${promise.tone}">${promise.progress}% pathway</em>` : `<em class="badge blue">New pathway</em>`}
            </div>
            ${bestDestination ? `
              <div class="loan-fit-card">
                <div>
                  <strong>${escapeHtml(bestDestination.name)}</strong>
                  <small>${escapeHtml(bestDestination.level)} | ${escapeHtml(bestDestination.roleLabel)} | ${escapeHtml(bestDestination.focusLabel)}</small>
                </div>
                <span class="badge ${bestDestination.tone}">${bestDestination.score}/100 fit</span>
              </div>
              <div class="loan-fit-metrics">
                <span>Minutes ${bestDestination.playingTime}</span>
                <span>Level ${bestDestination.levelFit}</span>
                <span>Role ${bestDestination.roleFit}</span>
              </div>
              <div class="pathway-destination-row">
                ${destinations.slice(0, 3).map((destination) => `<span>${escapeHtml(destination.name)} <b>${destination.score}</b></span>`).join("")}
              </div>
              <button class="btn-primary" data-action="loan-out-youth" data-player-id="${escapeAttr(player.id)}" data-destination-id="${escapeAttr(bestDestination.destinationId)}">Loan to ${escapeHtml(bestDestination.name)}</button>
            ` : `<div class="empty-state">No destination recommendation available.</div>`}
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderAcademyProspects(rows) {
    if (!rows.length) return `<div class="empty-state">No academy prospects are currently registered.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Prospect</th><th>Pos</th><th>Age</th><th>CA</th><th>PA</th><th>Ready</th><th>Plan</th><th>Morale</th><th>Top Attributes</th><th></th></tr>
          </thead>
          <tbody>
            ${rows.map(({ prospect, readiness, tone, topAttributes }) => `
              <tr>
                <td>
                  <strong>${escapeHtml(prospect.name)}</strong>
                  <div class="small-muted">${escapeHtml(prospect.nationality)} | ${escapeHtml(prospect.foot)} foot</div>
                </td>
                <td>${positionBadge(prospect.position)}</td>
                <td>${prospect.age}</td>
                <td>${prospect.currentAbility}</td>
                <td>${prospect.potential}</td>
                <td>${bar(readiness, tone)}</td>
                <td>
                  <select data-action="set-academy-plan" data-prospect-id="${prospect.id}">
                    ${Engine.academyPlanOptions().map((plan) => `<option value="${plan.key}" ${prospect.trainingPlan === plan.key ? "selected" : ""}>${escapeHtml(plan.label)}</option>`).join("")}
                  </select>
                </td>
                <td>${bar(prospect.morale, prospect.morale >= 72 ? "green" : prospect.morale >= 52 ? "amber" : "red")}</td>
                <td>
                  <div class="attribute-chip-list compact">
                    ${topAttributes.map((item) => `<span class="attribute-chip"><strong>${item.value}</strong>${escapeHtml(item.label)}</span>`).join("")}
                  </div>
                </td>
                <td>
                  <div class="table-actions">
                    <button class="btn-compact" data-action="promote-academy" data-prospect-id="${prospect.id}">Promote</button>
                    <button class="btn-compact" data-action="release-academy" data-prospect-id="${prospect.id}">Release</button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAcademyWatch(report) {
    const items = report.ready.length ? report.ready : report.highCeiling;
    if (!items.length) return `<div class="empty-state">Academy staff will flag ready prospects and high-ceiling players here.</div>`;
    return `
      <div class="target-stack">
        ${items.slice(0, 6).map(({ prospect, readiness, tone, growthRoom }) => `
          <div class="target-card">
            <span>
              <strong>${escapeHtml(prospect.name)}</strong>
              <small>${positionBadge(prospect.position)} ${prospect.age} yrs | ${academyGrowthLabel(growthRoom)} | ${Engine.academyPlanLabel(prospect.trainingPlan)}</small>
            </span>
            <span class="badge ${tone}">${readiness}/100</span>
            <div class="table-actions">
              <button class="btn-compact" data-action="promote-academy" data-prospect-id="${prospect.id}">Promote</button>
              <button class="btn-compact" data-action="release-academy" data-prospect-id="${prospect.id}">Release</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function academyGrowthLabel(growthRoom) {
    if (growthRoom >= 18) return "Elite upside";
    if (growthRoom >= 11) return "Strong upside";
    if (growthRoom >= 5) return "Useful growth";
    return "Near ceiling";
  }

  function renderAcademyReports(reports) {
    const visible = (reports || []).slice(0, 6);
    if (!visible.length) return `<div class="empty-state">Development notes appear after youth training or intake days.</div>`;
    return `
      <div class="timeline">
        ${visible.map((report) => `
          <div class="timeline-item">
            <strong>${report.date ? escapeHtml(Engine.formatGameDate(report.date)) : `S${report.season}`}</strong>
            <span>
              <b>${report.type === "intake" || report.type === "initial" ? "Youth Intake" : "Development Block"}</b><br>
              <span class="small-muted">${report.count ? `${report.count} prospects added.` : `${report.development || 0} development note${report.development === 1 ? "" : "s"}.`}</span>
            </span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function loadTone(load) {
    if (load <= 0.2) return "Rest";
    if (load < 0.7) return "Light";
    if (load < 1.35) return "Medium";
    if (load < 1.9) return "High";
    return "Heavy";
  }

  function renderTacticalPresetPanel(action) {
    return `
      <div class="preset-grid">
        ${Engine.tacticalPresetOptions().map((preset) => `
          <button class="preset-card" data-action="${escapeAttr(action)}" data-preset-key="${escapeAttr(preset.key)}">
            <strong>${escapeHtml(preset.label)}</strong>
            <span>${escapeHtml(preset.description)}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderTacticCard(group, club) {
    const value = club.tactics && club.tactics[group.key] ? club.tactics[group.key] : Engine.DEFAULT_TACTICS[group.key];
    const current = group.options.find((option) => option.value === value) || group.options[0];
    return `
      <div class="tactic-card">
        <label for="tactic-${escapeAttr(group.key)}">${escapeHtml(group.label)}</label>
        <select id="tactic-${escapeAttr(group.key)}" data-action="set-tactic" data-tactic-key="${escapeAttr(group.key)}">
          ${group.options.map((option) => `<option value="${escapeAttr(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
        <p>${escapeHtml(current.detail || group.description)}</p>
      </div>
    `;
  }

  function renderTacticalPreview(club, opponent, profile, opponentProfile, next) {
    const venue = next.homeClubId === club.id ? "Home" : "Away";
    const edge = profile.intensity - (opponentProfile ? opponentProfile.intensity : 50);
    const control = profile.possession - (opponentProfile ? opponentProfile.possession : 0);
    return `
      <div class="tactical-preview">
        <div class="fixture mini">
          <span class="home">${escapeHtml(clubName(next.homeClubId))}</span>
          <span class="score">vs</span>
          <span class="away">${escapeHtml(clubName(next.awayClubId))}</span>
        </div>
        <div class="preview-row">
          <span>Venue</span>
          <strong>${escapeHtml(venue)}</strong>
        </div>
        <div class="preview-row">
          <span>Your Shape</span>
          <strong>${escapeHtml(club.formation)} | ${escapeHtml(tacticLabel("focus", club.tactics && club.tactics.focus))}</strong>
        </div>
        <div class="preview-row">
          <span>Opponent Shape</span>
          <strong>${escapeHtml(opponent.formation || "-")} | ${escapeHtml(tacticLabel("mentality", opponent.tactics && opponent.tactics.mentality))}</strong>
        </div>
        <div class="preview-row">
          <span>Intensity Edge</span>
          <strong>${edge > 0 ? "+" : ""}${Math.round(edge)}</strong>
        </div>
        <div class="preview-row">
          <span>Control Bias</span>
          <strong>${control > 0 ? "+" : ""}${round(control, 1)}</strong>
        </div>
      </div>
    `;
  }

  function renderMatchDay() {
    const club = activeClub();
    const next = Engine.getNextFixture(state, club.id);
    const roundData = state.league.schedule[state.league.currentRound] || state.league.schedule[state.league.schedule.length - 1];
    const cup = Engine.domesticCupReport(state);
    const europe = Engine.europeanReport(state);
    const cupRound = visibleCompetitionRound(cup);
    const europeRound = visibleCompetitionRound(europe);
    const match = ui.liveMatch || state.lastMatch;
    const commentary = ui.liveMatch ? (ui.liveMatch.commentary || []).slice(0, ui.commentaryCount) : match ? (match.commentary || []) : [];
    const minute = match ? liveMatchMinute(match, commentary) : 0;
    const visibleGoals = match ? visibleMatchGoals(match, commentary, minute) : [];

    return `
      ${match ? renderLiveMatchCentre(match, minute, visibleGoals) : ""}
      ${match ? renderMatchdayManagement(match, minute, visibleGoals) : ""}
      <div class="grid two">
        <div class="panel">
          <h2 class="panel-title">Round ${roundData ? roundData.number : state.league.currentRound}${roundData && roundData.date ? ` | ${escapeHtml(Engine.formatGameDate(roundData.date))}` : ""}</h2>
          <div class="match-strip">
            ${roundData ? roundData.fixtures.map(renderFixture).join("") : `<div class="empty-state">No fixtures.</div>`}
          </div>
          <div style="margin-top:12px">
            <button class="btn-green" data-action="simulate-round" ${ui.commentaryPlaying ? "disabled" : ""}>Continue Day</button>
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Live Commentary</h2>
          <div class="commentary" id="commentary">
            ${commentary.length ? commentary.map((event) => `
              <div class="commentary-line">
                <span class="minute">${event.minute}'</span>
                <span><strong class="event-title">${escapeHtml(event.title)}</strong>${escapeHtml(event.text)}</span>
              </div>
            `).join("") : `<div class="commentary-line"><span class="minute">--</span><span>Awaiting kick off.</span></div>`}
          </div>
        </div>
      </div>
      <div class="grid two section-gap">
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">${escapeHtml(cup.name)}</h2>
            <span class="pill ${cup.activeEliminated ? "amber" : cup.championClubId === club.id ? "green" : "blue"}">${cup.activeEliminated ? "Eliminated" : cup.status === "complete" ? `${escapeHtml(cup.championName || "Complete")} winners` : cup.bestRoundLabel}</span>
          </div>
          ${cupRound ? `
            <div class="fixture-date" style="margin-bottom:10px">${escapeHtml(cupRound.label)} | ${escapeHtml(Engine.formatGameDate(cupRound.date))}</div>
            <div class="match-strip">${cupRound.fixtures.map(renderFixture).join("")}</div>
          ` : `<div class="empty-state">No cup fixtures drawn.</div>`}
        </div>
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">${escapeHtml(europe.name)}</h2>
            <span class="pill ${europe.activeEliminated ? "amber" : europe.championClubId === club.id ? "green" : "blue"}">${europe.activeQualified ? europe.activeStage : "Not Qualified"}</span>
          </div>
          ${europeRound ? `
            <div class="fixture-date" style="margin-bottom:10px">${escapeHtml(europeRound.label)} | ${escapeHtml(Engine.formatGameDate(europeRound.date))}</div>
            <div class="match-strip">${europeRound.fixtures.map(renderFixture).join("")}</div>
          ` : `<div class="empty-state">No European fixtures drawn.</div>`}
        </div>
      </div>
      ${match ? `<div class="grid two" style="margin-top:14px">${renderMatchStats(match)}${renderRatings(match, visibleGoals)}</div>${renderMatchAnalysis(match)}` : ""}
    `;
  }

  function visibleCupRound(cup) {
    return visibleCompetitionRound(cup);
  }

  function visibleCompetitionRound(report) {
    if (!report || !report.rounds) return null;
    return report.rounds.find((round) => round.fixtures.length && round.fixtures.some((fixture) => !fixture.played)) ||
      report.rounds.slice().reverse().find((round) => round.fixtures.length) ||
      null;
  }

  function renderLeague() {
    return `
      <div class="panel">
        <h2 class="panel-title">League Table</h2>
        ${renderLeagueTable(Engine.calculateTable(state))}
      </div>
    `;
  }

  function renderTransfers() {
    const club = activeClub();
    const windowStatus = Engine.transferWindowStatus(state);
    const deadline = Engine.deadlineDayReport(state);
    const needReport = Engine.recruitmentNeedReport(state, club.id);
    const recommendations = Engine.recruitmentRecommendations(state, 8);
    const shortlist = Engine.shortlistPlayers(state);
    let players = marketPlayers();
    players = filterPlayers(players, ui.marketSearch, ui.marketPosition);
    players = filterMarketView(players, ui.marketView);
    players = sortPlayers(players, ui.marketSort, ui.marketDir);
    const offers = state.transfers.offers.filter((offer) => offer.status === "pending" && offer.type !== "outgoing");
    const negotiations = state.transfers.offers.filter((offer) => offer.status === "countered" && offer.type === "outgoing");
    const agreements = (state.transfers.preAgreements || []).filter((agreement) => agreement.status === "pending");
    const news = state.transfers.news || [];

    return `
      ${renderTransferWindowPanel(windowStatus, agreements, deadline)}
      ${renderRecruitmentCentre(needReport, recommendations, shortlist)}
      ${renderTransferNews(news)}
      <div class="grid three">
        <div class="panel">
          <h2 class="panel-title">Incoming Offers</h2>
          ${offers.length ? renderIncomingOffers(offers) : `<div class="empty-state">No pending offers.</div>`}
        </div>
        <div class="panel">
          <h2 class="panel-title">Negotiations</h2>
          ${negotiations.length ? renderOutgoingNegotiations(negotiations) : `<div class="empty-state">No active negotiations.</div>`}
        </div>
        <div class="panel">
          <h2 class="panel-title">Pre-Agreements</h2>
          ${agreements.length ? renderPreAgreements(agreements) : `<div class="empty-state">Deals agreed outside a window appear here.</div>`}
        </div>
      </div>
      <div class="panel" style="margin-top:14px">
        <h2 class="panel-title">Transfer Market</h2>
        ${renderPlayerToolbar("market")}
        ${renderMarketTable(players)}
      </div>
      <div class="panel" style="margin-top:14px">
        <h2 class="panel-title">Transfer Ledger</h2>
        ${renderTransferHistory(state.transfers.history || [])}
      </div>
    `;
  }

  function renderTransferWindowPanel(windowStatus, agreements, deadline) {
    const tone = windowStatus.isOpen ? windowStatus.isDeadlineDay ? "amber" : "green" : "blue";
    return `
      <div class="transfer-window-panel">
        <div>
          <span class="pill ${tone}">${windowStatus.isOpen ? windowStatus.label : "Window Closed"}</span>
          <h2>${windowStatus.isOpen ? `${windowStatus.daysRemaining} day${windowStatus.daysRemaining === 1 ? "" : "s"} remaining` : `Next opens ${Engine.formatGameDate(windowStatus.opensOn)}`}</h2>
          <p>${windowStatus.isOpen ? `Closes ${Engine.formatGameDate(windowStatus.closesOn)}. Deals can be registered immediately.` : `${windowStatus.daysRemaining} day${windowStatus.daysRemaining === 1 ? "" : "s"} until the ${windowStatus.nextWindow.name.toLowerCase()}. Accepted deals become pre-agreements.`}</p>
        </div>
        <div class="window-stats">
          ${metric("Pre-Agreed", agreements.length, "Pending registrations")}
          ${metric("Deadline", windowStatus.isDeadlineDay ? "Yes" : "No", windowStatus.isOpen ? "Window status" : "Next window")}
        </div>
        ${deadline.active ? `
          <div class="deadline-strip">
            <span class="badge amber">Deadline Day</span>
            <strong>${deadline.pendingOffers} offers | ${deadline.negotiations} negotiations</strong>
            <small>AI activity is elevated until the window closes.</small>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderTransferNews(news) {
    const visible = news.slice(0, 6);
    return `
      <div class="panel transfer-news-panel">
        <div class="ratings-heading">
          <h2 class="panel-title">Transfer News</h2>
          <span class="pill ${visible.length ? "blue" : "amber"}">${visible.length ? `${visible.length} latest` : "Quiet market"}</span>
        </div>
        ${visible.length ? `
          <div class="transfer-news-grid">
            ${visible.map((item) => {
              const player = item.playerId ? Engine.getPlayer(state, item.playerId) : null;
              const meta = [
                item.date ? Engine.formatGameDate(item.date) : "",
                item.fee ? Engine.formatMoney(item.fee) : item.type === "free-agent" ? "Free" : "",
                player ? player.position : ""
              ].filter(Boolean).join(" | ");
              return `
                <article class="transfer-news-item ${item.priority === "major" || item.priority === "rival" ? "major" : ""}">
                  <div>
                    <span class="badge ${item.tone || "blue"}">${transferNewsLabel(item.type)}</span>
                    <small>${escapeHtml(meta)}</small>
                  </div>
                  <strong>${escapeHtml(item.title || "Market update")}</strong>
                  <p>${escapeHtml(item.body || "")}</p>
                </article>
              `;
            }).join("")}
          </div>
        ` : `<div class="empty-state">No market stories yet.</div>`}
      </div>
    `;
  }

  function transferNewsLabel(type) {
    const labels = {
      transfer: "Deal",
      loan: "Loan",
      "free-agent": "Free Agent",
      rumor: "Rumor",
      "loan-rumor": "Loan Rumor",
      bid: "Bid",
      "failed-bid": "Failed Bid",
      deadline: "Deadline"
    };
    return labels[type] || "News";
  }

  function renderRecruitmentCentre(needReport, recommendations, shortlist) {
    const primary = needReport.primary;
    const topTarget = recommendations[0];
    const affordable = recommendations.filter((item) => item.recruitment.affordability.score >= 58).length;
    return `
      <div class="grid four">
        ${metric("Top Need", primary ? primary.position : "-", primary ? `${primary.status} | ${primary.reasons[0]}` : "Squad covered")}
        ${metric("Shortlist", shortlist.length, "Tracked targets")}
        ${metric("Top Target", topTarget ? topTarget.recruitment.score : "-", topTarget ? displayPlayerName(topTarget.player) : "No targets")}
        ${metric("Affordable Fits", affordable, "Recommended targets")}
      </div>
      <div class="recruitment-layout">
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Squad Needs</h2>
            <span class="pill ${primary ? primary.tone : "green"}">${primary ? primary.status : "Covered"}</span>
          </div>
          <div class="need-grid">
            ${needReport.needs.slice(0, 6).map(renderNeedCard).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Recruitment Fits</h2>
            <span class="pill blue">${recommendations.length} targets</span>
          </div>
          ${recommendations.length ? `<div class="target-stack">${recommendations.slice(0, 5).map((item) => renderTargetCard(item)).join("")}</div>` : `<div class="empty-state">Refresh the market or scout players to build recommendations.</div>`}
        </div>
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Shortlist</h2>
            <span class="pill ${shortlist.length ? "green" : "amber"}">${shortlist.length}/40</span>
          </div>
          ${shortlist.length ? `<div class="target-stack">${shortlist.slice(0, 5).map((player) => renderShortlistCard(player)).join("")}</div>` : `<div class="empty-state">Shortlisted players will stay here even when the market refreshes.</div>`}
        </div>
      </div>
    `;
  }

  function renderNeedCard(need) {
    return `
      <div class="need-card">
        <div>
          <strong>${positionBadge(need.position)}</strong>
          <span class="badge ${need.tone}">${need.status}</span>
        </div>
        ${bar(need.score, need.score >= 70 ? "red" : need.score >= 46 ? "amber" : need.score >= 24 ? "blue" : "green")}
        <small>${need.available}/${need.desiredDepth} available | best ${need.bestScore}</small>
        <em>${escapeHtml(need.reasons.slice(0, 2).join(" | "))}</em>
      </div>
    `;
  }

  function renderTargetCard(item) {
    const profile = Engine.recruitmentProfile(state, item.player.id);
    return `
      <div class="target-card">
        <span>
          ${playerNameButton(item.player, "name-link target-name")}
          <small>${positionBadge(item.player.position)} ${escapeHtml(clubName(item.player.clubId))} | ${item.player.age} yrs</small>
        </span>
        <em class="badge ${item.recruitment.score >= 75 ? "green" : item.recruitment.score >= 55 ? "blue" : "amber"}">${item.recruitment.score}</em>
        <small>${profile.pros[0]} | ${item.recruitment.affordability.label}</small>
        <div class="table-actions">
          <button class="btn-compact" data-action="scout-player" data-player-id="${item.player.id}">Scout</button>
          <button class="btn-compact" data-action="shortlist-player" data-player-id="${item.player.id}">${Engine.isShortlisted(state, item.player.id) ? "Listed" : "Shortlist"}</button>
          <button class="btn-compact" data-action="open-offer" data-player-id="${item.player.id}">${item.player.clubId ? "Offer" : "Sign"}</button>
        </div>
      </div>
    `;
  }

  function renderShortlistCard(player) {
    const profile = Engine.recruitmentProfile(state, player.id);
    const score = profile && profile.recruitment ? profile.recruitment.score : 0;
    return `
      <div class="target-card">
        <span>
          ${playerNameButton(player, "name-link target-name")}
          <small>${positionBadge(player.position)} ${escapeHtml(clubName(player.clubId))} | ${Engine.getScoutView(state, player.id).confidence}% scouted</small>
        </span>
        <em class="badge ${score >= 75 ? "green" : score >= 55 ? "blue" : "amber"}">${score}</em>
        <small>${profile ? profile.pros[0] : "Shortlisted"} | ${profile ? profile.recruitment.affordability.label : ""}</small>
        <div class="table-actions">
          <button class="btn-compact" data-action="assign-scout" data-player-id="${player.id}">Assign</button>
          <button class="btn-compact" data-action="remove-shortlist" data-player-id="${player.id}">Remove</button>
          <button class="btn-compact" data-action="open-offer" data-player-id="${player.id}">${player.clubId ? "Offer" : "Sign"}</button>
        </div>
      </div>
    `;
  }

  function renderActionQueue() {
    const squad = Engine.clubPlayers(state, state.activeClubId);
    const injured = squad.filter((player) => Engine.isInjured(state, player));
    const suspended = squad.filter((player) => Engine.isSuspended(state, player));
    const expiring = squad.filter((player) => player.contractYears <= 1);
    const tired = squad.filter((player) => player.fitness < 55 && !Engine.isUnavailable(state, player));
    const offers = state.transfers.offers.filter((offer) => offer.status === "pending");
    const next = Engine.getNextFixture(state, state.activeClubId);
    const board = Engine.boardReport(state);
    const weakestObjective = board.objectives.slice().sort((a, b) => a.progress - b.progress)[0];
    const matchToday = next && state.calendar && Engine.daysBetween(state.calendar.currentDate, next.date) <= 0;
    const items = [
      ...(matchToday ? [["Matchday", nextFixtureLabel(next), "green"]] : []),
      ...(board.confidence < 58 && weakestObjective ? [["Board", `${board.status.label}: ${weakestObjective.label}`, board.confidence < 40 ? "red" : "amber"]] : []),
      ...injured.slice(0, 3).map((player) => ["Injury", `${displayPlayerName(player)}: ${Engine.availabilityLabel(state, player)}`, "red"]),
      ...suspended.slice(0, 2).map((player) => ["Suspension", `${displayPlayerName(player)}: ${Engine.playerAvailabilityStatus(state, player).detail}`, "red"]),
      ...expiring.slice(0, 3).map((player) => ["Contract", `${displayPlayerName(player)}: ${player.contractYears} season${player.contractYears === 1 ? "" : "s"} left`, "amber"]),
      ...tired.slice(0, 3).map((player) => ["Fitness", `${displayPlayerName(player)}: ${player.fitness}% fitness`, "amber"]),
      ...offers.slice(0, 3).map((offer) => {
        const player = Engine.getPlayer(state, offer.playerId);
        return ["Offer", `${player ? displayPlayerName(player) : "Player"} bid from ${clubName(offer.fromClubId)}`, "blue"];
      })
    ].slice(0, 6);

    if (!items.length) return "";
    return `
      <div class="panel section-gap">
        <h2 class="panel-title">Action Queue</h2>
        <div class="action-grid">
          ${items.map(([label, text, tone]) => `
            <div class="message ${tone === "red" ? "bad" : tone === "amber" ? "warn" : tone === "green" ? "good" : ""}">
              <strong>${escapeHtml(label)}</strong><br>${escapeHtml(text)}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderScouting() {
    const network = Engine.scoutingNetworkReport(state);
    const reports = Object.values(state.scouting.reports)
      .map((report) => ({ report, player: Engine.getPlayer(state, report.playerId) }))
      .filter((item) => item.player)
      .sort((a, b) => b.report.confidence - a.report.confidence);
    const recommendations = Engine.recruitmentRecommendations(state, 10).map((item) => item.player);

    return `
      <div class="grid four">
        ${metric("Network Level", network.level, "Regional coverage")}
        ${metric("Active Briefs", `${network.activeAssignments.length}/${network.assignmentSlots}`, "Player and region assignments")}
        ${metric("Discoveries", network.discoveryCount, "Generated targets")}
        ${metric("Reports", reports.length, "Known target files")}
      </div>

      <div class="panel section-gap scouting-network-panel">
        <div class="ratings-heading">
          <h2 class="panel-title">Regional Network</h2>
          <div class="toolbar compact-toolbar">
            <select data-ui="regionalFocus">
              ${Engine.scoutingFocusOptions().map((focus) => `<option value="${focus.key}" ${ui.regionalFocus === focus.key ? "selected" : ""}>${escapeHtml(focus.label)}</option>`).join("")}
            </select>
          </div>
        </div>
        ${renderScoutingRegions(network)}
      </div>

      <div class="grid three section-gap">
        <div class="panel">
          <h2 class="panel-title">Assignments</h2>
          ${renderScoutAssignments(state.scouting.assignments || [])}
        </div>
        <div class="panel">
          <h2 class="panel-title">Discoveries</h2>
          ${renderDiscoveryTable(network.discoveries)}
        </div>
        <div class="panel">
          <h2 class="panel-title">Reports</h2>
          ${reports.length ? renderReportsTable(reports) : `<div class="empty-state">No reports yet.</div>`}
        </div>
      </div>

      <div class="panel section-gap">
        <h2 class="panel-title">Recommended Targets</h2>
        ${renderRecommendationTable(recommendations)}
      </div>
    `;
  }

  function renderScoutingRegions(network) {
    return `
      <div class="region-grid">
        ${network.regions.map((region) => `
          <div class="region-card ${region.active ? "active" : ""}">
            <div>
              <strong>${escapeHtml(region.label)}</strong>
              <span class="badge ${region.active ? "blue" : region.discoveries.length ? "green" : ""}">${region.active ? `${Math.ceil(region.active.daysRemaining || 0)} days` : `${region.discoveries.length} finds`}</span>
            </div>
            <p>${escapeHtml(region.description)}</p>
            ${region.active ? `
              ${bar(region.active.progress || 0, "blue")}
              <small>${escapeHtml(Engine.scoutingFocusLabel(region.active.focus))} | ${region.active.discoveries.length} discovered</small>
            ` : `
              <small>${region.lastDiscovery ? `Latest: ${escapeHtml(region.lastDiscovery.player.name)}` : "No active brief"}</small>
            `}
            <button class="btn-compact" data-action="assign-region" data-region-id="${region.key}" ${region.active ? "disabled" : ""}>Scout Region</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderDiscoveryTable(items) {
    if (!items.length) return `<div class="empty-state">Regional assignments will surface unknown targets here.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Region</th><th>Fit</th><th>Scout</th><th></th></tr></thead>
          <tbody>
            ${items.slice(0, 8).map(({ discovery, player, report }) => {
              const scout = Engine.getScoutView(state, player.id);
              const tone = discovery.score >= 78 ? "green" : discovery.score >= 58 ? "blue" : discovery.score >= 42 ? "amber" : "red";
              return `
                <tr>
                  <td>${playerNameButton(player)}<div class="small-muted">${positionBadge(player.position)} ${player.age} yrs | ${escapeHtml(player.nationality)}</div></td>
                  <td>${escapeHtml(Engine.scoutingRegionLabel(discovery.regionId))}</td>
                  <td><span class="badge ${tone}">${discovery.score}</span></td>
                  <td>${scout ? `${scout.confidence}%` : `${report ? report.confidence : 0}%`}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-compact" data-action="scout-player" data-player-id="${player.id}">Scout</button>
                      <button class="btn-compact" data-action="${Engine.isShortlisted(state, player.id) ? "remove-shortlist" : "shortlist-player"}" data-player-id="${player.id}">${Engine.isShortlisted(state, player.id) ? "Unlist" : "Shortlist"}</button>
                      <button class="btn-compact" data-action="open-offer" data-player-id="${player.id}">Sign</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStats() {
    const leaders = Engine.calculateLeaders(state);
    const club = activeClub();
    const squad = Engine.clubPlayers(state, club.id);
    const topClub = {
      goals: squad.slice().sort((a, b) => b.seasonStats.goals - a.seasonStats.goals).slice(0, 6),
      assists: squad.slice().sort((a, b) => b.seasonStats.assists - a.seasonStats.assists).slice(0, 6),
      appearances: squad.slice().sort((a, b) => b.seasonStats.apps - a.seasonStats.apps).slice(0, 6)
    };

    return `
      <div class="grid four">
        ${leaderPanel("Goals", leaders.goals, "goals")}
        ${leaderPanel("Assists", leaders.assists, "assists")}
        ${leaderPanel("Clean Sheets", leaders.cleanSheets, "cleanSheets")}
        ${leaderPanel("Average Rating", leaders.averageRating, "rating")}
      </div>
      <div class="grid three" style="margin-top:14px">
        ${leaderPanel(`${escapeHtml(club.name)} Goals`, topClub.goals, "goals")}
        ${leaderPanel(`${escapeHtml(club.name)} Assists`, topClub.assists, "assists")}
        ${leaderPanel(`${escapeHtml(club.name)} Apps`, topClub.appearances, "apps")}
      </div>
    `;
  }

  function renderHistory() {
    const records = state.league.records;
    return `
      <div class="grid three">
        ${metric("Seasons Stored", state.league.history.length, "Completed campaigns")}
        ${metric("Manager Trophies", state.manager.trophies, "League titles")}
        ${metric("Best Points", records.highestPoints ? records.highestPoints.points : "-", records.highestPoints ? records.highestPoints.clubName : "No record")}
      </div>
      <div class="grid two" style="margin-top:14px">
        <div class="panel">
          <h2 class="panel-title">Season Archive</h2>
          ${state.league.history.length ? state.league.history.map(renderSeasonArchive).join("") : `<div class="empty-state">No completed seasons yet.</div>`}
        </div>
        <div class="panel">
          <h2 class="panel-title">Records</h2>
          <div class="timeline">
            ${records.highestPoints ? recordItem("Highest Points", `${records.highestPoints.clubName} | ${records.highestPoints.points} pts | Season ${records.highestPoints.season}`) : ""}
            ${records.biggestWin ? recordItem("Biggest Win", `${clubName(records.biggestWin.homeClubId)} ${records.biggestWin.score} ${clubName(records.biggestWin.awayClubId)} | Season ${records.biggestWin.season}`) : ""}
            ${records.recordFee ? recordItem("Record Fee", `${records.recordFee.playerName} | ${Engine.formatMoney(records.recordFee.fee)} | Season ${records.recordFee.season}`) : ""}
            ${!records.highestPoints && !records.biggestWin && !records.recordFee ? `<div class="empty-state">Records will appear as the save develops.</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  function renderFinances() {
    const club = activeClub();
    const wageSpend = Engine.weeklyWageSpend(state, club.id);
    const wagePressure = Math.round((wageSpend / club.wageBudget) * 100);
    return `
      <div class="grid four">
        ${metric("Balance", Engine.formatMoney(club.balance), "Club cash")}
        ${metric("Transfer Budget", Engine.formatMoney(club.transferBudget), "Available")}
        ${metric("Wage Budget", Engine.formatMoney(club.wageBudget), "Weekly")}
        ${metric("Wage Pressure", `${wagePressure}%`, Engine.formatMoney(wageSpend))}
      </div>
      <div class="grid two" style="margin-top:14px">
        <div class="panel">
          <h2 class="panel-title">Season Finance</h2>
          <div class="metric-grid">
            ${metric("Prize Money", Engine.formatMoney(club.seasonFinance.prizeMoney), "Last completed season")}
            ${metric("Transfer Income", Engine.formatMoney(club.seasonFinance.transferIncome), "This season")}
            ${metric("Transfer Spend", Engine.formatMoney(club.seasonFinance.transferSpend), "This season")}
            ${metric("Wage Spend", Engine.formatMoney(wageSpend), "Weekly")}
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">Highest Wages</h2>
          ${renderWageTable(Engine.clubPlayers(state, club.id).sort((a, b) => b.wage - a.wage).slice(0, 10))}
        </div>
      </div>
    `;
  }

  function renderManager() {
    const total = state.manager.wins + state.manager.draws + state.manager.losses;
    const board = Engine.boardReport(state);
    const cup = Engine.domesticCupReport(state);
    const europe = Engine.europeanReport(state);
    return `
      <div class="grid four">
        ${metric("Reputation", state.manager.reputation, "Manager profile")}
        ${metric("Trophies", state.manager.trophies, "League titles")}
        ${metric("Board Confidence", `${board.confidence}/100`, board.status.label)}
        ${metric("Win Rate", managerWinRate(), `${state.manager.goalsFor}:${state.manager.goalsAgainst} goals | ${total} matches`)}
      </div>
      <div class="grid three" style="margin-top:14px">
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Board Objectives</h2>
            <span class="pill ${board.status.tone}">${escapeHtml(board.status.label)}</span>
          </div>
          ${renderBoardObjectives(board)}
        </div>
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">${escapeHtml(cup.name)}</h2>
            <span class="pill ${cup.activeEliminated ? "amber" : cup.championClubId === state.activeClubId ? "green" : "blue"}">${cup.status === "complete" ? "Complete" : "Active"}</span>
          </div>
          ${renderCupReport(cup)}
        </div>
        <div class="panel">
          <div class="ratings-heading">
            <h2 class="panel-title">${escapeHtml(europe.name)}</h2>
            <span class="pill ${europe.activeEliminated ? "amber" : europe.championClubId === state.activeClubId ? "green" : "blue"}">${europe.activeQualified ? europe.activeStage : "Not Qualified"}</span>
          </div>
          ${renderEuropeanReport(europe)}
        </div>
      </div>
      <div class="panel" style="margin-top:14px">
        <h2 class="panel-title">Career History</h2>
        ${state.manager.careerHistory.length ? renderManagerHistory() : `<div class="empty-state">Finish a season to create the first manager record.</div>`}
      </div>
    `;
  }

  function renderBoardObjectives(report) {
    return `
      <div class="objective-list">
        ${report.objectives.map((objective) => `
          <div class="objective-row">
            <div>
              <strong>${escapeHtml(objective.label)}</strong>
              <span>${escapeHtml(objective.detail || objective.description)}</span>
            </div>
            <div class="objective-progress">
              <span class="badge ${objective.tone}">${objective.progress}</span>
              ${bar(objective.progress, objective.tone)}
            </div>
          </div>
        `).join("")}
      </div>
      ${report.reviews.length ? `
        <div class="timeline compact-timeline" style="margin-top:12px">
          ${report.reviews.slice(0, 3).map((review) => `
            <div class="timeline-item">
              <strong>${review.date ? escapeHtml(Engine.formatGameDate(review.date)) : `S${review.season}`}</strong>
              <span>${escapeHtml(review.status)} | ${review.confidence}/100${review.weakest ? `<br><span class="small-muted">Focus: ${escapeHtml(review.weakest)}</span>` : ""}</span>
            </div>
          `).join("")}
        </div>
      ` : ""}
    `;
  }

  function renderCupReport(cup) {
    const round = visibleCompetitionRound(cup);
    return `
      <div class="metric-grid">
        ${metric("Status", cup.activeEliminated ? "Eliminated" : cup.championClubId === state.activeClubId ? "Winners" : cup.status === "complete" ? "Complete" : "Alive", cup.championName ? `${cup.championName} holders` : cup.bestRoundLabel)}
        ${metric("Next Cup Tie", cup.nextFixture ? nextFixtureLabel(cup.nextFixture) : "-", cup.nextFixture ? Engine.formatGameDate(cup.nextFixture.date) : "No active tie")}
      </div>
      <div class="timeline compact-timeline" style="margin-top:12px">
        ${(cup.rounds || []).filter((item) => item.fixtures.length).map((item) => `
          <div class="timeline-item">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(Engine.formatGameDate(item.date))}<br><span class="small-muted">${item.fixtures.filter((fixture) => fixture.played).length}/${item.fixtures.length} played</span></span>
          </div>
        `).join("") || `<div class="empty-state">Cup draw pending.</div>`}
      </div>
      ${round && round.fixtures.length ? `<div class="match-strip" style="margin-top:12px">${round.fixtures.slice(0, 4).map(renderFixture).join("")}</div>` : ""}
    `;
  }

  function renderEuropeanReport(europe) {
    const round = visibleCompetitionRound(europe);
    return `
      <div class="metric-grid">
        ${metric("Status", europe.activeQualified ? europe.activeStage : "Not Qualified", europe.championName ? `${europe.championName} holders` : `${europe.teams.length} clubs`)}
        ${metric("Next European Tie", europe.nextFixture ? nextFixtureLabel(europe.nextFixture) : "-", europe.nextFixture ? Engine.formatGameDate(europe.nextFixture.date) : europe.activeEliminated ? "Campaign over" : "Awaiting draw")}
        ${metric("Group", europe.activeGroup || "-", europe.activeQualified ? `${europe.progressScore}/100 campaign score` : "Qualify through league or cup")}
      </div>
      ${europe.activeGroupTable && europe.activeGroupTable.length ? `
        <div style="margin-top:12px">
          ${renderEuropeanGroupTable(europe.activeGroupTable)}
        </div>
      ` : ""}
      <div class="timeline compact-timeline" style="margin-top:12px">
        ${(europe.rounds || []).filter((item) => item.fixtures.length).map((item) => `
          <div class="timeline-item">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(Engine.formatGameDate(item.date))}<br><span class="small-muted">${item.fixtures.filter((fixture) => fixture.played).length}/${item.fixtures.length} played</span></span>
          </div>
        `).join("") || `<div class="empty-state">European draw pending.</div>`}
      </div>
      ${round && round.fixtures.length ? `<div class="match-strip" style="margin-top:12px">${round.fixtures.slice(0, 4).map(renderFixture).join("")}</div>` : ""}
    `;
  }

  function renderPlayerToolbar(scope) {
    const search = scope === "market" ? ui.marketSearch : ui.squadSearch;
    const position = scope === "market" ? ui.marketPosition : ui.squadPosition;
    const sort = scope === "market" ? ui.marketSort : ui.squadSort;
    return `
      <div class="toolbar">
        <input class="grow" placeholder="Search players" value="${escapeAttr(search)}" data-ui="${scope}Search">
        <select data-ui="${scope}Position">
          <option value="all" ${position === "all" ? "selected" : ""}>All positions</option>
          ${Data.POSITIONS.map((pos) => `<option value="${pos}" ${position === pos ? "selected" : ""}>${pos}</option>`).join("")}
        </select>
        ${scope === "squad" ? `
          <select data-ui="squadAvailability">
            ${[
              ["all", "All availability"],
              ["available", "Available"],
              ["injured", "Injured"],
              ["suspended", "Suspended"],
              ["lowFitness", "Low fitness"],
              ["highRisk", "High risk"],
              ["prospects", "Prospects"]
            ].map(([value, label]) => `<option value="${value}" ${ui.squadAvailability === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        ` : ""}
        ${scope === "market" ? `
          <select data-ui="marketView">
            ${[
              ["all", "All targets"],
              ["recommended", "Recommended"],
              ["shortlist", "Shortlist"],
              ["affordable", "Affordable"],
              ["freeAgents", "Free agents"],
              ["prospects", "Prospects"],
              ["scouted", "Scouted"]
            ].map(([value, label]) => `<option value="${value}" ${ui.marketView === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        ` : ""}
        <select data-ui="${scope}Sort">
          ${[
            ...(scope === "market" ? [["recruitmentScore", "Recruitment Score"], ["confidence", "Scout Confidence"]] : []),
            ["currentAbility", "Current Ability"],
            ["potential", "Potential"],
            ...(scope === "squad" ? [["fitness", "Fitness"], ["sharpness", "Sharpness"], ["morale", "Morale"]] : []),
            ["age", "Age"],
            ["value", "Value"],
            ["wage", "Wage"],
            ["position", "Position"]
          ].map(([value, label]) => `<option value="${value}" ${sort === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </div>
    `;
  }

  function renderPlayerTable(players, context) {
    if (!players.length) return `<div class="empty-state">No players match the current filters.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th><th>Pos</th><th>Age</th><th>Status</th><th>Role</th><th>Happy</th><th>CA</th><th>PA</th><th>Dev</th><th>Value</th><th>Wage</th><th>Contract</th><th>Fitness</th><th>Sharp</th><th>Risk</th><th>Form</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${players.map((player) => {
              const report = context === "squad" ? Engine.playerDevelopmentReport(state, player.id) : null;
              const risk = report ? report.risk : Engine.injuryRiskLevel(state, player);
              const happiness = report ? report.happiness : Engine.playerHappinessReport(state, player.id);
              return `
                <tr class="${ui.selectedPlayerId === player.id ? "highlight" : ""}">
                  <td>${playerNameButton(player)}</td>
                  <td>${positionBadge(player.position)}</td>
                  <td>${player.age}</td>
                  <td>${statusBadge(player)}</td>
                  <td><span class="badge ${happiness.roleTone}">${escapeHtml(happiness.roleLabel)}</span></td>
                  <td><span class="badge ${happiness.tone}">${happiness.score}</span></td>
                  <td>${player.currentAbility}</td>
                  <td>${player.potential}</td>
                  <td>${context === "squad" ? `<span class="badge ${report.delta > 0 ? "green" : report.delta < 0 ? "amber" : "blue"}">${developmentDeltaLabel(report.delta)}</span>` : "-"}</td>
                  <td>${Engine.formatMoney(player.value)}</td>
                  <td>${Engine.formatMoney(player.wage)}</td>
                  <td>${player.contractYears <= 1 ? `<span class="badge amber">${player.contractYears} yr</span>` : `${player.contractYears} yrs`}</td>
                  <td>${bar(player.fitness, player.fitness > 70 ? "green" : player.fitness > 45 ? "amber" : "red")}</td>
                  <td>${bar(player.sharpness, player.sharpness > 70 ? "green" : player.sharpness > 45 ? "amber" : "red")}</td>
                  <td><span class="badge ${risk.tone}">${escapeHtml(risk.label)}</span></td>
                  <td>${formRatings(player.form)}</td>
                  <td class="right">
                    <div class="table-actions">
                      ${context === "squad" && player.contractYears <= 1 ? `<button class="btn-compact" data-action="renew-contract" data-player-id="${player.id}">Renew</button>` : ""}
                      ${context === "squad" ? `<button class="btn-compact" data-action="rest-player" data-player-id="${player.id}">Rest</button>` : ""}
                      <button class="btn-compact" data-action="view-player" data-player-id="${player.id}">${context === "squad" ? "View" : "Profile"}</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTransferHistory(history) {
    if (!history.length) return `<div class="empty-state">No transfer history yet.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Season</th><th>Type</th><th>Player</th><th>From</th><th>To</th><th>Fee</th><th>Wage</th></tr></thead>
          <tbody>
            ${history.slice(0, 14).map((item) => `
              <tr>
                <td>S${item.season} R${item.round}</td>
                <td>${transferTypeLabel(item.type)}</td>
                <td>${Engine.getPlayer(state, item.playerId) ? playerNameButton(Engine.getPlayer(state, item.playerId)) : `<span class="player-name">${escapeHtml(item.playerName)}</span>`}</td>
                <td>${escapeHtml(clubName(item.fromClubId))}</td>
                <td>${escapeHtml(clubName(item.toClubId))}</td>
                <td>${item.fee ? Engine.formatMoney(item.fee) : "-"}</td>
                <td>${item.wage ? Engine.formatMoney(item.wage) : "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMarketTable(players) {
    if (!players.length) return `<div class="empty-state">No market targets match the filters.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th><th>Club</th><th>Pos</th><th>Age</th><th>Rec</th><th>Need</th><th>CA</th><th>PA</th><th>Scout</th><th>Afford</th><th>Interest</th><th>Value</th><th>Wage</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${players.map((player) => {
              const scout = Engine.getScoutView(state, player.id);
              const profile = Engine.recruitmentProfile(state, player.id);
              const recruitment = profile ? profile.recruitment : Engine.recruitmentTargetScore(state, player.id);
              const negotiation = Engine.negotiationProfile(state, player.id);
              const isFreeAgent = !player.clubId;
              const recTone = recruitment.score >= 78 ? "green" : recruitment.score >= 58 ? "blue" : recruitment.score >= 42 ? "amber" : "red";
              return `
                <tr>
                  <td>${playerNameButton(player)}</td>
                  <td>${isFreeAgent ? `<span class="badge blue">Free Agent</span>` : escapeHtml(clubName(player.clubId))}</td>
                  <td>${positionBadge(player.position)}</td>
                  <td>${player.age}</td>
                  <td><span class="badge ${recTone}">${recruitment.score} | ${escapeHtml(recruitment.priority)}</span></td>
                  <td>${recruitment.need ? `<span class="badge ${recruitment.need.tone}">${recruitment.need.position}</span>` : "-"}</td>
                  <td>${scout.currentStars}</td>
                  <td>${scout.potentialStars}</td>
                  <td>${scout.confidence}%</td>
                  <td><span class="badge ${recruitment.affordability.tone}">${recruitment.affordability.label}</span></td>
                  <td><span class="badge ${negotiation.interest.tone}">${negotiation.interest.label}</span></td>
                  <td>${isFreeAgent ? "Free" : Engine.formatMoney(player.value)}</td>
                  <td>${Engine.formatMoney(player.wage)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-compact" data-action="scout-player" data-player-id="${player.id}">Scout</button>
                      <button class="btn-compact" data-action="assign-scout" data-player-id="${player.id}">Assign</button>
                      <button class="btn-compact" data-action="${Engine.isShortlisted(state, player.id) ? "remove-shortlist" : "shortlist-player"}" data-player-id="${player.id}">${Engine.isShortlisted(state, player.id) ? "Unlist" : "Shortlist"}</button>
                      <button class="btn-compact" data-action="open-offer" data-player-id="${player.id}">${isFreeAgent ? "Sign" : "Offer"}</button>
                      ${isFreeAgent ? "" : `<button class="btn-compact" data-action="loan-player" data-player-id="${player.id}">Loan</button>`}
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPlayerDetail(player) {
    const stats = player.seasonStats;
    const history = player.history.slice(0, 6);
    const development = player.development.slice(-5);
    const report = Engine.playerDevelopmentReport(state, player.id);
    const availability = report.availability;
    const risk = report.risk;
    const happiness = report.happiness;
    const renewal = Engine.contractRenewalProfile(state, player.id);
    const fc26 = Engine.fc26StyleStats(player);
    const pathway = Engine.pathwayPromiseReport(state, player.id);
    const loanReport = Engine.playerLoanReport(state, player.id);
    const roleDevelopment = Engine.roleDevelopmentReport(state, player.id);
    const isOwnPlayer = player.clubId === state.activeClubId;
    return `
      <div class="player-detail">
        <div>
          <div class="player-profile-head">
            <div>
              <h2 class="panel-title">${escapeHtml(player.name)}</h2>
              <div class="small-muted">${escapeHtml(displayPlayerName(player))} | ${escapeHtml(clubName(player.clubId))} | ${escapeHtml(player.nationality)} | ${escapeHtml(player.foot)} foot | ${player.height} cm</div>
            </div>
            <span class="badge ${availability.tone}">${escapeHtml(availability.label)}</span>
          </div>
          <div class="metric-grid">
            ${metric("Position", player.position, player.secondaryPositions.join(", ") || "No secondary")}
            ${metric("Age", player.age, `${report.stage} | ${player.weight} kg`)}
            ${metric("Ability", `${player.currentAbility} / ${player.potential}`, "Current / Potential")}
            ${metric("Development", developmentDeltaLabel(report.delta), `${report.growthRoom} growth room`)}
            ${metric("Role", happiness.roleLabel, happiness.playingTime.label)}
            ${metric("Happiness", `${happiness.score}/100`, happiness.reasons[0])}
            ${metric("Fitness", `${player.fitness}%`, `${player.sharpness}% sharpness`)}
            ${metric("Risk", risk.label, risk.detail)}
          </div>
          ${fc26 ? renderFc26Stats(fc26) : ""}
          ${pathway || loanReport ? `
            <div class="profile-card-grid pathway-profile-grid">
              ${pathway ? renderPathwayProfileCard(pathway) : ""}
              ${loanReport ? renderLoanProfileCard(loanReport) : ""}
            </div>
          ` : ""}
          ${roleDevelopment && (roleDevelopment.current || roleDevelopment.roles.length || roleDevelopment.instructions.length) ? `
            <div class="profile-card-grid pathway-profile-grid">
              ${renderRoleDevelopmentProfileCard(roleDevelopment)}
            </div>
          ` : ""}
          ${isOwnPlayer ? `<div class="player-management-grid">
            <div class="field">
              <label for="squad-role">Squad Role</label>
              <select id="squad-role" data-action="set-squad-role" data-player-id="${player.id}">
                ${Engine.squadRoleOptions().map((role) => `<option value="${role.key}" ${player.squadRole === role.key ? "selected" : ""}>${escapeHtml(role.label)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="training-focus">Training Focus</label>
              <select id="training-focus" data-action="set-training-focus" data-player-id="${player.id}">
                ${Object.keys(Engine.TRAINING_FOCUS).map((focus) => `<option value="${focus}" ${player.trainingFocus === focus ? "selected" : ""}>${Engine.trainingFocusLabel(focus)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="individual-plan">Individual Plan</label>
              <select id="individual-plan" data-action="set-individual-plan" data-player-id="${player.id}">
                ${Object.keys(Engine.INDIVIDUAL_PLANS).map((plan) => `<option value="${plan}" ${player.individualPlan === plan ? "selected" : ""}>${Engine.individualPlanLabel(plan)}</option>`).join("")}
              </select>
            </div>
            <button class="btn-primary" data-action="rest-player" data-player-id="${player.id}">Rest / Rehab</button>
            ${renewal ? `<button class="btn-compact" data-action="renew-contract" data-player-id="${player.id}">Renew Contract</button>` : ""}
          </div>` : ""}
          <div class="progress-list player-stat-row">
            ${progressCard("Apps", stats.apps)}
            ${progressCard("Goals", stats.goals)}
            ${progressCard("Assists", stats.assists)}
          </div>
          <div class="profile-card-grid">
            <div class="profile-card">
              <strong>Happiness</strong>
              <span>${escapeHtml(happiness.label)} | ${escapeHtml(happiness.reasons[0])}</span>
              ${bar(happiness.score, happiness.score >= 74 ? "green" : happiness.score >= 56 ? "blue" : happiness.score >= 38 ? "amber" : "red")}
            </div>
            <div class="profile-card">
              <strong>Playing Time</strong>
              <span>${happiness.playingTime.starts}/${happiness.playingTime.matches} starts | ${happiness.playingTime.minutes} mins</span>
              ${bar(100 - happiness.playingTime.pressure, happiness.playingTime.pressure >= 54 ? "red" : happiness.playingTime.pressure >= 28 ? "amber" : "green")}
            </div>
            <div class="profile-card">
              <strong>Availability</strong>
              <span>${escapeHtml(availability.detail)}</span>
              ${bar(player.fitness, player.fitness > 70 ? "green" : player.fitness > 45 ? "amber" : "red")}
            </div>
            <div class="profile-card">
              <strong>Potential Progress</strong>
              <span>${report.progress}% of ceiling</span>
              ${bar(report.progress, report.progress > 86 ? "green" : report.progress > 68 ? "amber" : "red")}
            </div>
          </div>
          ${renewal ? renderContractProfile(renewal, player) : ""}
          ${player.source && player.source.provider ? renderSourceStats(player.source) : ""}
          <h3 class="panel-title" style="margin-top:14px">Development</h3>
          ${report.events.length ? `
            <div class="timeline">
              ${report.events.map((item) => `
                <div class="timeline-item">
                  <strong>${escapeHtml(Engine.formatGameDate(item.date))}</strong>
                  <span>${escapeHtml(attributeLabel(item.attribute))} ${item.before} -> ${item.after} | ${Engine.trainingFocusLabel(item.focus)}</span>
                </div>
              `).join("")}
            </div>
          ` : `
            <div class="timeline">
              ${development.map((item) => `
                <div class="timeline-item">
                  <strong>S${item.season}</strong>
                  <span>CA ${item.currentAbility} | PA ${item.potential} | Passing ${item.attributes.passing} | Finishing ${item.attributes.finishing}</span>
                </div>
              `).join("")}
            </div>
          `}
          <h3 class="panel-title" style="margin-top:14px">Career</h3>
          ${history.length ? `
            <div class="timeline">
              ${history.map((item) => `
                <div class="timeline-item">
                  <strong>S${item.season}</strong>
                  <span>${escapeHtml(item.clubName)} | ${item.apps} apps | ${item.goals} goals | ${item.assists} assists | ${item.averageRating || "-"} avg</span>
                </div>
              `).join("")}
            </div>
          ` : `<div class="empty-state">No completed season history.</div>`}
        </div>
        <div>
          <h3 class="panel-title">Role Fit</h3>
          <div class="role-fit-list">
            ${report.roleFits.map((item) => `
              <div class="role-fit-item">
                <span>${positionBadge(item.position)}${item.natural ? `<em>Natural</em>` : ""}</span>
                ${bar(item.score, item.score > 78 ? "green" : item.score > 62 ? "amber" : "red")}
                <strong>${item.score}</strong>
              </div>
            `).join("")}
          </div>
          <h3 class="panel-title" style="margin-top:14px">Top Attributes</h3>
          <div class="attribute-chip-list">
            ${report.topAttributes.map((item) => `<span class="attribute-chip"><strong>${item.value}</strong>${escapeHtml(item.label)}</span>`).join("")}
          </div>
          <h3 class="panel-title" style="margin-top:14px">Attributes</h3>
          <div class="attribute-grid">
            ${Data.ATTRIBUTES.map((attr) => `
              <div class="attribute">
                <span>${Data.ATTRIBUTE_LABELS[attr]}</span>
                ${bar(player.attributes[attr], player.attributes[attr] >= 75 ? "green" : player.attributes[attr] >= 58 ? "amber" : "red")}
                <strong>${player.attributes[attr]}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderFc26Stats(stats) {
    const items = [
      ["POT", stats.pot],
      ["PAC", stats.pac],
      ["SHO", stats.sho],
      ["PAS", stats.pas],
      ["DRI", stats.dri],
      ["DEF", stats.def],
      ["PHY", stats.phy]
    ];
    return `
      <div class="fc26-card">
        <div>
          <span>Rating Profile</span>
          <strong>${stats.ovr}</strong>
          <small>${escapeHtml(stats.matched ? "Matched rating" : "Generated projection")}</small>
        </div>
        <div class="fc26-stat-grid">
          ${items.map(([label, value]) => `
            <span><strong>${Number.isFinite(value) ? value : "-"}</strong>${label}</span>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderPathwayProfileCard(report) {
    return `
      <div class="profile-card pathway-profile-card">
        <div class="profile-card-headline">
          <strong>Pathway Promise</strong>
          <span class="badge ${report.tone}">${report.progress}% ${escapeHtml(report.label)}</span>
        </div>
        <span>${escapeHtml(report.detail)} | due ${escapeHtml(Engine.formatGameDate(report.dueDate))}</span>
        ${bar(report.progress, report.tone)}
        <div class="loan-fit-metrics">
          <span>Minutes ${report.minutesProgress}%</span>
          <span>Training ${report.trainingProgress}%</span>
          <span>Role ${report.tacticalProgress}%</span>
        </div>
      </div>
    `;
  }

  function renderLoanProfileCard(report) {
    const loan = report.loan;
    return `
      <div class="profile-card pathway-profile-card">
        <div class="profile-card-headline">
          <strong>Loan Development</strong>
          <span class="badge ${loan.status === "complete" ? "green" : "blue"}">${escapeHtml(loan.status === "complete" ? loan.outcome || "Complete" : "Active")}</span>
        </div>
        <span>${escapeHtml(loan.destinationName)} | ${loan.appearances || 0} apps | ${loan.minutes || 0} mins | ${loan.averageRating || "-"} avg</span>
        ${bar(report.progress, report.progress >= 76 ? "green" : report.progress >= 58 ? "blue" : "amber")}
        <div class="loan-fit-metrics">
          <span>Fit ${loan.fitScore}</span>
          <span>${escapeHtml(loan.roleLabel || "-")}</span>
          <span>${escapeHtml(loan.focusLabel || "-")}</span>
        </div>
      </div>
    `;
  }

  function renderRoleDevelopmentProfileCard(report) {
    const current = report.current;
    const bestRole = report.roles[0];
    const bestInstruction = report.instructions[0];
    return `
      <div class="profile-card pathway-profile-card role-development-card">
        <div class="profile-card-headline">
          <strong>Role Development</strong>
          ${current ? `<span class="badge ${current.roleFit >= 72 && current.instructionFit >= 72 ? "green" : current.roleFit >= 58 && current.instructionFit >= 58 ? "blue" : "amber"}">${round((current.roleMastery + current.instructionMastery) / 2, 0)} mastery</span>` : `<span class="badge blue">Tracked</span>`}
        </div>
        ${current ? `
          <span>${escapeHtml(current.roleLabel)} | ${escapeHtml(current.instructionLabel)}</span>
          ${bar((current.roleFit + current.instructionFit) / 2, current.roleFit >= 72 && current.instructionFit >= 72 ? "green" : current.roleFit >= 58 && current.instructionFit >= 58 ? "blue" : "amber")}
          <div class="loan-fit-metrics">
            <span>Role fit ${current.roleFit}</span>
            <span>Instruction fit ${current.instructionFit}</span>
            <span>${positionBadge(current.position)}</span>
          </div>
        ` : `
          <span>${bestRole ? `${escapeHtml(bestRole.label)} ${round(bestRole.mastery, 0)}` : "No active role yet"} | ${bestInstruction ? `${escapeHtml(bestInstruction.label)} ${round(bestInstruction.mastery, 0)}` : "Balanced"}</span>
        `}
        ${report.events.length ? `
          <div class="compact-timeline">
            ${report.events.slice(0, 3).map((item) => `
              <div class="timeline-item">
                <strong>${item.date ? escapeHtml(Engine.formatGameDate(item.date)) : "-"}</strong>
                <span>${escapeHtml(item.label)} ${round(item.mastery, 0)} mastery</span>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderContractProfile(profile, player) {
    return `
      <div class="contract-profile">
        <div class="ratings-heading">
          <h3 class="panel-title">Contract Mood</h3>
          <span class="badge ${profile.tone}">${escapeHtml(profile.label)}</span>
        </div>
        <div class="metric-grid">
          ${metric("Demand", Engine.formatMoney(profile.requestedWage), `${profile.years} year${profile.years === 1 ? "" : "s"}`)}
          ${metric("Current Wage", Engine.formatMoney(player.wage), `${player.contractYears} season${player.contractYears === 1 ? "" : "s"} left`)}
          ${metric("Interest", `${profile.interest}/100`, profile.happiness.reasons[0])}
          ${metric("Wage Room", Engine.formatMoney(profile.wageRoom), profile.warnings[0] || "No major blockers")}
        </div>
      </div>
    `;
  }

  function renderFixture(fixture) {
    const home = clubName(fixture.homeClubId);
    const away = clubName(fixture.awayClubId);
    const active = fixture.homeClubId === state.activeClubId || fixture.awayClubId === state.activeClubId;
    const liveFixture = ui.liveMatch && ui.liveMatch.id === fixture.id && ui.commentaryPlaying;
    let score = fixture.played ? `${fixture.homeGoals}-${fixture.awayGoals}` : "vs";
    if (liveFixture) {
      const commentary = (ui.liveMatch.commentary || []).slice(0, ui.commentaryCount);
      const minute = liveMatchMinute(ui.liveMatch, commentary);
      const visibleGoals = visibleMatchGoals(ui.liveMatch, commentary, minute);
      const liveScore = liveMatchScore(ui.liveMatch, visibleGoals);
      score = `${liveScore.home}-${liveScore.away}`;
    } else if (fixture.played && fixture.penalties) {
      score = `${score}p`;
    }
    const dateLabel = fixture.date ? `${fixture.competitionName ? `${fixture.competitionName} | ${fixture.roundName || ""} | ` : ""}${Engine.formatGameDate(fixture.date)}` : "";
    return `
      <div class="fixture ${active ? "highlight" : ""}">
        ${dateLabel ? `<span class="fixture-date">${escapeHtml(dateLabel)}</span>` : ""}
        <span class="home">${escapeHtml(home)}</span>
        <span class="score ${liveFixture ? "live" : ""}">${escapeHtml(score)}</span>
        <span class="away">${escapeHtml(away)}</span>
        ${fixture.winnerClubId ? `<span class="fixture-date">${escapeHtml(clubName(fixture.winnerClubId))} advanced</span>` : ""}
      </div>
    `;
  }

  function renderLiveMatchCentre(match, minute, visibleGoals) {
    const score = liveMatchScore(match, visibleGoals);
    const status = liveMatchStatus(match, minute);
    const homeActive = match.homeClubId === state.activeClubId;
    const awayActive = match.awayClubId === state.activeClubId;
    return `
      <div class="panel match-centre">
        <div class="match-centre-meta">
          <span class="pill blue">${escapeHtml(match.competitionName || state.league.name)}</span>
          <span class="small-muted">${escapeHtml(match.roundName || `Round ${match.round || "-"}`)}${match.date ? ` | ${escapeHtml(Engine.formatGameDate(match.date))}` : ""}</span>
          <span class="live-indicator ${ui.commentaryPlaying ? "is-live" : ""}">${escapeHtml(status.label)}</span>
        </div>
        <div class="match-centre-board">
          <div class="live-team home ${homeActive ? "active" : ""}">
            <div class="live-team-kicker">Home</div>
            <div class="live-team-name">${escapeHtml(clubName(match.homeClubId))}</div>
            ${renderScorerList(match, match.homeClubId, visibleGoals)}
          </div>
          <div class="live-score-card">
            <div class="live-clock">${escapeHtml(status.clock)}</div>
            <div class="live-scoreline">
              <strong>${score.home}</strong>
              <span>-</span>
              <strong>${score.away}</strong>
            </div>
            <div class="live-score-caption">${ui.commentaryPlaying ? "Live simulation" : "Full time"}</div>
          </div>
          <div class="live-team away ${awayActive ? "active" : ""}">
            <div class="live-team-kicker">Away</div>
            <div class="live-team-name">${escapeHtml(clubName(match.awayClubId))}</div>
            ${renderScorerList(match, match.awayClubId, visibleGoals)}
          </div>
        </div>
      </div>
    `;
  }

  function renderMatchdayManagement(match, minute, visibleGoals) {
    const side = activeSideForMatch(match);
    if (!side) return "";
    const isLive = ui.liveMatch && ui.liveMatch.id === match.id && ui.commentaryPlaying;
    const tactics = liveTacticsForMatch(match);
    const report = Engine.liveMatchAssistantReport(state, match, minute, visibleGoals, tactics);
    const review = !isLive ? Engine.postMatchTacticalReview(state, match) : null;
    return `
      <div class="matchday-management">
        <div class="panel touchline-panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Touchline Orders</h2>
            <span class="pill ${isLive ? "green" : "blue"}">${isLive ? "Live" : "Full Time"}</span>
          </div>
          <div class="touchline-controls">
            ${Data.TACTIC_GROUPS.map((group) => renderLiveTacticControl(group, tactics, !isLive)).join("")}
          </div>
          <div class="touchline-presets">
            ${renderTacticalPresetPanel(isLive ? "apply-live-preset" : "apply-tactical-preset")}
          </div>
        </div>
        <div class="panel assistant-panel">
          <div class="ratings-heading">
            <h2 class="panel-title">Assistant Report</h2>
            <span class="pill blue">${report ? report.assistantConfidence : "-"} confidence</span>
          </div>
          ${report ? renderAssistantAdvice(report, isLive) : `<div class="empty-state">Assistant report unavailable.</div>`}
        </div>
        <div class="panel sub-recommendation-panel">
          <h2 class="panel-title">Substitution Watch</h2>
          ${report ? renderSubstitutionRecommendations(report.substitutions) : `<div class="empty-state">No substitution read.</div>`}
        </div>
        <div class="panel touchline-log-panel">
          <h2 class="panel-title">${review ? "Tactical Review" : "Touchline Log"}</h2>
          ${review ? renderPostMatchTacticalReviewCard(review) : renderTouchlineLog()}
        </div>
      </div>
    `;
  }

  function renderLiveTacticControl(group, tactics, disabled) {
    const value = tactics[group.key] || Engine.DEFAULT_TACTICS[group.key];
    return `
      <label class="touchline-control">
        <span>${escapeHtml(group.label)}</span>
        <select data-action="set-live-tactic" data-tactic-key="${escapeAttr(group.key)}" ${disabled ? "disabled" : ""}>
          ${group.options.map((option) => `<option value="${escapeAttr(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderAssistantAdvice(report, isLive) {
    return `
      <div class="assistant-advice-list">
        ${report.advice.map((item) => `
          <div class="assistant-card ${item.tone}">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.body)}</span>
            </div>
            ${isLive && (item.key || item.presetKey) ? `
              <button class="btn-compact" data-action="apply-live-advice" data-tactic-key="${escapeAttr(item.key || "")}" data-tactic-value="${escapeAttr(item.value || "")}" data-preset-key="${escapeAttr(item.presetKey || "")}">
                ${escapeHtml(item.actionLabel || "Apply")}
              </button>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderSubstitutionRecommendations(recommendations) {
    if (!recommendations || !recommendations.length) {
      return `<div class="empty-state">No urgent substitution signal.</div>`;
    }
    return `
      <div class="sub-recommendation-list">
        ${recommendations.map((item) => {
          const playerOut = Engine.getPlayer(state, item.playerOutId);
          const playerIn = Engine.getPlayer(state, item.playerInId);
          return `
            <div class="sub-recommendation ${item.tone}">
              <span class="badge ${item.tone}">${item.score}</span>
              <div>
                <strong>${playerOut ? playerNameButton(playerOut, "name-link sub-name") : "Starter"} -> ${playerIn ? playerNameButton(playerIn, "name-link sub-name") : "Substitute"}</strong>
                <small>${escapeHtml(item.reason)} | ${escapeHtml(item.detail)}</small>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTouchlineLog() {
    const orders = ui.liveOrders || [];
    if (!orders.length) return `<div class="empty-state">No touchline changes yet.</div>`;
    return `
      <div class="touchline-log">
        ${orders.slice(0, 5).map((order) => `
          <div class="timeline-item">
            <strong>${order.minute ? `${order.minute}'` : "--"}</strong>
            <span><b>${escapeHtml(order.title)}</b><br><span class="small-muted">${escapeHtml(order.detail)}</span></span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderPostMatchTacticalReviewCard(review) {
    return `
      <div class="post-match-review">
        <div class="review-grade">
          <strong>${escapeHtml(review.grade)}</strong>
          <span>${review.score}/100</span>
        </div>
        <div class="analysis-summary">${escapeHtml(review.summary)}</div>
        <div class="phase-review-grid">
          ${review.phaseRows.map((row) => `
            <div class="phase-review-row">
              <span>${escapeHtml(row.label)}</span>
              <strong class="${row.tone}">${row.edge > 0 ? "+" : ""}${row.edge}</strong>
            </div>
          `).join("")}
        </div>
        <div class="assistant-advice-list compact">
          ${review.notes.map((note) => `
            <div class="assistant-card ${note.tone}">
              <div>
                <strong>${escapeHtml(note.title)}</strong>
                <span>${escapeHtml(note.body)}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function activeSideForMatch(match) {
    if (!match) return null;
    if (match.homeClubId === state.activeClubId) return "home";
    if (match.awayClubId === state.activeClubId) return "away";
    return null;
  }

  function liveTacticsForMatch(match) {
    const side = activeSideForMatch(match);
    const source = ui.liveTactics || (side && match.tactics && match.tactics[side]) || activeClub().tactics || {};
    return { ...Engine.DEFAULT_TACTICS, ...source };
  }

  function liveMatchMinute(match, commentary) {
    const total = match.commentary ? match.commentary.length : 0;
    const isRunning = ui.liveMatch === match && ui.commentaryPlaying && ui.commentaryCount < total;
    if (!isRunning) return match.played ? 90 : 0;
    const current = commentary[commentary.length - 1];
    return current ? Number(current.minute || 0) : 0;
  }

  function visibleMatchGoals(match, commentary, minute) {
    const goals = (match.goals || []).slice().sort((a, b) => a.minute - b.minute);
    const total = match.commentary ? match.commentary.length : 0;
    const isRunning = ui.liveMatch === match && ui.commentaryPlaying && ui.commentaryCount < total;
    if (!isRunning) return goals;

    const revealedGoalCounts = new Map();
    commentary.forEach((event) => {
      if (String(event.title).toLowerCase() !== "goal") return;
      revealedGoalCounts.set(event.minute, (revealedGoalCounts.get(event.minute) || 0) + 1);
    });

    const usedAtMinute = new Map();
    return goals.filter((goal) => {
      const goalMinute = Number(goal.minute || 0);
      if (goalMinute < minute) return true;
      if (goalMinute > minute) return false;
      const used = usedAtMinute.get(goalMinute) || 0;
      const available = revealedGoalCounts.get(goalMinute) || 0;
      if (used >= available) return false;
      usedAtMinute.set(goalMinute, used + 1);
      return true;
    });
  }

  function liveMatchScore(match, visibleGoals) {
    const total = match.commentary ? match.commentary.length : 0;
    const isRunning = ui.liveMatch === match && ui.commentaryPlaying && ui.commentaryCount < total;
    if (!isRunning) {
      return { home: match.homeGoals || 0, away: match.awayGoals || 0 };
    }
    return {
      home: visibleGoals.filter((goal) => goal.clubId === match.homeClubId).length,
      away: visibleGoals.filter((goal) => goal.clubId === match.awayClubId).length
    };
  }

  function liveMatchStatus(match, minute) {
    const total = match.commentary ? match.commentary.length : 0;
    const isRunning = ui.liveMatch === match && ui.commentaryPlaying && ui.commentaryCount < total;
    if (!isRunning) return { label: "FT", clock: "Full Time" };
    if (!minute) return { label: "Live", clock: "Kick Off" };
    return { label: "Live", clock: `${minute}'` };
  }

  function renderScorerList(match, clubId, visibleGoals) {
    const goals = visibleGoals.filter((goal) => goal.clubId === clubId);
    if (!goals.length) {
      return `<div class="scorer-empty">${ui.commentaryPlaying ? "No scorers yet" : "No goals"}</div>`;
    }
    return `
      <div class="scorer-list">
        ${goals.map((goal) => {
          const scorer = Engine.getPlayer(state, goal.playerId);
          const assist = goal.assistId ? Engine.getPlayer(state, goal.assistId) : null;
          return `
            <div class="scorer-item">
              <span>
                <strong>${scorer ? playerNameButton(scorer, "name-link scorer-name") : "Unknown Player"}</strong>
                ${assist ? `<small>Assist ${playerNameButton(assist, "name-link assist-name")}</small>` : ""}
              </span>
              <em>${goal.minute}'</em>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSourceStats(source) {
    return `
      <h3 class="panel-title" style="margin-top:14px">Source Stats</h3>
      <div class="metric-grid">
        ${metric("FPL Cost", source.cost ? `GBP ${(source.cost / 10).toFixed(1)}m` : "-", "Game seed")}
        ${metric("FPL Points", source.totalPoints || 0, "Source season")}
        ${metric("Starts", source.starts || 0, `${source.minutes || 0} minutes`)}
        ${metric("Output", `${source.goals || 0}G ${source.assists || 0}A`, `${source.cleanSheets || 0} clean sheets`)}
      </div>
    `;
  }

  function renderMatchSummary(match) {
    return `
      ${renderFixture(match)}
      <div class="metric-grid" style="margin-top:12px">
        ${metric("xG", `${match.stats.xg.home} - ${match.stats.xg.away}`, "Expected goals")}
        ${metric("Shots", `${match.stats.shots.home} - ${match.stats.shots.away}`, "Total attempts")}
        ${metric("Possession", `${match.stats.possession.home}% - ${match.stats.possession.away}%`, "Ball share")}
        ${metric("Man of Match", match.manOfMatch ? displayPlayerName(Engine.getPlayer(state, match.manOfMatch)) : "-", "Highest rating")}
      </div>
    `;
  }

  function renderMatchStats(match) {
    return `
      <div class="panel">
        <h2 class="panel-title">Match Stats</h2>
        <div class="metric-grid">
          ${metric("Possession", `${match.stats.possession.home}% - ${match.stats.possession.away}%`, "Home - Away")}
          ${metric("xG", `${match.stats.xg.home} - ${match.stats.xg.away}`, "Home - Away")}
          ${metric("Shots", `${match.stats.shots.home} - ${match.stats.shots.away}`, "Home - Away")}
          ${metric("On Target", `${match.stats.shotsOnTarget.home} - ${match.stats.shotsOnTarget.away}`, "Home - Away")}
          ${metric("Big Chances", `${statPair(match, "bigChances")}`, "Home - Away")}
          ${metric("Corners", `${match.stats.corners.home} - ${match.stats.corners.away}`, "Home - Away")}
          ${metric("Fouls", `${match.stats.fouls.home} - ${match.stats.fouls.away}`, "Home - Away")}
          ${metric("Cards", `${statPair(match, "yellowCards")} Y | ${statPair(match, "redCards")} R`, "Home - Away")}
          ${metric("Pass Accuracy", `${match.stats.passAccuracy.home}% - ${match.stats.passAccuracy.away}%`, "Home - Away")}
          ${metric("Set Piece xG", `${statPair(match, "setPieceXG")}`, "Home - Away")}
          ${metric("Press Turnovers", `${statPair(match, "pressTurnovers")}`, "Danger wins")}
          ${metric("Saves", `${statPair(match, "saves")}`, "Home - Away")}
          ${metric("Subs", `${statPair(match, "substitutions")}`, "Home - Away")}
          ${metric("Man of Match", match.manOfMatch ? displayPlayerName(Engine.getPlayer(state, match.manOfMatch)) : "-", "Highest rating")}
        </div>
      </div>
    `;
  }

  function renderMatchAnalysis(match) {
    if (!match.analysis) return "";
    const activeHome = match.homeClubId === state.activeClubId;
    const own = activeHome ? "home" : "away";
    const other = activeHome ? "away" : "home";
    return `
      <div class="panel match-analysis">
        <div class="ratings-heading">
          <h2 class="panel-title">Post-Match Analysis</h2>
          <span class="pill blue">${escapeHtml(match.engineVersion || "match engine")}</span>
        </div>
        <div class="analysis-summary">${escapeHtml(match.analysis.summary || "")}</div>
        ${renderSubstitutionTimeline(match)}
        <div class="analysis-grid">
          ${analysisList("Why It Worked", match.analysis[`${own}Strengths`] || [])}
          ${analysisList("Problems", match.analysis[`${own}Weaknesses`] || [])}
          ${analysisList("Opponent Strengths", match.analysis[`${other}Strengths`] || [])}
          ${analysisList("Key Factors", match.analysis.keyFactors || [])}
        </div>
      </div>
    `;
  }

  function renderSubstitutionTimeline(match) {
    const substitutions = (match.substitutions || []).slice().sort((a, b) => a.minute - b.minute);
    if (!substitutions.length) return `<div class="sub-timeline empty-state">No substitutions recorded.</div>`;
    return `
      <div class="sub-timeline">
        ${substitutions.map((sub) => {
          const playerIn = Engine.getPlayer(state, sub.playerInId);
          const playerOut = Engine.getPlayer(state, sub.playerOutId);
          return `
            <div class="sub-chip">
              <span class="minute">${sub.minute}'</span>
              <strong>${escapeHtml(clubName(sub.teamId))}</strong>
              <span>${playerIn ? playerNameButton(playerIn, "name-link sub-name") : "Player in"} for ${playerOut ? playerNameButton(playerOut, "name-link sub-name") : "Player out"}</span>
              <em>${escapeHtml(sub.reason || "tactical")}</em>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function analysisList(title, items) {
    return `
      <div class="analysis-list">
        <h3>${escapeHtml(title)}</h3>
        ${(items || []).slice(0, 5).map((item) => `<div class="analysis-item">${escapeHtml(item)}</div>`).join("") || `<div class="analysis-item">No major pattern.</div>`}
      </div>
    `;
  }

  function statPair(match, key) {
    const stat = match.stats[key] || { home: 0, away: 0 };
    return `${stat.home || 0} - ${stat.away || 0}`;
  }

  function renderRatings(match, visibleGoals) {
    const motm = match.manOfMatch ? Engine.getPlayer(state, match.manOfMatch) : null;
    return `
      <div class="panel">
        <div class="ratings-heading">
          <h2 class="panel-title">Player Ratings</h2>
          ${motm ? `<span class="motm-chip">MOTM ${escapeHtml(displayPlayerName(motm))}</span>` : ""}
        </div>
        <div class="ratings-grid">
          ${renderTeamRatings(match, match.homeClubId, "Home", visibleGoals)}
          ${renderTeamRatings(match, match.awayClubId, "Away", visibleGoals)}
        </div>
      </div>
    `;
  }

  function renderTeamRatings(match, clubId, side, visibleGoals) {
    const ratings = match.playerRatings
      .filter((rating) => rating.clubId === clubId)
      .map((rating) => ({ ...rating, player: Engine.getPlayer(state, rating.playerId) }))
      .filter((item) => item.player)
      .sort((a, b) => b.rating - a.rating || a.player.name.localeCompare(b.player.name));
    const average = round(avg(ratings.map((item) => item.rating)), 1);
    return `
      <div class="rating-team">
        <div class="rating-team-head">
          <div>
            <span>${escapeHtml(side)}</span>
            <strong>${escapeHtml(clubName(clubId))}</strong>
          </div>
          <span class="rating-pill ${ratingToneClass(average)}">${average || "-"}</span>
        </div>
        <div class="rating-list">
          ${ratings.map((item) => {
            const contribution = ratingContributionText(item.playerId, visibleGoals || match.goals || []);
            const minutes = item.minutes && item.minutes < 90 ? `${item.minutes}'` : "";
            return `
              <div class="rating-row ${item.playerId === match.manOfMatch ? "motm-row" : ""}">
                <div class="rating-player">
                  <strong>${playerNameButton(item.player, "name-link rating-name")}</strong>
                  <span>${positionBadge(item.player.position)}${minutes ? `<em>${escapeHtml(minutes)}</em>` : ""}${contribution ? `<em>${escapeHtml(contribution)}</em>` : ""}</span>
                </div>
                <span class="rating-pill ${ratingToneClass(item.rating)}">${item.rating}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function ratingContributionText(playerId, goals) {
    const scored = goals.filter((goal) => goal.playerId === playerId).length;
    const assisted = goals.filter((goal) => goal.assistId === playerId).length;
    const parts = [];
    if (scored) parts.push(`${scored}G`);
    if (assisted) parts.push(`${assisted}A`);
    return parts.join(" ");
  }

  function ratingToneClass(rating) {
    if (rating >= 8.4) return "elite";
    if (rating >= 7.5) return "great";
    if (rating >= 6.8) return "good";
    if (rating >= 6) return "steady";
    return "low";
  }

  function renderLeagueTable(rows) {
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th></tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr class="${row.clubId === state.activeClubId ? "highlight" : ""}">
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(row.clubName)}</strong></td>
                <td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td>
                <td>${row.goalsFor}</td><td>${row.goalsAgainst}</td><td>${row.goalDifference}</td><td><strong>${row.points}</strong></td>
                <td>${formDots(row.form)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMiniTable(rows) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Club</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>
            ${rows.map((row, index) => `
              <tr class="${row.clubId === state.activeClubId ? "highlight" : ""}">
                <td>${index + 1}</td><td>${escapeHtml(row.clubName)}</td><td>${row.goalDifference}</td><td><strong>${row.points}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderEuropeanGroupTable(rows) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Club</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr class="${row.clubId === state.activeClubId ? "highlight" : ""}">
                <td>${row.position}</td><td>${escapeHtml(row.clubName)}</td><td>${row.played}</td><td>${row.goalDifference}</td><td><strong>${row.points}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderIncomingOffers(offers) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>From</th><th>Fee</th><th></th></tr></thead>
          <tbody>
            ${offers.map((offer) => {
              const player = Engine.getPlayer(state, offer.playerId);
              return `
                <tr>
                  <td>${player ? playerNameButton(player) : "Unknown"}</td>
                  <td>${escapeHtml(clubName(offer.fromClubId))}</td>
                  <td>${Engine.formatMoney(offer.fee)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-compact btn-green" data-action="accept-offer" data-offer-id="${offer.id}">Accept</button>
                      <button class="btn-compact btn-red" data-action="reject-offer" data-offer-id="${offer.id}">Reject</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOutgoingNegotiations(offers) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Club</th><th>Your Offer</th><th>Counter</th><th></th></tr></thead>
          <tbody>
            ${offers.map((offer) => {
              const player = Engine.getPlayer(state, offer.playerId);
              return `
                <tr>
                  <td>${player ? playerNameButton(player) : "Unknown"}</td>
                  <td>${escapeHtml(clubName(offer.sellerClubId))}</td>
                  <td>${Engine.formatMoney(offer.fee)} | ${Engine.formatMoney(offer.wage)}</td>
                  <td>${Engine.formatMoney(offer.counterFee)} | ${Engine.formatMoney(offer.counterWage)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-compact btn-green" data-action="accept-counter" data-offer-id="${offer.id}">Accept</button>
                      <button class="btn-compact" data-action="withdraw-negotiation" data-offer-id="${offer.id}">Withdraw</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPreAgreements(agreements) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Type</th><th>Club</th><th>Registers</th><th>Fee</th></tr></thead>
          <tbody>
            ${agreements.slice(0, 8).map((agreement) => {
              const player = Engine.getPlayer(state, agreement.playerId);
              const incoming = agreement.toClubId === state.activeClubId;
              return `
                <tr>
                  <td>${player ? playerNameButton(player) : "Unknown"}</td>
                  <td>${preAgreementTypeLabel(agreement.kind)}</td>
                  <td>${escapeHtml(clubName(incoming ? agreement.fromClubId : agreement.toClubId))}</td>
                  <td>${agreement.executeDate ? Engine.formatGameDate(agreement.executeDate) : "-"}</td>
                  <td>${agreement.fee ? Engine.formatMoney(agreement.fee) : "-"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderScoutAssignments(assignments) {
    const visible = assignments.slice(0, 8);
    if (!visible.length) return `<div class="empty-state">Assign scouts from the market or start a regional brief to build the pipeline.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Brief</th><th>Type</th><th>Status</th><th>Remaining</th><th>Confidence</th></tr></thead>
          <tbody>
            ${visible.map((assignment) => {
              if (assignment.type === "region") {
                return `
                  <tr>
                    <td>
                      <strong>${escapeHtml(Engine.scoutingRegionLabel(assignment.regionId))}</strong>
                      <div class="small-muted">${escapeHtml(Engine.scoutingFocusLabel(assignment.focus))} | ${assignment.discoveries ? assignment.discoveries.length : 0} finds</div>
                    </td>
                    <td><span class="badge blue">Region</span></td>
                    <td>${assignment.status === "active" ? `<span class="badge blue">Active</span>` : `<span class="badge green">Complete</span>`}</td>
                    <td>${assignment.status === "active" ? `${Math.ceil(assignment.daysRemaining || 0)} days` : "-"}</td>
                    <td>${bar(assignment.progress || (assignment.status === "complete" ? 100 : 0), assignment.status === "complete" ? "green" : "blue")}</td>
                  </tr>
                `;
              }
              const player = Engine.getPlayer(state, assignment.playerId);
              const report = player ? Engine.getScoutView(state, player.id) : null;
              return `
                <tr>
                  <td>${player ? playerNameButton(player) : "Unknown"}</td>
                  <td><span class="badge">Player</span></td>
                  <td>${assignment.status === "active" ? `<span class="badge blue">Active</span>` : `<span class="badge green">Complete</span>`}</td>
                  <td>${assignment.status === "active" ? `${Math.ceil(assignment.daysRemaining !== undefined ? assignment.daysRemaining : (assignment.roundsRemaining || 0) * 7)} days` : "-"}</td>
                  <td>${report ? `${report.confidence}%` : "0%"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderReportsTable(items) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Club</th><th>CA Range</th><th>PA Range</th><th>Confidence</th><th>Latest Note</th><th></th></tr></thead>
          <tbody>
            ${items.map(({ report, player }) => `
              <tr>
                <td>${playerNameButton(player)}</td>
                <td>${escapeHtml(clubName(player.clubId))}</td>
                <td>${rangeText(Engine.getScoutView(state, player.id).currentRange)} <span class="small-muted">${Engine.stars(report.observedAbility)}</span></td>
                <td>${rangeText(Engine.getScoutView(state, player.id).potentialRange)} <span class="small-muted">${Engine.stars(report.observedPotential)}</span></td>
                <td>${bar(report.confidence, report.confidence > 75 ? "green" : report.confidence > 45 ? "amber" : "red")}</td>
                <td>${escapeHtml(report.notes[0] || "")}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn-compact" data-action="scout-player" data-player-id="${player.id}">Scout</button>
                    <button class="btn-compact" data-action="assign-scout" data-player-id="${player.id}">Assign</button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderRecommendationTable(players) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Club</th><th>Pos</th><th>Age</th><th>Rec</th><th>Need</th><th>Afford</th><th></th></tr></thead>
          <tbody>
            ${players.map((player) => {
              const recruitment = Engine.recruitmentTargetScore(state, player.id);
              return `
                <tr>
                  <td>${playerNameButton(player)}</td>
                  <td>${escapeHtml(clubName(player.clubId))}</td>
                  <td>${positionBadge(player.position)}</td>
                  <td>${player.age}</td>
                  <td><span class="badge ${recruitment.score >= 75 ? "green" : recruitment.score >= 55 ? "blue" : "amber"}">${recruitment.score}</span></td>
                  <td>${recruitment.need ? `<span class="badge ${recruitment.need.tone}">${recruitment.need.position}</span>` : "-"}</td>
                  <td><span class="badge ${recruitment.affordability.tone}">${recruitment.affordability.label}</span></td>
                  <td>
                    <div class="table-actions">
                      <button class="btn-compact" data-action="scout-player" data-player-id="${player.id}">Scout</button>
                      <button class="btn-compact" data-action="assign-scout" data-player-id="${player.id}">Assign</button>
                      <button class="btn-compact" data-action="shortlist-player" data-player-id="${player.id}">Shortlist</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderWageTable(players) {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Pos</th><th>Wage</th><th>Value</th></tr></thead>
          <tbody>
            ${players.map((player) => `
              <tr><td>${playerNameButton(player)}</td><td>${positionBadge(player.position)}</td><td>${Engine.formatMoney(player.wage)}</td><td>${Engine.formatMoney(player.value)}</td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderManagerHistory() {
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Season</th><th>Club</th><th>Finish</th><th>Points</th><th>W</th><th>D</th><th>L</th></tr></thead>
          <tbody>
            ${state.manager.careerHistory.map((item) => `
              <tr><td>${item.season}</td><td>${escapeHtml(item.clubName)}</td><td>${ordinal(item.finish)}</td><td>${item.points}</td><td>${item.wins}</td><td>${item.draws}</td><td>${item.losses}</td></tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSeasonArchive(item) {
    return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
          <strong>Season ${item.season}</strong>
          <span class="pill green">${escapeHtml(item.championName)} champions</span>
        </div>
        ${item.cup && item.cup.championName ? `<div class="message" style="margin-top:10px"><strong>${escapeHtml(item.cup.competitionName || "Domestic Cup")}</strong><br>${escapeHtml(item.cup.championName)} winners</div>` : ""}
        ${item.europe && item.europe.championName ? `<div class="message" style="margin-top:10px"><strong>${escapeHtml(item.europe.competitionName || "Continental Cup")}</strong><br>${escapeHtml(item.europe.championName)} winners</div>` : ""}
        <div class="grid two" style="margin-top:10px">
          ${awardLine("Golden Boot", item.awards.goldenBoot)}
          ${awardLine("Playmaker", item.awards.playmaker)}
          ${awardLine("Golden Glove", item.awards.goldenGlove)}
          ${awardLine("Player of Season", item.awards.playerOfSeason)}
        </div>
      </div>
    `;
  }

  function renderInbox() {
    if (!state.inbox.length) return `<div class="empty-state">Inbox empty.</div>`;
    return `
      <div class="timeline">
        ${state.inbox.slice(0, 6).map((item) => `
          <div class="timeline-item">
            <strong>S${item.season} R${item.round}</strong>
            <span><b>${escapeHtml(item.title)}</b><br><span class="small-muted">${escapeHtml(item.body)}</span></span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderModal() {
    if (!ui.modal) return "";
    if (ui.modal.type === "player") {
      const player = Engine.getPlayer(state, ui.modal.playerId);
      if (!player) return "";
      return `
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal player-modal" data-modal>
            <div class="modal-head">
              <div>
                <h2>${escapeHtml(displayPlayerName(player))}</h2>
                <div class="small-muted">${escapeHtml(player.name)} | ${escapeHtml(clubName(player.clubId))} | ${positionBadge(player.position)}</div>
              </div>
              <button class="btn-compact" data-action="close-modal">Close</button>
            </div>
            ${renderPlayerDetail(player)}
          </div>
        </div>
      `;
    }
    if (ui.modal.type === "offer") {
      const player = Engine.getPlayer(state, ui.modal.playerId);
      if (!player) return "";
      const isFreeAgent = !player.clubId;
      const negotiation = Engine.negotiationProfile(state, player.id);
      const windowStatus = negotiation.window;
      const suggestedFee = isFreeAgent ? 0 : ui.modal.fee || negotiation.suggestedFee;
      const suggestedWage = ui.modal.wage || negotiation.suggestedWage;
      return `
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal" data-modal>
            <div class="modal-head">
              <div>
                <h2>${isFreeAgent ? "Free Agent Contract" : "Transfer Offer"}</h2>
                <div class="small-muted">${escapeHtml(player.name)} | ${escapeHtml(clubName(player.clubId))} | ${positionBadge(player.position)}</div>
              </div>
              <button class="btn-compact" data-action="close-modal">Close</button>
            </div>
            <div class="setup-form">
              <div class="negotiation-grid">
                ${negotiationCard("Seller Stance", negotiation.stance.label, negotiation.stance.reason, negotiation.stance.tone)}
                ${negotiationCard("Player Interest", negotiation.interest.label, negotiation.interest.reason, negotiation.interest.tone)}
                ${negotiationCard("Suggested Fee", isFreeAgent ? "Free" : Engine.formatMoney(negotiation.suggestedFee), negotiation.affordability.label, negotiation.affordability.tone)}
                ${negotiationCard("Suggested Wage", Engine.formatMoney(negotiation.suggestedWage), negotiation.registration, windowStatus.isOpen ? "green" : "blue")}
              </div>
              <div class="field">
                <label for="offer-fee">Transfer Fee</label>
                <input id="offer-fee" type="number" min="0" step="25000" value="${suggestedFee}" ${isFreeAgent ? "disabled" : ""}>
              </div>
              <div class="field">
                <label for="offer-wage">Weekly Wage</label>
                <input id="offer-wage" type="number" min="0" step="5000" value="${suggestedWage}">
              </div>
              <div class="message">${isFreeAgent ? "No transfer fee required" : `Value ${Engine.formatMoney(player.value)}`} | Current wage ${Engine.formatMoney(player.wage)}</div>
              ${negotiation.warnings.length ? `<div class="message warn">${negotiation.warnings.map(escapeHtml).join(" | ")}</div>` : ""}
              <div class="message ${windowStatus.isOpen ? "good" : "warn"}">${windowStatus.isOpen ? `Window open: registration can complete before ${Engine.formatGameDate(windowStatus.closesOn)}.` : `Window closed: accepted deals register on ${Engine.formatGameDate(windowStatus.opensOn)}.`}</div>
              <button class="btn-primary" data-action="submit-offer" data-player-id="${player.id}">${isFreeAgent ? "Submit Contract" : windowStatus.isOpen ? "Submit Offer" : "Pre-Agree Offer"}</button>
            </div>
          </div>
        </div>
      `;
    }
    if (ui.modal.type === "export") {
      return `
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal" data-modal>
            <div class="modal-head">
              <h2>Export Save</h2>
              <button class="btn-compact" data-action="close-modal">Close</button>
            </div>
            <textarea readonly style="width:100%;height:340px;border:1px solid var(--line);border-radius:6px;padding:10px">${escapeHtml(Storage.exportSave(state))}</textarea>
          </div>
        </div>
      `;
    }
    if (ui.modal.type === "import") {
      return `
        <div class="modal-backdrop" data-action="close-modal">
          <div class="modal" data-modal>
            <div class="modal-head">
              <h2>Import Save</h2>
              <button class="btn-compact" data-action="close-modal">Close</button>
            </div>
            <textarea id="import-json" style="width:100%;height:260px;border:1px solid var(--line);border-radius:6px;padding:10px"></textarea>
            <div style="margin-top:10px"><button class="btn-primary" data-action="submit-import">Import</button></div>
          </div>
        </div>
      `;
    }
    return "";
  }

  function renderToasts() {
    if (!ui.toasts.length) return "";
    return `<div class="toast">${ui.toasts.map((toast) => `<div class="message ${toast.kind || ""}">${escapeHtml(toast.text)}</div>`).join("")}</div>`;
  }

  function handleClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    if (event.target.closest("[data-modal]") && actionEl.dataset.action === "close-modal" && event.target !== actionEl) return;
    const action = actionEl.dataset.action;

    if (action === "setup-club") {
      ui.setupClubId = actionEl.dataset.clubId;
      render();
      return;
    }
    if (action === "setup-mode") {
      ui.setupMode = actionEl.dataset.mode;
      render();
      return;
    }
    if (action === "start-save") {
      const managerName = document.getElementById("manager-name").value;
      const customInput = document.getElementById("custom-club-name");
      state = Engine.createNewSave({
        selectedClubId: ui.setupClubId,
        customClubName: ui.setupMode === "custom" && customInput ? customInput.value : "",
        managerName
      });
      ui.screen = "dashboard";
      syncLineupSelection();
      Storage.save(state);
      toast("Save created.", "good");
      render();
      return;
    }
    if (action === "load-save") {
      state = Storage.load();
      ui.screen = "dashboard";
      syncLineupSelection();
      toast("Save loaded.", "good");
      render();
      return;
    }
    if (action === "nav") {
      ui.screen = actionEl.dataset.screen;
      ui.liveMatch = null;
      ui.liveTactics = null;
      ui.liveOrders = [];
      render();
      return;
    }
    if (action === "save-game") {
      Storage.save(state);
      toast("Game saved.", "good");
      render();
      return;
    }
    if (action === "new-save") {
      state = null;
      Storage.clear();
      ui.modal = null;
      render();
      return;
    }
    if (action === "toggle-theme") {
      ui.theme = ui.theme === "dark" ? "light" : "dark";
      global.localStorage.setItem("touchline-lite-theme", ui.theme);
      applyTheme();
      render();
      return;
    }
    if (action === "open-export") {
      ui.modal = { type: "export" };
      render();
      return;
    }
    if (action === "open-import") {
      ui.modal = { type: "import" };
      render();
      return;
    }
    if (action === "submit-import") {
      try {
        state = Storage.importSave(document.getElementById("import-json").value);
        Storage.save(state);
        ui.modal = null;
        ui.screen = "dashboard";
        syncLineupSelection();
        toast("Save imported.", "good");
      } catch (error) {
        toast("Import failed.", "bad");
      }
      render();
      return;
    }
    if (action === "close-modal") {
      ui.modal = null;
      render();
      return;
    }
    if (!state) return;

    if (action === "simulate-round") {
      simulateRound();
      return;
    }
    if (action === "view-player") {
      ui.selectedPlayerId = actionEl.dataset.playerId;
      ui.modal = { type: "player", playerId: actionEl.dataset.playerId };
      render();
      return;
    }
    if (action === "auto-lineup") {
      const club = activeClub();
      club.lineup = Engine.autoSelectLineup(state, club.id);
      club.bench = Engine.autoSelectBench(state, club.id);
      syncLineupSelection();
      Storage.save(state);
      toast("Lineup selected.", "good");
      render();
      return;
    }
    if (action === "auto-bench") {
      const club = activeClub();
      club.bench = Engine.autoSelectBench(state, club.id);
      Storage.save(state);
      toast("Bench selected.", "good");
      render();
      return;
    }
    if (action === "auto-tactics") {
      const result = Engine.autoSetTactics(state, state.activeClubId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "apply-tactical-preset") {
      const result = Engine.applyTacticalPreset(state, state.activeClubId, actionEl.dataset.presetKey);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "apply-live-preset") {
      applyLiveTacticalPreset(actionEl.dataset.presetKey);
      return;
    }
    if (action === "apply-live-advice") {
      if (actionEl.dataset.presetKey) applyLiveTacticalPreset(actionEl.dataset.presetKey);
      else applyLiveTacticChange(actionEl.dataset.tacticKey, actionEl.dataset.tacticValue);
      return;
    }
    if (action === "auto-roles") {
      const result = Engine.autoSetTacticalRoles(state, state.activeClubId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "auto-training") {
      const result = Engine.autoSetTrainingPlan(state, state.activeClubId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "upgrade-staff") {
      const result = Engine.upgradeStaffDepartment(state, state.activeClubId, actionEl.dataset.staffKey);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "save-lineup") {
      const result = Engine.setLineup(state, state.activeClubId, Array.from(ui.lineupSelection));
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "scout-player") {
      const report = Engine.scoutPlayer(state, actionEl.dataset.playerId);
      Storage.save(state);
      toast(report ? `Scout confidence ${report.confidence}%.` : "Scout failed.", report ? "good" : "bad");
      render();
      return;
    }
    if (action === "assign-scout") {
      const result = Engine.assignScout(state, actionEl.dataset.playerId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "assign-region") {
      const result = Engine.assignRegionalScout(state, actionEl.dataset.regionId, ui.regionalFocus);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "promote-academy") {
      const result = Engine.promoteAcademyProspect(state, actionEl.dataset.prospectId);
      syncLineupSelection();
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "release-academy") {
      const result = Engine.releaseAcademyProspect(state, actionEl.dataset.prospectId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "shortlist-player") {
      const result = Engine.addToShortlist(state, actionEl.dataset.playerId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "remove-shortlist") {
      const result = Engine.removeFromShortlist(state, actionEl.dataset.playerId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "open-offer") {
      ui.modal = { type: "offer", playerId: actionEl.dataset.playerId };
      render();
      return;
    }
    if (action === "submit-offer") {
      const fee = Number(document.getElementById("offer-fee").value || 0);
      const wage = Number(document.getElementById("offer-wage").value || 0);
      const result = Engine.makeTransferOffer(state, actionEl.dataset.playerId, fee, wage);
      if (result.ok) ui.modal = null;
      syncLineupSelection();
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "loan-player") {
      const result = Engine.loanPlayer(state, actionEl.dataset.playerId);
      syncLineupSelection();
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "loan-out-youth") {
      const result = Engine.loanOutYouthPlayer(state, actionEl.dataset.playerId, actionEl.dataset.destinationId);
      syncLineupSelection();
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "renew-contract") {
      const result = Engine.renewContract(state, actionEl.dataset.playerId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "rest-player") {
      const result = Engine.restPlayer(state, actionEl.dataset.playerId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "accept-counter") {
      const result = Engine.acceptCounterOffer(state, actionEl.dataset.offerId);
      syncLineupSelection();
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "withdraw-negotiation") {
      const result = Engine.withdrawNegotiation(state, actionEl.dataset.offerId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "accept-offer") {
      const result = Engine.acceptOffer(state, actionEl.dataset.offerId);
      syncLineupSelection();
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "reject-offer") {
      const result = Engine.rejectOffer(state, actionEl.dataset.offerId);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (action === "invite-offers") {
      const offer = Engine.maybeGenerateAiOffer(state);
      Storage.save(state);
      toast(offer ? "New offer received." : "No clubs made an offer.", offer ? "good" : "warn");
      render();
    }
  }

  function handleKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl || ["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
    event.preventDefault();
    actionEl.click();
  }

  function handleChange(event) {
    const target = event.target;
    if (target.dataset.action === "lineup-toggle") {
      const id = target.dataset.playerId;
      if (target.checked) ui.lineupSelection.add(id);
      else ui.lineupSelection.delete(id);
      render();
      return;
    }
    if (target.dataset.action === "set-formation") {
      Engine.setFormation(state, state.activeClubId, target.value);
      syncLineupSelection();
      Storage.save(state);
      render();
      return;
    }
    if (target.dataset.action === "set-live-tactic") {
      applyLiveTacticChange(target.dataset.tacticKey, target.value);
      return;
    }
    if (target.dataset.action === "set-tactic") {
      const result = Engine.setTactic(state, state.activeClubId, target.dataset.tacticKey, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-tactical-role") {
      const result = Engine.setTacticalRole(state, state.activeClubId, target.dataset.slotIndex, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-player-instruction") {
      const result = Engine.setPlayerInstruction(state, state.activeClubId, target.dataset.slotIndex, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-training-plan") {
      const result = Engine.setTrainingPlan(state, state.activeClubId, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-match-prep") {
      const result = Engine.setMatchPrep(state, state.activeClubId, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-training-focus") {
      const result = Engine.setTrainingFocus(state, target.dataset.playerId, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-squad-role") {
      const result = Engine.setSquadRole(state, target.dataset.playerId, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-academy-plan") {
      const result = Engine.setAcademyPlan(state, target.dataset.prospectId, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.action === "set-individual-plan") {
      const result = Engine.setIndividualPlan(state, target.dataset.playerId, target.value);
      Storage.save(state);
      toast(result.message, result.ok ? "good" : "bad");
      render();
      return;
    }
    if (target.dataset.ui) {
      setUiValue(target.dataset.ui, target.value);
      render();
    }
  }

  function handleInput(event) {
    const target = event.target;
    if (!target.dataset.ui) return;
    const key = target.dataset.ui;
    const selectionStart = target.selectionStart;
    const selectionEnd = target.selectionEnd;
    setUiValue(target.dataset.ui, target.value);
    render();
    const next = document.querySelector(`[data-ui="${key}"]`);
    if (next && typeof next.focus === "function") {
      next.focus();
      if (typeof next.setSelectionRange === "function" && selectionStart !== null) {
        next.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }

  function handleDragStart(event) {
    const dragEl = event.target.closest("[data-drag-player]");
    if (!dragEl || dragEl.classList.contains("unavailable")) {
      event.preventDefault();
      return;
    }
    ui.draggedPlayerId = dragEl.dataset.playerId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragEl.dataset.playerId);
    }
    dragEl.classList.add("dragging");
  }

  function handleDragOver(event) {
    const dropEl = event.target.closest("[data-drop-slot], [data-drop-bench-slot], [data-drop-player], [data-drop-pool]");
    if (!dropEl || !ui.draggedPlayerId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    dropEl.classList.add("drag-over");
  }

  function handleDragLeave(event) {
    const dropEl = event.target.closest("[data-drop-slot], [data-drop-bench-slot], [data-drop-player], [data-drop-pool]");
    if (dropEl) dropEl.classList.remove("drag-over");
  }

  function handleDrop(event) {
    const playerId = event.dataTransfer ? event.dataTransfer.getData("text/plain") || ui.draggedPlayerId : ui.draggedPlayerId;
    if (!playerId) return;
    const slotEl = event.target.closest("[data-drop-slot]");
    const benchSlotEl = event.target.closest("[data-drop-bench-slot]");
    const playerEl = event.target.closest("[data-drop-player]");
    const poolEl = event.target.closest("[data-drop-pool]");
    if (!slotEl && !benchSlotEl && !playerEl && !poolEl) return;
    event.preventDefault();

    if (slotEl) {
      applyLineupDrop(playerId, { type: "slot", slotIndex: Number(slotEl.dataset.slotIndex) });
    } else if (benchSlotEl) {
      applyBenchDrop(playerId, { benchIndex: Number(benchSlotEl.dataset.benchIndex) });
    } else if (playerEl && playerEl.dataset.source === "pool") {
      applyLineupDrop(playerId, { type: "pool-player", targetPlayerId: playerEl.dataset.playerId });
    }
    clearDragState();
  }

  function handleDragEnd() {
    clearDragState();
  }

  function clearDragState() {
    ui.draggedPlayerId = null;
    document.querySelectorAll(".dragging, .drag-over").forEach((el) => {
      el.classList.remove("dragging", "drag-over");
    });
  }

  function setUiValue(key, value) {
    if (key === "squadSearch") ui.squadSearch = value;
    if (key === "squadPosition") ui.squadPosition = value;
    if (key === "squadAvailability") ui.squadAvailability = value;
    if (key === "squadSort") ui.squadSort = value;
    if (key === "marketSearch") ui.marketSearch = value;
    if (key === "marketPosition") ui.marketPosition = value;
    if (key === "marketView") ui.marketView = value;
    if (key === "marketSort") ui.marketSort = value;
    if (key === "regionalFocus") ui.regionalFocus = value;
  }

  function applyLiveTacticChange(key, value) {
    if (!ui.liveMatch || !ui.commentaryPlaying) return;
    const result = Engine.setTactic(state, state.activeClubId, key, value);
    if (!result.ok) {
      toast(result.message, "bad");
      render();
      return;
    }
    const group = (Data.TACTIC_GROUPS || []).find((item) => item.key === key);
    ui.liveTactics = { ...liveTacticsForMatch(ui.liveMatch), [key]: value };
    recordTouchlineOrder(group ? group.label : "Tactic", tacticLabel(key, value));
    Storage.save(state);
    renderMatchTick();
  }

  function applyLiveTacticalPreset(presetKey) {
    if (!ui.liveMatch || !ui.commentaryPlaying) return;
    const result = Engine.applyTacticalPreset(state, state.activeClubId, presetKey);
    if (!result.ok) {
      toast(result.message, "bad");
      render();
      return;
    }
    ui.liveTactics = result.tactics;
    recordTouchlineOrder(result.label, "Preset applied");
    Storage.save(state);
    renderMatchTick();
  }

  function recordTouchlineOrder(title, detail) {
    const commentary = ui.liveMatch ? (ui.liveMatch.commentary || []).slice(0, ui.commentaryCount) : [];
    const minute = ui.liveMatch ? liveMatchMinute(ui.liveMatch, commentary) : 0;
    ui.liveOrders.unshift({
      minute,
      title,
      detail
    });
    ui.liveOrders = ui.liveOrders.slice(0, 8);
  }

  function simulateRound() {
    if (ui.commentaryPlaying) return;
    const result = Engine.simulateUntilNextEvent(state, { maxDays: 28 });
    Storage.save(state);
    syncLineupSelection();
    if (!result.activeMatch) {
      ui.liveMatch = null;
      ui.commentaryCount = 0;
      if (result.seasonEnded && result.seasonSummary) {
        toast(`${result.seasonSummary.championName} won Season ${result.seasonSummary.season}.`, "good");
      } else {
        const days = result.daysAdvanced || 1;
        const label = days > 1 ? `${days} days advanced` : `${Engine.formatGameDate(result.date)} complete`;
        const event = result.significantEvent;
        toast(event ? `${label}: ${event.title}` : label, event ? "good" : "warn");
      }
      render();
      return;
    }
    ui.screen = "match";
    ui.liveMatch = result.activeMatch;
    ui.liveTactics = null;
    ui.liveTactics = liveTacticsForMatch(result.activeMatch);
    ui.liveOrders = [];
    ui.commentaryCount = 0;
    ui.commentaryPlaying = true;
    render();
    playCommentary(() => {
      ui.commentaryPlaying = false;
      if (result.seasonEnded && result.seasonSummary) {
        toast(`${result.seasonSummary.championName} won Season ${result.seasonSummary.season}.`, "good");
      }
      render();
    });
  }

  function playCommentary(done) {
    const total = ui.liveMatch && ui.liveMatch.commentary ? ui.liveMatch.commentary.length : 0;
    function tick() {
      ui.commentaryCount += 1;
      renderMatchTick();
      if (ui.commentaryCount < total) {
        global.setTimeout(tick, 360);
      } else {
        done();
      }
    }
    if (!total) {
      done();
      return;
    }
    global.setTimeout(tick, 220);
  }

  function renderMatchTick() {
    const content = document.querySelector(".content");
    if (!content || ui.screen !== "match") {
      render();
      return;
    }
    content.innerHTML = renderScreen();
    scrollCommentaryToBottom();
  }

  function syncLineupSelection() {
    const club = state ? activeClub() : null;
    ui.lineupSelection = new Set(club ? club.lineup : []);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = ui.theme;
  }

  function activeClub() {
    return Engine.getClub(state, state.activeClubId);
  }

  function currentLineupIds(club) {
    if (!club) return [];
    const squadIds = new Set(club.squad || []);
    let lineup = (club.lineup || []).filter((id) => squadIds.has(id) && state.players[id] && !Engine.isUnavailable(state, state.players[id]));
    if (lineup.length !== 11) {
      lineup = Engine.autoSelectLineup(state, club.id);
      club.lineup = lineup;
      syncLineupSelection();
    }
    return lineup.slice(0, 11);
  }

  function currentBenchIds(club, lineup) {
    if (!club) return [];
    const squadIds = new Set(club.squad || []);
    const lineupIds = new Set(lineup || currentLineupIds(club));
    const availableCount = Math.max(0, (club.squad || []).filter((id) => {
      const player = state.players[id];
      return squadIds.has(id) && !lineupIds.has(id) && player && !Engine.isUnavailable(state, player);
    }).length);
    let bench = (club.bench || []).filter((id, index, source) => {
      const player = state.players[id];
      return source.indexOf(id) === index && squadIds.has(id) && player && !lineupIds.has(id) && !Engine.isUnavailable(state, player);
    });
    const targetSize = Math.min(7, availableCount);
    if (bench.length < targetSize || bench.length !== (club.bench || []).length) {
      bench = Engine.autoSelectBench(state, club.id);
      club.bench = bench;
    }
    return bench.slice(0, 7);
  }

  function formationSlots(formation) {
    const roles = Data.FORMATIONS[formation] || Data.FORMATIONS["4-3-3"];
    const coords = FORMATION_LAYOUTS[formation] || FORMATION_LAYOUTS["4-3-3"];
    return roles.map((role, index) => ({
      index,
      role,
      x: coords[index] ? coords[index][0] : 50,
      y: coords[index] ? coords[index][1] : 50
    }));
  }

  function applyLineupDrop(playerId, target) {
    const club = activeClub();
    const player = Engine.getPlayer(state, playerId);
    if (!club || !player || player.clubId !== club.id) return;
    if (Engine.isUnavailable(state, player)) {
      toast("Player unavailable.", "bad");
      render();
      return;
    }

    const lineup = currentLineupIds(club);
    const bench = currentBenchIds(club, lineup);
    const sourceIndex = lineup.indexOf(playerId);
    const sourceBenchIndex = bench.indexOf(playerId);
    let changed = false;

    if (target.type === "slot") {
      const targetIndex = clamp(Number(target.slotIndex), 0, 10);
      if (sourceIndex === targetIndex) return;
      if (sourceIndex >= 0) {
        const targetPlayerId = lineup[targetIndex];
        lineup[targetIndex] = playerId;
        lineup[sourceIndex] = targetPlayerId;
        changed = true;
      } else {
        const targetPlayerId = lineup[targetIndex];
        lineup[targetIndex] = playerId;
        if (sourceBenchIndex >= 0 && targetPlayerId) {
          bench[sourceBenchIndex] = targetPlayerId;
        }
        changed = true;
      }
    }

    if (target.type === "pool-player") {
      const replacement = Engine.getPlayer(state, target.targetPlayerId);
      if ((sourceIndex < 0 && sourceBenchIndex < 0) || !replacement || replacement.clubId !== club.id) return;
      if (Engine.isUnavailable(state, replacement)) {
        toast("Replacement unavailable.", "bad");
        render();
        return;
      }
      if (sourceIndex >= 0) {
        lineup[sourceIndex] = replacement.id;
      } else {
        bench[sourceBenchIndex] = replacement.id;
      }
      changed = true;
    }

    if (!changed) return;
    const result = Engine.setLineup(state, club.id, lineup);
    const benchResult = Engine.setBench(state, club.id, bench);
    syncLineupSelection();
    Storage.save(state);
    if (!result.ok) toast(result.message, "bad");
    if (!benchResult.ok) toast(benchResult.message, "bad");
    render();
  }

  function applyBenchDrop(playerId, target) {
    const club = activeClub();
    const player = Engine.getPlayer(state, playerId);
    if (!club || !player || player.clubId !== club.id) return;
    if (Engine.isUnavailable(state, player)) {
      toast("Player unavailable.", "bad");
      render();
      return;
    }

    const lineup = currentLineupIds(club);
    const bench = currentBenchIds(club, lineup);
    const benchSlots = Array.from({ length: 7 }, (_, index) => bench[index] || null);
    const sourceIndex = lineup.indexOf(playerId);
    const sourceBenchIndex = benchSlots.indexOf(playerId);
    const targetIndex = clamp(Number(target.benchIndex), 0, 6);
    if (sourceBenchIndex === targetIndex) return;

    let changed = false;
    if (sourceIndex >= 0) {
      const targetPlayerId = benchSlots[targetIndex];
      if (!targetPlayerId) {
        toast("Swap with a substitute to keep 11 starters.", "warn");
        render();
        return;
      }
      lineup[sourceIndex] = targetPlayerId;
      benchSlots[targetIndex] = playerId;
      changed = true;
    } else if (sourceBenchIndex >= 0) {
      const targetPlayerId = benchSlots[targetIndex];
      benchSlots[targetIndex] = playerId;
      benchSlots[sourceBenchIndex] = targetPlayerId;
      changed = true;
    } else {
      benchSlots[targetIndex] = playerId;
      changed = true;
    }

    if (!changed) return;
    const result = Engine.setLineup(state, club.id, lineup);
    const benchResult = Engine.setBench(state, club.id, benchSlots.filter(Boolean));
    syncLineupSelection();
    Storage.save(state);
    if (!result.ok) toast(result.message, "bad");
    if (!benchResult.ok) toast(benchResult.message, "bad");
    render();
  }

  function clubName(clubId) {
    if (!clubId) return "Free Agent";
    const club = Engine.getClub(state, clubId);
    return club ? club.name : "Unknown";
  }

  function nextFixtureLabel(fixture) {
    const activeHome = fixture.homeClubId === state.activeClubId;
    const opponent = activeHome ? clubName(fixture.awayClubId) : clubName(fixture.homeClubId);
    const date = fixture.date ? ` on ${Engine.formatGameDate(fixture.date)}` : "";
    const competition = fixture.competitionName ? `${fixture.competitionName}: ` : "";
    return `${competition}${activeHome ? "Home" : "Away"} vs ${opponent}${date}`;
  }

  function marketPlayers() {
    const ids = new Set((state.transfers.marketIds || []).concat(state.transfers.shortlist || [], state.transfers.freeAgentIds || []));
    return Array.from(ids).map((id) => Engine.getPlayer(state, id)).filter(Boolean);
  }

  function filterMarketView(players, view) {
    if (view === "recommended") {
      const ids = new Set(Engine.recruitmentRecommendations(state, 24).map((item) => item.player.id));
      return players.filter((player) => ids.has(player.id));
    }
    if (view === "shortlist") return players.filter((player) => Engine.isShortlisted(state, player.id));
    if (view === "affordable") return players.filter((player) => {
      const profile = Engine.recruitmentProfile(state, player.id);
      return profile && profile.recruitment.affordability.score >= 58;
    });
    if (view === "freeAgents") return players.filter((player) => !player.clubId);
    if (view === "prospects") return players.filter((player) => player.age <= 23 && player.potential - player.currentAbility >= 8);
    if (view === "scouted") return players.filter((player) => Engine.getScoutView(state, player.id).confidence >= 45);
    return players;
  }

  function filterPlayers(players, search, position, availability) {
    const query = search.trim().toLowerCase();
    return players.filter((player) => {
      const matchesSearch = !query || player.name.toLowerCase().includes(query) || player.nationality.toLowerCase().includes(query) || clubName(player.clubId).toLowerCase().includes(query);
      const matchesPosition = position === "all" || player.position === position || player.secondaryPositions.includes(position);
      const status = Engine.playerAvailabilityStatus(state, player);
      const risk = Engine.injuryRiskLevel(state, player);
      let matchesAvailability = true;
      if (availability === "available") matchesAvailability = !Engine.isUnavailable(state, player) && player.fitness >= 55;
      if (availability === "injured") matchesAvailability = status.key === "injured";
      if (availability === "suspended") matchesAvailability = status.key === "suspended";
      if (availability === "lowFitness") matchesAvailability = status.key === "unfit";
      if (availability === "highRisk") matchesAvailability = risk.key === "high";
      if (availability === "prospects") matchesAvailability = player.age <= 23 && player.potential - player.currentAbility >= 5;
      return matchesSearch && matchesPosition && matchesAvailability;
    });
  }

  function sortPlayers(players, key, dir) {
    const direction = dir === "asc" ? 1 : -1;
    return players.slice().sort((a, b) => {
      const av = playerSortValue(a, key);
      const bv = playerSortValue(b, key);
      if (typeof av === "string") return av.localeCompare(bv) * direction;
      return (av - bv) * direction;
    });
  }

  function playerSortValue(player, key) {
    if (key === "position") return player.position;
    if (key === "age") return player.age;
    if (key === "potential") return player.potential;
    if (key === "fitness") return player.fitness;
    if (key === "sharpness") return player.sharpness;
    if (key === "morale") return player.morale;
    if (key === "recruitmentScore") {
      const recruitment = Engine.recruitmentTargetScore(state, player.id);
      return recruitment ? recruitment.score : 0;
    }
    if (key === "confidence") return Engine.getScoutView(state, player.id).confidence;
    if (key === "value") return player.value;
    if (key === "wage") return player.wage;
    return player.currentAbility;
  }

  function developmentDeltaLabel(delta) {
    const value = Number(delta) || 0;
    if (value > 0) return `+${value} CA`;
    if (value < 0) return `${value} CA`;
    return "0 CA";
  }

  function attributeLabel(key) {
    return Data.ATTRIBUTE_LABELS[key] || key;
  }

  function metric(label, value, delta) {
    return `
      <div class="metric">
        <div class="metric-label">${escapeHtml(label)}</div>
        <div class="metric-value">${escapeHtml(String(value))}</div>
        <div class="metric-delta">${escapeHtml(delta || "")}</div>
      </div>
    `;
  }

  function dashboardInsight(label, value, detail, tone) {
    return `
      <div class="dashboard-insight ${tone || ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(detail || "")}</small>
      </div>
    `;
  }

  function effectMeter(label, value, detail) {
    const normalized = Math.round(clamp(value, 0, 100));
    const tone = normalized >= 70 ? "green" : normalized >= 44 ? "blue" : "amber";
    return `
      <div class="effect-meter">
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(detail)}</span>
        </div>
        <div class="effect-bar ${tone}" aria-label="${escapeAttr(label)} ${normalized}">
          <span style="--value:${normalized}%"></span>
        </div>
        <em>${normalized}</em>
      </div>
    `;
  }

  function tacticLabel(key, value) {
    const group = (Data.TACTIC_GROUPS || []).find((item) => item.key === key);
    const option = group && group.options ? group.options.find((item) => item.value === value) : null;
    return option ? option.label : value || "-";
  }

  function displayPlayerName(player) {
    return Engine.playerDisplayName(player);
  }

  function playerNameButton(player, className) {
    if (!player) return "Unknown";
    const classes = className || "name-link player-name";
    return `<button class="${classes}" type="button" data-action="view-player" data-player-id="${escapeAttr(player.id)}" title="${escapeAttr(player.name)}">${escapeHtml(displayPlayerName(player))}</button>`;
  }

  function progressCard(label, value) {
    return `<div class="progress-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value))}</span></div>`;
  }

  function negotiationCard(label, value, detail, tone) {
    return `
      <div class="negotiation-card">
        <strong>${escapeHtml(label)}</strong>
        <span class="badge ${tone || ""}">${escapeHtml(String(value))}</span>
        <small>${escapeHtml(detail || "")}</small>
      </div>
    `;
  }

  function bar(value, tone) {
    const className = tone || (value > 70 ? "green" : value > 42 ? "amber" : "red");
    return `<div class="bar ${className}" title="${value}"><span style="--value:${clamp(value, 0, 100)}%"></span></div>`;
  }

  function positionBadge(position) {
    const tone = position === "GK" ? "blue" : ["CB", "RB", "LB", "DM"].includes(position) ? "green" : ["CM", "AM"].includes(position) ? "amber" : "";
    return `<span class="badge ${tone}">${position}</span>`;
  }

  function statusBadge(player) {
    const status = Engine.playerAvailabilityStatus(state, player);
    return `<span class="badge ${status.tone}">${escapeHtml(status.label)}</span>`;
  }

  function transferTypeLabel(type) {
    const labels = {
      transfer: "Transfer",
      "free-agent": "Free Agent",
      released: "Released",
      loan: "Loan"
    };
    return labels[type] || type;
  }

  function preAgreementTypeLabel(type) {
    const labels = {
      transfer: "Transfer",
      "free-agent": "Free Agent",
      loan: "Loan"
    };
    return labels[type] || type;
  }

  function rangeText(range) {
    if (!range) return "-";
    return `${range.min}-${range.max}`;
  }

  function formDots(form) {
    const dots = form.length ? form : ["-", "-", "-", "-", "-"];
    return `<div class="form-row">${dots.map((item) => `<span class="form-dot ${item}">${item}</span>`).join("")}</div>`;
  }

  function formRatings(form) {
    if (!form.length) return `<span class="small-muted">-</span>`;
    return `<span class="small-muted">${form.map((item) => round(item, 1)).join(" ")}</span>`;
  }

  function leaderList(title, players, stat) {
    return `
      <div>
        <h3 class="panel-title">${escapeHtml(title)}</h3>
        <div class="timeline">
          ${players.slice(0, 5).map((player) => `
            <div class="timeline-item">
              <strong>${statValue(player, stat)}</strong>
              <span>${playerNameButton(player, "name-link leader-name")}<br><span class="small-muted">${escapeHtml(clubName(player.clubId))}</span></span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function leaderPanel(title, players, stat) {
    return `
      <div class="panel">
        <h2 class="panel-title">${title}</h2>
        ${leaderList("", players, stat)}
      </div>
    `;
  }

  function statValue(player, stat) {
    if (stat === "assists") return player.seasonStats.assists;
    if (stat === "cleanSheets") return player.seasonStats.cleanSheets;
    if (stat === "apps") return player.seasonStats.apps;
    if (stat === "rating") return round(Engine.averageRating(player.seasonStats), 2);
    return player.seasonStats.goals;
  }

  function awardLine(label, award) {
    if (!award) return `<div class="message">${escapeHtml(label)}: -</div>`;
    return `<div class="message"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(award.playerName)} | ${escapeHtml(String(award.value))} ${escapeHtml(award.stat)}</div>`;
  }

  function recordItem(label, text) {
    return `<div class="timeline-item"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(text)}</span></div>`;
  }

  function toast(text, kind) {
    ui.toasts.push({ text, kind });
    ui.toasts = ui.toasts.slice(-3);
    global.setTimeout(() => {
      ui.toasts.shift();
      render();
    }, 2600);
  }

  function scrollCommentaryToBottom() {
    const el = document.getElementById("commentary");
    if (el) el.scrollTop = el.scrollHeight;
  }

  function managerWinRate() {
    const total = state.manager.wins + state.manager.draws + state.manager.losses;
    return total ? `${Math.round((state.manager.wins / total) * 100)}%` : "0%";
  }

  function ordinal(number) {
    const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
    return `${number}${suffix}`;
  }

  function avg(values) {
    return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
  }

  function round(value, precision) {
    const factor = Math.pow(10, precision || 0);
    return Math.round(value * factor) / factor;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
