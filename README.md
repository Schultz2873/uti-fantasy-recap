UTI Fantasy Baseball

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
