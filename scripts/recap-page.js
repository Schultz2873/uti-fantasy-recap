/*
  Weekly recap pages (2026/week*.html): makes each recap quick to get through without changing the writing.

  - A scoreboard of every matchup goes right under the headline; each one jumps to its write-up.
  - Each matchup opens with the score, the one-line result, and the league takeaway.
    The full write-up folds away behind "Read the full breakdown".

  Reads the page's existing .matchup-card markup, so recaps are still written the same way.
  Team photos come from data/team-logos.js, which the page loads first.
*/
(() => {
  const siteRoot = new URL("../", document.currentScript.src);

  // Score pills spell teams loosely ("GILA", "BTA Boys", "The Big Gay John's Super Team").
  const TEAMS = [
    [/bb.?s bold/i, "BB's Bold Team"],
    [/bta/i, "BTA Boyz"],
    [/dixon/i, "Dixon Cider"],
    [/goodyear|gila/i, "Goodyear Gila Monsters"],
    [/gunnarrhea/i, "Gunnarrhea"],
    [/john/i, "John's Super Team"],
    [/mactown/i, "Mactown MacDaddies"],
    [/heorny/i, "Me So Heorny"],
    [/mizerable/i, "This is Mizerable"],
    [/know bo/i, "You Don't Know Bo"]
  ];

  const teamName = text => TEAMS.find(([pattern]) => pattern.test(text))?.[1] || text.trim();

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function teamPhoto(team) {
    const src = window.TEAM_LOGOS?.[team];
    if (src) return `<img class="rc-photo" src="${new URL(src, siteRoot).href}" alt="" loading="lazy">`;
    return `<span class="rc-photo" aria-hidden="true"></span>`;
  }

  // "Gunnarrhea 6.5 – 9.5 GILA" → two sides, or null when the pill doesn't read as a score.
  function parseScore(text) {
    const match = text.replace(/\s+/g, " ").trim().match(/^(.*?) (\d+(?:\.\d+)?) ?[–—-] ?(\d+(?:\.\d+)?) (.*)$/);
    if (!match) return null;
    const [, nameA, scoreA, scoreB, nameB] = match;
    const sides = [
      { team: teamName(nameA), score: Number(scoreA) },
      { team: teamName(nameB), score: Number(scoreB) }
    ];
    // Winner on top; ties keep the written order.
    return sides[1].score > sides[0].score ? sides.reverse() : sides;
  }

  function scoreRows(sides) {
    const tie = sides[0].score === sides[1].score;
    return sides.map((side, index) => `
      <span class="rc-side${index === 0 && !tie ? " is-winner" : ""}">
        ${teamPhoto(side.team)}
        <span class="rc-name">${escapeHtml(side.team)}</span>
        <b class="rc-score">${side.score}</b>
      </span>`).join("");
  }

  // Score, one-line result, and takeaway up top; everything else behind a toggle.
  function condenseCard(card, index) {
    const head = card.querySelector(".matchup-head");
    const pill = card.querySelector(".score-pill");
    const sides = pill && parseScore(pill.textContent);
    if (!head || !sides) return null;

    card.id = `matchup-${index + 1}`;
    const title = card.querySelector(".matchup-title");
    const winnerLine = card.querySelector(".winner-line");
    const takeaway = card.querySelector(".tone-box");

    const top = document.createElement("div");
    top.className = "rc-head";
    top.innerHTML = `<div class="rc-board">${scoreRows(sides)}</div>`;
    if (title) {
      title.classList.add("rc-visually-hidden");
      top.prepend(title);
    }
    if (winnerLine) top.append(winnerLine);

    const more = document.createElement("details");
    more.className = "rc-more";
    more.innerHTML = `<summary><span class="rc-more-open">Read the full breakdown</span><span class="rc-more-close">Hide the breakdown</span></summary>`;
    const body = document.createElement("div");
    body.className = "rc-more-body";
    [...card.children].filter(child => child !== head && child !== takeaway).forEach(child => body.append(child));
    more.append(body);

    head.remove();
    card.prepend(top);
    if (takeaway) card.append(takeaway);
    if (body.textContent.trim()) card.append(more);
    card.classList.add("is-condensed");
    return { id: card.id, sides };
  }

  function renderScoreboard(main, games) {
    const board = document.createElement("section");
    board.className = "section-card rc-scoreboard";
    board.innerHTML = `
      <div class="rc-scoreboard-head">
        <h2>Scores</h2>
        <button type="button" class="rc-open-all" aria-pressed="false">Open all write-ups</button>
      </div>
      <div class="rc-games">
        ${games.map(game => `<a class="rc-game" href="#${game.id}">${scoreRows(game.sides)}</a>`).join("")}
      </div>`;
    main.prepend(board);

    // Jumping to a matchup also opens its write-up.
    board.addEventListener("click", event => {
      const link = event.target.closest(".rc-game");
      if (link) document.querySelector(`${link.getAttribute("href")} .rc-more`)?.setAttribute("open", "");
    });

    const openAll = board.querySelector(".rc-open-all");
    openAll.addEventListener("click", () => {
      const open = openAll.getAttribute("aria-pressed") !== "true";
      document.querySelectorAll(".rc-more").forEach(more => { more.open = open; });
      openAll.setAttribute("aria-pressed", String(open));
      openAll.textContent = open ? "Close all write-ups" : "Open all write-ups";
    });
  }

  function start() {
    const main = document.querySelector(".main-column");
    if (!main) return;
    const games = [...main.querySelectorAll(".matchup-card")].map(condenseCard).filter(Boolean);
    if (games.length) renderScoreboard(main, games);
    document.body.classList.add("is-quick-recap");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
