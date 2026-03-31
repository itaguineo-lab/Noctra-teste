const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');
const { generateItem } = require('../data/items');

function processVictory(player, enemy) {
  if (!player.inventory) player.inventory = [];
  if (!Array.isArray(player.soulsInventory)) {
    player.soulsInventory = [];
  }

  if (!Array.isArray(player.keysInventory)) {
    player.keysInventory = [];
  }

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
    DROP DE EQUIPAMENTO
    mob comum = 20%
    boss = 100%
  */
  const equipmentChance = enemy.isBoss ? 1 : 0.20;

  if (Math.random() < equipmentChance) {
    droppedItem = generateItem(
      player.level,
      null
    );

    player.inventory.push(droppedItem);

    loot.push(
      `${droppedItem.emoji} ${droppedItem.name}`
    );
  }

  /*
    ALMAS
    SOMENTE BOSSES
    chance extremamente rara
  */
  const soulChance = enemy.isBoss ? 0.01 : 0;

  if (Math.random() < soulChance) {
    droppedSoul = dropSoul(player.level);

    if (droppedSoul) {
      player.soulsInventory.push(droppedSoul);

      loot.push(
        `💀 Alma: ${droppedSoul.name}`
      );
    }
  }

  /*
    CHAVE DE MASMORRA
    SOMENTE BOSS DE CAMPO
    muito rara
  */
  const keyChance = enemy.isBoss ? 0.02 : 0;

  if (Math.random() < keyChance) {
    droppedKey = {
      id: `key_${Date.now()}`,
      name: 'Chave da Masmorra',
      type: 'dungeon_key',
      rarity: 'Épico'
    };

    player.keysInventory.push(droppedKey);

    loot.push('🗝️ Chave da Masmorra');
  }

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

module.exports = {
  processVictory
};