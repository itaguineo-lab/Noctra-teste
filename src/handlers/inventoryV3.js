const { Markup } = require('telegraf');

const inventoryV2 = require('./inventoryV2');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { ensureCosmeticsState } = require('../core/player/cosmetics');
const {
    normalizeInventoryCollection,
    normalizeInventoryItem,
    getOffhandTypeLabel,
    normalizePlayerForSave
} = require('../core/player/playerMutations');
const {
    sameItem,
    getItemKey,
    ensureUniquePlayerItemKeys
} = require('../core/player/equipmentService');
const {
    getRealSlot,
    normalizeCategoryKey,
    buildInventoryCategoryRows
} = require('../menus/inventoryMenu');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');
const {
    calcItemPower,
    buildEnhancedItemDetailText
} = require('../core/player/itemLorePresenter');
const {
    buildSoulsOverviewText,
    buildSoulDetailText
} = require('../renderers/soulRenderer');

const PAGE_SIZE = 5;
const SOUL_SLOT_COUNT = 2;

const EQUIPMENT_CATEGORY_CONFIG = {
    weapons: { slots: ['weapon'] },
    offhands: { slots: ['shield'] },
    armors: { slots: ['armor'] },
    boots: { slots: ['boots'] },
    rings: { slots: ['ring'] },
    necklaces: { slots: ['necklace'] }
};

const LEGACY_CATEGORY_ALIAS = {
    shields: 'offhands',
    jewels: 'rings',
    jewelry: 'rings',
    armor: 'armors',
    weapon: 'weapons',
    shield: 'offhands',
    ring: 'rings',
    necklace: 'necklaces'
};

function truncateText(text = '', max = 22) {
    const value = String(text || '');
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function getCategory(rawCategory = '') {
    const key = String(rawCategory || '').trim();
    return normalizeCategoryKey(LEGACY_CATEGORY_ALIAS[key] || key);
}

function getSlotLabel(slot, item = null) {
    if (slot === 'shield') {
        if (item?.offhandType) return getOffhandTypeLabel(item.offhandType);
        return 'Mão Secundária';
    }

    const labels = {
        weapon: 'Arma',
        armor: 'Armadura',
        necklace: 'Colar',
        ring: 'Anel',
        boots: 'Bota'
    };

    return labels[slot] || slot || 'Item';
}

function getSlotIcon(slot, item = null) {
    if (slot === 'shield') {
        if (item?.offhandType === 'quiver') return '🏹';
        if (item?.offhandType === 'orb') return '🔮';
        return '🛡️';
    }

    const icons = {
        weapon: '⚔️',
        armor: '🛡️',
        necklace: '📿',
        ring: '💍',
        boots: '👢'
    };

    return icons[slot] || '📦';
}

function getBuildRuleText(item = {}) {
    const slot = getRealSlot(item);

    if (slot === 'weapon') {
        if (item.weaponStyle === 'two_handed') return 'Usa duas mãos. Remove qualquer mão secundária.';
        if (item.requiredOffhandType) return `Combina com ${getOffhandTypeLabel(item.requiredOffhandType)}.`;
        return 'Pode ser usada sem mão secundária.';
    }

    if (slot === 'shield') {
        if (item.offhandType === 'quiver') return 'Mão secundária para Arcos.';
        if (item.offhandType === 'orb') return 'Mão secundária para Varinhas/Grimórios.';
        if (item.offhandType === 'shield') return 'Mão secundária para Espadas e Lanças.';
        return 'Mão secundária.';
    }

    return 'Item de equipamento.';
}

function getComparisonData(item, player, slot) {
    const equipped = player?.equipment?.[slot];

    if (!equipped) {
        return {
            status: 'Slot vazio',
            detail: 'Nenhum item equipado neste slot.'
        };
    }

    if (sameItem(equipped, item)) {
        return {
            status: 'Equipado agora',
            detail: 'Este item já está equipado.'
        };
    }

    const delta = calcItemPower(item) - calcItemPower(equipped);
    const equippedName = equipped.name || 'item equipado';

    if (delta > 0) {
        return {
            status: `📈 +${delta} poder`,
            detail: `Melhor que ${equippedName}.`
        };
    }

    if (delta < 0) {
        return {
            status: `📉 -${Math.abs(delta)} poder`,
            detail: `Pior que ${equippedName}.`
        };
    }

    return {
        status: '➖ mesmo poder',
        detail: `Equivalente a ${equippedName}.`
    };
}

function normalizePlayerState(player) {
    if (!player) return null;

    if (!player.equipment || typeof player.equipment !== 'object') {
        player.equipment = {};
    }

    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];
    if (!player.consumables) player.consumables = {};

    while (player.soulsEquipped.length < SOUL_SLOT_COUNT) {
        player.soulsEquipped.push(null);
    }

    player.soulsEquipped = player.soulsEquipped.slice(0, SOUL_SLOT_COUNT);
    player.inventory = normalizeInventoryCollection(player.inventory);

    for (const slot of ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots']) {
        if (!(slot in player.equipment) || !player.equipment[slot]) {
            player.equipment[slot] = null;
            continue;
        }

        const normalized = normalizeInventoryItem(player.equipment[slot], slot);
        player.equipment[slot] = normalized ? { ...normalized, __equipped: true } : null;
    }

    ensureUniquePlayerItemKeys(player);
    ensureCosmeticsState(player);

    return player;
}

