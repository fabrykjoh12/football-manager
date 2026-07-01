const assert = require("node:assert/strict");

const Data = require("../src/data.js");
global.FMLData = Data;
require("../src/premier-league-data.js");
const Engine = require("../src/engine.js");

function simulateSeason(save) {
  const season = save.season;
  while (save.season === season) {
    Engine.simulateNextRound(save);
  }
}

function goalsPerGame(history) {
  const goals = history.standings.reduce((sum, row) => sum + row.goalsFor, 0);
  const fixtures = history.standings.reduce((sum, row) => sum + row.played, 0) / 2;
  return goals / fixtures;
}

function firstActiveMatch(seed) {
  const save = Engine.createNewSave({ selectedClubId: "pl-ars", seed });
  const result = Engine.simulateNextRound(save).activeMatch;
  return {
    score: [result.homeGoals, result.awayGoals],
    stats: result.stats,
    goals: result.goals,
    events: result.events.map((event) => ({ minute: event.minute, type: event.type, playerId: event.playerId, outcome: event.outcome }))
  };
}

function averageFitness(save) {
  return Engine.clubPlayers(save, save.activeClubId).reduce((sum, player) => sum + player.fitness, 0) / Engine.clubPlayers(save, save.activeClubId).length;
}

function continueUntilActiveMatch(save, limit = 80) {
  for (let i = 0; i < limit; i += 1) {
    const result = Engine.simulateNextDay(save);
    if (result.activeMatch) return result;
  }
  return null;
}

