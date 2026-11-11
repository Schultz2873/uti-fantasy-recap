import { fantraxHQRankings } from '../data/fantraxhq-rankings.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const teams = window.UTI_DRAFT_ORDER.picks;
const teamCodes = ['BTA','YDKB','MAC','MSH','BB','DC','JST','MIZ','GUN','GGM'];
const key = `uti-draft-night-${window.UTI_DRAFT_ORDER.season}-v1`;
const display = new URLSearchParams(location.search).has('display');
document.body.classList.toggle('display', display);
const rosterFor = team => Object.entries(window.UTI_ROSTERS.teams).find(([name]) => norm(name) === norm(team))?.[1] || [];
const initial = () => ({phase:'minor',turn:{minor:0,auction:0},events:[],setup:Object.fromEntries(teams.map(team => {
  const roster = rosterFor(team);
  return [team,{minor:roster.filter(p => p[1] === 'MINORS').length,active:roster.filter(p => !['MINORS','INJURED_RESERVE'].includes(p[1])).length,purchases:0}];
})),timer:{seconds:120,remaining:120,ends:null}});
let state = initial();
function validSession(s) {
  return s && ['minor','auction'].includes(s.phase) && ['minor','auction'].every(p => Number.isInteger(s.turn?.[p]) && s.turn[p] >= 0)
    && teams.every(t => ['minor','active','purchases'].every(f => Number.isInteger(s.setup?.[t]?.[f]) && s.setup[t][f] >= 0))
    && Array.isArray(s.events) && s.events.every(e => teams.includes(e.team) && ['minor','auction'].includes(e.phase) && ['pass','pick'].includes(e.type) && (e.type === 'pass' || (typeof e.player === 'string' && e.player.trim() && Number.isInteger(e.price) && e.price >= 0)))
    && Number.isFinite(s.timer?.seconds) && s.timer.seconds >= 10 && s.timer.seconds <= 3600 && Number.isFinite(s.timer.remaining) && s.timer.remaining >= 0 && (s.timer.ends === null || Number.isFinite(s.timer.ends));
}
try { const saved = JSON.parse(localStorage.getItem(key)); if (saved && validSession(saved)) state = saved; else if (saved) throw new Error('Invalid session'); } catch { $('message').textContent = 'Saved session could not be read. Export backups regularly.'; }
let history = [];
const owned = new Set(Object.values(window.UTI_ROSTERS.teams).flat().map(p => norm(p[2])));
const current = () => teams[state.turn[state.phase] % teams.length];
const picksFor = team => state.events.filter(e => e.team === team && e.type === 'pick');
function totals(team) {
  const picks = picksFor(team);
  return {minor:state.setup[team].minor + picks.filter(e => e.phase === 'minor').length,active:state.setup[team].active + picks.filter(e => e.phase === 'auction').length,budget:150 + state.setup[team].purchases * 50 - picks.reduce((sum,e) => sum + (e.price || 0),0)};
}
function save() {
  try { localStorage.setItem(key,JSON.stringify(state)); return true; }
  catch { $('message').textContent = 'Could not save in this browser. Export a backup before leaving.'; return false; }
}
function change(fn) {
  if (display) return;
  history.push(JSON.stringify(state));
  fn(); save(); render();
}
function available() {
  const selected = new Set(state.events.filter(e => e.type === 'pick').map(e => norm(e.player)));
  return fantraxHQRankings.players.filter(p => !owned.has(norm(p.name)) && !selected.has(norm(p.name)));
}
function renderPlayers() {
  const query = $('search').value.toLowerCase();
  $('players').innerHTML = available().sort((a,b) => a.rank-b.rank).filter(p => `${p.name} ${p.position} ${p.team}`.toLowerCase().includes(query)).slice(0,100).map(p => `<div class="player-row"><span class="player-rank">${p.rank}</span><span class="player-name"><strong>${esc(p.name)}</strong></span><span class="player-position">${esc(p.position)}</span><span class="player-mlb">${esc(p.team)}</span>${display ? '' : `<button type="button" data-player="${esc(p.name)}" aria-label="Select ${esc(p.name)}">+</button>`}</div>`).join('') || '<p>No matching available ranked players.</p>';
  $('playerOptions').innerHTML = available().map(p => `<option value="${esc(p.name)}"></option>`).join('');
}
function renderBoard() {
  const filter = $('boardPhase').value || 'all';
  const phases = filter === 'all' ? ['minor','auction'] : [filter];
  const counters = {minor:0,auction:0};
  const events = state.events.map(e => ({...e,round:Math.floor(counters[e.phase]++/teams.length)+1}));
  const rows = phases.map(phase => {
    const roundCount = Math.max(phase === 'minor' ? 7 : 1,Math.floor(state.turn[phase]/teams.length)+1,...events.filter(e => e.phase === phase).map(e => e.round));
    return Array.from({length:roundCount},(_,i) => `<tr><th scope="row" title="${phase === 'minor' ? 'Prospect' : 'Auction'} round ${i+1}">${filter === 'all' ? `<small>${phase === 'minor' ? 'MIN' : 'AUC'}</small>` : ''}R${i+1}</th>${teams.map(team => {
      const entries = events.filter(e => e.phase === phase && e.round === i+1 && e.team === team);
      const onClock = state.phase === phase && current() === team && Math.floor(state.turn[phase]/teams.length) === i;
      return `<td class="${onClock ? 'on-clock' : ''}">${entries.map(e => e.type === 'pass' ? '<span class="passed">Pass / next</span>' : `<div class="selection"><strong>${esc(e.player)}</strong><small>${e.phase === 'auction' ? `$${e.price}` : esc(fantraxHQRankings.players.find(p => norm(p.name) === norm(e.player))?.position || 'Prospect')}</small></div>`).join('') || (onClock ? '<span class="clock-label">On clock</span>' : '<span class="empty">—</span>')}</td>`;
    }).join('')}</tr>`).join('');
  }).join('');
  $('board').innerHTML = `<table class="draft-table"><caption class="sr-only">All selections by team and round. Auction rounds follow nomination turns; a team may win multiple players in one round.</caption><thead><tr><th scope="col">Rd</th>${teams.map((team,index) => { const t=totals(team);return `<th scope="col" title="${esc(team)} · $${t.budget} · ${t.active}/30 active · ${t.minor}/7 minors"><span class="draft-order-number">${index + 1}</span><abbr title="${esc(team)}">${esc(teamCodes[index] || team)}</abbr><span class="draft-team-name">${esc(team)}</span></th>`; }).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  $('recent').innerHTML = state.events.filter(e => e.type === 'pick').map((e,i) => ({...e,number:i+1})).slice(-6).reverse().map(e => `<li><span class="pick-badge">#${e.number}</span><div><strong>${esc(e.player)}</strong><small>${esc(e.team)}</small><small>${e.phase === 'minor' ? 'Prospect' : `Auction · $${e.price}`}</small></div></li>`).join('') || '<li class="empty">Selections will appear here as they are recorded.</li>';
}
function render() {
  document.body.dataset.phase = state.phase;
  $('season').textContent = window.UTI_DRAFT_ORDER.season;
  $('phase').value = state.phase;
  const team = current();
  const turn = state.turn[state.phase];
  $('clockLabel').textContent = state.phase === 'minor' ? 'On the clock' : 'Up to nominate';
  $('phaseLabel').textContent = `Round ${Math.floor(turn / teams.length) + 1} · ${state.phase === 'minor' ? 'Pick' : 'Nomination'} ${turn+1}`;
  $('spotlight').textContent = team;
  $('stageDetail').textContent = `On deck: ${teams[(turn+1)%teams.length]}`;
  $('pickCount').textContent = `${state.events.filter(e => e.type === 'pick').length} players selected`;
  renderBoard();
  $('setup').innerHTML = teams.map((name,index) => `<div class="setup-row"><strong>${esc(name)}</strong><label>Active <input aria-label="${esc(name)} active count" data-team="${index}" data-field="active" type="number" min="0" max="30" value="${state.setup[name].active}"></label><label>Minors <input aria-label="${esc(name)} minor count" data-team="${index}" data-field="minor" type="number" min="0" max="7" value="${state.setup[name].minor}"></label><label>$10 fund purchases <input aria-label="${esc(name)} additional fund purchases" data-team="${index}" data-field="purchases" type="number" min="0" value="${state.setup[name].purchases}"></label></div>`).join('');
  $('winner').value = team;
  $('winner').disabled = state.phase === 'minor';
  $('feed').innerHTML = [...state.events].reverse().map(e => `<li>${esc(e.team)} ${e.type === 'pass' ? 'passed' : `selected ${esc(e.player)}${e.phase === 'auction' ? ` for $${e.price}` : ''}`} <small>· ${e.phase === 'minor' ? 'Prospects' : 'Auction'}</small></li>`).join('') || '<li>The room is ready. Make the first selection.</li>';
  $('seconds').value = state.timer.seconds;
  $('undo').disabled = !history.length;
  renderPlayers(); tick();
}
function remaining() { return state.timer.ends ? Math.max(0,Math.ceil((state.timer.ends-Date.now())/1000)) : state.timer.remaining; }
function tick() {
  const seconds = remaining();
  $('clock').textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function resetTimer() { state.timer.remaining = state.timer.seconds; state.timer.ends = null; }
function reveal(event) {
  $('revealPlayer').textContent = event.player;
  $('revealTeam').textContent = `${event.team}${event.phase === 'auction' ? ` · SOLD for $${event.price}` : ' · The future starts here'}`;
  if (!$('reveal').open) $('reveal').showModal();
  setTimeout(() => $('reveal').close(),6500);
}
$('winner').innerHTML = teams.map(t => `<option>${esc(t)}</option>`).join('');
$('source').textContent = `${fantraxHQRankings.source} dynasty ranks · ${fantraxHQRankings.updated}. Roster cache: ${window.UTI_ROSTERS.updated}. Showing up to 100 matches.`;
$('pickForm').addEventListener('submit', event => {
  event.preventDefault();
  const raw = $('player').value.trim();
  const player = fantraxHQRankings.players.find(p => norm(p.name) === norm(raw))?.name || raw;
  const team = state.phase === 'minor' ? current() : $('winner').value;
  const price = state.phase === 'auction' ? Number($('price').value) : 0;
  const t = totals(team);
  let error = '';
  if (!player) error = 'Enter a player.';
  else if (owned.has(norm(player))) error = 'This player is owned in the roster cache. Refresh roster data after cuts before selecting them.';
  else if (state.events.some(e => e.type === 'pick' && norm(e.player) === norm(player))) error = 'That player has already been selected.';
  else if (state.phase === 'minor' && (!$('eligible').checked || t.minor >= 7)) error = 'Verify Fantrax minor eligibility and an open minor roster spot.';
  else if (state.phase === 'auction' && (!Number.isInteger(price) || price < 1 || price > t.budget || t.active >= 30)) error = 'Check the winning bid, remaining funds, and active roster space.';
  if (error) { $('message').textContent = error; return; }
  const pick = {id:Date.now(),type:'pick',phase:state.phase,team,player,price};
  change(() => { state.events.push(pick); state.turn[state.phase]++; resetTimer(); });
  $('player').value = ''; $('eligible').checked = false; $('message').textContent = 'Selection recorded. Enter it in Fantrax separately.'; reveal(pick);
});
$('phase').onchange = () => change(() => { state.phase = $('phase').value; $('boardPhase').value = state.phase; resetTimer(); });
$('pass').onclick = () => change(() => { state.events.push({id:Date.now(),type:'pass',phase:state.phase,team:current()}); state.turn[state.phase]++; resetTimer(); });
$('undo').onclick = () => { if (display || !history.length) return; state = JSON.parse(history.pop()); save(); render(); $('message').textContent = 'Last action undone.'; };
$('setup').onchange = event => {
  const input = event.target; if (!input.dataset.field) return;
  const name = teams[Number(input.dataset.team)],field = input.dataset.field,value = Number(input.value);
  const selected = picksFor(name).filter(e => e.phase === (field === 'minor' ? 'minor' : 'auction')).length;
  if (!Number.isInteger(value) || value < 0 || (field !== 'purchases' && value+selected > (field === 'minor' ? 7 : 30)) || (field === 'purchases' && 150+value*50 < picksFor(name).reduce((s,e) => s+e.price,0))) { $('message').textContent = 'That count exceeds capacity or would make the auction budget negative.'; render(); return; }
  change(() => { state.setup[name][field] = value; });
};
$('startClock').onclick = () => change(() => { if (state.timer.ends) { state.timer.remaining = remaining(); state.timer.ends = null; } else state.timer.ends = Date.now()+state.timer.remaining*1000; });
$('resetClock').onclick = () => change(resetTimer);
$('seconds').onchange = () => { const seconds = Number($('seconds').value); if (Number.isInteger(seconds) && seconds >= 10 && seconds <= 3600) change(() => {state.timer.seconds = seconds;resetTimer();}); };
$('search').oninput = renderPlayers;
$('boardPhase').onchange = renderBoard;
$('fullBoard').onclick = () => {
  const expanded = document.body.classList.toggle('board-expanded');
  $('fullBoard').textContent = expanded ? 'Show all panels' : 'Full board';
  $('fullBoard').setAttribute('aria-pressed',String(expanded));
};
$('players').onclick = event => { if (event.target.dataset.player) { document.querySelector('.commissioner').open = true; $('player').value = event.target.dataset.player; $('player').focus(); } };
$('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { $('message').textContent = 'Fullscreen is unavailable in this browser.'; } };
$('closeReveal').onclick = () => $('reveal').close();
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `uti-draft-${window.UTI_DRAFT_ORDER.season}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
};
$('restore').onchange = async event => {
  if (display || !event.target.files[0]) return;
  try {
    const backup = JSON.parse(await event.target.files[0].text());
    if (!validSession(backup)) throw new Error('Invalid backup');
    if (!confirm('Replace this draft session with the backup? You can undo this action.')) return;
    change(() => { state = backup; }); $('message').textContent = 'Backup restored.';
  } catch { $('message').textContent = 'This file is not a valid backup for this draft.'; }
  event.target.value = '';
};
window.addEventListener('storage', event => {
  if (event.key !== key || !event.newValue) return;
  try { const next = JSON.parse(event.newValue); if (!validSession(next)) throw new Error('Invalid session'); const last = next.events.at(-1); const fresh = last?.type === 'pick' && !state.events.some(e => e.id === last.id); state = next; history = []; render(); if (fresh) reveal(last); } catch { $('message').textContent = 'Could not read the updated session.'; }
});
$('boardPhase').value = state.phase;
render(); setInterval(tick,250);