async function loadPlayer(ctx) {
    const player = await getPlayer(ctx.from.id);
    return normalizePlayerState(player);
}

function getCategoryItems(player = {}, rawCategory = 'weapons') {
    const category = getCategory(rawCategory);
    const config = EQUIPMENT_CATEGORY_CONFIG[category];

    if (!config) return [];

    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const equipment = player.equipment || {};

    const equippedItems = [];
    const equippedKeys = new Set();

    for (const slot of config.slots) {
        const equipped = equipment[slot];
        if (!equipped) continue;

        const normalizedBase = normalizeInventoryItem(equipped, slot);
        if (!normalizedBase) continue;

        const normalized = { ...normalizedBase, __equipped: true };
        equippedItems.push(normalized);
        equippedKeys.add(getItemKey(normalized));
    }

    const inventoryItems = inventory
        .map(item => normalizeInventoryItem(item))
        .filter(Boolean)
        .map(item => ({ ...item, __equipped: false }))
        .filter(item => config.slots.includes(getRealSlot(item)))
        .filter(item => !equippedKeys.has(getItemKey(item)))
        .sort((a, b) => {
            const powerDiff = calcItemPower(b) - calcItemPower(a);
            if (powerDiff !== 0) return powerDiff;

            const levelDiff = safeNumber(b.level) - safeNumber(a.level);
            if (levelDiff !== 0) return levelDiff;

            return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
        });

    return [...equippedItems, ...inventoryItems];
}

function getPageItems(items, page) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;

    return {
        totalPages,
        page: safePage,
        items: items.slice(start, start + PAGE_SIZE)
    };
}

function getSoulKey(soul = {}) {
    return String(soul.instanceId || soul.id || '').trim();
}

function encodeSoulKey(soul = {}) {
    return encodeURIComponent(getSoulKey(soul));
}

function encodeSoulKeyValue(value = '') {
    return encodeURIComponent(String(value || '').trim());
}

function decodeSoulKey(value = '') {
    try {
        return decodeURIComponent(String(value || ''));
    } catch {
        return String(value || '');
    }
}

function sameSoulKey(soul = {}, key = '') {
    const safeKey = String(key || '').trim();
    if (!safeKey) return false;
    return String(soul.instanceId || '') === safeKey || String(soul.id || '') === safeKey;
}

function findSoulByKey(player = {}, rawKey = '') {
    const key = decodeSoulKey(rawKey);
    const souls = Array.isArray(player.soulsInventory) ? player.soulsInventory : [];
    const equipped = Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [];

    return souls.find(soul => sameSoulKey(soul, key)) || equipped.find(soul => soul && sameSoulKey(soul, key)) || null;
}

function getEquippedSoulSlot(player = {}, rawKey = '') {
    const key = decodeSoulKey(rawKey);
    const equipped = Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [];
    return equipped.findIndex(soul => soul && sameSoulKey(soul, key));
}

function ensureSoulArrays(player = {}) {
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];

    while (player.soulsEquipped.length < SOUL_SLOT_COUNT) {
        player.soulsEquipped.push(null);
    }

    player.soulsEquipped = player.soulsEquipped.slice(0, SOUL_SLOT_COUNT);
    return player;
}

