const { randomUUID } = require('crypto');
const { getAllPlayers } = require('../player/playerService');
const {
    getArenaGloriasBalance,
    addArenaGlorias
} = require('./arenaCurrency');

const ARENA_BATTLE_TIMEOUT = 10 * 60 * 1000;
const MAX_ACTIVE_CHESTS = 3;
const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━';

const ARENA_LEAGUES = [
    { id: 'bronze', name: 'Bronze', emoji: '🥉', minPoints: 0 },
    { id: 'silver', name: 'Prata', emoji: '🥈', minPoints: 650 },
    { id: 'gold', name: 'Ouro', emoji: '🥇', minPoints: 1500 },
    { id: 'diamond', name: 'Diamante', emoji: '💎', minPoints: 3000 },
    { id: 'master', name: 'Mestre', emoji: '👑', minPoints: 5200 },
    { id: 'legend', name: 'Lendário', emoji: '🌌', minPoints: 8200 }
];

const ARENA_CHEST_CONFIG = {
    wood: {
        id: 'wood',
        name: 'Baú de Madeira',
        emoji: '🪵',
        unlockMs: 20 * 60 * 1000,
        glorias: [1, 2],
        gold: [20, 45],
        keyChance: 0.03,
        gloriaChance: 0.01,
        consumables: ['potionHp']
    },
    iron: {
        id: 'iron',
        name: 'Baú de Ferro',
        emoji: '🪙',
        unlockMs: 75 * 60 * 1000,
        glorias: [2, 4],
        gold: [35, 75],
        keyChance: 0.05,
        gloriaChance: 0.02,
        consumables: ['potionEnergy']
    },
    silver: {
        id: 'silver',
        name: 'Baú de Prata',
        emoji: '🥈',
        unlockMs: 3 * 60 * 60 * 1000,
        glorias: [4, 7],
        gold: [65, 130],
        keyChance: 0.08,
        gloriaChance: 0.04,
        consumables: ['tonicStrength']
    },
    gold: {
        id: 'gold',
        name: 'Baú de Ouro',
        emoji: '🥇',
        unlockMs: 8 * 60 * 60 * 1000,
        glorias: [7, 11],
        gold: [120, 220],
        keyChance: 0.12,
        gloriaChance: 0.08,
        consumables: ['tonicDefense']
    },
    diamond: {
        id: 'diamond',
        name: 'Baú de Diamante',
        emoji: '💎',
        unlockMs: 24 * 60 * 60 * 1000,
        glorias: [12, 18],
        gold: [240, 420],
        keyChance: 0.20,
        gloriaChance: 0.15,
        consumables: ['potionHp', 'potionEnergy', 'tonicStrength', 'tonicDefense']
    }
};

