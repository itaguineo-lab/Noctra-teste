const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');
const { generateItem } = require('../data/items');

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
    let droppedSoul = null, droppedItem = null, droppedKey = null;
    const loot = [];
    const equipmentChance = enemy.isBoss ? 1 : 0.20;
    if (Math.random() < equipmentChance) {
        droppedItem = generateItem(player.level, null);
        const inventoryCount = player.inventory.length;
        const maxInventory = player.maxInventory || (player.vip ? 30 : 20);
        if (inventoryCount >= maxInventory) {
            loot.push(`❌ Inventário cheio! ${droppedItem.name} foi perdido.`);
            droppedItem = null;
        } else {
            player.inventory.push(droppedItem);
            loot.push(`${droppedItem.emoji} ${droppedItem.name}`);
        }
    }
    const soulChance = enemy.isBoss ? 0.01 : 0; // 1% para boss
    if (Math.random() < soulChance) {
        droppedSoul = dropSoul(player.level);
        if (droppedSoul) {
            player.soulsInventory.push(droppedSoul);
            loot.push(`💀 Alma: ${droppedSoul.name}`);
        }
    }
    const keyChance = enemy.isBoss ? 0.02 : 0; // 2%
    if (Math.random() < keyChance) {
        player.keys = (player.keys || 0) + 1;
        loot.push('🗝️ Chave da Masmorra');
    }
    if (player.totalKills === 10 && !player.achievements?.kill10) {
        if (!player.achievements) player.achievements = {};
        player.achievements.kill10 = true;
        player.glorias = (player.glorias || 0) + 5;
        loot.push('🏆 Conquista: 10 mortes! +5 Glórias');
    } else if (player.totalKills === 100 && !player.achievements?.kill100) {
        player.achievements.kill100 = true;
        player.glorias = (player.glorias || 0) + 20;
        loot.push('🏆 Conquista: 100 mortes! +20 Glórias');
    }
    return { xp: xpGained, gold: goldGained, loot, droppedSoul, droppedItem, droppedKey, leveledUp };
}

module.exports = { processVictory };