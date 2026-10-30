/*
  Imports completed weekly category totals through the documented Fantrax REST API.
  Run: node scripts/import-fantrax.js
  Optional authentication: FANTRAX_SECRET_ID (GitHub Actions secret). No browser cookie needed.
  Preserves existing AB, H, and IP; excludes consolation games.
*/
const fs = require("fs");
const path = require("path");

// League IDs live in scripts/fantrax-config.js (Fantrax gives the league a new ID each season).
const LEAGUE_ID = require("./fantrax-config.js").statsLeague;
const ROOT = path.join(__dirname, "..");
const JS_FILE = path.join(ROOT, "data/weekly-team-stats.js");
const CSV_FILE = path.join(ROOT, "data/weekly-team-stats.csv");

const COLUMNS = ["week", "team", "opponent", "AB", "H", "R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB", "IP",
  "ERA", "WHIP", "K", "W", "L", "QS", "NS", "BAA", "official_score_for", "official_score_against", "phase", "round"];

const { collectWeeklyRows } = require("./fantrax-weekly");
const TEXT_COLUMNS = new Set(["team", "opponent", "IP", "phase", "round"]);

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
  const existing = readExistingRows();
  const { imported, regularWeeks, playoffWeeks, season } = await collectWeeklyRows(LEAGUE_ID, existing);

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

  writeFiles(merged, season, regularWeeks, playoffWeeks);
  bumpPageVersions(new Date().toISOString().slice(0, 10));
  console.log(`Imported ${merged.length} rows: regular weeks ${regularWeeks[0]}–${regularWeeks[regularWeeks.length - 1]}, ${playoffWeeks.length} playoff week(s).`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
