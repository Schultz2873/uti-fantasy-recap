(() => {
  'use strict';

  const colors = { Teal: '#19d3c5', Orange: '#f59955', Purple: '#ad92ed', Blue: '#619eef' };
  const gear = {};
  const optionalSlots = ['eyes', 'shoulders', 'chest', 'back', 'feet', 'companion'];
  const slotLabels = { hat: 'Headwear', jersey: 'Jerseys', accessory: 'Hands', eyes: 'Visors', shoulders: 'Shoulders', chest: 'Power cores', back: 'Back', feet: 'Cleats', companion: 'Companions' };
  function refreshRewards() {
    const rewards = window.UTIRobotRewards?.evaluate(team, window.UTI_WEEKLY_TEAM_STATS || [], window.UTI_SEASON_RESULTS || [], 2026) || [];
    for (const group of Object.keys(slotLabels)) {
      gear[group] = rewards.filter(item => item.slot === group).map(item => ({ ...item, detail: item.requirement, available: item.unlocked }));
      if (optionalSlots.includes(group)) gear[group].unshift({ id: 'none', name: 'Unequipped', rarity: 'Common', detail: 'Leave this slot empty.', available: true, metric: 'starter', evidence: 'Optional slot' });
    }
    // Keep the locker usable if achievement data cannot load, without granting earned rewards.
    if (!rewards.length) {
      for (const [group, items] of Object.entries({ hat: ['cap', 'helmet'], jersey: ['home', 'away'], accessory: ['bat', 'glove'] })) gear[group] = items.map(id => ({ id, name: ({ cap: 'Team cap', helmet: 'Batting helmet', home: 'Home jersey', away: 'Away jersey', bat: 'Clubhouse bat', glove: 'Fielding glove' })[id], rarity: 'Common', detail: 'Starter gear', available: true, metric: 'starter', evidence: 'Starter gear' }));
    }
  }
  const teams = Object.keys(window.UTI_ROSTERS?.teams || {});
  if (!teams.length) teams.push('My team');
  const defaults = () => ({ robot: 'Slugger', color: 'Teal', hat: 'cap', jersey: 'home', accessory: 'bat', eyes: 'none', shoulders: 'none', chest: 'none', back: 'none', feet: 'none', companion: 'none' });
  const key = 'uti-robot-locker-v1';
  let saved = {};
  let storageAvailable = true;
  try { const raw = JSON.parse(localStorage.getItem(key) || '{}'); if (raw && typeof raw === 'object' && !Array.isArray(raw)) saved = raw; } catch { storageAvailable = false; }
  let team = teams[0];
  let slot = 'hat';
  let inventoryFilter = 'all';
  refreshRewards();
  let look;
  const el = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function validLook(value) {
    const next = defaults();
    if (!value || typeof value !== 'object') return next;
    // Slugger is the only supported body while equipment fitting is finalized.
    if (Object.hasOwn(colors, value.color)) next.color = value.color;
    for (const group of Object.keys(gear)) if (gear[group].some(item => item.id === value[group] && item.available)) next[group] = value[group];
    return next;
  }
  // Slugger-only fitting coordinates in the common 260 x 310 preview space.
  // Keep these explicit: head, face, torso, shoulders, hands, and feet have different anchors.
  const sluggerFit = {
    cap: [81, 9, 114, 62],
    crown: [81, 4, 114, 74], headset: [74, 38, 126, 94],
    jersey: [68, 115, 133, 101], glove: [195, 183, 56, 60], bat: [210, 109, 23, 132],
    eyes: [98, 56, 81, 48], shoulders: [20, 105, 220, 70],
    chest: [113, 157, 36, 36], feet: [70, 235, 130, 45],
    back: [42, 111, 177, 163], companion: [3, 127, 37, 45],
  };
  const itemCrops = {
    cap: [50, 70, 440, 360], helmet: [560, 45, 420, 405],
    home: [1060, 45, 440, 425], away: [40, 552, 450, 440],
    bat: [712, 522, 120, 485], glove: [1060, 552, 440, 430],
  };
  const hues = { Teal: 0, Orange: 205, Purple: 95, Blue: 45 };
  function gearSprite(id, box, color = 'Teal') {
    const crop = itemCrops[id];
    if (!crop) return '';
    const [x, y, width, height] = box;
    const tint = (id === 'home' || id === 'cap') ? ` style="filter:hue-rotate(${hues[color]}deg)"` : '';
    return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${crop.join(' ')}" preserveAspectRatio="none" overflow="hidden"${tint}><image href="assets/robots/robot-gear-v2.webp" width="1536" height="1024"/></svg>`;
  }
  function specialArt(id, color) {
    if (!id || id === 'none') return '';
    if (id === 'crown') return '<path d="M12 73 5 20 30 39 50 8 70 39 95 20 88 73Z" fill="#e4b94f" stroke="#ffe6a0" stroke-width="3"/><path d="M14 62H86" stroke="#9e6828" stroke-width="5"/><circle cx="50" cy="53" r="6" fill="#19d3c5"/>';
    if (id === 'silver') return '<path d="M7 53 9 25 20 9 32 15 37 41 32 63 19 70ZM63 41 68 15 80 9 91 25 93 53 81 70 68 63Z" fill="#a8bdcf" stroke="#eff6ff" stroke-width="2"/><path d="M12 32 21 20 29 24M71 24 79 20 88 32" fill="none" stroke="#506780" stroke-width="4"/>';
    if (id === 'core') return '<circle cx="50" cy="50" r="35" fill="#263951" stroke="#e4b94f" stroke-width="7"/><circle cx="50" cy="50" r="21" fill="#19d3c5"/><path d="M51 29 38 53H50L46 73 64 46H52Z" fill="#fff4b5"/>';
    if (id === 'cape') return `<path d="M31 8 12 90 50 80 88 90 69 8Z" fill="${color}" stroke="#99eee6" stroke-width="3"/><path d="M38 24 27 77M62 24 73 77" stroke="#071c33" opacity=".5" stroke-width="5"/>`;
    if (id === 'rickey' || id === 'boots') return `<path d="M12 41 14 19Q24 10 35 19L38 44Q46 54 46 75L43 85H4L3 73Q3 51 12 41ZM62 41 64 19Q75 10 85 19L88 44Q97 54 97 75L94 85H55L54 73Q54 51 62 41Z" fill="${id === 'rickey' ? '#bd9146' : '#557a9c'}" stroke="#cbd9e4" stroke-width="2"/><path d="M7 68Q24 53 43 68M58 68Q75 53 94 68" fill="none" stroke="${id === 'rickey' ? '#f4d584' : '#a5c9e8'}" stroke-width="8"/><path d="M6 83H43M57 83H94" stroke="#21354c" stroke-width="6"/><path d="M17 30H32M17 41H33M67 30H82M67 41H83" stroke="#24394c" stroke-width="3"/><path d="M9 87H15M33 87H40M60 87H66M84 87H91" stroke="${color}" stroke-width="3"/>`;
    if (id === 'orb') return `<circle cx="50" cy="45" r="27" fill="#eee8d7" stroke="#adc0d0" stroke-width="3"/><path d="M34 23Q55 45 34 67M66 23Q45 45 66 67" fill="none" stroke="#d96a55" stroke-width="3"/><ellipse cx="50" cy="82" rx="31" ry="5" fill="none" stroke="${color}" stroke-width="3"/>`;
    if (id === 'headset') return `<path d="M15 63V40Q15 5 50 5T85 40V63" fill="none" stroke="#92b4cc" stroke-width="8"/><rect x="7" y="42" width="18" height="31" rx="7" fill="${color}"/><rect x="75" y="42" width="18" height="31" rx="7" fill="${color}"/><path d="M82 68 68 84H49" fill="none" stroke="#92b4cc" stroke-width="5"/>`;
    return '';
  }
  function placedSpecial(id, box, color) {
    return `<svg class="robot-special robot-special-${id}" x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible">${specialArt(id,color)}</svg>`;
  }
  function equippedSprite(id, box, color) {
    const base = ({ gold: 'home', bonds: 'bat', ichiro: 'bat', ryan: 'glove', flame: 'bat' })[id] || id;
    const filter = ({ gold: 'grayscale(1) sepia(1) saturate(2.5)', bonds: 'sepia(.45) brightness(.72)', ichiro: 'brightness(1.3)', ryan: 'hue-rotate(165deg)', flame: 'drop-shadow(0 -3px 5px #ff8734)' })[id];
    return `<g${filter ? ` style="filter:${filter}"` : ''}>${gearSprite(base,box,color)}</g>`;
  }
  // Clothing and hand equipment are painted onto Slugger in complete poses.
  // Columns: home / away. Rows: fitted cap / bare head. Each cell is 627px square.
  function fittedOutfit(outfit) {
    const column = outfit.jersey === 'away' ? 1 : 0;
    const mitt = ['glove', 'ryan'].includes(outfit.accessory);
    const helmet = outfit.hat === 'helmet';
    // Helmet atlas rows are bat / mitt; other atlases use cap / bare head.
    const row = helmet ? (mitt ? 1 : 0) : outfit.hat === 'cap' ? 0 : 1;
    const x = column * 627;
    const y = row * 627;
    const atlas = helmet ? 'slugger-fitted-helmet-v1.webp' : mitt ? 'slugger-fitted-mitt-v2.webp' : 'slugger-fitted-bat-v1.webp';
    const image = `<image href="assets/robots/${atlas}" width="1254" height="1254"/>`;
    const paintOffset = helmet && mitt ? 20 : 0;
    const polygon = points => points.map(([px,py]) => `${(x+px)/1254*100}% ${(y+py+paintOffset)/1254*100}%`).join(',');
    const shirt = [[109,284],[126,247],[159,219],[211,206],[246,211],[276,222],[351,222],[389,210],[437,208],[mitt ? 482 : 451,223],[mitt ? 517 : 451,253],[mitt ? 542 : 449,285],[mitt ? 505 : 438,310],[438,320],[438,430],[mitt ? 410 : 432,446],[392,458],[320,466],[250,459],[199,444],[178,427],[171,309],[145,326],[111,306]];
    const cap = [[210,89],[225,38],[281,9],[344,9],[405,37],[433,102],[389,104],[355,89],[275,90],[239,112]];
    const colored = (points,filter) => `<image href="assets/robots/${atlas}" width="1254" height="1254" style="clip-path:polygon(${polygon(points)});filter:${filter}"/>`;
    const shirtFilter = outfit.jersey === 'gold' ? 'grayscale(1) sepia(1) saturate(2.5)' : `hue-rotate(${hues[outfit.color]}deg)`;
    const tintShirt = outfit.jersey === 'gold' || (column === 0 && outfit.color !== 'Teal');
    const tintCap = outfit.hat === 'cap' && outfit.color !== 'Teal';
    // Finishes apply only to the rendered equipment, preserving the fingers, cuff, and metal arm.
    const equipment = mitt
      ? [[470,397],[515,405],[540,431],[534,477],[487,510],[443,512],[416,479],[415,450],[441,420]]
      : [[475,109],[517,105],[537,129],[530,179],[507,292],[490,309],[464,299],[463,270]];
    const finish = ({ bonds: 'sepia(.5) brightness(.72)', ichiro: 'brightness(1.25)', ryan: 'hue-rotate(165deg)', flame: 'saturate(1.8) brightness(1.12) drop-shadow(0 0 5px #ff8734)' })[outfit.accessory];
    return {
      body: `<svg x="0" y="25" width="260" height="260" viewBox="${x} ${y} 627 627" overflow="hidden">${image}${tintShirt ? colored(shirt,shirtFilter) : ''}${tintCap ? colored(cap,`hue-rotate(${hues[outfit.color]}deg)`) : ''}${finish ? colored(equipment,finish) : ''}</svg>`,
    };
  }
  // Render the visor as part of Slugger's head, with separate cap/helmet/bare-head variants.
  // Atlas columns: cap, helmet, bare. Rows: gold optical housing, upgraded gunmetal housing.
  function opticHead(outfit) {
    if (!['clean', 'precision'].includes(outfit.eyes)) return '';
    const column = outfit.hat === 'cap' ? 0 : outfit.hat === 'helmet' ? 1 : 2;
    const row = outfit.eyes === 'precision' ? 1 : 0;
    const x = column * 512;
    const y = row * 512;
    const image = '<image href="assets/robots/slugger-optic-visors-v1.webp" width="1536" height="1024"/>';
    const capClip = [[80,145],[105,95],[145,60],[220,40],[300,45],[370,75],[415,130],[440,185],[400,205],[350,190],[255,170],[180,175],[130,205],[90,200]].map(([px,py]) => `${(x+px)/1536*100}% ${(y+py)/1024*100}%`).join(',');
    const tint = column === 0 && outfit.color !== 'Teal' ? `<image href="assets/robots/slugger-optic-visors-v1.webp" width="1536" height="1024" style="clip-path:polygon(${capClip});filter:hue-rotate(${hues[outfit.color]}deg)"/>` : '';
    const top = outfit.hat === 'helmet' && ['glove','ryan'].includes(outfit.accessory) ? 20 : 12;
    return `<svg class="robot-optic-head" x="61" y="${top}" width="144" height="118" viewBox="${x} ${y} 512 512" preserveAspectRatio="none" overflow="hidden">${image}${tint}</svg>`;
  }
  function robotArt(outfit, label) {
    const fit = sluggerFit;
    const fitted = fittedOutfit(outfit);
    const color = colors[outfit.color];
    const body = fitted.body;
    const decorations = [
      [outfit.shoulders,fit.shoulders],
      [outfit.chest,fit.chest],
      [outfit.feet,fit.feet],
      [outfit.companion,fit.companion],
    ].filter(([id])=>id && id !== 'none').map(([id,box])=>placedSpecial(id,box,color)).join('');
    return `<svg viewBox="0 0 260 310" role="img" aria-label="${escape(label)}"><ellipse cx="130" cy="287" rx="81" ry="10" fill="#050c18"/><ellipse cx="130" cy="286" rx="65" ry="7" fill="none" stroke="${color}" opacity=".5"/>${outfit.back === 'cape' ? placedSpecial('cape',fit.back,color) : ''}${body}${opticHead(outfit)}${outfit.hat === 'crown' ? placedSpecial('crown',fit.crown,color) : ''}${outfit.hat === 'headset' ? placedSpecial('headset',fit.headset,color) : ''}${decorations}</svg>`;
  }
  function itemArt(group, id) {
    if (['clean','precision'].includes(id)) return `<svg viewBox="1024 ${id === 'precision' ? 620 : 108} 512 352" aria-hidden="true"><image href="assets/robots/slugger-optic-visors-v1.webp" width="1536" height="1024"/></svg>`;
    if (id === 'helmet') return '<svg viewBox="172 0 306 215" aria-hidden="true"><image href="assets/robots/slugger-fitted-helmet-v1.webp" width="1254" height="1254"/></svg>';
    if (id === 'none') return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="25" fill="none" stroke="#7f91a9" stroke-width="2" stroke-dasharray="5 5"/><path d="M35 50H65" stroke="#7f91a9" stroke-width="3"/></svg>';
    const base = ({ gold: 'home', bonds: 'bat', ichiro: 'bat', ryan: 'glove', flame: 'bat' })[id] || id;
    if (itemCrops[base]) return `<svg viewBox="0 0 140 110" aria-hidden="true">${equippedSprite(id,base === 'bat' ? [57,3,26,102] : [15,6,110,98],look.color)}</svg>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${specialArt(id,colors[look.color])}</svg>`;
  }
  function persist(message) {
    saved[team] = { ...look };
    try { localStorage.setItem(key, JSON.stringify(saved)); storageAvailable = true; } catch { storageAvailable = false; }
    render();
    el('lockerStatus').textContent = storageAvailable ? `${message} Saved on this browser.` : `${message} Browser storage is unavailable; this look will reset after refresh.`;
  }
  function render() {
    el('robotPreview').innerHTML = robotArt(look, `${look.robot} wearing your selected gear`);
    el('robotName').textContent = look.robot;
    el('outfitDescription').textContent = Object.keys(gear).filter(group => look[group] !== 'none').map(group => gear[group].find(item => item.id === look[group]).name).join(' · ');
    el('colorChoices').innerHTML = Object.entries(colors).map(([name, color]) => `<button type="button" data-color="${name}" style="--swatch:${color}" aria-label="${name}" aria-pressed="${look.color === name}"></button>`).join('');
    const visible = gear[slot].filter(item => inventoryFilter === 'all' || (inventoryFilter === 'equipped' ? look[slot] === item.id : inventoryFilter === 'unlocked' ? item.available : !item.available));
    el('gearGrid').innerHTML = visible.length ? visible.map(item => `<button type="button" class="gear-item rarity-${item.rarity.toLowerCase()}" data-item="${item.id}" ${item.available ? `aria-pressed="${look[slot] === item.id}"` : 'disabled'}>${itemArt(slot,item.id)}<span class="rarity-label">${item.rarity}</span><strong>${escape(item.name)}</strong><small>${escape(item.detail)}</small><span class="item-state">${!item.available ? 'LOCKED' : look[slot] === item.id ? 'EQUIPPED' : item.metric === 'starter' ? 'STARTER GEAR' : 'EARNED'}</span><small>${escape(item.evidence || '')}</small>${!item.available && item.known ? `<progress value="${Math.min(item.progress,item.target)}" max="${item.target}" aria-label="${escape(item.name)} progress"></progress>` : ''}</button>`).join('') : '<p class="gear-empty">No items in this view. Try another filter or slot.</p>';
    const achievements = Object.values(gear).flat().filter(item => item.metric !== 'starter');
    const unlocked = achievements.filter(item => item.available);
    el('achievementSummary').textContent = `${unlocked.length} of ${achievements.length} rewards earned · 2026 archive`;
    el('achievementList').innerHTML = achievements.map(item => `<article class="achievement-row"><span class="rarity-dot rarity-${item.rarity.toLowerCase()}" aria-hidden="true"></span><div><strong>${escape(item.name)}</strong><p>${escape(item.detail)}</p><small>${item.available ? 'Earned ' : ''}${escape(item.evidence || '')} · ${slotLabels[item.slot]} · ${item.rarity}</small></div><span class="achievement-state">${item.available ? 'Earned' : item.known ? `${Math.min(item.progress,item.target)} / ${item.target}` : 'Not verified'}</span></article>`).join('');
    el('equipmentSlots').innerHTML = Object.entries(slotLabels).map(([group, name]) => `<div><span>${name}</span><strong>${escape(gear[group].find(item => item.id === look[group])?.name || 'Unequipped')}</strong></div>`).join('');
    el('matchupRobot').innerHTML = robotArt(look, 'Your equipped matchup robot');
    el('opponentRobot').innerHTML = robotArt({ ...defaults(), robot: 'Slugger', color: 'Orange', hat: 'helmet', jersey: 'away', accessory: 'glove' }, 'Example opponent robot');
    el('matchupTeam').textContent = team;
  }
  el('lockerTeam').innerHTML = teams.map(name => `<option value="${escape(name)}">${escape(name)}</option>`).join('');
  el('lockerTeam').addEventListener('change', event => { team = event.target.value; refreshRewards(); look = validLook(saved[team]); el('lockerStatus').textContent = ''; render(); });
  el('colorChoices').addEventListener('click', event => { const button = event.target.closest('[data-color]'); if (button) { look.color = button.dataset.color; persist('Color updated.'); } });
  document.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => {
    slot = button.dataset.slot;
    document.querySelectorAll('[data-slot]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    render();
  }));
  el('gearGrid').addEventListener('click', event => { const button = event.target.closest('[data-item]'); const item = gear[slot].find(entry => entry.id === button?.dataset.item); if (item?.available) { look[slot] = item.id; persist(`${item.name} equipped.`); } });
  el('inventoryFilter').addEventListener('change', event => { inventoryFilter = event.target.value; render(); });
  el('resetLook').addEventListener('click', () => { look = defaults(); persist('Look reset.'); });
  look = validLook(saved[team]);
  render();
  el('lockerStatus').textContent = storageAvailable ? 'Outfits save on this browser. Achievement progress uses the 2026 league archive.' : 'Browser storage is unavailable. You can still try on gear.';
})();
