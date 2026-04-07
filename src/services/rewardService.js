const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');
const { generateDrop } = require('../data/items');

function getSoulDropChance(enemy, pityMultiplier = 1) {
    if (!enemy?.isBoss) return 0;
    let baseChance = enemy.isDungeonBoss ? 0.08 : 0.03;
    return Math.min(0.5, baseChance * pityMultiplier);
}

function getKeyDropChance(enemy) {
    if (!enemy?.isBoss) return 0;
    return enemy.isDungeonBoss ? 0.15 : 0.05;
}

function getMapNumber(mapName) {
    const maps = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3
    };

    return maps[mapName] || 1;
}

function processVictory(player, enemy) {
    if (!player.inventory) player.inventory = [];
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (typeof player.keys !== 'number') player.keys = 0;
    if (!player.achievements) player.achievements = {};
    if (typeof player.soulPityCounter !== 'number') player.soulPityCounter = 0;

    player.totalKills = (player.totalKills || 0) + 1;

    const baseXp = enemy.xp || 0;
    const baseGold = enemy.gold || 0;
    const vipMultiplier = player.vip ? 1.5 : 1;

    const xpGained = Math.floor(baseXp * vipMultiplier);
    const goldGained = Math.floor(baseGold * vipMultiplier);

    player.gold = (player.gold || 0) + goldGained;
    const levelResult = addXp(player, xpGained);

    let droppedSoul = null;
    let droppedItem = null;
    let droppedKey = null;
    const loot = [];

    const equipmentChance = enemy.isBoss ? 1 : 0.20;

    if (Math.random() < equipmentChance) {
        const mapNumber = getMapNumber(player.currentMap);

        droppedItem = generateDrop(mapNumber);

        const maxInventory = player.maxInventory || 20;

        if (player.inventory.length >= maxInventory) {
            loot.push(`❌ Inventário cheio! ${droppedItem.name} foi perdido.`);
            droppedItem = null;
        } else {
            player.inventory.push(droppedItem);

            loot.push(
                `🎁 ${droppedItem.name} Lv${droppedItem.level}\n` +
                `⚔️ ATK ${droppedItem.atk} | 🛡️ DEF ${droppedItem.def} | ❤️ HP ${droppedItem.hp} | 💥 ${droppedItem.crit}%`
            );
        }
    }

    let pityMultiplier = 1;

    if (player.soulPityCounter >= 10) {
        pityMultiplier = 2;
        player.soulPityCounter = 0;
    }

    const soulChance = getSoulDropChance(enemy, pityMultiplier);
    let dropped = false;

    if (Math.random() < soulChance) {
        droppedSoul = dropSoul(player.level, enemy.id);

        if (droppedSoul) {
            player.soulsInventory.push(droppedSoul);
            loot.push(`💀 Alma: ${droppedSoul.name}`);
            dropped = true;
        }
    }

    if (enemy.isBoss) {
        if (dropped) {
            player.soulPityCounter = 0;
        } else {
            player.soulPityCounter += 1;
        }
    }

    const keyChance = getKeyDropChance(enemy);

    if (Math.random() < keyChance) {
        player.keys += 1;
        droppedKey = true;
        loot.push('🗝️ Chave da Masmorra');
    }

    return {
        xp: xpGained,
        gold: goldGained,
        loot,
        droppedSoul,
        droppedItem,
        droppedKey,
        leveledUp: levelResult?.leveledUp || false
    };
}

module.exports = { processVictory };