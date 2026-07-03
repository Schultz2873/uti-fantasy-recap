const weeklyLeaderCategories = [
  { label: "R", group: "hitting", stat: "runs", type: "max" },
  { label: "HR", group: "hitting", stat: "homeRuns", type: "max" },
  { label: "RBI", group: "hitting", stat: "rbi", type: "max" },
  { label: "NSB", group: "hitting", custom: "nsb", type: "max" },
  { label: "AVG", group: "hitting", stat: "avg", type: "max", decimals: 3, minStat: "atBats", minValue: 15, last30MinValue: 50, seasonMinValue: 100 },
  { label: "TB", group: "hitting", stat: "totalBases", type: "max" },
  { label: "BB", group: "hitting", stat: "baseOnBalls", type: "max" },

  { label: "SV+H-BS", group: "pitching", custom: "svhbs", type: "max" },
  { label: "K", group: "pitching", stat: "strikeOuts", type: "max" },
  { label: "ERA", group: "pitching", stat: "era", type: "min", decimals: 2, minStat: "inningsPitched", minValue: 5, last30MinValue: 15, seasonMinValue: 40 },
  { label: "WHIP", group: "pitching", stat: "whip", type: "min", decimals: 3, minStat: "inningsPitched", minValue: 5, last30MinValue: 15, seasonMinValue: 40 },
  { label: "BAA", group: "pitching", stat: "avg", type: "min", decimals: 3, minStat: "inningsPitched", minValue: 5, last30MinValue: 15, seasonMinValue: 40 }
];

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

const leaderRotationState = new Map();
let weeklyLeadersCache = [];
let leaderRangeMode = "weekly";
let selectedPastWeek = null;
let pickupRangeMode = "weekly";
let fantasyOwnersLookupCache = null;
let playerEligibilityLookupCache = null;
let playerInfoLookupCache = null;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function getMonday(date) {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  monday.setDate(monday.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function getWeeklyDateRange() {
  const today = new Date();
  const startDate = getMonday(today);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate,
    endDate,
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
}

function getCurrentSeason() {
  return new Date().getFullYear();
}

function getLast30DateRange() {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 29);
  startDate.setHours(0, 0, 0, 0);

  return {
    startDate,
    endDate,
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
}

function getSeasonWeekRanges() {
  const season = getCurrentSeason();
  const currentWeek = getWeeklyDateRange();

  // UTI Week 1 is the long opening matchup: March 25 - April 5.
  // After that, every matchup week runs normal Monday - Sunday.
  const firstWeekStart = new Date(season, 2, 25);
  firstWeekStart.setHours(0, 0, 0, 0);

  const firstWeekEnd = new Date(season, 3, 5);
  firstWeekEnd.setHours(23, 59, 59, 999);

  const weeks = [];

  if (firstWeekStart < currentWeek.startDate) {
    weeks.push({
      label: `Week 1: ${displayDate(firstWeekStart)} - ${displayDate(firstWeekEnd)}`,
      startDate: new Date(firstWeekStart),
      endDate: new Date(firstWeekEnd),
      start: formatDate(firstWeekStart),
      end: formatDate(firstWeekEnd)
    });
  }

  let weekStart = new Date(season, 3, 6);
  weekStart.setHours(0, 0, 0, 0);
  let weekNumber = 2;

  while (weekStart < currentWeek.startDate) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    weeks.push({
      label: `Week ${weekNumber}: ${displayDate(weekStart)} - ${displayDate(weekEnd)}`,
      startDate: new Date(weekStart),
      endDate: new Date(weekEnd),
      start: formatDate(weekStart),
      end: formatDate(weekEnd)
    });

    weekStart.setDate(weekStart.getDate() + 7);
    weekNumber++;
  }

  return weeks.reverse();
}

function setupPastWeekSelect() {
  const select = document.getElementById("pastWeekSelect");
  if (!select) return;

  const pastWeeks = getSeasonWeekRanges();

  select.innerHTML = pastWeeks.map((week, index) => `
    <option value="${index}">
      ${week.label}
    </option>
  `).join("");

  if (!selectedPastWeek && pastWeeks.length) {
    selectedPastWeek = pastWeeks[0];
  }

  select.addEventListener("change", () => {
    selectedPastWeek = pastWeeks[Number(select.value)];
    resetLeaderLoadingCards();
    loadWeeklyLeaders();
  });
}

function inningsToNumber(value) {
  if (!value) return 0;

  const [whole, partial] = String(value).split(".");
  const outs = Number(whole || 0) * 3 + Number(partial || 0);

  return outs / 3;
}

function getStatValue(player, category) {
  const stat = player.stat || {};

  if (category.custom === "nsb") {
    return Number(stat.stolenBases || 0) - Number(stat.caughtStealing || 0);
  }

  if (category.custom === "svh") {
    return Number(stat.saves || 0) + Number(stat.holds || 0);
  }

  if (category.custom === "svhbs") {
    return Number(stat.saves || 0) + Number(stat.holds || 0) - Number(stat.blownSaves || 0);
  }

  if (category.stat === "inningsPitched") {
    return inningsToNumber(stat.inningsPitched);
  }

  return Number(stat[category.stat]);
}

function getMinimumValue(category) {
  if (leaderRangeMode === "season" && typeof category.seasonMinValue === "number") {
    return category.seasonMinValue;
  }

  return category.minValue;
}

function passesMinimum(player, category) {
  if (!category.minStat) return true;

  const stat = player.stat || {};
  let value = stat[category.minStat];

  if (category.minStat === "inningsPitched") {
    value = inningsToNumber(value);
  } else {
    value = Number(value || 0);
  }

  return value >= getMinimumValue(category);
}

function formatLeaderValue(value, category) {
  if (category.label === "AVG" || category.label === "BAA") {
    return Number(value).toFixed(3).replace(/^0/, "");
  }

  if (typeof category.decimals === "number") {
    return Number(value).toFixed(category.decimals);
  }

  return value;
}

async function fetchWeeklyStats(group, start, end) {
  const url =
    `https://statsapi.mlb.com/api/v1/stats` +
    `?stats=byDateRange` +
    `&group=${group}` +
    `&playerPool=all` +
    `&sportIds=1` +
    `&gameType=R` +
    `&startDate=${start}` +
    `&endDate=${end}` +
    `&limit=1000`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not load ${group} stats`);
  }

  const data = await response.json();
  return data.stats?.[0]?.splits || [];
}

async function fetchSeasonStats(group) {
  const season = getCurrentSeason();
  const url =
    `https://statsapi.mlb.com/api/v1/stats` +
    `?stats=season` +
    `&group=${group}` +
    `&playerPool=all` +
    `&sportIds=1` +
    `&gameType=R` +
    `&season=${season}` +
    `&limit=1000`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not load ${group} season stats`);
  }

  const data = await response.json();
  return data.stats?.[0]?.splits || [];
}



async function fetchPlayerInfoLookup(playerIds) {
  const uniqueIds = [...new Set((playerIds || []).filter(Boolean).map(String))];

  if (!uniqueIds.length) {
    return {};
  }

  const cache = playerInfoLookupCache || {};
  const missingIds = uniqueIds.filter(id => !cache[id]);

  if (missingIds.length) {
    const chunkSize = 75;

    for (let i = 0; i < missingIds.length; i += chunkSize) {
      const chunk = missingIds.slice(i, i + chunkSize);
      const url = `https://statsapi.mlb.com/api/v1/people?personIds=${chunk.join(",")}`;

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Could not load player info");
        }

        const data = await response.json();

        (data.people || []).forEach(person => {
          const id = person.id ? String(person.id) : "";

          if (!id) return;

          cache[id] = {
            age: person.currentAge ?? "",
            rookie: Boolean(person.rookie)
          };
        });
      } catch (error) {
        console.warn("Player age/rookie info could not load.", error);
      }
    }
  }

  playerInfoLookupCache = cache;

  const lookup = {};
  uniqueIds.forEach(id => {
    lookup[id] = cache[id] || {};
  });

  return lookup;
}

