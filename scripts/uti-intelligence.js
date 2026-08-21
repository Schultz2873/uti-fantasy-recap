(() => {
  const FALLBACK_LOGO = "images/owners/gunnarrhea.png";
  const HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB"];
  const PITCHING_CATEGORIES = ["W", "L", "QS", "NS", "K", "ERA", "WHIP", "BAA"];

  const YAHOO_2025_HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "TB", "AVG", "NSB"];
  const YAHOO_2025_PITCHING_CATEGORIES = ["W", "L", "K", "ERA", "WHIP", "QS", "BSV", "SVH"];
  const TEAM_PROFILE_ALIASES = {
    "Gunnarrhea": ["Gunnarrhea", "Acuña Handle the Gunnarrhea?"],
    "BTA Boyz": ["BTA Boyz", "Yoshida Yo Pants", "Yoshida Yo Pants 💩"],
    "You Don't Know Bo": ["You Don't Know Bo", "You Don't Kno Bo"],
    "BB's Bold Team": ["BB's Bold Team", "BB’s Bold Team"],
    "Dixon Cider": ["Dixon Cider"],
    "Goodyear Gila Monsters": ["Goodyear Gila Monsters"],
    "John's Super Team": ["John's Super Team", "John’s Super Team"],
    "Mactown MacDaddies": ["Mactown MacDaddies"],
    "Me So Heorny": ["Me So Heorny"],
    "This Is Mizerable": ["This Is Mizerable", "This is Mizerable"]
  };

  const YAHOO_2025_RULES = {
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

  let latestAnalytics = null;
  let yahoo2025Analytics = null;
  let activeProfileTeam = null;
  let activeProfileSeason = "2026";

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

  function logoFor(team) {
    return window.TEAM_LOGOS?.[team] || FALLBACK_LOGO;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function teamIdentity(team, compact = false) {
    const safeTeam = escapeHtml(team);
    return `
      <span class="uti-team-identity uti-team-profile-trigger ${compact ? "is-compact" : ""}" data-team-profile="${safeTeam}" role="button" tabindex="0" aria-label="Open ${safeTeam} profile">
        <img class="uti-team-logo" src="${logoFor(team)}" alt="" loading="lazy">
        <span class="uti-team-name">${safeTeam}</span>
      </span>
    `;
  }

  function metricCard({ icon, eyebrow, team, value, copy, tone = "" }) {
    return `
      <article class="uti-intel-card uti-team-profile-trigger ${tone}" data-team-profile="${escapeHtml(team)}" role="button" tabindex="0" aria-label="Open ${escapeHtml(team)} profile">
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

  function renderAllPlayChart(allPlay) {
    const maxPct = Math.max(...allPlay.map(row => Number(row.winPct || 0)), 0.01);

    return `
      <div class="uti-rank-chart">
        ${allPlay.map((row, index) => {
          const pct = Number(row.winPct || 0);
          const width = Math.max(3, (pct / maxPct) * 100);
          return `
            <div class="uti-rank-row">
              <span class="uti-rank-number">${index + 1}</span>
              ${teamIdentity(row.team)}
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

  function renderPowerChart(powerRankings) {
    return `
      <div class="uti-rank-chart">
        ${powerRankings.map((row, index) => {
          const rating = Math.max(0, Math.min(100, Number(row.rating || 0) * 100));
          return `
            <div class="uti-rank-row ${index < 3 ? `is-top-${index + 1}` : ""}">
              <span class="uti-rank-number">${index + 1}</span>
              ${teamIdentity(row.team)}
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

  function renderLuckChart(luckIndex) {
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
              ${teamIdentity(row.team)}
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

  function renderCategoryChart(data) {
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
                ${teamIdentity(king?.team || "—", true)}
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

  function genericCompareTeams(a, b, categories, rules) {
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

  function ensureGenericRecord(records, team) {
    if (!records[team]) {
      records[team] = { wins: 0, losses: 0, ties: 0, points: 0, games: 0, winPct: 0 };
    }
    return records[team];
  }

  function buildGenericSeasonAnalytics(rows, {
    categories,
    rules,
    hittingCategories,
    pitchingCategories,
    season,
    source
  }) {
    const byWeek = groupRowsByWeek(rows);
    const officialRecords = {};
    const allPlayRecords = {};
    const categoryRecords = {};

    const ensureCategories = team => {
      if (!categoryRecords[team]) {
        categoryRecords[team] = {};
        categories.forEach(category => {
          categoryRecords[team][category] = {
            wins: 0, losses: 0, ties: 0, points: 0, games: 0, winPct: 0
          };
        });
      }
      return categoryRecords[team];
    };

    rows.forEach(row => {
      const record = ensureGenericRecord(officialRecords, row.team);
      const forScore = Number(row.official_score_for);
      const againstScore = Number(row.official_score_against);

      if (!Number.isFinite(forScore) || !Number.isFinite(againstScore)) return;

      record.games += 1;
      if (forScore > againstScore) {
        record.wins += 1;
        record.points += 1;
      } else if (forScore < againstScore) {
        record.losses += 1;
      } else {
        record.ties += 1;
        record.points += 0.5;
      }
    });

    for (const weekRows of byWeek.values()) {
      for (let i = 0; i < weekRows.length; i++) {
        for (let j = i + 1; j < weekRows.length; j++) {
          const a = weekRows[i];
          const b = weekRows[j];
          const comparison = genericCompareTeams(a, b, categories, rules);

          const aAll = ensureGenericRecord(allPlayRecords, a.team);
          const bAll = ensureGenericRecord(allPlayRecords, b.team);
          aAll.games += 1;
          bAll.games += 1;

          if (comparison.scoreA > comparison.scoreB) {
            aAll.wins += 1;
            aAll.points += 1;
            bAll.losses += 1;
          } else if (comparison.scoreB > comparison.scoreA) {
            bAll.wins += 1;
            bAll.points += 1;
            aAll.losses += 1;
          } else {
            aAll.ties += 1;
            bAll.ties += 1;
            aAll.points += 0.5;
            bAll.points += 0.5;
          }

          categories.forEach(category => {
            const result = compareCategoryValue(a, b, category, rules);
            const aRec = ensureCategories(a.team)[category];
            const bRec = ensureCategories(b.team)[category];

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

    [officialRecords, allPlayRecords].forEach(records => {
      Object.values(records).forEach(record => {
        record.winPct = record.games ? record.points / record.games : 0;
      });
    });

    Object.values(categoryRecords).forEach(teamCategories => {
      Object.values(teamCategories).forEach(record => {
        record.winPct = record.games ? record.points / record.games : 0;
      });
    });

    const categoryKings = {};
    categories.forEach(category => {
      categoryKings[category] = Object.entries(categoryRecords)
        .map(([team, records]) => ({ team, ...records[category] }))
        .sort((a, b) => b.winPct - a.winPct || b.points - a.points || a.team.localeCompare(b.team));
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
        const forScore = Number(row.official_score_for);
        const againstScore = Number(row.official_score_against);
        if (forScore > againstScore) recentPoints += 1;
        else if (forScore === againstScore) recentPoints += 0.5;
      });

      const recentPct = recentRows.length ? recentPoints / recentRows.length : 0;
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

  function getSeasonData(season) {
    if (String(season) === "2025") return yahoo2025Analytics;
    return latestAnalytics;
  }

  function groupRowsByWeek(rows) {
    return rows.reduce((map, row) => {
      const week = Number(row.week);
      if (!map.has(week)) map.set(week, []);
      map.get(week).push(row);
      return map;
    }, new Map());
  }

  function compareCategoryValue(a, b, category, rules) {
    const av = Number(a?.[category]);
    const bv = Number(b?.[category]);
    if (!Number.isFinite(av) || !Number.isFinite(bv) || av === bv) return 0;

    const lowerWins = rules?.[category] === "low";
    if (lowerWins) return av < bv ? 1 : -1;
    return av > bv ? 1 : -1;
  }

  function compareSubset(a, b, categories, rules) {
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

  function getSubsetStrength(rows, categories, rules) {
    const byWeek = groupRowsByWeek(rows);
    const records = {};

    const ensure = team => {
      if (!records[team]) records[team] = { wins: 0, losses: 0, ties: 0, points: 0, games: 0, winPct: 0 };
      return records[team];
    };

    for (const weekRows of byWeek.values()) {
      for (let i = 0; i < weekRows.length; i++) {
        for (let j = i + 1; j < weekRows.length; j++) {
          const a = weekRows[i];
          const b = weekRows[j];
          const result = compareSubset(a, b, categories, rules);
          const ra = ensure(a.team);
          const rb = ensure(b.team);

          ra.games += 1;
          rb.games += 1;

          if (result.scoreA > result.scoreB) {
            ra.wins += 1;
            ra.points += 1;
            rb.losses += 1;
          } else if (result.scoreB > result.scoreA) {
            rb.wins += 1;
            rb.points += 1;
            ra.losses += 1;
          } else {
            ra.ties += 1;
            rb.ties += 1;
            ra.points += 0.5;
            rb.points += 0.5;
          }
        }
      }
    }

    Object.values(records).forEach(record => {
      record.winPct = record.games ? record.points / record.games : 0;
    });

    const ranking = Object.entries(records)
      .map(([team, record]) => ({ team, ...record }))
      .sort((a, b) => b.winPct - a.winPct || b.points - a.points || a.team.localeCompare(b.team));

    return { records, ranking };
  }

  function getWeeklyAllPlayRanks(rows, categories, rules) {
    const byWeek = groupRowsByWeek(rows);
    const output = [];

    [...byWeek.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([week, weekRows]) => {
        const records = {};

        const ensure = team => {
          if (!records[team]) records[team] = { team, wins: 0, losses: 0, ties: 0, points: 0, games: 0 };
          return records[team];
        };

        for (let i = 0; i < weekRows.length; i++) {
          for (let j = i + 1; j < weekRows.length; j++) {
            const a = weekRows[i];
            const b = weekRows[j];
            const result = categories && rules
              ? genericCompareTeams(a, b, categories, rules)
              : window.UTIAnalytics.compareTeams(a, b);
            const ra = ensure(a.team);
            const rb = ensure(b.team);

            ra.games += 1;
            rb.games += 1;

            if (result.scoreA > result.scoreB) {
              ra.wins += 1;
              ra.points += 1;
              rb.losses += 1;
            } else if (result.scoreB > result.scoreA) {
              rb.wins += 1;
              rb.points += 1;
              ra.losses += 1;
            } else {
              ra.ties += 1;
              rb.ties += 1;
              ra.points += 0.5;
              rb.points += 0.5;
            }
          }
        }

        const ranked = Object.values(records)
          .sort((a, b) => b.points - a.points || b.wins - a.wins || a.team.localeCompare(b.team));

        ranked.forEach((record, index) => {
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

    const hittingCategories = data.hittingCategories || HITTING_CATEGORIES;
    const pitchingCategories = data.pitchingCategories || PITCHING_CATEGORIES;
    const hitting = getSubsetStrength(data.rows, hittingCategories, data.categoryRules);
    const pitching = getSubsetStrength(data.rows, pitchingCategories, data.categoryRules);

    const hittingRank = hitting.ranking.findIndex(row => row.team === team) + 1;
    const pitchingRank = pitching.ranking.findIndex(row => row.team === team) + 1;
    const hittingRecord = hitting.records[team] || {};
    const pitchingRecord = pitching.records[team] || {};

    const weeklyRanks = getWeeklyAllPlayRanks(data.rows, data.categories, data.categoryRules)
      .filter(row => row.team === team)
      .sort((a, b) => a.week - b.week);

    const avgWeeklyRank = weeklyRanks.length
      ? weeklyRanks.reduce((sum, row) => sum + row.rank, 0) / weeklyRanks.length
      : 0;

    const rankMean = avgWeeklyRank;
    const volatility = weeklyRanks.length
      ? Math.sqrt(weeklyRanks.reduce((sum, row) => sum + Math.pow(row.rank - rankMean, 2), 0) / weeklyRanks.length)
      : 0;

    const bestWeek = [...weeklyRanks].sort((a, b) => a.rank - b.rank || b.points - a.points)[0];
    const worstWeek = [...weeklyRanks].sort((a, b) => b.rank - a.rank || a.points - b.points)[0];

    const categoryRows = Object.entries(data.categoryRecords[team] || {})
      .map(([category, record]) => ({ category, ...record }))
      .sort((a, b) => b.winPct - a.winPct);

    const bestCategory = categoryRows[0];
    const worstCategory = categoryRows[categoryRows.length - 1];

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

    const top3Finishes = weeklyRanks.filter(row => row.rank <= 3).length;

    const recentRows = teamRows.slice(-4);
    const recentForm = recentRows.map(row => {
      const forScore = Number(row.official_score_for);
      const againstScore = Number(row.official_score_against);
      const result = forScore > againstScore ? "W" : forScore < againstScore ? "L" : "T";
      return { week: Number(row.week), result, score: `${forScore}-${againstScore}` };
    });

    const profile = {
      team,
      season: data.season || 2026,
      source: data.source || "fantrax",
      trackedWeeks: [...new Set(data.rows.map(row => Number(row.week)))].filter(Number.isFinite).sort((a, b) => a - b),
      powerRank: powerIndex >= 0 ? powerIndex + 1 : 0,
      powerRating: Number(power?.rating || 0) * 100,
      allPlayRecord: allPlay,
      allPlayPct: Number(allPlay.winPct || 0),
      officialRecord: official,
      luck: Number(luckRow.luck || 0),
      expectedPoints: Number(luckRow.expectedPoints || 0),
      hittingRank,
      pitchingRank,
      hittingPct: Number(hittingRecord.winPct || 0),
      pitchingPct: Number(pitchingRecord.winPct || 0),
      avgWeeklyRank,
      volatility,
      bestWeek,
      worstWeek,
      bestCategory,
      worstCategory,
      top3Finishes,
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
    const data = getSeasonData(season);
    if (!data || !team) return;

    activeProfileTeam = team;
    activeProfileSeason = String(season);
    ensureProfileModal();

    const profile = buildTeamProfile(data, team);
    const modal = document.getElementById("utiTeamProfileModal");
    const content = document.getElementById("utiTeamProfileContent");
    const best = profile.bestCategory;
    const worst = profile.worstCategory;
    const weeksLabel = profile.trackedWeeks.length
      ? `Weeks ${profile.trackedWeeks[0]}–${profile.trackedWeeks[profile.trackedWeeks.length - 1]} imported`
      : "No weeks imported";

    const seasonTabs = `
      <div class="uti-profile-season-tabs" aria-label="Team profile season">
        <button type="button" class="${activeProfileSeason === "2026" ? "is-active" : ""}" data-profile-season="2026">
          <strong>2026</strong><span>Fantrax · 19 weeks</span>
        </button>
        <button type="button" class="${activeProfileSeason === "2025" ? "is-active" : ""}" data-profile-season="2025">
          <strong>2025</strong><span>Yahoo · ${yahoo2025Analytics?.weeks?.length || 0} weeks</span>
        </button>
      </div>
    `;

    content.innerHTML = `
      ${seasonTabs}

      <div class="uti-profile-hero">
        <div class="uti-profile-team-block">
          <img class="uti-profile-logo" src="${logoFor(team)}" alt="">
          <div>
            <span class="uti-profile-kicker">${profile.season} ${profile.source === "yahoo" ? "Yahoo History" : "UTI Team Intel Profile"}</span>
            <h2 id="utiProfileTeamName">${escapeHtml(team)}</h2>
            <span class="uti-profile-verdict">${escapeHtml(profile.verdict)}</span>
            <span class="uti-profile-source-note">${weeksLabel}${profile.source === "yahoo" ? " · Historical import is still in progress" : ""}</span>
          </div>
        </div>

        <div class="uti-profile-power-badge">
          <span>${profile.source === "yahoo" ? "Imported Power" : "Power Rank"}</span>
          <strong>#${profile.powerRank || "—"}</strong>
          <small>${profile.powerRating.toFixed(1)} / 100</small>
        </div>
      </div>

      ${profile.source === "yahoo" ? `
        <div class="uti-history-notice">
          <strong>2025 Yahoo scoring</strong>
          <span>This season is calculated with its own Yahoo categories, including BSV and SV+H, so it is not mixed directly into the 2026 Fantrax category ratings.</span>
        </div>
      ` : ""}

      <div class="uti-profile-stat-grid">
        <article>
          <span>All-Play</span>
          <strong>${formatRecord(profile.allPlayRecord)}</strong>
          <small>${formatPct(profile.allPlayPct)} vs league</small>
        </article>
        <article>
          <span>Actual Record</span>
          <strong>${formatRecord(profile.officialRecord)}</strong>
          <small>${Number(profile.officialRecord.winPct || 0) ? formatPct(profile.officialRecord.winPct) : "Tracked weeks"}</small>
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
        <article class="uti-profile-split-card is-hitting">
          <span class="uti-profile-card-label">Hitting Identity</span>
          <div class="uti-profile-rank-line">
            <strong>#${profile.hittingRank}</strong>
            <span>${formatPct(profile.hittingPct)}</span>
          </div>
          <div class="uti-profile-meter"><span style="width:${Math.max(3, profile.hittingPct * 100).toFixed(1)}%"></span></div>
        </article>

        <article class="uti-profile-split-card is-pitching">
          <span class="uti-profile-card-label">Pitching Identity</span>
          <div class="uti-profile-rank-line">
            <strong>#${profile.pitchingRank}</strong>
            <span>${formatPct(profile.pitchingPct)}</span>
          </div>
          <div class="uti-profile-meter"><span style="width:${Math.max(3, profile.pitchingPct * 100).toFixed(1)}%"></span></div>
        </article>
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
        <article class="uti-profile-detail-card is-best">
          <span>💪 Best Week</span>
          <strong>Week ${profile.bestWeek?.week ?? "—"} · #${profile.bestWeek?.rank ?? "—"}</strong>
          <small>${profile.bestWeek ? `${profile.bestWeek.wins}-${profile.bestWeek.losses}-${profile.bestWeek.ties} all-play` : "—"}</small>
        </article>

        <article class="uti-profile-detail-card is-worst">
          <span>💩 Worst Week</span>
          <strong>Week ${profile.worstWeek?.week ?? "—"} · #${profile.worstWeek?.rank ?? "—"}</strong>
          <small>${profile.worstWeek ? `${profile.worstWeek.wins}-${profile.worstWeek.losses}-${profile.worstWeek.ties} all-play` : "—"}</small>
        </article>

        <article class="uti-profile-detail-card is-best-cat">
          <span>👑 Best Category</span>
          <strong>${best?.category ?? "—"}</strong>
          <small>${best ? `${formatPct(best.winPct)} league-wide win rate` : "—"}</small>
        </article>

        <article class="uti-profile-detail-card is-worst-cat">
          <span>☠️ Achilles Heel</span>
          <strong>${worst?.category ?? "—"}</strong>
          <small>${worst ? `${formatPct(worst.winPct)} league-wide win rate` : "—"}</small>
        </article>
      </div>

      <div class="uti-profile-footer-stats">
        <span><strong>${profile.blowoutWins}</strong> blowout wins</span>
        <span><strong>${profile.blowoutLosses}</strong> blowout losses</span>
        <span><strong>${profile.volatility.toFixed(1)}</strong> volatility</span>
      </div>
    `;

    modal.hidden = false;
    document.body.classList.add("uti-profile-open");
  }


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
    element.classList.add("uti-global-team-profile-link");

    if (!isAnchor && !element.matches("button")) {
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute("aria-label", `Open ${team} profile`);
    } else {
      element.setAttribute("aria-label", `Open ${team} profile`);
    }
  }

  function wireAllIndexTeamNames(root = document) {
    if (!(root instanceof Document || root instanceof Element)) return;

    const selector = [
      "a","button","strong","span","h1","h2","h3","h4","h5","h6","td","th",".tag",".weekly-winner-name"
    ].join(",");

    if (root instanceof Element && root.matches(selector)) {
      wireTeamProfileElement(root);
    }
    root.querySelectorAll(selector).forEach(wireTeamProfileElement);
  }

  function setupGlobalTeamProfileLinks() {
    wireAllIndexTeamNames(document);

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element) wireAllIndexTeamNames(node);
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
      const closeTarget = event.target.closest("[data-uti-profile-close]");
      if (closeTarget) {
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
        openTeamProfile(trigger.getAttribute("data-team-profile"), "2026");
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeTeamProfile();

      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-team-profile]")) {
        event.preventDefault();
        openTeamProfile(event.target.getAttribute("data-team-profile"), "2026");
      }
    });
  }

  async function renderUTIIntelligence() {
    const grid = document.getElementById("utiIntelligenceGrid");
    const range = document.getElementById("utiIntelligenceRange");
    const section = document.getElementById("uti-intelligence");
    const mode = section?.dataset?.utiMode || "full";
    const isPreview = mode === "preview";
    if (!grid || !window.UTIAnalytics) return;

    try {
      const data = await window.UTIAnalytics.load("data/weekly-team-stats.csv");
      data.season = 2026;
      data.source = "fantrax";
      data.hittingCategories = HITTING_CATEGORIES;
      data.pitchingCategories = PITCHING_CATEGORIES;
      latestAnalytics = data;

      try {
        const yahooRows = await loadScriptOnce(
          "data/history/2025-yahoo-weekly-team-stats.js",
          "UTI_YAHOO_2025_WEEKLY_TEAM_STATS"
        );

        if (Array.isArray(yahooRows) && yahooRows.length) {
          yahoo2025Analytics = buildGenericSeasonAnalytics(yahooRows, {
            categories: [...YAHOO_2025_HITTING_CATEGORIES, ...YAHOO_2025_PITCHING_CATEGORIES],
            rules: YAHOO_2025_RULES,
            hittingCategories: YAHOO_2025_HITTING_CATEGORIES,
            pitchingCategories: YAHOO_2025_PITCHING_CATEGORIES,
            season: 2025,
            source: "yahoo"
          });
        }
      } catch (historyError) {
        console.warn("2025 Yahoo history could not be loaded:", historyError);
      }

      ensureProfileModal();
      const weeks = [...new Set(data.rows.map(row => Number(row.week)))]
        .filter(Number.isFinite)
        .sort((a, b) => a - b);

      if (range && weeks.length) {
        range.textContent = weeks.length === 1
          ? `Week ${weeks[0]} sample`
          : `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
      }

      const allPlay = Object.entries(data.allPlayRecords)
        .map(([team, record]) => ({ team, ...record }))
        .sort((a, b) => b.winPct - a.winPct || b.points - a.points || a.team.localeCompare(b.team));

      const leader = allPlay[0];
      const power = data.powerRankings[0];
      const luckiest = data.luckIndex[0];
      const unluckiest = data.luckIndex[data.luckIndex.length - 1];

      grid.innerHTML = [
        metricCard({
          icon: "🏆",
          eyebrow: "All-Play King",
          team: leader?.team || "—",
          value: leader ? formatRecord(leader) : "—",
          copy: leader ? `${formatPct(leader.winPct)} against the entire league` : "Waiting for data",
          tone: "is-leader"
        }),
        metricCard({
          icon: "🔥",
          eyebrow: "Power #1",
          team: power?.team || "—",
          value: power ? `${(power.rating * 100).toFixed(1)} / 100` : "—",
          copy: "50% all-play · 30% categories · 20% form",
          tone: "is-power"
        }),
        metricCard({
          icon: "🍀",
          eyebrow: "Luckiest",
          team: luckiest?.team || "—",
          value: luckiest ? formatSigned(luckiest.luck) : "—",
          copy: "Wins above all-play expectation",
          tone: "is-lucky"
        }),
        metricCard({
          icon: "💀",
          eyebrow: "Unluckiest",
          team: unluckiest?.team || "—",
          value: unluckiest ? formatSigned(unluckiest.luck) : "—",
          copy: "Wins below all-play expectation",
          tone: "is-unlucky"
        })
      ].join("");

      const existingPreviewCta = document.getElementById("utiIntelligencePreviewCta");
      if (existingPreviewCta) existingPreviewCta.remove();

      if (isPreview) {
        const previewCta = document.createElement("div");
        previewCta.id = "utiIntelligencePreviewCta";
        previewCta.className = "uti-intelligence-preview-cta";
        previewCta.innerHTML = `
          <div>
            <strong>Want the full report?</strong>
            <span>All-Play standings, Luck Index, Power Rankings, Category Kings, 2025 Yahoo history, and team profiles.</span>
          </div>
          <a class="uti-intelligence-page-link" href="uti-intelligence.html">
            Open UTI Intelligence <span aria-hidden="true">→</span>
          </a>
        `;
        grid.insertAdjacentElement("afterend", previewCta);
      }

      const existingHistory = document.getElementById("utiHistorySnapshot");
      if (existingHistory) existingHistory.remove();

      if (!isPreview && yahoo2025Analytics) {
        const historyAllPlay = Object.entries(yahoo2025Analytics.allPlayRecords)
          .map(([team, record]) => ({ team, ...record }))
          .sort((a, b) => b.winPct - a.winPct || b.points - a.points);

        const hitting2025 = getSubsetStrength(
          yahoo2025Analytics.rows,
          yahoo2025Analytics.hittingCategories,
          yahoo2025Analytics.categoryRules
        ).ranking;

        const pitching2025 = getSubsetStrength(
          yahoo2025Analytics.rows,
          yahoo2025Analytics.pitchingCategories,
          yahoo2025Analytics.categoryRules
        ).ranking;

        const snapshot = document.createElement("section");
        snapshot.id = "utiHistorySnapshot";
        snapshot.className = "uti-history-snapshot";
        snapshot.innerHTML = `
          <div class="uti-history-snapshot-head">
            <div>
              <span class="uti-history-eyebrow">League History</span>
              <strong>2025 Yahoo snapshot</strong>
              <small>Weeks ${yahoo2025Analytics.weeks[0]}–${yahoo2025Analytics.weeks[yahoo2025Analytics.weeks.length - 1]} imported so far</small>
            </div>
            <span class="uti-history-chip">Historical data</span>
          </div>

          <div class="uti-history-snapshot-grid">
            <article>
              <span>2025 All-Play #1</span>
              ${teamIdentity(historyAllPlay[0]?.team || "—", true)}
              <strong>${historyAllPlay[0] ? formatPct(historyAllPlay[0].winPct) : "—"}</strong>
            </article>
            <article>
              <span>2025 Hitting #1</span>
              ${teamIdentity(hitting2025[0]?.team || "—", true)}
              <strong>${hitting2025[0] ? formatPct(hitting2025[0].winPct) : "—"}</strong>
            </article>
            <article>
              <span>2025 Pitching #1</span>
              ${teamIdentity(pitching2025[0]?.team || "—", true)}
              <strong>${pitching2025[0] ? formatPct(pitching2025[0].winPct) : "—"}</strong>
            </article>
          </div>

          <p>Click any team in UTI Intelligence to open its profile, then switch between <strong>2026 Fantrax</strong> and <strong>2025 Yahoo</strong>.</p>
        `;

        grid.insertAdjacentElement("afterend", snapshot);
      }

      const allPlayTable = document.getElementById("utiAllPlayTable");
      if (allPlayTable) allPlayTable.innerHTML = renderAllPlayChart(allPlay);

      const luckTable = document.getElementById("utiLuckTable");
      if (luckTable) luckTable.innerHTML = renderLuckChart(data.luckIndex);

      const powerTable = document.getElementById("utiPowerTable");
      if (powerTable) powerTable.innerHTML = renderPowerChart(data.powerRankings);

      const categoryTable = document.getElementById("utiCategoryTable");
      if (categoryTable) categoryTable.innerHTML = renderCategoryChart(data);

    } catch (error) {
      console.error("UTI Intelligence failed to load:", error);
      grid.innerHTML = `
        <article class="uti-intel-card uti-intel-error">
          <span class="uti-intel-label">UTI Intelligence</span>
          <strong class="uti-intel-team">Analytics unavailable</strong>
          <span class="uti-intel-copy">Check weekly-team-stats.csv and the analytics scripts.</span>
        </article>
      `;
    }
  }

  setupProfileInteractions();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupGlobalTeamProfileLinks, { once: true });
  } else {
    setupGlobalTeamProfileLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderUTIIntelligence);
  } else {
    renderUTIIntelligence();
  }
})();