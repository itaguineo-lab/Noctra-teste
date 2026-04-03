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

function getWalletText(player) {
    return `💰 Ouro: ${player.gold}\n💎 Nox: ${player.nox}\n🏅 Glórias: ${player.glorias || 0}`;
}

function getShopItemsByTab(tab) {
    return shopItems.filter(item => item.shop === tab);
}

async function renderTab(ctx, tab, title) {
    const player = getPlayer(ctx.from.id);
    const items = getShopItemsByTab(tab);
    const { text, keyboard } = renderShop(`${title}\n\n${getWalletText(player)}`, items, player);
    return safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleShop(ctx) {
    const player = getPlayer(ctx.from.id);
    const msg = `🛒 *LOJAS DE NOCTRA*\n\n${getWalletText(player)}\n\nEscolha uma loja:`;
    return safeEdit(ctx, msg, { parse_mode: 'Markdown', ...shopTabsMenu() });
}

async function handleShopVillage(ctx) { return renderTab(ctx, 'village', '🏘️ *Loja da Vila*'); }
async function handleShopCastle(ctx) { return renderTab(ctx, 'castle', '🏰 *Loja do Castelo*'); }
async function handleShopArena(ctx) { return renderTab(ctx, 'arena', '⚔️ *Loja da Arena*'); }

async function redirectAfterPurchase(ctx, shopName) {
    switch (shopName) {
        case 'village': return handleShopVillage(ctx);
        case 'castle': return handleShopCastle(ctx);
        case 'arena': return handleShopArena(ctx);
        default: return handleShop(ctx);
    }
}

async function handleBuy(ctx) {
    try {
        const itemId = ctx.match?.[1];
        if (!itemId) return ctx.answerCbQuery('❌ Item inválido.', { show_alert: true });
        const player = getPlayer(ctx.from.id);
        const item = shopItems.find(i => i.id === itemId);
        if (!item) return ctx.answerCbQuery('❌ Item não encontrado.', { show_alert: true });
        const result = processPurchase(player, item);
        if (!result?.success) return ctx.answerCbQuery(result?.message || '❌ Compra falhou.', { show_alert: true });
        savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(result.message || '✅ Compra realizada!', { show_alert: true });
        return redirectAfterPurchase(ctx, item.shop);
    } catch (error) {
        console.error('Erro ao comprar:', error);
        return ctx.answerCbQuery('❌ Erro ao processar compra.', { show_alert: true });
    }
}

module.exports = { handleShop, handleShopVillage, handleShopCastle, handleShopArena, handleBuy };