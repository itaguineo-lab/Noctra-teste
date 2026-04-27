const { Markup } = require('telegraf');

const inventoryV2 = require('./inventoryV2');

const {
    getPlayer
} = require('../core/player/playerService');

const {
    ensureCosmeticsState
} = require('../core/player/cosmetics');

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

const {
    navigateText,
    safeAnswer
} = require('../utils/uiNavigator');

const {
    getRarityEmoji
} = require('../data/balance');

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

const CLASS_LABELS = {
    guerreiro: 'Guerreiro',
    arqueiro: 'Arqueiro',
    mago: 'Mago'
};

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function truncateText(text = '', max = 22) {
    const value = String(text || '');
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
}

function getCategory(rawCategory = '') {
    const key = String(rawCategory || '').trim();
    return normalizeCategoryKey(LEGACY_CATEGORY_ALIAS[key] || key);
}

function getClassLabel(className = '') {
    return CLASS_LABELS[String(className || '').toLowerCase()] || className || 'Livre';
}

function getAllowedClassesLabel(item = {}) {
    const allowed = Array.isArray(item.allowedClasses) ? item.allowedClasses : [];
    if (!allowed.length) return 'Livre';
    return allowed.map(getClassLabel).join(', ');
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

function calcItemPower(item) {
    if (!item || typeof item !== 'object') return 0;

    if (item.power !== undefined && item.power !== null && Number.isFinite(Number(item.power))) {
        return Math.max(1, Number(item.power));
    }

    const atk = safeNumber(item.atk);
    const def = safeNumber(item.def);
    const hp = safeNumber(item.hp);
    const crit = safeNumber(item.crit);

    return Math.max(1, Math.round((atk * 2) + (def * 1.5) + (hp * 0.5) + (crit * 3)));
}

function buildVerticalStats(item) {
    const lines = [];

    if (safeNumber(item.atk) > 0) lines.push(`⚔️ ATK +${safeNumber(item.atk)}`);
    if (safeNumber(item.def) > 0) lines.push(`🛡️ DEF +${safeNumber(item.def)}`);
    if (safeNumber(item.hp) > 0) lines.push(`❤️ HP +${safeNumber(item.hp)}`);
    if (safeNumber(item.crit) > 0) lines.push(`💥 CRIT +${safeNumber(item.crit)}%`);

    return lines.length ? lines.join('\n') : 'Sem bônus relevantes.';
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

function buildLoreBlock(item = {}) {
    const lines = [];

    if (item.originMap || item.setName || item.dropSource || item.traitLabel || item.qualityLabel) {
        lines.push('*Identidade*');
        if (item.originMap) lines.push(`🗺️ Origem: ${escapeMarkdown(item.originMap)}`);
        if (item.setName) lines.push(`🧩 Conjunto: ${escapeMarkdown(item.setName)}`);
        if (item.dropSource) lines.push(`🎯 Fonte: ${escapeMarkdown(item.dropSource)}`);
        if (item.traitLabel) lines.push(`🧬 Traço: ${escapeMarkdown(item.traitLabel)}`);
        if (item.qualityLabel) lines.push(`✨ Qualidade: ${escapeMarkdown(item.qualityLabel)}`);
    }

    if (item.flavor) {
        if (lines.length) lines.push('');
        lines.push('*Descrição*');
        lines.push(`_${escapeMarkdown(item.flavor)}_`);
    }

    if (Array.isArray(item.tags) && item.tags.length) {
        const visibleTags = item.tags
            .slice(0, 4)
            .map(tag => `#${String(tag || '').replace(/\s+/g, '_')}`)
            .join(' ');

        if (visibleTags) {
            if (lines.length) lines.push('');
            lines.push(`🏷️ ${escapeMarkdown(visibleTags)}`);
        }
    }

    return lines.length ? lines.join('\n') : null;
}

function buildEnhancedItemDetailText(item, player) {
    const slot = getRealSlot(item);
    const comparison = getComparisonData(item, player, slot);
    const rarityEmoji = getRarityEmoji(item.rarity);
    const equippedLabel = item.__equipped ? '\n⭐ *Status:* Equipado' : '';
    const loreBlock = buildLoreBlock(item);

    let text = `${item.emoji || getSlotIcon(slot, item)} *${escapeMarkdown(String(item.name || 'Item').toUpperCase())}*\n\n`;
    text += `${rarityEmoji} ${escapeMarkdown(item.rarity || 'Comum')} • Lv.${item.level || 1}\n`;
    text += `Tipo: ${escapeMarkdown(getSlotLabel(slot, item))}\n`;
    text += `Classe: ${escapeMarkdown(getAllowedClassesLabel(item))}\n`;
    text += `Build: ${escapeMarkdown(getBuildRuleText(item))}${equippedLabel}\n\n`;

    if (loreBlock) {
        text += `${loreBlock}\n\n`;
    }

    text += `*Atributos*\n${escapeMarkdown(buildVerticalStats(item))}\n\n`;
    text += `*Poder:* ${calcItemPower(item)}${item.powerTier ? ` • ${escapeMarkdown(item.powerTier)}` : ''}\n`;
    text += `*Comparação:* ${escapeMarkdown(comparison.status)}\n`;
    text += `${escapeMarkdown(comparison.detail)}\n\n`;
    text += `Ao equipar, o sistema remove automaticamente combinações inválidas. Nenhum item é perdido.`;

    return text.trim();
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
    const rows = [];

    if (item.__equipped) {
        rows.push([
            Markup.button.callback(
                `⭐ Desequipar ${truncateText(item.name, 22)}`,
                `uneq:${slot}:${category}:${pageData.page}`
            )
        ]);
    } else {
        rows.push([
            Markup.button.callback(
                `✅ Equipar ${truncateText(item.name, 22)}`,
                `eqp:${category}:${pageData.page}:${pageIndex}`
            )
        ]);
    }

    rows.push([
        Markup.button.callback('↩️ Voltar', `invpage:${category}:${pageData.page}`),
        Markup.button.callback('💰 Vender', 'shop_sell')
    ]);

    rows.push([Markup.button.callback('🏠 Menu', 'menu')]);

    return navigateText(ctx, buildEnhancedItemDetailText(item, player), Markup.inlineKeyboard(rows));
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
    handleInventoryCategory,

    // exportado apenas para testes unitários simples
    __private: {
        buildLoreBlock,
        buildEnhancedItemDetailText
    }
};
