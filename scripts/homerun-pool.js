const HOME_RUN_POOL_REFRESH_MS = 30 * 60 * 1000;

function normalizeHomeRunPoolName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/\s+jr$/i, " jr")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function getCurrentSeason() {
  return new Date().getFullYear();
}

async function fetchMlbSeasonHomeRuns() {
  const season = getCurrentSeason();
  const url =
    `https://statsapi.mlb.com/api/v1/stats` +
    `?stats=season` +
    `&group=hitting` +
    `&playerPool=all` +
    `&sportIds=1` +
    `&gameType=R` +
    `&season=${season}` +
    `&limit=5000`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load MLB home run stats");
  }

  const data = await response.json();
  return data.stats?.[0]?.splits || [];
}

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

    const totalHomeRuns = players.reduce((sum, player) => sum + player.homeRuns, 0);

    return {
      fantasyTeam: team.fantasyTeam,
      totalHomeRuns,
      players
    };
  }).sort((a, b) => b.totalHomeRuns - a.totalHomeRuns || a.fantasyTeam.localeCompare(b.fantasyTeam));
}

function getHomeRunPoolLimit(grid) {
  const isPreviewGrid =
    grid.classList.contains("home-run-pool-grid-preview") ||
    Boolean(grid.closest(".home-run-pool-preview"));

  if (isPreviewGrid) {
    return Number(grid.dataset.limit || 3);
  }

  return Number(grid.dataset.limit || 0);
}

function renderHomeRunPoolGrid(grid, standings) {
  const limit = getHomeRunPoolLimit(grid);
  const visibleStandings = limit > 0 ? standings.slice(0, limit) : standings;

  grid.innerHTML = visibleStandings.map((team, index) => `
    <article class="home-run-card ${index === 0 ? "home-run-card-leader" : ""}">
      <div class="home-run-card-top">
        <div>
          <div class="home-run-rank">#${index + 1}</div>
          <h3 class="home-run-team">${team.fantasyTeam}</h3>
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

function renderHomeRunPool(standings) {
  const grids = document.querySelectorAll("#homeRunPoolGrid, [data-home-run-pool-grid]");
  const updatedAt = document.getElementById("homeRunPoolUpdatedAt");

  if (!grids.length) return;

  grids.forEach(grid => renderHomeRunPoolGrid(grid, standings));

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
    const lookup = buildHomeRunLookup(splits);
    const standings = buildHomeRunPoolStandings(lookup);
    renderHomeRunPool(standings);
  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <article class="article-card">
        <p class="article-summary">Home Run Pool could not load right now.</p>
      </article>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadHomeRunPool();
  setInterval(loadHomeRunPool, HOME_RUN_POOL_REFRESH_MS);
});
