/*
  Record Book (record-book.html): single-week records, streaks, Robbed & Stolen, biggest blowouts,
  and the rivalry ledger, all-time or for one season (the season buttons at the top).

  Everything is computed from data/weekly-team-stats.js (2026) and the Yahoo history files
  in data/history/ (2023-2025), so it updates when those files do.
  2023-2025 used Yahoo scoring (SV+H and blown saves instead of net saves and opponent average);
  each season is compared on the categories it actually used.
*/
(() => {
  // 2026 recap pages start at Week 3.
  const FIRST_RECAP_WEEK = 3;
  // Week 1 and the All-Star break week run about two weeks long, so their counting stats would
  // swamp the single-week records. A week counts as long when the league's average total bases
  // is this much above the season's typical (median) week.
  const LONG_WEEK_FACTOR = 1.3;
  const CURRENT_SEASON = 2026;

  const CATEGORY_RECORDS = [
    { key: "R", label: "Runs" },
    { key: "HR", label: "Home runs" },
    { key: "RBI", label: "RBI" },
    { key: "BB", label: "Walks" },
    { key: "NSB", label: "Net steals" },
    { key: "TB", label: "Total bases" },
    { key: "AVG", label: "Batting average", minimum: ["AB", 150], format: value => value.toFixed(3).replace(/^0/, "") },
    { key: "K", label: "Strikeouts" },
    { key: "W", label: "Wins" },
    { key: "QS", label: "Quality starts" },
    { key: "NS", label: "Net saves" },
    { key: "SVH", label: "Saves + holds" },
    { key: "ERA", label: "ERA", lowerIsBetter: true, minimum: ["IP", 30], format: value => value.toFixed(2) },
    { key: "WHIP", label: "WHIP", lowerIsBetter: true, minimum: ["IP", 30], format: value => value.toFixed(3) },
    { key: "BAA", label: "Opponent average", lowerIsBetter: true, minimum: ["IP", 30], format: value => value.toFixed(3).replace(/^0/, "") }
  ];

  // Yahoo seasons (2023-2025): same hitting categories, different pitching ones.
  const YAHOO_CATEGORY_RULES = {
    R: "high", HR: "high", RBI: "high", BB: "high", SO: "low", NSB: "high", AVG: "high", TB: "high",
    W: "high", L: "low", K: "high", ERA: "low", WHIP: "low", QS: "high", BSV: "low", SVH: "high"
  };

  // Former franchises that only appear in older seasons.
  const LEGACY_TEAM_LOGOS = {
    "Pat James's Swell Team": "images/owners/pat-james-swell-team.png",
    "You Don't Kno Bo (2023)": "images/owners/you-dont-kno-bo-2023.png"
  };

  const HISTORY_GLOBALS = [
    ["UTI_YAHOO_2023_WEEKLY_TEAM_STATS", 2023],
    ["UTI_YAHOO_2024_WEEKLY_TEAM_STATS", 2024],
    ["UTI_YAHOO_2025_WEEKLY_TEAM_STATS", 2025]
  ];

  let selection = "all"; // "all" or a season number

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function teamPhoto(team, className = "ui-team-photo") {
    const src = LEGACY_TEAM_LOGOS[team] || window.TEAM_LOGOS?.[team];
    if (src) return `<img class="${className}" src="${escapeHtml(src)}" alt="" loading="lazy">`;
    const initials = String(team).split(/\s+/).slice(0, 2).map(word => word[0]).join("");
    return `<span class="${className} ui-team-initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  function team(name, small = false) {
    return `<span class="ui-team">${teamPhoto(name, small ? "ui-team-photo is-small" : "ui-team-photo")}<span>${escapeHtml(name)}</span></span>`;
  }

  // "Week 12" (or the playoff round), linked to that week's recap when one exists.
  // All-time view adds the season: "2024 · Week 12".
  function weekLink(season, week, round = "") {
    const label = round || `Week ${week}`;
    const linked = Number(season) === CURRENT_SEASON && week >= FIRST_RECAP_WEEK
      ? `<a href="2026/week${week}.html">${escapeHtml(label)}</a>`
      : escapeHtml(label);
    return selection === "all" ? `${season} · ${linked}` : linked;
  }

  function weeksLabel(season, run) {
    const weeks = run.startWeek === run.endWeek ? `Week ${run.startWeek}` : `Weeks ${run.startWeek}–${run.endWeek}`;
    return selection === "all" ? `${season} · ${weeks}` : weeks;
  }

  const score = matchup => `${matchup.winner.score}–${matchup.loser.score}`;
  const seasonOf = row => Number(row.season);
  const isYahooRow = row => "SVH" in row;

  /* ---------- Calculations ---------- */

  // "season|week" keys for the double-length weeks (see LONG_WEEK_FACTOR).
  function longWeeks(rows) {
    const totals = {};
    rows.forEach(row => {
      const key = `${seasonOf(row)}|${row.week}`;
      const entry = totals[key] = totals[key] || { season: seasonOf(row), sum: 0, count: 0 };
      entry.sum += Number(row.TB) || 0;
      entry.count += 1;
    });

    const bySeason = {};
    Object.entries(totals).forEach(([key, { season, sum, count }]) => (bySeason[season] = bySeason[season] || []).push([key, sum / count]));

    const long = new Set();
    Object.values(bySeason).forEach(weeks => {
      const sorted = weeks.map(([, average]) => average).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      weeks.filter(([, average]) => average > median * LONG_WEEK_FACTOR).forEach(([key]) => long.add(key));
    });
    return long;
  }

  // Best single-week value for each category, with how many other team-weeks tied it.
  function categoryRecords(rows) {
    const long = longWeeks(rows);
    const eligible = rows.filter(row => !long.has(`${seasonOf(row)}|${row.week}`));

    // Blank cells are missing data, not zero (Number("") is 0).
    const hasValue = value => value !== "" && value != null && Number.isFinite(Number(value));

    return CATEGORY_RECORDS.map(category => {
      const candidates = eligible.filter(row => {
        if (!hasValue(row[category.key])) return false;
        if (!category.minimum) return true;
        // AB and IP aren't in the Fantrax import; a week without them still qualifies
        // (every imported week so far has had well over the minimum).
        const [field, min] = category.minimum;
        return !hasValue(row[field]) || Number(row[field]) >= min;
      });

      const sorted = [...candidates].sort((a, b) => category.lowerIsBetter
        ? Number(a[category.key]) - Number(b[category.key])
        : Number(b[category.key]) - Number(a[category.key]));
      const best = sorted[0];
      if (!best) return null;

      const value = Number(best[category.key]);
      const tiedWith = sorted.filter(row => Number(row[category.key]) === value).length - 1;
      return { ...category, row: best, value, tiedWith };
    }).filter(Boolean);
  }

  // 1 if a wins the category, -1 if b wins, 0 for a tie or a missing value.
  function compareValue(a, b, rule) {
    const av = Number(a);
    const bv = Number(b);
    if (!Number.isFinite(av) || !Number.isFinite(bv) || av === bv) return 0;
    return (rule === "low" ? av < bv : av > bv) ? 1 : -1;
  }

  // Categories won by `row` against `other`, scored on that season's categories (ties count half).
  function categoryPoints(row, other) {
    const rules = isYahooRow(row) ? YAHOO_CATEGORY_RULES : window.UTIAnalytics.CATEGORY_RULES;
    return Object.entries(rules).reduce((sum, [category, rule]) => {
      const result = compareValue(row[category], other[category], rule);
      return sum + (result > 0 ? 1 : result === 0 ? 0.5 : 0);
    }, 0);
  }

  // Each team's all-play rank for every regular-season week (1 = beat the most teams).
  function weeklyAllPlayRanks(rows) {
    const { phaseFor } = window.UTIAnalytics;
    const byWeek = {};
    rows.filter(row => phaseFor(row) === "regular").forEach(row => {
      const key = `${seasonOf(row)}|${row.week}`;
      (byWeek[key] = byWeek[key] || []).push(row);
    });

    const ranks = {};
    Object.entries(byWeek).forEach(([key, weekRows]) => {
      const points = weekRows.map(row => ({
        team: row.team,
        points: weekRows.reduce((sum, other) => {
          if (other === row) return sum;
          const mine = categoryPoints(row, other);
          const theirs = categoryPoints(other, row);
          return sum + (mine > theirs ? 1 : mine === theirs ? 0.5 : 0);
        }, 0)
      })).sort((a, b) => b.points - a.points);

      points.forEach((entry, index) => {
        ranks[`${key}|${entry.team}`] = { rank: index + 1, of: points.length };
      });
    });
    return ranks;
  }

  // Robbed: a top-3 week against the whole league, but lost. Stolen: bottom-3 week, but won.
  function robbedAndStolen(rows) {
    const { matchupResult, phaseFor } = window.UTIAnalytics;
    const ranks = weeklyAllPlayRanks(rows);
    const robbed = [];
    const stolen = [];

    rows.filter(row => phaseFor(row) === "regular").forEach(row => {
      const rank = ranks[`${seasonOf(row)}|${row.week}|${row.team}`];
      if (!rank) return;
      const result = matchupResult(row);
      const entry = { row, ...rank };
      if (result === "L" && rank.rank <= 3) robbed.push(entry);
      if (result === "W" && rank.rank > rank.of - 3) stolen.push(entry);
    });

    // Most robbed (best rank, then the narrowest loss) and most stolen first.
    const margin = ({ row }) => Math.abs(row.official_score_for - row.official_score_against);
    robbed.sort((a, b) => a.rank - b.rank || margin(a) - margin(b) || seasonOf(b.row) - seasonOf(a.row) || a.row.week - b.row.week);
    stolen.sort((a, b) => b.rank - a.rank || margin(a) - margin(b) || seasonOf(b.row) - seasonOf(a.row) || a.row.week - b.row.week);
    return { robbed, stolen };
  }

  // Streaks run within a season. For each team: its best win streak and worst losing streak
  // (with the season they came in) and its streak in the latest season shown.
  function seasonStreaks(rows) {
    const bySeason = {};
    rows.forEach(row => (bySeason[seasonOf(row)] = bySeason[seasonOf(row)] || []).push(row));
    const latestSeason = Math.max(...Object.keys(bySeason).map(Number));

    const teams = {};
    Object.entries(bySeason).forEach(([season, seasonRows]) => {
      Object.entries(window.UTIAnalytics.teamStreaks(seasonRows)).forEach(([name, streak]) => {
        const entry = teams[name] = teams[name] || { longestWin: { length: 0 }, longestLoss: { length: 0 }, current: null };
        if (streak.longestWin.length > entry.longestWin.length) entry.longestWin = { ...streak.longestWin, season };
        if (streak.longestLoss.length > entry.longestLoss.length) entry.longestLoss = { ...streak.longestLoss, season };
        if (Number(season) === latestSeason) entry.current = streak.current;
      });
    });
    return teams;
  }

  // Head-to-head records for every pair of franchises across all tracked seasons.
  function rivalries(allRows) {
    const pairs = {};

    window.UTIAnalytics.uniqueMatchups(allRows).forEach(matchup => {
      const [a, b] = [matchup.winner.team, matchup.loser.team].sort();
      const key = `${a}|${b}`;
      const pair = pairs[key] = pairs[key] || { a, b, wins: { [a]: 0, [b]: 0 }, ties: 0, seasons: new Set() };
      pair.seasons.add(matchup.season);
      if (matchup.tie) pair.ties += 1;
      else pair.wins[matchup.winner.team] += 1;
    });

    return Object.values(pairs).map(pair => {
      const [leader, trailer] = pair.wins[pair.a] >= pair.wins[pair.b] ? [pair.a, pair.b] : [pair.b, pair.a];
      const games = pair.wins[pair.a] + pair.wins[pair.b] + pair.ties;
      return {
        leader,
        trailer,
        leaderWins: pair.wins[leader],
        trailerWins: pair.wins[trailer],
        ties: pair.ties,
        games,
        leaderPct: (pair.wins[leader] + pair.ties / 2) / games,
        seasons: [...pair.seasons].sort()
      };
    });
  }

  function allTrackedRows() {
    const history = HISTORY_GLOBALS.flatMap(([name, season]) =>
      (window[name] || []).map(row => ({ ...row, season: Number(row.season || season) }))
    );
    const current = (window.UTI_WEEKLY_TEAM_STATS || []).map(row => ({ ...row, season: Number(row.season || CURRENT_SEASON) }));
    return [...history, ...current];
  }

  /* ---------- Rendering ---------- */

  function setHtml(id, html) {
    const target = document.getElementById(id);
    if (target) target.innerHTML = html;
  }

  function renderHighlights(matchups, streaks) {
    const blowout = [...matchups].sort((a, b) => b.margin - a.margin || b.season - a.season)[0];
    const streakList = Object.entries(streaks);
    const [winTeam, winStreak] = [...streakList].sort((a, b) => b[1].longestWin.length - a[1].longestWin.length)[0];
    const [lossTeam, lossStreak] = [...streakList].sort((a, b) => b[1].longestLoss.length - a[1].longestLoss.length)[0];
    const ties = matchups.filter(matchup => matchup.tie).length;

    const tile = (label, value, valueClass, who, note) => `
      <div class="ui-stat">
        <span class="ui-label">${label}</span>
        <strong class="ui-stat-value ${valueClass}">${value}</strong>
        ${who ? `<span class="ui-stat-who">${team(who, true)}</span>` : ""}
        <span class="ui-stat-note">${note}</span>
      </div>`;

    setHtml("rbHighlights", [
      tile("Biggest blowout", score(blowout), "is-money", blowout.winner.team, `over ${escapeHtml(blowout.loser.team)} · ${weekLink(blowout.season, blowout.week, blowout.round)}`),
      tile("Longest win streak", `W${winStreak.longestWin.length}`, "is-up", winTeam, weeksLabel(winStreak.longestWin.season, winStreak.longestWin)),
      tile("Longest losing streak", `L${lossStreak.longestLoss.length}`, "is-down", lossTeam, weeksLabel(lossStreak.longestLoss.season, lossStreak.longestLoss)),
      tile("Tied matchups", `${ties}`, "", null, `of ${matchups.length} matchups ended all square`)
    ].join(""));
  }

  function renderCategoryRecords(rows) {
    setHtml("rbCategoryRecords", categoryRecords(rows).map(record => `
      <article class="rb-record">
        <span class="ui-label">${escapeHtml(record.label)}</span>
        <strong class="rb-record-value">${record.format ? record.format(record.value) : record.value}</strong>
        ${team(record.row.team, true)}
        <span class="rb-record-note">${weekLink(seasonOf(record.row), Number(record.row.week), record.row.round)} vs ${escapeHtml(record.row.opponent)}${record.tiedWith ? ` · tied ${record.tiedWith}×` : ""}</span>
      </article>
    `).join(""));
  }

  function renderBlowouts(matchups) {
    const top = [...matchups].sort((a, b) => b.margin - a.margin || b.season - a.season || a.week - b.week).slice(0, 5);
    setHtml("rbBlowouts", top.map((matchup, index) => `
      <li class="rb-row">
        <span class="rb-row-rank">${index + 1}</span>
        <span class="rb-row-main">${team(matchup.winner.team)}<span class="rb-row-detail">over ${escapeHtml(matchup.loser.team)} · ${weekLink(matchup.season, matchup.week, matchup.round)}</span></span>
        <strong class="rb-row-value">${score(matchup)}</strong>
      </li>
    `).join(""));
  }

  function renderStreaks(streaks) {
    const rowsHtml = Object.entries(streaks)
      .sort((a, b) => b[1].longestWin.length - a[1].longestWin.length || a[0].localeCompare(b[0]))
      .map(([name, streak]) => {
        const current = streak.current;
        const tone = current?.type === "W" ? " is-win" : current?.type === "L" ? " is-loss" : "";
        // Teams that didn't play in the latest season shown have no current streak.
        const now = current ? `<span class="ui-streak${tone}">${current.type}${current.length}</span>` : `<span class="rb-dash">–</span>`;
        const when = run => selection === "all" && run.length ? `<small>${run.season}</small>` : "";
        return `
          <li class="rb-streak-row">
            <span class="rb-row-main">${team(name)}</span>
            <span class="rb-streak-stat"><span class="ui-label">Now</span>${now}</span>
            <span class="rb-streak-stat"><span class="ui-label">Best</span><b class="is-up">W${streak.longestWin.length}</b>${when(streak.longestWin)}</span>
            <span class="rb-streak-stat"><span class="ui-label">Worst</span><b class="is-down">L${streak.longestLoss.length}</b>${when(streak.longestLoss)}</span>
          </li>`;
      }).join("");
    setHtml("rbStreaks", rowsHtml);
  }

  // All-time lists keep the eight biggest; a single season shows every one.
  function renderRobbedAndStolen(rows) {
    const { robbed, stolen } = robbedAndStolen(rows);
    const limit = selection === "all" ? 8 : Infinity;
    const entryHtml = ({ row, rank, of }, verb) => `
      <li class="rb-row">
        <span class="rb-row-rank">#${rank}</span>
        <span class="rb-row-main">${team(row.team)}<span class="rb-row-detail">${verb} ${row.official_score_for}–${row.official_score_against} vs ${escapeHtml(row.opponent)} · ${weekLink(seasonOf(row), Number(row.week))}</span></span>
        <span class="rb-row-value rb-row-of">of ${of}</span>
      </li>`;

    setHtml("rbRobbed", robbed.length ? robbed.slice(0, limit).map(entry => entryHtml(entry, "Lost")).join("") : `<li class="rb-empty">Nobody got robbed this season.</li>`);
    setHtml("rbStolen", stolen.length ? stolen.slice(0, limit).map(entry => entryHtml(entry, "Won")).join("") : `<li class="rb-empty">No stolen wins this season.</li>`);
  }

  function renderRivalries(allRows) {
    const pairs = rivalries(allRows);
    const lopsided = pairs
      .filter(pair => pair.games >= 4)
      .sort((a, b) => b.leaderPct - a.leaderPct || b.games - a.games)
      .slice(0, 6);
    const even = pairs
      .filter(pair => pair.games >= 6)
      .sort((a, b) => (a.leaderWins - a.trailerWins) - (b.leaderWins - b.trailerWins) || b.games - a.games)
      .slice(0, 4);

    const pairHtml = pair => `
      <li class="rb-rivalry">
        <span class="rb-rivalry-teams">
          ${team(pair.leader)}
          <span class="rb-rivalry-vs">${pair.leaderWins === pair.trailerWins ? "even with" : "leads"}</span>
          ${team(pair.trailer)}
        </span>
        <span class="rb-rivalry-record">
          <strong>${pair.leaderWins}-${pair.trailerWins}${pair.ties ? `-${pair.ties}` : ""}</strong>
          <small>${pair.seasons.length === 1 ? pair.seasons[0] : `${pair.seasons[0]}–${pair.seasons[pair.seasons.length - 1]}`}</small>
        </span>
      </li>`;

    setHtml("rbLopsided", lopsided.map(pairHtml).join(""));
    setHtml("rbEven", even.map(pairHtml).join(""));
  }

  // Everything above the rivalry ledger follows the season buttons.
  function renderSelection(allRows) {
    const rows = selection === "all" ? allRows : allRows.filter(row => seasonOf(row) === selection);
    const matchups = window.UTIAnalytics.uniqueMatchups(rows);
    const streaks = seasonStreaks(rows);
    const seasons = [...new Set(allRows.map(seasonOf))].sort();
    const span = selection === "all" ? `${seasons[0]}–${seasons[seasons.length - 1]}` : String(selection);

    document.querySelectorAll("[data-rb-span]").forEach(node => { node.textContent = span; });
    renderHighlights(matchups, streaks);
    renderCategoryRecords(rows);
    renderBlowouts(matchups);
    renderStreaks(streaks);
    renderRobbedAndStolen(rows);
  }

  function setupSeasonButtons(allRows) {
    const group = document.getElementById("rbSeasons");
    if (!group) return;

    const seasons = [...new Set(allRows.map(seasonOf))].sort((a, b) => b - a);
    group.innerHTML = [["all", "All-time"], ...seasons.map(season => [season, String(season)])]
      .map(([value, label]) => `<button type="button" data-rb-season="${value}" aria-pressed="${value === selection}">${label}</button>`)
      .join("");

    group.addEventListener("click", event => {
      const button = event.target.closest("[data-rb-season]");
      if (!button) return;
      selection = button.dataset.rbSeason === "all" ? "all" : Number(button.dataset.rbSeason);
      group.querySelectorAll("button").forEach(other => other.setAttribute("aria-pressed", String(other === button)));
      renderSelection(allRows);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.UTIAnalytics) return;
    const allRows = allTrackedRows();
    if (!allRows.length) return;

    setupSeasonButtons(allRows);
    renderSelection(allRows);
    renderRivalries(allRows);
  });
})();
