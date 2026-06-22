// players.js
// UTI Dynasty Baseball Trade Analyzer player values
// Generated from fantasy-owners.js and updated with dynasty value inputs for every rostered player.
//
// Notes:
// - fantasyTeam is from your Fantrax owners export.
// - currentRank is a value-engine input, not an official single-source rank.
// - categoryFit is calculated from your categories: R, HR, RBI, NSB, AVG, TB, hitter SO, BB / W, L, QS, SV+H-BS, K, ERA, WHIP, BAA.
// - All players now have age/currentRank/futureTier/categoryFitTier/riskTier populated and needsReview set to false.

export const VALUE_WEIGHTS = Object.freeze({
  currentProduction: 0.28,
  futureUpside: 0.24,
  ageValue: 0.14,
  categoryFit: 0.24,
  positionScarcity: 0.05,
  riskPenalty: 0.05
});

export const POSITION_SCARCITY = Object.freeze({
  C: 100,
  SS: 90,
  "2B": 75,
  "3B": 70,
  "1B": 50,
  OF: 50,
  UTIL: 35,
  DH: 30,
  SP: 80,
  RP: 60,
  P: 55
});

export const CATEGORY_FIT = Object.freeze({
  eliteHitter: 95,
  strongHitter: 85,
  goodHitter: 75,
  averageHitter: 65,
  flawedHitter: 52,
  speedOnly: 58,
  powerOnly: 62,
  eliteStarter: 92,
  strongStarter: 84,
  goodStarter: 75,
  volatileStarter: 62,
  eliteReliever: 82,
  usefulReliever: 68,
  riskyReliever: 52,
  prospect: 70,
  unknown: 60
});

export const RISK_PENALTY = Object.freeze({
  veryLow: 8,
  low: 16,
  medium: 30,
  high: 45,
  veryHigh: 60,
  prospectHitter: 42,
  prospectPitcher: 58,
  injured: 55,
  reliever: 45,
  aging: 42
});

export const FUTURE_TIER_VALUE = Object.freeze({
  generational: 100,
  elite: 94,
  cornerstone: 88,
  star: 82,
  strongKeeper: 74,
  solidKeeper: 65,
  useful: 54,
  shortTerm: 42,
  depth: 28,
  prospectElite: 90,
  prospectHigh: 82,
  prospectMedium: 70,
  prospectLow: 55
});

export const HITTER_CATEGORIES = Object.freeze([
  "R",
  "HR",
  "RBI",
  "NSB",
  "AVG",
  "TB",
  "SO",
  "BB"
]);

export const PITCHER_CATEGORIES = Object.freeze([
  "W",
  "L",
  "QS",
  "SVH_BS",
  "K",
  "ERA",
  "WHIP",
  "BAA"
]);

function clampScore(score) {
  return Math.max(1, Math.min(100, Math.round(score)));
}

function averageScores(categoryScores) {
  const values = Object.values(categoryScores);
  return Math.round(values.reduce((sum, score) => sum + score, 0) / values.length);
}

function getPrimaryCategoryType(player) {
  const positions = player.positions ?? [];

  if (positions.includes("RP")) return "reliever";
  if (positions.includes("SP") || positions.includes("P")) return "starter";
  return "hitter";
}

function getBaseCategoryFit(player) {
  return CATEGORY_FIT[player.categoryFitTier] ?? CATEGORY_FIT.unknown;
}

function buildHitterCategoryScores(player) {
  const base = getBaseCategoryFit(player);
  const tier = player.categoryFitTier;
  const positions = player.positions ?? [];
  const isCatcher = positions.includes("C");
  const isSpeedProfile = tier === "speedOnly";
  const isPowerProfile = tier === "powerOnly";
  const isFlawed = tier === "flawedHitter";
  const isElite = tier === "eliteHitter";
  const isStrong = tier === "strongHitter";
  const prospectPenalty = player.riskTier === "prospectHitter" ? -4 : 0;
  const agingPenalty = player.riskTier === "aging" ? -5 : 0;

  return {
    R: clampScore(base + (isElite ? 6 : isStrong ? 3 : 0) + prospectPenalty + agingPenalty),
    HR: clampScore(base + (isPowerProfile ? 14 : isElite ? 8 : isStrong ? 5 : isSpeedProfile ? -18 : 0)),
    RBI: clampScore(base + (isPowerProfile ? 10 : isElite ? 7 : isStrong ? 4 : isSpeedProfile ? -12 : 0)),
    NSB: clampScore(base + (isSpeedProfile ? 20 : isElite ? 6 : isPowerProfile ? -18 : isCatcher ? -12 : 0)),
    AVG: clampScore(base + (isFlawed ? -16 : isPowerProfile ? -8 : isSpeedProfile ? 3 : isElite ? 5 : 0)),
    TB: clampScore(base + (isPowerProfile ? 12 : isElite ? 8 : isStrong ? 5 : isSpeedProfile ? -10 : 0)),
    // Higher SO score means the hitter is less damaging in the strikeout category.
    SO: clampScore(base + (isFlawed ? -18 : isPowerProfile ? -14 : isSpeedProfile ? 8 : isElite ? 4 : 0)),
    BB: clampScore(base + (isElite ? 10 : isStrong ? 5 : isPowerProfile ? 2 : isFlawed ? -8 : 0))
  };
}

function buildStarterCategoryScores(player) {
  const base = getBaseCategoryFit(player);
  const tier = player.categoryFitTier;
  const isElite = tier === "eliteStarter";
  const isStrong = tier === "strongStarter";
  const isVolatile = tier === "volatileStarter";
  const injuryPenalty = player.riskTier === "injured" || player.riskTier === "high" || player.riskTier === "veryHigh" ? -8 : 0;
  const prospectPenalty = player.riskTier === "prospectPitcher" ? -6 : 0;
  const agingPenalty = player.riskTier === "aging" ? -6 : 0;

  return {
    W: clampScore(base + (isElite ? 6 : isStrong ? 3 : 0) + injuryPenalty + agingPenalty),
    // Higher L score means fewer harmful losses.
    L: clampScore(base + (isElite ? 8 : isStrong ? 4 : isVolatile ? -8 : 0) + prospectPenalty),
    QS: clampScore(base + (isElite ? 8 : isStrong ? 6 : isVolatile ? -10 : 0) + injuryPenalty + agingPenalty),
    SVH_BS: 0,
    K: clampScore(base + (isElite ? 12 : isStrong ? 8 : isVolatile ? 4 : 0)),
    ERA: clampScore(base + (isElite ? 10 : isStrong ? 5 : isVolatile ? -12 : 0) + prospectPenalty),
    WHIP: clampScore(base + (isElite ? 10 : isStrong ? 5 : isVolatile ? -12 : 0) + prospectPenalty),
    BAA: clampScore(base + (isElite ? 10 : isStrong ? 5 : isVolatile ? -8 : 0) + prospectPenalty)
  };
}

function buildRelieverCategoryScores(player) {
  const base = getBaseCategoryFit(player);
  const tier = player.categoryFitTier;
  const isElite = tier === "eliteReliever";
  const isUseful = tier === "usefulReliever";
  const isRisky = tier === "riskyReliever";
  const relieverPenalty = player.riskTier === "reliever" ? -4 : 0;
  const agingPenalty = player.riskTier === "aging" ? -8 : 0;

  return {
    W: clampScore(25 + (isElite ? 8 : 0)),
    // Higher L score means fewer harmful losses.
    L: clampScore(base + (isElite ? 8 : isRisky ? -10 : 0)),
    QS: 0,
    // Net saves/holds category: SV + H - BS.
    SVH_BS: clampScore(base + (isElite ? 16 : isUseful ? 8 : isRisky ? -12 : 0) + relieverPenalty + agingPenalty),
    K: clampScore(base + (isElite ? 12 : isUseful ? 6 : 0)),
    ERA: clampScore(base + (isElite ? 10 : isRisky ? -12 : 0)),
    WHIP: clampScore(base + (isElite ? 10 : isRisky ? -12 : 0)),
    BAA: clampScore(base + (isElite ? 8 : isRisky ? -10 : 0))
  };
}

export function buildCategoryProfile(player) {
  const categoryType = getPrimaryCategoryType(player);

  if (categoryType === "reliever") {
    const categoryScores = buildRelieverCategoryScores(player);
    return {
      categoryType,
      categoryScores,
      categoryFit: averageScores(categoryScores)
    };
  }

  if (categoryType === "starter") {
    const categoryScores = buildStarterCategoryScores(player);
    return {
      categoryType,
      categoryScores,
      categoryFit: averageScores(categoryScores)
    };
  }

  const categoryScores = buildHitterCategoryScores(player);
  return {
    categoryType,
    categoryScores,
    categoryFit: averageScores(categoryScores)
  };
}


