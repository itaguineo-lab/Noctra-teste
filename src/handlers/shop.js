const { getPlayer, savePlayer } = require('../core/player/playerService');
const { processPurchase } = require('../core/economy/shopLogic');
const { villageItems, castleItems, arenaItems } = require('../data/shop');
const { shopTabsMenu, renderShop } = require('../menus/shopMenu');

async function safeEdit(ctx, text, options = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }
  } catch (err) {
    console.error('Erro shop UI:', err);

    try {
      await ctx.reply(text, options);
    } catch {}
  }
}

function formatCurrency(player) {
  return `💰 Ouro: ${player.gold || 0} | 💎 Nox: ${player.nox || 0} | 🏅 Glórias: ${player.glorias || 0}`;
}

async function handleShop(ctx) {
  const player = getPlayer(ctx.from.id);

  const msg = `🛒 *Lojas de Noctra*
${formatCurrency(player)}

Escolha uma loja:`;

  await safeEdit(ctx, msg, {
    parse_mode: 'Markdown',
    ...shopTabsMenu()
  });
}

async function handleShopVillage(ctx) {
  const player = getPlayer(ctx.from.id);
  const { text, keyboard } = renderShop('Vila (Ouro)', villageItems, player);

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleShopCastle(ctx) {
  const player = getPlayer(ctx.from.id);
  const { text, keyboard } = renderShop('Castelo (Nox)', castleItems, player);

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleShopArena(ctx) {
  const player = getPlayer(ctx.from.id);
  const { text, keyboard } = renderShop('Matadores (Glórias)', arenaItems, player);

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleBuy(ctx, itemId) {
  const player = getPlayer(ctx.from.id);
  const item = [...villageItems, ...castleItems, ...arenaItems].find((i) => i.id === itemId);

  if (!item) {
    return ctx.answerCbQuery('Item inválido.', {
      show_alert: true
    });
  }

  const result = processPurchase(player, item);

  if (result.success) {
    savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(result.message, {
      show_alert: true
    });

    if (item.currency === 'nox') {
      return handleShopCastle(ctx);
    }

    if (item.currency === 'glory') {
      return handleShopArena(ctx);
    }

    return handleShopVillage(ctx);
  }

  await ctx.answerCbQuery(result.message, {
    show_alert: true
  });
}

module.exports = {
  handleShop,
  handleShopVillage,
  handleShopCastle,
  handleShopArena,
  handleBuy
};