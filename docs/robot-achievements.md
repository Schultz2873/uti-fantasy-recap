# Wearable achievements

The robot is the trophy case. Owners manually equip earned items; the collection does not affect fantasy scoring. These rules are a proposed system shown against the 2026 archive, not retroactively declared official league awards.

| Gear | Slot | Rarity | Requirement |
| --- | --- | --- | --- |
| Team cap / batting helmet | Headwear | Common | Included |
| Home / away jersey | Jersey | Common | Included |
| Clubhouse bat / fielding glove | Hands | Common | Included |
| Champion crown | Headwear | Legendary | Recorded league champion |
| Gold jersey | Jersey | Epic | 10 regular-season matchup wins |
| Streakbreaker bat | Hands | Epic | 3 consecutive regular-season matchup wins |
| Bonds-inspired power bat | Hands | Legendary | A weekly league HR lead; ties qualify |
| Ichiro-inspired contact bat | Hands | Rare | 5 regular-season AVG wins against opponents |
| Ryan-inspired strikeout glove | Hands | Rare | 5 regular-season K wins against opponents |
| Clean-inning laser visor | Eyes | Rare | 5 regular-season ERA wins against opponents |
| Precision optic visor | Eyes | Epic | 8 regular-season WHIP wins against opponents |
| Silver shoulder armor | Shoulders | Epic | Recorded league runner-up |
| Pennant power core | Chest | Legendary | Recorded regular-season first place |
| Victory cape | Back | Rare | 5 regular-season matchup wins |
| Rickey-inspired speed cleats | Feet | Legendary | 5 regular-season net-steals wins against opponents |
| Rocket boots | Feet | Epic | 5 consecutive regular-season matchup wins |
| Rookie baseball drone | Companion | Rare | First regular-season matchup win |
| Trade desk headset | Headwear | Rare | Commissioner Trade of the Year award; not automated |

Each item shows its rarity, requirement, equipment slot, progress, and earned season/week when derivable. The armory filters All, Unlocked, Equipped, and Locked. Optional slots can be cleared. The active locker uses Slugger only. Complete character poses integrate the cap, jersey, gripped bat, and worn mitt; local SVG overlays still supply prototype armor, effects, and other accessories. Player-inspired bat/mitt variants use finishes on those integrated poses; they are not replicas of historic equipment. Original source artwork is retained for future edits. Soft core/drone animation respects reduced-motion preferences.

## Data boundaries

The weekly input is `data/weekly-team-stats.js`; trophies come from `data/history/season-results.js`. The current page binds these to 2026 explicitly. The engine accepts an explicit season and rejects conflicting row season tags; untagged rows must be supplied from that season's snapshot. A season rollover must update this binding or load a retained historical snapshot. Do not substitute the computer's current year.

Only mutually consistent paired official scores totaling 16 categories count as completed regular-season results. A category win is a strict comparison of cached stat values; AVG needs nonzero AB on both teams and rate pitching categories need nonzero IP. These preview comparisons do not implement any additional league-specific minimum-innings eligibility rules. Missing data does not grant gear, streaks break across missing weeks, and HR league leads require ten valid team rows. Trade, waiver, injury, bench, and trash-talk awards need new data or commissioner verification.

## Next backend stage

Store owner-to-team assignments, a versioned gear catalog, append-only awards keyed by team/season/achievement, and equipped item IDs. A trusted job evaluates finalized results and writes each award once. Owners may update only their own outfits and equip only awarded or starter items. Public matchup cards read shared outfits. Define how commissioner corrections and revoked awards work before enabling authoritative unlocks. The browser preview currently recomputes eligibility and stores looks locally; it is not an ownership or anti-cheat boundary.
