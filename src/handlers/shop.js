const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const {
    processPurchase,
    sellItem,
    sellItemByKey,
    calculateSellPrice,
    canBuyMultiple
} = require('../core/economy/shopLogic');
const {
    getWallet,
    getWalletInline,
    getWalletText,
    getCurrencyBalance,
    formatNumber,
    syncWalletToPlayer,
    clonePlain
} = require('../core/economy/walletPresenter');
const { shopItems } = require('../data/shopItems');
const { shopMainMenu, shopTabsMenu, renderShop } = require('../menus/shopMenu');
const { getItemKey } = require('../core/player/equipmentService');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');

const activePurchases = new Set();
const SELL_PAGE_SIZE = 8;
const QUICK_BUY_AMOUNTS = [1, 5, 10];
const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━';

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

function safeItemName(value = '') {
    const name = String(value || '').trim();
    return name || 'Item desconhecido';
}

function getCurrencyLabel(currency) {
    const labels = {
        gold: 'ouro',
        nox: 'Nox',
        glorias: 'glórias'
    };

    return labels[currency] || currency || 'moeda';
}

function getCurrencyIcon(currency) {
    const icons = {
        gold: '💰',
        nox: '💎',
        glorias: '🏅'
    };

    return icons[currency] || '💰';
}

function getPlayerBalance(player, currency) {
    return getCurrencyBalance(player, currency);
}

function getShopItemsByTab(tab) {
    return SHOP_ITEMS_BY_TAB.get(tab) || [];
}

function getShopItemById(itemId) {
    return SHOP_ITEMS_BY_ID.get(itemId) || null;
}

function getShopItemTypeLabel(item = {}) {
    if (item.type === 'consumable') return 'Consumível';
    if (item.type === 'equipment') {
        if (item.slot === 'weapon') return 'Arma';
        if (item.slot === 'shield') return 'Mão Secundária';
        if (item.slot === 'ring' || item.slot === 'necklace') return 'Joia';
        return 'Equipamento';
    }
    if (item.type === 'vip') return 'VIP';
    if (item.type === 'cosmetic') return 'Cosmético';
    if (item.type === 'inventoryExpansion') return 'Expansão de Inventário';
    if (item.type === 'bundle') return 'Pacote';
    return 'Item';
}

function getPurchaseDeliveryText(item = {}) {
    if (item.type === 'vip') return 'Ativa imediatamente.';
    if (item.type === 'cosmetic') return 'Desbloqueio permanente no perfil.';
    if (item.type === 'inventoryExpansion') return 'Aumenta permanentemente o limite do inventário.';
    if (item.type === 'bundle') return 'Entrega consumíveis e cosmético de compra única.';
    if (item.type === 'equipment') return 'Vai para o inventário.';
    if (item.effect === 'energyRefill') return 'Aplica imediatamente.';
    if (item.effect === 'keys') return 'Adiciona chave ao personagem.';
    if (item.type === 'consumable') return 'Vai para os consumíveis do inventário.';
    return 'Aplicado ao personagem.';
}

function getTabTitle(tab) {
    const titles = {
        village: '🧪 *SUPRIMENTOS*',
        castle: '👑 *PREMIUM*',
        arena: '⚔️ *ARENA*',
        premium: '💎 *PREMIUM*'
    };

    return titles[tab] || '🛒 *LOJA*';
}

function getTabDescription(tab) {
    const descriptions = {
        village: 'Poções e tônicos para manter sua caçada viva.',
        castle: 'VIP, cosméticos e conveniência sem vender poder direto.',
        arena: 'Recursos competitivos comprados com glórias.',
        premium: 'Conveniência, cosméticos e vantagens de qualidade de vida.'
    };

    return descriptions[tab] || 'Escolha um item.';
}

