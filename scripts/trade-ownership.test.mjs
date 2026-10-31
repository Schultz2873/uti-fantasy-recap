import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { players } from '../data/players.js';
import { reconcileRosters } from './trade-rosters.mjs';

test('the real analyzer search never restores dropped players from historical owners', () => {
  const html = fs.readFileSync(new URL('../tools/uti-trade-analyzer.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/\s+init\(\);\s*$/, '');
  const window = {};
  new Function('window', fs.readFileSync(new URL('../data/rosters.js', import.meta.url), 'utf8'))(window);
  const context = vm.createContext({ document: { getElementById: () => ({}) }, window, console, URL });
  vm.runInContext(script + `
    globalThis.analyzer = {
      setAssets: list => assetData = list,
      oldOwner: name => ownerLookup.set(normalizeName(name), 'Gunnarrhea'),
      search: () => getSearchMatches('', 'sideA'),
      owner: getFantasyOwner
    };
  `, context);
  const reconciled = reconcileRosters(players, window.UTI_ROSTERS);
  context.analyzer.setAssets(reconciled);
  for (const name of ['Spencer Jones', 'Kyle Stowers']) {
    context.analyzer.oldOwner(name);
    const player = reconciled.find(p => p.name === name);
    assert.ok(player);
    assert.equal(context.analyzer.owner(player), 'Free Agent');
    assert.ok(!context.analyzer.search().some(p => p.name === name));
  }
  assert.equal(context.analyzer.search().length, window.UTI_ROSTERS.teams.Gunnarrhea.length);
});