function run() {
  assert.deepEqual(firstActiveMatch(9876), firstActiveMatch(9876), "Same seed should produce the same first match");

  const lowPress = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 4321 });
  const highPress = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 4321 });
  Engine.setTactic(lowPress, lowPress.activeClubId, "pressing", "regroup");
  Engine.setTactic(highPress, highPress.activeClubId, "pressing", "relentless");
  Engine.simulateNextRound(lowPress);
  Engine.simulateNextRound(highPress);
  assert.ok(averageFitness(highPress) < averageFitness(lowPress), "Relentless pressing should cost more fitness");

  const save = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 1234 });
  assert.equal(save.league.clubs.length, 20, "Premier League should contain 20 clubs");
  assert.equal(Object.keys(save.players).length, 480, "Seed should create 480 senior players");
  assert.equal(save.league.schedule.length, 38, "Premier League season should have 38 rounds");
  assert.equal(save.league.schedule[0].fixtures.length, 10, "Each round should contain 10 fixtures");
  assert.ok(save.calendar.currentDate, "New saves should include a current calendar date");
  assert.ok(save.league.schedule[0].date, "Rounds should have match dates");
  assert.equal(save.league.schedule[0].fixtures[0].date, save.league.schedule[0].date, "Fixtures should inherit round dates");
  const legacySave = Engine.cloneState(save);
  legacySave.version = "1.2.0";
  delete legacySave.league.clubs[0].tactics;
  assert.equal(Engine.migrateState(legacySave).league.clubs[0].tactics.focus, "mixed", "Migration should backfill club tactics");

  const activeClub = Engine.getClub(save, save.activeClubId);
  assert.equal(activeClub.tactics.mentality, "balanced", "New saves should include default tactics");
  assert.equal(activeClub.bench.length, 7, "New saves should include a seven-player bench");
  assert.equal(activeClub.bench.some((id) => activeClub.lineup.includes(id)), false, "Bench should not overlap the starting XI");
  const tactic = Engine.setTactic(save, activeClub.id, "pressing", "high");
  assert.equal(tactic.ok, true, "Tactic settings should be editable");
  assert.equal(activeClub.tactics.pressing, "high", "Tactic change should persist");
  assert.ok(Engine.tacticalProfile(activeClub).intensity > 50, "High pressing should increase tactical intensity");
  const autoPlan = Engine.autoSetTactics(save, activeClub.id);
  assert.equal(autoPlan.ok, true, "Auto match plan should generate tactics");
  assert.ok(activeClub.tactics.focus, "Auto match plan should keep a valid attacking focus");

  const injuredStarter = Engine.getPlayer(save, activeClub.lineup[0]);
  injuredStarter.injury = {
    type: "Test knock",
    returnSeason: save.season,
    returnRound: save.league.currentRound + 4,
    fixtureId: "test"
  };
  const nextLineup = Engine.autoSelectLineup(save, activeClub.id);
  assert.equal(nextLineup.includes(injuredStarter.id), false, "Auto lineup should exclude injured players");
  assert.equal(Engine.autoSelectBench(save, activeClub.id).includes(injuredStarter.id), false, "Auto bench should exclude injured players");

  const expiringPlayer = Engine.clubPlayers(save, save.activeClubId).find((player) => player.contractYears <= 1) || Engine.clubPlayers(save, save.activeClubId)[0];
  expiringPlayer.contractYears = 1;
  const renewal = Engine.renewContract(save, expiringPlayer.id);
  assert.equal(renewal.ok, true, "Contract renewal should succeed for own player when wage room exists");
  assert.ok(expiringPlayer.contractYears >= 2, "Renewal should extend the contract");

  const trainingPlayer = Engine.clubPlayers(save, save.activeClubId)[1];
  const training = Engine.setTrainingFocus(save, trainingPlayer.id, "playmaking");
  assert.equal(training.ok, true, "Training focus should be settable for own players");
  assert.equal(trainingPlayer.trainingFocus, "playmaking", "Training focus should persist on the player");

  const dailySave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 7777 });
  const dailyClub = Engine.getClub(dailySave, dailySave.activeClubId);
  dailyClub.squad.forEach((id) => {
    Engine.getPlayer(dailySave, id).fitness = 55;
  });
  const firstFixture = Engine.getNextFixture(dailySave, dailySave.activeClubId);
  const firstDate = dailySave.calendar.currentDate;
  const dailyResult = Engine.simulateNextDay(dailySave);
  assert.equal(dailyResult.activeMatch, null, "A non-match day should not create an active match");
  assert.equal(dailySave.calendar.currentDate, "2026-07-02", "Daily progression should advance the date");
  assert.ok(averageFitness(dailySave) > 55, "Daily progression should recover player fitness");
  const matchdayResult = continueUntilActiveMatch(dailySave);
  assert.ok(matchdayResult && matchdayResult.activeMatch, "Daily progression should eventually reach the active club match");
  assert.equal(matchdayResult.date, firstFixture.date, "The active match should be played on its fixture date");
  assert.ok(Engine.daysBetween(firstDate, firstFixture.date) > 0, "The first fixture should be scheduled after preseason begins");

  const transferTarget = save.transfers.marketIds.map((id) => Engine.getPlayer(save, id)).find((player) => player && player.clubId);
  Engine.getClub(save, save.activeClubId).transferBudget = 100000000;
  Engine.getClub(save, save.activeClubId).wageBudget = 5000000;
  const lowOffer = Engine.makeTransferOffer(save, transferTarget.id, 1, 1);
  assert.equal(lowOffer.ok, false, "Low offer should not immediately complete");
  assert.ok(lowOffer.negotiationId, "Low offer should open a counter negotiation");
  const counter = Engine.acceptCounterOffer(save, lowOffer.negotiationId);
  assert.equal(counter.ok, true, "Affordable counter offer should be acceptable");
  assert.equal(Engine.getPlayer(save, transferTarget.id).clubId, save.activeClubId, "Accepted counter should transfer the player");

  const scoutTarget = save.transfers.marketIds.map((id) => Engine.getPlayer(save, id)).find((player) => player && player.clubId && player.clubId !== save.activeClubId);
  const assignment = Engine.assignScout(save, scoutTarget.id);
  assert.equal(assignment.ok, true, "Scout assignment should be created");

  const roundResult = Engine.simulateNextRound(save);
  assert.ok(roundResult.activeMatch.tactics, "Played matches should store tactic snapshots");
  assert.ok(roundResult.activeMatch.events.length > 0, "Deep match engine should return structured events");
  assert.ok(roundResult.activeMatch.playerStats, "Deep match engine should return player match stats");
  assert.ok(Array.isArray(roundResult.activeMatch.substitutions), "Deep match engine should return substitutions");
  assert.ok(roundResult.activeMatch.analysis.summary, "Deep match engine should explain the result");
  assert.ok(roundResult.activeMatch.stats.passAccuracy.home >= 55, "Tactics should preserve plausible passing stats");

  const subSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 2468 });
  const subClub = Engine.getClub(subSave, subSave.activeClubId);
  subClub.lineup.forEach((id) => {
    Engine.getPlayer(subSave, id).fitness = 32;
  });
  subClub.bench.forEach((id) => {
    Engine.getPlayer(subSave, id).fitness = 96;
  });
  const subMatch = Engine.simulateNextRound(subSave).activeMatch;
  const activeSub = subMatch.substitutions.find((substitution) => substitution.teamId === subSave.activeClubId);
  assert.ok(activeSub, "Low-fitness starters should trigger an active-club substitution");
  assert.ok(subMatch.events.some((event) => event.type === "substitution"), "Substitutions should be emitted as match events");
  assert.ok(subMatch.playerStats[activeSub.playerInId].minutes > 0 && subMatch.playerStats[activeSub.playerInId].minutes < 90, "Substitute minutes should be tracked");

  simulateSeason(save);
  const history = save.league.history[0];
  assert.equal(history.fixtures.length, 38, "Completed season should archive all rounds");
  assert.equal(history.fixtures.reduce((sum, round) => sum + round.fixtures.length, 0), 380, "Completed season should archive all fixtures");
  assert.ok(history.standings[0].points >= 70, "Champion points should be plausible");
  assert.ok(goalsPerGame(history) >= 2.1 && goalsPerGame(history) <= 3.4, "Goals per game should stay within a plausible range");
  assert.equal(Object.values(save.players).filter((player) => !player.clubId).length, 0, "First rollover should not dump expiring contracts immediately");
  assert.ok(Object.values(save.players).some((player) => player.careerTotals.injuries > 0), "Season should produce some injuries");
  assert.equal(save.scouting.assignments[0].status, "complete", "Scouting assignment should complete after enough rounds");
  assert.ok(save.scouting.reports[scoutTarget.id].confidence > 50, "Scouting assignment should increase report confidence");

  simulateSeason(save);
  assert.ok(save.transfers.history.length > 0, "Second rollover should create contract/free-agent transfer history");
  assert.ok(Object.values(save.players).filter((player) => !player.clubId).length > 0, "Expired contracts should eventually create free agents");
}

run();
console.log("engine regression tests passed");
