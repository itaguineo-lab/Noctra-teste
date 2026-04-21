const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const {
    processPurchase,
    sellItem,
    sellItemByKey,
    calculateSellPrice,
    canBuyMultiple
} = require('../core/economy/shopLogic');
const { shopItems } = require('../data/shopItems');
const { shopMainMenu, shopTabsMenu, renderShop } = require('../menus/shopMenu');
const { getItemKey } = require('../core/player/playerMutations');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');

const activePurchases = new Set();
const SELL_PAGE_SIZE = 8;
const QUICK_BUY_AMOUNTS = [1, 5, 10];

const SHOP_ITEMS_BY_ID = new Map();
const SHOP_ITEMS_BY_TAB = new Map();
for (const item of shopItems) {
    SHOP_ITEMS_BY_ID.set(item.id, item);
    if (!SHOP_ITEMS_BY_TAB.has(item.shop)) {
        SHOP_ITEMS_BY_TAB.set(item.shop, []);
    }
    SHOP_ITEMS_BY_TAB.get(item.shop).push(item);
}

async function safeEdit(ctx, text, options = {}) {
    await safeAnswer(ctx).catch?.(() => {});
    return navigateText(ctx, text, options);
}

function getWalletText(player) {
    return [
        `💰 Ouro: ${player.gold || 0}`,
        `💎 Nox: ${player.nox || 0}`,
        `🏅 Glórias: ${player.glorias || 0}`
    ].join('\n');
}

function getShopItemsByTab(tab) {
    return SHOP_ITEMS_BY_TAB.get(tab) || [];
}

function getShopItemById(itemId) {
    return SHOP_ITEMS_BY_ID.get(itemId) || null;
}

function getTabTitle(tab) {
    const titles = {
        village: '🏘️ *Loja da Vila*',
        castle: '🏰 *Loja do Castelo*',
        arena: '⚔️ *Loja da Arena*',
        premium: '💎 *Loja Premium*'
    };
    return titles[tab] || '🛒 *Loja*';
}

function getTabDescription(tab) {
    const descriptions = {
        village: 'Consumíveis e itens básicos para sustentar o começo da jornada.',
        castle: 'Equipamentos mais fortes para builds e progressão mais sólida.',
        arena: 'Itens ligados à disputa, prestígio e evolução competitiva.',
        premium: 'Conveniência, cosméticos e vantagens de qualidade de vida.'
    };

    return descriptions[tab] || 'Escolha um item.';
}

function getSellCategoryLabel(item = {}) {
    if (item.displayCategory) return item.displayCategory;

    const slot = String(item.slot || '');
    if (slot === 'weapon') return 'Arma';
    if (slot === 'shield' || slot === 'armor' || slot === 'boots') return 'Armadura';
    if (slot === 'ring' || slot === 'necklace') return 'Joia';
    return 'Item';
}

function getSellShortStats(item = {}) {
    const parts = [];
    if (Number(item.atk || 0) > 0) parts.push(`ATK+${item.atk}`);
    if (Number(item.def || 0) > 0) parts.push(`DEF+${item.def}`);
    if (Number(item.hp || 0) > 0) parts.push(`HP+${item.hp}`);
    if (Number(item.crit || 0) > 0) parts.push(`CRIT+${item.crit}%`);
    return parts.join(', ') || 'Sem bônus';
}

async function renderTab(ctx, tab, playerOverride = null) {
    const player = playerOverride || await getPlayer(ctx.from.id);
    const items = getShopItemsByTab(tab);

    const header =
        `${getTabTitle(tab)}\n\n` +
        `${getWalletText(player)}\n\n` +
        `${getTabDescription(tab)}\n\n` +
        `Escolha um item:`;

    const { text, keyboard } = renderShop(header, items, player);
    return safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function redirectAfterPurchase(ctx, shopName, playerOverride = null) {
    if (!shopName) return handleShop(ctx, playerOverride);
    return renderTab(ctx, shopName, playerOverride);
}

function buildSellInventory(player) {
    const inventory = Array.isArray(player.inventory) ? player.inventory : [];

    return inventory
        .map(item => ({
            key: getItemKey(item),
            name: item.name,
            rarity: item.rarity || 'Comum',
            categoryLabel: getSellCategoryLabel(item),
            level: item.level || 1,
            stats: getSellShortStats(item),
            price: calculateSellPrice(item),
            item
        }))
        .sort((a, b) => b.price - a.price);
}

function paginate(items, page, pageSize) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;

    return {
        page: safePage,
        totalPages,
        items: items.slice(start, start + pageSize)
    };
}

