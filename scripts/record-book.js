/*
  Record Book (record-book.html): 2026 single-week records, streaks, Robbed & Stolen,
  biggest blowouts, and the all-time rivalry ledger.

  Everything is computed from data/weekly-team-stats.js (2026) and the Yahoo history files
  in data/history/ (2023-2025), so it updates when those files do.
*/
(() => {
  // 2026 recap pages start at Week 3.
  const FIRST_RECAP_WEEK = 3;
  // Week 1 was the two-week opener (March 25 - April 5), so its counting stats are left out of category records.
  const FIRST_RECORD_WEEK = 2;

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
    { key: "ERA", label: "ERA", lowerIsBetter: true, minimum: ["IP", 30], format: value => value.toFixed(2) },
    { key: "WHIP", label: "WHIP", lowerIsBetter: true, minimum: ["IP", 30], format: value => value.toFixed(3) },
    { key: "BAA", label: "Opponent average", lowerIsBetter: true, minimum: ["IP", 30], format: value => value.toFixed(3).replace(/^0/, "") }
  ];

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

  // "Week 12" linked to that week's recap when one exists.
  function weekLink(week) {
    const label = `Week ${week}`;
    return week >= FIRST_RECAP_WEEK ? `<a href="2026/week${week}.html">${label}</a>` : label;
  }

  const score = matchup => `${matchup.winner.score}–${matchup.loser.score}`;

  /* ---------- Calculations ---------- */

  // Best single-week value for each category, with how many other team-weeks tied it.
  function categoryRecords(rows) {
    const eligible = rows.filter(row => Number(row.week) >= FIRST_RECORD_WEEK);

    return CATEGORY_RECORDS.map(category => {
      const candidates = eligible.filter(row => {
        if (!Number.isFinite(Number(row[category.key]))) return false;
        if (!category.minimum) return true;
        const [field, min] = category.minimum;
        return Number(row[field]) >= min;
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

  // Each team's all-play rank for every regular-season week (1 = beat the most teams).
  function weeklyAllPlayRanks(rows) {
    const { compareTeams, phaseFor } = window.UTIAnalytics;
    const byWeek = {};
    rows.filter(row => phaseFor(row) === "regular").forEach(row => (byWeek[row.week] = byWeek[row.week] || []).push(row));

    const ranks = {};
    Object.entries(byWeek).forEach(([week, weekRows]) => {
      const points = weekRows.map(row => ({
        team: row.team,
        points: weekRows.reduce((sum, other) => {
          if (other === row) return sum;
          const result = compareTeams(row, other);
          return sum + (result.scoreA > result.scoreB ? 1 : result.scoreA === result.scoreB ? 0.5 : 0);
        }, 0)
      })).sort((a, b) => b.points - a.points);

      points.forEach((entry, index) => {
        ranks[`${week}|${entry.team}`] = { rank: index + 1, of: points.length };
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
      const rank = ranks[`${row.week}|${row.team}`];
      if (!rank) return;
      const result = matchupResult(row);
      const entry = { row, ...rank };
      if (result === "L" && rank.rank <= 3) robbed.push(entry);
      if (result === "W" && rank.rank > rank.of - 3) stolen.push(entry);
    });

    robbed.sort((a, b) => a.rank - b.rank || a.row.week - b.row.week);
    stolen.sort((a, b) => b.rank - a.rank || a.row.week - b.row.week);
    return { robbed, stolen };
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
      (window[name] || []).map(row => ({ ...row, season: row.season || season }))
    );
    const current = (window.UTI_WEEKLY_TEAM_STATS || []).map(row => ({ ...row, season: row.season || 2026 }));
    return [...history, ...current];
  }

  /* ---------- Rendering ---------- */

  function setHtml(id, html) {
    const target = document.getElementById(id);
    if (target) target.innerHTML = html;
  }

  function renderHighlights(matchups, streaks) {
    const blowout = [...matchups].sort((a, b) => b.margin - a.margin)[0];
    const streakList = Object.entries(streaks);
    const [winTeam, winStreak] = streakList.sort((a, b) => b[1].longestWin.length - a[1].longestWin.length)[0];
    const [lossTeam, lossStreak] = streakList.sort((a, b) => b[1].longestLoss.length - a[1].longestLoss.length)[0];
    const ties = matchups.filter(matchup => matchup.tie).length;

    const tile = (label, value, valueClass, who, note) => `
      <div class="ui-stat">
        <span class="ui-label">${label}</span>
        <strong class="ui-stat-value ${valueClass}">${value}</strong>
        ${who ? `<span class="ui-stat-who">${team(who, true)}</span>` : ""}
        <span class="ui-stat-note">${note}</span>
      </div>`;

    setHtml("rbHighlights", [
      tile("Biggest blowout", score(blowout), "is-money", blowout.winner.team, `over ${escapeHtml(blowout.loser.team)} · ${weekLink(blowout.week)}`),
      tile("Longest win streak", `W${winStreak.longestWin.length}`, "is-up", winTeam, `Weeks ${winStreak.longestWin.startWeek}–${winStreak.longestWin.endWeek}`),
      tile("Longest losing streak", `L${lossStreak.longestLoss.length}`, "is-down", lossTeam, `Weeks ${lossStreak.longestLoss.startWeek}–${lossStreak.longestLoss.endWeek}`),
      tile("Tied matchups", `${ties}`, "", null, `of ${matchups.length} matchups ended 8–8`)
    ].join(""));
  }

  function renderCategoryRecords(rows) {
    setHtml("rbCategoryRecords", categoryRecords(rows).map(record => `
      <article class="rb-record">
        <span class="ui-label">${escapeHtml(record.label)}</span>
        <strong class="rb-record-value">${record.format ? record.format(record.value) : record.value}</strong>
        ${team(record.row.team, true)}
        <span class="rb-record-note">${weekLink(Number(record.row.week))} vs ${escapeHtml(record.row.opponent)}${record.tiedWith ? ` · tied ${record.tiedWith}×` : ""}</span>
      </article>
    `).join(""));
  }

  function renderBlowouts(matchups) {
    const top = [...matchups].sort((a, b) => b.margin - a.margin || a.week - b.week).slice(0, 5);
    setHtml("rbBlowouts", top.map((matchup, index) => `
      <li class="rb-row">
        <span class="rb-row-rank">${index + 1}</span>
        <span class="rb-row-main">${team(matchup.winner.team)}<span class="rb-row-detail">over ${escapeHtml(matchup.loser.team)} · ${weekLink(matchup.week)}</span></span>
        <strong class="rb-row-value">${score(matchup)}</strong>
      </li>
    `).join(""));
  }

  function renderStreaks(streaks) {
    const rowsHtml = Object.entries(streaks)
      .sort((a, b) => b[1].longestWin.length - a[1].longestWin.length || a[0].localeCompare(b[0]))
      .map(([name, streak]) => {
        const current = streak.current;
        const tone = current.type === "W" ? " is-win" : current.type === "L" ? " is-loss" : "";
        return `
          <li class="rb-streak-row">
            <span class="rb-row-main">${team(name)}</span>
            <span class="rb-streak-stat"><span class="ui-label">Now</span><span class="ui-streak${tone}">${current.type}${current.length}</span></span>
            <span class="rb-streak-stat"><span class="ui-label">Best</span><b class="is-up">W${streak.longestWin.length}</b></span>
            <span class="rb-streak-stat"><span class="ui-label">Worst</span><b class="is-down">L${streak.longestLoss.length}</b></span>
          </li>`;
      }).join("");
    setHtml("rbStreaks", rowsHtml);
  }

  function renderRobbedAndStolen(rows) {
    const { robbed, stolen } = robbedAndStolen(rows);
    const entryHtml = ({ row, rank, of }, verb) => `
      <li class="rb-row">
        <span class="rb-row-rank">#${rank}</span>
        <span class="rb-row-main">${team(row.team)}<span class="rb-row-detail">${verb} ${row.official_score_for}–${row.official_score_against} vs ${escapeHtml(row.opponent)} · ${weekLink(Number(row.week))}</span></span>
        <span class="rb-row-value rb-row-of">of ${of}</span>
      </li>`;

    setHtml("rbRobbed", robbed.length ? robbed.map(entry => entryHtml(entry, "Lost")).join("") : `<li class="rb-empty">Nobody got robbed this season.</li>`);
    setHtml("rbStolen", stolen.length ? stolen.map(entry => entryHtml(entry, "Won")).join("") : `<li class="rb-empty">No stolen wins this season.</li>`);
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

  document.addEventListener("DOMContentLoaded", () => {
    const rows = window.UTI_WEEKLY_TEAM_STATS;
    if (!Array.isArray(rows) || !rows.length || !window.UTIAnalytics) return;

    const matchups = window.UTIAnalytics.uniqueMatchups(rows);
    const streaks = window.UTIAnalytics.teamStreaks(rows);

    renderHighlights(matchups, streaks);
    renderCategoryRecords(rows);
    renderBlowouts(matchups);
    renderStreaks(streaks);
    renderRobbedAndStolen(rows);
    renderRivalries(allTrackedRows());
  });
})();
