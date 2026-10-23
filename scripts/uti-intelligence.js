/*
  UTI Intelligence: renders the analytics boards (All-Play, Luck, Power, Category Kings),
  the Yahoo season archives, franchise records, and the team profile modal.

  Used by index.html (preview), uti-intelligence.html (full board), and history.html (archives).
  Depends on window.UTIAnalytics from scripts/league-analytics.js.

  Sections:
    1. Config
    2. Formatting helpers
    3. Shared HTML pieces (team identity, metric cards, charts)
    4. Record math (all-play, category strength, weekly ranks)
    5. Season data access + franchise history records
    6. Board renderers (current season, Yahoo archives, history overview/teaser)
    7. Franchise resume, season placements, head-to-head
    8. Team profile modal
    9. Loading + startup
*/
(() => {
  /* ---------- 1. Config ---------- */

  const CURRENT_SEASON = 2026;
  const FALLBACK_LOGO = "images/owners/gunnarrhea.png";
  const LEGACY_TEAM_LOGOS = {
    "Pat James's Swell Team": "images/owners/pat-james-swell-team.png",
    "You Don't Kno Bo (2023)": "images/owners/you-dont-kno-bo-2023.png"
  };

  // 2026 Fantrax categories.
  const HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB"];
  const PITCHING_CATEGORIES = ["W", "L", "QS", "NS", "K", "ERA", "WHIP", "BAA"];

  // 2023-2025 Yahoo seasons all used the same categories.
  const YAHOO_HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "TB", "AVG", "NSB"];
  const YAHOO_PITCHING_CATEGORIES = ["W", "L", "K", "ERA", "WHIP", "QS", "BSV", "SVH"];
  const YAHOO_RULES = {
    R: "high",
    HR: "high",
    RBI: "high",
    BB: "high",
    SO: "low",
    TB: "high",
    AVG: "high",
    NSB: "high",
    W: "high",
    L: "low",
    K: "high",
    ERA: "low",
    WHIP: "low",
    QS: "high",
    BSV: "low",
    SVH: "high"
  };

  // Yahoo history files, loaded in this order. 2023 only has partial week-by-week data.
  const YAHOO_SEASONS = [
    { season: 2025, src: "data/history/2025-yahoo-weekly-team-stats.js", globalName: "UTI_YAHOO_2025_WEEKLY_TEAM_STATS" },
    { season: 2024, src: "data/history/2024-yahoo-weekly-team-stats.js", globalName: "UTI_YAHOO_2024_WEEKLY_TEAM_STATS" },
    { season: 2023, src: "data/history/2023-yahoo-weekly-team-stats.js?v=2023-week19", globalName: "UTI_YAHOO_2023_WEEKLY_TEAM_STATS" }
  ];

  // Old team names that should open the current franchise's profile.
  const TEAM_PROFILE_ALIASES = {
    "Gunnarrhea": ["Gunnarrhea", "Acuña Handle the Gunnarrhea?", "Rita's Favorite Team"],
    "BTA Boyz": ["BTA Boyz", "Yoshida Yo Pants", "Yoshida Yo Pants 💩", "The Lonely Bin"],
    "You Don't Know Bo": ["You Don't Know Bo"],
    "You Don't Kno Bo (2023)": ["You Don't Kno Bo (2023)"],
    "Pat James's Swell Team": ["Pat James's Swell Team"],
    "BB's Bold Team": ["BB's Bold Team", "BB’s Bold Team"],
    "Dixon Cider": ["Dixon Cider"],
    "Goodyear Gila Monsters": ["Goodyear Gila Monsters"],
    "John's Super Team": ["John's Super Team", "John’s Super Team"],
    "Mactown MacDaddies": ["Mactown MacDaddies"],
    "Me So Heorny": ["Me So Heorny", "Me so Randy", "Me So Randy"],
    "This Is Mizerable": ["This Is Mizerable", "This is Mizerable", "I have a Bohmer", "Vladdys Hammer", "Vladdy's Hammer"]
  };

  const PLACEMENT_META = {
    champion: { icon: "🥇", label: "Championships", header: "Gold" },
    runnerUp: { icon: "🥈", label: "Runner-up finishes", header: "Silver" },
    thirdPlace: { icon: "🥉", label: "Third-place finishes", header: "Bronze" },
    regularSeasonFirst: { icon: "👑", label: "Regular-season No. 1 finishes", header: "Reg. #1" }
  };

  /* ---------- State ---------- */

  let latestAnalytics = null; // current (2026) season summary
  const yahooHistory = {};     // season -> { analytics, allRows }
  let activeProfileTeam = null;
  let activeProfileSeason = String(CURRENT_SEASON);

  /* ---------- 2. Formatting helpers ---------- */

  function formatPct(value) {
    return `${(Number(value || 0) * 100).toFixed(1)}%`;
  }

  function formatSigned(value) {
    const n = Number(value || 0);
    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
  }

  function formatRecord(record) {
    if (!record) return "—";
    return `${record.wins}-${record.losses}-${record.ties}`;
  }

  function formatPowerRating(row) {
    return `${(row.rating * 100).toFixed(1)} / 100`;
  }

  function weekSpan(weeks) {
    return `${weeks[0]}–${weeks[weeks.length - 1]}`;
  }

  function plural(count, word) {
    return `${word}${count === 1 ? "" : "s"}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function logoFor(team) {
    return LEGACY_TEAM_LOGOS[team] || window.TEAM_LOGOS?.[team] || FALLBACK_LOGO;
  }

  function historyPhase(row) {
    return String(row?.phase || row?.season_type || "regular").toLowerCase() === "playoffs"
      ? "playoffs"
      : "regular";
  }

  function isPlayoffRow(row) {
    return historyPhase(row) === "playoffs";
  }

  function isHistoryPage() {
    return document.body.classList.contains("uti-history-page-body");
  }

  /* ---------- 3. Shared HTML pieces ---------- */

  function teamIdentity(team, compact = false, season = "2026") {
    const safeTeam = escapeHtml(team);
    const safeSeason = escapeHtml(season);
    return `
      <span class="uti-team-identity uti-team-profile-trigger ${compact ? "is-compact" : ""}" data-team-profile="${safeTeam}" data-profile-open-season="${safeSeason}" role="button" tabindex="0" aria-label="Open ${safeTeam} profile">
        <img class="uti-team-logo" src="${logoFor(team)}" alt="" loading="lazy">
        <span class="uti-team-name">${safeTeam}</span>
      </span>
    `;
  }

  function metricCard({ icon, eyebrow, team, value, copy, tone = "", season = "2026" }) {
    return `
      <article class="uti-intel-card uti-team-profile-trigger ${tone}" data-team-profile="${escapeHtml(team)}" data-profile-open-season="${escapeHtml(season)}" role="button" tabindex="0" aria-label="Open ${escapeHtml(team)} profile">
        <div class="uti-intel-card-top">
          <span class="uti-intel-icon" aria-hidden="true">${icon}</span>
          <span class="uti-intel-label">${eyebrow}</span>
        </div>
        <div class="uti-intel-card-team">
          <img class="uti-intel-card-logo" src="${logoFor(team)}" alt="" loading="lazy">
          <strong class="uti-intel-team">${escapeHtml(team)}</strong>
        </div>
        <span class="uti-intel-value">${value}</span>
        <span class="uti-intel-copy">${copy}</span>
      </article>
    `;
  }

  // The four headline cards on every board: All-Play leader, Power #1, luckiest, unluckiest.
  // `cards` supplies the icon/eyebrow/copy/tone for each; `copy` may be a function of the row.
  const LEADER_CARD_VALUE = {
    allPlay: formatRecord,
    power: formatPowerRating,
    luckiest: row => formatSigned(row.luck),
    unluckiest: row => formatSigned(row.luck)
  };

  function renderLeaderCards(data, season, cards) {
    const luck = data.luckIndex || [];
    const rows = {
      allPlay: sortedAllPlayFor(data)[0],
      power: (data.powerRankings || [])[0],
      luckiest: luck[0],
      unluckiest: luck[luck.length - 1]
    };

    return cards.map(card => {
      const row = rows[card.kind];
      const copy = typeof card.copy === "function"
        ? (row ? card.copy(row) : "Waiting for data")
        : card.copy;

      return metricCard({
        icon: card.icon,
        eyebrow: card.eyebrow,
        team: row?.team || "—",
        value: row ? LEADER_CARD_VALUE[card.kind](row) : "—",
        copy,
        tone: card.tone,
        season
      });
    }).join("");
  }

  function renderAllPlayChart(allPlay, season = "2026") {
    const maxPct = Math.max(...allPlay.map(row => Number(row.winPct || 0)), 0.01);

    return `
      <div class="uti-rank-chart">
        ${allPlay.map((row, index) => {
          const pct = Number(row.winPct || 0);
          const width = Math.max(3, (pct / maxPct) * 100);
          return `
            <div class="uti-rank-row">
              <span class="uti-rank-number">${index + 1}</span>
              ${teamIdentity(row.team, false, season)}
              <div class="uti-rank-bar-zone">
                <div class="uti-rank-bar-track">
                  <span class="uti-rank-bar uti-bar-allplay" style="width:${width.toFixed(1)}%"></span>
                </div>
                <span class="uti-rank-sub">${formatRecord(row)}</span>
              </div>
              <strong class="uti-rank-value">${formatPct(pct)}</strong>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderPowerChart(powerRankings, season = "2026") {
    return `
      <div class="uti-rank-chart">
        ${powerRankings.map((row, index) => {
          const rating = Math.max(0, Math.min(100, Number(row.rating || 0) * 100));
          return `
            <div class="uti-rank-row ${index < 3 ? `is-top-${index + 1}` : ""}">
              <span class="uti-rank-number">${index + 1}</span>
              ${teamIdentity(row.team, false, season)}
              <div class="uti-rank-bar-zone">
                <div class="uti-rank-bar-track">
                  <span class="uti-rank-bar uti-bar-power" style="width:${Math.max(3, rating).toFixed(1)}%"></span>
                </div>
                <span class="uti-rank-sub">
                  AP ${formatPct(row.allPlayPct)} · CAT ${formatPct(row.categoryPct)} · FORM ${formatPct(row.recentPct)}
                </span>
              </div>
              <strong class="uti-rank-value">${rating.toFixed(1)}</strong>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderLuckChart(luckIndex, season = "2026") {
    const maxAbs = Math.max(...luckIndex.map(row => Math.abs(Number(row.luck || 0))), 0.01);

    return `
      <div class="uti-luck-chart">
        <div class="uti-luck-scale">
          <span>Unlucky</span>
          <span>Expected</span>
          <span>Lucky</span>
        </div>
        ${luckIndex.map((row, index) => {
          const luck = Number(row.luck || 0);
          const halfWidth = (Math.abs(luck) / maxAbs) * 50;
          const isPositive = luck >= 0;

          return `
            <div class="uti-luck-row">
              <span class="uti-rank-number">${index + 1}</span>
              ${teamIdentity(row.team, false, season)}
              <div class="uti-luck-plot">
                <span class="uti-luck-zero"></span>
                <span
                  class="uti-luck-bar ${isPositive ? "is-positive" : "is-negative"}"
                  style="${isPositive
                    ? `left:50%;width:${halfWidth.toFixed(1)}%`
                    : `right:50%;width:${halfWidth.toFixed(1)}%`}"
                ></span>
              </div>
              <strong class="uti-luck-value ${isPositive ? "is-positive" : "is-negative"}">${formatSigned(luck)}</strong>
              <span class="uti-luck-detail">
                ${Number(row.actualPoints).toFixed(1)} actual · ${Number(row.expectedPoints).toFixed(2)} expected
              </span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderCategoryChart(data, season = "2026") {
    return `
      <div class="uti-category-grid">
        ${data.categories.map(category => {
          const king = data.categoryKings[category][0];
          const pct = Number(king?.winPct || 0);
          return `
            <article class="uti-category-card">
              <div class="uti-category-top">
                <span class="uti-category-name">${escapeHtml(category)}</span>
                <strong>${formatPct(pct)}</strong>
              </div>
              <div class="uti-category-team">
                ${teamIdentity(king?.team || "—", true, season)}
              </div>
              <div class="uti-category-meter">
                <span style="width:${Math.max(3, pct * 100).toFixed(1)}%"></span>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  // Fills the four chart tables that share an id prefix, e.g. "utiHistory2024" -> #utiHistory2024AllPlayTable.
  function renderChartTables(idPrefix, data, season) {
    const charts = {
      AllPlayTable: () => renderAllPlayChart(sortedAllPlayFor(data), season),
      LuckTable: () => renderLuckChart(data.luckIndex, season),
      PowerTable: () => renderPowerChart(data.powerRankings, season),
      CategoryTable: () => renderCategoryChart(data, season)
    };

    Object.entries(charts).forEach(([suffix, render]) => {
      const target = document.getElementById(`${idPrefix}${suffix}`);
      if (target) target.innerHTML = render();
    });
  }

  /* ---------- 4. Record math ---------- */

  function emptyRecord() {
    return { wins: 0, losses: 0, ties: 0, points: 0, games: 0, winPct: 0 };
  }

  function ensureRecord(records, team) {
    if (!records[team]) records[team] = emptyRecord();
    return records[team];
  }

  function setWinPct(record) {
    record.winPct = record.games ? record.points / record.games : 0;
  }

  // Adds one game to `record`. outcome is "win", "loss", or "tie".
  function addOutcome(record, outcome) {
    record.games += 1;
    if (outcome === "win") {
      record.wins += 1;
      record.points += 1;
    } else if (outcome === "loss") {
      record.losses += 1;
    } else {
      record.ties += 1;
      record.points += 0.5;
    }
  }

  // Adds one head-to-head game to both records. result > 0 means A won, < 0 means B won.
  function addHeadToHead(recordA, recordB, result) {
    addOutcome(recordA, result > 0 ? "win" : result < 0 ? "loss" : "tie");
    addOutcome(recordB, result < 0 ? "win" : result > 0 ? "loss" : "tie");
  }

  // Official matchup outcome for a team-week row, honoring playoff tiebreak winners.
  function matchupOutcome(row) {
    const scoreFor = Number(row?.official_score_for);
    const scoreAgainst = Number(row?.official_score_against);
    if (!Number.isFinite(scoreFor) || !Number.isFinite(scoreAgainst)) return null;

    if (scoreFor > scoreAgainst) return "win";
    if (scoreFor < scoreAgainst) return "loss";

    const tiebreakWinner = String(row?.tiebreak_winner || row?.playoff_tiebreak_winner || "").trim();
    if (!tiebreakWinner) return "tie";

    const teamName = String(row?.team || "").trim();
    const opponentName = String(row?.opponent || "").trim();
    if (tiebreakWinner === teamName) return "win";
    if (tiebreakWinner === opponentName) return "loss";
    return "tie";
  }

  function recordFromRows(rows) {
    const record = emptyRecord();

    rows.forEach(row => {
      const outcome = matchupOutcome(row);
      if (outcome) addOutcome(record, outcome);
    });

    setWinPct(record);
    return record;
  }

  function combineRecords(...records) {
    const combined = emptyRecord();

    records.filter(Boolean).forEach(record => {
      combined.wins += Number(record.wins || 0);
      combined.losses += Number(record.losses || 0);
      combined.ties += Number(record.ties || 0);
      combined.games += Number(record.games || 0);
      combined.points += Number(record.points ?? (Number(record.wins || 0) + Number(record.ties || 0) * 0.5));
    });

    setWinPct(combined);
    return combined;
  }

  function groupRowsByWeek(rows) {
    return rows.reduce((map, row) => {
      const week = Number(row.week);
      if (!map.has(week)) map.set(week, []);
      map.get(week).push(row);
      return map;
    }, new Map());
  }

  // Calls fn(a, b) once for every pair of rows in the list.
  function forEachPair(rows, fn) {
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        fn(rows[i], rows[j]);
      }
    }
  }

  function compareCategoryValue(a, b, category, rules) {
    const av = Number(a?.[category]);
    const bv = Number(b?.[category]);
    if (!Number.isFinite(av) || !Number.isFinite(bv) || av === bv) return 0;

    const lowerWins = rules?.[category] === "low";
    if (lowerWins) return av < bv ? 1 : -1;
    return av > bv ? 1 : -1;
  }

  // Category-by-category score for one matchup (ties count half).
  function compareTeamsOn(a, b, categories, rules) {
    let scoreA = 0;
    let scoreB = 0;

    categories.forEach(category => {
      const result = compareCategoryValue(a, b, category, rules);
      if (result > 0) scoreA += 1;
      else if (result < 0) scoreB += 1;
      else {
        scoreA += 0.5;
        scoreB += 0.5;
      }
    });

    return { scoreA, scoreB };
  }

  function byWinPct(a, b) {
    return b.winPct - a.winPct || b.points - a.points || a.team.localeCompare(b.team);
  }

  // Builds the same summary shape as UTIAnalytics.buildSummary for a Yahoo season.
  function buildGenericSeasonAnalytics(rows, { categories, rules, hittingCategories, pitchingCategories, season, source }) {
    const byWeek = groupRowsByWeek(rows);
    const officialRecords = {};
    const allPlayRecords = {};
    const categoryRecords = {};

    const ensureCategories = team => {
      if (!categoryRecords[team]) {
        categoryRecords[team] = {};
        categories.forEach(category => {
          categoryRecords[team][category] = emptyRecord();
        });
      }
      return categoryRecords[team];
    };

    rows.forEach(row => {
      const record = ensureRecord(officialRecords, row.team);
      const outcome = matchupOutcome(row);
      if (outcome) addOutcome(record, outcome);
    });

    for (const weekRows of byWeek.values()) {
      forEachPair(weekRows, (a, b) => {
        const { scoreA, scoreB } = compareTeamsOn(a, b, categories, rules);
        addHeadToHead(ensureRecord(allPlayRecords, a.team), ensureRecord(allPlayRecords, b.team), scoreA - scoreB);

        categories.forEach(category => {
          addHeadToHead(
            ensureCategories(a.team)[category],
            ensureCategories(b.team)[category],
            compareCategoryValue(a, b, category, rules)
          );
        });
      });
    }

    Object.values(officialRecords).forEach(setWinPct);
    Object.values(allPlayRecords).forEach(setWinPct);
    Object.values(categoryRecords).forEach(teamCategories => {
      Object.values(teamCategories).forEach(setWinPct);
    });

    const categoryKings = {};
    categories.forEach(category => {
      categoryKings[category] = Object.entries(categoryRecords)
        .map(([team, records]) => ({ team, ...records[category] }))
        .sort(byWinPct);
    });

    const weeks = [...byWeek.keys()].sort((a, b) => a - b);

    const luckIndex = Object.keys(officialRecords).map(team => {
      const actualPoints = Number(officialRecords[team]?.points || 0);
      const allPlayPct = Number(allPlayRecords[team]?.winPct || 0);
      const games = Number(officialRecords[team]?.games || 0);
      const expectedPoints = allPlayPct * games;

      return {
        team,
        actualPoints,
        expectedPoints,
        luck: actualPoints - expectedPoints
      };
    }).sort((a, b) => b.luck - a.luck || a.team.localeCompare(b.team));

    const powerRankings = Object.keys(officialRecords).map(team => {
      const allPlayPct = Number(allPlayRecords[team]?.winPct || 0);

      const categoryList = Object.values(categoryRecords[team] || {});
      const categoryPct = categoryList.length
        ? categoryList.reduce((sum, record) => sum + Number(record.winPct || 0), 0) / categoryList.length
        : 0;

      const recentRows = rows
        .filter(row => row.team === team)
        .sort((a, b) => Number(a.week) - Number(b.week))
        .slice(-4);

      let recentPoints = 0;
      recentRows.forEach(row => {
        const outcome = matchupOutcome(row);
        if (outcome === "win") recentPoints += 1;
        else if (outcome === "tie") recentPoints += 0.5;
      });

      const recentPct = recentRows.length ? recentPoints / recentRows.length : 0;
      // Same weighting as league-analytics.js.
      const rating = (allPlayPct * 0.50) + (categoryPct * 0.30) + (recentPct * 0.20);

      return { team, allPlayPct, categoryPct, recentPct, rating };
    }).sort((a, b) => b.rating - a.rating || a.team.localeCompare(b.team));

    return {
      season,
      source,
      rows,
      weeks,
      categories,
      categoryRules: rules,
      hittingCategories,
      pitchingCategories,
      officialRecords,
      allPlayRecords,
      categoryRecords,
      categoryKings,
      luckIndex,
      powerRankings
    };
  }

  // All-play records using only a subset of categories (e.g. hitting only).
  function getSubsetStrength(rows, categories, rules) {
    const records = {};

    for (const weekRows of groupRowsByWeek(rows).values()) {
      forEachPair(weekRows, (a, b) => {
        const { scoreA, scoreB } = compareTeamsOn(a, b, categories, rules);
        addHeadToHead(ensureRecord(records, a.team), ensureRecord(records, b.team), scoreA - scoreB);
      });
    }

    Object.values(records).forEach(setWinPct);

    const ranking = Object.entries(records)
      .map(([team, record]) => ({ team, ...record }))
      .sort(byWinPct);

    return { records, ranking };
  }

  // Each team's all-play rank for every week.
  function getWeeklyAllPlayRanks(rows, categories, rules) {
    const output = [];

    [...groupRowsByWeek(rows).entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([week, weekRows]) => {
        const records = {};
        const ensure = team => {
          if (!records[team]) records[team] = { team, wins: 0, losses: 0, ties: 0, points: 0, games: 0 };
          return records[team];
        };

        forEachPair(weekRows, (a, b) => {
          const { scoreA, scoreB } = compareTeamsOn(a, b, categories, rules);
          addHeadToHead(ensure(a.team), ensure(b.team), scoreA - scoreB);
        });

        Object.values(records)
          .sort((a, b) => b.points - a.points || b.wins - a.wins || a.team.localeCompare(b.team))
          .forEach((record, index) => {
            output.push({
              week: Number(week),
              team: record.team,
              rank: index + 1,
              ...record,
              winPct: record.games ? record.points / record.games : 0
            });
          });
      });

    return output;
  }

  function sortedAllPlayFor(data) {
    if (!data) return [];
    return Object.entries(data.allPlayRecords || {})
      .map(([team, record]) => ({ team, ...record }))
      .sort(byWinPct);
  }

  function powerMapFor(data) {
    return Object.fromEntries((data?.powerRankings || []).map(row => [row.team, row]));
  }

  function allPlayMapFor(data) {
    return Object.fromEntries(sortedAllPlayFor(data).map(row => [row.team, row]));
  }

  function findBiggestPowerMover(currentData, historyData) {
    const current = powerMapFor(currentData);
    const history = powerMapFor(historyData);

    return Object.keys(current)
      .filter(team => history[team])
      .map(team => ({
        team,
        current: Number(current[team]?.rating || 0) * 100,
        history: Number(history[team]?.rating || 0) * 100
      }))
      .map(row => ({ ...row, delta: row.current - row.history }))
      .sort((a, b) => b.delta - a.delta || a.team.localeCompare(b.team))[0] || null;
  }

  /* ---------- 5. Season data access + franchise history ---------- */

  function yahooAnalytics(season) {
    return yahooHistory[season]?.analytics || null;
  }

  function yahooAllRows(season) {
    return yahooHistory[season]?.allRows || [];
  }

  function hasAnyYahooHistory() {
    return YAHOO_SEASONS.some(({ season }) => yahooAnalytics(season));
  }

  function getSeasonData(season) {
    const isYahooSeason = YAHOO_SEASONS.some(entry => String(entry.season) === String(season));
    return isYahooSeason ? yahooAnalytics(Number(season)) : latestAnalytics;
  }

  function teamHasSeasonData(team, season) {
    const data = getSeasonData(season);
    return Boolean(data?.rows?.some(row => row.team === team));
  }

  function preferredSeasonForTeam(team, requestedSeason = null) {
    if (requestedSeason && teamHasSeasonData(team, requestedSeason)) {
      return String(requestedSeason);
    }

    return ["2026", "2025", "2024", "2023"]
      .find(season => teamHasSeasonData(team, season))
      || String(requestedSeason || "2026");
  }

  function withPhaseDefaults(row, phase = "regular") {
    return { ...row, phase: row.phase || phase, round: row.round || "" };
  }

  function withCurrentSeasonDefaults(row, phase = "regular") {
    return { ...withPhaseDefaults(row, phase), season: row.season || CURRENT_SEASON };
  }

  // Every imported matchup row across all seasons, playoffs included.
  function trackedHistoryRows() {
    const currentRows = latestAnalytics?.allRows || latestAnalytics?.rows || [];

    return [
      ...yahooAllRows(2025),
      ...yahooAllRows(2024),
      ...yahooAllRows(2023),
      ...currentRows.map(row => withCurrentSeasonDefaults(row))
    ];
  }

  function franchiseTeams() {
    return [...new Set(trackedHistoryRows().map(row => row.team).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  // 2023 week-by-week data is incomplete, so its regular-season record comes from Yahoo's final standings.
  function finalStandings2023(team) {
    const record = window.UTI_YAHOO_2023_FINAL_REGULAR_SEASON_RECORDS?.[team];
    if (!record) return null;

    return {
      wins: Number(record.wins || 0),
      losses: Number(record.losses || 0),
      ties: Number(record.ties || 0),
      games: Number(record.games || 0),
      points: Number(record.points ?? (Number(record.wins || 0) + Number(record.ties || 0) * 0.5)),
      winPct: Number(record.winPct || 0)
    };
  }

  // A team's record, optionally narrowed to one opponent, one season, and/or one phase ("regular" | "playoffs" | "all").
  function franchiseRecord(team, opponent = null, season = null, phase = "all") {
    const allRows = trackedHistoryRows();
    const rowFilter = row => {
      if (row.team !== team) return false;
      if (opponent && row.opponent !== opponent) return false;
      if (season && Number(row.season) !== Number(season)) return false;
      if (phase !== "all" && historyPhase(row) !== phase) return false;
      return true;
    };

    // Opponent-specific H2H is based strictly on imported matchup rows.
    if (opponent) {
      return recordFromRows(allRows.filter(rowFilter));
    }

    const standings2023 = finalStandings2023(team);

    if (season && Number(season) === 2023 && standings2023) {
      if (phase === "regular") return standings2023;

      const playoffs2023 = recordFromRows(allRows.filter(row =>
        row.team === team &&
        Number(row.season) === 2023 &&
        isPlayoffRow(row)
      ));
      return phase === "playoffs" ? playoffs2023 : combineRecords(standings2023, playoffs2023);
    }

    if (!season && standings2023 && (phase === "all" || phase === "regular")) {
      const non2023RegularRows = allRows.filter(row => {
        if (row.team !== team) return false;
        if (Number(row.season) === 2023 && historyPhase(row) === "regular") return false;
        if (phase === "regular" && historyPhase(row) !== "regular") return false;
        return true;
      });

      return combineRecords(recordFromRows(non2023RegularRows), standings2023);
    }

    return recordFromRows(allRows.filter(rowFilter));
  }

  function currentPlayoffRows() {
    return (latestAnalytics?.allRows || latestAnalytics?.rows || []).filter(isPlayoffRow);
  }

  function currentPlayoffRounds() {
    return [...new Set(
      currentPlayoffRows()
        .map(row => String(row.round || "").trim())
        .filter(Boolean)
    )];
  }

  // e.g. "Reg Weeks 1–21 · Playoffs Round 1 · Semifinals" (or "21 reg + R1+Semifinals" when compact).
  function currentSeasonStatusLabel(compact = false) {
    const regularWeeks = latestAnalytics?.weeks || [];
    const playoffRows = currentPlayoffRows();
    const rounds = currentPlayoffRounds();

    if (!regularWeeks.length) return compact ? "No reg data" : "No regular-season weeks imported";

    const regLabel = compact
      ? `${regularWeeks.length} reg`
      : `Reg Weeks ${weekSpan(regularWeeks)}`;

    if (!playoffRows.length) return regLabel;

    const roundLabel = rounds.length
      ? (compact
        ? rounds.map(round => round.replace(/^Round\s*/i, "R")).join("+")
        : rounds.join(" · "))
      : (compact ? "PO" : "Playoffs underway");

    return compact
      ? `${regLabel} + ${roundLabel}`
      : `${regLabel} · Playoffs ${roundLabel}`;
  }

  function yahooSeasonBadgeText(season) {
    const weeks = yahooAnalytics(season)?.weeks || [];

    if (season === 2023) {
      return weeks.length === 1
        ? `2023 Yahoo · Week ${weeks[0]} stats + final standings`
        : `2023 Yahoo · Weeks ${weekSpan(weeks)}`;
    }

    if (season === 2024) {
      if (yahooAllRows(2024).some(isPlayoffRow)) return `2024 Yahoo · Complete season`;
      return weeks.length === 1 ? `2024 Yahoo · Week ${weeks[0]}` : `2024 Yahoo · Weeks ${weekSpan(weeks)}`;
    }

    return `${season} Yahoo · Weeks ${weekSpan(weeks)}`;
  }

  function derivedRegularSeasonFirst(season) {
    const teams = [...new Set(
      trackedHistoryRows()
        .filter(row => Number(row.season) === Number(season) && historyPhase(row) === "regular")
        .map(row => row.team)
        .filter(Boolean)
    )];

    const ranked = teams.map(team => ({
      team,
      record: franchiseRecord(team, null, season, "regular")
    })).sort((a, b) =>
      b.record.winPct - a.record.winPct ||
      b.record.wins - a.record.wins ||
      a.record.losses - b.record.losses ||
      a.team.localeCompare(b.team)
    );

    return ranked[0]?.team || null;
  }

  // Completed seasons from data/history/season-results.js, newest first.
  function knownSeasonResults() {
    if (!Array.isArray(window.UTI_SEASON_RESULTS)) return [];

    return [...window.UTI_SEASON_RESULTS]
      .map(result => ({
        ...result,
        regularSeasonFirst: result.regularSeasonFirst || derivedRegularSeasonFirst(result.season)
      }))
      .sort((a, b) => Number(b.season) - Number(a.season));
  }

  /* ---------- 6. Board renderers ---------- */

  const CURRENT_BOARD_CARDS = [
    { kind: "allPlay", icon: "🏆", eyebrow: "All-Play King", copy: row => `${formatPct(row.winPct)} against the entire league`, tone: "is-leader" },
    { kind: "power", icon: "🔥", eyebrow: "Power #1", copy: "50% all-play · 30% categories · 20% form", tone: "is-power" },
    { kind: "luckiest", icon: "🍀", eyebrow: "Luckiest", copy: "Wins above all-play expectation", tone: "is-lucky" },
    { kind: "unluckiest", icon: "💀", eyebrow: "Unluckiest", copy: "Wins below all-play expectation", tone: "is-unlucky" }
  ];

  function yahooSeasonCards(season) {
    return [
      { kind: "allPlay", icon: "🏛️", eyebrow: `${season} All-Play King`, copy: row => `${formatPct(row.winPct)} against the ${season} league`, tone: "is-history" },
      { kind: "power", icon: "📼", eyebrow: `${season} Power #1`, copy: `${season} all-play · categories · recent form`, tone: "is-history" },
      { kind: "luckiest", icon: "🍀", eyebrow: `${season} Luckiest`, copy: `Wins above ${season} all-play expectation`, tone: "is-history" },
      { kind: "unluckiest", icon: "🪦", eyebrow: `${season} Unluckiest`, copy: `Wins below ${season} all-play expectation`, tone: "is-history" }
    ];
  }

  // Per-season archive boards on history.html. Element ids are `${idPrefix}Grid`, `${idPrefix}Range`, etc.
  const YAHOO_BOARDS = {
    2025: {
      idPrefix: "utiHistory",
      rangeText: weeks => `Weeks ${weekSpan(weeks)}`,
      cards: yahooSeasonCards(2025)
    },
    2024: {
      idPrefix: "utiHistory2024",
      rangeText: weeks => {
        if (yahooAllRows(2024).some(isPlayoffRow)) return `Reg Weeks ${weekSpan(weeks)} · Playoffs complete`;
        return weeks.length === 1 ? `Week ${weeks[0]}` : `Weeks ${weekSpan(weeks)}`;
      },
      cards: yahooSeasonCards(2024)
    },
    2023: {
      idPrefix: "utiHistory2023",
      rangeText: weeks => weeks.length === 1
        ? `Week ${weeks[0]} imported · final regular-season standings captured`
        : `Weeks ${weekSpan(weeks)} imported`,
      cards: [
        { kind: "allPlay", icon: "🗃️", eyebrow: "2023 Imported All-Play #1", copy: row => `${formatPct(row.winPct)} in the imported 2023 sample`, tone: "is-history" },
        { kind: "power", icon: "📼", eyebrow: "2023 Imported Power #1", copy: "Based only on imported 2023 matchup weeks", tone: "is-history" },
        { kind: "luckiest", icon: "🍀", eyebrow: "2023 Imported Luckiest", copy: "Imported wins above all-play expectation", tone: "is-history" },
        { kind: "unluckiest", icon: "🪦", eyebrow: "2023 Imported Unluckiest", copy: "Imported wins below all-play expectation", tone: "is-history" }
      ]
    }
  };

  function renderYahooSeasonBoard(season) {
    const data = yahooAnalytics(season);
    if (!data) return;

    const { idPrefix, rangeText, cards } = YAHOO_BOARDS[season];
    const weeks = data.weeks || [];
    const grid = document.getElementById(`${idPrefix}Grid`);
    const range = document.getElementById(`${idPrefix}Range`);
    const badge = document.getElementById(`${idPrefix}SeasonBadge`);

    if (range && weeks.length) range.textContent = rangeText(weeks);
    if (badge && weeks.length) badge.textContent = yahooSeasonBadgeText(season);
    if (grid) grid.innerHTML = renderLeaderCards(data, String(season), cards);

    renderChartTables(idPrefix, data, String(season));

    if (season === 2025) {
      const franchiseTrendTable = document.getElementById("utiFranchiseTrendTable");
      if (franchiseTrendTable && latestAnalytics) {
        franchiseTrendTable.innerHTML = renderFranchiseTrend(latestAnalytics, data);
      }
    }
  }

  // 2025 vs 2026 All-Play and Power comparison table.
  function renderFranchiseTrend(currentData, historyData) {
    if (!currentData || !historyData) return "";

    const currentPower = powerMapFor(currentData);
    const historyPower = powerMapFor(historyData);
    const currentAllPlay = allPlayMapFor(currentData);
    const historyAllPlay = allPlayMapFor(historyData);

    const teams = [...new Set([
      ...Object.keys(currentPower),
      ...Object.keys(historyPower),
      ...Object.keys(currentAllPlay),
      ...Object.keys(historyAllPlay)
    ])];

    teams.sort((a, b) => {
      const aRating = Number(currentPower[a]?.rating || 0);
      const bRating = Number(currentPower[b]?.rating || 0);
      return bRating - aRating || a.localeCompare(b);
    });

    const deltaClass = value => value > 0.001 ? "is-up" : value < -0.001 ? "is-down" : "is-flat";
    const signedOne = value => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

    return `
      <div class="uti-franchise-trend-table">
        <div class="uti-franchise-trend-row is-head">
          <span>Franchise</span>
          <span>2025 All-Play %</span>
          <span>2026 All-Play %</span>
          <span>All-Play Change</span>
          <span>2025 Power Rating</span>
          <span>2026 Power Rating</span>
          <span>Power Change</span>
        </div>

        ${teams.map(team => {
          const ap25 = Number(historyAllPlay[team]?.winPct || 0);
          const ap26 = Number(currentAllPlay[team]?.winPct || 0);
          const power25 = Number(historyPower[team]?.rating || 0) * 100;
          const power26 = Number(currentPower[team]?.rating || 0) * 100;
          const apDelta = (ap26 - ap25) * 100;
          const powerDelta = power26 - power25;

          return `
            <div class="uti-franchise-trend-row">
              <div class="uti-franchise-trend-team">
                ${teamIdentity(team, false, "2026")}
              </div>
              <strong>${formatPct(ap25)}</strong>
              <strong>${formatPct(ap26)}</strong>
              <span class="uti-history-delta ${deltaClass(apDelta)}">${signedOne(apDelta)} pts</span>
              <strong>${power25.toFixed(1)}</strong>
              <strong>${power26.toFixed(1)}</strong>
              <span class="uti-history-delta ${deltaClass(powerDelta)}">${signedOne(powerDelta)}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // Clickable team card used by the history overview ("overview") and homepage teaser ("teaser").
  function historySpotlightCard(kind, { label, team, season, note }) {
    return `
        <article class="uti-history-${kind}-card uti-team-profile-trigger" data-team-profile="${escapeHtml(team || "—")}" data-profile-open-season="${season}" role="button" tabindex="0">
          <span>${label}</span>
          <div class="uti-history-${kind}-team">
            <img src="${logoFor(team || "")}" alt="">
            <strong>${escapeHtml(team || "—")}</strong>
          </div>
          <small>${note}</small>
        </article>
    `;
  }

  function renderHistoryOverview() {
    if (!latestAnalytics || !hasAnyYahooHistory()) return;

    const target = document.getElementById("utiHistoryOverviewGrid");
    const currentBadge = document.getElementById("utiHistoryCurrentBadge");

    [
      [2023, "utiHistory2023SeasonBadge"],
      [2024, "utiHistory2024SeasonBadge"],
      [2025, "utiHistorySeasonBadge"]
    ].forEach(([season, badgeId]) => {
      const badge = document.getElementById(badgeId);
      if (badge && yahooAnalytics(season)?.weeks?.length) {
        badge.textContent = yahooSeasonBadgeText(season);
      }
    });

    const currentWeeks = latestAnalytics.weeks
      || [...new Set(latestAnalytics.rows.map(row => Number(row.week)))].filter(Number.isFinite).sort((a, b) => a - b);

    if (currentBadge && currentWeeks.length) {
      currentBadge.textContent = `2026 Fantrax · ${currentSeasonStatusLabel(false)}`;
    }

    if (!target) return;

    const weeks2023 = yahooAnalytics(2023)?.weeks || [];
    const weeks2024 = yahooAnalytics(2024)?.weeks || [];
    const weeks2025 = yahooAnalytics(2025)?.weeks || [];

    const trackedSeasons = [
      yahooAnalytics(2023) ? 2023 : null,
      yahooAnalytics(2024) ? 2024 : null,
      yahooAnalytics(2025) ? 2025 : null,
      2026
    ].filter(Boolean);

    const historicalTeamWeeks = [2023, 2024, 2025]
      .map(season => yahooAllRows(season).length || yahooAnalytics(season)?.rows?.length || 0)
      .reduce((sum, count) => sum + count, 0);

    const playoffSuffix = season => yahooAllRows(season).some(isPlayoffRow) ? " + playoffs" : "";
    const historyWeekParts = [
      weeks2023.length ? `2023: ${weeks2023.length} imported reg ${plural(weeks2023.length, "week")} + final standings` : "",
      weeks2024.length ? `2024: ${weeks2024.length} reg weeks${playoffSuffix(2024)}` : "",
      weeks2025.length ? `2025: ${weeks2025.length} reg weeks${playoffSuffix(2025)}` : ""
    ].filter(Boolean);

    const allPlayLeader = season => sortedAllPlayFor(yahooAnalytics(season))[0];
    const leader2023 = allPlayLeader(2023);
    const leader2024 = allPlayLeader(2024);
    const leader2025 = allPlayLeader(2025);
    const riser = yahooAnalytics(2025) ? findBiggestPowerMover(latestAnalytics, yahooAnalytics(2025)) : null;

    target.innerHTML = `
      <article class="uti-history-overview-card">
        <span>Seasons Tracked</span>
        <strong>${trackedSeasons.length}</strong>
        <small>${trackedSeasons.join(" · ")}</small>
      </article>

      <article class="uti-history-overview-card">
        <span>Historical Team-Weeks</span>
        <strong>${historicalTeamWeeks}</strong>
        <small>${historyWeekParts.join(" · ")}</small>
      </article>

      ${yahooAnalytics(2023) ? historySpotlightCard("overview", {
        label: "2023 Imported All-Play #1",
        team: leader2023?.team,
        season: 2023,
        note: leader2023 ? `${formatPct(leader2023.winPct)} in imported 2023 weeks` : "—"
      }) : ""}

      ${yahooAnalytics(2024) ? historySpotlightCard("overview", {
        label: "2024 All-Play #1",
        team: leader2024?.team,
        season: 2024,
        note: leader2024 ? `${formatPct(leader2024.winPct)} vs 2024 league` : "—"
      }) : ""}

      ${yahooAnalytics(2025) ? historySpotlightCard("overview", {
        label: "2025 All-Play #1",
        team: leader2025?.team,
        season: 2025,
        note: leader2025 ? `${formatPct(leader2025.winPct)} vs 2025 league` : "—"
      }) : ""}

      ${riser ? historySpotlightCard("overview", {
        label: "Biggest Power Riser",
        team: riser.team,
        season: 2026,
        note: `${riser.delta >= 0 ? "+" : ""}${riser.delta.toFixed(1)} from 2025 → 2026`
      }) : ""}
    `;
  }

  // Homepage teaser cards that link into history.html.
  function renderHistoryTeaser() {
    if (!latestAnalytics || !hasAnyYahooHistory()) return;
    const target = document.getElementById("utiHistoryTeaserGrid");
    if (!target) return;

    const weeks2023 = yahooAnalytics(2023)?.weeks || [];
    const weeks2024 = yahooAnalytics(2024)?.weeks || [];
    const weeks2025 = yahooAnalytics(2025)?.weeks || [];
    const riser = yahooAnalytics(2025) ? findBiggestPowerMover(latestAnalytics, yahooAnalytics(2025)) : null;

    const seasonTeasers = season => {
      const data = yahooAnalytics(season);
      if (!data) return "";

      const allPlayLeader = sortedAllPlayFor(data)[0];
      const powerLeader = (data.powerRankings || [])[0];
      const weeks = data.weeks || [];
      const weeksNote = season === 2024 ? ` · ${weeks.length} ${plural(weeks.length, "week")} imported` : "";

      return historySpotlightCard("teaser", {
        label: `${season} All-Play King`,
        team: allPlayLeader?.team,
        season,
        note: allPlayLeader ? `${formatPct(allPlayLeader.winPct)} all-play${weeksNote}` : "—"
      }) + historySpotlightCard("teaser", {
        label: `${season} Power #1`,
        team: powerLeader?.team,
        season,
        note: powerLeader ? formatPowerRating(powerLeader) : "—"
      });
    };

    const archiveSeasons = [2023, 2024, 2025].filter(season => yahooAnalytics(season)).join(" + ");
    const archiveWeeks = [
      weeks2023.length ? `2023 Week ${weeks2023[0]}+` : "",
      weeks2024.length ? `2024 Weeks ${weekSpan(weeks2024)}` : "",
      weeks2025.length ? `2025 Weeks ${weekSpan(weeks2025)}` : ""
    ].filter(Boolean).join(" · ");

    target.innerHTML = `
      ${seasonTeasers(2024)}

      ${seasonTeasers(2025)}

      ${riser ? historySpotlightCard("teaser", {
        label: "Biggest 2025 → 2026 Riser",
        team: riser.team,
        season: 2026,
        note: `${riser.delta >= 0 ? "+" : ""}${riser.delta.toFixed(1)} Power`
      }) : ""}

      <a class="uti-history-teaser-card is-link" href="history.html">
        <span>Season Archive</span>
        <strong>${archiveSeasons} Yahoo</strong>
        <small>${archiveWeeks} · Open history →</small>
      </a>
    `;
  }

  /* ---------- 7. Franchise resume, season placements, head-to-head ---------- */

  function placementCount(team, field) {
    return knownSeasonResults().filter(result => result?.[field] === team).length;
  }

  function placementDisplay(team, field) {
    const hasAnyResults = knownSeasonResults().some(result => result?.[field]);
    if (!hasAnyResults) return "—";

    const meta = PLACEMENT_META[field] || { icon: "🏅", label: field };
    const count = placementCount(team, field);

    if (count <= 0) return "—";

    return `
      <span class="uti-placement-icon-count" title="${escapeHtml(meta.label)}: ${count}">
        <span aria-hidden="true">${meta.icon}</span>
        <strong>x${count}</strong>
      </span>
    `;
  }

  function renderFranchiseResume() {
    const target = document.getElementById("utiFranchiseResumeTable");
    if (!target) return;

    const records = franchiseTeams().map(team => ({
      team,
      overall: franchiseRecord(team),
      regular: franchiseRecord(team, null, null, "regular"),
      playoffs: franchiseRecord(team, null, null, "playoffs")
    })).sort((a, b) =>
      b.overall.winPct - a.overall.winPct ||
      b.overall.wins - a.overall.wins ||
      a.overall.losses - b.overall.losses ||
      a.team.localeCompare(b.team)
    );

    const seasons = [...new Set(trackedHistoryRows().map(row => Number(row.season)).filter(Number.isFinite))]
      .sort((a, b) => a - b);

    const range = document.getElementById("utiFranchiseRecordRange");
    if (range && seasons.length) {
      range.textContent = `${seasons[0]}–${seasons[seasons.length - 1]} imported`;
    }

    target.innerHTML = `
      <div class="uti-franchise-resume-table">
        <div class="uti-franchise-resume-row is-head">
          <span>Franchise</span>
          <span>Overall Record</span>
          <span>Regular Season</span>
          <span>Playoffs</span>
          <span>Win %</span>
          <span>1st</span>
          <span>2nd</span>
          <span>3rd</span>
          <span>Reg. Season #1</span>
        </div>

        ${records.map((row, index) => `
          <div class="uti-franchise-resume-row">
            <div class="uti-franchise-resume-team">
              <span class="uti-franchise-rank">${index + 1}</span>
              ${teamIdentity(row.team, false, preferredSeasonForTeam(row.team, "2026"))}
            </div>
            <strong>${formatRecord(row.overall)}</strong>
            <span class="uti-record-split is-regular">${formatRecord(row.regular)}</span>
            <span class="uti-record-split is-playoffs">${row.playoffs.games ? formatRecord(row.playoffs) : "—"}</span>
            <strong>${formatPct(row.overall.winPct)}</strong>
            <span class="uti-placement-count">${placementDisplay(row.team, "champion")}</span>
            <span class="uti-placement-count">${placementDisplay(row.team, "runnerUp")}</span>
            <span class="uti-placement-count">${placementDisplay(row.team, "thirdPlace")}</span>
            <span class="uti-placement-count">${placementDisplay(row.team, "regularSeasonFirst")}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderSeasonPlacements() {
    const target = document.getElementById("utiSeasonPlacements");
    if (!target) return;

    const results = knownSeasonResults();

    if (!results.length) {
      target.innerHTML = `
        <div class="uti-history-empty">
          No completed-season placement data has been entered yet.
        </div>
      `;
      return;
    }

    const resultTeam = (team, season) => team
      ? teamIdentity(team, true, String(season))
      : `<span class="uti-season-result-pending">Pending</span>`;

    target.innerHTML = `
      <div class="uti-season-results-table">
        <div class="uti-season-results-row is-head">
          <span>Season</span>
          <span>1st</span>
          <span>2nd</span>
          <span>3rd</span>
          <span>Regular Season #1</span>
        </div>
        ${results.map(result => `
          <div class="uti-season-results-row">
            <strong>${escapeHtml(result.season)}</strong>
            <div>${resultTeam(result.champion, result.season)}</div>
            <div>${resultTeam(result.runnerUp, result.season)}</div>
            <div>${resultTeam(result.thirdPlace, result.season)}</div>
            <div>${resultTeam(result.regularSeasonFirst, result.season)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderHeadToHead(team) {
    const summary = document.getElementById("utiHeadToHeadSummary");
    const grid = document.getElementById("utiHeadToHeadGrid");
    if (!summary || !grid || !team) return;

    const overall = franchiseRecord(team);
    const regular = franchiseRecord(team, null, null, "regular");
    const playoffs = franchiseRecord(team, null, null, "playoffs");
    const opponents = franchiseTeams().filter(opponent => opponent !== team);

    summary.innerHTML = `
      <div class="uti-h2h-summary-team">
        <img src="${logoFor(team)}" alt="">
        <div>
          <span>Tracked Franchise Record</span>
          <strong>${escapeHtml(team)}</strong>
        </div>
      </div>

      <div class="uti-h2h-summary-records">
        <div class="uti-h2h-summary-split">
          <span>Overall</span>
          <strong>${formatRecord(overall)}</strong>
          <small>${formatPct(overall.winPct)} · ${overall.games} matchups</small>
        </div>
        <div class="uti-h2h-summary-split is-regular">
          <span>Regular Season</span>
          <strong>${formatRecord(regular)}</strong>
          <small>${regular.games} matchups</small>
        </div>
        <div class="uti-h2h-summary-split is-playoffs">
          <span>Playoffs</span>
          <strong>${playoffs.games ? formatRecord(playoffs) : "—"}</strong>
          <small>${playoffs.games ? `${playoffs.games} matchups` : "No playoff matchups"}</small>
        </div>
      </div>
    `;

    grid.innerHTML = opponents.map(opponent => {
      const allTime = franchiseRecord(team, opponent);
      const regularTime = franchiseRecord(team, opponent, null, "regular");
      const playoffTime = franchiseRecord(team, opponent, null, "playoffs");

      const seasonsPlayed = [...new Set(
        trackedHistoryRows()
          .filter(row => row.team === team && row.opponent === opponent)
          .map(row => Number(row.season))
          .filter(Number.isFinite)
      )].sort((a, b) => a - b);

      const splits = seasonsPlayed.map(season => {
        const seasonOverall = franchiseRecord(team, opponent, season);
        const seasonRegular = franchiseRecord(team, opponent, season, "regular");
        const seasonPlayoffs = franchiseRecord(team, opponent, season, "playoffs");

        return `
          <span>
            ${season}:
            <strong>${formatRecord(seasonOverall)}</strong>
            <small>Reg ${formatRecord(seasonRegular)}${seasonPlayoffs.games ? ` · PO ${formatRecord(seasonPlayoffs)}` : ""}</small>
          </span>
        `;
      }).join("");

      return `
        <article class="uti-h2h-card">
          <div class="uti-h2h-card-team">
            <img src="${logoFor(opponent)}" alt="">
            <div>
              <span>vs.</span>
              <strong>${escapeHtml(opponent)}</strong>
            </div>
          </div>

          <div class="uti-h2h-card-record">
            <strong>${formatRecord(allTime)}</strong>
            <span>${formatPct(allTime.winPct)} overall</span>
          </div>

          <div class="uti-h2h-record-splits">
            <span class="is-regular">Regular <strong>${formatRecord(regularTime)}</strong></span>
            <span class="is-playoffs">Playoffs <strong>${playoffTime.games ? formatRecord(playoffTime) : "—"}</strong></span>
          </div>

          <div class="uti-h2h-season-splits">
            ${splits || "<span>No tracked matchups</span>"}
          </div>
        </article>
      `;
    }).join("");
  }

  function renderHistoryRecordSections() {
    renderFranchiseResume();
    renderSeasonPlacements();

    const selector = document.getElementById("utiHeadToHeadTeamSelect");
    if (!selector) return;

    const teams = franchiseTeams();
    const previousValue = selector.value;
    selector.innerHTML = teams.map(team =>
      `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`
    ).join("");

    const initialTeam = teams.includes(previousValue)
      ? previousValue
      : (teams.includes("Gunnarrhea") ? "Gunnarrhea" : teams[0]);

    if (initialTeam) {
      selector.value = initialTeam;
      renderHeadToHead(initialTeam);
    }

    if (!selector.dataset.historyListenerAttached) {
      selector.addEventListener("change", () => renderHeadToHead(selector.value));
      selector.dataset.historyListenerAttached = "true";
    }
  }

  /* ---------- 8. Team profile modal ---------- */

  function getVerdict(profile) {
    if (profile.luck <= -1 && profile.allPlayPct >= 0.55) return "Better Than The Record";
    if (profile.luck >= 1 && profile.allPlayPct < 0.55) return "Schedule Merchant";
    if (profile.powerRank <= 3 && profile.avgWeeklyRank <= 4) return "Legit Contender";
    if (profile.avgWeeklyRank <= 3) return "Weekly Problem";
    if (profile.avgWeeklyRank >= 8) return "Basement Energy";
    if (profile.volatility >= 3) return "Pure Chaos";
    return "Dangerous Enough";
  }

  function buildTeamProfile(data, team) {
    const powerIndex = data.powerRankings.findIndex(row => row.team === team);
    const power = data.powerRankings[powerIndex];
    const allPlay = data.allPlayRecords[team] || {};
    const official = data.officialRecords[team] || {};
    const luckRow = data.luckIndex.find(row => row.team === team) || { luck: 0, expectedPoints: 0, actualPoints: 0 };

    const hitting = getSubsetStrength(data.rows, data.hittingCategories || HITTING_CATEGORIES, data.categoryRules);
    const pitching = getSubsetStrength(data.rows, data.pitchingCategories || PITCHING_CATEGORIES, data.categoryRules);

    const weeklyRanks = getWeeklyAllPlayRanks(data.rows, data.categories, data.categoryRules)
      .filter(row => row.team === team)
      .sort((a, b) => a.week - b.week);

    const avgWeeklyRank = weeklyRanks.length
      ? weeklyRanks.reduce((sum, row) => sum + row.rank, 0) / weeklyRanks.length
      : 0;

    // Standard deviation of weekly rank.
    const volatility = weeklyRanks.length
      ? Math.sqrt(weeklyRanks.reduce((sum, row) => sum + Math.pow(row.rank - avgWeeklyRank, 2), 0) / weeklyRanks.length)
      : 0;

    const categoryRows = Object.entries(data.categoryRecords[team] || {})
      .map(([category, record]) => ({ category, ...record }))
      .sort((a, b) => b.winPct - a.winPct);

    const teamRows = data.rows
      .filter(row => row.team === team)
      .sort((a, b) => Number(a.week) - Number(b.week));

    let blowoutWins = 0;
    let blowoutLosses = 0;
    teamRows.forEach(row => {
      const diff = Number(row.official_score_for) - Number(row.official_score_against);
      if (diff >= 6) blowoutWins += 1;
      if (diff <= -6) blowoutLosses += 1;
    });

    const recentForm = teamRows.slice(-4).map(row => {
      const outcome = matchupOutcome(row);
      return {
        week: Number(row.week),
        result: outcome === "win" ? "W" : outcome === "loss" ? "L" : "T",
        score: `${Number(row.official_score_for)}-${Number(row.official_score_against)}`
      };
    });

    const profile = {
      team,
      season: data.season || CURRENT_SEASON,
      source: data.source || "fantrax",
      trackedWeeks: [...new Set(data.rows.map(row => Number(row.week)))].filter(Number.isFinite).sort((a, b) => a - b),
      powerRank: powerIndex >= 0 ? powerIndex + 1 : 0,
      powerRating: Number(power?.rating || 0) * 100,
      allPlayRecord: allPlay,
      allPlayPct: Number(allPlay.winPct || 0),
      officialRecord: official,
      luck: Number(luckRow.luck || 0),
      expectedPoints: Number(luckRow.expectedPoints || 0),
      hittingRank: hitting.ranking.findIndex(row => row.team === team) + 1,
      pitchingRank: pitching.ranking.findIndex(row => row.team === team) + 1,
      hittingPct: Number(hitting.records[team]?.winPct || 0),
      pitchingPct: Number(pitching.records[team]?.winPct || 0),
      avgWeeklyRank,
      volatility,
      bestWeek: [...weeklyRanks].sort((a, b) => a.rank - b.rank || b.points - a.points)[0],
      worstWeek: [...weeklyRanks].sort((a, b) => b.rank - a.rank || a.points - b.points)[0],
      bestCategory: categoryRows[0],
      worstCategory: categoryRows[categoryRows.length - 1],
      top3Finishes: weeklyRanks.filter(row => row.rank <= 3).length,
      blowoutWins,
      blowoutLosses,
      recentForm,
      weeklyRanks
    };

    profile.verdict = getVerdict(profile);
    return profile;
  }

  function renderProfileTrend(weeklyRanks) {
    return `
      <div class="uti-profile-trend">
        ${weeklyRanks.map(row => {
          const strength = Math.max(10, ((11 - row.rank) / 10) * 100);
          return `
            <div class="uti-profile-trend-item" title="Week ${row.week}: #${row.rank}">
              <div class="uti-profile-trend-bar-wrap">
                <span class="uti-profile-trend-bar" style="height:${strength.toFixed(0)}%"></span>
              </div>
              <strong>#${row.rank}</strong>
              <small>W${row.week}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderRecentForm(recentForm) {
    if (!recentForm.length) return "<span>—</span>";
    return recentForm.map(row => `
      <span class="uti-form-chip is-${row.result.toLowerCase()}" title="Week ${row.week}: ${row.score}">
        ${row.result}<small>${row.week}</small>
      </span>
    `).join("");
  }

  function renderProfileSeasonTabs(team) {
    const buttons = [
      { season: "2026", label: "Fantrax" },
      ...[2025, 2024, 2023]
        .filter(season => yahooAnalytics(season))
        .map(season => ({ season: String(season), label: "Yahoo" }))
    ].filter(button => teamHasSeasonData(team, button.season));

    return `
      <div class="uti-profile-season-tabs" aria-label="Team profile season">
        ${buttons.map(button => `
          <button type="button" class="${activeProfileSeason === button.season ? "is-active" : ""}" data-profile-season="${button.season}">
            <strong>${button.season}</strong><span>${button.label}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderProfileSeasonNotice(profile) {
    if (profile.source === "yahoo") {
      return `
        <div class="uti-history-notice">
          <strong>${profile.season} Yahoo scoring</strong>
          <span>This season is calculated with its own Yahoo categories, including BSV and SV+H, so it is not mixed directly into the 2026 Fantrax category ratings.</span>
        </div>
      `;
    }

    if (currentPlayoffRows().length) {
      return `
        <div class="uti-history-notice">
          <strong>2026 playoffs tracked separately</strong>
          <span>Actual records include playoff matchups. All-Play, Luck, Power, category strength, and weekly-rank metrics stay regular-season-only so the eight-team playoff field does not distort the ten-team league comparisons.</span>
        </div>
      `;
    }

    return "";
  }

  function renderProfileSeasonRecord(team, season) {
    const overallRecord = franchiseRecord(team, null, season, "all");
    const regularRecord = franchiseRecord(team, null, season, "regular");
    const playoffRecord = franchiseRecord(team, null, season, "playoffs");

    return `
      <strong>${formatRecord(overallRecord)}</strong>
      <div class="uti-profile-record-splits">
        <span class="is-regular">
          <small>Regular Season</small>
          <b>${formatRecord(regularRecord)}</b>
        </span>
        <span class="is-playoffs">
          <small>Playoffs</small>
          <b>${playoffRecord.games ? formatRecord(playoffRecord) : "—"}</b>
        </span>
      </div>
    `;
  }

  function renderIdentityCard(kind, label, rank, pct) {
    return `
        <article class="uti-profile-split-card is-${kind}">
          <span class="uti-profile-card-label">${label}</span>
          <div class="uti-profile-rank-line">
            <strong>#${rank}</strong>
            <span>${formatPct(pct)}</span>
          </div>
          <div class="uti-profile-meter"><span style="width:${Math.max(3, pct * 100).toFixed(1)}%"></span></div>
        </article>
    `;
  }

  function renderWeekDetailCard(kind, label, week) {
    return `
        <article class="uti-profile-detail-card is-${kind}">
          <span>${label}</span>
          <strong>Week ${week?.week ?? "—"} · #${week?.rank ?? "—"}</strong>
          <small>${week ? `${week.wins}-${week.losses}-${week.ties} all-play` : "—"}</small>
        </article>
    `;
  }

  function renderCategoryDetailCard(kind, label, category) {
    return `
        <article class="uti-profile-detail-card is-${kind}">
          <span>${label}</span>
          <strong>${category?.category ?? "—"}</strong>
          <small>${category ? `${formatPct(category.winPct)} league-wide win rate` : "—"}</small>
        </article>
    `;
  }

  function ensureProfileModal() {
    if (document.getElementById("utiTeamProfileModal")) return;

    document.body.insertAdjacentHTML("beforeend", `
      <div class="uti-profile-backdrop" id="utiTeamProfileModal" hidden>
        <section class="uti-profile-modal" role="dialog" aria-modal="true" aria-labelledby="utiProfileTeamName">
          <button class="uti-profile-close" type="button" data-uti-profile-close aria-label="Close team profile">×</button>
          <div id="utiTeamProfileContent"></div>
        </section>
      </div>
    `);
  }

  function closeTeamProfile() {
    const modal = document.getElementById("utiTeamProfileModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("uti-profile-open");
  }

  function openTeamProfile(team, season = activeProfileSeason) {
    if (!team) return;

    const resolvedSeason = preferredSeasonForTeam(team, season);
    const data = getSeasonData(resolvedSeason);
    if (!data) return;

    activeProfileTeam = team;
    activeProfileSeason = String(resolvedSeason);
    ensureProfileModal();

    const profile = buildTeamProfile(data, team);
    const isYahoo = profile.source === "yahoo";
    const weeksLabel = String(profile.season) === "2026"
      ? currentSeasonStatusLabel(false)
      : (profile.trackedWeeks.length
        ? `Weeks ${weekSpan(profile.trackedWeeks)} imported`
        : "No weeks imported");

    document.getElementById("utiTeamProfileContent").innerHTML = `
      ${renderProfileSeasonTabs(team)}

      <div class="uti-profile-hero">
        <div class="uti-profile-team-block">
          <img class="uti-profile-logo" src="${logoFor(team)}" alt="">
          <div>
            <span class="uti-profile-kicker">${profile.season} ${isYahoo ? "Yahoo History" : "UTI Team Intel Profile"}</span>
            <h2 id="utiProfileTeamName">${escapeHtml(team)}</h2>
            <span class="uti-profile-verdict">${escapeHtml(profile.verdict)}</span>
            <span class="uti-profile-source-note">${weeksLabel}${isYahoo ? " · Historical import is still in progress" : ""}</span>
          </div>
        </div>

        <div class="uti-profile-power-badge">
          <span>${isYahoo ? "Imported Power" : "Power Rank"}</span>
          <strong>#${profile.powerRank || "—"}</strong>
          <small>${profile.powerRating.toFixed(1)} / 100</small>
        </div>
      </div>

      ${renderProfileSeasonNotice(profile)}

      <div class="uti-profile-stat-grid">
        <article>
          <span>All-Play</span>
          <strong>${formatRecord(profile.allPlayRecord)}</strong>
          <small>${formatPct(profile.allPlayPct)} vs league</small>
        </article>
        <article class="uti-profile-record-card">
          <span>${profile.season} Record</span>
          ${renderProfileSeasonRecord(team, Number(profile.season))}
        </article>
        <article>
          <span>Luck Index</span>
          <strong class="${profile.luck >= 0 ? "is-positive" : "is-negative"}">${formatSigned(profile.luck)}</strong>
          <small>${profile.expectedPoints.toFixed(2)} expected wins</small>
        </article>
        <article>
          <span>Avg Weekly Rank</span>
          <strong>#${profile.avgWeeklyRank.toFixed(1)}</strong>
          <small>${profile.top3Finishes} top-3 finishes</small>
        </article>
      </div>

      <div class="uti-profile-split-grid">
        ${renderIdentityCard("hitting", "Hitting Identity", profile.hittingRank, profile.hittingPct)}
        ${renderIdentityCard("pitching", "Pitching Identity", profile.pitchingRank, profile.pitchingPct)}
      </div>

      <section class="uti-profile-section">
        <div class="uti-profile-section-head">
          <div>
            <span class="uti-profile-card-label">Weekly Performance</span>
            <h3>All-Play Rank by Week</h3>
          </div>
          <div class="uti-profile-form">${renderRecentForm(profile.recentForm)}</div>
        </div>
        ${renderProfileTrend(profile.weeklyRanks)}
      </section>

      <div class="uti-profile-detail-grid">
        ${renderWeekDetailCard("best", "💪 Best Week", profile.bestWeek)}
        ${renderWeekDetailCard("worst", "💩 Worst Week", profile.worstWeek)}
        ${renderCategoryDetailCard("best-cat", "👑 Best Category", profile.bestCategory)}
        ${renderCategoryDetailCard("worst-cat", "☠️ Achilles Heel", profile.worstCategory)}
      </div>

      <div class="uti-profile-footer-stats">
        <span><strong>${profile.blowoutWins}</strong> blowout wins</span>
        <span><strong>${profile.blowoutLosses}</strong> blowout losses</span>
        <span><strong>${profile.volatility.toFixed(1)}</strong> volatility</span>
      </div>
    `;

    document.getElementById("utiTeamProfileModal").hidden = false;
    document.body.classList.add("uti-profile-open");
  }

  // Any element on the page whose text is a team name (or old team name) becomes a profile link.
  function normalizeTeamProfileText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function teamFromProfileText(value, allowContains = false) {
    const text = normalizeTeamProfileText(value);
    if (!text) return null;

    for (const [team, aliases] of Object.entries(TEAM_PROFILE_ALIASES)) {
      for (const alias of aliases) {
        const normalizedAlias = normalizeTeamProfileText(alias);
        if (text === normalizedAlias) return team;
        if (allowContains && text.includes(normalizedAlias)) return team;
      }
    }
    return null;
  }

  function wireTeamProfileElement(element) {
    if (!(element instanceof HTMLElement)) return;
    if (element.closest("#utiTeamProfileModal")) return;
    if (element.hasAttribute("data-team-profile")) return;
    if (element.hasAttribute("data-profile-season")) return;

    const isAnchor = element.matches("a");
    const isTeamTag = element.matches(".tag, .weekly-winner-name");
    const team = teamFromProfileText(element.textContent, isAnchor || isTeamTag);
    if (!team) return;

    element.setAttribute("data-team-profile", team);
    if (!element.hasAttribute("data-profile-open-season")) {
      element.setAttribute("data-profile-open-season", isHistoryPage() ? "2025" : "2026");
    }
    element.classList.add("uti-global-team-profile-link");

    if (!isAnchor && !element.matches("button")) {
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
    }
    element.setAttribute("aria-label", `Open ${team} profile`);
  }

  const TEAM_NAME_SELECTOR = "a,button,strong,span,h1,h2,h3,h4,h5,h6,td,th,.tag,.weekly-winner-name";

  function wireAllTeamNames(root = document) {
    if (!(root instanceof Document || root instanceof Element)) return;

    if (root instanceof Element && root.matches(TEAM_NAME_SELECTOR)) {
      wireTeamProfileElement(root);
    }
    root.querySelectorAll(TEAM_NAME_SELECTOR).forEach(wireTeamProfileElement);
  }

  function setupGlobalTeamProfileLinks() {
    wireAllTeamNames(document);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) wireAllTeamNames(node);
        });

        if (mutation.type === "characterData" && mutation.target.parentElement) {
          wireTeamProfileElement(mutation.target.parentElement);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function setupProfileInteractions() {
    document.addEventListener("click", event => {
      if (event.target.closest("[data-uti-profile-close]")) {
        closeTeamProfile();
        return;
      }

      const modal = document.getElementById("utiTeamProfileModal");
      if (modal && event.target === modal) {
        closeTeamProfile();
        return;
      }

      const seasonButton = event.target.closest("[data-profile-season]");
      if (seasonButton && activeProfileTeam) {
        event.preventDefault();
        openTeamProfile(activeProfileTeam, seasonButton.getAttribute("data-profile-season"));
        return;
      }

      const trigger = event.target.closest("[data-team-profile]");
      if (trigger) {
        event.preventDefault();
        const season = trigger.getAttribute("data-profile-open-season") || (isHistoryPage() ? "2025" : "2026");
        openTeamProfile(trigger.getAttribute("data-team-profile"), season);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeTeamProfile();

      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-team-profile]")) {
        event.preventDefault();
        const season = event.target.getAttribute("data-profile-open-season") || "2026";
        openTeamProfile(event.target.getAttribute("data-team-profile"), season);
      }
    });
  }

  /* ---------- 9. Loading + startup ---------- */

  function loadScriptOnce(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);

    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src && script.src.endsWith(src));
      if (existing) {
        existing.addEventListener("load", () => resolve(window[globalName] || []), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve(window[globalName] || []);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadCurrentSeason() {
    const data = await window.UTIAnalytics.load("data/weekly-team-stats.csv");
    data.season = CURRENT_SEASON;
    data.source = "fantrax";
    data.hittingCategories = HITTING_CATEGORIES;
    data.pitchingCategories = PITCHING_CATEGORIES;
    data.weeks = [...new Set(data.rows.map(row => Number(row.week)))]
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    data.allRows = (data.allRows || data.rows || []).map(row => withCurrentSeasonDefaults(row));
    data.regularRows = (data.regularRows || data.rows || []).map(row => withCurrentSeasonDefaults(row));
    data.playoffRows = (data.playoffRows || []).map(row => withCurrentSeasonDefaults(row, "playoffs"));
    return data;
  }

  // Analytics use regular-season rows only; allRows keeps playoffs for actual records.
  async function loadYahooSeasons() {
    for (const { season, src, globalName } of YAHOO_SEASONS) {
      try {
        const rows = await loadScriptOnce(src, globalName);
        if (!Array.isArray(rows) || !rows.length) continue;

        const allRows = rows.map(row => withPhaseDefaults(row));
        const analytics = buildGenericSeasonAnalytics(allRows.filter(row => !isPlayoffRow(row)), {
          categories: [...YAHOO_HITTING_CATEGORIES, ...YAHOO_PITCHING_CATEGORIES],
          rules: YAHOO_RULES,
          hittingCategories: YAHOO_HITTING_CATEGORIES,
          pitchingCategories: YAHOO_PITCHING_CATEGORIES,
          season,
          source: "yahoo"
        });

        yahooHistory[season] = { analytics, allRows };
      } catch (error) {
        console.warn(`${season} Yahoo history could not be loaded:`, error);
      }
    }
  }

  function renderCurrentBoard(grid, data, isPreview) {
    grid.innerHTML = renderLeaderCards(data, "2026", CURRENT_BOARD_CARDS);

    document.getElementById("utiIntelligencePreviewCta")?.remove();

    if (isPreview) {
      const previewCta = document.createElement("div");
      previewCta.id = "utiIntelligencePreviewCta";
      previewCta.className = "uti-intelligence-preview-cta";
      previewCta.innerHTML = `
            <div>
              <strong>Want the full nerd report?</strong>
              <span>Current All-Play standings, Luck Index, Power Rankings, Category Kings, and team profiles.</span>
            </div>
            <a class="uti-intelligence-page-link" href="uti-intelligence.html">
              Open UTI Intelligence <span aria-hidden="true">→</span>
            </a>
          `;
      grid.insertAdjacentElement("afterend", previewCta);
    }

    renderChartTables("uti", data, "2026");
  }

  function renderLoadError(grid) {
    if (grid) {
      grid.innerHTML = `
          <article class="uti-intel-card uti-intel-error">
            <span class="uti-intel-label">UTI Intelligence</span>
            <strong class="uti-intel-team">Analytics unavailable</strong>
            <span class="uti-intel-copy">Check weekly-team-stats.csv and the analytics scripts.</span>
          </article>
        `;
    }

    const historyGrid = document.getElementById("utiHistoryGrid");
    if (historyGrid) {
      historyGrid.innerHTML = `
          <article class="uti-intel-card uti-intel-error">
            <span class="uti-intel-label">UTI History</span>
            <strong class="uti-intel-team">History unavailable</strong>
            <span class="uti-intel-copy">Check the Yahoo history data file and analytics scripts.</span>
          </article>
        `;
    }
  }

  async function renderUTIIntelligence() {
    const grid = document.getElementById("utiIntelligenceGrid");
    const range = document.getElementById("utiIntelligenceRange");
    const section = document.getElementById("uti-intelligence");
    const mode = section?.dataset?.utiMode || (grid ? "full" : "history");
    const isPreview = mode === "preview";

    // Work out which sections exist on this page.
    const needsCurrentBoard = Boolean(grid);
    const needsHistoryBoard = Boolean(
      document.getElementById("utiHistoryGrid") ||
      document.getElementById("utiHistory2024Grid") ||
      document.getElementById("utiHistory2023Grid")
    );
    const needsHistoryTeaser = Boolean(document.getElementById("utiHistoryTeaserGrid"));
    const needsHistoryOverview = Boolean(document.getElementById("utiHistoryOverviewGrid"));
    const needsHistoryRecords = Boolean(
      document.getElementById("utiFranchiseResumeTable") ||
      document.getElementById("utiHeadToHeadGrid")
    );

    if (!window.UTIAnalytics) return;
    if (!needsCurrentBoard && !needsHistoryBoard && !needsHistoryTeaser && !needsHistoryOverview && !needsHistoryRecords) return;

    try {
      const data = await loadCurrentSeason();
      latestAnalytics = data;

      // Team profiles on the homepage also expose the Yahoo season tabs, so load Yahoo
      // history even when the homepage Intelligence section is in preview mode.
      const needsYahoo = needsCurrentBoard || !isPreview || needsHistoryBoard || needsHistoryTeaser || needsHistoryOverview || needsHistoryRecords;
      if (needsYahoo) await loadYahooSeasons();

      ensureProfileModal();

      if (range && data.weeks.length) {
        range.textContent = currentSeasonStatusLabel(false);
      }

      const currentSeasonBadge = document.getElementById("utiCurrentSeasonBadge");
      if (currentSeasonBadge && data.weeks.length) {
        currentSeasonBadge.textContent = `2026 Fantrax · ${currentSeasonStatusLabel(false)}`;
      }

      if (grid) renderCurrentBoard(grid, data, isPreview);

      if (needsHistoryBoard) {
        [2025, 2024, 2023].forEach(renderYahooSeasonBoard);
      }

      if (hasAnyYahooHistory()) {
        if (needsHistoryOverview) renderHistoryOverview();
        if (needsHistoryTeaser) renderHistoryTeaser();
        if (needsHistoryRecords) renderHistoryRecordSections();
      }
    } catch (error) {
      console.error("UTI Intelligence failed to load:", error);
      renderLoadError(grid);
    }
  }

  function onDomReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  setupProfileInteractions();
  onDomReady(setupGlobalTeamProfileLinks);
  onDomReady(renderUTIIntelligence);
})();
