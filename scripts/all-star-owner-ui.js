/* Render fantasy-team pictures and compact ownership ranking for All-Stars. */
(function () {
  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function initials(owner) {
    return String(owner || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?';
  }

  // Looks up the team's logo in data/team-logos.js, ignoring case and punctuation.
  function getFantasyTeamImage(owner) {
    const logos = window.TEAM_LOGOS || {};
    const target = normalize(owner);
    const match = Object.keys(logos).find(team => normalize(team) === target);
    return match ? logos[match] : '';
  }

  function createInitialsBadge(owner) {
    const fallback = document.createElement('span');
    fallback.className = 'allstar-owner-fallback';
    fallback.textContent = initials(owner);
    return fallback;
  }

  function createTeamPicture(owner) {
    const imageUrl = getFantasyTeamImage(owner);
    if (!imageUrl) return createInitialsBadge(owner);

    const img = document.createElement('img');
    img.className = 'allstar-owner-thumb';
    img.src = imageUrl;
    img.alt = `${owner} fantasy team`;
    img.loading = 'lazy';
    img.addEventListener('error', () => img.replaceWith(createInitialsBadge(owner)), { once: true });
    return img;
  }

  function createRankItem(owner, count, index) {
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
    return item;
  }

  function render() {
    // Add a team picture to each player card and count All-Stars per owner.
    const counts = new Map();
    document.querySelectorAll('#all-star-week .allstar-player-card').forEach(card => {
      const owner = card.querySelector('.allstar-compact-owner')?.textContent.trim();
      if (!owner || owner === 'Free Agent') return;
      counts.set(owner, (counts.get(owner) || 0) + 1);

      if (!card.querySelector('.allstar-owner-thumb, .allstar-owner-fallback')) {
        card.prepend(createTeamPicture(owner));
      }
    });

    document.querySelectorAll('.allstar-team-thumb-slot[data-owner]').forEach(slot => {
      slot.replaceChildren(createTeamPicture(slot.getAttribute('data-owner') || ''));
    });

    const ranking = document.getElementById('allStarOwnerRanking');
    if (!ranking) return;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    ranking.replaceChildren(...sorted.map(([owner, count], index) => createRankItem(owner, count, index)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  window.addEventListener('load', render, { once: true });
})();
