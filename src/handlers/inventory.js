const { Markup } = require('telegraf');
const { getPlayer, savePlayer, recalculateStats } = require('../core/player/playerService');

async function safeReply(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            return await ctx.editMessageText(text, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }
        return await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch {
        return await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

function formatStats(item) {
    const parts = [];
    if (item.atk) parts.push(`⚔️ +${item.atk}`);
    if (item.def) parts.push(`🛡️ +${item.def}`);
    if (item.hp) parts.push(`❤️ +${item.hp}`);
    if (item.crit) parts.push(`✨ +${item.crit}%`);
    return parts.length ? ` (${parts.join(' | ')})` : '';
}

function buildHeader(player) {
    recalculateStats(player);
    const invCount = player.inventory.length;
    const maxInv = player.maxInventory || (player.vip ? 30 : 20);
    return `🎒 *INVENTÁRIO* (${invCount}/${maxInv})

⚔️ ATK: ${player.atk}
🛡️ DEF: ${player.def}
❤️ HP: ${player.maxHp}
✨ CRIT: ${player.crit}%`;
}

function baseKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Armas', 'inv_weapons'), Markup.button.callback('🛡️ Armaduras', 'inv_armors')],
        [Markup.button.callback('💎 Jóias', 'inv_jewelry'), Markup.button.callback('🧪 Consumíveis', 'inv_consumables')],
        [Markup.button.callback('💀 Almas', 'inv_souls')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

async function handleInventory(ctx) {
    const player = getPlayer(ctx.from.id);
    await safeReply(ctx, `${buildHeader(player)}\n\nEscolha uma categoria:`, baseKeyboard());
}

async function renderCategory(ctx, slot, title, emoji) {
    const player = getPlayer(ctx.from.id);
    const items = player.inventory.filter(item => item.slot === slot);

    let text = `${buildHeader(player)}\n\n${emoji} *${title}*\n\n`;
    if (!items.length) {
        text += '_Nenhum item nesta categoria._';
    } else {
        items.forEach(item => {
            const isEquipped = player.equipment?.[slot]?.id === item.id;
            const marker = isEquipped ? '★ ' : '• ';
            text += `${marker} *${item.name}*${formatStats(item)}\n`;
        });
    }

    const keyboard = baseKeyboard().reply_markup.inline_keyboard;
    const actionButtons = [];

    if (items.length) {
        items.forEach(item => {
            const isEquipped = player.equipment?.[slot]?.id === item.id;
            if (isEquipped) {
                actionButtons.push([Markup.button.callback(`🔄 Desequipar ${slotLabel(slot)}`, `unequip_${slot}`)]);
            } else {
                actionButtons.push([Markup.button.callback(`⚔️ Equipar ${item.name}`, `equip_${slot}_${item.id}`)]);
            }
        });
    } else {
        const equipped = player.equipment?.[slot];
        if (equipped) {
            actionButtons.push([Markup.button.callback(`🔄 Desequipar ${slotLabel(slot)}`, `unequip_${slot}`)]);
        }
    }

    return safeReply(ctx, text, {
        reply_markup: {
            inline_keyboard: [...keyboard, ...actionButtons]
        }
    });
}

function slotLabel(slot) {
    const map = { weapon: 'Arma', armor: 'Armadura', shield: 'Escudo', ring: 'Anel', necklace: 'Colar', quiver: 'Aljava', backpack: 'Mochila' };
    return map[slot] || slot;
}

async function handleInvWeapons(ctx) { return renderCategory(ctx, 'weapon', 'ARMAS', '⚔️'); }
async function handleInvArmors(ctx) { return renderCategory(ctx, 'armor', 'ARMADURAS', '🛡️'); }
async function handleInvJewelry(ctx) {
    const player = getPlayer(ctx.from.id);
    const itemsRing = player.inventory.filter(item => item.slot === 'ring');
    const itemsNecklace = player.inventory.filter(item => item.slot === 'necklace');
    const ringEquipped = player.equipment?.ring;
    const necklaceEquipped = player.equipment?.necklace;

    let text = `${buildHeader(player)}\n\n💎 *JÓIAS*\n\n`;
    if (!itemsRing.length && !itemsNecklace.length) {
        text += '_Nenhuma jóia._';
    } else {
        if (itemsRing.length) {
            text += `💍 *Anéis*\n`;
            itemsRing.forEach(item => {
                const isEquipped = ringEquipped?.id === item.id;
                const marker = isEquipped ? '★ ' : '• ';
                text += `${marker} *${item.name}*${formatStats(item)}\n`;
            });
            text += `\n`;
        }
        if (itemsNecklace.length) {
            text += `📿 *Colares*\n`;
            itemsNecklace.forEach(item => {
                const isEquipped = necklaceEquipped?.id === item.id;
                const marker = isEquipped ? '★ ' : '• ';
                text += `${marker} *${item.name}*${formatStats(item)}\n`;
            });
        }
    }

    const keyboard = baseKeyboard().reply_markup.inline_keyboard;
    const actionButtons = [];

    if (ringEquipped) {
        actionButtons.push([Markup.button.callback(`🔄 Desequipar Anel`, `unequip_ring`)]);
    }
    if (necklaceEquipped) {
        actionButtons.push([Markup.button.callback(`🔄 Desequipar Colar`, `unequip_necklace`)]);
    }

    const equipableItems = [...itemsRing, ...itemsNecklace];
    equipableItems.forEach(item => {
        const isEquipped = (item.slot === 'ring' && ringEquipped?.id === item.id) ||
                           (item.slot === 'necklace' && necklaceEquipped?.id === item.id);
        if (!isEquipped) {
            actionButtons.push([Markup.button.callback(`💎 Equipar ${item.name}`, `equip_${item.slot}_${item.id}`)]);
        }
    });

    return safeReply(ctx, text, {
        reply_markup: {
            inline_keyboard: [...keyboard, ...actionButtons]
        }
    });
}

async function handleInvConsumables(ctx) {
    const player = getPlayer(ctx.from.id);
    const c = player.consumables || {};
    const text = `${buildHeader(player)}\n\n🧪 *CONSUMÍVEIS*\n\n❤️ Poção de HP: ${c.potionHp || 0}\n⚡ Poção de Energia: ${c.potionEnergy || 0}\n💪 Tônico de Força: ${c.tonicStrength || 0}`;
    await safeReply(ctx, text, baseKeyboard());
}

async function handleInvSouls(ctx) {
    const player = getPlayer(ctx.from.id);
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];
    let text = `${buildHeader(player)}\n\n💀 *ALMAS*\n\n`;
    if (!souls.length && !equipped.some(Boolean)) {
        text += '_Nenhuma alma._';
    } else {
        if (souls.length) {
            text += `📦 *Inventário*\n`;
            souls.forEach(soul => {
                const isEquipped = equipped.some(eq => eq && eq.id === soul.id);
                const marker = isEquipped ? '★ ' : '• ';
                text += `${marker} ${soul.emoji || '💀'} *${soul.name}* (${soul.rarity})${formatStats(soul)}\n`;
            });
            text += `\n`;
        }
        text += `🔹 *Equipadas* (${equipped.filter(Boolean).length}/2)\n`;
        equipped.forEach((soul, idx) => {
            if (soul) {
                text += `   ${soul.emoji || '💀'} *${soul.name}* (${soul.rarity})${formatStats(soul)}\n`;
            } else {
                text += `   ⬜ Slot ${idx + 1} vazio\n`;
            }
        });
    }

    const keyboard = baseKeyboard().reply_markup.inline_keyboard;
    const actionButtons = [];

    equipped.forEach((soul, idx) => {
        if (soul) {
            actionButtons.push([Markup.button.callback(`🔄 Desequipar ${soul.name}`, `unequip_soul_${idx}`)]);
        }
    });

    souls.forEach(soul => {
        const isEquipped = equipped.some(eq => eq && eq.id === soul.id);
        if (!isEquipped) {
            actionButtons.push([Markup.button.callback(`💀 Equipar ${soul.name}`, `equip_soul_${soul.instanceId || soul.id}`)]);
        }
    });

    return safeReply(ctx, text, {
        reply_markup: {
            inline_keyboard: [...keyboard, ...actionButtons]
        }
    });
}

async function handleEquipItem(ctx) {
    const match = ctx.callbackQuery.data.match(/^equip_(.+)_(.+)$/);
    if (!match) return ctx.answerCbQuery('❌ Ação inválida');
    const slot = match[1];
    const itemId = match[2];

    const player = getPlayer(ctx.from.id);
    const item = player.inventory.find(i => String(i.id) === String(itemId));
    if (!item) return ctx.answerCbQuery('❌ Item não encontrado', true);

    player.equipment = player.equipment || {};
    player.equipment[slot] = item;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`⚡ ${item.name} equipado!`);

    // Recarrega a categoria atual
    const categoryMap = { weapon: 'inv_weapons', armor: 'inv_armors', ring: 'inv_jewelry', necklace: 'inv_jewelry' };
    const action = categoryMap[slot] || 'inventory';
    if (action === 'inv_jewelry') {
        await handleInvJewelry(ctx);
    } else if (action === 'inv_weapons') {
        await handleInvWeapons(ctx);
    } else if (action === 'inv_armors') {
        await handleInvArmors(ctx);
    } else {
        await handleInventory(ctx);
    }
}

async function handleUnequipItem(ctx) {
    const match = ctx.callbackQuery.data.match(/^unequip_(.+)$/);
    if (!match) return ctx.answerCbQuery('❌ Ação inválida');
    const slot = match[1];

    const player = getPlayer(ctx.from.id);
    const item = player.equipment?.[slot];
    if (!item) return ctx.answerCbQuery('❌ Nada equipado neste slot', true);

    player.equipment[slot] = null;
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`⭐ ${item.name} removido!`);

    // Recarrega a categoria atual
    const categoryMap = { weapon: 'inv_weapons', armor: 'inv_armors', ring: 'inv_jewelry', necklace: 'inv_jewelry' };
    const action = categoryMap[slot] || 'inventory';
    if (action === 'inv_jewelry') {
        await handleInvJewelry(ctx);
    } else if (action === 'inv_weapons') {
        await handleInvWeapons(ctx);
    } else if (action === 'inv_armors') {
        await handleInvArmors(ctx);
    } else {
        await handleInventory(ctx);
    }
}

