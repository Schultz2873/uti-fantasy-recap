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

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

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
        row.push(field);
        if (row.some(v => v !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    if (field.length || row.length) {
      row.push(field);
      if (row.some(v => v !== "")) rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map(h => h.trim());

    return rows.slice(1).map(values => {
      const obj = {};
      headers.forEach((header, index) => {
        const raw = (values[index] ?? "").trim();

        if (["team", "opponent", "IP"].includes(header)) {
          obj[header] = raw;
          return;
        }

        const n = Number(raw);
        obj[header] = raw !== "" && Number.isFinite(n) ? n : raw;
      });
      return obj;
    });
  }

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

  function ensureTeamRecord(map, team) {
    if (!map[team]) {
      map[team] = { wins: 0, losses: 0, ties: 0, points: 0, games: 0 };
    }
    return map[team];
  }

  function pct(points, games) {
    return games ? points / games : 0;
  }

  function getOfficialRecords(rows) {
    const records = {};

    rows.forEach(row => {
      const rec = ensureTeamRecord(records, row.team);
      const forScore = Number(row.official_score_for);
      const againstScore = Number(row.official_score_against);

      if (!Number.isFinite(forScore) || !Number.isFinite(againstScore)) return;

      rec.games += 1;
      if (forScore > againstScore) {
        rec.wins += 1;
        rec.points += 1;
      } else if (forScore < againstScore) {
        rec.losses += 1;
      } else {
        rec.ties += 1;
        rec.points += 0.5;
      }
    });

    Object.values(records).forEach(rec => {
      rec.winPct = pct(rec.points, rec.games);
    });

    return records;
  }

  function getAllPlayRecords(rows) {
    const byWeek = groupByWeek(rows);
    const records = {};

    for (const weekRows of byWeek.values()) {
      for (let i = 0; i < weekRows.length; i++) {
        for (let j = i + 1; j < weekRows.length; j++) {
          const a = weekRows[i];
          const b = weekRows[j];
          const result = compareTeams(a, b);

          const recA = ensureTeamRecord(records, a.team);
          const recB = ensureTeamRecord(records, b.team);
          recA.games += 1;
          recB.games += 1;

          if (result.scoreA > result.scoreB) {
            recA.wins += 1;
            recA.points += 1;
            recB.losses += 1;
          } else if (result.scoreB > result.scoreA) {
            recB.wins += 1;
            recB.points += 1;
            recA.losses += 1;
          } else {
            recA.ties += 1;
            recB.ties += 1;
            recA.points += 0.5;
            recB.points += 0.5;
          }
        }
      }
    }

    Object.values(records).forEach(rec => {
      rec.winPct = pct(rec.points, rec.games);
    });

    return records;
  }

  function getCategoryRecords(rows) {
    const byWeek = groupByWeek(rows);
    const output = {};

    const ensure = team => {
      if (!output[team]) {
        output[team] = {};
        CATEGORIES.forEach(category => {
          output[team][category] = { wins: 0, losses: 0, ties: 0, points: 0, games: 0, winPct: 0 };
        });
      }
      return output[team];
    };

    for (const weekRows of byWeek.values()) {
      for (let i = 0; i < weekRows.length; i++) {
        for (let j = i + 1; j < weekRows.length; j++) {
          const a = weekRows[i];
          const b = weekRows[j];

          CATEGORIES.forEach(category => {
            const result = compareValue(a[category], b[category], CATEGORY_RULES[category]);
            const aRec = ensure(a.team)[category];
            const bRec = ensure(b.team)[category];

            aRec.games += 1;
            bRec.games += 1;

            if (result > 0) {
              aRec.wins += 1;
              aRec.points += 1;
              bRec.losses += 1;
            } else if (result < 0) {
              bRec.wins += 1;
              bRec.points += 1;
              aRec.losses += 1;
            } else {
              aRec.ties += 1;
              bRec.ties += 1;
              aRec.points += 0.5;
              bRec.points += 0.5;
            }
          });
        }
      }
    }

    Object.values(output).forEach(teamCategories => {
      Object.values(teamCategories).forEach(rec => {
        rec.winPct = pct(rec.points, rec.games);
      });
    });

    return output;
  }

  function getCategoryKings(categoryRecords) {
    const kings = {};

    CATEGORIES.forEach(category => {
      const ranking = Object.entries(categoryRecords)
        .map(([team, records]) => ({
          team,
          winPct: records[category].winPct,
          wins: records[category].wins,
          losses: records[category].losses,
          ties: records[category].ties
        }))
        .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins || a.team.localeCompare(b.team));

      kings[category] = ranking;
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

  function buildSummary(rows) {
    const officialRecords = getOfficialRecords(rows);
    const allPlayRecords = getAllPlayRecords(rows);
    const categoryRecords = getCategoryRecords(rows);

    return {
      rows,
      categories: CATEGORIES,
      categoryRules: CATEGORY_RULES,
      officialRecords,
      allPlayRecords,
      categoryRecords,
      categoryKings: getCategoryKings(categoryRecords),
      luckIndex: getLuckIndex(rows, officialRecords, allPlayRecords),
      recentForm: getRecentForm(rows, 4),
      powerRankings: getPowerRankings(rows, allPlayRecords, categoryRecords, 4)
    };
  }

  async function load(csvPath = DEFAULT_CSV_PATH) {
    // Prefer the generated JS data file. This works on GitHub Pages AND when
    // index.html is opened directly from the filesystem.
    if (Array.isArray(window.UTI_WEEKLY_TEAM_STATS) && window.UTI_WEEKLY_TEAM_STATS.length) {
      return buildSummary(window.UTI_WEEKLY_TEAM_STATS);
    }

    // Fallback for deployments that only provide the CSV.
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
    buildSummary,
    load
  };
})();
