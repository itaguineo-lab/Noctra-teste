const { Markup } = require('telegraf');
const {
  getPlayer,
  savePlayer,
  recalculateStats
} = require('../core/player/playerService');

async function safeEdit(ctx, text, options = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      return await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...options
      });
    }

    return await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...options
    });
  } catch {
    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...options
    });
  }
}

function buildHeader(player) {
  recalculateStats(player);

  return `🎒 *INVENTÁRIO* (${player.inventory.length}/${player.maxInventory || 30})

⚔️ ATK: ${player.atk}
🛡️ DEF: ${player.def}
❤️ HP: ${player.maxHp}
✨ CRIT: ${player.crit}%

⚔️ Arma: ${player.equipment?.weapon?.name || '—'}
🛡️ Armadura: ${player.equipment?.armor?.name || '—'}
💎 Joia: ${player.equipment?.accessory?.name || '—'}

━━━━━━━━━━━━`;
}

function baseMenu() {
  return [
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
  ];
}

function buildItemButtons(items, slot, equipped) {
  const buttons = [];

  items.forEach((item, index) => {
    const isEquipped =
      equipped &&
      equipped.name === item.name;

    buttons.push([
      Markup.button.callback(
        isEquipped
          ? `⭐ Desequipar ${item.name}`
          : `⚡ Equipar ${item.name}`,
        isEquipped
          ? `unequip_${slot}`
          : `equip_${slot}_${index}`
      )
    ]);
  });

  return buttons;
}

async function handleInventory(ctx) {
  const player = getPlayer(ctx.from.id);

  await safeEdit(
    ctx,
    `${buildHeader(player)}

Escolha uma categoria:`,
    {
      reply_markup: {
        inline_keyboard: baseMenu()
      }
    }
  );
}

async function handleInvArmors(ctx) {
  const player = getPlayer(ctx.from.id);

  const items = player.inventory.filter(
    item => item.slot === 'armor'
  );

  const keyboard = [
    ...baseMenu(),
    ...buildItemButtons(
      items,
      'armor',
      player.equipment?.armor
    )
  ];

  const list = items.length
    ? items.map(item =>
        `⚪ ${item.name}
⚔️ +${item.atk || 0} | 🛡️ +${item.def || 0} | ❤️ +${item.hp || 0}`
      ).join('\n\n')
    : 'Nenhuma armadura.';

  await safeEdit(
    ctx,
    `${buildHeader(player)}

🛡️ *ARMADURAS*

${list}`,
    {
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

async function handleInvWeapons(ctx) {
  const player = getPlayer(ctx.from.id);

  const items = player.inventory.filter(
    item => item.slot === 'weapon'
  );

  const keyboard = [
    ...baseMenu(),
    ...buildItemButtons(
      items,
      'weapon',
      player.equipment?.weapon
    )
  ];

  const list = items.length
    ? items.map(item =>
        `⚪ ${item.name}
⚔️ +${item.atk || 0} | 🛡️ +${item.def || 0}`
      ).join('\n\n')
    : 'Nenhuma arma.';

  await safeEdit(
    ctx,
    `${buildHeader(player)}

⚔️ *ARMAS*

${list}`,
    {
      reply_markup: {
        inline_keyboard: keyboard
      }
    }
  );
}

async function handleEquipItem(ctx) {
  const player = getPlayer(ctx.from.id);

  const [, slot, index] =
    ctx.callbackQuery.data.split('_');

  const items = player.inventory.filter(
    item => item.slot === slot
  );

  const item = items[Number(index)];

  if (!item) {
    return ctx.answerCbQuery(
      'Item não encontrado.'
    );
  }

  player.equipment = player.equipment || {};

  player.equipment[slot] = item;

  recalculateStats(player);
  savePlayer(player);

  await ctx.answerCbQuery(
    `⚡ ${item.name} equipado`
  );

  if (slot === 'armor') {
    return handleInvArmors(ctx);
  }

  return handleInvWeapons(ctx);
}

async function handleUnequipItem(ctx) {
  const player = getPlayer(ctx.from.id);

  const [, slot] =
    ctx.callbackQuery.data.split('_');

  if (!player.equipment?.[slot]) {
    return ctx.answerCbQuery(
      'Nada equipado.'
    );
  }

  const name =
    player.equipment[slot].name;

  player.equipment[slot] = null;

  recalculateStats(player);
  savePlayer(player);

  await ctx.answerCbQuery(
    `⭐ ${name} desequipado`
  );

  if (slot === 'armor') {
    return handleInvArmors(ctx);
  }

  return handleInvWeapons(ctx);
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleEquipItem,
  handleUnequipItem
};