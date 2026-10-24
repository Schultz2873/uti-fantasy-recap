/*
  Championship odds for next season, shown in the header ticker (scripts/site-header.js).

  Each team's strength blends:
    - roster value: the sum of its top 23 players' dynastyValue from data/players.js
      (ownership from data/fantasy-owners.js), and
    - form: this season's Power Rating from league-analytics.js.
  Strengths become title probabilities (softmax), then sportsbook-style American odds.
  This is a fun estimate, not a real betting line.
*/
import { players, normalizeName } from "../data/players.js";

const ROSTER_DEPTH = 23;     // players counted per roster, so deep benches don't inflate a team
const ROSTER_WEIGHT = 0.6;   // share of strength from roster value; the rest is current form
const SPREAD = 8;            // higher = favorites get shorter odds

// Round like a sportsbook: +280, +1150, +4750.
function americanOdds(probability) {
  if (probability >= 0.5) return `-${Math.round(probability / (1 - probability) * 100 / 10) * 10}`;
  const raw = (1 - probability) / probability * 100;
  const step = raw >= 1000 ? 50 : 10;
  return `+${Math.round(raw / step) * step}`;
}

export function titleOdds(owners, powerRankings) {
  const ownerByPlayer = new Map(Object.entries(owners || {}).map(([player, team]) => [normalizeName(player), team]));

  const rosters = {};
  players.forEach(player => {
    const team = ownerByPlayer.get(normalizeName(player.name));
    if (team) (rosters[team] = rosters[team] || []).push(player.dynastyValue);
  });

  const rosterValue = team => (rosters[team] || [])
    .sort((a, b) => b - a)
    .slice(0, ROSTER_DEPTH)
    .reduce((sum, value) => sum + value, 0);

  const teams = powerRankings.map(row => ({ team: row.team, roster: rosterValue(row.team), form: row.rating }));
  const maxRoster = Math.max(...teams.map(t => t.roster), 1);
  const maxForm = Math.max(...teams.map(t => t.form), 0.01);

  const weights = teams.map(t => Math.exp(SPREAD * (ROSTER_WEIGHT * t.roster / maxRoster + (1 - ROSTER_WEIGHT) * t.form / maxForm)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return teams
    .map((t, i) => ({ team: t.team, probability: weights[i] / total, odds: americanOdds(weights[i] / total) }))
    .sort((a, b) => b.probability - a.probability);
}
