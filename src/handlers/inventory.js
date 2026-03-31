const {
  getPlayer
} = require('../core/player/playerService');

const {
  inventoryCategoryMenu
} = require('../menus/inventoryMenu');

const {
  getRarityEmoji
} = require('../core/player/souls');

const { formatItemStats } = require('../utils/formatters');
const { Markup } = require('telegraf');

async function safeEdit(ctx, text, options = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }
  } catch {
    await ctx.reply(text, options);
  }
}

function getInventory(player) {
  return Array.isArray(player.inventory) ? player.inventory : [];
}

function renderListWithEquip(items, emptyText, equipPrefix = 'equip_item') {
  if (!items.length) return emptyText;

  const keyboard = [];
  items.forEach(item => {
    const statsStr = formatItemStats(item);
    keyboard.push([Markup.button.callback(
      `⚔️ Equipar ${item.name}${statsStr}`,
      `${equipPrefix}_${item.id}`
    )]);
  });
  return keyboard;
}

async function handleInventory(ctx) {
  const player = getPlayer(ctx.from.id);
  const inventory = getInventory(player);
  const maxInv = player.maxInventory || (player.vip ? 30 : 20);
  const invCount = inventory.length;

  const weapons = inventory.filter(i => i.slot === 'weapon');
  const armors = inventory.filter(i => i.slot === 'armor');
  const jewelry = inventory.filter(i => i.slot === 'accessory' || i.slot === 'ring');

  await safeEdit(
    ctx,
    `🎒 *INVENTÁRIO* (${invCount}/${maxInv})\n\n⚔️ Armas: ${weapons.length}\n🛡️ Armaduras: ${armors.length}\n💎 Jóias: ${jewelry.length}\n💀 Almas: ${player.soulsInventory?.length || 0}\n\nEscolha uma categoria:`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvWeapons(ctx) {
  const items = getInventory(getPlayer(ctx.from.id)).filter(i => i.slot === 'weapon');
  if (!items.length) {
    return safeEdit(
      ctx,
      `⚔️ *ARMAS*\n\nNenhuma arma.`,
      { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
    );
  }

  const equipButtons = renderListWithEquip(items, '');
  const keyboard = [...equipButtons, [Markup.button.callback('◀️ Voltar', 'inventory')]];

  let text = `⚔️ *ARMAS*\n\n`;
  items.forEach(item => {
    text += `• ${item.emoji || '⚪'} *${item.name}*${formatItemStats(item)}\n`;
  });

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard)
  });
}

async function handleInvArmors(ctx) {
  const items = getInventory(getPlayer(ctx.from.id)).filter(i => i.slot === 'armor');
  if (!items.length) {
    return safeEdit(
      ctx,
      `🛡️ *ARMADURAS*\n\nNenhuma armadura.`,
      { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
    );
  }

  const equipButtons = renderListWithEquip(items, '');
  const keyboard = [...equipButtons, [Markup.button.callback('◀️ Voltar', 'inventory')]];

  let text = `🛡️ *ARMADURAS*\n\n`;
  items.forEach(item => {
    text += `• ${item.emoji || '⚪'} *${item.name}*${formatItemStats(item)}\n`;
  });

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard)
  });
}

async function handleInvJewelry(ctx) {
  const items = getInventory(getPlayer(ctx.from.id)).filter(i => i.slot === 'accessory' || i.slot === 'ring');
  if (!items.length) {
    return safeEdit(
      ctx,
      `💎 *JÓIAS*\n\nNenhuma jóia.`,
      { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
    );
  }

  const equipButtons = renderListWithEquip(items, '');
  const keyboard = [...equipButtons, [Markup.button.callback('◀️ Voltar', 'inventory')]];

  let text = `💎 *JÓIAS*\n\n`;
  items.forEach(item => {
    text += `• ${item.emoji || '⚪'} *${item.name}*${formatItemStats(item)}\n`;
  });

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard)
  });
}

async function handleInvConsumables(ctx) {
  const c = getPlayer(ctx.from.id).consumables || {};
  await safeEdit(
    ctx,
    `🧪 *CONSUMÍVEIS*\n\n❤️ Poção de HP: ${c.potionHp || 0}\n⚡ Poção de Energia: ${c.potionEnergy || 0}\n💪 Tônico de Força: ${c.tonicStrength || 0}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvSouls(ctx) {
  const souls = getPlayer(ctx.from.id).soulsInventory || [];
  if (!souls.length) {
    return safeEdit(
      ctx,
      `💀 *ALMAS*\n\nNenhuma alma.`,
      { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
    );
  }

  const equipButtons = souls.map(soul => [
    Markup.button.callback(`💀 Equipar ${soul.name}`, `equip_soul_${soul.instanceId || soul.id}`)
  ]);
  const keyboard = [...equipButtons, [Markup.button.callback('◀️ Voltar', 'inventory')]];

  let text = `💀 *ALMAS*\n\n`;
  souls.forEach(soul => {
    text += `• ${soul.emoji || '💀'} *${soul.name}* (${soul.rarity})\n`;
  });

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard)
  });
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls
};