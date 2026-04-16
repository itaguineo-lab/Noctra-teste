const { dropSoul } = require('../core/player/souls');
const { generateDrop } = require('../data/items');
const {
    addInventoryItem,
    applyGoldReward,
    applyKeyReward,
    applyXpReward,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

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
TAXAS DE DROP
=================================
*/

function getEquipmentChance(enemy) {
    if (enemy.isBoss) return 0.80;
    if (enemy.isMiniBoss) return 0.40;
    if (enemy.isElite) return 0.25;
    return 0.15;
}

function getSoulChance(enemy) {
    if (enemy.isBoss) return 0.015;
    if (enemy.isMiniBoss) return 0.008;
    if (enemy.isElite) return 0.004;
    return 0.0005;
}

function getKeyChance(enemy) {
    if (enemy.isBoss) return 0.04;
    if (enemy.isMiniBoss) return 0.02;
    return 0.01;
}

function getVictoryTitle(enemy) {
    if (enemy.isBoss) return '👑 BOSS DERROTADO';
    if (enemy.isMiniBoss) return '💀 MINI BOSS DERROTADO';
    if (enemy.isElite) return '🔥 ELITE DERROTADO';
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

function buildGoldRewards(player, enemy) {
    let baseXp = enemy.xp || 0;
    let baseGold = enemy.gold || 0;

    if (player.vip) {
        baseXp = Math.floor(baseXp * 1.5);
        baseGold = Math.floor(baseGold * 1.5);
    }

    const bonusGold = Math.random() < 0.15 ? Math.floor(baseGold * 0.5) : 0;
    const streakBonus = (player.totalKills > 0 && player.totalKills % 10 === 0)
        ? Math.floor(baseGold * 0.3)
        : 0;

    const finalGold = baseGold + bonusGold + streakBonus;

    return {
        xp: baseXp,
        gold: finalGold,
        bonusGold,
        streakBonus
    };
}

/*
=================================
PROCESSAMENTO DE RECOMPENSAS
=================================
*/

function processVictory(player, enemy) {
    ensureRewardState(player);

    const rewardBase = buildGoldRewards(player, enemy);
    const loot = [];

    applyGoldReward(player, rewardBase.gold);

    const previousLevel = player.level;
    applyXpReward(player, rewardBase.xp);
    const leveledUp = player.level > previousLevel;

    let droppedItem = null;
    let droppedSoul = null;

    const mapNumber = getMapNumber(player.currentMap);

    /*
    =================================
    DROP DE EQUIPAMENTO
    =================================
    */

    const equipmentChance = getEquipmentChance(enemy);
    if (Math.random() < equipmentChance) {
        droppedItem = generateDrop(mapNumber);

        const addItemResult = addInventoryItem(player, droppedItem);
        if (addItemResult.success) {
            loot.push(`🎁 ${droppedItem.name} [Lv${droppedItem.level}]`);
        } else {
            droppedItem = null;
        }
    }

    /*
    =================================
    DROP DE ALMA (COM PITY SYSTEM)
    =================================
    */

    const soulChance = getSoulChance(enemy);
    const pityThreshold = 10;
    const pityGuaranteed = player.soulPityCounter >= pityThreshold;

    let soulDropped = false;

    if (Math.random() < soulChance || pityGuaranteed) {
        droppedSoul = dropSoul(player.level, enemy.id, player.soulPityCounter);

        if (droppedSoul) {
            player.soulsInventory.push(droppedSoul);
            loot.push(`💀 ${droppedSoul.name}`);
            soulDropped = true;
        }
    }

    if (enemy.isBoss) {
        if (soulDropped) {
            player.soulPityCounter = 0;
        } else {
            player.soulPityCounter += 1;
        }
    }

    /*
    =================================
    DROP DE CHAVE
    =================================
    */

    const keyDropped = Math.random() < getKeyChance(enemy);
    if (keyDropped) {
        applyKeyReward(player, 1);
        loot.push('🗝️ Chave Sombria');
    }

    /*
    =================================
    TOTAL DE ABATES
    =================================
    */

    player.totalKills += 1;

    normalizePlayerForSave(player);

    return {
        title: getVictoryTitle(enemy),
        xp: rewardBase.xp,
        gold: rewardBase.gold,
        bonusGold: rewardBase.bonusGold,
        streakBonus: rewardBase.streakBonus,
        loot,
        droppedItem,
        droppedSoul,
        keyDropped,
        leveledUp,
        totalKills: player.totalKills
    };
}

module.exports = {
    processVictory
};