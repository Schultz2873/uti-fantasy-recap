import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { applyFantasyPros } from '../data/players.js';
const { parseRankings } = createRequire(import.meta.url)('./update-fantasypros.js');

function response() {
  return { sport: 'MLB', year: '2026', ranking_type_name: 'DYN', position_id: 'ALL', scoring: 'ROTO', last_updated: '2026-10-30',
    players: Array.from({ length: 50 }, (_, i) => ({ player_id: i + 1, player_name: `Player ${i + 1}`, rank_ecr: i + 1 })) };
}

test('imports only a complete, correctly typed MLB dynasty response', () => {
  assert.equal(parseRankings(response(), 2026).players.length, 50);
  for (const changed of [{ ranking_type_name: 'DRAFT' }, { sport: 'NFL' }, { position_id: 'SP' }, { year: '2025' }, { players: [] }]) {
    assert.throws(() => parseRankings({ ...response(), ...changed }, 2026));
  }
  const invalid = response();
  invalid.players[0].rank_ecr = 0;
  assert.throws(() => parseRankings(invalid, 2026));
});

test('rank-derived points are ordered and preserve source date and independent category profiles', () => {
  const player = { name: 'Player 1', dynastyValue: 50, categoryScores: { HR: 80 }, ageValue: 90 };
  const snapshot = parseRankings(response(), 2026);
  const ranked = applyFantasyPros(player, snapshot);
  assert.equal(ranked.dynastyRank, 1);
  assert.equal(ranked.rankingUpdated, '2026-10-30');
  assert.deepEqual(ranked.categoryScores, { HR: 80 });
  assert.ok(ranked.dynastyValue > applyFantasyPros({ ...player, name: 'Player 50' }, snapshot).dynastyValue);
});

test('unmatched, ambiguous and two-way names do not inherit arbitrary ranks', () => {
  const player = { name: 'Player', dynastyValue: 50 };
  const snapshot = { updated: '2026-10-30', players: [{ name: 'Player', rank: 1 }, { name: 'Player', rank: 2 }] };
  assert.equal(applyFantasyPros(player, { players: [] }).dynastyValue, 50);
  assert.equal(applyFantasyPros(player, snapshot).valueSource, 'Local estimate');
  assert.equal(applyFantasyPros({ name: 'Shohei Ohtani-H', dynastyValue: 83 }, { players: [{ name: 'Shohei Ohtani', rank: 1 }] }).dynastyValue, 83);
});
