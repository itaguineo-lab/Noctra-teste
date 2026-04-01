const { getPlayer, savePlayer } = require('../core/player/playerService');
const { processPurchase } = require('../core/economy/shopLogic');
const { shopItems } = require('../data/shop');
const { shopTabsMenu, renderShop } = require('../menus/shopMenu');

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch {
        await ctx.reply(text, options);
    }
}

async function handleShop(ctx) {
    const player = getPlayer(ctx.from.id);
    const msg = `🛒 *Lojas de Noctra*\n💰 Ouro: ${player.gold} | 💎 Nox: ${player.nox} | 🏅 Glórias: ${player.glorias || 0}\n\nEscolha uma loja:`;
    await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...shopTabsMenu() });
}

async function handleShopVillage(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = shopItems.filter(i => i.shop === 'village');
    const { text, keyboard } = renderShop('Vila (Ouro)', items, player);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleShopCastle(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = shopItems.filter(i => i.shop === 'castle');
    const { text, keyboard } = renderShop('Castelo (Nox)', items, player);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleShopArena(ctx) {
    const player = getPlayer(ctx.from.id);
    const items = shopItems.filter(i => i.shop === 'arena');
    const { text, keyboard } = renderShop('Matadores (Glórias)', items, player);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleBuy(ctx, itemId) {
    console.log(`🛒 Compra solicitada: ${itemId} por ${ctx.from.id}`);
    const player = getPlayer(ctx.from.id);
    const item = shopItems.find(i => i.id === itemId);
    if (!item) {
        console.log(`❌ Item não encontrado: ${itemId}`);
        return ctx.answerCbQuery('Item inválido.', true);
    }
    console.log(`✅ Item encontrado: ${item.name}, preço: ${item.price} ${item.currency}`);
    const result = processPurchase(player, item);
    console.log(`Resultado da compra: ${result.success} - ${result.message}`);
    if (result.success) {
        savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(result.message, true);
        const currentShop = item.shop;
        if (currentShop === 'village') await handleShopVillage(ctx);
        else if (currentShop === 'castle') await handleShopCastle(ctx);
        else if (currentShop === 'arena') await handleShopArena(ctx);
    } else {
        await ctx.answerCbQuery(result.message, true);
    }
}

module.exports = { handleShop, handleShopVillage, handleShopCastle, handleShopArena, handleBuy };