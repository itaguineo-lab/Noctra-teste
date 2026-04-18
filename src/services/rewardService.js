const {
    resolveSoulDrop,
    registerSoulPityFailure,
    resetSoulPity,
    getSoulDropChanceByEnemy
} = require('../core/player/souls');

const {
    generateDrop,
    getDropProfileByEnemy
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

/*
=================================
MAPA
=================================
*/

function getMapNumber(mapName) {
    const maps = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4,
        citadela_lunar: 5,
        abismo_noctra: 6
    };
    return maps[mapName] || 1;
}

/*
=================================
CLASSIFICAÇÃO DE ENCONTRO
=================================
*/

function getEncounterTier(enemy) {
    if (enemy?.isBoss) return 'boss';
    if (enemy?.isMiniBoss) return 'miniboss';
    if (enemy?.isElite) return 'elite';
    return 'common';
}

/*
=================================
TÍTULO DE VITÓRIA
=================================
*/

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
    player.maxInventory ??= 20;
    player.currentMap ??= 'clareira_sombria';
    player.level ??= 1;
    player.vip ??= false;
    return player;
}

/*
=================================
RECOMPENSA BASE
=================================
*/

function buildRewardBase(player, enemy) {
    let baseXp = Math.max(1, Number(enemy?.xp || 0));
    let baseGold = Math.max(1, Number(enemy?.gold || 0));

    if (player.vip) {
        baseXp = Math.floor(baseXp * 1.20);
        baseGold = Math.floor(baseGold * 1.20);
    }

    const streakBonus = (player.totalKills > 0 && player.totalKills % 10 === 0)
        ? Math.floor(baseGold * 0.20)
        : 0;

    const occasionalBonusGold = Math.random() < 0.10
        ? Math.floor(baseGold * 0.25)
        : 0;

    return {
        xp: baseXp,
        gold: baseGold + streakBonus + occasionalBonusGold,
        streakBonus,
        bonusGold: occasionalBonusGold
    };
}

/*
=================================
CHAVE
=================================
*/

function tryDropKey(player, enemy, loot) {
    let chance = 0;

    if (enemy?.isBoss) chance = 0.12;
    else if (enemy?.isMiniBoss) chance = 0.05;
    else if (enemy?.isElite) chance = 0.015;
    else chance = 0;

    const dropped = Math.random() < chance;

    if (dropped) {
        applyKeyReward(player, 1);
        loot.push('🗝️ Chave Sombria');
    }

    return dropped;
}

/*
=================================
ITEM
=================================
*/

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

    const droppedItem = generateDrop(mapNumber, {
        encounterTier,
        rarityBias: dropProfile.rarityBias
    });

    const addItemResult = addInventoryItem(player, droppedItem);

    if (!addItemResult.success) {
        return {
            droppedItem: null,
            inventoryFull: true
        };
    }

    loot.push(`🎁 ${droppedItem.name} [${droppedItem.rarity}]`);
    return {
        droppedItem,
        inventoryFull: false
    };
}

/*
=================================
SOUL
=================================
*/

function tryDropSoul(player, enemy, loot) {
    const soulChance = getSoulDropChanceByEnemy(enemy, player.soulPityCounter);

    if (Math.random() > soulChance) {
        if (enemy?.isBoss) {
            registerSoulPityFailure(player);
        }
        return {
            droppedSoul: null,
            soulDropped: false,
            soulChance
        };
    }

    const droppedSoul = resolveSoulDrop({
        playerLevel: player.level,
        enemy,
        pityCounter: player.soulPityCounter
    });

    if (!droppedSoul) {
        if (enemy?.isBoss) {
            registerSoulPityFailure(player);
        }
        return {
            droppedSoul: null,
            soulDropped: false,
            soulChance
        };
    }

    player.soulsInventory.push(droppedSoul);
    loot.push(`💀 ${droppedSoul.name} [${droppedSoul.rarity}]`);

    if (enemy?.isBoss) {
        resetSoulPity(player);
    }

    return {
        droppedSoul,
        soulDropped: true,
        soulChance
    };
}

/*
=================================
PROCESSAMENTO DE RECOMPENSAS
=================================
*/

async function processVictory(player, enemy) {
    ensureRewardState(player);

    const rewardBase = buildRewardBase(player, enemy);
    const loot = [];

    applyGoldReward(player, rewardBase.gold);

    const previousLevel = player.level;
    applyXpReward(player, rewardBase.xp);
    const leveledUp = player.level > previousLevel;

    const itemResult = tryDropItem(player, enemy, loot);
    const soulResult = tryDropSoul(player, enemy, loot);
    const keyDropped = tryDropKey(player, enemy, loot);

    player.totalKills += 1;

    normalizePlayerForSave(player);

    await recordDropMetrics({
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
        bonusGold: rewardBase.bonusGold,
        streakBonus: rewardBase.streakBonus,
        loot,
        droppedItem: itemResult.droppedItem,
        inventoryFull: itemResult.inventoryFull,
        droppedSoul: soulResult.droppedSoul,
        soulDropped: soulResult.soulDropped,
        soulChance: soulResult.soulChance,
        keyDropped,
        leveledUp,
        totalKills: player.totalKills
    };
}

module.exports = {
    processVictory
};