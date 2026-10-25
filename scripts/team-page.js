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
  const SEASONS = [2026, 2025, 2024, 2023];

  // Field spots in percent of the field box (100 wide x 106 tall; the pens use the top 16).
  const FIELD_SPOTS = {
    C: [[50, 92.5]],
    "1B": [[77, 62]],
    "2B": [[63, 51]],
    SS: [[37, 51]],
    "3B": [[23, 62]],
    OF: [[11, 43], [28, 30], [50, 22.5], [72, 30], [89, 43]]
  };
  const PEN_SPOTS = [[12, 11.5], [66, 11.5], [34, 11.5], [88, 11.5]]; // left pen, right pen, left, right
  const PEN_SPOTS_FEW = [[23, 11.5], [77, 11.5]];
  const STATUS = { RESERVE: ["res", "Bench"], INJURED_RESERVE: ["il", "IL"], MINORS: ["minors", "Minors"] };
  const TIERS = [["diamond", 85, "85+"], ["gold", 80, "80–84"], ["silver", 75, "75–79"], ["bronze", 65, "65–74"], ["common", 0, "≤64"]];
  // Fantrax and The Show abbreviate a few MLB teams differently; used only to tell same-named players apart.
  const TEAM_ALIASES = { CHW: "CWS", WSH: "WAS", ATH: "OAK" };

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const formatRecord = record => record ? `${record.wins}-${record.losses}-${record.ties}` : "—";
  const ordinal = n => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const lastName = name => name.replace(/ (Jr\.|Sr\.|II|III|IV)$/, "").split(" ").slice(-1)[0];
  const tierFor = value => TIERS.find(([, min]) => value >= min)[0];

  function normalizeName(name) {
    return String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.'’]/g, "")
      .replace(/\s+(jr|sr|ii|iii|iv)$/i, "").replace(/\s+/g, " ").toLowerCase().trim();
  }

  // The Show rating for a roster player, or null when the player isn't in the game.
  function ratingFor(player) {
    const entry = window.UTI_SHOW_RATINGS?.ratings?.[normalizeName(player[2])];
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

  // Average The Show rating of a team's active players: overall, hitters, pitchers.
  function teamRating(players) {
    const active = players.filter(p => p[1] === "ACTIVE");
    const average = list => {
      const values = list.map(ratingFor).filter(Number.isFinite);
      return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
    };
    return { overall: average(active), hitting: average(active.filter(p => !isPitcherSlot(p))), pitching: average(active.filter(isPitcherSlot)) };
  }

  /* ---------- Header and quick numbers ---------- */

  function seasonsPlayed(H, team) {
    return [...new Set(H.trackedHistoryRows().filter(row => row.team === team).map(row => Number(row.season)))]
      .filter(Number.isFinite).sort((a, b) => a - b);
  }

  function renderHeader(H, team, teams) {
    const seasons = seasonsPlayed(H, team);
    const results = H.knownSeasonResults();
    const chips = [];
    results.forEach(result => {
      if (result.champion === team) chips.push(`<span class="chip gold">🏆 ${result.season} Champion</span>`);
      if (result.runnerUp === team) chips.push(`<span class="chip silver">🥈 ${result.season} Runner-up</span>`);
      if (result.thirdPlace === team) chips.push(`<span class="chip bronze">🥉 ${result.season} Third</span>`);
      if (result.regularSeasonFirst === team) chips.push(`<span class="chip">👑 ${result.season} Best record</span>`);
    });
    const playoffYears = seasons.filter(season => H.franchiseRecord(team, null, season, "playoffs").games > 0);
    if (playoffYears.length) chips.push(`<span class="chip">Playoffs ${playoffYears.join(" · ")}</span>`);

    document.getElementById("teamHead").innerHTML = `
      <img class="team-photo" src="${escapeHtml(H.logoFor(team))}" alt="">
      <div class="team-head-copy">
        <h1>${escapeHtml(team)}</h1>
        <p class="team-sub">${seasons.length ? `In the league since ${seasons[0]} · ` : ""}${formatRecord(H.franchiseRecord(team))} all-time</p>
        ${chips.length ? `<div class="shelf">${chips.join("")}</div>` : ""}
      </div>
      <label class="team-picker">
        <span>Team</span>
        <select id="teamSelect">${teams.map(name => `<option${name === team ? " selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select>
      </label>`;
    document.title = `${team} | Union of Ten Idiots`;
  }

  function renderFacts(H, team) {
    const current = H.current;
    const odds = window.UTITitleOdds?.titleOdds(window.FANTASY_OWNERS, current.powerRankings || []) || [];
    const line = odds.find(row => row.team === team)?.odds;
    const draft = window.UTI_DRAFT_ORDER;
    const pick = draft?.picks?.indexOf(team) ?? -1;
    const powerRank = (current.powerRankings || []).findIndex(row => row.team === team) + 1;
    const season = current.season || 2026;
    const facts = [
      [`${season + 1} odds`, line || "—"],
      [`${draft?.season || season + 1} pick`, pick >= 0 ? `#${pick + 1}` : "—"],
      [`${season} record`, formatRecord(H.franchiseRecord(team, null, season, "regular"))],
      ["Power rank", powerRank ? `#${powerRank}` : "—"]
    ];
    document.getElementById("teamFacts").innerHTML = facts
      .map(([label, value]) => `<div class="fact"><small>${label}</small><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  /* ---------- Starting lineup ---------- */

  const field = () => document.getElementById("field");
  let selectable = [];

  function selectPlayer(player, element) {
    selectable.forEach(el => el.setAttribute("aria-pressed", String(el === element)));
    const [slot, status, name, mlbTeam, position] = player;
    const where = status === "ACTIVE" ? `starting at ${slot}` : `${STATUS[status][1].toLowerCase()} (${slot} slot)`;
    const rating = ratingFor(player);
    document.getElementById("playerCard").innerHTML =
      `<strong>${escapeHtml(name)}</strong> · ${escapeHtml(mlbTeam || "—")} · ${escapeHtml(position)} · ${where}` +
      (rating != null ? ` · ${rating} overall in The Show` : " · not in The Show");
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
    chip.innerHTML = `<i>${escapeHtml(player[0])}${ovrBadge(player)}</i><b>${escapeHtml(lastName(player[2]))}</b><span>${escapeHtml(player[3])}</span>`;
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
      row.innerHTML = `${showSlot ? `<small>${escapeHtml(player[0])}</small>` : ""}<b>${escapeHtml(lastName(player[2]))}</b><span>${escapeHtml(player[3])}</span>${ovrBadge(player)}`;
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
    // Grouped: position players, pitchers, then minor leaguers. IL players stay in their group with an IL tag.
    const isPitcher = player => ["SP", "RP", "P"].includes(player[4]) || isPitcherSlot(player);
    const groups = [
      ["Position players", benched.filter(p => p[1] !== "MINORS" && !isPitcher(p))],
      ["Pitchers", benched.filter(p => p[1] !== "MINORS" && isPitcher(p))],
      ["Minors", benched.filter(p => p[1] === "MINORS")]
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
        const [cls, label] = STATUS[player[1]] || ["res", player[1]];
        const li = document.createElement("li");
        li.tabIndex = 0;
        // Minors are already labeled by their group; only IL gets a tag elsewhere.
        const tag = player[1] === "INJURED_RESERVE" ? `<em class="status ${cls}">${label}</em> ` : "";
        li.innerHTML = `<span class="pos">${escapeHtml(player[0])}</span><b>${escapeHtml(player[2])}</b><span>${tag}${escapeHtml(player[3])} ${ovrBadge(player)}</span>`;
        li.addEventListener("keydown", event => { if (event.key === "Enter") selectPlayer(player, li); });
        ul.appendChild(makeSelectable(li, player));
      });
      bench.append(heading, ul);
    });
    document.getElementById("benchDetails").open = window.matchMedia("(min-width: 641px)").matches;

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

  function renderSeasons(H, team) {
    const results = H.knownSeasonResults();
    const rows = SEASONS.map(season => {
      const seasonTeams = [...new Set(H.trackedHistoryRows().filter(row => Number(row.season) === season).map(row => row.team))];
      if (season === 2023) Object.keys(window.UTI_YAHOO_2023_FINAL_REGULAR_SEASON_RECORDS || {}).forEach(name => seasonTeams.includes(name) || seasonTeams.push(name));
      if (!seasonTeams.includes(team)) return null;

      const records = seasonTeams.map(name => ({ name, record: H.franchiseRecord(name, null, season, "regular") }))
        .sort((a, b) => b.record.winPct - a.record.winPct || b.record.wins - a.record.wins || a.name.localeCompare(b.name));
      const finish = records.findIndex(row => row.name === team) + 1;
      const playoffs = H.franchiseRecord(team, null, season, "playoffs");
      const result = results.find(row => Number(row.season) === season) || {};
      const medal = result.champion === team ? " 🏆" : result.runnerUp === team ? " 🥈" : result.thirdPlace === team ? " 🥉" : "";
      const power = (H.seasonData(season)?.powerRankings || []).findIndex(row => row.team === team) + 1;
      return `<tr>
        <td class="year">${season}</td>
        <td class="num">${formatRecord(records[finish - 1].record)}</td>
        <td class="num">${ordinal(finish)}</td>
        <td class="num">${playoffs.games ? `${playoffs.wins}-${playoffs.losses}${medal}` : "—"}</td>
        <td class="num">${power ? `#${power}` : "—"}</td>
      </tr>`;
    }).filter(Boolean);

    document.getElementById("teamSeasons").innerHTML = `
      <table class="team-table">
        <thead><tr><th>Year</th><th class="num">Record</th><th class="num">Finish</th><th class="num">Playoffs</th><th class="num">Power</th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>`;
  }

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
    document.getElementById("teamVerdict").textContent = `${profile.verdict} · ${profile.season} ${profile.source === "yahoo" ? "Yahoo" : "Fantrax"}`;
    target.innerHTML = html;
    target.querySelector(".pf-more")?.setAttribute("open", "");
    target.dataset.team = team;
  }

  /* ---------- Page ---------- */

  function render(team) {
    const H = window.UTIHistory;
    const teams = Object.keys(window.UTI_ROSTERS?.teams || {}).sort((a, b) => a.localeCompare(b));
    renderHeader(H, team, teams);
    renderFacts(H, team);
    renderLineup(team);
    renderProfile(H, team, String(H.current?.season || 2026));
    renderSeasons(H, team);
    renderCategories(H, team);
    renderRivals(H, team);

    document.getElementById("teamSelect").addEventListener("change", event => {
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
