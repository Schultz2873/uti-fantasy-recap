import { readCsvRows, normalizeRankingName } from './fantraxhq-rankings.mjs';

export function parsePlayerExport(csv, role) {
  const rows = readCsvRows(csv);
  const headers = rows.shift() || [];
  const required = role === 'hitter' ? ['R', 'HR', 'RBI', 'BB', 'SO', 'SBN', 'AVG', 'TB'] : ['IP', 'ERA', 'WHIP', 'K', 'W', 'L', 'QS', 'NS', 'BAA'];
  for (const field of ['ID', 'Player', 'Team', 'Position', 'RkOv', 'Score', ...required]) {
    if (!headers.includes(field)) throw new Error(`Missing export column ${field}`);
  }
  return rows.map(cells => {
    if (cells.length !== headers.length) throw new Error('Incorrect export column count');
    const data = Object.fromEntries(headers.map((header, i) => [header, cells[i].trim()]));
    const rank = data.RkOv === '' ? null : Number(data.RkOv);
    const score = rank == null ? null : Number(data.Score);
    if (!data.ID || !data.Player || (rank != null && (!Number.isInteger(rank) || rank < 1 || data.Score === '' || !Number.isFinite(score) || score < 0 || score > 100))) throw new Error('Invalid player rank or score');
    const stats = Object.fromEntries(required.map(field => {
      if (data[field] === '' || !Number.isFinite(Number(data[field]))) throw new Error(`Missing ${field} for ${data.Player}`);
      return [field, Number(data[field])];
    }));
    return { id: data.ID.replaceAll('*', ''), name: data.Player, team: data.Team,
      positions: data.Position.split(',').map(p => p.trim()), role, rank, score, stats,
      games: Number(data.GP || 0), atBats: role === 'hitter' && /^\d+\/\d+$/.test(data['H/AB'] || '') ? Number(data['H/AB'].split('/')[1]) : null };
  });
}

export function applyExportScore(player, snapshot) {
  const names = [player.name, ...(player.aliases || [])].map(normalizeRankingName);
  let matches = snapshot.players.filter(p => names.includes(normalizeRankingName(p.name)));
  const role = /-H$/.test(player.name) ? 'hitter' : /-P$/.test(player.name) ? 'pitcher' : null;
  if (role) matches = matches.filter(p => p.role === role);
  if (matches.length > 1) {
    const team = code => ({ CWS: 'CHW', ARI: 'AZ', WSH: 'WAS', OAK: 'ATH' }[code] || code);
    matches = matches.filter(p => team(p.team) === team(player.mlbTeam));
  }
  const entry = matches.length === 1 ? matches[0] : null;
  return { ...player, dynastyEstimate: player.dynastyValue,
    dynastyValue: entry?.score ?? null,
    performanceRank: entry?.rank ?? null, performanceSeason: snapshot.season,
    performanceStats: entry?.stats || null,
    performanceRole: entry?.role || null, performanceAtBats: entry?.atBats ?? null,
    scoreSource: 'Fantrax league export',
    valueSource: entry?.score != null ? `Fantrax ${snapshot.season} actual league score` : `No ranked ${snapshot.season} actual score`,
    tier: entry?.score != null ? `${snapshot.season} league performance` : 'Unrated for this season',
    positions: entry?.positions || player.positions,
    needsReview: entry?.score == null,
    // Source scores already use league scoring: never apply our adjustments again.
    leagueBaseValue: null, leagueAdjustment: 0, leagueAdjustmentApplied: false };
}
