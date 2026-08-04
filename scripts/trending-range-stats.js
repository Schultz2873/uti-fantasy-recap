/* ===== Definitive Trending range stat renderer =====
   Fixes 7D / 14D / SEA showing season-only stats by reading a real
   range-specific stat object first, then running the best-highlight picker.
*/
(function () {
  const RANGE_LABELS = { last7: 'Last 7', last14: 'Last 14', season: 'Season' };
  const RANGE_ALIASES = {
    last7: ['last7', 'last7days', 'last_7', 'last_7_days', 'lastSeven', 'lastSevenDays', 'stats7', 'stats7days', 'statsLast7', 'last7Stats', 'sevenDayStats', 'recent7', 'recent7Stats', 'rolling7', 'rolling7days', 'period7', 'split7', '7day', '7days', '7', 'week'],
    last14: ['last14', 'last14days', 'last_14', 'last_14_days', 'lastFourteen', 'lastFourteenDays', 'stats14', 'stats14days', 'statsLast14', 'last14Stats', 'fourteenDayStats', 'recent14', 'recent14Stats', 'rolling14', 'rolling14days', 'period14', 'split14', '14day', '14days', '14', 'twoweek', 'twoWeek', 'twoWeeks'],
    season: ['season', 'seasonStats', 'statsSeason', 'fullSeason', 'year', 'ytd', '2026']
  };

  const STAT_KEYS = [
    'AB', 'PA', 'R', 'HR', 'RBI', 'NSB', 'SB', 'TB', 'AVG', 'OPS', 'OBP', 'BB',
    'IP', 'ERA', 'WHIP', 'BAA', 'K', 'SO', 'QS', 'REC', 'W', 'L', 'SV+H', 'SVH', 'SV', 'HLD', 'HD', 'home_runs', 'runs_batted_in', 'total_bases', 'stolen_bases', 'at_bats', 'innings_pitched', 'earned_run_average', 'walks_hits_per_inning_pitched', 'batting_average', 'opponent_average'
  ];
  const NAME_KEYS = ['name', 'playerName', 'fullName', 'displayName'];
  const POSITION_KEYS = ['position', 'positions', 'eligiblePositions', 'pos'];
  const NESTED_STAT_KEYS = ['hitting', 'pitching', 'stats', 'mlbStats', 'fantasyStats', 'standard', 'standardStats', 'line', 'batting', 'battingStats', 'pitchingStats', 'totals', 'total', 'summary', 'stat'];

  function norm(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function getPlayerName(player) {
    for (const key of NAME_KEYS) if (player?.[key]) return String(player[key]);
    return '';
  }

  function getPositionText(player) {
    for (const key of POSITION_KEYS) {
      const value = player?.[key];
      if (Array.isArray(value)) return value.join('/');
      if (value) return String(value);
    }
    return '';
  }

  function isPitcher(player) {
    return /(^|[^A-Z])(P|SP|RP|CL)([^A-Z]|$)/i.test(getPositionText(player));
  }

  function isReliever(player) {
    return /(^|[^A-Z])(RP|CL)([^A-Z]|$)/i.test(getPositionText(player));
  }

  function isStarter(player) {
    return /(^|[^A-Z])SP([^A-Z]|$)/i.test(getPositionText(player));
  }

  function toNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const cleaned = String(value).replace(/,/g, '').replace('%', '').trim();
    if (!cleaned || cleaned === '-') return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatValue(label, value) {
    const n = toNumber(value);
    if (n === null) return value ?? '-';
    if (['AVG', 'OBP', 'OPS', 'ERA', 'WHIP', 'BAA'].includes(label)) {
      if (['ERA', 'WHIP'].includes(label)) return n.toFixed(2);
      return n.toFixed(3).replace(/^0/, '');
    }
    if (label === 'IP') return Number.isInteger(n) ? String(n) : n.toFixed(1);
    return String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  }

  function looksLikeStatsObject(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj).map(norm);
    return STAT_KEYS.some(key => keys.includes(norm(key)) || keys.some(k => k === norm(key)));
  }

  function mergeNestedStats(obj) {
    if (!obj || typeof obj !== 'object') return {};
    const merged = { ...obj };
    NESTED_STAT_KEYS.forEach(key => {
      const nested = obj[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        Object.assign(merged, nested);
      }
    });
    return merged;
  }

  function directCaseInsensitive(obj, aliases) {
    if (!obj || typeof obj !== 'object') return undefined;
    const normalized = aliases.map(norm);
    for (const [key, value] of Object.entries(obj)) {
      if (normalized.includes(norm(key))) return value;
    }
    return undefined;
  }

  function findRangeStats(player, range) {
    if (!player || typeof player !== 'object') return {};
    const aliases = RANGE_ALIASES[range] || [range];

    // 0) Array shapes: player.statSplits = [{ range: 'last7', stats: {...} }]
    for (const arrayKey of ['statSplits', 'splits', 'ranges', 'rangeStats', 'periods', 'statLines']) {
      const arr = player[arrayKey];
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (!item || typeof item !== 'object') continue;
          const rangeText = norm(item.range || item.period || item.label || item.name || item.type || item.key || item.statRange || item.days || '');
          const isMatch = aliases.some(alias => rangeText === norm(alias) || rangeText.includes(norm(alias)));
          if (!isMatch) continue;
          for (const statKey of ['stats', 'hitting', 'pitching', 'mlbStats', 'fantasyStats', 'line']) {
            if (looksLikeStatsObject(item[statKey])) return mergeNestedStats(item[statKey]);
          }
          if (looksLikeStatsObject(item)) return mergeNestedStats(item);
        }
      }
    }

    // 1) Common direct shapes: player.last7, player.stats.last7, player.ranges.last7, etc.
    const topDirect = directCaseInsensitive(player, aliases);
    if (looksLikeStatsObject(topDirect)) return mergeNestedStats(topDirect);

    for (const containerKey of ['stats', 'statLines', 'ranges', 'splits', 'fantasyStats', 'mlbStats', 'hitting', 'pitching']) {
      const container = player[containerKey];
      const found = directCaseInsensitive(container, aliases);
      if (looksLikeStatsObject(found)) return mergeNestedStats(found);
    }

    // 2) Combined keys: last7Stats, statsLast14, seasonHitting, etc.
    const stack = [{ obj: player, depth: 0 }];
    const visited = new Set();
    while (stack.length) {
      const { obj, depth } = stack.shift();
      if (!obj || typeof obj !== 'object' || visited.has(obj) || depth > 4) continue;
      visited.add(obj);

      for (const [key, value] of Object.entries(obj)) {
        const nk = norm(key);
        const isRangeKey = aliases.some(alias => nk === norm(alias) || nk.includes(norm(alias)));
        if (isRangeKey && looksLikeStatsObject(value)) return mergeNestedStats(value);
        if (value && typeof value === 'object' && !Array.isArray(value)) stack.push({ obj: value, depth: depth + 1 });
      }
    }

    // 3) Season can safely use a broad stats object. Do NOT use this fallback for 7D/14D,
    // because that is what made every button look like season stats.
    if (range === 'season') {
      if (looksLikeStatsObject(player.stats)) return mergeNestedStats(player.stats);
      if (looksLikeStatsObject(player)) return mergeNestedStats(player);
    }

    return {};
  }

  function valueFromStats(stats, keys) {
    if (!stats || typeof stats !== 'object') return undefined;
    const aliases = keys.map(norm);
    const visited = new Set();
    const queue = [{ obj: stats, depth: 0 }];

    while (queue.length) {
      const { obj, depth } = queue.shift();
      if (!obj || typeof obj !== 'object' || visited.has(obj) || depth > 4) continue;
      visited.add(obj);

      for (const [key, value] of Object.entries(obj)) {
        if (aliases.includes(norm(key))) return value;
      }

      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          queue.push({ obj: value, depth: depth + 1 });
        }
      }
    }

    return undefined;
  }

  function readRenderedStats(card) {
    const rendered = {};
    card?.querySelectorAll?.('.trend-v7-stat, .pickup-primary-stat, .pickup-secondary-stat, .pickup-market-stat')?.forEach(statEl => {
      const label = statEl.querySelector('.trend-v7-stat-label, .pickup-primary-label, .pickup-secondary-label, .pickup-market-label')?.textContent?.trim();
      const value = statEl.querySelector('.trend-v7-stat-value, .pickup-primary-value, .pickup-secondary-value, .pickup-market-value')?.textContent?.trim();
      if (label && value && value !== '—' && value !== '-') rendered[label] = value;
    });
    return rendered;
  }

  function makeStat(label, keys, stats, weight, formatterLabel = label, group = '') {
    const raw = valueFromStats(stats, keys);
    const num = toNumber(raw);
    return { label, value: formatValue(formatterLabel, raw), num, group, score: num === null ? -999 : weight(num, stats) };
  }

  function chooseTop(items) {
    const usable = items
      .filter(item => item && item.num !== null && item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const good = usable.filter(item => Number.isFinite(item.score) && item.score > 0);
    const chosen = [];
    const usedGroups = new Set();

    good.forEach(item => {
      if (chosen.length >= 4) return;
      if (item.group && usedGroups.has(item.group)) return;
      chosen.push(item);
      if (item.group) usedGroups.add(item.group);
    });

    good.forEach(item => {
      if (chosen.length >= 4) return;
      if (!chosen.some(existing => existing.label === item.label)) chosen.push(item);
    });

    usable.forEach(item => {
      if (chosen.length >= 4) return;
      if (!chosen.some(existing => existing.label === item.label)) chosen.push(item);
    });

    while (chosen.length < 4) {
      chosen.push({ label: '—', value: '—', num: 0, score: -999 });
    }

    return chosen.slice(0, 4);
  }

  function chooseHitterStats(stats) {
    const ab = toNumber(valueFromStats(stats, ['AB', 'ab', 'atBats', 'at_bats'])) || 0;
    const pa = toNumber(valueFromStats(stats, ['PA', 'pa', 'plateAppearances'])) || ab;
    return chooseTop([
      makeStat('NSB', ['NSB', 'nsb', 'SB', 'sb', 'stolenBases', 'stolen_bases'], stats, n => n >= 5 ? 170 + n * 8 : n >= 3 ? 135 + n * 8 : n >= 1 ? 88 + n * 8 : 0),
      makeStat('HR', ['HR', 'hr', 'homeRuns', 'home_runs'], stats, n => n >= 4 ? 165 + n * 8 : n >= 2 ? 130 + n * 8 : n >= 1 ? 86 + n * 8 : 0),
      makeStat('RBI', ['RBI', 'rbi', 'runsBattedIn', 'runs_batted_in'], stats, n => n >= 10 ? 142 + n * 3 : n >= 6 ? 108 + n * 3 : n >= 3 ? 65 + n * 3 : n * 4),
      makeStat('R', ['R', 'runs', 'run'], stats, n => n >= 10 ? 136 + n * 3 : n >= 6 ? 100 + n * 3 : n >= 3 ? 62 + n * 3 : n * 4),
      makeStat('TB', ['TB', 'tb', 'totalBases', 'total_bases'], stats, n => n >= 24 ? 132 + n : n >= 14 ? 92 + n : n >= 8 ? 55 + n : n * 2),
      makeStat('AVG', ['AVG', 'avg', 'battingAverage', 'batting_average'], stats, n => ab < 8 ? 0 : n >= .380 ? 145 + n * 100 : n >= .330 ? 112 + n * 100 : n >= .290 ? 78 + n * 80 : n >= .260 ? 36 + n * 60 : 0, 'AVG'),
      makeStat('OPS', ['OPS', 'ops'], stats, n => ab < 8 ? 0 : n >= 1.000 ? 138 + n * 40 : n >= .850 ? 96 + n * 35 : n >= .760 ? 55 + n * 25 : 0, 'OPS'),
      makeStat('OBP', ['OBP', 'obp', 'onBasePercentage'], stats, n => pa < 8 ? 0 : n >= .420 ? 118 + n * 70 : n >= .370 ? 82 + n * 60 : n >= .330 ? 44 + n * 45 : 0, 'OBP'),
      makeStat('BB', ['BB', 'bb', 'walks'], stats, n => n >= 7 ? 104 + n * 4 : n >= 4 ? 76 + n * 4 : n >= 2 ? 38 + n * 4 : n * 3),
      makeStat('AB', ['AB', 'ab', 'atBats', 'at_bats'], stats, n => n >= 28 ? 48 + n / 2 : n >= 18 ? 34 + n / 2 : n / 2)
    ]);
  }

  function makeRecordStat(stats) {
    const rawRecord = valueFromStats(stats, ['REC', 'record', 'pitchingRecord', 'winLossRecord', 'winLoss', 'wl', 'wL', 'W-L', 'w-l']);
    if (rawRecord !== undefined && rawRecord !== null && String(rawRecord).trim()) {
      const match = String(rawRecord).match(/(\d+)\s*[-–]\s*(\d+)/);
      const wins = match ? Number(match[1]) : toNumber(rawRecord) || 0;
      const losses = match ? Number(match[2]) : 0;
      return {
        label: 'REC',
        value: match ? `${wins}-${losses}` : String(rawRecord).trim(),
        num: wins,
        group: 'record',
        score: wins >= 2 ? 104 + wins * 8 - losses * 4 : wins >= 1 ? 70 + wins * 8 - losses * 4 : losses ? 25 - losses * 4 : 0
      };
    }

    const winRaw = valueFromStats(stats, ['W', 'w', 'wins', 'win', 'pitchingWins', 'gamesWon', 'games_won', 'winsPitching']);
    const lossRaw = valueFromStats(stats, ['L', 'l', 'losses', 'loss', 'pitchingLosses', 'gamesLost', 'games_lost', 'lossesPitching']);
    const wins = toNumber(winRaw);
    const losses = toNumber(lossRaw);

    if (wins === null && losses === null) return { label: 'REC', value: '', num: null, group: 'record', score: -999 };
    const safeWins = wins ?? 0;
    const safeLosses = losses ?? 0;
    return {
      label: 'REC',
      value: `${safeWins}-${safeLosses}`,
      num: safeWins + safeLosses,
      group: 'record',
      score: safeWins >= 2 ? 104 + safeWins * 8 - safeLosses * 4 : safeWins >= 1 ? 70 + safeWins * 8 - safeLosses * 4 : safeLosses ? 25 - safeLosses * 4 : 0
    };
  }

  function choosePitcherStats(stats, player) {
    const ip = toNumber(valueFromStats(stats, ['IP', 'ip', 'inningsPitched', 'innings_pitched'])) || 0;
    const reliever = isReliever(player);
    const starter = isStarter(player);
    const minRatioIp = reliever ? 2 : 3;
    const sv = toNumber(valueFromStats(stats, ['SV', 'sv', 'saves'])) || 0;
    const hld = toNumber(valueFromStats(stats, ['HLD', 'HD', 'holds'])) || 0;
    const svh = valueFromStats(stats, ['SV+H', 'SVH', 'svh', 'savesHolds', 'savesPlusHolds']) ?? (sv + hld || undefined);
    const withSvh = { ...stats, 'SV+H': svh };

    return chooseTop([
      makeStat('SV+H', ['SV+H', 'SVH', 'svh', 'savesHolds', 'savesPlusHolds'], withSvh, n => n >= 4 ? 172 + n * 8 : n >= 2 ? 132 + n * 8 : n >= 1 ? 90 + n * 8 : 0, 'SV+H', 'leverage'),
      makeStat('SV', ['SV', 'sv', 'saves'], stats, n => n >= 3 ? 160 + n * 8 : n >= 1 ? 106 + n * 8 : 0, 'SV', 'leverage'),
      makeStat('HLD', ['HLD', 'HD', 'holds'], stats, n => n >= 4 ? 145 + n * 7 : n >= 2 ? 104 + n * 7 : n >= 1 ? 66 + n * 7 : 0, 'HLD', 'leverage'),
      makeStat('K', ['K', 'SO', 'strikeouts', 'pitchingStrikeouts'], stats, n => starter ? (n >= 18 ? 150 + n * 2 : n >= 10 ? 108 + n * 2 : n >= 5 ? 58 + n * 2 : n * 3) : (n >= 10 ? 142 + n * 2 : n >= 6 ? 98 + n * 2 : n >= 3 ? 54 + n * 2 : n * 3)),
      makeStat('QS', ['QS', 'qualityStarts'], stats, n => n >= 2 ? 118 + n * 8 : n >= 1 ? 80 + n * 8 : 0),
      makeRecordStat(stats),
      makeStat('IP', ['IP', 'ip', 'inningsPitched', 'innings_pitched'], stats, n => reliever ? (n >= 6 ? 110 + n : n >= 4 ? 82 + n : n >= 2 ? 48 + n : n >= 1 ? 26 + n : 0) : (n >= 13 ? 92 + n : n >= 7 ? 62 + n : n >= 3 ? 28 + n : 0)),
      makeStat('ERA', ['ERA', 'era', 'earnedRunAverage', 'earned_run_average'], stats, n => ip < minRatioIp ? 0 : n <= 0.75 ? 158 - n * 8 : n <= 1.50 ? 136 - n * 8 : n <= 2.50 ? 104 - n * 6 : n <= 3.25 ? 66 - n * 4 : 0, 'ERA'),
      makeStat('WHIP', ['WHIP', 'whip', 'walksHitsPerInningPitched', 'walks_hits_per_inning_pitched'], stats, n => ip < minRatioIp ? 0 : n <= .75 ? 154 - n * 20 : n <= .95 ? 124 - n * 18 : n <= 1.10 ? 92 - n * 16 : n <= 1.20 ? 62 - n * 12 : 0, 'WHIP'),
      makeStat('BAA', ['BAA', 'baa', 'opponentAverage', 'opponent_average'], stats, n => ip < minRatioIp ? 0 : n <= .160 ? 148 - n * 100 : n <= .200 ? 112 - n * 80 : n <= .230 ? 78 - n * 65 : n <= .250 ? 50 - n * 55 : 0, 'BAA')
    ]);
  }

  function trendPlayers() {
    return Array.isArray(window.TRENDING_AVAILABLE_PLAYERS) ? window.TRENDING_AVAILABLE_PLAYERS : [];
  }

  function findPlayerForCard(card, index) {
    const list = trendPlayers();
    const cardName = norm(card.querySelector('.trend-v7-name')?.textContent || card.querySelector('.pickup-player-name')?.textContent || '');
    if (!cardName) return list[index];
    return list.find(player => norm(getPlayerName(player)) === cardName)
      || list.find(player => {
        const pn = norm(getPlayerName(player));
        return pn && (pn.includes(cardName) || cardName.includes(pn));
      })
      || list[index];
  }

  function activeRange() {
    return window.__TRENDING_ACTIVE_RANGE || document.querySelector('#top-pickups [data-trend-stat-range].active')?.dataset.trendStatRange || 'last7';
  }

  function setActiveRange(range) {
    window.__TRENDING_ACTIVE_RANGE = range;
    document.querySelectorAll('#top-pickups [data-trend-stat-range]').forEach(button => {
      const active = button.dataset.trendStatRange === range;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const tag = document.getElementById('availableStudsModeTag');
    if (tag) tag.textContent = RANGE_LABELS[range] || 'Stats';
  }

  function renderCard(card, player, range) {
    const statsEl = card.querySelector('.trend-v7-stats');
    if (!statsEl || !player) return;

    const renderedStats = readRenderedStats(card);
    const dataStats = findRangeStats(player, range);
    const stats = { ...renderedStats, ...dataStats };
    const chosen = isPitcher(player) ? choosePitcherStats(stats, player) : chooseHitterStats(stats);
    const rangeLabel = RANGE_LABELS[range] || 'Stats';

    let nextHtml = '';
    nextHtml = chosen.map(item => `
        <div class="trend-v7-stat trend-v7-stat-smart">
          <span class="trend-v7-stat-value">${item.value || '—'}</span>
          <span class="trend-v7-stat-label">${item.label || '—'}</span>
        </div>
      `).join('');

    if (statsEl.innerHTML.trim() !== nextHtml.trim()) statsEl.innerHTML = nextHtml;
    const head = card.querySelector('.trend-v7-stats-head');
    const hasRealStat = chosen.some(item => item.label !== '—' && item.value !== '—');
    const nextHeadText = hasRealStat ? `Best-fit highlights • ${rangeLabel}` : `No ${rangeLabel} split found`;
    if (head && head.textContent.trim() !== nextHeadText) head.textContent = nextHeadText;
  }

  function apply() {
    const range = activeRange();
    setActiveRange(range);
    document.querySelectorAll('#availableStudsGrid .trend-v7-card').forEach((card, index) => {
      renderCard(card, findPlayerForCard(card, index), range);
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#top-pickups [data-trend-stat-range]');
    if (!button) return;

    // Let scripts/category-leaders.js handle the range change first.
    // Then re-apply the smart highlight picker to the new active range.
    const nextRange = button.dataset.trendStatRange || 'last7';
    setActiveRange(nextRange);
    setTimeout(apply, 0);
    setTimeout(apply, 80);
    setTimeout(apply, 200);
    setTimeout(apply, 500);
    setTimeout(apply, 1000);
  });

  let timer;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 90);
  }

  window.addEventListener('load', () => {
    apply();
    setTimeout(apply, 300);
    setTimeout(apply, 900);
    setTimeout(apply, 1600);
  });
  document.addEventListener('DOMContentLoaded', () => {
    setActiveRange(activeRange());
    const grid = document.getElementById('availableStudsGrid');
    if (grid) new MutationObserver(schedule).observe(grid, { childList: true, subtree: true });
    apply();
  });
  window.applyTrendingBestRangeStats = apply;
  window.debugTrendingRangeStats = function () {
    return trendPlayers().map(player => ({
      name: getPlayerName(player),
      last7: Object.keys(findRangeStats(player, 'last7') || {}),
      last14: Object.keys(findRangeStats(player, 'last14') || {}),
      season: Object.keys(findRangeStats(player, 'season') || {})
    }));
  };
})();
