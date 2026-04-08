const { randomUUID } = require('crypto');
const { getAllPlayers } = require('../player/playerService');

const ARENA_BATTLE_TIMEOUT = 10 * 60 * 1000;
const MAX_ACTIVE_CHESTS = 3;

const ARENA_LEAGUES = [
    { id: 'bronze', name: 'Bronze', emoji: '🥉', minPoints: 0 },
    { id: 'silver', name: 'Prata', emoji: '🥈', minPoints: 500 },
    { id: 'gold', name: 'Ouro', emoji: '🥇', minPoints: 1200 },
    { id: 'diamond', name: 'Diamante', emoji: '💎', minPoints: 2500 },
    { id: 'master', name: 'Mestre', emoji: '👑', minPoints: 4500 },
    { id: 'legend', name: 'Lendário', emoji: '🌌', minPoints: 7000 }
];

const ARENA_CHEST_CONFIG = {
    wood: {
        id: 'wood',
        name: 'Baú de Madeira',
        emoji: '🪵',
        unlockMs: 15 * 60 * 1000,
        arenaCoins: [20, 35],
        gold: [30, 60],
        keyChance: 0.05,
        gloriaChance: 0.02,
        consumables: ['potionHp']
    },
    iron: {
        id: 'iron',
        name: 'Baú de Ferro',
        emoji: '🪙',
        unlockMs: 60 * 60 * 1000,
        arenaCoins: [40, 60],
        gold: [50, 100],
        keyChance: 0.08,
        gloriaChance: 0.04,
        consumables: ['potionEnergy']
    },
    silver: {
        id: 'silver',
        name: 'Baú de Prata',
        emoji: '🥈',
        unlockMs: 3 * 60 * 60 * 1000,
        arenaCoins: [80, 120],
        gold: [100, 180],
        keyChance: 0.12,
        gloriaChance: 0.08,
        consumables: ['tonicStrength']
    },
    gold: {
        id: 'gold',
        name: 'Baú de Ouro',
        emoji: '🥇',
        unlockMs: 8 * 60 * 60 * 1000,
        arenaCoins: [150, 220],
        gold: [180, 300],
        keyChance: 0.18,
        gloriaChance: 0.15,
        consumables: ['tonicDefense']
    },
    diamond: {
        id: 'diamond',
        name: 'Baú de Diamante',
        emoji: '💎',
        unlockMs: 24 * 60 * 60 * 1000,
        arenaCoins: [300, 500],
        gold: [350, 600],
        keyChance: 0.3,
        gloriaChance: 0.3,
        consumables: ['potionHp', 'potionEnergy', 'tonicStrength', 'tonicDefense']
    }
};

const CHEST_WEIGHTS_BY_LEAGUE = {
    bronze: [
        { tier: 'wood', weight: 75 },
        { tier: 'iron', weight: 25 }
    ],
    silver: [
        { tier: 'wood', weight: 30 },
        { tier: 'iron', weight: 45 },
        { tier: 'silver', weight: 25 }
    ],
    gold: [
        { tier: 'iron', weight: 25 },
        { tier: 'silver', weight: 45 },
        { tier: 'gold', weight: 30 }
    ],
    diamond: [
        { tier: 'silver', weight: 20 },
        { tier: 'gold', weight: 50 },
        { tier: 'diamond', weight: 30 }
    ],
    master: [
        { tier: 'gold', weight: 35 },
        { tier: 'diamond', weight: 65 }
    ],
    legend: [
        { tier: 'gold', weight: 20 },
        { tier: 'diamond', weight: 80 }
    ]
};

function escapeMarkdown(text = '') {
    return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.floor(Number(value) || 0)));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

function pickWeighted(entries) {
    const total = entries.reduce((sum, entry) => sum + (entry.weight || 0), 0);
    let roll = Math.random() * total;

    for (const entry of entries) {
        roll -= entry.weight || 0;
        if (roll <= 0) return entry.tier;
    }

    return entries[0]?.tier || 'wood';
}

