const { fantraxApi } = require("./fantrax-api");

const CATEGORIES = {
  "Runs Scored": "R", "Home Runs": "HR", RBI: "RBI", Walks: "BB", Strikeouts: "SO",
  "Stolen Bases - Net": "NSB", "Batting Average": "AVG", "Total Bases": "TB",
  Wins: "W", Losses: "L", "Quality Starts": "QS", "Strikeouts Pitched": "K",
  "Earned Run Average": "ERA", "WHIP Ratio": "WHIP", "Net Saves 3": "NS", "Batting Average Against": "BAA"
};

function periodFinished(period, now = new Date()) {
  // Fantrax dates use -0400; normalize the offset for ISO parsing.
  const end = new Date(String(period.endDate).replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (!Number.isFinite(end.getTime())) throw new Error(`Invalid end date for Fantrax period ${period.number}`);
  return now > end;
}

function rowsFromMatchups(matchups, week, phase, round, teamName = name => name) {
  return matchups.flatMap(matchup => ["away", "home"].map(side => {
    const team = matchup[side];
    const opponent = matchup[side === "away" ? "home" : "away"];
    if (!team?.teamId || !opponent?.teamId || !Array.isArray(matchup.categories)) {
      throw new Error(`Incomplete matchup in period ${week}`);
    }
    const record = { week, phase, round, team: teamName(team.teamName), opponent: teamName(opponent.teamName) };
    for (const category of matchup.categories) {
      const column = CATEGORIES[category.name];
      if (!column) throw new Error(`Unmapped Fantrax category: ${category.name}`);
      // Use displayed precision to preserve the existing site's rounded category totals.
      const raw = category[side]?.display ?? category[side]?.value;
      if (raw == null || String(raw).trim() === "" || !Number.isFinite(Number(raw))) {
        throw new Error(`Missing ${column} for ${record.team}, period ${week}`);
      }
      record[column] = Number(raw);
    }
    if (Object.values(CATEGORIES).some(column => record[column] === undefined)) {
      throw new Error(`Missing scoring categories for ${record.team}, period ${week}`);
    }
    for (const [column, value] of [["official_score_for", team.score], ["official_score_against", opponent.score]]) {
      if (value == null || !Number.isFinite(Number(value))) throw new Error(`Missing score in period ${week}`);
      record[column] = Number(value);
    }
    return record;
  }));
}

async function collectWeeklyRows(leagueId, existing, api = fantraxApi, now = new Date()) {
  const info = await api("getLeagueInfo", { leagueId, excludePlayerInfo: true });
  if (!Array.isArray(info.scoringPeriods) || !info.seasonYear) throw new Error("Missing Fantrax scoring schedule");
  const periods = [...info.scoringPeriods].sort((a, b) => a.number - b.number);
  const playoffPeriods = info.playoffs?.used ? periods.filter(p => p.number >= info.playoffs.firstPlayoffPeriod) : [];
  if (info.playoffs?.mergePlayoffPeriods) throw new Error("Merged playoff periods need manual review before importing");
  const names = [...new Set(existing.map(row => row.team))];
  const teamName = name => names.find(team => team.toLowerCase() === String(name).toLowerCase()) || name;
  const imported = [], regularWeeks = [], playoffWeeks = [];
  let contenders;
  for (const period of periods) {
    if (!periodFinished(period, now)) continue;
    const playoffIndex = playoffPeriods.findIndex(p => p.number === period.number);
    const phase = playoffIndex < 0 ? "regular" : "playoffs";
    const round = phase === "regular" ? "" : playoffIndex === playoffPeriods.length - 1 ? "Championship"
      : playoffIndex === playoffPeriods.length - 2 ? "Semifinals" : `Round ${playoffIndex + 1}`;
    const result = await api("getMatchupScores", { leagueId, period: period.number });
    if (result.period !== period.number || !Array.isArray(result.matchups) || !result.matchups.length) {
      throw new Error(`No matchup data for completed period ${period.number}; existing data kept`);
    }
    let matchups = result.matchups;
    if (phase === "playoffs") {
      if (!contenders) {
        const standings = await api("getStandings", { leagueId });
        if (!Array.isArray(standings)) throw new Error("Invalid Fantrax standings");
        contenders = new Set(standings.filter(team => team.rank <= info.playoffs.numPlayoffTeams).map(team => team.teamId));
        if (contenders.size !== info.playoffs.numPlayoffTeams) throw new Error("Cannot determine playoff qualifiers");
      }
      matchups = matchups.filter(m => contenders.has(m.away?.teamId) && contenders.has(m.home?.teamId));
      const expected = info.matchups?.find(m => m.period === period.number)?.matchupList?.length;
      if (!matchups.length || (expected != null && matchups.length !== expected)) {
        throw new Error(`Cannot identify championship bracket in period ${period.number}`);
      }
      // Eliminate losers while keeping teams with a bye. Never include consolation matchups.
      if (playoffIndex < playoffPeriods.length - 1) {
        for (const matchup of matchups) {
          if (matchup.away.score === matchup.home.score) throw new Error(`Playoff tie in period ${period.number} requires manual review`);
          const loser = matchup.away.score < matchup.home.score ? matchup.away : matchup.home;
          contenders.delete(loser.teamId);
        }
      }
    }
    imported.push(...rowsFromMatchups(matchups, period.number, phase, round, teamName));
    if (phase === "regular") regularWeeks.push(period.number);
    else playoffWeeks.push({ week: period.number, round });
  }
  return { imported, regularWeeks, playoffWeeks, season: info.seasonYear };
}

module.exports = { collectWeeklyRows, rowsFromMatchups, periodFinished, CATEGORIES };
