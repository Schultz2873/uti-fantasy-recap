UTI Fantasy Baseball

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
