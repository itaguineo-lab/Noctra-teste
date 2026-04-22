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

function buildLooseSignature(item = {}) {
    return [
        item.slot || 'unknown',
        item.name || 'item',
        item.level || 0,
        item.rarity || 'common',
        item.atk || 0,
        item.def || 0,
        item.hp || 0,
        item.crit || 0
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

function getSlotMeta(slot) {
    if (slot === 'weapon') {
        return { category: 'weapon', uiCategory: 'weapons', displayCategory: 'Arma' };
    }

    if (slot === 'ring' || slot === 'necklace') {
        return { category: 'jewelry', uiCategory: 'jewels', displayCategory: 'Joia' };
    }

    return { category: 'armor', uiCategory: 'armors', displayCategory: 'Armadura' };
}

function getFallbackNameForSlot(slot) {
    if (slot === 'weapon') return 'Arma desconhecida';
    if (slot === 'shield') return 'Escudo desconhecido';
    if (slot === 'armor') return 'Armadura desconhecida';
    if (slot === 'boots') return 'Bota desconhecida';
    if (slot === 'ring') return 'Anel desconhecido';
    if (slot === 'necklace') return 'Colar desconhecido';
    return 'Item desconhecido';
}

function getLegacyBase(item = {}) {
    const explicitLegacy = String(
        item.legacyBase ||
        item.__legacyBase ||
        item.__legacyKey ||
        ''
    ).trim();

    if (explicitLegacy) {
        return sanitizeIdPart(explicitLegacy);
    }

    const rawInstanceId = String(item.instanceId || '').trim();
    if (rawInstanceId.startsWith('itm_') || rawInstanceId.startsWith('drop_') || rawInstanceId.startsWith('lgc_')) {
        return sanitizeIdPart(rawInstanceId);
    }

    const rawId = String(item.id || '').trim();
    if (rawId.startsWith('itm_') || rawId.startsWith('drop_') || rawId.startsWith('lgc_')) {
        return sanitizeIdPart(rawId);
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
        item.legacyBase = item.legacyBase || getLegacyBase(item);
        return item;
    }

    const rawId = String(item.id || '').trim();
    if (isUsableId(rawId) && (rawId.startsWith('itm_') || rawId.startsWith('drop_') || rawId.startsWith('lgc_'))) {
        item.instanceId = rawId;
        item.id = rawId;
        item.legacyBase = item.legacyBase || getLegacyBase(item);
        return item;
    }

    const base = getLegacyBase(item);
    item.legacyBase = base;
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

function normalizeItemForSlot(item = {}, slotHint = null, equipped = false) {
    if (!item || typeof item !== 'object') return null;

    const slot = String(slotHint || item.slot || '').trim() || null;
    const meta = slot ? getSlotMeta(slot) : {
        category: item.category || null,
        uiCategory: item.uiCategory || null,
        displayCategory: item.displayCategory || null
    };

    const rawName = String(item.name || '').trim();
    const normalized = {
        ...item,
        name: rawName || (slot ? getFallbackNameForSlot(slot) : 'Item desconhecido'),
        slot,
        category: meta.category,
        uiCategory: meta.uiCategory,
        displayCategory: meta.displayCategory,
        __equipped: equipped
    };

    ensureItemIdentity(normalized);
    return normalized;
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
            player.equipment[slot] = normalizeItemForSlot(player.equipment[slot], slot, true);
        }
    }

    player.inventory = player.inventory
        .filter(item => item && typeof item === 'object')
        .map(item => {
            ensureItemIdentity(item);
            return item;
        });

    return player;
}

function cloneItem(item = {}, equipped = false, slotHint = null) {
    return normalizeItemForSlot({ ...item }, slotHint || item.slot || null, equipped);
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
    item.legacyBase = base;
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
        player.equipment[slot] = normalizeItemForSlot(equipped, slot, true);
    }

    const fixedInventory = [];
    for (const item of player.inventory) {
        if (!item || typeof item !== 'object') continue;

        assignDeterministicUniqueId(item, usedKeys, baseCounters);
        fixedInventory.push(normalizeItemForSlot(item, item.slot, false));
    }

    player.inventory = fixedInventory;
    return player;
}

function findInventoryIndexFlexible(player, itemKey, fallbackItem = null) {
    ensureUniquePlayerItemKeys(player);

    const key = String(itemKey || '').trim();
    if (key) {
        const exactIndex = player.inventory.findIndex(item => getItemKey(item) === key);
        if (exactIndex !== -1) return exactIndex;
    }

    if (!fallbackItem) return -1;

    const fallbackSignature = buildLooseSignature(fallbackItem);
    return player.inventory.findIndex(item => buildLooseSignature(item) === fallbackSignature);
}

function findInventoryItemByKey(player, itemKey) {
    const index = findInventoryIndexFlexible(player, itemKey, null);
    return index === -1 ? null : player.inventory[index];
}

function removeInventoryItemByKey(player, itemKey, fallbackItem = null) {
    const index = findInventoryIndexFlexible(player, itemKey, fallbackItem);

    if (index === -1) return null;

    const [removed] = player.inventory.splice(index, 1);
    return removed || null;
}

function addItemBackToInventory(player, item, slotHint = null) {
    const restored = normalizeItemForSlot(item, slotHint || item.slot, false);
    player.inventory.push(restored);
    ensureUniquePlayerItemKeys(player);

    const restoredKey = getItemKey(restored);
    return player.inventory.find(invItem => getItemKey(invItem) === restoredKey) || restored;
}

function equipItem(player, slot, item) {
    ensureUniquePlayerItemKeys(player);

    const normalizedInput = normalizeItemForSlot(item, slot, false);
    const targetKey = getItemKey(normalizedInput);

    const selectedInventoryItem = removeInventoryItemByKey(player, targetKey, normalizedInput);

    const currentEquipped = player.equipment[slot]
        ? normalizeItemForSlot(player.equipment[slot], slot, false)
        : null;

    if (currentEquipped) {
        player.equipment[slot] = null;
    }

    const itemToEquip = normalizeItemForSlot(selectedInventoryItem || normalizedInput, slot, true);
    player.equipment[slot] = itemToEquip;

    if (currentEquipped) {
        addItemBackToInventory(player, currentEquipped, slot);
    }

    ensureUniquePlayerItemKeys(player);
    return player;
}

function unequipItem(player, slot) {
    ensureUniquePlayerItemKeys(player);

    const equipped = player.equipment[slot];
    if (!equipped) return null;

    const returningItem = normalizeItemForSlot(equipped, slot, false);
    player.equipment[slot] = null;

    const restored = addItemBackToInventory(player, returningItem, slot);

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