export function normalizeName(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

export function getCurrentProductionFromRank(rank) {
  if (!rank || rank >= 999) return 20;
  if (rank <= 5) return 100;
  if (rank <= 10) return 96;
  if (rank <= 25) return 90;
  if (rank <= 50) return 82;
  if (rank <= 75) return 74;
  if (rank <= 100) return 68;
  if (rank <= 150) return 58;
  if (rank <= 200) return 48;
  if (rank <= 300) return 36;
  return 24;
}

export function getAgeValue(age) {
  if (!age) return 50;
  if (age <= 23) return 100;
  if (age <= 27) return 90;
  if (age <= 30) return 75;
  if (age <= 33) return 50;
  return 25;
}

export function getPositionScarcity(positions = []) {
  if (!positions.length) return POSITION_SCARCITY.UTIL;
  return Math.max(...positions.map((position) => POSITION_SCARCITY[position] ?? POSITION_SCARCITY.UTIL));
}

export function getDynastyTier(value) {
  if (value >= 95) return "Untouchable Superstar";
  if (value >= 85) return "Elite Dynasty Cornerstone";
  if (value >= 75) return "Star Dynasty Asset";
  if (value >= 60) return "Strong Keeper";
  if (value >= 45) return "Solid Dynasty Piece";
  if (value >= 30) return "Useful But Movable";
  if (value >= 15) return "Depth / Aging Vet";
  return "Throw-In";
}

export function calculateDynastyValue(player) {
  const currentProduction = getCurrentProductionFromRank(player.currentRank);
  const futureUpside = FUTURE_TIER_VALUE[player.futureTier] ?? FUTURE_TIER_VALUE.depth;
  const ageValue = getAgeValue(player.age);
  const categoryProfile = buildCategoryProfile(player);
  const categoryFit = categoryProfile.categoryFit;
  const positionScarcity = getPositionScarcity(player.positions);
  const riskPenalty = RISK_PENALTY[player.riskTier] ?? RISK_PENALTY.medium;

  const rawScore =
    currentProduction * VALUE_WEIGHTS.currentProduction +
    futureUpside * VALUE_WEIGHTS.futureUpside +
    ageValue * VALUE_WEIGHTS.ageValue +
    categoryFit * VALUE_WEIGHTS.categoryFit +
    positionScarcity * VALUE_WEIGHTS.positionScarcity -
    riskPenalty * VALUE_WEIGHTS.riskPenalty;

  const dynastyValue = Math.round(Math.max(1, Math.min(100, rawScore)));

  return {
    ...player,
    currentProduction,
    futureUpside,
    ageValue,
    categoryType: categoryProfile.categoryType,
    categoryScores: categoryProfile.categoryScores,
    categoryFit,
    positionScarcity,
    riskPenalty,
    dynastyValue,
    tier: getDynastyTier(dynastyValue)
  };
}

export const RAW_PLAYERS = [
  { id: 1, name: "A.J. Ewing", fantasyTeam: "Me So Heorny", mlbTeam: "NYM", positions: ["2B", "OF"], age: 21, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "speedOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 2, name: "Aaron Ashby", fantasyTeam: "Mactown MacDaddies", mlbTeam: "", positions: ["SP"], age: 29, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 3, name: "Aaron Judge", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "NYY", positions: ["OF"], age: 34, currentRank: 7, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 4, name: "Adley Rutschman", fantasyTeam: "BB's Bold Team", mlbTeam: "BAL", positions: ["C"], age: 28, currentRank: 88, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 5, name: "Adrian Morejon", fantasyTeam: "Me So Heorny", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 6, name: "Agustin Ramirez", fantasyTeam: "Gunnarrhea", mlbTeam: "MIA", positions: ["C", "1B"], age: 24, currentRank: 125, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 7, name: "Aidan Miller", fantasyTeam: "You Don't Know Bo", mlbTeam: "PHI", positions: ["SS", "3B"], age: 21, currentRank: 215, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 8, name: "Aiva Arquette", fantasyTeam: "John's Super Team", mlbTeam: "MIA", positions: ["SS"], age: 22, currentRank: 280, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 9, name: "Alec Bohm", fantasyTeam: "Me So Heorny", mlbTeam: "PHI", positions: ["1B", "3B"], age: 29, currentRank: 190, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 10, name: "Alec Burleson", fantasyTeam: "BB's Bold Team", mlbTeam: "STL", positions: ["1B", "OF"], age: 27, currentRank: 180, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 11, name: "Alejandro Kirk", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "TOR", positions: ["C"], age: 27, currentRank: 230, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 12, name: "Alex Bregman", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "BOS", positions: ["3B"], age: 32, currentRank: 145, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 13, name: "Alfredo Duno", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CIN", positions: ["C"], age: 20, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 14, name: "Andres Munoz", fantasyTeam: "Dixon Cider", mlbTeam: "SEA", positions: ["RP"], age: 27, currentRank: 150, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 15, name: "Andrew Abbott", fantasyTeam: "This Is Mizerable", mlbTeam: "CIN", positions: ["SP"], age: 27, currentRank: 210, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 16, name: "Andrew Benintendi", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CHW", positions: ["OF"], age: 31, currentRank: 330, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 17, name: "Andrew Painter", fantasyTeam: "BTA Boyz", mlbTeam: "PHI", positions: ["SP"], age: 23, currentRank: 210, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 18, name: "Andy Pages", fantasyTeam: "Me So Heorny", mlbTeam: "LAD", positions: ["OF"], age: 25, currentRank: 190, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 19, name: "Angel Martinez", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["2B", "OF"], age: 24, currentRank: 310, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 20, name: "Aroldis Chapman", fantasyTeam: "John's Super Team", mlbTeam: "BOS", positions: ["RP"], age: 38, currentRank: 330, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 21, name: "Austin Riley", fantasyTeam: "John's Super Team", mlbTeam: "ATL", positions: ["3B"], age: 29, currentRank: 85, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 22, name: "Bailey Ober", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIN", positions: ["SP"], age: 31, currentRank: 205, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 23, name: "Ben Brown", fantasyTeam: "Gunnarrhea", mlbTeam: "CHC", positions: ["SP", "RP"], age: 26, currentRank: 260, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 24, name: "Ben Rice", fantasyTeam: "Dixon Cider", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 25, name: "Billy Carlson", fantasyTeam: "John's Super Team", mlbTeam: "CHW", positions: ["SS"], age: 19, currentRank: 350, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 26, name: "Blake Snell", fantasyTeam: "John's Super Team", mlbTeam: "LAD", positions: ["SP"], age: 33, currentRank: 150, futureTier: "shortTerm", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 27, name: "Blaze Jordan", fantasyTeam: "Me So Heorny", mlbTeam: "STL", positions: ["1B", "3B"], age: 23, currentRank: 260, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 28, name: "Bo Bichette", fantasyTeam: "Gunnarrhea", mlbTeam: "TOR", positions: ["SS"], age: 28, currentRank: 65, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 29, name: "Bobby Witt Jr.", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "KC", positions: ["SS"], age: 26, currentRank: 2, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "veryLow", needsReview: false },
  { id: 30, name: "Braden Montgomery", fantasyTeam: "Me So Heorny", mlbTeam: "BOS", positions: ["OF"], age: 23, currentRank: 230, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 31, name: "Brady Singer", fantasyTeam: "Mactown MacDaddies", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 32, name: "Brandon Lowe", fantasyTeam: "BTA Boyz", mlbTeam: "TB", positions: ["2B"], age: 31, currentRank: 210, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 33, name: "Brandon Marsh", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "PHI", positions: ["OF"], age: 28, currentRank: 260, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 34, name: "Brandon Nimmo", fantasyTeam: "John's Super Team", mlbTeam: "NYM", positions: ["OF"], age: 33, currentRank: 190, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 35, name: "Brandon Sproat", fantasyTeam: "BB's Bold Team", mlbTeam: "NYM", positions: ["SP"], age: 25, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 36, name: "Brandon Woodruff", fantasyTeam: "Dixon Cider", mlbTeam: "MIL", positions: ["SP"], age: 33, currentRank: 220, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 37, name: "Brandon Young", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BAL", positions: ["SP"], age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 38, name: "Braxton Ashcraft", fantasyTeam: "BTA Boyz", mlbTeam: "PIT", positions: ["SP"], age: 26, currentRank: 310, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 39, name: "Brayan Rocchio", fantasyTeam: "You Don't Know Bo", mlbTeam: "CLE", positions: ["SS"], age: 25, currentRank: 290, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 40, name: "Brendan Donovan", fantasyTeam: "Mactown MacDaddies", mlbTeam: "STL", positions: ["2B", "OF"], age: 29, currentRank: 160, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 41, name: "Brent Rooker", fantasyTeam: "BB's Bold Team", mlbTeam: "ATH", positions: ["OF", "DH"], age: 31, currentRank: 130, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 42, name: "Brice Turang", fantasyTeam: "BB's Bold Team", mlbTeam: "MIL", positions: ["2B", "SS"], age: 26, currentRank: 120, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "low", needsReview: false },
  { id: 43, name: "Brooks Lee", fantasyTeam: "BTA Boyz", mlbTeam: "MIN", positions: ["2B", "SS", "3B"], age: 25, currentRank: 250, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 44, name: "Bryan Baker", fantasyTeam: "Gunnarrhea", mlbTeam: "TB", positions: ["RP"], age: 31, currentRank: 380, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 45, name: "Bryan Reynolds", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PIT", positions: ["OF"], age: 31, currentRank: 140, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 46, name: "Bryan Woo", fantasyTeam: "Gunnarrhea", mlbTeam: "SEA", positions: ["SP"], age: 26, currentRank: 82, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 47, name: "Bryce Elder", fantasyTeam: "Dixon Cider", mlbTeam: "ATL", positions: ["SP"], age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 48, name: "Bryce Eldridge", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["1B"], age: 21, currentRank: 235, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 49, name: "Bryce Harper", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["1B", "OF"], age: 33, currentRank: 72, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 50, name: "Bryce Miller", fantasyTeam: "Me So Heorny", mlbTeam: "SEA", positions: ["SP"], age: 27, currentRank: 185, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 51, name: "Bryson Stott", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["2B", "SS"], age: 28, currentRank: 180, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 52, name: "Bubba Chandler", fantasyTeam: "BTA Boyz", mlbTeam: "PIT", positions: ["SP"], age: 23, currentRank: 220, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 53, name: "Byron Buxton", fantasyTeam: "John's Super Team", mlbTeam: "MIN", positions: ["OF"], age: 32, currentRank: 170, futureTier: "shortTerm", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 54, name: "Cade Horton", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["SP"], age: 24, currentRank: 230, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 55, name: "Cade Smith", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["RP"], age: 27, currentRank: 260, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 56, name: "Cal Raleigh", fantasyTeam: "Dixon Cider", mlbTeam: "SEA", positions: ["C"], age: 29, currentRank: 82, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 57, name: "Caleb Bonemer", fantasyTeam: "BTA Boyz", mlbTeam: "CHW", positions: ["SS"], age: 20, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 58, name: "Cam Caminiti", fantasyTeam: "BTA Boyz", mlbTeam: "ATL", positions: ["SP"], age: 20, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 59, name: "Cam Schlittler", fantasyTeam: "Dixon Cider", mlbTeam: "NYY", positions: ["SP"], age: 25, currentRank: 320, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 60, name: "Cam Smith", fantasyTeam: "Me So Heorny", mlbTeam: "HOU", positions: ["3B", "OF"], age: 23, currentRank: 160, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 61, name: "Carlos Correa", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIN", positions: ["SS"], age: 31, currentRank: 210, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "high", needsReview: false },
  { id: 62, name: "Carlos Lagrange", fantasyTeam: "You Don't Know Bo", mlbTeam: "NYY", positions: ["SP"], age: 22, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 63, name: "Carlos Rodon", fantasyTeam: "Gunnarrhea", mlbTeam: "NYY", positions: ["SP"], age: 33, currentRank: 185, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 64, name: "Carson Benge", fantasyTeam: "Gunnarrhea", mlbTeam: "NYM", positions: ["OF"], age: 23, currentRank: 320, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 65, name: "Carson Kelly", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["C"], age: 31, currentRank: 260, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 66, name: "Carter Jensen", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "KC", positions: ["C"], age: 23, currentRank: 280, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 67, name: "Casey Mize", fantasyTeam: "BTA Boyz", mlbTeam: "DET", positions: ["SP"], age: 29, currentRank: 260, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 68, name: "Casey Schmitt", fantasyTeam: "BB's Bold Team", mlbTeam: "SF", positions: ["3B", "SS"], age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 69, name: "Ceddanne Rafaela", fantasyTeam: "Dixon Cider", mlbTeam: "BOS", positions: ["OF", "SS"], age: 25, currentRank: 170, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 70, name: "Chandler Simpson", fantasyTeam: "You Don't Know Bo", mlbTeam: "TB", positions: ["OF"], age: 25, currentRank: 200, futureTier: "useful", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 71, name: "Charlie Condon", fantasyTeam: "BB's Bold Team", mlbTeam: "COL", positions: ["3B", "OF"], age: 23, currentRank: 230, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 72, name: "Chase Burns", fantasyTeam: "John's Super Team", mlbTeam: "CIN", positions: ["SP"], age: 23, currentRank: 225, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 73, name: "Chase DeLauter", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CLE", positions: ["OF"], age: 24, currentRank: 210, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 74, name: "Chase Meidroth", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CHW", positions: ["2B", "SS"], age: 25, currentRank: 260, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 75, name: "Chris Bassitt", fantasyTeam: "Mactown MacDaddies", mlbTeam: "TOR", positions: ["SP"], age: 37, currentRank: 300, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 76, name: "Chris Sale", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATL", positions: ["SP"], age: 37, currentRank: 140, futureTier: "shortTerm", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 77, name: "Christian Walker", fantasyTeam: "BB's Bold Team", mlbTeam: "HOU", positions: ["1B"], age: 35, currentRank: 150, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 78, name: "Christian Yelich", fantasyTeam: "This Is Mizerable", mlbTeam: "MIL", positions: ["OF"], age: 34, currentRank: 180, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 79, name: "CJ Abrams", fantasyTeam: "John's Super Team", mlbTeam: "WSH", positions: ["SS"], age: 25, currentRank: 52, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 80, name: "Cody Bellinger", fantasyTeam: "Me So Heorny", mlbTeam: "NYY", positions: ["OF", "1B"], age: 30, currentRank: 155, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 81, name: "Cole Ragans", fantasyTeam: "Dixon Cider", mlbTeam: "KC", positions: ["SP"], age: 28, currentRank: 54, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 82, name: "Cole Young", fantasyTeam: "John's Super Team", mlbTeam: "SEA", positions: ["2B", "SS"], age: 23, currentRank: 280, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 83, name: "Colin Rea", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CHC", positions: ["SP"], age: 36, currentRank: 360, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 84, name: "Colson Montgomery", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CHW", positions: ["SS"], age: 24, currentRank: 255, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 85, name: "Colt Emerson", fantasyTeam: "Gunnarrhea", mlbTeam: "SEA", positions: ["SS", "3B"], age: 20, currentRank: 205, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 86, name: "Colton Cowser", fantasyTeam: "You Don't Know Bo", mlbTeam: "BAL", positions: ["OF"], age: 26, currentRank: 150, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 87, name: "Connelly Early", fantasyTeam: "Dixon Cider", mlbTeam: "BOS", positions: ["SP"], age: 24, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 88, name: "Cooper Ingle", fantasyTeam: "Me So Heorny", mlbTeam: "CLE", positions: ["C"], age: 24, currentRank: 320, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 89, name: "Corbin Burnes", fantasyTeam: "John's Super Team", mlbTeam: "ARI", positions: ["SP"], age: 31, currentRank: 60, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 90, name: "Corbin Carroll", fantasyTeam: "Dixon Cider", mlbTeam: "ARI", positions: ["OF"], age: 25, currentRank: 5, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 91, name: "Corey Seager", fantasyTeam: "Mactown MacDaddies", mlbTeam: "TEX", positions: ["SS"], age: 32, currentRank: 50, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 92, name: "Cristopher Sanchez", fantasyTeam: "BB's Bold Team", mlbTeam: "PHI", positions: ["SP"], age: 29, currentRank: 100, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 93, name: "Dalton Rushing", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAD", positions: ["C", "OF"], age: 25, currentRank: 175, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 94, name: "Dansby Swanson", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["SS"], age: 32, currentRank: 195, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 95, name: "David Bednar", fantasyTeam: "You Don't Know Bo", mlbTeam: "PIT", positions: ["RP"], age: 31, currentRank: 250, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 96, name: "Davis Martin", fantasyTeam: "Mactown MacDaddies", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 97, name: "Daylen Lile", fantasyTeam: "Me So Heorny", mlbTeam: "WSH", positions: ["OF"], age: 24, currentRank: 300, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 98, name: "Devin Williams", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "NYY", positions: ["RP"], age: 31, currentRank: 160, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 99, name: "Didier Fuentes", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATL", positions: ["SP"], age: 21, currentRank: 350, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 100, name: "Dillon Dingler", fantasyTeam: "This Is Mizerable", mlbTeam: "DET", positions: ["C"], age: 27, currentRank: 220, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 101, name: "Dominic Canzone", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SEA", positions: ["OF"], age: 28, currentRank: 330, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 102, name: "Drake Baldwin", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["C"], age: 25, currentRank: 165, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 103, name: "Drew Rasmussen", fantasyTeam: "BTA Boyz", mlbTeam: "TB", positions: ["SP", "RP"], age: 30, currentRank: 225, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 104, name: "Drew Thorpe", fantasyTeam: "BTA Boyz", mlbTeam: "CHW", positions: ["SP"], age: 25, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 105, name: "Dustin May", fantasyTeam: "BTA Boyz", mlbTeam: "LAD", positions: ["SP"], age: 28, currentRank: 260, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 106, name: "Dylan Cease", fantasyTeam: "Gunnarrhea", mlbTeam: "SD", positions: ["SP"], age: 30, currentRank: 95, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 107, name: "Dylan Crews", fantasyTeam: "John's Super Team", mlbTeam: "WSH", positions: ["OF"], age: 24, currentRank: 175, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 108, name: "Dylan Lee", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["RP"], age: 31, currentRank: 360, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 109, name: "Eduardo Quintero", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "LAD", positions: ["OF"], age: 20, currentRank: 210, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 110, name: "Eduardo Rodriguez", fantasyTeam: "Mactown MacDaddies", mlbTeam: "ARI", positions: ["SP"], age: 33, currentRank: 330, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 111, name: "Edward Florentino", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 112, name: "Edwin Diaz", fantasyTeam: "BB's Bold Team", mlbTeam: "NYM", positions: ["RP"], age: 32, currentRank: 155, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 113, name: "Eli Willits", fantasyTeam: "Me So Heorny", mlbTeam: "WSH", positions: ["SS"], age: 18, currentRank: 280, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 114, name: "Elly De La Cruz", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CIN", positions: ["SS"], age: 24, currentRank: 6, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 115, name: "Elmer Rodriguez", fantasyTeam: "BB's Bold Team", mlbTeam: "NYY", positions: ["C"], age: 22, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 116, name: "Emerson Hancock", fantasyTeam: "Me So Heorny", mlbTeam: "", positions: ["UTIL"], age: 22, currentRank: 340, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 117, name: "Emmanuel Rodriguez", fantasyTeam: "Me So Heorny", mlbTeam: "MIN", positions: ["OF"], age: 23, currentRank: 245, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 118, name: "Emmet Sheehan", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["SP"], age: 26, currentRank: 280, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 119, name: "Erik Sabrowski", fantasyTeam: "Dixon Cider", mlbTeam: "CLE", positions: ["RP"], age: 28, currentRank: 390, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 120, name: "Ernie Clement", fantasyTeam: "BTA Boyz", mlbTeam: "TOR", positions: ["2B", "3B", "SS"], age: 30, currentRank: 300, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 121, name: "Ethan Holliday", fantasyTeam: "BTA Boyz", mlbTeam: "COL", positions: ["SS", "3B"], age: 19, currentRank: 255, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 122, name: "Ethan Salas", fantasyTeam: "Mactown MacDaddies", mlbTeam: "SD", positions: ["C"], age: 20, currentRank: 250, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 123, name: "Eury Perez", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["SP"], age: 23, currentRank: 120, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 124, name: "Ezequiel Duran", fantasyTeam: "You Don't Know Bo", mlbTeam: "TEX", positions: ["3B", "SS", "OF"], age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 125, name: "Fernando Tatis Jr.", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SD", positions: ["OF"], age: 27, currentRank: 14, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 126, name: "Foster Griffin", fantasyTeam: "Gunnarrhea", mlbTeam: "KC", positions: ["RP"], age: 30, currentRank: 380, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 127, name: "Framber Valdez", fantasyTeam: "BTA Boyz", mlbTeam: "HOU", positions: ["SP"], age: 32, currentRank: 70, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 128, name: "Francisco Alvarez", fantasyTeam: "Gunnarrhea", mlbTeam: "NYM", positions: ["C"], age: 24, currentRank: 145, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 129, name: "Francisco Lindor", fantasyTeam: "BB's Bold Team", mlbTeam: "NYM", positions: ["SS"], age: 32, currentRank: 41, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 130, name: "Franklin Arias", fantasyTeam: "BB's Bold Team", mlbTeam: "BOS", positions: ["SS"], age: 20, currentRank: 300, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 131, name: "Freddie Freeman", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["1B"], age: 36, currentRank: 100, futureTier: "shortTerm", categoryFitTier: "eliteHitter", riskTier: "aging", needsReview: false },
  { id: 132, name: "Freddy Peralta", fantasyTeam: "Gunnarrhea", mlbTeam: "MIL", positions: ["SP"], age: 30, currentRank: 90, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 133, name: "Gabriel Moreno", fantasyTeam: "Mactown MacDaddies", mlbTeam: "ARI", positions: ["C"], age: 26, currentRank: 190, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 134, name: "Gage Jump", fantasyTeam: "BB's Bold Team", mlbTeam: "ATH", positions: ["SP"], age: 23, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 135, name: "Garrett Crochet", fantasyTeam: "You Don't Know Bo", mlbTeam: "BOS", positions: ["SP"], age: 27, currentRank: 38, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 136, name: "Gavin Lux", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CIN", positions: ["2B", "OF"], age: 28, currentRank: 300, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 137, name: "Gavin Sheets", fantasyTeam: "You Don't Know Bo", mlbTeam: "SD", positions: ["1B", "OF"], age: 30, currentRank: 310, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 138, name: "Gavin Williams", fantasyTeam: "Gunnarrhea", mlbTeam: "CLE", positions: ["SP"], age: 26, currentRank: 110, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 139, name: "George Kirby", fantasyTeam: "Me So Heorny", mlbTeam: "SEA", positions: ["SP"], age: 28, currentRank: 52, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 140, name: "George Lombard Jr.", fantasyTeam: "Gunnarrhea", mlbTeam: "", positions: ["UTIL"], age: 22, currentRank: 340, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 141, name: "George Springer", fantasyTeam: "You Don't Know Bo", mlbTeam: "TOR", positions: ["OF"], age: 36, currentRank: 260, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 142, name: "Geraldo Perdomo", fantasyTeam: "Dixon Cider", mlbTeam: "ARI", positions: ["SS"], age: 26, currentRank: 180, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 143, name: "Gerrit Cole", fantasyTeam: "BTA Boyz", mlbTeam: "NYY", positions: ["SP"], age: 35, currentRank: 135, futureTier: "shortTerm", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 144, name: "Gleyber Torres", fantasyTeam: "BB's Bold Team", mlbTeam: "DET", positions: ["2B"], age: 29, currentRank: 185, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 145, name: "Grant Taylor", fantasyTeam: "This Is Mizerable", mlbTeam: "CHW", positions: ["SP", "RP"], age: 24, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 146, name: "Grayson Rodriguez", fantasyTeam: "John's Super Team", mlbTeam: "BAL", positions: ["SP"], age: 26, currentRank: 115, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 147, name: "Gregory Soto", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BAL", positions: ["RP"], age: 31, currentRank: 360, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 148, name: "Gunnar Henderson", fantasyTeam: "Gunnarrhea", mlbTeam: "BAL", positions: ["SS", "3B"], age: 25, currentRank: 11, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 149, name: "Hagen Smith", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CHW", positions: ["SP"], age: 23, currentRank: 300, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 150, name: "Heliot Ramos", fantasyTeam: "This Is Mizerable", mlbTeam: "SF", positions: ["OF"], age: 26, currentRank: 180, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 151, name: "Hunter Brown", fantasyTeam: "Dixon Cider", mlbTeam: "", positions: ["SP"], age: 29, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 152, name: "Hunter Goodman", fantasyTeam: "Me So Heorny", mlbTeam: "COL", positions: ["C", "OF", "DH"], age: 26, currentRank: 90, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 153, name: "Hunter Greene", fantasyTeam: "Gunnarrhea", mlbTeam: "CIN", positions: ["SP"], age: 26, currentRank: 76, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 154, name: "Ian Happ", fantasyTeam: "This Is Mizerable", mlbTeam: "CHC", positions: ["OF"], age: 31, currentRank: 175, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 155, name: "Isaac Paredes", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "HOU", positions: ["1B", "3B"], age: 27, currentRank: 130, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 156, name: "Ivan Herrera", fantasyTeam: "John's Super Team", mlbTeam: "STL", positions: ["C"], age: 26, currentRank: 170, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 157, name: "J.R. Ritchie", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["SP"], age: 23, currentRank: 340, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 158, name: "J.T. Realmuto", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["C"], age: 35, currentRank: 250, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 159, name: "Jac Caglianone", fantasyTeam: "Gunnarrhea", mlbTeam: "KC", positions: ["1B"], age: 23, currentRank: 185, futureTier: "prospectElite", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 160, name: "Jack Flaherty", fantasyTeam: "BTA Boyz", mlbTeam: "DET", positions: ["SP"], age: 30, currentRank: 235, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 161, name: "Jackson Chourio", fantasyTeam: "John's Super Team", mlbTeam: "MIL", positions: ["OF"], age: 22, currentRank: 22, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 162, name: "Jackson Holliday", fantasyTeam: "Gunnarrhea", mlbTeam: "BAL", positions: ["2B", "SS"], age: 22, currentRank: 58, futureTier: "cornerstone", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 163, name: "Jackson Jobe", fantasyTeam: "Gunnarrhea", mlbTeam: "DET", positions: ["SP"], age: 23, currentRank: 235, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 164, name: "Jackson Merrill", fantasyTeam: "Dixon Cider", mlbTeam: "SD", positions: ["OF"], age: 23, currentRank: 29, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 165, name: "Jacob deGrom", fantasyTeam: "You Don't Know Bo", mlbTeam: "TEX", positions: ["SP"], age: 38, currentRank: 145, futureTier: "shortTerm", categoryFitTier: "eliteStarter", riskTier: "veryHigh", needsReview: false },
  { id: 166, name: "Jacob Misiorowski", fantasyTeam: "This Is Mizerable", mlbTeam: "MIL", positions: ["SP"], age: 24, currentRank: 180, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 167, name: "Jacob Wilson", fantasyTeam: "Me So Heorny", mlbTeam: "ATH", positions: ["SS"], age: 24, currentRank: 125, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 168, name: "Jacob Young", fantasyTeam: "BTA Boyz", mlbTeam: "WSH", positions: ["OF"], age: 27, currentRank: 285, futureTier: "useful", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 169, name: "Jake Bauers", fantasyTeam: "BTA Boyz", mlbTeam: "MIL", positions: ["1B", "OF"], age: 30, currentRank: 360, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 170, name: "Jake Latz", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "TEX", positions: ["RP"], age: 30, currentRank: 390, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 171, name: "Jakob Marsee", fantasyTeam: "Dixon Cider", mlbTeam: "MIA", positions: ["OF"], age: 25, currentRank: 300, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 172, name: "James Wood", fantasyTeam: "Gunnarrhea", mlbTeam: "WSH", positions: ["OF"], age: 23, currentRank: 24, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 173, name: "Jamie Arnold", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATH", positions: ["SP"], age: 22, currentRank: 320, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 174, name: "Jared Jones", fantasyTeam: "This Is Mizerable", mlbTeam: "PIT", positions: ["SP"], age: 24, currentRank: 175, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 175, name: "Jarlin Susana", fantasyTeam: "Mactown MacDaddies", mlbTeam: "WSH", positions: ["SP"], age: 22, currentRank: 340, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 176, name: "Jarren Duran", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BOS", positions: ["OF"], age: 29, currentRank: 68, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 177, name: "Jason Adam", fantasyTeam: "This Is Mizerable", mlbTeam: "SD", positions: ["RP"], age: 35, currentRank: 300, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 178, name: "Jaxon Wiggins", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["SP"], age: 24, currentRank: 340, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 179, name: "Jazz Chisholm Jr.", fantasyTeam: "BB's Bold Team", mlbTeam: "NYY", positions: ["2B", "OF"], age: 28, currentRank: 115, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "high", needsReview: false },
  { id: 180, name: "Jeffrey Springs", fantasyTeam: "BTA Boyz", mlbTeam: "", positions: ["SP"], age: 29, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 181, name: "Jeremy Pena", fantasyTeam: "This Is Mizerable", mlbTeam: "HOU", positions: ["SS"], age: 28, currentRank: 170, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 182, name: "Jesus Luzardo", fantasyTeam: "Me So Heorny", mlbTeam: "PHI", positions: ["SP"], age: 28, currentRank: 105, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 183, name: "Jesus Made", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIL", positions: ["SS"], age: 19, currentRank: 190, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 184, name: "Jett Williams", fantasyTeam: "Mactown MacDaddies", mlbTeam: "NYM", positions: ["SS", "OF"], age: 22, currentRank: 230, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 185, name: "Jhoan Duran", fantasyTeam: "BB's Bold Team", mlbTeam: "MIN", positions: ["RP"], age: 28, currentRank: 165, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 186, name: "JJ Bleday", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATH", positions: ["OF"], age: 28, currentRank: 280, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 187, name: "JJ Wetherholt", fantasyTeam: "John's Super Team", mlbTeam: "STL", positions: ["2B", "SS"], age: 23, currentRank: 240, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 188, name: "Jo Adell", fantasyTeam: "Me So Heorny", mlbTeam: "LAA", positions: ["OF"], age: 27, currentRank: 260, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 189, name: "Joe Mack", fantasyTeam: "Gunnarrhea", mlbTeam: "MIA", positions: ["C"], age: 25, currentRank: 330, futureTier: "prospectLow", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 190, name: "Joe Musgrove", fantasyTeam: "John's Super Team", mlbTeam: "SD", positions: ["SP"], age: 33, currentRank: 245, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 191, name: "Joe Ryan", fantasyTeam: "Gunnarrhea", mlbTeam: "MIN", positions: ["SP"], age: 30, currentRank: 80, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 192, name: "Joey Wiemer", fantasyTeam: "Mactown MacDaddies", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 193, name: "Jonah Tong", fantasyTeam: "Me So Heorny", mlbTeam: "NYM", positions: ["SP"], age: 23, currentRank: 320, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 194, name: "Jonathan Aranda", fantasyTeam: "You Don't Know Bo", mlbTeam: "TB", positions: ["1B", "2B"], age: 28, currentRank: 230, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 195, name: "Jordan Lawlar", fantasyTeam: "This Is Mizerable", mlbTeam: "ARI", positions: ["SS"], age: 24, currentRank: 245, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 196, name: "Jordan Walker", fantasyTeam: "BB's Bold Team", mlbTeam: "STL", positions: ["OF", "1B"], age: 24, currentRank: 190, futureTier: "star", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 197, name: "Jordan Westburg", fantasyTeam: "You Don't Know Bo", mlbTeam: "BAL", positions: ["2B", "3B"], age: 27, currentRank: 130, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 198, name: "Jose Altuve", fantasyTeam: "Gunnarrhea", mlbTeam: "HOU", positions: ["2B"], age: 36, currentRank: 175, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 199, name: "Jose Ramirez", fantasyTeam: "Dixon Cider", mlbTeam: "CLE", positions: ["3B"], age: 33, currentRank: 17, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 200, name: "Jose Soriano", fantasyTeam: "John's Super Team", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 201, name: "Josh Hader", fantasyTeam: "Gunnarrhea", mlbTeam: "HOU", positions: ["RP"], age: 32, currentRank: 140, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 202, name: "Josh Jung", fantasyTeam: "This Is Mizerable", mlbTeam: "TEX", positions: ["3B"], age: 28, currentRank: 165, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 203, name: "Josh Naylor", fantasyTeam: "John's Super Team", mlbTeam: "ARI", positions: ["1B"], age: 29, currentRank: 110, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 204, name: "Josue Briceno", fantasyTeam: "John's Super Team", mlbTeam: "DET", positions: ["C", "1B"], age: 21, currentRank: 300, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 205, name: "Josue De Paula", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAD", positions: ["OF"], age: 21, currentRank: 235, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 206, name: "Juan Soto", fantasyTeam: "John's Super Team", mlbTeam: "NYM", positions: ["OF"], age: 27, currentRank: 3, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "veryLow", needsReview: false },
  { id: 207, name: "Julio Rodriguez", fantasyTeam: "John's Super Team", mlbTeam: "SEA", positions: ["OF"], age: 25, currentRank: 12, futureTier: "elite", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 208, name: "Jung Hoo Lee", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["OF"], age: 27, currentRank: 160, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 209, name: "Junior Caminero", fantasyTeam: "You Don't Know Bo", mlbTeam: "TB", positions: ["3B"], age: 23, currentRank: 27, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 210, name: "Jurrangelo Cijntje", fantasyTeam: "This Is Mizerable", mlbTeam: "SEA", positions: ["SP"], age: 23, currentRank: 340, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 211, name: "Justin Steele", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["SP"], age: 30, currentRank: 175, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 212, name: "Justin Wrobleski", fantasyTeam: "BB's Bold Team", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 213, name: "Kade Anderson", fantasyTeam: "This Is Mizerable", mlbTeam: "SEA", positions: ["SP"], age: 22, currentRank: 320, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 214, name: "Kaelen Culpepper", fantasyTeam: "This Is Mizerable", mlbTeam: "MIN", positions: ["SS"], age: 23, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 215, name: "Kazuma Okamoto", fantasyTeam: "Gunnarrhea", mlbTeam: "JPN", positions: ["1B", "3B"], age: 30, currentRank: 270, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 216, name: "Keibert Ruiz", fantasyTeam: "You Don't Know Bo", mlbTeam: "WSH", positions: ["C"], age: 27, currentRank: 240, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 217, name: "Ketel Marte", fantasyTeam: "Dixon Cider", mlbTeam: "ARI", positions: ["2B"], age: 32, currentRank: 75, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 218, name: "Kevin Gausman", fantasyTeam: "Mactown MacDaddies", mlbTeam: "TOR", positions: ["SP"], age: 35, currentRank: 230, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 219, name: "Kevin Kelly", fantasyTeam: "This Is Mizerable", mlbTeam: "TB", positions: ["RP"], age: 28, currentRank: 360, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 220, name: "Kevin McGonigle", fantasyTeam: "BTA Boyz", mlbTeam: "DET", positions: ["2B", "SS"], age: 21, currentRank: 220, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 221, name: "Konnor Griffin", fantasyTeam: "Gunnarrhea", mlbTeam: "PIT", positions: ["SS", "OF"], age: 20, currentRank: 220, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 222, name: "Kris Bubic", fantasyTeam: "This Is Mizerable", mlbTeam: "KC", positions: ["SP", "RP"], age: 29, currentRank: 230, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 223, name: "Kristian Campbell", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BOS", positions: ["2B", "OF"], age: 24, currentRank: 220, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 224, name: "Kruz Schoolcraft", fantasyTeam: "Dixon Cider", mlbTeam: "SD", positions: ["SP"], age: 19, currentRank: 350, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 225, name: "Kyle Bradish", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 226, name: "Kyle Harrison", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "", positions: ["SP"], age: 29, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 227, name: "Kyle Hurt", fantasyTeam: "You Don't Know Bo", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 228, name: "Kyle Schwarber", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["OF", "DH"], age: 33, currentRank: 50, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 229, name: "Kyle Stowers", fantasyTeam: "Gunnarrhea", mlbTeam: "MIA", positions: ["OF"], age: 28, currentRank: 185, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 230, name: "Kyle Teel", fantasyTeam: "Gunnarrhea", mlbTeam: "CHW", positions: ["C"], age: 24, currentRank: 160, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 231, name: "Kyle Tucker", fantasyTeam: "BB's Bold Team", mlbTeam: "CHC", positions: ["OF"], age: 29, currentRank: 18, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 232, name: "Kyson Witherspoon", fantasyTeam: "Me So Heorny", mlbTeam: "BOS", positions: ["SP"], age: 22, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 233, name: "Lance McCullers Jr.", fantasyTeam: "BTA Boyz", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 234, name: "Lawrence Butler", fantasyTeam: "Gunnarrhea", mlbTeam: "ATH", positions: ["OF"], age: 25, currentRank: 125, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 235, name: "Lazaro Montes", fantasyTeam: "Me So Heorny", mlbTeam: "SEA", positions: ["OF"], age: 21, currentRank: 245, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 236, name: "Leo De Vries", fantasyTeam: "Dixon Cider", mlbTeam: "ATH", positions: ["SS"], age: 19, currentRank: 180, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 237, name: "Liam Doyle", fantasyTeam: "Dixon Cider", mlbTeam: "STL", positions: ["SP"], age: 22, currentRank: 350, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 238, name: "Liam Hicks", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["C"], age: 27, currentRank: 260, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 239, name: "Logan Gilbert", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SEA", positions: ["SP"], age: 29, currentRank: 48, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 240, name: "Logan Henderson", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIL", positions: ["SP"], age: 24, currentRank: 300, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 241, name: "Logan O'Hoppe", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAA", positions: ["C"], age: 26, currentRank: 155, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 242, name: "Logan Webb", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["SP"], age: 29, currentRank: 64, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 243, name: "Louis Varland", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "MIN", positions: ["SP", "RP"], age: 28, currentRank: 290, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "medium", needsReview: false },
  { id: 244, name: "Lucas Erceg", fantasyTeam: "John's Super Team", mlbTeam: "KC", positions: ["RP"], age: 31, currentRank: 280, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 245, name: "Lucas Ramirez", fantasyTeam: "This Is Mizerable", mlbTeam: "LAA", positions: ["OF"], age: 20, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 246, name: "Luis Arraez", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SD", positions: ["1B", "2B"], age: 29, currentRank: 165, futureTier: "solidKeeper", categoryFitTier: "flawedHitter", riskTier: "low", needsReview: false },
  { id: 247, name: "Luis Pena", fantasyTeam: "Dixon Cider", mlbTeam: "", positions: ["UTIL"], age: 22, currentRank: 340, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 248, name: "Luis Robert Jr.", fantasyTeam: "This Is Mizerable", mlbTeam: "CHW", positions: ["OF"], age: 28, currentRank: 135, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 249, name: "LuJames Groover", fantasyTeam: "BB's Bold Team", mlbTeam: "ARI", positions: ["3B"], age: 24, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 250, name: "Luke Keaschall", fantasyTeam: "John's Super Team", mlbTeam: "MIN", positions: ["2B", "OF"], age: 24, currentRank: 230, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 251, name: "Luke Raley", fantasyTeam: "Mactown MacDaddies", mlbTeam: "SEA", positions: ["1B", "OF"], age: 31, currentRank: 260, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 252, name: "MacKenzie Gore", fantasyTeam: "BTA Boyz", mlbTeam: "WSH", positions: ["SP"], age: 27, currentRank: 98, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 253, name: "Maikel Garcia", fantasyTeam: "This Is Mizerable", mlbTeam: "KC", positions: ["3B", "SS"], age: 26, currentRank: 140, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 254, name: "Manny Machado", fantasyTeam: "John's Super Team", mlbTeam: "SD", positions: ["3B"], age: 33, currentRank: 105, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 255, name: "Marcelo Mayer", fantasyTeam: "Dixon Cider", mlbTeam: "BOS", positions: ["SS"], age: 23, currentRank: 250, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 256, name: "Martin Perez", fantasyTeam: "John's Super Team", mlbTeam: "CHW", positions: ["SP"], age: 35, currentRank: 380, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 257, name: "Mason Miller", fantasyTeam: "Me So Heorny", mlbTeam: "ATH", positions: ["RP"], age: 27, currentRank: 120, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 258, name: "Masyn Winn", fantasyTeam: "BTA Boyz", mlbTeam: "STL", positions: ["SS"], age: 24, currentRank: 125, futureTier: "strongKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 259, name: "Matt Brash", fantasyTeam: "This Is Mizerable", mlbTeam: "SEA", positions: ["RP"], age: 28, currentRank: 300, futureTier: "useful", categoryFitTier: "eliteReliever", riskTier: "injured", needsReview: false },
  { id: 260, name: "Matt Chapman", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["3B"], age: 33, currentRank: 175, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 261, name: "Matt McLain", fantasyTeam: "Dixon Cider", mlbTeam: "CIN", positions: ["2B", "SS"], age: 26, currentRank: 78, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "high", needsReview: false },
  { id: 262, name: "Matt Olson", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATL", positions: ["1B"], age: 32, currentRank: 40, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 263, name: "Matt Shaw", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["2B", "3B"], age: 24, currentRank: 210, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 264, name: "Matthew Boyd", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["SP"], age: 35, currentRank: 300, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 265, name: "Mauricio Dubon", fantasyTeam: "Me So Heorny", mlbTeam: "HOU", positions: ["2B", "OF"], age: 31, currentRank: 330, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 266, name: "Max Clark", fantasyTeam: "Dixon Cider", mlbTeam: "DET", positions: ["OF"], age: 21, currentRank: 185, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 267, name: "Max Fried", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "NYY", positions: ["SP"], age: 32, currentRank: 86, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 268, name: "Max Meyer", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIA", positions: ["SP"], age: 27, currentRank: 230, futureTier: "solidKeeper", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 269, name: "Max Muncy", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["3B"], age: 35, currentRank: 240, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 270, name: "Michael Busch", fantasyTeam: "John's Super Team", mlbTeam: "CHC", positions: ["1B"], age: 28, currentRank: 135, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 271, name: "Michael Harris II", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATL", positions: ["OF"], age: 25, currentRank: 145, futureTier: "strongKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 272, name: "Michael King", fantasyTeam: "Gunnarrhea", mlbTeam: "SD", positions: ["SP"], age: 31, currentRank: 155, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 273, name: "Michael McGreevy", fantasyTeam: "Dixon Cider", mlbTeam: "STL", positions: ["SP"], age: 26, currentRank: 320, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 274, name: "Michael Soroka", fantasyTeam: "Me So Heorny", mlbTeam: "WSH", positions: ["SP"], age: 28, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 275, name: "Michael Wacha", fantasyTeam: "BTA Boyz", mlbTeam: "KC", positions: ["SP"], age: 34, currentRank: 300, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 276, name: "Mick Abel", fantasyTeam: "BB's Bold Team", mlbTeam: "PHI", positions: ["SP"], age: 25, currentRank: 340, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 277, name: "Mickey Moniak", fantasyTeam: "Me So Heorny", mlbTeam: "LAA", positions: ["OF"], age: 28, currentRank: 330, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 278, name: "Miguel Vargas", fantasyTeam: "Gunnarrhea", mlbTeam: "CHW", positions: ["2B", "3B", "OF"], age: 26, currentRank: 240, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 279, name: "Mike Sirota", fantasyTeam: "John's Super Team", mlbTeam: "LAD", positions: ["OF"], age: 22, currentRank: 350, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 280, name: "Mike Trout", fantasyTeam: "BTA Boyz", mlbTeam: "LAA", positions: ["OF"], age: 34, currentRank: 190, futureTier: "shortTerm", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 281, name: "Mitch Keller", fantasyTeam: "John's Super Team", mlbTeam: "PIT", positions: ["SP"], age: 30, currentRank: 245, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 282, name: "Moises Ballesteros", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["C", "1B"], age: 22, currentRank: 240, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 283, name: "Mookie Betts", fantasyTeam: "Me So Heorny", mlbTeam: "LAD", positions: ["OF", "2B", "SS"], age: 33, currentRank: 45, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 284, name: "Munetaka Murakami", fantasyTeam: "Mactown MacDaddies", mlbTeam: "JPN", positions: ["1B", "3B"], age: 26, currentRank: 190, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 285, name: "Nate George", fantasyTeam: "BTA Boyz", mlbTeam: "BAL", positions: ["OF"], age: 21, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "speedOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 286, name: "Nathan Eovaldi", fantasyTeam: "Me So Heorny", mlbTeam: "TEX", positions: ["SP"], age: 36, currentRank: 280, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 287, name: "Nestor Cortes Jr.", fantasyTeam: "BTA Boyz", mlbTeam: "", positions: ["UTIL"], age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 288, name: "Nick Kurtz", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATH", positions: ["1B"], age: 23, currentRank: 35, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 289, name: "Nick Lodolo", fantasyTeam: "John's Super Team", mlbTeam: "CIN", positions: ["SP"], age: 28, currentRank: 190, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 290, name: "Nick Martinez", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CIN", positions: ["SP", "RP"], age: 35, currentRank: 320, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 291, name: "Nick Pivetta", fantasyTeam: "Mactown MacDaddies", mlbTeam: "SD", positions: ["SP"], age: 33, currentRank: 285, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 292, name: "Nico Hoerner", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["2B", "SS"], age: 29, currentRank: 190, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 293, name: "Noah Schultz", fantasyTeam: "Gunnarrhea", mlbTeam: "CHW", positions: ["SP"], age: 22, currentRank: 250, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 294, name: "Noble Meyer", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["SP"], age: 21, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 295, name: "Noelvi Marte", fantasyTeam: "This Is Mizerable", mlbTeam: "CIN", positions: ["3B"], age: 24, currentRank: 270, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 296, name: "Nolan Arenado", fantasyTeam: "John's Super Team", mlbTeam: "STL", positions: ["3B"], age: 35, currentRank: 240, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 297, name: "Nolan McLean", fantasyTeam: "Dixon Cider", mlbTeam: "NYM", positions: ["SP"], age: 25, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 298, name: "Oneil Cruz", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "PIT", positions: ["SS", "OF"], age: 27, currentRank: 55, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 299, name: "Otto Lopez", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIA", positions: ["2B", "SS"], age: 27, currentRank: 230, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 300, name: "Owen Caissie", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["OF"], age: 23, currentRank: 220, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 301, name: "Ozzie Albies", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["2B"], age: 29, currentRank: 105, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 302, name: "Pablo Lopez", fantasyTeam: "This Is Mizerable", mlbTeam: "MIN", positions: ["SP"], age: 30, currentRank: 74, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 303, name: "Parker Messick", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["SP"], age: 25, currentRank: 340, futureTier: "prospectLow", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 304, name: "Paul Goldschmidt", fantasyTeam: "John's Super Team", mlbTeam: "NYY", positions: ["1B"], age: 38, currentRank: 220, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 305, name: "Paul Sewald", fantasyTeam: "BB's Bold Team", mlbTeam: "CLE", positions: ["RP"], age: 36, currentRank: 340, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 306, name: "Paul Skenes", fantasyTeam: "BTA Boyz", mlbTeam: "PIT", positions: ["SP"], age: 24, currentRank: 9, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 307, name: "Payton Tolle", fantasyTeam: "Me So Heorny", mlbTeam: "BOS", positions: ["SP"], age: 23, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 308, name: "Pete Alonso", fantasyTeam: "Dixon Cider", mlbTeam: "NYM", positions: ["1B"], age: 31, currentRank: 70, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 309, name: "Pete Crow-Armstrong", fantasyTeam: "BB's Bold Team", mlbTeam: "CHC", positions: ["OF"], age: 24, currentRank: 31, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 310, name: "Pete Fairbanks", fantasyTeam: "John's Super Team", mlbTeam: "TB", positions: ["RP"], age: 32, currentRank: 260, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 311, name: "Quinn Mathews", fantasyTeam: "You Don't Know Bo", mlbTeam: "STL", positions: ["SP"], age: 25, currentRank: 300, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 312, name: "Rafael Devers", fantasyTeam: "Gunnarrhea", mlbTeam: "SF", positions: ["3B", "1B"], age: 29, currentRank: 60, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 313, name: "Rainiel Rodriguez", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "STL", positions: ["C"], age: 19, currentRank: 320, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 314, name: "Raisel Iglesias", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATL", positions: ["RP"], age: 36, currentRank: 220, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 315, name: "Ralphy Velazquez", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CLE", positions: ["C", "1B"], age: 21, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 316, name: "Randy Arozarena", fantasyTeam: "You Don't Know Bo", mlbTeam: "SEA", positions: ["OF"], age: 31, currentRank: 185, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 317, name: "Ranger Suarez", fantasyTeam: "John's Super Team", mlbTeam: "PHI", positions: ["SP"], age: 30, currentRank: 240, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 318, name: "Reid Detmers", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAA", positions: ["SP"], age: 27, currentRank: 275, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 319, name: "Rhett Lowder", fantasyTeam: "BTA Boyz", mlbTeam: "CIN", positions: ["SP"], age: 24, currentRank: 260, futureTier: "prospectHigh", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 320, name: "Rico Garcia", fantasyTeam: "BTA Boyz", mlbTeam: "NYM", positions: ["RP"], age: 32, currentRank: 400, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 321, name: "Riley Greene", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "DET", positions: ["OF"], age: 25, currentRank: 28, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 322, name: "Riley O'Brien", fantasyTeam: "Gunnarrhea", mlbTeam: "STL", positions: ["RP"], age: 31, currentRank: 380, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 323, name: "Robbie Ray", fantasyTeam: "Dixon Cider", mlbTeam: "SF", positions: ["SP"], age: 34, currentRank: 260, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 324, name: "Robby Snelling", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIA", positions: ["SP"], age: 22, currentRank: 240, futureTier: "prospectElite", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 325, name: "Robert Gasser", fantasyTeam: "Gunnarrhea", mlbTeam: "MIL", positions: ["SP"], age: 27, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "injured", needsReview: false },
  { id: 326, name: "Robert Suarez", fantasyTeam: "John's Super Team", mlbTeam: "SD", positions: ["RP"], age: 35, currentRank: 230, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 327, name: "Roki Sasaki", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAD", positions: ["SP"], age: 24, currentRank: 125, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 328, name: "Roman Anthony", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "BOS", positions: ["OF"], age: 22, currentRank: 26, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 329, name: "Ronald Acuna Jr.", fantasyTeam: "Gunnarrhea", mlbTeam: "ATL", positions: ["OF"], age: 28, currentRank: 8, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "high", needsReview: false },
  { id: 330, name: "Royce Lewis", fantasyTeam: "Me So Heorny", mlbTeam: "MIN", positions: ["3B"], age: 27, currentRank: 135, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 331, name: "Ryan Helsley", fantasyTeam: "Mactown MacDaddies", mlbTeam: "STL", positions: ["RP"], age: 32, currentRank: 190, futureTier: "useful", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 332, name: "Ryan Jeffers", fantasyTeam: "John's Super Team", mlbTeam: "MIN", positions: ["C"], age: 29, currentRank: 230, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 333, name: "Ryan O'Hearn", fantasyTeam: "You Don't Know Bo", mlbTeam: "BAL", positions: ["1B", "OF"], age: 32, currentRank: 240, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 334, name: "Ryan Sloan", fantasyTeam: "John's Super Team", mlbTeam: "SEA", positions: ["SP"], age: 20, currentRank: 290, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 335, name: "Ryan Waldschmidt", fantasyTeam: "Gunnarrhea", mlbTeam: "ARI", positions: ["OF"], age: 23, currentRank: 300, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 336, name: "Ryan Weathers", fantasyTeam: "BB's Bold Team", mlbTeam: "MIA", positions: ["SP"], age: 26, currentRank: 290, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 337, name: "Sal Stewart", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CIN", positions: ["1B", "3B"], age: 22, currentRank: 300, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 338, name: "Sam Antonacci", fantasyTeam: "Dixon Cider", mlbTeam: "CHW", positions: ["2B", "SS"], age: 23, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 339, name: "Samuel Basallo", fantasyTeam: "Dixon Cider", mlbTeam: "BAL", positions: ["C", "1B"], age: 22, currentRank: 115, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 340, name: "Sandy Alcantara", fantasyTeam: "BB's Bold Team", mlbTeam: "MIA", positions: ["SP"], age: 30, currentRank: 130, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 341, name: "Sebastian Walcott", fantasyTeam: "Dixon Cider", mlbTeam: "TEX", positions: ["SS", "3B"], age: 20, currentRank: 225, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 342, name: "Seiya Suzuki", fantasyTeam: "Dixon Cider", mlbTeam: "CHC", positions: ["OF"], age: 31, currentRank: 155, futureTier: "solidKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 343, name: "Seth Hernandez", fantasyTeam: "Dixon Cider", mlbTeam: "PIT", positions: ["SP"], age: 20, currentRank: 330, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 344, name: "Seth Lugo", fantasyTeam: "You Don't Know Bo", mlbTeam: "KC", positions: ["SP"], age: 36, currentRank: 270, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 345, name: "Shane Baz", fantasyTeam: "This Is Mizerable", mlbTeam: "TB", positions: ["SP"], age: 27, currentRank: 210, futureTier: "strongKeeper", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 346, name: "Shane Bieber", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "TOR", positions: ["SP"], age: 31, currentRank: 215, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 347, name: "Shane McClanahan", fantasyTeam: "BB's Bold Team", mlbTeam: "TB", positions: ["SP"], age: 29, currentRank: 200, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 348, name: "Shea Langeliers", fantasyTeam: "BB's Bold Team", mlbTeam: "ATH", positions: ["C"], age: 28, currentRank: 160, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 349, name: "Shohei Ohtani", fantasyTeam: "Dixon Cider", mlbTeam: "LAD", positions: ["DH", "SP"], age: 31, currentRank: 1, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 350, name: "Shohei Ohtani-H", fantasyTeam: "Dixon Cider", mlbTeam: "LAD", positions: ["DH"], age: 31, currentRank: 1, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 351, name: "Shohei Ohtani-P", fantasyTeam: "Dixon Cider", mlbTeam: "LAD", positions: ["SP"], age: 31, currentRank: 90, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 352, name: "Shota Imanaga", fantasyTeam: "Dixon Cider", mlbTeam: "CHC", positions: ["SP"], age: 32, currentRank: 88, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 353, name: "Slade Cecconi", fantasyTeam: "John's Super Team", mlbTeam: "ARI", positions: ["SP"], age: 27, currentRank: 310, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 354, name: "Sonny Gray", fantasyTeam: "BB's Bold Team", mlbTeam: "STL", positions: ["SP"], age: 36, currentRank: 250, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 355, name: "Spencer Arrighetti", fantasyTeam: "Mactown MacDaddies", mlbTeam: "HOU", positions: ["SP"], age: 26, currentRank: 240, futureTier: "solidKeeper", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 356, name: "Spencer Schwellenbach", fantasyTeam: "Dixon Cider", mlbTeam: "ATL", positions: ["SP"], age: 26, currentRank: 150, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 357, name: "Spencer Steer", fantasyTeam: "This Is Mizerable", mlbTeam: "CIN", positions: ["1B", "3B", "OF"], age: 28, currentRank: 170, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 358, name: "Spencer Strider", fantasyTeam: "This Is Mizerable", mlbTeam: "ATL", positions: ["SP"], age: 28, currentRank: 56, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 359, name: "Spencer Torkelson", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "DET", positions: ["1B"], age: 26, currentRank: 130, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 360, name: "Stephen Kolek", fantasyTeam: "You Don't Know Bo", mlbTeam: "SD", positions: ["SP"], age: 29, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 361, name: "Steven Kwan", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["OF"], age: 28, currentRank: 120, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 362, name: "T.J. Rumfield", fantasyTeam: "This Is Mizerable", mlbTeam: "NYY", positions: ["1B"], age: 26, currentRank: 370, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 363, name: "Taj Bradley", fantasyTeam: "This Is Mizerable", mlbTeam: "TB", positions: ["SP"], age: 25, currentRank: 220, futureTier: "strongKeeper", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 364, name: "Tanner Bibee", fantasyTeam: "You Don't Know Bo", mlbTeam: "CLE", positions: ["SP"], age: 27, currentRank: 84, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 365, name: "Tanner Scott", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "LAD", positions: ["RP"], age: 31, currentRank: 220, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 366, name: "Tarik Skubal", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "DET", positions: ["SP"], age: 29, currentRank: 10, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 367, name: "Tatsuya Imai", fantasyTeam: "Dixon Cider", mlbTeam: "JPN", positions: ["SP"], age: 28, currentRank: 260, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 368, name: "Taylor Ward", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAA", positions: ["OF"], age: 32, currentRank: 230, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 369, name: "Teoscar Hernandez", fantasyTeam: "BTA Boyz", mlbTeam: "LAD", positions: ["OF"], age: 33, currentRank: 170, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 370, name: "Thomas White", fantasyTeam: "Mactown MacDaddies", mlbTeam: "MIA", positions: ["SP"], age: 21, currentRank: 330, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 371, name: "Tink Hence", fantasyTeam: "You Don't Know Bo", mlbTeam: "STL", positions: ["SP"], age: 23, currentRank: 295, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 372, name: "Tommy Edman", fantasyTeam: "BB's Bold Team", mlbTeam: "LAD", positions: ["2B", "SS", "OF"], age: 31, currentRank: 220, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 373, name: "Travis Bazzana", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["2B"], age: 23, currentRank: 225, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 374, name: "Travis Sykora", fantasyTeam: "John's Super Team", mlbTeam: "WSH", positions: ["SP"], age: 22, currentRank: 270, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 375, name: "Trea Turner", fantasyTeam: "Gunnarrhea", mlbTeam: "PHI", positions: ["SS"], age: 33, currentRank: 30, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 376, name: "Trevor Megill", fantasyTeam: "BB's Bold Team", mlbTeam: "MIL", positions: ["RP"], age: 32, currentRank: 240, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 377, name: "Trevor Story", fantasyTeam: "You Don't Know Bo", mlbTeam: "BOS", positions: ["SS"], age: 33, currentRank: 260, futureTier: "shortTerm", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: false },
  { id: 378, name: "Trey Yesavage", fantasyTeam: "Dixon Cider", mlbTeam: "TOR", positions: ["SP"], age: 23, currentRank: 320, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 379, name: "Troy Johnston", fantasyTeam: "BTA Boyz", mlbTeam: "MIA", positions: ["1B", "OF"], age: 29, currentRank: 380, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 380, name: "Tyler Black", fantasyTeam: "BB's Bold Team", mlbTeam: "MIL", positions: ["1B", "3B"], age: 25, currentRank: 270, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 381, name: "Tyler Glasnow", fantasyTeam: "Gunnarrhea", mlbTeam: "LAD", positions: ["SP"], age: 32, currentRank: 150, futureTier: "strongKeeper", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 382, name: "Tyler O'Neill", fantasyTeam: "Dixon Cider", mlbTeam: "BAL", positions: ["OF"], age: 31, currentRank: 240, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 383, name: "Tyler Rogers", fantasyTeam: "Dixon Cider", mlbTeam: "SF", positions: ["RP"], age: 35, currentRank: 350, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 384, name: "Tyler Soderstrom", fantasyTeam: "This Is Mizerable", mlbTeam: "ATH", positions: ["1B", "C"], age: 24, currentRank: 140, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 385, name: "Vinnie Pasquantino", fantasyTeam: "BB's Bold Team", mlbTeam: "KC", positions: ["1B"], age: 28, currentRank: 115, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 386, name: "Vladimir Guerrero Jr.", fantasyTeam: "This Is Mizerable", mlbTeam: "TOR", positions: ["1B"], age: 27, currentRank: 16, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 387, name: "Walbert Urena", fantasyTeam: "This Is Mizerable", mlbTeam: "LAA", positions: ["SP"], age: 22, currentRank: 390, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 388, name: "Walker Jenkins", fantasyTeam: "This Is Mizerable", mlbTeam: "MIN", positions: ["OF"], age: 21, currentRank: 215, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 389, name: "Will Smith", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["C"], age: 31, currentRank: 92, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 390, name: "Will Warren", fantasyTeam: "BB's Bold Team", mlbTeam: "NYY", positions: ["SP"], age: 27, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 391, name: "William Contreras", fantasyTeam: "BTA Boyz", mlbTeam: "MIL", positions: ["C", "DH"], age: 28, currentRank: 80, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 392, name: "Willson Contreras", fantasyTeam: "Me So Heorny", mlbTeam: "STL", positions: ["C", "DH"], age: 34, currentRank: 210, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 393, name: "Willy Adames", fantasyTeam: "John's Super Team", mlbTeam: "SF", positions: ["SS"], age: 30, currentRank: 135, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 394, name: "Wilson Rodriguez", fantasyTeam: "BB's Bold Team", mlbTeam: "NYM", positions: ["C"], age: 20, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 395, name: "Wilyer Abreu", fantasyTeam: "This Is Mizerable", mlbTeam: "BOS", positions: ["OF"], age: 27, currentRank: 175, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 396, name: "Wyatt Langford", fantasyTeam: "BB's Bold Team", mlbTeam: "TEX", positions: ["OF"], age: 24, currentRank: 20, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 397, name: "Xander Bogaerts", fantasyTeam: "You Don't Know Bo", mlbTeam: "SD", positions: ["SS"], age: 33, currentRank: 230, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 398, name: "Xavier Edwards", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["2B", "SS"], age: 26, currentRank: 150, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 399, name: "Yainer Diaz", fantasyTeam: "John's Super Team", mlbTeam: "HOU", positions: ["C"], age: 27, currentRank: 95, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 400, name: "Yandy Diaz", fantasyTeam: "BB's Bold Team", mlbTeam: "TB", positions: ["1B", "3B"], age: 34, currentRank: 155, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 401, name: "Yordan Alvarez", fantasyTeam: "Dixon Cider", mlbTeam: "HOU", positions: ["OF", "DH"], age: 29, currentRank: 13, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 402, name: "Yoshinobu Yamamoto", fantasyTeam: "BB's Bold Team", mlbTeam: "LAD", positions: ["SP"], age: 27, currentRank: 42, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 403, name: "Yu Darvish", fantasyTeam: "BTA Boyz", mlbTeam: "SD", positions: ["SP"], age: 39, currentRank: 360, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 404, name: "Zac Gallen", fantasyTeam: "BTA Boyz", mlbTeam: "ARI", positions: ["SP"], age: 30, currentRank: 170, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 405, name: "Zach Neto", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "LAA", positions: ["SS"], age: 25, currentRank: 115, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 406, name: "Zack Gelof", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATH", positions: ["2B"], age: 26, currentRank: 290, futureTier: "useful", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: false },
  { id: 407, name: "Zack Wheeler", fantasyTeam: "Me So Heorny", mlbTeam: "PHI", positions: ["SP"], age: 36, currentRank: 35, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 408, name: "Zyhir Hope", fantasyTeam: "Gunnarrhea", mlbTeam: "LAD", positions: ["OF"], age: 21, currentRank: 300, futureTier: "prospectMedium", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false }
];

export const players = RAW_PLAYERS.map(calculateDynastyValue).sort((a, b) => b.dynastyValue - a.dynastyValue);

export const playersByName = new Map(players.map((player) => [normalizeName(player.name), player]));

export function findPlayerByName(name) {
  return playersByName.get(normalizeName(name));
}

export function getPlayersByFantasyTeam(fantasyTeam) {
  const search = fantasyTeam.trim().toLowerCase();
  return players.filter((player) => player.fantasyTeam.toLowerCase() === search);
}

export function getTradeSideValue(playerNames = []) {
  return playerNames.reduce((total, playerName) => {
    const player = findPlayerByName(playerName);
    return total + (player?.dynastyValue ?? 0);
  }, 0);
}

export function analyzeTrade(sideAPlayerNames = [], sideBPlayerNames = []) {
  const sideAPlayers = sideAPlayerNames.map(findPlayerByName).filter(Boolean);
  const sideBPlayers = sideBPlayerNames.map(findPlayerByName).filter(Boolean);
  const missingSideA = sideAPlayerNames.filter((name) => !findPlayerByName(name));
  const missingSideB = sideBPlayerNames.filter((name) => !findPlayerByName(name));
  const sideATotal = sideAPlayers.reduce((sum, player) => sum + player.dynastyValue, 0);
  const sideBTotal = sideBPlayers.reduce((sum, player) => sum + player.dynastyValue, 0);
  const difference = Math.abs(sideATotal - sideBTotal);
  const maxTotal = Math.max(sideATotal, sideBTotal, 1);
  const percentDifference = difference / maxTotal;

  let fairness = "Fair Trade";
  if (percentDifference > 0.22) fairness = "Robbery";
  else if (percentDifference > 0.12) fairness = "Clear Advantage";
  else if (percentDifference > 0.05) fairness = "Slight Advantage";

  return {
    sideAPlayers,
    sideBPlayers,
    missingSideA,
    missingSideB,
    sideATotal,
    sideBTotal,
    winner: sideATotal === sideBTotal ? "Even" : sideATotal > sideBTotal ? "Side A" : "Side B",
    difference,
    percentDifference: Number((percentDifference * 100).toFixed(1)),
    fairness
  };
}

export function getNeedsReviewPlayers() {
  return players.filter((player) => player.needsReview);
}

export function getRosterSummary() {
  return players.reduce((summary, player) => {
    summary[player.fantasyTeam] ??= { totalPlayers: 0, totalValue: 0, needsReview: 0 };
    summary[player.fantasyTeam].totalPlayers += 1;
    summary[player.fantasyTeam].totalValue += player.dynastyValue;
    if (player.needsReview) summary[player.fantasyTeam].needsReview += 1;
    return summary;
  }, {});
}