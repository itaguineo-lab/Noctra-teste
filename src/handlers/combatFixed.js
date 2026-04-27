const baseCombat = require('./combat');

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
    buildEnhancedItemDetailText,
    calcItemPower
} = require('../core/player/itemLorePresenter');
const {
    postCombatMenu,
    postLootItemMenu
} = require('../menus/combatMenu');

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
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

    /*
    Fallback intencional:
    Após o drop, o item entra no final do inventário. Em alguns fluxos o item
    retornado por rewardService ainda não tem a mesma chave final após normalizar
    e salvar o player no Mongo. Quando a chave do botão não bate, usamos o último
    item válido do inventário para preservar o fluxo Ver item dropado.
    */
    return getLatestInventoryItem(player);
}

function buildCombatLootDetail(player, item) {
    const normalizedItem = normalizeInventoryItem(item);
    const slot = getRealSlot(normalizedItem);
    const comparison = getComparisonData(normalizedItem, player, slot);

    return buildEnhancedItemDetailText({
        item: normalizedItem,
        slotLabel: getSlotLabel(slot, normalizedItem),
        slotIcon: getSlotIcon(slot, normalizedItem),
        buildRuleText: getBuildRuleText(normalizedItem),
        comparisonStatus: comparison.status,
        comparisonDetail: comparison.detail,
        isEquipped: false
    });
}

async function handleViewDroppedLoot(ctx) {
    const itemKey = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player || !itemKey) {
        return ctx.answerCbQuery('Item não encontrado.', { show_alert: true }).catch(() => {});
    }

    const item = resolveDroppedLootItem(player, itemKey);
    const normalizedItem = normalizeInventoryItem(item);

    if (!normalizedItem) {
        return ctx.answerCbQuery('Esse item não está mais no inventário.', { show_alert: true }).catch(() => {});
    }

    await ctx.answerCbQuery().catch(() => {});

    return ctx.reply(buildCombatLootDetail(player, normalizedItem), {
        parse_mode: 'Markdown',
        ...postLootItemMenu(getItemKey(normalizedItem))
    });
}

async function handleEquipDroppedLoot(ctx) {
    const itemKey = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player || !itemKey) {
        return ctx.answerCbQuery('Item não encontrado.', { show_alert: true }).catch(() => {});
    }

    const item = resolveDroppedLootItem(player, itemKey);
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

    return ctx.reply(
        `✅ *Item equipado!*\n\n${normalizedItem.emoji || getSlotIcon(slot, normalizedItem)} ${escapeMarkdown(normalizedItem.name)} foi equipado com sucesso.`,
        { parse_mode: 'Markdown', ...postCombatMenu() }
    );
}

module.exports = {
    ...baseCombat,
    handleViewDroppedLoot,
    handleEquipDroppedLoot,

    __private: {
        resolveDroppedLootItem,
        getLatestInventoryItem,
        findItemByRawIdentity
    }
};