function renderBar(current, max, width = 10, filledChar = '█', emptyChar = '░') {
    const safeMax = Math.max(1, Number(max) || 1);
    const safeCurrent = clamp(Number(current) || 0, 0, safeMax);
    const filled = clamp(Math.round((safeCurrent / safeMax) * width), 1, width);
    return filledChar.repeat(filled) + emptyChar.repeat(width - filled);
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

function ensureArenaState(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    if (!player.arena || typeof player.arena !== 'object') {
        player.arena = {};
    }

    player.arena.points = Number.isFinite(player.arena.points) ? Math.max(0, Math.floor(player.arena.points)) : 0;
    player.arena.coins = Number.isFinite(player.arena.coins) ? Math.max(0, Math.floor(player.arena.coins)) : 0;
    player.arena.wins = Number.isFinite(player.arena.wins) ? Math.max(0, Math.floor(player.arena.wins)) : 0;
    player.arena.losses = Number.isFinite(player.arena.losses) ? Math.max(0, Math.floor(player.arena.losses)) : 0;
    player.arena.streak = Number.isFinite(player.arena.streak) ? Math.max(0, Math.floor(player.arena.streak)) : 0;
    player.arena.maxStreak = Number.isFinite(player.arena.maxStreak) ? Math.max(0, Math.floor(player.arena.maxStreak)) : 0;
    player.arena.leagueId = player.arena.leagueId || 'bronze';
    player.arena.lastBattleAt = player.arena.lastBattleAt || null;

    if (!Array.isArray(player.arena.chests)) {
        player.arena.chests = [];
    }

    player.arena.chests = player.arena.chests.filter(chest => chest && chest.id);

    const league = getArenaLeagueByPoints(player.arena.points);
    player.arena.leagueId = league.id;

    return player;
}

function getArenaLeagueByPoints(points = 0) {
    const safePoints = Math.max(0, Math.floor(Number(points) || 0));

    let league = ARENA_LEAGUES[0];

    for (const current of ARENA_LEAGUES) {
        if (safePoints >= current.minPoints) {
            league = current;
        }
    }

    return league;
}

function getArenaLeagueIndex(leagueId) {
    const index = ARENA_LEAGUES.findIndex(league => league.id === leagueId);
    return index >= 0 ? index : 0;
}

function getArenaLeagueBadge(leagueId) {
    const league = ARENA_LEAGUES.find(item => item.id === leagueId) || ARENA_LEAGUES[0];
    return `${league.emoji} ${league.name}`;
}

function getArenaLeagueProgress(points = 0) {
    const safePoints = Math.max(0, Math.floor(Number(points) || 0));
    const league = getArenaLeagueByPoints(safePoints);
    const leagueIndex = getArenaLeagueIndex(league.id);
    const nextLeague = ARENA_LEAGUES[leagueIndex + 1] || null;

    if (!nextLeague) {
        return {
            league,
            nextLeague: null,
            progress: 100,
            remaining: 0
        };
    }

    const span = Math.max(1, nextLeague.minPoints - league.minPoints);
    const progress = clamp(Math.floor(((safePoints - league.minPoints) / span) * 100), 0, 100);
    const remaining = Math.max(0, nextLeague.minPoints - safePoints);

    return {
        league,
        nextLeague,
        progress,
        remaining
    };
}

function calculateArenaPower(player) {
    if (!player) return 0;

    const level = Number(player.level) || 1;
    const atk = Number(player.atk) || 0;
    const def = Number(player.def) || 0;
    const maxHp = Number(player.maxHp) || 0;
    const crit = Number(player.crit) || 0;

    return Math.max(
        1,
        Math.floor(
            (level * 10) +
            (atk * 2) +
            (def * 1.5) +
            (maxHp * 0.15) +
            (crit * 4)
        )
    );
}

function snapshotArenaPlayer(player) {
    ensureArenaState(player);

    const league = getArenaLeagueByPoints(player.arena.points);
    const power = calculateArenaPower(player);

    return {
        id: String(player.id),
        name: player.name || 'Viajante',
        level: Number(player.level) || 1,
        className: player.class || 'guerreiro',
        atk: Math.max(1, Number(player.atk) || 1),
        def: Math.max(0, Number(player.def) || 0),
        maxHp: Math.max(1, Number(player.maxHp) || 1),
        crit: Math.max(0, Number(player.crit) || 0),
        power,
        arenaPoints: player.arena.points,
        arenaCoins: player.arena.coins,
        arenaWins: player.arena.wins,
        arenaLosses: player.arena.losses,
        arenaStreak: player.arena.streak,
        leagueId: league.id,
        leagueName: league.name,
        leagueEmoji: league.emoji
    };
}

function createFallbackArenaOpponent(playerSnapshot) {
    const league = getArenaLeagueByPoints(playerSnapshot.arenaPoints || 0);
    const factor = 0.9 + Math.random() * 0.18;

    return {
        id: `arena_bot_${playerSnapshot.id}`,
        name: 'Eco Sombrio',
        level: playerSnapshot.level,
        className: playerSnapshot.className,
        atk: Math.max(1, Math.floor(playerSnapshot.atk * factor)),
        def: Math.max(0, Math.floor(playerSnapshot.def * factor)),
        maxHp: Math.max(1, Math.floor(playerSnapshot.maxHp * factor)),
        crit: playerSnapshot.crit,
        power: Math.max(1, Math.floor(playerSnapshot.power * factor)),
        arenaPoints: playerSnapshot.arenaPoints,
        arenaCoins: 0,
        arenaWins: 0,
        arenaLosses: 0,
        arenaStreak: 0,
        leagueId: league.id,
        leagueName: league.name,
        leagueEmoji: league.emoji,
        isBot: true
    };
}

async function selectArenaOpponentSnapshot(player) {
    const rosterMap = await getAllPlayers();
    const playerSnapshot = snapshotArenaPlayer(player);
    const playerPower = Math.max(1, playerSnapshot.power);
    const playerLeagueIndex = getArenaLeagueIndex(playerSnapshot.leagueId);

    const candidates = Object.values(rosterMap || {})
        .filter(opponent => opponent && String(opponent.id) !== String(player.id))
        .map(snapshotArenaPlayer)
        .filter(opponent => opponent && opponent.power > 0);

    if (!candidates.length) {
        return createFallbackArenaOpponent(playerSnapshot);
    }

    const scored = candidates.map(opponent => {
        const leagueIndex = getArenaLeagueIndex(opponent.leagueId);
        const powerGap = Math.abs(opponent.power - playerPower);
        const leaguePenalty = Math.abs(leagueIndex - playerLeagueIndex) * 120;

        return {
            opponent,
            score: powerGap + leaguePenalty
        };
    });

    const preferred = scored.filter(({ opponent }) => {
        const leagueIndex = getArenaLeagueIndex(opponent.leagueId);
        return (
            opponent.power >= playerPower * 0.7 &&
            opponent.power <= playerPower * 1.35 &&
            Math.abs(leagueIndex - playerLeagueIndex) <= 2
        );
    });

    const pool = (preferred.length ? preferred : scored)
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);

    if (!pool.length) {
        return createFallbackArenaOpponent(playerSnapshot);
    }

    return pool[Math.floor(Math.random() * pool.length)].opponent;
}

