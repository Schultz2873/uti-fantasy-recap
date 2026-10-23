// Renders the homepage League Money panel from data/prize-money.js.
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
  setText("prizePoolRule", data.waiverRule || "Prize pool grows based on waiver-wire spending.");
  setText("prizeMoneyUpdatedAt", data.updatedLabel || "Season total");

  // Where the money came from, drawn to scale. adjustmentBreakdown splits manualAdjustments into labeled parts.
  const adjustments = Array.isArray(data.adjustmentBreakdown) && data.adjustmentBreakdown.length
    ? data.adjustmentBreakdown
    : (isNumber(data.manualAdjustments) && data.manualAdjustments ? [{ label: "Other adjustments", amount: data.manualAdjustments }] : []);

  const parts = [
    { label: "Starting pool", amount: data.basePool, tone: "base" },
    { label: "Added from waivers", amount: data.waiverWireAdded, tone: "waivers" },
    ...adjustments.map((item, index) => ({ label: item.label, amount: item.amount, tone: `extra-${index + 1}` }))
  ].filter(part => isNumber(part.amount) && part.amount > 0);

  const bar = document.getElementById("prizePoolBar");
  const legend = document.getElementById("prizePoolBreakdown");

  if (bar) {
    bar.innerHTML = parts.map(part => `<span class="money-bar-${part.tone}" style="flex: ${part.amount}"></span>`).join("");
    bar.setAttribute("aria-label", parts.map(part => `${part.label} ${money(part.amount)}`).join(", "));
  }

  if (legend) {
    legend.innerHTML = parts.map(part => `
      <li><i class="money-bar-${part.tone}"></i><span>${part.label}</span><b>${money(part.amount)}</b></li>
    `).join("");
  }

  const winner = data.weeklyWinner || {};

  setText("weeklyWinnerWeek", winner.week || "Latest");
  setText("weeklyWinnerCategory", winner.category || "Category TBD");
  setText("weeklyWinnerTeam", winner.team || "Winner TBD");
  setText("weeklyWinnerResult", winner.result || "Result will appear here.");
  setText("weeklyWinnerPrize", money(winner.prize));

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
