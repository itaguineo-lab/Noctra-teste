const { getPlayer, savePlayer } = require('../core/player/playerService');
const { inventoryCategoryMenu } = require('../menus/inventoryMenu');
const { formatItemStats } = require('../utils/formatters');
const { Markup } = require('telegraf');

async function safeEdit(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            await ctx.editMessageText(text, options);
        } else {
            await ctx.reply(text, options);
        }
    } catch {
        await ctx.reply(text, options);
    }
}

function getInventory(player) {
    return Array.isArray(player.inventory) ? player.inventory : [];
}

function slotLabel(slot) {
    const map = {
        weapon: 'Arma',
        armor: 'Armadura',
        shield: 'Escudo',
        ring: 'Anel',
        necklace: 'Colar',
        quiver: 'Aljava',
        backpack: 'Mochila'
    };
    return map[slot] || slot;
}

async function handleInventory(ctx) {
    const player = getPlayer(ctx.from.id);
    const inventory = getInventory(player);
    const maxInv = player.maxInventory || (player.vip ? 30 : 20);
    const invCount = inventory.length;

    const weapons = inventory.filter(i => i.slot === 'weapon');
    const armors = inventory.filter(i => i.slot === 'armor');
    const shields = inventory.filter(i => i.slot === 'shield');
    const rings = inventory.filter(i => i.slot === 'ring');
    const necklaces = inventory.filter(i => i.slot === 'necklace');
    const quivers = inventory.filter(i => i.slot === 'quiver');
    const backpacks = inventory.filter(i => i.slot === 'backpack');

    const stats = `⚔️ ATK ${player.atk} | 🛡️ DEF ${player.def} | ❤️ HP ${player.maxHp} | 💥 CRIT ${player.crit}%`;

    await safeEdit(ctx,
        `🎒 *INVENTÁRIO* (${invCount}/${maxInv})\n\n${stats}\n\n` +
        `⚔️ Armas: ${weapons.length} | 🛡️ Armaduras: ${armors.length}\n` +
        `🛡️ Escudos: ${shields.length} | 💍 Anéis: ${rings.length}\n` +
        `📿 Colares: ${necklaces.length} | 🏹 Aljavas: ${quivers.length}\n` +
        `🎒 Mochilas: ${backpacks.length}\n💀 Almas: ${player.soulsInventory?.length || 0}\n\n` +
        `Escolha uma categoria:`,
        { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
    );
}

// ====================== ARMAS ======================
async function handleInvWeapons(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = getInventory(player).filter(i => i.slot === 'weapon');
    const equippedId = player.equipment?.weapon?.id;

    let text = `⚔️ *ARMAS*\n\n`;
    const keyboard = [];

    if (!items.length) {
        text += `_Nenhuma arma._`;
    } else {
        items.forEach(item => {
            const isEquipped = equippedId && String(equippedId) === String(item.id);
            const marker = isEquipped ? '★ ' : '• ';
            text += `${marker} ${item.emoji || '⚪'} *${item.name}*${formatItemStats(item)}\n`;
            if (isEquipped) {
                keyboard.push([Markup.button.callback(`🔄 Desequipar Arma`, `unequip_item_weapon`)]);
            } else {
                keyboard.push([Markup.button.callback(`⚔️ Equipar ${item.name}`, `equip_item_${item.id}`)]);
            }
        });
    }

    keyboard.push([Markup.button.callback('◀️ Voltar', 'inventory')]);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

// ====================== ARMADURAS ======================
async function handleInvArmors(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = getInventory(player).filter(i => i.slot === 'armor');
    const equippedId = player.equipment?.armor?.id;

    let text = `🛡️ *ARMADURAS*\n\n`;
    const keyboard = [];

    if (!items.length) {
        text += `_Nenhuma armadura._`;
    } else {
        items.forEach(item => {
            const isEquipped = equippedId && String(equippedId) === String(item.id);
            const marker = isEquipped ? '★ ' : '• ';
            text += `${marker} ${item.emoji || '⚪'} *${item.name}*${formatItemStats(item)}\n`;
            if (isEquipped) {
                keyboard.push([Markup.button.callback(`🔄 Desequipar Armadura`, `unequip_item_armor`)]);
            } else {
                keyboard.push([Markup.button.callback(`🛡️ Equipar ${item.name}`, `equip_item_${item.id}`)]);
            }
        });
    }

    keyboard.push([Markup.button.callback('◀️ Voltar', 'inventory')]);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

// ====================== JÓIAS (Anéis + Colares) ======================
async function handleInvJewelry(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = getInventory(player).filter(i => i.slot === 'ring' || i.slot === 'necklace');
    const ringEquippedId = player.equipment?.ring?.id;
    const necklaceEquippedId = player.equipment?.necklace?.id;

    let text = `💎 *JÓIAS*\n\n`;
    const keyboard = [];

    if (!items.length) {
        text += `_Nenhuma jóia._`;
    } else {
        items.forEach(item => {
            const isRing = item.slot === 'ring';
            const isEquipped = isRing
                ? (ringEquippedId && String(ringEquippedId) === String(item.id))
                : (necklaceEquippedId && String(necklaceEquippedId) === String(item.id));
            const marker = isEquipped ? '★ ' : '• ';
            const typeIcon = item.slot === 'ring' ? '💍' : '📿';
            text += `${marker} ${typeIcon} ${item.emoji || '⚪'} *${item.name}*${formatItemStats(item)}\n`;
            if (isEquipped) {
                const unequipSlot = item.slot === 'ring' ? 'ring' : 'necklace';
                keyboard.push([Markup.button.callback(`🔄 Desequipar ${item.slot === 'ring' ? 'Anel' : 'Colar'}`, `unequip_item_${unequipSlot}`)]);
            } else {
                keyboard.push([Markup.button.callback(`💎 Equipar ${item.name}`, `equip_item_${item.id}`)]);
            }
        });
    }

    keyboard.push([Markup.button.callback('◀️ Voltar', 'inventory')]);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

// ====================== CONSUMÍVEIS ======================
async function handleInvConsumables(ctx) {
    const c = getPlayer(ctx.from.id).consumables || {};
    await safeEdit(ctx,
        `🧪 *CONSUMÍVEIS*\n\n❤️ Poção de HP: ${c.potionHp || 0}\n⚡ Poção de Energia: ${c.potionEnergy || 0}\n💪 Tônico de Força: ${c.tonicStrength || 0}`,
        { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
    );
}

// ====================== ALMAS ======================
async function handleInvSouls(ctx) {
    const souls = getPlayer(ctx.from.id).soulsInventory || [];
    if (!souls.length) {
        return safeEdit(ctx, `💀 *ALMAS*\n\nNenhuma alma.`, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
    }

    const equipButtons = souls.map(soul => {
        const isEquipped = (getPlayer(ctx.from.id).soulsEquipped || []).some(eq => eq && eq.id === soul.id);
        if (isEquipped) {
            return [Markup.button.callback(`🔄 Desequipar ${soul.name}`, `unequip_soul_${soul.instanceId || soul.id}`)];
        } else {
            return [Markup.button.callback(`💀 Equipar ${soul.name}`, `equip_soul_${soul.instanceId || soul.id}`)];
        }
    });
    const keyboard = [...equipButtons, [Markup.button.callback('◀️ Voltar', 'inventory')]];

    let text = `💀 *ALMAS*\n\n`;
    souls.forEach(soul => {
        const isEquipped = (getPlayer(ctx.from.id).soulsEquipped || []).some(eq => eq && eq.id === soul.id);
        const marker = isEquipped ? '★ ' : '• ';
        text += `${marker} ${soul.emoji || '💀'} *${soul.name}* (${soul.rarity})\n`;
    });

    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

module.exports = {
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvConsumables,
    handleInvSouls
};