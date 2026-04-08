const {
    addXp
} = require('../core/player/progression');

const {
    dropSoul
} = require('../core/player/souls');

const {
    generateDrop
} = require('../data/items');

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
        deserto_incandescente: 4
    };

    return maps[mapName] || 1;
}

/*
=================================
DROP HELPERS
=================================
*/

function getEquipmentChance(enemy) {
    if (enemy.isBoss) return 1;
    if (enemy.isMiniBoss) return 0.6;
    if (enemy.isElite) return 0.4;

    return 0.25;
}

function getSoulChance(enemy) {
    if (enemy.isBoss) return 0.25;
    if (enemy.isMiniBoss) return 0.12;
    if (enemy.isElite) return 0.08;

    return 0.05;
}

function getKeyChance(enemy) {
    if (enemy.isBoss) return 0.25;
    if (enemy.isMiniBoss) return 0.15;

    return 0.1;
}

function getVictoryTitle(enemy) {
    if (enemy.isBoss) {
        return '👑 BOSS DERROTADO';
    }

    if (enemy.isMiniBoss) {
        return '💀 MINI BOSS DERROTADO';
    }

    if (enemy.isElite) {
        return '🔥 ELITE DERROTADO';
    }

    return '🏆 VITÓRIA';
}

/*
=================================
REWARD
=================================
*/

function processVictory(player, enemy) {
    player.inventory ??= [];
    player.soulsInventory ??= [];
    player.totalKills ??= 0;
    player.soulPityCounter ??= 0;

    /*
    BASE
    */

    const baseXp = enemy.xp || 0;
    const baseGold = enemy.gold || 0;

    /*
    BONUS GOLD
    */

    const bonusGold =
        Math.random() < 0.15
            ? Math.floor(baseGold * 0.5)
            : 0;

    /*
    STREAK BONUS
    */

    const streakBonus =
        player.totalKills > 0 &&
        player.totalKills % 10 === 0
            ? Math.floor(baseGold * 0.3)
            : 0;

    const finalGold =
        baseGold +
        bonusGold +
        streakBonus;

    player.gold =
        (player.gold || 0) +
        finalGold;

    /*
    XP
    */

    const previousLevel =
        player.level;

    addXp(player, baseXp);

    const leveledUp =
        player.level >
        previousLevel;

    /*
    LOOT
    */

    const loot = [];

    let droppedItem = null;
    let droppedSoul = null;

    const mapNumber =
        getMapNumber(
            player.currentMap
        );

    /*
    EQUIP DROP
    */

    const equipmentChance =
        getEquipmentChance(enemy);

    if (
        Math.random() <
        equipmentChance
    ) {
        droppedItem =
            generateDrop(
                mapNumber
            );

        if (
            player.inventory.length <
            (player.maxInventory || 20)
        ) {
            player.inventory.push(
                droppedItem
            );

            loot.push(
                `🎁 ${droppedItem.name} [Lv${droppedItem.level}]`
            );
        }
    }

    /*
    SOUL DROP + PITY
    */

    player.soulPityCounter++;

    const soulChance =
        getSoulChance(enemy);

    const pityGuaranteed =
        player.soulPityCounter >= 15;

    if (
        Math.random() < soulChance ||
        pityGuaranteed
    ) {
        droppedSoul =
            dropSoul(
                player.level,
                enemy.id,
                player.soulPityCounter
            );

        if (droppedSoul) {
            player.soulsInventory.push(
                droppedSoul
            );

            loot.push(
                `💀 ${droppedSoul.name}`
            );

            player.soulPityCounter = 0;
        }
    }

    /*
    KEY
    */

    const keyDropped =
        Math.random() <
        getKeyChance(enemy);

    if (keyDropped) {
        player.keys =
            (player.keys || 0) + 1;

        loot.push(
            '🗝️ Chave Sombria'
        );
    }

    /*
    KILLS
    */

    player.totalKills++;

    return {
        title: getVictoryTitle(enemy),
        xp: baseXp,
        gold: finalGold,
        bonusGold,
        streakBonus,
        loot,
        droppedItem,
        droppedSoul,
        keyDropped,
        leveledUp,
        totalKills:
            player.totalKills
    };
}

module.exports = {
    processVictory
};