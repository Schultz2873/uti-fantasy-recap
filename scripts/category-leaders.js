/*
  MLB Category Leaders (homepage #mlb-weekly-leaders).
  Pulls player stats from the MLB Stats API and shows the leader in each UTI category,
  with arrows to cycle through tied leaders and a badge for the UTI team that owns him.

  This file also defines shared helpers that scripts/top-pickups.js uses, so load it first:
  dates, MLB Stats API fetches, stat math, player-name matching, fantasy owner lookup, and escapeHtml.
*/

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

const MLB_STATS_API = "https://statsapi.mlb.com/api/v1";

const leaderRotationState = new Map(); // category label -> which tied leader is showing
let weeklyLeadersCache = [];
let leaderRangeMode = "weekly"; // "weekly" | "past" | "season"
let selectedPastWeek = null;
let fantasyOwnersLookupCache = null;

/* ---------- Dates ---------- */

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

function getCurrentSeason() {
  return new Date().getFullYear();
}

function getMonday(date) {
  const monday = new Date(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7;

  monday.setDate(monday.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function toDateRange(startDate, endDate) {
  return {
    startDate,
    endDate,
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
}

// Monday through Sunday of the current week.
function getWeeklyDateRange() {
  const startDate = getMonday(new Date());

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return toDateRange(startDate, endDate);
}

// The last `days` days, including today.
function getTrailingDateRange(days) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  return toDateRange(startDate, endDate);
}

// Every completed UTI matchup week this season, newest first.
function getSeasonWeekRanges() {
  const season = getCurrentSeason();
  const currentWeekStart = getWeeklyDateRange().startDate;
  const weeks = [];

  const addWeek = (weekNumber, startDate, endDate) => {
    weeks.push({
      label: `Week ${weekNumber}: ${displayDate(startDate)} - ${displayDate(endDate)}`,
      ...toDateRange(new Date(startDate), new Date(endDate))
    });
  };

  // UTI Week 1 is the long opening matchup: March 25 - April 5.
  const firstWeekStart = new Date(season, 2, 25);
  firstWeekStart.setHours(0, 0, 0, 0);

  const firstWeekEnd = new Date(season, 3, 5);
  firstWeekEnd.setHours(23, 59, 59, 999);

  if (firstWeekStart < currentWeekStart) {
    addWeek(1, firstWeekStart, firstWeekEnd);
  }

  // After that, every matchup week runs normal Monday - Sunday.
  const weekStart = new Date(season, 3, 6);
  weekStart.setHours(0, 0, 0, 0);

  for (let weekNumber = 2; weekStart < currentWeekStart; weekNumber++) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    addWeek(weekNumber, weekStart, weekEnd);
    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weeks.reverse();
}

/* ---------- MLB Stats API ---------- */

async function fetchMlbStatSplits(params, errorMessage) {
  const query = Object.entries(params).map(([key, value]) => `${key}=${value}`).join("&");
  const response = await fetch(`${MLB_STATS_API}/stats?${query}`);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.stats?.[0]?.splits || [];
}

// range is { start, end } as YYYY-MM-DD strings.
function fetchDateRangeStats(group, range) {
  return fetchMlbStatSplits({
    stats: "byDateRange",
    group,
    playerPool: "all",
    sportIds: 1,
    gameType: "R",
    startDate: range.start,
    endDate: range.end,
    limit: 1000
  }, `Could not load ${group} stats`);
}

function fetchSeasonStats(group) {
  return fetchMlbStatSplits({
    stats: "season",
    group,
    playerPool: "all",
    sportIds: 1,
    gameType: "R",
    season: getCurrentSeason(),
    limit: 5000
  }, `Could not load ${group} season stats`);
}

// Resolves to [hittingSplits, pitchingSplits] for a date range, or for the full season when range is null.
function fetchHittingAndPitchingStats(range) {
  return Promise.all(["hitting", "pitching"].map(group =>
    range ? fetchDateRangeStats(group, range) : fetchSeasonStats(group)
  ));
}

/* ---------- Stat math ---------- */

// MLB reports innings like "5.2" meaning 5 and 2/3.
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

  if (category.custom === "svhbs") {
    return Number(stat.saves || 0) + Number(stat.holds || 0) - Number(stat.blownSaves || 0);
  }

  if (category.stat === "inningsPitched") {
    return inningsToNumber(stat.inningsPitched);
  }

  return Number(stat[category.stat]);
}

// True when the player has at least `minValue` of `minStat` (e.g. 15 at-bats), or when there is no minimum.
function meetsMinimum(player, minStat, minValue) {
  if (!minStat) return true;

  const raw = player.stat?.[minStat];
  const value = minStat === "inningsPitched" ? inningsToNumber(raw) : Number(raw || 0);

  return value >= minValue;
}

// Players who pass `passesMinimum`, best first for the category.
function rankPlayersByCategory(players, category, passesMinimum) {
  return players
    .filter(passesMinimum)
    .map(player => ({
      player,
      value: getStatValue(player, category)
    }))
    .filter(item => Number.isFinite(item.value))
    .sort((a, b) => category.type === "min" ? a.value - b.value : b.value - a.value);
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

/* ---------- Player names + fantasy owners ---------- */

function normalizePlayerName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

// MLB name -> name used in fantasy-owners.js, when they differ.
const PLAYER_NAME_ALIASES = {
  "jacob latz": "jake latz"
};

// Normalized player name -> UTI team, built from data/fantasy-owners.js.
// Supports either { "Player": "Team" } or [{ teamName, players: [...] }].
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

// The UTI team that rosters this player, or "" if he is available.
function getFantasyOwner(playerName) {
  const ownersLookup = getFantasyOwnersLookup();
  const normalizedName = normalizePlayerName(playerName);
  const aliasName = PLAYER_NAME_ALIASES[normalizedName] || normalizedName;

  return ownersLookup[aliasName] || ownersLookup[normalizedName] || "";
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

/* ---------- Shared UI ---------- */

// Wires a group of buttons that share a data attribute (e.g. data-leader-mode) as a single-select toggle.
function setupModeToggle(attribute, defaultMode, onSelect) {
  const buttons = document.querySelectorAll(`[${attribute}]`);

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute(attribute) || defaultMode;

      buttons.forEach(modeButton => {
        const isActive = modeButton.getAttribute(attribute) === mode;
        modeButton.classList.toggle("active", isActive);
        modeButton.setAttribute("aria-pressed", String(isActive));
      });

      onSelect(mode);
    });
  });
}

