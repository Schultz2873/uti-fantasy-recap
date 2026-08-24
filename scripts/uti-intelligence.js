(() => {
  const FALLBACK_LOGO = "images/owners/gunnarrhea.png";
  const HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB"];
  const PITCHING_CATEGORIES = ["W", "L", "QS", "NS", "K", "ERA", "WHIP", "BAA"];

  const YAHOO_2025_HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "TB", "AVG", "NSB"];
  const YAHOO_2025_PITCHING_CATEGORIES = ["W", "L", "K", "ERA", "WHIP", "QS", "BSV", "SVH"];
  const TEAM_PROFILE_ALIASES = {
    "Gunnarrhea": ["Gunnarrhea", "Acuña Handle the Gunnarrhea?"],
    "BTA Boyz": ["BTA Boyz", "Yoshida Yo Pants", "Yoshida Yo Pants 💩", "The Lonely Bin"],
    "You Don't Know Bo": ["You Don't Know Bo", "You Don't Kno Bo"],
    "BB's Bold Team": ["BB's Bold Team", "BB’s Bold Team"],
    "Dixon Cider": ["Dixon Cider"],
    "Goodyear Gila Monsters": ["Goodyear Gila Monsters"],
    "John's Super Team": ["John's Super Team", "John’s Super Team"],
    "Mactown MacDaddies": ["Mactown MacDaddies"],
    "Me So Heorny": ["Me So Heorny"],
    "This Is Mizerable": ["This Is Mizerable", "This is Mizerable", "I have a Bohmer"]
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
  let yahoo2025AllRows = [];
  let yahoo2024Analytics = null;
  let yahoo2024AllRows = [];
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




  function sortedAllPlayFor(data) {
    if (!data) return [];
    return Object.entries(data.allPlayRecords || {})
      .map(([team, record]) => ({ team, ...record }))
      .sort((a, b) => b.winPct - a.winPct || b.points - a.points || a.team.localeCompare(b.team));
  }

  function powerMapFor(data) {
    return Object.fromEntries((data?.powerRankings || []).map(row => [row.team, row]));
  }

  function allPlayMapFor(data) {
    return Object.fromEntries(sortedAllPlayFor(data).map(row => [row.team, row]));
  }

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

          const deltaClass = value => value > 0.001 ? "is-up" : value < -0.001 ? "is-down" : "is-flat";
          const signedOne = value => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

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

  function renderHistoricalBoard() {
    if (!yahoo2025Analytics) return;

    const historyGrid = document.getElementById("utiHistoryGrid");
    const historyRange = document.getElementById("utiHistoryRange");
    const historyBadge = document.getElementById("utiHistorySeasonBadge");

    const weeks = yahoo2025Analytics.weeks || [];
    const allPlay = sortedAllPlayFor(yahoo2025Analytics);
    const power = yahoo2025Analytics.powerRankings || [];
    const luck = yahoo2025Analytics.luckIndex || [];

    if (historyRange && weeks.length) {
      historyRange.textContent = `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
    }

    if (historyBadge && weeks.length) {
      historyBadge.textContent = `2025 Yahoo · Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
    }

    if (historyGrid) {
      const leader = allPlay[0];
      const powerLeader = power[0];
      const luckiest = luck[0];
      const unluckiest = luck[luck.length - 1];

      historyGrid.innerHTML = [
        metricCard({
          icon: "🏛️",
          eyebrow: "2025 All-Play King",
          team: leader?.team || "—",
          value: leader ? formatRecord(leader) : "—",
          copy: leader ? `${formatPct(leader.winPct)} against the 2025 league` : "Waiting for data",
          tone: "is-history",
          season: "2025"
        }),
        metricCard({
          icon: "📼",
          eyebrow: "2025 Power #1",
          team: powerLeader?.team || "—",
          value: powerLeader ? `${(powerLeader.rating * 100).toFixed(1)} / 100` : "—",
          copy: "2025 all-play · categories · recent form",
          tone: "is-history",
          season: "2025"
        }),
        metricCard({
          icon: "🍀",
          eyebrow: "2025 Luckiest",
          team: luckiest?.team || "—",
          value: luckiest ? formatSigned(luckiest.luck) : "—",
          copy: "Wins above 2025 all-play expectation",
          tone: "is-history",
          season: "2025"
        }),
        metricCard({
          icon: "🪦",
          eyebrow: "2025 Unluckiest",
          team: unluckiest?.team || "—",
          value: unluckiest ? formatSigned(unluckiest.luck) : "—",
          copy: "Wins below 2025 all-play expectation",
          tone: "is-history",
          season: "2025"
        })
      ].join("");
    }

    const historyAllPlayTable = document.getElementById("utiHistoryAllPlayTable");
    if (historyAllPlayTable) historyAllPlayTable.innerHTML = renderAllPlayChart(allPlay, "2025");

    const historyLuckTable = document.getElementById("utiHistoryLuckTable");
    if (historyLuckTable) historyLuckTable.innerHTML = renderLuckChart(luck, "2025");

    const historyPowerTable = document.getElementById("utiHistoryPowerTable");
    if (historyPowerTable) historyPowerTable.innerHTML = renderPowerChart(power, "2025");

    const historyCategoryTable = document.getElementById("utiHistoryCategoryTable");
    if (historyCategoryTable) historyCategoryTable.innerHTML = renderCategoryChart(yahoo2025Analytics, "2025");

    const franchiseTrendTable = document.getElementById("utiFranchiseTrendTable");
    if (franchiseTrendTable && latestAnalytics) {
      franchiseTrendTable.innerHTML = renderFranchiseTrend(latestAnalytics, yahoo2025Analytics);
    }
  }


  function renderHistoricalBoard2024() {
    if (!yahoo2024Analytics) return;

    const historyGrid = document.getElementById("utiHistory2024Grid");
    const historyRange = document.getElementById("utiHistory2024Range");
    const historyBadge = document.getElementById("utiHistory2024SeasonBadge");

    const weeks = yahoo2024Analytics.weeks || [];
    const allPlay = sortedAllPlayFor(yahoo2024Analytics);
    const power = yahoo2024Analytics.powerRankings || [];
    const luck = yahoo2024Analytics.luckIndex || [];

    if (historyRange && weeks.length) {
      const playoffRows = (yahoo2024AllRows || []).filter(row => historyPhase(row) === "playoffs");
      const playoffRounds = [...new Set(playoffRows.map(row => row.round).filter(Boolean))];
      historyRange.textContent = playoffRows.length
        ? `Reg Weeks ${weeks[0]}–${weeks[weeks.length - 1]} · Playoffs complete`
        : (weeks.length === 1 ? `Week ${weeks[0]}` : `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`);
    }

    if (historyBadge && weeks.length) {
      const hasPlayoffs = (yahoo2024AllRows || []).some(row => historyPhase(row) === "playoffs");
      historyBadge.textContent = hasPlayoffs
        ? `2024 Yahoo · Complete season`
        : (weeks.length === 1 ? `2024 Yahoo · Week ${weeks[0]}` : `2024 Yahoo · Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`);
    }

    if (historyGrid) {
      const leader = allPlay[0];
      const powerLeader = power[0];
      const luckiest = luck[0];
      const unluckiest = luck[luck.length - 1];

      historyGrid.innerHTML = [
        metricCard({
          icon: "🏛️",
          eyebrow: "2024 All-Play King",
          team: leader?.team || "—",
          value: leader ? formatRecord(leader) : "—",
          copy: leader ? `${formatPct(leader.winPct)} against the 2024 league` : "Waiting for data",
          tone: "is-history",
          season: "2024"
        }),
        metricCard({
          icon: "📼",
          eyebrow: "2024 Power #1",
          team: powerLeader?.team || "—",
          value: powerLeader ? `${(powerLeader.rating * 100).toFixed(1)} / 100` : "—",
          copy: "2024 all-play · categories · recent form",
          tone: "is-history",
          season: "2024"
        }),
        metricCard({
          icon: "🍀",
          eyebrow: "2024 Luckiest",
          team: luckiest?.team || "—",
          value: luckiest ? formatSigned(luckiest.luck) : "—",
          copy: "Wins above 2024 all-play expectation",
          tone: "is-history",
          season: "2024"
        }),
        metricCard({
          icon: "🪦",
          eyebrow: "2024 Unluckiest",
          team: unluckiest?.team || "—",
          value: unluckiest ? formatSigned(unluckiest.luck) : "—",
          copy: "Wins below 2024 all-play expectation",
          tone: "is-history",
          season: "2024"
        })
      ].join("");
    }

    const allPlayTable = document.getElementById("utiHistory2024AllPlayTable");
    if (allPlayTable) allPlayTable.innerHTML = renderAllPlayChart(allPlay, "2024");

    const luckTable = document.getElementById("utiHistory2024LuckTable");
    if (luckTable) luckTable.innerHTML = renderLuckChart(luck, "2024");

    const powerTable = document.getElementById("utiHistory2024PowerTable");
    if (powerTable) powerTable.innerHTML = renderPowerChart(power, "2024");

    const categoryTable = document.getElementById("utiHistory2024CategoryTable");
    if (categoryTable) categoryTable.innerHTML = renderCategoryChart(yahoo2024Analytics, "2024");
  }



  function historyPhase(row) {
    return String(row?.phase || row?.season_type || "regular").toLowerCase() === "playoffs"
      ? "playoffs"
      : "regular";
  }

  function trackedHistoryRows() {
    return [
      ...(yahoo2025AllRows || []),
      ...(yahoo2024AllRows || []),
      ...(latestAnalytics?.rows || []).map(row => ({
        ...row,
        phase: row.phase || "regular",
        round: row.round || ""
      }))
    ];
  }

  function recordFromRows(rows) {
    const record = { wins: 0, losses: 0, ties: 0, games: 0, points: 0, winPct: 0 };

    rows.forEach(row => {
      const outcome = matchupOutcome(row);
      if (!outcome) return;

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
    });

    record.winPct = record.games ? record.points / record.games : 0;
    return record;
  }

  function franchiseTeams() {
    return [...new Set(trackedHistoryRows().map(row => row.team).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  function franchiseRecord(team, opponent = null, season = null, phase = "all") {
    const rows = trackedHistoryRows().filter(row => {
      if (row.team !== team) return false;
      if (opponent && row.opponent !== opponent) return false;
      if (season && Number(row.season) !== Number(season)) return false;
      if (phase !== "all" && historyPhase(row) !== phase) return false;
      return true;
    });

    return recordFromRows(rows);
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

  function knownSeasonResults() {
    if (!Array.isArray(window.UTI_SEASON_RESULTS)) return [];

    return [...window.UTI_SEASON_RESULTS]
      .map(result => ({
        ...result,
        regularSeasonFirst: result.regularSeasonFirst || derivedRegularSeasonFirst(result.season)
      }))
      .sort((a, b) => Number(b.season) - Number(a.season));
  }

  const PLACEMENT_META = {
    champion: { icon: "🥇", label: "Championships", header: "Gold" },
    runnerUp: { icon: "🥈", label: "Runner-up finishes", header: "Silver" },
    thirdPlace: { icon: "🥉", label: "Third-place finishes", header: "Bronze" },
    regularSeasonFirst: { icon: "👑", label: "Regular-season No. 1 finishes", header: "Reg. #1" }
  };

  function placementAvailability(field) {
    return knownSeasonResults().filter(result => result?.[field]).length;
  }

  function placementCount(team, field) {
    return knownSeasonResults().filter(result => result?.[field] === team).length;
  }

  function placementDisplay(team, field) {
    if (!placementAvailability(field)) return "—";

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

  function ensurePlacementBadgeStyles() {
    if (document.getElementById("utiPlacementBadgeStyles")) return;

    const style = document.createElement("style");
    style.id = "utiPlacementBadgeStyles";
    style.textContent = `
      .uti-placement-count {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .uti-placement-icon-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        white-space: nowrap;
        line-height: 1;
      }

      .uti-placement-icon-count > span {
        font-size: 1.05rem;
      }

      .uti-placement-icon-count > strong {
        color: #0f172a;
        font-size: 0.68rem;
        font-weight: 800;
      }
    `;
    document.head.appendChild(style);
  }


  function renderFranchiseResume() {
    ensurePlacementBadgeStyles();
    const target = document.getElementById("utiFranchiseResumeTable");
    if (!target) return;

    const teams = franchiseTeams();
    const records = teams.map(team => {
      const overall = franchiseRecord(team);
      const regular = franchiseRecord(team, null, null, "regular");
      const playoffs = franchiseRecord(team, null, null, "playoffs");
      return { team, overall, regular, playoffs };
    }).sort((a, b) =>
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
              ${teamIdentity(row.team, false, "2026")}
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
    ensurePlacementBadgeStyles();
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

      const seasonRows = [...new Set(
        trackedHistoryRows()
          .filter(row => row.team === team && row.opponent === opponent)
          .map(row => Number(row.season))
          .filter(Number.isFinite)
      )].sort((a, b) => a - b);

      const splits = seasonRows.map(season => {
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

  function renderHistoryOverview() {
    if (!latestAnalytics || (!yahoo2025Analytics && !yahoo2024Analytics)) return;

    const target = document.getElementById("utiHistoryOverviewGrid");
    const currentBadge = document.getElementById("utiHistoryCurrentBadge");
    const historyBadge = document.getElementById("utiHistorySeasonBadge");
    const history2024Badge = document.getElementById("utiHistory2024SeasonBadge");

    const weeks2025 = yahoo2025Analytics?.weeks || [];
    const weeks2024 = yahoo2024Analytics?.weeks || [];
    const currentWeeks = latestAnalytics.weeks
      || [...new Set(latestAnalytics.rows.map(row => Number(row.week)))].filter(Number.isFinite).sort((a, b) => a - b);

    const allPlay2025 = sortedAllPlayFor(yahoo2025Analytics);
    const allPlay2024 = sortedAllPlayFor(yahoo2024Analytics);
    const riser = yahoo2025Analytics ? findBiggestPowerMover(latestAnalytics, yahoo2025Analytics) : null;

    if (history2024Badge && weeks2024.length) {
      const has2024Playoffs = (yahoo2024AllRows || []).some(row => historyPhase(row) === "playoffs");
      history2024Badge.textContent = has2024Playoffs
        ? `2024 Yahoo · Complete season`
        : (weeks2024.length === 1
          ? `2024 Yahoo · Week ${weeks2024[0]}`
          : `2024 Yahoo · Weeks ${weeks2024[0]}–${weeks2024[weeks2024.length - 1]}`);
    }

    if (historyBadge && weeks2025.length) {
      historyBadge.textContent = `2025 Yahoo · Weeks ${weeks2025[0]}–${weeks2025[weeks2025.length - 1]}`;
    }

    if (currentBadge && currentWeeks.length) {
      currentBadge.textContent = `2026 Fantrax · Weeks ${currentWeeks[0]}–${currentWeeks[currentWeeks.length - 1]}`;
    }

    if (!target) return;

    const trackedSeasons = [yahoo2024Analytics ? 2024 : null, yahoo2025Analytics ? 2025 : null, 2026].filter(Boolean);
    const historicalTeamWeeks = (yahoo2024AllRows?.length || yahoo2024Analytics?.rows?.length || 0)
      + (yahoo2025AllRows?.length || yahoo2025Analytics?.rows?.length || 0);
    const yahoo2024PlayoffTeamWeeks = (yahoo2024AllRows || []).filter(row => historyPhase(row) === "playoffs").length;
    const yahoo2025PlayoffTeamWeeks = (yahoo2025AllRows || []).filter(row => historyPhase(row) === "playoffs").length;

    target.innerHTML = `
      <article class="uti-history-overview-card">
        <span>Seasons Tracked</span>
        <strong>${trackedSeasons.length}</strong>
        <small>${trackedSeasons.join(" · ")}</small>
      </article>

      <article class="uti-history-overview-card">
        <span>Historical Team-Weeks</span>
        <strong>${historicalTeamWeeks}</strong>
        <small>${weeks2024.length ? `2024: ${weeks2024.length} reg weeks${yahoo2024PlayoffTeamWeeks ? " + playoffs" : ""}` : ""}${weeks2024.length && weeks2025.length ? " · " : ""}${weeks2025.length ? `2025: ${weeks2025.length} reg weeks${yahoo2025PlayoffTeamWeeks ? " + playoffs" : ""}` : ""}</small>
      </article>

      ${yahoo2024Analytics ? `
        <article class="uti-history-overview-card uti-team-profile-trigger" data-team-profile="${escapeHtml(allPlay2024[0]?.team || "—")}" data-profile-open-season="2024" role="button" tabindex="0">
          <span>2024 All-Play #1</span>
          <div class="uti-history-overview-team">
            <img src="${logoFor(allPlay2024[0]?.team || "")}" alt="">
            <strong>${escapeHtml(allPlay2024[0]?.team || "—")}</strong>
          </div>
          <small>${allPlay2024[0] ? `${formatPct(allPlay2024[0].winPct)} vs 2024 league` : "—"}</small>
        </article>
      ` : ""}

      ${yahoo2025Analytics ? `
        <article class="uti-history-overview-card uti-team-profile-trigger" data-team-profile="${escapeHtml(allPlay2025[0]?.team || "—")}" data-profile-open-season="2025" role="button" tabindex="0">
          <span>2025 All-Play #1</span>
          <div class="uti-history-overview-team">
            <img src="${logoFor(allPlay2025[0]?.team || "")}" alt="">
            <strong>${escapeHtml(allPlay2025[0]?.team || "—")}</strong>
          </div>
          <small>${allPlay2025[0] ? `${formatPct(allPlay2025[0].winPct)} vs 2025 league` : "—"}</small>
        </article>
      ` : ""}

      ${riser ? `
        <article class="uti-history-overview-card uti-team-profile-trigger" data-team-profile="${escapeHtml(riser.team)}" data-profile-open-season="2026" role="button" tabindex="0">
          <span>Biggest Power Riser</span>
          <div class="uti-history-overview-team">
            <img src="${logoFor(riser.team)}" alt="">
            <strong>${escapeHtml(riser.team)}</strong>
          </div>
          <small>${riser.delta >= 0 ? "+" : ""}${riser.delta.toFixed(1)} from 2025 → 2026</small>
        </article>
      ` : ""}
    `;
  }

  function renderHistoryTeaser() {
    if (!latestAnalytics || (!yahoo2025Analytics && !yahoo2024Analytics)) return;
    const target = document.getElementById("utiHistoryTeaserGrid");
    if (!target) return;

    const allPlay2025 = sortedAllPlayFor(yahoo2025Analytics);
    const power2025 = yahoo2025Analytics?.powerRankings || [];
    const allPlay2024 = sortedAllPlayFor(yahoo2024Analytics);
    const power2024 = yahoo2024Analytics?.powerRankings || [];
    const riser = yahoo2025Analytics ? findBiggestPowerMover(latestAnalytics, yahoo2025Analytics) : null;
    const weeks2025 = yahoo2025Analytics?.weeks || [];
    const weeks2024 = yahoo2024Analytics?.weeks || [];

    target.innerHTML = `
      ${yahoo2024Analytics ? `
        <article class="uti-history-teaser-card uti-team-profile-trigger" data-team-profile="${escapeHtml(allPlay2024[0]?.team || "—")}" data-profile-open-season="2024" role="button" tabindex="0">
          <span>2024 All-Play King</span>
          <div class="uti-history-teaser-team">
            <img src="${logoFor(allPlay2024[0]?.team || "")}" alt="">
            <strong>${escapeHtml(allPlay2024[0]?.team || "—")}</strong>
          </div>
          <small>${allPlay2024[0] ? `${formatPct(allPlay2024[0].winPct)} all-play · ${weeks2024.length} week${weeks2024.length === 1 ? "" : "s"} imported` : "—"}</small>
        </article>

        <article class="uti-history-teaser-card uti-team-profile-trigger" data-team-profile="${escapeHtml(power2024[0]?.team || "—")}" data-profile-open-season="2024" role="button" tabindex="0">
          <span>2024 Power #1</span>
          <div class="uti-history-teaser-team">
            <img src="${logoFor(power2024[0]?.team || "")}" alt="">
            <strong>${escapeHtml(power2024[0]?.team || "—")}</strong>
          </div>
          <small>${power2024[0] ? `${(power2024[0].rating * 100).toFixed(1)} / 100` : "—"}</small>
        </article>
      ` : ""}

      ${yahoo2025Analytics ? `
        <article class="uti-history-teaser-card uti-team-profile-trigger" data-team-profile="${escapeHtml(allPlay2025[0]?.team || "—")}" data-profile-open-season="2025" role="button" tabindex="0">
          <span>2025 All-Play King</span>
          <div class="uti-history-teaser-team">
            <img src="${logoFor(allPlay2025[0]?.team || "")}" alt="">
            <strong>${escapeHtml(allPlay2025[0]?.team || "—")}</strong>
          </div>
          <small>${allPlay2025[0] ? `${formatPct(allPlay2025[0].winPct)} all-play` : "—"}</small>
        </article>

        <article class="uti-history-teaser-card uti-team-profile-trigger" data-team-profile="${escapeHtml(power2025[0]?.team || "—")}" data-profile-open-season="2025" role="button" tabindex="0">
          <span>2025 Power #1</span>
          <div class="uti-history-teaser-team">
            <img src="${logoFor(power2025[0]?.team || "")}" alt="">
            <strong>${escapeHtml(power2025[0]?.team || "—")}</strong>
          </div>
          <small>${power2025[0] ? `${(power2025[0].rating * 100).toFixed(1)} / 100` : "—"}</small>
        </article>
      ` : ""}

      ${riser ? `
        <article class="uti-history-teaser-card uti-team-profile-trigger" data-team-profile="${escapeHtml(riser.team || "—")}" data-profile-open-season="2026" role="button" tabindex="0">
          <span>Biggest 2025 → 2026 Riser</span>
          <div class="uti-history-teaser-team">
            <img src="${logoFor(riser.team || "")}" alt="">
            <strong>${escapeHtml(riser.team || "—")}</strong>
          </div>
          <small>${riser ? `${riser.delta >= 0 ? "+" : ""}${riser.delta.toFixed(1)} Power` : "—"}</small>
        </article>
      ` : ""}

      <a class="uti-history-teaser-card is-link" href="history.html">
        <span>Season Archive</span>
        <strong>${yahoo2024Analytics && yahoo2025Analytics ? "2024 + 2025 Yahoo" : yahoo2024Analytics ? "2024 Yahoo" : "2025 Yahoo"}</strong>
        <small>${[
          weeks2024.length ? `2024 Weeks ${weeks2024[0]}–${weeks2024[weeks2024.length - 1]}` : "",
          weeks2025.length ? `2025 Weeks ${weeks2025[0]}–${weeks2025[weeks2025.length - 1]}` : ""
        ].filter(Boolean).join(" · ")} · Open history →</small>
      </a>
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
      const outcome = matchupOutcome(row);
      if (!outcome) return;

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
        const outcome = matchupOutcome(row);
        if (outcome === "win") recentPoints += 1;
        else if (outcome === "tie") recentPoints += 0.5;
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
    if (String(season) === "2024") return yahoo2024Analytics;
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
      const outcome = matchupOutcome(row);
      const result = outcome === "win" ? "W" : outcome === "loss" ? "L" : "T";
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

    const profileSeasonButtons = [
      { season: "2026", label: "Fantrax", weeks: latestAnalytics?.weeks?.length || 0 },
      ...(yahoo2025Analytics ? [{ season: "2025", label: "Yahoo", weeks: yahoo2025Analytics?.weeks?.length || 0 }] : []),
      ...(yahoo2024Analytics ? [{ season: "2024", label: "Yahoo", weeks: yahoo2024Analytics?.weeks?.length || 0 }] : [])
    ];

    const seasonTabs = `
      <div class="uti-profile-season-tabs" aria-label="Team profile season">
        ${profileSeasonButtons.map(button => `
          <button type="button" class="${activeProfileSeason === button.season ? "is-active" : ""}" data-profile-season="${button.season}">
            <strong>${button.season}</strong><span>${button.label} · ${button.weeks} weeks</span>
          </button>
        `).join("")}
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
          <strong>${profile.season} Yahoo scoring</strong>
          <span>This season is calculated with its own Yahoo categories, including BSV and SV+H, so it is not mixed directly into the 2026 Fantrax category ratings.</span>
        </div>
      ` : ""}

      <div class="uti-profile-stat-grid">
        <article>
          <span>All-Play</span>
          <strong>${formatRecord(profile.allPlayRecord)}</strong>
          <small>${formatPct(profile.allPlayPct)} vs league</small>
        </article>
        <article class="${profile.source === "yahoo" ? "uti-profile-record-card" : ""}">
          <span>${profile.source === "yahoo" ? `${profile.season} Record` : "Actual Record"}</span>
          ${profile.source === "yahoo" ? (() => {
            const yahooSeason = Number(profile.season);
            const overallRecord = franchiseRecord(team, null, yahooSeason, "all");
            const regularRecord = franchiseRecord(team, null, yahooSeason, "regular");
            const playoffRecord = franchiseRecord(team, null, yahooSeason, "playoffs");

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
          })() : `
            <strong>${formatRecord(profile.officialRecord)}</strong>
            <small>${Number(profile.officialRecord.winPct || 0) ? formatPct(profile.officialRecord.winPct) : "Tracked weeks"}</small>
          `}
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
    if (!element.hasAttribute("data-profile-open-season")) {
      element.setAttribute(
        "data-profile-open-season",
        document.body.classList.contains("uti-history-page-body") ? "2025" : "2026"
      );
    }
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
        const season = trigger.getAttribute("data-profile-open-season")
          || (document.body.classList.contains("uti-history-page-body") ? "2025" : "2026");
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

  async function renderUTIIntelligence() {
    const grid = document.getElementById("utiIntelligenceGrid");
    const range = document.getElementById("utiIntelligenceRange");
    const section = document.getElementById("uti-intelligence");
    const mode = section?.dataset?.utiMode || (grid ? "full" : "history");
    const isPreview = mode === "preview";

    const needsCurrentBoard = Boolean(grid);
    const needsHistoryBoard = Boolean(document.getElementById("utiHistoryGrid") || document.getElementById("utiHistory2024Grid"));
    const needsHistoryTeaser = Boolean(document.getElementById("utiHistoryTeaserGrid"));
    const needsHistoryOverview = Boolean(document.getElementById("utiHistoryOverviewGrid"));
    const needsHistoryRecords = Boolean(
      document.getElementById("utiFranchiseResumeTable") ||
      document.getElementById("utiHeadToHeadGrid")
    );

    if (!window.UTIAnalytics) return;
    if (!needsCurrentBoard && !needsHistoryBoard && !needsHistoryTeaser && !needsHistoryOverview && !needsHistoryRecords) return;

    try {
      const data = await window.UTIAnalytics.load("data/weekly-team-stats.csv");
      data.season = 2026;
      data.source = "fantrax";
      data.hittingCategories = HITTING_CATEGORIES;
      data.pitchingCategories = PITCHING_CATEGORIES;
      data.weeks = [...new Set(data.rows.map(row => Number(row.week)))]
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      latestAnalytics = data;

      // Team profiles on the homepage also expose the 2025 tab, so load Yahoo
      // history even when the homepage Intelligence section is in preview mode.
      const needsYahoo = needsCurrentBoard || !isPreview || needsHistoryBoard || needsHistoryTeaser || needsHistoryOverview || needsHistoryRecords;

      if (needsYahoo) {
        try {
          const yahooRows = await loadScriptOnce(
            "data/history/2025-yahoo-weekly-team-stats.js",
            "UTI_YAHOO_2025_WEEKLY_TEAM_STATS"
          );

          if (Array.isArray(yahooRows) && yahooRows.length) {
            yahoo2025AllRows = yahooRows.map(row => ({
              ...row,
              phase: row.phase || "regular",
              round: row.round || ""
            }));

            const yahooRegularSeasonRows = yahoo2025AllRows.filter(row => historyPhase(row) === "regular");

            yahoo2025Analytics = buildGenericSeasonAnalytics(yahooRegularSeasonRows, {
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

        try {
          const yahoo2024Rows = await loadScriptOnce(
            "data/history/2024-yahoo-weekly-team-stats.js",
            "UTI_YAHOO_2024_WEEKLY_TEAM_STATS"
          );

          if (Array.isArray(yahoo2024Rows) && yahoo2024Rows.length) {
            yahoo2024AllRows = yahoo2024Rows.map(row => ({
              ...row,
              phase: row.phase || "regular",
              round: row.round || ""
            }));

            const yahoo2024RegularSeasonRows = yahoo2024AllRows.filter(row => historyPhase(row) === "regular");

            yahoo2024Analytics = buildGenericSeasonAnalytics(yahoo2024RegularSeasonRows, {
              categories: [...YAHOO_2025_HITTING_CATEGORIES, ...YAHOO_2025_PITCHING_CATEGORIES],
              rules: YAHOO_2025_RULES,
              hittingCategories: YAHOO_2025_HITTING_CATEGORIES,
              pitchingCategories: YAHOO_2025_PITCHING_CATEGORIES,
              season: 2024,
              source: "yahoo"
            });
          }
        } catch (history2024Error) {
          console.warn("2024 Yahoo history could not be loaded:", history2024Error);
        }
      }

      ensureProfileModal();

      const weeks = data.weeks;

      if (range && weeks.length) {
        range.textContent = weeks.length === 1
          ? `Week ${weeks[0]} sample`
          : `Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
      }

      const currentSeasonBadge = document.getElementById("utiCurrentSeasonBadge");
      if (currentSeasonBadge && weeks.length) {
        currentSeasonBadge.textContent = `2026 Fantrax · Weeks ${weeks[0]}–${weeks[weeks.length - 1]}`;
      }

      const allPlay = sortedAllPlayFor(data);

      if (grid) {
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
              <strong>Want the full nerd report?</strong>
              <span>Current All-Play standings, Luck Index, Power Rankings, Category Kings, and team profiles.</span>
            </div>
            <a class="uti-intelligence-page-link" href="uti-intelligence.html">
              Open UTI Intelligence <span aria-hidden="true">→</span>
            </a>
          `;
          grid.insertAdjacentElement("afterend", previewCta);
        }

        const allPlayTable = document.getElementById("utiAllPlayTable");
        if (allPlayTable) allPlayTable.innerHTML = renderAllPlayChart(allPlay);

        const luckTable = document.getElementById("utiLuckTable");
        if (luckTable) luckTable.innerHTML = renderLuckChart(data.luckIndex);

        const powerTable = document.getElementById("utiPowerTable");
        if (powerTable) powerTable.innerHTML = renderPowerChart(data.powerRankings);

        const categoryTable = document.getElementById("utiCategoryTable");
        if (categoryTable) categoryTable.innerHTML = renderCategoryChart(data);
      }

      if (yahoo2025Analytics) {
        if (needsHistoryBoard) renderHistoricalBoard();
      }

      if (yahoo2024Analytics && needsHistoryBoard) {
        renderHistoricalBoard2024();
      }

      if ((yahoo2025Analytics || yahoo2024Analytics) && needsHistoryOverview) {
        renderHistoryOverview();
      }

      if (yahoo2025Analytics || yahoo2024Analytics) {
        if (needsHistoryTeaser) renderHistoryTeaser();
        if (needsHistoryRecords) renderHistoryRecordSections();
      }

    } catch (error) {
      console.error("UTI Intelligence failed to load:", error);

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