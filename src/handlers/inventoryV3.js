const { Markup } = require('telegraf');

const inventoryV2 = require('./inventoryV2');
const { getPlayer } = require('../core/player/playerService');
const { ensureCosmeticsState } = require('../core/player/cosmetics');
const {
    normalizeInventoryCollection,
    normalizeInventoryItem,
    getOffhandTypeLabel
} = require('../core/player/playerMutations');
const {
    sameItem,
    getItemKey,
    ensureUniquePlayerItemKeys
} = require('../core/player/equipmentService');
const {
    getRealSlot,
    normalizeCategoryKey
} = require('../menus/inventoryMenu');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');
const {
    calcItemPower,
    buildEnhancedItemDetailText
} = require('../core/player/itemLorePresenter');

const PAGE_SIZE = 5;

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
        isEquipped: Boolean(item.__equipped)
    });

    return navigateText(ctx, text, Markup.inlineKeyboard(rows));
}

async function handleInventoryCategory(ctx) {
    const raw = ctx.match?.[1] || 'equipment';
    const itemDetail = raw.match(/^item:(.+):(\d+):(\d+)$/);

    if (!itemDetail) {
        return inventoryV2.handleInventoryCategory(ctx);
    }

    await safeAnswer(ctx).catch(() => {});

    const [, category, pageStr, pageIndexStr] = itemDetail;
    return renderEnhancedItemDetail(ctx, category, Number(pageStr), Number(pageIndexStr));
}

module.exports = {
    ...inventoryV2,
    handleInventoryCategory
};
