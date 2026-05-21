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

function normalizeText(value = '') {
    return String(value || '').trim().toLowerCase();
}

const OFFHAND_TYPE_LABELS = {
    shield: 'Escudo',
    quiver: 'Aljava',
    orb: 'Orbe'
};

function getOffhandTypeLabel(type = '') {
    return OFFHAND_TYPE_LABELS[String(type || '').trim().toLowerCase()] || 'Mão Secundária';
}

function inferWeaponStyleForCompatibility(item = {}) {
    const explicit = normalizeText(item.weaponStyle);

    if (explicit === 'requires_offhand' || explicit === 'one_handed') return 'one_handed';
    if (explicit === 'two_handed') return 'two_handed';

    const name = normalizeText(item.name);

    if (name.includes('machado') || name.includes('cajado')) {
        return 'two_handed';
    }

    if (
        name.includes('espada') ||
        name.includes('arco') ||
        name.includes('lança') ||
        name.includes('lanca') ||
        name.includes('varinha') ||
        name.includes('grimório') ||
        name.includes('grimorio') ||
        name.includes('grimoire')
    ) {
        return 'one_handed';
    }

    return null;
}

function inferRequiredOffhandTypeForCompatibility(item = {}) {
    const explicit = normalizeText(item.requiredOffhandType);
    if (explicit) return explicit;

    const name = normalizeText(item.name);

    if (name.includes('espada')) return 'shield';
    if (name.includes('lança') || name.includes('lanca')) return 'shield';
    if (name.includes('arco')) return 'quiver';
    if (name.includes('varinha')) return 'orb';
    if (name.includes('grimório') || name.includes('grimorio') || name.includes('grimoire')) return 'orb';

    return null;
}

function inferOffhandTypeForCompatibility(item = {}) {
    const explicit = normalizeText(item.offhandType);
    if (explicit) return explicit;

    const name = normalizeText(item.name);

    if (name.includes('aljava')) return 'quiver';
    if (name.includes('orbe')) return 'orb';
    if (name.includes('escudo')) return 'shield';

    return null;
}

function getOffhandCompatibilityIssue(weapon, offhand) {
    if (!weapon) return null;

    const weaponName = weapon.name || 'Esta arma';
    const weaponStyle = inferWeaponStyleForCompatibility(weapon);

    if (weaponStyle === 'two_handed') {
        if (offhand) {
            return `${weaponName} é de duas mãos e exige a mão secundária livre.`;
        }

        return null;
    }

    if (!offhand) return null;

    const requiredType = inferRequiredOffhandTypeForCompatibility(weapon);
    const actualType = inferOffhandTypeForCompatibility(offhand);

    if (!requiredType) return null;

    if (!actualType) {
        return `${offhand.name || 'Este item'} não é uma mão secundária compatível com ${weaponName}.`;
    }

    if (requiredType !== actualType) {
        return `${weaponName} combina com ${getOffhandTypeLabel(requiredType)}, não com ${getOffhandTypeLabel(actualType)}.`;
    }

    return null;
}

function moveEquippedItemToInventory(player, slot) {
    const equipped = player?.equipment?.[slot];
    if (!equipped) return null;

    const returning = normalizeItemForSlot(equipped, slot, false);
    player.equipment[slot] = null;

    if (returning) {
        player.inventory.push(returning);
    }

    return returning;
}

function enforceCompatibleLoadout(player, preferredSlot = 'weapon') {
    ensureEquipmentState(player);

    const weapon = player.equipment.weapon;
    const offhand = player.equipment.shield;
    const issue = getOffhandCompatibilityIssue(weapon, offhand);

    if (!issue) return null;

    /*
    Regra de segurança:
    - O loadout nunca pode persistir inválido.
    - Ao equipar uma nova arma incompatível com a mão secundária, a mão secundária volta ao inventário.
    - Ao equipar uma nova mão secundária incompatível com a arma atual, a arma volta ao inventário.

    Isso evita combinações quebradas como Arco + Escudo, sem deixar item sumir.
    */
    if (preferredSlot === 'shield') {
        moveEquippedItemToInventory(player, 'weapon');
    } else {
        moveEquippedItemToInventory(player, 'shield');
    }

    return issue;
}

function normalizeLegacyWeaponStyle(item = {}) {
    if (!item || typeof item !== 'object') return item;

    const style = String(item.weaponStyle || '').trim().toLowerCase();

    /*
    Regra oficial do NOCTRA:
    - arma de uma mão pode ser equipada sozinha;
    - offhand compatível é uma opção de build, não pré-requisito;
    - somente armas two_handed bloqueiam a mão secundária.

    Mantemos requiredOffhandType/offhandType como metadados para UI e futuro bônus de sinergia,
    mas migramos requires_offhand legado para one_handed para não travar o jogador.
    */
    if (style === 'requires_offhand') {
        item.weaponStyle = 'one_handed';
        item.offhandMode = item.offhandMode || 'optional';
    }

    return item;
}

function getSlotMeta(slot) {
    if (slot === 'weapon') {
        return { category: 'weapon', uiCategory: 'weapons', displayCategory: 'Arma' };
    }

    if (slot === 'shield') {
        return { category: 'armor', uiCategory: 'offhands', displayCategory: 'Mão Secundária' };
    }

    if (slot === 'armor') {
        return { category: 'armor', uiCategory: 'armors', displayCategory: 'Armadura' };
    }

    if (slot === 'boots') {
        return { category: 'armor', uiCategory: 'boots', displayCategory: 'Botas' };
    }

    if (slot === 'ring') {
        return { category: 'jewelry', uiCategory: 'rings', displayCategory: 'Anel' };
    }

    if (slot === 'necklace') {
        return { category: 'jewelry', uiCategory: 'necklaces', displayCategory: 'Colar' };
    }

    return {
        category: 'armor',
        uiCategory: String(slot || '').startsWith('shield') ? 'offhands' : 'armors',
        displayCategory: String(slot || '').startsWith('shield') ? 'Mão Secundária' : 'Armadura'
    };
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

    normalizeLegacyWeaponStyle(item);

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

    enforceCompatibleLoadout(player, 'weapon');

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

    enforceCompatibleLoadout(player, slot);
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
    getOffhandCompatibilityIssue,
    findInventoryItemByKey,
    removeInventoryItemByKey,
    ensureEquipmentState,
    ensureItemIdentity,
    ensureUniquePlayerItemKeys,
    normalizeLegacyWeaponStyle
};
