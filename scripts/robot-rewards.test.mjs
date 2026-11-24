import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const rewardSource = readFileSync(new URL('./robot-rewards.js', import.meta.url), 'utf8');
const scope = {};
new Function('window', rewardSource)(scope);
const { evaluate } = scope.UTIRobotRewards;
const pair = (week, win = true) => [
  { week, team: 'A', opponent: 'B', phase: 'regular', official_score_for: win ? 10 : 6, official_score_against: win ? 6 : 10, NSB: 3, AVG: .3, AB: 100, ERA: 2, WHIP: 1, IP: '50', K: 80, HR: 12 },
  { week, team: 'B', opponent: 'A', phase: 'regular', official_score_for: win ? 6 : 10, official_score_against: win ? 10 : 6, NSB: 1, AVG: .2, AB: 100, ERA: 4, WHIP: 1.3, IP: '50', K: 60, HR: 8 },
];
const find = (rewards, id) => rewards.find(item => item.id === id);
test('wins, consecutive streaks, category milestones, and earned week use completed results', () => {
  const rewards = evaluate('A', [1,2,3,4,5].flatMap(week => pair(week)));
  assert.equal(find(rewards,'flame').unlocked, true);
  assert.equal(find(rewards,'flame').earnedWeek, 3);
  assert.equal(find(rewards,'rickey').earnedWeek, 5);
  assert.equal(find(rewards,'ichiro').unlocked, true);
  assert.equal(find(rewards,'gold').progress, 5);
  assert.equal(find(rewards,'gold').unlocked, false);
  assert.equal(find(rewards,'headset').known, false);
});
test('gaps, ties, and losses interrupt streaks', () => {
  assert.equal(find(evaluate('A',[...pair(1),...pair(3),...pair(4)]),'flame').unlocked,false);
  const tied = pair(2).map(row => ({ ...row, official_score_for: 8, official_score_against: 8 }));
  assert.equal(find(evaluate('A',[...pair(1),...tied,...pair(3)]),'flame').unlocked,false);
  assert.equal(find(evaluate('A',[...pair(1),...pair(2,false),...pair(3)]),'flame').unlocked,false);
});
test('incomplete, duplicate, inconsistent, and playoff rows do not grant regular-season rewards', () => {
  for (const rows of [[pair(1)[0]], [...pair(1),pair(1)[0]], pair(1).map(row => ({ ...row, phase: 'playoffs' })), pair(1).map(row => ({ ...row, official_score_for: 0, official_score_against: 0 }))]) {
    assert.equal(find(evaluate('A',rows),'orb').unlocked,false);
  }
  const mismatched = pair(1); mismatched[1].official_score_for = 7;
  assert.equal(find(evaluate('A',mismatched),'orb').unlocked,false);
});
test('season trophies need recorded metadata for the specified year', () => {
  const finishes = [{ season: 2025, champion: 'A' },{ season: 2026, champion: 'B', runnerUp: 'A', regularSeasonFirst: 'B' }];
  assert.equal(find(evaluate('A',[],finishes,2026),'crown').unlocked,false);
  assert.equal(find(evaluate('A',[],finishes,2026),'silver').unlocked,true);
  assert.equal(find(evaluate('B',[],finishes,2026),'core').unlocked,true);
  assert.equal(find(evaluate('A',[],[],2026),'crown').known,false);
});
test('category ties and zero workload do not earn rate-category wins', () => {
  const rows = pair(1); rows[0].AVG = rows[1].AVG; rows[0].IP = 0;
  const rewards = evaluate('A',rows);
  assert.equal(find(rewards,'ichiro').progress,0);
  assert.equal(find(rewards,'clean').progress,0);
  assert.equal(find(rewards,'clean').known,false);
});
test('home-run league lead needs a full week; ties share the reward', () => {
  assert.equal(find(evaluate('A',pair(1)),'bonds').unlocked,false);
  const rows = pair(1);
  for(let i=0;i<4;i++) rows.push(...pair(1).map((row,j)=>({ ...row,team:`T${i}-${j}`,opponent:`T${i}-${1-j}`,HR:12 })));
  assert.equal(find(evaluate('A',rows),'bonds').unlocked,true);
  assert.equal(find(evaluate('T0-0',rows),'bonds').unlocked,true);
});
