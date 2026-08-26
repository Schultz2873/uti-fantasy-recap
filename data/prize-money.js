// UTI prize money + weekly category winner data.
// Update THIS file only; the homepage renderer handles the rest.

window.PRIZE_MONEY_DATA = {
  currency: "USD",

  // If currentTotal is null, the page will calculate:
  // basePool + waiverWireAdded + manualAdjustments.
  basePool: 1000,
  waiverWireAdded: 5000 - 481 - 485 - 477 - 411 - 439 - 463 - 490 - 419 - 472 - 479,
  manualAdjustments: 86,
  currentTotal: null,

  waiverRule: "Prize pool grows based on waiver-wire spending.",
  updatedLabel: "Season total",

  weeklyWinner: {
    week: "Week 20",
    category: "NSB",
    team: "BB's Bold Team",
    result: "9",
    prize: 25
  },

  // Optional. Newest first. Add as many past winners as you want.
  weeklyWinnerHistory: [
    { week: "Week 19", category: "ERA", team: "Me So Heorny", result: "2.79", prize: 25 },
    { week: "Week 18", category: "Strikeouts", team: "You Don't Know Bo", result: "55", prize: 25 },
    { week: "Week 17", category: "Total Bases", team: "Dixon Cider", result: "169", prize: 25 },
    { week: "Week 16", category: "Home Runs", team: "Me So Heorny", result: "25", prize: 25 },
    { week: "Week 15", category: "Average", team: "Gunnarrhea", result: ".276", prize: 25 },
    { week: "Week 14", category: "ERA", team: "This is Mizerable", result: "2.28", prize: 25 },
    { week: "Week 13", category: "Walks", team: "Dixon Cider", result: "36", prize: 25 },
    { week: "Week 12", category: "Strikeouts", team: "BTA Boyz", result: "40", prize: 25 },
    { week: "Week 11", category: "BAA", team: "This is Mizerable", result: ".217", prize: 25 },
    { week: "Week 10", category: "Losses", team: "You Don't Know Bo", result: "1", prize: 25 },
    { week: "Week 9", category: "K", team: "BTA Boyz", result: "91", prize: 25 },
    { week: "Week 8", category: "Wins", team: "Me So Heorny", result: "6", prize: 50 },
    { week: "Week 7", category: "NS+H", team: "Rollover", result: "5", prize: 0 },
    { week: "Week 6", category: "WHIP", team: "Dixon Cider", result: "0.995", prize: 25 },
    { week: "Week 5", category: "Quality Starts", team: "Me So Heorny", result: "7", prize: 25 },
    { week: "Week 4", category: "Total Bases", team: "Goodyear Gila Monsters", result: "182", prize: 25 },
    { week: "Week 3", category: "NSB", team: "Gunnarrhea", result: "10", prize: 25 },
    { week: "Week 2", category: "Runs", team: "Goodyear Gila Monsters", result: "50", prize: 50 },
    { week: "Week 1", category: "RBI", team: "Rollover", result: "67", prize: 0 },
  ]
};
