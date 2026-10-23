/*
  Homepage dashboard: latest-result scoreboard, stat strip, Power Rankings table, and Category Kings.
  Everything here is computed from data/weekly-team-stats.js (via league-analytics.js),
  data/prize-money.js, and data/team-logos.js, so it updates when those files do.

  Team names carry data-team-profile, so clicking one opens the team profile from uti-intelligence.js.
*/
(() => {
  const HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB"];
  const PITCHING_CATEGORIES = ["W", "L", "QS", "NS", "K", "ERA", "WHIP", "BAA"];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const formatPct = value => `${(Number(value || 0) * 100).toFixed(1)}%`;
  const formatRecord = record => `${record.wins}-${record.losses}-${record.ties}`;
  const formatSigned = value => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;

  function teamPhoto(team, className = "home-team-photo") {
    const src = window.TEAM_LOGOS?.[team];
    if (src) return `<img class="${className}" src="${escapeHtml(src)}" alt="" loading="lazy">`;
    const initials = String(team).split(/\s+/).slice(0, 2).map(word => word[0]).join("");
    return `<span class="${className} home-team-initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  // Team name that opens the team profile modal.
  function teamLink(team) {
    return `<span class="home-team-link" data-team-profile="${escapeHtml(team)}" data-profile-open-season="2026" role="button" tabindex="0">${escapeHtml(team)}</span>`;
  }

  // Category points for one side of a matchup (win = 1, tie = 0.5).
  function categoryPoints(row, opponentRow, categories) {
    const { CATEGORY_RULES } = window.UTIAnalytics;
    return categories.reduce((points, category) => {
      const mine = Number(row[category]);
      const theirs = Number(opponentRow[category]);
      if (!Number.isFinite(mine) || !Number.isFinite(theirs)) return points;
      if (mine === theirs) return points + 0.5;
      const lowerWins = CATEGORY_RULES[category] === "low";
      return points + ((lowerWins ? mine < theirs : mine > theirs) ? 1 : 0);
    }, 0);
  }

  function renderScoreboard(rows) {
    const target = document.getElementById("homeScoreboard");
    if (!target) return;

    const latestWeek = Math.max(...rows.map(row => Number(row.week)).filter(Number.isFinite));
    const weekRows = rows.filter(row => Number(row.week) === latestWeek);
    const round = weekRows[0]?.round;
    const isChampionship = /championship/i.test(round || "");
    const seen = new Set();

    const matchups = weekRows.filter(row => {
      const key = [row.team, row.opponent].sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(row => {
      const opponentRow = weekRows.find(other => other.team === row.opponent) || {};
      const sides = [[row, opponentRow], [opponentRow, row]].map(([side, other]) => ({
        team: side.team,
        score: Number(side.official_score_for),
        hitting: categoryPoints(side, other, HITTING_CATEGORIES),
        pitching: categoryPoints(side, other, PITCHING_CATEGORIES)
      }));
      return sides.sort((a, b) => b.score - a.score);
    });

    const sideRow = (side, isWinner) => `
      <div class="home-score-row${isWinner ? " is-winner" : ""}">
        ${teamPhoto(side.team)}
        <span class="home-score-team">
          <span class="home-score-name">${teamLink(side.team)}${isWinner && isChampionship ? ' <span class="home-chip">Champ</span>' : ""}</span>
          <span class="home-score-split">Hitting ${side.hitting} · Pitching ${side.pitching}</span>
        </span>
        <strong class="home-score-total">${side.score}</strong>
      </div>`;

    target.innerHTML = `
      <span class="home-label">${escapeHtml(round || `Week ${latestWeek}`)} · Final · 16 categories</span>
      ${matchups.map(([winner, loser]) => `
        <div class="home-score-matchup">
          ${sideRow(winner, winner.score > loser.score)}
          ${sideRow(loser, false)}
        </div>`).join("")}
    `;
  }

  function prizePoolTotal(data) {
    const isNumber = value => typeof value === "number" && Number.isFinite(value);
    if (isNumber(data.currentTotal)) return data.currentTotal;
    if (!isNumber(data.basePool) || !isNumber(data.waiverWireAdded)) return null;
    return data.basePool + data.waiverWireAdded + (isNumber(data.manualAdjustments) ? data.manualAdjustments : 0);
  }

  function renderStats(summary) {
    const target = document.getElementById("homeStats");
    if (!target) return;

    const allPlayKing = Object.entries(summary.allPlayRecords)
      .map(([team, record]) => ({ team, ...record }))
      .sort((a, b) => b.winPct - a.winPct || b.points - a.points)[0];
    const luckiest = summary.luckIndex[0];
    const unluckiest = summary.luckIndex[summary.luckIndex.length - 1];
    const prizePool = prizePoolTotal(window.PRIZE_MONEY_DATA || {});

    const tile = (label, value, valueClass, who, note) => `
      <div class="home-stat">
        <span class="home-label">${label}</span>
        <strong class="home-stat-value ${valueClass}">${value}</strong>
        ${who ? `<span class="home-stat-who">${teamPhoto(who, "home-team-photo is-small")}${teamLink(who)}</span>` : `<span class="home-stat-note">${note}</span>`}
      </div>`;

    target.innerHTML = [
      tile("Prize pool", prizePool === null ? "—" : `$${prizePool.toLocaleString("en-US")}`, "is-money", null, "Grows with waiver spending"),
      allPlayKing ? tile("All-Play king", formatRecord(allPlayKing), "", allPlayKing.team) : "",
      luckiest ? tile("Luckiest", formatSigned(luckiest.luck), "is-up", luckiest.team) : "",
      unluckiest ? tile("Unluckiest", formatSigned(unluckiest.luck), "is-down", unluckiest.team) : ""
    ].join("");
  }

  function renderPowerRankings(summary) {
    const target = document.getElementById("powerRankingsBody");
    if (!target) return;

    const luckByTeam = Object.fromEntries(summary.luckIndex.map(row => [row.team, row.luck]));

    target.innerHTML = summary.powerRankings.map((row, index) => {
      const record = summary.officialRecords[row.team];
      const allPlay = summary.allPlayRecords[row.team];
      const luck = luckByTeam[row.team] ?? 0;
      const rating = row.rating * 100;

      return `
        <tr>
          <td class="home-rank">${index + 1}</td>
          <td class="home-team-cell"><span class="home-team">${teamPhoto(row.team)}${teamLink(row.team)}</span></td>
          <td>${record ? formatRecord(record) : "—"}</td>
          <td>${allPlay ? formatRecord(allPlay) : "—"}<span class="home-sub">${allPlay ? formatPct(allPlay.winPct) : ""}</span></td>
          <td class="${luck >= 0 ? "is-up" : "is-down"}">${formatSigned(luck)}</td>
          <td>
            <span class="home-power">
              <span class="home-power-track"><span style="width:${rating.toFixed(1)}%"></span></span>
              <b>${rating.toFixed(1)}</b>
            </span>
          </td>
        </tr>`;
    }).join("");
  }

  function renderCategoryKings(summary) {
    const renderList = (targetId, categories) => {
      const target = document.getElementById(targetId);
      if (!target) return;

      target.innerHTML = categories.map(category => {
        const king = summary.categoryKings[category]?.[0];
        if (!king) return "";
        return `
          <div class="home-king">
            <span class="home-king-cat">${category}</span>
            <span class="home-king-team">${teamPhoto(king.team, "home-team-photo is-small")}${teamLink(king.team)}</span>
            <span class="home-king-pct">${formatPct(king.winPct)}</span>
          </div>`;
      }).join("");
    };

    renderList("homeKingsHitting", HITTING_CATEGORIES);
    renderList("homeKingsPitching", PITCHING_CATEGORIES);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const rows = window.UTI_WEEKLY_TEAM_STATS;
    if (!Array.isArray(rows) || !rows.length || !window.UTIAnalytics) return;

    const summary = window.UTIAnalytics.buildSummary(rows);
    renderScoreboard(rows);
    renderStats(summary);
    renderPowerRankings(summary);
    renderCategoryKings(summary);
  });
})();
