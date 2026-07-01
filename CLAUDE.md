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

## Recent Commits

- `0609255` Add player development and availability systems
- `3355836` Add recruitment centre and shortlist

The current uncommitted phase before this document was Transfer Windows + Pre-Agreements.

## Current Roadmap

### Next Phase: Deadline Day + Negotiations 2.0

Planned work:

- Dedicated deadline-day panel when a window has 0-1 days remaining.
- More AI market activity on deadline day.
- Negotiation profile for each target:
  - selling club stance
  - asking price
  - player interest
  - estimated wage demand
  - reasons for counter-offers
- Better offer modal:
  - suggested fee
  - suggested wage
  - seller stance
  - player interest
  - affordability warnings
  - window registration note
- More realistic counter-offers:
  - selling club may reject outright
  - player can reject due to reputation, wage, role, or club quality
  - stronger counter reasons

### Later Phases

- AI club transfers between non-user clubs.
- Transfer rumors and news feed.
- Contract expiry market opportunities.
- Player morale and playing-time promises.
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

