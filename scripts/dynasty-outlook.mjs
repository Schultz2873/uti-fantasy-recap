import { inningsToOuts } from './player-stat-model.mjs';
import { fantraxPlayerScores as season2025 } from '../data/fantrax-player-scores-2025.js';
import { fantraxPlayerScores as season2024 } from '../data/fantrax-player-scores-2024.js';
import { applyExportScore } from './fantrax-player-scores.mjs';

function sampleReliability(player, score) {
  if (score == null || !player.performanceStats) return 0;
  if (player.performanceRole === 'hitter') return Math.min(1, (player.performanceAtBats || 0) / 500);
  return Math.min(1, inningsToOuts(player.performanceStats.IP) / 3 / ((player.positions || []).includes('SP') ? 150 : 60));
}

export function buildDynastyOutlook(player) {
  const performanceScore = player.dynastyValue;
  const baseline = player.dynastyRank ? Math.round(100 / Math.sqrt(1 + (player.dynastyRank - 1) / 25)) : null;
  let reliability = 0;
  if (performanceScore != null && player.performanceStats) {
    if (player.performanceRole === 'hitter') reliability = Math.min(1, (player.performanceAtBats || 0) / 500);
    else {
      const innings = inningsToOuts(player.performanceStats.IP) / 3;
      const starter = (player.positions || []).includes('SP');
      reliability = Math.min(1, innings / (starter ? 150 : 60));
    }
  }
  // An explicit, provisional blend: long-term expert outlook stays the anchor.
  // No additional age/position bonuses; those already influence dynasty ranks.
  const seasons = [{ season: player.performanceSeason, score: performanceScore, recency: player.performanceSeason ? .6 : 1, reliability }];
  for (const [snapshot, recency] of [[season2025, .3], [season2024, .1]]) {
    if (player.performanceSeason !== 2026) continue;
    const historical = applyExportScore(player, snapshot);
    seasons.push({ season: snapshot.season, score: historical.dynastyValue, recency, reliability: sampleReliability(historical, historical.dynastyValue) });
  }
  const effectiveSample = seasons.reduce((sum, s) => sum + s.recency * s.reliability, 0);
  const productionWeight = .3 * effectiveSample;
  const productionScore = effectiveSample ? seasons.reduce((sum, s) => sum + (s.score ?? 0) * s.recency * s.reliability, 0) / effectiveSample : null;
  const score = baseline == null ? null : Math.round((baseline * (1 - productionWeight) + (productionScore ?? 0) * productionWeight) * 100) / 100;
  return { ...player, performanceScore, dynastyOutlook: score,
    dynastyBreakdown: { baseline, productionScore, seasons, productionWeight: Math.round(productionWeight * 1000) / 1000,
      sourceWeight: Math.round((1 - productionWeight) * 1000) / 1000 },
    dynastyConfidence: baseline == null ? 'No expert baseline' : productionWeight === 0 ? 'Expert baseline only' : effectiveSample < .999 ? 'Limited production sample' : 'Established production sample' };
}

export function withScoreMode(player, mode) {
  const dynasty = mode === 'dynasty';
  return { ...player, dynastyValue: dynasty ? player.dynastyOutlook : player.performanceScore,
    tier: dynasty ? 'Provisional dynasty outlook' : `${player.performanceSeason} league performance`,
    valueSource: dynasty ? 'Expert dynasty baseline + actual league production' : `Fantrax ${player.performanceSeason} actual league score`,
    needsReview: dynasty || player.performanceScore == null };
}
