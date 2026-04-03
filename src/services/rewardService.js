const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');
const { generateItem } = require('../data/items');

function getSoulDropChance(enemy) {
    if (!enemy?.isBoss) return 0;

    if (enemy.isDungeonBoss) return 0.08; // 8%
    if (enemy.isWorldBoss) return 0.15;   // 15%

    return 0.03; // 3% boss normal
}

function getKeyDropChance(enemy) {
    if (!enemy?.isBoss) return 0;

    if (enemy.isDungeonBoss) return 0.15;
    return 0.05;
}

function processAchievements(player, loot) {
    if (!player.achievements) {
        player.achievements = {};
    }

    if (player.totalKills === 10 && !player.achievements.kill10) {
        player.achievements.kill10 = true;
        player.glorias = (player.glorias || 0) + 5;
        loot.push('🏆 Conquista: 10 abates (+5 Glórias)');
    }

    if (player.totalKills === 100 && !player.achievements.kill100) {
        player.achievements.kill100 = true;
        player.glorias = (player.glorias || 0) + 20;
        loot.push('🏆 Conquista: 100 abates (+20 Glórias)');
    }
}

function processVictory(player, enemy) {
    if (!player.inventory) player.inventory = [];
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (typeof player.keys !== 'number') player.keys = 0;

    player.totalKills = (player.totalKills || 0) + 1;

    const baseXp = enemy.xp || enemy.exp || 0;
    const baseGold = enemy.gold || 0;

    const vipMultiplier = player.vip ? 1.5 : 1;

    const xpGained = Math.floor(baseXp * vipMultiplier);
    const goldGained = Math.floor(baseGold * vipMultiplier);

    player.gold = (player.gold || 0) + goldGained;
    player.xp = (player.xp || 0) + xpGained;

    const leveledUp = addXp(player, 0);

    let droppedSoul = null;
    let droppedItem = null;
    let droppedKey = null;

    const loot = [];

    /*
      EQUIPAMENTO
      Boss = garantido
      Comum = 20%
    */
    const equipmentChance = enemy.isBoss ? 1 : 0.20;

    if (Math.random() < equipmentChance) {
        droppedItem = generateItem(player.level, null, {
            currentMap: player.currentMap,
            isBoss: enemy.isBoss,
            isDungeonBoss: enemy.isDungeonBoss || false
        });

        const inventoryCount = player.inventory.length;
        const maxInventory = player.maxInventory || (player.vip ? 30 : 20);

        if (inventoryCount >= maxInventory) {
            loot.push(`❌ Inventário cheio! ${droppedItem.name} foi perdido.`);
            droppedItem = null;
        } else {
            player.inventory.push(droppedItem);
            loot.push(`${droppedItem.emoji} Equipamento: ${droppedItem.name}`);
        }
    }

    /*
      ALMAS
      Somente bosses
    */
    const soulChance = getSoulDropChance(enemy);

    if (Math.random() < soulChance) {
        droppedSoul = dropSoul(player.level);

        if (droppedSoul) {
            player.soulsInventory.push(droppedSoul);
            loot.push(`💀 Alma rara obtida: ${droppedSoul.name}`);
        }
    }

    /*
      CHAVES
      Bosses e dungeon
    */
    const keyChance = getKeyDropChance(enemy);

    if (Math.random() < keyChance) {
        player.keys += 1;
        droppedKey = true;
        loot.push('🗝️ Chave da Masmorra');
    }

    processAchievements(player, loot);

    return {
        xp: xpGained,
        gold: goldGained,
        loot,
        droppedSoul,
        droppedItem,
        droppedKey,
        leveledUp
    };
}

module.exports = { processVictory };