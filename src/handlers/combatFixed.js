const baseCombat = require('./combat');

const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const {
    normalizeInventoryItem,
    normalizePlayerForSave,
    applyEquipmentChange
} = require('../core/player/playerMutations');
const {
    getItemKey,
    findInventoryItemByKey
} = require('../core/player/equipmentService');
const {
    calcItemPower
} = require('../core/player/itemLorePresenter');
const {
    postCombatMenu
} = require('../menus/combatMenu');
const {
    tryDeleteCurrentMessage
} = require('../utils/uiNavigator');

function cleanText(value = '') {
    return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

async function deleteCurrentCallbackMessage(ctx) {
    return tryDeleteCurrentMessage(ctx).catch(() => false);
}

async function replyClean(ctx, text, options = {}) {
    await deleteCurrentCallbackMessage(ctx);
    return ctx.reply(text, options);
}

function getRealSlot(item = {}) {
    const slot = String(item.slot || '');
    const validSlots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    for (const validSlot of validSlots) {
        if (slot.startsWith(validSlot)) return validSlot;
    }

    return slot;
}

function getOffhandTypeLabel(type = '') {
    const labels = {
        shield: 'Escudo',
        quiver: 'Aljava',
        orb: 'Orbe'
    };

    return labels[String(type || '').toLowerCase()] || 'Mão Secundária';
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

    const equippedKey = getItemKey(equipped);
    const itemKey = getItemKey(item);

    if (equippedKey && itemKey && equippedKey === itemKey) {
        return {
            status: 'Equipado agora',
            detail: 'Este item já está equipado.'
        };
    }

    const delta = calcItemPower(item) - calcItemPower(equipped);
    const equippedName = equipped.name || 'item equipado';

    if (delta > 0) {
        return {
            status: `+${delta} poder`,
            detail: `Melhor que ${equippedName}.`
        };
    }

    if (delta < 0) {
        return {
            status: `-${Math.abs(delta)} poder`,
            detail: `Pior que ${equippedName}.`
        };
    }

    return {
        status: 'Mesmo poder',
        detail: `Equivalente a ${equippedName}.`
    };
}

function normalizeKey(value = '') {
    return String(value || '').trim();
}

function findItemByRawIdentity(player, itemKey) {
    const key = normalizeKey(itemKey);
    if (!key) return null;

    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];

    return inventory.find(item => {
        if (!item || typeof item !== 'object') return false;

        return [
            item.id,
            item.instanceId,
            item.legacyBase,
            item._id
        ].some(value => normalizeKey(value) === key);
    }) || null;
}

function getLatestInventoryItem(player) {
    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];

    for (let i = inventory.length - 1; i >= 0; i -= 1) {
        const item = inventory[i];
        const normalized = normalizeInventoryItem(item);
        if (normalized) return item;
    }

    return null;
}

function resolveDroppedLootItem(player, itemKey) {
    if (!player) return null;

    const exact = findInventoryItemByKey(player, itemKey);
    if (exact) return exact;

    const rawMatch = findItemByRawIdentity(player, itemKey);
    if (rawMatch) return rawMatch;

    return getLatestInventoryItem(player);
}

function buildStatsText(item = {}) {
    const parts = [];

    if (Number(item.atk || 0) > 0) parts.push(`ATK +${item.atk}`);
    if (Number(item.def || 0) > 0) parts.push(`DEF +${item.def}`);
    if (Number(item.hp || 0) > 0) parts.push(`HP +${item.hp}`);
    if (Number(item.crit || 0) > 0) parts.push(`CRIT +${item.crit}%`);

    return parts.length ? parts.join('\n') : 'Sem bônus relevantes.';
}