function createArenaBattle(playerSnapshot, enemySnapshot, startingHp = null) {
    const safeStartingHp = startingHp === null || startingHp === undefined
        ? Math.max(1, playerSnapshot.maxHp)
        : Math.max(1, Math.min(startingHp, playerSnapshot.maxHp));

    return {
        id: randomUUID(),
        createdAt: Date.now(),
        turn: 1,
        status: 'ongoing',
        logs: [
            `⚔️ ${escapeMarkdown(playerSnapshot.name)} desafia ${escapeMarkdown(enemySnapshot.name)} na arena!`
        ],
        player: {
            ...playerSnapshot,
            hp: safeStartingHp,
            defending: false
        },
        enemy: {
            ...enemySnapshot,
            hp: Math.max(1, enemySnapshot.maxHp),
            defending: false
        },
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        lastDamageDealt: 0,
        lastDamageReceived: 0
    };
}

function isBattleExpired(battle) {
    if (!battle?.createdAt) return true;
    return Date.now() - battle.createdAt > ARENA_BATTLE_TIMEOUT;
}

function formatChestTime(ms) {
    return formatDuration(ms);
}

function getChestConfig(tier) {
    return ARENA_CHEST_CONFIG[tier] || ARENA_CHEST_CONFIG.wood;
}

