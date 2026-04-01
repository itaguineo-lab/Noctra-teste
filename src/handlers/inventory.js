const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const SLOTS = [
    'weapon',
    'armor',
    'necklace',
    'ring',
    'boots',
    'quiver',
    'backpack'
];

function slotEmoji(slot) {
    return {
        weapon: '⚔️',
        armor: '🛡️',
        necklace: '📿',
        ring: '💍',
        boots: '🥾',
        quiver: '🏹',
        backpack: '🎒'
    }[slot];
}

async function safeReply(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            return ctx.editMessageText(text, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        return ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch {
        return ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

function buildInventory(player, slot) {
    const items = player.inventory.filter(
        item => item.slot === slot
    );

    const rows = items.map(item => {
        const equipped =
            player.equipment[slot]?.id === item.id;

        return [
            Markup.button.callback(
                `${equipped ? '⭐' : slotEmoji(slot)} ${item.name}`,
                equipped
                    ? `unequip_${slot}`
                    : `equip_${slot}_${item.id}`
            )
        ];
    });

    rows.push([
        Markup.button.callback('⬅️ Voltar', 'inventory')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function renderSlot(ctx, slot) {
    const player = getPlayer(ctx.from.id);

    return safeReply(
        ctx,
        `${slotEmoji(slot)} *${slot.toUpperCase()}*`,
        buildInventory(player, slot)
    );
}

async function handleInventory(ctx) {
    const rows = SLOTS.map(slot => [
        Markup.button.callback(
            `${slotEmoji(slot)} ${slot}`,
            `inv_${slot}`
        )
    ]);

    rows.push([
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return safeReply(
        ctx,
        '🎒 *INVENTÁRIO*',
        Markup.inlineKeyboard(rows)
    );
}

async function handleEquipItem(ctx) {
    const match =
        ctx.callbackQuery.data.match(/^equip_(.+)_(.+)$/);

    const slot = match[1];
    const itemId = match[2];

    const player = getPlayer(ctx.from.id);

    const item = player.inventory.find(
        i => i.slot === slot &&
        String(i.id) === String(itemId)
    );

    if (!item) {
        return ctx.answerCbQuery('Item inválido');
    }

    player.equipment[slot] = item;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return renderSlot(ctx, slot);
}

async function handleUnequipItem(ctx) {
    const match =
        ctx.callbackQuery.data.match(/^unequip_(.+)$/);

    const slot = match[1];

    const player = getPlayer(ctx.from.id);

    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return renderSlot(ctx, slot);
}

module.exports = {
    handleInventory,
    handleEquipItem,
    handleUnequipItem,
    renderSlot
};