function applySoulEquipToSlot(player = {}, rawKey = '', targetSlot = 0) {
    ensureSoulArrays(player);

    const key = decodeSoulKey(rawKey);
    const slot = Number(targetSlot);

    if (!key) {
        return { success: false, message: 'Alma inválida.' };
    }

    if (!Number.isInteger(slot) || slot < 0 || slot >= SOUL_SLOT_COUNT) {
        return { success: false, message: 'Slot de alma inválido.' };
    }

    const alreadyEquippedSlot = getEquippedSoulSlot(player, key);

    if (alreadyEquippedSlot === slot) {
        return {
            success: true,
            message: `Esta alma já está equipada no Slot ${slot + 1}.`,
            slot,
            soul: player.soulsEquipped[slot],
            replaced: null,
            unchanged: true
        };
    }

    if (alreadyEquippedSlot >= 0) {
        return {
            success: false,
            message: `Esta alma já está equipada no Slot ${alreadyEquippedSlot + 1}. Desequipe antes de mover.`
        };
    }

    const inventoryIndex = player.soulsInventory.findIndex(soul => sameSoulKey(soul, key));

    if (inventoryIndex === -1) {
        return { success: false, message: 'Alma não encontrada no inventário.' };
    }

    const [soul] = player.soulsInventory.splice(inventoryIndex, 1);
    const replaced = player.soulsEquipped[slot] || null;

    if (replaced) {
        const replacedKey = getSoulKey(replaced);
        const alreadyStored = player.soulsInventory.some(existing => sameSoulKey(existing, replacedKey));
        if (!alreadyStored) player.soulsInventory.push(replaced);
    }

    player.soulsEquipped[slot] = soul;
    normalizePlayerForSave(player);

    return {
        success: true,
        message: replaced
            ? `${soul.name} equipada no Slot ${slot + 1}. ${replaced.name} voltou para a coleção.`
            : `${soul.name} equipada no Slot ${slot + 1}.`,
        slot,
        soul,
        replaced
    };
}

function getSoulSlotButtonLabel(player = {}, slotIndex = 0) {
    const equipped = Array.isArray(player.soulsEquipped) ? player.soulsEquipped[slotIndex] : null;
    if (!equipped) return `💀 Equipar no Slot ${slotIndex + 1}`;
    return `🔁 Substituir Slot ${slotIndex + 1}: ${truncateText(equipped.name, 16)}`;
}

function buildSoulSlotRows(player = {}, soul = {}) {
    const key = getSoulKey(soul);
    if (!key) return [];

    const encoded = encodeSoulKeyValue(key);

    return [0, 1].map(slot => ([
        Markup.button.callback(
            getSoulSlotButtonLabel(player, slot),
            `equip_soul_slot:${encoded}:${slot}`
        )
    ]));
}

