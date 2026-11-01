import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparePackages, replacementScore } from './trade-package-values.mjs';
const p = dynastyValue => ({ dynastyValue });
test('three-for-one charges two extra slots and reverses symmetrically', () => {
  const result = comparePackages([p(30), p(30), p(30)], [p(90)], 20);
  assert.equal(result.a, 50);
  assert.equal(result.b, 90);
  assert.equal(comparePackages([p(90)], [p(30), p(30), p(30)], 20).b, 50);
});
test('equal player counts, picks, missing baseline, and disabled adjustment', () => {
  const a = [p(50), { dynastyValue: 10, assetType: 'draftPick' }];
  assert.equal(comparePackages(a, [p(60)], 20).a, 60);
  assert.equal(comparePackages([p(30), p(30)], [p(60)], null).a, 60);
  assert.equal(comparePackages([p(30), p(30)], [p(60)], 20, false).a, 60);
  assert.equal(comparePackages([p(1), p(1)], [p(60)], 20).a, 0);
});
test('replacement pool excludes owned, unrated, and draft assets', () => {
  const pool = [10, 20, 30, 40].map(n => ({ ...p(n), fantasyTeam: 'Free Agent' }));
  assert.equal(replacementScore([...pool, { ...p(100), fantasyTeam: 'Owner' }, { ...p(100), fantasyTeam: 'Free Agent', assetType: 'draftPick' }]), 25);
  assert.equal(replacementScore([]), null);
});
