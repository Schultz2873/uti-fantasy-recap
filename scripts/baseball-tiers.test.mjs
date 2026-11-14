import test from 'node:test';
import assert from 'node:assert/strict';
import { baseballTier, packageTiers, isTop100Prospect } from './baseball-tiers.mjs';

test('baseball tier boundaries use overall ranks and preserve missing ratings', () => {
  for (const [rank, expected] of [[1, 'Franchise Player'], [25, 'Franchise Player'], [26, 'All-Star'], [75, 'All-Star'], [76, 'Core Starter'], [175, 'Core Starter'], [176, 'Role Player'], [350, 'Role Player'], [351, 'Depth Piece'], [null, 'Unrated'], [0, 'Unrated']]) {
    assert.equal(baseballTier({ dynastyRank: rank }), expected);
  }
});
test('performance ranks and prospect outlook are separate', () => {
  globalThis.TOP_100_PLAYERS = [{ rank: 1, player: 'Test Prospect' }];
  const player = { name: 'Test Prospect', dynastyRank: 30, performanceRank: 200, riskTier: 'prospectHitter' };
  assert.equal(baseballTier(player), 'Blue-Chip Prospect');
  assert.equal(baseballTier(player, 'performance'), 'Role Player');
  assert.equal(baseballTier({ ...player, dynastyRank: 100 }), 'Strong Prospect');
  assert.equal(baseballTier({ ...player, dynastyRank: 300 }), 'Developmental Prospect');
  assert.equal(baseballTier({ ...player, dynastyRank: null }), 'Unrated');
  delete globalThis.TOP_100_PLAYERS;
});
test('packages retain picks and count tiers without summing ranks', () => {
  assert.equal(packageTiers([]), 'No assets');
  assert.equal(packageTiers([{ dynastyRank: 40 }, { dynastyRank: 50 }, { draftYear: 2027, draftRound: 1 }]), '2 Ã— All-Star + 2027 Round 1 Pick');
});

test('only current Top 100 membership permits prospect labels', () => {
  const cam = { name: 'Cam Schlittler', dynastyRank: 14, futureTier: 'prospectMedium', riskTier: 'prospectPitcher' };
  assert.equal(baseballTier(cam), 'Franchise Player');
  assert.equal(isTop100Prospect(cam, []), false);
  assert.equal(isTop100Prospect(cam, [{ rank: 101, player: cam.name }]), false);
  assert.equal(isTop100Prospect({ name: 'Jesus Made' }, [{ rank: 1, player: 'Jesús Made' }]), true);
  assert.equal(isTop100Prospect({ name: 'Alias', aliases: ['Listed Name'] }, [{ rank: 100, player: 'Listed Name' }]), true);
  assert.equal(isTop100Prospect(cam, [{ rank: 0, player: cam.name }]), false);
});