function getTabTip(tab) {
    const tips = {
        village: 'Ideal para sobreviver mais tempo e sustentar sessões longas.',
        castle: 'Foco em conforto, aparência e progressão sem pay-to-win.',
        arena: 'Use glórias para preparar disputas e manter ritmo competitivo.'
    };

    return tips[tab] || 'Toque em um item para analisar antes de comprar.';
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

function getSellLongStats(item = {}) {
    const parts = [];

    if (Number(item.atk || 0) > 0) parts.push(`⚔️ ATK +${item.atk}`);
    if (Number(item.def || 0) > 0) parts.push(`🛡️ DEF +${item.def}`);
    if (Number(item.hp || 0) > 0) parts.push(`❤️ HP +${item.hp}`);
    if (Number(item.crit || 0) > 0) parts.push(`💥 CRIT +${item.crit}%`);

    return parts.length ? parts.join('\n') : 'Sem bônus relevantes.';
}

function isValidShopPlayer(player) {
    return Boolean(player && typeof player === 'object' && !Array.isArray(player));
}

function getUsablePlayerOverride(candidate) {
    /*
    Telegraf chama handlers como handler(ctx, next).
    Portanto, em handlers registrados diretamente, o segundo argumento pode ser
    a função next, não um player. Nunca use candidato function como player.
    */
    return isValidShopPlayer(candidate) ? candidate : null;
}

function normalizeShopPlayer(player) {
    if (!isValidShopPlayer(player)) return null;

    const plain = clonePlain(player);
    const normalized = syncWalletToPlayer(plain);

    // Campos usados pelos fluxos de venda/compra precisam continuar disponíveis.
    normalized.inventory ??= Array.isArray(plain.inventory) ? plain.inventory : [];
    normalized.consumables ??= plain.consumables || {};
    normalized.cosmetics ??= Array.isArray(plain.cosmetics) ? plain.cosmetics : [];
    normalized.equipment ??= plain.equipment || {};
    normalized.vip ??= plain.vip || false;
    normalized.vipExpires ??= plain.vipExpires || null;
    normalized.bonusInventory ??= Number(plain.bonusInventory || 0);
    normalized.maxInventory ??= Number(plain.maxInventory || 20);
    normalized.energy ??= Number(plain.energy || 0);
    normalized.maxEnergy ??= Number(plain.maxEnergy || 20);
    normalized.keys ??= Number(plain.keys || 0);
    normalized.purchasedBundles ??= Array.isArray(plain.purchasedBundles) ? plain.purchasedBundles : [];
    normalized.id ??= plain.id || plain._id || null;

    return normalized;
}

async function resolveShopPlayer(ctx, playerOverride = null) {
    const usableOverride = getUsablePlayerOverride(playerOverride);
    const rawPlayer = usableOverride || await getPlayer(ctx.from.id);
    return normalizeShopPlayer(rawPlayer);
}

async function getShopPlayer(userId) {
    const player = await getPlayer(userId);
    return normalizeShopPlayer(player);
}

async function renderMissingPlayer(ctx) {
    return safeEdit(
        ctx,
        '⚠️ *Personagem não encontrado*\n\nUse /start para criar ou carregar seu personagem antes de acessar a loja.',
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Menu principal', 'menu')]
            ])
        }
    );
}

async function renderTab(ctx, tab, playerOverride = null) {
    const player = await resolveShopPlayer(ctx, playerOverride);
    if (!player) return renderMissingPlayer(ctx);

    const items = getShopItemsByTab(tab);

    const header =
        `${getTabTitle(tab)}\n` +
        `${DIVIDER}\n` +
        `${getWalletInline(player)}\n\n` +
        `${getTabDescription(tab)}\n` +
        `_${getTabTip(tab)}_\n`;

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
    let text = `💰 *VENDER LOOT*\n`;
    text += `${DIVIDER}\n`;
    text += `${getWalletInline(player)}\n\n`;

    if (!pageData.items.length) {
        text +=
            `Nenhum item vendável no inventário.\n\n` +
            `Itens equipados ficam protegidos e não aparecem aqui. Para vender um equipamento, primeiro desequipe no inventário.`;
        return text;
    }

    text += `Transforme itens parados em ouro para sustentar sua progressão.\n`;
    text += `_Página ${pageData.page}/${pageData.totalPages} • toque para revisar antes de vender._\n`;

    pageData.items.forEach((entry, index) => {
        text += `\n${DIVIDER}\n`;
        text += `${String(index + 1).padStart(2, '0')} • *${escapeMarkdown(entry.name)}* [Lv${entry.level}]\n`;
        text += `${escapeMarkdown(entry.rarity)} • ${escapeMarkdown(entry.categoryLabel)}\n`;
        text += `${escapeMarkdown(entry.stats)}\n`;
        text += `💰 Venda: ${formatNumber(entry.price)} ouro\n`;
    });

    return text;
}

