const {
    resolveSoulDrop,
    registerSoulPityFailure,
    resetSoulPity,
    getSoulDropChance,
    hasThemedSoul
} = require('../core/player/souls');

const {
    generateDrop,
    getDropProfileByEnemy,
    getDisplayCategoryLabel
} = require('../data/items');

const {
    addInventoryItem,
    applyGoldReward,
    applyKeyReward,
    applyXpReward,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const {
    recordDropMetrics
} = require('../core/metrics/metricsService');

const {
    isVipActive
} = require('../core/player/playerService');

const { BALANCE } = require('../data/balance');

const MAP_NUMBERS = {
    clareira_sombria: 1,
    cripta_em_ruinas: 2,
    pantano_corrompido: 3,
    deserto_incandescente: 4,
    citadela_lunar: 5,
    abismo_noctra: 6
};

function getMapNumber(mapName) {
    return MAP_NUMBERS[mapName] || 1;
}

function getEncounterTier(enemy) {
    if (enemy?.isBoss) return 'boss';
    if (enemy?.isMiniBoss) return 'miniboss';
    if (enemy?.isElite) return 'elite';
    return 'common';
}

function getSoulSource(enemy, options = {}) {
    if (options.isDungeonBoss) return 'dungeon_boss';
    if (options.isWorldBoss) return 'world_boss';
    if (options.isEventBoss) return 'event_boss';

    if (enemy?.isBoss) return 'field_boss';

    if (enemy?.isMiniBoss && hasThemedSoul(enemy.id)) {
        return 'field_miniboss_thematic';
    }

    if (enemy?.isElite && hasThemedSoul(enemy.id)) {
        return 'field_elite_thematic';
    }

    return null;
}

function getVictoryTitle(enemy) {
    if (enemy?.isBoss) return '👑 BOSS DERROTADO';
    if (enemy?.isMiniBoss) return '💀 MINI BOSS DERROTADO';
    if (enemy?.isElite) return '🔥 ELITE DERROTADO';
    return '🏆 VITÓRIA';
}

function ensureRewardState(player) {
    player.inventory ??= [];
    player.soulsInventory ??= [];
    player.totalKills ??= 0;
    player.soulPityCounter ??= 0;
    player.keys ??= 0;
    player.gold ??= 0;
    player.maxInventory ??= isVipActive(player)
        ? BALANCE.inventory.vipMax
        : BALANCE.inventory.baseMax;
    player.currentMap ??= 'clareira_sombria';
    player.level ??= 1;
    player.vip ??= false;
    return player;
}

function buildRewardBase(player, enemy) {
    let baseXp = Math.max(1, Number(enemy?.xp || 0));
    let baseGold = Math.max(1, Number(enemy?.gold || 0));

    if (isVipActive(player)) {
        baseXp = Math.floor(baseXp * (BALANCE.vip.xpMultiplier || 1));
        baseGold = Math.floor(baseGold * (BALANCE.vip.goldMultiplier || 1));
    }

    return {
        xp: baseXp,
        gold: baseGold
    };
}

function formatDroppedItemLoot(item) {
    if (!item) return null;

    const icon = item.emoji || '🎁';
    const categoryLabel = item.displayCategory || getDisplayCategoryLabel(item.slot);
    const levelLabel = item.level ? ` Lv${item.level}` : '';

    return `${icon} ${item.name}${levelLabel} [${item.rarity}] • ${categoryLabel}`;
}

function tryDropKey(player, enemy, loot, options = {}) {
    const isSpecialExternal = options.isDungeonBoss || options.isWorldBoss || options.isEventBoss;

    if (isSpecialExternal) {
        return false;
    }

    let chance = 0;

    if (enemy?.isBoss) {
        chance = BALANCE.dungeon.fieldBossKeyDropChance || 0;
    } else if (enemy?.isMiniBoss) {
        chance = BALANCE.dungeon.fieldMiniBossKeyDropChance || 0;
    }

    if (chance <= 0) {
        return false;
    }

    const dropped = Math.random() < chance;

    if (dropped) {
        applyKeyReward(player, 1);
        loot.push('🗝️ Chave de Masmorra');
    }

    return dropped;
}

function tryDropItem(player, enemy, loot) {
    const mapNumber = getMapNumber(player.currentMap);
    const encounterTier = getEncounterTier(enemy);
    const dropProfile = getDropProfileByEnemy(mapNumber, encounterTier);

    if (Math.random() > dropProfile.chance) {
        return {
            droppedItem: null,
            inventoryFull: false
        };
    }

    const rolledItem = generateDrop(mapNumber, {
        encounterTier,
        rarityBias: dropProfile.rarityBias
    });

    const addItemResult = addInventoryItem(player, rolledItem);

    if (!addItemResult.success) {
        return {
            droppedItem: null,
            inventoryFull: true
        };
    }

    const droppedItem = addItemResult.item;
    const lootLine = formatDroppedItemLoot(droppedItem);
    if (lootLine) {
        loot.push(lootLine);
    }

    return {
        droppedItem,
        inventoryFull: false
    };
}

function tryDropSoul(player, enemy, loot, options = {}) {
    const source = getSoulSource(enemy, options);

    if (!source) {
        return {
            droppedSoul: null,
            soulDropped: false,
            soulChance: 0,
            source: null
        };
    }

    const soulChance = getSoulDropChance(source, player.soulPityCounter);

    if (Math.random() > soulChance) {
        if (source === 'field_boss') {
            registerSoulPityFailure(player);
        }

        return {
            droppedSoul: null,
            soulDropped: false,
            soulChance,
            source
        };
    }

    const droppedSoul = resolveSoulDrop({
        playerLevel: player.level,
        enemy,
        source
    });

    if (!droppedSoul) {
        if (source === 'field_boss') {
            registerSoulPityFailure(player);
        }

        return {
            droppedSoul: null,
            soulDropped: false,
            soulChance,
            source
        };
    }

    player.soulsInventory.push(droppedSoul);
    loot.push(`💀 ${droppedSoul.name} [${droppedSoul.rarity}]`);

    if (source === 'field_boss') {
        resetSoulPity(player);
    }

    return {
        droppedSoul,
        soulDropped: true,
        soulChance,
        source
    };
}

function recordVictoryMetricsAsync(payload) {
    recordDropMetrics(payload).catch(error => {
        console.error('⚠️ recordDropMetrics falhou:', error);
    });
}

async function processVictory(player, enemy, options = {}) {
    ensureRewardState(player);

    const rewardBase = buildRewardBase(player, enemy);
    const loot = [];

    applyGoldReward(player, rewardBase.gold);

    const previousLevel = player.level;
    applyXpReward(player, rewardBase.xp);
    const leveledUp = player.level > previousLevel;

    const itemResult = tryDropItem(player, enemy, loot);
    const soulResult = tryDropSoul(player, enemy, loot, options);
    const keyDropped = tryDropKey(player, enemy, loot, options);

    player.totalKills += 1;

    normalizePlayerForSave(player);

    recordVictoryMetricsAsync({
        items: itemResult.droppedItem ? 1 : 0,
        souls: soulResult.soulDropped ? 1 : 0,
        keys: keyDropped ? 1 : 0,
        gold: rewardBase.gold,
        xp: rewardBase.xp
    });

    return {
        title: getVictoryTitle(enemy),
        xp: rewardBase.xp,
        gold: rewardBase.gold,
        loot,
        droppedItem: itemResult.droppedItem,
        inventoryFull: itemResult.inventoryFull,
        droppedSoul: soulResult.droppedSoul,
        soulDropped: soulResult.soulDropped,
        soulChance: soulResult.soulChance,
        soulSource: soulResult.source,
        keyDropped,
        leveledUp,
        totalKills: player.totalKills
    };
}

module.exports = {
    processVictory
};