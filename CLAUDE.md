# Football Manager Web Game

## Project Snapshot

This is a static browser-based football management game in `C:\Users\fabry\Documents\football manager`.

The app currently uses plain HTML, CSS, and JavaScript:

- `index.html` loads the app.
- `src/app.js` owns rendering, UI state, events, drag/drop, modals, and browser interactions.
- `src/engine.js` owns save creation, calendar progression, squads, tactics, training, transfers, scouting, contracts, finance, player development, and season rollover.
- `src/match-engine.js` owns the deeper match simulation, events, substitutions, player ratings, momentum, xG, and match analysis.
- `src/data.js` contains formations, attributes, tactics, generated data, and shared constants.
- `src/premier-league-data.js` contains the Premier League real-world seed data.
- `src/storage.js` handles local save import/export and localStorage.
- `styles.css` contains the design system and all app styling.
- `tests/engine-regression.test.cjs` is the main regression test suite.

Run checks with:

```powershell
node --check src\app.js
node --check src\engine.js
node tests\engine-regression.test.cjs
```

For browser smoke tests, serve the folder:

```powershell
C:\Python314\python.exe -m http.server 5177 --bind 127.0.0.1
```

Then open `http://127.0.0.1:5177/`.

## Product Direction

The goal is a premium browser football-management game inspired by Football Manager, FotMob, modern SaaS dashboards, and real Premier League data.

Design target:

- Professional, dense, premium app shell.
- Useful first screen, not a marketing page.
- No chaotic effects.
- Responsive layouts for desktop and mobile.
- Clean tables, cards, modals, forms, tabs, dashboards, and empty states.
- Game systems should connect to each other: training affects fitness and development, fitness affects selection and injuries, recruitment responds to squad needs, transfer windows create season rhythm.

## Major Work Completed

### Core Game Foundation

- Static web app with local save/load/import/export.
- Premier League season structure with 20 clubs.
- Real-world Premier League club and player seed data.
- League table, fixtures, season history, records, finances, manager record, inbox, and statistics.
- Transfer market, scouting reports, offers, negotiations, loans, free agents, contracts, and transfer history.

### Premium UI/UX Pass

- Professional dashboard/app shell.
- Responsive panels, tables, toolbar controls, cards, badges, metrics, modals, and toast messages.
- Light/dark mode support.
- More consistent spacing, borders, shadows, typography, and hierarchy.

### Match Engine + Live Matchday

- Deeper match simulation with xG, events, possession, shots, cards, mistakes, saves, set pieces, momentum, and tactical analysis.
- Live match centre with progressive commentary.
- Live score updates while simulating.
- Visible scorers and assists as goals happen.
- FotMob-style player ratings and match statistics.
- Substitutions and bench involvement.
- Live match updates now refresh only the match content area during playback, preventing screen blink from repeated page animations.

### Lineup + Tactics

- Formation-based lineup screen.
- Players placed on a pitch according to the selected formation.
- Drag-and-drop movement between starting XI, bench, and squad pool.
- Formation selector.
- Bench selection.
- Auto-select lineup and bench.
- Tactical controls with effects and opposition preview.

### Day-by-Day Simulation

- Calendar starts at preseason and advances one day at a time.
- Fixture dates are assigned.
- Matchdays are triggered by calendar date.
- Fitness, sharpness, scouting assignments, transfer activity, training, and fixture simulation advance through daily progression.
- Continue Day now advances through quiet days until a match, inbox event, transfer story, offer, market move, or season end.
- Daily club events can now create training, morale, media, or minor-knock stories that affect players.

### FC26 Ratings + Player Profiles

- Added a compact EA SPORTS FC 26 Premier League ratings overlay from EA's public ratings page.
- Matched players receive FC26-style OVR/PAC/SHO/PAS/DRI/DEF/PHY values and more realistic current ability.
- Unmatched players receive generated EAFC-style projection stats from internal attributes.
- Lineups, tables, ratings, leaders, scouting, transfers, and match-centre names now use common football display names.
- Player profiles keep full names and show FC26-style stats, source/FPL stats where available, attributes, role fit, career history, and development.
- Player profile modals are available from profile-name buttons across the app.
- Existing saves migrate display names and FC26-style metadata.

### Training + Match Preparation

- Weekly training plans: Balanced, Recovery, Tactical, Attacking, Defensive, Physical.
- Match prep: Balanced, Defensive Shape, Attacking Patterns, Set Pieces, Pressing Traps.
- Match-prep familiarity affects tactical/match simulation phase strengths.
- Training calendar screen with upcoming sessions.
- Training reports with fitness, sharpness, injuries, and development gains.
- Staff recommendations based on fatigue, injuries, fixture distance, and match prep familiarity.

### Player Development + Availability

