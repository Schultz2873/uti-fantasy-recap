import test from 'node:test';
import assert from 'node:assert/strict';
import { baseballTier, packageTiers } from './baseball-tiers.mjs';

test('baseball tier boundaries use overall ranks and preserve missing ratings', () => {
  for (const [rank, expected] of [[1, 'Franchise Player'], [25, 'Franchise Player'], [26, 'All-Star'], [75, 'All-Star'], [76, 'Core Starter'], [175, 'Core Starter'], [176, 'Role Player'], [350, 'Role Player'], [351, 'Depth Piece'], [null, 'Unrated'], [0, 'Unrated']]) {
    assert.equal(baseballTier({ dynastyRank: rank }), expected);
  }
});
test('performance ranks and prospect outlook are separate', () => {
  const player = { dynastyRank: 30, performanceRank: 200, riskTier: 'prospectHitter' };
  assert.equal(baseballTier(player), 'Blue-Chip Prospect');
  assert.equal(baseballTier(player, 'performance'), 'Role Player');
  assert.equal(baseballTier({ ...player, dynastyRank: 100 }), 'Strong Prospect');
  assert.equal(baseballTier({ ...player, dynastyRank: 300 }), 'Developmental Prospect');
  assert.equal(baseballTier({ ...player, dynastyRank: null }), 'Unrated');
});
test('packages retain picks and count tiers without summing ranks', () => {
  assert.equal(packageTiers([]), 'No assets');
  assert.equal(packageTiers([{ dynastyRank: 40 }, { dynastyRank: 50 }, { draftYear: 2027, draftRound: 1 }]), '2 × All-Star + 2027 Round 1 Pick');
});
