import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reconcileRosters, rosterName } from './trade-rosters.mjs';
import { players, calculateDynastyValue } from '../data/players.js';

test('every saved roster player is available on the correct team', () => {
  const window = {};
  new Function('window', fs.readFileSync(new URL('../data/rosters.js', import.meta.url), 'utf8'))(window);
  const reconciled = reconcileRosters(players, window.UTI_ROSTERS);
  for (const [team, rows] of Object.entries(window.UTI_ROSTERS.teams)) {
    for (const row of rows) {
      assert.ok(reconciled.some(p => p.fantasyTeam === team && [p.name, ...(p.aliases || [])].some(name => rosterName(name) === rosterName(row[2]))), `${row[2]} missing from ${team}`);
    }
  }
});

test('missing valuations are visible and not assigned invented zero-point ratings', () => {
  const result = reconcileRosters([], { teams: { Team: [['OF', 'ACTIVE', 'Missing Player', 'MLB', 'OF', 123]] } });
  assert.equal(result.length, 1);
  assert.equal(result[0].dynastyValue, null);
  assert.equal(result[0].tier, 'Unrated');
});

test('live roster assignments override historical ownership without merging two-way roles', () => {
  const p = [{ id: 1, name: 'Shohei Ohtani-H', fantasyTeam: 'Old' }, { id: 2, name: 'Shohei Ohtani-P', fantasyTeam: 'Old' }];
  const result = reconcileRosters(p, { teams: { A: [['DH', 'ACTIVE', 'Shohei Ohtani-H']], B: [['SP', 'ACTIVE', 'Shohei Ohtani-P']] } });
  assert.equal(result[0].fantasyTeam, 'A');
  assert.equal(result[1].fantasyTeam, 'B');
});

test('observed production does not overwrite dynasty estimates for prospects or veterans', () => {
  for (const name of ['Konnor Griffin', 'Roman Anthony', 'Colt Emerson', 'Aaron Judge']) {
    const player = players.find(p => p.name === name);
    assert.ok(player);
    assert.equal(player.dynastyValue, calculateDynastyValue(player).dynastyValue);
  }
});
