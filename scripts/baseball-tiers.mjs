// Display labels only. Never sum tiers or use them as trade prices.
export function baseballTier(player, mode = 'dynasty') {
  if (player.assetType === 'pick' || player.draftRound) return `${player.draftYear} Round ${player.draftRound} Pick`;
  const rank = mode === 'performance' ? player.performanceRank : player.dynastyRank;
  if (!Number.isInteger(rank) || rank < 1) return 'Unrated';
  const prospect = /prospect/i.test(`${player.riskTier || ''} ${player.futureTier || ''} ${player.rosterStatus || ''}`);
  if (mode === 'dynasty' && prospect) {
    return rank <= 75 ? 'Blue-Chip Prospect' : rank <= 175 ? 'Strong Prospect' : 'Developmental Prospect';
  }
  return rank <= 25 ? 'Franchise Player' : rank <= 75 ? 'All-Star' : rank <= 175 ? 'Core Starter' : rank <= 350 ? 'Role Player' : 'Depth Piece';
}

export function packageTiers(players, mode = 'dynasty') {
  if (!players.length) return 'No assets';
  const counts = new Map();
  for (const player of players) {
    const tier = baseballTier(player, mode);
    counts.set(tier, (counts.get(tier) || 0) + 1);
  }
  return [...counts].map(([tier, count]) => count > 1 ? `${count} × ${tier}` : tier).join(' + ');
}
