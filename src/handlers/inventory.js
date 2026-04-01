const { getPlayer, savePlayer, recalculateStats } = require('../core/player/playerService');
const { inventoryCategoryMenu } = require('../menus/inventoryMenu');
const { Markup } = require('telegraf');

function formatEquipmentItem(label, item) {
    if (!item) return `${label}: —`;
    const stats = [];
    if (item.atk) stats.push(`ATK+${item.atk}`);
    if (item.def) stats.push(`DEF+${item.def}`);
    if (item.hp) stats.push(`HP+${item.hp}`);
    if (item.crit) stats.push(`CRIT+${item.crit}%`);
    return `${label}: ${item.emoji || '⚪'} ${item.name} (${stats.join(', ')})`;
}

function renderInventoryOverview(player, headline = '🎒 *INVENTÁRIO*') {
    const eq = player.equipment || {};
    const inventoryCount = (player.inventory || []).length;
    const inventoryMax = player.maxInventory || 20;

    let text = `${headline} (${inventoryCount}/${inventoryMax})

⚔️ ATK ${player.atk}    🛡️ DEF ${player.def}
❤️ HP ${player.hp}/${player.maxHp}    💥 CRIT ${player.crit}%

${formatEquipmentItem('⚔️ Arma', eq.weapon)}
${formatEquipmentItem('🛡️ Armadura', eq.armor)}
${formatEquipmentItem('🛡️ Escudo', eq.shield)}
${formatEquipmentItem('💍 Anel', eq.ring)}
${formatEquipmentItem('📿 Colar', eq.necklace)}
${formatEquipmentItem('🏹 Aljava', eq.quiver)}
${formatEquipmentItem('🎒 Mochila', eq.backpack)}

💀 *Almas equipadas*
1. ${player.soulsEquipped?.[0]?.name || 'Slot vazio'}
2. ${player.soulsEquipped?.[1]?.name || 'Slot vazio'}
`;
    return text;
}

function equipItemById(player, itemId) {
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!player.equipment) {
        player.equipment = {
            weapon: null, armor: null, shield: null,
            ring: null, necklace: null, quiver: null, backpack: null
        };
    }

    const itemIndex = player.inventory.findIndex(item => item && String(item.id) === String(itemId));
    if (itemIndex === -1) return { ok: false, message: '❌ Item não encontrado.' };

    const item = player.inventory[itemIndex];
    const validSlots = ['weapon', 'armor', 'shield', 'ring', 'necklace', 'quiver', 'backpack'];
    if (!item.slot || !validSlots.includes(item.slot)) {
        return { ok: false, message: '❌ Este item não pode ser equipado.' };
    }

    const currentEquip = player.equipment[item.slot] || null;
    if (currentEquip && String(currentEquip.id) === String(item.id)) {
        return { ok: false, message: '⚠️ Este item já está equipado.' };
    }

    if (currentEquip) player.inventory.push(currentEquip);
    player.equipment[item.slot] = item;
    player.inventory.splice(itemIndex, 1);

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    return { ok: true, item, currentEquip };
}

function unequipSlot(player, slot) {
    const validSlots = ['weapon', 'armor', 'shield', 'ring', 'necklace', 'quiver', 'backpack'];
    if (!validSlots.includes(slot)) return { ok: false, message: '❌ Slot inválido.' };
    if (!player.equipment) player.equipment = {};
    const item = player.equipment[slot];
    if (!item) return { ok: false, message: '❌ Nada equipado neste slot.' };

    player.equipment[slot] = null;
    player.inventory.push(item);

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    return { ok: true, item };
}

function equipSoulById(player, soulId) {
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];

    const soulIndex = player.soulsInventory.findIndex(
        soul => soul && String(soul.instanceId || soul.id) === String(soulId)
    );
    if (soulIndex === -1) return { ok: false, message: '❌ Alma não encontrada.' };

    const emptySlot = player.soulsEquipped.findIndex(soul => !soul);
    if (emptySlot === -1) return { ok: false, message: '❌ Slots de almas cheios.' };

    const soul = player.soulsInventory[soulIndex];
    player.soulsEquipped[emptySlot] = soul;
    player.soulsInventory.splice(soulIndex, 1);

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    return { ok: true, soul, slot: emptySlot + 1 };
}

