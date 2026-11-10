/*
  Team page (team.html?team=Team%20Name): header, quick numbers, the starting lineup on a ballpark,
  season-by-season results, category strengths, and rivalries.

  Reads data/rosters.js (Fantrax rosters), data/show-ratings.js (MLB The Show ratings),
  data/draft-order.js, title odds, and the league history that uti-intelligence.js shares as
  window.UTIHistory once it has loaded ("uti:history-ready").
*/
(() => {
  const HITTING = ["R", "HR", "RBI", "BB", "SO", "NSB", "AVG", "TB"];
  const PITCHING = ["W", "L", "QS", "K", "ERA", "WHIP", "NS", "BAA"];
  
  // Field spots follow the wide stadium reference; bullpens occupy the top 16%.
  const FIELD_SPOTS = {
    C: [[50, 94]],
    "1B": [[65, 73]],
    "2B": [[60, 61]],
    SS: [[40, 61]],
    "3B": [[35, 73]],
    // Leave the central UTI mowing design visible even with five outfielders.
    OF: [[25, 50], [27, 37], [50, 32], [73, 37], [75, 50]]
  };
  const PEN_SPOTS = [[12, 9], [66, 9], [34, 9], [88, 9]]; // left pen, right pen, left, right
  const PEN_SPOTS_FEW = [[23, 9], [77, 9]];
  const STATUS = { RESERVE: ["res", "Bench"], INJURED_RESERVE: ["il", "IL"], MINORS: ["minors", "Minors"] };
  const TIERS = [["diamond", 85, "85+"], ["gold", 80, "80–84"], ["silver", 75, "75–79"], ["bronze", 65, "65–74"], ["common", 0, "≤64"]];
  // Fantrax and The Show abbreviate a few MLB teams differently; used only to tell same-named players apart.
  const TEAM_ALIASES = { CHW: "CWS", WSH: "WAS", ATH: "OAK" };

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const formatRecord = record => record ? `${record.wins}-${record.losses}-${record.ties}` : "—";
  const ordinal = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  // "Ozzie Albies" → "O. Albies", "Elly De La Cruz" → "E. De La Cruz", "Shohei Ohtani-P" → "S. Ohtani".
  function shortName(name) {
    const words = name.replace(/-[PH]$/, "").replace(/ (Jr\.|Sr\.|II|III|IV)$/, "").split(" ");
    return words.length > 1 ? `${words[0][0]}. ${words.slice(1).join(" ")}` : name;
  }

  // MLB headshot by MLB player ID; MLB's CDN falls back to a generic silhouette. No ID: initials.
  function headshot(player, className = "player-photo") {
    const id = player[5];
    if (!id) {
      const initials = player[2].split(" ").slice(0, 2).map(word => word[0]).join("");
      return `<span class="${className} is-initials" aria-hidden="true">${escapeHtml(initials)}</span>`;
    }
    const src = `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_96,q_auto:best/v1/people/${id}/headshot/67/current`;
    return `<img class="${className}" src="${src}" alt="" loading="lazy">`;
  }
  const tierFor = value => TIERS.find(([, min]) => value >= min)[0];

  function normalizeName(name) {
    return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.'’]/g, "")
      .replace(/\s+(jr|sr|ii|iii|iv)$/i, "").replace(/\s+/g, " ").toLowerCase().trim();
  }

  // Fantrax and The Show sometimes disagree on first names ("Jake Latz" vs "Jacob Latz").
  const NICKNAMES = [
    ["jake", "jacob"], ["mike", "michael"], ["matt", "matthew"], ["nick", "nicholas"], ["alex", "alexander"],
    ["josh", "joshua"], ["zach", "zachary"], ["chris", "christopher"], ["dan", "daniel"], ["danny", "daniel"],
    ["joe", "joseph"], ["tom", "thomas"], ["will", "william"], ["rob", "robert"], ["sam", "samuel"],
    ["ben", "benjamin"], ["tony", "anthony"], ["andy", "andrew"], ["drew", "andrew"], ["greg", "gregory"],
    ["jon", "jonathan"], ["jeff", "jeffrey"], ["ken", "kenneth"], ["cam", "cameron"], ["ed", "edward"],
    ["eddie", "edward"], ["steve", "steven"], ["dave", "david"], ["jim", "james"], ["pat", "patrick"]
  ];

  // The normalized name, then the same name with each other form of the first name.
  function nameVariants(key) {
    const [first, ...rest] = key.split(" ");
    const others = NICKNAMES.flatMap(([short, full]) => first === short ? [full] : first === full ? [short] : []);
    return [key, ...others.map(name => [name, ...rest].join(" "))];
  }

  // The Show rating for a roster player, or null when the player isn't in the game.
  function ratingFor(player) {
    const ratings = window.UTI_SHOW_RATINGS?.ratings || {};
    // Fantrax splits two-way players into "Name-P" and "Name-H"; The Show has one card.
    const key = nameVariants(normalizeName(player[2].replace(/-[PH]$/, ""))).find(name => ratings[name] != null);
    const entry = ratings[key];
    if (entry == null) return null;
    if (!Array.isArray(entry)) return entry;
    const team = TEAM_ALIASES[player[3]] || player[3];
    return (entry.find(([cardTeam]) => cardTeam === team) || entry.reduce((best, item) => item[1] > best[1] ? item : best))[1];
  }

  function ovrBadge(player) {
    const rating = ratingFor(player);
    return rating == null
      ? `<em class="ovr none" title="Not in ${escapeHtml(window.UTI_SHOW_RATINGS?.game || "MLB The Show")}">–</em>`
      : `<em class="ovr ${tierFor(rating)}" title="${escapeHtml(window.UTI_SHOW_RATINGS.game)} rating">${rating}</em>`;
  }

  // Fantrax drops accents and apostrophes ("Acuna", "OBrien"); use The Show's spelling when it has one.
  function withProperNames(players) {
    const names = window.UTI_SHOW_RATINGS?.names || {};
    return players.map(player => {
      const proper = names[normalizeName(player[2])];
      return proper ? [player[0], player[1], proper, ...player.slice(3)] : player;
    });
  }

  const isPitcherSlot = player => ["SP", "RP", "P"].includes(player[0]);
  // A P slot can hold a starter or a reliever: starters (position SP) go in the rotation.
  const isStarter = player => player[0] === "SP" || (player[0] === "P" && player[4] === "SP");
  const isReliever = player => player[0] === "RP" || (player[0] === "P" && player[4] !== "SP");

  // Average The Show rating of a team's active and bench players (not IL or minors): overall, hitters, pitchers.
  function teamRating(players) {
    const counted = players.filter(p => p[1] === "ACTIVE" || p[1] === "RESERVE");
    const average = list => {
      const values = list.map(ratingFor).filter(Number.isFinite);
      return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
    };
    return { overall: average(counted), hitting: average(counted.filter(p => !isPitcherSlot(p))), pitching: average(counted.filter(isPitcherSlot)) };
  }

  /* ---------- Header and quick numbers ---------- */

  function seasonsPlayed(H, team) {
    return [...new Set(H.trackedHistoryRows().filter(row => row.team === team).map(row => Number(row.season)))]
      .filter(Number.isFinite).sort((a, b) => a - b);
  }

  function renderHeader(H, team, teams) {
    document.getElementById("teamHead").dataset.team = team;
    const seasons = seasonsPlayed(H, team);
    const results = H.knownSeasonResults();
    document.getElementById("teamHead").innerHTML = `
      <img class="team-photo" src="${escapeHtml(H.logoFor(team))}" alt="">
      <div class="team-head-copy team-title-row"><h1 class="team-title-picker"><select id="teamSelect" aria-label="Select team">${teams.map(name => `<option${name === team ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select><span aria-hidden="true">⌄</span></h1><button type="button" class="team-trophy-button" id="teamTrophyButton" aria-label="View ${escapeHtml(team)} accolades and history" aria-haspopup="dialog" aria-controls="teamHonorsDialog"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3h8v5a4 4 0 0 1-8 0V3Z"/><path d="M8 5H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4M12 12v5m-4 4v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2H8Z"/></svg></button></div>
`;
    document.getElementById("teamAccolades").innerHTML = honorsMarkup(H, team, seasons, results);
    document.title = `${team} | Union of Ten Idiots`;
  }

  function honorsMarkup(H, team, seasons, results) {
    const record = H.franchiseRecord(team);
    const championships = results.filter(r => r.champion === team).map(r => Number(r.season)).sort((a,b) => b-a);
    const playoffs = seasons.filter(year => H.franchiseRecord(team, null, year, 'playoffs').games > 0);
    const awards = results.map(r => ({ year: r.season, honors: [
      r.champion === team ? ['gold', '&#127942;', 'League champion'] : null,
      r.runnerUp === team ? ['silver', '&#129352;', 'Runner-up'] : null,
      r.thirdPlace === team ? ['bronze', '&#129353;', 'Third place'] : null,
      r.regularSeasonFirst === team ? ['teal', '&#128081;', 'Best regular-season record'] : null
    ].filter(Boolean) })).filter(r => r.honors.length).sort((a,b) => b.year-a.year);
    return `<div class="honors-spotlight"><div class="honors-trophy" aria-hidden="true">&#127942;</div><div><span class="honors-kicker">The trophy room</span><strong>${championships.length ? championships.length + (championships.length === 1 ? ' championship' : ' championships') : 'The next chapter awaits'}</strong><span>${championships.length ? championships.join(' &middot; ') : 'Building toward the first league title'}</span></div></div>
      <div class="honors-numbers"><div><span>All-time record</span><strong>${escapeHtml(formatRecord(record))}</strong><small>${seasons.length ? 'Member since ' + seasons[0] : 'League history'}</small></div><div><span>Playoff appearances</span><strong>${playoffs.length}</strong><small>${playoffs.length ? playoffs.join(' &middot; ') : 'First appearance still ahead'}</small></div></div>
      <section class="honors-section"><h3>Honors by season</h3>${awards.length ? '<ol class="honors-timeline">' + awards.map(row => '<li><span class="honors-year">' + escapeHtml(row.year) + '</span><div>' + row.honors.map(([tone, icon, label]) => '<div class="honors-award is-' + tone + '"><span aria-hidden="true">' + icon + '</span><strong>' + label + '</strong></div>').join('') + '</div></li>').join('') + '</ol>' : '<p class="honors-empty">No podium finishes yet. There is room on the shelf.</p>'}</section>
      <section class="honors-section"><h3>Next season</h3><div class="honors-outlook">${nextSeasonChips(H, team) || '<p class="honors-empty">Season outlook is not available yet.</p>'}</div></section>`;
  }

  // Next season's title odds and draft pick: the only numbers not shown elsewhere on the page.
  function nextSeasonChips(H, team) {
    const current = H.current;
    const next = (current.season || 2026) + 1;
    const odds = window.UTITitleOdds?.titleOdds(window.FANTASY_OWNERS, current.powerRankings || []) || [];
    const line = odds.find(row => row.team === team)?.odds;
    const draft = window.UTI_DRAFT_ORDER;
    const pick = draft?.picks?.indexOf(team) ?? -1;
    return [
      line ? `<div class="honors-outlook-card"><span>${next} title odds</span><strong>${escapeHtml(line)}</strong></div>` : "",
      pick >= 0 ? `<div class="honors-outlook-card"><span>${draft.season || next} draft pick</span><strong>#${pick + 1}</strong></div>` : ""
    ].join("");
  }

  // Where the team finished a season's regular-season standings, plus any trophy.
  function seasonFinish(H, team, season) {
    const seasonTeams = [...new Set(H.trackedHistoryRows().filter(row => Number(row.season) === season).map(row => row.team))];
    if (season === 2023) Object.keys(window.UTI_YAHOO_2023_FINAL_REGULAR_SEASON_RECORDS || {}).forEach(name => seasonTeams.includes(name) || seasonTeams.push(name));
    if (!seasonTeams.includes(team)) return "";
    const order = seasonTeams.map(name => ({ name, record: H.franchiseRecord(name, null, season, "regular") }))
      .sort((a, b) => b.record.winPct - a.record.winPct || b.record.wins - a.record.wins || a.name.localeCompare(b.name));
    const finish = order.findIndex(row => row.name === team) + 1;
    const result = H.knownSeasonResults().find(row => Number(row.season) === season) || {};
    const trophy = result.champion === team ? " · 🏆 Champion" : result.runnerUp === team ? " · 🥈 Runner-up" : result.thirdPlace === team ? " · 🥉 Third" : "";
    return `${ordinal(finish)} in the standings${trophy}`;
  }

  /* ---------- Starting lineup ---------- */

  const field = () => document.getElementById("field");
  let selectable = [];

  function selectPlayer(player, element) {
    selectable.forEach(el => el.setAttribute("aria-pressed", String(el === element)));
    const [slot, status, name, mlbTeam, position] = player;
    const where = status === "ACTIVE" ? `starting at ${slot}` : `${STATUS[status][1].toLowerCase()} (${slot} slot)`;
    const rating = ratingFor(player);
    document.getElementById("playerCard").innerHTML = `${headshot(player, "player-photo is-large")}
      <div class="selected-player-copy"><span class="selected-player-label">Player details</span>
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(mlbTeam || "—")} · ${escapeHtml(position)} · ${escapeHtml(where)}</span></div>
      <div class="selected-player-rating">${ovrBadge(player)}<span>The Show</span></div>`;
  }

  function makeSelectable(element, player) {
    element.addEventListener("click", () => selectPlayer(player, element));
    selectable.push(element);
    return element;
  }

  function placeChip(player, [x, y], extraClass = "") {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `spot ${extraClass}`.trim();
    chip.style.left = `${x}%`;
    chip.style.top = `${y}%`;
    chip.innerHTML = `${headshot(player)}<span class="spot-text"><i>${escapeHtml(player[0])}<span>${escapeHtml(player[3])}</span>${ovrBadge(player)}</i><b>${escapeHtml(shortName(player[2]))}</b></span>`;
    chip.setAttribute("aria-label", `${player[0]}: ${player[2]}, ${player[3]}`);
    field().appendChild(makeSelectable(chip, player));
  }

  function sideBox(label, players, side, showSlot) {
    if (!players.length) return;
    const box = document.createElement("div");
    box.className = `side-box ${side}`;
    box.innerHTML = `<i>${label}</i>`;
    players.forEach(player => {
      const row = document.createElement("button");
      row.type = "button";
      row.innerHTML = `${showSlot ? `<small>${escapeHtml(player[0])}</small>` : ""}${headshot(player)}<b>${escapeHtml(shortName(player[2]))}</b><span>${escapeHtml(player[3])}</span>${ovrBadge(player)}`;
      row.setAttribute("aria-label", `${player[0]}: ${player[2]}, ${player[3]}`);
      box.appendChild(makeSelectable(row, player));
    });
    document.getElementById("fieldSides").appendChild(box);
  }

  function renderLineup(team) {
    const players = withProperNames(window.UTI_ROSTERS?.teams?.[team] || []);
    selectable = [];
    field().querySelectorAll(".spot").forEach(el => el.remove());
    document.getElementById("fieldSides").innerHTML = "";
    document.getElementById("playerCard").textContent = players.length ? "Tap a player to see their details." : "No roster found for this team.";

    const active = players.filter(p => p[1] === "ACTIVE");
    const used = {};
    active.filter(p => FIELD_SPOTS[p[0]]).forEach(player => {
      const index = used[player[0]] = (used[player[0]] ?? -1) + 1;
      const spot = FIELD_SPOTS[player[0]][index];
      if (spot) placeChip(player, spot);
    });

    const relievers = active.filter(isReliever);
    const penSpots = relievers.length <= 2 ? PEN_SPOTS_FEW : PEN_SPOTS;
    relievers.forEach((player, index) => { if (penSpots[index]) placeChip(player, penSpots[index], "is-pen"); });

    // Boxes beside the diamond: flex spots on the left, the rotation on the right.
    sideBox("Flex", active.filter(p => ["CI", "MI", "UT"].includes(p[0])), "is-left", true);
    sideBox("Rotation", active.filter(isStarter), "is-right", false);

    const benched = players.filter(p => p[1] !== "ACTIVE");
    document.getElementById("benchCount").textContent = `(${benched.length})`;
    // Grouped: position players, pitchers, the injured list, then minor leaguers.
    const isPitcher = player => ["SP", "RP", "P"].includes(player[4]) || isPitcherSlot(player);
    const groups = [
      ["Position players", benched.filter(p => p[1] === "RESERVE" && !isPitcher(p))],
      ["Pitchers", benched.filter(p => p[1] === "RESERVE" && isPitcher(p))],
      ["IL", benched.filter(p => p[1] === "INJURED_RESERVE")],
      ["Minors", benched.filter(p => !["RESERVE", "INJURED_RESERVE"].includes(p[1]))]
    ];
    const bench = document.getElementById("bench");
    bench.innerHTML = "";
    // Highest The Show rating first; players not in the game go last.
    const byRating = (a, b) => (ratingFor(b) ?? -1) - (ratingFor(a) ?? -1) || a[2].localeCompare(b[2]);
    groups.forEach(([, list]) => list.sort(byRating));
    groups.filter(([, list]) => list.length).forEach(([title, list]) => {
      const heading = document.createElement("h4");
      heading.textContent = `${title} (${list.length})`;
      const ul = document.createElement("ul");
      ul.className = "roster-list";
      list.forEach(player => {
        const li = document.createElement("li");
        li.tabIndex = 0;
        li.innerHTML = `<span class="pos">${escapeHtml(player[0])}</span><span class="bench-name">${headshot(player)}<b>${escapeHtml(shortName(player[2]))}</b></span><span>${escapeHtml(player[3])} ${ovrBadge(player)}</span>`;
        li.addEventListener("keydown", event => { if (event.key === "Enter") selectPlayer(player, li); });
        ul.appendChild(makeSelectable(li, player));
      });
      bench.append(heading, ul);
    });

    keepChipsInField();
    renderTeamRating(team);
  }

  // Long names in an edge spot (e.g. "Crow-Armstrong" in left field on a phone) can hang past the
  // field; slide those chips back inside.
  function keepChipsInField() {
    const box = field().getBoundingClientRect();
    field().querySelectorAll(".spot").forEach(chip => {
      chip.style.marginLeft = "0px";
      const rect = chip.getBoundingClientRect();
      const shift = rect.left < box.left + 2 ? box.left + 2 - rect.left : rect.right > box.right - 2 ? box.right - 2 - rect.right : 0;
      if (shift) chip.style.marginLeft = `${shift}px`;
    });
  }

  function renderTeamRating(team) {
    const all = Object.entries(window.UTI_ROSTERS?.teams || {}).map(([name, players]) => ({ name, ...teamRating(players) }));
    const mine = all.find(row => row.name === team);
    const target = document.getElementById("teamRating");
    if (!mine || mine.overall == null) { target.innerHTML = ""; return; }
    const rank = all.filter(row => row.overall > mine.overall).length + 1;
    target.innerHTML = `
      <em class="ovr ${tierFor(mine.overall)}">${Math.round(mine.overall)}</em>
      <span><b>Team rating</b> · ${ordinal(rank)} of ${all.length} in UTI<br>Hitting ${Math.round(mine.hitting)} · Pitching ${Math.round(mine.pitching)}</span>`;
  }

  function renderLegend() {
    document.getElementById("ovrLegend").innerHTML =
      `<span>${escapeHtml(window.UTI_SHOW_RATINGS?.game || "MLB The Show")} rating</span>` +
      TIERS.map(([tier, , label]) => `<em class="ovr ${tier}">${label}</em>`).join("");
  }

  /* ---------- Seasons, categories, rivals ---------- */

  // Share of each category won in the current season's regular-season matchups.
  function renderCategories(H, team) {
    const { CATEGORY_RULES } = window.UTIAnalytics;
    const rows = H.current.regularRows || H.current.rows || [];
    const mine = rows.filter(row => row.team === team);
    const share = category => {
      let points = 0, games = 0;
      mine.forEach(row => {
        const opponent = rows.find(other => other.week === row.week && other.team === row.opponent);
        const a = Number(row[category]), b = Number(opponent?.[category]);
        if (!opponent || !Number.isFinite(a) || !Number.isFinite(b)) return;
        games += 1;
        points += a === b ? 0.5 : (CATEGORY_RULES[category] === "low" ? a < b : a > b) ? 1 : 0;
      });
      return games ? Math.round((points / games) * 100) : null;
    };
    document.getElementById("catsNote").textContent =
      `${H.current.season || 2026} share of each category won. The line is 50%; teal is a strength, coral a weakness.`;
    document.getElementById("teamCats").innerHTML = [["Hitting", HITTING], ["Pitching", PITCHING]].map(([group, list]) => `
      <h3>${group}</h3>
      ${list.map(category => {
        const pct = share(category);
        if (pct == null) return "";
        return `<div class="cat" title="${category}: won ${pct}% of matchups"><b>${category}</b><span class="track"><span class="bar ${pct >= 50 ? "up" : "down"}" style="width:${Math.abs(pct - 50)}%"></span></span><em>${pct}%</em></div>`;
      }).join("")}`).join("");
  }

  function renderRivals(H, team) {
    const matchups = H.franchiseTeams().filter(name => name !== team).map(name => ({
      name,
      all: H.franchiseRecord(team, name),
      playoffs: H.franchiseRecord(team, name, null, "playoffs")
    })).filter(row => row.all.games >= 4);

    const card = (kind, label, row, note) => row ? `
      <div class="rival ${kind}">
        <small>${label}</small>
        <div><img src="${escapeHtml(H.logoFor(row.name))}" alt=""><strong><span class="ui-team-link" data-team-profile="${escapeHtml(row.name)}" role="button" tabindex="0">${escapeHtml(row.name)}</span></strong></div>
        <span>${note}</span>
      </div>` : "";
    const byPct = [...matchups].sort((a, b) => b.all.winPct - a.all.winPct || b.all.games - a.all.games);
    const owns = byPct[0];
    const owned = byPct[byPct.length - 1];
    const playoff = [...matchups].filter(row => row.playoffs.wins > 0).sort((a, b) => b.playoffs.wins - a.playoffs.wins)[0];
    const pct = record => `${Math.round(record.winPct * 100)}%`;

    document.getElementById("teamRivals").innerHTML =
      card("owns", "Owns", owns, `<b>${formatRecord(owns?.all)}</b> all-time · ${owns ? pct(owns.all) : ""}`) +
      card("owned", "Owned by", owned, `<b>${formatRecord(owned?.all)}</b> all-time${owned?.playoffs.games ? ` · ${owned.playoffs.wins}-${owned.playoffs.losses} in the playoffs` : ""}`) +
      card("playoff", "Playoff victim", playoff, `<b>${playoff?.playoffs.wins}-${playoff?.playoffs.losses}</b> in the playoffs`);
  }

  /* ---------- Season stats (the old profile pop-up) ---------- */

  function renderProfile(H, team, season) {
    const result = H.profileBody(team, season);
    const target = document.getElementById("teamProfile");
    if (!result) { target.innerHTML = ""; return; }
    const { profile, html } = result;
    const finish = seasonFinish(H, team, Number(profile.season));
    document.getElementById("teamVerdict").textContent = `${profile.verdict} · ${finish || `${profile.season} ${profile.source === "yahoo" ? "Yahoo" : "Fantrax"}`}`;
    // "More stats" starts closed; once opened it stays open while switching seasons.
    const moreWasOpen = Boolean(target.querySelector(".pf-more")?.open);
    target.innerHTML = html;
    if (moreWasOpen) target.querySelector(".pf-more")?.setAttribute("open", "");
    target.dataset.team = team;
  }

  /* ---------- Page ---------- */

  function render(team) {
    const H = window.UTIHistory;
    const teams = Object.keys(window.UTI_ROSTERS?.teams || {}).sort((a, b) => a.localeCompare(b));
    renderHeader(H, team, teams);
    renderLineup(team);
    renderProfile(H, team, String(H.current?.season || 2026));
    renderCategories(H, team);
    renderRivals(H, team);
    const honorsDialog = document.getElementById('teamHonorsDialog');
    if (honorsDialog.open) honorsDialog.close();
    document.getElementById('teamHonorsTitle').textContent = `${team} accolades & history`;
    document.getElementById('teamHonorsBody').innerHTML = document.getElementById('teamAccolades').innerHTML;
    document.getElementById('teamTrophyButton').addEventListener('click', event => {
      const rect = event.currentTarget.getBoundingClientRect();
      honorsDialog.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 432))}px`;
      honorsDialog.style.top = `${Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - 330))}px`;
      honorsDialog.showModal();
    });
    document.dispatchEvent(new CustomEvent('uti:team-selected', { detail: { team } }));

    document.getElementById("teamSelect")?.addEventListener("change", event => {
      const next = event.target.value;
      history.replaceState(null, "", `?team=${encodeURIComponent(next)}`);
      render(next);
    });
  }

  function start() {
    const teams = Object.keys(window.UTI_ROSTERS?.teams || {});
    const requested = new URLSearchParams(location.search).get("team");
    const leader = window.UTIHistory.current?.powerRankings?.[0]?.team;
    const team = teams.find(name => name.toLowerCase() === String(requested || "").toLowerCase()) || leader || teams[0];
    renderLegend();
    render(team);
  }

  window.addEventListener("resize", keepChipsInField);
  document.getElementById('teamHonorsDialog').addEventListener('click', event => {
    const dialog = event.currentTarget;
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });

  // Season tabs inside the season stats panel.
  document.getElementById("teamProfile").addEventListener("click", event => {
    const button = event.target.closest("[data-profile-season]");
    if (!button) return;
    event.stopPropagation();
    renderProfile(window.UTIHistory, event.currentTarget.dataset.team, button.dataset.profileSeason);
  });

  if (window.UTIHistory) start();
  else document.addEventListener("uti:history-ready", start, { once: true });
})();
