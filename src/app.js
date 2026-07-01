(function (global) {
  "use strict";

  const Data = global.FMLData;
  const Engine = global.FMLEngine;
  const Storage = global.FMLStorage;
  const app = document.getElementById("app");

  let state = Storage.load();
  const ui = {
    screen: "dashboard",
    theme: global.localStorage.getItem("touchline-lite-theme") || "light",
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
    selectedPlayerId: null,
    lineupSelection: new Set(),
    liveMatch: null,
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
    const currentDate = state.calendar ? Engine.formatGameDate(state.calendar.currentDate) : "";
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
          <nav class="nav">
            ${NAV.map(([id, label]) => `<button class="${ui.screen === id ? "active" : ""}" ${ui.screen === id ? 'aria-current="page"' : ""} data-action="nav" data-screen="${id}">${label}</button>`).join("")}
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
            <div class="top-stats">
              <span class="pill blue">${Engine.formatMoney(club.balance)} balance</span>
              <span class="pill green">${Engine.formatMoney(club.transferBudget)} transfers</span>
              <span class="pill amber">${Engine.formatMoney(Engine.weeklyWageSpend(state, club.id))} / ${Engine.formatMoney(club.wageBudget)} wages</span>
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

  function renderScreen() {
    const title = NAV.find(([id]) => id === ui.screen);
    const heading = title ? title[1] : "Dashboard";
    const renderer = {
      dashboard: renderDashboard,
      squad: renderSquad,
      lineup: renderLineup,
      tactics: renderTactics,
      training: renderTraining,
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
      <div class="screen-body">${renderer()}</div>
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
      match: "Continue through the calendar and review matchday reports.",
      league: "Table, goal difference, points, and recent form.",
      transfers: "Scout, shortlist, buy, loan, sell, and manage offers.",
      scouting: "Reports become more accurate with repeated scouting.",
      stats: "League leaders, club leaders, and career production.",
      history: "Champions, awards, manager seasons, and league records.",
      finances: "Balance, budgets, wage pressure, and transfer movement.",
      manager: "Reputation, career history, trophies, and win percentage."
    };
    return copy[screen] || "";
  }

  function screenAction(screen) {
    if (screen === "dashboard" || screen === "match") {
      return `<button class="btn-green" data-action="simulate-round" ${ui.commentaryPlaying ? "disabled" : ""}>Continue Day</button>`;
    }
    if (screen === "lineup") {
      return `<button class="btn-primary" data-action="auto-lineup">Auto Select</button>`;
    }
    if (screen === "tactics") {
      return `<button class="btn-primary" data-action="auto-tactics">Auto Match Plan</button>`;
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
    const daysToNext = next && state.calendar ? Math.max(0, Engine.daysBetween(state.calendar.currentDate, next.date)) : null;
    const activeRow = table.find((row) => row.clubId === club.id);
    const squad = Engine.clubPlayers(state, club.id);
    const avgAge = round(avg(squad.map((player) => player.age)), 1);
    const avgAbility = round(avg(squad.map((player) => player.currentAbility)), 1);
    const last = state.lastMatch;
    const rank = activeRow ? table.indexOf(activeRow) + 1 : "-";

    return `
      <div class="dashboard-hero">
        <div class="hero-copy">
          <div class="eyebrow">Club control room</div>
          <h2>${escapeHtml(club.name)}</h2>
          <p>${next ? `Next up: ${escapeHtml(nextFixtureLabel(next))}.` : "The season is complete."} Keep scouting, refreshing the squad, and protecting the wage structure across the long save.</p>
        </div>
        <div class="hero-kpis">
          <div class="hero-kpi"><span>Position</span><strong>${activeRow ? ordinal(rank) : "-"}</strong></div>
          <div class="hero-kpi"><span>Points</span><strong>${activeRow ? activeRow.points : 0}</strong></div>
          <div class="hero-kpi"><span>Form</span><strong>${activeRow ? activeRow.form.join("") || "-" : "-"}</strong></div>
        </div>
      </div>
      ${renderActionQueue()}
      <div class="grid four section-gap">
        ${metric("Today", state.calendar ? Engine.formatGameDate(state.calendar.currentDate) : "-", next ? `${daysToNext} day${daysToNext === 1 ? "" : "s"} to match` : "Season complete")}
        ${metric("League Position", activeRow ? ordinal(rank) : "-", `${activeRow ? activeRow.points : 0} points`)}
        ${metric("Squad Ability", avgAbility, `${squad.length} players | ${avgAge} avg age`)}
        ${metric("Transfer Budget", Engine.formatMoney(club.transferBudget), `${Engine.formatMoney(club.balance)} balance`)}
      </div>
      <div class="grid three" style="margin-top:14px">
        <div class="panel">
          <h2 class="panel-title">Next Match</h2>
          ${next ? renderFixture(next) : `<div class="empty-state">No fixture available.</div>`}
          <div style="margin-top:12px">
            <button class="btn-green" data-action="simulate-round" ${ui.commentaryPlaying ? "disabled" : ""}>Continue Day</button>
          </div>
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

    return `
      <div class="grid four">
        ${metric("Available", availability.available, `${availability.total} player squad`)}
        ${metric("Injured", availability.injured, `${availability.suspended} suspended`)}
        ${metric("Fitness Watch", availability.lowFitness + availability.doubtful, `${availability.highRisk} high risk`)}
        ${metric("Prospects", development.prospects.length, `${development.risers.length} improving`)}
      </div>
      <div class="squad-insights">
        ${renderAvailabilityWatch(availability)}
        ${renderDevelopmentWatch(development)}
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
                  <strong>${escapeHtml(item.player.name)}</strong>
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
                  <strong>${escapeHtml(row.player.name)}</strong>
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
          <strong title="${escapeAttr(player.name)}">${escapeHtml(shortPlayerName(player.name))}</strong>
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

    return `
      <div class="grid four">
        ${metric("Formation", club.formation || "-", `${Data.FORMATIONS[club.formation] ? Data.FORMATIONS[club.formation].join(" ") : "XI"}`)}
        ${metric("Mentality", tacticLabel("mentality", club.tactics && club.tactics.mentality), tacticLabel("pressing", club.tactics && club.tactics.pressing))}
        ${metric("Intensity", profile.intensity, profile.fatigue > 1 ? "High player load" : "Managed load")}
        ${metric("Team Strength", round(strength.overall, 1), `${round(strength.attack, 1)} ATT | ${round(strength.defense, 1)} DEF`)}
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
          <h2 class="panel-title">Next Opposition</h2>
          ${next && opponent ? renderTacticalPreview(club, opponent, profile, opponentProfile, next) : `<div class="empty-state">No upcoming fixture.</div>`}
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

  function loadTone(load) {
    if (load <= 0.2) return "Rest";
    if (load < 0.7) return "Light";
    if (load < 1.35) return "Medium";
    if (load < 1.9) return "High";
    return "Heavy";
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
    const match = ui.liveMatch || state.lastMatch;
    const commentary = ui.liveMatch ? (ui.liveMatch.commentary || []).slice(0, ui.commentaryCount) : match ? (match.commentary || []) : [];
    const minute = match ? liveMatchMinute(match, commentary) : 0;
    const visibleGoals = match ? visibleMatchGoals(match, commentary, minute) : [];

    return `
      ${match ? renderLiveMatchCentre(match, minute, visibleGoals) : ""}
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
      ${match ? `<div class="grid two" style="margin-top:14px">${renderMatchStats(match)}${renderRatings(match, visibleGoals)}</div>${renderMatchAnalysis(match)}` : ""}
    `;
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
    const needReport = Engine.recruitmentNeedReport(state, club.id);
    const recommendations = Engine.recruitmentRecommendations(state, 8);
    const shortlist = Engine.shortlistPlayers(state);
    let players = marketPlayers();
    players = filterPlayers(players, ui.marketSearch, ui.marketPosition);
    players = filterMarketView(players, ui.marketView);
    players = sortPlayers(players, ui.marketSort, ui.marketDir);
    const offers = state.transfers.offers.filter((offer) => offer.status === "pending" && offer.type !== "outgoing");
    const negotiations = state.transfers.offers.filter((offer) => offer.status === "countered" && offer.type === "outgoing");

    return `
      ${renderRecruitmentCentre(needReport, recommendations, shortlist)}
      <div class="grid two">
        <div class="panel">
          <h2 class="panel-title">Incoming Offers</h2>
          ${offers.length ? renderIncomingOffers(offers) : `<div class="empty-state">No pending offers.</div>`}
        </div>
        <div class="panel">
          <h2 class="panel-title">Negotiations</h2>
          ${negotiations.length ? renderOutgoingNegotiations(negotiations) : `<div class="empty-state">No active negotiations.</div>`}
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

  function renderRecruitmentCentre(needReport, recommendations, shortlist) {
    const primary = needReport.primary;
    const topTarget = recommendations[0];
    const affordable = recommendations.filter((item) => item.recruitment.affordability.score >= 58).length;
    return `
      <div class="grid four">
        ${metric("Top Need", primary ? primary.position : "-", primary ? `${primary.status} | ${primary.reasons[0]}` : "Squad covered")}
        ${metric("Shortlist", shortlist.length, "Tracked targets")}
        ${metric("Top Target", topTarget ? topTarget.recruitment.score : "-", topTarget ? topTarget.player.name : "No targets")}
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
          <strong>${escapeHtml(item.player.name)}</strong>
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
          <strong>${escapeHtml(player.name)}</strong>
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
    const matchToday = next && state.calendar && Engine.daysBetween(state.calendar.currentDate, next.date) <= 0;
    const items = [
      ...(matchToday ? [["Matchday", nextFixtureLabel(next), "green"]] : []),
      ...injured.slice(0, 3).map((player) => ["Injury", `${player.name}: ${Engine.availabilityLabel(state, player)}`, "red"]),
      ...suspended.slice(0, 2).map((player) => ["Suspension", `${player.name}: ${Engine.playerAvailabilityStatus(state, player).detail}`, "red"]),
      ...expiring.slice(0, 3).map((player) => ["Contract", `${player.name}: ${player.contractYears} season${player.contractYears === 1 ? "" : "s"} left`, "amber"]),
      ...tired.slice(0, 3).map((player) => ["Fitness", `${player.name}: ${player.fitness}% fitness`, "amber"]),
      ...offers.slice(0, 3).map((offer) => ["Offer", `${Engine.getPlayer(state, offer.playerId)?.name || "Player"} bid from ${clubName(offer.fromClubId)}`, "blue"])
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
    const reports = Object.values(state.scouting.reports)
      .map((report) => ({ report, player: Engine.getPlayer(state, report.playerId) }))
      .filter((item) => item.player)
      .sort((a, b) => b.report.confidence - a.report.confidence);
    const recommendations = Engine.recruitmentRecommendations(state, 10).map((item) => item.player);

    return `
      <div class="grid three">
        <div class="panel">
          <h2 class="panel-title">Assignments</h2>
          ${renderScoutAssignments(state.scouting.assignments || [])}
        </div>
        <div class="panel">
          <h2 class="panel-title">Reports</h2>
          ${reports.length ? renderReportsTable(reports) : `<div class="empty-state">No reports yet.</div>`}
        </div>
        <div class="panel">
          <h2 class="panel-title">Recommended Targets</h2>
          ${renderRecommendationTable(recommendations)}
        </div>
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
    return `
      <div class="grid four">
        ${metric("Reputation", state.manager.reputation, "Manager profile")}
        ${metric("Trophies", state.manager.trophies, "League titles")}
        ${metric("Record", `${state.manager.wins}-${state.manager.draws}-${state.manager.losses}`, `${total} matches`)}
        ${metric("Win Rate", managerWinRate(), `${state.manager.goalsFor}:${state.manager.goalsAgainst} goals`)}
      </div>
      <div class="panel" style="margin-top:14px">
        <h2 class="panel-title">Career History</h2>
        ${state.manager.careerHistory.length ? renderManagerHistory() : `<div class="empty-state">Finish a season to create the first manager record.</div>`}
      </div>
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
              <th>Player</th><th>Pos</th><th>Age</th><th>Status</th><th>CA</th><th>PA</th><th>Dev</th><th>Value</th><th>Wage</th><th>Contract</th><th>Fitness</th><th>Sharp</th><th>Risk</th><th>Form</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${players.map((player) => {
              const report = context === "squad" ? Engine.playerDevelopmentReport(state, player.id) : null;
              const risk = report ? report.risk : Engine.injuryRiskLevel(state, player);
              return `
                <tr class="${ui.selectedPlayerId === player.id ? "highlight" : ""}">
                  <td><span class="player-name">${escapeHtml(player.name)}</span></td>
                  <td>${positionBadge(player.position)}</td>
                  <td>${player.age}</td>
                  <td>${statusBadge(player)}</td>
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
                <td><span class="player-name">${escapeHtml(item.playerName)}</span></td>
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
              <th>Player</th><th>Club</th><th>Pos</th><th>Age</th><th>Rec</th><th>Need</th><th>CA</th><th>PA</th><th>Scout</th><th>Afford</th><th>Value</th><th>Wage</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${players.map((player) => {
              const scout = Engine.getScoutView(state, player.id);
              const profile = Engine.recruitmentProfile(state, player.id);
              const recruitment = profile ? profile.recruitment : Engine.recruitmentTargetScore(state, player.id);
              const isFreeAgent = !player.clubId;
              const recTone = recruitment.score >= 78 ? "green" : recruitment.score >= 58 ? "blue" : recruitment.score >= 42 ? "amber" : "red";
              return `
                <tr>
                  <td><span class="player-name">${escapeHtml(player.name)}</span></td>
                  <td>${isFreeAgent ? `<span class="badge blue">Free Agent</span>` : escapeHtml(clubName(player.clubId))}</td>
                  <td>${positionBadge(player.position)}</td>
                  <td>${player.age}</td>
                  <td><span class="badge ${recTone}">${recruitment.score} | ${escapeHtml(recruitment.priority)}</span></td>
                  <td>${recruitment.need ? `<span class="badge ${recruitment.need.tone}">${recruitment.need.position}</span>` : "-"}</td>
                  <td>${scout.currentStars}</td>
                  <td>${scout.potentialStars}</td>
                  <td>${scout.confidence}%</td>
                  <td><span class="badge ${recruitment.affordability.tone}">${recruitment.affordability.label}</span></td>
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
    return `
      <div class="player-detail">
        <div>
          <div class="player-profile-head">
            <div>
              <h2 class="panel-title">${escapeHtml(player.name)}</h2>
              <div class="small-muted">${escapeHtml(player.nationality)} | ${escapeHtml(player.foot)} foot | ${player.height} cm</div>
            </div>
            <span class="badge ${availability.tone}">${escapeHtml(availability.label)}</span>
          </div>
          <div class="metric-grid">
            ${metric("Position", player.position, player.secondaryPositions.join(", ") || "No secondary")}
            ${metric("Age", player.age, `${report.stage} | ${player.weight} kg`)}
            ${metric("Ability", `${player.currentAbility} / ${player.potential}`, "Current / Potential")}
            ${metric("Development", developmentDeltaLabel(report.delta), `${report.growthRoom} growth room`)}
            ${metric("Fitness", `${player.fitness}%`, `${player.sharpness}% sharpness`)}
            ${metric("Risk", risk.label, risk.detail)}
          </div>
          <div class="player-management-grid">
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
          </div>
          <div class="progress-list player-stat-row">
            ${progressCard("Apps", stats.apps)}
            ${progressCard("Goals", stats.goals)}
            ${progressCard("Assists", stats.assists)}
          </div>
          <div class="profile-card-grid">
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
          ${player.source ? renderSourceStats(player.source) : ""}
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
    }
    return `
      <div class="fixture ${active ? "highlight" : ""}">
        ${fixture.date ? `<span class="fixture-date">${escapeHtml(Engine.formatGameDate(fixture.date))}</span>` : ""}
        <span class="home">${escapeHtml(home)}</span>
        <span class="score ${liveFixture ? "live" : ""}">${escapeHtml(score)}</span>
        <span class="away">${escapeHtml(away)}</span>
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
          <span class="pill blue">${escapeHtml(state.league.name)}</span>
          <span class="small-muted">Round ${match.round || "-"}${match.date ? ` | ${escapeHtml(Engine.formatGameDate(match.date))}` : ""}</span>
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
                <strong>${escapeHtml(scorer ? scorer.name : "Unknown Player")}</strong>
                ${assist ? `<small>Assist ${escapeHtml(assist.name)}</small>` : ""}
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
        ${metric("Man of Match", match.manOfMatch ? Engine.getPlayer(state, match.manOfMatch).name : "-", "Highest rating")}
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
          ${metric("Man of Match", match.manOfMatch ? Engine.getPlayer(state, match.manOfMatch).name : "-", "Highest rating")}
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
              <span>${escapeHtml(playerIn ? playerIn.name : "Player in")} for ${escapeHtml(playerOut ? playerOut.name : "Player out")}</span>
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
          ${motm ? `<span class="motm-chip">MOTM ${escapeHtml(motm.name)}</span>` : ""}
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
                  <strong>${escapeHtml(item.player.name)}</strong>
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
                  <td>${player ? escapeHtml(player.name) : "Unknown"}</td>
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
                  <td>${player ? escapeHtml(player.name) : "Unknown"}</td>
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

  function renderScoutAssignments(assignments) {
    const visible = assignments.slice(0, 8);
    if (!visible.length) return `<div class="empty-state">Assign scouts from the market to build confidence over two in-game weeks.</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Player</th><th>Status</th><th>Remaining</th><th>Confidence</th></tr></thead>
          <tbody>
            ${visible.map((assignment) => {
              const player = Engine.getPlayer(state, assignment.playerId);
              const report = player ? Engine.getScoutView(state, player.id) : null;
              return `
                <tr>
                  <td>${player ? escapeHtml(player.name) : "Unknown"}</td>
                  <td>${assignment.status === "active" ? `<span class="badge blue">Active</span>` : `<span class="badge green">Complete</span>`}</td>
                  <td>${assignment.status === "active" ? `${assignment.daysRemaining !== undefined ? assignment.daysRemaining : (assignment.roundsRemaining || 0) * 7} days` : "-"}</td>
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
                <td>${escapeHtml(player.name)}</td>
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
                  <td>${escapeHtml(player.name)}</td>
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
              <tr><td>${escapeHtml(player.name)}</td><td>${positionBadge(player.position)}</td><td>${Engine.formatMoney(player.wage)}</td><td>${Engine.formatMoney(player.value)}</td></tr>
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
    if (ui.modal.type === "offer") {
      const player = Engine.getPlayer(state, ui.modal.playerId);
      if (!player) return "";
      const isFreeAgent = !player.clubId;
      const suggestedFee = isFreeAgent ? 0 : ui.modal.fee || Math.round(player.value * 1.05);
      const suggestedWage = ui.modal.wage || Math.round(player.wage * 1.08);
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
              <div class="field">
                <label for="offer-fee">Transfer Fee</label>
                <input id="offer-fee" type="number" min="0" step="25000" value="${suggestedFee}" ${isFreeAgent ? "disabled" : ""}>
              </div>
              <div class="field">
                <label for="offer-wage">Weekly Wage</label>
                <input id="offer-wage" type="number" min="0" step="5000" value="${suggestedWage}">
              </div>
              <div class="message">${isFreeAgent ? "No transfer fee required" : `Value ${Engine.formatMoney(player.value)}`} | Current wage ${Engine.formatMoney(player.wage)}</div>
              <button class="btn-primary" data-action="submit-offer" data-player-id="${player.id}">${isFreeAgent ? "Submit Contract" : "Submit Offer"}</button>
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
      ui.screen = ui.screen === "transfers" || ui.screen === "scouting" ? "squad" : ui.screen;
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
    if (action === "auto-training") {
      const result = Engine.autoSetTrainingPlan(state, state.activeClubId);
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
    if (target.dataset.action === "set-tactic") {
      const result = Engine.setTactic(state, state.activeClubId, target.dataset.tacticKey, target.value);
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
  }

  function simulateRound() {
    if (ui.commentaryPlaying) return;
    const result = Engine.simulateNextDay(state);
    Storage.save(state);
    syncLineupSelection();
    if (!result.activeMatch) {
      ui.liveMatch = null;
      ui.commentaryCount = 0;
      if (result.seasonEnded && result.seasonSummary) {
        toast(`${result.seasonSummary.championName} won Season ${result.seasonSummary.season}.`, "good");
      } else {
        toast(`${Engine.formatGameDate(result.date)} complete.`, result.matchday ? "good" : "warn");
      }
      render();
      return;
    }
    ui.screen = "match";
    ui.liveMatch = result.activeMatch;
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
      render();
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
    return `${activeHome ? "Home" : "Away"} vs ${opponent}${date}`;
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

  function shortPlayerName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(" ");
    return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
  }

  function progressCard(label, value) {
    return `<div class="progress-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(String(value))}</span></div>`;
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
      released: "Released"
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
              <span>${escapeHtml(player.name)}<br><span class="small-muted">${escapeHtml(clubName(player.clubId))}</span></span>
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
