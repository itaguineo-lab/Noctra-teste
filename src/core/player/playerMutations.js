const { addXp } = require('./progression');
const { ensurePlayerState, recalculateStats, updateBuffs } = require('./playerService');

const {
    equipItem,
    unequipItem,
    sameItem,
    getItemKey,
    ensureItemIdentity,
    ensureUniquePlayerItemKeys
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
    shield: 'offhands',
    armor: 'armors',
    boots: 'boots',
    ring: 'rings',
    necklace: 'necklaces'
};

const OFFHAND_TYPE_LABELS = {
    shield: 'Escudo',
    quiver: 'Aljava',
    orb: 'Orbe'
};

const CLASS_LABELS = {
    guerreiro: 'Guerreiro',
    arqueiro: 'Arqueiro',
    mago: 'Mago'
};

function toSafeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeText(value = '') {
    return String(value || '').trim();
}

function normalizeClassName(value = '') {
    return normalizeText(value).toLowerCase();
}

function isPlaceholderName(value = '') {
    const name = normalizeText(value).toLowerCase();
    return !name || name === 'item sem nome';
}

function hasRealItemStats(item = {}) {
    return ['atk', 'def', 'hp', 'crit', 'power'].some(field => Number(item?.[field] || 0) > 0);
}

function getDefaultWeaponEmoji(name = '') {
    const lower = String(name).toLowerCase();

    if (lower.includes('machado')) return '🪓';
    if (lower.includes('arco') || lower.includes('aljava')) return '🏹';
    if (lower.includes('lança')) return '🔱';
    if (lower.includes('cajado') || lower.includes('varinha')) return '🪄';
    if (lower.includes('orbe')) return '🔮';
    if (lower.includes('grimório') || lower.includes('grimoire')) return '📘';
    if (lower.includes('adaga')) return '🗡️';

    return '🗡️';
}

function getDefaultEmojiForSlot(slot, name = '') {
    if (slot === 'weapon') return getDefaultWeaponEmoji(name);

    if (slot === 'shield') {
        const lower = String(name).toLowerCase();

        if (lower.includes('aljava')) return '🏹';
        if (lower.includes('orbe')) return '🔮';

        return '🛡️';
    }

    if (slot === 'armor') return '🥋';
    if (slot === 'boots') return '👢';
    if (slot === 'ring') return '💍';
    if (slot === 'necklace') return '📿';

    return '⚪';
}

function getFallbackNameForSlot(slot) {
    if (slot === 'weapon') return 'Arma desconhecida';
    if (slot === 'shield') return 'Item de mão secundária';
    if (slot === 'armor') return 'Armadura desconhecida';
    if (slot === 'boots') return 'Botas desconhecidas';
    if (slot === 'ring') return 'Anel desconhecido';
    if (slot === 'necklace') return 'Colar desconhecido';

    return 'Item desconhecido';
}

function inferSlotFromName(rawName = '') {
    const name = String(rawName).trim().toLowerCase();
    if (!name) return null;

    if (name.includes('escudo') || name.includes('aljava') || name.includes('orbe')) return 'shield';
    if (name.includes('bota') || name.includes('greva') || name.includes('sandália') || name.includes('sandalia')) return 'boots';
    if (name.includes('anel') || name.includes('aliança')) return 'ring';
    if (name.includes('amuleto') || name.includes('colar') || name.includes('pingente') || name.includes('gargantilha')) return 'necklace';

    if (
        name.includes('armadura') ||
        name.includes('gibão') ||
        name.includes('gibao') ||
        name.includes('couraça') ||
        name.includes('couraca') ||
        name.includes('túnica') ||
        name.includes('tunica') ||
        name.includes('manto') ||
        name.includes('veste') ||
        name.includes('peitoral') ||
        name.includes('traje')
    ) {
        return 'armor';
    }

    if (
        name.includes('espada') ||
        name.includes('machado') ||
        name.includes('arco') ||
        name.includes('lança') ||
        name.includes('lanca') ||
        name.includes('cajado') ||
        name.includes('varinha') ||
        name.includes('grimório') ||
        name.includes('grimorio') ||
        name.includes('grimoire')
    ) {
        return 'weapon';
    }

    return null;
}

function hasMeaningfulItemIdentity(item = {}) {
    if (!item || typeof item !== 'object') return false;

    const hasName = !isPlaceholderName(item.name);
    const hasStats = hasRealItemStats(item);

    const hasSlotHint = Boolean(normalizeText(item.slot));
    const hasCategoryHint = Boolean(normalizeText(item.category));
    const hasUiCategoryHint = Boolean(normalizeText(item.uiCategory));
    const hasEmoji = Boolean(normalizeText(item.emoji || item.icon));

    return hasName || (hasStats && (hasSlotHint || hasCategoryHint || hasUiCategoryHint || hasEmoji));
}

