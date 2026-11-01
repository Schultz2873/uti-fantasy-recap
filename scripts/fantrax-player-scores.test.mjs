import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlayerExport, applyExportScore } from './fantrax-player-scores.mjs';
import { fantraxPlayerScores } from '../data/fantrax-player-scores.js';

test('actual Vargas score is used exactly without rank-to-points conversion', () => {
  const p = applyExportScore({ name: 'Miguel Vargas', dynastyValue: 52, mlbTeam: 'CWS', dynastyRank: 71 }, fantraxPlayerScores);
  assert.equal(p.dynastyValue, 94.53);
  assert.equal(p.dynastyEstimate, 52);
  assert.equal(p.performanceRank, 4);
  assert.equal(p.leagueAdjustment, 0);
  assert.equal(p.performanceStats.BB, 101);
});

test('two-way assets retain separate hitter and pitcher scores', () => {
  assert.equal(applyExportScore({ name: 'Shohei Ohtani-H' }, fantraxPlayerScores).dynastyValue, 80.31);
  assert.equal(applyExportScore({ name: 'Shohei Ohtani-P' }, fantraxPlayerScores).dynastyValue, 83.82);
});

test('missing 2026 production never falls back to a dynasty estimate', () => {
  const player = applyExportScore({ name: 'Unlisted Prospect', dynastyValue: 85 }, fantraxPlayerScores);
  assert.equal(player.dynastyValue, null);
  assert.equal(player.dynastyEstimate, 85);
});

test('zero actual scores remain zero while blank ranks are unrated', () => {
  const csv = 'ID,Player,Team,Position,RkOv,Score,R,HR,RBI,BB,SO,SBN,AVG,TB\n"id",Test,AAA,OF,100,0,0,0,0,0,0,0,0,0';
  assert.equal(parsePlayerExport(csv, 'hitter')[0].score, 0);
  assert.equal(parsePlayerExport(csv.replace('OF,100,0', 'OF,,0'), 'hitter')[0].score, null);
  assert.throws(() => parsePlayerExport(csv.replace('RkOv', 'Other'), 'hitter'), /Missing export column/);
  assert.throws(() => parsePlayerExport(csv.replace('OF,100,0', 'OF,100,abc'), 'hitter'), /Invalid/);
});
