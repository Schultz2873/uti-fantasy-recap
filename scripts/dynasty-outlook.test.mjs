import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDynastyOutlook, withScoreMode } from './dynasty-outlook.mjs';
import { fantraxPlayerScores } from '../data/fantrax-player-scores.js';
import { applyExportScore } from './fantrax-player-scores.mjs';

test('three seasons contribute by recency and workload without changing current performance', () => {
  const player = buildDynastyOutlook(applyExportScore({ name: 'Miguel Vargas', dynastyRank: 71, positions: ['3B'] }, fantraxPlayerScores));
  assert.equal(player.performanceScore, 94.53);
  assert.deepEqual(player.dynastyBreakdown.seasons.map(s => s.season), [2026, 2025, 2024]);
  const seasons = player.dynastyBreakdown.seasons;
  const expected = 51 * (1 - seasons.reduce((n, s) => n + .3 * s.recency * s.reliability, 0)) + seasons.reduce((n, s) => n + .3 * s.recency * s.reliability * s.score, 0);
  assert.equal(player.dynastyOutlook, Math.round(expected * 100) / 100);
  assert.ok(player.dynastyOutlook < 64.06);
  const prospect = buildDynastyOutlook({ name: 'No stats prospect', dynastyRank: 10, dynastyValue: null, performanceSeason: 2026 });
  assert.equal(prospect.dynastyOutlook, prospect.dynastyBreakdown.baseline);
});

test('established performance blends at 30 percent with no extra age bonuses', () => {
  const base = { dynastyRank: 71, dynastyValue: 94.53, performanceRole: 'hitter', performanceAtBats: 588, performanceStats: {} };
  const result = buildDynastyOutlook(base);
  assert.equal(result.performanceScore, 94.53);
  assert.equal(result.dynastyBreakdown.baseline, 51);
  assert.equal(result.dynastyBreakdown.productionWeight, .3);
  assert.equal(result.dynastyOutlook, 64.06);
  assert.equal(buildDynastyOutlook({ ...base, age: 20 }).dynastyOutlook, buildDynastyOutlook({ ...base, age: 40 }).dynastyOutlook);
});

test('prospects without MLB performance retain the expert baseline', () => {
  const player = buildDynastyOutlook({ dynastyRank: 10, dynastyValue: null });
  assert.equal(player.dynastyOutlook, player.dynastyBreakdown.baseline);
  assert.equal(player.dynastyBreakdown.productionWeight, 0);
});

test('small samples receive less production weight and pitcher innings use baseball notation', () => {
  const hitter = buildDynastyOutlook({ dynastyRank: 71, dynastyValue: 100, performanceRole: 'hitter', performanceAtBats: 50, performanceStats: {} });
  assert.equal(hitter.dynastyBreakdown.productionWeight, .03);
  const pitcher = buildDynastyOutlook({ dynastyRank: 71, dynastyValue: 100, performanceRole: 'pitcher', positions: ['SP'], performanceStats: { IP: 50 } });
  assert.equal(pitcher.dynastyBreakdown.productionWeight, .1);
});

test('missing dynasty baseline stays unrated and switching preserves actual scores', () => {
  const player = buildDynastyOutlook({ dynastyValue: 80, performanceRole: 'hitter', performanceAtBats: 500, performanceStats: {} });
  assert.equal(withScoreMode(player, 'dynasty').dynastyValue, null);
  assert.equal(withScoreMode(withScoreMode(player, 'dynasty'), 'performance').dynastyValue, 80);
});