function normalizeAllowedClasses(values = []) {
    if (!Array.isArray(values)) return [];

    const normalized = values
        .map(value => normalizeClassName(value))
        .filter(Boolean);

    return [...new Set(normalized)];
}

function inferAllowedClasses(item = {}, slot, rawName = '') {
    const explicitAllowed = normalizeAllowedClasses(item.allowedClasses);
    if (explicitAllowed.length) return explicitAllowed;

    const explicitClass = normalizeClassName(item.classRestriction || item.class);
    if (explicitClass) return [explicitClass];

    const name = rawName.toLowerCase();

    if (slot === 'ring' || slot === 'necklace') {
        return [];
    }

    if (slot === 'shield') {
        if (name.includes('aljava')) return ['arqueiro'];
        if (name.includes('orbe')) return ['mago'];
        if (name.includes('escudo')) return ['guerreiro', 'arqueiro'];
    }

    if (slot === 'weapon') {
        if (name.includes('espada') || name.includes('machado')) return ['guerreiro'];
        if (name.includes('arco') || name.includes('lança') || name.includes('lanca')) return ['arqueiro'];
        if (
            name.includes('varinha') ||
            name.includes('cajado') ||
            name.includes('grimório') ||
            name.includes('grimorio') ||
            name.includes('grimoire')
        ) {
            return ['mago'];
        }
    }

    return [];
}

function normalizeWeaponStyle(value = '') {
    const style = normalizeText(value).toLowerCase();

    if (!style) return null;

    if (style === 'requires_offhand') {
        return 'one_handed';
    }

    if (style === 'one_handed') {
        return 'one_handed';
    }

    if (style === 'two_handed') {
        return 'two_handed';
    }

    return style;
}