function buildSellKeyboard(pageData) {
    const keyboard = [];

    pageData.items.forEach(entry => {
        keyboard.push([
            Markup.button.callback(
                `💰 ${entry.name} • ${formatNumber(entry.price)} ouro`,
                `sell_preview_${entry.sourceIndex}`
            )
        ]);
    });

    const navRow = [];

    if (pageData.page > 1) {
        navRow.push(Markup.button.callback('⬅️ Anterior', `shop_sell_page_${pageData.page - 1}`));
    }

    if (pageData.page < pageData.totalPages) {
        navRow.push(Markup.button.callback('Próxima ➡️', `shop_sell_page_${pageData.page + 1}`));
    }

    if (navRow.length) keyboard.push(navRow);

    keyboard.push([Markup.button.callback('◀️ Voltar ao mercado', 'shop')]);

    return Markup.inlineKeyboard(keyboard);
}

async function renderSellPage(ctx, page = 1, playerOverride = null) {
    try {
        const player = await resolveShopPlayer(ctx, playerOverride);
        if (!player) return renderMissingPlayer(ctx);

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

function buildBuyDetailText(player, item, quantity = 1) {
    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const unitPrice = Number(item.price || 0);
    const totalPrice = unitPrice * safeQuantity;
    const balance = getPlayerBalance(player, item.currency);
    const after = balance - totalPrice;
    const missing = Math.max(0, totalPrice - balance);
    const canPay = balance >= totalPrice;
    const symbol = getCurrencyIcon(item.currency);
    const currency = getCurrencyLabel(item.currency);

    let text = `🛒 *CONFIRMAR COMPRA*\n`;
    text += `${DIVIDER}\n\n`;
    text += `*${escapeMarkdown(item.name)}*\n`;
    text += `${escapeMarkdown(item.description || 'Sem descrição')}\n\n`;
    text += `Tipo: ${escapeMarkdown(getShopItemTypeLabel(item))}\n`;
    text += `Entrega: ${escapeMarkdown(getPurchaseDeliveryText(item))}\n\n`;
    text += `Quantidade: ${safeQuantity}\n`;
    text += `Preço unitário: ${symbol} ${formatNumber(unitPrice)} ${escapeMarkdown(currency)}\n`;
    text += `Total: ${symbol} ${formatNumber(totalPrice)} ${escapeMarkdown(currency)}\n\n`;
    text += `Saldo atual: ${symbol} ${formatNumber(balance)}\n`;

    if (canPay) {
        text += `Após compra: ${symbol} ${formatNumber(after)}\n\n`;
        text += `✅ Compra segura. Confirme para concluir.`;
    } else {
        text += `Faltam: ${symbol} ${formatNumber(missing)}\n\n`;
        text += `🔒 Saldo insuficiente.`;
    }

    return text;
}

function buildBuyDetailKeyboard(item, player, quantity = 1) {
    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const totalPrice = Number(item.price || 0) * safeQuantity;
    const canPay = getPlayerBalance(player, item.currency) >= totalPrice;
    const rows = [];

    if (canBuyMultiple(item)) {
        rows.push(QUICK_BUY_AMOUNTS.map(amount => Markup.button.callback(
            amount === safeQuantity ? `✅ x${amount}` : `x${amount}`,
            `buy_${item.id}:${amount}`
        )));
    }

    if (canPay) {
        rows.push([Markup.button.callback(`✅ Confirmar x${safeQuantity}`, `shop_buy_confirm:${item.id}:${safeQuantity}`)]);
    }

    rows.push([Markup.button.callback('◀️ Voltar à loja', `shop_backtab:${item.shop}`)]);

    return Markup.inlineKeyboard(rows);
}

function getInventoryItemByIndex(player, itemIndex) {
    if (!Array.isArray(player?.inventory)) return null;
    if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= player.inventory.length) return null;
    return player.inventory[itemIndex] || null;
}

function buildSellPreviewText(player, item, itemIndex) {
    const wallet = getWallet(player);
    const price = calculateSellPrice(item);
    const categoryLabel = getSellCategoryLabel(item);

    let text = `💰 *CONFIRMAR VENDA*\n`;
    text += `${DIVIDER}\n\n`;
    text += `${item.emoji || '📦'} *${escapeMarkdown(safeItemName(item.name))}*\n`;
    text += `${escapeMarkdown(item.rarity || 'Comum')} • ${escapeMarkdown(categoryLabel)} • Lv.${Math.max(1, Number(item.level || 1))}\n\n`;
    text += `*Atributos*\n${escapeMarkdown(getSellLongStats(item))}\n\n`;
    text += `Valor de venda: 💰 ${formatNumber(price)} ouro\n`;
    text += `Ouro atual: 💰 ${formatNumber(wallet.gold)}\n`;
    text += `Após venda: 💰 ${formatNumber(wallet.gold + price)}\n\n`;
    text += `⚠️ Venda permanente. Não dá para desfazer.`;

    return text;
}

function buildSellPreviewKeyboard(itemIndex) {
    return Markup.inlineKeyboard([
        [Markup.button.callback('✅ Confirmar venda', `sell_confirm_${itemIndex}`)],
        [Markup.button.callback('◀️ Voltar aos itens', 'shop_sell')]
    ]);
}

async function handleShop(ctx, playerOverride = null) {
    const player = await resolveShopPlayer(ctx, playerOverride);
    if (!player) return renderMissingPlayer(ctx);

    const msg =
        `🛒 *MERCADO DE NOCTRA*\n` +
        `${DIVIDER}\n` +
        `${getWalletInline(player)}\n\n` +
        `Escolha como quer movimentar sua economia.\n\n` +
        `🛍️ *Comprar itens*\n` +
        `Poções, VIP, cosméticos e recursos úteis.\n\n` +
        `💰 *Vender loot*\n` +
        `Converta itens parados em ouro sem vender por acidente.`;

    return safeEdit(ctx, msg, { parse_mode: 'Markdown', ...shopMainMenu() });
}

async function handleShopBuyMenu(ctx, playerOverride = null) {
    const player = await resolveShopPlayer(ctx, playerOverride);
    if (!player) return renderMissingPlayer(ctx);

    const msg =
        `🛍️ *ESCOLHA UMA LOJA*\n` +
        `${DIVIDER}\n` +
        `${getWalletInline(player)}\n\n` +
        `🧪 *Suprimentos*\n` +
        `Poções e tônicos para sobreviver mais.\n\n` +
        `👑 *Premium*\n` +
        `VIP, cosméticos e conveniência ética.\n\n` +
        `⚔️ *Arena*\n` +
        `Recursos competitivos comprados com glórias.`;

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
    try {
        const itemId = ctx.match?.[1];
        const quantity = Number(ctx.match?.[2] || 1);

        if (!itemId) {
            return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        }

        const player = await getShopPlayer(ctx.from.id);
        if (!player) return safeAnswer(ctx, '⚠️ Personagem não encontrado. Use /start.', { show_alert: true });

        const item = getShopItemById(itemId);

        if (!item) {
            return safeAnswer(ctx, '❌ Item não encontrado.', { show_alert: true });
        }

        if (quantity > 1 && !canBuyMultiple(item)) {
            return safeAnswer(ctx, '❌ Este item não pode ser comprado em quantidade.', { show_alert: true });
        }

        return safeEdit(ctx, buildBuyDetailText(player, item, quantity), {
            parse_mode: 'Markdown',
            ...buildBuyDetailKeyboard(item, player, quantity)
        });
    } catch (error) {
        console.error('Erro ao abrir detalhe de compra:', error);
        return safeAnswer(ctx, '❌ Erro ao abrir item.', { show_alert: true });
    }
}

async function handleBuyConfirm(ctx) {
    const playerId = String(ctx.from.id);

    if (activePurchases.has(playerId)) {
        return safeAnswer(ctx, '⏳ Compra em andamento...', { show_alert: true });
    }

    activePurchases.add(playerId);

    try {
        const itemId = ctx.match?.[1];
        const quantity = Math.max(1, Number(ctx.match?.[2] || 1));

        const player = await getShopPlayer(ctx.from.id);
        if (!player) return safeAnswer(ctx, '⚠️ Personagem não encontrado. Use /start.', { show_alert: true });

        const item = getShopItemById(itemId);

        if (!item) {
            return safeAnswer(ctx, '❌ Item não encontrado.', { show_alert: true });
        }

        const result = await processPurchase(player, item, quantity);
        if (!result?.success) {
            return safeAnswer(ctx, result?.message || '❌ Compra falhou.', { show_alert: true });
        }

        await savePlayer(ctx.from.id, player);
        await safeAnswer(ctx, result.message || `✅ ${item.name} comprado!`, { show_alert: true });
        return redirectAfterPurchase(ctx, item.shop, player);
    } catch (error) {
        console.error('Erro ao confirmar compra:', error);
        return safeAnswer(ctx, '❌ Erro ao processar compra.', { show_alert: true });
    } finally {
        activePurchases.delete(playerId);
    }
}

async function handleBuyQuantity(ctx) {
    return handleBuy(ctx);
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

async function handleSellPreview(ctx) {
    try {
        const match = ctx.match?.[1];
        const itemIndex = parseInt(match, 10);

        if (!Number.isInteger(itemIndex) || itemIndex < 0) {
            return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        }

        const player = await getShopPlayer(ctx.from.id);
        if (!player) return safeAnswer(ctx, '⚠️ Personagem não encontrado. Use /start.', { show_alert: true });

        const item = getInventoryItemByIndex(player, itemIndex);

        if (!item) {
            return safeAnswer(ctx, '❌ Item não encontrado.', { show_alert: true });
        }

        return safeEdit(ctx, buildSellPreviewText(player, item, itemIndex), {
            parse_mode: 'Markdown',
            ...buildSellPreviewKeyboard(itemIndex)
        });
    } catch (error) {
        console.error('Erro ao abrir preview de venda:', error);
        return safeAnswer(ctx, '❌ Erro ao abrir item.', { show_alert: true });
    }
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

        const player = await getShopPlayer(ctx.from.id);
        if (!player) return safeAnswer(ctx, '⚠️ Personagem não encontrado. Use /start.', { show_alert: true });

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

        const player = await getShopPlayer(ctx.from.id);
        if (!player) return safeAnswer(ctx, '⚠️ Personagem não encontrado. Use /start.', { show_alert: true });

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
    handleBuyConfirm,
    handleBuyQuantity,
    handleShopBackTab,
    handleShopSell,
    handleShopSellPage,
    handleSellPreview,
    handleSellConfirm,
    handleSellConfirmByKey,

    __private: {
        buildBuyDetailText,
        buildSellPreviewText,
        buildSellInventory,
        getPurchaseDeliveryText,
        getWalletInline,
        getWalletText,
        getShopItemTypeLabel,
        getPlayerBalance,
        normalizeShopPlayer,
        isValidShopPlayer,
        getUsablePlayerOverride,
        resolveShopPlayer,
        renderMissingPlayer
    }
};
