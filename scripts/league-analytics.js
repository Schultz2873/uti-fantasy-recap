/*
  UTI league analytics for the current Fantrax season.
  Turns weekly team stat rows (data/weekly-team-stats.js or .csv) into official records,
  all-play records, category records, Category Kings, Luck Index, recent form, and Power Rankings.

  Exposes window.UTIAnalytics for scripts/uti-intelligence.js.
*/
(() => {
  const DEFAULT_CSV_PATH = "data/weekly-team-stats.csv";

  // UTI scoring rules:
  // Higher is better for most categories.
  // Lower is better for hitting SO, pitching L, ERA, WHIP and BAA.
  const CATEGORY_RULES = {
    R: "high",
    HR: "high",
    RBI: "high",
    BB: "high",
    SO: "low",
    NSB: "high",
    AVG: "high",
    TB: "high",
    W: "high",
    L: "low",
    QS: "high",
    NS: "high",
    K: "high",
    ERA: "low",
    WHIP: "low",
    BAA: "low"
  };

  const CATEGORIES = Object.keys(CATEGORY_RULES);

  // CSV columns that stay as text instead of being converted to numbers.
  const TEXT_COLUMNS = ["team", "opponent", "IP", "phase", "round"];

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    const endRow = () => {
      row.push(field);
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
      field = "";
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"' && quoted && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i++;
        endRow();
      } else {
        field += ch;
      }
    }

    if (field.length || row.length) endRow();

    if (!rows.length) return [];

    const headers = rows[0].map(h => h.trim());

    return rows.slice(1).map(values => {
      const obj = {};
      headers.forEach((header, index) => {
        const raw = (values[index] ?? "").trim();

        if (TEXT_COLUMNS.includes(header)) {
          obj[header] = raw;
          return;
        }

        const n = Number(raw);
        obj[header] = raw !== "" && Number.isFinite(n) ? n : raw;
      });
      return obj;
    });
  }

  // 1 if A wins the category, -1 if B wins, 0 for a tie or missing value.
  function compareValue(a, b, rule) {
    const av = Number(a);
    const bv = Number(b);

    if (!Number.isFinite(av) || !Number.isFinite(bv)) return 0;
    if (av === bv) return 0;

    if (rule === "low") return av < bv ? 1 : -1;
    return av > bv ? 1 : -1;
  }

  function compareTeams(a, b) {
    let scoreA = 0;
    let scoreB = 0;
    const categoryResults = {};

    CATEGORIES.forEach(category => {
      const result = compareValue(a[category], b[category], CATEGORY_RULES[category]);

      if (result > 0) {
        scoreA += 1;
        categoryResults[category] = a.team;
      } else if (result < 0) {
        scoreB += 1;
        categoryResults[category] = b.team;
      } else {
        scoreA += 0.5;
        scoreB += 0.5;
        categoryResults[category] = "TIE";
      }
    });

    return {
      teamA: a.team,
      teamB: b.team,
      scoreA,
      scoreB,
      winner: scoreA > scoreB ? a.team : scoreB > scoreA ? b.team : "TIE",
      categoryResults
    };
  }

  function groupByWeek(rows) {
    return rows.reduce((map, row) => {
      const week = Number(row.week);
      if (!map.has(week)) map.set(week, []);
      map.get(week).push(row);
      return map;
    }, new Map());
  }

  // Calls fn(a, b) for every pair of teams that played in the same week.
  function forEachWeeklyPair(rows, fn) {
    for (const weekRows of groupByWeek(rows).values()) {
      for (let i = 0; i < weekRows.length; i++) {
        for (let j = i + 1; j < weekRows.length; j++) {
          fn(weekRows[i], weekRows[j]);
        }
      }
    }
  }

  function emptyRecord() {
    return { wins: 0, losses: 0, ties: 0, points: 0, games: 0 };
  }

  function ensureTeamRecord(map, team) {
    if (!map[team]) map[team] = emptyRecord();
    return map[team];
  }

  // Adds one game to the record. result > 0 is a win, < 0 a loss, 0 a tie.
  function addResult(record, result) {
    record.games += 1;
    if (result > 0) {
      record.wins += 1;
      record.points += 1;
    } else if (result < 0) {
      record.losses += 1;
    } else {
      record.ties += 1;
      record.points += 0.5;
    }
  }

  function setWinPct(record) {
    record.winPct = record.games ? record.points / record.games : 0;
  }

  function getOfficialRecords(rows) {
    const records = {};

    rows.forEach(row => {
      const rec = ensureTeamRecord(records, row.team);
      const forScore = Number(row.official_score_for);
      const againstScore = Number(row.official_score_against);

      if (!Number.isFinite(forScore) || !Number.isFinite(againstScore)) return;
      addResult(rec, forScore - againstScore);
    });

    Object.values(records).forEach(setWinPct);
    return records;
  }

  // Every team plays every other team each week, scored on all categories.
  function getAllPlayRecords(rows) {
    const records = {};

    forEachWeeklyPair(rows, (a, b) => {
      const { scoreA, scoreB } = compareTeams(a, b);
      addResult(ensureTeamRecord(records, a.team), scoreA - scoreB);
      addResult(ensureTeamRecord(records, b.team), scoreB - scoreA);
    });

    Object.values(records).forEach(setWinPct);
    return records;
  }

  // Same as all-play, but each category is its own game.
  function getCategoryRecords(rows) {
    const output = {};

    const ensure = team => {
      if (!output[team]) {
        output[team] = {};
        CATEGORIES.forEach(category => {
          output[team][category] = { ...emptyRecord(), winPct: 0 };
        });
      }
      return output[team];
    };

    forEachWeeklyPair(rows, (a, b) => {
      CATEGORIES.forEach(category => {
        const result = compareValue(a[category], b[category], CATEGORY_RULES[category]);
        addResult(ensure(a.team)[category], result);
        addResult(ensure(b.team)[category], -result);
      });
    });

    Object.values(output).forEach(teamCategories => {
      Object.values(teamCategories).forEach(setWinPct);
    });

    return output;
  }

  function getCategoryKings(categoryRecords) {
    const kings = {};

    CATEGORIES.forEach(category => {
      kings[category] = Object.entries(categoryRecords)
        .map(([team, records]) => ({
          team,
          winPct: records[category].winPct,
          wins: records[category].wins,
          losses: records[category].losses,
          ties: records[category].ties
        }))
        .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || a.team.localeCompare(b.team));
    });

    return kings;
  }

  function getLuckIndex(rows, officialRecords, allPlayRecords) {
    const teams = [...new Set(rows.map(r => r.team))];

    return teams.map(team => {
      const actual = officialRecords[team] || { games: 0, points: 0, winPct: 0 };
      const allPlay = allPlayRecords[team] || { winPct: 0 };

      // "Expected wins" = all-play win percentage applied to the number
      // of official weekly matchups played.
      const expectedPoints = allPlay.winPct * actual.games;
      const luck = actual.points - expectedPoints;

      return {
        team,
        actualPoints: actual.points,
        actualWinPct: actual.winPct,
        allPlayWinPct: allPlay.winPct,
        expectedPoints,
        luck
      };
    }).sort((a, b) => b.luck - a.luck);
  }

  function getRecentForm(rows, lastNWeeks = 4) {
    const weeks = [...new Set(rows.map(r => Number(r.week)))].sort((a, b) => b - a);
    const selected = new Set(weeks.slice(0, lastNWeeks));
    const recentRows = rows.filter(r => selected.has(Number(r.week)));
    const records = getOfficialRecords(recentRows);

    return Object.entries(records)
      .map(([team, rec]) => ({ team, ...rec }))
      .sort((a, b) => b.winPct - a.winPct || b.points - a.points || a.team.localeCompare(b.team));
  }

  function getPowerRankings(rows, allPlayRecords, categoryRecords, lastNWeeks = 4) {
    const recent = Object.fromEntries(getRecentForm(rows, lastNWeeks).map(x => [x.team, x]));
    const teams = [...new Set(rows.map(r => r.team))];

    const rankings = teams.map(team => {
      const allPlayPct = allPlayRecords[team]?.winPct ?? 0;
      const categories = categoryRecords[team] || {};
      const categoryValues = CATEGORIES.map(c => categories[c]?.winPct ?? 0);
      const categoryPct = categoryValues.length
        ? categoryValues.reduce((sum, value) => sum + value, 0) / categoryValues.length
        : 0;
      const recentPct = recent[team]?.winPct ?? 0;

      // Intentionally simple and transparent. Easy to tune later.
      const rating = (allPlayPct * 0.50) + (categoryPct * 0.30) + (recentPct * 0.20);

      return {
        team,
        rating,
        allPlayPct,
        categoryPct,
        recentPct
      };
    });

    return rankings.sort((a, b) => b.rating - a.rating || a.team.localeCompare(b.team));
  }

  function phaseFor(row) {
    return String(row?.phase || row?.season_type || "regular").toLowerCase() === "playoffs"
      ? "playoffs"
      : "regular";
  }

  function buildSummary(rows) {
    const allRows = Array.isArray(rows) ? rows : [];
    const regularRows = allRows.filter(row => phaseFor(row) === "regular");
    const playoffRows = allRows.filter(row => phaseFor(row) === "playoffs");

    // UTI strength analytics stay regular-season-only. Once the playoffs begin,
    // only eight teams are active, so mixing playoff rounds into All-Play, Luck,
    // Power, and Category Kings would distort the ten-team regular-season baseline.
    const analyticsRows = regularRows.length ? regularRows : allRows;

    const officialRecords = getOfficialRecords(analyticsRows);
    const allPlayRecords = getAllPlayRecords(analyticsRows);
    const categoryRecords = getCategoryRecords(analyticsRows);

    return {
      // Keep rows as the analytics rows for backward compatibility with the
      // Intelligence board/profile strength calculations. allRows preserves
      // every matchup, including playoffs, for actual/franchise records.
      rows: analyticsRows,
      allRows,
      regularRows,
      playoffRows,
      categories: CATEGORIES,
      categoryRules: CATEGORY_RULES,
      officialRecords,
      officialRecordsOverall: getOfficialRecords(allRows),
      officialRecordsRegular: getOfficialRecords(regularRows),
      officialRecordsPlayoffs: getOfficialRecords(playoffRows),
      allPlayRecords,
      categoryRecords,
      categoryKings: getCategoryKings(categoryRecords),
      luckIndex: getLuckIndex(analyticsRows, officialRecords, allPlayRecords),
      recentForm: getRecentForm(analyticsRows, 4),
      powerRankings: getPowerRankings(analyticsRows, allPlayRecords, categoryRecords, 4)
    };
  }

  // "W", "L", or "T" for one team-week row, honoring a recorded tiebreak winner.
  function matchupResult(row) {
    const scoreFor = Number(row.official_score_for);
    const scoreAgainst = Number(row.official_score_against);
    if (scoreFor > scoreAgainst) return "W";
    if (scoreFor < scoreAgainst) return "L";
    if (row.tiebreak_winner === row.team) return "W";
    if (row.tiebreak_winner === row.opponent) return "L";
    return "T";
  }

  // One entry per matchup (each matchup appears twice in the rows, once per team).
  function uniqueMatchups(rows) {
    const seen = new Set();
    const matchups = [];

    rows.forEach(row => {
      const key = [row.season || "", row.week, ...[row.team, row.opponent].sort()].join("|");
      if (seen.has(key) || !row.opponent) return;
      seen.add(key);

      const result = matchupResult(row);
      const home = { team: row.team, score: Number(row.official_score_for) };
      const away = { team: row.opponent, score: Number(row.official_score_against) };
      const [winner, loser] = result === "L" ? [away, home] : [home, away];

      matchups.push({
        season: row.season,
        week: Number(row.week),
        round: row.round || "",
        phase: phaseFor(row),
        winner,
        loser,
        tie: result === "T",
        margin: Math.abs(home.score - away.score)
      });
    });

    return matchups;
  }

  // Longest win/loss streaks and the current streak for each team, in week order.
  function teamStreaks(rows) {
    const byTeam = {};
    [...rows]
      .sort((a, b) => Number(a.week) - Number(b.week))
      .forEach(row => (byTeam[row.team] = byTeam[row.team] || []).push(row));

    const streaks = {};
    Object.entries(byTeam).forEach(([team, teamRows]) => {
      const best = { W: { length: 0 }, L: { length: 0 } };
      let run = { type: null, length: 0, startWeek: null };

      teamRows.forEach(row => {
        const result = matchupResult(row);
        run = result === run.type
          ? { ...run, length: run.length + 1 }
          : { type: result, length: 1, startWeek: Number(row.week) };
        run.endWeek = Number(row.week);
        if ((result === "W" || result === "L") && run.length > best[result].length) best[result] = { ...run };
      });

      streaks[team] = { longestWin: best.W, longestLoss: best.L, current: run };
    });

    return streaks;
  }

  // Prefers the preloaded window.UTI_WEEKLY_TEAM_STATS; falls back to fetching the CSV.
  async function load(csvPath = DEFAULT_CSV_PATH) {
    if (Array.isArray(window.UTI_WEEKLY_TEAM_STATS) && window.UTI_WEEKLY_TEAM_STATS.length) {
      return buildSummary(window.UTI_WEEKLY_TEAM_STATS);
    }

    const response = await fetch(csvPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${csvPath}: ${response.status}`);
    }

    const text = await response.text();
    return buildSummary(parseCSV(text));
  }

  window.UTIAnalytics = {
    CATEGORIES,
    CATEGORY_RULES,
    parseCSV,
    compareTeams,
    phaseFor,
    matchupResult,
    uniqueMatchups,
    teamStreaks,
    buildSummary,
    load
  };
})();
