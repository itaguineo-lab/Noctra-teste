const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');

function processVictory(player, enemy) {
  if (!player.inventory) player.inventory = [];
  if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];

  const baseXp = enemy.xp || enemy.exp || 0;
  const baseGold = enemy.gold || 0;

  const vipMultiplier = player.vip ? 1.5 : 1;
  const xpGained = Math.floor(baseXp * vipMultiplier);
  const goldGained = Math.floor(baseGold * vipMultiplier);

  player.gold = (player.gold || 0) + goldGained;
  player.xp = (player.xp || 0) + xpGained;

  const leveledUp = addXp(player, 0);
  const loot = [];
  let droppedSoul = null;

  const itemDropChance = enemy.isBoss ? 1 : 0.2;
  if (Math.random() < itemDropChance) {
    const item = {
      id: `loot_${Date.now()}`,
      name: 'Fragmento Sombrio',
      rarity: enemy.isBoss ? 'Raro' : 'Comum',
      slot: 'material',
      type: 'material'
    };

    player.inventory.push(item);
    loot.push(item.name);
  }

  const soulChance = enemy.isBoss ? 0.3 : 0.05;
  if (Math.random() < soulChance) {
    droppedSoul = dropSoul(player.level);
    if (droppedSoul) {
      player.soulsInventory.push(droppedSoul);
    }
  }

  return {
    xp: xpGained,
    gold: goldGained,
    loot,
    droppedSoul,
    leveledUp
  };
}

module.exports = {
  processVictory
};