function weightedChestTierForLeague(leagueId) {
    const entries = CHEST_WEIGHTS_BY_LEAGUE[leagueId] || CHEST_WEIGHTS_BY_LEAGUE.bronze;
    return pickWeighted(entries);
}

function shiftChestTier(tier, steps = 0) {
    const order = ['wood', 'iron', 'silver', 'gold', 'diamond'];
    const index = order.indexOf(tier);
    if (index === -1) return 'wood';
    return order[clamp(index + steps, 0, order.length - 1)];
}

function getChestTierForVictory(playerLeagueId, enemyLeagueId, streak = 1) {
    const baseTier = weightedChestTierForLeague(playerLeagueId);
    const leagueDiff = getArenaLeagueIndex(enemyLeagueId) - getArenaLeagueIndex(playerLeagueId);

    let tier = baseTier;

    if (leagueDiff > 0) {
        tier = shiftChestTier(tier, 1);
    }

    if (streak >= 4) {
        tier = shiftChestTier(tier, 1);
    }

    if (streak >= 8) {
        tier = shiftChestTier(tier, 1);
    }

    return tier;
}

function createArenaChest(tier, source = {}) {
    const config = getChestConfig(tier);

    return {
        id: randomUUID(),
        tier: config.id,
        name: config.name,
        emoji: config.emoji,
        createdAt: Date.now(),
        readyAt: Date.now() + config.unlockMs,
        source
    };
}

function getArenaChestRemainingText(chest) {
    const remaining = chest.readyAt - Date.now();
    if (remaining <= 0) return 'Pronto';
    return formatChestTime(remaining);
}

function buildArenaHubText(player) {
    ensureArenaState(player);

    const progress = getArenaLeagueProgress(player.arena.points);
    const league = progress.league;
    const nextLeague = progress.nextLeague;

    const bar = renderBar(player.arena.points - league.minPoints, nextLeague ? (nextLeague.minPoints - league.minPoints) : 1, 10, '🟩', '⬜');

    let text = `🏟️ *ARENA*\n\n`;
    text += `📛 Liga: ${league.emoji} ${league.name}\n`;
    text += `🎯 Pontos: ${formatNumber(player.arena.points)}\n`;
    text += `🪙 Moeda da Arena: ${formatNumber(player.arena.coins)}\n`;
    text += `🏆 Vitórias: ${formatNumber(player.arena.wins)}\n`;
    text += `💀 Derrotas: ${formatNumber(player.arena.losses)}\n`;
    text += `🔥 Sequência: ${formatNumber(player.arena.streak)}\n`;
    text += `💎 Baús ativos: ${player.arena.chests.length}/${MAX_ACTIVE_CHESTS}\n\n`;

    if (nextLeague) {
        text += `⬆️ Próxima liga: ${nextLeague.emoji} ${nextLeague.name}\n`;
        text += `📈 Progresso: [${bar}] ${progress.progress}%\n`;
        text += `⏳ Falta: ${formatNumber(progress.remaining)} pontos\n`;
    } else {
        text += `👑 Você está na liga máxima.\n`;
    }

    return text;
}

function buildArenaBattleText(battle) {
    const playerBar = renderBar(battle.player.hp, battle.player.maxHp, 10, '🟥', '⬜');
    const enemyBar = renderBar(battle.enemy.hp, battle.enemy.maxHp, 10, '🟥', '⬜');

    let text = `⚔️ *BATALHA DA ARENA*\n\n`;

    text += `👤 *${escapeMarkdown(battle.player.name)}*\n`;
    text += `📛 ${battle.player.leagueEmoji} ${escapeMarkdown(battle.player.leagueName)}\n`;
    text += `⚔️ ATK ${formatNumber(battle.player.atk)} | 🛡️ DEF ${formatNumber(battle.player.def)} | 🎯 CRIT ${formatNumber(battle.player.crit)}%\n`;
    text += `💥 Power ${formatNumber(battle.player.power)}\n`;
    text += `❤️ ${formatNumber(battle.player.hp)}/${formatNumber(battle.player.maxHp)}\n`;
    text += `[${playerBar}]\n`;

    if (battle.player.defending) {
        text += `🛡️ Defendendo\n`;
    }

    text += `\n🆚 *${escapeMarkdown(battle.enemy.name)}*\n`;
    text += `📛 ${battle.enemy.leagueEmoji} ${escapeMarkdown(battle.enemy.leagueName)}\n`;
    text += `⚔️ ATK ${formatNumber(battle.enemy.atk)} | 🛡️ DEF ${formatNumber(battle.enemy.def)} | 🎯 CRIT ${formatNumber(battle.enemy.crit)}%\n`;
    text += `💥 Power ${formatNumber(battle.enemy.power)}\n`;
    text += `❤️ ${formatNumber(battle.enemy.hp)}/${formatNumber(battle.enemy.maxHp)}\n`;
    text += `[${enemyBar}]\n\n`;

    text += `📜 Últimas ações\n`;
    text += battle.logs.slice(-5).join('\n');

    return text;
}

