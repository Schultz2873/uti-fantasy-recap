import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parsePlayerExport } from './fantrax-player-scores.mjs';

const arg = flag => { const i = process.argv.indexOf(flag); return i < 0 ? null : process.argv[i + 1]; };
try {
  const season = Number(arg('--season'));
  const hitters = arg('--hitters'), pitchers = arg('--pitchers');
  if (!Number.isInteger(season) || season < 2000 || !hitters || !pitchers) throw new Error('Use --season YYYY --hitters file.csv --pitchers file.csv');
  const players = [...parsePlayerExport(fs.readFileSync(hitters, 'utf8'), 'hitter'), ...parsePlayerExport(fs.readFileSync(pitchers, 'utf8'), 'pitcher')];
  if (players.length < 100 || new Set(players.map(p => p.id)).size !== players.length) throw new Error('Incomplete exports or duplicate player IDs');
  const snapshot = { season, type: 'actual', imported: new Date().toISOString(), source: 'User-provided Fantrax league exports', players };
  const output = arg('--output') || fileURLToPath(new URL('../data/fantrax-player-scores.js', import.meta.url));
  fs.writeFileSync(output, '// User-confirmed actual season stats, not projections. Ownership comes from current rosters.\nexport const fantraxPlayerScores = ' + JSON.stringify(snapshot) + ';\n');
  console.log(`Imported ${players.length} players; ${players.filter(p => p.score != null).length} ranked ${season} scores.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
