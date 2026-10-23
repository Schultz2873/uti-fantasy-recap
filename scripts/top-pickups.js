/*
  Trending Available / Top Pickups (homepage #top-pickups).

  Two data sources:
    1. Market trends: data/trending-players.js, written daily by scripts/update-trending-players.js.
       Players already on a UTI roster are filtered out, then each card is enriched with MLB stats
       for the selected 7D / 14D / SEA range.
    2. Fallback when there is no market file: rank available players by MLB stat impact
       across the UTI categories.

  Requires scripts/category-leaders.js to be loaded first for the shared helpers
  (fetchHittingAndPitchingStats, getFantasyOwner, normalizePlayerName, escapeHtml, ...).
*/

// Top Pickups should not use "bad category" traps like hitter SO or pitcher L.
// It also requires playing-time minimums for every pickup category so bench bats with 0 K
// or tiny-sample pitchers do not show up as fake good pickups.
const topPickupCategories = [
  { label: "R", group: "hitting", stat: "runs", type: "max", pickupMinStat: "atBats", pickupMinValue: 10, pickupLast30MinValue: 40, pickupSeasonMinValue: 80 },
  { label: "HR", group: "hitting", stat: "homeRuns", type: "max", pickupMinStat: "atBats", pickupMinValue: 10, pickupLast30MinValue: 40, pickupSeasonMinValue: 80 },
  { label: "RBI", group: "hitting", stat: "rbi", type: "max", pickupMinStat: "atBats", pickupMinValue: 10, pickupLast30MinValue: 40, pickupSeasonMinValue: 80 },
  { label: "NSB", group: "hitting", custom: "nsb", type: "max", pickupMinStat: "atBats", pickupMinValue: 10, pickupLast30MinValue: 40, pickupSeasonMinValue: 80 },
  { label: "AVG", group: "hitting", stat: "avg", type: "max", decimals: 3, pickupMinStat: "atBats", pickupMinValue: 15, pickupLast30MinValue: 50, pickupSeasonMinValue: 100 },
  { label: "TB", group: "hitting", stat: "totalBases", type: "max", pickupMinStat: "atBats", pickupMinValue: 10, pickupLast30MinValue: 40, pickupSeasonMinValue: 80 },
  { label: "BB", group: "hitting", stat: "baseOnBalls", type: "max", pickupMinStat: "atBats", pickupMinValue: 10, pickupLast30MinValue: 40, pickupSeasonMinValue: 80 },

  { label: "SV+H-BS", group: "pitching", custom: "svhbs", type: "max", pickupMinStat: "inningsPitched", pickupMinValue: 1, pickupLast30MinValue: 4, pickupSeasonMinValue: 12 },
  { label: "W", group: "pitching", stat: "wins", type: "max", pickupMinStat: "inningsPitched", pickupMinValue: 5, pickupLast30MinValue: 15, pickupSeasonMinValue: 40 },
  { label: "QS", group: "pitching", stat: "qualityStarts", type: "max", pickupMinStat: "inningsPitched", pickupMinValue: 5, pickupLast30MinValue: 15, pickupSeasonMinValue: 40 },
  { label: "K", group: "pitching", stat: "strikeOuts", type: "max", pickupMinStat: "inningsPitched", pickupMinValue: 3, pickupLast30MinValue: 12, pickupSeasonMinValue: 30 },
  { label: "ERA", group: "pitching", stat: "era", type: "min", decimals: 2, pickupMinStat: "inningsPitched", pickupMinValue: 5, pickupLast30MinValue: 15, pickupSeasonMinValue: 40 },
  { label: "WHIP", group: "pitching", stat: "whip", type: "min", decimals: 3, pickupMinStat: "inningsPitched", pickupMinValue: 5, pickupLast30MinValue: 15, pickupSeasonMinValue: 40 },
  { label: "BAA", group: "pitching", stat: "avg", type: "min", decimals: 3, pickupMinStat: "inningsPitched", pickupMinValue: 5, pickupLast30MinValue: 15, pickupSeasonMinValue: 40 }
];

// How much a top-12 rank in each category is worth when scoring fallback pickups.
const PICKUP_CATEGORY_WEIGHTS = {
  HR: 1.25,
  RBI: 1.15,
  R: 1.05,
  TB: 1.05,
  AVG: 1.0,
  BB: 0.95,
  NSB: 0.95,

  // Pitching pickup priority:
  // category winners should be pitchers who can actually move W, QS, SV+H, and K.
  "SV+H-BS": 2.0,
  W: 1.8,
  QS: 1.55,
  K: 1.05,

  // Ratios are useful, but they should not let random middle relievers dominate.
  ERA: 0.35,
  WHIP: 0.35,
  BAA: 0.30
};

const PITCHER_POSITIONS = ["P", "SP", "RP"];

let pickupRangeMode = "weekly";  // fallback stats window: "last7" | "last30" | "season" | anything else = last 14
let trendStatRangeMode = "last7"; // market card stats window: "last7" | "last14" | "season"
let playerEligibilityLookupCache = null;
let playerInfoLookupCache = null;
let marketTrendStatsLookupCache = {};

/* ---------- Range labels ---------- */

function getPickupRangeLabel(mode) {
  if (mode === "last7") return "Last 7 days";
  if (mode === "last30") return "Last 30 days";
  if (mode === "season") return "Season";
  return "Last 14 days";
}

