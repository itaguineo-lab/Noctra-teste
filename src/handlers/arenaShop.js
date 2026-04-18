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

const {
    addCosmeticToPlayer,
    ensureCosmeticsState
} = require('../core/player/cosmetics');

const {
    restoreEnergy,
    applyKeyReward,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const {
    recordPurchaseMetrics
} = require('../core/metrics/metricsService');

const {
    navigateText,
    safeAnswer
} = require('../utils/uiNavigator');

/*
=================================
HELPERS
=================================
*/

async function safeSend(ctx, text, keyboard) {
    return navigateText(ctx, text, {
        parse_mode: 'Markdown',
        ...(keyboard || {})
    });
}

function getArenaItemGroup(item) {
    if (item.type === 'cosmetic') return 'Prestígio';
    if (item.type === 'energy' || item.type === 'key') return 'Conveniência';
    return 'Tático';
}

function buildArenaShopText(player) {
    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏪 *LOJA DA ARENA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🪙 Moedas da Arena: *${player.arena.coins}*\n\n`;
    text += `Itens competitivos, utilidades táticas e prestígio visual.\n\n`;

    arenaShopItems.forEach((item, index) => {
        text += `${index + 1}. *${item.name}*\n`;
        text += `🏷️ ${getArenaItemGroup(item)}\n`;
        text += `💰 ${item.price} moedas\n`;
        text += `📜 ${item.description}\n\n`;
    });

    return text.trim();
}

function buildArenaShopKeyboard() {
    const rows = arenaShopItems.map(item => [
        Markup.button.callback(
            `🛒 ${item.name} (${item.price})`,
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
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.', Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu', 'menu')]
        ]));
    }

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
    await safeAnswer(ctx);

    const itemId = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado.', { show_alert: true });
    }

    ensureArenaState(player);
    player.inventory ??= [];
    player.consumables ??= {};
    ensureCosmeticsState(player);

    const item = arenaShopItems.find(i => i.id === itemId);

    if (!item) {
        return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
    }

    if (player.arena.coins < item.price) {
        return safeAnswer(ctx, '❌ Moedas insuficientes.', { show_alert: true });
    }

    if (item.type === 'cosmetic') {
        const alreadyOwned = player.cosmetics.some(c => c.id === item.id);
        if (alreadyOwned) {
            return safeAnswer(ctx, '❌ Você já possui este cosmético.', { show_alert: true });
        }
    }

    player.arena.coins -= item.price;

    try {
        switch (item.type) {
            case 'consumable':
                player.consumables[item.effect] =
                    (player.consumables[item.effect] || 0) + item.value;
                break;

            case 'energy':
                restoreEnergy(player, item.value);
                break;

            case 'key':
                applyKeyReward(player, item.value);
                break;

            case 'cosmetic': {
                const cosmeticResult = addCosmeticToPlayer(player, {
                    id: item.id,
                    name: item.value || item.name,
                    type: item.cosmeticType || item.skinType || 'badge'
                });

                if (!cosmeticResult.success) {
                    player.arena.coins += item.price;
                    return safeAnswer(ctx, cosmeticResult.message, { show_alert: true });
                }
                break;
            }

            default:
                player.arena.coins += item.price;
                return safeAnswer(ctx, '❌ Tipo de item inválido.', { show_alert: true });
        }

        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);

        await recordPurchaseMetrics({
            currency: 'arena_coins',
            amount: item.price,
            vip: false
        }).catch(() => {});

        await safeAnswer(ctx, `✅ ${item.name} comprado!`, { show_alert: true });
        return handleArenaShop(ctx);
    } catch (error) {
        console.error('Erro arena shop buy:', error);
        player.arena.coins += item.price;
        return safeAnswer(ctx, '❌ Erro ao processar compra.', { show_alert: true });
    }
}

module.exports = {
    handleArenaShop,
    handleArenaShopBuy
};