function buildArenaLeaderboardText(playersMap, top = 10) {
    const list = Object.values(playersMap || {})
        .filter(player => player && player.id)
        .map(snapshotArenaPlayer)
        .sort((a, b) => {
            if (b.arenaPoints !== a.arenaPoints) return b.arenaPoints - a.arenaPoints;
            if (b.arenaWins !== a.arenaWins) return b.arenaWins - a.arenaWins;
            return b.power - a.power;
        });

    let text = `🏆 *RANKING DA ARENA*\n\n`;

    if (!list.length) {
        return text + `Nenhum jogador ainda.\n`;
    }

    list.slice(0, top).forEach((player, index) => {
        const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️';
        text += `${badge} ${index + 1}. ${escapeMarkdown(player.name)}\n`;
        text += `   ${player.leagueEmoji} ${player.leagueName} | Pts ${formatNumber(player.arenaPoints)} | Power ${formatNumber(player.power)}\n`;
        text += `   ${formatNumber(player.arenaWins)}V / ${formatNumber(player.arenaLosses)}D\n`;
    });

    return text;
}

function buildArenaChestListText(player) {
    ensureArenaState(player);

    let text = `🎁 *BAÚS DA ARENA*\n\n`;

    if (!player.arena.chests.length) {
        return text + `Nenhum baú ativo no momento.\n`;
    }

    player.arena.chests.forEach((chest, index) => {
        const config = getChestConfig(chest.tier);
        const remaining = getArenaChestRemainingText(chest);
        text += `${index + 1}. ${config.emoji} ${config.name}\n`;
        text += `   ⏳ ${remaining}\n`;
    });

    text += `\nBaús ativos: ${player.arena.chests.length}/${MAX_ACTIVE_CHESTS}`;

    return text;
}

function openArenaChest(player, chestId) {
    ensureArenaState(player);

    if (!player.consumables || typeof player.consumables !== 'object') {
        player.consumables = {
            potionHp: 0,
            potionEnergy: 0,
            tonicStrength: 0,
            tonicDefense: 0
        };
    }

    const index = player.arena.chests.findIndex(chest => String(chest.id) === String(chestId));

    if (index === -1) {
        return {
            success: false,
            message: '❌ Baú não encontrado.'
        };
    }

    const chest = player.arena.chests[index];
    const config = getChestConfig(chest.tier);

    if (Date.now() < chest.readyAt) {
        return {
            success: false,
            message: `⏳ Este baú ainda não está pronto. Falta ${getArenaChestRemainingText(chest)}.`
        };
    }

    const arenaCoins = randomBetween(config.arenaCoins[0], config.arenaCoins[1]);
    const gold = randomBetween(config.gold[0], config.gold[1]);

    player.arena.coins += arenaCoins;
    player.gold = (player.gold || 0) + gold;

    let keys = 0;
    let glorias = 0;

    if (Math.random() < config.keyChance) {
        player.keys = (player.keys || 0) + 1;
        keys = 1;
    }

    if (Math.random() < config.gloriaChance) {
        player.glorias = (player.glorias || 0) + 1;
        glorias = 1;
    }

    let consumable = null;
    if (config.consumables?.length) {
        consumable = config.consumables[Math.floor(Math.random() * config.consumables.length)];
        player.consumables[consumable] = (player.consumables[consumable] || 0) + 1;
    }

    player.arena.chests.splice(index, 1);

    return {
        success: true,
        chest,
        rewards: {
            arenaCoins,
            gold,
            keys,
            glorias,
            consumable
        }
    };
}

