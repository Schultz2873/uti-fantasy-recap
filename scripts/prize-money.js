(function renderPrizeMoney() {
  const data = window.PRIZE_MONEY_DATA || {};

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

  const currency = data.currency || "USD";
  const money = (value) => {
    if (!isNumber(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  };

  const calculatedTotal =
    isNumber(data.basePool) && isNumber(data.waiverWireAdded)
      ? data.basePool + data.waiverWireAdded + (isNumber(data.manualAdjustments) ? data.manualAdjustments : 0)
      : null;

  const total = isNumber(data.currentTotal) ? data.currentTotal : calculatedTotal;

  setText("prizePoolTotal", money(total));
  setText("pulsePrizePoolTotal", money(total));
  setText("basePrizePool", money(data.basePool));
  setText("waiverPrizeAdded", money(data.waiverWireAdded));
  setText("auctionPrizeAdded", money(data.waiverWireAdded));
  setText("prizePoolRule", data.waiverRule || "Prize pool grows based on waiver-wire spending.");
  setText("prizeMoneyUpdatedAt", data.updatedLabel || "Season total");

  const winner = data.weeklyWinner || {};
  const winnerName = winner.team || "Winner TBD";
  const category = winner.category || "Category TBD";
  const result = winner.result || "Result will appear here.";
  const week = winner.week || "Latest";

  setText("weeklyWinnerWeek", week);
  setText("weeklyWinnerCategory", category);
  setText("weeklyWinnerTeam", winnerName);
  setText("weeklyWinnerResult", result);
  setText("weeklyWinnerPrize", money(winner.prize));

  setText("pulseWeeklyWinner", winner.team || "TBD");
  setText("pulseWeeklyCategory", winner.category || "Category prize");

  const history = Array.isArray(data.weeklyWinnerHistory) ? data.weeklyWinnerHistory : [];
  const historyWrap = document.getElementById("weeklyWinnerHistoryWrap");
  const historyList = document.getElementById("weeklyWinnerHistory");

  if (historyWrap && historyList && history.length) {
    historyWrap.hidden = false;
    historyList.innerHTML = history.map((item) => `
      <div class="weekly-history-item">
        <span class="history-week">${item.week || "Week"}</span>
        <span class="history-winner">${item.team || "TBD"}${item.category ? ` · ${item.category}` : ""}${item.result ? ` · ${item.result}` : ""}</span>
        <span class="history-prize">${money(item.prize)}</span>
      </div>
    `).join("");
  }
})();