function renderPickupAgeTag(stud) {
  const info = stud.playerInfo || {};

  if (info.age === undefined || info.age === null || info.age === "") {
    return "";
  }

  return `<span class="pickup-age-tag">Age ${escapeHtml(info.age)}</span>`;
}

function renderPickupRookieTag(stud) {
  const info = stud.playerInfo || {};

  if (!info.rookie) {
    return "";
  }

  return `<span class="pickup-rookie-tag">Rookie</span>`;
}

async function fetchSeasonFieldingStats() {
  const season = getCurrentSeason();
  const url =
    `https://statsapi.mlb.com/api/v1/stats` +
    `?stats=season` +
    `&group=fielding` +
    `&playerPool=all` +
    `&sportIds=1` +
    `&gameType=R` +
    `&season=${season}` +
    `&limit=10000`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load fielding eligibility stats");
  }

  const data = await response.json();
  return data.stats?.[0]?.splits || [];
}

function normalizeEligibilityPosition(position) {
  const value = String(position || "").trim().toUpperCase();

  if (!value) return "";

  if (["LF", "CF", "RF"].includes(value)) {
    return "OF";
  }

  if (value === "OUTFIELD" || value === "OUTFIELDER") {
    return "OF";
  }

  if (value === "FIRST BASE") return "1B";
  if (value === "SECOND BASE") return "2B";
  if (value === "THIRD BASE") return "3B";
  if (value === "SHORTSTOP") return "SS";
  if (value === "CATCHER") return "C";
  if (value === "PITCHER") return "P";

  return value;
}


function getPitcherRolesFromStats(split) {
  const stat = split?.stat || {};
  const gamesStarted = Number(stat.gamesStarted ?? stat.gamesStartedPitching ?? stat.starts ?? 0);
  const gamesPitched = Number(stat.gamesPitched ?? stat.gamesPlayed ?? stat.games ?? 0);
  const reliefAppearances = Math.max(gamesPitched - gamesStarted, 0);
  const roles = [];

  if (gamesStarted >= 3) {
    roles.push("SP");
  }

  if (reliefAppearances >= 3) {
    roles.push("RP");
  }

  return roles;
}

