/*
  Imports weekly category stats from Fantrax into data/weekly-team-stats.js and .csv.

  Run: node scripts/import-fantrax.js
  Login: Fantrax's stats need a logged-in session. The script reads the browser cookie from the
  FANTRAX_COOKIE environment variable (GitHub Actions secret) or from a local .fantrax-cookie
  file (git-ignored). When the cookie expires, the script stops with a message saying so.

  What it does:
  - Regular-season weeks come from the standings "Results" view, playoff weeks from the
    "Playoffs" view (bracket games only; consolation games are left out, as before).
  - Weeks that haven't finished yet are skipped.
  - AB, H, and IP aren't in these views, so rows keep whatever values the file already has
    and new rows leave them blank.
  - Team names are matched to the spelling the site already uses.
  - When anything changed, page links to weekly-team-stats.js get a new ?v= so browsers reload it.
*/
const fs = require("fs");
const path = require("path");

const LEAGUE_ID = "6cjtuqcvmicf87yd";
const ROOT = path.join(__dirname, "..");
const JS_FILE = path.join(ROOT, "data/weekly-team-stats.js");
const CSV_FILE = path.join(ROOT, "data/weekly-team-stats.csv");

const COLUMNS = ["week", "team", "opponent", "AB", "H", "R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB", "IP",
  "ERA", "WHIP", "K", "W", "L", "QS", "NS", "BAA", "official_score_for", "official_score_against", "phase", "round"];

// Fantrax column names → our column names. Matched on the full name because "W" and "L"
// appear twice (category wins/losses and pitching wins/losses).
const FANTRAX_COLUMNS = {
  "Runs Scored": "R",
  "Home Runs": "HR",
  "RBI": "RBI",
  "Walks": "BB",
  "Strikeouts": "SO",
  "Stolen Bases - Net": "NSB",
  "Batting Average": "AVG",
  "Total Bases": "TB",
  "Wins": "W",
  "Losses": "L",
  "Quality Starts": "QS",
  "Strikeouts Pitched": "K",
  "Earned Run Average": "ERA",
  "WHIP Ratio": "WHIP",
  "Net Saves 3": "NS",
  "Batting Average Against": "BAA"
};

const TEXT_COLUMNS = new Set(["team", "opponent", "IP", "phase", "round"]);

function readCookie() {
  if (process.env.FANTRAX_COOKIE) return process.env.FANTRAX_COOKIE.trim();
  const file = path.join(ROOT, ".fantrax-cookie");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim().replace(/^cookie:\s*/i, "");
  throw new Error("No Fantrax login cookie. Set FANTRAX_COOKIE or create .fantrax-cookie (see the comment at the top of this file).");
}

async function fantrax(cookie, msgs) {
  const response = await fetch(`https://www.fantrax.com/fxpa/req?leagueId=${LEAGUE_ID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, "User-Agent": "Mozilla/5.0 (UTI weekly import)" },
    body: JSON.stringify({ msgs: msgs.map(([method, data]) => ({ method, data: { leagueId: LEAGUE_ID, ...data } })) })
  });
  if (!response.ok) throw new Error(`Fantrax returned HTTP ${response.status}`);

  const json = await response.json();
  const error = json.pageError?.code;
  if (error === "WARNING_NOT_LOGGED_IN") {
    throw new Error("The Fantrax login cookie has expired. Copy a fresh cookie from your browser into the FANTRAX_COOKIE secret (or .fantrax-cookie).");
  }
  if (error) throw new Error(`Fantrax error: ${error}`);
  return json.responses.map(item => item.data);
}

// "(Wed Mar 25, 2026 - Sun Apr 5, 2026)" → true once the last day is over.
function periodIsFinished(subCaption, now = new Date()) {
  const end = String(subCaption || "").match(/-\s*\w{3}\s+(\w{3}\s+\d{1,2},\s+\d{4})\)/)?.[1];
  if (!end) return false;
  const lastDay = new Date(`${end} 23:59:59`);
  return now > lastDay;
}

function toNumber(text) {
  const value = String(text ?? "").trim();
  if (value === "" || value === "-") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

// Turns one Fantrax table (one week) into rows: team, opponent, categories, scores.
function rowsFromTable(table, week, phase, round, teamName) {
  const header = table.header.cells;
  const rows = table.rows.filter(row => row.cells?.[3]?.content !== "" && row.fixedCells?.[0]?.teamId);
  const byTeamId = {};

  rows.forEach(row => {
    const record = { week, team: teamName(row.fixedCells[0].content), phase, round };
    record.official_score_for = toNumber(row.cells[3].content);
    header.forEach((cell, index) => {
      const column = index >= 4 ? FANTRAX_COLUMNS[cell.name] : null;
      if (column) record[column] = toNumber(row.cells[index]?.content);
    });
    byTeamId[row.fixedCells[0].teamId] = { record, matchupId: row.matchupId };
  });

  return Object.entries(byTeamId).map(([teamId, { record, matchupId }]) => {
    const opponentId = String(matchupId || "").split("_").find(id => id !== teamId);
    const opponent = byTeamId[opponentId]?.record;
    if (!opponent) return null;
    return { ...record, opponent: opponent.team, official_score_against: opponent.official_score_for };
  }).filter(Boolean);
}

// Playoff round names used by the site: last round is the Championship, the one before the Semifinals.
function roundName(number, total) {
  if (number === total) return "Championship";
  if (number === total - 1) return "Semifinals";
  return `Round ${number}`;
}

function readExistingRows() {
  if (!fs.existsSync(JS_FILE)) return [];
  const sandbox = { window: {} };
  new Function("window", fs.readFileSync(JS_FILE, "utf8"))(sandbox.window);
  return sandbox.window.UTI_WEEKLY_TEAM_STATS || [];
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeFiles(rows, season, regularWeeks, playoffWeeks) {
  const csv = [COLUMNS.join(","), ...rows.map(row => COLUMNS.map(column => csvValue(row[column])).join(","))].join("\n") + "\n";
  fs.writeFileSync(CSV_FILE, csv);

  const playoffNotes = playoffWeeks.map(({ week, round }) => `Week ${week} = ${round}`).join("; ");
  const ordered = rows.map(row => Object.fromEntries(COLUMNS.map(column => {
    const value = row[column];
    if (TEXT_COLUMNS.has(column)) return [column, value === "" || value == null ? "" : String(value)];
    return [column, value === "" || value == null ? "" : Number(value)];
  })));

  const js = [
    "// Generated UTI weekly team stats (scripts/import-fantrax.js).",
    regularWeeks.length ? `// ${season} regular season: Weeks ${regularWeeks[0]}–${regularWeeks[regularWeeks.length - 1]}.` : "",
    playoffWeeks.length ? `// Playoffs: ${playoffNotes}.` : "",
    "// phase/round fields distinguish regular-season and playoff rows.",
    `window.UTI_WEEKLY_TEAM_STATS = ${JSON.stringify(ordered, null, 2)};`,
    ""
  ].filter(line => line !== "").join("\n") + "\n";
  fs.writeFileSync(JS_FILE, js);
}

