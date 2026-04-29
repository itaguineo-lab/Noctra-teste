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
} = require('../data/itemsV2');

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

const {
    buildSoulDropText
} = require('../renderers/soulRenderer');

const { BALANCE } = require('../data/balance');

const MAP_NUMBERS = {
    clareira_sombria: 1,
    cripta_em_ruinas: 2,
    pantano_corrompido: 3,
    deserto_incandescente: 4,
    citadela_lunar: 5,
    abismo_noctra: 6
};

const FIELD_FORBIDDEN_RARITIES_BY_TIER = {
    common: new Set(['Lendário', 'Mítico']),
    elite: new Set(['Lendário', 'Mítico']),
    miniboss: new Set(['Lendário', 'Mítico']),
    boss: new Set(['Mítico'])
};

const FIELD_DROP_MAX_RARITY_BY_TIER = {
    common: 'Épico',
    elite: 'Épico',
    miniboss: 'Épico',
    boss: 'Lendário'
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

function canDropMythic(options = {}) {
    return Boolean(
        options.allowMythicDrop ||
        options.isEliteDungeon ||
        options.isWorldBoss ||
        options.isEventBoss
    );
}

function isDungeonOrExternalDrop(options = {}) {
    return canDropMythic(options);
}

function isForbiddenFieldRarity(item, encounterTier = 'common', options = {}) {
    if (!item?.rarity) return false;
    if (canDropMythic(options)) return false;

    const tier = FIELD_FORBIDDEN_RARITIES_BY_TIER[encounterTier]
        ? encounterTier
        : 'common';

    return FIELD_FORBIDDEN_RARITIES_BY_TIER[tier].has(item.rarity);
}

function replaceRarityText(text, targetRarity) {
    if (!text) return text;

    return String(text)
        .replace(/Mítico/gi, targetRarity)
        .replace(/Lendário/gi, targetRarity);
}

function downgradeForbiddenFieldDrop(item, encounterTier = 'common', options = {}) {
    if (!item || !isForbiddenFieldRarity(item, encounterTier, options)) {
        return item;
    }

    const tier = FIELD_DROP_MAX_RARITY_BY_TIER[encounterTier]
        ? encounterTier
        : 'common';
    const targetRarity = FIELD_DROP_MAX_RARITY_BY_TIER[tier];

    return {
        ...item,
        name: replaceRarityText(item.name, targetRarity),
        rarity: targetRarity,
        qualityLabel: targetRarity,
        powerTier: item.powerTier === 'Mítico' || item.powerTier === 'Lendário'
            ? targetRarity
            : item.powerTier,
        flavor: replaceRarityText(item.flavor, targetRarity),
        __rarityPolicyAdjusted: true
    };
}

function generatePolicyCompliantDrop(mapNumber, dropOptions = {}, policyOptions = {}) {
    const encounterTier = dropOptions.encounterTier || 'common';
    let fallback = null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
        const rolledItem = generateDrop(mapNumber, dropOptions);

        if (!fallback) {
            fallback = rolledItem;
        }

        if (!isForbiddenFieldRarity(rolledItem, encounterTier, policyOptions)) {
            return rolledItem;
        }
    }

    return downgradeForbiddenFieldDrop(fallback, encounterTier, policyOptions);
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

function getSoulSourceLabel(source) {
    const labels = {
        field_boss: 'Boss de Campo',
        field_miniboss_thematic: 'Mini Boss Temático',
        field_elite_thematic: 'Elite Temático',
        dungeon_boss: 'Boss de Masmorra',
        world_boss: 'World Boss',
        event_boss: 'Boss de Evento'
    };

    return labels[source] || 'Fonte rara';
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
    const originLabel = item.originMap ? ` • ${item.originMap}` : '';
    const traitLabel = item.traitLabel ? ` • ${item.traitLabel}` : '';

    return `${icon} ${item.name}${levelLabel} [${item.rarity}] • ${categoryLabel}${traitLabel}${originLabel}`;
}

function buildCompactSoulLootLine(soul, source, enemy) {
    if (!soul) return null;

    const sourceLabel = getSoulSourceLabel(source);
    const enemyName = enemy?.name || 'um boss sombrio';
    const rarity = soul.rarity || 'Raro';
    const tier = soul.tier ? ` • Tier ${soul.tier}` : '';

    return `🌑 ALMA ENCONTRADA: ${soul.emoji || '💀'} ${soul.name} [${rarity}${tier}] • ${sourceLabel} • ${enemyName}`;
}

function buildFullSoulDropText(soul, source, enemy) {
    if (!soul) return null;

    return buildSoulDropText(soul, {
        enemyName: enemy?.name || 'um boss sombrio',
        sourceLabel: getSoulSourceLabel(source)
    });
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

function tryDropItem(player, enemy, loot, options = {}) {
    const mapNumber = getMapNumber(player.currentMap);
    const encounterTier = getEncounterTier(enemy);
    const dropProfile = getDropProfileByEnemy(mapNumber, encounterTier);

    if (Math.random() > dropProfile.chance) {
        return {
            droppedItem: null,
            inventoryFull: false
        };
    }

    const rolledItem = generatePolicyCompliantDrop(
        mapNumber,
        {
            encounterTier,
            rarityBias: dropProfile.rarityBias,
            playerClass: player.class
        },
        options
    );

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
            source: null,
            soulDropText: null,
            soulLootLine: null
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
            source,
            soulDropText: null,
            soulLootLine: null
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
            source,
            soulDropText: null,
            soulLootLine: null
        };
    }

    player.soulsInventory.push(droppedSoul);

    const soulLootLine = buildCompactSoulLootLine(droppedSoul, source, enemy);
    const soulDropText = buildFullSoulDropText(droppedSoul, source, enemy);

    if (soulLootLine) {
        loot.push(soulLootLine);
    }

    if (source === 'field_boss') {
        resetSoulPity(player);
    }

    return {
        droppedSoul,
        soulDropped: true,
        soulChance,
        source,
        soulDropText,
        soulLootLine
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

    const itemResult = tryDropItem(player, enemy, loot, options);
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
        soulSourceLabel: getSoulSourceLabel(soulResult.source),
        soulDropText: soulResult.soulDropText,
        soulLootLine: soulResult.soulLootLine,
        keyDropped,
        leveledUp,
        totalKills: player.totalKills,
        enemyId: enemy?.id || null,
        enemyName: enemy?.name || null
    };
}

module.exports = {
    processVictory,
    __private: {
        getSoulSource,
        getSoulSourceLabel,
        buildCompactSoulLootLine,
        buildFullSoulDropText,
        tryDropSoul,
        canDropMythic,
        isDungeonOrExternalDrop,
        isForbiddenFieldRarity,
        downgradeForbiddenFieldDrop,
        generatePolicyCompliantDrop
    }
};