function getPickupDateRange(mode) {
  if (mode === "season") return null;
  if (mode === "last7") return getTrailingDateRange(7);
  if (mode === "last30") return getTrailingDateRange(30);
  return getTrailingDateRange(14);
}

function getTrendStatsRangeLabel(mode = trendStatRangeMode) {
  if (mode === "last14") return "Last 14";
  if (mode === "season") return "Season";
  return "Last 7";
}

function getTrendStatsLoadingLabel(mode = trendStatRangeMode) {
  if (mode === "last7") return "Loading last 7 day stats...";
  if (mode === "last14") return "Loading last 14 day stats...";
  if (mode === "season") return "Loading season stats...";
  return "Loading stats...";
}

/* ---------- MLB player info (age, rookie) ---------- */

async function fetchPlayerInfoLookup(playerIds) {
  const uniqueIds = [...new Set((playerIds || []).filter(Boolean).map(String))];

  if (!uniqueIds.length) {
    return {};
  }

  const cache = playerInfoLookupCache || {};
  const missingIds = uniqueIds.filter(id => !cache[id]);
  const chunkSize = 75;

  for (let i = 0; i < missingIds.length; i += chunkSize) {
    const chunk = missingIds.slice(i, i + chunkSize);

    try {
      const response = await fetch(`${MLB_STATS_API}/people?personIds=${chunk.join(",")}`);

      if (!response.ok) {
        throw new Error("Could not load player info");
      }

      const data = await response.json();

      (data.people || []).forEach(person => {
        if (!person.id) return;

        cache[String(person.id)] = {
          age: person.currentAge ?? "",
          rookie: Boolean(person.rookie)
        };
      });
    } catch (error) {
      console.warn("Player age/rookie info could not load.", error);
    }
  }

  playerInfoLookupCache = cache;

  return Object.fromEntries(uniqueIds.map(id => [id, cache[id] || {}]));
}

/* ---------- Position eligibility ---------- */

function normalizeEligibilityPosition(position) {
  const value = String(position || "").trim().toUpperCase();

  const aliases = {
    LF: "OF",
    CF: "OF",
    RF: "OF",
    OUTFIELD: "OF",
    OUTFIELDER: "OF",
    "FIRST BASE": "1B",
    "SECOND BASE": "2B",
    "THIRD BASE": "3B",
    SHORTSTOP: "SS",
    CATCHER: "C",
    PITCHER: "P"
  };

  return aliases[value] || value;
}

function sortEligibilityPositions(positions) {
  const order = ["C", "1B", "2B", "3B", "SS", "OF", "UTIL", "SP", "RP", "P"];
  const uniquePositions = [...new Set(positions.filter(Boolean))];

  return uniquePositions.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });
}

function getPitchingAppearances(stat = {}) {
  return {
    gamesStarted: Number(stat.gamesStarted ?? stat.gamesStartedPitching ?? stat.starts ?? 0),
    gamesPitched: Number(stat.gamesPitched ?? stat.gamesPlayed ?? stat.games ?? 0)
  };
}

// SP with 3+ starts, RP with 3+ relief appearances (or both).
function getPitcherRolesFromStats(split) {
  const { gamesStarted, gamesPitched } = getPitchingAppearances(split?.stat);
  const reliefAppearances = Math.max(gamesPitched - gamesStarted, 0);
  const roles = [];

  if (gamesStarted >= 3) roles.push("SP");
  if (reliefAppearances >= 3) roles.push("RP");

  return roles;
}

function getPrimaryPosition(split) {
  return normalizeEligibilityPosition(
    split?.player?.primaryPosition?.abbreviation ||
    split?.player?.primaryPosition?.name ||
    split?.position?.abbreviation ||
    split?.position?.name ||
    ""
  );
}

// Blocks position players who pitched in a blowout from showing up as pitching pickups.
function isActualPitcherForPickup(split) {
  const stat = split?.stat || {};
  const { gamesStarted, gamesPitched } = getPitchingAppearances(stat);

  return (
    PITCHER_POSITIONS.includes(getPrimaryPosition(split)) ||
    gamesStarted > 0 ||
    gamesPitched > 0 ||
    Number(stat.inningsPitched || 0) > 0 ||
    Number(stat.strikeOuts || 0) > 0 ||
    Number(stat.wins || 0) > 0 ||
    Number(stat.qualityStarts || 0) > 0 ||
    Number(stat.saves || 0) > 0 ||
    Number(stat.holds || 0) > 0
  );
}

function normalizePitcherDisplayPositions(split, positions) {
  const normalizedPositions = sortEligibilityPositions((positions || []).map(normalizeEligibilityPosition));
  const hasPitcherPosition = normalizedPositions.some(position => PITCHER_POSITIONS.includes(position));

  if (!hasPitcherPosition && !isActualPitcherForPickup(split)) {
    return [];
  }

  const statRoles = getPitcherRolesFromStats(split);
  if (statRoles.length) {
    return sortEligibilityPositions(statRoles);
  }

  const explicitRoles = normalizedPositions.filter(position => ["SP", "RP"].includes(position));
  if (explicitRoles.length) {
    return explicitRoles;
  }

  const { gamesStarted, gamesPitched } = getPitchingAppearances(split?.stat);

  if (gamesStarted > 0) return ["SP"];
  if (gamesPitched > 0 || isActualPitcherForPickup(split)) return ["RP"];
  return [];
}

