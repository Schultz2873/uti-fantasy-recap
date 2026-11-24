import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./robot-locker.js', import.meta.url), 'utf8');
function mount(storage, extras = {}) {
  const nodes = new Map();
  const make = () => ({ innerHTML: '', textContent: '', dataset: {}, listeners: {},
    addEventListener(type, fn) { this.listeners[type] = fn; }, setAttribute() {} });
  const tabs = ['hat', 'jersey', 'accessory', 'eyes', 'shoulders', 'chest', 'back', 'feet', 'companion'].map(slot => Object.assign(make(), { dataset: { slot } }));
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, make());
    return nodes.get(id);
  }, querySelectorAll() { return tabs; } };
  new Function('document', 'window', 'localStorage', source)(document, { UTI_ROSTERS: { teams: { Alpha: [], Beta: [] } }, ...extras }, storage);
  return { nodes, tabs, click(id, dataset) { nodes.get(id).listeners.click({ target: { closest: () => ({ dataset }) } }); } };
}
test('outfits persist by team, restore on reload, and reject locked gear', () => {
  let value;
  const storage = { getItem: () => value || null, setItem: (_, next) => { value = next; } };
  const app = mount(storage);
  app.click('gearGrid', { item: 'helmet' });
  assert.equal(JSON.parse(value).Alpha.hat, 'helmet');
  app.click('gearGrid', { item: 'crown' });
  assert.equal(JSON.parse(value).Alpha.hat, 'helmet');
  app.nodes.get('lockerTeam').listeners.change({ target: { value: 'Beta' } });
  app.click('colorChoices', { color: 'Orange' });
  assert.equal(JSON.parse(value).Beta.robot, 'Slugger');
  assert.equal(JSON.parse(value).Beta.color, 'Orange');
  assert.equal(JSON.parse(value).Alpha.robot, 'Slugger');
  assert.match(mount(storage).nodes.get('outfitDescription').textContent, /Batting helmet/);
});

