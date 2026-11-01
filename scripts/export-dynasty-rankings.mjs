import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { players, dynastyRankingInfo } from '../data/players.js';
import { fantraxPlayerScores } from '../data/fantrax-player-scores.js';
import { applyExportScore } from './fantrax-player-scores.mjs';
import { buildDynastyOutlook } from './dynasty-outlook.mjs';

const ranked = players.map(player => buildDynastyOutlook(applyExportScore(player, fantraxPlayerScores)))
  .filter(player => Number.isFinite(player.dynastyOutlook))
  .sort((a, b) => b.dynastyOutlook - a.dynastyOutlook || a.dynastyRank - b.dynastyRank || a.name.localeCompare(b.name))
  .slice(0, 500);
if (ranked.length !== 500) throw new Error(`Only ${ranked.length} players have a dynasty baseline; cannot produce a top 500`);
const headings = ['Rank', 'Player', 'Position', 'MLB team', 'Dynasty score', '2026 Fantrax score', 'FantraxHQ rank', 'Expert baseline points', 'Production weight (%)', 'Three-season production score', '2025 Fantrax score', '2024 Fantrax score', 'Confidence'];
const rows = ranked.map((p, i) => [i + 1, p.name, p.positions.join('/'), p.mlbTeam, p.dynastyOutlook, p.performanceScore ?? '', p.dynastyRank,
  p.dynastyBreakdown.baseline, Math.round(p.dynastyBreakdown.productionWeight * 1000) / 10, p.dynastyBreakdown.productionScore == null ? '' : Math.round(p.dynastyBreakdown.productionScore * 100) / 100, ...[2025, 2024].map(year => p.dynastyBreakdown.seasons.find(s => s.season === year)?.score ?? ''), p.dynastyConfidence]);
const csv = value => /[",\n]/.test(String(value)) ? '"' + String(value).replaceAll('"', '""') + '"' : String(value);
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const out = fileURLToPath(new URL('../exports/', import.meta.url));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(out + '/dynasty-top-500.csv', '\uFEFF' + [headings, ...rows].map(row => row.map(csv).join(',')).join('\r\n') + '\r\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UTI Dynasty Top 500</title>
<style>body{margin:0;background:#0b0f1c;color:#e9eef8;font:15px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:24px}h1{font-size:28px;margin:0 0 8px}p{max-width:90ch;color:#b8c2da}a{color:#19d3c5}input{padding:12px;border:1px solid #43516d;border-radius:6px;background:#111b2e;color:inherit;width:min(100%,400px);box-sizing:border-box}table{width:100%;border-collapse:collapse;white-space:nowrap}th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #26324a}th{position:sticky;top:0;background:#111b2e}th button{font:inherit;color:#19d3c5;background:none;border:0;padding:0;cursor:pointer}td:nth-child(5){font-weight:700;color:#19d3c5}.table-wrap{overflow:auto;max-height:75vh;margin-top:16px}tr:hover{background:#111b2e}small{color:#8d98b3}button:focus-visible,input:focus-visible{outline:2px solid #19d3c5}#count{margin-left:12px}</style></head><body><main>
<h1>UTI Dynasty Top 500</h1>
<p>Provisional estimates from the trade analyzer, not validated forecasts. Up to 30% of each score comes from actual 2024?2026 Fantrax performance (60% recent season, 30% previous season, 10% oldest season); the rest uses a FantraxHQ rank-derived baseline. Smaller samples receive less production weight. No MLB score means expert baseline only.</p>
<p><a href="${escape(dynastyRankingInfo.url)}">FantraxHQ Roto source</a> updated ${escape(dynastyRankingInfo.updated)}. Fantrax actual-stat export imported ${escape(fantraxPlayerScores.imported.slice(0, 10))}. <a href="dynasty-top-500.csv" download>Download CSV</a></p>
<label for="search">Find a player, position or team</label><br><input id="search" type="search" placeholder="Search the top 500"><small id="count">500 players</small>
<div class="table-wrap"><table><thead><tr>${headings.map((h, i) => `<th scope="col"><button type="button" data-column="${i}">${escape(h)}</button></th>`).join('')}</tr></thead><tbody>${rows.map(row => '<tr>' + row.map(value => '<td>' + escape(value) + '</td>').join('') + '</tr>').join('')}</tbody></table></div>
<script>
const body=document.querySelector('tbody'),rows=Array.from(body.rows),search=document.getElementById('search');
search.addEventListener('input',()=>{const query=search.value.toLowerCase();let count=0;rows.forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(query);if(!row.hidden)count++});document.getElementById('count').textContent=count+' players'});
document.querySelectorAll('th button').forEach(button=>{let ascending=true;button.addEventListener('click',()=>{const column=Number(button.dataset.column);rows.sort((a,b)=>{const x=a.cells[column].textContent,y=b.cells[column].textContent;const numeric=x!==''&&y!==''&&Number.isFinite(Number(x))&&Number.isFinite(Number(y));return (numeric?Number(x)-Number(y):x.localeCompare(y))*(ascending?1:-1)});rows.forEach(row=>body.appendChild(row));document.querySelectorAll('th').forEach(th=>th.removeAttribute('aria-sort'));button.parentElement.setAttribute('aria-sort',ascending?'ascending':'descending');ascending=!ascending})});
</script></main></body></html>`;
fs.writeFileSync(out + '/dynasty-top-500.html', html);
console.log(JSON.stringify({ count: rows.length, top10: rows.slice(0, 10).map(row => ({ rank: row[0], name: row[1], score: row[4] })), vargas: rows.find(row => row[1] === 'Miguel Vargas') }, null, 2));
