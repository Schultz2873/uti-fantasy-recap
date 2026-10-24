// Fills the homepage prize pool card from data/prize-money.js.
// Whether the card is shown is decided in home-dashboard.js (season-aware).
(function renderPrizeMoney() {
  const data = window.PRIZE_MONEY_DATA || {};
  const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

  const money = (value) => {
    if (!isNumber(value)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data.currency || "USD",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  };

  const calculatedTotal =
    isNumber(data.basePool) && isNumber(data.waiverWireAdded)
      ? data.basePool + data.waiverWireAdded + (isNumber(data.manualAdjustments) ? data.manualAdjustments : 0)
      : null;
  const total = isNumber(data.currentTotal) ? data.currentTotal : calculatedTotal;

  const totalEl = document.getElementById("prizePoolTotal");
  if (totalEl) totalEl.textContent = money(total);

  // Where the money came from, drawn to scale. adjustmentBreakdown splits manualAdjustments into labeled parts.
  const adjustments = Array.isArray(data.adjustmentBreakdown) && data.adjustmentBreakdown.length
    ? data.adjustmentBreakdown
    : (isNumber(data.manualAdjustments) && data.manualAdjustments ? [{ label: "other", amount: data.manualAdjustments }] : []);

  const parts = [
    { label: "start", amount: data.basePool, tone: "base" },
    { label: "waivers", amount: data.waiverWireAdded, tone: "waivers" },
    ...adjustments.map((item, index) => ({
      label: String(item.label).replace(/^added from /i, ""),
      amount: item.amount,
      tone: `extra-${index + 1}`
    }))
  ].filter(part => isNumber(part.amount) && part.amount > 0);

  const bar = document.getElementById("prizePoolBar");
  if (bar) {
    bar.innerHTML = parts.map(part => `<span class="home-prize-${part.tone}" style="flex: ${part.amount}"></span>`).join("");
    bar.setAttribute("aria-label", parts.map(part => `${money(part.amount)} ${part.label}`).join(", "));
  }

  const breakdown = document.getElementById("prizePoolBreakdown");
  if (breakdown) breakdown.textContent = parts.map(part => `${money(part.amount)} ${part.label}`).join(" · ");

  // One line for the current weekly category winner, when there is one.
  const winner = data.weeklyWinner || {};
  const winnerLine = document.getElementById("weeklyWinnerLine");
  if (winnerLine && winner.team && winner.team !== "NA") {
    const details = [winner.category, winner.result].filter(Boolean).join(" ");
    winnerLine.textContent = `${winner.week || "This week"}: ${winner.team}${details ? ` · ${details}` : ""} · ${money(winner.prize)}`;
    winnerLine.hidden = false;
  }
})();