test('earned gear equips and team switching rechecks source eligibility', () => {
  const rewards = {};
  new Function('window', readFileSync(new URL('./robot-rewards.js', import.meta.url), 'utf8'))(rewards);
  let value;
  const app = mount({ getItem: () => value || null, setItem: (_, next) => { value = next; } }, {
    UTIRobotRewards: rewards.UTIRobotRewards,
    UTI_SEASON_RESULTS: [{ season: 2026, champion: 'Alpha', runnerUp: 'Beta' }],
  });
  app.click('gearGrid', { item: 'crown' });
  assert.equal(JSON.parse(value).Alpha.hat, 'crown');
  assert.match(app.nodes.get('outfitDescription').textContent, /Champion crown/);
  app.nodes.get('lockerTeam').listeners.change({ target: { value: 'Beta' } });
  app.click('gearGrid', { item: 'crown' });
  assert.match(app.nodes.get('outfitDescription').textContent, /Team cap/);
  app.tabs[4].listeners.click();
  app.click('gearGrid', { item: 'silver' });
  assert.equal(JSON.parse(value).Beta.shoulders, 'silver');
  assert.match(app.nodes.get('robotPreview').innerHTML, /robot-special-silver/);
  app.nodes.get('lockerTeam').listeners.change({ target: { value: 'Alpha' } });
  assert.match(app.nodes.get('outfitDescription').textContent, /Champion crown/);
});
test('unavailable storage still allows trying on gear', () => {
  const app = mount({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  app.click('gearGrid', { item: 'helmet' });
  assert.match(app.nodes.get('outfitDescription').textContent, /Batting helmet/);
  assert.match(app.nodes.get('lockerStatus').textContent, /unavailable/);
});
test('saved locked items and unknown options reset to valid starter gear', () => {
  const app = mount({ getItem: () => JSON.stringify({ Alpha: { robot: 'Unknown', color: 'Unknown', hat: 'crown', jersey: 'gold', accessory: 'flame' } }), setItem() {} });
  assert.equal(app.nodes.get('robotName').textContent, 'Slugger');
  assert.match(app.nodes.get('outfitDescription').textContent, /Team cap/);
  assert.doesNotMatch(app.nodes.get('outfitDescription').textContent, /Gold|Flaming|crown/);
});

test('Slugger fits every catalog item, including optional slots and locked-item art', () => {
  const rewards = {};
  new Function('window', readFileSync(new URL('./robot-rewards.js', import.meta.url), 'utf8'))(rewards);
  // Fitting fixture only: eligibility is independently tested in robot-rewards.test.mjs.
  const catalog = rewards.UTIRobotRewards.catalog;
  const app = mount({ getItem: () => null, setItem() {} }, {
    UTIRobotRewards: { evaluate: () => catalog.map(item => ({ ...item, unlocked: true, known: true, progress: item.target, evidence: 'Fitting test' })) },
  });
  const slots = ['hat', 'jersey', 'accessory', 'eyes', 'shoulders', 'chest', 'back', 'feet', 'companion'];
  for (const item of catalog) {
    app.tabs[slots.indexOf(item.slot)].listeners.click();
    app.click('gearGrid', { item: item.id });
    assert.equal(app.nodes.get('robotName').textContent, 'Slugger');
    assert.match(app.nodes.get('outfitDescription').textContent, new RegExp(item.name));
    assert.match(app.nodes.get('robotPreview').innerHTML, /slugger-fitted-(bat-v1|mitt-v2|helmet-v1)\.webp/);
    assert.doesNotMatch(app.nodes.get('robotPreview').innerHTML, /undefined|NaN/);
  }
});

test('saved alternate robots migrate to Slugger without losing valid equipment', () => {
  const app = mount({ getItem: () => JSON.stringify({ Alpha: { robot: 'Glitch', hat: 'helmet', jersey: 'away', accessory: 'glove', color: 'Purple' } }), setItem() {} });
  assert.equal(app.nodes.get('robotName').textContent, 'Slugger');
  assert.match(app.nodes.get('outfitDescription').textContent, /Batting helmet.*Away jersey.*Fielding glove/);
  assert.doesNotMatch(app.nodes.get('robotPreview').innerHTML, /undefined|NaN/);
});

test('cap and jerseys use complete fitted renders without standalone clothing overlays', () => {
  const app = mount({ getItem: () => null, setItem() {} });
  let art = app.nodes.get('robotPreview').innerHTML;
  assert.match(art, /slugger-fitted-(bat-v1|mitt-v2|helmet-v1)\.webp/);
  assert.match(art, /viewBox="0 0 627 627"/);
  assert.doesNotMatch(art, /viewBox="50 70 440 360"|viewBox="1060 45 440 425"|robot-bodies-v1\.png/);
  app.tabs[1].listeners.click();
  app.click('gearGrid', { item: 'away' });
  art = app.nodes.get('robotPreview').innerHTML;
  assert.match(art, /viewBox="627 0 627 627"/);
  app.tabs[0].listeners.click();
  app.click('gearGrid', { item: 'helmet' });
  art = app.nodes.get('robotPreview').innerHTML;
  assert.match(art, /viewBox="627 0 627 627"/);
  app.tabs[1].listeners.click();
  app.click('gearGrid', { item: 'home' });
  assert.match(app.nodes.get('robotPreview').innerHTML, /viewBox="0 0 627 627"/);
});

test('bat and mitt poses replace floating accessory sprites for every hand item', () => {
  const rewards = {};
  new Function('window', readFileSync(new URL('./robot-rewards.js', import.meta.url), 'utf8'))(rewards);
  const app = mount({ getItem: () => null, setItem() {} }, {
    UTIRobotRewards: { evaluate: () => rewards.UTIRobotRewards.catalog.map(item => ({ ...item, unlocked: true, known: true, evidence: 'Fitting fixture' })) },
  });
  app.tabs[2].listeners.click();
  for (const id of ['bat', 'bonds', 'ichiro', 'flame', 'glove', 'ryan']) {
    app.click('gearGrid', { item: id });
    const art = app.nodes.get('robotPreview').innerHTML;
    assert.match(art, ['glove','ryan'].includes(id) ? /slugger-fitted-mitt-v2\.webp/ : /slugger-fitted-bat-v1\.webp/);
    assert.doesNotMatch(art, /robot-gear-v2\.webp|slugger-fitted-outfits-v1\.png|undefined|NaN/);
    // No small standalone glove, bat, or finger-patch viewport remains in the character.
    assert.doesNotMatch(art, /viewBox="712 522 120 485"|viewBox="1060 552 440 430"|125\.4 115\.75/);
  }
});

test('fitted helmet selects the correct complete pose for both jerseys and all hand items', () => {
  const rewards = {};
  new Function('window', readFileSync(new URL('./robot-rewards.js', import.meta.url), 'utf8'))(rewards);
  const app = mount({ getItem: () => null, setItem() {} }, {
    UTIRobotRewards: { evaluate: () => rewards.UTIRobotRewards.catalog.map(item => ({ ...item, unlocked: true, known: true, evidence: 'Fitting fixture' })) },
  });
  app.click('gearGrid', { item: 'helmet' });
  for (const jersey of ['home', 'away', 'gold']) {
    app.tabs[1].listeners.click();
    app.click('gearGrid', { item: jersey });
    app.tabs[2].listeners.click();
    for (const accessory of ['bat', 'bonds', 'ichiro', 'flame', 'glove', 'ryan']) {
      app.click('gearGrid', { item: accessory });
      const art = app.nodes.get('robotPreview').innerHTML;
      const column = jersey === 'away' ? 627 : 0;
      const row = ['glove','ryan'].includes(accessory) ? 627 : 0;
      assert.match(art, /slugger-fitted-helmet-v1\.webp/);
      assert.match(art, new RegExp(`viewBox="${column} ${row} 627 627"`));
      assert.doesNotMatch(art, /robot-gear-v2\.webp|undefined|NaN/);
    }
  }
});

test('optic visor heads use fitted headwear variants and disappear when unequipped', () => {
  const rewards = {};
  new Function('window', readFileSync(new URL('./robot-rewards.js', import.meta.url), 'utf8'))(rewards);
  const app = mount({ getItem: () => null, setItem() {} }, {
    UTIRobotRewards: { evaluate: () => rewards.UTIRobotRewards.catalog.map(item => ({ ...item, unlocked: true, known: true, evidence: 'Fitting fixture' })) },
  });
  for (const eyes of ['clean','precision']) {
    app.tabs[3].listeners.click();
    app.click('gearGrid', { item: eyes });
    for (const hat of ['cap','helmet','crown','headset']) {
      app.tabs[0].listeners.click();
      app.click('gearGrid', { item: hat });
      const art = app.nodes.get('robotPreview').innerHTML;
      const column = hat === 'cap' ? 0 : hat === 'helmet' ? 512 : 1024;
      const row = eyes === 'precision' ? 512 : 0;
      assert.match(art, /slugger-optic-visors-v1\.webp/);
      assert.match(art, new RegExp(`viewBox="${column} ${row} 512 512"`));
      assert.doesNotMatch(art, /robot-special-clean|robot-special-precision|undefined|NaN/);
    }
  }
  app.tabs[3].listeners.click();
  app.click('gearGrid', { item: 'none' });
  assert.doesNotMatch(app.nodes.get('robotPreview').innerHTML, /robot-optic-head|slugger-optic-visors/);
});
