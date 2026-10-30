const fs = require('node:fs');
const path = require('node:path');

function parseRankings(data, season) {
  if (data.sport !== 'MLB' || Number(data.year) !== season || data.ranking_type_name !== 'DYN' || data.position_id !== 'ALL' || data.scoring !== 'ROTO') {
    throw new Error('Expected MLB overall dynasty roto rankings for the requested season; previous snapshot kept.');
  }
  if (!Array.isArray(data.players) || data.players.length < 50 || !data.last_updated) {
    throw new Error('Missing or incomplete FantasyPros rankings; previous snapshot kept. A production key is required.');
  }
  const players = data.players.map(player => {
    const rank = Number(player.rank_ecr);
    if (!player.player_name || !player.player_id || !Number.isInteger(rank) || rank < 1) throw new Error('Invalid FantasyPros player ranking');
    return { id: String(player.player_id), name: player.player_name, rank, team: player.player_team_id || '', position: player.primary_position || '' };
  });
  if (new Set(players.map(player => player.id)).size !== players.length) throw new Error('Duplicate FantasyPros player IDs');
  return { updated: data.last_updated, season, fetched: new Date().toISOString(), players };
}

async function main() {
  const key = process.env.FANTASYPROS_API_KEY?.trim();
  if (!key) throw new Error('Add a production FantasyPros key as the GitHub Actions secret FANTASYPROS_API_KEY.');
  const season = Number(process.env.FANTASYPROS_SEASON || new Date().getUTCFullYear());
  if (!Number.isInteger(season) || season < 2020 || season > 2100) throw new Error('Invalid FANTASYPROS_SEASON');
  const url = `https://api.fantasypros.com/public/v2/json/mlb/${season}/consensus-rankings?position=ALL&type=DYN&scoring=ROTO`;
  const response = await fetch(url, { headers: { 'x-api-key': key, 'User-Agent': 'UTIFantasyRecap/1.0' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`FantasyPros returned HTTP ${response.status}; previous snapshot kept.`);
  const snapshot = parseRankings(await response.json(), season);
  const output = path.join(__dirname, '../data/fantasypros-dynasty.js');
  fs.writeFileSync(output, '// Imported FantasyPros MLB dynasty consensus ranks. Do not edit by hand.\nexport const fantasyProsDynasty = ' + JSON.stringify(snapshot, null, 2) + ';\n');
  console.log(`Saved ${snapshot.players.length} FantasyPros rankings dated ${snapshot.updated}.`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { parseRankings };
