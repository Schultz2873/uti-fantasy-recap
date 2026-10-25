/*
  Homepage: latest recap hero, latest-result scoreboard, standings, latest recaps, and the
  season-aware prize pool card, swapped for the draft order in the offseason.

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

  // The championship result gets a gold spotlight on the champion instead of the plain scoreboard.
  function renderChampionSpotlight(target, { winner, loser }, hitting, pitching, season) {
    document.getElementById("featured-recap")?.classList.add("is-championship");
    // Confetti pieces; their colors, positions, and timing come from the CSS.
    const confetti = `<span class="home-confetti" aria-hidden="true">${"<i></i>".repeat(18)}</span>`;
    target.insertAdjacentHTML("beforebegin", confetti);

    target.innerHTML = `
      <div class="home-champ">
        <div class="home-champ-photo">
          ${teamPhoto(winner.team, "home-champ-img")}
          <span class="home-champ-trophy" aria-hidden="true">🏆</span>
        </div>
        <span class="home-champ-kicker">${season ? `${season} ` : ""}UTI Champions</span>
        <h2>${teamLink(winner.team)}</h2>
        <p class="home-champ-score"><strong>${winner.score}–${loser.score}</strong> over ${teamLink(loser.team)}</p>
        <span class="home-score-note">Hitting ${hitting} · Pitching ${pitching}</span>
      </div>`;
  }

  function renderScoreboard(rows, season) {
    const target = document.getElementById("homeScoreboard");
    if (!target) return;

    const latestWeek = Math.max(...rows.map(row => Number(row.week)).filter(Number.isFinite));
    const weekRows = rows.filter(row => Number(row.week) === latestWeek);
    const matchups = window.UTIAnalytics.uniqueMatchups(weekRows);
    const round = matchups[0]?.round;

    const rowFor = team => weekRows.find(row => row.team === team) || {};
    const scoreNotes = ({ winner, loser }) => {
      const winnerRow = rowFor(winner.team);
      const loserRow = rowFor(loser.team);
      return [
        `${categoryPoints(winnerRow, loserRow, HITTING_CATEGORIES)}–${categoryPoints(loserRow, winnerRow, HITTING_CATEGORIES)}`,
        `${categoryPoints(winnerRow, loserRow, PITCHING_CATEGORIES)}–${categoryPoints(loserRow, winnerRow, PITCHING_CATEGORIES)}`
      ];
    };

    if (/championship/i.test(round || "") && matchups.length === 1 && !matchups[0].tie) {
      renderChampionSpotlight(target, matchups[0], ...scoreNotes(matchups[0]), season);
      return;
    }

    const sideRow = (side, isWinner) => `
      <div class="home-score-row${isWinner ? " is-winner" : ""}">
        ${teamPhoto(side.team)}
        <span class="home-score-name">${teamLink(side.team)}</span>
        <strong class="home-score-total">${side.score}</strong>
      </div>`;

    target.innerHTML = `
      <span class="home-score-label">${escapeHtml(round || `Week ${latestWeek}`)} · Final</span>
      ${matchups.map(matchup => {
        const { winner, loser, tie } = matchup;
        const [hitting, pitching] = scoreNotes(matchup);
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

  /* ---------- Draft order card: shown in the offseason instead of the standings ---------- */

  function renderDraftOrder(draft) {
    const clock = document.getElementById("draftOnClock");
    const list = document.getElementById("draftOrderList");
    if (!clock || !list || !draft?.picks?.length) return false;

    const [onTheClock, onDeck, ...rest] = draft.picks;
    document.getElementById("draftTitle").textContent = `${draft.season} draft order`;

    clock.innerHTML = `
      ${teamPhoto(onTheClock, "home-clock-photo")}
      <div class="home-clock-copy">
        <span class="home-clock-live"><span class="home-clock-dot" aria-hidden="true"></span>Pick 1 · On the clock</span>
        <h3>${teamLink(onTheClock)} are on the clock</h3>
        ${onDeck ? `<p>On deck: ${escapeHtml(onDeck)}</p>` : ""}
      </div>
      <div class="home-clock-dates">
        <p class="home-countdown" id="draftDayCountdown" hidden></p>
        <p class="home-countdown" id="openingDayCountdown" hidden></p>
      </div>`;

    list.innerHTML = [onDeck, ...rest].filter(Boolean).map((team, index) => `
      <li>
        <span class="home-draft-pick">${index + 2}</span>
        <span class="ui-team">${teamPhoto(team, "ui-team-photo is-small")}${teamLink(team)}</span>
      </li>
    `).join("");
    return true;
  }

  // One row of the on-the-clock banner's date strip: a live countdown to `date` (YYYY-MM-DD),
  // "TBD" when no date is set, hidden once the day arrives.
  function renderCountdown(targetId, label, date) {
    const target = document.getElementById(targetId);
    if (!target) return;

    const start = date ? new Date(`${date}T00:00:00`) : null;
    if (!start || Number.isNaN(start.getTime())) {
      target.innerHTML = `<b>${escapeHtml(label)}</b><span class="home-countdown-time is-tbd">TBD</span>`;
      target.hidden = false;
      return;
    }

    const dateLabel = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const units = [["d", 86400], ["h", 3600], ["m", 60], ["s", 1]];

    const tick = () => {
      let left = Math.floor((start - Date.now()) / 1000);
      if (left <= 0) {
        target.hidden = true;
        clearInterval(timer);
        return;
      }
      const parts = units.map(([unit, seconds]) => {
        const value = Math.floor(left / seconds);
        left -= value * seconds;
        return `${unit === "d" ? value : String(value).padStart(2, "0")}${unit}`;
      });
      target.innerHTML = `<b>${escapeHtml(label)}</b><span>${escapeHtml(dateLabel)}</span><span class="home-countdown-time">${parts.join(" ")}</span>`;
      target.hidden = false;
    };

    const timer = setInterval(tick, 1000);
    tick();
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
    // The season comes from the newest recap's folder, e.g. "2026/week24.html".
    renderScoreboard(rows, recaps[0]?.href?.match(/^(\d{4})\//)?.[1]);
    renderStandings(summary);
    renderRecordBookLink(rows);

    // In season: standings and the prize pool. Offseason: the draft order takes the standings' spot.
    const inSeason = isPrizeSeason(rows, window.PRIZE_MONEY_DATA?.homepageCard);
    const prizeCard = document.getElementById("league-money");
    if (prizeCard) prizeCard.hidden = !inSeason;

    const showDraft = !inSeason && renderDraftOrder(window.UTI_DRAFT_ORDER);
    if (showDraft) {
      renderCountdown("openingDayCountdown", "Opening Day", window.UTI_DRAFT_ORDER.openingDay);
      renderCountdown("draftDayCountdown", "Draft Day", window.UTI_DRAFT_ORDER.draftDay);
    }
    const draftCard = document.getElementById("draft-order");
    const standingsCard = document.getElementById("standings");
    if (draftCard) draftCard.hidden = !showDraft;
    if (standingsCard) standingsCard.hidden = showDraft;
  });
})();
