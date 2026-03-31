const {
  getPlayer,
  savePlayer
} = require('../core/player/playerService');

const {
  processPurchase
} = require('../core/economy/shopLogic');

const {
  villageItems,
  castleItems,
  arenaItems
} = require('../data/shop');

const {
  shopTabsMenu,
  renderShop
} = require('../menus/shopMenu');

async function safeEdit(ctx, text, options = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }
  } catch (err) {
    console.error('Erro shop:', err);

    try {
      await ctx.reply(text, options);
    } catch {}
  }
}

function getPlayerMoney(player) {
  return `💰 Ouro: ${player.gold || 0}
💎 Nox: ${player.nox || 0}
🏅 Glórias: ${player.glorias || 0}`;
}

async function handleShop(ctx) {
  const player = getPlayer(ctx.from.id);

  await safeEdit(
    ctx,
    `🛒 *LOJAS DE NOCTRA*

${getPlayerMoney(player)}

Escolha uma loja:`,
    {
      parse_mode: 'Markdown',
      ...shopTabsMenu()
    }
  );
}

async function handleShopVillage(ctx) {
  const player = getPlayer(ctx.from.id);

  const { text, keyboard } = renderShop(
    '🏘️ Vila (Ouro)',
    villageItems,
    player
  );

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleShopCastle(ctx) {
  const player = getPlayer(ctx.from.id);

  const { text, keyboard } = renderShop(
    '🏰 Castelo (Nox)',
    castleItems,
    player
  );

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleShopArena(ctx) {
  const player = getPlayer(ctx.from.id);

  const { text, keyboard } = renderShop(
    '⚔️ Arena (Glórias)',
    arenaItems,
    player
  );

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleBuy(ctx, itemId) {
  try {
    const player = getPlayer(ctx.from.id);

    const allItems = [
      ...villageItems,
      ...castleItems,
      ...arenaItems
    ];

    const item = allItems.find(
      i => i.id === itemId
    );

    if (!item) {
      return ctx.answerCbQuery(
        'Item inválido.',
        { show_alert: true }
      );
    }

    const result = processPurchase(
      player,
      item
    );

    await ctx.answerCbQuery(
      result.message,
      { show_alert: true }
    );

    if (!result.success) {
      return;
    }

    savePlayer(ctx.from.id, player);

    switch (item.currency) {
      case 'nox':
        return handleShopCastle(ctx);

      case 'glory':
        return handleShopArena(ctx);

      default:
        return handleShopVillage(ctx);
    }
  } catch (err) {
    console.error('Erro compra:', err);

    await ctx.answerCbQuery(
      'Erro na compra.',
      { show_alert: true }
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