function renderMessageCard(message) {
  return `
      <article class="article-card">
        <p class="article-summary">${message}</p>
      </article>
    `;
}

/* ---------- Category leaders ---------- */

function getLeaderMinimum(category) {
  if (leaderRangeMode === "season" && typeof category.seasonMinValue === "number") {
    return category.seasonMinValue;
  }

  return category.minValue;
}

// Top player for the category, plus everyone tied with him.
function findLeader(players, category) {
  const ranked = rankPlayersByCategory(players, category, player =>
    meetsMinimum(player, category.minStat, getLeaderMinimum(category))
  );
  const leader = ranked[0];

  if (!leader) {
    return null;
  }

  const tiedLeaders = ranked.filter(item => Math.abs(item.value - leader.value) < 0.000001);

  return {
    ...leader,
    tiedCount: tiedLeaders.length,
    tiedLeaders
  };
}

function buildLeaderEntry(category, players) {
  const leader = findLeader(players, category);

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
    currentIndex: wrapIndex(leaderRotationState.get(category.label) || 0, tiedLeaders.length || 1)
  };
}

// Index modulo total that stays positive, for cycling forward and back.
function wrapIndex(index, total) {
  return ((index % total) + total) % total;
}

function renderOwnerBadge(fantasyOwner) {
  if (!fantasyOwner) {
    return `<span class="available-badge">Available</span>`;
  }

  const ownerLogo = getTeamLogo(fantasyOwner);

  return `
            <span class="fantasy-owner-badge fantasy-owner-badge-with-thumb">
              ${ownerLogo ? `<img src="${ownerLogo}" alt="${fantasyOwner}" class="owner-thumb">` : ""}
              <span>${fantasyOwner}</span>
            </span>
          `;
}

