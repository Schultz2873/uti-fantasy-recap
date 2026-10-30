import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inningsToOuts, combineSeasons, categoryContributions, buildStatRatings, matchStatPlayer, applyStatRating } from './player-stat-model.mjs';
import { seasonRows } from './update-mlb-stat-values.mjs';

test('innings use baseball outs and reject invalid decimal fractions', () => {
  assert.equal(inningsToOuts('51.2'), 155);
  assert.equal(inningsToOuts('0.1'), 1);
  assert.throws(() => inningsToOuts('51.5'));
});

test('correct category directions, net statistics and workload-based rate contributions', () => {
  const hitter = { role: 'hitter', stats: { runs: 1, homeRuns: 1, rbi: 1, stolenBases: 8, caughtStealing: 3, hits: 30, atBats: 100, plateAppearances: 120, totalBases: 40, strikeOuts: 20, baseOnBalls: 10 } };
  const h = categoryContributions(hitter, { avg: .25, strikeoutRate: .25 });
  assert.equal(h.NSB, 5);
  assert.equal(h.AVG, 5);
  assert.equal(h.SO, 10);
  const pitcher = { role: 'pitcher', stats: { outs: 180, wins: 4, losses: 3, qualityStarts: 5, saves: 8, blownSaves: 2, strikeOuts: 60, hits: 45, baseOnBalls: 15, earnedRuns: 20, atBats: 220 } };
  const p = categoryContributions(pitcher, { era: 4.5, whip: 1.25, baa: .25 });
  assert.equal(p.NS, 6);
  assert.equal(p.L, -3);
  assert.equal(p.ERA, 10);
  assert.equal(p.WHIP, 15);
  assert.equal(p.BAA, 10);
});

function sample(role, id) {
  return { id, name: `Player ${id}`, birthDate: '2000-01-01', role, stats: role === 'hitter'
    ? { plateAppearances: 400 + id, atBats: 350, hits: 80 + id, runs: 50 + id, homeRuns: id, rbi: 40 + id, stolenBases: id, caughtStealing: 2, totalBases: 120 + id, strikeOuts: 80, baseOnBalls: 30 + id, latestExposure: 400 }
    : { outs: 300 + id, atBats: 380, hits: 85 - id, earnedRuns: 40 - id, wins: id, losses: 10 - id, qualityStarts: id, saves: id, blownSaves: 1, strikeOuts: 80 + id, baseOnBalls: 20, gamesStarted: 15, gamesPitched: 20, latestExposure: 300 } };
}

test('sufficient samples get finite bounded ratings; tiny samples are excluded', () => {
  const snapshot = { updated: '2026-10-30', players: ['hitter', 'pitcher'].flatMap(role => Array.from({ length: 10 }, (_, i) => sample(role, i + 1))) };
  snapshot.players.push({ ...sample('hitter', 50), stats: { ...sample('hitter', 50).stats, plateAppearances: 5 } });
  const ratings = buildStatRatings(snapshot);
  assert.equal(ratings.size, 20);
  assert.ok(!ratings.has('50|hitter'));
  for (const rating of ratings.values()) {
    assert.ok(rating.productionScore > 0 && rating.productionScore <= 100);
    assert.ok(Object.values(rating.categoryScores).every(Number.isFinite));
  }
});

test('matches birthday and two-way role, rejects ambiguous names', () => {
  const candidates = [sample('hitter', 1), sample('pitcher', 1)];
  candidates.forEach(p => p.name = 'Shohei Ohtani');
  assert.equal(matchStatPlayer({ name: 'Shohei Ohtani-P', birthDate: '2000-01-01' }, candidates).role, 'pitcher');
  assert.equal(matchStatPlayer({ name: 'Shohei Ohtani-H', birthDate: '1990-01-01' }, candidates), null);
  assert.equal(matchStatPlayer({ name: 'Shohei Ohtani' }, [...candidates, { ...sample('hitter', 2), name: 'Shohei Ohtani' }]), null);
});

test('unmatched prospects retain explicitly labeled provisional values', () => {
  const player = { name: 'Prospect', dynastyValue: 60 };
  const rated = applyStatRating(player, { players: [] }, new Map());
  assert.equal(rated.dynastyValue, 60);
  assert.equal(rated.needsReview, true);
  assert.match(rated.valueSource, /no established MLB sample/);
});

test('missing seasons count as zero workload and missing fields fail', () => {
  const s = sample('hitter', 1).stats;
  const combined = combineSeasons({ 2026: s }, [{ season: 2026, weight: .6 }, { season: 2025, weight: .4 }], 'hitter');
  assert.equal(combined.homeRuns, .6);
  assert.equal(combined.observedSeasons, 1);
  assert.throws(() => combineSeasons({ 2026: {} }, [{ season: 2026, weight: 1 }], 'hitter'), /Missing/);
});

test('truncated season responses cannot overwrite the full snapshot', () => {
  assert.throws(() => seasonRows({ stats: [{ type: { displayName: 'season' }, totalSplits: 2, splits: [{}] }] }, 'hitting'), /Incomplete/);
});
