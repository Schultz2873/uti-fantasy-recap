export const SOURCE_URL = 'https://fantraxhq.com/fantasy-baseball-dynasty-rankings/';
const decode = text => text.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;|&#039;/g, "'");
const text = html => decode(html.replace(/<[^>]*>/g, '')).trim();

export function parseCsvRankings(csv, updated) {
  const rows = [];
  let row = [], field = '', quoted = false;
  const input = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  row.push(field);
  if (row.some(cell => cell.trim())) rows.push(row);
  const headers = rows.shift()?.map(cell => cell.trim()) || [];
  const indexes = ['Roto', 'Player', 'Pos.', 'Team'].map(header => headers.indexOf(header));
  if (indexes.includes(-1)) throw new Error('CSV must include Roto, Player, Pos., and Team columns');
  const players = rows.map(cells => {
    if (cells.length !== headers.length) throw new Error('CSV row has unexpected column count');
    const [rank, name, position, team] = indexes.map(index => cells[index].trim());
    if (!/^\d+$/.test(rank) || !name || !position) throw new Error('Invalid CSV ranking row');
    return { rank: Number(rank), name, position, team };
  }).sort((a, b) => a.rank - b.rank);
  if (players.length < 300 || players[0]?.rank !== 1 || new Set(players.map(player => player.rank)).size !== players.length) throw new Error('Incomplete or duplicate CSV ranks');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated || '')) throw new Error('Supply the rankings source date with --source-date YYYY-MM-DD');
  return { source: 'FantraxHQ', url: SOURCE_URL, format: 'Roto', updated, fetched: new Date().toISOString(), importedFrom: 'User-provided CSV', players };
}

export function parseRankings(html) {
  const tables = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
  const table = tables.find(([table]) => /<th\b/i.test(table) && /\bRoto\b/.test(table) && /\bPlayer\b/.test(table));
  if (!table) throw new Error('FantraxHQ Roto table not found; existing data kept');
  const headers = [...table[0].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m => text(m[1]));
  const indexes = ['Roto', 'Player', 'Pos.', 'Team'].map(header => headers.indexOf(header));
  if (indexes.includes(-1)) throw new Error('Unexpected ranking columns');
  const players = [...table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => /<td\b/i.test(m[1])).map(m => {
    const cells = [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => text(cell[1]));
    const [rank, name, position, team] = indexes.map(index => cells[index]);
    if (!/^\d+$/.test(rank || '') || !name || !position) throw new Error('Invalid ranking row');
    return { rank: Number(rank), name, position, team };
  }).sort((a, b) => a.rank - b.rank);
  // The published table has gaps among its extended ranks; retain those ranks.
  if (players.length < 300 || players[0]?.rank !== 1 || new Set(players.map(player => player.rank)).size !== players.length) throw new Error('Incomplete or duplicate Roto ranks; existing data kept');
  const updated = html.match(/"dateModified"\s*:\s*"([^"T]+)T/)?.[1];
  if (!updated || !/^\d{4}-\d{2}-\d{2}$/.test(updated)) throw new Error('Ranking source date not found');
  return { source: 'FantraxHQ', url: SOURCE_URL, format: 'Roto', updated, fetched: new Date().toISOString(), players };
}

export const normalizeRankingName = name => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/-[HP]$/i, '').replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const teamCode = team => ({ OAK: 'ATH', WAS: 'WSH', ARI: 'AZ', KCR: 'KC', TBR: 'TB', SDP: 'SD', SFG: 'SF' }[team] || team);

export function applyFantraxHQ(player, snapshot) {
  const names = [player.name, ...(player.aliases || [])].map(normalizeRankingName);
  let matches = snapshot.players.filter(entry => names.includes(normalizeRankingName(entry.name)));
  if (/-P$/.test(player.name)) matches = matches.filter(entry => /^(SP|RP|P)$/.test(entry.position));
  if (/-H$/.test(player.name)) matches = matches.filter(entry => !/^(SP|RP|P)$/.test(entry.position));
  if (matches.length > 1) matches = matches.filter(entry => teamCode(entry.team) === teamCode(player.mlbTeam));
  if (matches.length !== 1) return {
    ...player, localDynastyValue: player.dynastyValue, needsReview: true,
    valueSource: 'Local dynasty estimate — unranked by FantraxHQ', dynastyRank: null
  };
  const entry = matches[0];
  // A transparent local value curve, not FantraxHQ's trade prices. Expert rank
  // replaces the dynasty formula without adding age/position/upside weights again.
  const dynastyValue = Math.round(100 / Math.sqrt(1 + (entry.rank - 1) / 25));
  return { ...player, localDynastyValue: player.dynastyValue, dynastyValue,
    dynastyRank: entry.rank, rankingUpdated: snapshot.updated, rankingUrl: snapshot.url,
    valueSource: 'FantraxHQ Roto rank; estimated trade points', needsReview: false };
}
