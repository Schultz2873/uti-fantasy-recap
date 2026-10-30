const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fantraxApi } = require("./fantrax-api");
const { collectWeeklyRows, rowsFromMatchups, periodFinished, CATEGORIES } = require("./fantrax-weekly");

function matchup(away, home, awayScore = 10, homeScore = 6) {
  return {
    away: { teamId: away, teamName: away, score: awayScore },
    home: { teamId: home, teamName: home, score: homeScore },
    categories: Object.keys(CATEGORIES).map(name => ({ name, away: { value: 1.23456, display: "1.235" }, home: { value: 0, display: "0" } }))
  };
}

test("API identifies the app and sends the secret in the body, not the URL", async t => {
  const previous = process.env.FANTRAX_SECRET_ID;
  process.env.FANTRAX_SECRET_ID = "test-only-secret";
  t.after(() => {
    if (previous === undefined) delete process.env.FANTRAX_SECRET_ID;
    else process.env.FANTRAX_SECRET_ID = previous;
  });
  t.mock.method(global, "fetch", async (url, options) => {
    assert.equal(new URL(url).searchParams.get("leagueId"), "league");
    assert.ok(!url.includes("test-only-secret"));
    assert.equal(options.headers["User-Agent"], "UTIFantasyRecap/1.0");
    assert.equal(JSON.parse(options.body).userSecretId, "test-only-secret");
    return Response.json({ scoringPeriods: [] });
  });
  await fantraxApi("getLeagueInfo", { leagueId: "league" });
});

test("period completion uses the API offset and excludes unfinished periods", () => {
  const period = { number: 1, endDate: "2026-04-06T16:09:59.0-0400" };
  assert.equal(periodFinished(period, new Date("2026-04-06T20:09:58Z")), false);
  assert.equal(periodFinished(period, new Date("2026-04-06T20:10:00Z")), true);
  assert.throws(() => periodFinished({ number: 1 }), /Invalid end date/);
});

test("category conversion preserves displayed precision, zero values, and official scores", () => {
  const rows = rowsFromMatchups([matchup("A", "B", 9.5, 6.5)], 1, "regular", "");
  assert.equal(rows[0].AVG, 1.235);
  assert.equal(rows[1].HR, 0);
  assert.equal(rows[0].official_score_for, 9.5);
  assert.equal(rows[0].official_score_against, 6.5);
  assert.equal(rows[1].opponent, "A");
  const incomplete = matchup("A", "B");
  incomplete.categories.pop();
  assert.throws(() => rowsFromMatchups([incomplete], 1, "regular", ""), /Missing scoring categories/);
});

test("playoffs retain winners and exclude consolation games; future weeks are not requested", async () => {
  const requested = [];
  const api = async (endpoint, params) => {
    if (endpoint === "getLeagueInfo") return {
      seasonYear: 2026,
      scoringPeriods: [1, 2, 3, 4].map(number => ({ number, endDate: number === 4 ? "2027-01-01" : "2026-01-01" })),
      playoffs: { used: true, firstPlayoffPeriod: 2, numPlayoffTeams: 4 },
      matchups: [{ period: 2, matchupList: [{}, {}] }, { period: 3, matchupList: [{}] }]
    };
    if (endpoint === "getStandings") return ["A", "B", "C", "D", "E", "F"].map((teamId, index) => ({ teamId, rank: index + 1 }));
    requested.push(params.period);
    const games = params.period === 1 ? [matchup("A", "B")]
      : params.period === 2 ? [matchup("A", "B"), matchup("C", "D"), matchup("E", "F")]
      : [matchup("A", "C"), matchup("B", "D")];
    return { period: params.period, matchups: games };
  };
  const result = await collectWeeklyRows("league", [], api, new Date("2026-10-30"));
  assert.deepEqual(requested, [1, 2, 3]);
  assert.deepEqual(result.imported.filter(row => row.week === 2).map(row => row.team), ["A", "B", "C", "D"]);
  assert.deepEqual(result.imported.filter(row => row.week === 3).map(row => row.team), ["A", "C"]);
});

test("missing completed-period results fail rather than replacing saved data with a partial season", async () => {
  const api = async endpoint => endpoint === "getLeagueInfo"
    ? { seasonYear: 2026, scoringPeriods: [{ number: 1, endDate: "2026-01-01" }] }
    : { period: 1, matchups: [] };
  await assert.rejects(collectWeeklyRows("league", [], api), /No matchup data/);
});
