const {
  getPlayer,
  savePlayer,
  recalculateStats
} = require('../core/player/playerService');

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

function getCategoryItems(player, slot) {
  const inventory = player.inventory || [];
  return inventory.filter(item => item.slot === slot);
}

function isEquipped(player, item) {
  const equipment = player.equipment || {};

  return Object.values(equipment).some(
    equipped =>
      equipped &&
      String(equipped.id) === String(item.id)
  );
}

function buildButtons(items, player) {
  const buttons = [];

  items.forEach(item => {
    const equipped = isEquipped(player, item);

    const label = equipped
      ? `⭐ Desequipar ${item.name}`
      : `⚔️ Equipar ${item.name}`;

    buttons.push([
      Markup.button.callback(
        label,
        `toggle_equip_${item.id}`
      )
    ]);
  });

  buttons.push([
    Markup.button.callback('🏠 Menu', 'menu')
  ]);

  return Markup.inlineKeyboard(buttons);
}

function renderItemsText(title, items, player) {
  let text = `🎒 *${title}*\n\n`;

  if (!items.length) {
    return `${text}Nenhum item nesta categoria.`;
  }

  items.forEach((item, index) => {
    const equipped = isEquipped(player, item);

    text += `${index + 1}. ${equipped ? '⭐' : '⚪'} *${item.name}*\n`;
    text += `⚔️ ${item.atk || 0} | 🛡️ ${item.def || 0} | ❤️ ${item.hp || 0} | ✨ ${item.crit || 0}\n`;
    text += `${equipped ? 'Equipado' : 'No inventário'}\n\n`;
  });

  return text;
}

async function handleInventory(ctx) {
  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('⚔️ Armas', 'inv_weapons'),
      Markup.button.callback('🛡️ Armaduras', 'inv_armors')
    ],
    [
      Markup.button.callback('💎 Joias', 'inv_jewelry'),
      Markup.button.callback('🧪 Consumíveis', 'inv_consumables')
    ],
    [
      Markup.button.callback('🎨 Skins', 'inv_skins'),
      Markup.button.callback('💀 Almas', 'inv_souls')
    ],
    [
      Markup.button.callback('🏠 Menu', 'menu')
    ]
  ]);

  await safeEdit(
    ctx,
    '🎒 *Inventário*\n\nEscolha uma categoria:',
    {
      parse_mode: 'Markdown',
      ...keyboard
    }
  );
}

async function handleInvWeapons(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = getCategoryItems(player, 'weapon');

  await safeEdit(
    ctx,
    renderItemsText('ARMAS', items, player),
    {
      parse_mode: 'Markdown',
      ...buildButtons(items, player)
    }
  );
}

async function handleInvArmors(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = getCategoryItems(player, 'armor');

  await safeEdit(
    ctx,
    renderItemsText('ARMADURAS', items, player),
    {
      parse_mode: 'Markdown',
      ...buildButtons(items, player)
    }
  );
}

async function handleInvJewelry(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = getCategoryItems(player, 'accessory');

  await safeEdit(
    ctx,
    renderItemsText('JOIAS', items, player),
    {
      parse_mode: 'Markdown',
      ...buildButtons(items, player)
    }
  );
}

async function handleInvConsumables(ctx) {
  const player = getPlayer(ctx.from.id);
  const consumables = player.consumables || {};

  const text =
    `🧪 *CONSUMÍVEIS*\n\n` +
    `❤️ Poções HP: ${consumables.potionHp || 0}\n` +
    `⚡ Poções Energia: ${consumables.potionEnergy || 0}`;

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Menu', 'menu')]
    ])
  });
}

async function handleInvSouls(ctx) {
  const player = getPlayer(ctx.from.id);
  const souls = player.soulsInventory || [];

  let text = `💀 *ALMAS*\n\n`;

  if (!souls.length) {
    text += 'Nenhuma alma obtida.';
  } else {
    souls.forEach((soul, index) => {
      text += `${index + 1}. ${soul.name}\n`;
    });
  }

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Menu', 'menu')]
    ])
  });
}

async function handleToggleEquip(ctx) {
  try {
    const itemId = ctx.match[1];
    const player = getPlayer(ctx.from.id);

    const inventory = player.inventory || [];

    const item = inventory.find(
      i => String(i.id) === String(itemId)
    );

    if (!item) {
      return ctx.answerCbQuery(
        '❌ Item não encontrado.'
      );
    }

    const slot = item.slot;

    const equipped = player.equipment[slot];

    if (
      equipped &&
      String(equipped.id) === String(item.id)
    ) {
      player.equipment[slot] = null;

      recalculateStats(player);
      savePlayer(ctx.from.id, player);

      await ctx.answerCbQuery(
        `🗑️ ${item.name} desequipado`
      );
    } else {
      player.equipment[slot] = item;

      recalculateStats(player);
      savePlayer(ctx.from.id, player);

      await ctx.answerCbQuery(
        `⚔️ ${item.name} equipado`
      );
    }

    if (slot === 'weapon') {
      return handleInvWeapons(ctx);
    }

    if (slot === 'armor') {
      return handleInvArmors(ctx);
    }

    return handleInvJewelry(ctx);
  } catch (error) {
    console.error('Erro equipar:', error);

    await ctx.answerCbQuery(
      'Erro ao equipar item.'
    );
  }
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls,
  handleToggleEquip
};