function resolveArenaVictory(player, battle) {
    ensureArenaState(player);

    const beforeLeague = player.arena.leagueId;
    const playerLeagueIndex = getArenaLeagueIndex(player.arena.leagueId);
    const enemyLeagueIndex = getArenaLeagueIndex(battle.enemy.leagueId);

    const powerGap = Math.max(0, battle.enemy.power - battle.player.power);
    const leagueGap = Math.max(0, enemyLeagueIndex - playerLeagueIndex);

    const streakBonus = player.arena.streak >= 4 ? 3 : 0;
    const pointsGained = Math.max(
        8,
        18 +
        (enemyLeagueIndex * 4) +
        Math.floor(powerGap / 120) +
        (leagueGap * 8) +
        streakBonus
    );

    const coinsGained = Math.max(
        5,
        12 +
        (enemyLeagueIndex * 4) +
        Math.floor(battle.enemy.power / 200) +
        Math.min(10, player.arena.streak * 2)
    );

    player.arena.points += pointsGained;
    player.arena.coins += coinsGained;
    player.arena.wins += 1;
    player.arena.streak += 1;
    player.arena.maxStreak = Math.max(player.arena.maxStreak, player.arena.streak);
    player.arena.lastBattleAt = Date.now();

    const newLeague = getArenaLeagueByPoints(player.arena.points);
    player.arena.leagueId = newLeague.id;

    let chest = null;
    let overflowCoins = 0;

    if (player.arena.chests.length < MAX_ACTIVE_CHESTS) {
        const tier = getChestTierForVictory(playerLeagueIndex ? player.arena.leagueId : beforeLeague, battle.enemy.leagueId, player.arena.streak);
        chest = createArenaChest(tier, {
            opponentId: battle.enemy.id,
            opponentName: battle.enemy.name,
            opponentLeague: battle.enemy.leagueId,
            pointsGained
        });

        player.arena.chests.push(chest);
    } else {
        overflowCoins = 10 + (enemyLeagueIndex * 4);
        player.arena.coins += overflowCoins;
    }

    return {
        pointsGained,
        coinsGained,
        chest,
        overflowCoins,
        leagueChanged: beforeLeague !== newLeague.id,
        newLeague
    };
}

function resolveArenaLoss(player) {
    ensureArenaState(player);

    const loss = Math.max(5, Math.floor(player.arena.points * 0.03));

    player.arena.points = Math.max(0, player.arena.points - loss);
    player.arena.losses += 1;
    player.arena.streak = 0;
    player.arena.lastBattleAt = Date.now();
    player.arena.leagueId = getArenaLeagueByPoints(player.arena.points).id;

    player.hp = Math.max(1, Math.floor((player.maxHp || 1) * 0.25));

    return {
        pointsLost: loss
    };
}

function resolveArenaFlee(player) {
    ensureArenaState(player);

    const loss = Math.max(2, Math.floor(player.arena.points * 0.01));

    player.arena.points = Math.max(0, player.arena.points - loss);
    player.arena.losses += 1;
    player.arena.streak = 0;
    player.arena.lastBattleAt = Date.now();
    player.arena.leagueId = getArenaLeagueByPoints(player.arena.points).id;

    return {
        pointsLost: loss
    };
}

module.exports = {
    ARENA_BATTLE_TIMEOUT,
    MAX_ACTIVE_CHESTS,
    ARENA_LEAGUES,
    ARENA_CHEST_CONFIG,
    ensureArenaState,
    getArenaLeagueByPoints,
    getArenaLeagueIndex,
    getArenaLeagueBadge,
    getArenaLeagueProgress,
    calculateArenaPower,
    snapshotArenaPlayer,
    selectArenaOpponentSnapshot,
    createArenaBattle,
    isBattleExpired,
    buildArenaHubText,
    buildArenaBattleText,
    buildArenaLeaderboardText,
    buildArenaChestListText,
    getArenaChestRemainingText,
    openArenaChest,
    resolveArenaVictory,
    resolveArenaLoss,
    resolveArenaFlee,
    formatDuration
};