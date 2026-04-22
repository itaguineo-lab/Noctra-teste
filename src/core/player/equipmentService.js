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

function sanitizeIdPart(value = '') {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'item';
}

function isUsableId(value) {
    const v = String(value || '').trim();
    if (!v) return false;
    if (v === '[object Object]') return false;
    return true;
}

function getLegacyBase(item = {}) {
    const rawInstanceId = String(item.instanceId || '').trim();
    if (rawInstanceId.startsWith('itm_') || rawInstanceId.startsWith('drop_') || rawInstanceId.startsWith('lgc_')) {
        return sanitizeIdPart(rawInstanceId);
    }

    const rawId = String(item.id || '').trim();
    if (rawId.startsWith('itm_') || rawId.startsWith('drop_') || rawId.startsWith('lgc_')) {
        return sanitizeIdPart(rawId);
    }

    const explicitLegacy = String(item.__legacyBase || item.__legacyKey || '').trim();
    if (explicitLegacy) {
        return sanitizeIdPart(explicitLegacy);
    }

    if (rawId) {
        return sanitizeIdPart(rawId);
    }

    return sanitizeIdPart(buildSemanticKey(item));
}

function ensureItemIdentity(item) {
    if (!item || typeof item !== 'object') return item;

    const instanceId = String(item.instanceId || '').trim();
    if (isUsableId(instanceId)) {
        item.instanceId = instanceId;
        item.id = instanceId;
        if (!item.__legacyBase) item.__legacyBase = getLegacyBase(item);
        return item;
    }

    const rawId = String(item.id || '').trim();
    if (isUsableId(rawId) && (rawId.startsWith('itm_') || rawId.startsWith('drop_') || rawId.startsWith('lgc_'))) {
        item.instanceId = rawId;
        item.id = rawId;
        if (!item.__legacyBase) item.__legacyBase = getLegacyBase(item);
        return item;
    }

    const base = getLegacyBase(item);
    item.__legacyBase = base;
    item.instanceId = `lgc_${base}`;
    item.id = item.instanceId;
    return item;
}

function getItemKey(item) {
    if (!item || typeof item !== 'object') return '';

    ensureItemIdentity(item);

    const instanceId = String(item.instanceId || '').trim();
    if (instanceId) return instanceId;

    const mongoId = String(item._id || '').trim();
    if (mongoId && mongoId !== '[object Object]') return mongoId;

    return `lgc_${getLegacyBase(item)}`;
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

    player.inventory = player.inventory
        .filter(item => item && typeof item === 'object')
        .map(item => ensureItemIdentity(item));

    return player;
}

function cloneItem(item = {}, equipped = false) {
    const cloned = {
        ...item,
        __equipped: equipped
    };

    ensureItemIdentity(cloned);
    return cloned;
}

function assignDeterministicUniqueId(item, usedKeys, baseCounters) {
    ensureItemIdentity(item);

    const currentKey = getItemKey(item);
    if (currentKey && !usedKeys.has(currentKey)) {
        usedKeys.add(currentKey);
        return item;
    }

    const base = getLegacyBase(item);
    let counter = (baseCounters.get(base) || 0) + 1;
    let newId = `lgc_${base}_${counter}`;

    while (usedKeys.has(newId)) {
        counter += 1;
        newId = `lgc_${base}_${counter}`;
    }

    baseCounters.set(base, counter);
    item.__legacyBase = base;
    item.instanceId = newId;
    item.id = newId;
    usedKeys.add(newId);

    return item;
}

function ensureUniquePlayerItemKeys(player) {
    ensureEquipmentState(player);

    const usedKeys = new Set();
    const baseCounters = new Map();
    const slots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    for (const slot of slots) {
        const equipped = player.equipment[slot];
        if (!equipped) continue;

        assignDeterministicUniqueId(equipped, usedKeys, baseCounters);
        player.equipment[slot] = equipped;
    }

    const fixedInventory = [];
    for (const item of player.inventory) {
        if (!item || typeof item !== 'object') continue;

        assignDeterministicUniqueId(item, usedKeys, baseCounters);
        fixedInventory.push(item);
    }

    player.inventory = fixedInventory;
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

    if (index === -1) return null;

    const [removed] = player.inventory.splice(index, 1);
    return removed || null;
}

function addItemBackToInventory(player, item) {
    const restored = cloneItem(item, false);
    player.inventory.push(restored);
    ensureUniquePlayerItemKeys(player);

    const restoredKey = getItemKey(restored);
    return player.inventory.find(invItem => getItemKey(invItem) === restoredKey) || restored;
}

function equipItem(player, slot, item) {
    ensureUniquePlayerItemKeys(player);

    const targetKey = getItemKey(item);
    const selectedInventoryItem = removeInventoryItemByKey(player, targetKey);
    const currentEquipped = player.equipment[slot] ? cloneItem(player.equipment[slot], false) : null;

    if (currentEquipped) {
        /*
        Primeiro removemos o item selecionado do inventário.
        Depois equipamos o novo item.
        Só então devolvemos o antigo para o inventário.
        Isso evita colisão artificial entre o item equipado e a cópia devolvida.
        */
        player.equipment[slot] = null;
    }

    const itemToEquip = cloneItem(selectedInventoryItem || item, true);
    player.equipment[slot] = itemToEquip;

    if (currentEquipped) {
        addItemBackToInventory(player, currentEquipped);
    }

    ensureUniquePlayerItemKeys(player);
    return player;
}

function unequipItem(player, slot) {
    ensureUniquePlayerItemKeys(player);

    const equipped = player.equipment[slot];
    if (!equipped) return null;

    /*
    Aqui estava o erro principal:
    o código antigo devolvia uma cópia ao inventário enquanto o item ainda
    permanecia equipado. Isso gerava colisão de identidade.
    Agora o slot é limpo antes, e o próprio item volta ao inventário.
    */
    const returningItem = cloneItem(equipped, false);
    player.equipment[slot] = null;

    const restored = addItemBackToInventory(player, returningItem);

    ensureUniquePlayerItemKeys(player);
    return restored;
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