function normalizePitcherDisplayPositions(split, positions) {
  const normalizedPositions = sortEligibilityPositions((positions || []).map(normalizeEligibilityPosition));
  const hasPitcherPosition = normalizedPositions.some(position => ["P", "SP", "RP"].includes(position));

  if (!hasPitcherPosition) {
    return [];
  }

  const statRoles = getPitcherRolesFromStats(split);

  if (statRoles.length) {
    return sortEligibilityPositions(statRoles);
  }

  const explicitRoles = normalizedPositions.filter(position => ["SP", "RP"].includes(position));

  return explicitRoles;
}

function getFieldingGamesAtPosition(split) {
  const stat = split?.stat || {};

  return Number(
    stat.gamesPlayed ??
    stat.games ??
    stat.g ??
    stat.gamesAtPosition ??
    0
  );
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

function buildPlayerEligibilityLookup(fieldingStats) {
  const byId = {};
  const byNameTeam = {};
  const byName = {};

  (fieldingStats || []).forEach(split => {
    const playerName = split.player?.fullName || "";
    const playerId = split.player?.id ? String(split.player.id) : "";
    const teamName = split.team?.name || "";
    const normalizedName = normalizePlayerName(playerName);
    const normalizedTeam = normalizePlayerName(teamName);
    const games = getFieldingGamesAtPosition(split);

    const rawPosition =
      split.position?.abbreviation ||
      split.position?.name ||
      split.player?.primaryPosition?.abbreviation ||
      split.player?.primaryPosition?.name ||
      "";

    let position = normalizeEligibilityPosition(rawPosition);

    let positionsToAdd = [position];

    if (["P", "SP", "RP"].includes(position)) {
      positionsToAdd = getPitcherRolesFromStats(split);
    }

    if (!normalizedName || !positionsToAdd.length || games < 3) {
      return;
    }

    positionsToAdd.forEach(positionToAdd => {
      if (playerId) {
        if (!byId[playerId]) byId[playerId] = new Set();
        byId[playerId].add(positionToAdd);
      }

      if (normalizedTeam) {
        const nameTeamKey = `${normalizedName}|${normalizedTeam}`;
        if (!byNameTeam[nameTeamKey]) byNameTeam[nameTeamKey] = new Set();
        byNameTeam[nameTeamKey].add(positionToAdd);
      }

      if (!byName[normalizedName]) byName[normalizedName] = new Set();
      byName[normalizedName].add(positionToAdd);
    });
  });

  const convertSetMap = map => {
    const converted = {};

    Object.keys(map).forEach(key => {
      converted[key] = sortEligibilityPositions([...map[key]]);
    });

    return converted;
  };

  return {
    byId: convertSetMap(byId),
    byNameTeam: convertSetMap(byNameTeam),
    byName: convertSetMap(byName)
  };
}

function getEligibilityForStatSplit(split, eligibilityLookup = {}) {
  const playerId = split?.player?.id ? String(split.player.id) : "";
  const normalizedName = normalizePlayerName(split?.player?.fullName || "");
  const normalizedTeam = normalizePlayerName(split?.team?.name || "");

  if (playerId && eligibilityLookup.byId?.[playerId]) {
    return eligibilityLookup.byId[playerId];
  }

  if (normalizedName && normalizedTeam) {
    const nameTeamKey = `${normalizedName}|${normalizedTeam}`;

    if (eligibilityLookup.byNameTeam?.[nameTeamKey]) {
      return eligibilityLookup.byNameTeam[nameTeamKey];
    }
  }

  return eligibilityLookup.byName?.[normalizedName] || [];
}

async function getPlayerEligibilityLookup() {
  if (playerEligibilityLookupCache) {
    return playerEligibilityLookupCache;
  }

  try {
    const fieldingStats = await fetchSeasonFieldingStats();
    playerEligibilityLookupCache = buildPlayerEligibilityLookup(fieldingStats);
  } catch (error) {
    console.warn("Position eligibility could not load, falling back to primary position.", error);
    playerEligibilityLookupCache = { byId: {}, byNameTeam: {}, byName: {} };
  }

  return playerEligibilityLookupCache;
}

function findLeader(players, category) {
  const eligiblePlayers = players
    .filter(player => passesMinimum(player, category))
    .map(player => ({
      player,
      value: getStatValue(player, category)
    }))
    .filter(item => Number.isFinite(item.value));

  eligiblePlayers.sort((a, b) => {
    return category.type === "min"
      ? a.value - b.value
      : b.value - a.value;
  });

  const leader = eligiblePlayers[0] || null;

  if (!leader) {
    return null;
  }

  const tiedLeaders = eligiblePlayers.filter(item => {
    return Math.abs(item.value - leader.value) < 0.000001;
  });

  return {
    ...leader,
    tiedCount: tiedLeaders.length,
    tiedLeaders
  };
}

function formatTieCount(tiedCount) {
  if (!tiedCount || tiedCount <= 1) {
    return "";
  }

  return `${tiedCount} tied`;
}

function safeIndex(index, total) {
  return ((index % total) + total) % total;
}

function normalizePlayerName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*-\s*[HP]\s*$/i, "") // Shohei Ohtani-H / Shohei Ohtani-P => Shohei Ohtani
    .replace(/[.'’]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/gi, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function getRosterPlayerName(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  if (typeof entry !== "object") return "";
  return entry.name || entry.playerName || entry.fullName || entry.player || entry.Player || entry.Name || "";
}


const PLAYER_NAME_ALIASES = {
  "jacob latz": "jake latz"
};

function getOwnerLookupName(playerName) {
  const normalizedName = normalizePlayerName(playerName);
  return PLAYER_NAME_ALIASES[normalizedName] || normalizedName;
}

function getFantasyOwnersLookup() {
  if (fantasyOwnersLookupCache) {
    return fantasyOwnersLookupCache;
  }

  const ownersData = window.FANTASY_OWNERS || [];
  const lookup = {};

  if (Array.isArray(ownersData)) {
    ownersData.forEach(team => {
      const teamName = team?.teamName || team?.name || team?.owner || "";
      const roster = team?.players || team?.roster || [];

      roster.forEach(playerEntry => {
        const playerName = getRosterPlayerName(playerEntry);

        if (playerName && teamName) {
          lookup[normalizePlayerName(playerName)] = teamName;
        }
      });
    });
  } else if (ownersData && typeof ownersData === "object") {
    Object.entries(ownersData).forEach(([playerName, fantasyTeam]) => {
      if (typeof fantasyTeam === "string") {
        lookup[normalizePlayerName(playerName)] = fantasyTeam;
      }
    });
  }

  fantasyOwnersLookupCache = lookup;
  return fantasyOwnersLookupCache;
}

function getFantasyOwner(playerName) {
  const ownersLookup = getFantasyOwnersLookup();
  const normalizedName = normalizePlayerName(playerName);
  const lookupName = getOwnerLookupName(playerName);

  if (ownersLookup[lookupName]) {
    return ownersLookup[lookupName];
  }

  if (ownersLookup[normalizedName]) {
    return ownersLookup[normalizedName];
  }

  if (normalizedName === "shohei ohtani") {
    return ownersLookup[normalizePlayerName("Shohei Ohtani-H")]
      || ownersLookup[normalizePlayerName("Shohei Ohtani-P")]
      || "";
  }

  return "";
}

function getTeamLogo(teamName) {
  const logoPath = window.TEAM_LOGOS?.[teamName];

  if (!logoPath) {
    return "";
  }

  const isInToolsFolder = window.location.pathname.includes("/tools/");

  return isInToolsFolder && !logoPath.startsWith("../")
    ? `../${logoPath}`
    : logoPath;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLeaderCards(leaders) {
  const grid = document.getElementById("weeklyLeadersGrid");

  if (!grid) return;

  grid.innerHTML = leaders.map(leader => {
    const hasTie = leader.tiedLeaders.length > 1;
    const currentIndex = safeIndex(leader.currentIndex || 0, leader.tiedLeaders.length || 1);
    const currentLeader = leader.tiedLeaders[currentIndex] || { name: leader.name, team: leader.team };
    const fantasyOwner = getFantasyOwner(currentLeader.name);
    const tieText = formatTieCount(leader.tiedLeaders.length);
    const positionText = hasTie ? `${currentIndex + 1}/${leader.tiedLeaders.length}` : "";
    const ownerLogo = fantasyOwner ? getTeamLogo(fantasyOwner) : "";

    return `
      <article class="leader-card">
        <div class="leader-top-row">
          <div class="leader-category">${leader.label}</div>
          ${hasTie ? `<div class="leader-tie">${tieText}</div>` : ""}
        </div>
        <div class="leader-name">${currentLeader.name}</div>
        <div class="leader-team">${currentLeader.team}</div>
        <div class="leader-owner-line">
          ${fantasyOwner ? `
            <span class="fantasy-owner-badge fantasy-owner-badge-with-thumb">
              ${ownerLogo ? `<img src="${ownerLogo}" alt="${fantasyOwner}" class="owner-thumb">` : ""}
              <span>${fantasyOwner}</span>
            </span>
          ` : `<span class="available-badge">Available</span>`}
        </div>
        <div class="leader-bottom-row">
          <div class="leader-value">${leader.value}</div>
          ${hasTie ? `
            <div class="leader-switcher" aria-label="Switch tied ${leader.label} leaders">
              <button class="leader-switch-btn" type="button" data-leader-nav data-category="${leader.label}" data-direction="-1" aria-label="Previous tied leader">‹</button>
              <span class="leader-count-note">${positionText}</span>
              <button class="leader-switch-btn" type="button" data-leader-nav data-category="${leader.label}" data-direction="1" aria-label="Next tied leader">›</button>
            </div>
          ` : ""}
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-leader-nav]").forEach(button => {
    button.addEventListener("click", event => {
      const category = event.currentTarget.dataset.category;
      const direction = Number(event.currentTarget.dataset.direction || 1);
      const leader = weeklyLeadersCache.find(item => item.label === category);

      if (!leader || leader.tiedLeaders.length <= 1) return;

      leader.currentIndex = safeIndex((leader.currentIndex || 0) + direction, leader.tiedLeaders.length);
      leaderRotationState.set(category, leader.currentIndex);
      renderLeaderCards(weeklyLeadersCache);
    });
  });
}

function getSortedEligiblePlayers(players, category) {
  return players
    .filter(player => passesMinimum(player, category))
    .map(player => ({
      player,
      value: getStatValue(player, category)
    }))
    .filter(item => Number.isFinite(item.value))
    .sort((a, b) => {
      return category.type === "min"
        ? a.value - b.value
        : b.value - a.value;
    });
}


function getPickupMinimumValue(category) {
  if (pickupRangeMode === "season" && typeof category.pickupSeasonMinValue === "number") {
    return category.pickupSeasonMinValue;
  }

  if (pickupRangeMode === "last30" && typeof category.pickupLast30MinValue === "number") {
    return category.pickupLast30MinValue;
  }

  return category.pickupMinValue;
}

function passesPickupMinimum(player, category) {
  if (!category.pickupMinStat) return true;

  const stat = player.stat || {};
  let value = stat[category.pickupMinStat];

  if (category.pickupMinStat === "inningsPitched") {
    value = inningsToNumber(value);
  } else {
    value = Number(value || 0);
  }

  return value >= getPickupMinimumValue(category);
}

function getSortedPickupPlayers(players, category) {
  return players
    .filter(player => passesPickupMinimum(player, category))
    .map(player => ({
      player,
      value: getStatValue(player, category)
    }))
    .filter(item => Number.isFinite(item.value))
    .sort((a, b) => {
      return category.type === "min"
        ? a.value - b.value
        : b.value - a.value;
    });
}

function getPickupScore(rank, category) {
  const categoryWeight = {
    HR: 1.25,
    RBI: 1.15,
    R: 1.05,
    TB: 1.05,
    AVG: 1.0,
    BB: 0.95,
    NSB: 0.95,
    K: 1.2,
    W: 1.15,
    QS: 1.25,
    "SV+H-BS": 1.05,
    ERA: 1.0,
    WHIP: 1.0,
    BAA: 0.95
  }[category.label] || 1;

  return Math.max(0, 13 - rank) * categoryWeight;
}


function getPickupSampleValue(player, category) {
  const stat = player.stat || {};

  if (category.group === "hitting") {
    return {
      label: "AB",
      value: Number(stat.atBats || 0)
    };
  }

  return {
    label: "IP",
    value: stat.inningsPitched || "0"
  };
}

function formatPickupSample(sample) {
  return `${sample.label}: ${sample.value}`;
}


function getLast14DateRange() {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 13);
  startDate.setHours(0, 0, 0, 0);

  return {
    startDate,
    endDate,
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
}

function getPickupRangeLabel(mode) {
  if (mode === "last30") return "Last 30 days";
  if (mode === "season") return "Season";
  return "Last 14 days";
}

function getPickupGroupLabel(stud) {
  return stud.group === "pitching" ? "Pitching Pickup" : "Hitting Pickup";
}

function getPickupReasonFromStud(stud) {
  const category = stud.bestCategory?.category || "";

  if (stud.group === "pitching") {
    if (category === "SV+H-BS") return "Saves/Holds";
    if (category === "W") return "Wins";
    if (category === "QS") return "Quality Starts";
    if (category === "K") return "Strikeouts";
    if (category === "ERA" || category === "WHIP" || category === "BAA") return "Ratio Help";
    return "Pitching Depth";
  }

  if (category === "HR" || category === "TB") return "Power";
  if (category === "NSB") return "Speed";
  if (category === "BB") return "Walks";
  if (category === "RBI" || category === "R") return "Run Production";
  if (category === "AVG") return "Average";
  return "Volume Bat";
}

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

function getPlayerStatValue(stud, statName) {
  const stat = stud.rawPlayer?.stat || {};

  if (statName === "IP") return stat.inningsPitched || "0";
  if (statName === "AB") return Number(stat.atBats || 0);
  if (statName === "R") return Number(stat.runs || 0);
  if (statName === "HR") return Number(stat.homeRuns || 0);
  if (statName === "RBI") return Number(stat.rbi || 0);
  if (statName === "NSB") return Number(stat.stolenBases || 0) - Number(stat.caughtStealing || 0);
  if (statName === "AVG") return stat.avg ?? 0;
  if (statName === "TB") return Number(stat.totalBases || 0);
  if (statName === "BB") return Number(stat.baseOnBalls || 0);
  if (statName === "SO") return Number(stat.strikeOuts || 0);

  if (statName === "W") return Number(stat.wins || 0);
  if (statName === "QS") return Number(stat.qualityStarts || 0);
  if (statName === "SV+H") return Number(stat.saves || 0) + Number(stat.holds || 0);
  if (statName === "K") return Number(stat.strikeOuts || 0);
  if (statName === "ERA") return stat.era ?? 0;
  if (statName === "WHIP") return stat.whip ?? 0;
  if (statName === "BAA") return stat.avg ?? 0;

  return "-";
}

function renderPickupPrimaryStat(label, value) {
  return `
    <div class="pickup-primary-stat">
      <span class="pickup-primary-value">${formatPickupStat(value)}</span>
      <span class="pickup-primary-label">${escapeHtml(label)}</span>
    </div>
  `;
}

function renderPickupSecondaryStat(label, value) {
  return `
    <div class="pickup-secondary-stat">
      <span class="pickup-secondary-label">${escapeHtml(label)}</span>
      <span class="pickup-secondary-value">${formatPickupStat(value)}</span>
    </div>
  `;
}


function isPitcherPrimaryPosition(splitOrStud) {
  const split = splitOrStud?.rawPlayer || splitOrStud || {};
  const player = split.player || {};

  const rawPosition =
    player.primaryPosition?.abbreviation ||
    player.primaryPosition?.name ||
    split.position?.abbreviation ||
    split.position?.name ||
    split.primaryPosition?.abbreviation ||
    split.primaryPosition?.name ||
    "";

  const normalizedPosition = normalizeEligibilityPosition(rawPosition);

  return ["P", "SP", "RP"].includes(normalizedPosition);
}

function filterDisplayedEligibilityPositions(stud, positions) {
  const safePositions = sortEligibilityPositions((positions || []).map(normalizeEligibilityPosition));

  if (stud.group === "hitting") {
    return safePositions.filter(position => !["P", "SP", "RP"].includes(position));
  }

  if (stud.group === "pitching") {
    if (!isPitcherPrimaryPosition(stud)) {
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

  const possiblePositions = [
    player.primaryPosition?.abbreviation,
    player.primaryPosition?.name,
    rawPlayer.position?.abbreviation,
    rawPlayer.position?.name,
    rawPlayer.primaryPosition?.abbreviation,
    rawPlayer.primaryPosition?.name,
    rawPlayer.stat?.position,
    stud.position,
    stud.positions
  ];

  const value = possiblePositions.find(item => {
    if (Array.isArray(item)) return item.length;
    return item !== undefined && item !== null && String(item).trim() !== "";
  });

  if (Array.isArray(value)) {
    return filterDisplayedEligibilityPositions(stud, value).join("/");
  }

  const fallbackPosition = normalizeEligibilityPosition(value);
  const filteredFallback = filterDisplayedEligibilityPositions(stud, [fallbackPosition]);

  return filteredFallback.join("/");
}

function renderPickupCard(stud) {
  const isPitcher = stud.group === "pitching";
  const rangeLabel = getPickupRangeLabel(pickupRangeMode);
  const pickupScore = Math.round(stud.totalScore || 0);
  const reason = getPickupReasonFromStud(stud);
  const volumeLabel = isPitcher
    ? `${formatPickupStat(getPlayerStatValue(stud, "IP"))} IP`
    : `${formatPickupStat(getPlayerStatValue(stud, "AB"))} AB`;
  const positionText = getPickupPositionText(stud);

  const primaryStats = isPitcher
    ? [
        ["K", getPlayerStatValue(stud, "K")],
        ["ERA", getPlayerStatValue(stud, "ERA")],
        ["WHIP", getPlayerStatValue(stud, "WHIP")],
        ["BAA", getPlayerStatValue(stud, "BAA")]
      ]
    : [
        ["HR", getPlayerStatValue(stud, "HR")],
        ["RBI", getPlayerStatValue(stud, "RBI")],
        ["R", getPlayerStatValue(stud, "R")],
        ["AVG", getPlayerStatValue(stud, "AVG")]
      ];

  const secondaryStats = isPitcher
    ? [
        ["IP", getPlayerStatValue(stud, "IP")],
        ["W", getPlayerStatValue(stud, "W")],
        ["QS", getPlayerStatValue(stud, "QS")],
        ["SV+H", getPlayerStatValue(stud, "SV+H")]
      ]
    : [
        ["AB", getPlayerStatValue(stud, "AB")],
        ["BB", getPlayerStatValue(stud, "BB")],
        ["SO", getPlayerStatValue(stud, "SO")],
        ["TB", getPlayerStatValue(stud, "TB")]
      ];

  const extraCategories = stud.categories
    .filter(item => item.category !== stud.bestCategory.category)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 2)
    .map(item => `${escapeHtml(item.category)} #${escapeHtml(item.rank)}`)
    .join(" · ");

  return `
    <article class="available-stud-card pickup-card ${isPitcher ? "pitching-pickup-card" : "hitting-pickup-card"}">
      <div class="pickup-card-top">
        <div class="pickup-player-main">
          <div class="pickup-player-name">${escapeHtml(stud.name)}</div>
          <div class="pickup-player-meta">${escapeHtml(stud.team || "Available player")}</div>
          ${(renderPickupAgeTag(stud) || positionText) ? `
            <div class="pickup-position-line">
              ${renderPickupAgeTag(stud)}
              ${positionText ? `<span class="pickup-position-chip">${escapeHtml(positionText)}</span>` : ""}
            </div>
          ` : ""}
          ${renderPickupRookieTag(stud) ? `<div class="pickup-info-tags">${renderPickupRookieTag(stud)}</div>` : ""}
        </div>

        <div class="pickup-score-box">
          <span class="pickup-score-number">${escapeHtml(pickupScore)}</span>
          <span class="pickup-score-label">Score</span>
        </div>
      </div>

      <div class="pickup-card-tags">
        <span class="pickup-group-tag ${isPitcher ? "pickup-group-tag-pitching" : "pickup-group-tag-hitting"}">${getPickupGroupLabel(stud)}</span>
        <span class="pickup-reason-tag">${escapeHtml(reason)}</span>
        <span class="pickup-range-tag">${escapeHtml(rangeLabel)}</span>
        <span class="pickup-volume-tag">${escapeHtml(volumeLabel)}</span>
      </div>

      <div class="pickup-primary-stats">
        ${primaryStats.map(([label, value]) => renderPickupPrimaryStat(label, value)).join("")}
      </div>

      <div class="pickup-secondary-stats">
        ${secondaryStats.map(([label, value]) => renderPickupSecondaryStat(label, value)).join("")}
      </div>

      <div class="pickup-card-footer">
        <span class="pickup-owned-status">Available</span>
        <span class="pickup-mini-note">${extraCategories || (isPitcher ? "Pitching pickup profile" : "Hitting pickup profile")}</span>
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
          ? studs.map(stud => renderPickupCard(stud)).join("")
          : `
            <article class="article-card">
              <p class="article-summary">${escapeHtml(emptyText)}</p>
            </article>
          `
        }
      </div>
    </div>
  `;
}

async function renderAvailableStuds(hittingStats, pitchingStats, eligibilityLookup = {}) {
  const grid = document.getElementById("availableStudsGrid");
  const tag = document.getElementById("availableStudsModeTag");

  if (!grid) return;

  if (tag) {
    tag.textContent = pickupRangeMode === "season" ? "Season" : pickupRangeMode === "last30" ? "Last 30" : "Last 14";
  }

  const candidateMap = new Map();

  topPickupCategories.forEach(category => {
    const source = category.group === "hitting" ? hittingStats : pitchingStats;
    const sortedPlayers = getSortedPickupPlayers(source || [], category);

    sortedPlayers.slice(0, 12).forEach((item, index) => {
      const name = item.player.player?.fullName || "N/A";
      const owner = getFantasyOwner(name);

      if (owner) return;

      // position-player-pitcher guard: do not rank position players as pitching pickups.
      if (category.group === "pitching" && !isPitcherPrimaryPosition(item.player)) {
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
      } else {
        existing.totalScore += score;
        existing.bestRank = Math.min(existing.bestRank, rank);
        existing.categories.push(categoryResult);

        if (
          rank < existing.bestCategory.rank ||
          (rank === existing.bestCategory.rank && score > existing.bestCategory.score)
        ) {
          existing.bestCategory = categoryResult;
        }
      }
    });
  });

  const candidates = [...candidateMap.values()]
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

  const playerInfoLookup = await fetchPlayerInfoLookup(candidates.map(candidate => candidate.playerId));

  candidates.forEach(candidate => {
    candidate.playerInfo = playerInfoLookup[candidate.playerId] || {};
  });

  const hittingPickups = candidates
    .filter(candidate => candidate.group === "hitting")
    .slice(0, 4);

  const pitchingPickups = candidates
    .filter(candidate => candidate.group === "pitching")
    .slice(0, 4);

  if (!hittingPickups.length && !pitchingPickups.length) {
    grid.innerHTML = `
      <article class="article-card">
        <p class="article-summary">
          No top pickups found right now. The wire might actually be cooked.
        </p>
      </article>
    `;
    return;
  }

  grid.innerHTML = `
    ${renderPickupGroup(
      "Top Hitting Pickups",
      "Bats with enough AB volume to actually matter.",
      hittingPickups,
      "No hitting pickups met the playing-time minimums."
    )}

    ${renderPickupGroup(
      "Top Pitching Pickups",
      "Arms helping with wins, QS, strikeouts, ratios, or saves/holds.",
      pitchingPickups,
      "No pitching pickups met the innings minimums."
    )}
  `;
}

function resetLeaderLoadingCards() {
  const grid = document.getElementById("weeklyLeadersGrid");
  if (grid) {
    grid.innerHTML = `
      <article class="article-card">
        <p class="article-summary">Loading category leaders...</p>
      </article>
    `;
  }
}

async function loadWeeklyLeaders() {
  const grid = document.getElementById("weeklyLeadersGrid");
  const rangeTag = document.getElementById("weeklyLeaderRange");
  const pastWeekSelect = document.getElementById("pastWeekSelect");

  if (!grid || !rangeTag) {
    console.error("MLB Category Leaders elements were not found on the page.");
    return;
  }

  let hittingStats;
  let pitchingStats;

  try {
    if (leaderRangeMode === "season") {
      const season = getCurrentSeason();

      rangeTag.textContent = `${season} Season`;

      if (pastWeekSelect) {
        pastWeekSelect.hidden = true;
      }

      [hittingStats, pitchingStats] = await Promise.all([
        fetchSeasonStats("hitting"),
        fetchSeasonStats("pitching")
      ]);
    } else if (leaderRangeMode === "past") {
      const pastWeeks = getSeasonWeekRanges();

      if (!selectedPastWeek && pastWeeks.length) {
        selectedPastWeek = pastWeeks[0];
      }

      const selectedWeek = selectedPastWeek || pastWeeks[0];

      if (pastWeekSelect) {
        pastWeekSelect.hidden = false;
      }

      if (!selectedWeek) {
        rangeTag.textContent = "No past weeks yet";
        grid.innerHTML = `
          <article class="article-card">
            <p class="article-summary">No completed past weeks are available yet.</p>
          </article>
        `;
        return;
      }

      rangeTag.textContent = `${displayDate(selectedWeek.startDate)} - ${displayDate(selectedWeek.endDate)}`;

      [hittingStats, pitchingStats] = await Promise.all([
        fetchWeeklyStats("hitting", selectedWeek.start, selectedWeek.end),
        fetchWeeklyStats("pitching", selectedWeek.start, selectedWeek.end)
      ]);
    } else {
      const { startDate, endDate, start, end } = getWeeklyDateRange();

      rangeTag.textContent = `${displayDate(startDate)} - ${displayDate(endDate)}`;

      if (pastWeekSelect) {
        pastWeekSelect.hidden = true;
      }

      [hittingStats, pitchingStats] = await Promise.all([
        fetchWeeklyStats("hitting", start, end),
        fetchWeeklyStats("pitching", start, end)
      ]);
    }

    weeklyLeadersCache = weeklyLeaderCategories.map(category => {
      const source = category.group === "hitting" ? hittingStats : pitchingStats;
      const leader = findLeader(source, category);

      if (!leader) {
        return {
          label: category.label,
          name: "N/A",
          team: "",
          value: "N/A",
          tiedLeaders: [{ name: "N/A", team: "" }],
          currentIndex: 0
        };
      }

      const tiedLeaders = leader.tiedLeaders.map(item => ({
        name: item.player.player?.fullName || "N/A",
        team: item.player.team?.name || ""
      }));

      return {
        label: category.label,
        name: tiedLeaders[0]?.name || "N/A",
        team: tiedLeaders[0]?.team || "",
        value: formatLeaderValue(leader.value, category),
        tiedLeaders,
        currentIndex: safeIndex(leaderRotationState.get(category.label) || 0, tiedLeaders.length || 1)
      };
    });

    renderLeaderCards(weeklyLeadersCache);
  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <article class="article-card">
        <p class="article-summary">
          MLB category leaders could not load right now.
        </p>
      </article>
    `;
  }
}

async function loadTopPickups() {
  const grid = document.getElementById("availableStudsGrid");
  const tag = document.getElementById("availableStudsModeTag");

  if (!grid) return;

  grid.innerHTML = `
    <article class="article-card">
      <p class="article-summary">Loading top pickups...</p>
    </article>
  `;

  if (tag) {
    tag.textContent = pickupRangeMode === "season" ? "Season" : pickupRangeMode === "last30" ? "Last 30" : "Last 14";
  }

  try {
    let hittingStats = [];
    let pitchingStats = [];
    const eligibilityLookup = await getPlayerEligibilityLookup();

    if (pickupRangeMode === "season") {
      [hittingStats, pitchingStats] = await Promise.all([
        fetchSeasonStats("hitting"),
        fetchSeasonStats("pitching")
      ]);
    } else if (pickupRangeMode === "last30") {
      const { start, end } = getLast30DateRange();

      [hittingStats, pitchingStats] = await Promise.all([
        fetchWeeklyStats("hitting", start, end),
        fetchWeeklyStats("pitching", start, end)
      ]);
    } else {
      const { start, end } = getLast14DateRange();

      [hittingStats, pitchingStats] = await Promise.all([
        fetchWeeklyStats("hitting", start, end),
        fetchWeeklyStats("pitching", start, end)
      ]);
    }

    await renderAvailableStuds(hittingStats, pitchingStats, eligibilityLookup);
  } catch (error) {
    console.error("Top pickups failed:", error);

    grid.innerHTML = `
      <article class="article-card">
        <p class="article-summary">
          Top pickups could not load right now.
        </p>
      </article>
    `;
  }
}

function setupPickupModeToggle() {
  document.querySelectorAll("[data-pickup-mode]").forEach(button => {
    button.addEventListener("click", () => {
      pickupRangeMode = button.dataset.pickupMode || "weekly";

      document.querySelectorAll("[data-pickup-mode]").forEach(modeButton => {
        const isActive = modeButton.dataset.pickupMode === pickupRangeMode;
        modeButton.classList.toggle("active", isActive);
        modeButton.setAttribute("aria-pressed", String(isActive));
      });

      loadTopPickups();
    });
  });
}

function setupLeaderModeToggle() {
  document.querySelectorAll("[data-leader-mode]").forEach(button => {
    button.addEventListener("click", () => {
      leaderRangeMode = button.dataset.leaderMode || "weekly";
      weeklyLeadersCache = [];

      document.querySelectorAll("[data-leader-mode]").forEach(modeButton => {
        const isActive = modeButton.dataset.leaderMode === leaderRangeMode;
        modeButton.classList.toggle("active", isActive);
        modeButton.setAttribute("aria-pressed", String(isActive));
      });

      const pastWeekSelect = document.getElementById("pastWeekSelect");
      if (pastWeekSelect) {
        pastWeekSelect.hidden = leaderRangeMode !== "past";
      }

      resetLeaderLoadingCards();
      loadWeeklyLeaders();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPastWeekSelect();
  setupLeaderModeToggle();
  setupPickupModeToggle();
  loadWeeklyLeaders();
  loadTopPickups();
});
