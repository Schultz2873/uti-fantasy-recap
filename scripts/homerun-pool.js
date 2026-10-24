/*
  Home Run Pool standings (homepage preview and tools/home-run-pool.html).
  Totals each fantasy team's picks from data/homerun-pool.js using MLB season home runs.
  Once HOME_RUN_POOL_SETTINGS.final is true, it shows that season's final standings and champion.
*/
(() => {
  const HOME_RUN_POOL_REFRESH_MS = 30 * 60 * 1000;
  const POOL_SETTINGS = window.HOME_RUN_POOL_SETTINGS || {};
  const POOL_SEASON = POOL_SETTINGS.season || new Date().getFullYear();
  const POOL_IS_FINAL = Boolean(POOL_SETTINGS.final);

  function normalizeHomeRunPoolName(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[.'’]/g, "")
      .replace(/\s+jr$/i, " jr")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  }

  // Logo paths in data/team-logos.js are relative to the site root.
  function getHomeRunTeamLogo(teamName) {
    const logoPath = window.TEAM_LOGOS?.[teamName];

    if (!logoPath) {
      return "";
    }

    const isInToolsFolder = window.location.pathname.includes("/tools/");

    return isInToolsFolder && !logoPath.startsWith("../")
      ? `../${logoPath}`
      : logoPath;
  }

  async function fetchMlbSeasonHomeRuns() {
    const url =
      `https://statsapi.mlb.com/api/v1/stats` +
      `?stats=season` +
      `&group=hitting` +
      `&playerPool=all` +
      `&sportIds=1` +
      `&gameType=R` +
      `&season=${POOL_SEASON}` +
      `&limit=5000`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not load MLB home run stats");
    }

    const data = await response.json();
    return data.stats?.[0]?.splits || [];
  }

  // normalized player name -> { name, team, homeRuns }
  function buildHomeRunLookup(splits) {
    const lookup = new Map();

    splits.forEach(split => {
      const playerName = split.player?.fullName || "";
      const normalizedName = normalizeHomeRunPoolName(playerName);

      if (!normalizedName) return;

      lookup.set(normalizedName, {
        name: playerName,
        team: split.team?.name || "",
        homeRuns: Number(split.stat?.homeRuns || 0)
      });
    });

    return lookup;
  }

  function buildHomeRunPoolStandings(homeRunLookup) {
    return (window.HOME_RUN_POOL || []).map(team => {
      const players = (team.players || []).map(playerName => {
        const stats = homeRunLookup.get(normalizeHomeRunPoolName(playerName));

        return {
          name: playerName,
          mlbName: stats?.name || playerName,
          mlbTeam: stats?.team || "Not found",
          homeRuns: stats?.homeRuns ?? 0,
          found: Boolean(stats)
        };
      });

      return {
        fantasyTeam: team.fantasyTeam,
        logo: getHomeRunTeamLogo(team.fantasyTeam),
        totalHomeRuns: players.reduce((sum, player) => sum + player.homeRuns, 0),
        players
      };
    }).sort((a, b) => b.totalHomeRuns - a.totalHomeRuns || a.fantasyTeam.localeCompare(b.fantasyTeam));
  }

  // Preview grids show the top 3 unless data-limit says otherwise; full grids show everyone.
  function getHomeRunPoolLimit(grid) {
    const isPreviewGrid =
      grid.classList.contains("home-run-pool-grid-preview") ||
      Boolean(grid.closest(".home-run-pool-preview"));

    return Number(grid.dataset.limit || (isPreviewGrid ? 3 : 0));
  }

  // Homepage link row (data-variant="leader"): just the current leader (or champion) and total.
  function renderLeaderLine(standings) {
    const leader = standings[0];
    if (!leader) return `<span>Home Run Pool<small>Standings unavailable</small></span><b>View <span aria-hidden="true">→</span></b>`;
    if (POOL_IS_FINAL) {
      return `<span>Home Run Pool<small>${POOL_SEASON} champion: ${leader.fantasyTeam} · back in ${POOL_SEASON + 1}</small></span><b>${leader.totalHomeRuns} HR <span aria-hidden="true">→</span></b>`;
    }
    return `<span>Home Run Pool<small>Leader: ${leader.fantasyTeam}</small></span><b>${leader.totalHomeRuns} HR <span aria-hidden="true">→</span></b>`;
  }

  function renderHomeRunPoolGrid(grid, standings) {
    if (grid.dataset.variant === "leader") {
      grid.innerHTML = renderLeaderLine(standings);
      return;
    }

    const limit = getHomeRunPoolLimit(grid);
    const visibleStandings = limit > 0 ? standings.slice(0, limit) : standings;

    grid.innerHTML = visibleStandings.map((team, index) => `
      <article class="home-run-card ${index === 0 ? "home-run-card-leader" : ""}">
        <div class="home-run-card-top">
          <div>
            <div class="home-run-rank">#${index + 1}${POOL_IS_FINAL && index === 0 ? " · Champion" : ""}</div>
            <h3 class="home-run-team">
              ${team.logo ? `<img src="${team.logo}" alt="${team.fantasyTeam}" class="home-run-team-logo">` : ""}
              <span>${team.fantasyTeam}</span>
            </h3>
          </div>
          <div class="home-run-total">
            <strong>${team.totalHomeRuns}</strong>
            <span>HR</span>
          </div>
        </div>

        <div class="home-run-player-list">
          ${team.players.map(player => `
            <div class="home-run-player-row ${player.found ? "" : "home-run-player-missing"}">
              <div>
                <div class="home-run-player-name">${player.mlbName}</div>
                <div class="home-run-player-team">${player.mlbTeam}</div>
              </div>
              <div class="home-run-player-hr">${player.homeRuns}</div>
            </div>
          `).join("")}
        </div>
      </article>
    `).join("");
  }

  // Pool page headings once the season is over.
  function renderFinalHeadings(champion) {
    const title = document.getElementById("homeRunPoolTitle");
    const subtitle = document.getElementById("homeRunPoolSubtitle");
    if (title) title.textContent = `${POOL_SEASON} Final Standings`;
    if (subtitle && champion) {
      subtitle.textContent = `${champion.fantasyTeam} won the ${POOL_SEASON} pool with ${champion.totalHomeRuns} HR. A new pool starts in ${POOL_SEASON + 1}.`;
    }
  }

  function renderHomeRunPool(standings) {
    const grids = document.querySelectorAll("#homeRunPoolGrid, [data-home-run-pool-grid]");
    const updatedAt = document.getElementById("homeRunPoolUpdatedAt");

    if (!grids.length) return;

    grids.forEach(grid => renderHomeRunPoolGrid(grid, standings));

    if (POOL_IS_FINAL) {
      renderFinalHeadings(standings[0]);
      if (updatedAt) updatedAt.textContent = `Final · ${POOL_SEASON} season`;
      return;
    }

    if (updatedAt) {
      updatedAt.textContent = `Updated ${new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      })}`;
    }
  }

  async function loadHomeRunPool() {
    const grid = document.getElementById("homeRunPoolGrid");

    if (!grid) return;

    try {
      const splits = await fetchMlbSeasonHomeRuns();
      renderHomeRunPool(buildHomeRunPoolStandings(buildHomeRunLookup(splits)));
    } catch (error) {
      console.error(error);

      if (grid.dataset.variant === "leader") {
        grid.innerHTML = renderLeaderLine([]);
        return;
      }

      grid.innerHTML = `
        <article class="article-card">
          <p class="article-summary">Home Run Pool could not load right now.</p>
        </article>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadHomeRunPool();
    if (!POOL_IS_FINAL) setInterval(loadHomeRunPool, HOME_RUN_POOL_REFRESH_MS);
  });
})();