function inferWeaponStyle(item = {}, slot, rawName = '') {
    const explicit = normalizeWeaponStyle(item.weaponStyle);
    if (explicit) return explicit;

    if (slot !== 'weapon') return null;

    const name = rawName.toLowerCase();

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

function inferRequiredOffhandType(item = {}, slot, rawName = '') {
    const explicit = normalizeText(item.requiredOffhandType).toLowerCase();
    if (explicit) return explicit;

    if (slot !== 'weapon') return null;

    const name = rawName.toLowerCase();

    if (name.includes('espada')) return 'shield';
    if (name.includes('lança') || name.includes('lanca')) return 'shield';
    if (name.includes('arco')) return 'quiver';
    if (name.includes('varinha')) return 'orb';
    if (name.includes('grimório') || name.includes('grimorio') || name.includes('grimoire')) return 'orb';

    return null;
}

function inferOffhandMode(item = {}, slot, weaponStyle, requiredOffhandType) {
    const explicit = normalizeText(item.offhandMode).toLowerCase();
    if (explicit) return explicit;

    if (slot === 'weapon' && weaponStyle === 'one_handed' && requiredOffhandType) {
        return 'optional';
    }

    return null;
}

function inferOffhandType(item = {}, slot, rawName = '') {
    const explicit = normalizeText(item.offhandType).toLowerCase();
    if (explicit) return explicit;

    if (slot !== 'shield') return null;

    const name = rawName.toLowerCase();

    if (name.includes('aljava')) return 'quiver';
    if (name.includes('orbe')) return 'orb';
    if (name.includes('escudo')) return 'shield';

    return null;
}

function getCanonicalSlot(item = {}, forcedSlot = null) {
    const forced = normalizeText(forcedSlot);

    if (forced && VALID_EQUIPMENT_SLOTS.includes(forced)) {
        return forced;
    }

    const rawSlot = normalizeText(item.slot);

    if (rawSlot) {
        for (const validSlot of VALID_EQUIPMENT_SLOTS) {
            if (rawSlot.startsWith(validSlot)) {
                return validSlot;
            }
        }
    }

    const rawCategory = normalizeText(item.category).toLowerCase();
    const rawUiCategory = normalizeText(item.uiCategory).toLowerCase();
    const rawDisplayCategory = normalizeText(item.displayCategory).toLowerCase();
    const rawName = normalizeText(item.name).toLowerCase();

    if (rawCategory === 'weapon') return 'weapon';
    if (rawCategory === 'jewelry') return inferSlotFromName(rawName) || 'ring';
    if (rawCategory === 'armor') return inferSlotFromName(rawName) || 'armor';

    if (rawUiCategory === 'weapons') return 'weapon';
    if (rawUiCategory === 'offhands') return 'shield';
    if (rawUiCategory === 'armors') return inferSlotFromName(rawName) || 'armor';
    if (rawUiCategory === 'boots') return 'boots';
    if (rawUiCategory === 'rings') return 'ring';
    if (rawUiCategory === 'necklaces') return 'necklace';
    if (rawUiCategory === 'jewels') return inferSlotFromName(rawName) || 'ring';

    if (rawDisplayCategory === 'arma') return 'weapon';
    if (rawDisplayCategory === 'joia') return inferSlotFromName(rawName) || 'ring';
    if (rawDisplayCategory === 'armadura') return inferSlotFromName(rawName) || 'armor';
    if (rawDisplayCategory === 'mão secundária') return 'shield';
    if (rawDisplayCategory === 'mao secundaria') return 'shield';
    if (rawDisplayCategory === 'botas') return 'boots';
    if (rawDisplayCategory === 'anel') return 'ring';
    if (rawDisplayCategory === 'colar') return 'necklace';
    if (rawDisplayCategory === 'amuleto') return 'necklace';

    return inferSlotFromName(rawName) || null;
}

function getUiCategoryFromSlot(slot) {
    return SLOT_TO_UI_CATEGORY[slot] || 'weapons';
}

function getDisplayCategoryFromSlot(slot) {
    if (slot === 'weapon') return 'Arma';
    if (slot === 'shield') return 'Mão Secundária';
    if (slot === 'ring') return 'Anel';
    if (slot === 'necklace') return 'Colar';
    if (slot === 'boots') return 'Botas';

    return 'Armadura';
}

function getOffhandTypeLabel(offhandType = '') {
    return OFFHAND_TYPE_LABELS[offhandType] || 'Mão Secundária';
}

function getClassLabel(className = '') {
    return CLASS_LABELS[className] || className;
}

function getAllowedClassesLabel(allowedClasses = []) {
    return allowedClasses.map(getClassLabel).join(', ');
}

function isItemAllowedForClass(item, className) {
    const allowed = normalizeAllowedClasses(item?.allowedClasses || []);
    if (!allowed.length) return true;

    return allowed.includes(normalizeClassName(className));
}

function validateWeaponOffhandPair(weapon, offhand) {
    if (!weapon) return null;

    const weaponStyle = normalizeWeaponStyle(weapon.weaponStyle);

    if (weaponStyle === 'two_handed') {
        if (offhand) {
            return `${weapon.name} é de duas mãos e exige a mão secundária livre.`;
        }

        return null;
    }

    return null;
}

function validateOffhandWithWeapon(offhand, weapon) {
    if (!offhand) return null;

    if (!offhand.offhandType) {
        return 'Item inválido para a mão secundária.';
    }

    if (!weapon) return null;

    return validateWeaponOffhandPair(weapon, offhand);
}

function normalizeInventoryItem(item, forcedSlot = null) {
    if (!item || typeof item !== 'object') return null;
    if (!hasMeaningfulItemIdentity(item)) return null;

    const slot = getCanonicalSlot(item, forcedSlot);
    if (!slot) return null;

    const rawName = normalizeText(item.name);
    const statsPresent = hasRealItemStats(item);

    let finalName = rawName;

    if (isPlaceholderName(rawName)) {
        if (!statsPresent) return null;
        finalName = getFallbackNameForSlot(slot);
    }

    const allowedClasses = inferAllowedClasses(item, slot, finalName);
    const weaponStyle = inferWeaponStyle(item, slot, finalName);
    const requiredOffhandType = inferRequiredOffhandType(item, slot, finalName);
    const offhandMode = inferOffhandMode(item, slot, weaponStyle, requiredOffhandType);
    const offhandType = inferOffhandType(item, slot, finalName);

    const normalized = {
        ...item,
        name: finalName,
        slot,
        category: normalizeText(item.category).toLowerCase() || (
            slot === 'weapon' ? 'weapon' :
            (slot === 'ring' || slot === 'necklace') ? 'jewelry' :
            'armor'
        ),
        uiCategory: getUiCategoryFromSlot(slot),
        displayCategory: getDisplayCategoryFromSlot(slot),
        emoji: normalizeText(item.emoji || item.icon) || getDefaultEmojiForSlot(slot, finalName),
        rarity: normalizeText(item.rarity) || 'Comum',
        level: Math.max(1, toSafeNumber(item.level, 1)),
        atk: Math.max(0, toSafeNumber(item.atk, 0)),
        def: Math.max(0, toSafeNumber(item.def, 0)),
        hp: Math.max(0, toSafeNumber(item.hp, 0)),
        crit: Math.max(0, toSafeNumber(item.crit, 0)),
        power: Math.max(0, toSafeNumber(item.power, 0)),
        powerTier: item.powerTier || null,
        sourceTier: item.sourceTier || null,
        allowedClasses,
        classRestriction: allowedClasses.length === 1 ? allowedClasses[0] : null,
        weaponStyle,
        offhandMode,
        requiredOffhandType,
        offhandType,
        __equipped: Boolean(item.__equipped)
    };

    ensureItemIdentity(normalized);

    if (normalized.weaponStyle === 'requires_offhand') {
        normalized.weaponStyle = 'one_handed';
        normalized.offhandMode = normalized.offhandMode || 'optional';
    }

    return normalized;
}

function normalizeInventoryCollection(items = []) {
    if (!Array.isArray(items)) return [];

    const normalized = items
        .map(item => normalizeInventoryItem(item))
        .filter(Boolean);

    const tempPlayer = {
        inventory: normalized,
        equipment: {
            weapon: null,
            shield: null,
            armor: null,
            necklace: null,
            ring: null,
            boots: null
        }
    };

    ensureUniquePlayerItemKeys(tempPlayer);
    return tempPlayer.inventory;
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

        const normalized = normalizeInventoryItem(player.equipment[slot], slot);
        player.equipment[slot] = normalized ? { ...normalized, __equipped: true } : null;
    }

    ensureUniquePlayerItemKeys(player);
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

function getEquipmentLoadoutIssues(player, targetClass = null) {
    ensurePlayer(player);

    const className = normalizeClassName(targetClass || player.class);
    const issues = [];

    const equipment = player.equipment || {};
    const weapon = equipment.weapon ? normalizeInventoryItem(equipment.weapon, 'weapon') : null;
    const offhand = equipment.shield ? normalizeInventoryItem(equipment.shield, 'shield') : null;

    for (const slot of VALID_EQUIPMENT_SLOTS) {
        const item = equipment[slot] ? normalizeInventoryItem(equipment[slot], slot) : null;
        if (!item) continue;

        if (!isItemAllowedForClass(item, className)) {
            issues.push(`${item.name} não pertence à classe ${getClassLabel(className)}.`);
        }
    }

    const pairIssue = validateWeaponOffhandPair(weapon, offhand) || validateOffhandWithWeapon(offhand, weapon);
    if (pairIssue) issues.push(pairIssue);

    return [...new Set(issues)];
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
    return restoreEnergyState(player);
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
    ensureItemIdentity(normalized);

    player.inventory.push(normalized);
    player.inventory = normalizeInventoryCollection(player.inventory);
    ensureUniquePlayerItemKeys(player);

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

    const normalizedItem = normalizeInventoryItem(item, slot);

    if (!normalizedItem) {
        return { success: false, message: 'Item inválido.' };
    }

    if (normalizedItem.slot !== slot) {
        return { success: false, message: 'Item incompatível com o slot.' };
    }

    if (!isItemAllowedForClass(normalizedItem, player.class)) {
        const allowedLabel = getAllowedClassesLabel(normalizedItem.allowedClasses);

        return {
            success: false,
            message: allowedLabel
                ? `Apenas ${allowedLabel} podem equipar ${normalizedItem.name}.`
                : 'Classe incompatível com o item.'
        };
    }

    const currentWeapon = player.equipment?.weapon
        ? normalizeInventoryItem(player.equipment.weapon, 'weapon')
        : null;

    const currentOffhand = player.equipment?.shield
        ? normalizeInventoryItem(player.equipment.shield, 'shield')
        : null;

    const simulatedWeapon = slot === 'weapon' ? normalizedItem : currentWeapon;
    const simulatedOffhand = slot === 'shield' ? normalizedItem : currentOffhand;

    const pairIssue =
        validateWeaponOffhandPair(simulatedWeapon, simulatedOffhand) ||
        validateOffhandWithWeapon(simulatedOffhand, simulatedWeapon);

    if (pairIssue) {
        return { success: false, message: pairIssue };
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

    return {
        success: true,
        remaining: consumables[key]
    };
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

        const normalized = normalizeInventoryItem(player.equipment[slot], slot);
        player.equipment[slot] = normalized ? { ...normalized, __equipped: true } : null;
    }

    ensureUniquePlayerItemKeys(player);

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
    getOffhandTypeLabel,
    getEquipmentLoadoutIssues,
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
