#!/usr/bin/env node
/*
  UTI Fantasy Baseball - automated Trending Available updater

  What it does:
  1) Pulls broad add/drop market data from ESPN's public Most Added/Dropped page.
  2) Reads data/fantasy-owners.js so UTI-owned players can be removed.
  3) Writes data/trending-players.js for the homepage.

  Run locally:
    node scripts/update-trending-players.js

  GitHub Actions runs it automatically from .github/workflows/update-trending-players.yml.
*/

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT_DIR = path.resolve(__dirname, "..");
const OWNERS_PATH = path.join(ROOT_DIR, "data", "fantasy-owners.js");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "trending-players.js");

const SEASON = process.env.FANTASY_SEASON || String(new Date().getFullYear());
const ESPN_ADDED_DROPPED_URL = process.env.ESPN_ADDED_DROPPED_URL || "https://fantasy.espn.com/baseball/addeddropped";
const ESPN_FANTASY_API_URL = process.env.ESPN_FANTASY_API_URL ||
  `https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/${SEASON}/segments/0/leaguedefaults/1?view=kona_player_info`;
const MAX_PLAYERS = Number(process.env.TRENDING_PLAYER_LIMIT || 80);

const PLAYER_NAME_ALIASES = {
  "jacob latz": "jake latz",
  "shohei ohtani": "shohei ohtani-h"
};

