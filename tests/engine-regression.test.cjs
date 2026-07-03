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
  const leaguePlayerCount = save.league.clubs.reduce((sum, club) => sum + club.squad.length, 0);
  assert.equal(leaguePlayerCount, 480, "Seed should create 480 Premier League senior players");
  assert.ok(Object.keys(save.players).length > leaguePlayerCount, "European pool should add continental squads outside the league");
  assert.equal(save.league.schedule.length, 38, "Premier League season should have 38 rounds");
  assert.equal(save.league.schedule[0].fixtures.length, 10, "Each round should contain 10 fixtures");
  assert.ok(save.calendar.currentDate, "New saves should include a current calendar date");
  assert.ok(Array.isArray(save.transfers.news), "New saves should include a transfer news feed");
  assert.ok(save.academy && save.academy.prospects.length >= 8, "New saves should start with an academy group");
  assert.ok(Engine.academyReport(save).prospects.length >= 8, "Academy reports should expose prospects");
  assert.ok(save.league.schedule[0].date, "Rounds should have match dates");
  assert.equal(save.league.schedule[0].fixtures[0].date, save.league.schedule[0].date, "Fixtures should inherit round dates");
  const saka = Object.values(save.players).find((player) => player.name === "Bukayo Saka");
  assert.ok(saka, "Premier League seed should include real Arsenal players");
  assert.equal(Engine.playerDisplayName(saka), "Saka", "Lineup display names should use common football names");
  assert.equal(saka.currentAbility, 88, "Rating overlay should update matched current ability");
  assert.equal(saka.potential, 90, "Matched rating overlay should update player potential");
  const sakaFc26 = Engine.fc26StyleStats(saka);
  assert.equal(sakaFc26.matched, true, "Matched players should keep rating metadata");
  assert.equal(sakaFc26.ovr, 88, "Rating profile should expose overall rating");
  assert.equal(sakaFc26.pot, 90, "Rating profile should expose potential");
  assert.equal(sakaFc26.pac, 84, "Rating profile should expose pace rating");
  assert.equal(saka.squadRole, "star", "Elite real-world starters should receive star-player roles");
  assert.ok(Engine.playerHappinessReport(save, saka.id).score >= 50, "Early-season happiness should not punish players before matches are played");
  const roleChange = Engine.setSquadRole(save, saka.id, "important");
  assert.equal(roleChange.ok, true, "Squad roles should be editable for own players");
  assert.equal(saka.squadRole, "important", "Squad role changes should persist");
  Engine.setSquadRole(save, saka.id, "star");
  const legacySave = Engine.cloneState(save);
  legacySave.version = "1.2.0";
  legacySave.players[saka.id].ratingModelVersion = 3;
  legacySave.players[saka.id].potential = 96;
  delete legacySave.league.clubs[0].tactics;
  delete legacySave.league.clubs[0].staff;
  delete legacySave.league.clubs[0].roleAssignments;
  delete legacySave.board;
  delete legacySave.cups;
  delete legacySave.europe;
  const migratedLegacy = Engine.migrateState(legacySave);
  assert.equal(migratedLegacy.league.clubs[0].tactics.focus, "mixed", "Migration should backfill club tactics");
  assert.ok(migratedLegacy.league.clubs[0].staff.coaching, "Migration should backfill staff departments");
  assert.equal(Object.keys(migratedLegacy.league.clubs[0].roleAssignments).length, 11, "Migration should backfill tactical roles");
  assert.ok(migratedLegacy.board && migratedLegacy.board.objectives.league, "Migration should backfill board objectives");
  assert.ok(migratedLegacy.cups && migratedLegacy.cups.domestic.rounds.length > 0, "Migration should backfill domestic cup state");
  assert.ok(migratedLegacy.europe && migratedLegacy.europe.competition.rounds.length > 0, "Migration should backfill European competition state");
  assert.ok(migratedLegacy.academy.prospects.length > 0, "Migration should backfill academy state");
  assert.ok(migratedLegacy.loanClubs && migratedLegacy.loanClubs.length >= 4, "Migration should backfill youth loan destinations");
  assert.equal(Object.keys(migratedLegacy.league.clubs[0].playerInstructions).length, 11, "Migration should backfill player instruction slots");
  assert.equal(migratedLegacy.players[saka.id].potential, 90, "Migration should reapply matched player potentials");

  const academySave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 3030 });
  const academyProspect = Engine.academyReport(academySave).prospects[0].prospect;
  assert.equal(Engine.setAcademyPlan(academySave, academyProspect.id, "technical").ok, true, "Academy plans should be editable");
  assert.equal(academyProspect.trainingPlan, "technical", "Academy plan changes should persist");
  const promotion = Engine.promoteAcademyProspect(academySave, academyProspect.id);
  assert.equal(promotion.ok, true, "Academy prospects should be promotable");
  assert.ok(Engine.getClub(academySave, academySave.activeClubId).squad.includes(promotion.playerId), "Promoted academy players should join the senior squad");
  assert.equal(Engine.getPlayer(academySave, promotion.playerId).squadRole, "prospect", "Promoted academy players should join as prospects");
  assert.ok(Engine.pathwayPromiseReport(academySave, promotion.playerId), "Promoted academy players should receive a pathway promise");

  const pathwaySave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 3031 });
  const pathwayProspect = Engine.academyReport(pathwaySave).prospects.find((row) => row.prospect.age >= 16).prospect;
  const pathwayPromotion = Engine.promoteAcademyProspect(pathwaySave, pathwayProspect.id);
  const pathwayPlayer = Engine.getPlayer(pathwaySave, pathwayPromotion.playerId);
  const pathwayReport = Engine.youthPathwayReport(pathwaySave);
  const pathwayCandidate = pathwayReport.candidates.find((row) => row.player.id === pathwayPlayer.id);
  assert.ok(pathwayCandidate && pathwayCandidate.bestDestination, "Youth pathway report should recommend loan destinations");
  assert.ok(pathwayCandidate.bestDestination.playingTime > 0 && pathwayCandidate.bestDestination.roleFit > 0, "Loan destination fit should score playing time and tactical role");
  const outgoingLoan = Engine.loanOutYouthPlayer(pathwaySave, pathwayPlayer.id, pathwayCandidate.bestDestination.destinationId);
  assert.equal(outgoingLoan.ok, true, "Youth prospects should be loanable to a recommended destination");
  assert.equal(pathwayPlayer.parentClubId, pathwaySave.activeClubId, "Outgoing loan should keep the parent club");
  assert.notEqual(pathwayPlayer.clubId, pathwaySave.activeClubId, "Outgoing loan should move the player out of the senior squad");
  assert.ok(Engine.playerLoanReport(pathwaySave, pathwayPlayer.id), "Outgoing loans should be reportable from player profiles");
  const activeLoan = pathwaySave.transfers.outgoingLoans[0];
  activeLoan.fitScore = 90;
  activeLoan.appearances = 24;
  activeLoan.starts = 20;
  activeLoan.minutes = 1720;
  activeLoan.ratingApps = 24;
  activeLoan.ratingTotal = 24 * 7.2;
  activeLoan.averageRating = 7.2;
  Engine.finishSeason(pathwaySave);
  assert.equal(pathwayPlayer.clubId, pathwaySave.activeClubId, "Loaned prospects should return to the parent club at rollover");
  assert.equal(activeLoan.status, "complete", "Outgoing loans should complete at season rollover");
  assert.equal(pathwayPlayer.promises.pathway.status, "fulfilled", "Successful loan spells should fulfil pathway promises");

  const activeClub = Engine.getClub(save, save.activeClubId);
  assert.equal(activeClub.tactics.mentality, "balanced", "New saves should include default tactics");
  assert.equal(activeClub.bench.length, 7, "New saves should include a seven-player bench");
  assert.equal(activeClub.bench.some((id) => activeClub.lineup.includes(id)), false, "Bench should not overlap the starting XI");
  assert.equal(activeClub.trainingPlan, "balanced", "New saves should include a weekly training plan");
  assert.equal(activeClub.matchPrep, "balanced", "New saves should include match preparation");
  assert.ok(save.board && save.board.objectives.league, "New saves should include board objectives");
  const board = Engine.boardReport(save);
  assert.ok(board.objectives.length >= 6, "Board reports should include all core objectives");
  assert.ok(board.objectives.some((objective) => objective.key === "europe"), "European qualifiers should receive a European board objective");
  assert.ok(board.confidence >= 1 && board.confidence <= 100, "Board confidence should be scored");
  const cup = Engine.domesticCupReport(save);
  assert.equal(cup.rounds.length, Engine.DOMESTIC_CUP_ROUNDS.length, "Domestic cup should include all configured rounds");
  assert.equal(cup.rounds[0].fixtures.length, 4, "Domestic cup should start with four play-off ties");
  const europe = Engine.europeanReport(save);
  assert.equal(europe.rounds.length, Engine.EUROPEAN_ROUNDS.length, "European competition should include every configured round");
  assert.equal(europe.teams.length, 8, "European competition should start with an eight-club field");
  assert.equal(europe.rounds[0].fixtures.length, 4, "European group matchdays should contain four fixtures");
  assert.ok(activeClub.staff && activeClub.staff.coaching, "New saves should include staff departments");
  const staffReport = Engine.staffRoomReport(save, activeClub.id);
  assert.equal(staffReport.departments.length, Object.keys(Engine.STAFF_DEPARTMENTS).length, "Staff reports should include every department");
  const staffUpgradeTarget = staffReport.departments.find((department) => !department.maxed);
  assert.ok(staffUpgradeTarget, "At least one staff department should be upgradeable in a new save");
  const staffLevelBefore = activeClub.staff[staffUpgradeTarget.key].level;
  const balanceBeforeStaffUpgrade = activeClub.balance;
  const staffUpgrade = Engine.upgradeStaffDepartment(save, activeClub.id, staffUpgradeTarget.key);
  assert.equal(staffUpgrade.ok, true, "Staff departments should be upgradeable when the club can pay");
  assert.equal(activeClub.staff[staffUpgradeTarget.key].level, staffLevelBefore + 1, "Staff upgrade should increase department level");
  assert.ok(activeClub.balance < balanceBeforeStaffUpgrade, "Staff upgrade should spend club balance");
  const roleReport = Engine.tacticalRoleReport(save, activeClub.id);
  assert.equal(roleReport.slots.length, 11, "Tactical role reports should include the starting XI");
  assert.ok(roleReport.averageFit > 0, "Tactical role reports should calculate fit");
  const editableRoleSlot = roleReport.slots.find((slot) => slot.options.some((option) => option.key !== slot.roleKey));
  assert.ok(editableRoleSlot, "At least one tactical slot should have alternative role options");
  const alternativeRole = editableRoleSlot.options.find((option) => option.key !== editableRoleSlot.roleKey);
  const tacticalRoleChange = Engine.setTacticalRole(save, activeClub.id, editableRoleSlot.slotIndex, alternativeRole.key);
  assert.equal(tacticalRoleChange.ok, true, "Tactical roles should be editable by slot");
  assert.equal(activeClub.roleAssignments[String(editableRoleSlot.slotIndex)], alternativeRole.key, "Role assignment should persist on the club");
  assert.ok(roleReport.slots.every((slot) => slot.instructionOptions.length > 0), "Tactical role reports should expose player instruction options");
  const editableInstructionSlot = Engine.tacticalRoleReport(save, activeClub.id).slots.find((slot) => slot.instructionOptions.some((option) => option.key !== slot.instructionKey));
  assert.ok(editableInstructionSlot, "At least one tactical slot should have alternative instruction options");
  const alternativeInstruction = editableInstructionSlot.instructionOptions.find((option) => option.key !== editableInstructionSlot.instructionKey);
  const beforeInstructionStrength = Engine.teamStrength(save, activeClub.id);
  const instructionChange = Engine.setPlayerInstruction(save, activeClub.id, editableInstructionSlot.slotIndex, alternativeInstruction.key);
  assert.equal(instructionChange.ok, true, "Player instructions should be editable by slot");
  assert.equal(activeClub.playerInstructions[String(editableInstructionSlot.slotIndex)], alternativeInstruction.key, "Instruction assignment should persist on the club");
  const afterInstructionReport = Engine.tacticalRoleReport(save, activeClub.id);
  assert.ok(afterInstructionReport.averageInstructionFit > 0, "Instruction fit should be reported");
  const afterInstructionStrength = Engine.teamStrength(save, activeClub.id);
  assert.notDeepEqual(afterInstructionStrength, beforeInstructionStrength, "Player instructions should influence team strength");
  const instructedPlayer = Engine.getPlayer(save, activeClub.lineup[editableInstructionSlot.slotIndex]);
  const roleDevBefore = Engine.roleDevelopmentReport(save, instructedPlayer.id);
  const masteryBefore = roleDevBefore.current.instructionMastery;
  Engine.simulateNextDay(save);
  const roleDevAfter = Engine.roleDevelopmentReport(save, instructedPlayer.id);
  assert.ok(roleDevAfter.current.instructionMastery >= masteryBefore, "Daily training should improve instruction mastery");
  assert.equal(Engine.autoSetTacticalRoles(save, activeClub.id).ok, true, "Auto roles should match duties to the current XI");
  const tactic = Engine.setTactic(save, activeClub.id, "pressing", "high");
  assert.equal(tactic.ok, true, "Tactic settings should be editable");
  assert.equal(activeClub.tactics.pressing, "high", "Tactic change should persist");
  assert.ok(Engine.tacticalProfile(activeClub).intensity > 50, "High pressing should increase tactical intensity");
  const tacticalPresets = Engine.tacticalPresetOptions();
  assert.ok(tacticalPresets.length >= 5, "Tactical presets should be available");
  const presetResult = Engine.applyTacticalPreset(save, activeClub.id, "protectLead");
  assert.equal(presetResult.ok, true, "Tactical presets should apply to the active club");
  assert.equal(activeClub.tactics.mentality, "cautious", "Protect Lead preset should change mentality");
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
  assert.equal(Engine.isUnavailable(save, injuredStarter), true, "Injured players should be unavailable");
  const suspendedStarter = Engine.getPlayer(save, activeClub.lineup[1]);
  suspendedStarter.suspension = {
    type: "Red card",
    returnDate: "2100-01-01",
    returnSeason: save.season,
    returnRound: save.league.currentRound + 2,
    fixtureId: "test"
  };
  assert.equal(Engine.isSuspended(save, suspendedStarter), true, "Suspensions should be tracked");
  assert.equal(Engine.autoSelectLineup(save, activeClub.id).includes(suspendedStarter.id), false, "Auto lineup should exclude suspended players");

  const expiringPlayer = Engine.clubPlayers(save, save.activeClubId).find((player) => player.contractYears <= 1) || Engine.clubPlayers(save, save.activeClubId)[0];
  expiringPlayer.contractYears = 1;
  const renewal = Engine.renewContract(save, expiringPlayer.id);
  assert.equal(renewal.ok, true, "Contract renewal should succeed for own player when wage room exists");
  assert.ok(expiringPlayer.contractYears >= 2, "Renewal should extend the contract");
  const renewalProfile = Engine.contractRenewalProfile(save, expiringPlayer.id);
  assert.ok(renewalProfile.requestedWage >= expiringPlayer.wage * 0.75, "Renewal profile should include a realistic wage demand");
  assert.ok(renewalProfile.happiness, "Renewal profile should include happiness context");

  const trainingPlayer = Engine.clubPlayers(save, save.activeClubId)[1];
  const training = Engine.setTrainingFocus(save, trainingPlayer.id, "playmaking");
  assert.equal(training.ok, true, "Training focus should be settable for own players");
  assert.equal(trainingPlayer.trainingFocus, "playmaking", "Training focus should persist on the player");
  const individualPlan = Engine.setIndividualPlan(save, trainingPlayer.id, "extra");
  assert.equal(individualPlan.ok, true, "Individual development plans should be settable");
  assert.equal(trainingPlayer.individualPlan, "extra", "Individual plan should persist on the player");
  const restResult = Engine.restPlayer(save, trainingPlayer.id);
  assert.equal(restResult.ok, true, "Players should be assignable to rest or rehab");
  assert.equal(trainingPlayer.individualPlan, "recovery", "Rest action should switch the player to recovery");
  const weeklyPlan = Engine.setTrainingPlan(save, activeClub.id, "tactical");
  assert.equal(weeklyPlan.ok, true, "Weekly training plan should be settable");
  const matchPrep = Engine.setMatchPrep(save, activeClub.id, "defensiveShape");
  assert.equal(matchPrep.ok, true, "Match preparation should be settable");
  const familiarityBefore = activeClub.matchPrepFamiliarity.defensiveShape;
  Engine.simulateNextDay(save);
  assert.ok(activeClub.matchPrepFamiliarity.defensiveShape > familiarityBefore, "Daily progression should build match prep familiarity");
  assert.ok(activeClub.trainingReport && activeClub.trainingReport.plan === "tactical", "Daily progression should record the training report");
  assert.ok(Engine.getTrainingCalendar(save, activeClub.id, 7).length === 7, "Training calendar should return upcoming training days");
  assert.ok(Engine.trainingRecommendations(save, activeClub.id).length > 0, "Staff should generate training recommendations");
  assert.ok(Engine.playerDevelopmentReport(save, trainingPlayer.id).growthRoom >= 0, "Player development reports should include growth room");
  assert.ok(Engine.squadAvailabilityReport(save, activeClub.id).injured >= 1, "Squad availability reports should count injuries");
  assert.ok(Array.isArray(Engine.squadDevelopmentReport(save, activeClub.id).prospects), "Squad development reports should include prospects");
  const needs = Engine.recruitmentNeedReport(save, activeClub.id);
  assert.equal(needs.needs.length, Data.POSITIONS.length, "Recruitment should report every position need");
  assert.ok(needs.primary && needs.primary.position, "Recruitment should identify a primary need");
  const recommendations = Engine.recruitmentRecommendations(save, 5);
  assert.ok(recommendations.length > 0, "Recruitment should recommend market targets");
  assert.ok(recommendations[0].recruitment.score >= recommendations[recommendations.length - 1].recruitment.score, "Recommendations should be score sorted");
  const shortlist = Engine.addToShortlist(save, recommendations[0].player.id);
  assert.equal(shortlist.ok, true, "Targets should be shortlistable");
  assert.equal(Engine.isShortlisted(save, recommendations[0].player.id), true, "Shortlist status should persist");
  assert.ok(Engine.recruitmentProfile(save, recommendations[0].player.id).pros.length > 0, "Recruitment profile should include pros");
  assert.equal(Engine.removeFromShortlist(save, recommendations[0].player.id).ok, true, "Targets should be removable from shortlist");

  const networkSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 9090 });
  const regionalAssignment = Engine.assignRegionalScout(networkSave, "scandinavia", "prospects");
  assert.equal(regionalAssignment.ok, true, "Regional scouting assignments should be startable");
  for (let i = 0; i < 18; i += 1) {
    Engine.simulateNextDay(networkSave);
  }
  const networkReport = Engine.scoutingNetworkReport(networkSave);
  assert.ok(networkReport.discoveries.length > 0, "Regional scouting should discover unknown targets");
  const discovered = networkReport.discoveries[0].player;
  assert.ok(discovered && !discovered.clubId, "Scouting discoveries should enter the game as unsigned targets");
  assert.ok(networkSave.transfers.marketIds.includes(discovered.id), "Scouting discoveries should appear in the transfer market");

  const cupSave = Engine.createNewSave({ selectedClubId: "pl-bur", seed: 5151 });
  let cupMatchDay = null;
  for (let i = 0; i < 130; i += 1) {
    const day = Engine.simulateNextDay(cupSave);
    if (day.activeMatch && day.activeMatch.competitionType === "cup") {
      cupMatchDay = day;
      break;
    }
  }
  assert.ok(cupMatchDay && cupMatchDay.activeMatch, "Daily progression should surface active domestic cup matches");
  assert.ok(cupMatchDay.activeMatch.winnerClubId, "Cup matches should resolve a knockout winner");
  assert.ok(Engine.domesticCupReport(cupSave).bestRoundIndex >= 0, "Domestic cup reports should track the active club cup run");

  const europeSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 6161 });
  let europeMatchDay = null;
  for (let i = 0; i < 170; i += 1) {
    const day = Engine.simulateNextDay(europeSave);
    if (day.activeMatch && day.activeMatch.competitionType === "europe") {
      europeMatchDay = day;
      break;
    }
  }
  assert.ok(europeMatchDay && europeMatchDay.activeMatch, "Daily progression should surface active European matches");
  assert.equal(europeMatchDay.activeMatch.competitionName, "Continental Cup", "European live matches should identify the competition");
  assert.ok(europeMatchDay.activeMatch.playerRatings.length >= 22, "European matches should include player ratings");

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
  const eventFlowSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 7777 });
  const eventFlow = Engine.simulateUntilNextEvent(eventFlowSave, { maxDays: 30 });
  assert.ok(eventFlow.daysAdvanced >= 1, "Continue flow should advance at least one day");
  assert.equal(eventFlow.days.length, eventFlow.daysAdvanced, "Continue flow should report all simulated days");
  assert.ok(eventFlow.activeMatch || eventFlow.significantEvent || eventFlow.seasonEnded, "Continue flow should stop at a match, event, or season end");
  const promiseSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 4242 });
  const promiseClub = Engine.getClub(promiseSave, promiseSave.activeClubId);
  const promisedPlayer = Engine.clubPlayers(promiseSave, promiseSave.activeClubId).find((player) => player.squadRole === "star") || Engine.clubPlayers(promiseSave, promiseSave.activeClubId)[0];
  promisedPlayer.squadRole = "star";
  let markedMatches = 0;
  promiseSave.league.schedule.forEach((roundData) => {
    const fixture = roundData.fixtures.find((item) => item.homeClubId === promiseClub.id || item.awayClubId === promiseClub.id);
    if (fixture && markedMatches < 6) {
      fixture.played = true;
      markedMatches += 1;
    }
  });
  const promisePressure = Engine.playerHappinessReport(promiseSave, promisedPlayer.id);
  assert.ok(promisePressure.playingTime.pressure >= 54, "Underplayed star players should create playing-time pressure");
  const promiseDay = Engine.simulateNextDay(promiseSave);
  assert.ok(promiseDay.happinessEvent || promiseSave.inbox.some((item) => item.title === "Playing-Time Concern"), "Daily progression should surface playing-time concerns");

  const recoverySave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 8888 });
  const physicalSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 8888 });
  Engine.clubPlayers(recoverySave, recoverySave.activeClubId).forEach((player) => {
    player.fitness = 78;
  });
  Engine.clubPlayers(physicalSave, physicalSave.activeClubId).forEach((player) => {
    player.fitness = 78;
  });
  Engine.setTrainingPlan(recoverySave, recoverySave.activeClubId, "recovery");
  Engine.setTrainingPlan(physicalSave, physicalSave.activeClubId, "physical");
  Engine.simulateNextDay(recoverySave);
  Engine.simulateNextDay(physicalSave);
  assert.ok(averageFitness(recoverySave) > averageFitness(physicalSave), "Recovery training should protect fitness more than physical training");

  const transferTarget = save.transfers.marketIds.map((id) => Engine.getPlayer(save, id)).find((player) => player && player.clubId);
  Engine.getClub(save, save.activeClubId).transferBudget = 100000000;
  Engine.getClub(save, save.activeClubId).wageBudget = 5000000;
  const lowOffer = Engine.makeTransferOffer(save, transferTarget.id, 1, 1);
  assert.equal(lowOffer.ok, false, "Low offer should not immediately complete");
  assert.ok(lowOffer.negotiationId, "Low offer should open a counter negotiation");
  const counter = Engine.acceptCounterOffer(save, lowOffer.negotiationId);
  assert.equal(counter.ok, true, "Affordable counter offer should be acceptable");
  assert.equal(Engine.getPlayer(save, transferTarget.id).clubId, save.activeClubId, "Accepted counter should transfer the player");

  const windowSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 5151 });
  const windowClub = Engine.getClub(windowSave, windowSave.activeClubId);
  const windowTarget = windowSave.transfers.marketIds.map((id) => Engine.getPlayer(windowSave, id)).find((player) => player && player.clubId);
  windowClub.transferBudget = 500000000;
  windowClub.wageBudget = 20000000;
  windowSave.calendar.currentDate = "2026-09-10";
  assert.equal(Engine.transferWindowStatus(windowSave).isOpen, false, "September should be outside the transfer window");
  const negotiationProfile = Engine.negotiationProfile(windowSave, windowTarget.id);
  assert.ok(negotiationProfile.suggestedFee >= windowTarget.value * 0.7, "Negotiation profile should suggest a plausible fee");
  assert.ok(negotiationProfile.interest.label, "Negotiation profile should include player interest");
  const preAgreement = Engine.makeTransferOffer(windowSave, windowTarget.id, windowTarget.value * 2, windowTarget.wage * 2);
  assert.equal(preAgreement.preAgreement, true, "Accepted outside-window deals should become pre-agreements");
  assert.notEqual(Engine.getPlayer(windowSave, windowTarget.id).clubId, windowSave.activeClubId, "Pre-agreements should not register immediately");
  windowSave.calendar.currentDate = "2027-01-01";
  const processedAgreements = Engine.processTransferPreAgreements(windowSave);
  assert.ok(processedAgreements.length > 0, "Opening the next window should process pre-agreements");
  assert.equal(Engine.getPlayer(windowSave, windowTarget.id).clubId, windowSave.activeClubId, "Pre-agreements should register when the window opens");
  windowSave.calendar.currentDate = "2027-02-01";
  const deadline = Engine.deadlineDayReport(windowSave);
  assert.equal(deadline.active, true, "Final day of a transfer window should activate deadline reporting");

  const aiMarketSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 6262 });
  aiMarketSave.calendar.currentDate = "2026-07-15";
  const aiMove = Engine.processAiClubTransfer(aiMarketSave);
  assert.ok(aiMove, "AI clubs should be able to complete a market move inside an open window");
  assert.notEqual(aiMove.toClubId, aiMarketSave.activeClubId, "AI market moves should not buy for the user club");
  assert.notEqual(aiMove.fromClubId, aiMarketSave.activeClubId, "AI market moves should not sell from the user club");
  assert.ok(aiMarketSave.transfers.history.some((item) => item.playerId === aiMove.playerId), "AI market moves should enter the transfer ledger");
  assert.ok(aiMarketSave.transfers.news.some((item) => item.playerId === aiMove.playerId), "AI market moves should create transfer news");

  const aiLoanSave = Engine.createNewSave({ selectedClubId: "pl-ars", seed: 6262 });
  aiLoanSave.calendar.currentDate = "2026-07-20";
  const aiLoan = Engine.processAiClubLoan(aiLoanSave);
  assert.ok(aiLoan, "AI clubs should be able to complete loan moves inside an open window");
  assert.equal(aiLoan.type, "loan", "AI loan market should return a loan result");
  assert.notEqual(aiLoan.toClubId, aiLoanSave.activeClubId, "AI loan moves should not loan into the user club");
  assert.notEqual(aiLoan.fromClubId, aiLoanSave.activeClubId, "AI loan moves should not loan from the user club");
  const loanedPlayer = Engine.getPlayer(aiLoanSave, aiLoan.playerId);
  assert.equal(loanedPlayer.clubId, aiLoan.toClubId, "Loaned players should move to the loan club");
  assert.equal(loanedPlayer.parentClubId, aiLoan.fromClubId, "Loaned players should keep their parent club");
  assert.ok(loanedPlayer.loanUntilSeason > aiLoanSave.season, "Loaned players should have a loan end season");
  assert.ok(aiLoanSave.transfers.history.some((item) => item.type === "loan" && item.playerId === aiLoan.playerId), "AI loans should enter the transfer ledger");
  assert.ok(aiLoanSave.transfers.news.some((item) => item.type === "loan" && item.playerId === aiLoan.playerId), "AI loans should create transfer news");

  const scoutTarget = save.transfers.marketIds.map((id) => Engine.getPlayer(save, id)).find((player) => player && player.clubId && player.clubId !== save.activeClubId);
  const assignment = Engine.assignScout(save, scoutTarget.id);
  assert.equal(assignment.ok, true, "Scout assignment should be created");

  const roundResult = Engine.simulateNextRound(save);
  assert.ok(roundResult.activeMatch.tactics, "Played matches should store tactic snapshots");
  assert.ok(roundResult.activeMatch.events.length > 0, "Deep match engine should return structured events");
  assert.ok(roundResult.activeMatch.playerStats, "Deep match engine should return player match stats");
  const activeRating = roundResult.activeMatch.playerRatings.find((rating) => rating.clubId === save.activeClubId);
  const activeRatedPlayer = activeRating ? Engine.getPlayer(save, activeRating.playerId) : null;
  assert.ok(activeRatedPlayer && activeRatedPlayer.seasonStats.minutes > 0, "Match appearances should track minutes for morale promises");
  assert.ok(activeRatedPlayer.seasonStats.starts >= 0, "Match appearances should track starts for squad-role expectations");
  assert.ok(Array.isArray(roundResult.activeMatch.substitutions), "Deep match engine should return substitutions");
  assert.ok(roundResult.activeMatch.analysis.summary, "Deep match engine should explain the result");
  assert.ok(roundResult.activeMatch.stats.passAccuracy.home >= 55, "Tactics should preserve plausible passing stats");
  assert.ok(Number.isFinite(roundResult.activeMatch.teamPhaseStrengths.home.instructionCohesion), "Deep match engine should expose instruction cohesion");
  const activeMatchSide = roundResult.activeMatch.homeClubId === save.activeClubId ? "home" : "away";
  const liveReport = Engine.liveMatchAssistantReport(save, roundResult.activeMatch, 70, roundResult.activeMatch.goals, roundResult.activeMatch.tactics[activeMatchSide]);
  assert.ok(liveReport && liveReport.advice.length > 0, "Live assistant report should produce tactical advice");
  assert.ok(Array.isArray(liveReport.substitutions), "Live assistant report should include substitution recommendations");
  const tacticalReview = Engine.postMatchTacticalReview(save, roundResult.activeMatch);
  assert.ok(tacticalReview && tacticalReview.grade, "Post-match tactical review should grade the active club performance");
  assert.ok(tacticalReview.phaseRows.length >= 4, "Post-match tactical review should include phase rows");

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
  assert.ok(history.cup && history.cup.championName, "Completed seasons should archive the domestic cup winner");
  assert.ok(history.europe && history.europe.championName, "Completed seasons should archive the European winner");
  assert.ok(save.europe && save.europe.competition && save.europe.competition.season === save.season, "Rollover should create the next European competition");
  assert.ok(save.europe.qualifiedClubIds.length >= 4, "Rollover should store next-season European qualifiers");
  assert.equal(history.fixtures.length, 38, "Completed season should archive all rounds");
  assert.equal(history.fixtures.reduce((sum, round) => sum + round.fixtures.length, 0), 380, "Completed season should archive all fixtures");
  assert.ok(history.standings[0].points >= 64 && history.standings[0].points <= 98, "Champion points should be plausible");
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
