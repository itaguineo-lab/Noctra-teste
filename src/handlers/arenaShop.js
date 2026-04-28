const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    ensureArenaState
} = require('../core/arena/arenaService');

const {
    migrateLegacyArenaCoinsToGlorias,
    getArenaGloriasBalance,
    spendArenaGlorias,
    formatNumber
} = require('../core/arena/arenaCurrency');

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

function getArenaItemIcon(item) {
    if (item.type === 'cosmetic') return '✨';
    if (item.type === 'energy') return '⚡';
    if (item.type === 'key') return '🗝️';
    if (item.effect === 'potionHp') return '❤️';
    if (item.effect === 'tonicStrength') return '💪';
    if (item.effect === 'tonicDefense') return '🛡️';
    return '🛒';
}

function buildArenaSections() {
    const order = ['Tático', 'Conveniência', 'Prestígio'];
    const grouped = new Map(order.map(group => [group, []]));

    for (const item of arenaShopItems) {
        const group = getArenaItemGroup(item);
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group).push(item);
    }

    return order
        .map(group => ({ group, items: grouped.get(group) || [] }))
        .filter(section => section.items.length > 0);
}

function buildArenaShopText(player, migrated = 0) {
    const sections = buildArenaSections();
    const balance = getArenaGloriasBalance(player, { includeLegacy: false });

    let text = `⚔️ *LOJA DA ARENA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏅 Glórias: *${formatNumber(balance)}*\n`;

    if (migrated > 0) {
        text += `\n🔁 ${formatNumber(migrated)} moedas antigas foram convertidas em Glórias.\n`;
    }

    text += `\nItens táticos, conveniência moderada e prestígio visual.\n`;
    text += `_Glórias são a moeda competitiva oficial da Arena._\n\n`;

    sections.forEach(section => {
        text += `*${section.group}*\n`;

        section.items.forEach((item, index) => {
            const icon = getArenaItemIcon(item);
            const canBuy = balance >= Number(item.price || 0);
            const status = canBuy ? '✅ Disponível' : `🔒 Faltam ${formatNumber(Number(item.price || 0) - balance)} glórias`;

            text += `${icon} *${item.name}*\n`;
            text += `🏅 ${formatNumber(item.price)} glórias\n`;
            text += `${status}\n`;
            text += `📜 ${item.description}\n`;
            if (index !== section.items.length - 1) {
                text += `\n`;
            }
        });

        text += `\n\n`;
    });

    return text.trim();
}

function buildArenaShopKeyboard(player) {
    const rows = [];
    const sections = buildArenaSections();
    const balance = getArenaGloriasBalance(player, { includeLegacy: false });

    sections.forEach(section => {
        section.items.forEach(item => {
            const canBuy = balance >= Number(item.price || 0);
            rows.push([
                Markup.button.callback(
                    `${canBuy ? '✅' : '🔒'} ${getArenaItemIcon(item)} ${item.name} • ${formatNumber(item.price)}🏅`,
                    `arena_shop_buy:${item.id}`
                )
            ]);
        });
    });

    rows.push([
        Markup.button.callback('🏟️ Arena', 'arena')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function handleArenaShop(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '❌ Jogador não encontrado.', Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Menu', 'menu')]
        ]));
    }

    ensureArenaState(player);
    const migration = migrateLegacyArenaCoinsToGlorias(player);

    if (migration.migrated > 0) {
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
    }

    return safeSend(
        ctx,
        buildArenaShopText(player, migration.migrated),
        buildArenaShopKeyboard(player)
    );
}

async function handleArenaShopBuy(ctx) {
    await safeAnswer(ctx);

    const itemId = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado.', { show_alert: true });
    }

    ensureArenaState(player);
    migrateLegacyArenaCoinsToGlorias(player);
    player.inventory ??= [];
    player.consumables ??= {};
    ensureCosmeticsState(player);

    const item = arenaShopItems.find(i => i.id === itemId);

    if (!item) {
        return safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
    }

    if (item.type === 'cosmetic') {
        const alreadyOwned = player.cosmetics.some(c => c.id === item.id);
        if (alreadyOwned) {
            return safeAnswer(ctx, '❌ Você já possui este cosmético.', { show_alert: true });
        }
    }

    const payment = spendArenaGlorias(player, item.price);
    if (!payment.success) {
        return safeAnswer(ctx, payment.message || '❌ Glórias insuficientes.', { show_alert: true });
    }

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
                    player.glorias += item.price;
                    return safeAnswer(ctx, cosmeticResult.message, { show_alert: true });
                }
                break;
            }

            default:
                player.glorias += item.price;
                return safeAnswer(ctx, '❌ Tipo de item inválido.', { show_alert: true });
        }

        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);

        await recordPurchaseMetrics({
            currency: 'glorias',
            amount: item.price,
            vip: false
        }).catch(() => {});

        await safeAnswer(ctx, `✅ ${item.name} comprado!`, { show_alert: true });
        return handleArenaShop(ctx);
    } catch (error) {
        console.error('Erro arena shop buy:', error);
        player.glorias += item.price;
        return safeAnswer(ctx, '❌ Erro ao processar compra.', { show_alert: true });
    }
}

module.exports = {
    handleArenaShop,
    handleArenaShopBuy,
    __private: {
        buildArenaShopText,
        buildArenaShopKeyboard,
        getArenaItemGroup,
        getArenaItemIcon
    }
};
