// players.js
// UTI Dynasty Baseball Trade Analyzer player values
// Generated from fantasy-owners.js and updated with dynasty value inputs for every rostered player.
//
// Notes:
// - fantasy ownership is resolved from fantasy-owners.js, not stored here.
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


export function getCurrentAge(player, asOfDate = new Date()) {
  if (!player.birthDate) return player.age;
  const birthDate = new Date(`${player.birthDate}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return player.age;
  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday =
    asOfDate.getMonth() > birthDate.getMonth() ||
    (asOfDate.getMonth() === birthDate.getMonth() && asOfDate.getDate() >= birthDate.getDate());
  if (!hasHadBirthday) age -= 1;
  return age;
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
  const resolvedAge = getCurrentAge(player);
  const ageValue = getAgeValue(resolvedAge);
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
    age: resolvedAge,
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
  { id: 1, name: "A.J. Ewing", mlbTeam: "NYM", positions: ["OF"], birthDate: "2004-08-10", age: 21, currentRank: 64, futureTier: "prospectLow", categoryFitTier: "speedOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 2, name: "Aaron Ashby", mlbTeam: "", positions: ["SP"], birthDate: "1998-05-24", age: 28, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 3, name: "Aaron Judge", mlbTeam: "NYY", positions: ["OF"], birthDate: "1992-04-26", age: 34, currentRank: 11, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 4, name: "Adley Rutschman", mlbTeam: "BAL", positions: ["C"], birthDate: "1998-02-06", age: 28, currentRank: 230, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 5, name: "Adrian Morejon", mlbTeam: "", positions: ["UTIL"], birthDate: "1999-02-27", age: 27, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 6, name: "Agustin Ramirez", mlbTeam: "MIA", positions: ["C"], birthDate: "2001-09-10", age: 24, currentRank: 145, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 7, name: "Aidan Miller", mlbTeam: "PHI", positions: ["SS"], birthDate: "2004-06-09", age: 22, currentRank: 96, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 8, name: "Aiva Arquette", mlbTeam: "MIA", positions: ["SS"], birthDate: "2003-10-17", age: 22, currentRank: 341, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 9, name: "Alec Bohm", mlbTeam: "PHI", positions: ["3B"], birthDate: "1996-08-03", age: 29, currentRank: 287, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 10, name: "Alec Burleson", mlbTeam: "STL", positions: ["1B"], birthDate: "1998-11-25", age: 27, currentRank: 254, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 11, name: "Alejandro Kirk", mlbTeam: "TOR", positions: ["C"], birthDate: "1998-11-06", age: 27, currentRank: 270, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 12, name: "Alex Bregman", mlbTeam: "CHC", positions: ["3B"], birthDate: "1994-03-30", age: 32, currentRank: 140, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 13, name: "Alfredo Duno", mlbTeam: "CIN", positions: ["C"], birthDate: "2006-01-07", age: 20, currentRank: 273, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 14, name: "Andres Munoz", mlbTeam: "SEA", positions: ["RP"], birthDate: "1999-01-16", age: 27, currentRank: 116, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 15, name: "Andrew Abbott", mlbTeam: "CIN", positions: ["SP"], birthDate: "1999-06-01", age: 27, currentRank: 299, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 16, name: "Andrew Benintendi", mlbTeam: "CHW", positions: ["OF"], birthDate: "1994-07-06", age: 31, currentRank: 330, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 17, name: "Andrew Painter", mlbTeam: "PHI", positions: ["SP"], birthDate: "2003-04-10", age: 23, currentRank: 153, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 18, name: "Andy Pages", mlbTeam: "LAD", positions: ["OF"], birthDate: "2000-12-08", age: 25, currentRank: 72, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 19, name: "Angel Martinez", mlbTeam: "CLE", positions: ["2B", "OF"], birthDate: "2002-01-27", age: 24, currentRank: 310, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 20, name: "Aroldis Chapman", mlbTeam: "BOS", positions: ["RP"], birthDate: "1988-02-28", age: 38, currentRank: 390, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 21, name: "Austin Riley", mlbTeam: "ATL", positions: ["3B"], birthDate: "1997-04-02", age: 29, currentRank: 78, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 22, name: "Bailey Ober", mlbTeam: "MIN", positions: ["SP"], birthDate: "1995-07-12", age: 30, currentRank: 325, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 23, name: "Ben Brown", mlbTeam: "CHC", positions: ["SP"], birthDate: "1999-09-09", age: 26, currentRank: 405, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 24, name: "Ben Rice", mlbTeam: "NYY", positions: ["C"], birthDate: "1999-02-22", age: 27, currentRank: 43, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 25, name: "Billy Carlson", mlbTeam: "CWS", positions: ["SS"], birthDate: "2006-07-29", age: 19, currentRank: 400, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 26, name: "Blake Snell", mlbTeam: "LAD", positions: ["SP"], birthDate: "1992-12-04", age: 33, currentRank: 147, futureTier: "shortTerm", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 27, name: "Blaze Jordan", mlbTeam: "STL", positions: ["1B", "3B"], birthDate: "2002-12-19", age: 23, currentRank: 260, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 28, name: "Bo Bichette", mlbTeam: "NYM", positions: ["SS"], birthDate: "1998-03-05", age: 28, currentRank: 102, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 29, name: "Bobby Witt Jr.", mlbTeam: "KC", positions: ["SS"], birthDate: "2000-06-14", age: 26, currentRank: 3, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "veryLow", needsReview: false },
  { id: 30, name: "Braden Montgomery", mlbTeam: "CWS", positions: ["OF"], birthDate: "2003-04-16", age: 23, currentRank: 251, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 31, name: "Brady Singer", mlbTeam: "CIN", positions: ["SP"], birthDate: "1996-08-04", age: 29, currentRank: 413, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 32, name: "Brandon Lowe", mlbTeam: "PIT", positions: ["2B"], birthDate: "1994-07-06", age: 31, currentRank: 209, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 33, name: "Brandon Marsh", mlbTeam: "PHI", positions: ["OF"], birthDate: "1997-12-18", age: 28, currentRank: 416, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 34, name: "Brandon Nimmo", mlbTeam: "TEX", positions: ["OF"], birthDate: "1993-03-27", age: 33, currentRank: 191, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 35, name: "Brandon Sproat", mlbTeam: "MIL", positions: ["SP"], birthDate: "2000-09-17", age: 25, currentRank: 365, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 36, name: "Brandon Woodruff", mlbTeam: "MIL", positions: ["SP"], birthDate: "1993-02-10", age: 33, currentRank: 212, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 37, name: "Brandon Young", mlbTeam: "BAL", positions: ["SP"], birthDate: "1998-08-19", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 38, name: "Braxton Ashcraft", mlbTeam: "PIT", positions: ["SP"], birthDate: "1999-10-05", age: 26, currentRank: 269, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 39, name: "Brayan Rocchio", mlbTeam: "CLE", positions: ["SS"], birthDate: "2001-01-13", age: 25, currentRank: 479, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 40, name: "Brendan Donovan", mlbTeam: "SEA", positions: ["2B"], birthDate: "1997-01-16", age: 29, currentRank: 308, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 41, name: "Brent Rooker", mlbTeam: "ATH", positions: ["OF"], birthDate: "1994-11-01", age: 31, currentRank: 93, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 42, name: "Brice Turang", mlbTeam: "MIL", positions: ["2B"], birthDate: "1999-11-21", age: 26, currentRank: 58, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "low", needsReview: false },
  { id: 43, name: "Brooks Lee", mlbTeam: "MIN", positions: ["SS"], birthDate: "2001-02-14", age: 25, currentRank: 385, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 44, name: "Bryan Baker", mlbTeam: "TB", positions: ["RP"], birthDate: "1994-12-02", age: 31, currentRank: 380, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 45, name: "Bryan Reynolds", mlbTeam: "PIT", positions: ["OF"], birthDate: "1995-01-27", age: 31, currentRank: 289, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 46, name: "Bryan Woo", mlbTeam: "SEA", positions: ["SP"], birthDate: "2000-01-30", age: 26, currentRank: 61, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 47, name: "Bryce Elder", mlbTeam: "ATL", positions: ["SP"], birthDate: "1999-05-19", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 48, name: "Bryce Eldridge", mlbTeam: "SF", positions: ["1B"], birthDate: "2004-10-20", age: 21, currentRank: 166, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 49, name: "Bryce Harper", mlbTeam: "PHI", positions: ["1B"], birthDate: "1992-10-16", age: 33, currentRank: 33, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 50, name: "Bryce Miller", mlbTeam: "SEA", positions: ["SP"], birthDate: "1998-08-23", age: 27, currentRank: 221, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 51, name: "Bryson Stott", mlbTeam: "PHI", positions: ["2B"], birthDate: "1997-10-06", age: 28, currentRank: 268, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 52, name: "Bubba Chandler", mlbTeam: "PIT", positions: ["SP"], birthDate: "2002-09-14", age: 23, currentRank: 164, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 53, name: "Byron Buxton", mlbTeam: "MIN", positions: ["OF"], birthDate: "1993-12-18", age: 32, currentRank: 106, futureTier: "shortTerm", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 54, name: "Cade Horton", mlbTeam: "CHC", positions: ["SP"], birthDate: "2001-08-20", age: 24, currentRank: 427, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 55, name: "Cade Smith", mlbTeam: "CLE", positions: ["RP"], birthDate: "1999-05-09", age: 27, currentRank: 110, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 56, name: "Cal Raleigh", mlbTeam: "SEA", positions: ["C"], birthDate: "1996-11-26", age: 29, currentRank: 50, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 57, name: "Caleb Bonemer", mlbTeam: "CHW", positions: ["SS"], birthDate: "2005-10-05", age: 20, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 58, name: "Cam Caminiti", mlbTeam: "ATL", positions: ["SP"], birthDate: "2006-08-08", age: 19, currentRank: 427, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 59, name: "Cam Schlittler", mlbTeam: "NYY", positions: ["SP"], birthDate: "2001-02-05", age: 25, currentRank: 35, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 60, name: "Cam Smith", mlbTeam: "HOU", positions: ["OF"], birthDate: "2003-02-22", age: 23, currentRank: 128, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 61, name: "Carlos Correa", mlbTeam: "HOU", positions: ["SS"], birthDate: "1994-09-22", age: 31, currentRank: 391, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "high", needsReview: false },
  { id: 62, name: "Carlos Lagrange", mlbTeam: "NYY", positions: ["SP"], birthDate: "2003-05-25", age: 23, currentRank: 252, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 63, name: "Carlos Rodon", mlbTeam: "NYY", positions: ["SP"], birthDate: "1992-12-10", age: 33, currentRank: 162, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 64, name: "Carson Benge", mlbTeam: "NYM", positions: ["OF"], birthDate: "2003-01-20", age: 23, currentRank: 86, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 65, name: "Carson Kelly", mlbTeam: "CHC", positions: ["C"], birthDate: "1994-07-14", age: 31, currentRank: 260, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 66, name: "Carter Jensen", mlbTeam: "KC", positions: ["C"], birthDate: "2003-07-03", age: 22, currentRank: 163, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 67, name: "Casey Mize", mlbTeam: "DET", positions: ["SP"], birthDate: "1997-05-01", age: 29, currentRank: 307, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 68, name: "Casey Schmitt", mlbTeam: "SF", positions: ["3B", "SS"], birthDate: "1999-03-01", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 69, name: "Ceddanne Rafaela", mlbTeam: "BOS", positions: ["OF"], birthDate: "2000-09-18", age: 25, currentRank: 238, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 70, name: "Chandler Simpson", mlbTeam: "TB", positions: ["OF"], birthDate: "2000-11-18", age: 25, currentRank: 271, futureTier: "useful", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 71, name: "Charlie Condon", mlbTeam: "COL", positions: ["OF"], birthDate: "2003-04-14", age: 23, currentRank: 259, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 72, name: "Chase Burns", mlbTeam: "CIN", positions: ["SP"], birthDate: "2003-01-16", age: 23, currentRank: 44, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 73, name: "Chase DeLauter", mlbTeam: "CLE", positions: ["OF"], birthDate: "2001-10-08", age: 24, currentRank: 82, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 74, name: "Chase Meidroth", mlbTeam: "CWS", positions: ["SS"], birthDate: "2001-07-23", age: 24, currentRank: 384, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 75, name: "Chris Bassitt", mlbTeam: "TOR", positions: ["SP"], birthDate: "1989-02-22", age: 37, currentRank: 300, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 76, name: "Chris Sale", mlbTeam: "ATL", positions: ["SP"], birthDate: "1989-03-30", age: 37, currentRank: 76, futureTier: "shortTerm", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 77, name: "Christian Walker", mlbTeam: "HOU", positions: ["1B"], birthDate: "1991-03-28", age: 35, currentRank: 359, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 78, name: "Christian Yelich", mlbTeam: "MIL", positions: ["OF"], birthDate: "1991-12-05", age: 34, currentRank: 117, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 79, name: "CJ Abrams", mlbTeam: "WAS", positions: ["SS"], birthDate: "2000-10-03", age: 25, currentRank: 31, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 80, name: "Cody Bellinger", mlbTeam: "NYY", positions: ["OF"], birthDate: "1995-07-13", age: 30, currentRank: 87, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 81, name: "Cole Ragans", mlbTeam: "KC", positions: ["SP"], birthDate: "1997-12-12", age: 28, currentRank: 115, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 82, name: "Cole Young", mlbTeam: "SEA", positions: ["2B"], birthDate: "2003-07-29", age: 22, currentRank: 473, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 83, name: "Colin Rea", mlbTeam: "CHC", positions: ["SP"], birthDate: "1990-07-01", age: 35, currentRank: 360, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 84, name: "Colson Montgomery", mlbTeam: "CWS", positions: ["SS"], birthDate: "2002-02-27", age: 24, currentRank: 194, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 85, name: "Colt Emerson", mlbTeam: "SEA", positions: ["SS"], birthDate: "2005-07-20", age: 20, currentRank: 42, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 86, name: "Colton Cowser", mlbTeam: "BAL", positions: ["OF"], birthDate: "2000-03-20", age: 26, currentRank: 329, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 87, name: "Connelly Early", mlbTeam: "BOS", positions: ["SP"], birthDate: "2002-04-03", age: 24, currentRank: 173, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 88, name: "Cooper Ingle", mlbTeam: "CLE", positions: ["C"], birthDate: "2002-02-23", age: 24, currentRank: 332, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 89, name: "Corbin Burnes", mlbTeam: "ARI", positions: ["SP"], birthDate: "1994-10-22", age: 31, currentRank: 217, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 90, name: "Corbin Carroll", mlbTeam: "ARI", positions: ["OF"], birthDate: "2000-08-21", age: 25, currentRank: 6, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 91, name: "Corey Seager", mlbTeam: "TEX", positions: ["SS"], birthDate: "1994-04-27", age: 32, currentRank: 66, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 92, name: "Cristopher Sanchez", mlbTeam: "PHI", positions: ["SP"], birthDate: "1996-12-12", age: 29, currentRank: 32, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 93, name: "Dalton Rushing", mlbTeam: "LAD", positions: ["C"], birthDate: "2001-02-21", age: 25, currentRank: 222, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 94, name: "Dansby Swanson", mlbTeam: "CHC", positions: ["SS"], birthDate: "1994-02-11", age: 32, currentRank: 291, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 95, name: "David Bednar", mlbTeam: "NYY", positions: ["RP"], birthDate: "1994-10-10", age: 31, currentRank: 326, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 96, name: "Davis Martin", mlbTeam: "", positions: ["UTIL"], birthDate: "1997-01-04", age: 29, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 97, name: "Daylen Lile", mlbTeam: "WAS", positions: ["OF"], birthDate: "2002-11-30", age: 23, currentRank: 227, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 98, name: "Devin Williams", mlbTeam: "NYM", positions: ["RP"], birthDate: "1994-09-21", age: 31, currentRank: 280, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 99, name: "Didier Fuentes", mlbTeam: "ATL", positions: ["SP"], birthDate: "2005-06-17", age: 21, currentRank: 451, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 100, name: "Dillon Dingler", mlbTeam: "DET", positions: ["C"], birthDate: "1998-09-17", age: 27, currentRank: 342, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 101, name: "Dominic Canzone", mlbTeam: "SEA", positions: ["OF"], birthDate: "1997-08-16", age: 28, currentRank: 486, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 102, name: "Drake Baldwin", mlbTeam: "ATL", positions: ["C"], birthDate: "2001-03-28", age: 25, currentRank: 73, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 103, name: "Drew Rasmussen", mlbTeam: "TB", positions: ["SP"], birthDate: "1995-07-27", age: 30, currentRank: 207, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 104, name: "Drew Thorpe", mlbTeam: "CHW", positions: ["SP"], birthDate: "2000-10-01", age: 25, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 105, name: "Dustin May", mlbTeam: "BOS", positions: ["SP"], birthDate: "1997-09-06", age: 28, currentRank: 482, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 106, name: "Dylan Cease", mlbTeam: "TOR", positions: ["SP"], birthDate: "1995-12-28", age: 30, currentRank: 91, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 107, name: "Dylan Crews", mlbTeam: "WAS", positions: ["OF"], birthDate: "2002-02-26", age: 24, currentRank: 188, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 108, name: "Dylan Lee", mlbTeam: "ATL", positions: ["RP"], birthDate: "1994-08-01", age: 31, currentRank: 360, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 109, name: "Eduardo Quintero", mlbTeam: "LAD", positions: ["OF"], birthDate: "2005-09-16", age: 20, currentRank: 398, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 110, name: "Eduardo Rodriguez", mlbTeam: "ARI", positions: ["SP"], birthDate: "1993-04-07", age: 33, currentRank: 330, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 111, name: "Edward Florentino", mlbTeam: "PIT", positions: ["OF"], birthDate: "2006-11-11", age: 19, currentRank: 107, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 112, name: "Edwin Diaz", mlbTeam: "LAD", positions: ["RP"], birthDate: "1994-03-22", age: 32, currentRank: 228, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 113, name: "Eli Willits", mlbTeam: "WAS", positions: ["SS"], birthDate: "2007-12-09", age: 18, currentRank: 118, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 114, name: "Elly De La Cruz", mlbTeam: "CIN", positions: ["SS"], birthDate: "2002-01-11", age: 24, currentRank: 5, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 115, name: "Elmer Rodriguez", mlbTeam: "NYY", positions: ["C"], birthDate: "2003-08-18", age: 22, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 116, name: "Emerson Hancock", mlbTeam: "SEA", positions: ["SP"], birthDate: "1999-05-31", age: 27, currentRank: 485, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 117, name: "Emmanuel Rodriguez", mlbTeam: "MIN", positions: ["OF"], birthDate: "2003-02-28", age: 23, currentRank: 187, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 118, name: "Emmet Sheehan", mlbTeam: "LAD", positions: ["SP"], birthDate: "1999-11-15", age: 26, currentRank: 130, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 119, name: "Erik Sabrowski", mlbTeam: "CLE", positions: ["RP"], birthDate: "1997-10-31", age: 28, currentRank: 390, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 120, name: "Ernie Clement", mlbTeam: "TOR", positions: ["3B"], birthDate: "1996-03-22", age: 30, currentRank: 332, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 121, name: "Ethan Holliday", mlbTeam: "COL", positions: ["SS"], birthDate: "2007-02-23", age: 19, currentRank: 300, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 122, name: "Ethan Salas", mlbTeam: "SD", positions: ["C"], birthDate: "2006-06-01", age: 20, currentRank: 302, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 123, name: "Eury Perez", mlbTeam: "MIA", positions: ["SP"], birthDate: "2003-04-15", age: 23, currentRank: 46, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 124, name: "Ezequiel Duran", mlbTeam: "TEX", positions: ["3B", "SS", "OF"], birthDate: "1999-05-22", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 125, name: "Fernando Tatis Jr.", mlbTeam: "SD", positions: ["OF"], birthDate: "1999-01-02", age: 27, currentRank: 14, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 126, name: "Foster Griffin", mlbTeam: "KC", positions: ["RP"], birthDate: "1995-07-27", age: 30, currentRank: 380, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 127, name: "Framber Valdez", mlbTeam: "DET", positions: ["SP"], birthDate: "1993-11-19", age: 32, currentRank: 129, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 128, name: "Francisco Alvarez", mlbTeam: "NYM", positions: ["C"], birthDate: "2001-11-19", age: 24, currentRank: 167, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 129, name: "Francisco Lindor", mlbTeam: "NYM", positions: ["SS"], birthDate: "1993-11-14", age: 32, currentRank: 37, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 130, name: "Franklin Arias", mlbTeam: "BOS", positions: ["SS"], birthDate: "2005-11-19", age: 20, currentRank: 52, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 131, name: "Freddie Freeman", mlbTeam: "LAD", positions: ["1B"], birthDate: "1989-09-12", age: 36, currentRank: 77, futureTier: "shortTerm", categoryFitTier: "eliteHitter", riskTier: "aging", needsReview: false },
  { id: 132, name: "Freddy Peralta", mlbTeam: "MIL", positions: ["SP"], birthDate: "1996-06-04", age: 30, currentRank: 85, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 133, name: "Gabriel Moreno", mlbTeam: "ARI", positions: ["C"], birthDate: "2000-02-14", age: 26, currentRank: 281, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 134, name: "Gage Jump", mlbTeam: "ATH", positions: ["SP"], birthDate: "2003-04-12", age: 23, currentRank: 195, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 135, name: "Garrett Crochet", mlbTeam: "BOS", positions: ["SP"], birthDate: "1999-06-21", age: 27, currentRank: 26, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 136, name: "Gavin Lux", mlbTeam: "CIN", positions: ["2B", "OF"], birthDate: "1997-11-23", age: 28, currentRank: 300, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 137, name: "Gavin Sheets", mlbTeam: "SD", positions: ["1B", "OF"], birthDate: "1996-04-23", age: 30, currentRank: 310, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 138, name: "Gavin Williams", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-07-26", age: 26, currentRank: 146, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 139, name: "George Kirby", mlbTeam: "SEA", positions: ["SP"], birthDate: "1998-02-04", age: 28, currentRank: 60, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 140, name: "George Lombard Jr.", mlbTeam: "NYY", positions: ["SS"], birthDate: "2005-06-02", age: 21, currentRank: 149, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 141, name: "George Springer", mlbTeam: "TOR", positions: ["OF"], birthDate: "1989-09-19", age: 36, currentRank: 251, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 142, name: "Geraldo Perdomo", mlbTeam: "ARI", positions: ["SS"], birthDate: "1999-10-22", age: 26, currentRank: 100, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 143, name: "Gerrit Cole", mlbTeam: "NYY", positions: ["SP"], birthDate: "1990-09-08", age: 35, currentRank: 108, futureTier: "shortTerm", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 144, name: "Gleyber Torres", mlbTeam: "DET", positions: ["2B"], birthDate: "1996-12-13", age: 29, currentRank: 256, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 145, name: "Grant Taylor", mlbTeam: "CWS", positions: ["RP"], birthDate: "2002-05-20", age: 24, currentRank: 351, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 146, name: "Grayson Rodriguez", mlbTeam: "LAA", positions: ["SP"], birthDate: "1999-11-16", age: 26, currentRank: 204, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 147, name: "Gregory Soto", mlbTeam: "BAL", positions: ["RP"], birthDate: "1995-02-11", age: 31, currentRank: 360, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 148, name: "Gunnar Henderson", mlbTeam: "BAL", positions: ["SS"], birthDate: "2001-06-29", age: 24, currentRank: 8, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 149, name: "Hagen Smith", mlbTeam: "CWS", positions: ["SP"], birthDate: "2003-08-19", age: 22, currentRank: 448, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 150, name: "Heliot Ramos", mlbTeam: "SF", positions: ["OF"], birthDate: "1999-09-07", age: 26, currentRank: 266, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 151, name: "Hunter Brown", mlbTeam: "HOU", positions: ["SP"], birthDate: "1998-08-29", age: 27, currentRank: 49, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 152, name: "Hunter Goodman", mlbTeam: "COL", positions: ["C"], birthDate: "1999-10-08", age: 26, currentRank: 165, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 153, name: "Hunter Greene", mlbTeam: "CIN", positions: ["SP"], birthDate: "1999-08-06", age: 26, currentRank: 101, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 154, name: "Ian Happ", mlbTeam: "CHC", positions: ["OF"], birthDate: "1994-08-12", age: 31, currentRank: 208, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 155, name: "Isaac Paredes", mlbTeam: "HOU", positions: ["3B"], birthDate: "1999-02-18", age: 27, currentRank: 202, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 156, name: "Ivan Herrera", mlbTeam: "STL", positions: ["C"], birthDate: "2000-06-01", age: 26, currentRank: 141, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 157, name: "J.R. Ritchie", mlbTeam: "ATL", positions: ["SP"], birthDate: "2003-06-27", age: 22, currentRank: 447, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 158, name: "J.T. Realmuto", mlbTeam: "PHI", positions: ["C"], birthDate: "1991-03-18", age: 35, currentRank: 472, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 159, name: "Jac Caglianone", mlbTeam: "KC", positions: ["OF"], birthDate: "2003-02-09", age: 23, currentRank: 157, futureTier: "prospectElite", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 160, name: "Jack Flaherty", mlbTeam: "DET", positions: ["SP"], birthDate: "1995-10-15", age: 30, currentRank: 261, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 161, name: "Jackson Chourio", mlbTeam: "MIL", positions: ["OF"], birthDate: "2004-03-11", age: 22, currentRank: 12, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 162, name: "Jackson Holliday", mlbTeam: "BAL", positions: ["2B"], birthDate: "2003-12-04", age: 22, currentRank: 90, futureTier: "cornerstone", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 163, name: "Jackson Jobe", mlbTeam: "DET", positions: ["SP"], birthDate: "2002-07-30", age: 23, currentRank: 293, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 164, name: "Jackson Merrill", mlbTeam: "SD", positions: ["OF"], birthDate: "2003-04-19", age: 23, currentRank: 53, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 165, name: "Jacob deGrom", mlbTeam: "TEX", positions: ["SP"], birthDate: "1988-06-19", age: 38, currentRank: 70, futureTier: "shortTerm", categoryFitTier: "eliteStarter", riskTier: "veryHigh", needsReview: false },
  { id: 166, name: "Jacob Misiorowski", mlbTeam: "MIL", positions: ["SP"], birthDate: "2002-04-03", age: 24, currentRank: 24, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 167, name: "Jacob Wilson", mlbTeam: "ATH", positions: ["SS"], birthDate: "2002-03-30", age: 24, currentRank: 135, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 168, name: "Jacob Young", mlbTeam: "WSH", positions: ["OF"], birthDate: "1999-07-27", age: 26, currentRank: 285, futureTier: "useful", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 169, name: "Jake Bauers", mlbTeam: "MIL", positions: ["1B", "OF"], birthDate: "1995-10-06", age: 30, currentRank: 360, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 170, name: "Jake Latz", mlbTeam: "TEX", positions: ["RP"], birthDate: "1996-04-08", age: 30, currentRank: 390, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 171, name: "Jakob Marsee", mlbTeam: "MIA", positions: ["OF"], birthDate: "2001-06-28", age: 24, currentRank: 368, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 172, name: "James Wood", mlbTeam: "WAS", positions: ["OF"], birthDate: "2002-09-17", age: 23, currentRank: 17, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 173, name: "Jamie Arnold", mlbTeam: "ATH", positions: ["SP"], birthDate: "2004-03-21", age: 22, currentRank: 276, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 174, name: "Jared Jones", mlbTeam: "PIT", positions: ["SP"], birthDate: "2001-08-06", age: 24, currentRank: 215, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 175, name: "Jarlin Susana", mlbTeam: "WAS", positions: ["SP"], birthDate: "2004-03-23", age: 22, currentRank: 249, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 176, name: "Jarren Duran", mlbTeam: "BOS", positions: ["OF"], birthDate: "1996-09-05", age: 29, currentRank: 134, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 177, name: "Jason Adam", mlbTeam: "SD", positions: ["RP"], birthDate: "1991-08-04", age: 34, currentRank: 300, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 178, name: "Jaxon Wiggins", mlbTeam: "CHC", positions: ["SP"], birthDate: "2001-10-03", age: 24, currentRank: 431, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 179, name: "Jazz Chisholm Jr.", mlbTeam: "NYY", positions: ["2B"], birthDate: "1998-02-01", age: 28, currentRank: 38, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "high", needsReview: false },
  { id: 180, name: "Jeffrey Springs", mlbTeam: "", positions: ["SP"], birthDate: "1992-09-20", age: 33, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 181, name: "Jeremy Pena", mlbTeam: "HOU", positions: ["SS"], birthDate: "1997-09-22", age: 28, currentRank: 97, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 182, name: "Jesus Luzardo", mlbTeam: "PHI", positions: ["SP"], birthDate: "1997-09-30", age: 28, currentRank: 112, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 183, name: "Jesus Made", mlbTeam: "MIL", positions: ["SS"], birthDate: "2007-05-08", age: 19, currentRank: 28, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 184, name: "Jett Williams", mlbTeam: "MIL", positions: ["SS"], birthDate: "2003-11-03", age: 22, currentRank: 410, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 185, name: "Jhoan Duran", mlbTeam: "PHI", positions: ["RP"], birthDate: "1998-01-08", age: 28, currentRank: 151, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 186, name: "JJ Bleday", mlbTeam: "ATH", positions: ["OF"], birthDate: "1997-11-10", age: 28, currentRank: 280, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 187, name: "JJ Wetherholt", mlbTeam: "STL", positions: ["SS"], birthDate: "2002-09-10", age: 23, currentRank: 34, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 188, name: "Jo Adell", mlbTeam: "LAA", positions: ["OF"], birthDate: "1999-04-08", age: 27, currentRank: 138, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 189, name: "Joe Mack", mlbTeam: "MIA", positions: ["C"], birthDate: "2002-12-27", age: 23, currentRank: 421, futureTier: "prospectLow", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 190, name: "Joe Musgrove", mlbTeam: "SD", positions: ["SP"], birthDate: "1992-12-04", age: 33, currentRank: 352, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 191, name: "Joe Ryan", mlbTeam: "MIN", positions: ["SP"], birthDate: "1996-06-05", age: 30, currentRank: 62, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 192, name: "Joey Wiemer", mlbTeam: "", positions: ["UTIL"], birthDate: "1999-02-11", age: 27, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 193, name: "Jonah Tong", mlbTeam: "NYM", positions: ["SP"], birthDate: "2003-06-19", age: 23, currentRank: 220, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 194, name: "Jonathan Aranda", mlbTeam: "TB", positions: ["1B"], birthDate: "1998-05-23", age: 28, currentRank: 154, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 195, name: "Jordan Lawlar", mlbTeam: "ARI", positions: ["SS"], birthDate: "2002-07-17", age: 23, currentRank: 182, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 196, name: "Jordan Walker", mlbTeam: "STL", positions: ["OF"], birthDate: "2002-05-22", age: 24, currentRank: 201, futureTier: "star", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 197, name: "Jordan Westburg", mlbTeam: "BAL", positions: ["3B"], birthDate: "1999-02-18", age: 27, currentRank: 214, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 198, name: "Jose Altuve", mlbTeam: "HOU", positions: ["2B"], birthDate: "1990-05-06", age: 36, currentRank: 114, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 199, name: "Jose Ramirez", mlbTeam: "CLE", positions: ["3B"], birthDate: "1992-09-17", age: 33, currentRank: 21, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 200, name: "Jose Soriano", mlbTeam: "LAA", positions: ["SP"], birthDate: "1998-10-20", age: 27, currentRank: 185, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 201, name: "Josh Hader", mlbTeam: "HOU", positions: ["RP"], birthDate: "1994-04-07", age: 32, currentRank: 262, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 202, name: "Josh Jung", mlbTeam: "TEX", positions: ["3B"], birthDate: "1998-02-12", age: 28, currentRank: 334, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 203, name: "Josh Naylor", mlbTeam: "SEA", positions: ["1B"], birthDate: "1997-06-22", age: 29, currentRank: 81, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 204, name: "Josue Briceno", mlbTeam: "DET", positions: ["C"], birthDate: "2004-09-23", age: 21, currentRank: 353, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 205, name: "Josue De Paula", mlbTeam: "LAD", positions: ["OF"], birthDate: "2005-05-24", age: 21, currentRank: 80, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 206, name: "Juan Soto", mlbTeam: "NYM", positions: ["OF"], birthDate: "1998-10-25", age: 27, currentRank: 2, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "veryLow", needsReview: false },
  { id: 207, name: "Julio Rodriguez", mlbTeam: "SEA", positions: ["OF"], birthDate: "2000-12-29", age: 25, currentRank: 10, futureTier: "elite", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 208, name: "Jung Hoo Lee", mlbTeam: "SF", positions: ["OF"], birthDate: "1998-08-20", age: 27, currentRank: 386, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 209, name: "Junior Caminero", mlbTeam: "TB", positions: ["3B"], birthDate: "2003-07-05", age: 22, currentRank: 7, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 210, name: "Jurrangelo Cijntje", mlbTeam: "SEA", positions: ["SP"], birthDate: "2003-05-31", age: 23, currentRank: 459, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 211, name: "Justin Steele", mlbTeam: "CHC", positions: ["SP"], birthDate: "1995-07-11", age: 30, currentRank: 286, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 212, name: "Justin Wrobleski", mlbTeam: "LAD", positions: ["SP"], birthDate: "2000-07-14", age: 25, currentRank: 348, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 213, name: "Kade Anderson", mlbTeam: "SEA", positions: ["SP"], birthDate: "2004-07-06", age: 21, currentRank: 113, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 214, name: "Kaelen Culpepper", mlbTeam: "MIN", positions: ["SS"], birthDate: "2002-12-29", age: 23, currentRank: 237, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 215, name: "Kazuma Okamoto", mlbTeam: "TOR", positions: ["3B"], birthDate: "1996-06-30", age: 29, currentRank: 183, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 216, name: "Keibert Ruiz", mlbTeam: "WSH", positions: ["C"], birthDate: "1998-07-20", age: 27, currentRank: 240, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 217, name: "Ketel Marte", mlbTeam: "ARI", positions: ["2B"], birthDate: "1993-10-12", age: 32, currentRank: 36, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 218, name: "Kevin Gausman", mlbTeam: "TOR", positions: ["SP"], birthDate: "1991-01-06", age: 35, currentRank: 131, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 219, name: "Kevin Kelly", mlbTeam: "TB", positions: ["RP"], birthDate: "1997-11-28", age: 28, currentRank: 360, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 220, name: "Kevin McGonigle", mlbTeam: "DET", positions: ["2B"], birthDate: "2004-08-18", age: 21, currentRank: 19, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 221, name: "Konnor Griffin", mlbTeam: "PIT", positions: ["SS"], birthDate: "2006-04-24", age: 20, currentRank: 18, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 222, name: "Kris Bubic", mlbTeam: "KC", positions: ["SP"], birthDate: "1997-08-19", age: 28, currentRank: 290, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 223, name: "Kristian Campbell", mlbTeam: "BOS", positions: ["OF"], birthDate: "2002-06-28", age: 23, currentRank: 425, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 224, name: "Kruz Schoolcraft", mlbTeam: "SD", positions: ["SP"], birthDate: "2007-04-18", age: 19, currentRank: 350, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 225, name: "Kyle Bradish", mlbTeam: "BAL", positions: ["SP"], birthDate: "1996-09-12", age: 29, currentRank: 121, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 226, name: "Kyle Harrison", mlbTeam: "MIL", positions: ["SP"], birthDate: "2001-08-12", age: 24, currentRank: 282, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 227, name: "Kyle Hurt", mlbTeam: "", positions: ["UTIL"], birthDate: "1998-05-30", age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 228, name: "Kyle Schwarber", mlbTeam: "PHI", positions: ["UTIL"], birthDate: "1993-03-05", age: 33, currentRank: 39, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 229, name: "Kyle Stowers", mlbTeam: "MIA", positions: ["OF"], birthDate: "1998-01-02", age: 28, currentRank: 160, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 230, name: "Kyle Teel", mlbTeam: "CWS", positions: ["C"], birthDate: "2002-02-15", age: 24, currentRank: 217, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 231, name: "Kyle Tucker", mlbTeam: "LAD", positions: ["OF"], birthDate: "1997-01-17", age: 29, currentRank: 25, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 232, name: "Kyson Witherspoon", mlbTeam: "BOS", positions: ["SP"], birthDate: "2004-08-12", age: 21, currentRank: 403, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 233, name: "Lance McCullers Jr.", mlbTeam: "", positions: ["UTIL"], birthDate: "1993-10-02", age: 32, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 234, name: "Lawrence Butler", mlbTeam: "ATH", positions: ["OF"], birthDate: "2000-07-10", age: 25, currentRank: 337, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 235, name: "Lazaro Montes", mlbTeam: "SEA", positions: ["OF"], birthDate: "2004-10-22", age: 21, currentRank: 203, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 236, name: "Leo De Vries", mlbTeam: "ATH", positions: ["SS"], birthDate: "2006-10-11", age: 19, currentRank: 56, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 237, name: "Liam Doyle", mlbTeam: "STL", positions: ["SP"], birthDate: "2004-06-03", age: 22, currentRank: 275, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 238, name: "Liam Hicks", mlbTeam: "MIA", positions: ["C"], birthDate: "1999-06-02", age: 27, currentRank: 260, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 239, name: "Logan Gilbert", mlbTeam: "SEA", positions: ["SP"], birthDate: "1997-05-05", age: 29, currentRank: 30, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 240, name: "Logan Henderson", mlbTeam: "MIL", positions: ["SP"], birthDate: "2002-03-02", age: 24, currentRank: 381, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 241, name: "Logan O'Hoppe", mlbTeam: "LAA", positions: ["C"], birthDate: "2000-02-09", age: 26, currentRank: 449, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 242, name: "Logan Webb", mlbTeam: "SF", positions: ["SP"], birthDate: "1996-11-18", age: 29, currentRank: 69, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 243, name: "Louis Varland", mlbTeam: "TOR", positions: ["RP"], birthDate: "1997-12-09", age: 28, currentRank: 455, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "medium", needsReview: false },
  { id: 244, name: "Lucas Erceg", mlbTeam: "KC", positions: ["RP"], birthDate: "1995-05-01", age: 31, currentRank: 280, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 245, name: "Lucas Ramirez", mlbTeam: "LAA", positions: ["OF"], birthDate: "2006-01-16", age: 20, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 246, name: "Luis Arraez", mlbTeam: "SF", positions: ["1B"], birthDate: "1997-04-09", age: 29, currentRank: 360, futureTier: "solidKeeper", categoryFitTier: "flawedHitter", riskTier: "low", needsReview: false },
  { id: 247, name: "Luis Pena", mlbTeam: "MIL", positions: ["SS"], birthDate: "2006-11-13", age: 19, currentRank: 92, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 248, name: "Luis Robert Jr.", mlbTeam: "CWS", positions: ["OF"], birthDate: "1997-08-03", age: 28, currentRank: 157, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 249, name: "LuJames Groover", mlbTeam: "ARI", positions: ["3B"], birthDate: "2002-04-16", age: 24, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 250, name: "Luke Keaschall", mlbTeam: "MIN", positions: ["2B"], birthDate: "2002-08-15", age: 23, currentRank: 98, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 251, name: "Luke Raley", mlbTeam: "SEA", positions: ["1B", "OF"], birthDate: "1994-09-19", age: 31, currentRank: 260, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 252, name: "MacKenzie Gore", mlbTeam: "TEX", positions: ["SP"], birthDate: "1999-02-24", age: 27, currentRank: 143, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 253, name: "Maikel Garcia", mlbTeam: "KC", positions: ["3B"], birthDate: "2000-03-03", age: 26, currentRank: 139, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 254, name: "Manny Machado", mlbTeam: "SD", positions: ["3B"], birthDate: "1992-07-06", age: 33, currentRank: 57, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 255, name: "Marcelo Mayer", mlbTeam: "BOS", positions: ["3B"], birthDate: "2002-12-12", age: 23, currentRank: 295, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 256, name: "Martin Perez", mlbTeam: "CHW", positions: ["SP"], birthDate: "1991-04-04", age: 35, currentRank: 380, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 257, name: "Mason Miller", mlbTeam: "SD", positions: ["RP"], birthDate: "1998-08-24", age: 27, currentRank: 63, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 258, name: "Masyn Winn", mlbTeam: "STL", positions: ["SS"], birthDate: "2002-03-21", age: 24, currentRank: 229, futureTier: "strongKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 259, name: "Matt Brash", mlbTeam: "SEA", positions: ["RP"], birthDate: "1998-05-12", age: 28, currentRank: 300, futureTier: "useful", categoryFitTier: "eliteReliever", riskTier: "injured", needsReview: false },
  { id: 260, name: "Matt Chapman", mlbTeam: "SF", positions: ["3B"], birthDate: "1993-04-28", age: 33, currentRank: 223, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 261, name: "Matt McLain", mlbTeam: "CIN", positions: ["2B"], birthDate: "1999-08-06", age: 26, currentRank: 377, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "high", needsReview: false },
  { id: 262, name: "Matt Olson", mlbTeam: "ATL", positions: ["1B"], birthDate: "1994-03-29", age: 32, currentRank: 51, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 263, name: "Matt Shaw", mlbTeam: "CHC", positions: ["3B"], birthDate: "2001-11-06", age: 24, currentRank: 206, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 264, name: "Matthew Boyd", mlbTeam: "CHC", positions: ["SP"], birthDate: "2004-05-07", age: 22, currentRank: 296, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 265, name: "Mauricio Dubon", mlbTeam: "HOU", positions: ["2B", "OF"], birthDate: "1994-07-19", age: 31, currentRank: 330, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 266, name: "Max Clark", mlbTeam: "DET", positions: ["OF"], birthDate: "2004-12-21", age: 21, currentRank: 122, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 267, name: "Max Fried", mlbTeam: "NYY", positions: ["SP"], birthDate: "1994-01-18", age: 32, currentRank: 111, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 268, name: "Max Meyer", mlbTeam: "MIA", positions: ["SP"], birthDate: "1999-03-12", age: 27, currentRank: 333, futureTier: "solidKeeper", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 269, name: "Max Muncy", mlbTeam: "LAD", positions: ["3B"], birthDate: "1990-08-25", age: 35, currentRank: 294, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 270, name: "Michael Busch", mlbTeam: "CHC", positions: ["1B"], birthDate: "1997-11-09", age: 28, currentRank: 120, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 271, name: "Michael Harris II", mlbTeam: "ATL", positions: ["OF"], birthDate: "2001-03-07", age: 25, currentRank: 83, futureTier: "strongKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 272, name: "Michael King", mlbTeam: "SD", positions: ["SP"], birthDate: "1995-05-25", age: 31, currentRank: 168, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 273, name: "Michael McGreevy", mlbTeam: "STL", positions: ["SP"], birthDate: "2000-07-08", age: 25, currentRank: 498, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 274, name: "Michael Soroka", mlbTeam: "WSH", positions: ["SP"], birthDate: "1997-08-04", age: 28, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 275, name: "Michael Wacha", mlbTeam: "KC", positions: ["SP"], birthDate: "1991-07-01", age: 34, currentRank: 300, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 276, name: "Mick Abel", mlbTeam: "MIN", positions: ["SP"], birthDate: "2001-08-18", age: 24, currentRank: 390, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 277, name: "Mickey Moniak", mlbTeam: "COL", positions: ["OF"], birthDate: "1998-05-13", age: 28, currentRank: 335, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 278, name: "Miguel Vargas", mlbTeam: "CWS", positions: ["3B"], birthDate: "1999-11-17", age: 26, currentRank: 321, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 279, name: "Mike Sirota", mlbTeam: "LAD", positions: ["OF"], birthDate: "2003-06-16", age: 23, currentRank: 125, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 280, name: "Mike Trout", mlbTeam: "LAA", positions: ["OF"], birthDate: "1991-08-07", age: 34, currentRank: 124, futureTier: "shortTerm", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 281, name: "Mitch Keller", mlbTeam: "PIT", positions: ["SP"], birthDate: "1996-04-04", age: 30, currentRank: 430, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 282, name: "Moises Ballesteros", mlbTeam: "CHC", positions: ["C"], birthDate: "2003-11-08", age: 22, currentRank: 263, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 283, name: "Mookie Betts", mlbTeam: "LAD", positions: ["SS"], birthDate: "1992-10-07", age: 33, currentRank: 47, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 284, name: "Munetaka Murakami", mlbTeam: "CWS", positions: ["1B"], birthDate: "2000-02-02", age: 26, currentRank: 264, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 285, name: "Nate George", mlbTeam: "BAL", positions: ["OF"], birthDate: "2006-06-04", age: 20, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "speedOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 286, name: "Nathan Eovaldi", mlbTeam: "TEX", positions: ["SP"], birthDate: "1990-02-13", age: 36, currentRank: 196, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 287, name: "Nestor Cortes Jr.", mlbTeam: "", positions: ["UTIL"], birthDate: "1994-12-10", age: 31, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 288, name: "Nick Kurtz", mlbTeam: "ATH", positions: ["1B"], birthDate: "2003-03-12", age: 23, currentRank: 13, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 289, name: "Nick Lodolo", mlbTeam: "CIN", positions: ["SP"], birthDate: "1998-02-05", age: 28, currentRank: 123, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 290, name: "Nick Martinez", mlbTeam: "CIN", positions: ["SP", "RP"], birthDate: "1990-08-05", age: 35, currentRank: 320, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 291, name: "Nick Pivetta", mlbTeam: "SD", positions: ["SP"], birthDate: "1993-02-14", age: 33, currentRank: 457, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 292, name: "Nico Hoerner", mlbTeam: "CHC", positions: ["2B"], birthDate: "1997-05-13", age: 29, currentRank: 126, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 293, name: "Noah Schultz", mlbTeam: "CWS", positions: ["SP"], birthDate: "2003-08-05", age: 22, currentRank: 382, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 294, name: "Noble Meyer", mlbTeam: "MIA", positions: ["SP"], birthDate: "2005-01-10", age: 21, currentRank: 510, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 295, name: "Noelvi Marte", mlbTeam: "CIN", positions: ["3B"], birthDate: "2001-10-16", age: 24, currentRank: 464, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 296, name: "Nolan Arenado", mlbTeam: "STL", positions: ["3B"], birthDate: "1991-04-16", age: 35, currentRank: 240, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 297, name: "Nolan McLean", mlbTeam: "NYM", positions: ["SP"], birthDate: "2001-07-24", age: 24, currentRank: 40, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 298, name: "Oneil Cruz", mlbTeam: "PIT", positions: ["OF"], birthDate: "1998-10-04", age: 27, currentRank: 41, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 299, name: "Otto Lopez", mlbTeam: "MIA", positions: ["SS"], birthDate: "1998-10-01", age: 27, currentRank: 194, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 300, name: "Owen Caissie", mlbTeam: "MIA", positions: ["OF"], birthDate: "2002-07-08", age: 23, currentRank: 219, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 301, name: "Ozzie Albies", mlbTeam: "ATL", positions: ["2B"], birthDate: "1997-01-07", age: 29, currentRank: 136, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 302, name: "Pablo Lopez", mlbTeam: "MIN", positions: ["SP"], birthDate: "1996-03-07", age: 30, currentRank: 393, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 303, name: "Parker Messick", mlbTeam: "CLE", positions: ["SP"], birthDate: "2000-10-26", age: 25, currentRank: 198, futureTier: "prospectLow", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 304, name: "Paul Goldschmidt", mlbTeam: "NYY", positions: ["1B"], birthDate: "1987-09-10", age: 38, currentRank: 220, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 305, name: "Paul Sewald", mlbTeam: "CLE", positions: ["RP"], birthDate: "1990-05-26", age: 36, currentRank: 340, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 306, name: "Paul Skenes", mlbTeam: "PIT", positions: ["SP"], birthDate: "2002-05-29", age: 24, currentRank: 4, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 307, name: "Payton Tolle", mlbTeam: "BOS", positions: ["SP"], birthDate: "2002-11-01", age: 23, currentRank: 104, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 308, name: "Pete Alonso", mlbTeam: "BAL", positions: ["1B"], birthDate: "1994-12-07", age: 31, currentRank: 48, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 309, name: "Pete Crow-Armstrong", mlbTeam: "CHC", positions: ["OF"], birthDate: "2002-03-25", age: 24, currentRank: 88, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 310, name: "Pete Fairbanks", mlbTeam: "MIA", positions: ["RP"], birthDate: "1993-12-16", age: 32, currentRank: 375, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 311, name: "Quinn Mathews", mlbTeam: "STL", positions: ["SP"], birthDate: "2000-10-04", age: 25, currentRank: 337, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 312, name: "Rafael Devers", mlbTeam: "SF", positions: ["1B"], birthDate: "1996-10-24", age: 29, currentRank: 71, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 313, name: "Rainiel Rodriguez", mlbTeam: "STL", positions: ["C"], birthDate: "2007-01-04", age: 19, currentRank: 75, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 314, name: "Raisel Iglesias", mlbTeam: "ATL", positions: ["RP"], birthDate: "1990-01-04", age: 36, currentRank: 401, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 315, name: "Ralphy Velazquez", mlbTeam: "CLE", positions: ["1B"], birthDate: "2005-05-28", age: 21, currentRank: 89, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 316, name: "Randy Arozarena", mlbTeam: "SEA", positions: ["OF"], birthDate: "1995-02-28", age: 31, currentRank: 79, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 317, name: "Ranger Suarez", mlbTeam: "BOS", positions: ["SP"], birthDate: "1995-08-26", age: 30, currentRank: 177, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 318, name: "Reid Detmers", mlbTeam: "LAA", positions: ["SP"], birthDate: "1999-07-08", age: 26, currentRank: 415, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 319, name: "Rhett Lowder", mlbTeam: "CIN", positions: ["SP"], birthDate: "2002-03-08", age: 24, currentRank: 446, futureTier: "prospectHigh", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 320, name: "Rico Garcia", mlbTeam: "NYM", positions: ["RP"], birthDate: "1994-01-10", age: 32, currentRank: 400, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 321, name: "Riley Greene", mlbTeam: "DET", positions: ["OF"], birthDate: "2000-09-28", age: 25, currentRank: 54, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 322, name: "Riley O'Brien", mlbTeam: "STL", positions: ["RP"], birthDate: "1995-02-06", age: 31, currentRank: 311, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 323, name: "Robbie Ray", mlbTeam: "SF", positions: ["SP"], birthDate: "1991-10-01", age: 34, currentRank: 231, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 324, name: "Robby Snelling", mlbTeam: "MIA", positions: ["SP"], birthDate: "2003-12-19", age: 22, currentRank: 232, futureTier: "prospectElite", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 325, name: "Robert Gasser", mlbTeam: "MIL", positions: ["SP"], birthDate: "1999-05-31", age: 27, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "injured", needsReview: false },
  { id: 326, name: "Robert Suarez", mlbTeam: "ATL", positions: ["RP"], birthDate: "1991-03-01", age: 35, currentRank: 354, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 327, name: "Roki Sasaki", mlbTeam: "LAD", positions: ["SP"], birthDate: "2001-11-03", age: 24, currentRank: 354, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 328, name: "Roman Anthony", mlbTeam: "BOS", positions: ["OF"], birthDate: "2004-05-13", age: 22, currentRank: 22, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 329, name: "Ronald Acuna Jr.", mlbTeam: "ATL", positions: ["OF"], birthDate: "1997-12-18", age: 28, currentRank: 15, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "high", needsReview: false },
  { id: 330, name: "Royce Lewis", mlbTeam: "MIN", positions: ["3B"], birthDate: "1999-06-05", age: 27, currentRank: 158, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 331, name: "Ryan Helsley", mlbTeam: "BAL", positions: ["SP"], birthDate: "1994-07-18", age: 31, currentRank: 367, futureTier: "useful", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 332, name: "Ryan Jeffers", mlbTeam: "MIN", positions: ["C"], birthDate: "1997-06-03", age: 29, currentRank: 419, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 333, name: "Ryan O'Hearn", mlbTeam: "PIT", positions: ["1B"], birthDate: "1993-07-26", age: 32, currentRank: 463, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 334, name: "Ryan Sloan", mlbTeam: "SEA", positions: ["SP"], birthDate: "2006-01-29", age: 20, currentRank: 156, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 335, name: "Ryan Waldschmidt", mlbTeam: "ARI", positions: ["OF"], birthDate: "2002-10-07", age: 23, currentRank: 99, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 336, name: "Ryan Weathers", mlbTeam: "NYY", positions: ["SP"], birthDate: "1999-12-17", age: 26, currentRank: 242, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 337, name: "Sal Stewart", mlbTeam: "CIN", positions: ["1B"], birthDate: "2003-12-07", age: 22, currentRank: 55, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 338, name: "Sam Antonacci", mlbTeam: "CHW", positions: ["2B", "SS"], birthDate: "2003-02-06", age: 23, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 339, name: "Samuel Basallo", mlbTeam: "BAL", positions: ["C"], birthDate: "2004-08-13", age: 21, currentRank: 74, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 340, name: "Sandy Alcantara", mlbTeam: "MIA", positions: ["SP"], birthDate: "1995-09-07", age: 30, currentRank: 205, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 341, name: "Sebastian Walcott", mlbTeam: "TEX", positions: ["SS"], birthDate: "2006-03-14", age: 20, currentRank: 133, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 342, name: "Seiya Suzuki", mlbTeam: "CHC", positions: ["OF"], birthDate: "1994-08-18", age: 31, currentRank: 127, futureTier: "solidKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 343, name: "Seth Hernandez", mlbTeam: "PIT", positions: ["SP"], birthDate: "2006-06-28", age: 19, currentRank: 180, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 344, name: "Seth Lugo", mlbTeam: "KC", positions: ["SP"], birthDate: "1989-11-17", age: 36, currentRank: 494, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 345, name: "Shane Baz", mlbTeam: "BAL", positions: ["SP"], birthDate: "1999-06-17", age: 27, currentRank: 211, futureTier: "strongKeeper", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 346, name: "Shane Bieber", mlbTeam: "TOR", positions: ["SP"], birthDate: "1995-05-31", age: 31, currentRank: 197, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 347, name: "Shane McClanahan", mlbTeam: "TB", positions: ["SP"], birthDate: "1997-04-28", age: 29, currentRank: 142, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 348, name: "Shea Langeliers", mlbTeam: "ATH", positions: ["C"], birthDate: "1997-11-18", age: 28, currentRank: 65, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 349, name: "Shohei Ohtani", mlbTeam: "LAD", positions: ["UTIL", "SP"], birthDate: "1994-07-05", age: 31, currentRank: 1, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 350, name: "Shohei Ohtani", mlbTeam: "LAD", positions: ["DH"], birthDate: "1994-07-05", age: 31, currentRank: 1, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 351, name: "Shohei Ohtani", mlbTeam: "LAD", positions: ["SP"], birthDate: "1994-07-05", age: 31, currentRank: 90, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 352, name: "Shota Imanaga", mlbTeam: "CHC", positions: ["SP"], birthDate: "1993-09-01", age: 32, currentRank: 172, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 353, name: "Slade Cecconi", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-06-24", age: 27, currentRank: 497, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 354, name: "Sonny Gray", mlbTeam: "BOS", positions: ["SP"], birthDate: "1989-11-07", age: 36, currentRank: 200, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 355, name: "Spencer Arrighetti", mlbTeam: "HOU", positions: ["SP"], birthDate: "2000-01-02", age: 26, currentRank: 357, futureTier: "solidKeeper", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 356, name: "Spencer Schwellenbach", mlbTeam: "ATL", positions: ["SP"], birthDate: "2000-05-31", age: 26, currentRank: 155, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 357, name: "Spencer Steer", mlbTeam: "CIN", positions: ["1B"], birthDate: "1997-12-07", age: 28, currentRank: 402, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 358, name: "Spencer Strider", mlbTeam: "ATL", positions: ["SP"], birthDate: "1998-10-28", age: 27, currentRank: 109, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 359, name: "Spencer Torkelson", mlbTeam: "DET", positions: ["1B"], birthDate: "1999-08-26", age: 26, currentRank: 320, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 360, name: "Stephen Kolek", mlbTeam: "SD", positions: ["SP"], birthDate: "1997-04-18", age: 29, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 361, name: "Steven Kwan", mlbTeam: "CLE", positions: ["OF"], birthDate: "1997-09-05", age: 28, currentRank: 258, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 362, name: "T.J. Rumfield", mlbTeam: "NYY", positions: ["1B"], birthDate: "2000-05-17", age: 26, currentRank: 370, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 363, name: "Taj Bradley", mlbTeam: "MIN", positions: ["SP"], birthDate: "2001-03-20", age: 25, currentRank: 253, futureTier: "strongKeeper", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 364, name: "Tanner Bibee", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-03-05", age: 27, currentRank: 178, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 365, name: "Tanner Scott", mlbTeam: "LAD", positions: ["RP"], birthDate: "1994-07-22", age: 31, currentRank: 471, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 366, name: "Tarik Skubal", mlbTeam: "DET", positions: ["SP"], birthDate: "1996-11-20", age: 29, currentRank: 9, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 367, name: "Tatsuya Imai", mlbTeam: "HOU", positions: ["SP"], birthDate: "1998-05-09", age: 28, currentRank: 336, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 368, name: "Taylor Ward", mlbTeam: "BAL", positions: ["OF"], birthDate: "1993-12-14", age: 32, currentRank: 246, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 369, name: "Teoscar Hernandez", mlbTeam: "LAD", positions: ["OF"], birthDate: "1992-10-15", age: 33, currentRank: 150, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 370, name: "Thomas White", mlbTeam: "MIA", positions: ["SP"], birthDate: "2004-09-29", age: 21, currentRank: 169, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 371, name: "Tink Hence", mlbTeam: "STL", positions: ["SP"], birthDate: "2002-08-06", age: 23, currentRank: 432, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 372, name: "Tommy Edman", mlbTeam: "LAD", positions: ["2B"], birthDate: "1995-05-09", age: 31, currentRank: 452, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 373, name: "Travis Bazzana", mlbTeam: "CLE", positions: ["2B"], birthDate: "2002-08-28", age: 23, currentRank: 84, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 374, name: "Travis Sykora", mlbTeam: "WAS", positions: ["SP"], birthDate: "2004-04-28", age: 22, currentRank: 316, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 375, name: "Trea Turner", mlbTeam: "PHI", positions: ["SS"], birthDate: "1993-06-30", age: 32, currentRank: 45, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 376, name: "Trevor Megill", mlbTeam: "MIL", positions: ["RP"], birthDate: "1993-12-05", age: 32, currentRank: 285, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 377, name: "Trevor Story", mlbTeam: "BOS", positions: ["SS"], birthDate: "1992-11-15", age: 33, currentRank: 349, futureTier: "shortTerm", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: false },
  { id: 378, name: "Trey Yesavage", mlbTeam: "TOR", positions: ["SP"], birthDate: "2003-07-28", age: 22, currentRank: 59, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 379, name: "Troy Johnston", mlbTeam: "MIA", positions: ["1B", "OF"], birthDate: "1997-06-22", age: 29, currentRank: 380, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 380, name: "Tyler Black", mlbTeam: "MIL", positions: ["1B", "3B"], birthDate: "2000-07-26", age: 25, currentRank: 270, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 381, name: "Tyler Glasnow", mlbTeam: "LAD", positions: ["SP"], birthDate: "1993-08-23", age: 32, currentRank: 119, futureTier: "strongKeeper", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 382, name: "Tyler O'Neill", mlbTeam: "BAL", positions: ["OF"], birthDate: "1995-06-22", age: 31, currentRank: 489, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 383, name: "Tyler Rogers", mlbTeam: "SF", positions: ["RP"], birthDate: "1990-12-17", age: 35, currentRank: 350, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 384, name: "Tyler Soderstrom", mlbTeam: "ATH", positions: ["1B"], birthDate: "2001-11-24", age: 24, currentRank: 95, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 385, name: "Vinnie Pasquantino", mlbTeam: "KC", positions: ["1B"], birthDate: "1997-10-10", age: 28, currentRank: 94, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 386, name: "Vladimir Guerrero Jr.", mlbTeam: "TOR", positions: ["1B"], birthDate: "1999-03-16", age: 27, currentRank: 20, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 387, name: "Walbert Urena", mlbTeam: "LAA", positions: ["SP"], birthDate: "2004-01-25", age: 22, currentRank: 390, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 388, name: "Walker Jenkins", mlbTeam: "MIN", positions: ["OF"], birthDate: "2005-02-19", age: 21, currentRank: 68, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 389, name: "Will Smith", mlbTeam: "LAD", positions: ["C"], birthDate: "1995-03-28", age: 31, currentRank: 137, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 390, name: "Will Warren", mlbTeam: "NYY", positions: ["SP"], birthDate: "1999-06-16", age: 27, currentRank: 292, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 391, name: "William Contreras", mlbTeam: "MIL", positions: ["C"], birthDate: "1997-12-24", age: 28, currentRank: 67, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 392, name: "Willson Contreras", mlbTeam: "BOS", positions: ["1B"], birthDate: "1992-05-13", age: 34, currentRank: 218, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 393, name: "Willy Adames", mlbTeam: "SF", positions: ["SS"], birthDate: "1995-09-02", age: 30, currentRank: 132, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 394, name: "Wilson Rodriguez", mlbTeam: "NYM", positions: ["C"], birthDate: "2004-09-10", age: 21, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 395, name: "Wilyer Abreu", mlbTeam: "BOS", positions: ["OF"], birthDate: "1999-06-24", age: 27, currentRank: 186, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 396, name: "Wyatt Langford", mlbTeam: "TEX", positions: ["OF"], birthDate: "2001-11-15", age: 24, currentRank: 27, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 397, name: "Xander Bogaerts", mlbTeam: "SD", positions: ["2B"], birthDate: "1992-10-01", age: 33, currentRank: 324, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 398, name: "Xavier Edwards", mlbTeam: "MIA", positions: ["2B"], birthDate: "1999-08-09", age: 26, currentRank: 189, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 399, name: "Yainer Diaz", mlbTeam: "HOU", positions: ["C"], birthDate: "1998-09-21", age: 27, currentRank: 274, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 400, name: "Yandy Diaz", mlbTeam: "TB", positions: ["1B"], birthDate: "1991-08-08", age: 34, currentRank: 161, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 401, name: "Yordan Alvarez", mlbTeam: "HOU", positions: ["OF"], birthDate: "1997-06-27", age: 28, currentRank: 16, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 402, name: "Yoshinobu Yamamoto", mlbTeam: "LAD", positions: ["SP"], birthDate: "1998-08-17", age: 27, currentRank: 23, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 403, name: "Yu Darvish", mlbTeam: "SD", positions: ["SP"], birthDate: "1986-08-16", age: 39, currentRank: 360, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 404, name: "Zac Gallen", mlbTeam: "ARI", positions: ["SP"], birthDate: "1995-08-03", age: 30, currentRank: 339, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 405, name: "Zach Neto", mlbTeam: "LAA", positions: ["SS"], birthDate: "2001-01-31", age: 25, currentRank: 29, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 406, name: "Zack Gelof", mlbTeam: "ATH", positions: ["UTIL"], birthDate: "1999-10-19", age: 26, currentRank: 424, futureTier: "useful", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: false },
  { id: 407, name: "Zack Wheeler", mlbTeam: "PHI", positions: ["SP"], birthDate: "1990-05-30", age: 36, currentRank: 159, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 408, name: "Zyhir Hope", mlbTeam: "LAD", positions: ["OF"], birthDate: "2005-01-19", age: 21, currentRank: 193, futureTier: "prospectMedium", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 409, name: "Josuar Gonzalez", mlbTeam: "SF", positions: ["SS"], birthDate: "2007-10-16", age: 18, currentRank: 103, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 410, name: "Munetaka Murakami", mlbTeam: "", positions: ["UTIL"], birthDate: "2000-02-02", age: 26, currentRank: 105, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: true },
  { id: 411, name: "Noah Schultz", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-08-05", age: 22, currentRank: 144, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 412, name: "Addison Barger", mlbTeam: "TOR", positions: ["3B"], birthDate: "1999-11-12", age: 26, currentRank: 148, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 413, name: "Sam Antonacci", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-02-06", age: 23, currentRank: 152, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 414, name: "Brett Baty", mlbTeam: "NYM", positions: ["3B"], birthDate: "1999-11-13", age: 26, currentRank: 170, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 415, name: "Caleb Bonemer", mlbTeam: "", positions: ["UTIL"], birthDate: "2005-10-05", age: 20, currentRank: 171, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 416, name: "Arjun Nimmala", mlbTeam: "TOR", positions: ["SS"], birthDate: "2005-10-16", age: 20, currentRank: 174, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 417, name: "Devin Fitz-Gerald", mlbTeam: "WAS", positions: ["2B"], birthDate: "2005-08-17", age: 20, currentRank: 175, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 418, name: "Eric Hartman", mlbTeam: "ATL", positions: ["OF"], birthDate: "2006-06-16", age: 20, currentRank: 176, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 419, name: "Braden Montgomery", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-04-16", age: 23, currentRank: 179, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 420, name: "Kyle Manzardo", mlbTeam: "CLE", positions: ["1B"], birthDate: "2000-07-18", age: 25, currentRank: 181, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 421, name: "Jhonny Level", mlbTeam: "SF", positions: ["SS"], birthDate: "2007-03-29", age: 19, currentRank: 184, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 422, name: "Theo Gillen", mlbTeam: "TB", positions: ["OF"], birthDate: "2005-09-12", age: 20, currentRank: 190, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 423, name: "Mark Vientos", mlbTeam: "NYM", positions: ["3B"], birthDate: "1999-12-11", age: 26, currentRank: 192, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 424, name: "Edward Cabrera", mlbTeam: "CHC", positions: ["SP"], birthDate: "1998-04-13", age: 28, currentRank: 199, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 425, name: "Luis Hernandez", mlbTeam: "SF", positions: ["SS"], birthDate: "2002-07-17", age: 23, currentRank: 210, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 426, name: "Eugenio Suarez", mlbTeam: "CIN", positions: ["3B"], birthDate: "1991-07-18", age: 34, currentRank: 213, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: true },
  { id: 427, name: "Henry Bolte", mlbTeam: "ATH", positions: ["OF"], birthDate: "2003-08-04", age: 22, currentRank: 216, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 428, name: "Miguel Vargas", mlbTeam: "", positions: ["UTIL"], birthDate: "1999-11-17", age: 26, currentRank: 224, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 429, name: "Seaver King", mlbTeam: "WAS", positions: ["SS"], birthDate: "2003-04-25", age: 23, currentRank: 225, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 430, name: "Anthony Eyanson", mlbTeam: "BOS", positions: ["SP"], birthDate: "2004-10-09", age: 21, currentRank: 226, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 431, name: "Brody Hopkins", mlbTeam: "TB", positions: ["SP"], birthDate: "2002-01-18", age: 24, currentRank: 232, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 432, name: "Angel Genao", mlbTeam: "CLE", positions: ["SS"], birthDate: "2004-05-19", age: 22, currentRank: 233, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 433, name: "Dax Kilby", mlbTeam: "NYY", positions: ["SS"], birthDate: "2006-11-17", age: 19, currentRank: 234, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 434, name: "Joshua Baez", mlbTeam: "STL", positions: ["OF"], birthDate: "2003-06-28", age: 22, currentRank: 235, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 435, name: "Kyle Teel", mlbTeam: "", positions: ["UTIL"], birthDate: "2002-02-15", age: 24, currentRank: 236, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 436, name: "Michael Arroyo", mlbTeam: "SEA", positions: ["OF"], birthDate: "2004-11-03", age: 21, currentRank: 239, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 437, name: "Jack Leiter", mlbTeam: "TEX", positions: ["SP"], birthDate: "2000-04-21", age: 26, currentRank: 240, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 438, name: "Josiah Hartshorn", mlbTeam: "CHC", positions: ["OF"], birthDate: "2007-02-02", age: 19, currentRank: 241, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 439, name: "Roldy Brito", mlbTeam: "COL", positions: ["OF"], birthDate: "2007-04-08", age: 19, currentRank: 243, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 440, name: "Luis Lara", mlbTeam: "MIL", positions: ["OF"], birthDate: "2004-11-17", age: 21, currentRank: 244, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 441, name: "Anthony Volpe", mlbTeam: "NYY", positions: ["SS"], birthDate: "2001-04-28", age: 25, currentRank: 245, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 442, name: "Xavier Neyens", mlbTeam: "HOU", positions: ["SS"], birthDate: "2006-10-29", age: 19, currentRank: 247, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 443, name: "Tyler Bremner", mlbTeam: "LAA", positions: ["SP"], birthDate: "2004-04-20", age: 22, currentRank: 248, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 444, name: "Luis Castillo", mlbTeam: "SEA", positions: ["SP"], birthDate: "1992-12-12", age: 33, currentRank: 250, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 445, name: "Edwin Arroyo", mlbTeam: "CIN", positions: ["SS"], birthDate: "2003-08-25", age: 22, currentRank: 255, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 446, name: "Luis Robert Jr", mlbTeam: "", positions: ["UTIL"], birthDate: "1997-08-03", age: 28, currentRank: 257, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 447, name: "Elmer Rodriguez-Cruz", mlbTeam: "NYY", positions: ["SP"], birthDate: "2003-08-18", age: 22, currentRank: 260, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 448, name: "Josh Hammond", mlbTeam: "KC", positions: ["SS"], birthDate: "2006-09-21", age: 19, currentRank: 264, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 449, name: "Emil Morales", mlbTeam: "LAD", positions: ["SS"], birthDate: "2006-09-22", age: 19, currentRank: 265, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 450, name: "Cooper Pratt", mlbTeam: "MIL", positions: ["SS"], birthDate: "2004-08-18", age: 21, currentRank: 267, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 451, name: "Gage Wood", mlbTeam: "PHI", positions: ["SP"], birthDate: "2003-12-15", age: 22, currentRank: 272, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 452, name: "Justin Gonzales", mlbTeam: "BOS", positions: ["OF"], birthDate: "2006-12-31", age: 19, currentRank: 277, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 453, name: "Steele Hall", mlbTeam: "CIN", positions: ["SS"], birthDate: "2007-07-24", age: 18, currentRank: 278, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 454, name: "Dylan Beavers", mlbTeam: "BAL", positions: ["OF"], birthDate: "2001-08-11", age: 24, currentRank: 279, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 455, name: "Daulton Varsho", mlbTeam: "TOR", positions: ["OF"], birthDate: "1996-07-02", age: 29, currentRank: 283, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 456, name: "Ezequiel Tovar", mlbTeam: "COL", positions: ["SS"], birthDate: "2001-08-01", age: 24, currentRank: 284, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 457, name: "Grant Taylor", mlbTeam: "", positions: ["UTIL"], birthDate: "2002-05-20", age: 24, currentRank: 285, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 458, name: "Colson Montgomery", mlbTeam: "", positions: ["UTIL"], birthDate: "2002-02-27", age: 24, currentRank: 288, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 459, name: "Ryne Nelson", mlbTeam: "ARI", positions: ["SP"], birthDate: "1998-02-01", age: 28, currentRank: 297, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 460, name: "Zebby Matthews", mlbTeam: "MIN", positions: ["SP"], birthDate: "2000-05-22", age: 26, currentRank: 298, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 461, name: "Braylon Payne", mlbTeam: "MIL", positions: ["OF"], birthDate: "2006-08-14", age: 19, currentRank: 301, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 462, name: "Ronny Cruz", mlbTeam: "WAS", positions: ["SS"], birthDate: "2006-08-24", age: 19, currentRank: 303, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 463, name: "Kerry Carpenter", mlbTeam: "DET", positions: ["OF"], birthDate: "1997-09-02", age: 28, currentRank: 304, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 464, name: "Josh Adamczewski", mlbTeam: "MIL", positions: ["OF"], birthDate: "2005-05-10", age: 21, currentRank: 305, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 465, name: "Connor Prielipp", mlbTeam: "MIN", positions: ["SP"], birthDate: "2001-01-10", age: 25, currentRank: 306, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 466, name: "Sal Frelick", mlbTeam: "MIL", positions: ["OF"], birthDate: "2000-04-19", age: 26, currentRank: 309, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 467, name: "Colt Keith", mlbTeam: "DET", positions: ["2B"], birthDate: "2001-08-14", age: 24, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 468, name: "Daniel Palencia", mlbTeam: "CHC", positions: ["RP"], birthDate: "2000-02-05", age: 26, currentRank: 311, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 469, name: "Luis Garcia Jr.", mlbTeam: "WAS", positions: ["2B"], birthDate: "2000-05-16", age: 26, currentRank: 312, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 470, name: "Jeff Hoffman", mlbTeam: "TOR", positions: ["RP"], birthDate: "1993-01-08", age: 33, currentRank: 313, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 471, name: "Taitn Gray", mlbTeam: "TB", positions: ["1B"], birthDate: "2007-08-16", age: 18, currentRank: 314, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 472, name: "JoJo Parker", mlbTeam: "TOR", positions: ["SS"], birthDate: "2006-08-08", age: 19, currentRank: 315, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 473, name: "Aaron Nola", mlbTeam: "PHI", positions: ["SP"], birthDate: "1993-06-04", age: 33, currentRank: 317, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 474, name: "Demetrio Crisantes", mlbTeam: "ARI", positions: ["2B"], birthDate: "2004-09-05", age: 21, currentRank: 318, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 475, name: "Tate Southisene", mlbTeam: "ATL", positions: ["SS"], birthDate: "2006-10-06", age: 19, currentRank: 319, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 476, name: "Pedro Ramirez", mlbTeam: "CHC", positions: ["3B"], birthDate: "2004-04-01", age: 22, currentRank: 321, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 477, name: "Coby Mayo", mlbTeam: "BAL", positions: ["3B"], birthDate: "2001-12-10", age: 24, currentRank: 322, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 478, name: "Triston Casas", mlbTeam: "BOS", positions: ["1B"], birthDate: "2000-01-15", age: 26, currentRank: 323, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 479, name: "AJ Smith-Shawver", mlbTeam: "ATL", positions: ["SP"], birthDate: "2002-11-20", age: 23, currentRank: 325, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 480, name: "Charles Davalan", mlbTeam: "LAD", positions: ["OF"], birthDate: "2003-12-16", age: 22, currentRank: 327, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 481, name: "Cooper Flemming", mlbTeam: "TB", positions: ["SS"], birthDate: "2006-08-05", age: 19, currentRank: 328, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 482, name: "Luis Perales", mlbTeam: "WAS", positions: ["SP"], birthDate: "2003-04-14", age: 23, currentRank: 330, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 483, name: "Austin Wells", mlbTeam: "NYY", positions: ["C"], birthDate: "1999-07-12", age: 26, currentRank: 331, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 484, name: "River Ryan", mlbTeam: "LAD", positions: ["SP"], birthDate: "1998-08-17", age: 27, currentRank: 338, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 485, name: "Wei-En Lin", mlbTeam: "ATH", positions: ["SP"], birthDate: "2005-11-04", age: 20, currentRank: 340, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 486, name: "Wyatt Sanford", mlbTeam: "PIT", positions: ["SS"], birthDate: "2005-11-24", age: 20, currentRank: 343, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 487, name: "Quinn Priester", mlbTeam: "MIL", positions: ["SP"], birthDate: "2000-09-16", age: 25, currentRank: 344, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 488, name: "Nathan Flewelling", mlbTeam: "TB", positions: ["C"], birthDate: "2006-11-11", age: 19, currentRank: 345, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 489, name: "Trevor Rogers", mlbTeam: "BAL", positions: ["SP"], birthDate: "1997-11-13", age: 28, currentRank: 346, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 490, name: "Landen Roupp", mlbTeam: "SF", positions: ["SP"], birthDate: "1998-09-10", age: 27, currentRank: 347, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 491, name: "Caden Scarborough", mlbTeam: "TEX", positions: ["SP"], birthDate: "2005-04-01", age: 21, currentRank: 350, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 492, name: "John Gil", mlbTeam: "ATL", positions: ["SS"], birthDate: "2006-05-14", age: 20, currentRank: 351, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 493, name: "Anderson Brito", mlbTeam: "TB", positions: ["SP"], birthDate: "2004-07-07", age: 21, currentRank: 355, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 494, name: "Nolan Schanuel", mlbTeam: "LAA", positions: ["1B"], birthDate: "2002-02-14", age: 24, currentRank: 356, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 495, name: "Andrew Vaughn", mlbTeam: "MIL", positions: ["1B"], birthDate: "1998-04-03", age: 28, currentRank: 357, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 496, name: "Troy Melton", mlbTeam: "DET", positions: ["SP"], birthDate: "2000-12-03", age: 25, currentRank: 358, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 497, name: "Ethan Petry", mlbTeam: "WAS", positions: ["OF"], birthDate: "2004-06-17", age: 22, currentRank: 361, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 498, name: "Justin Crawford", mlbTeam: "PHI", positions: ["OF"], birthDate: "2004-01-13", age: 22, currentRank: 362, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 499, name: "Esmerlyn Valdez", mlbTeam: "PIT", positions: ["OF"], birthDate: "2004-01-27", age: 22, currentRank: 363, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 500, name: "Robert Arias", mlbTeam: "CLE", positions: ["OF"], birthDate: "2006-09-13", age: 19, currentRank: 364, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 501, name: "Karson Milbrandt", mlbTeam: "MIA", positions: ["SP"], birthDate: "2004-04-21", age: 22, currentRank: 366, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 502, name: "Ryan Pepiot", mlbTeam: "TB", positions: ["SP"], birthDate: "1997-08-21", age: 28, currentRank: 369, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 503, name: "James Tibbs III", mlbTeam: "LAD", positions: ["OF"], birthDate: "2002-10-01", age: 23, currentRank: 370, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 504, name: "Yohendrick Pinango", mlbTeam: "TOR", positions: ["OF"], birthDate: "2002-05-07", age: 24, currentRank: 371, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 505, name: "Lars Nootbaar", mlbTeam: "STL", positions: ["OF"], birthDate: "1997-09-08", age: 28, currentRank: 372, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 506, name: "Hector Rodriguez", mlbTeam: "CIN", positions: ["OF"], birthDate: "2004-03-11", age: 22, currentRank: 373, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 507, name: "Caleb Durbin", mlbTeam: "BOS", positions: ["2B"], birthDate: "2000-02-22", age: 26, currentRank: 374, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 508, name: "Cade Cavalli", mlbTeam: "WAS", positions: ["SP"], birthDate: "1998-08-14", age: 27, currentRank: 376, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 509, name: "Salvador Perez", mlbTeam: "KC", positions: ["C"], birthDate: "1990-05-10", age: 36, currentRank: 378, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: true },
  { id: 510, name: "Evan Carter", mlbTeam: "TEX", positions: ["OF"], birthDate: "2002-08-29", age: 23, currentRank: 379, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 511, name: "Jesus Sanchez", mlbTeam: "TOR", positions: ["OF"], birthDate: "1997-10-07", age: 28, currentRank: 380, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 512, name: "Griffin Jax", mlbTeam: "TB", positions: ["RP"], birthDate: "1994-11-22", age: 31, currentRank: 382, futureTier: "useful", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 513, name: "Giancarlo Stanton", mlbTeam: "NYY", positions: ["OF"], birthDate: "1989-11-08", age: 36, currentRank: 383, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: true },
  { id: 514, name: "Carson Williams", mlbTeam: "TB", positions: ["SS"], birthDate: "2003-06-25", age: 22, currentRank: 384, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 515, name: "Brayan Bello", mlbTeam: "BOS", positions: ["SP"], birthDate: "1999-05-17", age: 27, currentRank: 387, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 516, name: "Jackson Kent", mlbTeam: "WAS", positions: ["SP"], birthDate: "2003-02-10", age: 23, currentRank: 388, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 517, name: "Edgar Quero", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-04-06", age: 23, currentRank: 389, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 518, name: "Trevor Larnach", mlbTeam: "MIN", positions: ["OF"], birthDate: "1997-02-26", age: 29, currentRank: 392, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 519, name: "Brenton Doyle", mlbTeam: "COL", positions: ["OF"], birthDate: "1998-05-14", age: 28, currentRank: 394, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 520, name: "Kevin Alvarez", mlbTeam: "HOU", positions: ["OF"], birthDate: "2008-01-13", age: 18, currentRank: 395, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 521, name: "Johnny King", mlbTeam: "TOR", positions: ["SP"], birthDate: "2006-07-26", age: 19, currentRank: 396, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 522, name: "Jhostynxon Garcia", mlbTeam: "PIT", positions: ["OF"], birthDate: "2002-12-11", age: 23, currentRank: 397, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 523, name: "Braylon Doughty", mlbTeam: "CLE", positions: ["SP"], birthDate: "2005-12-07", age: 20, currentRank: 399, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 524, name: "Jake Bennett", mlbTeam: "BOS", positions: ["SP"], birthDate: "2004-08-04", age: 21, currentRank: 400, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 525, name: "Mike Burrows", mlbTeam: "HOU", positions: ["SP"], birthDate: "1999-11-08", age: 26, currentRank: 403, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 526, name: "Juneiker Caceres", mlbTeam: "CLE", positions: ["OF"], birthDate: "2007-08-15", age: 18, currentRank: 404, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 527, name: "Ike Irish", mlbTeam: "BAL", positions: ["1B"], birthDate: "2003-11-26", age: 22, currentRank: 406, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 528, name: "Tanner Franklin", mlbTeam: "STL", positions: ["SP"], birthDate: "2004-05-25", age: 22, currentRank: 407, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 529, name: "Ramon Laureano", mlbTeam: "SD", positions: ["OF"], birthDate: "1994-07-15", age: 31, currentRank: 408, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 530, name: "Jefferson Rojas", mlbTeam: "CHC", positions: ["SS"], birthDate: "2005-04-25", age: 21, currentRank: 409, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 531, name: "Joe Boyle", mlbTeam: "TB", positions: ["SP"], birthDate: "1999-08-14", age: 26, currentRank: 411, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 532, name: "Daniel Pierce", mlbTeam: "TB", positions: ["SS"], birthDate: "2006-08-04", age: 19, currentRank: 412, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 533, name: "Kumar Rocker", mlbTeam: "TEX", positions: ["SP"], birthDate: "1999-11-22", age: 26, currentRank: 413, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 534, name: "Alejandro Osuna", mlbTeam: "TEX", positions: ["OF"], birthDate: "2002-10-10", age: 23, currentRank: 414, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 535, name: "Jose Caballero", mlbTeam: "NYY", positions: ["2B"], birthDate: "1996-08-30", age: 29, currentRank: 417, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 536, name: "Gavin Fien", mlbTeam: "WAS", positions: ["SS"], birthDate: "2007-03-08", age: 19, currentRank: 418, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 537, name: "Jonny Farmelo", mlbTeam: "SEA", positions: ["OF"], birthDate: "2004-09-09", age: 21, currentRank: 420, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 538, name: "Matt Wallner", mlbTeam: "MIN", positions: ["OF"], birthDate: "1997-12-12", age: 28, currentRank: 421, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 539, name: "Ryan Clifford", mlbTeam: "NYM", positions: ["1B"], birthDate: "2003-07-20", age: 22, currentRank: 422, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 540, name: "Noah Cameron", mlbTeam: "KC", positions: ["SP"], birthDate: "1999-07-17", age: 26, currentRank: 423, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 541, name: "JD Dix", mlbTeam: "ARI", positions: ["SS"], birthDate: "2005-10-12", age: 20, currentRank: 426, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 542, name: "Justin Lamkin", mlbTeam: "KC", positions: ["SP"], birthDate: "2004-06-01", age: 22, currentRank: 428, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 543, name: "Spencer Jones", mlbTeam: "NYY", positions: ["OF"], birthDate: "2001-05-14", age: 25, currentRank: 429, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 544, name: "Adolis Garcia", mlbTeam: "PHI", positions: ["OF"], birthDate: "1993-03-02", age: 33, currentRank: 432, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 545, name: "Xavier Isaac", mlbTeam: "TB", positions: ["1B"], birthDate: "2003-12-17", age: 22, currentRank: 433, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 546, name: "Felnin Celestin", mlbTeam: "SEA", positions: ["SS"], birthDate: "2005-09-15", age: 20, currentRank: 434, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 547, name: "Andres Gimenez", mlbTeam: "TOR", positions: ["2B"], birthDate: "1998-09-04", age: 27, currentRank: 435, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 548, name: "Spencer Horwitz", mlbTeam: "PIT", positions: ["1B"], birthDate: "1997-11-14", age: 28, currentRank: 436, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 549, name: "Lucas Giolito", mlbTeam: "SD", positions: ["SP"], birthDate: "1994-07-14", age: 31, currentRank: 437, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 550, name: "Jasson Dominguez", mlbTeam: "NYY", positions: ["OF"], birthDate: "2003-02-07", age: 23, currentRank: 438, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 551, name: "Marcus Semien", mlbTeam: "NYM", positions: ["2B"], birthDate: "1990-09-17", age: 35, currentRank: 439, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "aging", needsReview: true },
  { id: 552, name: "Kendall George", mlbTeam: "LAD", positions: ["OF"], birthDate: "2004-10-29", age: 21, currentRank: 440, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 553, name: "Miguel Sime Jr.", mlbTeam: "WAS", positions: ["SP"], birthDate: "2007-05-08", age: 19, currentRank: 441, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 554, name: "Andrew Fischer", mlbTeam: "MIL", positions: ["3B"], birthDate: "2004-05-25", age: 22, currentRank: 442, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 555, name: "Jordan Beck", mlbTeam: "COL", positions: ["OF"], birthDate: "2001-04-19", age: 25, currentRank: 443, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 556, name: "Bryce Rainer", mlbTeam: "DET", positions: ["SS"], birthDate: "2005-07-03", age: 20, currentRank: 444, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 557, name: "Eduardo Tait", mlbTeam: "MIN", positions: ["C"], birthDate: "2006-08-27", age: 19, currentRank: 445, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 558, name: "TJ Friedl", mlbTeam: "CIN", positions: ["OF"], birthDate: "1995-08-14", age: 30, currentRank: 448, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 559, name: "Jake Burger", mlbTeam: "TEX", positions: ["1B"], birthDate: "1996-04-10", age: 30, currentRank: 450, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 560, name: "Ha-Seong Kim", mlbTeam: "ATL", positions: ["SS"], birthDate: "1995-10-17", age: 30, currentRank: 453, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 561, name: "Bo Davidson", mlbTeam: "SF", positions: ["OF"], birthDate: "2002-07-05", age: 23, currentRank: 454, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 562, name: "Chase Meidroth", mlbTeam: "", positions: ["UTIL"], birthDate: "2001-07-23", age: 24, currentRank: 456, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 563, name: "Trent Grisham", mlbTeam: "NYY", positions: ["OF"], birthDate: "1996-11-01", age: 29, currentRank: 458, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 564, name: "Luis Morales", mlbTeam: "ATH", positions: ["SP"], birthDate: "2002-09-24", age: 23, currentRank: 459, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 565, name: "Clay Holmes", mlbTeam: "NYM", positions: ["SP"], birthDate: "1993-03-27", age: 33, currentRank: 460, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 566, name: "Parker Meadows", mlbTeam: "DET", positions: ["OF"], birthDate: "1999-11-02", age: 26, currentRank: 461, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 567, name: "Brady House", mlbTeam: "WAS", positions: ["3B"], birthDate: "2003-06-04", age: 23, currentRank: 462, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 568, name: "Shane Smith", mlbTeam: "", positions: ["UTIL"], birthDate: "2000-04-04", age: 26, currentRank: 465, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 569, name: "Joey Ortiz", mlbTeam: "MIL", positions: ["SS"], birthDate: "1998-07-14", age: 27, currentRank: 466, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 570, name: "Kodai Senga", mlbTeam: "NYM", positions: ["SP"], birthDate: "1993-01-30", age: 33, currentRank: 467, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 571, name: "Braxton Garrett", mlbTeam: "MIA", positions: ["SP"], birthDate: "1997-08-05", age: 28, currentRank: 468, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 572, name: "Chad Patrick", mlbTeam: "MIL", positions: ["SP"], birthDate: "1998-08-14", age: 27, currentRank: 469, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 573, name: "Grant Holmes", mlbTeam: "ATL", positions: ["SP"], birthDate: "1996-03-22", age: 30, currentRank: 470, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 574, name: "Curtis Mead", mlbTeam: "", positions: ["UTIL"], birthDate: "2000-10-26", age: 25, currentRank: 474, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 575, name: "Jorge Polanco", mlbTeam: "NYM", positions: ["2B"], birthDate: "1993-07-05", age: 32, currentRank: 475, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 576, name: "Josh Smith", mlbTeam: "TEX", positions: ["3B"], birthDate: "1997-08-07", age: 28, currentRank: 476, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 577, name: "Hurston Waldrep", mlbTeam: "ATL", positions: ["SP"], birthDate: "2002-03-01", age: 24, currentRank: 477, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 578, name: "Chase Dollander", mlbTeam: "COL", positions: ["SP"], birthDate: "2001-10-26", age: 24, currentRank: 478, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 579, name: "Brice Matthews", mlbTeam: "HOU", positions: ["SS"], birthDate: "2002-03-16", age: 24, currentRank: 480, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 580, name: "Nolan Gorman", mlbTeam: "STL", positions: ["2B"], birthDate: "2000-05-10", age: 26, currentRank: 481, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 581, name: "Isaac Collins", mlbTeam: "KC", positions: ["OF"], birthDate: "1997-07-22", age: 28, currentRank: 482, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 582, name: "Victor Robles", mlbTeam: "SEA", positions: ["OF"], birthDate: "1997-05-19", age: 29, currentRank: 483, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 583, name: "Josh Lowe", mlbTeam: "TB", positions: ["OF"], birthDate: "1998-02-02", age: 28, currentRank: 484, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 584, name: "Josh Owens", mlbTeam: "TEX", positions: ["SS", "SP"], birthDate: "2007-01-08", age: 19, currentRank: 487, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 585, name: "Harrison Bader", mlbTeam: "SF", positions: ["OF"], birthDate: "1994-06-03", age: 32, currentRank: 488, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 586, name: "Austin Hays", mlbTeam: "", positions: ["UTIL"], birthDate: "1995-07-05", age: 30, currentRank: 489, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 587, name: "Tyler Freeman", mlbTeam: "COL", positions: ["OF"], birthDate: "1999-05-21", age: 27, currentRank: 490, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 588, name: "Carlos Narvaez", mlbTeam: "BOS", positions: ["C"], birthDate: "1998-11-26", age: 27, currentRank: 491, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 589, name: "Marcell Ozuna", mlbTeam: "PIT", positions: ["UTIL"], birthDate: "1990-11-12", age: 35, currentRank: 492, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "aging", needsReview: true },
  { id: 590, name: "Cole Carrigg", mlbTeam: "COL", positions: ["OF"], birthDate: "2002-05-08", age: 24, currentRank: 493, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 591, name: "Ronny Mauricio", mlbTeam: "NYM", positions: ["2B"], birthDate: "2001-04-04", age: 25, currentRank: 495, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 592, name: "Carlos Cortes", mlbTeam: "ATH", positions: ["OF"], birthDate: "1997-06-30", age: 28, currentRank: 496, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 593, name: "Ian Seymour", mlbTeam: "TB", positions: ["SP"], birthDate: "1998-12-13", age: 27, currentRank: 498, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 594, name: "Yolfran Castillo", mlbTeam: "TEX", positions: ["SS"], birthDate: "2007-02-08", age: 19, currentRank: 499, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 595, name: "Jake Bloss", mlbTeam: "TOR", positions: ["SP"], birthDate: "2001-06-23", age: 25, currentRank: 500, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 596, name: "Abner Uribe", mlbTeam: "MIL", positions: ["RP"], birthDate: "2000-06-20", age: 26, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 597, name: "Alex Clemmey", mlbTeam: "WSH", positions: ["SP"], birthDate: "2005-07-18", age: 20, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 598, name: "Alex Freeland", mlbTeam: "LAD", positions: ["SS"], birthDate: "2001-08-24", age: 24, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 599, name: "Anthony Santander", mlbTeam: "TOR", positions: ["OF"], birthDate: "1994-10-19", age: 31, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 600, name: "Ben Casparius", mlbTeam: "LAD", positions: ["RP"], birthDate: "1999-02-11", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 601, name: "Blake Mitchell", mlbTeam: "KC", positions: ["C"], birthDate: "2004-08-03", age: 21, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 602, name: "Brandon Pfaadt", mlbTeam: "AZ", positions: ["SP"], birthDate: "1998-10-15", age: 27, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 603, name: "Bryan Abreu", mlbTeam: "HOU", positions: ["RP"], birthDate: "1997-04-22", age: 29, currentRank: 650, futureTier: "useful", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 604, name: "C.J. Kayfus", mlbTeam: "CLE", positions: ["1B"], birthDate: "2001-10-28", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 605, name: "Caden Dana", mlbTeam: "LAA", positions: ["SP"], birthDate: "2003-12-17", age: 22, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 606, name: "Cam Collier", mlbTeam: "CIN", positions: ["3B"], birthDate: "2004-11-20", age: 21, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 607, name: "Camilo Doval", mlbTeam: "NYY", positions: ["RP"], birthDate: "1997-07-04", age: 28, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 608, name: "Carlos Estevez", mlbTeam: "KC", positions: ["RP"], birthDate: "1992-12-28", age: 33, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 609, name: "Carson Whisenhunt", mlbTeam: "SF", positions: ["SP"], birthDate: "2000-10-20", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 610, name: "Chase Petty", mlbTeam: "CIN", positions: ["SP"], birthDate: "2003-04-04", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 611, name: "Christian Moore", mlbTeam: "LAA", positions: ["2B"], birthDate: "2002-10-21", age: 23, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 612, name: "Christian Scott", mlbTeam: "NYM", positions: ["SP"], birthDate: "1999-06-15", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 613, name: "Clarke Schmidt", mlbTeam: "NYY", positions: ["SP"], birthDate: "1996-02-20", age: 30, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 614, name: "Connor Norby", mlbTeam: "MIA", positions: ["3B"], birthDate: "2000-06-08", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 615, name: "Cristian Javier", mlbTeam: "HOU", positions: ["SP"], birthDate: "1997-03-26", age: 29, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 616, name: "David Festa", mlbTeam: "MIN", positions: ["SP"], birthDate: "2000-03-08", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 617, name: "David Peterson", mlbTeam: "NYM", positions: ["SP"], birthDate: "1995-09-03", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 618, name: "Dennis Santana", mlbTeam: "PIT", positions: ["RP"], birthDate: "1996-04-12", age: 30, currentRank: 650, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 619, name: "Deyvison De Los Santos", mlbTeam: "MIA", positions: ["3B"], birthDate: "2003-06-21", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 620, name: "Edgar Quero", mlbTeam: "CWS", positions: ["C"], birthDate: "2003-04-06", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 621, name: "Emilio Pagan", mlbTeam: "CIN", positions: ["RP"], birthDate: "1991-05-07", age: 35, currentRank: 650, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 622, name: "Felix Bautista", mlbTeam: "BAL", positions: ["RP"], birthDate: "1995-06-20", age: 31, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 623, name: "Felnin Celesten", mlbTeam: "SEA", positions: ["SS"], birthDate: "2005-09-15", age: 20, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 624, name: "George Lombard", mlbTeam: "NYY", positions: ["SS"], birthDate: "2005-06-02", age: 21, currentRank: 650, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 625, name: "Harry Ford", mlbTeam: "WSH", positions: ["C"], birthDate: "2003-02-21", age: 23, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 626, name: "Hayden Birdsong", mlbTeam: "SF", positions: ["SP"], birthDate: "2001-08-30", age: 24, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 627, name: "Hunter Barco", mlbTeam: "PIT", positions: ["SP"], birthDate: "2000-12-15", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 628, name: "Hyeseong Kim", mlbTeam: "LAD", positions: ["2B"], birthDate: "1999-01-27", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 629, name: "J.P. Crawford", mlbTeam: "SEA", positions: ["SS"], birthDate: "1995-01-11", age: 31, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 630, name: "Jackson Ferris", mlbTeam: "LAD", positions: ["SP"], birthDate: "2004-01-15", age: 22, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 631, name: "Jacob Lopez", mlbTeam: "ATH", positions: ["SP"], birthDate: "1998-03-11", age: 28, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 632, name: "Jacob Melton", mlbTeam: "HOU", positions: ["OF"], birthDate: "2000-09-07", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 633, name: "Jacob Reimer", mlbTeam: "NYM", positions: ["3B"], birthDate: "2004-02-22", age: 22, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 634, name: "Jaison Chourio", mlbTeam: "CLE", positions: ["OF"], birthDate: "2005-05-19", age: 21, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 635, name: "Jeferson Quero", mlbTeam: "MIL", positions: ["C"], birthDate: "2002-10-08", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 636, name: "Jeremiah Estrada", mlbTeam: "SD", positions: ["RP"], birthDate: "1998-11-01", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 637, name: "Joey Cantillo", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-12-18", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 638, name: "Jose Berrios", mlbTeam: "TOR", positions: ["SP"], birthDate: "1994-05-27", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 639, name: "Jurickson Profar", mlbTeam: "ATL", positions: ["OF"], birthDate: "1993-02-20", age: 33, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 640, name: "Justin Martinez", mlbTeam: "AZ", positions: ["RP"], birthDate: "2001-07-30", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 641, name: "Kenley Jansen", mlbTeam: "LAA", positions: ["RP"], birthDate: "1987-09-30", age: 38, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 642, name: "Kevin Alcantara", mlbTeam: "CHC", positions: ["OF"], birthDate: "2002-07-12", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 643, name: "Kyle Finnegan", mlbTeam: "DET", positions: ["RP"], birthDate: "1991-09-04", age: 34, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 644, name: "Lenyn Sosa", mlbTeam: "CWS", positions: ["2B"], birthDate: "2000-01-25", age: 26, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 645, name: "Leodalis De Vries", mlbTeam: "OAK", positions: ["SS"], birthDate: "2006-10-11", age: 19, currentRank: 650, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 646, name: "Lourdes Gurriel Jr.", mlbTeam: "AZ", positions: ["OF"], birthDate: "1993-10-10", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 647, name: "Luis Garcia", mlbTeam: "WSH", positions: ["2B"], birthDate: "2000-05-16", age: 26, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 648, name: "Luis Gil", mlbTeam: "NYY", positions: ["SP"], birthDate: "1998-06-03", age: 28, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 649, name: "Luisangel Acuna", mlbTeam: "NYM", positions: ["2B"], birthDate: "2002-03-12", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 650, name: "Matthew Liberatore", mlbTeam: "STL", positions: ["SP"], birthDate: "1999-11-06", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 651, name: "Max Muncy", mlbTeam: "ATH", positions: ["3B"], birthDate: "2002-08-25", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 652, name: "Merrill Kelly", mlbTeam: "TEX", positions: ["SP"], birthDate: "1988-10-14", age: 37, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: true },
  { id: 653, name: "Mike Yastrzemski", mlbTeam: "ATL", positions: ["OF"], birthDate: "1990-08-23", age: 35, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "aging", needsReview: true },
  { id: 654, name: "Randy Rodriguez", mlbTeam: "SF", positions: ["RP"], birthDate: "1999-09-05", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 655, name: "Reese Olson", mlbTeam: "DET", positions: ["SP"], birthDate: "1999-07-31", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 656, name: "Reynaldo Lopez", mlbTeam: "ATL", positions: ["SP"], birthDate: "1994-01-04", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 657, name: "Ricky Tiedemann", mlbTeam: "TOR", positions: ["SP"], birthDate: "2002-08-18", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 658, name: "Ronny Henriquez", mlbTeam: "MIA", positions: ["RP"], birthDate: "2000-06-20", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 659, name: "Ryan Walker", mlbTeam: "SF", positions: ["RP"], birthDate: "1995-11-26", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 660, name: "Sean Burke", mlbTeam: "CWS", positions: ["SP"], birthDate: "1999-12-18", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 661, name: "Shane Smith", mlbTeam: "CWS", positions: ["SP"], birthDate: "2000-04-04", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 662, name: "Simeon Woods Richardson", mlbTeam: "MIN", positions: ["SP"], birthDate: "2000-09-27", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 663, name: "Slade Caldwell", mlbTeam: "AZ", positions: ["OF"], birthDate: "2006-06-18", age: 20, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 664, name: "Termarr Johnson", mlbTeam: "PIT", positions: ["SS"], birthDate: "2004-06-11", age: 22, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 665, name: "Tylor Megill", mlbTeam: "NYM", positions: ["SP"], birthDate: "1995-07-28", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 666, name: "Victor Scott", mlbTeam: "STL", positions: ["OF"], birthDate: "2001-02-12", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 667, name: "Victor Scott II", mlbTeam: "STL", positions: ["OF"], birthDate: "2001-02-12", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 668, name: "Will Vest", mlbTeam: "DET", positions: ["RP"], birthDate: "1995-06-06", age: 31, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 669, name: "Yusei Kikuchi", mlbTeam: "LAA", positions: ["SP"], birthDate: "1991-06-17", age: 35, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: true },
  { id: 670, name: "Zac Veen", mlbTeam: "COL", positions: ["OF"], birthDate: "2001-12-12", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 671, name: "Zach Eflin", mlbTeam: "FA", positions: ["SP"], birthDate: "1994-04-08", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 672, name: "Zack Littell", mlbTeam: "FA", positions: ["SP"], birthDate: "1995-10-05", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true }
];

export const players = RAW_PLAYERS.map(calculateDynastyValue).sort((a, b) => b.dynastyValue - a.dynastyValue);

export const playersByName = new Map(players.map((player) => [normalizeName(player.name), player]));

export function findPlayerByName(name) {
  return playersByName.get(normalizeName(name));
}

export function getPlayersByOwner(teamName, ownerLookup = new Map()) {
  const search = teamName.trim().toLowerCase();
  return players.filter((player) => {
    const owner = ownerLookup.get(normalizeName(player.name)) || "Free Agent";
    return owner.toLowerCase() === search;
  });
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

export function getRosterSummary(ownerLookup = new Map()) {
  return players.reduce((summary, player) => {
    const owner = ownerLookup.get(normalizeName(player.name)) || "Free Agent";
    summary[owner] ??= { totalPlayers: 0, totalValue: 0, needsReview: 0 };
    summary[owner].totalPlayers += 1;
    summary[owner].totalValue += player.dynastyValue;
    if (player.needsReview) summary[owner].needsReview += 1;
    return summary;
  }, {});
}