// Points every page's <script src=".../weekly-team-stats.js?v=..."> at a new version.
function bumpPageVersions(version) {
  const pages = [];
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (entry.name.startsWith(".") || entry.name === "node_modules") return;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) pages.push(full);
  });
  walk(ROOT);

  pages.forEach(page => {
    const html = fs.readFileSync(page, "utf8");
    const updated = html.replace(/(data\/weekly-team-stats\.js)(\?v=[^"']*)?(["'])/g, `$1?v=${version}$3`);
    if (updated !== html) fs.writeFileSync(page, updated);
  });
}

async function main() {
  const cookie = readCookie();
  const [schedule, playoffs] = await fantrax(cookie, [
    ["getStandings", { view: "SCHEDULE" }],
    ["getStandings", { view: "PLAYOFFS" }]
  ]);

  const existing = readExistingRows();
  const knownTeams = [...new Set(existing.map(row => row.team))];
  const teamName = name => knownTeams.find(team => team.toLowerCase() === String(name).toLowerCase()) || name;

  // Regular season: "Scoring Period N". Playoff tables in this view only list seeds, so skip them.
  const imported = [];
  const regularWeeks = [];
  schedule.tableList.forEach(table => {
    const week = Number(String(table.caption).match(/^Scoring Period (\d+)$/)?.[1]);
    if (!week || !periodIsFinished(table.subCaption)) return;
    const rows = rowsFromTable(table, week, "regular", "", teamName);
    if (rows.length) {
      imported.push(...rows);
      regularWeeks.push(week);
    }
  });

  // Playoffs: "Scoring Period: Playoffs N", numbered after the last regular-season week.
  const lastRegularWeek = schedule.tableList
    .map(table => Number(String(table.caption).match(/^Scoring Period (\d+)$/)?.[1]))
    .filter(Boolean)
    .reduce((max, week) => Math.max(max, week), 0);
  const playoffTables = (playoffs.tableList || [])
    .map(table => ({ table, number: Number(String(table.caption).match(/Playoffs (\d+)$/)?.[1]) }))
    .filter(item => item.number);
  const totalRounds = playoffTables.reduce((max, item) => Math.max(max, item.number), 0);
  const playoffWeeks = [];
  playoffTables.sort((a, b) => a.number - b.number).forEach(({ table, number }) => {
    if (!periodIsFinished(table.subCaption)) return;
    const week = lastRegularWeek + number;
    const round = roundName(number, totalRounds);
    const rows = rowsFromTable(table, week, "playoffs", round, teamName);
    if (rows.length) {
      imported.push(...rows);
      playoffWeeks.push({ week, round });
    }
  });

  if (!imported.length) {
    console.log("No finished weeks on Fantrax yet; nothing to import.");
    return;
  }

  // Keep the existing order and the AB / H / IP values Fantrax doesn't provide.
  const key = row => `${row.week}|${row.team}`;
  const existingByKey = new Map(existing.map((row, index) => [key(row), { row, index }]));
  const merged = imported.map((row, importIndex) => {
    const previous = existingByKey.get(key(row));
    return {
      ...row,
      AB: previous?.row.AB ?? "",
      H: previous?.row.H ?? "",
      IP: previous?.row.IP ?? "",
      order: previous ? previous.index : existing.length + importIndex
    };
  }).sort((a, b) => a.week - b.week || a.order - b.order);

  const before = JSON.stringify(existing.map(row => COLUMNS.map(column => String(row[column] ?? ""))));
  const after = JSON.stringify(merged.map(row => COLUMNS.map(column => String(row[column] ?? ""))));
  if (before === after) {
    console.log(`Up to date: ${merged.length} rows, weeks ${merged[0].week}–${merged[merged.length - 1].week}.`);
    return;
  }

  const season = String(schedule.miscData?.heading || "").match(/^\d{4}/)?.[0] || new Date().getFullYear();
  writeFiles(merged, season, regularWeeks, playoffWeeks);
  bumpPageVersions(new Date().toISOString().slice(0, 10));
  console.log(`Imported ${merged.length} rows: regular weeks ${regularWeeks[0]}–${regularWeeks[regularWeeks.length - 1]}, ${playoffWeeks.length} playoff week(s).`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
