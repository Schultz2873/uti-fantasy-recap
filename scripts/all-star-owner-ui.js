/* Render fantasy-team pictures and compact ownership ranking for All-Stars. */
(function () {
  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function initials(owner) {
    return String(owner || '')
      .split(/\\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?';
  }

  function imageFromValue(value) {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    for (const key of ['logo', 'image', 'src', 'url', 'thumbnail', 'teamLogo', 'teamImage', 'icon', 'avatar']) {
      if (typeof value[key] === 'string' && value[key]) return value[key];
    }
    return '';
  }

  function findInSource(source, owner, depth) {
    if (!source || depth > 3) return '';
    const target = normalize(owner);
    if (Array.isArray(source)) {
      for (const item of source) {
        if (!item || typeof item !== 'object') continue;
        const itemName = item.name || item.team || item.teamName || item.owner || item.fantasyTeam || item.label;
        if (normalize(itemName) === target) {
          const direct = imageFromValue(item);
          if (direct) return direct;
        }
      }
      return '';
    }
    if (typeof source !== 'object') return '';

    for (const [key, value] of Object.entries(source)) {
      if (normalize(key) === target) {
        const direct = imageFromValue(value);
        if (direct) return direct;
      }
    }
    for (const value of Object.values(source)) {
      if (!value || typeof value !== 'object') continue;
      const candidateName = value.name || value.team || value.teamName || value.owner || value.fantasyTeam || value.label;
      if (normalize(candidateName) === target) {
        const direct = imageFromValue(value);
        if (direct) return direct;
      }
    }
    return '';
  }

  function getFantasyTeamImage(owner) {
    const namedSources = [
      window.TEAM_LOGOS, window.FANTASY_TEAM_LOGOS, window.FANTASY_TEAM_IMAGES,
      window.teamLogos, window.teamLogosByName, window.TEAM_LOGO_DATA,
      window.FANTASY_TEAMS, window.UTI_TEAMS, window.TEAM_DATA
    ];
    for (const source of namedSources) {
      const found = findInSource(source, owner, 0);
      if (found) return found;
    }

    // team-logos.js may use a different global variable name. Inspect only likely globals.
    for (const key of Object.keys(window)) {
      if (!/(team|logo|owner|fantasy)/i.test(key)) continue;
      let source;
      try { source = window[key]; } catch (_) { continue; }
      if (!source || typeof source !== 'object') continue;
      const found = findInSource(source, owner, 0);
      if (found) return found;
    }
    return '';
  }

  function createTeamPicture(owner) {
    const imageUrl = getFantasyTeamImage(owner);
    if (imageUrl) {
      const img = document.createElement('img');
      img.className = 'allstar-owner-thumb';
      img.src = imageUrl;
      img.alt = `${owner} fantasy team`;
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        const fallback = document.createElement('span');
        fallback.className = 'allstar-owner-fallback';
        fallback.textContent = initials(owner);
        img.replaceWith(fallback);
      }, { once: true });
      return img;
    }
    const fallback = document.createElement('span');
    fallback.className = 'allstar-owner-fallback';
    fallback.textContent = initials(owner);
    return fallback;
  }

  function render() {
    const counts = new Map();
    document.querySelectorAll('#all-star-week .allstar-player-card').forEach(card => {
      const ownerEl = card.querySelector('.allstar-compact-owner');
      if (!ownerEl) return;
      const owner = ownerEl.textContent.trim();
      if (!owner || owner === 'Free Agent') return;
      counts.set(owner, (counts.get(owner) || 0) + 1);

      if (!card.querySelector('.allstar-owner-thumb, .allstar-owner-fallback')) {
        card.prepend(createTeamPicture(owner));
      }
    });

    document.querySelectorAll('.allstar-team-thumb-slot[data-owner]').forEach(slot => {
      const owner = slot.getAttribute('data-owner') || '';
      slot.replaceChildren(createTeamPicture(owner));
    });

    const ranking = document.getElementById('allStarOwnerRanking');
    if (!ranking) return;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    ranking.innerHTML = '';
    sorted.forEach(([owner, count], index) => {
      const item = document.createElement('div');
      item.className = 'allstar-owner-rank-item';
      const number = document.createElement('span');
      number.className = 'allstar-owner-rank-number';
      number.textContent = `#${index + 1}`;
      const name = document.createElement('span');
      name.className = 'allstar-owner-rank-name';
      name.textContent = owner;
      const total = document.createElement('span');
      total.className = 'allstar-owner-rank-count';
      total.textContent = count;
      item.append(number, createTeamPicture(owner), name, total);
      ranking.appendChild(item);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  window.addEventListener('load', render, { once: true });
})();
