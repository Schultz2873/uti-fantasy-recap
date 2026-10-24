/*
  Homepage: latest recap hero, latest-result scoreboard, standings, latest recaps, and the
  season-aware prize pool card.

  Reads data/recaps.js, data/weekly-team-stats.js (via league-analytics.js),
  data/prize-money.js, and data/team-logos.js, so the page updates when those files do.
  Team names carry data-team-profile, so clicking one opens the team profile from uti-intelligence.js.
*/
(() => {
  const HITTING_CATEGORIES = ["R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB"];
  const PITCHING_CATEGORIES = ["W", "L", "QS", "NS", "K", "ERA", "WHIP", "BAA"];
  const LATEST_RECAPS_SHOWN = 3;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const formatRecord = record => `${record.wins}-${record.losses}-${record.ties}`;

  function teamPhoto(team, className = "ui-team-photo") {
    const src = window.TEAM_LOGOS?.[team];
    if (src) return `<img class="${className}" src="${escapeHtml(src)}" alt="" loading="lazy">`;
    const initials = String(team).split(/\s+/).slice(0, 2).map(word => word[0]).join("");
    return `<span class="${className} ui-team-initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  // Team name that opens the team profile modal.
  function teamLink(team) {
    return `<span class="ui-team-link" data-team-profile="${escapeHtml(team)}" data-profile-open-season="2026" role="button" tabindex="0">${escapeHtml(team)}</span>`;
  }

  /* ---------- Hero: newest recap ---------- */

  function renderHero(recap) {
    const target = document.getElementById("homeHeroCopy");
    if (!target || !recap) return;

    target.innerHTML = `
      <span class="ui-kicker">${escapeHtml(recap.label)}</span>
      <h1>${escapeHtml(recap.title)}</h1>
      <p class="home-deck">${escapeHtml(recap.summary)}</p>
      <a class="home-button" href="${escapeHtml(recap.href)}">Read the recap <span aria-hidden="true">→</span></a>
    `;
  }

  /* ---------- Scoreboard: latest week ---------- */

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
    const matchups = window.UTIAnalytics.uniqueMatchups(weekRows);
    const round = matchups[0]?.round;

    const rowFor = team => weekRows.find(row => row.team === team) || {};
    const sideRow = (side, isWinner) => `
      <div class="home-score-row${isWinner ? " is-winner" : ""}">
        ${teamPhoto(side.team)}
        <span class="home-score-name">${teamLink(side.team)}</span>
        <strong class="home-score-total">${side.score}</strong>
      </div>`;

    target.innerHTML = `
      <span class="home-score-label">${escapeHtml(round || `Week ${latestWeek}`)} · Final</span>
      ${matchups.map(({ winner, loser, tie }) => {
        const winnerRow = rowFor(winner.team);
        const loserRow = rowFor(loser.team);
        const hitting = `${categoryPoints(winnerRow, loserRow, HITTING_CATEGORIES)}–${categoryPoints(loserRow, winnerRow, HITTING_CATEGORIES)}`;
        const pitching = `${categoryPoints(winnerRow, loserRow, PITCHING_CATEGORIES)}–${categoryPoints(loserRow, winnerRow, PITCHING_CATEGORIES)}`;
        return `
          <div class="home-score-matchup">
            ${sideRow(winner, !tie)}
            ${sideRow(loser, false)}
            <span class="home-score-note">Hitting ${hitting} · Pitching ${pitching}</span>
          </div>`;
      }).join("")}
    `;
  }

  /* ---------- Standings ---------- */

  function streakBadge(run) {
    if (!run?.type) return "";
    const tone = run.type === "W" ? " is-win" : run.type === "L" ? " is-loss" : "";
    const label = { W: "win", L: "loss", T: "tie" }[run.type];
    return `<span class="ui-streak${tone}" title="${run.length}-game ${label} streak">${run.type}${run.length}</span>`;
  }

  function renderStandings(summary) {
    const target = document.getElementById("standingsBody");
    if (!target) return;

    // Streaks count every matchup, playoffs included.
    const streaks = window.UTIAnalytics.teamStreaks(summary.allRows);

    target.innerHTML = summary.powerRankings.map((row, index) => {
      const record = summary.officialRecords[row.team];
      return `
        <tr>
          <td class="home-rank">${index + 1}</td>
          <td class="home-team-cell"><span class="ui-team">${teamPhoto(row.team, "ui-team-photo is-medium")}${teamLink(row.team)}</span></td>
          <td>${record ? formatRecord(record) : "—"}</td>
          <td>${streakBadge(streaks[row.team]?.current)}</td>
        </tr>`;
    }).join("");
  }

  /* ---------- Latest recaps ---------- */

  function renderLatestRecaps(recaps) {
    const target = document.getElementById("latestRecaps");
    if (!target) return;

    target.innerHTML = recaps.slice(1, 1 + LATEST_RECAPS_SHOWN).map(recap => `
      <li>
        <a class="ui-link-row is-recap" href="${escapeHtml(recap.href)}">
          <span class="home-recap-week">Wk ${recap.week}</span>
          <span>${escapeHtml(recap.title)}</span>
        </a>
      </li>
    `).join("");

    const allLink = document.getElementById("allRecapsLink");
    if (allLink) allLink.firstChild.textContent = `All ${recaps.length} `;
  }

  /* ---------- Prize pool card: shown during the season ---------- */

  // "auto" shows the card from March 1 until the championship has been played.
  // Override with homepageCard: "show" or "hide" in data/prize-money.js.
  function isPrizeSeason(rows, setting = "auto") {
    if (setting === "show") return true;
    if (setting === "hide") return false;

    const championshipPlayed = rows.some(row => /championship/i.test(row.round || ""));
    const month = new Date().getMonth(); // 0 = January
    const inMarchThroughAugust = month >= 2 && month <= 7;
    return !championshipPlayed || inMarchThroughAugust;
  }

  function renderRecordBookLink(rows) {
    const link = document.getElementById("recordBookLink");
    if (!link) return;

    const blowout = [...window.UTIAnalytics.uniqueMatchups(rows)].sort((a, b) => b.margin - a.margin)[0];
    if (!blowout) return;

    link.innerHTML = `
      <span>Record Book<small>Biggest blowout: ${escapeHtml(blowout.winner.team)} over ${escapeHtml(blowout.loser.team)}</small></span>
      <b>${blowout.winner.score}–${blowout.loser.score} <span aria-hidden="true">→</span></b>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const recaps = Array.isArray(window.UTI_RECAPS) ? window.UTI_RECAPS : [];
    renderHero(recaps[0]);
    renderLatestRecaps(recaps);

    const rows = window.UTI_WEEKLY_TEAM_STATS;
    if (!Array.isArray(rows) || !rows.length || !window.UTIAnalytics) return;

    const summary = window.UTIAnalytics.buildSummary(rows);
    renderScoreboard(rows);
    renderStandings(summary);
    renderRecordBookLink(rows);

    const prizeCard = document.getElementById("league-money");
    if (prizeCard) prizeCard.hidden = !isPrizeSeason(rows, window.PRIZE_MONEY_DATA?.homepageCard);
  });
})();
