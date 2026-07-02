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

function renderAvailableStuds(hittingStats, pitchingStats) {
  const grid = document.getElementById("availableStudsGrid");
  const tag = document.getElementById("availableStudsModeTag");

  if (!grid) return;

  if (tag) {
    tag.textContent = pickupRangeMode === "season" ? "Season" : pickupRangeMode === "last30" ? "Last 30" : "Weekly";
  }

  const candidateMap = new Map();

  topPickupCategories.forEach(category => {
    const source = category.group === "hitting" ? hittingStats : pitchingStats;
    const sortedPlayers = getSortedPickupPlayers(source || [], category);

    sortedPlayers.slice(0, 12).forEach((item, index) => {
      const name = item.player.player?.fullName || "N/A";
      const owner = getFantasyOwner(name);

      if (owner) return;

      const rank = index + 1;
      const playerKey = normalizePlayerName(name);
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
          team: item.player.team?.name || "",
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

  const studs = candidates.slice(0, 4);

  if (!studs.length) {
    grid.innerHTML = `
      <article class="article-card">
        <p class="article-summary">
          No top pickups found right now. The wire might actually be cooked.
        </p>
      </article>
    `;
    return;
  }

  grid.innerHTML = studs.map(stud => {
    const secondaryCategories = stud.categories
      .filter(item => item.category !== stud.bestCategory.category)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 2)
      .map(item => `${escapeHtml(item.category)} #${escapeHtml(item.rank)}`)
      .join(" · ");

    return `
      <article class="available-stud-card">
        <div class="available-stud-top">
          <div class="available-stud-category">${escapeHtml(stud.bestCategory.category)}</div>
          <div class="available-stud-rank">#${escapeHtml(stud.bestCategory.rank)}</div>
        </div>
        <div class="available-stud-name">${escapeHtml(stud.name)}</div>
        <div class="available-stud-team">${escapeHtml(stud.team)}</div>
        <div class="available-stud-team">
          ${escapeHtml(formatPickupSample(stud.bestCategory.sample))}
          ${secondaryCategories ? ` · ${secondaryCategories}` : ""}
        </div>
        <div class="available-stud-bottom">
          <div class="available-stud-value">${escapeHtml(stud.bestCategory.value)}</div>
          <span class="available-stud-label">Pickup</span>
        </div>
      </article>
    `;
  }).join("");
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
    tag.textContent = pickupRangeMode === "season" ? "Season" : pickupRangeMode === "last30" ? "Last 30" : "Weekly";
  }

  try {
    let hittingStats = [];
    let pitchingStats = [];

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
      const { start, end } = getWeeklyDateRange();

      [hittingStats, pitchingStats] = await Promise.all([
        fetchWeeklyStats("hitting", start, end),
        fetchWeeklyStats("pitching", start, end)
      ]);
    }

    renderAvailableStuds(hittingStats, pitchingStats);
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