const CHEST_WEIGHTS_BY_LEAGUE = {
    bronze: [
        { tier: 'wood', weight: 82 },
        { tier: 'iron', weight: 18 }
    ],
    silver: [
        { tier: 'wood', weight: 38 },
        { tier: 'iron', weight: 47 },
        { tier: 'silver', weight: 15 }
    ],
    gold: [
        { tier: 'iron', weight: 35 },
        { tier: 'silver', weight: 48 },
        { tier: 'gold', weight: 17 }
    ],
    diamond: [
        { tier: 'silver', weight: 38 },
        { tier: 'gold', weight: 47 },
        { tier: 'diamond', weight: 15 }
    ],
    master: [
        { tier: 'gold', weight: 62 },
        { tier: 'diamond', weight: 38 }
    ],
    legend: [
        { tier: 'gold', weight: 48 },
        { tier: 'diamond', weight: 52 }
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
    const filled = clamp(Math.round((safeCurrent / safeMax) * width), 0, width);
    return filledChar.repeat(filled) + emptyChar.repeat(width - filled);
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatWinRate(wins = 0, losses = 0) {
    const total = Number(wins || 0) + Number(losses || 0);
    if (total <= 0) return '0%';
    return `${Math.round((Number(wins || 0) / total) * 100)}%`;
}

function formatChestStatus(chest) {
    const remaining = chest.readyAt - Date.now();
    if (remaining <= 0) return '✅ Pronto para abrir';
    return `⏳ Abre em ${formatChestTime(remaining)}`;
}

function ensureArenaState(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    if (!player.arena || typeof player.arena !== 'object') {
        player.arena = {};
    }

    player.glorias = Number.isFinite(player.glorias) ? Math.max(0, Math.floor(player.glorias)) : 0;
    player.arena.points = Number.isFinite(player.arena.points) ? Math.max(0, Math.floor(player.arena.points)) : 0;
    player.arena.coins = Number.isFinite(player.arena.coins) ? Math.max(0, Math.floor(player.arena.coins)) : 0;
    player.arena.wins = Number.isFinite(player.arena.wins) ? Math.max(0, Math.floor(player.arena.wins)) : 0;
    player.arena.losses = Number.isFinite(player.arena.losses) ? Math.max(0, Math.floor(player.arena.losses)) : 0;
    player.arena.streak = Number.isFinite(player.arena.streak) ? Math.max(0, Math.floor(player.arena.streak)) : 0;
    player.arena.maxStreak = Number.isFinite(player.arena.maxStreak) ? Math.max(0, Math.floor(player.arena.maxStreak)) : 0;
    player.arena.leagueId = player.arena.leagueId || 'bronze';
    player.arena.lastBattleAt = player.arena.lastBattleAt || null;
    player.arena.totalDamageDealt = Number.isFinite(player.arena.totalDamageDealt) ? Math.max(0, Math.floor(player.arena.totalDamageDealt)) : 0;

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
    const arenaGlorias = getArenaGloriasBalance(player);

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
        arenaGlorias,
        arenaCoins: arenaGlorias,
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
    const factor = 0.90 + Math.random() * 0.16;

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
        arenaGlorias: 0,
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
        const leaguePenalty = Math.abs(leagueIndex - playerLeagueIndex) * 140;
        const freshnessPenalty = opponent.arenaPoints > playerSnapshot.arenaPoints * 1.8 ? 90 : 0;

        return {
            opponent,
            score: powerGap + leaguePenalty + freshnessPenalty
        };
    });

    const preferred = scored.filter(({ opponent }) => {
        const leagueIndex = getArenaLeagueIndex(opponent.leagueId);
        return (
            opponent.power >= playerPower * 0.76 &&
            opponent.power <= playerPower * 1.28 &&
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

    if (leagueDiff >= 2) tier = shiftChestTier(tier, 1);
    if (streak >= 5) tier = shiftChestTier(tier, 1);
    if (streak >= 10) tier = shiftChestTier(tier, 1);

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
    const progressMax = nextLeague ? (nextLeague.minPoints - league.minPoints) : 1;
    const progressCurrent = nextLeague ? (player.arena.points - league.minPoints) : 1;
    const bar = renderBar(progressCurrent, progressMax, 10, '🟩', '⬛');
    const winRate = formatWinRate(player.arena.wins, player.arena.losses);

    let text = `🏟️ *ARENA DE NOCTRA*\n`;
    text += `${DIVIDER}\n`;
    text += `⚔️ Enfrente jogadores, suba de liga e converta vitórias em Glórias.\n\n`;

    text += `*STATUS COMPETITIVO*\n`;
    text += `📛 Liga: ${league.emoji} *${league.name}*\n`;
    text += `🎯 Pontos: *${formatNumber(player.arena.points)}*\n`;
    text += `🏅 Glórias: *${formatNumber(getArenaGloriasBalance(player))}*\n`;
    text += `🎁 Baús: *${player.arena.chests.length}/${MAX_ACTIVE_CHESTS}*\n\n`;

    text += `*DESEMPENHO*\n`;
    text += `🏆 ${formatNumber(player.arena.wins)} vitórias  •  💀 ${formatNumber(player.arena.losses)} derrotas\n`;
    text += `📊 Aproveitamento: *${winRate}*\n`;
    text += `🔥 Sequência atual: *${formatNumber(player.arena.streak)}*\n`;
    text += `👑 Melhor sequência: *${formatNumber(player.arena.maxStreak)}*\n\n`;

    if (nextLeague) {
        text += `*PROGRESSÃO DE LIGA*\n`;
        text += `⬆️ Próxima: ${nextLeague.emoji} *${nextLeague.name}*\n`;
        text += `[${bar}] ${progress.progress}%\n`;
        text += `⏳ Faltam *${formatNumber(progress.remaining)}* pontos\n`;
    } else {
        text += `*PROGRESSÃO DE LIGA*\n`;
        text += `👑 Você está na liga máxima. Defenda seu prestígio.\n`;
    }

    return text.trim();
}

function buildArenaBattleText(battle) {
    const playerBar = renderBar(battle.player.hp, battle.player.maxHp, 10, '🟥', '⬛');
    const enemyBar = renderBar(battle.enemy.hp, battle.enemy.maxHp, 10, '🟥', '⬛');

    let text = `⚔️ *DUELO DA ARENA*\n`;
    text += `${DIVIDER}\n\n`;

    text += `👤 *${escapeMarkdown(battle.player.name)}*  •  ${battle.player.leagueEmoji} ${escapeMarkdown(battle.player.leagueName)}\n`;
    text += `❤️ ${formatNumber(battle.player.hp)}/${formatNumber(battle.player.maxHp)}  [${playerBar}]\n`;
    text += `⚔️ ${formatNumber(battle.player.atk)}   🛡️ ${formatNumber(battle.player.def)}   🎯 ${formatNumber(battle.player.crit)}%   💥 ${formatNumber(battle.player.power)}\n`;
    if (battle.player.defending) text += `🛡️ Estado: defendendo\n`;

    text += `\n🆚 *${escapeMarkdown(battle.enemy.name)}*  •  ${battle.enemy.leagueEmoji} ${escapeMarkdown(battle.enemy.leagueName)}\n`;
    text += `❤️ ${formatNumber(battle.enemy.hp)}/${formatNumber(battle.enemy.maxHp)}  [${enemyBar}]\n`;
    text += `⚔️ ${formatNumber(battle.enemy.atk)}   🛡️ ${formatNumber(battle.enemy.def)}   🎯 ${formatNumber(battle.enemy.crit)}%   💥 ${formatNumber(battle.enemy.power)}\n`;
    if (battle.enemy.defending) text += `🛡️ Estado: defendendo\n`;

    text += `\n${DIVIDER}\n`;
    text += `📜 *Últimas ações*\n`;
    text += battle.logs.slice(-5).join('\n');

    return text.trim();
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

    let text = `🏆 *RANKING DA ARENA*\n`;
    text += `${DIVIDER}\n`;

    if (!list.length) {
        return text + `Nenhum jogador ainda.\n`;
    }

    list.slice(0, top).forEach((player, index) => {
        const badge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '▫️';
        text += `\n${badge} *${index + 1}. ${escapeMarkdown(player.name)}*\n`;
        text += `${player.leagueEmoji} ${escapeMarkdown(player.leagueName)}  •  🎯 ${formatNumber(player.arenaPoints)} pts  •  💥 ${formatNumber(player.power)}\n`;
        text += `🏆 ${formatNumber(player.arenaWins)}V  •  💀 ${formatNumber(player.arenaLosses)}D  •  📊 ${formatWinRate(player.arenaWins, player.arenaLosses)}\n`;
    });

    return text.trim();
}

function buildArenaChestListText(player) {
    ensureArenaState(player);

    let text = `🎁 *BAÚS DA ARENA*\n`;
    text += `${DIVIDER}\n`;
    text += `Vitórias geram baús. Baús geram Glórias, ouro e recursos táticos.\n\n`;

    if (!player.arena.chests.length) {
        return text + `Nenhum baú ativo no momento.\n\n⚔️ Vença uma luta para receber seu próximo baú.`;
    }

    player.arena.chests.forEach((chest, index) => {
        const config = getChestConfig(chest.tier);
        const status = formatChestStatus(chest);
        const rewardRange = `🏅 ${config.glorias[0]}-${config.glorias[1]} Glórias  •  💰 ${config.gold[0]}-${config.gold[1]} ouro`;

        text += `${index + 1}. ${config.emoji} *${config.name}*\n`;
        text += `${status}\n`;
        text += `${rewardRange}\n`;
        if (index !== player.arena.chests.length - 1) text += `\n`;
    });

    text += `\n${DIVIDER}\n`;
    text += `Slots ocupados: *${player.arena.chests.length}/${MAX_ACTIVE_CHESTS}*`;
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

    const gloriasBase = randomBetween(config.glorias[0], config.glorias[1]);
    const gold = randomBetween(config.gold[0], config.gold[1]);

    addArenaGlorias(player, gloriasBase);
    player.gold = (player.gold || 0) + gold;

    let keys = 0;
    let bonusGlorias = 0;

    if (Math.random() < config.keyChance) {
        player.keys = (player.keys || 0) + 1;
        keys = 1;
    }

    if (Math.random() < config.gloriaChance) {
        addArenaGlorias(player, 1);
        bonusGlorias = 1;
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
            glorias: gloriasBase + bonusGlorias,
            baseGlorias: gloriasBase,
            bonusGlorias,
            arenaCoins: 0,
            gold,
            keys,
            consumable
        }
    };
}

function resolveArenaVictory(player, battle) {
    ensureArenaState(player);

    const beforeLeague = player.arena.leagueId;
    const playerLeagueId = player.arena.leagueId;
    const playerLeagueIndex = getArenaLeagueIndex(playerLeagueId);
    const enemyLeagueIndex = getArenaLeagueIndex(battle.enemy.leagueId);

    const powerGap = Math.max(0, battle.enemy.power - battle.player.power);
    const leagueGap = Math.max(0, enemyLeagueIndex - playerLeagueIndex);
    const streakBonus = player.arena.streak >= 4 ? 2 : 0;

    const pointsGained = Math.max(
        9,
        16 +
        (enemyLeagueIndex * 3) +
        Math.floor(powerGap / 170) +
        (leagueGap * 6) +
        streakBonus
    );

    const gloriasGained = Math.max(
        1,
        2 +
        Math.floor(enemyLeagueIndex / 2) +
        Math.floor(battle.enemy.power / 900) +
        Math.floor(Math.min(8, player.arena.streak) / 3)
    );

    player.arena.points += pointsGained;
    addArenaGlorias(player, gloriasGained);
    player.arena.wins += 1;
    player.arena.streak += 1;
    player.arena.maxStreak = Math.max(player.arena.maxStreak, player.arena.streak);
    player.arena.lastBattleAt = Date.now();
    player.arena.totalDamageDealt += Math.max(0, Math.floor(battle.totalDamageDealt || 0));

    const newLeague = getArenaLeagueByPoints(player.arena.points);
    player.arena.leagueId = newLeague.id;

    let chest = null;
    let overflowGlorias = 0;

    if (player.arena.chests.length < MAX_ACTIVE_CHESTS) {
        const tier = getChestTierForVictory(playerLeagueId, battle.enemy.leagueId, player.arena.streak);
        chest = createArenaChest(tier, {
            opponentId: battle.enemy.id,
            opponentName: battle.enemy.name,
            opponentLeague: battle.enemy.leagueId,
            pointsGained
        });

        player.arena.chests.push(chest);
    } else {
        overflowGlorias = 1 + Math.floor(enemyLeagueIndex / 2);
        addArenaGlorias(player, overflowGlorias);
    }

    return {
        pointsGained,
        gloriasGained,
        coinsGained: gloriasGained,
        chest,
        overflowGlorias,
        overflowCoins: overflowGlorias,
        leagueChanged: beforeLeague !== newLeague.id,
        newLeague
    };
}

function resolveArenaLoss(player) {
    ensureArenaState(player);

    const baseLoss = 10 + getArenaLeagueIndex(player.arena.leagueId) * 4;
    const loss = Math.max(baseLoss, Math.floor(player.arena.points * 0.022));

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

    const baseLoss = 4 + getArenaLeagueIndex(player.arena.leagueId) * 2;
    const loss = Math.max(baseLoss, Math.floor(player.arena.points * 0.010));

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