function buildSafeLootDetail(player, item) {
    const normalizedItem = normalizeInventoryItem(item);
    const slot = getRealSlot(normalizedItem);
    const comparison = getComparisonData(normalizedItem, player, slot);
    const icon = normalizedItem.emoji || getSlotIcon(slot, normalizedItem);

    const lines = [
        '🎁 ITEM DROPADO',
        '',
        `${icon} ${cleanText(normalizedItem.name || 'Item')}`,
        `${cleanText(normalizedItem.rarity || 'Comum')} • Lv.${normalizedItem.level || 1}`,
        `Tipo: ${cleanText(normalizedItem.displayCategory || getSlotLabel(slot, normalizedItem))}`,
        `Build: ${cleanText(getBuildRuleText(normalizedItem))}`,
        '',
        'Atributos:',
        buildStatsText(normalizedItem),
        '',
        `Poder: ${calcItemPower(normalizedItem)}${normalizedItem.powerTier ? ` • ${cleanText(normalizedItem.powerTier)}` : ''}`,
        `Comparação: ${cleanText(comparison.status)}`,
        cleanText(comparison.detail)
    ];

    if (normalizedItem.originMap || normalizedItem.traitLabel || normalizedItem.setName) {
        lines.push('', 'Identidade:');
        if (normalizedItem.originMap) lines.push(`Origem: ${cleanText(normalizedItem.originMap)}`);
        if (normalizedItem.setName) lines.push(`Conjunto: ${cleanText(normalizedItem.setName)}`);
        if (normalizedItem.traitLabel) lines.push(`Traço: ${cleanText(normalizedItem.traitLabel)}`);
    }

    if (normalizedItem.flavor) {
        lines.push('', cleanText(normalizedItem.flavor).slice(0, 400));
    }

    return lines.join('\n').slice(0, 3500);
}

function buildShortItemToken(item) {
    const key = normalizeKey(getItemKey(item));

    if (key && key.length <= 48) return key;

    const instanceId = normalizeKey(item?.instanceId);
    if (instanceId && instanceId.length <= 48) return instanceId;

    const id = normalizeKey(item?.id);
    if (id && id.length <= 48) return id;

    return 'latest';
}

function buildShortCallbackToken(value) {
    const token = normalizeKey(value);
    if (!token || token.length > 48) return 'latest';
    return token;
}

function postLootItemMenuSafe(itemToken) {
    const token = buildShortCallbackToken(itemToken);

    return Markup.inlineKeyboard([
        [Markup.button.callback('✅ Equipar agora', `combat_loot_equip:${token}`)],
        [
            Markup.button.callback('⚔️ Caçar novamente', 'hunt'),
            Markup.button.callback('🎒 Inventário', 'inventory')
        ],
        [
            Markup.button.callback('💰 Vender itens', 'shop_sell'),
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

async function handleViewDroppedLoot(ctx) {
    const itemKey = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player || !itemKey) {
        return ctx.answerCbQuery('Item não encontrado.', { show_alert: true }).catch(() => {});
    }

    const item = itemKey === 'latest'
        ? getLatestInventoryItem(player)
        : resolveDroppedLootItem(player, itemKey);
    const normalizedItem = normalizeInventoryItem(item);

    if (!normalizedItem) {
        return ctx.answerCbQuery('Esse item não está mais no inventário.', { show_alert: true }).catch(() => {});
    }

    await ctx.answerCbQuery().catch(() => {});

    const itemToken = buildShortItemToken(normalizedItem);

    return replyClean(
        ctx,
        buildSafeLootDetail(player, normalizedItem),
        postLootItemMenuSafe(itemToken)
    );
}

async function handleEquipDroppedLoot(ctx) {
    const itemKey = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player || !itemKey) {
        return ctx.answerCbQuery('Item não encontrado.', { show_alert: true }).catch(() => {});
    }

    const item = itemKey === 'latest'
        ? getLatestInventoryItem(player)
        : resolveDroppedLootItem(player, itemKey);
    const normalizedItem = normalizeInventoryItem(item);

    if (!normalizedItem) {
        return ctx.answerCbQuery('Esse item não está mais no inventário.', { show_alert: true }).catch(() => {});
    }

    const slot = getRealSlot(normalizedItem);

    if (!slot) {
        return ctx.answerCbQuery('Item inválido.', { show_alert: true }).catch(() => {});
    }

    const result = applyEquipmentChange(player, slot, normalizedItem);

    if (!result.success) {
        return ctx.answerCbQuery(result.message || 'Não foi possível equipar.', { show_alert: true }).catch(() => {});
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`✅ ${normalizedItem.name} equipado!`, { show_alert: true }).catch(() => {});

    return replyClean(
        ctx,
        `✅ Item equipado!\n\n${normalizedItem.emoji || getSlotIcon(slot, normalizedItem)} ${cleanText(normalizedItem.name)} foi equipado com sucesso.`,
        postCombatMenu()
    );
}

module.exports = {
    ...baseCombat,
    handleViewDroppedLoot,
    handleEquipDroppedLoot,

    __private: {
        resolveDroppedLootItem,
        getLatestInventoryItem,
        findItemByRawIdentity,
        buildSafeLootDetail,
        buildShortItemToken,
        buildShortCallbackToken,
        replyClean
    }
};
