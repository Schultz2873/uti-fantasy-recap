/* Local achievement preview. Never treat this client-side calculation as account authorization. */
(() => {
  const item = (id, slot, name, rarity, requirement, metric, target = 1, art = id) => ({ id, slot, name, rarity, requirement, metric, target, art });
  const catalog = [
    item('cap', 'hat', 'Team cap', 'Common', 'Starter gear', 'starter'),
    item('helmet', 'hat', 'Batting helmet', 'Common', 'Starter gear', 'starter'),
    item('crown', 'hat', 'Champion crown', 'Legendary', 'Win the league championship.', 'champion'),
    item('home', 'jersey', 'Home jersey', 'Common', 'Starter gear', 'starter'),
    item('away', 'jersey', 'Away jersey', 'Common', 'Starter gear', 'starter'),
    item('gold', 'jersey', 'Gold jersey', 'Epic', 'Win 10 regular-season matchups.', 'wins', 10, 'home'),
    item('bat', 'accessory', 'Clubhouse bat', 'Common', 'Starter gear', 'starter'),
    item('glove', 'accessory', 'Fielding glove', 'Common', 'Starter gear', 'starter'),
    item('flame', 'accessory', 'Streakbreaker bat', 'Epic', 'Win 3 consecutive regular-season matchups.', 'streak', 3, 'bat'),
    item('bonds', 'accessory', 'Bonds-inspired power bat', 'Legendary', 'Lead the league in HR in a regular-season week. Ties count.', 'hrLeader', 1, 'bat'),
    item('ichiro', 'accessory', 'Ichiro-inspired contact bat', 'Rare', 'Win AVG against your opponent in 5 regular-season weeks.', 'AVG', 5, 'bat'),
    item('ryan', 'accessory', 'Ryan-inspired strikeout glove', 'Rare', 'Win K against your opponent in 5 regular-season weeks.', 'K', 5, 'glove'),
    item('clean', 'eyes', 'Clean-inning laser visor', 'Rare', 'Win ERA against your opponent in 5 regular-season weeks.', 'ERA', 5),
    item('precision', 'eyes', 'Precision optic visor', 'Epic', 'Win WHIP against your opponent in 8 regular-season weeks.', 'WHIP', 8),
    item('silver', 'shoulders', 'Silver shoulder armor', 'Epic', 'Finish as league runner-up.', 'runnerUp'),
    item('core', 'chest', 'Pennant power core', 'Legendary', 'Finish first in the regular season.', 'regularSeasonFirst'),
    item('cape', 'back', 'Victory cape', 'Rare', 'Win 5 regular-season matchups.', 'wins', 5),
    item('rickey', 'feet', 'Rickey-inspired speed cleats', 'Legendary', 'Win net steals against your opponent in 5 regular-season weeks.', 'NSB', 5),
    item('boots', 'feet', 'Rocket boots', 'Epic', 'Win 5 consecutive regular-season matchups.', 'streak', 5),
    item('orb', 'companion', 'Rookie baseball drone', 'Rare', 'Win your first regular-season matchup.', 'wins'),
    item('headset', 'hat', 'Trade desk headset', 'Rare', 'Commissioner award for Trade of the Year. Not tracked yet.', 'manual'),
  ];
  function evaluate(team, rows = [], seasons = [], season = 2026) {
    // Rows without a season belong to the explicitly supplied snapshot season, never the current clock year.
    const current = rows.filter(row => (row.season == null || row.season === season) && row.phase === 'regular' && Number.isInteger(row.week) && row.week > 0);
    const unique = new Map();
    const duplicates = new Set();
    for (const row of current) {
      const key = `${row.week}|${row.team}`;
      if (unique.has(key)) duplicates.add(key);
      unique.set(key, row);
    }
    const number = value => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value));
    const complete = row => {
      const key = `${row.week}|${row.team}`;
      const otherKey = `${row.week}|${row.opponent}`;
      const other = unique.get(otherKey);
      return !duplicates.has(key) && !duplicates.has(otherKey) && other && other.opponent === row.team
        && number(row.official_score_for) && number(row.official_score_against)
        && Number(row.official_score_for) >= 0 && Number(row.official_score_against) >= 0
        && Number(row.official_score_for) + Number(row.official_score_against) === 16
        && number(other.official_score_for) && number(other.official_score_against)
        && Number(row.official_score_for) === Number(other.official_score_against)
        && Number(row.official_score_against) === Number(other.official_score_for);
    };
    const valid = [...unique.values()].filter(complete);
    const weeks = valid.filter(row => row.team === team).sort((a, b) => a.week - b.week);
    const history = Object.fromEntries(['wins', 'streak', 'hrLeader', 'NSB', 'AVG', 'K', 'ERA', 'WHIP'].map(metric => [metric, []]));
    const observations = { NSB: 0, AVG: 0, K: 0, ERA: 0, WHIP: 0, hrLeader: 0 };
    let streak = 0;
    let lastWeek = 0;
    for (const row of weeks) {
      const opponent = unique.get(`${row.week}|${row.opponent}`);
      const win = Number(row.official_score_for) > Number(row.official_score_against);
      if (win) history.wins.push(row.week);
      streak = win ? (row.week === lastWeek + 1 ? streak + 1 : 1) : 0;
      history.streak.push({ week: row.week, count: streak });
      lastWeek = row.week;
      for (const category of ['NSB', 'AVG', 'K', 'ERA', 'WHIP']) {
        if (!number(row[category]) || !number(opponent[category])) continue;
        if (category === 'AVG' && !(Number(row.AB) > 0 && Number(opponent.AB) > 0)) continue;
        if (['ERA', 'WHIP'].includes(category) && !(Number(row.IP) > 0 && Number(opponent.IP) > 0)) continue;
        observations[category]++;
        const low = ['ERA', 'WHIP'].includes(category);
        if (low ? Number(row[category]) < Number(opponent[category]) : Number(row[category]) > Number(opponent[category])) history[category].push(row.week);
      }
      // A league-leading reward needs a full ten-team week, not a partial comparison pool.
      const pool = valid.filter(other => other.week === row.week);
      if (pool.length === 10 && pool.every(other => number(other.HR))) {
        observations.hrLeader++;
        if (Number(row.HR) === Math.max(...pool.map(other => Number(other.HR)))) history.hrLeader.push(row.week);
      }
    }
    const result = seasons.find(entry => entry.season === season);
    return catalog.map(gear => {
      let progress = 0;
      let earnedWeek = null;
      let known = true;
      if (gear.metric === 'starter') progress = 1;
      else if (gear.metric === 'manual') known = false;
      else if (['champion', 'runnerUp', 'regularSeasonFirst'].includes(gear.metric)) {
        known = Boolean(result?.[gear.metric]);
        progress = result?.[gear.metric] === team ? 1 : 0;
      } else if (gear.metric === 'streak') {
        known = weeks.length > 0;
        progress = Math.max(0, ...history.streak.map(entry => entry.count));
        earnedWeek = history.streak.find(entry => entry.count >= gear.target)?.week ?? null;
      } else {
        known = gear.metric === 'wins' ? weeks.length > 0 : observations[gear.metric] > 0;
        progress = history[gear.metric].length;
        earnedWeek = history[gear.metric][gear.target - 1] ?? null;
      }
      const unlocked = known && progress >= gear.target;
      return { ...gear, progress, known, unlocked, earnedWeek, season,
        evidence: gear.metric === 'starter' ? 'Included with every robot' : !known ? (gear.metric === 'manual' ? 'Commissioner verification needed' : 'Source data unavailable') : unlocked ? `${season}${earnedWeek ? ` · Week ${earnedWeek}` : ' · Season finish'}` : `${Math.min(progress, gear.target)} / ${gear.target}` };
    });
  }
  window.UTIRobotRewards = { catalog, evaluate };
})();
