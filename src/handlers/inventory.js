const {
  getPlayer
} = require('../core/player/playerService');

const {
  inventoryCategoryMenu
} = require('../menus/inventoryMenu');

const {
  getRarityEmoji
} = require('../core/player/souls');

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
  return Array.isArray(player.inventory)
    ? player.inventory
    : [];
}

function renderList(items, emptyText) {
  if (!items.length) return emptyText;

  return items
    .map(item => {
      const emoji =
        item.emoji ||
        getRarityEmoji(
          item.rarity || 'Comum'
        );

      return `${emoji} *${item.name}*`;
    })
    .join('\n');
}

async function handleInventory(ctx) {
  const player = getPlayer(ctx.from.id);
  const inventory = getInventory(player);

  const weapons = inventory.filter(
    i => i.slot === 'weapon'
  );

  const armors = inventory.filter(
    i => i.slot === 'armor'
  );

  const jewelry = inventory.filter(
    i =>
      i.slot === 'accessory' ||
      i.slot === 'ring'
  );

  await safeEdit(
    ctx,
    `🎒 *INVENTÁRIO*

⚔️ Armas: ${weapons.length}
🛡️ Armaduras: ${armors.length}
💎 Jóias: ${jewelry.length}
💀 Almas: ${
      player.soulsInventory?.length || 0
    }

Escolha uma categoria:`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvWeapons(ctx) {
  const items = getInventory(
    getPlayer(ctx.from.id)
  ).filter(i => i.slot === 'weapon');

  await safeEdit(
    ctx,
    `⚔️ *ARMAS*

${renderList(
      items,
      'Nenhuma arma.'
    )}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvArmors(ctx) {
  const items = getInventory(
    getPlayer(ctx.from.id)
  ).filter(i => i.slot === 'armor');

  await safeEdit(
    ctx,
    `🛡️ *ARMADURAS*

${renderList(
      items,
      'Nenhuma armadura.'
    )}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvJewelry(ctx) {
  const items = getInventory(
    getPlayer(ctx.from.id)
  ).filter(
    i =>
      i.slot === 'accessory' ||
      i.slot === 'ring'
  );

  await safeEdit(
    ctx,
    `💎 *JÓIAS*

${renderList(
      items,
      'Nenhuma jóia.'
    )}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvConsumables(ctx) {
  const c =
    getPlayer(ctx.from.id)
      .consumables || {};

  await safeEdit(
    ctx,
    `🧪 *CONSUMÍVEIS*

❤️ HP: ${c.potionHp || 0}
⚡ Energia: ${
      c.potionEnergy || 0
    }`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvSouls(ctx) {
  const souls =
    getPlayer(ctx.from.id)
      .soulsInventory || [];

  await safeEdit(
    ctx,
    `💀 *ALMAS*

${renderList(
      souls,
      'Nenhuma alma.'
    )}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls
};