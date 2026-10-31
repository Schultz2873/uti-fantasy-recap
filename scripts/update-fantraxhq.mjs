import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRankings, parseCsvRankings, SOURCE_URL } from './fantraxhq-rankings.mjs';

export async function main() {
  const csvIndex = process.argv.indexOf('--csv');
  let snapshot;
  if (csvIndex !== -1) {
    const csvPath = process.argv[csvIndex + 1];
    const dateIndex = process.argv.indexOf('--source-date');
    if (!csvPath || csvPath.startsWith('--')) throw new Error('Supply a CSV path after --csv');
    snapshot = parseCsvRankings(fs.readFileSync(csvPath, 'utf8'), dateIndex === -1 ? null : process.argv[dateIndex + 1]);
  } else {
    const response = await fetch(SOURCE_URL, { headers: { 'User-Agent': 'UTIFantasyRecap/1.0' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`FantraxHQ returned HTTP ${response.status}; existing rankings kept`);
    snapshot = parseRankings(await response.text());
  }
  const output = fileURLToPath(new URL('../data/fantraxhq-rankings.js', import.meta.url));
  fs.writeFileSync(output, '// FantraxHQ public Roto ranks. Source: ' + SOURCE_URL + '\nexport const fantraxHQRankings = ' + JSON.stringify(snapshot, null, 2) + ';\n');
  console.log(`Imported ${snapshot.players.length} Roto rankings, source updated ${snapshot.updated}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error.message); process.exitCode = 1; });
