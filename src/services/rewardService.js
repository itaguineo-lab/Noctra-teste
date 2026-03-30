const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');

function processVictory(player, enemy) {
  const xp = enemy.xp || 0;
  const gold = enemy.gold || 0;

  player.gold = (player.gold || 0) + gold;
  addXp(player, xp);

  let droppedSoul = null;

  if (Math.random() < (enemy.isBoss ? 0.25 : 0.05)) {
    droppedSoul = dropSoul(player.level);
    if (droppedSoul) {
      player.soulsInventory.push(droppedSoul);
    }
  }

  return { xp, gold, droppedSoul };
}

module.exports = { processVictory };