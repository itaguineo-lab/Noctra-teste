const { getPlayer } = require('../core/player/playerService');
const { savePlayer } = require('../core/player/playerService');
const { processPurchase } = require('../core/economy/shopLogic');
const { villageItems, castleItems, arenaItems } = require('../data/shop');
const { shopTabsMenu, renderShop } = require('../menus/shopMenu');

async function safeEdit(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch {
    await ctx.reply(text, options);
  }
}

async function handleShop(ctx) {
  const player = getPlayer(ctx.from.id);
  const msg = `🛒 *Lojas de Noctra*
💰 Ouro: ${player.gold} | 💎 Nox: ${player.nox} | 🏅 Glórias: ${player.glorias || 0}

Escolha uma loja:`;
  await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...shopTabsMenu() });
}

async function handleShopVillage(ctx) {
  const player = getPlayer(ctx.from.id);
  const { text, keyboard } = renderShop('Vila (Ouro)', villageItems, player);
  await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleShopCastle(ctx) {
  const player = getPlayer(ctx.from.id);
  const { text, keyboard } = renderShop('Castelo (Nox)', castleItems, player);
  await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleShopArena(ctx) {
  const player = getPlayer(ctx.from.id);
  const { text, keyboard } = renderShop('Matadores (Glórias)', arenaItems, player);
  await safeEdit(ctx, text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleBuy(ctx, itemId) {
  const player = getPlayer(ctx.from.id);
  const item = [...villageItems, ...castleItems, ...arenaItems].find(i => i.id === itemId);

  if (!item) {
    return ctx.answerCbQuery('Item inválido.', true);
  }

  const result = processPurchase(player, item);
  if (result.success) {
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(result.message, true);
    if (item.currency === 'nox') return handleShopCastle(ctx);
    if (item.currency === 'glory') return handleShopArena(ctx);
    return handleShopVillage(ctx);
  }

  await ctx.answerCbQuery(result.message, true);
}

module.exports = {
  handleShop,
  handleShopVillage,
  handleShopCastle,
  handleShopArena,
  handleBuy
};