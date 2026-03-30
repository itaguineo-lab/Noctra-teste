const { getPlayerSafe } = require('../utils/helpers');
const { savePlayer } = require('../core/player/playerService');
const { processPurchase } = require('../core/economy/shopLogic');
const { villageItems, castleItems, arenaItems } = require('../data/shop');
const { shopTabsMenu, renderShop } = require('../menus/shopMenu');
const { mainMenu } = require('../menus/mainMenu');

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch {
        await ctx.reply(text, options);
    }
}

async function handleShop(ctx) {
    const player = getPlayerSafe(ctx.from.id);
    const msg = `🛒 *Lojas de Noctra*\n💰 Ouro: ${player.gold} | 💎 Nox: ${player.nox} | 🏅 Glórias: ${player.glorias || 0}\n\nEscolha uma loja:`;
    await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...shopTabsMenu() });
}

async function handleShopVillage(ctx) {
    const player = getPlayerSafe(ctx.from.id);
    const { text, keyboard } = renderShop('Vila (Ouro)', villageItems, player);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleShopCastle(ctx) {
    const player = getPlayerSafe(ctx.from.id);
    const { text, keyboard } = renderShop('Castelo (Nox)', castleItems, player);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleShopArena(ctx) {
    const player = getPlayerSafe(ctx.from.id);
    const { text, keyboard } = renderShop('Matadores (Glórias)', arenaItems, player);
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleBuy(ctx, itemId) {
    const player = getPlayerSafe(ctx.from.id);
    
    // Buscar item nas três listas
    let item = [...villageItems, ...castleItems, ...arenaItems].find(i => i.id === itemId);
    if (!item) {
        return ctx.answerCbQuery('Item inválido.', true);
    }
    
    const result = processPurchase(player, item);
    if (result.success) {
        savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(result.message, true);
        // Recarrega a loja atual (precisa saber qual aba)
        await handleShopVillage(ctx); // ou passar contexto da aba atual
    } else {
        await ctx.answerCbQuery(result.message, true);
    }
}

module.exports = {
    handleShop,
    handleShopVillage,
    handleShopCastle,
    handleShopArena,
    handleBuy
};