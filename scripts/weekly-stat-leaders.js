const weeklyLeaderCategories = [
    { label: "HR", group: "hitting", stat: "homeRuns", type: "max" },
    { label: "RBI", group: "hitting", stat: "rbi", type: "max" },
    { label: "Runs", group: "hitting", stat: "runs", type: "max" },
    { label: "Total Bases", group: "hitting", stat: "totalBases", type: "max" },
    { label: "AVG", group: "hitting", stat: "avg", type: "max", decimals: 3, minStat: "atBats", minValue: 15 },
    { label: "NSB", group: "hitting", custom: "nsb", type: "max" },
    { label: "K", group: "pitching", stat: "strikeOuts", type: "max" },
    { label: "ERA", group: "pitching", stat: "era", type: "min", decimals: 2, minStat: "inningsPitched", minValue: 5 },
    { label: "WHIP", group: "pitching", stat: "whip", type: "min", decimals: 3, minStat: "inningsPitched", minValue: 5 },
    { label: "SV+H", group: "pitching", custom: "svh", type: "max" }
];

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function displayDate(date) {
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
    });
}

function getWeeklyDateRange() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ... Saturday = 6
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysSinceMonday);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    return {
        startDate,
        endDate,
        start: formatDate(startDate),
        end: formatDate(endDate)
    };
}

function inningsToNumber(value) {
    if (!value) return 0;

    const [whole, partial] = String(value).split(".");
    const outs = Number(whole || 0) * 3 + Number(partial || 0);

    return outs / 3;
}

function getStatValue(player, category) {
    const stat = player.stat || {};

    if (category.custom === "nsb") {
        return Number(stat.stolenBases || 0) - Number(stat.caughtStealing || 0);
    }

    if (category.custom === "svh") {
        return Number(stat.saves || 0) + Number(stat.holds || 0);
    }

    if (category.stat === "inningsPitched") {
        return inningsToNumber(stat.inningsPitched);
    }

    return Number(stat[category.stat]);
}

function passesMinimum(player, category) {
    if (!category.minStat) return true;

    const stat = player.stat || {};
    let value = stat[category.minStat];

    if (category.minStat === "inningsPitched") {
        value = inningsToNumber(value);
    } else {
        value = Number(value || 0);
    }

    return value >= category.minValue;
}

function formatLeaderValue(value, category) {
    if (category.label === "AVG") {
        return Number(value).toFixed(3).replace(/^0/, "");
    }

    if (typeof category.decimals === "number") {
        return Number(value).toFixed(category.decimals);
    }

    return value;
}

