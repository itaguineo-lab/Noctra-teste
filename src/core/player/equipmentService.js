function buildSyntheticItemId() {
    return `itm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildSemanticKey(item = {}) {
    return [
        item.slot || 'unknown',
        item.name || 'item',
        item.level || 0,
        item.rarity || 'common',
        item.atk || 0,
        item.def || 0,
        item.hp || 0,
        item.crit || 0,
        item.category || 'none',
        item.uiCategory || 'none'
    ].join('|');
}

function isUsableId(value) {
    const v = String(value || '').trim();
    if (!v) return false;
    if (v === '[object Object]') return false;
    return true;
}

function ensureItemIdentity(item, options = {}) {
    if (!item || typeof item !== 'object') return item;

    const { forceNewIdentity = false } = options;

    if (forceNewIdentity) {
        const syntheticId = buildSyntheticItemId();
        item.instanceId = syntheticId;
        item.id = syntheticId;
        if (!item.__legacyKey) item.__legacyKey = buildSemanticKey(item);
        return item;
    }

    const instanceId = String(item.instanceId || '').trim();
    if (instanceId) {
        if (!item.id) item.id = instanceId;
        return item;
    }

    const rawId = String(item.id || '').trim();
    if (rawId && (rawId.startsWith('drop_') || rawId.startsWith('itm_'))) {
        item.instanceId = rawId;
        item.id = rawId;
        return item;
    }

    /*
    IDs semânticos antigos tipo "ring_silver" não são confiáveis como identidade única.
    Então convertemos isso em instanceId real.
    */
    const syntheticId = buildSyntheticItemId();
    item.instanceId = syntheticId;
    item.id = syntheticId;

    if (!item.__legacyKey) {
        item.__legacyKey = rawId || buildSemanticKey(item);
    }

    return item;
}

function getItemKey(item) {
    if (!item || typeof item !== 'object') return '';

    ensureItemIdentity(item);

    const instanceId = String(item.instanceId || '').trim();
    if (instanceId) return instanceId;

    const mongoId = String(item._id || '').trim();
    if (mongoId && mongoId !== '[object Object]') return mongoId;

    return buildSemanticKey(item);
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
            continue;
        }

        if (player.equipment[slot]) {
            ensureItemIdentity(player.equipment[slot]);
        }
    }

    player.inventory = player.inventory.map(item => ensureItemIdentity(item));
    return player;
}

function cloneItem(item = {}, equipped = false, options = {}) {
    const cloned = {
        ...item,
        __equipped: equipped
    };

    ensureItemIdentity(cloned, options);
    return cloned;
}

function ensureUniqueInventoryKeys(items = [], usedKeys = new Set()) {
    const result = [];

    for (const rawItem of items) {
        if (!rawItem || typeof rawItem !== 'object') continue;

        const item = rawItem;
        ensureItemIdentity(item);

        let key = getItemKey(item);

        while (!key || usedKeys.has(key)) {
            ensureItemIdentity(item, { forceNewIdentity: true });
            key = getItemKey(item);
        }

        usedKeys.add(key);
        result.push(item);
    }

    return result;
}

function ensureUniquePlayerItemKeys(player) {
    ensureEquipmentState(player);

    const usedKeys = new Set();
    const slots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    for (const slot of slots) {
        const equipped = player.equipment[slot];
        if (!equipped) continue;

        ensureItemIdentity(equipped);
        let key = getItemKey(equipped);

        while (!key || usedKeys.has(key)) {
            ensureItemIdentity(equipped, { forceNewIdentity: true });
            key = getItemKey(equipped);
        }

        usedKeys.add(key);
        player.equipment[slot] = equipped;
    }

    player.inventory = ensureUniqueInventoryKeys(player.inventory, usedKeys);
    return player;
}

function findInventoryItemByKey(player, itemKey) {
    ensureUniquePlayerItemKeys(player);
    return player.inventory.find(item => getItemKey(item) === String(itemKey)) || null;
}

function removeInventoryItemByKey(player, itemKey) {
    ensureUniquePlayerItemKeys(player);

    const key = String(itemKey);
    const index = player.inventory.findIndex(item => getItemKey(item) === key);

    if (index === -1) {
        return null;
    }

    const [removed] = player.inventory.splice(index, 1);
    return removed || null;
}

function pushInventoryCopySafely(player, item) {
    ensureUniquePlayerItemKeys(player);

    const baseClone = cloneItem(item, false);
    const existingKeys = new Set(player.inventory.map(invItem => getItemKey(invItem)));

    if (existingKeys.has(getItemKey(baseClone))) {
        player.inventory.push(cloneItem(item, false, { forceNewIdentity: true }));
    } else {
        player.inventory.push(baseClone);
    }

    ensureUniquePlayerItemKeys(player);
    return player;
}

function equipItem(player, slot, item) {
    ensureUniquePlayerItemKeys(player);

    const normalizedItem = cloneItem(item, true);
    const targetKey = getItemKey(normalizedItem);

    /*
    Primeiro remove o alvo do inventário.
    Isso evita perder o item antigo quando há colisão de identidade.
    */
    const selectedInventoryItem = removeInventoryItemByKey(player, targetKey);
    const itemToEquip = selectedInventoryItem
        ? cloneItem(selectedInventoryItem, true)
        : cloneItem(item, true);

    const current = player.equipment[slot];

    if (current) {
        pushInventoryCopySafely(player, current);
    }

    player.equipment[slot] = itemToEquip;

    ensureUniquePlayerItemKeys(player);
    return player;
}

function unequipItem(player, slot) {
    ensureUniquePlayerItemKeys(player);

    const item = player.equipment[slot];
    if (!item) return null;

    const returned = cloneItem(item, false);

    /*
    Nunca perder item por colisão. Se o inventário já tiver a mesma key,
    a cópia devolvida recebe identidade nova.
    */
    pushInventoryCopySafely(player, returned);

    player.equipment[slot] = null;
    ensureUniquePlayerItemKeys(player);

    return returned;
}

module.exports = {
    equipItem,
    unequipItem,
    sameItem,
    getItemKey,
    findInventoryItemByKey,
    removeInventoryItemByKey,
    ensureEquipmentState,
    ensureItemIdentity,
    ensureUniquePlayerItemKeys
};