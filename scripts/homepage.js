function setCompactCountdown(numberId, labelId, targetDate, liveLabel) {
  const numberEl = document.getElementById(numberId);
  const labelEl = document.getElementById(labelId);

  if (!numberEl || !labelEl) return;

  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    numberEl.textContent = "0";
    labelEl.textContent = liveLabel;
    return;
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays >= 2) {
    numberEl.textContent = totalDays;
    labelEl.textContent = "Days left";
  } else {
    numberEl.textContent = totalHours;
    labelEl.textContent = totalHours === 1 ? "Hour left" : "Hours left";
  }
}

function updateLeagueAlertCountdowns() {
  setCompactCountdown(
    "tradeDeadlineCountdownNumber",
    "tradeDeadlineCountdownLabel",
    new Date("2026-08-12T23:59:59-05:00"),
    "Closed"
  );
}

updateLeagueAlertCountdowns();
setInterval(updateLeagueAlertCountdowns, 1000 * 60);


// Recaps list: show the newest few, with a button to reveal the rest.
const RECAPS_SHOWN_BY_DEFAULT = 4;
const viewMoreArticlesBtn = document.getElementById('viewMoreArticlesBtn');
const olderRecaps = [...document.querySelectorAll('#recapList .recap-row')].slice(RECAPS_SHOWN_BY_DEFAULT);

olderRecaps.forEach(row => {
  row.hidden = true;
});

if (viewMoreArticlesBtn && !olderRecaps.length) {
  viewMoreArticlesBtn.hidden = true;
}

viewMoreArticlesBtn?.addEventListener('click', () => {
  const isExpanded = viewMoreArticlesBtn.dataset.expanded === 'true';

  olderRecaps.forEach(row => {
    row.hidden = isExpanded;
  });

  viewMoreArticlesBtn.dataset.expanded = String(!isExpanded);
  viewMoreArticlesBtn.textContent = isExpanded ? 'Show all recaps' : 'Show fewer recaps';
});
