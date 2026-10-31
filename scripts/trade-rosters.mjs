export function rosterName(name) {
  return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function reconcileRosters(players, snapshot) {
  if (!snapshot?.teams || !Object.keys(snapshot.teams).length) throw new Error('Current roster data is unavailable');
  const result = players.map(player => ({ ...player, fantasyTeam: 'Free Agent' }));
  for (const [team, roster] of Object.entries(snapshot.teams)) {
    for (const [slot, status, name, mlbTeam, position, mlbId] of roster) {
      const key = rosterName(name);
      const matches = result.filter(player => [player.name, ...(player.aliases || [])].some(alias => rosterName(alias) === key));
      if (matches.length === 1) {
        matches[0].fantasyTeam = team;
        matches[0].mlbId = mlbId || matches[0].mlbId;
        continue;
      }
      result.push({ id: `roster-${team}-${key}`, name, mlbTeam, mlbId,
        positions: [position || slot], fantasyTeam: team, age: '—', dynastyValue: null,
        tier: 'Unrated', categoryScores: {}, categoryFit: 0, needsReview: true,
        valueSource: 'Roster player — valuation needed', rosterStatus: status });
    }
  }
  return result;
}
