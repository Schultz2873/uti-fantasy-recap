/*
  Fantrax league IDs used by the import scripts. Fantrax gives the league a new ID each time it's
  renewed for a new season (the ID is in the league's URL: fantrax.com/fantasy/league/<id>/home).

  rosterLeague  where team rosters come from (scripts/update-rosters.js): the newest league,
                so offseason moves show on the team pages.
  statsLeague   where weekly category stats come from (scripts/import-fantrax.js): the season being
                played. Switch it to the new league when that season's first week is finished.
*/
module.exports = {
  leagues: {
    2026: "6cjtuqcvmicf87yd",
    2027: "oiz2eqh6mvnrbhzy"
  },
  rosterLeague: "oiz2eqh6mvnrbhzy",
  statsLeague: "6cjtuqcvmicf87yd"
};
