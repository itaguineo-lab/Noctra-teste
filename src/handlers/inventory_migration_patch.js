const { saveAfterEquip, saveAfterUnequip } = require('./inventoryPersistenceAdapter');

/**
 * PATCH DE MIGRAÇÃO
 * Substituir chamadas no inventory.js:
 * - recalculateStats + savePlayer
 * por saveAfterEquip / saveAfterUnequip
 */

async function patchEquip(ctx, player, slot, item) {
  return saveAfterEquip(ctx.from.id, player, slot, item);
}

async function patchUnequip(ctx, player, slot) {
  return saveAfterUnequip(ctx.from.id, player, slot);
}

module.exports = { patchEquip, patchUnequip };