async function handleEquipSoul(ctx) {
    const match = ctx.callbackQuery.data.match(/^equip_soul_(.+)$/);
    if (!match) return ctx.answerCbQuery('❌ Ação inválida');
    const soulId = match[1];

    const player = getPlayer(ctx.from.id);
    const soul = player.soulsInventory.find(s => String(s.instanceId || s.id) === String(soulId));
    if (!soul) return ctx.answerCbQuery('❌ Alma não encontrada', true);

    const emptySlot = player.soulsEquipped.findIndex(s => !s);
    if (emptySlot === -1) return ctx.answerCbQuery('❌ Slots de almas cheios', true);

    player.soulsEquipped[emptySlot] = soul;
    // Não remove do inventário (alma permanece)
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`💀 ${soul.name} equipada!`);

    await handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const match = ctx.callbackQuery.data.match(/^unequip_soul_(\d+)$/);
    if (!match) return ctx.answerCbQuery('❌ Ação inválida');
    const slotIndex = parseInt(match[1]);

    const player = getPlayer(ctx.from.id);
    const soul = player.soulsEquipped[slotIndex];
    if (!soul) return ctx.answerCbQuery('❌ Nada equipado', true);

    player.soulsEquipped[slotIndex] = null;
    // Não remove do inventário (alma permanece)
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`💀 ${soul.name} removida!`);

    await handleInvSouls(ctx);
}

module.exports = {
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvConsumables,
    handleInvSouls,
    handleEquipItem,
    handleUnequipItem,
    handleEquipSoul,
    handleUnequipSoul
};