function buildSoulsKeyboard(player) {
    const rows = [...buildInventoryCategoryRows(player, 'souls', false)];
    const souls = Array.isArray(player?.soulsInventory) ? player.soulsInventory : [];
    const equipped = Array.isArray(player?.soulsEquipped) ? player.soulsEquipped : [null, null];

    souls.forEach(soul => {
        const key = getSoulKey(soul);
        if (!key) return;

        rows.push([
            Markup.button.callback(
                `🔎 Ver ${truncateText(soul.name, 18)}`,
                `invcat:soul:${encodeSoulKey(soul)}`
            ),
            Markup.button.callback(
                `💀 Auto`,
                `equip_soul_${key}`
            )
        ]);
    });

    equipped.forEach((soul, idx) => {
        if (!soul) return;
        rows.push([
            Markup.button.callback(
                `⭐ Desequipar Alma ${idx + 1}`,
                `unequip_soul_${idx}`
            )
        ]);
    });

    rows.push([
        Markup.button.callback('◀️ Inventário', 'inventory'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

function buildSoulDetailKeyboard(player = {}, soul = {}) {
    const key = getSoulKey(soul);
    const equippedSlot = getEquippedSoulSlot(player, key);
    const rows = [];

    if (equippedSlot >= 0) {
        rows.push([
            Markup.button.callback(
                `⭐ Desequipar do Slot ${equippedSlot + 1}`,
                `unequip_soul_${equippedSlot}`
            )
        ]);
    } else if (key) {
        rows.push(...buildSoulSlotRows(player, soul));
    }

    rows.push([
        Markup.button.callback('◀️ Almas', 'invcat:souls'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function renderSoulsOverview(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    return navigateText(ctx, buildSoulsOverviewText(player), buildSoulsKeyboard(player));
}

async function renderSoulDetail(ctx, rawKey) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    const soul = findSoulByKey(player, rawKey);

    if (!soul) {
        await safeAnswer(ctx, '⚠️ Alma não encontrada. A lista foi atualizada.', { show_alert: true });
        return renderSoulsOverview(ctx);
    }

    const slot = getEquippedSoulSlot(player, getSoulKey(soul));
    const text = buildSoulDetailText(soul, { slot: slot >= 0 ? slot : null });

    return navigateText(ctx, text, buildSoulDetailKeyboard(player, soul));
}

async function handleEquipSoulSlot(ctx) {
    const rawKey = ctx.match?.[1];
    const slot = Number(ctx.match?.[2]);

    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    const result = applySoulEquipToSlot(player, rawKey, slot);

    if (!result.success) {
        return safeAnswer(ctx, result.message || 'Não foi possível equipar a alma.', { show_alert: true });
    }

    await savePlayer(ctx.from.id, player);
    await safeAnswer(ctx, `✅ ${result.message}`, { show_alert: true });

    const key = getSoulKey(result.soul);
    return renderSoulDetail(ctx, encodeSoulKeyValue(key));
}

async function renderEnhancedItemDetail(ctx, rawCategory, page, pageIndex) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    const category = getCategory(rawCategory);
    const pageData = getPageItems(getCategoryItems(player, category), Number(page));
    const item = pageData.items[Number(pageIndex)];

    if (!item) {
        await safeAnswer(ctx, '⚠️ Item não encontrado. A lista foi atualizada.', { show_alert: true });
        return inventoryV2.handleInventoryPage({
            ...ctx,
            match: [null, category, String(page)]
        });
    }

    const slot = getRealSlot(item);
    const equippedItem = player?.equipment?.[slot] || null;
    const comparison = getComparisonData(item, player, slot);

    const rows = [];

    if (item.__equipped) {
        rows.push([
            Markup.button.callback(
                `⭐ Desequipar ${truncateText(item.name)}`,
                `uneq:${slot}:${category}:${pageData.page}`
            )
        ]);
    } else {
        rows.push([
            Markup.button.callback(
                `✅ Equipar ${truncateText(item.name)}`,
                `eqp:${category}:${pageData.page}:${pageIndex}`
            )
        ]);
    }

    rows.push([
        Markup.button.callback('↩️ Voltar', `invpage:${category}:${pageData.page}`),
        Markup.button.callback('💰 Vender', 'shop_sell')
    ]);

    rows.push([Markup.button.callback('🏠 Menu', 'menu')]);

    const text = buildEnhancedItemDetailText({
        item,
        slotLabel: getSlotLabel(slot, item),
        slotIcon: getSlotIcon(slot, item),
        buildRuleText: getBuildRuleText(item),
        comparisonStatus: comparison.status,
        comparisonDetail: comparison.detail,
        equippedItem,
        isEquipped: Boolean(item.__equipped)
    });

    return navigateText(ctx, text, Markup.inlineKeyboard(rows));
}

async function handleInventoryCategory(ctx) {
    const raw = ctx.match?.[1] || 'equipment';

    const soulDetail = raw.match(/^soul:(.+)$/);
    if (soulDetail) {
        await safeAnswer(ctx).catch(() => {});
        return renderSoulDetail(ctx, soulDetail[1]);
    }

    const category = getCategory(raw);

    if (category === 'souls') {
        await safeAnswer(ctx).catch(() => {});
        return renderSoulsOverview(ctx);
    }

    const itemDetail = raw.match(/^item:(.+):(\d+):(\d+)$/);

    if (!itemDetail) {
        return inventoryV2.handleInventoryCategory(ctx);
    }

    await safeAnswer(ctx).catch(() => {});

    const [, detailCategory, pageStr, pageIndexStr] = itemDetail;
    return renderEnhancedItemDetail(ctx, detailCategory, Number(pageStr), Number(pageIndexStr));
}

module.exports = {
    ...inventoryV2,
    handleInventoryCategory,
    handleEquipSoulSlot,
    __private: {
        ...(inventoryV2.__private || {}),
        buildSoulsKeyboard,
        buildSoulDetailKeyboard,
        buildSoulSlotRows,
        getSoulSlotButtonLabel,
        renderSoulsOverview,
        renderSoulDetail,
        handleEquipSoulSlot,
        normalizePlayerState,
        getCategory,
        getSoulKey,
        encodeSoulKey,
        encodeSoulKeyValue,
        decodeSoulKey,
        sameSoulKey,
        findSoulByKey,
        getEquippedSoulSlot,
        ensureSoulArrays,
        applySoulEquipToSlot
    }
};