function unequipSoul(player, slotIndex) {
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];
    if (slotIndex < 0 || slotIndex >= player.soulsEquipped.length) return { ok: false, message: '❌ Slot inválido.' };
    const soul = player.soulsEquipped[slotIndex];
    if (!soul) return { ok: false, message: '❌ Nenhuma alma equipada neste slot.' };

    player.soulsEquipped[slotIndex] = null;
    player.soulsInventory.push(soul);

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    return { ok: true, soul };
}

async function handleEquip(ctx) {
    try {
        const text = ctx.message?.text || '';
        const itemId = ctx.match?.[1] || text.split(' ').slice(1).join(' ').trim();
        if (!itemId) return ctx.reply('❌ ID do item inválido.');

        const player = getPlayer(ctx.from.id);
        const result = equipItemById(player, itemId);
        if (!result.ok) return ctx.reply(result.message);

        savePlayer(ctx.from.id, player);
        await ctx.reply(`⚔️ *Equipado:* ${result.item.name}`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Erro ao equipar:', error);
        await ctx.reply('❌ Erro ao equipar item.');
    }
}

async function handleEquipSoul(ctx) {
    try {
        const text = ctx.message?.text || '';
        const soulId = ctx.match?.[1] || text.split(' ').slice(1).join(' ').trim();
        if (!soulId) return ctx.reply('❌ Alma inválida.');

        const player = getPlayer(ctx.from.id);
        const result = equipSoulById(player, soulId);
        if (!result.ok) return ctx.reply(result.message);

        savePlayer(ctx.from.id, player);
        await ctx.reply(`💀 *Alma equipada:* ${result.soul.name}`, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Erro ao equipar alma:', error);
        await ctx.reply('❌ Erro ao equipar alma.');
    }
}

async function handleUnequipItem(ctx) {
    try {
        await ctx.answerCbQuery();
        const slot = ctx.match?.[1];
        if (!slot) return;

        const player = getPlayer(ctx.from.id);
        const result = unequipSlot(player, slot);
        if (!result.ok) {
            return ctx.answerCbQuery(result.message, true);
        }
        savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(`✅ ${result.item.name} removido para o inventário.`, true);
        // Refresh the current inventory view (depends on which category)
        // For simplicity, go back to inventory category menu
        await ctx.editMessageText('🎒 *INVENTÁRIO*', { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
    } catch (error) {
        console.error('Erro ao desequipar:', error);
        await ctx.answerCbQuery('Erro ao desequipar.', true);
    }
}

async function handleEquipItemCallback(ctx) {
    try {
        await ctx.answerCbQuery();
        const itemId = ctx.match?.[1];
        if (!itemId) return;

        const player = getPlayer(ctx.from.id);
        const result = equipItemById(player, itemId);
        if (!result.ok) {
            return ctx.editMessageText(`❌ ${result.message.replace(/^❌\s*/, '')}`, {
                parse_mode: 'Markdown',
                ...inventoryCategoryMenu()
            });
        }
        savePlayer(ctx.from.id, player);
        const text = `${renderInventoryOverview(player)}\n\n✅ *${result.item.name} equipado com sucesso!*`;
        return ctx.editMessageText(text, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
    } catch (error) {
        console.error('Erro callback equip item:', error);
    }
}

async function handleEquipSoulCallback(ctx) {
    try {
        await ctx.answerCbQuery();
        const soulId = ctx.match?.[1];
        if (!soulId) return;

        const player = getPlayer(ctx.from.id);
        const result = equipSoulById(player, soulId);
        if (!result.ok) {
            return ctx.editMessageText(`❌ ${result.message.replace(/^❌\s*/, '')}`, {
                parse_mode: 'Markdown',
                ...inventoryCategoryMenu()
            });
        }
        savePlayer(ctx.from.id, player);
        const text = `${renderInventoryOverview(player)}\n\n✅ *${result.soul.name} equipada com sucesso!*`;
        return ctx.editMessageText(text, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
    } catch (error) {
        console.error('Erro callback equip alma:', error);
    }
}

module.exports = {
    handleEquip,
    handleEquipSoul,
    handleUnequipItem,
    handleEquipItemCallback,
    handleEquipSoulCallback,
    equipItemById,
    unequipSlot,
    equipSoulById,
    unequipSoul
};