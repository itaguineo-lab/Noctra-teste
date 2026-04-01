const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const SLOT_MAP = {
    inv_weapons: 'weapon',
    inv_armors: 'armor',
    inv_jewelry: 'necklace',
    inv_consumables: 'consumable',
    inv_souls: 'soul'
};

const SLOT_LABEL = {
    weapon: '⚔️ Armas',
    armor: '🛡️ Armaduras',
    necklace: '📿 Colares',
    ring: '💍 Anéis',
    boots: '🥾 Botas',
    quiver: '🏹 Aljava',
    backpack: '🎒 Mochila'
};

function slotEmoji(slot) {
    return {
        weapon: '⚔️',
        armor: '🛡️',
        necklace: '📿',
        ring: '💍',
        boots: '🥾',
        quiver: '🏹',
        backpack: '🎒'
    }[slot] || '🎒';
}

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

function buildMainInventoryMenu() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('⚔️ Armas', 'inv_weapons')],
        [Markup.button.callback('🛡️ Armaduras', 'inv_armors')],
        [Markup.button.callback('📿 Colares', 'inv_jewelry')],
        [Markup.button.callback('🧪 Consumíveis', 'inv_consumables')],
        [Markup.button.callback('💀 Almas', 'inv_souls')],
        [Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

function buildSlotMenu(player, slot) {
    const items = player.inventory.filter(
        item => item.slot === slot
    );

    const rows = items.map(item => {
        const equipped =
            player.equipment?.[slot]?.id === item.id;

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
        `${slotEmoji(slot)} *${SLOT_LABEL[slot] || slot}*`,
        buildSlotMenu(player, slot)
    );
}

async function handleInventory(ctx) {
    return safeReply(
        ctx,
        '🎒 *INVENTÁRIO*',
        buildMainInventoryMenu()
    );
}

async function handleInvWeapons(ctx) {
    return renderSlot(ctx, 'weapon');
}

async function handleInvArmors(ctx) {
    return renderSlot(ctx, 'armor');
}

async function handleInvJewelry(ctx) {
    return renderSlot(ctx, 'necklace');
}

async function handleInvConsumables(ctx) {
    const player = getPlayer(ctx.from.id);

    const text = `🧪 *CONSUMÍVEIS*

❤️ Vida: ${player.consumables?.potionHp || 0}
⚡ Energia: ${player.consumables?.potionEnergy || 0}
💪 Força: ${player.consumables?.tonicStrength || 0}
🛡️ Defesa: ${player.consumables?.tonicDefense || 0}`;

    return safeReply(
        ctx,
        text,
        buildMainInventoryMenu()
    );
}

async function handleInvSouls(ctx) {
    return safeReply(
        ctx,
        '💀 *ALMAS*\n\nSistema em expansão.',
        buildMainInventoryMenu()
    );
}

async function handleEquipItem(ctx) {
    const match =
        ctx.callbackQuery.data.match(/^equip_(.+)_(.+)$/);

    const slot = match[1];
    const itemId = match[2];

    const player = getPlayer(ctx.from.id);

    const item = player.inventory.find(
        i =>
            i.slot === slot &&
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

async function handleEquipSoul(ctx) {
    return ctx.answerCbQuery('💀 Em breve');
}

async function handleUnequipSoul(ctx) {
    return ctx.answerCbQuery('💀 Em breve');
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
    handleUnequipSoul,
    renderSlot
};