function renderSellText(player, pageData) {
    let text = `💰 *VENDER ITENS*\n\n`;
    text += `${getWalletText(player)}\n\n`;

    if (!pageData.items.length) {
        text += `Você não possui itens vendáveis no inventário.`;
        return text;
    }

    text += `Página ${pageData.page}/${pageData.totalPages}\n\n`;

    pageData.items.forEach((entry, index) => {
        text += `${index + 1}. *${entry.name}* [Lv${entry.level}]\n`;
        text += `   Tipo: ${entry.categoryLabel}\n`;
        text += `   Raridade: ${entry.rarity}\n`;
        text += `   Bônus: ${entry.stats}\n`;
        text += `   Valor: ${entry.price} ouro\n\n`;
    });

    text += `Selecione um item para vender:`;
    return text;
}

function buildSellKeyboard(pageData) {
    const keyboard = [];

    pageData.items.forEach(entry => {
        keyboard.push([
            Markup.button.callback(
                `${entry.name} (${entry.categoryLabel}) • ${entry.price}💰`,
                `sell_confirm_key_${encodeURIComponent(entry.key)}`
            )
        ]);
    });

    const navRow = [];
    if (pageData.page > 1) {
        navRow.push(Markup.button.callback('⬅️', `shop_sell_page_${pageData.page - 1}`));
    }
    if (pageData.page < pageData.totalPages) {
        navRow.push(Markup.button.callback('➡️', `shop_sell_page_${pageData.page + 1}`));
    }
    if (navRow.length) keyboard.push(navRow);

    keyboard.push([Markup.button.callback('◀️ Voltar', 'shop')]);

    return Markup.inlineKeyboard(keyboard);
}

