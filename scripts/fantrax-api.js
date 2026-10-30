// Documented Fantrax REST API. Credentials stay in POST bodies, never URLs or logs.
async function fantraxApi(endpoint, parameters = {}) {
  if (!/^[a-zA-Z]+$/.test(endpoint)) throw new Error("Invalid Fantrax endpoint");
  const secret = process.env.FANTRAX_SECRET_ID?.trim();
  // League endpoints require leagueId in the URL even for POST requests.
  const query = new URLSearchParams(Object.entries(parameters).map(([key, value]) => [key, String(value)]));
  const response = await fetch(`https://www.fantrax.com/fxea/general/${endpoint}?${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "UTIFantasyRecap/1.0" },
    body: JSON.stringify({ ...parameters, ...(secret && parameters.leagueId ? { userSecretId: secret } : {}) }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Fantrax ${endpoint} returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data || data.error || data.pageError) throw new Error(`Fantrax ${endpoint} returned an API error`);
  return data;
}

module.exports = { fantraxApi };
