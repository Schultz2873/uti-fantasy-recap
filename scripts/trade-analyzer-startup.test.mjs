import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('team dropdowns populate even when the tier module fails to load', async () => {
  const html = readFileSync(new URL('../tools/uti-trade-analyzer.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const nodes = new Map();
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: '', hidden: true, value: '' });
    return nodes.get(id);
  } };
  let requested;
  const loadModule = async url => {
    requested = url;
    throw new Error('Simulated tier module loading failure');
  };
  const run = new Function('document', 'window', 'loadModule', 'console',
    script.replace(/\bimport\(/g, 'loadModule(').replace(/\binit\(\);\s*$/, 'return init();'));
  await run(document, { FANTASY_OWNERS: {} }, loadModule, { error() {} });
  for (const id of ['sideATeamSelect', 'sideBTeamSelect']) {
    assert.equal((nodes.get(id).innerHTML.match(/<option /g) || []).length, 10);
    assert.match(nodes.get(id).innerHTML, /Gunnarrhea/);
  }
  assert.equal(nodes.get('sideATeamSelect').value, 'Gunnarrhea');
  assert.equal(nodes.get('sideBTeamSelect').value, 'Dixon Cider');
  assert.match(requested, /baseball-tiers\.mjs\?v=/);
  assert.equal(nodes.get('loadError').hidden, false);
  assert.match(nodes.get('loadError').innerHTML, /Simulated tier module loading failure/);
});
