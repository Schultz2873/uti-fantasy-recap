const round = n => Math.round(n * 100) / 100;

// Typical score among the ten best rated, available players. This is an
// explicit roster-slot assumption, not an estimate of either owner's cuts.
export function replacementScore(players) {
  const scores = players.filter(p => p.fantasyTeam === 'Free Agent' && p.assetType !== 'draftPick' && Number.isFinite(p.dynastyValue))
    .map(p => p.dynastyValue).sort((a, b) => b - a).slice(0, 10);
  if (!scores.length) return null;
  const mid = Math.floor(scores.length / 2);
  return round(scores.length % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2);
}

export function comparePackages(a, b, replacement, enabled = true) {
  const count = list => list.filter(p => p.assetType !== 'draftPick').length;
  const raw = list => round(list.reduce((sum, p) => sum + (p.dynastyValue ?? 0), 0));
  const extra = count(a) - count(b);
  const active = enabled && replacement != null && a.length > 0 && b.length > 0;
  const deductionA = active ? Math.min(raw(a), Math.max(0, extra) * replacement) : 0;
  const deductionB = active ? Math.min(raw(b), Math.max(0, -extra) * replacement) : 0;
  return { a: round(raw(a) - deductionA), b: round(raw(b) - deductionB), rawA: raw(a), rawB: raw(b),
    deductionA: round(deductionA), deductionB: round(deductionB), extraSlots: Math.abs(extra), replacement, active };
}
