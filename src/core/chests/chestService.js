const { randomUUID } = require('crypto');
const {
    applyGoldReward,
    applyXpReward,
    applyKeyReward,
    normalizePlayerForSave
} = require('../player/playerMutations');

const CHEST_CONFIG = {
    wood: {
        name: 'Baú de Madeira',
        emoji: '🪵',
        unlockMs: 15 * 60 * 1000,
        gold: [60, 120],
        xp: [25, 50],
        keyChance: 0.03
    },
    iron: {
        name: 'Baú de Ferro',
        emoji: '🪙',
        unlockMs: 60 * 60 * 1000,
        gold: [120, 220],
        xp: [45, 90],
        keyChance: 0.06
    },
    rare: {
        name: 'Baú Raro',
        emoji: '💠',
        unlockMs: 4 * 60 * 60 * 1000,
        gold: [220, 360],
        xp: [80, 140],
        keyChance: 0.12
    },
    epic: {
        name: 'Baú Épico',
        emoji: '👑',
        unlockMs: 8 * 60 * 60 * 1000,
        gold: [350, 520],
        xp: [140, 220],
        keyChance: 0.20
    }
};

const MAX_TIMED_CHESTS = 4;

function ensureChestState(player) {
    player.timedChests ??= [];
    return player.timedChests;
}

function randomBetween(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

function getChestTierForEnemy(enemy) {
    if (enemy?.isBoss) return 'epic';
    if (enemy?.isMiniBoss) return 'rare';
    if (enemy?.isElite) return 'iron';
    return 'wood';
}

function canAddTimedChest(player) {
    ensureChestState(player);
    return player.timedChests.filter(chest => !chest.opened).length < MAX_TIMED_CHESTS;
}

function addTimedChest(player, tier, source = 'pve') {
    ensureChestState(player);

    if (!CHEST_CONFIG[tier]) {
        return {
            success: false,
            message: '❌ Tier de baú inválido.'
        };
    }

    if (!canAddTimedChest(player)) {
        return {
            success: false,
            message: '❌ Limite de baús atingido.'
        };
    }

    const now = Date.now();
    const chest = {
        id: randomUUID(),
        tier,
        source,
        createdAt: now,
        unlockAt: now + CHEST_CONFIG[tier].unlockMs,
        opened: false
    };

    player.timedChests.push(chest);
    normalizePlayerForSave(player);

    return {
        success: true,
        chest
    };
}

function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function getChestStatusText(chest) {
    const cfg = CHEST_CONFIG[chest.tier];
    const remaining = chest.unlockAt - Date.now();
    if (remaining <= 0) return `✅ ${cfg.name} pronto`;
    return `⏳ ${cfg.name} (${formatRemaining(remaining)})`;
}

function openTimedChest(player, chestId) {
    ensureChestState(player);

    const index = player.timedChests.findIndex(chest => chest.id === chestId && !chest.opened);
    if (index === -1) {
        return {
            success: false,
            message: '❌ Baú não encontrado.'
        };
    }

    const chest = player.timedChests[index];
    const cfg = CHEST_CONFIG[chest.tier];

    if (Date.now() < chest.unlockAt) {
        return {
            success: false,
            message: '⏳ Esse baú ainda não está pronto.'
        };
    }

    const gold = randomBetween(cfg.gold[0], cfg.gold[1]);
    const xp = randomBetween(cfg.xp[0], cfg.xp[1]);
    let keys = 0;

    applyGoldReward(player, gold);
    applyXpReward(player, xp);

    if (Math.random() < cfg.keyChance) {
        applyKeyReward(player, 1);
        keys = 1;
    }

    chest.opened = true;
    player.timedChests.splice(index, 1);
    normalizePlayerForSave(player);

    return {
        success: true,
        rewards: { gold, xp, keys },
        chest
    };
}

function renderChestHubText(player) {
    ensureChestState(player);

    let text = `╔══════════════════════════════╗\n`;
    text += `║         📦 *SEUS BAÚS*           ║\n`;
    text += `╠══════════════════════════════╣\n`;

    const active = player.timedChests.filter(chest => !chest.opened);

    if (!active.length) {
        text += `║ Nenhum baú ativo no momento.\n`;
    } else {
        active.forEach((chest, index) => {
            const cfg = CHEST_CONFIG[chest.tier];
            const remaining = chest.unlockAt - Date.now();

            text += `║ ${index + 1}. ${cfg.emoji} ${cfg.name}\n`;
            if (remaining <= 0) {
                text += `║    ✅ Pronto para abrir\n`;
            } else {
                text += `║    ⏳ ${formatRemaining(remaining)}\n`;
            }
        });
    }

    text += `╠══════════════════════════════╣\n`;
    text += `║ Slots usados: ${active.length}/${MAX_TIMED_CHESTS}\n`;
    text += `╚══════════════════════════════╝`;

    return text;
}

module.exports = {
    CHEST_CONFIG,
    MAX_TIMED_CHESTS,
    ensureChestState,
    getChestTierForEnemy,
    addTimedChest,
    openTimedChest,
    getChestStatusText,
    renderChestHubText
};