- Player profile upgraded with status, role fit, top attributes, development stage, potential progress, recent development events, and career history.
- Individual plans: Normal, Recovery, Extra Development, Rehab.
- Rest/Rehab quick action.
- Training growth can improve player attributes and record development events.
- Injury risk model based on fitness, workload, age, history, and physical attributes.
- Availability states: Available, Doubtful, Low Fitness, Injured, Suspended, Out of Contract, Expiring.
- Suspensions from cards affect selection.
- Auto lineup/bench excludes unavailable players.
- Squad screen includes availability watch, development watch, filters, risk badges, sharpness, and development delta.

### Recruitment Centre + Shortlist

- Recruitment centre on the Transfers screen.
- Squad-needs analysis by position, based on depth, availability, quality, age, injuries, and expiring contracts.
- Target scoring based on need fit, ability, potential, age, affordability, scout confidence, and injury risk.
- Shortlist with add/remove actions.
- Market views: All Targets, Recommended, Shortlist, Affordable, Free Agents, Prospects, Scouted.
- Market sorting by recruitment score and scout confidence.
- Richer transfer market rows with recruitment score, need fit, scout confidence, affordability, value, and wage.
- Scouting recommendations now use recruitment fit, not only potential gap.

### Transfer Windows + Pre-Agreements

- Summer and January transfer windows.
- Transfer window status is calendar-aware.
- Transfers, free-agent signings, loans, accepted counters, and accepted incoming offers respect window status.
- Accepted deals outside an open window become pre-agreements.
- Pre-agreements register automatically when the next window opens.
- Pre-agreements can fail if the player changes clubs or budgets no longer work.
- Transfer page has a window banner and pre-agreements panel.
- Offer modal explains whether the deal registers immediately or becomes a pre-agreement.
- Deadline-day AI offer activity is boosted.

### Deadline Day + Negotiations 2.0

- Dedicated deadline-day strip on the Transfers screen when a window has 0-1 days remaining.
- Deadline panel shows pending offers, active negotiations, and pre-agreements.
- Negotiation profile for each target:
  - selling club stance
  - player interest
  - suggested transfer fee
  - suggested wage
  - affordability and registration warnings
- Transfer market rows show player interest.
- Offer modal now explains stance, interest, suggested fee, suggested wage, and window registration outcome.
- Engine regression tests cover negotiation profile output and deadline-day detection.

### AI Club Movement + Transfer News

- AI clubs can complete non-user transfers during open transfer windows.
- AI buyer logic checks squad needs, transfer budget, wage room, seller depth, player age, ability, potential, and contract leverage.
- AI movement avoids directly moving players in or out of the user's club.
- Free agents can be signed by AI clubs when they fit a squad need and wage budget.
- Completed transfers now create structured transfer news items.
- High-profile non-user deals create inbox market-news messages.
- Transfers screen has a latest-news panel with deals, rumors, free-agent moves, dates, fees, and context.
- Daily simulation can surface AI market activity during transfer windows, with more activity on deadline day.

### Transfer News 2.0 + AI Market Polish

- AI clubs can now complete non-user loan moves for prospects, backups, and short-term squad cover.
- AI loan logic protects established first-team players by checking seller depth, role rank, ability, real-world starts/minutes/cost, and development profile.
- Daily market activity can produce permanent transfers, loans, bids, failed bids, rumors, loan rumors, free-agent moves, and deadline-day market stories.
- AI buyer urgency now factors squad need, injuries, low fitness, fixture congestion, league pressure, reputation, and budget flexibility.
- Rival clubs and major moves can create inbox alerts.
- Transfer news labels now distinguish bids, failed bids, loan rumors, and deadline stories.
- Regression tests cover AI loan movement, parent-club tracking, loan history, and loan news.

## Recent Commits

- `0609255` Add player development and availability systems
- `3355836` Add recruitment centre and shortlist
- `7f60dbd` Add transfer windows and project roadmap
- `402c010` Add negotiation intelligence and deadline day panel
- `8b9be63` Add AI transfer activity and market news
- `4137c9d` Expand AI loan market and transfer news

The latest completed feature phase is FC26 Ratings + Player Profiles.

## Current Roadmap

### Next Phase: Contracts + Morale

Planned work:

- Contract expiry market opportunities.
- Player morale and playing-time promises.
- Richer player contract negotiation reasons.
- Squad happiness affected by minutes, role, results, injuries, and transfer speculation.
- Inbox stories for unhappy players, expiring contracts, and promise pressure.

### Later Phases

- Youth academy and intake.
- Staff hiring and scouting network.
- More detailed tactics roles/instructions.
- Cup competitions.
- European qualification.
- Save versioning and migration tests for more old-save shapes.
- Better mobile layout QA.

## Engineering Notes

- Keep features connected to existing systems instead of adding isolated UI.
- Preserve local save compatibility through `migrateState`.
- Add engine regression coverage for new rules.
- Prefer small product-complete slices: engine logic, UI surface, tests, browser smoke.
- Do not add frontend dependencies unless the project is intentionally migrated from static JS to a bundler/framework.
- Use `apply_patch` for manual edits.
- Avoid unrelated refactors when adding features.
