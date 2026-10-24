/*
  Shared site header + league ticker for every page.

  Usage: put this as the first thing inside <body>, with the path adjusted for the page's folder:
    <script src="scripts/site-header.js"></script>        (root pages)
    <script src="../scripts/site-header.js"></script>     (tools/ and 2026/ pages)

  The nav renders immediately. The ticker (next season's title odds) fills in once the data it
  needs is available, loading any of DATA_SCRIPTS the page has not already loaded.
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

  const DATA_SCRIPTS = [
    { src: "data/weekly-team-stats.js", isLoaded: () => Array.isArray(window.UTI_WEEKLY_TEAM_STATS) },
    { src: "scripts/league-analytics.js", isLoaded: () => Boolean(window.UTIAnalytics) },
    { src: "data/fantasy-owners.js", isLoaded: () => Boolean(window.FANTASY_OWNERS) },
    { src: "data/player-values.js", isLoaded: () => Array.isArray(window.UTI_PLAYER_VALUES) },
    { src: "scripts/title-odds.js", isLoaded: () => Boolean(window.UTITitleOdds) }
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
      </header>
      <div class="uti-ticker" id="utiTicker" aria-label="Championship odds" hidden>
        <span class="uti-ticker-heading" id="utiTickerHeading"></span>
        <div class="uti-ticker-window">
          <div class="uti-ticker-track" id="utiTickerTrack"></div>
        </div>
      </div>
    `);

    // Close the Tools menu when clicking elsewhere or pressing Escape.
    const menu = document.querySelector(".uti-header .uti-nav-menu");
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

  // The season the odds are for: next year once this year's championship has been played (September on).
  function oddsSeason(rows) {
    const now = new Date();
    const championshipPlayed = rows.some(row => /championship/i.test(row.round || ""));
    return now.getFullYear() + (championshipPlayed && now.getMonth() >= 8 ? 1 : 0);
  }

  function oddsTickerItems(odds) {
    return odds.map(({ team, odds: line }) => `<span class="uti-ticker-item">${escapeHtml(team)} <b>${escapeHtml(line)}</b></span>`);
  }

  // The heading stays put on the left; the items slide past it.
  // Two identical runs side by side; sliding the track left by one run loops seamlessly.
  function showTicker(heading, items) {
    const ticker = document.getElementById("utiTicker");
    const track = document.getElementById("utiTickerTrack");
    document.getElementById("utiTickerHeading").innerHTML = heading;
    const run = `<div class="uti-ticker-run">${items.join("")}</div>`;

    track.innerHTML = run + run.replace('class="uti-ticker-run"', 'class="uti-ticker-run" aria-hidden="true"');
    ticker.hidden = false;

    // The ticker stays pinned to the top; other sticky elements sit below it using --sticky-top.
    document.documentElement.style.setProperty("--sticky-top", `${ticker.offsetHeight}px`);

    const runWidth = track.firstElementChild.getBoundingClientRect().width;
    track.style.setProperty("--ticker-duration", `${Math.max(20, runWidth / TICKER_SPEED)}s`);
  }

  function renderTicker() {
    const rows = window.UTI_WEEKLY_TEAM_STATS || [];
    if (!rows.length || !window.UTIAnalytics) return;

    const summary = window.UTIAnalytics.buildSummary(rows);
    const odds = window.UTITitleOdds?.titleOdds(window.FANTASY_OWNERS, summary.powerRankings) || [];
    // "championship" is dropped on phones to leave room for the odds.
    if (odds.length) showTicker(`${oddsSeason(rows)} <span class="uti-ticker-heading-long">championship </span>odds`, oddsTickerItems(odds));
  }

  renderHeader();

  document.addEventListener("DOMContentLoaded", () => {
    loadMissingData()
      .then(renderTicker)
      .catch(error => console.warn("League ticker could not load.", error));
  });
})();
