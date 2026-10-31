import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRankings, parseCsvRankings, applyFantraxHQ, SOURCE_URL } from './fantraxhq-rankings.mjs';
import { players } from '../data/players.js';

function table() {
  return '<script>{"dateModified":"2026-09-08T10:00:00Z"}</script><table><tr><th>Points</th><th>Roto</th><th>Player</th><th>Pos.</th><th>Team</th></tr>'
    + Array.from({ length: 300 }, (_, i) => `<tr><td>${400 - i}</td><td>${i + 1}</td><td>Player ${i + 1}</td><td>SS</td><td>NYY</td></tr>`).join('') + '</table>';
}

test('CSV uses Roto regardless of row order and preserves accented and quoted names', () => {
  const rows = Array.from({ length: 300 }, (_, i) => [String(300 - i), String(i + 1), i === 0 ? 'José "Test", Jr.' : `Player ${i + 1}`, 'SS', 'NYY']);
  const encode = row => row.map(cell => '"' + cell.replaceAll('"', '""') + '"').join(',');
  const csv = '\uFEFF' + [encode(['Points', 'Roto', 'Player', 'Pos.', 'Team']), ...rows.reverse().map(encode)].join('\r\n');
  const result = parseCsvRankings(csv, '2026-09-08');
  assert.equal(result.players.length, 300);
  assert.equal(result.players[0].rank, 1);
  assert.equal(result.players[0].name, 'José "Test", Jr.');
  assert.throws(() => parseCsvRankings(csv, null), /source date/);
  assert.throws(() => parseCsvRankings(csv + '\n"unfinished', '2026-09-08'), /Unclosed/);
  assert.throws(() => parseCsvRankings(csv.replace('Roto', 'Other'), '2026-09-08'), /columns/);
});

test('extracts Roto rather than Points ranks with source date and attribution', () => {
  const result = parseRankings(table());
  assert.equal(result.players.length, 300);
  assert.equal(result.players[0].rank, 1);
  assert.equal(result.updated, '2026-09-08');
  assert.equal(result.url, SOURCE_URL);
  assert.throws(() => parseRankings(table().replace('Roto', 'Unknown')), /not found/);
  assert.throws(() => parseRankings(table().replace('<td>300</td><td>Player 300', '<td>299</td><td>Player 300')), /duplicate/);
  assert.throws(() => parseRankings('<table></table>'), /not found/);
});

test('decodes names and does not renumber gaps in extended ranks', () => {
  const html = table().replace('Player 1</td>', 'Jos&#233; &amp; O&#39;Neil</td>').replace('<td>300</td><td>Player 300', '<td>350</td><td>Player 300');
  const result = parseRankings(html);
  assert.equal(result.players[0].name, "José & O'Neil");
  assert.equal(result.players.at(-1).rank, 350);
});

test('expert ranks are not changed by local age, scarcity, or upside', () => {
  const source = { updated: '2026-09-08', url: SOURCE_URL, players: [{ name: 'Test Jr.', rank: 10, position: 'SS', team: 'NYY' }] };
  const a = applyFantraxHQ({ name: 'Test', dynastyValue: 20, age: 20 }, source);
  const b = applyFantraxHQ({ name: 'Test', dynastyValue: 90, age: 40 }, source);
  assert.equal(a.dynastyRank, 10);
  assert.equal(a.dynastyValue, b.dynastyValue);
  assert.equal(a.localDynastyValue, 20);
});

test('Ohtani DH ranking applies only to hitter asset', () => {
  const source = { players: [{ name: 'Shohei Ohtani', rank: 4, position: 'DH' }] };
  assert.equal(applyFantraxHQ({ name: 'Shohei Ohtani-H' }, source).dynastyRank, 4);
  assert.equal(applyFantraxHQ({ name: 'Shohei Ohtani-P' }, source).dynastyRank, null);
});

test('live imported Caglianone and Lombard ordering follows the source', () => {
  const jac = players.find(p => p.name === 'Jac Caglianone');
  const george = players.find(p => p.name === 'George Lombard Jr.');
  if (!jac.dynastyRank || !george.dynastyRank) return;
  assert.equal(Math.sign(jac.dynastyValue - george.dynastyValue), -Math.sign(jac.dynastyRank - george.dynastyRank));
});
