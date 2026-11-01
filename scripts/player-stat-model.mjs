// Original league model. Scores are estimates from regular-season production,
// not projections or imported expert rankings. Rate contributions use workload.
export const MODEL_VERSION = 1;
export const HITTER_KEYS = ['R', 'HR', 'RBI', 'NSB', 'AVG', 'TB', 'SO', 'BB'];
export const PITCHER_KEYS = ['W', 'L', 'QS', 'NS', 'K', 'ERA', 'WHIP', 'BAA'];
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function inningsToOuts(innings) {
  const match = String(innings).match(/^(\d+)(?:\.([012]))?$/);
  if (!match) throw new Error(`Invalid baseball innings: ${innings}`);
  return Number(match[1]) * 3 + Number(match[2] || 0);
}

export function identityName(name) {
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/-[HP]$/i, '').replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function combineSeasons(records, seasons, role) {
  const fields = role === 'hitter'
    ? ['plateAppearances', 'atBats', 'hits', 'runs', 'homeRuns', 'rbi', 'stolenBases', 'caughtStealing', 'totalBases', 'strikeOuts', 'baseOnBalls']
    : ['outs', 'atBats', 'hits', 'earnedRuns', 'wins', 'losses', 'qualityStarts', 'saves', 'blownSaves', 'strikeOuts', 'baseOnBalls', 'gamesStarted', 'gamesPitched'];
  const totals = Object.fromEntries(fields.map(field => [field, 0]));
  let observedSeasons = 0;
  for (const { season, weight } of seasons) {
    const stat = records[season];
    if (!stat) continue; // Missing seasons contribute zero workload, never fabricated stats.
    observedSeasons++;
    for (const field of fields) {
      const raw = field === 'outs' ? stat.outs ?? inningsToOuts(stat.inningsPitched) : stat[field];
      if (raw == null || raw === '' || !Number.isFinite(Number(raw))) throw new Error(`Missing ${role} field ${field} in ${season}`);
      totals[field] += Number(raw) * weight;
    }
  }
  const latest = records[seasons[0].season];
  return { ...totals, observedSeasons, latestExposure: latest ? Number(role === 'hitter' ? latest.plateAppearances : latest.outs ?? inningsToOuts(latest.inningsPitched)) : 0 };
}

export function categoryContributions(player, baseline) {
  const s = player.stats;
  if (player.role === 'hitter') return {
    R: s.runs, HR: s.homeRuns, RBI: s.rbi, NSB: s.stolenBases - s.caughtStealing,
    AVG: s.hits - baseline.avg * s.atBats, TB: s.totalBases,
    SO: baseline.strikeoutRate * s.plateAppearances - s.strikeOuts, BB: s.baseOnBalls
  };
  const innings = s.outs / 3;
  return {
    W: s.wins, L: -s.losses, QS: s.qualityStarts, NS: s.saves - s.blownSaves, K: s.strikeOuts,
    ERA: baseline.era * innings / 9 - s.earnedRuns,
    WHIP: baseline.whip * innings - s.hits - s.baseOnBalls,
    BAA: baseline.baa * s.atBats - s.hits
  };
}

export function buildStatRatings(snapshot) {
  const ratings = new Map();
  for (const role of ['hitter', 'pitcher']) {
    // Exclude tiny samples from the comparison population, not just rostered players.
    const pool = snapshot.players.filter(p => p.role === role && (role === 'hitter' ? p.stats.plateAppearances >= 100 : p.stats.outs >= 60));
    if (pool.length < 8) throw new Error(`Not enough ${role} data to build ratings`);
    const sum = field => pool.reduce((total, p) => total + p.stats[field], 0);
    const baseline = role === 'hitter'
      ? { avg: sum('hits') / sum('atBats'), strikeoutRate: sum('strikeOuts') / sum('plateAppearances') }
      : { era: sum('earnedRuns') * 27 / sum('outs'), whip: (sum('hits') + sum('baseOnBalls')) * 3 / sum('outs'), baa: sum('hits') / sum('atBats') };
    const contribution = p => ({ ...categoryContributions(p, baseline), SB: p.stats.stolenBases || 0, SV: p.stats.saves || 0 });
    const contributions = pool.map(contribution);
    const keys = role === 'hitter' ? HITTER_KEYS : PITCHER_KEYS;
    const standardKeys = role === 'hitter' ? ['R', 'HR', 'RBI', 'SB', 'AVG'] : ['W', 'SV', 'K', 'ERA', 'WHIP'];
    const allKeys = [...new Set([...keys, ...standardKeys])];
    const distributions = Object.fromEntries(allKeys.map(key => {
      const mean = contributions.reduce((sum, row) => sum + row[key], 0) / pool.length;
      const sd = Math.sqrt(contributions.reduce((sum, row) => sum + (row[key] - mean) ** 2, 0) / pool.length);
      return [key, { mean, sd }];
    }));
    for (const player of snapshot.players.filter(p => p.role === role)) {
      const exposure = role === 'hitter' ? player.stats.plateAppearances : player.stats.outs;
      if (exposure < (role === 'hitter' ? 100 : 60)) continue;
      const values = contribution(player);
      const z = Object.fromEntries(allKeys.map(key => {
        const { mean, sd } = distributions[key];
        return [key, sd > 0 ? clamp((values[key] - mean) / sd, -3, 3) : 0];
      }));
      const averageZ = keys.reduce((sum, key) => sum + z[key], 0) / keys.length;
      const standardZ = standardKeys.reduce((sum, key) => sum + z[key], 0) / standardKeys.length;
      ratings.set(`${player.id}|${role}`, {
        ...player,
        productionScore: Math.round(clamp(50 + 15 * averageZ, 1, 100)),
        leagueFitDelta: averageZ - standardZ,
        categoryScores: Object.fromEntries(keys.map(key => [key, Math.round(clamp(50 + 15 * z[key], 1, 100))])),
        confidence: exposure >= (role === 'hitter' ? 300 : 180) && player.stats.latestExposure > 0 ? 'Established sample' : 'Limited sample'
      });
    }
  }
  return ratings;
}