async function fetchSeasonFieldingStats() {
  return fetchMlbStatSplits({
    stats: "season",
    group: "fielding",
    playerPool: "all",
    sportIds: 1,
    gameType: "R",
    season: getCurrentSeason(),
    limit: 10000
  }, "Could not load fielding eligibility stats");
}

// Positions each player has played 3+ games at, keyed by MLB id, by name|team, and by name.
function buildPlayerEligibilityLookup(fieldingStats) {
  const byId = {};
  const byNameTeam = {};
  const byName = {};

  const add = (map, key, position) => {
    if (!map[key]) map[key] = new Set();
    map[key].add(position);
  };

  (fieldingStats || []).forEach(split => {
    const playerId = split.player?.id ? String(split.player.id) : "";
    const normalizedName = normalizePlayerName(split.player?.fullName || "");
    const normalizedTeam = normalizePlayerName(split.team?.name || "");
    const stat = split.stat || {};
    const games = Number(stat.gamesPlayed ?? stat.games ?? stat.g ?? stat.gamesAtPosition ?? 0);

    const position = normalizeEligibilityPosition(
      split.position?.abbreviation ||
      split.position?.name ||
      split.player?.primaryPosition?.abbreviation ||
      split.player?.primaryPosition?.name ||
      ""
    );

    const positionsToAdd = PITCHER_POSITIONS.includes(position)
      ? getPitcherRolesFromStats(split)
      : [position];

    if (!normalizedName || !positionsToAdd.length || games < 3) {
      return;
    }

    positionsToAdd.forEach(positionToAdd => {
      if (playerId) add(byId, playerId, positionToAdd);
      if (normalizedTeam) add(byNameTeam, `${normalizedName}|${normalizedTeam}`, positionToAdd);
      add(byName, normalizedName, positionToAdd);
    });
  });

  const toSortedLists = map => Object.fromEntries(
    Object.entries(map).map(([key, positions]) => [key, sortEligibilityPositions([...positions])])
  );

  return {
    byId: toSortedLists(byId),
    byNameTeam: toSortedLists(byNameTeam),
    byName: toSortedLists(byName)
  };
}

function getEligibilityForStatSplit(split, eligibilityLookup = {}) {
  const playerId = split?.player?.id ? String(split.player.id) : "";
  const normalizedName = normalizePlayerName(split?.player?.fullName || "");
  const normalizedTeam = normalizePlayerName(split?.team?.name || "");

  if (playerId && eligibilityLookup.byId?.[playerId]) {
    return eligibilityLookup.byId[playerId];
  }

  const nameTeamKey = `${normalizedName}|${normalizedTeam}`;
  if (normalizedName && normalizedTeam && eligibilityLookup.byNameTeam?.[nameTeamKey]) {
    return eligibilityLookup.byNameTeam[nameTeamKey];
  }

  return eligibilityLookup.byName?.[normalizedName] || [];
}

async function getPlayerEligibilityLookup() {
  if (playerEligibilityLookupCache) {
    return playerEligibilityLookupCache;
  }

  try {
    playerEligibilityLookupCache = buildPlayerEligibilityLookup(await fetchSeasonFieldingStats());
  } catch (error) {
    console.warn("Position eligibility could not load, falling back to primary position.", error);
    playerEligibilityLookupCache = { byId: {}, byNameTeam: {}, byName: {} };
  }

  return playerEligibilityLookupCache;
}

function filterDisplayedEligibilityPositions(stud, positions) {
  const safePositions = sortEligibilityPositions((positions || []).map(normalizeEligibilityPosition));

  if (stud.group === "hitting") {
    return safePositions.filter(position => !PITCHER_POSITIONS.includes(position));
  }

  if (stud.group === "pitching") {
    if (!isActualPitcherForPickup(stud.rawPlayer)) {
      return [];
    }

    return normalizePitcherDisplayPositions(stud.rawPlayer, safePositions);
  }

  return safePositions;
}

function getPickupPositionText(stud) {
  const eligiblePositions = filterDisplayedEligibilityPositions(stud, stud.eligiblePositions || []);

  if (eligiblePositions.length) {
    return eligiblePositions.join("/");
  }

  const player = stud.rawPlayer?.player || {};
  const rawPlayer = stud.rawPlayer || {};

  const value = [
    player.primaryPosition?.abbreviation,
    player.primaryPosition?.name,
    rawPlayer.position?.abbreviation,
    rawPlayer.position?.name,
    rawPlayer.primaryPosition?.abbreviation,
    rawPlayer.primaryPosition?.name,
    rawPlayer.stat?.position,
    stud.position,
    stud.positions
  ].find(item => {
    if (Array.isArray(item)) return item.length;
    return item !== undefined && item !== null && String(item).trim() !== "";
  });

  if (Array.isArray(value)) {
    return filterDisplayedEligibilityPositions(stud, value).join("/");
  }

  return filterDisplayedEligibilityPositions(stud, [normalizeEligibilityPosition(value)]).join("/");
}

/* ---------- Fallback pickups: rank available players by MLB stat impact ---------- */

function getPickupMinimum(category) {
  if (pickupRangeMode === "season" && typeof category.pickupSeasonMinValue === "number") {
    return category.pickupSeasonMinValue;
  }

  if (pickupRangeMode === "last30" && typeof category.pickupLast30MinValue === "number") {
    return category.pickupLast30MinValue;
  }

  return category.pickupMinValue;
}

