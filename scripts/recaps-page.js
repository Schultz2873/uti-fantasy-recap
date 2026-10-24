// Renders every recap from data/recaps.js on recaps.html, newest first.
(() => {
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const recaps = Array.isArray(window.UTI_RECAPS) ? window.UTI_RECAPS : [];
  const list = document.getElementById("recapList");
  const count = document.getElementById("recapCount");

  if (count) count.textContent = `${recaps.length} recaps · newest first`;
  if (!list) return;

  list.innerHTML = recaps.map(recap => `
    <li class="ui-recap">
      <span class="ui-recap-week"><small>Week</small>${recap.week}</span>
      <div class="ui-recap-body">
        <span class="ui-label">${escapeHtml(recap.label)}</span>
        <a href="${escapeHtml(recap.href)}">${escapeHtml(recap.title)}</a>
        <p>${escapeHtml(recap.summary)}</p>
        ${recap.tags?.length ? `<div class="ui-recap-tags">${recap.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      </div>
    </li>
  `).join("");
})();
