// Renders the homepage All-Star section from data/all-stars.js.
(function renderAllStars() {
  const teams = Array.isArray(window.ALL_STAR_TEAMS) ? window.ALL_STAR_TEAMS : [];
  const container = document.getElementById("allStarTeamDropdowns");
  const totalEl = document.getElementById("allStarTotal");

  if (!container) return;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0);

  if (totalEl) {
    totalEl.textContent = totalPlayers;
  }

  container.innerHTML = teams.map((team) => {
    const owner = escapeHtml(team.owner);
    const count = team.players.length;

    const players = team.players.map((player) => {
      const starterTag = player.starter
        ? '<span class="allstar-starter-tag">Starter</span>'
        : "";

      return `
        <div class="allstar-player-card">
          <div class="allstar-name-row">
            <span class="allstar-compact-name">${escapeHtml(player.name)}</span>
            ${starterTag}
          </div>
          <span class="allstar-compact-meta">${escapeHtml(player.league)} · ${escapeHtml(player.team)} · ${escapeHtml(player.position)}</span>
          <span class="allstar-compact-owner">${owner}</span>
        </div>`;
    }).join("");

    return `
      <details class="allstar-team-dropdown">
        <summary>
          <span class="allstar-team-summary-main">
            <span class="allstar-team-thumb-slot" data-owner="${owner}"></span>
            <span class="allstar-team-summary-name">${owner}</span>
          </span>
          <span class="allstar-team-summary-count">${count} All-Stars</span>
        </summary>
        <div class="allstar-team-player-grid">
          ${players}
        </div>
      </details>`;
  }).join("");
})();