function normalizePlayerName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*-\s*[HP]\s*$/i, "")
    .replace(/[.'’]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/gi, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function parseNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;

  const cleaned = String(value)
    .replace(/%/g, "")
    .replace(/\+/g, "")
    .replace(/,/g, "")
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getFirstValue(object, keys, fallback = "") {
  for (const key of keys) {
    const parts = key.split(".");
    let value = object;

    for (const part of parts) {
      if (value === undefined || value === null) break;
      value = value[part];
    }

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function readFantasyOwners() {
  if (!fs.existsSync(OWNERS_PATH)) {
    console.warn(`No fantasy owners file found at ${OWNERS_PATH}. Continuing without owner filtering.`);
    return {};
  }

  const code = fs.readFileSync(OWNERS_PATH, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const owners = sandbox.window.FANTASY_OWNERS || {};
  const lookup = {};

  Object.entries(owners).forEach(([playerName, fantasyTeam]) => {
    if (!playerName || !fantasyTeam) return;
    lookup[normalizePlayerName(playerName)] = fantasyTeam;
  });

  return lookup;
}

function getFantasyOwner(playerName, ownersLookup) {
  const normalizedName = normalizePlayerName(playerName);
  const aliasName = PLAYER_NAME_ALIASES[normalizedName] || normalizedName;

  return (
    ownersLookup[aliasName] ||
    ownersLookup[normalizedName] ||
    ownersLookup[`${normalizedName} h`] ||
    ownersLookup[`${normalizedName} p`] ||
    ""
  );
}

const ESPN_SLOT_POSITION_MAP = {
  0: "C",
  1: "1B",
  2: "2B",
  3: "3B",
  4: "SS",
  5: "OF",
  6: "MI",
  7: "CI",
  8: "OF",
  9: "OF",
  10: "OF",
  11: "UTIL",
  12: "UTIL",
  13: "P",
  14: "SP",
  15: "RP",
  16: "BE"
};

const ESPN_DEFAULT_POSITION_MAP = {
  1: "SP",
  2: "RP",
  3: "C",
  4: "1B",
  5: "2B",
  6: "3B",
  7: "SS",
  8: "OF",
  9: "DH"
};

function normalizePositions(rawValue) {
  const rawPositions = Array.isArray(rawValue)
    ? rawValue
    : String(rawValue || "")
      .replace(/[()]/g, "")
      .split(/[\/|,\s]+/g);

  const order = ["C", "1B", "2B", "3B", "SS", "MI", "CI", "OF", "UTIL", "SP", "RP", "P"];
  const positions = [...new Set(rawPositions
    .map(position => {
      if (typeof position === "number") {
        return ESPN_SLOT_POSITION_MAP[position] || ESPN_DEFAULT_POSITION_MAP[position] || "";
      }

      const stringValue = String(position || "").trim().toUpperCase();
      if (/^\d+$/.test(stringValue)) {
        return ESPN_SLOT_POSITION_MAP[Number(stringValue)] || ESPN_DEFAULT_POSITION_MAP[Number(stringValue)] || "";
      }

      return stringValue;
    })
    .map(position => ["LF", "CF", "RF"].includes(position) ? "OF" : position)
    .filter(position => order.includes(position) && position !== "BE")
  )];

  return positions.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function buildTrendPlayer(rawPlayer, source = "ESPN") {
  const player = rawPlayer.player || rawPlayer.athlete || rawPlayer;
  const ownership = rawPlayer.ownership || player.ownership || rawPlayer.playerOwnership || {};

  const name = getFirstValue(rawPlayer, [
    "player.fullName",
    "player.displayName",
    "athlete.fullName",
    "athlete.displayName",
    "fullName",
    "displayName",
    "name",
    "playerName"
  ], "");

  const team = getFirstValue(rawPlayer, [
    "player.proTeamAbbreviation",
    "player.proTeam",
    "player.proTeamId",
    "player.team.abbreviation",
    "player.team.name",
    "proTeamAbbreviation",
    "proTeam",
    "team.abbreviation",
    "team.name",
    "team"
  ], "");

  const positions = normalizePositions(getFirstValue(rawPlayer, [
    "player.eligibleSlots",
    "player.defaultPositionId",
    "player.position",
    "eligiblePositions",
    "positions",
    "position",
    "pos"
  ], []));

  const addedPercent = parseNumber(getFirstValue(rawPlayer, [
    "addedPercent",
    "percentAdded",
    "addsPercent",
    "addPercent",
    "percentChange",
    "percentChange7Day",
    "percentChangeLast7Days",
    "ownership.percentChange",
    "ownership.percentChange7Day",
    "player.ownership.percentChange",
    "player.ownership.percentChange7Day"
  ], 0));

  const droppedPercent = parseNumber(getFirstValue(rawPlayer, [
    "droppedPercent",
    "percentDropped",
    "dropsPercent",
    "dropPercent",
    "ownership.percentDropped",
    "player.ownership.percentDropped"
  ], 0));

  const rosteredPercent = parseNumber(getFirstValue(rawPlayer, [
    "rosteredPercent",
    "percentRostered",
    "percentOwned",
    "ownedPercent",
    "ownership.percentOwned",
    "ownership.percentRostered",
    "player.ownership.percentOwned",
    "player.ownership.percentRostered"
  ], 0));

  if (!name) return null;

  const trendScore = Math.round((addedPercent * 3) + (rosteredPercent * 0.75) - (droppedPercent * 2));
  const isPitcher = positions.some(position => ["P", "SP", "RP"].includes(position));
  const isTrueAddTrend = addedPercent > 0;

  return {
    name,
    team: String(team || "").toUpperCase(),
    positions: positions.length ? positions : [],
    addedPercent,
    rosteredPercent,
    droppedPercent,
    trendScore,
    source,
    timeWindow: "Last 7 days",
    tags: [
      isTrueAddTrend ? (addedPercent >= 10 ? "Hot Add" : "Rising") : "Popular Available",
      isPitcher ? "Arm Watch" : "Bat Watch"
    ],
    reason: isTrueAddTrend
      ? (isPitcher
        ? "Popular pitching add across other fantasy leagues."
        : "Popular hitting add across other fantasy leagues.")
      : "Highly rostered in other leagues and still available in UTI."
  };
}

function walkJson(value, candidates = []) {
  if (!value || typeof value !== "object") return candidates;

  if (Array.isArray(value)) {
    value.forEach(item => walkJson(item, candidates));
    return candidates;
  }

  const candidate = buildTrendPlayer(value, "ESPN");
  if (candidate && (candidate.addedPercent > 0 || candidate.rosteredPercent > 0)) {
    candidates.push(candidate);
  }

  Object.values(value).forEach(child => walkJson(child, candidates));
  return candidates;
}

function extractJsonScripts(html) {
  const scripts = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const text = match[1]?.trim();
    if (!text) continue;

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      scripts.push(text.slice(jsonStart, jsonEnd + 1));
    }
  }

  return scripts;
}

function parseJsonTrendPlayers(html) {
  const candidates = [];

  extractJsonScripts(html).forEach(scriptJson => {
    try {
      const parsed = JSON.parse(scriptJson);
      walkJson(parsed, candidates);
    } catch {
      // Some scripts are normal JS, not JSON. Ignore them.
    }
  });

  return candidates;
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRenderedRows(html) {
  const rowRegex = /<(tr|div)[^>]*(?:Table__TR|player|Player|row|Row)[^>]*>([\s\S]*?)<\/\1>/gi;
  const candidates = [];
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    const text = stripTags(match[2]);
    if (!text || text.length < 8) continue;

    const percentMatches = [...text.matchAll(/([+-]?\d+(?:\.\d+)?)\s*%/g)].map(item => parseNumber(item[1]));
    if (!percentMatches.length) continue;

    const nameMatch = text.match(/^([A-Z][A-Za-z.'’\-]+(?:\s+[A-Z][A-Za-z.'’\-]+){1,3})\b/);
    if (!nameMatch) continue;

    const candidate = buildTrendPlayer({
      name: nameMatch[1],
      addedPercent: percentMatches[0] || 0,
      rosteredPercent: percentMatches[1] || 0,
      droppedPercent: percentMatches[2] || 0
    }, "ESPN");

    if (candidate) candidates.push(candidate);
  }

  return candidates;
}

function dedupePlayers(players) {
  const map = new Map();

  players.forEach(player => {
    const key = normalizePlayerName(player.name);
    if (!key) return;

    const existing = map.get(key);
    if (!existing || player.addedPercent > existing.addedPercent || player.trendScore > existing.trendScore) {
      map.set(key, player);
    }
  });

  return [...map.values()];
}

function getEspnApiFilter(sortKey = "sortPercChange", limit = MAX_PLAYERS, offset = 0) {
  return {
    players: {
      limit,
      offset,
      sortPercChange: sortKey === "sortPercChange" ? { sortAsc: false, sortPriority: 1 } : undefined,
      sortPercentChange: sortKey === "sortPercentChange" ? { sortAsc: false, sortPriority: 1 } : undefined,
      sortPercOwned: sortKey === "sortPercOwned" ? { sortAsc: false, sortPriority: 1 } : undefined
    }
  };
}

function cleanUndefinedForJson(value) {
  if (Array.isArray(value)) {
    return value.map(cleanUndefinedForJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, cleanUndefinedForJson(entryValue)])
    );
  }

  return value;
}

function parseEspnApiPlayers(data) {
  const rawPlayers = Array.isArray(data?.players)
    ? data.players
    : Array.isArray(data)
      ? data
      : [];

  return rawPlayers
    .map(item => buildTrendPlayer(item, "ESPN API"))
    .filter(player => player && (player.addedPercent > 0 || player.rosteredPercent > 0));
}

async function fetchEspnApiTrendPlayers() {
  const sortAttempts = ["sortPercChange", "sortPercentChange", "sortPercOwned"];
  const allPlayers = [];
  const pageLimit = 200;

  for (const sortKey of sortAttempts) {
    // ESPN currently rejects some add/drop sort keys for baseball, but sortPercOwned works.
    // For dynasty leagues, the first page of most-rostered players is usually all owned,
    // so pull deeper pages too and let the UTI owner filter find available names.
    const offsets = sortKey === "sortPercOwned"
      ? [0, 200, 400, 600, 800, 1000, 1200]
      : [0];

    for (const offset of offsets) {
      const filter = JSON.stringify(cleanUndefinedForJson(getEspnApiFilter(sortKey, pageLimit, offset)));

      const response = await fetch(ESPN_FANTASY_API_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 UTI-Fantasy-Baseball-Trending-Updater/1.0",
          "Accept": "application/json,text/plain,*/*",
          "x-fantasy-filter": filter
        }
      });

      if (!response.ok) {
        console.warn(`ESPN API ${sortKey} offset ${offset} request failed: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const players = parseEspnApiPlayers(data);
      console.log(`Fetched ${players.length} candidates from ESPN API using ${sortKey} offset ${offset}`);
      allPlayers.push(...players);

      if (players.length < pageLimit) {
        break;
      }
    }
  }

  return dedupePlayers(allPlayers);
}

async function fetchEspnPageTrendPlayers() {
  const response = await fetch(ESPN_ADDED_DROPPED_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 UTI-Fantasy-Baseball-Trending-Updater/1.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`ESPN page request failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const jsonPlayers = parseJsonTrendPlayers(html);
  const renderedPlayers = parseRenderedRows(html);

  return dedupePlayers([...jsonPlayers, ...renderedPlayers]);
}

async function fetchEspnTrendPlayers() {
  const apiPlayers = await fetchEspnApiTrendPlayers();

  if (apiPlayers.length) {
    return apiPlayers;
  }

  console.warn("ESPN API returned 0 candidates. Trying ESPN rendered page fallback...");

  const pagePlayers = await fetchEspnPageTrendPlayers();
  return dedupePlayers(pagePlayers);
}

function writeTrendingPlayers(players) {
  const generatedAt = new Date().toISOString();
  const output = `// Auto-generated by scripts/update-trending-players.js\n` +
    `// Generated at: ${generatedAt}\n` +
    `// Source: ESPN Most Added/Dropped\n` +
    `// This is a broad market list. category-leaders.js also filters against fantasy-owners.js in the browser.\n\n` +
    `window.TRENDING_PLAYERS = ${JSON.stringify(players, null, 2)};\n\n` +
    `// Backward-compatible alias so older code/name still works if referenced elsewhere.\n` +
    `window.TRENDING_AVAILABLE_PLAYERS = window.TRENDING_PLAYERS;\n`;

  fs.writeFileSync(OUTPUT_PATH, output, "utf8");
}

async function main() {
  const ownersLookup = readFantasyOwners();
  const ownerCount = Object.keys(ownersLookup).length;
  console.log(`Loaded ${ownerCount} UTI owned players from fantasy-owners.js`);

  const rawPlayers = await fetchEspnTrendPlayers();
  console.log(`Fetched ${rawPlayers.length} broad trend candidates from ESPN`);

  const availablePlayers = dedupePlayers(rawPlayers)
    .filter(player => player.name && !getFantasyOwner(player.name, ownersLookup))
    .filter(player =>
      Number(player.addedPercent || 0) > 0 ||
      Number(player.rosteredPercent || 0) > 0 ||
      Number(player.trendScore || 0) > 0
    )
    .sort((a, b) =>
      b.addedPercent - a.addedPercent ||
      b.trendScore - a.trendScore ||
      b.rosteredPercent - a.rosteredPercent ||
      a.name.localeCompare(b.name)
    )
    .slice(0, MAX_PLAYERS);

  if (!availablePlayers.length) {
    throw new Error(
      "No available/popular players were parsed after filtering against fantasy-owners.js. Existing trending-players.js was not overwritten."
    );
  }

  writeTrendingPlayers(availablePlayers);
  console.log(`Wrote ${availablePlayers.length} available trending players to data/trending-players.js`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
