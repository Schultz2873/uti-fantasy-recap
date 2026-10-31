import { test } from 'node:test';
import assert from 'node:assert/strict';
import { players, deduplicatePlayers, findPlayerByName, PITCHER_CATEGORIES } from '../data/players.js';

test('canonical players do not contain duplicate identities', () => {
  const keys = players.map(p => `${p.name.toLowerCase()}|${p.birthDate}`);
  assert.equal(new Set(keys).size, keys.length);
});

test('duplicate conflicts stay provisional and name aliases resolve', () => {
  const records = [
    { id: 1, name: 'Test Player', birthDate: '2000-01-01', positions: ['SP'], currentRank: 100, needsReview: false },
    { id: 2, name: 'Test Player Jr.', birthDate: '2000-01-01', positions: ['UTIL'], currentRank: 650, needsReview: true }
  ];
  const result = deduplicatePlayers(records);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
  assert.equal(result[0].needsReview, true);
  assert.deepEqual(result[0].aliases, ['Test Player', 'Test Player Jr.']);
  assert.equal(findPlayerByName('Victor Scott'), findPlayerByName('Victor Scott II'));
});

test('same-name players with different birthdays remain separate', () => {
  const result = deduplicatePlayers([
    { id: 1, name: 'Same Name', birthDate: '2000-01-01' },
    { id: 2, name: 'Same Name', birthDate: '1990-01-01' }
  ]);
  assert.equal(result.length, 2);
});

test('Ohtani hitter and pitcher assets stay distinct without a third combined asset', () => {
  const ohtani = players.filter(p => p.name.startsWith('Shohei Ohtani'));
  assert.equal(ohtani.length, 2);
  assert.equal(findPlayerByName('Shohei Ohtani-H').categoryType, 'hitter');
  assert.equal(findPlayerByName('Shohei Ohtani-P').categoryType, 'starter');
  assert.equal(findPlayerByName('Shohei Ohtani'), undefined);
});

test('pitching profiles use net saves and placeholder ranks require review', () => {
  assert.ok(PITCHER_CATEGORIES.includes('NS'));
  assert.ok(!PITCHER_CATEGORIES.includes('SVH_BS'));
  for (const player of players) {
    if (player.categoryType !== 'hitter') {
      assert.ok(Object.hasOwn(player.categoryScores, 'NS'));
      assert.ok(!Object.hasOwn(player.categoryScores, 'SVH_BS'));
    }
    if (player.currentRank === 650 && !player.dynastyRank) assert.equal(player.needsReview, true);
  }
});
