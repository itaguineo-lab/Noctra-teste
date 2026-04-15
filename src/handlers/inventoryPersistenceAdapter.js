const { persistPlayer } = require('../core/player/playerSaveGuard');
const { equipItem, unequipItem } = require('../core/player/equipmentService');

async function saveAfterEquip(userId, player, slot, item) {
  equipItem(player, slot, item);
  return persistPlayer(userId, player);
}

async function saveAfterUnequip(userId, player, slot) {
  const removed = unequipItem(player, slot);
  await persistPlayer(userId, player);
  return removed;
}

module.exports = {
  saveAfterEquip,
  saveAfterUnequip
};
