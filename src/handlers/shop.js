const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    processPurchase
} = require('../core/economy/shopLogic');

const {
    shopItems
} = require('../data/shopItems');

const {
    shopTabsMenu,
    renderShop
} = require('../menus/shopMenu');

/*
=================================
ANTI DOUBLE BUY
=================================
*/

const activePurchases = new Set();

/*
=================================
HELPERS
=================================
*/

async function safeEdit(
    ctx,
    text,
    options = {}
) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();

            return await ctx.editMessageText(
                text,
                options
            );
        }

        return await ctx.reply(
            text,
            options
        );
    } catch {
        return await ctx.reply(
            text,
            options
        );
    }
}

function getWalletText(player) {
    return `╔════════════════════════╗
║ 💰 Ouro: ${player.gold || 0}
║ 💎 Nox: ${player.nox || 0}
║ 🏅 Glórias: ${player.glorias || 0}
╚════════════════════════╝`;
}

function getShopItemsByTab(tab) {
    return shopItems.filter(
        item => item.shop === tab
    );
}

function getTabTitle(tab) {
    const titles = {
        village:
            '🏘️ *Loja da Vila*',
        castle:
            '🏰 *Loja do Castelo*',
        arena:
            '⚔️ *Loja da Arena*',
        premium:
            '💎 *Loja Premium*'
    };

    return (
        titles[tab] ||
        '🛒 *Loja*'
    );
}

async function renderTab(
    ctx,
    tab
) {
    const player =
        await getPlayer(
            ctx.from.id
        );

    const items =
        getShopItemsByTab(tab);

    const header = `${getTabTitle(tab)}

${getWalletText(player)}

Escolha um item:`;

    const {
        text,
        keyboard
    } = renderShop(
        header,
        items,
        player
    );

    return safeEdit(
        ctx,
        text,
        {
            parse_mode:
                'Markdown',
            ...keyboard
        }
    );
}

async function redirectAfterPurchase(
    ctx,
    shopName
) {
    if (!shopName) {
        return handleShop(ctx);
    }

    return renderTab(
        ctx,
        shopName
    );
}

/*
=================================
SHOP MENU
=================================
*/

async function handleShop(ctx) {
    const player =
        await getPlayer(
            ctx.from.id
        );

    const msg = `🛒 *LOJAS DE NOCTRA*

${getWalletText(player)}

Escolha uma loja:`;

    return safeEdit(
        ctx,
        msg,
        {
            parse_mode:
                'Markdown',
            ...shopTabsMenu()
        }
    );
}

async function handleShopVillage(
    ctx
) {
    return renderTab(
        ctx,
        'village'
    );
}

async function handleShopCastle(
    ctx
) {
    return renderTab(
        ctx,
        'castle'
    );
}

async function handleShopArena(
    ctx
) {
    return renderTab(
        ctx,
        'arena'
    );
}

/*
=================================
BUY
=================================
*/

async function handleBuy(ctx) {
    const playerId =
        String(
            ctx.from.id
        );

    if (
        activePurchases.has(
            playerId
        )
    ) {
        return ctx.answerCbQuery(
            '⏳ Compra em andamento...',
            {
                show_alert: true
            }
        );
    }

    activePurchases.add(
        playerId
    );

    try {
        const itemId =
            ctx.match?.[1];

        if (!itemId) {
            return ctx.answerCbQuery(
                '❌ Item inválido.',
                {
                    show_alert: true
                }
            );
        }

        const player =
            await getPlayer(
                ctx.from.id
            );

        const item =
            shopItems.find(
                i =>
                    i.id ===
                    itemId
            );

        if (!item) {
            return ctx.answerCbQuery(
                '❌ Item não encontrado.',
                {
                    show_alert: true
                }
            );
        }

        const result =
            processPurchase(
                player,
                item
            );

        if (
            !result?.success
        ) {
            return ctx.answerCbQuery(
                result?.message ||
                    '❌ Compra falhou.',
                {
                    show_alert: true
                }
            );
        }

        await savePlayer(
            ctx.from.id,
            player
        );

        await ctx.answerCbQuery(
            result.message ||
                `✅ ${item.name} comprado!`,
            {
                show_alert: true
            }
        );

        return redirectAfterPurchase(
            ctx,
            item.shop
        );
    } catch (error) {
        console.error(
            'Erro ao comprar:',
            error
        );

        return ctx.answerCbQuery(
            '❌ Erro ao processar compra.',
            {
                show_alert: true
            }
        );
    } finally {
        activePurchases.delete(
            playerId
        );
    }
}

module.exports = {
    handleShop,
    handleShopVillage,
    handleShopCastle,
    handleShopArena,
    handleBuy
};