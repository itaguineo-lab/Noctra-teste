function getItemKey(item) {
    if (!item || typeof item !== 'object') return '';

    return String(
        item.instanceId ??
        item._id ??
        item.id ??
        `${item.slot || 'unknown'}|${item.name || 'item'}|${item.level || 0}|${item.rarity || 'common'}`
    );
}

function sameItem(a, b) {
    return getItemKey(a) === getItemKey(b);
}

function ensureEquipmentState(player) {
    if (!player.equipment || typeof player.equipment !== 'object') {
        player.equipment = {};
    }

    if (!Array.isArray(player.inventory)) {
        player.inventory = [];
    }

    const slots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];
    for (const slot of slots) {
        if (!(slot in player.equipment)) {
            player.equipment[slot] = null;
        }
    }

    return player;
}

function removeDuplicatesByKey(items = []) {
    const seen = new Set();
    const result = [];

    for (const item of items) {
        const key = getItemKey(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push(item);
    }

    return result;
}

function findInventoryItemByKey(player, itemKey) {
    ensureEquipmentState(player);
    return player.inventory.find(item => getItemKey(item) === String(itemKey)) || null;
}

function removeInventoryItemByKey(player, itemKey) {
    ensureEquipmentState(player);

    const key = String(itemKey);
    const index = player.inventory.findIndex(item => getItemKey(item) === key);

    if (index === -1) {
        return null;
    }

    const [removed] = player.inventory.splice(index, 1);
    return removed || null;
}

function equipItem(player, slot, item) {
    ensureEquipmentState(player);

    const normalizedItem = { ...item, __equipped: true };
    const targetKey = getItemKey(normalizedItem);

    const current = player.equipment[slot];

    if (current && !sameItem(current, normalizedItem)) {
        player.inventory.push({ ...current, __equipped: false });
    }

    player.inventory = player.inventory.filter(invItem => getItemKey(invItem) !== targetKey);
    player.inventory = removeDuplicatesByKey(player.inventory);

    player.equipment[slot] = normalizedItem;

    return player;
}

function unequipItem(player, slot) {
    ensureEquipmentState(player);

    const item = player.equipment[slot];
    if (!item) return null;

    const itemKey = getItemKey(item);
    const alreadyInInventory = player.inventory.some(invItem => getItemKey(invItem) === itemKey);

    if (!alreadyInInventory) {
        player.inventory.push({ ...item, __equipped: false });
    }

    player.equipment[slot] = null;
    player.inventory = removeDuplicatesByKey(player.inventory);

    return item;
}

module.exports = {
    equipItem,
    unequipItem,
    sameItem,
    getItemKey,
    findInventoryItemByKey,
    removeInventoryItemByKey,
    ensureEquipmentState
};