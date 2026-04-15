function getItemKey(item) {
  if (!item || typeof item !== 'object') return '';
  return String(
    item.id ?? item._id ?? item.instanceId ?? `${item.slot || 'unknown'}|${item.name || 'item'}|${item.level || 0}`
  );
}

function sameItem(a, b) {
  return getItemKey(a) === getItemKey(b);
}

function equipItem(player, slot, item) {
  if (!player.equipment) player.equipment = {};
  if (!Array.isArray(player.inventory)) player.inventory = [];

  const current = player.equipment[slot];
  if (current && !sameItem(current, item)) {
    player.inventory.push({ ...current, __equipped: false });
  }

  player.inventory = player.inventory.filter(invItem => !sameItem(invItem, item));
  player.equipment[slot] = { ...item, __equipped: true };

  return player;
}

function unequipItem(player, slot) {
  if (!player.equipment) player.equipment = {};
  if (!Array.isArray(player.inventory)) player.inventory = [];

  const item = player.equipment[slot];
  if (!item) return null;

  player.inventory.push({ ...item, __equipped: false });
  player.equipment[slot] = null;

  return item;
}

module.exports = {
  equipItem,
  unequipItem,
  sameItem,
  getItemKey
};