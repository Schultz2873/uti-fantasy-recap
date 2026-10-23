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
    { label: "Recaps", href: "index.html#featured-recap", matches: /\/2026\/week\d+\.html$/ },
    { label: "Intelligence", href: "uti-intelligence.html" },
    { label: "History", href: "history.html" },
    { label: "HR Pool", href: "tools/home-run-pool.html" },
    { label: "Trade Analyzer", href: "tools/uti-trade-analyzer.html" },
    { label: "Top 100", href: "tools/mlb-top-100.html" }
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
    { src: "data/prize-money.js", isLoaded: () => Boolean(window.PRIZE_MONEY_DATA) }
  ];

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

  function renderHeader() {
    const links = NAV_LINKS.map(link => {
      const current = isCurrentPage(link) ? ' aria-current="page"' : "";
      return `<a href="${siteUrl(link.href)}"${current}>${link.label}</a>`;
    }).join("");

    script.insertAdjacentHTML("beforebegin", `
      <header class="uti-header">
        <div class="uti-header-bar">
          <a class="uti-wordmark" href="${siteUrl("index.html")}">
            <b>UTI</b><span>Union of Ten Idiots</span>
          </a>
          <nav class="uti-header-nav" aria-label="Site">${links}</nav>
        </div>
        <div class="uti-ticker" id="utiTicker" aria-label="League ticker" hidden>
          <div class="uti-ticker-track" id="utiTickerTrack"></div>
        </div>
      </header>
    `);
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

  // One entry per matchup in the most recent week, winner first.
  function latestMatchups(rows) {
    const latestWeek = Math.max(...rows.map(row => Number(row.week)).filter(Number.isFinite));
    const weekRows = rows.filter(row => Number(row.week) === latestWeek);
    const seen = new Set();
    const matchups = [];

    weekRows.forEach(row => {
      const key = [row.team, row.opponent].sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);

      const scoreFor = Number(row.official_score_for);
      const scoreAgainst = Number(row.official_score_against);
      const [winner, loser] = scoreFor >= scoreAgainst
        ? [{ team: row.team, score: scoreFor }, { team: row.opponent, score: scoreAgainst }]
        : [{ team: row.opponent, score: scoreAgainst }, { team: row.team, score: scoreFor }];
      matchups.push({ winner, loser });
    });

    return { label: weekRows[0]?.round || `Week ${latestWeek}`, matchups };
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

  function renderTicker() {
    const rows = window.UTI_WEEKLY_TEAM_STATS || [];
    if (!rows.length || !window.UTIAnalytics) return;

    const { label, matchups } = latestMatchups(rows);
    const summary = window.UTIAnalytics.buildSummary(rows);
    const power = summary.powerRankings[0];
    const luckiest = summary.luckIndex[0];
    const unluckiest = summary.luckIndex[summary.luckIndex.length - 1];
    const prizePool = prizePoolTotal(window.PRIZE_MONEY_DATA || {});

    const items = [
      `<span class="uti-ticker-live">${escapeHtml(label)}</span>`,
      ...matchups.map(({ winner, loser }) =>
        `<span class="uti-ticker-item"><b>${escapeHtml(shortName(winner.team))} ${winner.score}</b> · ${escapeHtml(shortName(loser.team))} ${loser.score}</span>`
      ),
      power ? tickerItem("Power #1", `${shortName(power.team)} ${(power.rating * 100).toFixed(1)}`) : "",
      luckiest ? tickerItem("Luckiest", `${shortName(luckiest.team)} +${luckiest.luck.toFixed(2)}`) : "",
      unluckiest ? tickerItem("Unluckiest", `${shortName(unluckiest.team)} ${unluckiest.luck.toFixed(2)}`) : "",
      prizePool !== null ? tickerItem("Prize pool", `$${prizePool.toLocaleString("en-US")}`) : ""
    ].filter(Boolean);

    document.getElementById("utiTickerTrack").innerHTML = items.join('<span class="uti-ticker-sep" aria-hidden="true">/</span>');
    document.getElementById("utiTicker").hidden = false;
  }

  renderHeader();

  document.addEventListener("DOMContentLoaded", () => {
    loadMissingData()
      .then(renderTicker)
      .catch(error => console.warn("League ticker could not load.", error));
  });
})();