function renderLeaderCards(leaders) {
  const grid = document.getElementById("weeklyLeadersGrid");

  if (!grid) return;

  grid.innerHTML = leaders.map(leader => {
    const tieCount = leader.tiedLeaders.length;
    const hasTie = tieCount > 1;
    const currentIndex = wrapIndex(leader.currentIndex || 0, tieCount || 1);
    const currentLeader = leader.tiedLeaders[currentIndex] || { name: leader.name, team: leader.team };

    return `
      <article class="leader-card">
        <div class="leader-top-row">
          <div class="leader-category">${leader.label}</div>
          ${hasTie ? `<div class="leader-tie">${tieCount} tied</div>` : ""}
        </div>
        <div class="leader-name">${currentLeader.name}</div>
        <div class="leader-team">${currentLeader.team}</div>
        <div class="leader-owner-line">
          ${renderOwnerBadge(getFantasyOwner(currentLeader.name))}
        </div>
        <div class="leader-bottom-row">
          <div class="leader-value">${leader.value}</div>
          ${hasTie ? `
            <div class="leader-switcher" aria-label="Switch tied ${leader.label} leaders">
              <button class="leader-switch-btn" type="button" data-leader-nav data-category="${leader.label}" data-direction="-1" aria-label="Previous tied leader">‹</button>
              <span class="leader-count-note">${currentIndex + 1}/${tieCount}</span>
              <button class="leader-switch-btn" type="button" data-leader-nav data-category="${leader.label}" data-direction="1" aria-label="Next tied leader">›</button>
            </div>
          ` : ""}
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-leader-nav]").forEach(button => {
    button.addEventListener("click", event => {
      const category = event.currentTarget.dataset.category;
      const direction = Number(event.currentTarget.dataset.direction || 1);
      const leader = weeklyLeadersCache.find(item => item.label === category);

      if (!leader || leader.tiedLeaders.length <= 1) return;

      leader.currentIndex = wrapIndex((leader.currentIndex || 0) + direction, leader.tiedLeaders.length);
      leaderRotationState.set(category, leader.currentIndex);
      renderLeaderCards(weeklyLeadersCache);
    });
  });
}

function resetLeaderLoadingCards() {
  const grid = document.getElementById("weeklyLeadersGrid");
  if (grid) {
    grid.innerHTML = renderMessageCard("Loading category leaders...");
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

  if (pastWeekSelect) {
    pastWeekSelect.hidden = leaderRangeMode !== "past";
  }

  try {
    let range = null; // null = full season

    if (leaderRangeMode === "season") {
      rangeTag.textContent = `${getCurrentSeason()} Season`;
    } else if (leaderRangeMode === "past") {
      const pastWeeks = getSeasonWeekRanges();

      if (!selectedPastWeek && pastWeeks.length) {
        selectedPastWeek = pastWeeks[0];
      }

      range = selectedPastWeek || pastWeeks[0];

      if (!range) {
        rangeTag.textContent = "No past weeks yet";
        grid.innerHTML = renderMessageCard("No completed past weeks are available yet.");
        return;
      }
    } else {
      range = getWeeklyDateRange();
    }

    if (range) {
      rangeTag.textContent = `${displayDate(range.startDate)} - ${displayDate(range.endDate)}`;
    }

    const [hittingStats, pitchingStats] = await fetchHittingAndPitchingStats(range);

    weeklyLeadersCache = weeklyLeaderCategories.map(category =>
      buildLeaderEntry(category, category.group === "hitting" ? hittingStats : pitchingStats)
    );

    renderLeaderCards(weeklyLeadersCache);
  } catch (error) {
    console.error(error);
    grid.innerHTML = renderMessageCard("MLB category leaders could not load right now.");
  }
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

document.addEventListener("DOMContentLoaded", () => {
  setupPastWeekSelect();

  setupModeToggle("data-leader-mode", "weekly", mode => {
    leaderRangeMode = mode;
    weeklyLeadersCache = [];
    resetLeaderLoadingCards();
    loadWeeklyLeaders();
  });

  loadWeeklyLeaders();
});
