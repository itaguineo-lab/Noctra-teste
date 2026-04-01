const { getPlayer, savePlayer } = require('../core/player/playerService');
const { processPurchase } = require('../core/economy/shopLogic');
const { shopItems } = require('../data/shopItems');
const { shopTabsMenu, renderShop } = require('../menus/shopMenu');

async function safeEdit(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            return await ctx.editMessageText(text, options);
        }

        return await ctx.reply(text, options);
    } catch {
        return await ctx.reply(text, options);
    }
}

async function handleShop(ctx) {
    const player = getPlayer(ctx.from.id);

    const msg = `🛒 *Lojas de Noctra*\n💰 Ouro: ${player.gold} | 💎 Nox: ${player.nox} | 🏅 Glórias: ${player.glorias || 0}\n\nEscolha uma loja:`;

    return safeEdit(ctx, msg, {
        parse_mode: 'Markdown',
        ...shopTabsMenu()
    });
}

async function handleShopVillage(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = shopItems.filter(i => i.shop === 'village');
    const { text, keyboard } = renderShop('Vila (Ouro)', items, player);

    return safeEdit(ctx, text, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

async function handleShopCastle(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = shopItems.filter(i => i.shop === 'castle');
    const { text, keyboard } = renderShop('Castelo (Nox)', items, player);

    return safeEdit(ctx, text, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

async function handleShopArena(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = shopItems.filter(i => i.shop === 'arena');
    const { text, keyboard } = renderShop('Matadores (Glórias)', items, player);

    return safeEdit(ctx, text, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

async function handleBuy(ctx) {
    try {
        const itemId = ctx.match?.[1] || ctx.callbackQuery?.data?.replace(/^buy_/, '');

        if (!itemId) {
            return ctx.answerCbQuery('Item inválido.', { show_alert: true });
        }

        const player = getPlayer(ctx.from.id);
        const item = shopItems.find(i => i.id === itemId);

        if (!item) {
            return ctx.answerCbQuery('Item inválido.', { show_alert: true });
        }

        const result = processPurchase(player, item);

        if (!result.success) {
            return ctx.answerCbQuery(result.message, { show_alert: true });
        }

        savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(result.message, { show_alert: true });

        const currentShop = item.shop;
        if (currentShop === 'village') return handleShopVillage(ctx);
        if (currentShop === 'castle') return handleShopCastle(ctx);
        if (currentShop === 'arena') return handleShopArena(ctx);

        return handleShop(ctx);
    } catch (error) {
        console.error('Erro ao comprar:', error);
        return ctx.answerCbQuery('Erro ao processar compra.', { show_alert: true });
    }
}

module.exports = {
    handleShop,
    handleShopVillage,
    handleShopCastle,
    handleShopArena,
    handleBuy
};