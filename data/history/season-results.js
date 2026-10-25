// UTI season finish metadata.
// One row per completed season. regularSeasonFirst is the best regular-season record before playoffs begin.
// finalStandings (optional) is the league's final ranking, used for seasons with no weekly stats on the site.

window.UTI_SEASON_RESULTS = [
  {
    // 2022: only the final ranking is known (no weekly stats). "Schultz2873" is Gunnarrhea,
    // "Me so Hoerny" is Me So Heorny, and "You Don't Kno Bo (Frank)" is the separate old franchise.
    season: 2022,
    champion: "Mactown MacDaddies",
    runnerUp: "John's Super Team",
    thirdPlace: "You Don't Kno Bo (2023)",
    regularSeasonFirst: null,
    finalStandings: [
      [1, "Mactown MacDaddies"],
      [2, "John's Super Team"],
      [3, "You Don't Kno Bo (2023)"],
      [4, "Dixon Cider"],
      [5, "Goodyear Gila Monsters"],
      [6, "BB's Bold Team"],
      [6, "Gunnarrhea"],
      [7, "This Is Mizerable"],
      [9, "Pat James's Swell Team"],
      [10, "Me So Heorny"]
    ]
  },
  {
    season: 2023,
    champion: "Me So Heorny",
    runnerUp: "Gunnarrhea",
    thirdPlace: "Goodyear Gila Monsters",
    regularSeasonFirst: "Me So Heorny"
  },
  {
    season: 2024,
    champion: "Goodyear Gila Monsters",
    runnerUp: "John's Super Team",
    thirdPlace: "BB's Bold Team",
    regularSeasonFirst: "Dixon Cider"
  },
  {
    season: 2025,
    champion: "Dixon Cider",
    runnerUp: "BB's Bold Team",
    thirdPlace: "Goodyear Gila Monsters",
    regularSeasonFirst: "Me So Heorny"
  },
  {
    season: 2026,
    champion: "Goodyear Gila Monsters",
    runnerUp: "Gunnarrhea",
    thirdPlace: "This Is Mizerable",
    regularSeasonFirst: "Goodyear Gila Monsters"
  }
];
