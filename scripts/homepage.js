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


const viewMoreArticlesBtn = document.getElementById('viewMoreArticlesBtn');
const hiddenArticles = document.querySelectorAll('.hidden-article');

hiddenArticles.forEach(article => {
  article.style.display = 'none';
});

viewMoreArticlesBtn?.addEventListener('click', () => {
  const isExpanded = viewMoreArticlesBtn.dataset.expanded === 'true';

  hiddenArticles.forEach(article => {
    article.style.display = isExpanded ? 'none' : 'flex';
  });

  viewMoreArticlesBtn.dataset.expanded = String(!isExpanded);
  viewMoreArticlesBtn.textContent = isExpanded ? 'View More Recaps' : 'Show Less Articles';
});
