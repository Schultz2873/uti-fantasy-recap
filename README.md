UTI Fantasy Baseball

Draft Night:
- The navy/teal dashboard shows Best Available, the full round-by-round board,
  and the latest six picks together. Full board expands the table; selection
  filters show prospects, auction, or both. Scroll to inspect all teams/rounds.
- Auction board rounds follow nomination turns; multiple wins by the same team
  in a nomination round stack in that team's cell. Passes remain in the history.
- Open `draft-night.html` through the website (ES modules require HTTP hosting).
- Verify roster counts after cuts under Commissioner desk before drafting.
- The prospect stage repeats the draft order; confirm Fantrax minor eligibility
  for each selection. Pass skips a turn. Switch to Auction draft for sales.
- Auction sales use whole dollars, with a provisional $1 minimum. Record the
  final winner after live bidding; apply handbook tie rules in the room.
- Additional fund purchases add $50 of auction funds per $10 real-money purchase.
- Open the big-screen link in the same browser on the commissioner computer.
  Both tabs must use the same site origin and browser profile. Other devices
  do not synchronize. This is a local workstation, not authenticated multiuser access.
- State persists in localStorage. Export JSON backups; restore replaces the
  current session after confirmation and can be undone during that session.
- Picks do not write to Fantrax. Available rankings exclude cached rostered
  players; refresh the roster cache after cuts. Rankings do not verify eligibility.
- Draft Night is linked from the homepage draft card and League Hub menu.

Trade package comparison:
- The optional extra-player-slot adjustment deducts a replacement score for each
  extra player in the larger package. Picks do not consume player slots. Equal
  player counts keep their original totals. Adjusted totals cannot fall below zero.
- Replacement score is the median of the ten highest rated current free agents
  (or all rated free agents if fewer than ten). It follows the selected score mode.
  If none are rated, comparison uses raw totals. This assumes comparable roster
  slots; actual cuts, position needs, minors, and IL capacity may differ.
- The analyzer displays raw totals, deductions, and the baseline and offers a
  checkbox to disable the adjustment. Individual ratings remain unchanged.
- Run `node scripts/audit-dynasty-ratings.mjs` to regenerate
  `exports/dynasty-ratings-audit.md`. This checks model consistency and highlights
  assumptions; it does not validate future performance or trade market prices.
- Tests: `node --test scripts/trade-package-values.test.mjs`.

Dynasty outlook and performance views:
- `scripts/dynasty-outlook.mjs` combines the unadjusted FantraxHQ rank-derived
  baseline with user-exported 2024?2026 actual Fantrax scores, weighted 60% for
  2026, 30% for 2025, and 10% for 2024. Each season is also weighted by workload;
  missing seasons retain their share in the expert baseline. Full-sample weights
  are 70% baseline / 30% actual production. No additional age or scarcity bonuses.
- Production weight shrinks linearly with workload, reaching 30% at 500 AB,
  150 IP for starters, or 60 IP for relievers. A missing score contributes no
  production weight; a prospect with an expert baseline keeps that baseline.
- These weights and thresholds are provisional assumptions, not a fitted or
  validated dynasty forecast. The source ranking already supplies long-term judgment.
- No expert baseline means no dynasty score; an actual performance score alone
  is not used to invent future upside. Draft-pick estimates stay manual.
- The analyzer defaults to Dynasty outlook and offers 2026 league performance
  separately. Changing the view preserves both trade packages and raw scores.
- Tests: `node --test scripts/dynasty-outlook.test.mjs`.

Fantrax actual-season player scores (trade analyzer display):
- The analyzer's main score now uses the user-confirmed 2026 actual-stat exports,
  cached in `data/fantrax-player-scores.js`, with full precision preserved.
- Refresh with `node scripts/import-fantrax-player-scores.mjs --season 2026 --hitters "hitters.csv" --pitchers "pitchers.csv"`.
  It validates both files before replacing the cache. This is a manual CSV update;
  roster and MLB-stat jobs do not refresh these exported scores.
- Score is copied directly, without the model's rank curve or scoring adjustment.
  Empty overall ranks are unrated even if the CSV's Score cell says zero.
- Current ownership remains sourced from `data/rosters.js`. Export Status values
  are never used for ownership. Hitter/pitcher Ohtani entries remain separate.
- Dynasty estimates stay separate in Rating details; source performance scores
  do not replace the shared dynasty values used for title odds.
- A performance comparison cannot determine dynasty trade fairness. Prospects
  without a ranked actual score and draft picks prevent a complete verdict.
- Tests: `node --test scripts/fantrax-player-scores.test.mjs`.

FantraxHQ dynasty baseline:
- League scoring adjustment: source ranks stay unchanged. For established MLB
  samples, estimated points compare the mean z-score in UTI's 8 hitting or 8
  pitching categories against a conventional 5x5 benchmark (R/HR/RBI/SB/AVG;
  W/SV/K/ERA/WHIP). This is a benchmark, not a claim about FantraxHQ's exact model.
  Each z-score of difference changes baseline points by 10%, capped at +/-15%
  before rounding. This is a bounded modeling assumption, not a validated forecast.
  Prospect labels, limited samples, and missing expert ranks receive no adjustment.
  The player details show baseline points and the league adjustment separately.
  This step does not estimate 10-team replacement levels or positional scarcity.
- To import a downloaded CSV instead of fetching the website:
  `node scripts/update-fantraxhq.mjs --csv "path/to/rankings.csv" --source-date YYYY-MM-DD`.
  Use the rankings publication/update date, not the download date. The importer
  reads the Roto column even when the file is sorted by Points, preserves UTF-8
  names, and validates the full table before writing. Then regenerate shared
  values with `node scripts/update-player-values.js`.