async function renderSellPage(ctx, page = 1, playerOverride = null) {
    const player = playerOverride || await getPlayer(ctx.from.id);
    const sellable = buildSellInventory(player);

    if (!sellable.length) {
        await safeAnswer(ctx, '❌ Você não tem itens para vender.', { show_alert: true });
        return handleShop(ctx, player);
    }

    const pageData = paginate(sellable, page, SELL_PAGE_SIZE);
    const text = renderSellText(player, pageData);
    const keyboard = buildSellKeyboard(pageData);

    return safeEdit(ctx, text, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

async function handleShop(ctx, playerOverride = null) {
    const player = playerOverride || await getPlayer(ctx.from.id);

    const msg =
        `🛒 *LOJAS DE NOCTRA*\n\n` +
        `${getWalletText(player)}\n\n` +
        `Escolha sua ação:\n` +
        `• Comprar para evoluir\n` +
        `• Vender para gerar caixa\n` +
        `• Usar a economia a favor da sua build`;

    return safeEdit(ctx, msg, { parse_mode: 'Markdown', ...shopMainMenu() });
}

async function handleShopBuyMenu(ctx, playerOverride = null) {
    const player = playerOverride || await getPlayer(ctx.from.id);

    const msg =
        `🛍️ *COMPRAR ITENS*\n\n` +
        `${getWalletText(player)}\n\n` +
        `Escolha a categoria da loja conforme seu objetivo:\n` +
        `• Vila = base\n` +
        `• Castelo = progressão\n` +
        `• Arena = competitivo\n` +
        `• Premium = conveniência`;

    return safeEdit(ctx, msg, { parse_mode: 'Markdown', ...shopTabsMenu() });
}

async function handleShopVillage(ctx) {
    return renderTab(ctx, 'village');
}

async function handleShopCastle(ctx) {
    return renderTab(ctx, 'castle');
}

async function handleShopArena(ctx) {
    return renderTab(ctx, 'arena');
}

async function handleBuy(ctx) {
    const playerId = String(ctx.from.id);

    if (activePurchases.has(playerId)) {
        return safeAnswer(ctx, '⏳ Compra em andamento...', { show_alert: true });
    }

    activePurchases.add(playerId);

    try {
        const itemId = ctx.match?.[1];
        if (!itemId) {
            return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        }

        const player = await getPlayer(ctx.from.id);
        const item = getShopItemById(itemId);

        if (!item) {
            return safeAnswer(ctx, '❌ Item não encontrado.', { show_alert: true });
        }

        if (!canBuyMultiple(item)) {
            const result = await processPurchase(player, item, 1);
            if (!result?.success) {
                return safeAnswer(ctx, result?.message || '❌ Compra falhou.', { show_alert: true });
            }

            await savePlayer(ctx.from.id, player);
            await safeAnswer(ctx, result.message || `✅ ${item.name} comprado!`, { show_alert: true });
            return redirectAfterPurchase(ctx, item.shop, player);
        }

        const buttons = QUICK_BUY_AMOUNTS.map(amount => {
            const totalPrice = item.price * amount;
            return [
                Markup.button.callback(
                    `Comprar x${amount} (${totalPrice})`,
                    `shop_buyqty:${item.id}:${amount}`
                )
            ];
        });

        buttons.push([Markup.button.callback('◀️ Voltar', `shop_backtab:${item.shop}`)]);

        const text =
            `🛒 *${item.name}*\n\n` +
            `${item.description || 'Sem descrição'}\n\n` +
            `💰 Preço unitário: ${item.price} ${item.currency}\n` +
            `Escolha a quantidade:`;

        return safeEdit(ctx, text, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        });
    } catch (error) {
        console.error('Erro ao comprar:', error);
        return safeAnswer(ctx, '❌ Erro ao processar compra.', { show_alert: true });
    } finally {
        activePurchases.delete(playerId);
    }
}

async function handleBuyQuantity(ctx) {
    const playerId = String(ctx.from.id);

    if (activePurchases.has(playerId)) {
        return safeAnswer(ctx, '⏳ Compra em andamento...', { show_alert: true });
    }

    activePurchases.add(playerId);

    try {
        const itemId = ctx.match?.[1];
        const quantity = Number(ctx.match?.[2] || 1);

        const player = await getPlayer(ctx.from.id);
        const item = getShopItemById(itemId);

        if (!item) {
            return safeAnswer(ctx, '❌ Item não encontrado.', { show_alert: true });
        }

        const result = await processPurchase(player, item, quantity);
        if (!result?.success) {
            return safeAnswer(ctx, result?.message || '❌ Compra falhou.', { show_alert: true });
        }

        await savePlayer(ctx.from.id, player);
        await safeAnswer(ctx, result.message || `✅ ${item.name} x${quantity} comprado!`, { show_alert: true });
        return redirectAfterPurchase(ctx, item.shop, player);
    } catch (error) {
        console.error('Erro ao comprar quantidade:', error);
        return safeAnswer(ctx, '❌ Erro ao processar compra.', { show_alert: true });
    } finally {
        activePurchases.delete(playerId);
    }
}

async function handleShopBackTab(ctx) {
    const tab = ctx.match?.[1];
    await safeAnswer(ctx);
    return renderTab(ctx, tab);
}

async function handleShopSell(ctx) {
    return renderSellPage(ctx, 1);
}

async function handleShopSellPage(ctx) {
    const page = parseInt(ctx.match?.[1], 10) || 1;
    return renderSellPage(ctx, page);
}

async function handleSellConfirm(ctx) {
    const match = ctx.match?.[1];
    if (match === undefined) {
        return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
    }

    const itemIndex = parseInt(match, 10);
    const player = await getPlayer(ctx.from.id);

    const result = sellItem(player, itemIndex);
    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    await savePlayer(ctx.from.id, player);
    await safeAnswer(ctx, result.message, { show_alert: true });
    return handleShop(ctx, player);
}

async function handleSellConfirmByKey(ctx) {
    const itemKey = ctx.match?.[1];
    if (!itemKey) {
        return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
    }

    const decodedKey = decodeURIComponent(itemKey);
    const player = await getPlayer(ctx.from.id);

    const result = sellItemByKey(player, decodedKey);
    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    await savePlayer(ctx.from.id, player);
    await safeAnswer(ctx, result.message, { show_alert: true });
    return renderSellPage(ctx, 1, player);
}

module.exports = {
    handleShop,
    handleShopBuyMenu,
    handleShopVillage,
    handleShopCastle,
    handleShopArena,
    handleBuy,
    handleBuyQuantity,
    handleShopBackTab,
    handleShopSell,
    handleShopSellPage,
    handleSellConfirm,
    handleSellConfirmByKey
};