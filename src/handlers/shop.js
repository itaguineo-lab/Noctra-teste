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
const { getItemKey } = require('../core/player/equipmentService');
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
    await safeAnswer(ctx);
    return navigateText(ctx, text, options);
}

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function safeItemName(value = '') {
    const name = String(value || '').trim();
    return name || 'Item desconhecido';
}

function getWalletText(player) {
    return [
        `💰 Ouro: ${formatNumber(player.gold || 0)}`,
        `💎 Nox: ${formatNumber(player.nox || 0)}`,
        `🏅 Glórias: ${formatNumber(player.glorias || 0)}`
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

    const slot = String(item.slot || '').trim();
    if (slot === 'weapon') return 'Arma';
    if (slot === 'shield') return 'Mão Secundária';
    if (slot === 'armor') return 'Armadura';
    if (slot === 'boots') return 'Botas';
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
        .map((item, sourceIndex) => {
            try {
                if (!item || typeof item !== 'object') return null;

                const key = getItemKey(item);
                const name = safeItemName(item.name);
                const price = calculateSellPrice(item);

                if (!key || !Number.isFinite(Number(price)) || Number(price) <= 0) {
                    return null;
                }

                return {
                    sourceIndex,
                    key,
                    name,
                    rarity: item.rarity || 'Comum',
                    categoryLabel: getSellCategoryLabel(item),
                    level: Math.max(1, Number(item.level || 1)),
                    stats: getSellShortStats(item),
                    price: Number(price),
                    item
                };
            } catch (error) {
                console.error('Item inválido ignorado na loja de venda:', error?.message);
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => b.price - a.price);
}

function paginate(items, page, pageSize) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
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
        text +=
            `Você não possui itens vendáveis no inventário.\n\n` +
            `Itens equipados não aparecem aqui. Para vender um equipamento, primeiro desequipe no inventário.`;
        return text;
    }

    text += `Página ${pageData.page}/${pageData.totalPages}\n\n`;

    pageData.items.forEach((entry, index) => {
        text += `${index + 1}. *${escapeMarkdown(entry.name)}* [Lv${entry.level}]\n`;
        text += `   Tipo: ${escapeMarkdown(entry.categoryLabel)}\n`;
        text += `   Raridade: ${escapeMarkdown(entry.rarity)}\n`;
        text += `   Bônus: ${escapeMarkdown(entry.stats)}\n`;
        text += `   Valor: ${formatNumber(entry.price)} ouro\n\n`;
    });

    text += `Selecione um item para vender:`;
    return text;
}

function buildSellKeyboard(pageData) {
    const keyboard = [];

    pageData.items.forEach(entry => {
        /*
        IMPORTANTE:
        callback_data do Telegram tem limite curto.
        Antes usávamos a chave completa do item no botão, o que podia quebrar
        itens legados com IDs grandes e disparar BUTTON_DATA_INVALID.
        Agora usamos o índice real do item no inventário, que é curto e seguro.
        */
        keyboard.push([
            Markup.button.callback(
                `${entry.name} (${entry.categoryLabel}) • ${formatNumber(entry.price)}💰`,
                `sell_confirm_${entry.sourceIndex}`
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
    try {
        const player = playerOverride || await getPlayer(ctx.from.id);
        const sellable = buildSellInventory(player);
        const pageData = paginate(sellable, page, SELL_PAGE_SIZE);
        const text = renderSellText(player, pageData);
        const keyboard = buildSellKeyboard(pageData);

        return safeEdit(ctx, text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (error) {
        console.error('Erro ao renderizar página de venda:', error);
        await safeAnswer(ctx, '❌ Erro ao abrir venda. Tente novamente.', { show_alert: true });
        return null;
    }
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
                    `Comprar x${amount} (${formatNumber(totalPrice)})`,
                    `shop_buyqty:${item.id}:${amount}`
                )
            ];
        });

        buttons.push([Markup.button.callback('◀️ Voltar', `shop_backtab:${item.shop}`)]);

        const text =
            `🛒 *${escapeMarkdown(item.name)}*\n\n` +
            `${escapeMarkdown(item.description || 'Sem descrição')}\n\n` +
            `💰 Preço unitário: ${formatNumber(item.price)} ${escapeMarkdown(item.currency)}\n` +
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
    try {
        const match = ctx.match?.[1];
        if (match === undefined) {
            return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        }

        const itemIndex = parseInt(match, 10);
        if (!Number.isInteger(itemIndex) || itemIndex < 0) {
            return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        }

        const player = await getPlayer(ctx.from.id);
        const result = sellItem(player, itemIndex);

        if (!result.success) {
            return safeAnswer(ctx, result.message, { show_alert: true });
        }

        await savePlayer(ctx.from.id, player);
        await safeAnswer(ctx, result.message, { show_alert: true });
        return renderSellPage(ctx, 1, player);
    } catch (error) {
        console.error('Erro ao vender item:', error);
        return safeAnswer(ctx, '❌ Erro ao vender item.', { show_alert: true });
    }
}

async function handleSellConfirmByKey(ctx) {
    try {
        const itemKey = ctx.match?.[1];
        if (!itemKey) {
            return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        }

        let decodedKey = '';
        try {
            decodedKey = decodeURIComponent(itemKey);
        } catch {
            decodedKey = String(itemKey || '');
        }

        const player = await getPlayer(ctx.from.id);
        const result = sellItemByKey(player, decodedKey);

        if (!result.success) {
            return safeAnswer(ctx, result.message, { show_alert: true });
        }

        await savePlayer(ctx.from.id, player);
        await safeAnswer(ctx, result.message, { show_alert: true });
        return renderSellPage(ctx, 1, player);
    } catch (error) {
        console.error('Erro ao vender item por chave:', error);
        return safeAnswer(ctx, '❌ Erro ao vender item.', { show_alert: true });
    }
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