- `node scripts/update-fantraxhq.mjs` reads the public Roto table at
  https://fantraxhq.com/fantasy-baseball-dynasty-rankings/ and caches numeric ranks,
  names, positions, teams, and source date in `data/fantraxhq-rankings.js`.
- The **Update FantraxHQ Dynasty Rankings** workflow checks weekly and can be
  run manually. Changed columns, invalid ranks, or incomplete tables fail before
  replacing the cache. No account or key is used; no access blocks are bypassed.
- The imported source rank replaces the old weighted dynasty formula for matched
  players. Source date and attribution appear in the analyzer. Extended-rank gaps
  are preserved, and missing players keep separately labeled local estimates.
- Trade points use the site's curve `round(100 / sqrt(1 + (rank - 1) / 25))`.
  Those points are not source-published prices or calibrated trade market values.
- MLB production/category profiles remain independent. The source targets
  15-team roto, while UTI's category analysis uses its own league format.
- The source's DH-only Ohtani entry applies to the hitter asset, not the pitcher.
- Tests: `node --test scripts/fantraxhq.test.mjs`.

Stats-based category profiles (separate from dynasty trade points):
- `node scripts/update-mlb-stat-values.mjs` reads public MLB regular-season
  statistics and caches `data/mlb-stat-snapshot.js`. No paid rankings or API key.
- The weekly **Update MLB Stats-Based Player Values** workflow refreshes the
  snapshot and shared player values. `MLB_STATS_SEASON` can override the latest year.
  January through March defaults to the prior season; April onward uses this year.
- Three seasons are weighted 60/30/10. All counting totals retain observed workload;
  there is no automatic extrapolation of a partial season to a full season.
- Hitting: R, HR, RBI, net steals (SB-CS), batting average, TB, strikeouts, BB.
  Pitching: W, losses, QS, net saves (SV-BS), K, ERA, WHIP, opponent AVG.
- Rates become contributions above the MLB comparison baseline, weighted by AB
  or actual innings (outs / 3). Hitter strikeouts use expected-minus-actual K at
  the baseline PA rate so greater playing time alone is not punished twice.
- Category contributions become equal-weight z-scores within separate hitter and
  pitcher pools (minimum weighted 100 PA / 20 IP). Z-scores are capped at +/-3.
  Production points = 50 + 15 * mean category z-score, bounded 1–100.
- Observed production does not overwrite dynasty points. The dynasty estimates
  retain their separate manually maintained inputs, including age and upside.
  Limited MLB samples must not automatically erase a prospect's long-term value.
- The analyzer reconciles against `data/rosters.js`, not historical owner data.
  All rostered players remain selectable. Missing valuations show as Unrated
  and prevent a complete winner/fairness verdict rather than counting as zero.
- Players match by normalized name plus birth date where available; ambiguous
  matches are excluded. Ohtani hitter/pitcher assets use separate MLB stat groups.
  Verified statistical role overrides a generic position when building categories.
- Prospects, tiny samples, and unmatched players retain provisional local values.
  Healthy players versus injured players are not inferred from a missing stat line.
  A zero latest-season sample is labeled limited, not described as an injury.
- Team needs, risk labels, upside tiers, draft pick values, and fallback prospect
  values remain manually maintained. This is a production-based estimate, not
  expert consensus, future projections, or an objective price for a trade.
- The snapshot stores weighted stat inputs so the calculation is reproducible.
  Incomplete responses abort before replacing the existing snapshot.
- Tests: `node --test scripts/player-stat-model.test.mjs scripts/player-values.test.mjs`.

FantasyPros dynasty ratings:
- Obtain a production API key from https://www.fantasypros.com/api-data/ and
  add it to GitHub Actions secrets as `FANTASYPROS_API_KEY`. Free sample access
  is for prototypes; choose access that covers the site's use.
- Run **Update FantasyPros Dynasty Rankings** manually to activate; it then
  checks weekly on Wednesdays. The optional season input overrides the current year.
- The importer requests MLB, overall (`ALL`), dynasty (`DYN`), roto (`ROTO`)
  rankings from the documented v2 API. It stores only ranking fields, not the key.
- Until a valid import succeeds, existing estimates stay active. Missing keys
  produce a workflow warning; invalid responses fail without overwriting data.
- Matched expert ranks are converted to this site's estimated points using
  `100 / sqrt(1 + (rank - 1) / 25)`, rounded to an integer. This is a local
  display scale, not a FantasyPros trade value or a calibrated trade price.
  Dynasty age/upside weights are not added again to those expert ranks.
- Unmatched or ambiguous players retain local estimates. Combined Ohtani ranks
  are not assigned to both of Fantrax's separate hitter/pitcher assets.
- Category impact remains heuristic until a separate projection import is added.
- Tests: `node --test scripts/fantasypros.test.mjs scripts/player-values.test.mjs`.

Fantrax updates use the documented REST API with an identifying User-Agent.
Store the account Secret ID in the GitHub Actions secret `FANTRAX_SECRET_ID`;
the workflows pass it to league requests in the POST body. Do not commit it or
put it in browser code. Public league endpoints also work without a credential.

- `scripts/update-rosters.js` refreshes current rosters daily.
- `scripts/import-fantrax.js` imports completed weekly category totals on Mondays
  and Tuesdays, keeping existing AB/H/IP values and excluding consolation games.
- League IDs for each season are configured in `scripts/fantrax-config.js`.
- Test the API conversion with `node --test scripts/fantrax-weekly.test.js`.

The weekly importer no longer uses `FANTRAX_COOKIE`. After the first successful
GitHub run of the updated workflow, that old repository secret can be removed.
Unexpected API data or an unresolved playoff tie stops the import before files
are written, preserving the saved data for review.
