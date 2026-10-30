import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { combineSeasons, buildStatRatings, MODEL_VERSION } from './player-stat-model.mjs';

async function request(endpoint) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`https://statsapi.mlb.com/api/v1/${endpoint}`, {
        headers: { 'User-Agent': 'UTIFantasyRecap/1.0' }, signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error(`MLB returned HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
}

export function seasonRows(data, group) {
  const base = data.stats?.find(row => row.type?.displayName === 'season');
  const advanced = data.stats?.find(row => row.type?.displayName === 'seasonAdvanced');
  if (!base?.splits?.length || base.totalSplits !== base.splits.length) throw new Error(`Incomplete MLB ${group} season`);
  if (group === 'pitching' && (!advanced?.splits?.length || advanced.totalSplits !== advanced.splits.length)) throw new Error('Missing advanced pitching stats for quality starts');
  const extra = new Map((advanced?.splits || []).map(row => [row.player.id, row.stat]));
  const rows = new Map();
  for (const row of base.splits) {
    if (rows.has(row.player.id)) throw new Error('MLB returned duplicate season totals; refusing to double-count traded players');
    const stat = { ...row.stat };
    if (group === 'pitching') {
      stat.qualityStarts = extra.get(row.player.id)?.qualityStarts;
      if (stat.qualityStarts == null && stat.gamesStarted === 0) stat.qualityStarts = 0;
    }
    rows.set(row.player.id, { name: row.player.fullName, stat });
  }
  return rows;
}

export async function main() {
  const now = new Date();
  const season = Number(process.env.MLB_STATS_SEASON || (now.getUTCFullYear() - (now.getUTCMonth() < 3 ? 1 : 0)));
  if (!Number.isInteger(season) || season < 2000 || season > now.getUTCFullYear()) throw new Error('Invalid MLB_STATS_SEASON');
  const seasons = [{ season, weight: .6 }, { season: season - 1, weight: .3 }, { season: season - 2, weight: .1 }];
  const records = new Map();
  const people = new Map();
  for (const period of seasons) {
    const roster = await request(`sports/1/players?season=${period.season}`);
    if (!Array.isArray(roster.people) || !roster.people.length) throw new Error('Missing MLB identity data');
    for (const person of roster.people) if (!people.has(person.id)) people.set(person.id, person);
    for (const group of ['hitting', 'pitching']) {
      const data = await request(`stats?stats=season,seasonAdvanced&group=${group}&season=${period.season}&playerPool=ALL&limit=10000&gameType=R&sportIds=1`);
      for (const [id, row] of seasonRows(data, group)) {
        const key = `${id}|${group}`;
        if (!records.has(key)) records.set(key, { id, name: row.name, role: group === 'hitting' ? 'hitter' : 'pitcher', records: {} });
        records.get(key).records[period.season] = row.stat;
      }
    }
  }
  const players = [...records.values()].map(player => ({
    id: player.id, name: people.get(player.id)?.fullName || player.name, birthDate: people.get(player.id)?.birthDate || null,
    role: player.role, stats: combineSeasons(player.records, seasons, player.role)
  })).filter(player => player.role === 'hitter' ? player.stats.plateAppearances >= 100 : player.stats.outs >= 60);
  players.sort((a, b) => a.id - b.id || a.role.localeCompare(b.role));
  const snapshot = { updated: now.toISOString().slice(0, 10), modelVersion: MODEL_VERSION, source: 'MLB Stats API regular-season totals', seasons, players };
  const ratings = buildStatRatings(snapshot);
  if (ratings.size < 100) throw new Error('Too few rated players; existing snapshot kept');
  const output = fileURLToPath(new URL('../data/mlb-stat-snapshot.js', import.meta.url));
  fs.writeFileSync(output, '// Generated from MLB regular-season statistics. No third-party rankings.\nexport const mlbStatSnapshot = ' + JSON.stringify(snapshot) + ';\n');
  console.log(`Saved ${ratings.size} MLB player-role samples, seasons ${seasons.map(p => p.season).join('/')}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
