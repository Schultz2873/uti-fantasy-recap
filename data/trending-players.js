// Broad add/drop market data for the homepage Trending Available section.
// Keep this file at: data/trending-players.js
//
// IMPORTANT:
// Add ALL popular adds from Yahoo/ESPN/Fantrax here, even if some are already owned in UTI.
// category-leaders.js checks data/fantasy-owners.js and only displays players who are NOT on a UTI roster.
//
// Flow:
// 1) This file = popular players being added in other leagues
// 2) fantasy-owners.js = players already taken in UTI
// 3) Homepage = popular adds MINUS taken UTI players

window.TRENDING_PLAYERS = [
  // Example only. Replace/paste real add/drop trend rows here.
  // {
  //   name: "Player Name",
  //   team: "MLB Team",
  //   positions: ["1B", "OF"],
  //   addedPercent: 18.4,
  //   rosteredPercent: 42,
  //   droppedPercent: 3.1,
  //   source: "Yahoo",
  //   timeWindow: "Last 7 days",
  //   tags: ["Hot Add", "Power Bat"],
  //   reason: "Getting picked up quickly in other leagues."
  // }
];

// Backward-compatible alias so older code/name still works if referenced elsewhere.
window.TRENDING_AVAILABLE_PLAYERS = window.TRENDING_PLAYERS;