export function matchStatPlayer(player, candidates) {
  const names = [player.name, ...(player.aliases || [])].map(identityName);
  let matches = candidates.filter(candidate => names.includes(identityName(candidate.name)));
  if (player.birthDate) matches = matches.filter(candidate => candidate.birthDate === player.birthDate);
  const people = new Set(matches.map(candidate => candidate.id));
  if (people.size !== 1) return null;
  const explicitRole = /-H$/.test(player.name) ? 'hitter' : /-P$/.test(player.name) ? 'pitcher' : null;
  if (explicitRole) return matches.find(candidate => candidate.role === explicitRole) || null;
  if (matches.length === 1) return matches[0];
  const role = (player.positions || []).some(p => ['SP', 'RP', 'P'].includes(p)) ? 'pitcher' : 'hitter';
  return matches.find(candidate => candidate.role === role) || null;
}

export function applyStatRating(player, snapshot, ratings) {
  const match = matchStatPlayer(player, snapshot.players);
  const rating = match && ratings.get(`${match.id}|${match.role}`);
  if (!rating) return { ...player, valueSource: 'Local estimate — no established MLB sample', needsReview: true };
  // MLB production measures a different thing from dynasty value, especially
  // for prospects. Keep the dynasty prior and show production independently.
  const dynastyValue = player.dynastyValue;
  return {
    ...player, mlbId: match.id, categoryType: match.role === 'hitter' ? 'hitter' : rating.stats.gamesStarted >= rating.stats.gamesPitched / 2 ? 'starter' : 'reliever',
    categoryScores: rating.categoryScores,
    categoryFit: Math.round(Object.values(rating.categoryScores).reduce((a, b) => a + b, 0) / 8),
    currentProduction: rating.productionScore, dynastyValue, valueSource: 'Local dynasty estimate; MLB category stats', rankingUpdated: snapshot.updated,
    statsSeasons: snapshot.seasons, statsUpdated: snapshot.updated, statsConfidence: rating.confidence,
    modelBreakdown: { production: rating.productionScore, leagueFitDelta: rating.leagueFitDelta },
    needsReview: Boolean(player.needsReview || rating.confidence === 'Limited sample')
  };
}

export function applyLeagueScoring(player) {
  const base = player.dynastyValue;
  // Adjust expert-derived points only. Do not turn limited MLB samples into
  // dynasty judgments about prospects or assign unsupported scores to unranked players.
  const eligible = Boolean(player.dynastyRank && player.statsConfidence === 'Established sample'
    && !String(player.riskTier || '').startsWith('prospect')
    && Number.isFinite(player.modelBreakdown?.leagueFitDelta));
  const percent = eligible ? clamp(player.modelBreakdown.leagueFitDelta * .1, -.15, .15) : 0;
  const value = eligible ? Math.round(clamp(base * (1 + percent), 1, 100)) : base;
  return { ...player, dynastyValue: value, leagueBaseValue: base,
    leagueAdjustment: value - base, leagueAdjustmentPercent: Math.round(percent * 1000) / 10,
    leagueAdjustmentApplied: eligible,
    leagueAdjustmentReason: eligible ? '16-category fit versus standard 5x5 benchmark'
      : 'No adjustment: prospect, limited sample, or no source rank' };
}
