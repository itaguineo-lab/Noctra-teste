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

function getMapNumber(
    mapName
) {
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
REWARD
=================================
*/

function processVictory(
    player,
    enemy
) {
    player.inventory ??= [];
    player.soulsInventory ??= [];

    /*
    BASE
    */

    const xp =
        enemy.xp || 0;

    const gold =
        enemy.gold || 0;

    /*
    BÔNUS RANDOM
    */

    const bonusGold =
        Math.random() < 0.15
            ? Math.floor(
                  gold * 0.5
              )
            : 0;

    const finalGold =
        gold + bonusGold;

    player.gold =
        (player.gold || 0) +
        finalGold;

    const previousLevel =
        player.level;

    addXp(player, xp);

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
    EQUIP
    */

    const equipmentChance =
        enemy.isBoss
            ? 1
            : 0.25;

    if (
        Math.random() <
        equipmentChance
    ) {
        droppedItem =
            generateDrop(
                mapNumber
            );

        if (
            player.inventory
                .length <
            (player.maxInventory ||
                20)
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
    SOUL DROP
    */

    const soulChance =
        enemy.isBoss
            ? 0.25
            : 0.05;

    if (
        Math.random() <
        soulChance
    ) {
        droppedSoul =
            dropSoul(
                mapNumber
            );

        if (droppedSoul) {
            player.soulsInventory.push(
                droppedSoul
            );

            loot.push(
                `💀 Alma: ${droppedSoul.name}`
            );
        }
    }

    /*
    BONUS KEY
    */

    const keyDropped =
        Math.random() < 0.1;

    if (keyDropped) {
        player.keys =
            (player.keys || 0) +
            1;

        loot.push(
            `🗝️ Chave Sombria`
        );
    }

    return {
        xp,
        gold: finalGold,
        bonusGold,
        loot,
        droppedItem,
        droppedSoul,
        keyDropped,
        leveledUp
    };
}

module.exports = {
    processVictory
};