// Rank 1 in a category is worth 12 points, rank 12 is worth 1, times the category weight.
function getPickupScore(rank, category) {
  const categoryWeight = PICKUP_CATEGORY_WEIGHTS[category.label] || 1;
  return Math.max(0, 13 - rank) * categoryWeight;
}

function getPickupSampleValue(player, category) {
  const stat = player.stat || {};

  if (category.group === "hitting") {
    return { label: "AB", value: Number(stat.atBats || 0) };
  }

  return { label: "IP", value: stat.inningsPitched || "0" };
}

function getPickupReasonFromStud(stud) {
  const category = stud.bestCategory?.category || "";

  if (stud.group === "pitching") {
    if (category === "SV+H-BS") return "SV+H Priority";
    if (category === "W") return "Wins Priority";
    if (category === "QS") return "Quality Starts";
    if (category === "K") return "Strikeouts";
    if (category === "ERA" || category === "WHIP" || category === "BAA") return "Ratio Support";
    return "Pitching Impact";
  }

  if (category === "HR" || category === "TB") return "Power";
  if (category === "NSB") return "Speed";
  if (category === "BB") return "Walks";
  if (category === "RBI" || category === "R") return "Run Production";
  if (category === "AVG") return "Average";
  return "Volume Bat";
}

// Available players who rank top 12 in any pickup category, merged per player and scored.
function buildPickupCandidates(hittingStats, pitchingStats, eligibilityLookup) {
  const candidateMap = new Map();

  topPickupCategories.forEach(category => {
    const source = (category.group === "hitting" ? hittingStats : pitchingStats) || [];
    const rankedPlayers = rankPlayersByCategory(source, category, player =>
      meetsMinimum(player, category.pickupMinStat, getPickupMinimum(category))
    );

    rankedPlayers.slice(0, 12).forEach((item, index) => {
      const name = item.player.player?.fullName || "N/A";

      if (getFantasyOwner(name)) return;

      // Allow real pitchers from pitching stats, but block position players who pitched.
      if (category.group === "pitching" && !isActualPitcherForPickup(item.player)) {
        return;
      }

      const rank = index + 1;
      const playerId = item.player.player?.id ? String(item.player.player.id) : "";
      const teamName = item.player.team?.name || "";
      const playerKey = playerId
        ? `${category.group}-${playerId}`
        : `${category.group}-${normalizePlayerName(name)}-${normalizePlayerName(teamName)}`;
      const score = getPickupScore(rank, category);
      const categoryResult = {
        category: category.label,
        value: formatLeaderValue(item.value, category),
        rank,
        score,
        sample: getPickupSampleValue(item.player, category)
      };

      const existing = candidateMap.get(playerKey);

      if (!existing) {
        candidateMap.set(playerKey, {
          name,
          team: teamName,
          group: category.group,
          rawPlayer: item.player,
          playerId,
          eligiblePositions: getEligibilityForStatSplit(item.player, eligibilityLookup),
          playerInfo: {},
          totalScore: score,
          bestRank: rank,
          bestCategory: categoryResult,
          categories: [categoryResult]
        });
        return;
      }

      existing.totalScore += score;
      existing.bestRank = Math.min(existing.bestRank, rank);
      existing.categories.push(categoryResult);

      if (
        rank < existing.bestCategory.rank ||
        (rank === existing.bestCategory.rank && score > existing.bestCategory.score)
      ) {
        existing.bestCategory = categoryResult;
      }
    });
  });

  return [...candidateMap.values()]
    .map(candidate => ({
      ...candidate,
      categoryCount: candidate.categories.length
    }))
    .sort((a, b) =>
      b.totalScore - a.totalScore ||
      b.categoryCount - a.categoryCount ||
      a.bestRank - b.bestRank ||
      a.name.localeCompare(b.name)
    );
}

/* ---------- Market trends (data/trending-players.js) ---------- */

function getFirstDefinedValue(source, keys, fallback = "") {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return source[key];
    }
  }

  return fallback;
}

