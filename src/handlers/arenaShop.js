const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    ensureArenaState
} = require('../core/arena/arenaService');

const {
    arenaShopItems
} = require('../data/arenaShopItems');

/*
=================================
HELPERS
=================================
*/

async function safeSend(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();

            return await ctx.editMessageText(
                text,
                {
                    parse_mode: 'Markdown',
                    ...keyboard
                }
            );
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

function buildArenaShopText(player) {
    let text = `🏪 *LOJA DA ARENA*\n\n`;

    text += `🪙 Saldo: ${player.arena.coins}\n\n`;

    arenaShopItems.forEach((item, index) => {
        text += `${index + 1}. *${item.name}*\n`;
        text += `💰 ${item.price} moedas\n`;
        text += `📜 ${item.description}\n\n`;
    });

    return text;
}

function buildArenaShopKeyboard() {
    const rows = arenaShopItems.map(item => [
        Markup.button.callback(
            `🛒 ${item.name}`,
            `arena_shop_buy:${item.id}`
        )
    ]);

    rows.push([
        Markup.button.callback('🏟️ Arena', 'arena')
    ]);

    return Markup.inlineKeyboard(rows);
}

/*
=================================
MENU
=================================
*/

async function handleArenaShop(ctx) {
    const player = await getPlayer(
        ctx.from.id
    );

    ensureArenaState(player);

    return safeSend(
        ctx,
        buildArenaShopText(player),
        buildArenaShopKeyboard()
    );
}

/*
=================================
BUY
=================================
*/

async function handleArenaShopBuy(ctx) {
    await ctx.answerCbQuery();

    const itemId = ctx.match?.[1];

    const player = await getPlayer(
        ctx.from.id
    );

    ensureArenaState(player);

    const item = arenaShopItems.find(
        i => i.id === itemId
    );

    if (!item) {
        return ctx.answerCbQuery(
            '❌ Item inválido.',
            { show_alert: true }
        );
    }

    if (player.arena.coins < item.price) {
        return ctx.answerCbQuery(
            '❌ Moedas insuficientes.',
            { show_alert: true }
        );
    }

    player.arena.coins -= item.price;

    player.inventory ??= [];
    player.consumables ??= {};
    player.cosmetics ??= [];

    switch (item.type) {
        case 'consumable':
            player.consumables[item.effect] =
                (player.consumables[item.effect] || 0) + item.value;
            break;

        case 'energy':
            player.energy = Math.min(
                player.maxEnergy,
                player.energy + item.value
            );
            break;

        case 'key':
            player.keys =
                (player.keys || 0) + item.value;
            break;

        case 'cosmetic':
            player.cosmetics.push({
                id: item.id,
                name: item.value
            });
            break;
    }

    await savePlayer(ctx.from.id, player);

    return ctx.answerCbQuery(
        `✅ ${item.name} comprado!`,
        { show_alert: true }
    );
}

module.exports = {
    handleArenaShop,
    handleArenaShopBuy
};