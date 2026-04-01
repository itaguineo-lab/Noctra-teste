const { Markup } = require('telegraf');
const {
  getPlayer,
  savePlayer,
  recalculateStats
} = require('../core/player/playerService');

async function safeReply(ctx, text, keyboard) {
  try {
    if (ctx.callbackQuery) {
      return await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }

    return await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch {
    return await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }
}

function getEquippedName(player, slot) {
  return player.equipment?.[slot]?.name || '—';
}

function formatStats(item) {
  const parts = [];

  if (item.atk) parts.push(`⚔️ +${item.atk}`);
  if (item.def) parts.push(`🛡️ +${item.def}`);
  if (item.hp) parts.push(`❤️ +${item.hp}`);
  if (item.crit) parts.push(`✨ +${item.crit}%`);

  return parts.join(' | ') || 'Sem atributos';
}

function buildHeader(player) {
  recalculateStats(player);

  return `🎒 *INVENTÁRIO* (${player.inventory.length}/${player.maxInventory || 30})

⚔️ ATK: ${player.atk}
🛡️ DEF: ${player.def}
❤️ HP: ${player.maxHp}
✨ CRIT: ${player.crit}%

⚔️ Arma: ${getEquippedName(player, 'weapon')}
🛡️ Armadura: ${getEquippedName(player, 'armor')}
💎 Joia: ${getEquippedName(player, 'accessory')}
━━━━━━━━━━━━━━`;
}

function baseKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⚔️ Armas', 'inv_weapons'),
      Markup.button.callback('🛡️ Armaduras', 'inv_armors')
    ],
    [
      Markup.button.callback('💎 Joias', 'inv_jewelry'),
      Markup.button.callback('🧪 Consumíveis', 'inv_consumables')
    ],
    [
      Markup.button.callback('💀 Almas', 'inv_souls')
    ],
    [
      Markup.button.callback('🏠 Menu', 'menu')
    ]
  ]);
}

function buildEquipmentButtons(items, slot, equipped) {
  return items.map((item, index) => {
    const isEquipped = equipped?.name === item.name;

    return [
      Markup.button.callback(
        isEquipped
          ? `⭐ Desequipar ${item.name}`
          : `⚡ Equipar ${item.name}`,
        isEquipped
          ? `unequip_${slot}`
          : `equip_${slot}_${index}`
      )
    ];
  });
}

async function handleInventory(ctx) {
  await ctx.answerCbQuery?.();

  const player = getPlayer(ctx.from.id);

  return safeReply(
    ctx,
    `${buildHeader(player)}

Escolha uma categoria:`,
    baseKeyboard()
  );
}

async function renderCategory(ctx, slot, title, emoji) {
  await ctx.answerCbQuery?.();

  const player = getPlayer(ctx.from.id);

  const items = player.inventory.filter(
    item => item.slot === slot
  );

  let text = `${buildHeader(player)}

${emoji} *${title}*\n\n`;

  if (!items.length) {
    text += '_Nenhum item nesta categoria._';
  } else {
    items.forEach((item) => {
      const equipped =
        player.equipment?.[slot]?.name === item.name ? ' ⭐' : '';

      text += `• *${item.name}*${equipped}
${formatStats(item)}

`;
    });
  }

  const keyboard = baseKeyboard().reply_markup.inline_keyboard;
  const actionButtons = buildEquipmentButtons(
    items,
    slot,
    player.equipment?.[slot]
  );

  return safeReply(ctx, text, {
    reply_markup: {
      inline_keyboard: [
        ...keyboard,
        ...actionButtons
      ]
    }
  });
}

async function handleInvWeapons(ctx) {
  return renderCategory(ctx, 'weapon', 'ARMAS', '⚔️');
}

async function handleInvArmors(ctx) {
  return renderCategory(ctx, 'armor', 'ARMADURAS', '🛡️');
}

async function handleInvJewelry(ctx) {
  return renderCategory(ctx, 'accessory', 'JOIAS', '💎');
}

async function handleInvConsumables(ctx) {
  await ctx.answerCbQuery?.();

  const player = getPlayer(ctx.from.id);

  return safeReply(ctx, `${buildHeader(player)}

🧪 *CONSUMÍVEIS*`, baseKeyboard());
}

async function handleInvSouls(ctx) {
  await ctx.answerCbQuery?.();

  const player = getPlayer(ctx.from.id);

  return safeReply(ctx, `${buildHeader(player)}

💀 *ALMAS*`, baseKeyboard());
}

async function handleEquipItem(ctx) {
  const player = getPlayer(ctx.from.id);

  const match = ctx.callbackQuery.data.match(/^equip_(.+)_(\d+)$/);

  if (!match) {
    return ctx.answerCbQuery('❌ Ação inválida');
  }

  const slot = match[1];
  const index = Number(match[2]);

  const items = player.inventory.filter(
    item => item.slot === slot
  );

  const item = items[index];

  if (!item) {
    return ctx.answerCbQuery('❌ Item não encontrado');
  }

  player.equipment = player.equipment || {};
  player.equipment[slot] = item;

  recalculateStats(player);
  savePlayer(ctx.from.id, player);

  await ctx.answerCbQuery(`⚡ ${item.name} equipado`);

  return renderCategory(ctx, slot, slot.toUpperCase(), '⚔️');
}

async function handleUnequipItem(ctx) {
  const player = getPlayer(ctx.from.id);

  const match = ctx.callbackQuery.data.match(/^unequip_(.+)$/);

  if (!match) {
    return ctx.answerCbQuery('❌ Ação inválida');
  }

  const slot = match[1];

  if (!player.equipment?.[slot]) {
    return ctx.answerCbQuery('Nada equipado');
  }

  const itemName = player.equipment[slot].name;

  player.equipment[slot] = null;

  recalculateStats(player);
  savePlayer(ctx.from.id, player);

  await ctx.answerCbQuery(`⭐ ${itemName} removido`);

  return renderCategory(ctx, slot, slot.toUpperCase(), '⚔️');
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls,
  handleEquipItem,
  handleUnequipItem
};