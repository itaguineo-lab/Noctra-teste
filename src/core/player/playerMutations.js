const { addXp } = require('./progression');
const { ensurePlayerState, recalculateStats, updateBuffs } = require('./playerService');
const {
    equipItem,
    unequipItem,
    sameItem,
    getItemKey
} = require('./equipmentService');
const {
    ensureEnergyFields,
    consumeEnergy: consumeEnergyState,
    restoreEnergy: restoreEnergyState,
    restoreFullEnergy: restoreFullEnergyState,
    syncEnergyCapacity
} = require('../../services/energyService');

const VALID_EQUIPMENT_SLOTS = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];
const SLOT_TO_UI_CATEGORY = {
    weapon: 'weapons',
    shield: 'armors',
    armor: 'armors',
    boots: 'armors',
    ring: 'jewels',
    necklace: 'jewels'
};

function toSafeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function buildSyntheticItemId() {
    return `itm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getDefaultWeaponEmoji(name = '') {
    const lower = String(name).toLowerCase();
    if (lower.includes('machado')) return '🪓';
    if (lower.includes('arco') || lower.includes('besta')) return '🏹';
    if (lower.includes('lança')) return '🔱';
    if (lower.includes('cajado') || lower.includes('varinha')) return '🪄';
    if (lower.includes('grimório') || lower.includes('grimoire')) return '📘';
    if (lower.includes('orbe')) return '🔮';
    if (lower.includes('adaga')) return '🗡️';
    return '🗡️';
}

function getDefaultEmojiForSlot(slot, name = '') {
    if (slot === 'weapon') return getDefaultWeaponEmoji(name);
    if (slot === 'shield') return '🛡️';
    if (slot === 'armor') return '🥋';
    if (slot === 'boots') return '👢';
    if (slot === 'ring') return '💍';
    if (slot === 'necklace') return '📿';
    return '⚪';
}

function inferSlotFromName(rawName = '') {
    const name = String(rawName).trim().toLowerCase();
    if (!name) return null;

    if (name.includes('escudo') || name.includes('broquel') || name.includes('algibeira')) return 'shield';
    if (name.includes('bota') || name.includes('greva') || name.includes('sandália')) return 'boots';
    if (name.includes('anel') || name.includes('aliança')) return 'ring';
    if (name.includes('amuleto') || name.includes('colar') || name.includes('pingente') || name.includes('gargantilha')) return 'necklace';
    if (
        name.includes('armadura') ||
        name.includes('gibão') ||
        name.includes('couraça') ||
        name.includes('túnica') ||
        name.includes('tunica') ||
        name.includes('manto') ||
        name.includes('veste') ||
        name.includes('peitoral') ||
        name.includes('robe')
    ) return 'armor';
    if (
        name.includes('espada') ||
        name.includes('machado') ||
        name.includes('arco') ||
        name.includes('besta') ||
        name.includes('lança') ||
        name.includes('cajado') ||
        name.includes('grimório') ||
        name.includes('orbe') ||
        name.includes('varinha') ||
        name.includes('adaga') ||
        name.includes('foice')
    ) return 'weapon';

    return null;
}

function hasMeaningfulItemIdentity(item = {}) {
    if (!item || typeof item !== 'object') return false;

    const hasName = Boolean(String(item.name || '').trim());
    const hasSlot = Boolean(String(item.slot || '').trim());
    const hasCategory = Boolean(String(item.category || '').trim());
    const hasUiCategory = Boolean(String(item.uiCategory || '').trim());
    const hasEmoji = Boolean(String(item.emoji || item.icon || '').trim());
    const hasStats = [item.atk, item.def, item.hp, item.crit, item.power].some(value => Number(value || 0) > 0);

    return hasName || hasSlot || hasCategory || hasUiCategory || hasEmoji || hasStats;
}

function getCanonicalSlot(item = {}) {
    const rawSlot = String(item.slot || '').trim();
    if (rawSlot) {
        for (const validSlot of VALID_EQUIPMENT_SLOTS) {
            if (rawSlot.startsWith(validSlot)) {
                return validSlot;
            }
        }
    }

    const rawCategory = String(item.category || '').trim().toLowerCase();
    const rawUiCategory = String(item.uiCategory || '').trim().toLowerCase();
    const rawName = String(item.name || '').trim().toLowerCase();

    if (rawCategory === 'weapon') return 'weapon';
    if (rawCategory === 'jewelry') {
        return inferSlotFromName(rawName) || 'ring';
    }
    if (rawCategory === 'armor') {
        return inferSlotFromName(rawName) || 'armor';
    }

    if (rawUiCategory === 'weapons') return 'weapon';
    if (rawUiCategory === 'armors') return inferSlotFromName(rawName) || 'armor';
    if (rawUiCategory === 'jewels') return inferSlotFromName(rawName) || 'ring';

    return inferSlotFromName(rawName) || 'weapon';
}

function getUiCategoryFromSlot(slot) {
    return SLOT_TO_UI_CATEGORY[slot] || 'weapons';
}

function getDisplayCategoryFromSlot(slot) {
    if (slot === 'weapon') return 'Arma';
    if (slot === 'ring' || slot === 'necklace') return 'Joia';
    return 'Armadura';
}

function normalizeInventoryItem(item) {
    if (!item || typeof item !== 'object') return null;
    if (!hasMeaningfulItemIdentity(item)) return null;

    const slot = getCanonicalSlot(item);
    const existingInstanceId = String(item.instanceId || '').trim();
    const instanceId = existingInstanceId || buildSyntheticItemId();
    const id = String(item.id || instanceId);
    const name = String(item.name || 'Item sem nome');

    return {
        ...item,
        id,
        instanceId,
        name,
        slot,
        category: String(item.category || '').trim().toLowerCase() || (
            slot === 'weapon' ? 'weapon' :
            (slot === 'ring' || slot === 'necklace') ? 'jewelry' :
            'armor'
        ),
        uiCategory: String(item.uiCategory || getUiCategoryFromSlot(slot)),
        displayCategory: String(item.displayCategory || getDisplayCategoryFromSlot(slot)),
        emoji: String(item.emoji || item.icon || getDefaultEmojiForSlot(slot, name)),
        rarity: String(item.rarity || 'Comum'),
        level: Math.max(1, toSafeNumber(item.level, 1)),
        atk: Math.max(0, toSafeNumber(item.atk, 0)),
        def: Math.max(0, toSafeNumber(item.def, 0)),
        hp: Math.max(0, toSafeNumber(item.hp, 0)),
        crit: Math.max(0, toSafeNumber(item.crit, 0)),
        power: Math.max(0, toSafeNumber(item.power, 0)),
        powerTier: item.powerTier || null,
        sourceTier: item.sourceTier || null,
        classRestriction: item.classRestriction || item.class || null,
        __equipped: Boolean(item.__equipped)
    };
}

function normalizeInventoryCollection(items = []) {
    if (!Array.isArray(items)) return [];

    const seen = new Set();
    const normalized = [];

    for (const item of items) {
        const fixed = normalizeInventoryItem(item);
        if (!fixed) continue;
        const key = getItemKey(fixed);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        normalized.push(fixed);
    }

    return normalized;
}

function ensureConsumables(player) {
    player.consumables ??= {
        potionHp: 0,
        potionEnergy: 0,
        tonicStrength: 0,
        tonicDefense: 0
    };
    return player.consumables;
}

function ensureSouls(player) {
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];
}

function ensureInventory(player) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!player.equipment || typeof player.equipment !== 'object') {
        player.equipment = {};
    }

    player.inventory = normalizeInventoryCollection(player.inventory);

    for (const slot of VALID_EQUIPMENT_SLOTS) {
        if (!(slot in player.equipment) || !player.equipment[slot]) {
            player.equipment[slot] = null;
            continue;
        }

        const normalized = normalizeInventoryItem(player.equipment[slot]);
        player.equipment[slot] = normalized ? { ...normalized, __equipped: true } : null;
    }
}

function ensurePlayer(player) {
    ensurePlayerState(player);
    ensureInventory(player);
    ensureSouls(player);
    ensureConsumables(player);
    ensureEnergyFields(player);
    syncEnergyCapacity(player);
    return player;
}

function cleanupExpiredBuffs(player) {
    ensurePlayer(player);
    updateBuffs(player);
    return player;
}

function applyDamage(player, amount) {
    ensurePlayer(player);

    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    if (value <= 0) return player;

    player.hp = clamp((player.hp || 0) - value, 1, player.maxHp || 1);
    return player;
}

function applyHeal(player, amount) {
    ensurePlayer(player);

    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    if (value <= 0) return player;

    player.hp = clamp((player.hp || 0) + value, 1, player.maxHp || 1);
    return player;
}

function restoreFullHp(player) {
    ensurePlayer(player);
    player.hp = Math.max(1, player.maxHp || 1);
    return player;
}

function consumeEnergy(player, amount = 1) {
    ensurePlayer(player);
    return consumeEnergyState(player, amount);
}

function restoreEnergy(player, amount = 1) {
    ensurePlayer(player);
    return restoreEnergyState(player, amount);
}

function restoreFullEnergy(player) {
    ensurePlayer(player);
    return restoreFullEnergyState(player);
}

function addInventoryItem(player, item) {
    ensurePlayer(player);

    const normalized = normalizeInventoryItem(item);
    if (!normalized) {
        return { success: false, message: 'Item inválido.' };
    }

    const maxInventory = toSafeNumber(player.maxInventory, 20);
    if ((player.inventory || []).length >= maxInventory) {
        return { success: false, message: 'Inventário cheio.' };
    }

    normalized.__equipped = false;
    player.inventory.push(normalized);
    player.inventory = normalizeInventoryCollection(player.inventory);

    return { success: true, item: normalized };
}

function removeInventoryItem(player, itemOrIndex) {
    ensurePlayer(player);

    if (typeof itemOrIndex === 'number') {
        if (itemOrIndex < 0 || itemOrIndex >= player.inventory.length) {
            return { success: false, message: 'Índice inválido.' };
        }

        const [removed] = player.inventory.splice(itemOrIndex, 1);
        return { success: true, item: removed || null };
    }

    const index = player.inventory.findIndex(invItem => sameItem(invItem, itemOrIndex));
    if (index === -1) {
        return { success: false, message: 'Item não encontrado.' };
    }

    const [removed] = player.inventory.splice(index, 1);
    return { success: true, item: removed || null };
}

function applyEquipmentChange(player, slot, item) {
    ensurePlayer(player);

    if (!VALID_EQUIPMENT_SLOTS.includes(slot)) {
        return { success: false, message: 'Slot inválido.' };
    }

    const normalizedItem = normalizeInventoryItem(item);
    if (!normalizedItem) {
        return { success: false, message: 'Item inválido.' };
    }

    const itemSlot = String(normalizedItem.slot || '');
    if (!itemSlot.startsWith(slot)) {
        return { success: false, message: 'Item incompatível com o slot.' };
    }

    if (normalizedItem.classRestriction && normalizedItem.classRestriction !== player.class) {
        return { success: false, message: 'Classe incompatível com o item.' };
    }

    equipItem(player, slot, normalizedItem);
    normalizePlayerForSave(player);

    return {
        success: true,
        equipped: player.equipment[slot]
    };
}

function removeEquipment(player, slot) {
    ensurePlayer(player);

    if (!VALID_EQUIPMENT_SLOTS.includes(slot)) {
        return { success: false, message: 'Slot inválido.' };
    }

    const current = player.equipment?.[slot];
    if (!current) {
        return { success: false, message: 'Nada equipado neste slot.' };
    }

    const maxInventory = toSafeNumber(player.maxInventory, 20);
    if ((player.inventory || []).length >= maxInventory) {
        return { success: false, message: 'Inventário cheio.' };
    }

    const removed = unequipItem(player, slot);
    normalizePlayerForSave(player);

    return {
        success: true,
        item: removed
    };
}

function applySoulEquip(player, soul) {
    ensurePlayer(player);

    if (!soul || typeof soul !== 'object') {
        return { success: false, message: 'Alma inválida.' };
    }

    const soulId = String(soul.instanceId || soul.id || '');
    if (!soulId) {
        return { success: false, message: 'Alma inválida.' };
    }

    const soulIndex = player.soulsInventory.findIndex(
        s => String(s.instanceId || s.id) === soulId
    );

    if (soulIndex === -1) {
        return { success: false, message: 'Alma não encontrada no inventário.' };
    }

    if (player.soulsEquipped.some(s => s && String(s.instanceId || s.id) === soulId)) {
        return { success: false, message: 'Alma já equipada.' };
    }

    const emptySlot = player.soulsEquipped.findIndex(s => !s);
    if (emptySlot === -1) {
        return { success: false, message: 'Slots de almas cheios.' };
    }

    const [equippedSoul] = player.soulsInventory.splice(soulIndex, 1);
    player.soulsEquipped[emptySlot] = equippedSoul;

    normalizePlayerForSave(player);

    return {
        success: true,
        slot: emptySlot,
        soul: equippedSoul
    };
}

function applySoulUnequip(player, slot) {
    ensurePlayer(player);

    const slotIndex = toSafeNumber(slot, -1);
    if (slotIndex < 0 || slotIndex >= player.soulsEquipped.length) {
        return { success: false, message: 'Slot de alma inválido.' };
    }

    const soul = player.soulsEquipped[slotIndex];
    if (!soul) {
        return { success: false, message: 'Nada equipado neste slot.' };
    }

    const alreadyInInventory = player.soulsInventory.some(
        s => String(s.instanceId || s.id) === String(soul.instanceId || soul.id)
    );

    if (!alreadyInInventory) {
        player.soulsInventory.push(soul);
    }

    player.soulsEquipped[slotIndex] = null;

    normalizePlayerForSave(player);

    return {
        success: true,
        soul
    };
}

function addGold(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.gold = Math.max(0, (player.gold || 0) + value);
    return player;
}

function removeGold(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.gold = Math.max(0, (player.gold || 0) - value);
    return player;
}

function addNox(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.nox = Math.max(0, (player.nox || 0) + value);
    return player;
}

function removeNox(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.nox = Math.max(0, (player.nox || 0) - value);
    return player;
}

function addKeys(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.keys = Math.max(0, (player.keys || 0) + value);
    return player;
}

function removeKeys(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.keys = Math.max(0, (player.keys || 0) - value);
    return player;
}

function addGlorias(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.glorias = Math.max(0, (player.glorias || 0) + value);
    return player;
}

function removeGlorias(player, amount) {
    ensurePlayer(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 0)));
    player.glorias = Math.max(0, (player.glorias || 0) - value);
    return player;
}

function applyGoldReward(player, amount) {
    return addGold(player, amount);
}

function applyNoxReward(player, amount) {
    return addNox(player, amount);
}

function applyKeyReward(player, amount) {
    return addKeys(player, amount);
}

function applyGloriaReward(player, amount) {
    return addGlorias(player, amount);
}

function applyXpReward(player, amount) {
    ensurePlayer(player);
    addXp(player, amount);
    normalizePlayerForSave(player);
    return player;
}

function applyBuff(player, buff) {
    ensurePlayer(player);

    if (!buff || typeof buff !== 'object') {
        return { success: false, message: 'Buff inválido.' };
    }

    player.buffs.push({
        type: buff.type || 'generic',
        atk: toSafeNumber(buff.atk, 0),
        def: toSafeNumber(buff.def, 0),
        hp: toSafeNumber(buff.hp, 0),
        crit: toSafeNumber(buff.crit, 0),
        expiresAt: buff.expiresAt || null
    });

    normalizePlayerForSave(player);

    return { success: true };
}

function consumeConsumable(player, key, amount = 1) {
    ensurePlayer(player);

    const consumables = ensureConsumables(player);
    const value = Math.max(0, Math.floor(toSafeNumber(amount, 1)));

    if (!consumables[key] || consumables[key] < value) {
        return { success: false, message: 'Consumível indisponível.' };
    }

    consumables[key] -= value;
    player.consumables = consumables;

    return { success: true, remaining: consumables[key] };
}

function normalizePlayerForSave(player) {
    ensurePlayer(player);
    cleanupExpiredBuffs(player);
    syncEnergyCapacity(player);
    recalculateStats(player);

    player.inventory = normalizeInventoryCollection(player.inventory);

    for (const slot of VALID_EQUIPMENT_SLOTS) {
        if (!player.equipment?.[slot]) {
            player.equipment[slot] = null;
            continue;
        }

        const normalized = normalizeInventoryItem(player.equipment[slot]);
        player.equipment[slot] = normalized ? { ...normalized, __equipped: true } : null;
    }

    player.hp = clamp(toSafeNumber(player.hp, player.maxHp || 1), 1, player.maxHp || 1);
    player.energy = clamp(toSafeNumber(player.energy, player.maxEnergy || 0), 0, player.maxEnergy || 0);
    player.gold = Math.max(0, toSafeNumber(player.gold, 0));
    player.nox = Math.max(0, toSafeNumber(player.nox, 0));
    player.glorias = Math.max(0, toSafeNumber(player.glorias, 0));
    player.keys = Math.max(0, toSafeNumber(player.keys, 0));

    if (!Array.isArray(player.soulsEquipped)) {
        player.soulsEquipped = [null, null];
    } else if (player.soulsEquipped.length < 2) {
        while (player.soulsEquipped.length < 2) {
            player.soulsEquipped.push(null);
        }
    } else if (player.soulsEquipped.length > 2) {
        player.soulsEquipped = player.soulsEquipped.slice(0, 2);
    }

    return player;
}

module.exports = {
    VALID_EQUIPMENT_SLOTS,
    SLOT_TO_UI_CATEGORY,
    getCanonicalSlot,
    getUiCategoryFromSlot,
    normalizeInventoryItem,
    normalizeInventoryCollection,

    applyDamage,
    applyHeal,
    restoreFullHp,
    consumeEnergy,
    restoreEnergy,
    restoreFullEnergy,

    addInventoryItem,
    removeInventoryItem,

    applyEquipmentChange,
    removeEquipment,

    applySoulEquip,
    applySoulUnequip,

    addGold,
    removeGold,
    addNox,
    removeNox,
    addKeys,
    removeKeys,
    addGlorias,
    removeGlorias,

    applyGoldReward,
    applyNoxReward,
    applyKeyReward,
    applyGloriaReward,
    applyXpReward,

    applyBuff,
    consumeConsumable,
    cleanupExpiredBuffs,

    normalizePlayerForSave,

    sameItem,
    getItemKey
};