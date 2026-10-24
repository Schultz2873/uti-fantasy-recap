/*
  Shared site header + league ticker for every page.

  Usage: put this as the first thing inside <body>, with the path adjusted for the page's folder:
    <script src="scripts/site-header.js"></script>        (root pages)
    <script src="../scripts/site-header.js"></script>     (tools/ and 2026/ pages)

  The nav renders immediately. The ticker fills in once the league data is available,
  loading data/weekly-team-stats.js, scripts/league-analytics.js, and data/prize-money.js
  only if the page has not already loaded them.
*/
(() => {
  const script = document.currentScript;
  const siteRoot = new URL("../", script.src);

  const NAV_LINKS = [
    { label: "Home", href: "index.html" },
    { label: "Recaps", href: "recaps.html", matches: /\/(recaps\.html|2026\/week\d+\.html)$/ },
    { label: "Standings", href: "uti-intelligence.html" },
    { label: "History", href: "history.html" },
    { label: "Record Book", href: "record-book.html" }
  ];

  // Grouped under one "Tools" menu.
  const TOOL_LINKS = [
    { label: "Home Run Pool", href: "tools/home-run-pool.html" },
    { label: "Trade Analyzer", href: "tools/uti-trade-analyzer.html" },
    { label: "MLB Top 100", href: "tools/mlb-top-100.html" }
  ];

  // Short names for the ticker.
  const TEAM_SHORT_NAMES = {
    "Goodyear Gila Monsters": "GILA",
    "Gunnarrhea": "GUNN",
    "This Is Mizerable": "MIZE",
    "This is Mizerable": "MIZE",
    "John's Super Team": "JOHN",
    "BB's Bold Team": "BB'S",
    "Dixon Cider": "DIXON",
    "Me So Heorny": "HEORNY",
    "You Don't Know Bo": "BO",
    "BTA Boyz": "BTA",
    "Mactown MacDaddies": "MACTOWN"
  };

  const DATA_SCRIPTS = [
    { src: "data/weekly-team-stats.js", isLoaded: () => Array.isArray(window.UTI_WEEKLY_TEAM_STATS) },
    { src: "scripts/league-analytics.js", isLoaded: () => Boolean(window.UTIAnalytics) },
    { src: "data/prize-money.js", isLoaded: () => Boolean(window.PRIZE_MONEY_DATA) },
    { src: "data/fantasy-owners.js", isLoaded: () => Boolean(window.FANTASY_OWNERS) }
  ];

  const TICKER_SPEED = 40; // pixels per second

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function siteUrl(path) {
    return new URL(path, siteRoot).href;
  }

  function isCurrentPage(link) {
    const current = location.pathname.replace(/\/$/, "/index.html");
    if (link.matches) return link.matches.test(current);
    return new URL(link.href, siteRoot).pathname === current;
  }

  function shortName(team) {
    return TEAM_SHORT_NAMES[team] || String(team || "").toUpperCase();
  }

  function navLink(link) {
    const current = isCurrentPage(link) ? ' aria-current="page"' : "";
    return `<a href="${siteUrl(link.href)}"${current}>${link.label}</a>`;
  }

  function renderHeader() {
    const onToolPage = TOOL_LINKS.some(isCurrentPage);

    script.insertAdjacentHTML("beforebegin", `
      <header class="uti-header">
        <div class="uti-header-bar">
          <a class="uti-wordmark" href="${siteUrl("index.html")}">
            <b>UTI</b><span>Union of Ten Idiots</span>
          </a>
          <nav class="uti-header-nav" aria-label="Site">
            ${NAV_LINKS.map(navLink).join("")}
            <details class="uti-nav-menu">
              <summary${onToolPage ? ' aria-current="page"' : ""}>Tools</summary>
              <div class="uti-nav-menu-list">${TOOL_LINKS.map(navLink).join("")}</div>
            </details>
          </nav>
        </div>
        <div class="uti-ticker" id="utiTicker" aria-label="League ticker" hidden>
          <div class="uti-ticker-track" id="utiTickerTrack"></div>
        </div>
      </header>
    `);

    // Close the Tools menu when clicking elsewhere or pressing Escape.
    const menu = script.previousElementSibling.querySelector(".uti-nav-menu");
    document.addEventListener("click", event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") menu.open = false;
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = siteUrl(src);
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.appendChild(tag);
    });
  }

  async function loadMissingData() {
    for (const { src, isLoaded } of DATA_SCRIPTS) {
      if (!isLoaded()) await loadScript(src);
    }
  }

  function scoreLine({ winner, loser }) {
    return `<b>${escapeHtml(shortName(winner.team))} ${winner.score}</b> · ${escapeHtml(shortName(loser.team))} ${loser.score}`;
  }

  function prizePoolTotal(data) {
    const isNumber = value => typeof value === "number" && Number.isFinite(value);
    if (isNumber(data.currentTotal)) return data.currentTotal;
    if (!isNumber(data.basePool) || !isNumber(data.waiverWireAdded)) return null;
    return data.basePool + data.waiverWireAdded + (isNumber(data.manualAdjustments) ? data.manualAdjustments : 0);
  }

  function tickerItem(label, value) {
    return `<span class="uti-ticker-item">${escapeHtml(label)} <b>${escapeHtml(value)}</b></span>`;
  }

  // The season the odds are for: next year once this year's championship has been played (September on).
  function oddsSeason(rows) {
    const now = new Date();
    const championshipPlayed = rows.some(row => /championship/i.test(row.round || ""));
    return now.getFullYear() + (championshipPlayed && now.getMonth() >= 8 ? 1 : 0);
  }

  function baseTickerItems(rows, summary) {
    const matchups = window.UTIAnalytics.uniqueMatchups(rows);
    const latestWeek = Math.max(...matchups.map(matchup => matchup.week));
    const latest = matchups.filter(matchup => matchup.week === latestWeek);
    const power = summary.powerRankings[0];
    const prizePool = prizePoolTotal(window.PRIZE_MONEY_DATA || {});

    return [
      `<span class="uti-ticker-live">${escapeHtml(latest[0]?.round || `Week ${latestWeek}`)}</span>`,
      ...latest.map(matchup => `<span class="uti-ticker-item">${scoreLine(matchup)}</span>`),
      power ? tickerItem("Power #1", shortName(power.team)) : "",
      prizePool !== null ? tickerItem("Prize pool", `$${prizePool.toLocaleString("en-US")}`) : ""
    ].filter(Boolean);
  }

  function oddsTickerItems(season, odds) {
    return [
      `<span class="uti-ticker-heading">${season} title odds</span>`,
      ...odds.map(({ team, odds: line }) => `<span class="uti-ticker-item">${escapeHtml(shortName(team))} <b>${escapeHtml(line)}</b></span>`)
    ];
  }

  // Two identical runs side by side; sliding the track left by one run loops seamlessly.
  function showTicker(items) {
    const ticker = document.getElementById("utiTicker");
    const track = document.getElementById("utiTickerTrack");
    const run = `<div class="uti-ticker-run">${items.join("")}</div>`;

    track.innerHTML = run + run.replace('class="uti-ticker-run"', 'class="uti-ticker-run" aria-hidden="true"');
    ticker.hidden = false;

    const runWidth = track.firstElementChild.getBoundingClientRect().width;
    track.style.setProperty("--ticker-duration", `${Math.max(20, runWidth / TICKER_SPEED)}s`);
  }

  async function renderTicker() {
    const rows = window.UTI_WEEKLY_TEAM_STATS || [];
    if (!rows.length || !window.UTIAnalytics) return;

    const summary = window.UTIAnalytics.buildSummary(rows);
    const items = baseTickerItems(rows, summary);
    showTicker(items);

    // Odds need the player value engine (an ES module), so they load after the rest of the ticker.
    try {
      const { titleOdds } = await import(siteUrl("scripts/title-odds.js"));
      showTicker([...items, ...oddsTickerItems(oddsSeason(rows), titleOdds(window.FANTASY_OWNERS, summary.powerRankings))]);
    } catch (error) {
      console.warn("Title odds could not load.", error);
    }
  }

  renderHeader();

  document.addEventListener("DOMContentLoaded", () => {
    loadMissingData()
      .then(renderTicker)
      .catch(error => console.warn("League ticker could not load.", error));
  });
})();
