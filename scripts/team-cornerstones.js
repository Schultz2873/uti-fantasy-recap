(() => {
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const key = name => String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+(jr\.?|sr\.?|ii|iii|iv)$/i, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
function render(team) {
  const target = document.getElementById('teamCornerstones');
  if (!target || !team || !window.UTI_ROSTERS?.teams) return;
  if (!Array.isArray(window.UTI_CORNERSTONE_SCORES)) {
    target.hidden = false;
    target.textContent = 'Cornerstone ratings are unavailable. Please refresh to try again.';
    return;
  }
  const rated = window.UTI_ROSTERS.teams[team].flatMap(([slot, status, name, mlbTeam, position, mlbId]) => {
    const matches = window.UTI_CORNERSTONE_SCORES.filter(p => [p.name, ...p.aliases].some(alias => key(alias) === key(name)));
    return matches.length === 1 ? [{ name, fantasyTeam: team, dynastyOutlook: matches[0].score, mlbTeam, positions: [position || slot], mlbId }] : [];
  });
  const seen = new Set();
  const top = rated.filter(p => p.fantasyTeam === team && Number.isFinite(p.dynastyOutlook))
    .sort((a, b) => b.dynastyOutlook - a.dynastyOutlook || a.name.localeCompare(b.name))
    .filter(p => {
      const identity = p.mlbId || p.name.replace(/-[HP]$/, '');
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }).slice(0, 3);
  // Featured artwork override requested for Dixon Cider; roster and scores stay authoritative.
  if (team === 'Dixon Cider') {
    const slot = top.findIndex(p => p.name === 'Corbin Carroll');
    const yordan = rated.find(p => p.name === 'Yordan Alvarez');
    if (slot !== -1 && yordan && !top.some(p => p.name === yordan.name)) top[slot] = yordan;
  }
  if (team === "BB's Bold Team" && !top.some(p => p.name === 'Pete Crow-Armstrong')) {
    const pete = rated.find(p => p.name === 'Pete Crow-Armstrong');
    if (pete) top.splice(Math.min(2, top.length), top.length >= 3 ? 1 : 0, pete);
  }
  if (team === "BB's Bold Team" && !top.some(p => key(p.name) === key('Cristopher Sanchez'))) {
    const sanchez = rated.find(p => key(p.name) === key('Cristopher Sanchez'));
    if (sanchez) {
      const slot = top.findLastIndex(p => p.name !== 'Pete Crow-Armstrong');
      top.splice(top.length < 3 ? top.length : Math.max(0, slot), top.length < 3 ? 0 : 1, sanchez);
    }
  }
  if (team === "BB's Bold Team" && !top.some(p => p.name === 'Yoshinobu Yamamoto')) {
    const yamamoto = rated.find(p => p.name === 'Yoshinobu Yamamoto');
    if (yamamoto) {
      const walkerSlot = top.findIndex(p => p.name === 'Jordan Walker');
      const otherSlot = top.findIndex(p => p.name !== 'Pete Crow-Armstrong' && key(p.name) !== key('Cristopher Sanchez'));
      const slot = walkerSlot !== -1 ? walkerSlot : otherSlot;
      if (slot !== -1) top[slot] = yamamoto;
    }
  }
  if (team === 'Goodyear Gila Monsters') {
    const featured = ['Elly De La Cruz', 'Bobby Witt Jr.', 'Tarik Skubal'].map(name => rated.find(p => key(p.name) === key(name))).filter(Boolean);
    if (featured.length === 3) top.splice(0, top.length, ...featured);
  }
  if (team === 'Gunnarrhea' && !top.some(p => p.name === 'James Wood')) {
    const wood = rated.find(p => p.name === 'James Wood');
    if (wood) top.splice(Math.min(2, top.length), top.length >= 3 ? 1 : 0, wood);
  }
  if (team === 'Gunnarrhea' && !top.some(p => p.name === 'Gunnar Henderson')) {
    const gunnar = rated.find(p => p.name === 'Gunnar Henderson');
    const slot = top.findLastIndex(p => p.name !== 'James Wood');
    if (gunnar && slot !== -1) top[slot] = gunnar;
  }
  if (team === 'Gunnarrhea' && !top.some(p => p.name === 'Dylan Cease')) {
    const cease = rated.find(p => p.name === 'Dylan Cease');
    const wooSlot = top.findIndex(p => p.name === 'Bryan Woo');
    const otherSlot = top.findIndex(p => p.name !== 'James Wood' && p.name !== 'Gunnar Henderson');
    const slot = wooSlot !== -1 ? wooSlot : otherSlot;
    if (cease && slot !== -1) top[slot] = cease;
  }
  if (team === "John's Super Team") {
    const featured = ['Juan Soto', 'Jackson Chourio', 'Julio Rodriguez'].map(name => rated.find(p => key(p.name) === key(name))).filter(Boolean);
    if (featured.length === 3) top.splice(0, top.length, ...featured);
  }
  if (team === 'Mactown MacDaddies') {
    const featured = ['Munetaka Murakami', 'Bryce Harper', 'Kyle Schwarber'].map(name => rated.find(p => key(p.name) === key(name))).filter(Boolean);
    if (featured.length === 3) top.splice(0, top.length, ...featured);
  }
  if (team === 'Me So Heorny') {
    const featured = ['Drake Baldwin', 'Andy Pages', 'Jesus Luzardo'].map(name => rated.find(p => key(p.name) === key(name))).filter(Boolean);
    if (featured.length === 3) top.splice(0, top.length, ...featured);
  }
  if (team === 'This Is Mizerable') {
    const featured = ['Jacob Misiorowski', 'Vladimir Guerrero Jr.', 'Jeremy Pena'].map(name => rated.find(p => key(p.name) === key(name))).filter(Boolean);
    if (featured.length === 3) top.splice(0, top.length, ...featured);
  }
  const mizerableCollage = team === 'This Is Mizerable' && ['Jacob Misiorowski', 'Vladimir Guerrero Jr.', 'Jeremy Pena'].every(name => top.some(p => key(p.name) === key(name)));
  if (team === "You Don't Know Bo") {
    const featured = ['Junior Caminero', 'Nick Kurtz', 'Garrett Crochet'].map(name => rated.find(p => key(p.name) === key(name))).filter(Boolean);
    if (featured.length === 3) top.splice(0, top.length, ...featured);
  }
  const boCollage = team === "You Don't Know Bo" && ['Junior Caminero', 'Nick Kurtz', 'Garrett Crochet'].every(name => top.some(p => key(p.name) === key(name)));
  const heornyCollage = team === 'Me So Heorny' && ['Drake Baldwin', 'Andy Pages', 'Jesus Luzardo'].every(name => top.some(p => key(p.name) === key(name)));
  const mactownCollage = team === 'Mactown MacDaddies' && ['Munetaka Murakami', 'Bryce Harper', 'Kyle Schwarber'].every(name => top.some(p => key(p.name) === key(name)));
  const johnsCollage = team === "John's Super Team" && ['Juan Soto', 'Jackson Chourio', 'Julio Rodriguez'].every(name => top.some(p => key(p.name) === key(name)));
  target.hidden = !top.length;
  if (!top.length) { target.hidden = false; target.textContent = 'No rated cornerstones are available for this roster yet.'; return; }
  const btaCollage = ['Kevin McGonigle', 'Paul Skenes', 'Drew Rasmussen'].every(name => top.some(p => p.name === name));
  const dixonCollage = team === 'Dixon Cider' && top.some(p => p.name === 'Yordan Alvarez') && top.some(p => /^Shohei Ohtani(?:-[HP])?$/.test(p.name));
  const bbCollage = team === "BB's Bold Team" && ['Pete Crow-Armstrong', 'Cristopher Sanchez', 'Yoshinobu Yamamoto'].every(name => top.some(p => key(p.name) === key(name)));
  const goodyearCollage = team === 'Goodyear Gila Monsters' && ['Elly De La Cruz', 'Bobby Witt Jr.', 'Tarik Skubal'].every(name => top.some(p => key(p.name) === key(name)));
  const sharedCollage = boCollage || mizerableCollage || heornyCollage || btaCollage || dixonCollage || bbCollage || goodyearCollage || johnsCollage || mactownCollage;
  const mlbColors = { ARI: '#a71930', ATL: '#ce1141', BAL: '#df4601', BOS: '#bd3039', CHC: '#0e59bd', CWS: '#555b65', CHW: '#555b65', CIN: '#d82c39', CLE: '#d53542', COL: '#704fa6', DET: '#153d79', HOU: '#ee752d', KC: '#287ccc', LAA: '#bf1836', LAD: '#1763c4', MIA: '#00a3b9', MIL: '#d2a62c', MIN: '#b62e44', NYM: '#ed7127', NYY: '#324c76', OAK: '#248063', ATH: '#248063', PHI: '#df3444', PIT: '#e2ba37', SD: '#bb914a', SEA: '#087e89', SF: '#df622a', STL: '#c52b40', TB: '#28699e', TEX: '#246bc2', TOR: '#2970b8', WAS: '#b72b42', WSH: '#b72b42' };
  // Composite artwork has a fixed left-to-right order independent of score order.
  const uniformTeams = team === 'Gunnarrhea' ? { 'James Wood': 'WSH', 'Gunnar Henderson': 'BAL', 'Dylan Cease': 'TOR' } : {};
  const artworkOrder = boCollage ? ['TB', 'ATH', 'BOS'] : mizerableCollage ? ['MIL', 'TOR', 'HOU'] : heornyCollage ? ['ATL', 'LAD', 'PHI'] : mactownCollage ? ['CHW', 'PHI', 'PHI'] : johnsCollage ? ['MIL', 'NYM', 'SEA'] : btaCollage ? ['DET', 'PIT', 'TB'] : dixonCollage ? ['HOU', 'LAD', 'NYY'] : bbCollage ? ['CHC', 'PHI', 'LAD'] : goodyearCollage ? ['CIN', 'KC', 'LAD'] : [top[1], top[0], top[2]].map(p => uniformTeams[p?.name] || p?.mlbTeam);
  const artworkColors = team === 'Gunnarrhea' ? { BAL: '#ef7521', WSH: '#cf3045', TOR: '#176bcc' } : mlbColors;
  const panelColors = artworkOrder.map(code => artworkColors[code] || '#3387aa');
  const colorPanels = `<svg class="player-color-panels" viewBox="0 0 1440 440" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="m65 335 182-240 335-25-145 254z" fill="${panelColors[0]}"/><path d="m449 365 160-279 264-34-129 335z" fill="${panelColors[1]}"/><path d="m779 390 111-288 250-36 230 231-284 70z" fill="${panelColors[2]}"/><g fill="none" stroke="#d6e2f2" stroke-opacity=".23" stroke-width="2"><path d="m97 313 163-200 282-24-122 218z"/><path d="m481 340 142-235 216-26-118 284z"/><path d="m815 361 94-241 224-32 193 196-251 59z"/></g></svg>`;
  const camCutout = dixonCollage && top.some(p => p.name === 'Cam Schlittler');
  target.innerHTML = `<div class="cornerstones-heading"><div><span class="cornerstones-eyebrow">Built around</span><h2>${escape(team)}</h2></div><span>THE BIG THREE</span></div>
    <div class="cornerstones-grid ${team === 'Gunnarrhea' ? 'is-gunnarrhea-banner' : ''} ${sharedCollage ? 'has-player-collage' : ''} ${dixonCollage ? 'is-dixon-collage' : ''} ${camCutout ? 'is-dixon-trio' : ''} ${bbCollage ? 'is-bb-collage' : ''}">${colorPanels}${sharedCollage ? `<img class="cornerstones-player-collage" src="assets/players/${boCollage ? 'you-dont-know-bo-three-players-bald.png' : mizerableCollage ? 'this-is-mizerable-three-players.png' : heornyCollage ? 'me-so-heorny-three-players.png' : mactownCollage ? 'mactown-macdaddies-three-players-v2.png' : johnsCollage ? 'johns-super-team-three-players-spaced.png' : goodyearCollage ? 'goodyear-gila-three-players.png' : bbCollage ? 'bb-bold-three-players.png' : dixonCollage ? 'dixon-cider-three-players-v2.png' : 'bta-cornerstones-mcgonigle-larger.png'}" alt="${boCollage ? 'Junior Caminero in Rays gear, Nick Kurtz in Athletics gear, and Garrett Crochet pitching in an edited Red Sox uniform' : mizerableCollage ? 'Jacob Misiorowski pitching for the Brewers, Vladimir Guerrero Jr. batting for the Blue Jays, and Jeremy Pena fielding for the Astros' : heornyCollage ? 'Drake Baldwin with catcher mask raised, Andy Pages batting, and Jesus Luzardo pitching in an edited Phillies uniform' : mactownCollage ? 'Munetaka Murakami batting in an edited White Sox uniform, Bryce Harper and Kyle Schwarber batting in Phillies uniforms' : johnsCollage ? 'Jackson Chourio batting, Juan Soto running, and Julio Rodriguez on base' : goodyearCollage ? 'Elly De La Cruz, Bobby Witt Jr., and Tarik Skubal in an edited Dodgers uniform' : bbCollage ? 'Pete Crow-Armstrong, Cristopher Sanchez, and Yoshinobu Yamamoto in edited uniforms' : dixonCollage ? 'Yordan Alvarez, Shohei Ohtani, and Cam Schlittler in an edited Yankees uniform' : 'Kevin McGonigle batting, Paul Skenes and Drew Rasmussen pitching'}" loading="lazy">` : ''}${top.map((p, i) => {
      const initials = p.name.split(' ').slice(0, 2).map(n => n[0]).join('');
      const ohtaniPhoto = team === 'Dixon Cider' && /^Shohei Ohtani(?:-[HP])?$/.test(p.name);
      const mcgoniglePhoto = p.name === 'Kevin McGonigle';
      const skenesPhoto = p.name === 'Paul Skenes';
      const rasmussenPhoto = p.name === 'Drew Rasmussen';
      const yordanPhoto = team === 'Dixon Cider' && p.name === 'Yordan Alvarez';
      const petePhoto = team === "BB's Bold Team" && p.name === 'Pete Crow-Armstrong';
      const sanchezPhoto = team === "BB's Bold Team" && key(p.name) === key('Cristopher Sanchez');
      const yamamotoPhoto = team === "BB's Bold Team" && p.name === 'Yoshinobu Yamamoto';
      const woodPhoto = team === 'Gunnarrhea' && p.name === 'James Wood';
      const gunnarPhoto = team === 'Gunnarrhea' && p.name === 'Gunnar Henderson';
      const ceasePhoto = team === 'Gunnarrhea' && p.name === 'Dylan Cease';
      const actionPhoto = ceasePhoto || gunnarPhoto || woodPhoto || yamamotoPhoto || sanchezPhoto || petePhoto || ohtaniPhoto || mcgoniglePhoto || skenesPhoto || rasmussenPhoto || yordanPhoto;
      const photoSrc = ceasePhoto ? 'assets/players/dylan-cease-blue-jays-reference-edit.png' : gunnarPhoto ? 'assets/players/gunnar-henderson-orioles-edited.png' : woodPhoto ? 'assets/players/james-wood-nationals-cutout.png' : yamamotoPhoto ? 'assets/players/yamamoto-dodgers-edited.png' : sanchezPhoto ? 'assets/players/cristopher-sanchez-phillies-edited.png' : petePhoto ? 'assets/players/pete-crow-armstrong-cubs-pinstripes-edited.png' : yordanPhoto ? 'assets/players/yordan-alvarez-ken-lund-cutout.png' : rasmussenPhoto ? 'assets/players/drew-rasmussen-2026-cc0.jpg' : skenesPhoto ? 'assets/players/paul-skenes-johnmaxmena2.png' : mcgoniglePhoto ? 'assets/players/kevin-mcgonigle-2026-cc0.jpg' : ohtaniPhoto ? 'assets/players/ohtani-all-pro-reels-53677190890.jpg' : p.mlbId && /^\d+$/.test(String(p.mlbId)) ? `https://img.mlbstatic.com/mlb-photos/image/upload/w_640,q_auto:good/v1/people/${p.mlbId}/headshot/67/current` : '';
      return `<article aria-label="${escape(p.name)}" class="cornerstone ${i === 0 ? 'is-franchise' : ''}" style="--cornerstone-order:${i === 0 ? 2 : i === 1 ? 1 : 3};--portrait-left:${i === 0 ? '27.5%' : i === 1 ? '-1%' : '56%'}">
        <span class="cornerstone-rank">${i === 0 ? 'Franchise player' : '#' + (i + 1) + ' cornerstone'}</span>
        <div class="cornerstone-portrait ${actionPhoto ? 'is-action-photo' : ''} ${mcgoniglePhoto ? 'is-mcgonigle' : ''} ${skenesPhoto ? 'is-skenes' : ''} ${rasmussenPhoto ? 'is-rasmussen' : ''} ${yordanPhoto ? 'is-yordan-cutout' : ''} ${petePhoto ? 'is-pete-cutout' : ''} ${sanchezPhoto ? 'is-sanchez-cutout' : ''} ${yamamotoPhoto ? 'is-yamamoto-cutout' : ''} ${woodPhoto ? 'is-wood-cutout' : ''} ${gunnarPhoto ? 'is-gunnar-cutout' : ''} ${ceasePhoto ? 'is-cease-cutout' : ''}"><span aria-hidden="true">${escape(initials)}</span>${photoSrc ? `<img src="${photoSrc}" alt="${actionPhoto ? escape(p.name.replace(/-[HP]$/, '')) + (ceasePhoto ? ' in a Blue Jays jersey, AI-aged fan portrait' : gunnarPhoto ? ' in an edited Orioles jersey' : yamamotoPhoto ? ' in an edited Dodgers uniform' : sanchezPhoto ? ' in an edited Phillies uniform' : skenesPhoto || rasmussenPhoto ? ' pitching' : ' batting') : ''}" loading="lazy">` : ''}</div>
      </article>`;
    }).join('')}</div>`;
  const credits = [];
  if (boCollage) credits.push(
    { player: 'Caminero (background removed)', author: 'Raysfanjake1984', source: 'https://commons.wikimedia.org/wiki/File:JuniorCaminero.jpg', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    { player: 'Kurtz (AI-assisted enlargement; background removed)', author: 'Sgt. 1st Class Brittany Primavera / U.S. Army', source: 'https://commons.wikimedia.org/wiki/File:Nick_Kurtz_(260715-A-BN614-5826)_(cropped).jpg', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Army' },
    { player: 'Crochet (AI-edited Red Sox uniform and shaved hair; background removed)', author: 'Baumology', source: 'https://commons.wikimedia.org/wiki/File:GarrettCrochetTennessee.jpg', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' }
  );

  if (mizerableCollage) credits.push(
    { player: 'Misiorowski (background removed)', author: 'Drovetochicago', source: 'https://commons.wikimedia.org/wiki/File:Jacob_Misiorowski.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    { player: 'Guerrero Jr. (background and netting removed; facial shadows lightened)', author: 'Hexagonsunshine', source: 'https://commons.wikimedia.org/wiki/File:Vladimir_guerrero_jr.jpg', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    { player: 'Pena (background removed)', author: 'Johnmaxmena2', source: 'https://commons.wikimedia.org/wiki/File:2025_Astros-Cardinals_Apr_14_Jeremy_Pe%C3%B1a.png', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }
  );
  if (heornyCollage) credits.push(
    { player: 'Baldwin (background removed)', author: 'Reunion', source: 'https://commons.wikimedia.org/wiki/File:DrakeBaldwin.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    { player: 'Pages (background and netting removed)', author: 'DewyCakes', source: 'https://commons.wikimedia.org/wiki/File:Andy_Pages_Batting_at_Dodger_Stadium_April_15,_2026_(cropped).jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    { player: 'Luzardo (AI-edited Phillies uniform; background removed)', author: 'Ryan Casey Aguinaldo', source: 'https://commons.wikimedia.org/wiki/File:Jesus_Luzardo_5.5.22.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }
  );
  if (mactownCollage) credits.push(
    { player: 'Murakami (AI-edited White Sox uniform; background removed)', author: 'とらとうはんしん', source: 'https://commons.wikimedia.org/wiki/File:Munetaka_Murakami.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    { player: 'Harper (background removed)', author: "Ian D'Andrea", source: 'https://commons.wikimedia.org/wiki/File:Bryce_Harper_(33639746228)_(cropped).jpg', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' },
    { player: 'Schwarber (background removed)', author: 'Zach McHoul', source: 'https://commons.wikimedia.org/wiki/File:2023-04-08_kyle_schwarber_swinging.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }
  );
  if (johnsCollage) credits.push(
    { player: 'Chourio (background removed)', author: 'Sewageboy', source: 'https://commons.wikimedia.org/wiki/File:Chourio_1_61824.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    { player: 'Soto (background removed)', author: 'Johnmaxmena2', source: 'https://commons.wikimedia.org/wiki/File:Soto_March_31_2026_837seqn).png', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    { player: 'Rodriguez (background removed)', author: 'Jsayre64', source: 'https://commons.wikimedia.org/wiki/File:Orlando_Arcia_and_Julio_Rodr%C3%ADguez_in_Seattle,_2024.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }
  );
  if (team === 'Gunnarrhea' && top.some(p => p.name === 'Dylan Cease')) credits.push({ player: 'Cease (AI-aged appearance, mustache and longer hair; Blue Jays uniform edit; noncommercial fan artwork)', author: 'Jeffrey Hyde', source: 'https://www.flickr.com/photos/125788546@N06/51275463823/', license: 'CC BY-NC-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/2.0/' });
  if (team === 'Gunnarrhea' && top.some(p => p.name === 'Gunnar Henderson')) credits.push({ player: 'Henderson (AI-edited Orioles jersey; background removed)', author: 'Reunion', source: 'https://commons.wikimedia.org/wiki/File:GunnarHenderson.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' });
  if (team === 'Gunnarrhea' && top.some(p => p.name === 'James Wood')) credits.push({ player: 'Wood (AI-assisted background and netting removal)', author: 'Keiteay', source: 'https://commons.wikimedia.org/wiki/File:James_Wood.jpg', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' });
  if (goodyearCollage) credits.push(
    { player: 'De La Cruz (AI-edited Reds uniform; background removed)', author: 'Minda Haas Kuhlmann', source: 'https://www.flickr.com/photos/50264926@N02/52865743081/', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/' },
    { player: 'Witt Jr. (background removed)', author: 'Johnmaxmena2', source: 'https://commons.wikimedia.org/wiki/File:4119_Royals_Cleveland_July_2025_bobby_witt_jr.png', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
    { player: 'Skubal (AI-edited Dodgers uniform; background removed)', author: 'Jeffrey Hyde', source: 'https://commons.wikimedia.org/wiki/File:Tarik_Skubal_(53947874625)_(cropped).jpg', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' }
  );
  if (team === "BB's Bold Team" && top.some(p => p.name === 'Yoshinobu Yamamoto')) credits.push({ player: 'Yamamoto (AI-edited Dodgers uniform; background removed)', author: 'Orixbaseballclub', source: 'https://commons.wikimedia.org/wiki/File:Yamamoto_Yoshinobu_Orix_Buffaloes_20220514.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' });
  if (team === "BB's Bold Team" && top.some(p => key(p.name) === key('Cristopher Sanchez'))) credits.push({ player: 'S?nchez (AI-edited Phillies uniform; microphone and background removed)', author: 'Latinos En Pelota', source: 'https://commons.wikimedia.org/wiki/File:Cris_Sanchez_(tn7yj_4wAM4).png', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' });
  if (team === "BB's Bold Team" && top.some(p => p.name === 'Pete Crow-Armstrong')) credits.push({ player: 'Crow-Armstrong (AI-edited Cubs pinstripes and helmet; background removed)', author: 'Minda Haas Kuhlmann', source: 'https://www.flickr.com/photos/mindahaas/53112631163/', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/' });
  if (camCutout) credits.push({ player: 'Schlittler (AI-edited Yankees cap and jersey; background removed)', author: 'Jeffrey Hyde', source: 'https://www.flickr.com/photos/125788546@N06/54476798685/', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' });
  if (team === 'Dixon Cider' && top.some(p => p.name === 'Yordan Alvarez')) credits.push({ player: 'Alvarez (AI-assisted background removal)', author: 'Ken Lund', source: 'https://www.flickr.com/photos/kenlund/48730304951/', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' });
  if (team === 'Dixon Cider' && top.some(p => /^Shohei Ohtani(?:-[HP])?$/.test(p.name))) credits.push({ player: 'Ohtani', author: 'Joe Glorioso / All-Pro Reels', source: 'https://commons.wikimedia.org/wiki/File:Dodgers_at_Nationals_(53677190890).jpg', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' });
  if (top.some(p => p.name === 'Kevin McGonigle')) credits.push({ player: 'McGonigle', author: 'D. Benjamin Miller', source: 'https://commons.wikimedia.org/wiki/File:Kevin_McGonigle,_May_13,_2026_(001)_(cropped).jpg', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' });
  if (top.some(p => p.name === 'Paul Skenes')) credits.push({ player: 'Skenes', author: 'Johnmaxmena2', source: 'https://commons.wikimedia.org/wiki/File:Paul_Skenes_of_the_Pirates.png', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' });
  if (top.some(p => p.name === 'Drew Rasmussen')) credits.push({ player: 'Rasmussen', author: 'Raysfanjake1984', source: 'https://commons.wikimedia.org/wiki/File:DrewRasmussen2026.jpg', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' });
  if (credits.length) target.innerHTML += '<details class="banner-credits"><summary>Photo credits</summary><ul>' + credits.map(c => '<li>' + escape(c.player) + ': ' + escape(c.author) + ' &middot; <a href="' + c.source + '" target="_blank" rel="noopener">Original</a> &middot; <a href="' + c.licenseUrl + '" target="_blank" rel="noopener">' + c.license + '</a></li>').join('') + '</ul><p>' + (bbCollage || goodyearCollage || johnsCollage || mactownCollage || heornyCollage || mizerableCollage || boCollage ? 'Backgrounds removed and portraits resized and combined using AI-assisted editing; uniform edits are noted above. Adapted collage: <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.' : dixonCollage ? 'Backgrounds removed and players combined with AI-assisted editing. Adapted collage: <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA 2.0</a>.' : sharedCollage ? 'Backgrounds removed and players arranged with AI-assisted editing. Adapted collage: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.' : 'Photos cropped and edge-faded for display.') + '</p></details>';
  target.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    if (img.classList.contains('cornerstones-player-collage')) img.parentElement.classList.remove('has-player-collage');
    img.remove();
  }, { once: true }));
}
document.addEventListener('uti:team-selected', event => render(event.detail.team));
// The page may have finished its initial render before this module loaded.
render(document.getElementById('teamHead')?.dataset?.team || document.getElementById('teamSelect')?.value);
// Also handle a cached team-page script that predates the selection event.
const header = document.getElementById('teamHead');
if (header) new MutationObserver(() => render(header.dataset.team || document.getElementById('teamSelect')?.value))
  .observe(header, { childList: true, subtree: true });

})();
