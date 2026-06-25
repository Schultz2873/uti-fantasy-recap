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
  { id: 1, name: "A.J. Ewing", fantasyTeam: "Me So Heorny", mlbTeam: "NYM", positions: ["OF"], birthDate: "2004-08-10", age: 21, currentRank: 64, futureTier: "prospectLow", categoryFitTier: "speedOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 2, name: "Aaron Ashby", fantasyTeam: "Mactown MacDaddies", mlbTeam: "", positions: ["SP"], birthDate: "1998-05-24", age: 28, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 3, name: "Aaron Judge", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "NYY", positions: ["OF"], birthDate: "1992-04-26", age: 34, currentRank: 11, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 4, name: "Adley Rutschman", fantasyTeam: "BB's Bold Team", mlbTeam: "BAL", positions: ["C"], birthDate: "1998-02-06", age: 28, currentRank: 230, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 5, name: "Adrian Morejon", fantasyTeam: "Me So Heorny", mlbTeam: "", positions: ["UTIL"], birthDate: "1999-02-27", age: 27, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 6, name: "Agustin Ramirez", fantasyTeam: "Gunnarrhea", mlbTeam: "MIA", positions: ["C"], birthDate: "2001-09-10", age: 24, currentRank: 145, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 7, name: "Aidan Miller", fantasyTeam: "You Don't Know Bo", mlbTeam: "PHI", positions: ["SS"], birthDate: "2004-06-09", age: 22, currentRank: 96, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 8, name: "Aiva Arquette", fantasyTeam: "John's Super Team", mlbTeam: "MIA", positions: ["SS"], birthDate: "2003-10-17", age: 22, currentRank: 341, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 9, name: "Alec Bohm", fantasyTeam: "Me So Heorny", mlbTeam: "PHI", positions: ["3B"], birthDate: "1996-08-03", age: 29, currentRank: 287, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 10, name: "Alec Burleson", fantasyTeam: "BB's Bold Team", mlbTeam: "STL", positions: ["1B"], birthDate: "1998-11-25", age: 27, currentRank: 254, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 11, name: "Alejandro Kirk", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "TOR", positions: ["C"], birthDate: "1998-11-06", age: 27, currentRank: 270, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 12, name: "Alex Bregman", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CHC", positions: ["3B"], birthDate: "1994-03-30", age: 32, currentRank: 140, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 13, name: "Alfredo Duno", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CIN", positions: ["C"], birthDate: "2006-01-07", age: 20, currentRank: 273, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 14, name: "Andres Munoz", fantasyTeam: "Dixon Cider", mlbTeam: "SEA", positions: ["RP"], birthDate: "1999-01-16", age: 27, currentRank: 116, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 15, name: "Andrew Abbott", fantasyTeam: "This Is Mizerable", mlbTeam: "CIN", positions: ["SP"], birthDate: "1999-06-01", age: 27, currentRank: 299, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 16, name: "Andrew Benintendi", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CHW", positions: ["OF"], birthDate: "1994-07-06", age: 31, currentRank: 330, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 17, name: "Andrew Painter", fantasyTeam: "BTA Boyz", mlbTeam: "PHI", positions: ["SP"], birthDate: "2003-04-10", age: 23, currentRank: 153, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 18, name: "Andy Pages", fantasyTeam: "Me So Heorny", mlbTeam: "LAD", positions: ["OF"], birthDate: "2000-12-08", age: 25, currentRank: 72, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 19, name: "Angel Martinez", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["2B", "OF"], birthDate: "2002-01-27", age: 24, currentRank: 310, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 20, name: "Aroldis Chapman", fantasyTeam: "John's Super Team", mlbTeam: "BOS", positions: ["RP"], birthDate: "1988-02-28", age: 38, currentRank: 390, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 21, name: "Austin Riley", fantasyTeam: "John's Super Team", mlbTeam: "ATL", positions: ["3B"], birthDate: "1997-04-02", age: 29, currentRank: 78, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 22, name: "Bailey Ober", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIN", positions: ["SP"], birthDate: "1995-07-12", age: 30, currentRank: 325, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 23, name: "Ben Brown", fantasyTeam: "Gunnarrhea", mlbTeam: "CHC", positions: ["SP"], birthDate: "1999-09-09", age: 26, currentRank: 405, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 24, name: "Ben Rice", fantasyTeam: "Dixon Cider", mlbTeam: "NYY", positions: ["C"], birthDate: "1999-02-22", age: 27, currentRank: 43, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 25, name: "Billy Carlson", fantasyTeam: "John's Super Team", mlbTeam: "CWS", positions: ["SS"], birthDate: "2006-07-29", age: 19, currentRank: 400, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 26, name: "Blake Snell", fantasyTeam: "John's Super Team", mlbTeam: "LAD", positions: ["SP"], birthDate: "1992-12-04", age: 33, currentRank: 147, futureTier: "shortTerm", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 27, name: "Blaze Jordan", fantasyTeam: "Me So Heorny", mlbTeam: "STL", positions: ["1B", "3B"], birthDate: "2002-12-19", age: 23, currentRank: 260, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 28, name: "Bo Bichette", fantasyTeam: "Gunnarrhea", mlbTeam: "NYM", positions: ["SS"], birthDate: "1998-03-05", age: 28, currentRank: 102, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 29, name: "Bobby Witt Jr.", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "KC", positions: ["SS"], birthDate: "2000-06-14", age: 26, currentRank: 3, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "veryLow", needsReview: false },
  { id: 30, name: "Braden Montgomery", fantasyTeam: "Me So Heorny", mlbTeam: "CWS", positions: ["OF"], birthDate: "2003-04-16", age: 23, currentRank: 251, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 31, name: "Brady Singer", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CIN", positions: ["SP"], birthDate: "1996-08-04", age: 29, currentRank: 413, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 32, name: "Brandon Lowe", fantasyTeam: "BTA Boyz", mlbTeam: "PIT", positions: ["2B"], birthDate: "1994-07-06", age: 31, currentRank: 209, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 33, name: "Brandon Marsh", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "PHI", positions: ["OF"], birthDate: "1997-12-18", age: 28, currentRank: 416, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 34, name: "Brandon Nimmo", fantasyTeam: "John's Super Team", mlbTeam: "TEX", positions: ["OF"], birthDate: "1993-03-27", age: 33, currentRank: 191, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 35, name: "Brandon Sproat", fantasyTeam: "BB's Bold Team", mlbTeam: "MIL", positions: ["SP"], birthDate: "2000-09-17", age: 25, currentRank: 365, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 36, name: "Brandon Woodruff", fantasyTeam: "Dixon Cider", mlbTeam: "MIL", positions: ["SP"], birthDate: "1993-02-10", age: 33, currentRank: 212, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 37, name: "Brandon Young", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BAL", positions: ["SP"], birthDate: "1998-08-19", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 38, name: "Braxton Ashcraft", fantasyTeam: "BTA Boyz", mlbTeam: "PIT", positions: ["SP"], birthDate: "1999-10-05", age: 26, currentRank: 269, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 39, name: "Brayan Rocchio", fantasyTeam: "You Don't Know Bo", mlbTeam: "CLE", positions: ["SS"], birthDate: "2001-01-13", age: 25, currentRank: 479, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 40, name: "Brendan Donovan", fantasyTeam: "Mactown MacDaddies", mlbTeam: "SEA", positions: ["2B"], birthDate: "1997-01-16", age: 29, currentRank: 308, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 41, name: "Brent Rooker", fantasyTeam: "BB's Bold Team", mlbTeam: "ATH", positions: ["OF"], birthDate: "1994-11-01", age: 31, currentRank: 93, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 42, name: "Brice Turang", fantasyTeam: "BB's Bold Team", mlbTeam: "MIL", positions: ["2B"], birthDate: "1999-11-21", age: 26, currentRank: 58, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "low", needsReview: false },
  { id: 43, name: "Brooks Lee", fantasyTeam: "BTA Boyz", mlbTeam: "MIN", positions: ["SS"], birthDate: "2001-02-14", age: 25, currentRank: 385, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 44, name: "Bryan Baker", fantasyTeam: "Gunnarrhea", mlbTeam: "TB", positions: ["RP"], birthDate: "1994-12-02", age: 31, currentRank: 380, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 45, name: "Bryan Reynolds", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PIT", positions: ["OF"], birthDate: "1995-01-27", age: 31, currentRank: 289, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 46, name: "Bryan Woo", fantasyTeam: "Gunnarrhea", mlbTeam: "SEA", positions: ["SP"], birthDate: "2000-01-30", age: 26, currentRank: 61, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 47, name: "Bryce Elder", fantasyTeam: "Dixon Cider", mlbTeam: "ATL", positions: ["SP"], birthDate: "1999-05-19", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 48, name: "Bryce Eldridge", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["1B"], birthDate: "2004-10-20", age: 21, currentRank: 166, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 49, name: "Bryce Harper", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["1B"], birthDate: "1992-10-16", age: 33, currentRank: 33, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 50, name: "Bryce Miller", fantasyTeam: "Me So Heorny", mlbTeam: "SEA", positions: ["SP"], birthDate: "1998-08-23", age: 27, currentRank: 221, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 51, name: "Bryson Stott", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["2B"], birthDate: "1997-10-06", age: 28, currentRank: 268, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 52, name: "Bubba Chandler", fantasyTeam: "BTA Boyz", mlbTeam: "PIT", positions: ["SP"], birthDate: "2002-09-14", age: 23, currentRank: 164, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 53, name: "Byron Buxton", fantasyTeam: "John's Super Team", mlbTeam: "MIN", positions: ["OF"], birthDate: "1993-12-18", age: 32, currentRank: 106, futureTier: "shortTerm", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 54, name: "Cade Horton", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["SP"], birthDate: "2001-08-20", age: 24, currentRank: 427, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 55, name: "Cade Smith", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["RP"], birthDate: "1999-05-09", age: 27, currentRank: 110, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 56, name: "Cal Raleigh", fantasyTeam: "Dixon Cider", mlbTeam: "SEA", positions: ["C"], birthDate: "1996-11-26", age: 29, currentRank: 50, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 57, name: "Caleb Bonemer", fantasyTeam: "BTA Boyz", mlbTeam: "CHW", positions: ["SS"], birthDate: "2005-10-05", age: 20, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 58, name: "Cam Caminiti", fantasyTeam: "BTA Boyz", mlbTeam: "ATL", positions: ["SP"], birthDate: "2006-08-08", age: 19, currentRank: 427, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 59, name: "Cam Schlittler", fantasyTeam: "Dixon Cider", mlbTeam: "NYY", positions: ["SP"], birthDate: "2001-02-05", age: 25, currentRank: 35, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 60, name: "Cam Smith", fantasyTeam: "Me So Heorny", mlbTeam: "HOU", positions: ["OF"], birthDate: "2003-02-22", age: 23, currentRank: 128, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 61, name: "Carlos Correa", fantasyTeam: "You Don't Know Bo", mlbTeam: "HOU", positions: ["SS"], birthDate: "1994-09-22", age: 31, currentRank: 391, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "high", needsReview: false },
  { id: 62, name: "Carlos Lagrange", fantasyTeam: "You Don't Know Bo", mlbTeam: "NYY", positions: ["SP"], birthDate: "2003-05-25", age: 23, currentRank: 252, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 63, name: "Carlos Rodon", fantasyTeam: "Gunnarrhea", mlbTeam: "NYY", positions: ["SP"], birthDate: "1992-12-10", age: 33, currentRank: 162, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 64, name: "Carson Benge", fantasyTeam: "Gunnarrhea", mlbTeam: "NYM", positions: ["OF"], birthDate: "2003-01-20", age: 23, currentRank: 86, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 65, name: "Carson Kelly", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["C"], birthDate: "1994-07-14", age: 31, currentRank: 260, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 66, name: "Carter Jensen", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "KC", positions: ["C"], birthDate: "2003-07-03", age: 22, currentRank: 163, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 67, name: "Casey Mize", fantasyTeam: "BTA Boyz", mlbTeam: "DET", positions: ["SP"], birthDate: "1997-05-01", age: 29, currentRank: 307, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 68, name: "Casey Schmitt", fantasyTeam: "BB's Bold Team", mlbTeam: "SF", positions: ["3B", "SS"], birthDate: "1999-03-01", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 69, name: "Ceddanne Rafaela", fantasyTeam: "Dixon Cider", mlbTeam: "BOS", positions: ["OF"], birthDate: "2000-09-18", age: 25, currentRank: 238, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 70, name: "Chandler Simpson", fantasyTeam: "You Don't Know Bo", mlbTeam: "TB", positions: ["OF"], birthDate: "2000-11-18", age: 25, currentRank: 271, futureTier: "useful", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 71, name: "Charlie Condon", fantasyTeam: "BB's Bold Team", mlbTeam: "COL", positions: ["OF"], birthDate: "2003-04-14", age: 23, currentRank: 259, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 72, name: "Chase Burns", fantasyTeam: "John's Super Team", mlbTeam: "CIN", positions: ["SP"], birthDate: "2003-01-16", age: 23, currentRank: 44, futureTier: "prospectElite", categoryFitTier: "eliteStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 73, name: "Chase DeLauter", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CLE", positions: ["OF"], birthDate: "2001-10-08", age: 24, currentRank: 82, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 74, name: "Chase Meidroth", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CWS", positions: ["SS"], birthDate: "2001-07-23", age: 24, currentRank: 384, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 75, name: "Chris Bassitt", fantasyTeam: "Mactown MacDaddies", mlbTeam: "TOR", positions: ["SP"], birthDate: "1989-02-22", age: 37, currentRank: 300, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 76, name: "Chris Sale", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATL", positions: ["SP"], birthDate: "1989-03-30", age: 37, currentRank: 76, futureTier: "shortTerm", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 77, name: "Christian Walker", fantasyTeam: "BB's Bold Team", mlbTeam: "HOU", positions: ["1B"], birthDate: "1991-03-28", age: 35, currentRank: 359, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 78, name: "Christian Yelich", fantasyTeam: "This Is Mizerable", mlbTeam: "MIL", positions: ["OF"], birthDate: "1991-12-05", age: 34, currentRank: 117, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 79, name: "CJ Abrams", fantasyTeam: "John's Super Team", mlbTeam: "WAS", positions: ["SS"], birthDate: "2000-10-03", age: 25, currentRank: 31, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 80, name: "Cody Bellinger", fantasyTeam: "Me So Heorny", mlbTeam: "NYY", positions: ["OF"], birthDate: "1995-07-13", age: 30, currentRank: 87, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 81, name: "Cole Ragans", fantasyTeam: "Dixon Cider", mlbTeam: "KC", positions: ["SP"], birthDate: "1997-12-12", age: 28, currentRank: 115, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 82, name: "Cole Young", fantasyTeam: "John's Super Team", mlbTeam: "SEA", positions: ["2B"], birthDate: "2003-07-29", age: 22, currentRank: 473, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 83, name: "Colin Rea", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CHC", positions: ["SP"], birthDate: "1990-07-01", age: 35, currentRank: 360, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 84, name: "Colson Montgomery", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CWS", positions: ["SS"], birthDate: "2002-02-27", age: 24, currentRank: 194, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 85, name: "Colt Emerson", fantasyTeam: "Gunnarrhea", mlbTeam: "SEA", positions: ["SS"], birthDate: "2005-07-20", age: 20, currentRank: 42, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 86, name: "Colton Cowser", fantasyTeam: "You Don't Know Bo", mlbTeam: "BAL", positions: ["OF"], birthDate: "2000-03-20", age: 26, currentRank: 329, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 87, name: "Connelly Early", fantasyTeam: "Dixon Cider", mlbTeam: "BOS", positions: ["SP"], birthDate: "2002-04-03", age: 24, currentRank: 173, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 88, name: "Cooper Ingle", fantasyTeam: "Me So Heorny", mlbTeam: "CLE", positions: ["C"], birthDate: "2002-02-23", age: 24, currentRank: 332, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 89, name: "Corbin Burnes", fantasyTeam: "John's Super Team", mlbTeam: "ARI", positions: ["SP"], birthDate: "1994-10-22", age: 31, currentRank: 217, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 90, name: "Corbin Carroll", fantasyTeam: "Dixon Cider", mlbTeam: "ARI", positions: ["OF"], birthDate: "2000-08-21", age: 25, currentRank: 6, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 91, name: "Corey Seager", fantasyTeam: "Mactown MacDaddies", mlbTeam: "TEX", positions: ["SS"], birthDate: "1994-04-27", age: 32, currentRank: 66, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 92, name: "Cristopher Sanchez", fantasyTeam: "BB's Bold Team", mlbTeam: "PHI", positions: ["SP"], birthDate: "1996-12-12", age: 29, currentRank: 32, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 93, name: "Dalton Rushing", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAD", positions: ["C"], birthDate: "2001-02-21", age: 25, currentRank: 222, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 94, name: "Dansby Swanson", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["SS"], birthDate: "1994-02-11", age: 32, currentRank: 291, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 95, name: "David Bednar", fantasyTeam: "You Don't Know Bo", mlbTeam: "NYY", positions: ["RP"], birthDate: "1994-10-10", age: 31, currentRank: 326, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 96, name: "Davis Martin", fantasyTeam: "Mactown MacDaddies", mlbTeam: "", positions: ["UTIL"], birthDate: "1997-01-04", age: 29, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 97, name: "Daylen Lile", fantasyTeam: "Me So Heorny", mlbTeam: "WAS", positions: ["OF"], birthDate: "2002-11-30", age: 23, currentRank: 227, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 98, name: "Devin Williams", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "NYM", positions: ["RP"], birthDate: "1994-09-21", age: 31, currentRank: 280, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 99, name: "Didier Fuentes", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATL", positions: ["SP"], birthDate: "2005-06-17", age: 21, currentRank: 451, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 100, name: "Dillon Dingler", fantasyTeam: "This Is Mizerable", mlbTeam: "DET", positions: ["C"], birthDate: "1998-09-17", age: 27, currentRank: 342, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 101, name: "Dominic Canzone", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SEA", positions: ["OF"], birthDate: "1997-08-16", age: 28, currentRank: 486, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 102, name: "Drake Baldwin", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["C"], birthDate: "2001-03-28", age: 25, currentRank: 73, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 103, name: "Drew Rasmussen", fantasyTeam: "BTA Boyz", mlbTeam: "TB", positions: ["SP"], birthDate: "1995-07-27", age: 30, currentRank: 207, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 104, name: "Drew Thorpe", fantasyTeam: "BTA Boyz", mlbTeam: "CHW", positions: ["SP"], birthDate: "2000-10-01", age: 25, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 105, name: "Dustin May", fantasyTeam: "BTA Boyz", mlbTeam: "BOS", positions: ["SP"], birthDate: "1997-09-06", age: 28, currentRank: 482, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 106, name: "Dylan Cease", fantasyTeam: "Gunnarrhea", mlbTeam: "TOR", positions: ["SP"], birthDate: "1995-12-28", age: 30, currentRank: 91, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 107, name: "Dylan Crews", fantasyTeam: "John's Super Team", mlbTeam: "WAS", positions: ["OF"], birthDate: "2002-02-26", age: 24, currentRank: 188, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 108, name: "Dylan Lee", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["RP"], birthDate: "1994-08-01", age: 31, currentRank: 360, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 109, name: "Eduardo Quintero", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "LAD", positions: ["OF"], birthDate: "2005-09-16", age: 20, currentRank: 398, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 110, name: "Eduardo Rodriguez", fantasyTeam: "Mactown MacDaddies", mlbTeam: "ARI", positions: ["SP"], birthDate: "1993-04-07", age: 33, currentRank: 330, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 111, name: "Edward Florentino", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "PIT", positions: ["OF"], birthDate: "2006-11-11", age: 19, currentRank: 107, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 112, name: "Edwin Diaz", fantasyTeam: "BB's Bold Team", mlbTeam: "LAD", positions: ["RP"], birthDate: "1994-03-22", age: 32, currentRank: 228, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 113, name: "Eli Willits", fantasyTeam: "Me So Heorny", mlbTeam: "WAS", positions: ["SS"], birthDate: "2007-12-09", age: 18, currentRank: 118, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 114, name: "Elly De La Cruz", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CIN", positions: ["SS"], birthDate: "2002-01-11", age: 24, currentRank: 5, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 115, name: "Elmer Rodriguez", fantasyTeam: "BB's Bold Team", mlbTeam: "NYY", positions: ["C"], birthDate: "2003-08-18", age: 22, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 116, name: "Emerson Hancock", fantasyTeam: "Me So Heorny", mlbTeam: "SEA", positions: ["SP"], birthDate: "1999-05-31", age: 27, currentRank: 485, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 117, name: "Emmanuel Rodriguez", fantasyTeam: "Me So Heorny", mlbTeam: "MIN", positions: ["OF"], birthDate: "2003-02-28", age: 23, currentRank: 187, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 118, name: "Emmet Sheehan", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["SP"], birthDate: "1999-11-15", age: 26, currentRank: 130, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 119, name: "Erik Sabrowski", fantasyTeam: "Dixon Cider", mlbTeam: "CLE", positions: ["RP"], birthDate: "1997-10-31", age: 28, currentRank: 390, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 120, name: "Ernie Clement", fantasyTeam: "BTA Boyz", mlbTeam: "TOR", positions: ["3B"], birthDate: "1996-03-22", age: 30, currentRank: 332, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 121, name: "Ethan Holliday", fantasyTeam: "BTA Boyz", mlbTeam: "COL", positions: ["SS"], birthDate: "2007-02-23", age: 19, currentRank: 300, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 122, name: "Ethan Salas", fantasyTeam: "Mactown MacDaddies", mlbTeam: "SD", positions: ["C"], birthDate: "2006-06-01", age: 20, currentRank: 302, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 123, name: "Eury Perez", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["SP"], birthDate: "2003-04-15", age: 23, currentRank: 46, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 124, name: "Ezequiel Duran", fantasyTeam: "You Don't Know Bo", mlbTeam: "TEX", positions: ["3B", "SS", "OF"], birthDate: "1999-05-22", age: 27, currentRank: 340, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 125, name: "Fernando Tatis Jr.", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SD", positions: ["OF"], birthDate: "1999-01-02", age: 27, currentRank: 14, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 126, name: "Foster Griffin", fantasyTeam: "Gunnarrhea", mlbTeam: "KC", positions: ["RP"], birthDate: "1995-07-27", age: 30, currentRank: 380, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 127, name: "Framber Valdez", fantasyTeam: "BTA Boyz", mlbTeam: "DET", positions: ["SP"], birthDate: "1993-11-19", age: 32, currentRank: 129, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 128, name: "Francisco Alvarez", fantasyTeam: "Gunnarrhea", mlbTeam: "NYM", positions: ["C"], birthDate: "2001-11-19", age: 24, currentRank: 167, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 129, name: "Francisco Lindor", fantasyTeam: "BB's Bold Team", mlbTeam: "NYM", positions: ["SS"], birthDate: "1993-11-14", age: 32, currentRank: 37, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 130, name: "Franklin Arias", fantasyTeam: "BB's Bold Team", mlbTeam: "BOS", positions: ["SS"], birthDate: "2005-11-19", age: 20, currentRank: 52, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 131, name: "Freddie Freeman", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["1B"], birthDate: "1989-09-12", age: 36, currentRank: 77, futureTier: "shortTerm", categoryFitTier: "eliteHitter", riskTier: "aging", needsReview: false },
  { id: 132, name: "Freddy Peralta", fantasyTeam: "Gunnarrhea", mlbTeam: "MIL", positions: ["SP"], birthDate: "1996-06-04", age: 30, currentRank: 85, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 133, name: "Gabriel Moreno", fantasyTeam: "Mactown MacDaddies", mlbTeam: "ARI", positions: ["C"], birthDate: "2000-02-14", age: 26, currentRank: 281, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 134, name: "Gage Jump", fantasyTeam: "BB's Bold Team", mlbTeam: "ATH", positions: ["SP"], birthDate: "2003-04-12", age: 23, currentRank: 195, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 135, name: "Garrett Crochet", fantasyTeam: "You Don't Know Bo", mlbTeam: "BOS", positions: ["SP"], birthDate: "1999-06-21", age: 27, currentRank: 26, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 136, name: "Gavin Lux", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CIN", positions: ["2B", "OF"], birthDate: "1997-11-23", age: 28, currentRank: 300, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 137, name: "Gavin Sheets", fantasyTeam: "You Don't Know Bo", mlbTeam: "SD", positions: ["1B", "OF"], birthDate: "1996-04-23", age: 30, currentRank: 310, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 138, name: "Gavin Williams", fantasyTeam: "Gunnarrhea", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-07-26", age: 26, currentRank: 146, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 139, name: "George Kirby", fantasyTeam: "Me So Heorny", mlbTeam: "SEA", positions: ["SP"], birthDate: "1998-02-04", age: 28, currentRank: 60, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 140, name: "George Lombard Jr.", fantasyTeam: "Gunnarrhea", mlbTeam: "NYY", positions: ["SS"], birthDate: "2005-06-02", age: 21, currentRank: 149, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 141, name: "George Springer", fantasyTeam: "You Don't Know Bo", mlbTeam: "TOR", positions: ["OF"], birthDate: "1989-09-19", age: 36, currentRank: 251, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 142, name: "Geraldo Perdomo", fantasyTeam: "Dixon Cider", mlbTeam: "ARI", positions: ["SS"], birthDate: "1999-10-22", age: 26, currentRank: 100, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 143, name: "Gerrit Cole", fantasyTeam: "BTA Boyz", mlbTeam: "NYY", positions: ["SP"], birthDate: "1990-09-08", age: 35, currentRank: 108, futureTier: "shortTerm", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 144, name: "Gleyber Torres", fantasyTeam: "BB's Bold Team", mlbTeam: "DET", positions: ["2B"], birthDate: "1996-12-13", age: 29, currentRank: 256, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 145, name: "Grant Taylor", fantasyTeam: "This Is Mizerable", mlbTeam: "CWS", positions: ["RP"], birthDate: "2002-05-20", age: 24, currentRank: 351, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 146, name: "Grayson Rodriguez", fantasyTeam: "John's Super Team", mlbTeam: "LAA", positions: ["SP"], birthDate: "1999-11-16", age: 26, currentRank: 204, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 147, name: "Gregory Soto", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BAL", positions: ["RP"], birthDate: "1995-02-11", age: 31, currentRank: 360, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 148, name: "Gunnar Henderson", fantasyTeam: "Gunnarrhea", mlbTeam: "BAL", positions: ["SS"], birthDate: "2001-06-29", age: 24, currentRank: 8, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 149, name: "Hagen Smith", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CWS", positions: ["SP"], birthDate: "2003-08-19", age: 22, currentRank: 448, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 150, name: "Heliot Ramos", fantasyTeam: "This Is Mizerable", mlbTeam: "SF", positions: ["OF"], birthDate: "1999-09-07", age: 26, currentRank: 266, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 151, name: "Hunter Brown", fantasyTeam: "Dixon Cider", mlbTeam: "HOU", positions: ["SP"], birthDate: "1998-08-29", age: 27, currentRank: 49, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 152, name: "Hunter Goodman", fantasyTeam: "Me So Heorny", mlbTeam: "COL", positions: ["C"], birthDate: "1999-10-08", age: 26, currentRank: 165, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 153, name: "Hunter Greene", fantasyTeam: "Gunnarrhea", mlbTeam: "CIN", positions: ["SP"], birthDate: "1999-08-06", age: 26, currentRank: 101, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 154, name: "Ian Happ", fantasyTeam: "This Is Mizerable", mlbTeam: "CHC", positions: ["OF"], birthDate: "1994-08-12", age: 31, currentRank: 208, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 155, name: "Isaac Paredes", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "HOU", positions: ["3B"], birthDate: "1999-02-18", age: 27, currentRank: 202, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 156, name: "Ivan Herrera", fantasyTeam: "John's Super Team", mlbTeam: "STL", positions: ["C"], birthDate: "2000-06-01", age: 26, currentRank: 141, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 157, name: "J.R. Ritchie", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["SP"], birthDate: "2003-06-27", age: 22, currentRank: 447, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 158, name: "J.T. Realmuto", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["C"], birthDate: "1991-03-18", age: 35, currentRank: 472, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 159, name: "Jac Caglianone", fantasyTeam: "Gunnarrhea", mlbTeam: "KC", positions: ["OF"], birthDate: "2003-02-09", age: 23, currentRank: 157, futureTier: "prospectElite", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 160, name: "Jack Flaherty", fantasyTeam: "BTA Boyz", mlbTeam: "DET", positions: ["SP"], birthDate: "1995-10-15", age: 30, currentRank: 261, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 161, name: "Jackson Chourio", fantasyTeam: "John's Super Team", mlbTeam: "MIL", positions: ["OF"], birthDate: "2004-03-11", age: 22, currentRank: 12, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 162, name: "Jackson Holliday", fantasyTeam: "Gunnarrhea", mlbTeam: "BAL", positions: ["2B"], birthDate: "2003-12-04", age: 22, currentRank: 90, futureTier: "cornerstone", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 163, name: "Jackson Jobe", fantasyTeam: "Gunnarrhea", mlbTeam: "DET", positions: ["SP"], birthDate: "2002-07-30", age: 23, currentRank: 293, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 164, name: "Jackson Merrill", fantasyTeam: "Dixon Cider", mlbTeam: "SD", positions: ["OF"], birthDate: "2003-04-19", age: 23, currentRank: 53, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 165, name: "Jacob deGrom", fantasyTeam: "You Don't Know Bo", mlbTeam: "TEX", positions: ["SP"], birthDate: "1988-06-19", age: 38, currentRank: 70, futureTier: "shortTerm", categoryFitTier: "eliteStarter", riskTier: "veryHigh", needsReview: false },
  { id: 166, name: "Jacob Misiorowski", fantasyTeam: "This Is Mizerable", mlbTeam: "MIL", positions: ["SP"], birthDate: "2002-04-03", age: 24, currentRank: 24, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 167, name: "Jacob Wilson", fantasyTeam: "Me So Heorny", mlbTeam: "ATH", positions: ["SS"], birthDate: "2002-03-30", age: 24, currentRank: 135, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 168, name: "Jacob Young", fantasyTeam: "BTA Boyz", mlbTeam: "WSH", positions: ["OF"], birthDate: "1999-07-27", age: 26, currentRank: 285, futureTier: "useful", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 169, name: "Jake Bauers", fantasyTeam: "BTA Boyz", mlbTeam: "MIL", positions: ["1B", "OF"], birthDate: "1995-10-06", age: 30, currentRank: 360, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 170, name: "Jake Latz", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "TEX", positions: ["RP"], birthDate: "1996-04-08", age: 30, currentRank: 390, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 171, name: "Jakob Marsee", fantasyTeam: "Dixon Cider", mlbTeam: "MIA", positions: ["OF"], birthDate: "2001-06-28", age: 24, currentRank: 368, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 172, name: "James Wood", fantasyTeam: "Gunnarrhea", mlbTeam: "WAS", positions: ["OF"], birthDate: "2002-09-17", age: 23, currentRank: 17, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 173, name: "Jamie Arnold", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATH", positions: ["SP"], birthDate: "2004-03-21", age: 22, currentRank: 276, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 174, name: "Jared Jones", fantasyTeam: "This Is Mizerable", mlbTeam: "PIT", positions: ["SP"], birthDate: "2001-08-06", age: 24, currentRank: 215, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 175, name: "Jarlin Susana", fantasyTeam: "Mactown MacDaddies", mlbTeam: "WAS", positions: ["SP"], birthDate: "2004-03-23", age: 22, currentRank: 249, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 176, name: "Jarren Duran", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BOS", positions: ["OF"], birthDate: "1996-09-05", age: 29, currentRank: 134, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 177, name: "Jason Adam", fantasyTeam: "This Is Mizerable", mlbTeam: "SD", positions: ["RP"], birthDate: "1991-08-04", age: 34, currentRank: 300, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 178, name: "Jaxon Wiggins", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["SP"], birthDate: "2001-10-03", age: 24, currentRank: 431, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 179, name: "Jazz Chisholm Jr.", fantasyTeam: "BB's Bold Team", mlbTeam: "NYY", positions: ["2B"], birthDate: "1998-02-01", age: 28, currentRank: 38, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "high", needsReview: false },
  { id: 180, name: "Jeffrey Springs", fantasyTeam: "BTA Boyz", mlbTeam: "", positions: ["SP"], birthDate: "1992-09-20", age: 33, currentRank: 300, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 181, name: "Jeremy Pena", fantasyTeam: "This Is Mizerable", mlbTeam: "HOU", positions: ["SS"], birthDate: "1997-09-22", age: 28, currentRank: 97, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 182, name: "Jesus Luzardo", fantasyTeam: "Me So Heorny", mlbTeam: "PHI", positions: ["SP"], birthDate: "1997-09-30", age: 28, currentRank: 112, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 183, name: "Jesus Made", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIL", positions: ["SS"], birthDate: "2007-05-08", age: 19, currentRank: 28, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 184, name: "Jett Williams", fantasyTeam: "Mactown MacDaddies", mlbTeam: "MIL", positions: ["SS"], birthDate: "2003-11-03", age: 22, currentRank: 410, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 185, name: "Jhoan Duran", fantasyTeam: "BB's Bold Team", mlbTeam: "PHI", positions: ["RP"], birthDate: "1998-01-08", age: 28, currentRank: 151, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 186, name: "JJ Bleday", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATH", positions: ["OF"], birthDate: "1997-11-10", age: 28, currentRank: 280, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 187, name: "JJ Wetherholt", fantasyTeam: "John's Super Team", mlbTeam: "STL", positions: ["SS"], birthDate: "2002-09-10", age: 23, currentRank: 34, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 188, name: "Jo Adell", fantasyTeam: "Me So Heorny", mlbTeam: "LAA", positions: ["OF"], birthDate: "1999-04-08", age: 27, currentRank: 138, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 189, name: "Joe Mack", fantasyTeam: "Gunnarrhea", mlbTeam: "MIA", positions: ["C"], birthDate: "2002-12-27", age: 23, currentRank: 421, futureTier: "prospectLow", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 190, name: "Joe Musgrove", fantasyTeam: "John's Super Team", mlbTeam: "SD", positions: ["SP"], birthDate: "1992-12-04", age: 33, currentRank: 352, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 191, name: "Joe Ryan", fantasyTeam: "Gunnarrhea", mlbTeam: "MIN", positions: ["SP"], birthDate: "1996-06-05", age: 30, currentRank: 62, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 192, name: "Joey Wiemer", fantasyTeam: "Mactown MacDaddies", mlbTeam: "", positions: ["UTIL"], birthDate: "1999-02-11", age: 27, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 193, name: "Jonah Tong", fantasyTeam: "Me So Heorny", mlbTeam: "NYM", positions: ["SP"], birthDate: "2003-06-19", age: 23, currentRank: 220, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 194, name: "Jonathan Aranda", fantasyTeam: "You Don't Know Bo", mlbTeam: "TB", positions: ["1B"], birthDate: "1998-05-23", age: 28, currentRank: 154, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 195, name: "Jordan Lawlar", fantasyTeam: "This Is Mizerable", mlbTeam: "ARI", positions: ["SS"], birthDate: "2002-07-17", age: 23, currentRank: 182, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 196, name: "Jordan Walker", fantasyTeam: "BB's Bold Team", mlbTeam: "STL", positions: ["OF"], birthDate: "2002-05-22", age: 24, currentRank: 201, futureTier: "star", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 197, name: "Jordan Westburg", fantasyTeam: "You Don't Know Bo", mlbTeam: "BAL", positions: ["3B"], birthDate: "1999-02-18", age: 27, currentRank: 214, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 198, name: "Jose Altuve", fantasyTeam: "Gunnarrhea", mlbTeam: "HOU", positions: ["2B"], birthDate: "1990-05-06", age: 36, currentRank: 114, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 199, name: "Jose Ramirez", fantasyTeam: "Dixon Cider", mlbTeam: "CLE", positions: ["3B"], birthDate: "1992-09-17", age: 33, currentRank: 21, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 200, name: "Jose Soriano", fantasyTeam: "John's Super Team", mlbTeam: "LAA", positions: ["SP"], birthDate: "1998-10-20", age: 27, currentRank: 185, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 201, name: "Josh Hader", fantasyTeam: "Gunnarrhea", mlbTeam: "HOU", positions: ["RP"], birthDate: "1994-04-07", age: 32, currentRank: 262, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 202, name: "Josh Jung", fantasyTeam: "This Is Mizerable", mlbTeam: "TEX", positions: ["3B"], birthDate: "1998-02-12", age: 28, currentRank: 334, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 203, name: "Josh Naylor", fantasyTeam: "John's Super Team", mlbTeam: "SEA", positions: ["1B"], birthDate: "1997-06-22", age: 29, currentRank: 81, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 204, name: "Josue Briceno", fantasyTeam: "John's Super Team", mlbTeam: "DET", positions: ["C"], birthDate: "2004-09-23", age: 21, currentRank: 353, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 205, name: "Josue De Paula", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAD", positions: ["OF"], birthDate: "2005-05-24", age: 21, currentRank: 80, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 206, name: "Juan Soto", fantasyTeam: "John's Super Team", mlbTeam: "NYM", positions: ["OF"], birthDate: "1998-10-25", age: 27, currentRank: 2, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "veryLow", needsReview: false },
  { id: 207, name: "Julio Rodriguez", fantasyTeam: "John's Super Team", mlbTeam: "SEA", positions: ["OF"], birthDate: "2000-12-29", age: 25, currentRank: 10, futureTier: "elite", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 208, name: "Jung Hoo Lee", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["OF"], birthDate: "1998-08-20", age: 27, currentRank: 386, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 209, name: "Junior Caminero", fantasyTeam: "You Don't Know Bo", mlbTeam: "TB", positions: ["3B"], birthDate: "2003-07-05", age: 22, currentRank: 7, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 210, name: "Jurrangelo Cijntje", fantasyTeam: "This Is Mizerable", mlbTeam: "SEA", positions: ["SP"], birthDate: "2003-05-31", age: 23, currentRank: 459, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 211, name: "Justin Steele", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["SP"], birthDate: "1995-07-11", age: 30, currentRank: 286, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "high", needsReview: false },
  { id: 212, name: "Justin Wrobleski", fantasyTeam: "BB's Bold Team", mlbTeam: "LAD", positions: ["SP"], birthDate: "2000-07-14", age: 25, currentRank: 348, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 213, name: "Kade Anderson", fantasyTeam: "This Is Mizerable", mlbTeam: "SEA", positions: ["SP"], birthDate: "2004-07-06", age: 21, currentRank: 113, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 214, name: "Kaelen Culpepper", fantasyTeam: "This Is Mizerable", mlbTeam: "MIN", positions: ["SS"], birthDate: "2002-12-29", age: 23, currentRank: 237, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 215, name: "Kazuma Okamoto", fantasyTeam: "Gunnarrhea", mlbTeam: "TOR", positions: ["3B"], birthDate: "1996-06-30", age: 29, currentRank: 183, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 216, name: "Keibert Ruiz", fantasyTeam: "You Don't Know Bo", mlbTeam: "WSH", positions: ["C"], birthDate: "1998-07-20", age: 27, currentRank: 240, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 217, name: "Ketel Marte", fantasyTeam: "Dixon Cider", mlbTeam: "ARI", positions: ["2B"], birthDate: "1993-10-12", age: 32, currentRank: 36, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 218, name: "Kevin Gausman", fantasyTeam: "Mactown MacDaddies", mlbTeam: "TOR", positions: ["SP"], birthDate: "1991-01-06", age: 35, currentRank: 131, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 219, name: "Kevin Kelly", fantasyTeam: "This Is Mizerable", mlbTeam: "TB", positions: ["RP"], birthDate: "1997-11-28", age: 28, currentRank: 360, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 220, name: "Kevin McGonigle", fantasyTeam: "BTA Boyz", mlbTeam: "DET", positions: ["2B"], birthDate: "2004-08-18", age: 21, currentRank: 19, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 221, name: "Konnor Griffin", fantasyTeam: "Gunnarrhea", mlbTeam: "PIT", positions: ["SS"], birthDate: "2006-04-24", age: 20, currentRank: 18, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 222, name: "Kris Bubic", fantasyTeam: "This Is Mizerable", mlbTeam: "KC", positions: ["SP"], birthDate: "1997-08-19", age: 28, currentRank: 290, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 223, name: "Kristian Campbell", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BOS", positions: ["OF"], birthDate: "2002-06-28", age: 23, currentRank: 425, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 224, name: "Kruz Schoolcraft", fantasyTeam: "Dixon Cider", mlbTeam: "SD", positions: ["SP"], birthDate: "2007-04-18", age: 19, currentRank: 350, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 225, name: "Kyle Bradish", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "BAL", positions: ["SP"], birthDate: "1996-09-12", age: 29, currentRank: 121, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 226, name: "Kyle Harrison", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "MIL", positions: ["SP"], birthDate: "2001-08-12", age: 24, currentRank: 282, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 227, name: "Kyle Hurt", fantasyTeam: "You Don't Know Bo", mlbTeam: "", positions: ["UTIL"], birthDate: "1998-05-30", age: 28, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 228, name: "Kyle Schwarber", fantasyTeam: "Mactown MacDaddies", mlbTeam: "PHI", positions: ["UTIL"], birthDate: "1993-03-05", age: 33, currentRank: 39, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 229, name: "Kyle Stowers", fantasyTeam: "Gunnarrhea", mlbTeam: "MIA", positions: ["OF"], birthDate: "1998-01-02", age: 28, currentRank: 160, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 230, name: "Kyle Teel", fantasyTeam: "Gunnarrhea", mlbTeam: "CWS", positions: ["C"], birthDate: "2002-02-15", age: 24, currentRank: 217, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 231, name: "Kyle Tucker", fantasyTeam: "BB's Bold Team", mlbTeam: "LAD", positions: ["OF"], birthDate: "1997-01-17", age: 29, currentRank: 25, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 232, name: "Kyson Witherspoon", fantasyTeam: "Me So Heorny", mlbTeam: "BOS", positions: ["SP"], birthDate: "2004-08-12", age: 21, currentRank: 403, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 233, name: "Lance McCullers Jr.", fantasyTeam: "BTA Boyz", mlbTeam: "", positions: ["UTIL"], birthDate: "1993-10-02", age: 32, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 234, name: "Lawrence Butler", fantasyTeam: "Gunnarrhea", mlbTeam: "ATH", positions: ["OF"], birthDate: "2000-07-10", age: 25, currentRank: 337, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 235, name: "Lazaro Montes", fantasyTeam: "Me So Heorny", mlbTeam: "SEA", positions: ["OF"], birthDate: "2004-10-22", age: 21, currentRank: 203, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 236, name: "Leo De Vries", fantasyTeam: "Dixon Cider", mlbTeam: "ATH", positions: ["SS"], birthDate: "2006-10-11", age: 19, currentRank: 56, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 237, name: "Liam Doyle", fantasyTeam: "Dixon Cider", mlbTeam: "STL", positions: ["SP"], birthDate: "2004-06-03", age: 22, currentRank: 275, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 238, name: "Liam Hicks", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["C"], birthDate: "1999-06-02", age: 27, currentRank: 260, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 239, name: "Logan Gilbert", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SEA", positions: ["SP"], birthDate: "1997-05-05", age: 29, currentRank: 30, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 240, name: "Logan Henderson", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIL", positions: ["SP"], birthDate: "2002-03-02", age: 24, currentRank: 381, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 241, name: "Logan O'Hoppe", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAA", positions: ["C"], birthDate: "2000-02-09", age: 26, currentRank: 449, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 242, name: "Logan Webb", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["SP"], birthDate: "1996-11-18", age: 29, currentRank: 69, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "low", needsReview: false },
  { id: 243, name: "Louis Varland", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "TOR", positions: ["RP"], birthDate: "1997-12-09", age: 28, currentRank: 455, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "medium", needsReview: false },
  { id: 244, name: "Lucas Erceg", fantasyTeam: "John's Super Team", mlbTeam: "KC", positions: ["RP"], birthDate: "1995-05-01", age: 31, currentRank: 280, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 245, name: "Lucas Ramirez", fantasyTeam: "This Is Mizerable", mlbTeam: "LAA", positions: ["OF"], birthDate: "2006-01-16", age: 20, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 246, name: "Luis Arraez", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["1B"], birthDate: "1997-04-09", age: 29, currentRank: 360, futureTier: "solidKeeper", categoryFitTier: "flawedHitter", riskTier: "low", needsReview: false },
  { id: 247, name: "Luis Pena", fantasyTeam: "Dixon Cider", mlbTeam: "MIL", positions: ["SS"], birthDate: "2006-11-13", age: 19, currentRank: 92, futureTier: "prospectMedium", categoryFitTier: "prospect", riskTier: "prospectHitter", needsReview: false },
  { id: 248, name: "Luis Robert Jr.", fantasyTeam: "This Is Mizerable", mlbTeam: "CWS", positions: ["OF"], birthDate: "1997-08-03", age: 28, currentRank: 157, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 249, name: "LuJames Groover", fantasyTeam: "BB's Bold Team", mlbTeam: "ARI", positions: ["3B"], birthDate: "2002-04-16", age: 24, currentRank: 360, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 250, name: "Luke Keaschall", fantasyTeam: "John's Super Team", mlbTeam: "MIN", positions: ["2B"], birthDate: "2002-08-15", age: 23, currentRank: 98, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 251, name: "Luke Raley", fantasyTeam: "Mactown MacDaddies", mlbTeam: "SEA", positions: ["1B", "OF"], birthDate: "1994-09-19", age: 31, currentRank: 260, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 252, name: "MacKenzie Gore", fantasyTeam: "BTA Boyz", mlbTeam: "TEX", positions: ["SP"], birthDate: "1999-02-24", age: 27, currentRank: 143, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 253, name: "Maikel Garcia", fantasyTeam: "This Is Mizerable", mlbTeam: "KC", positions: ["3B"], birthDate: "2000-03-03", age: 26, currentRank: 139, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 254, name: "Manny Machado", fantasyTeam: "John's Super Team", mlbTeam: "SD", positions: ["3B"], birthDate: "1992-07-06", age: 33, currentRank: 57, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 255, name: "Marcelo Mayer", fantasyTeam: "Dixon Cider", mlbTeam: "BOS", positions: ["3B"], birthDate: "2002-12-12", age: 23, currentRank: 295, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 256, name: "Martin Perez", fantasyTeam: "John's Super Team", mlbTeam: "CHW", positions: ["SP"], birthDate: "1991-04-04", age: 35, currentRank: 380, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 257, name: "Mason Miller", fantasyTeam: "Me So Heorny", mlbTeam: "SD", positions: ["RP"], birthDate: "1998-08-24", age: 27, currentRank: 63, futureTier: "strongKeeper", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 258, name: "Masyn Winn", fantasyTeam: "BTA Boyz", mlbTeam: "STL", positions: ["SS"], birthDate: "2002-03-21", age: 24, currentRank: 229, futureTier: "strongKeeper", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 259, name: "Matt Brash", fantasyTeam: "This Is Mizerable", mlbTeam: "SEA", positions: ["RP"], birthDate: "1998-05-12", age: 28, currentRank: 300, futureTier: "useful", categoryFitTier: "eliteReliever", riskTier: "injured", needsReview: false },
  { id: 260, name: "Matt Chapman", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "SF", positions: ["3B"], birthDate: "1993-04-28", age: 33, currentRank: 223, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 261, name: "Matt McLain", fantasyTeam: "Dixon Cider", mlbTeam: "CIN", positions: ["2B"], birthDate: "1999-08-06", age: 26, currentRank: 377, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "high", needsReview: false },
  { id: 262, name: "Matt Olson", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATL", positions: ["1B"], birthDate: "1994-03-29", age: 32, currentRank: 51, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 263, name: "Matt Shaw", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["3B"], birthDate: "2001-11-06", age: 24, currentRank: 206, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 264, name: "Matthew Boyd", fantasyTeam: "BTA Boyz", mlbTeam: "CHC", positions: ["SP"], birthDate: "2004-05-07", age: 22, currentRank: 296, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 265, name: "Mauricio Dubon", fantasyTeam: "Me So Heorny", mlbTeam: "HOU", positions: ["2B", "OF"], birthDate: "1994-07-19", age: 31, currentRank: 330, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 266, name: "Max Clark", fantasyTeam: "Dixon Cider", mlbTeam: "DET", positions: ["OF"], birthDate: "2004-12-21", age: 21, currentRank: 122, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 267, name: "Max Fried", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "NYY", positions: ["SP"], birthDate: "1994-01-18", age: 32, currentRank: 111, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 268, name: "Max Meyer", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIA", positions: ["SP"], birthDate: "1999-03-12", age: 27, currentRank: 333, futureTier: "solidKeeper", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 269, name: "Max Muncy", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["3B"], birthDate: "1990-08-25", age: 35, currentRank: 294, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 270, name: "Michael Busch", fantasyTeam: "John's Super Team", mlbTeam: "CHC", positions: ["1B"], birthDate: "1997-11-09", age: 28, currentRank: 120, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 271, name: "Michael Harris II", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATL", positions: ["OF"], birthDate: "2001-03-07", age: 25, currentRank: 83, futureTier: "strongKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 272, name: "Michael King", fantasyTeam: "Gunnarrhea", mlbTeam: "SD", positions: ["SP"], birthDate: "1995-05-25", age: 31, currentRank: 168, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 273, name: "Michael McGreevy", fantasyTeam: "Dixon Cider", mlbTeam: "STL", positions: ["SP"], birthDate: "2000-07-08", age: 25, currentRank: 498, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 274, name: "Michael Soroka", fantasyTeam: "Me So Heorny", mlbTeam: "WSH", positions: ["SP"], birthDate: "1997-08-04", age: 28, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 275, name: "Michael Wacha", fantasyTeam: "BTA Boyz", mlbTeam: "KC", positions: ["SP"], birthDate: "1991-07-01", age: 34, currentRank: 300, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 276, name: "Mick Abel", fantasyTeam: "BB's Bold Team", mlbTeam: "MIN", positions: ["SP"], birthDate: "2001-08-18", age: 24, currentRank: 390, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 277, name: "Mickey Moniak", fantasyTeam: "Me So Heorny", mlbTeam: "COL", positions: ["OF"], birthDate: "1998-05-13", age: 28, currentRank: 335, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "medium", needsReview: false },
  { id: 278, name: "Miguel Vargas", fantasyTeam: "Gunnarrhea", mlbTeam: "CWS", positions: ["3B"], birthDate: "1999-11-17", age: 26, currentRank: 321, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 279, name: "Mike Sirota", fantasyTeam: "John's Super Team", mlbTeam: "LAD", positions: ["OF"], birthDate: "2003-06-16", age: 23, currentRank: 125, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 280, name: "Mike Trout", fantasyTeam: "BTA Boyz", mlbTeam: "LAA", positions: ["OF"], birthDate: "1991-08-07", age: 34, currentRank: 124, futureTier: "shortTerm", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 281, name: "Mitch Keller", fantasyTeam: "John's Super Team", mlbTeam: "PIT", positions: ["SP"], birthDate: "1996-04-04", age: 30, currentRank: 430, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 282, name: "Moises Ballesteros", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["C"], birthDate: "2003-11-08", age: 22, currentRank: 263, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 283, name: "Mookie Betts", fantasyTeam: "Me So Heorny", mlbTeam: "LAD", positions: ["SS"], birthDate: "1992-10-07", age: 33, currentRank: 47, futureTier: "star", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 284, name: "Munetaka Murakami", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CWS", positions: ["1B"], birthDate: "2000-02-02", age: 26, currentRank: 264, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 285, name: "Nate George", fantasyTeam: "BTA Boyz", mlbTeam: "BAL", positions: ["OF"], birthDate: "2006-06-04", age: 20, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "speedOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 286, name: "Nathan Eovaldi", fantasyTeam: "Me So Heorny", mlbTeam: "TEX", positions: ["SP"], birthDate: "1990-02-13", age: 36, currentRank: 196, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 287, name: "Nestor Cortes Jr.", fantasyTeam: "BTA Boyz", mlbTeam: "", positions: ["UTIL"], birthDate: "1994-12-10", age: 31, currentRank: 320, futureTier: "depth", categoryFitTier: "unknown", riskTier: "medium", needsReview: false },
  { id: 288, name: "Nick Kurtz", fantasyTeam: "You Don't Know Bo", mlbTeam: "ATH", positions: ["1B"], birthDate: "2003-03-12", age: 23, currentRank: 13, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 289, name: "Nick Lodolo", fantasyTeam: "John's Super Team", mlbTeam: "CIN", positions: ["SP"], birthDate: "1998-02-05", age: 28, currentRank: 123, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 290, name: "Nick Martinez", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CIN", positions: ["SP", "RP"], birthDate: "1990-08-05", age: 35, currentRank: 320, futureTier: "depth", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 291, name: "Nick Pivetta", fantasyTeam: "Mactown MacDaddies", mlbTeam: "SD", positions: ["SP"], birthDate: "1993-02-14", age: 33, currentRank: 457, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 292, name: "Nico Hoerner", fantasyTeam: "Me So Heorny", mlbTeam: "CHC", positions: ["2B"], birthDate: "1997-05-13", age: 29, currentRank: 126, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 293, name: "Noah Schultz", fantasyTeam: "Gunnarrhea", mlbTeam: "CWS", positions: ["SP"], birthDate: "2003-08-05", age: 22, currentRank: 382, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 294, name: "Noble Meyer", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["SP"], birthDate: "2005-01-10", age: 21, currentRank: 510, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 295, name: "Noelvi Marte", fantasyTeam: "This Is Mizerable", mlbTeam: "CIN", positions: ["3B"], birthDate: "2001-10-16", age: 24, currentRank: 464, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 296, name: "Nolan Arenado", fantasyTeam: "John's Super Team", mlbTeam: "STL", positions: ["3B"], birthDate: "1991-04-16", age: 35, currentRank: 240, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 297, name: "Nolan McLean", fantasyTeam: "Dixon Cider", mlbTeam: "NYM", positions: ["SP"], birthDate: "2001-07-24", age: 24, currentRank: 40, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 298, name: "Oneil Cruz", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "PIT", positions: ["OF"], birthDate: "1998-10-04", age: 27, currentRank: 41, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 299, name: "Otto Lopez", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIA", positions: ["SS"], birthDate: "1998-10-01", age: 27, currentRank: 194, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "low", needsReview: false },
  { id: 300, name: "Owen Caissie", fantasyTeam: "BTA Boyz", mlbTeam: "MIA", positions: ["OF"], birthDate: "2002-07-08", age: 23, currentRank: 219, futureTier: "prospectHigh", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 301, name: "Ozzie Albies", fantasyTeam: "Me So Heorny", mlbTeam: "ATL", positions: ["2B"], birthDate: "1997-01-07", age: 29, currentRank: 136, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 302, name: "Pablo Lopez", fantasyTeam: "This Is Mizerable", mlbTeam: "MIN", positions: ["SP"], birthDate: "1996-03-07", age: 30, currentRank: 393, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 303, name: "Parker Messick", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["SP"], birthDate: "2000-10-26", age: 25, currentRank: 198, futureTier: "prospectLow", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 304, name: "Paul Goldschmidt", fantasyTeam: "John's Super Team", mlbTeam: "NYY", positions: ["1B"], birthDate: "1987-09-10", age: 38, currentRank: 220, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 305, name: "Paul Sewald", fantasyTeam: "BB's Bold Team", mlbTeam: "CLE", positions: ["RP"], birthDate: "1990-05-26", age: 36, currentRank: 340, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 306, name: "Paul Skenes", fantasyTeam: "BTA Boyz", mlbTeam: "PIT", positions: ["SP"], birthDate: "2002-05-29", age: 24, currentRank: 4, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 307, name: "Payton Tolle", fantasyTeam: "Me So Heorny", mlbTeam: "BOS", positions: ["SP"], birthDate: "2002-11-01", age: 23, currentRank: 104, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 308, name: "Pete Alonso", fantasyTeam: "Dixon Cider", mlbTeam: "BAL", positions: ["1B"], birthDate: "1994-12-07", age: 31, currentRank: 48, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 309, name: "Pete Crow-Armstrong", fantasyTeam: "BB's Bold Team", mlbTeam: "CHC", positions: ["OF"], birthDate: "2002-03-25", age: 24, currentRank: 88, futureTier: "star", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 310, name: "Pete Fairbanks", fantasyTeam: "John's Super Team", mlbTeam: "MIA", positions: ["RP"], birthDate: "1993-12-16", age: 32, currentRank: 375, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 311, name: "Quinn Mathews", fantasyTeam: "You Don't Know Bo", mlbTeam: "STL", positions: ["SP"], birthDate: "2000-10-04", age: 25, currentRank: 337, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 312, name: "Rafael Devers", fantasyTeam: "Gunnarrhea", mlbTeam: "SF", positions: ["1B"], birthDate: "1996-10-24", age: 29, currentRank: 71, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 313, name: "Rainiel Rodriguez", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "STL", positions: ["C"], birthDate: "2007-01-04", age: 19, currentRank: 75, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 314, name: "Raisel Iglesias", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATL", positions: ["RP"], birthDate: "1990-01-04", age: 36, currentRank: 401, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 315, name: "Ralphy Velazquez", fantasyTeam: "Mactown MacDaddies", mlbTeam: "CLE", positions: ["1B"], birthDate: "2005-05-28", age: 21, currentRank: 89, futureTier: "prospectMedium", categoryFitTier: "powerOnly", riskTier: "prospectHitter", needsReview: false },
  { id: 316, name: "Randy Arozarena", fantasyTeam: "You Don't Know Bo", mlbTeam: "SEA", positions: ["OF"], birthDate: "1995-02-28", age: 31, currentRank: 79, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 317, name: "Ranger Suarez", fantasyTeam: "John's Super Team", mlbTeam: "BOS", positions: ["SP"], birthDate: "1995-08-26", age: 30, currentRank: 177, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 318, name: "Reid Detmers", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAA", positions: ["SP"], birthDate: "1999-07-08", age: 26, currentRank: 415, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 319, name: "Rhett Lowder", fantasyTeam: "BTA Boyz", mlbTeam: "CIN", positions: ["SP"], birthDate: "2002-03-08", age: 24, currentRank: 446, futureTier: "prospectHigh", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 320, name: "Rico Garcia", fantasyTeam: "BTA Boyz", mlbTeam: "NYM", positions: ["RP"], birthDate: "1994-01-10", age: 32, currentRank: 400, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 321, name: "Riley Greene", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "DET", positions: ["OF"], birthDate: "2000-09-28", age: 25, currentRank: 54, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 322, name: "Riley O'Brien", fantasyTeam: "Gunnarrhea", mlbTeam: "STL", positions: ["RP"], birthDate: "1995-02-06", age: 31, currentRank: 311, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: false },
  { id: 323, name: "Robbie Ray", fantasyTeam: "Dixon Cider", mlbTeam: "SF", positions: ["SP"], birthDate: "1991-10-01", age: 34, currentRank: 231, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 324, name: "Robby Snelling", fantasyTeam: "You Don't Know Bo", mlbTeam: "MIA", positions: ["SP"], birthDate: "2003-12-19", age: 22, currentRank: 232, futureTier: "prospectElite", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 325, name: "Robert Gasser", fantasyTeam: "Gunnarrhea", mlbTeam: "MIL", positions: ["SP"], birthDate: "1999-05-31", age: 27, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "injured", needsReview: false },
  { id: 326, name: "Robert Suarez", fantasyTeam: "John's Super Team", mlbTeam: "ATL", positions: ["RP"], birthDate: "1991-03-01", age: 35, currentRank: 354, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 327, name: "Roki Sasaki", fantasyTeam: "You Don't Know Bo", mlbTeam: "LAD", positions: ["SP"], birthDate: "2001-11-03", age: 24, currentRank: 354, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 328, name: "Roman Anthony", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "BOS", positions: ["OF"], birthDate: "2004-05-13", age: 22, currentRank: 22, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 329, name: "Ronald Acuna Jr.", fantasyTeam: "Gunnarrhea", mlbTeam: "ATL", positions: ["OF"], birthDate: "1997-12-18", age: 28, currentRank: 15, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "high", needsReview: false },
  { id: 330, name: "Royce Lewis", fantasyTeam: "Me So Heorny", mlbTeam: "MIN", positions: ["3B"], birthDate: "1999-06-05", age: 27, currentRank: 158, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "high", needsReview: false },
  { id: 331, name: "Ryan Helsley", fantasyTeam: "Mactown MacDaddies", mlbTeam: "BAL", positions: ["SP"], birthDate: "1994-07-18", age: 31, currentRank: 367, futureTier: "useful", categoryFitTier: "eliteReliever", riskTier: "reliever", needsReview: false },
  { id: 332, name: "Ryan Jeffers", fantasyTeam: "John's Super Team", mlbTeam: "MIN", positions: ["C"], birthDate: "1997-06-03", age: 29, currentRank: 419, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 333, name: "Ryan O'Hearn", fantasyTeam: "You Don't Know Bo", mlbTeam: "PIT", positions: ["1B"], birthDate: "1993-07-26", age: 32, currentRank: 463, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 334, name: "Ryan Sloan", fantasyTeam: "John's Super Team", mlbTeam: "SEA", positions: ["SP"], birthDate: "2006-01-29", age: 20, currentRank: 156, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 335, name: "Ryan Waldschmidt", fantasyTeam: "Gunnarrhea", mlbTeam: "ARI", positions: ["OF"], birthDate: "2002-10-07", age: 23, currentRank: 99, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 336, name: "Ryan Weathers", fantasyTeam: "BB's Bold Team", mlbTeam: "NYY", positions: ["SP"], birthDate: "1999-12-17", age: 26, currentRank: 242, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 337, name: "Sal Stewart", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "CIN", positions: ["1B"], birthDate: "2003-12-07", age: 22, currentRank: 55, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 338, name: "Sam Antonacci", fantasyTeam: "Dixon Cider", mlbTeam: "CHW", positions: ["2B", "SS"], birthDate: "2003-02-06", age: 23, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 339, name: "Samuel Basallo", fantasyTeam: "Dixon Cider", mlbTeam: "BAL", positions: ["C"], birthDate: "2004-08-13", age: 21, currentRank: 74, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 340, name: "Sandy Alcantara", fantasyTeam: "BB's Bold Team", mlbTeam: "MIA", positions: ["SP"], birthDate: "1995-09-07", age: 30, currentRank: 205, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "high", needsReview: false },
  { id: 341, name: "Sebastian Walcott", fantasyTeam: "Dixon Cider", mlbTeam: "TEX", positions: ["SS"], birthDate: "2006-03-14", age: 20, currentRank: 133, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 342, name: "Seiya Suzuki", fantasyTeam: "Dixon Cider", mlbTeam: "CHC", positions: ["OF"], birthDate: "1994-08-18", age: 31, currentRank: 127, futureTier: "solidKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: false },
  { id: 343, name: "Seth Hernandez", fantasyTeam: "Dixon Cider", mlbTeam: "PIT", positions: ["SP"], birthDate: "2006-06-28", age: 19, currentRank: 180, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 344, name: "Seth Lugo", fantasyTeam: "You Don't Know Bo", mlbTeam: "KC", positions: ["SP"], birthDate: "1989-11-17", age: 36, currentRank: 494, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 345, name: "Shane Baz", fantasyTeam: "This Is Mizerable", mlbTeam: "BAL", positions: ["SP"], birthDate: "1999-06-17", age: 27, currentRank: 211, futureTier: "strongKeeper", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: false },
  { id: 346, name: "Shane Bieber", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "TOR", positions: ["SP"], birthDate: "1995-05-31", age: 31, currentRank: 197, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "injured", needsReview: false },
  { id: 347, name: "Shane McClanahan", fantasyTeam: "BB's Bold Team", mlbTeam: "TB", positions: ["SP"], birthDate: "1997-04-28", age: 29, currentRank: 142, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 348, name: "Shea Langeliers", fantasyTeam: "BB's Bold Team", mlbTeam: "ATH", positions: ["C"], birthDate: "1997-11-18", age: 28, currentRank: 65, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 349, name: "Shohei Ohtani", fantasyTeam: "Dixon Cider", mlbTeam: "LAD", positions: ["UTIL", "SP"], birthDate: "1994-07-05", age: 31, currentRank: 1, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 350, name: "Shohei Ohtani", fantasyTeam: "Dixon Cider", mlbTeam: "LAD", positions: ["DH"], birthDate: "1994-07-05", age: 31, currentRank: 1, futureTier: "generational", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 351, name: "Shohei Ohtani", fantasyTeam: "Dixon Cider", mlbTeam: "LAD", positions: ["SP"], birthDate: "1994-07-05", age: 31, currentRank: 90, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "injured", needsReview: false },
  { id: 352, name: "Shota Imanaga", fantasyTeam: "Dixon Cider", mlbTeam: "CHC", positions: ["SP"], birthDate: "1993-09-01", age: 32, currentRank: 172, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 353, name: "Slade Cecconi", fantasyTeam: "John's Super Team", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-06-24", age: 27, currentRank: 497, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 354, name: "Sonny Gray", fantasyTeam: "BB's Bold Team", mlbTeam: "BOS", positions: ["SP"], birthDate: "1989-11-07", age: 36, currentRank: 200, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "aging", needsReview: false },
  { id: 355, name: "Spencer Arrighetti", fantasyTeam: "Mactown MacDaddies", mlbTeam: "HOU", positions: ["SP"], birthDate: "2000-01-02", age: 26, currentRank: 357, futureTier: "solidKeeper", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 356, name: "Spencer Schwellenbach", fantasyTeam: "Dixon Cider", mlbTeam: "ATL", positions: ["SP"], birthDate: "2000-05-31", age: 26, currentRank: 155, futureTier: "strongKeeper", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 357, name: "Spencer Steer", fantasyTeam: "This Is Mizerable", mlbTeam: "CIN", positions: ["1B"], birthDate: "1997-12-07", age: 28, currentRank: 402, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 358, name: "Spencer Strider", fantasyTeam: "This Is Mizerable", mlbTeam: "ATL", positions: ["SP"], birthDate: "1998-10-28", age: 27, currentRank: 109, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 359, name: "Spencer Torkelson", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "DET", positions: ["1B"], birthDate: "1999-08-26", age: 26, currentRank: 320, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 360, name: "Stephen Kolek", fantasyTeam: "You Don't Know Bo", mlbTeam: "SD", positions: ["SP"], birthDate: "1997-04-18", age: 29, currentRank: 330, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 361, name: "Steven Kwan", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["OF"], birthDate: "1997-09-05", age: 28, currentRank: 258, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 362, name: "T.J. Rumfield", fantasyTeam: "This Is Mizerable", mlbTeam: "NYY", positions: ["1B"], birthDate: "2000-05-17", age: 26, currentRank: 370, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 363, name: "Taj Bradley", fantasyTeam: "This Is Mizerable", mlbTeam: "MIN", positions: ["SP"], birthDate: "2001-03-20", age: 25, currentRank: 253, futureTier: "strongKeeper", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 364, name: "Tanner Bibee", fantasyTeam: "You Don't Know Bo", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-03-05", age: 27, currentRank: 178, futureTier: "star", categoryFitTier: "strongStarter", riskTier: "medium", needsReview: false },
  { id: 365, name: "Tanner Scott", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "LAD", positions: ["RP"], birthDate: "1994-07-22", age: 31, currentRank: 471, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 366, name: "Tarik Skubal", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "DET", positions: ["SP"], birthDate: "1996-11-20", age: 29, currentRank: 9, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 367, name: "Tatsuya Imai", fantasyTeam: "Dixon Cider", mlbTeam: "HOU", positions: ["SP"], birthDate: "1998-05-09", age: 28, currentRank: 336, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 368, name: "Taylor Ward", fantasyTeam: "You Don't Know Bo", mlbTeam: "BAL", positions: ["OF"], birthDate: "1993-12-14", age: 32, currentRank: 246, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 369, name: "Teoscar Hernandez", fantasyTeam: "BTA Boyz", mlbTeam: "LAD", positions: ["OF"], birthDate: "1992-10-15", age: 33, currentRank: 150, futureTier: "shortTerm", categoryFitTier: "powerOnly", riskTier: "aging", needsReview: false },
  { id: 370, name: "Thomas White", fantasyTeam: "Mactown MacDaddies", mlbTeam: "MIA", positions: ["SP"], birthDate: "2004-09-29", age: 21, currentRank: 169, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 371, name: "Tink Hence", fantasyTeam: "You Don't Know Bo", mlbTeam: "STL", positions: ["SP"], birthDate: "2002-08-06", age: 23, currentRank: 432, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 372, name: "Tommy Edman", fantasyTeam: "BB's Bold Team", mlbTeam: "LAD", positions: ["2B"], birthDate: "1995-05-09", age: 31, currentRank: 452, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: false },
  { id: 373, name: "Travis Bazzana", fantasyTeam: "This Is Mizerable", mlbTeam: "CLE", positions: ["2B"], birthDate: "2002-08-28", age: 23, currentRank: 84, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 374, name: "Travis Sykora", fantasyTeam: "John's Super Team", mlbTeam: "WAS", positions: ["SP"], birthDate: "2004-04-28", age: 22, currentRank: 316, futureTier: "prospectHigh", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 375, name: "Trea Turner", fantasyTeam: "Gunnarrhea", mlbTeam: "PHI", positions: ["SS"], birthDate: "1993-06-30", age: 32, currentRank: 45, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 376, name: "Trevor Megill", fantasyTeam: "BB's Bold Team", mlbTeam: "MIL", positions: ["RP"], birthDate: "1993-12-05", age: 32, currentRank: 285, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: false },
  { id: 377, name: "Trevor Story", fantasyTeam: "You Don't Know Bo", mlbTeam: "BOS", positions: ["SS"], birthDate: "1992-11-15", age: 33, currentRank: 349, futureTier: "shortTerm", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: false },
  { id: 378, name: "Trey Yesavage", fantasyTeam: "Dixon Cider", mlbTeam: "TOR", positions: ["SP"], birthDate: "2003-07-28", age: 22, currentRank: 59, futureTier: "prospectMedium", categoryFitTier: "strongStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 379, name: "Troy Johnston", fantasyTeam: "BTA Boyz", mlbTeam: "MIA", positions: ["1B", "OF"], birthDate: "1997-06-22", age: 29, currentRank: 380, futureTier: "depth", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 380, name: "Tyler Black", fantasyTeam: "BB's Bold Team", mlbTeam: "MIL", positions: ["1B", "3B"], birthDate: "2000-07-26", age: 25, currentRank: 270, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 381, name: "Tyler Glasnow", fantasyTeam: "Gunnarrhea", mlbTeam: "LAD", positions: ["SP"], birthDate: "1993-08-23", age: 32, currentRank: 119, futureTier: "strongKeeper", categoryFitTier: "eliteStarter", riskTier: "high", needsReview: false },
  { id: 382, name: "Tyler O'Neill", fantasyTeam: "Dixon Cider", mlbTeam: "BAL", positions: ["OF"], birthDate: "1995-06-22", age: 31, currentRank: 489, futureTier: "useful", categoryFitTier: "powerOnly", riskTier: "high", needsReview: false },
  { id: 383, name: "Tyler Rogers", fantasyTeam: "Dixon Cider", mlbTeam: "SF", positions: ["RP"], birthDate: "1990-12-17", age: 35, currentRank: 350, futureTier: "depth", categoryFitTier: "usefulReliever", riskTier: "aging", needsReview: false },
  { id: 384, name: "Tyler Soderstrom", fantasyTeam: "This Is Mizerable", mlbTeam: "ATH", positions: ["1B"], birthDate: "2001-11-24", age: 24, currentRank: 95, futureTier: "strongKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 385, name: "Vinnie Pasquantino", fantasyTeam: "BB's Bold Team", mlbTeam: "KC", positions: ["1B"], birthDate: "1997-10-10", age: 28, currentRank: 94, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 386, name: "Vladimir Guerrero Jr.", fantasyTeam: "This Is Mizerable", mlbTeam: "TOR", positions: ["1B"], birthDate: "1999-03-16", age: 27, currentRank: 20, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "low", needsReview: false },
  { id: 387, name: "Walbert Urena", fantasyTeam: "This Is Mizerable", mlbTeam: "LAA", positions: ["SP"], birthDate: "2004-01-25", age: 22, currentRank: 390, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: false },
  { id: 388, name: "Walker Jenkins", fantasyTeam: "This Is Mizerable", mlbTeam: "MIN", positions: ["OF"], birthDate: "2005-02-19", age: 21, currentRank: 68, futureTier: "prospectElite", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 389, name: "Will Smith", fantasyTeam: "Mactown MacDaddies", mlbTeam: "LAD", positions: ["C"], birthDate: "1995-03-28", age: 31, currentRank: 137, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "low", needsReview: false },
  { id: 390, name: "Will Warren", fantasyTeam: "BB's Bold Team", mlbTeam: "NYY", positions: ["SP"], birthDate: "1999-06-16", age: 27, currentRank: 292, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: false },
  { id: 391, name: "William Contreras", fantasyTeam: "BTA Boyz", mlbTeam: "MIL", positions: ["C"], birthDate: "1997-12-24", age: 28, currentRank: 67, futureTier: "star", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 392, name: "Willson Contreras", fantasyTeam: "Me So Heorny", mlbTeam: "BOS", positions: ["1B"], birthDate: "1992-05-13", age: 34, currentRank: 218, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 393, name: "Willy Adames", fantasyTeam: "John's Super Team", mlbTeam: "SF", positions: ["SS"], birthDate: "1995-09-02", age: 30, currentRank: 132, futureTier: "solidKeeper", categoryFitTier: "powerOnly", riskTier: "medium", needsReview: false },
  { id: 394, name: "Wilson Rodriguez", fantasyTeam: "BB's Bold Team", mlbTeam: "NYM", positions: ["C"], birthDate: "2004-09-10", age: 21, currentRank: 370, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 395, name: "Wilyer Abreu", fantasyTeam: "This Is Mizerable", mlbTeam: "BOS", positions: ["OF"], birthDate: "1999-06-24", age: 27, currentRank: 186, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 396, name: "Wyatt Langford", fantasyTeam: "BB's Bold Team", mlbTeam: "TEX", positions: ["OF"], birthDate: "2001-11-15", age: 24, currentRank: 27, futureTier: "cornerstone", categoryFitTier: "strongHitter", riskTier: "low", needsReview: false },
  { id: 397, name: "Xander Bogaerts", fantasyTeam: "You Don't Know Bo", mlbTeam: "SD", positions: ["2B"], birthDate: "1992-10-01", age: 33, currentRank: 324, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: false },
  { id: 398, name: "Xavier Edwards", fantasyTeam: "This Is Mizerable", mlbTeam: "MIA", positions: ["2B"], birthDate: "1999-08-09", age: 26, currentRank: 189, futureTier: "solidKeeper", categoryFitTier: "speedOnly", riskTier: "medium", needsReview: false },
  { id: 399, name: "Yainer Diaz", fantasyTeam: "John's Super Team", mlbTeam: "HOU", positions: ["C"], birthDate: "1998-09-21", age: 27, currentRank: 274, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 400, name: "Yandy Diaz", fantasyTeam: "BB's Bold Team", mlbTeam: "TB", positions: ["1B"], birthDate: "1991-08-08", age: 34, currentRank: 161, futureTier: "shortTerm", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: false },
  { id: 401, name: "Yordan Alvarez", fantasyTeam: "Dixon Cider", mlbTeam: "HOU", positions: ["OF"], birthDate: "1997-06-27", age: 28, currentRank: 16, futureTier: "elite", categoryFitTier: "eliteHitter", riskTier: "medium", needsReview: false },
  { id: 402, name: "Yoshinobu Yamamoto", fantasyTeam: "BB's Bold Team", mlbTeam: "LAD", positions: ["SP"], birthDate: "1998-08-17", age: 27, currentRank: 23, futureTier: "elite", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 403, name: "Yu Darvish", fantasyTeam: "BTA Boyz", mlbTeam: "SD", positions: ["SP"], birthDate: "1986-08-16", age: 39, currentRank: 360, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: false },
  { id: 404, name: "Zac Gallen", fantasyTeam: "BTA Boyz", mlbTeam: "ARI", positions: ["SP"], birthDate: "1995-08-03", age: 30, currentRank: 339, futureTier: "strongKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: false },
  { id: 405, name: "Zach Neto", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "LAA", positions: ["SS"], birthDate: "2001-01-31", age: 25, currentRank: 29, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: false },
  { id: 406, name: "Zack Gelof", fantasyTeam: "Goodyear Gila Monsters", mlbTeam: "ATH", positions: ["UTIL"], birthDate: "1999-10-19", age: 26, currentRank: 424, futureTier: "useful", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: false },
  { id: 407, name: "Zack Wheeler", fantasyTeam: "Me So Heorny", mlbTeam: "PHI", positions: ["SP"], birthDate: "1990-05-30", age: 36, currentRank: 159, futureTier: "star", categoryFitTier: "eliteStarter", riskTier: "medium", needsReview: false },
  { id: 408, name: "Zyhir Hope", fantasyTeam: "Gunnarrhea", mlbTeam: "LAD", positions: ["OF"], birthDate: "2005-01-19", age: 21, currentRank: 193, futureTier: "prospectMedium", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: false },
  { id: 409, name: "Josuar Gonzalez", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["SS"], birthDate: "2007-10-16", age: 18, currentRank: 103, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 410, name: "Munetaka Murakami", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2000-02-02", age: 26, currentRank: 105, futureTier: "strongKeeper", categoryFitTier: "strongHitter", riskTier: "medium", needsReview: true },
  { id: 411, name: "Noah Schultz", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-08-05", age: 22, currentRank: 144, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 412, name: "Addison Barger", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["3B"], birthDate: "1999-11-12", age: 26, currentRank: 148, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 413, name: "Sam Antonacci", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-02-06", age: 23, currentRank: 152, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 414, name: "Brett Baty", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["3B"], birthDate: "1999-11-13", age: 26, currentRank: 170, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 415, name: "Caleb Bonemer", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2005-10-05", age: 20, currentRank: 171, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 416, name: "Arjun Nimmala", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["SS"], birthDate: "2005-10-16", age: 20, currentRank: 174, futureTier: "prospectHigh", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 417, name: "Devin Fitz-Gerald", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["2B"], birthDate: "2005-08-17", age: 20, currentRank: 175, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 418, name: "Eric Hartman", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["OF"], birthDate: "2006-06-16", age: 20, currentRank: 176, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 419, name: "Braden Montgomery", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-04-16", age: 23, currentRank: 179, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 420, name: "Kyle Manzardo", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["1B"], birthDate: "2000-07-18", age: 25, currentRank: 181, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 421, name: "Jhonny Level", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["SS"], birthDate: "2007-03-29", age: 19, currentRank: 184, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 422, name: "Theo Gillen", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["OF"], birthDate: "2005-09-12", age: 20, currentRank: 190, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 423, name: "Mark Vientos", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["3B"], birthDate: "1999-12-11", age: 26, currentRank: 192, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 424, name: "Edward Cabrera", fantasyTeam: "Free Agent", mlbTeam: "CHC", positions: ["SP"], birthDate: "1998-04-13", age: 28, currentRank: 199, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 425, name: "Luis Hernandez", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["SS"], birthDate: "2002-07-17", age: 23, currentRank: 210, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 426, name: "Eugenio Suarez", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["3B"], birthDate: "1991-07-18", age: 34, currentRank: 213, futureTier: "useful", categoryFitTier: "goodHitter", riskTier: "aging", needsReview: true },
  { id: 427, name: "Henry Bolte", fantasyTeam: "Free Agent", mlbTeam: "ATH", positions: ["OF"], birthDate: "2003-08-04", age: 22, currentRank: 216, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 428, name: "Miguel Vargas", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "1999-11-17", age: 26, currentRank: 224, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 429, name: "Seaver King", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["SS"], birthDate: "2003-04-25", age: 23, currentRank: 225, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 430, name: "Anthony Eyanson", fantasyTeam: "Free Agent", mlbTeam: "BOS", positions: ["SP"], birthDate: "2004-10-09", age: 21, currentRank: 226, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 431, name: "Brody Hopkins", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SP"], birthDate: "2002-01-18", age: 24, currentRank: 232, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 432, name: "Angel Genao", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["SS"], birthDate: "2004-05-19", age: 22, currentRank: 233, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 433, name: "Dax Kilby", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["SS"], birthDate: "2006-11-17", age: 19, currentRank: 234, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 434, name: "Joshua Baez", fantasyTeam: "Free Agent", mlbTeam: "STL", positions: ["OF"], birthDate: "2003-06-28", age: 22, currentRank: 235, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 435, name: "Kyle Teel", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2002-02-15", age: 24, currentRank: 236, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 436, name: "Michael Arroyo", fantasyTeam: "Free Agent", mlbTeam: "SEA", positions: ["OF"], birthDate: "2004-11-03", age: 21, currentRank: 239, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 437, name: "Jack Leiter", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["SP"], birthDate: "2000-04-21", age: 26, currentRank: 240, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 438, name: "Josiah Hartshorn", fantasyTeam: "Free Agent", mlbTeam: "CHC", positions: ["OF"], birthDate: "2007-02-02", age: 19, currentRank: 241, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 439, name: "Roldy Brito", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["OF"], birthDate: "2007-04-08", age: 19, currentRank: 243, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 440, name: "Luis Lara", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["OF"], birthDate: "2004-11-17", age: 21, currentRank: 244, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 441, name: "Anthony Volpe", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["SS"], birthDate: "2001-04-28", age: 25, currentRank: 245, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 442, name: "Xavier Neyens", fantasyTeam: "Free Agent", mlbTeam: "HOU", positions: ["SS"], birthDate: "2006-10-29", age: 19, currentRank: 247, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 443, name: "Tyler Bremner", fantasyTeam: "Free Agent", mlbTeam: "LAA", positions: ["SP"], birthDate: "2004-04-20", age: 22, currentRank: 248, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 444, name: "Luis Castillo", fantasyTeam: "Free Agent", mlbTeam: "SEA", positions: ["SP"], birthDate: "1992-12-12", age: 33, currentRank: 250, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 445, name: "Edwin Arroyo", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["SS"], birthDate: "2003-08-25", age: 22, currentRank: 255, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 446, name: "Luis Robert Jr", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "1997-08-03", age: 28, currentRank: 257, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 447, name: "Elmer Rodriguez-Cruz", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["SP"], birthDate: "2003-08-18", age: 22, currentRank: 260, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 448, name: "Josh Hammond", fantasyTeam: "Free Agent", mlbTeam: "KC", positions: ["SS"], birthDate: "2006-09-21", age: 19, currentRank: 264, futureTier: "solidKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 449, name: "Emil Morales", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["SS"], birthDate: "2006-09-22", age: 19, currentRank: 265, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 450, name: "Cooper Pratt", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["SS"], birthDate: "2004-08-18", age: 21, currentRank: 267, futureTier: "prospectMedium", categoryFitTier: "goodHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 451, name: "Gage Wood", fantasyTeam: "Free Agent", mlbTeam: "PHI", positions: ["SP"], birthDate: "2003-12-15", age: 22, currentRank: 272, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 452, name: "Justin Gonzales", fantasyTeam: "Free Agent", mlbTeam: "BOS", positions: ["OF"], birthDate: "2006-12-31", age: 19, currentRank: 277, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 453, name: "Steele Hall", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["SS"], birthDate: "2007-07-24", age: 18, currentRank: 278, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 454, name: "Dylan Beavers", fantasyTeam: "Free Agent", mlbTeam: "BAL", positions: ["OF"], birthDate: "2001-08-11", age: 24, currentRank: 279, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 455, name: "Daulton Varsho", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["OF"], birthDate: "1996-07-02", age: 29, currentRank: 283, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 456, name: "Ezequiel Tovar", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["SS"], birthDate: "2001-08-01", age: 24, currentRank: 284, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 457, name: "Grant Taylor", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2002-05-20", age: 24, currentRank: 285, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 458, name: "Colson Montgomery", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2002-02-27", age: 24, currentRank: 288, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 459, name: "Ryne Nelson", fantasyTeam: "Free Agent", mlbTeam: "ARI", positions: ["SP"], birthDate: "1998-02-01", age: 28, currentRank: 297, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 460, name: "Zebby Matthews", fantasyTeam: "Free Agent", mlbTeam: "MIN", positions: ["SP"], birthDate: "2000-05-22", age: 26, currentRank: 298, futureTier: "solidKeeper", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 461, name: "Braylon Payne", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["OF"], birthDate: "2006-08-14", age: 19, currentRank: 301, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 462, name: "Ronny Cruz", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["SS"], birthDate: "2006-08-24", age: 19, currentRank: 303, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 463, name: "Kerry Carpenter", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["OF"], birthDate: "1997-09-02", age: 28, currentRank: 304, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 464, name: "Josh Adamczewski", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["OF"], birthDate: "2005-05-10", age: 21, currentRank: 305, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 465, name: "Connor Prielipp", fantasyTeam: "Free Agent", mlbTeam: "MIN", positions: ["SP"], birthDate: "2001-01-10", age: 25, currentRank: 306, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 466, name: "Sal Frelick", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["OF"], birthDate: "2000-04-19", age: 26, currentRank: 309, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 467, name: "Colt Keith", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["2B"], birthDate: "2001-08-14", age: 24, currentRank: 310, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 468, name: "Daniel Palencia", fantasyTeam: "Free Agent", mlbTeam: "CHC", positions: ["RP"], birthDate: "2000-02-05", age: 26, currentRank: 311, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 469, name: "Luis Garcia Jr.", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["2B"], birthDate: "2000-05-16", age: 26, currentRank: 312, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 470, name: "Jeff Hoffman", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["RP"], birthDate: "1993-01-08", age: 33, currentRank: 313, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 471, name: "Taitn Gray", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["1B"], birthDate: "2007-08-16", age: 18, currentRank: 314, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 472, name: "JoJo Parker", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["SS"], birthDate: "2006-08-08", age: 19, currentRank: 315, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 473, name: "Aaron Nola", fantasyTeam: "Free Agent", mlbTeam: "PHI", positions: ["SP"], birthDate: "1993-06-04", age: 33, currentRank: 317, futureTier: "shortTerm", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 474, name: "Demetrio Crisantes", fantasyTeam: "Free Agent", mlbTeam: "ARI", positions: ["2B"], birthDate: "2004-09-05", age: 21, currentRank: 318, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 475, name: "Tate Southisene", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["SS"], birthDate: "2006-10-06", age: 19, currentRank: 319, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 476, name: "Pedro Ramirez", fantasyTeam: "Free Agent", mlbTeam: "CHC", positions: ["3B"], birthDate: "2004-04-01", age: 22, currentRank: 321, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 477, name: "Coby Mayo", fantasyTeam: "Free Agent", mlbTeam: "BAL", positions: ["3B"], birthDate: "2001-12-10", age: 24, currentRank: 322, futureTier: "prospectMedium", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 478, name: "Triston Casas", fantasyTeam: "Free Agent", mlbTeam: "BOS", positions: ["1B"], birthDate: "2000-01-15", age: 26, currentRank: 323, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 479, name: "AJ Smith-Shawver", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["SP"], birthDate: "2002-11-20", age: 23, currentRank: 325, futureTier: "prospectMedium", categoryFitTier: "goodStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 480, name: "Charles Davalan", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["OF"], birthDate: "2003-12-16", age: 22, currentRank: 327, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 481, name: "Cooper Flemming", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SS"], birthDate: "2006-08-05", age: 19, currentRank: 328, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 482, name: "Luis Perales", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["SP"], birthDate: "2003-04-14", age: 23, currentRank: 330, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 483, name: "Austin Wells", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["C"], birthDate: "1999-07-12", age: 26, currentRank: 331, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 484, name: "River Ryan", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["SP"], birthDate: "1998-08-17", age: 27, currentRank: 338, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 485, name: "Wei-En Lin", fantasyTeam: "Free Agent", mlbTeam: "ATH", positions: ["SP"], birthDate: "2005-11-04", age: 20, currentRank: 340, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 486, name: "Wyatt Sanford", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["SS"], birthDate: "2005-11-24", age: 20, currentRank: 343, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 487, name: "Quinn Priester", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["SP"], birthDate: "2000-09-16", age: 25, currentRank: 344, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 488, name: "Nathan Flewelling", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["C"], birthDate: "2006-11-11", age: 19, currentRank: 345, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 489, name: "Trevor Rogers", fantasyTeam: "Free Agent", mlbTeam: "BAL", positions: ["SP"], birthDate: "1997-11-13", age: 28, currentRank: 346, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 490, name: "Landen Roupp", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["SP"], birthDate: "1998-09-10", age: 27, currentRank: 347, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 491, name: "Caden Scarborough", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["SP"], birthDate: "2005-04-01", age: 21, currentRank: 350, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 492, name: "John Gil", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["SS"], birthDate: "2006-05-14", age: 20, currentRank: 351, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 493, name: "Anderson Brito", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SP"], birthDate: "2004-07-07", age: 21, currentRank: 355, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 494, name: "Nolan Schanuel", fantasyTeam: "Free Agent", mlbTeam: "LAA", positions: ["1B"], birthDate: "2002-02-14", age: 24, currentRank: 356, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 495, name: "Andrew Vaughn", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["1B"], birthDate: "1998-04-03", age: 28, currentRank: 357, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 496, name: "Troy Melton", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["SP"], birthDate: "2000-12-03", age: 25, currentRank: 358, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 497, name: "Ethan Petry", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["OF"], birthDate: "2004-06-17", age: 22, currentRank: 361, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 498, name: "Justin Crawford", fantasyTeam: "Free Agent", mlbTeam: "PHI", positions: ["OF"], birthDate: "2004-01-13", age: 22, currentRank: 362, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 499, name: "Esmerlyn Valdez", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["OF"], birthDate: "2004-01-27", age: 22, currentRank: 363, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 500, name: "Robert Arias", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["OF"], birthDate: "2006-09-13", age: 19, currentRank: 364, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 501, name: "Karson Milbrandt", fantasyTeam: "Free Agent", mlbTeam: "MIA", positions: ["SP"], birthDate: "2004-04-21", age: 22, currentRank: 366, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 502, name: "Ryan Pepiot", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SP"], birthDate: "1997-08-21", age: 28, currentRank: 369, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 503, name: "James Tibbs III", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["OF"], birthDate: "2002-10-01", age: 23, currentRank: 370, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 504, name: "Yohendrick Pinango", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["OF"], birthDate: "2002-05-07", age: 24, currentRank: 371, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 505, name: "Lars Nootbaar", fantasyTeam: "Free Agent", mlbTeam: "STL", positions: ["OF"], birthDate: "1997-09-08", age: 28, currentRank: 372, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 506, name: "Hector Rodriguez", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["OF"], birthDate: "2004-03-11", age: 22, currentRank: 373, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 507, name: "Caleb Durbin", fantasyTeam: "Free Agent", mlbTeam: "BOS", positions: ["2B"], birthDate: "2000-02-22", age: 26, currentRank: 374, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 508, name: "Cade Cavalli", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["SP"], birthDate: "1998-08-14", age: 27, currentRank: 376, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 509, name: "Salvador Perez", fantasyTeam: "Free Agent", mlbTeam: "KC", positions: ["C"], birthDate: "1990-05-10", age: 36, currentRank: 378, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: true },
  { id: 510, name: "Evan Carter", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["OF"], birthDate: "2002-08-29", age: 23, currentRank: 379, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 511, name: "Jesus Sanchez", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["OF"], birthDate: "1997-10-07", age: 28, currentRank: 380, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 512, name: "Griffin Jax", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["RP"], birthDate: "1994-11-22", age: 31, currentRank: 382, futureTier: "useful", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 513, name: "Giancarlo Stanton", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["OF"], birthDate: "1989-11-08", age: 36, currentRank: 383, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "aging", needsReview: true },
  { id: 514, name: "Carson Williams", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SS"], birthDate: "2003-06-25", age: 22, currentRank: 384, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 515, name: "Brayan Bello", fantasyTeam: "Free Agent", mlbTeam: "BOS", positions: ["SP"], birthDate: "1999-05-17", age: 27, currentRank: 387, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 516, name: "Jackson Kent", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["SP"], birthDate: "2003-02-10", age: 23, currentRank: 388, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 517, name: "Edgar Quero", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2003-04-06", age: 23, currentRank: 389, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 518, name: "Trevor Larnach", fantasyTeam: "Free Agent", mlbTeam: "MIN", positions: ["OF"], birthDate: "1997-02-26", age: 29, currentRank: 392, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 519, name: "Brenton Doyle", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["OF"], birthDate: "1998-05-14", age: 28, currentRank: 394, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 520, name: "Kevin Alvarez", fantasyTeam: "Free Agent", mlbTeam: "HOU", positions: ["OF"], birthDate: "2008-01-13", age: 18, currentRank: 395, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 521, name: "Johnny King", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["SP"], birthDate: "2006-07-26", age: 19, currentRank: 396, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 522, name: "Jhostynxon Garcia", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["OF"], birthDate: "2002-12-11", age: 23, currentRank: 397, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 523, name: "Braylon Doughty", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["SP"], birthDate: "2005-12-07", age: 20, currentRank: 399, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 524, name: "Jake Bennett", fantasyTeam: "Free Agent", mlbTeam: "BOS", positions: ["SP"], birthDate: "2004-08-04", age: 21, currentRank: 400, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 525, name: "Mike Burrows", fantasyTeam: "Free Agent", mlbTeam: "HOU", positions: ["SP"], birthDate: "1999-11-08", age: 26, currentRank: 403, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 526, name: "Juneiker Caceres", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["OF"], birthDate: "2007-08-15", age: 18, currentRank: 404, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 527, name: "Ike Irish", fantasyTeam: "Free Agent", mlbTeam: "BAL", positions: ["1B"], birthDate: "2003-11-26", age: 22, currentRank: 406, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 528, name: "Tanner Franklin", fantasyTeam: "Free Agent", mlbTeam: "STL", positions: ["SP"], birthDate: "2004-05-25", age: 22, currentRank: 407, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 529, name: "Ramon Laureano", fantasyTeam: "Free Agent", mlbTeam: "SD", positions: ["OF"], birthDate: "1994-07-15", age: 31, currentRank: 408, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 530, name: "Jefferson Rojas", fantasyTeam: "Free Agent", mlbTeam: "CHC", positions: ["SS"], birthDate: "2005-04-25", age: 21, currentRank: 409, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 531, name: "Joe Boyle", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SP"], birthDate: "1999-08-14", age: 26, currentRank: 411, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 532, name: "Daniel Pierce", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SS"], birthDate: "2006-08-04", age: 19, currentRank: 412, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 533, name: "Kumar Rocker", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["SP"], birthDate: "1999-11-22", age: 26, currentRank: 413, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 534, name: "Alejandro Osuna", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["OF"], birthDate: "2002-10-10", age: 23, currentRank: 414, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 535, name: "Jose Caballero", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["2B"], birthDate: "1996-08-30", age: 29, currentRank: 417, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 536, name: "Gavin Fien", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["SS"], birthDate: "2007-03-08", age: 19, currentRank: 418, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 537, name: "Jonny Farmelo", fantasyTeam: "Free Agent", mlbTeam: "SEA", positions: ["OF"], birthDate: "2004-09-09", age: 21, currentRank: 420, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 538, name: "Matt Wallner", fantasyTeam: "Free Agent", mlbTeam: "MIN", positions: ["OF"], birthDate: "1997-12-12", age: 28, currentRank: 421, futureTier: "depth", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 539, name: "Ryan Clifford", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["1B"], birthDate: "2003-07-20", age: 22, currentRank: 422, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 540, name: "Noah Cameron", fantasyTeam: "Free Agent", mlbTeam: "KC", positions: ["SP"], birthDate: "1999-07-17", age: 26, currentRank: 423, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 541, name: "JD Dix", fantasyTeam: "Free Agent", mlbTeam: "ARI", positions: ["SS"], birthDate: "2005-10-12", age: 20, currentRank: 426, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 542, name: "Justin Lamkin", fantasyTeam: "Free Agent", mlbTeam: "KC", positions: ["SP"], birthDate: "2004-06-01", age: 22, currentRank: 428, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 543, name: "Spencer Jones", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["OF"], birthDate: "2001-05-14", age: 25, currentRank: 429, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 544, name: "Adolis Garcia", fantasyTeam: "Free Agent", mlbTeam: "PHI", positions: ["OF"], birthDate: "1993-03-02", age: 33, currentRank: 432, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 545, name: "Xavier Isaac", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["1B"], birthDate: "2003-12-17", age: 22, currentRank: 433, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 546, name: "Felnin Celestin", fantasyTeam: "Free Agent", mlbTeam: "SEA", positions: ["SS"], birthDate: "2005-09-15", age: 20, currentRank: 434, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 547, name: "Andres Gimenez", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["2B"], birthDate: "1998-09-04", age: 27, currentRank: 435, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 548, name: "Spencer Horwitz", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["1B"], birthDate: "1997-11-14", age: 28, currentRank: 436, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 549, name: "Lucas Giolito", fantasyTeam: "Free Agent", mlbTeam: "SD", positions: ["SP"], birthDate: "1994-07-14", age: 31, currentRank: 437, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 550, name: "Jasson Dominguez", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["OF"], birthDate: "2003-02-07", age: 23, currentRank: 438, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 551, name: "Marcus Semien", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["2B"], birthDate: "1990-09-17", age: 35, currentRank: 439, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "aging", needsReview: true },
  { id: 552, name: "Kendall George", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["OF"], birthDate: "2004-10-29", age: 21, currentRank: 440, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 553, name: "Miguel Sime Jr.", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["SP"], birthDate: "2007-05-08", age: 19, currentRank: 441, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 554, name: "Andrew Fischer", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["3B"], birthDate: "2004-05-25", age: 22, currentRank: 442, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 555, name: "Jordan Beck", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["OF"], birthDate: "2001-04-19", age: 25, currentRank: 443, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 556, name: "Bryce Rainer", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["SS"], birthDate: "2005-07-03", age: 20, currentRank: 444, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 557, name: "Eduardo Tait", fantasyTeam: "Free Agent", mlbTeam: "MIN", positions: ["C"], birthDate: "2006-08-27", age: 19, currentRank: 445, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 558, name: "TJ Friedl", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["OF"], birthDate: "1995-08-14", age: 30, currentRank: 448, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 559, name: "Jake Burger", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["1B"], birthDate: "1996-04-10", age: 30, currentRank: 450, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 560, name: "Ha-Seong Kim", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["SS"], birthDate: "1995-10-17", age: 30, currentRank: 453, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 561, name: "Bo Davidson", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["OF"], birthDate: "2002-07-05", age: 23, currentRank: 454, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 562, name: "Chase Meidroth", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2001-07-23", age: 24, currentRank: 456, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 563, name: "Trent Grisham", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["OF"], birthDate: "1996-11-01", age: 29, currentRank: 458, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 564, name: "Luis Morales", fantasyTeam: "Free Agent", mlbTeam: "ATH", positions: ["SP"], birthDate: "2002-09-24", age: 23, currentRank: 459, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 565, name: "Clay Holmes", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["SP"], birthDate: "1993-03-27", age: 33, currentRank: 460, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 566, name: "Parker Meadows", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["OF"], birthDate: "1999-11-02", age: 26, currentRank: 461, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 567, name: "Brady House", fantasyTeam: "Free Agent", mlbTeam: "WAS", positions: ["3B"], birthDate: "2003-06-04", age: 23, currentRank: 462, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 568, name: "Shane Smith", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2000-04-04", age: 26, currentRank: 465, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 569, name: "Joey Ortiz", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["SS"], birthDate: "1998-07-14", age: 27, currentRank: 466, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 570, name: "Kodai Senga", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["SP"], birthDate: "1993-01-30", age: 33, currentRank: 467, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 571, name: "Braxton Garrett", fantasyTeam: "Free Agent", mlbTeam: "MIA", positions: ["SP"], birthDate: "1997-08-05", age: 28, currentRank: 468, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 572, name: "Chad Patrick", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["SP"], birthDate: "1998-08-14", age: 27, currentRank: 469, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 573, name: "Grant Holmes", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["SP"], birthDate: "1996-03-22", age: 30, currentRank: 470, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 574, name: "Curtis Mead", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "2000-10-26", age: 25, currentRank: 474, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 575, name: "Jorge Polanco", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["2B"], birthDate: "1993-07-05", age: 32, currentRank: 475, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 576, name: "Josh Smith", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["3B"], birthDate: "1997-08-07", age: 28, currentRank: 476, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 577, name: "Hurston Waldrep", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["SP"], birthDate: "2002-03-01", age: 24, currentRank: 477, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 578, name: "Chase Dollander", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["SP"], birthDate: "2001-10-26", age: 24, currentRank: 478, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 579, name: "Brice Matthews", fantasyTeam: "Free Agent", mlbTeam: "HOU", positions: ["SS"], birthDate: "2002-03-16", age: 24, currentRank: 480, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 580, name: "Nolan Gorman", fantasyTeam: "Free Agent", mlbTeam: "STL", positions: ["2B"], birthDate: "2000-05-10", age: 26, currentRank: 481, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 581, name: "Isaac Collins", fantasyTeam: "Free Agent", mlbTeam: "KC", positions: ["OF"], birthDate: "1997-07-22", age: 28, currentRank: 482, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 582, name: "Victor Robles", fantasyTeam: "Free Agent", mlbTeam: "SEA", positions: ["OF"], birthDate: "1997-05-19", age: 29, currentRank: 483, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 583, name: "Josh Lowe", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["OF"], birthDate: "1998-02-02", age: 28, currentRank: 484, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 584, name: "Josh Owens", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["SS", "SP"], birthDate: "2007-01-08", age: 19, currentRank: 487, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 585, name: "Harrison Bader", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["OF"], birthDate: "1994-06-03", age: 32, currentRank: 488, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 586, name: "Austin Hays", fantasyTeam: "Free Agent", mlbTeam: "", positions: ["UTIL"], birthDate: "1995-07-05", age: 30, currentRank: 489, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 587, name: "Tyler Freeman", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["OF"], birthDate: "1999-05-21", age: 27, currentRank: 490, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 588, name: "Carlos Narvaez", fantasyTeam: "Free Agent", mlbTeam: "BOS", positions: ["C"], birthDate: "1998-11-26", age: 27, currentRank: 491, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 589, name: "Marcell Ozuna", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["UTIL"], birthDate: "1990-11-12", age: 35, currentRank: 492, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "aging", needsReview: true },
  { id: 590, name: "Cole Carrigg", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["OF"], birthDate: "2002-05-08", age: 24, currentRank: 493, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 591, name: "Ronny Mauricio", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["2B"], birthDate: "2001-04-04", age: 25, currentRank: 495, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 592, name: "Carlos Cortes", fantasyTeam: "Free Agent", mlbTeam: "ATH", positions: ["OF"], birthDate: "1997-06-30", age: 28, currentRank: 496, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 593, name: "Ian Seymour", fantasyTeam: "Free Agent", mlbTeam: "TB", positions: ["SP"], birthDate: "1998-12-13", age: 27, currentRank: 498, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 594, name: "Yolfran Castillo", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["SS"], birthDate: "2007-02-08", age: 19, currentRank: 499, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 595, name: "Jake Bloss", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["SP"], birthDate: "2001-06-23", age: 25, currentRank: 500, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 596, name: "Abner Uribe", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["RP"], birthDate: "2000-06-20", age: 26, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 597, name: "Alex Clemmey", fantasyTeam: "Free Agent", mlbTeam: "WSH", positions: ["SP"], birthDate: "2005-07-18", age: 20, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 598, name: "Alex Freeland", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["SS"], birthDate: "2001-08-24", age: 24, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 599, name: "Anthony Santander", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["OF"], birthDate: "1994-10-19", age: 31, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 600, name: "Ben Casparius", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["RP"], birthDate: "1999-02-11", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 601, name: "Blake Mitchell", fantasyTeam: "Free Agent", mlbTeam: "KC", positions: ["C"], birthDate: "2004-08-03", age: 21, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "averageHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 602, name: "Brandon Pfaadt", fantasyTeam: "Free Agent", mlbTeam: "AZ", positions: ["SP"], birthDate: "1998-10-15", age: 27, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 603, name: "Bryan Abreu", fantasyTeam: "Free Agent", mlbTeam: "HOU", positions: ["RP"], birthDate: "1997-04-22", age: 29, currentRank: 650, futureTier: "useful", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 604, name: "C.J. Kayfus", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["1B"], birthDate: "2001-10-28", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 605, name: "Caden Dana", fantasyTeam: "Free Agent", mlbTeam: "LAA", positions: ["SP"], birthDate: "2003-12-17", age: 22, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 606, name: "Cam Collier", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["3B"], birthDate: "2004-11-20", age: 21, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "flawedHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 607, name: "Camilo Doval", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["RP"], birthDate: "1997-07-04", age: 28, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 608, name: "Carlos Estevez", fantasyTeam: "Free Agent", mlbTeam: "KC", positions: ["RP"], birthDate: "1992-12-28", age: 33, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 609, name: "Carson Whisenhunt", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["SP"], birthDate: "2000-10-20", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 610, name: "Chase Petty", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["SP"], birthDate: "2003-04-04", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 611, name: "Christian Moore", fantasyTeam: "Free Agent", mlbTeam: "LAA", positions: ["2B"], birthDate: "2002-10-21", age: 23, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 612, name: "Christian Scott", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["SP"], birthDate: "1999-06-15", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 613, name: "Clarke Schmidt", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["SP"], birthDate: "1996-02-20", age: 30, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 614, name: "Connor Norby", fantasyTeam: "Free Agent", mlbTeam: "MIA", positions: ["3B"], birthDate: "2000-06-08", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 615, name: "Cristian Javier", fantasyTeam: "Free Agent", mlbTeam: "HOU", positions: ["SP"], birthDate: "1997-03-26", age: 29, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 616, name: "David Festa", fantasyTeam: "Free Agent", mlbTeam: "MIN", positions: ["SP"], birthDate: "2000-03-08", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 617, name: "David Peterson", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["SP"], birthDate: "1995-09-03", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 618, name: "Dennis Santana", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["RP"], birthDate: "1996-04-12", age: 30, currentRank: 650, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 619, name: "Deyvison De Los Santos", fantasyTeam: "Free Agent", mlbTeam: "MIA", positions: ["3B"], birthDate: "2003-06-21", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 620, name: "Edgar Quero", fantasyTeam: "Free Agent", mlbTeam: "CWS", positions: ["C"], birthDate: "2003-04-06", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 621, name: "Emilio Pagan", fantasyTeam: "Free Agent", mlbTeam: "CIN", positions: ["RP"], birthDate: "1991-05-07", age: 35, currentRank: 650, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 622, name: "Felix Bautista", fantasyTeam: "Free Agent", mlbTeam: "BAL", positions: ["RP"], birthDate: "1995-06-20", age: 31, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 623, name: "Felnin Celesten", fantasyTeam: "Free Agent", mlbTeam: "SEA", positions: ["SS"], birthDate: "2005-09-15", age: 20, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 624, name: "George Lombard", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["SS"], birthDate: "2005-06-02", age: 21, currentRank: 650, futureTier: "strongKeeper", categoryFitTier: "goodHitter", riskTier: "medium", needsReview: true },
  { id: 625, name: "Harry Ford", fantasyTeam: "Free Agent", mlbTeam: "WSH", positions: ["C"], birthDate: "2003-02-21", age: 23, currentRank: 650, futureTier: "useful", categoryFitTier: "averageHitter", riskTier: "high", needsReview: true },
  { id: 626, name: "Hayden Birdsong", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["SP"], birthDate: "2001-08-30", age: 24, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 627, name: "Hunter Barco", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["SP"], birthDate: "2000-12-15", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 628, name: "Hyeseong Kim", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["2B"], birthDate: "1999-01-27", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 629, name: "J.P. Crawford", fantasyTeam: "Free Agent", mlbTeam: "SEA", positions: ["SS"], birthDate: "1995-01-11", age: 31, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 630, name: "Jackson Ferris", fantasyTeam: "Free Agent", mlbTeam: "LAD", positions: ["SP"], birthDate: "2004-01-15", age: 22, currentRank: 650, futureTier: "prospectLow", categoryFitTier: "volatileStarter", riskTier: "prospectPitcher", needsReview: true },
  { id: 631, name: "Jacob Lopez", fantasyTeam: "Free Agent", mlbTeam: "ATH", positions: ["SP"], birthDate: "1998-03-11", age: 28, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 632, name: "Jacob Melton", fantasyTeam: "Free Agent", mlbTeam: "HOU", positions: ["OF"], birthDate: "2000-09-07", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 633, name: "Jacob Reimer", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["3B"], birthDate: "2004-02-22", age: 22, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 634, name: "Jaison Chourio", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["OF"], birthDate: "2005-05-19", age: 21, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 635, name: "Jeferson Quero", fantasyTeam: "Free Agent", mlbTeam: "MIL", positions: ["C"], birthDate: "2002-10-08", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 636, name: "Jeremiah Estrada", fantasyTeam: "Free Agent", mlbTeam: "SD", positions: ["RP"], birthDate: "1998-11-01", age: 27, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 637, name: "Joey Cantillo", fantasyTeam: "Free Agent", mlbTeam: "CLE", positions: ["SP"], birthDate: "1999-12-18", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 638, name: "Jose Berrios", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["SP"], birthDate: "1994-05-27", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 639, name: "Jurickson Profar", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["OF"], birthDate: "1993-02-20", age: 33, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 640, name: "Justin Martinez", fantasyTeam: "Free Agent", mlbTeam: "AZ", positions: ["RP"], birthDate: "2001-07-30", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 641, name: "Kenley Jansen", fantasyTeam: "Free Agent", mlbTeam: "LAA", positions: ["RP"], birthDate: "1987-09-30", age: 38, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 642, name: "Kevin Alcantara", fantasyTeam: "Free Agent", mlbTeam: "CHC", positions: ["OF"], birthDate: "2002-07-12", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 643, name: "Kyle Finnegan", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["RP"], birthDate: "1991-09-04", age: 34, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 644, name: "Lenyn Sosa", fantasyTeam: "Free Agent", mlbTeam: "CWS", positions: ["2B"], birthDate: "2000-01-25", age: 26, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 645, name: "Leodalis De Vries", fantasyTeam: "Free Agent", mlbTeam: "OAK", positions: ["SS"], birthDate: "2006-10-11", age: 19, currentRank: 650, futureTier: "prospectHigh", categoryFitTier: "strongHitter", riskTier: "prospectHitter", needsReview: true },
  { id: 646, name: "Lourdes Gurriel Jr.", fantasyTeam: "Free Agent", mlbTeam: "AZ", positions: ["OF"], birthDate: "1993-10-10", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 647, name: "Luis Garcia", fantasyTeam: "Free Agent", mlbTeam: "WSH", positions: ["2B"], birthDate: "2000-05-16", age: 26, currentRank: 650, futureTier: "solidKeeper", categoryFitTier: "averageHitter", riskTier: "medium", needsReview: true },
  { id: 648, name: "Luis Gil", fantasyTeam: "Free Agent", mlbTeam: "NYY", positions: ["SP"], birthDate: "1998-06-03", age: 28, currentRank: 650, futureTier: "useful", categoryFitTier: "volatileStarter", riskTier: "medium", needsReview: true },
  { id: 649, name: "Luisangel Acuna", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["2B"], birthDate: "2002-03-12", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 650, name: "Matthew Liberatore", fantasyTeam: "Free Agent", mlbTeam: "STL", positions: ["SP"], birthDate: "1999-11-06", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 651, name: "Max Muncy", fantasyTeam: "Free Agent", mlbTeam: "ATH", positions: ["3B"], birthDate: "2002-08-25", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 652, name: "Merrill Kelly", fantasyTeam: "Free Agent", mlbTeam: "TEX", positions: ["SP"], birthDate: "1988-10-14", age: 37, currentRank: 650, futureTier: "shortTerm", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: true },
  { id: 653, name: "Mike Yastrzemski", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["OF"], birthDate: "1990-08-23", age: 35, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "aging", needsReview: true },
  { id: 654, name: "Randy Rodriguez", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["RP"], birthDate: "1999-09-05", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 655, name: "Reese Olson", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["SP"], birthDate: "1999-07-31", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 656, name: "Reynaldo Lopez", fantasyTeam: "Free Agent", mlbTeam: "ATL", positions: ["SP"], birthDate: "1994-01-04", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 657, name: "Ricky Tiedemann", fantasyTeam: "Free Agent", mlbTeam: "TOR", positions: ["SP"], birthDate: "2002-08-18", age: 23, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 658, name: "Ronny Henriquez", fantasyTeam: "Free Agent", mlbTeam: "MIA", positions: ["RP"], birthDate: "2000-06-20", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "usefulReliever", riskTier: "reliever", needsReview: true },
  { id: 659, name: "Ryan Walker", fantasyTeam: "Free Agent", mlbTeam: "SF", positions: ["RP"], birthDate: "1995-11-26", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 660, name: "Sean Burke", fantasyTeam: "Free Agent", mlbTeam: "CWS", positions: ["SP"], birthDate: "1999-12-18", age: 26, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 661, name: "Shane Smith", fantasyTeam: "Free Agent", mlbTeam: "CWS", positions: ["SP"], birthDate: "2000-04-04", age: 26, currentRank: 650, futureTier: "useful", categoryFitTier: "goodStarter", riskTier: "medium", needsReview: true },
  { id: 662, name: "Simeon Woods Richardson", fantasyTeam: "Free Agent", mlbTeam: "MIN", positions: ["SP"], birthDate: "2000-09-27", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 663, name: "Slade Caldwell", fantasyTeam: "Free Agent", mlbTeam: "AZ", positions: ["OF"], birthDate: "2006-06-18", age: 20, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 664, name: "Termarr Johnson", fantasyTeam: "Free Agent", mlbTeam: "PIT", positions: ["SS"], birthDate: "2004-06-11", age: 22, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 665, name: "Tylor Megill", fantasyTeam: "Free Agent", mlbTeam: "NYM", positions: ["SP"], birthDate: "1995-07-28", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 666, name: "Victor Scott", fantasyTeam: "Free Agent", mlbTeam: "STL", positions: ["OF"], birthDate: "2001-02-12", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 667, name: "Victor Scott II", fantasyTeam: "Free Agent", mlbTeam: "STL", positions: ["OF"], birthDate: "2001-02-12", age: 25, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 668, name: "Will Vest", fantasyTeam: "Free Agent", mlbTeam: "DET", positions: ["RP"], birthDate: "1995-06-06", age: 31, currentRank: 650, futureTier: "depth", categoryFitTier: "riskyReliever", riskTier: "reliever", needsReview: true },
  { id: 669, name: "Yusei Kikuchi", fantasyTeam: "Free Agent", mlbTeam: "LAA", positions: ["SP"], birthDate: "1991-06-17", age: 35, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "aging", needsReview: true },
  { id: 670, name: "Zac Veen", fantasyTeam: "Free Agent", mlbTeam: "COL", positions: ["OF"], birthDate: "2001-12-12", age: 24, currentRank: 650, futureTier: "depth", categoryFitTier: "flawedHitter", riskTier: "high", needsReview: true },
  { id: 671, name: "Zach Eflin", fantasyTeam: "Free Agent", mlbTeam: "FA", positions: ["SP"], birthDate: "1994-04-08", age: 32, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true },
  { id: 672, name: "Zack Littell", fantasyTeam: "Free Agent", mlbTeam: "FA", positions: ["SP"], birthDate: "1995-10-05", age: 30, currentRank: 650, futureTier: "depth", categoryFitTier: "volatileStarter", riskTier: "high", needsReview: true }
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