async function fetchWeeklyStats(group, start, end) {
    const url =
        `https://statsapi.mlb.com/api/v1/stats` +
        `?stats=byDateRange` +
        `&group=${group}` +
        `&playerPool=all` +
        `&sportIds=1` +
        `&gameType=R` +
        `&startDate=${start}` +
        `&endDate=${end}` +
        `&limit=1000`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Could not load ${group} stats`);
    }

    const data = await response.json();
    return data.stats?.[0]?.splits || [];
}

const leaderRotationState = new Map();
let weeklyLeadersCache = [];

function findLeader(players, category) {
    const eligiblePlayers = players
        .filter(player => passesMinimum(player, category))
        .map(player => ({
            player,
            value: getStatValue(player, category)
        }))
        .filter(item => Number.isFinite(item.value));

    eligiblePlayers.sort((a, b) => {
        return category.type === "min"
            ? a.value - b.value
            : b.value - a.value;
    });

    const leader = eligiblePlayers[0] || null;

    if (!leader) {
        return null;
    }

    const tiedLeaders = eligiblePlayers.filter(item => {
        return Math.abs(item.value - leader.value) < 0.000001;
    });

    return {
        ...leader,
        tiedCount: tiedLeaders.length,
        tiedLeaders
    };
}

function formatTieCount(tiedCount) {
    if (!tiedCount || tiedCount <= 1) {
        return "";
    }

    return `${tiedCount} tied`;
}

function safeIndex(index, total) {
    return ((index % total) + total) % total;
}


function normalizePlayerName(name) {
    return String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.'’]/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
}

function getFantasyOwnersLookup() {
    return Object.fromEntries(
        Object.entries(window.FANTASY_OWNERS || {}).map(([player, fantasyTeam]) => [
            normalizePlayerName(player),
            fantasyTeam
        ])
    );
}

function getFantasyOwner(playerName) {
    const ownersLookup = getFantasyOwnersLookup();
    return ownersLookup[normalizePlayerName(playerName)] || "";
}

function renderLeaderCards(leaders) {
    const grid = document.getElementById("weeklyLeadersGrid");

    if (!grid) return;

    grid.innerHTML = leaders.map(leader => {
        const hasTie = leader.tiedLeaders.length > 1;
        const currentIndex = safeIndex(leader.currentIndex || 0, leader.tiedLeaders.length || 1);
        const currentLeader = leader.tiedLeaders[currentIndex] || { name: leader.name, team: leader.team };
        const fantasyOwner = getFantasyOwner(currentLeader.name);
        const tieText = formatTieCount(leader.tiedLeaders.length);
        const positionText = hasTie ? `${currentIndex + 1}/${leader.tiedLeaders.length}` : "";

        return `
        <article class="leader-card">
          <div class="leader-top-row">
            <div class="leader-category">${leader.label}</div>
            ${hasTie ? `<div class="leader-tie">${tieText}</div>` : ""}
          </div>
          <div class="leader-name">${currentLeader.name}</div>
          <div class="leader-team">${currentLeader.team}</div>
          <div class="leader-owner-line">
            ${fantasyOwner ? `<span class="fantasy-owner-badge">${fantasyOwner}</span>` : ""}
          </div>
          <div class="leader-bottom-row">
            <div class="leader-value">${leader.value}</div>
            ${hasTie ? `
              <div class="leader-switcher" aria-label="Switch tied ${leader.label} leaders">
                <button class="leader-switch-btn" type="button" data-leader-nav data-category="${leader.label}" data-direction="-1" aria-label="Previous tied leader">‹</button>
                <span class="leader-count-note">${positionText}</span>
                <button class="leader-switch-btn" type="button" data-leader-nav data-category="${leader.label}" data-direction="1" aria-label="Next tied leader">›</button>
              </div>
            ` : ""}
          </div>
        </article>
      `;
    }).join("");

    document.querySelectorAll("[data-leader-nav]").forEach(button => {
        button.addEventListener("click", event => {
            const category = event.currentTarget.dataset.category;
            const direction = Number(event.currentTarget.dataset.direction || 1);
            const leader = weeklyLeadersCache.find(item => item.label === category);

            if (!leader || leader.tiedLeaders.length <= 1) return;

            leader.currentIndex = safeIndex((leader.currentIndex || 0) + direction, leader.tiedLeaders.length);
            leaderRotationState.set(category, leader.currentIndex);
            renderLeaderCards(weeklyLeadersCache);
        });
    });
}

async function loadWeeklyLeaders() {
    const grid = document.getElementById("weeklyLeadersGrid");
    const rangeTag = document.getElementById("weeklyLeaderRange");

    if (!grid || !rangeTag) {
        console.error("MLB Weekly Leaders elements were not found on the page.");
        return;
    }

    const { startDate, endDate, start, end } = getWeeklyDateRange();

    rangeTag.textContent = `${displayDate(startDate)} - ${displayDate(endDate)}`;

    try {
        const [hittingStats, pitchingStats] = await Promise.all([
            fetchWeeklyStats("hitting", start, end),
            fetchWeeklyStats("pitching", start, end)
        ]);

        weeklyLeadersCache = weeklyLeaderCategories.map(category => {
            const source = category.group === "hitting" ? hittingStats : pitchingStats;
            const leader = findLeader(source, category);

            if (!leader) {
                return {
                    label: category.label,
                    name: "N/A",
                    team: "",
                    value: "N/A",
                    tiedLeaders: [{ name: "N/A", team: "" }],
                    currentIndex: 0
                };
            }

            const tiedLeaders = leader.tiedLeaders.map(item => ({
                name: item.player.player?.fullName || "N/A",
                team: item.player.team?.name || ""
            }));

            return {
                label: category.label,
                name: tiedLeaders[0]?.name || "N/A",
                team: tiedLeaders[0]?.team || "",
                value: formatLeaderValue(leader.value, category),
                tiedLeaders,
                currentIndex: safeIndex(leaderRotationState.get(category.label) || 0, tiedLeaders.length || 1)
            };
        });

        renderLeaderCards(weeklyLeadersCache);
    } catch (error) {
        console.error(error);

        grid.innerHTML = `
        <article class="article-card">
          <p class="article-summary">
            MLB weekly leaders could not load right now.
          </p>
        </article>
      `;
    }
}

document.addEventListener("DOMContentLoaded", loadWeeklyLeaders);