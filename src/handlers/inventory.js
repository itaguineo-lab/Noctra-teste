const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const { Markup } = require('telegraf');
const {
    inventoryMainMenu
} = require('../menus/inventoryMenu');

function formatItem(item, index) {
    return `${index + 1}. ${item.emoji || '⚪'} ${item.name}
⚔️ ${item.atk || 0} | 🛡️ ${item.def || 0} | ❤️ ${item.hp || 0} | 💥 ${item.crit || 0}%`;
}

function filterByCategory(items, category) {
    switch (category) {
        case 'weapon':
            return items.filter(i => i.slot === 'weapon');

        case 'armor':
            return items.filter(i => i.slot === 'armor');

        case 'jewelry':
            return items.filter(i =>
                ['ring', 'necklace'].includes(i.slot)
            );

        case 'skin':
            return items.filter(i => i.slot === 'skin');

        case 'consumable':
            return items.filter(i => i.slot === 'consumable');

        case 'soul':
            return [];

        default:
            return [];
    }
}

async function handleInventory(ctx) {
    await ctx.answerCbQuery?.();

    return ctx.reply('🎒 *INVENTÁRIO*', {
        parse_mode: 'Markdown',
        ...inventoryMainMenu()
    });
}

async function showCategory(ctx, category, title) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    const items = filterByCategory(
        player.inventory || [],
        category
    );

    let text = `🎒 *${title}*\n\n`;

    if (!items.length) {
        text += `Nenhum item nesta categoria.`;
    } else {
        items.forEach((item, index) => {
            text += `${formatItem(item, index)}\n\n`;
        });
    }

    const keyboard = items.map((item, index) => [
        Markup.button.callback(
            `Equipar ${index + 1}`,
            `equip_manual_${item.id}`
        )
    ]);

    keyboard.push([
        Markup.button.callback('◀️ Voltar', 'inventory')
    ]);

    return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
    });
}

async function handleEquipManual(ctx) {
    await ctx.answerCbQuery();

    const itemId = ctx.match[1];

    const player = getPlayer(ctx.from.id);

    const item = player.inventory.find(
        i => String(i.id) === String(itemId)
    );

    if (!item) {
        return ctx.reply('❌ Item não encontrado.');
    }

    player.equipment[item.slot] = item;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return ctx.reply(
        `✨ ${item.name} equipado com sucesso!`
    );
}

function getBestItemForSlot(items, slot) {
    const slotItems = items.filter(
        i => i.slot === slot
    );

    if (!slotItems.length) return null;

    return slotItems.sort((a, b) => {
        const scoreA =
            (a.atk || 0) * 2 +
            (a.def || 0) * 1.5 +
            (a.hp || 0) +
            (a.crit || 0) * 2;

        const scoreB =
            (b.atk || 0) * 2 +
            (b.def || 0) * 1.5 +
            (b.hp || 0) +
            (b.crit || 0) * 2;

        return scoreB - scoreA;
    })[0];
}

async function handleAutoEquip(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    const slots = [
        'weapon',
        'armor',
        'ring',
        'necklace',
        'boots'
    ];

    let equipped = 0;

    slots.forEach(slot => {
        const best = getBestItemForSlot(
            player.inventory || [],
            slot
        );

        if (best) {
            player.equipment[slot] = best;
            equipped++;
        }
    });

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return ctx.reply(
        `✨ ${equipped} item(ns) equipados automaticamente!`
    );
}

module.exports = {
    handleInventory,
    handleAutoEquip,
    handleEquipManual,
    showCategory
};