// Like getFirstDefinedValue, but keys may be dotted paths such as "playerInfo.age".
function getFirstNestedTrendValue(source, keys, fallback = "") {
  for (const key of keys) {
    const value = String(key)
      .split(".")
      .reduce((current, part) => current && current[part] !== undefined ? current[part] : undefined, source);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function parsePercentValue(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;

  const parsedValue = typeof value === "string"
    ? Number(value.replace("%", "").replace("+", "").trim())
    : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function formatPercentValue(value) {
  return `${parsePercentValue(value).toFixed(1).replace(/\.0$/, "")}%`;
}

function formatPercentChange(value) {
  return `${parsePercentValue(value) > 0 ? "+" : ""}${formatPercentValue(value)}`;
}

function getMarketTrendSourcePlayers() {
  const possibleSources = [
    // Broad market list from Yahoo/ESPN/Fantrax/etc.
    // This can include owned players; getAvailableMarketTrendPlayers() filters them out with fantasy-owners.js.
    window.TRENDING_PLAYERS,
    window.FANTASY_TRENDING_PLAYERS,
    window.TRENDING_AVAILABLE_PLAYERS,
    window.TOP_PICKUP_TRENDS,
    window.AVAILABLE_PLAYER_TRENDS
  ];

  return possibleSources.find(source => Array.isArray(source)) || [];
}

function normalizeTrendPositions(player) {
  const rawPositions = getFirstDefinedValue(player, ["positions", "eligiblePositions", "position", "pos"], []);
  const positions = Array.isArray(rawPositions)
    ? rawPositions
    : String(rawPositions || "").split(/[\/|,]/g);

  return sortEligibilityPositions(positions.map(normalizeEligibilityPosition).filter(Boolean));
}

function getTrendPlayerGroup(player, positions) {
  const rawGroup = String(getFirstDefinedValue(player, ["group", "type", "playerType"], "")).toLowerCase();

  if (rawGroup.includes("pitch")) return "pitching";
  if (rawGroup.includes("hit") || rawGroup.includes("bat")) return "hitting";

  return positions.some(position => PITCHER_POSITIONS.includes(position)) ? "pitching" : "hitting";
}

function getTrendPlayerTags(player, group, addedPercent, droppedPercent) {
  const explicitTags = getFirstDefinedValue(player, ["tags", "labels"], []);

  if (Array.isArray(explicitTags) && explicitTags.length) {
    return explicitTags.slice(0, 3);
  }

  const tags = [];

  if (addedPercent >= 20) tags.push("Nuclear Add Spike");
  else if (addedPercent >= 10) tags.push("Hot Add");
  else if (addedPercent >= 5) tags.push("Rising");

  if (droppedPercent >= 8) tags.push("Volatile");

  tags.push(group === "pitching" ? "Arm Watch" : "Bat Watch");

  return tags.slice(0, 3);
}

function getTrendPlayerReason(player, group, addedPercent, droppedPercent) {
  const explicitReason = getFirstDefinedValue(player, ["reason", "fantasyNote", "note", "summary", "why"], "");
  if (explicitReason) return explicitReason;

  const tags = getTrendPlayerTags(player, group, addedPercent, droppedPercent);
  if (tags.length) return tags[0];

  return group === "pitching" ? "Market is chasing this arm" : "Market is chasing this bat";
}

// Accepts the many field names different trend sources use and returns one consistent shape.
function normalizeMarketTrendPlayer(player) {
  const name = getFirstDefinedValue(player, ["name", "playerName", "fullName", "player"], "");
  const team = getFirstDefinedValue(player, ["team", "mlbTeam", "teamName", "club"], "");
  const positions = normalizeTrendPositions(player);
  const group = getTrendPlayerGroup(player, positions);
  const addedPercent = parsePercentValue(getFirstDefinedValue(player, ["addedPercent", "addPercent", "addsPercent", "addsPct", "percentAdded", "added", "add"], 0));
  const droppedPercent = parsePercentValue(getFirstDefinedValue(player, ["droppedPercent", "dropPercent", "dropsPercent", "dropsPct", "percentDropped", "dropped", "drop"], 0));
  const rosteredPercent = parsePercentValue(getFirstDefinedValue(player, ["rosteredPercent", "rosterPercent", "percentRostered", "ownedPercent", "percentOwned", "owned", "rostered"], 0));
  const manualScore = parsePercentValue(getFirstDefinedValue(player, ["trendScore", "score"], 0));
  const trendScore = manualScore || Math.round((addedPercent * 3) + (rosteredPercent * 0.75) - (droppedPercent * 2));

  return {
    ...player,
    name,
    team,
    positions,
    group,
    addedPercent,
    droppedPercent,
    rosteredPercent,
    trendScore,
    source: getFirstDefinedValue(player, ["source", "platform"], "Market trend"),
    timeWindow: getFirstDefinedValue(player, ["timeWindow", "range", "period"], "Current"),
    tags: getTrendPlayerTags(player, group, addedPercent, droppedPercent),
    reason: getTrendPlayerReason(player, group, addedPercent, droppedPercent)
  };
}

function getAvailableMarketTrendPlayers() {
  return getMarketTrendSourcePlayers()
    .map(normalizeMarketTrendPlayer)
    .filter(player => player.name && !getFantasyOwner(player.name))
    .sort((a, b) =>
      b.addedPercent - a.addedPercent ||
      b.trendScore - a.trendScore ||
      b.rosteredPercent - a.rosteredPercent ||
      a.name.localeCompare(b.name)
    );
}

function getMarketStatsFromSplit(split, group) {
  const stat = split?.stat || {};

  if (group === "pitching") {
    return {
      IP: stat.inningsPitched || "0",
      K: Number(stat.strikeOuts || 0),
      ERA: stat.era ?? "-",
      WHIP: stat.whip ?? "-",
      W: Number(stat.wins || 0),
      QS: Number(stat.qualityStarts || 0),
      BAA: stat.avg ?? "-",
      SVH: Number(stat.saves || 0) + Number(stat.holds || 0)
    };
  }

  return {
    AB: Number(stat.atBats || 0),
    HR: Number(stat.homeRuns || 0),
    RBI: Number(stat.rbi || 0),
    AVG: stat.avg ?? "-",
    R: Number(stat.runs || 0),
    TB: Number(stat.totalBases || 0),
    BB: Number(stat.baseOnBalls || 0),
    NSB: Number(stat.stolenBases || 0) - Number(stat.caughtStealing || 0)
  };
}

// normalized name -> { hitting: {...}, pitching: {...} } for the given stat window.
function buildMarketTrendStatsLookup(hittingStats = [], pitchingStats = [], statsWindow = getTrendStatsRangeLabel()) {
  const lookup = {};

  const addSplit = (split, group) => {
    const key = normalizePlayerName(split?.player?.fullName || "");
    if (!key) return;

    if (!lookup[key]) lookup[key] = {};

    lookup[key][group] = {
      playerId: split?.player?.id ? String(split.player.id) : "",
      team: split?.team?.abbreviation || split?.team?.name || "",
      stats: getMarketStatsFromSplit(split, group),
      statsWindow
    };
  };

  hittingStats.forEach(split => addSplit(split, "hitting"));
  pitchingStats.forEach(split => addSplit(split, "pitching"));

  return lookup;
}

async function getMarketTrendStatsLookup(mode = trendStatRangeMode) {
  if (marketTrendStatsLookupCache[mode]) {
    return marketTrendStatsLookupCache[mode];
  }

  try {
    const range = mode === "season" ? null : getTrailingDateRange(mode === "last14" ? 14 : 7);
    const [hittingStats, pitchingStats] = await fetchHittingAndPitchingStats(range);
    marketTrendStatsLookupCache[mode] = buildMarketTrendStatsLookup(hittingStats, pitchingStats, getTrendStatsRangeLabel(mode));
  } catch (error) {
    console.warn("Trending card stat enrichment failed. Showing market data without stats.", error);
    marketTrendStatsLookupCache[mode] = {};
  }

  return marketTrendStatsLookupCache[mode];
}

// Adds MLB stats for the active range, plus age/rookie info, to each market player.
async function enrichMarketTrendPlayersForDisplay(players) {
  const lookup = await getMarketTrendStatsLookup(trendStatRangeMode);
  const playerIds = [];

  const enriched = players.map(player => {
    const key = normalizePlayerName(player.name);
    const preferredGroup = player.group === "pitching" ? "pitching" : "hitting";
    const fallbackGroup = preferredGroup === "pitching" ? "hitting" : "pitching";
    const match = lookup[key]?.[preferredGroup] || lookup[key]?.[fallbackGroup];

    if (!match) {
      return {
        ...player,
        statsWindow: getTrendStatsRangeLabel(trendStatRangeMode)
      };
    }

    if (match.playerId) playerIds.push(match.playerId);

    return {
      ...player,
      team: player.team || match.team,
      group: match.stats?.IP !== undefined ? "pitching" : player.group,
      mlbPlayerId: match.playerId || player.mlbPlayerId,
      stats: match.stats,
      statsWindow: match.statsWindow
    };
  });

  if (!playerIds.length) {
    return enriched;
  }

  const peopleLookup = await fetchPlayerInfoLookup(playerIds);

  return enriched.map(player => {
    const info = peopleLookup[player.mlbPlayerId] || {};

    return {
      ...player,
      age: player.age || info.age || "",
      rookie: player.rookie || Boolean(info.rookie)
    };
  });
}

function getTrendAge(player) {
  const age = getFirstNestedTrendValue(player, ["age", "currentAge", "playerInfo.age", "info.age"], "");
  return age === undefined || age === null ? "" : String(age).trim();
}

function isTrendRookie(player) {
  const value = getFirstNestedTrendValue(player, ["rookie", "isRookie", "playerInfo.rookie", "info.rookie"], false);
  return value === true || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "yes";
}

function getTrendStats(player) {
  const stats = getFirstNestedTrendValue(player, ["stats", "seasonStats", "stat"], {}) || {};

  if (stats && typeof stats === "object" && Object.keys(stats).length) {
    return stats;
  }

  // Fallback for generated or manually pasted files that put stats at the top level.
  return player && typeof player === "object" ? player : {};
}

function getTrendStatValue(player, keys) {
  return getFirstNestedTrendValue(getTrendStats(player), keys, "-");
}

function getTrendPrimaryStats(player) {
  if (player.group === "pitching") {
    return [
      ["IP", getTrendStatValue(player, ["IP", "ip", "inningsPitched"])],
      ["K", getTrendStatValue(player, ["K", "k", "strikeouts", "strikeOuts"])],
      ["ERA", getTrendStatValue(player, ["ERA", "era"])],
      ["WHIP", getTrendStatValue(player, ["WHIP", "whip"])]
    ];
  }

  return [
    ["AB", getTrendStatValue(player, ["AB", "ab", "atBats"])],
    ["HR", getTrendStatValue(player, ["HR", "hr", "homeRuns"])],
    ["RBI", getTrendStatValue(player, ["RBI", "rbi"])],
    ["AVG", getTrendStatValue(player, ["AVG", "avg"])]
  ];
}

/* ---------- Rendering ---------- */

function formatPickupStat(value, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) return escapeHtml(value);

  if (Math.abs(numericValue) < 1 && numericValue !== 0) {
    return numericValue.toFixed(3).replace(/^0/, "");
  }

  if (!Number.isInteger(numericValue)) {
    return numericValue.toFixed(2).replace(/\.00$/, "");
  }

  return String(numericValue);
}

// Stat line for a fallback pickup card, read from its raw MLB split.
function getPlayerStatValue(stud, statName) {
  const stat = stud.rawPlayer?.stat || {};

  const readers = {
    IP: () => stat.inningsPitched || "0",
    AB: () => Number(stat.atBats || 0),
    HR: () => Number(stat.homeRuns || 0),
    RBI: () => Number(stat.rbi || 0),
    AVG: () => stat.avg ?? 0,
    K: () => Number(stat.strikeOuts || 0),
    ERA: () => stat.era ?? 0,
    WHIP: () => stat.whip ?? 0
  };

  return readers[statName] ? readers[statName]() : "-";
}

function renderTrendV7Stat(label, value) {
  return `
    <div class="trend-v7-stat">
      <span class="trend-v7-stat-value">${formatPickupStat(value)}</span>
      <span class="trend-v7-stat-label">${escapeHtml(label)}</span>
    </div>
  `;
}

function renderTrendStatsGrid(stats) {
  return stats.map(([label, value]) => renderTrendV7Stat(label, value)).join("");
}

function renderTrendChips({ positionText, age, rookie }) {
  return [
    positionText ? `<span class="trend-v7-chip">${escapeHtml(positionText)}</span>` : "",
    age ? `<span class="trend-v7-chip">Age ${escapeHtml(age)}</span>` : "",
    rookie ? `<span class="trend-v7-chip gold">Rookie</span>` : ""
  ].filter(Boolean).join("");
}

// Card for a player from the market trends file.
function renderMarketTrendCard(player) {
  const isPitcher = player.group === "pitching";
  const positionText = player.positions?.length ? player.positions.join("/") : (isPitcher ? "P" : "UTIL");
  const hasAdds = Number(player.addedPercent || 0) > 0;
  const windowText = String(player.timeWindow || "").toLowerCase().includes("7") ? "7-day" : "Market";
  const marketValue = hasAdds ? formatPercentChange(player.addedPercent) : formatPercentValue(player.rosteredPercent);
  const marketLabel = hasAdds ? `${windowText} Added` : "Rostered";
  const statsWindow = getFirstNestedTrendValue(player, ["statsWindow", "statWindow", "stats.window", "seasonStats.window"], "Season stats");

  return `
    <article class="available-stud-card pickup-card pickup-trend-card trend-v7-card ${isPitcher ? "pitching-pickup-card" : "hitting-pickup-card"}">
      <div class="trend-v7-top">
        <div class="pickup-player-main">
          <div class="trend-v7-kicker">
            <span class="pickup-group-tag ${isPitcher ? "pickup-group-tag-pitching" : "pickup-group-tag-hitting"}">${isPitcher ? "Arm Watch" : "Bat Watch"}</span>
            ${renderTrendChips({ positionText, age: getTrendAge(player), rookie: isTrendRookie(player) })}
          </div>
          <div class="trend-v7-name">${escapeHtml(player.name)}</div>
          <div class="trend-v7-meta">${escapeHtml(player.team || "MLB")}</div>
        </div>

        <div class="trend-v7-add-box">
          <span class="trend-v7-add-number">${escapeHtml(marketValue)}</span>
          <span class="trend-v7-add-label">${escapeHtml(marketLabel)}</span>
        </div>
      </div>

      <div class="trend-v7-stats-head">
        <span>${escapeHtml(statsWindow)}</span>
      </div>

      <div class="trend-v7-stats">
        ${renderTrendStatsGrid(getTrendPrimaryStats(player))}
      </div>

      <div class="trend-v7-note-row">
        <p class="trend-v7-note">${escapeHtml(player.reason)}</p>
        <div class="trend-v7-kicker" style="margin-bottom:0; justify-content:flex-end;">
          <span class="trend-v7-chip">Rostered ${escapeHtml(formatPercentValue(player.rosteredPercent))}</span>
          ${Number(player.droppedPercent || 0) > 0 ? `<span class="trend-v7-chip">Dropped ${escapeHtml(formatPercentValue(player.droppedPercent))}</span>` : ""}
        </div>
      </div>
    </article>
  `;
}

// Card for a fallback pickup ranked from MLB stats.
function renderFallbackPickupCard(stud) {
  const isPitcher = stud.group === "pitching";
  const reason = getPickupReasonFromStud(stud);
  const statNames = isPitcher ? ["IP", "K", "ERA", "WHIP"] : ["AB", "HR", "RBI", "AVG"];
  const otherCategories = (stud.categories || [])
    .filter(item => item.category !== (stud.bestCategory?.category || ""))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 2)
    .map(item => `${escapeHtml(item.category)} #${escapeHtml(item.rank)}`)
    .join(" · ");

  const chips = renderTrendChips({
    positionText: getPickupPositionText(stud),
    age: stud.playerInfo?.age ? String(stud.playerInfo.age) : "",
    rookie: Boolean(stud.playerInfo?.rookie)
  });

  return `
    <article class="available-stud-card pickup-card pickup-trend-card trend-v7-card ${isPitcher ? "pitching-pickup-card" : "hitting-pickup-card"}">
      <div class="trend-v7-top">
        <div class="pickup-player-main">
          <div class="trend-v7-kicker">
            <span class="pickup-group-tag ${isPitcher ? "pickup-group-tag-pitching" : "pickup-group-tag-hitting"}">${isPitcher ? "Pitching Pickup" : "Hitting Pickup"}</span>
            ${chips}
          </div>
          <div class="trend-v7-name">${escapeHtml(stud.name)}</div>
          <div class="trend-v7-meta">${escapeHtml(stud.team || "Available player")}</div>
        </div>

        <div class="trend-v7-add-box">
          <span class="trend-v7-add-number">${escapeHtml(Math.round(stud.totalScore || 0))}</span>
          <span class="trend-v7-add-label">Wire</span>
        </div>
      </div>

      <div class="trend-v7-stats">
        ${renderTrendStatsGrid(statNames.map(name => [name, getPlayerStatValue(stud, name)]))}
      </div>

      <div class="trend-v7-note-row">
        <p class="trend-v7-note">${otherCategories || reason}</p>
        <div class="trend-v7-kicker" style="margin-bottom:0; justify-content:flex-end;">
          <span class="trend-v7-chip">${escapeHtml(reason)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderPickupGroup(title, subtitle, studs, emptyText) {
  return `
    <div class="pickup-group-block">
      <div class="pickup-group-header">
        <div>
          <h3 class="pickup-group-title">${escapeHtml(title)}</h3>
          <p class="pickup-group-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <span class="pickup-group-count">${studs.length} shown</span>
      </div>

      <div class="pickup-group-grid">
        ${studs.length
          ? studs.map(stud => stud.addedPercent !== undefined ? renderMarketTrendCard(stud) : renderFallbackPickupCard(stud)).join("")
          : renderMessageCard(escapeHtml(emptyText))
        }
      </div>
    </div>
  `;
}

function renderHittingAndPitchingGroups(players, limit, hitting, pitching) {
  return `
    ${renderPickupGroup(hitting.title, hitting.subtitle, players.filter(player => player.group === "hitting").slice(0, limit), hitting.emptyText)}

    ${renderPickupGroup(pitching.title, pitching.subtitle, players.filter(player => player.group === "pitching").slice(0, limit), pitching.emptyText)}
  `;
}

// Renders market trend cards. Returns false when there is no market data to show.
async function renderMarketTrendPlayers() {
  const grid = document.getElementById("availableStudsGrid");
  const tag = document.getElementById("availableStudsModeTag");
  const availableMarketPlayers = getAvailableMarketTrendPlayers();

  if (!grid || !availableMarketPlayers.length) return false;

  grid.innerHTML = renderMessageCard(escapeHtml(getTrendStatsLoadingLabel()));

  const enrichedMarketPlayers = await enrichMarketTrendPlayersForDisplay(availableMarketPlayers);

  if (tag) {
    tag.textContent = getTrendStatsRangeLabel(trendStatRangeMode);
  }

  grid.innerHTML = renderHittingAndPitchingGroups(enrichedMarketPlayers, 6, {
    title: "Trending Available Bats",
    subtitle: "Available UTI hitters getting added in other fantasy leagues.",
    emptyText: "No available trending hitters found in the market file."
  }, {
    title: "Trending Available Arms",
    subtitle: "Available UTI pitchers getting added in other fantasy leagues.",
    emptyText: "No available trending pitchers found in the market file."
  });

  return true;
}

async function renderFallbackPickups(hittingStats, pitchingStats, eligibilityLookup = {}) {
  const grid = document.getElementById("availableStudsGrid");
  const tag = document.getElementById("availableStudsModeTag");

  if (!grid) return;

  if (await renderMarketTrendPlayers()) {
    return;
  }

  if (tag) {
    tag.textContent = getPickupRangeLabel(pickupRangeMode).replace(" days", "");
  }

  const candidates = buildPickupCandidates(hittingStats, pitchingStats, eligibilityLookup);
  const playerInfoLookup = await fetchPlayerInfoLookup(candidates.map(candidate => candidate.playerId));

  candidates.forEach(candidate => {
    candidate.playerInfo = playerInfoLookup[candidate.playerId] || {};
  });

  if (!candidates.length) {
    grid.innerHTML = renderMessageCard("No top pickups found right now. The wire might actually be cooked.");
    return;
  }

  grid.innerHTML = renderHittingAndPitchingGroups(candidates, 4, {
    title: "Available Bats",
    subtitle: "Best available UTI hitters from current MLB stat impact.",
    emptyText: "No hitting pickups met the playing-time minimums."
  }, {
    title: "Available Arms",
    subtitle: "Best available UTI pitchers from current MLB stat impact.",
    emptyText: "No pitching pickups met the innings minimums."
  });
}

async function loadTopPickups() {
  const grid = document.getElementById("availableStudsGrid");
  const tag = document.getElementById("availableStudsModeTag");

  if (!grid) return;

  grid.innerHTML = renderMessageCard("Loading top pickups...");

  if (tag) {
    tag.textContent = getPickupRangeLabel(pickupRangeMode).replace(" days", "");
  }

  // If the GitHub Action generated market trend data, render it immediately.
  // The MLB Stats API fallback below is only needed when there is no usable
  // data/trending-players.js file.
  if (await renderMarketTrendPlayers()) {
    return;
  }

  try {
    const eligibilityLookup = await getPlayerEligibilityLookup();
    const [hittingStats, pitchingStats] = await fetchHittingAndPitchingStats(getPickupDateRange(pickupRangeMode));

    await renderFallbackPickups(hittingStats, pitchingStats, eligibilityLookup);
  } catch (error) {
    console.error("Top pickups failed:", error);

    if (await renderMarketTrendPlayers()) {
      return;
    }

    grid.innerHTML = renderMessageCard("Trending Available could not load right now.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupModeToggle("data-pickup-mode", "weekly", mode => {
    pickupRangeMode = mode;
    loadTopPickups();
  });

  setupModeToggle("data-trend-stat-range", "last7", mode => {
    trendStatRangeMode = mode;
    loadTopPickups();
  });

  loadTopPickups();
});
