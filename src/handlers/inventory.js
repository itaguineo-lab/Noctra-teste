const { Markup } = require('telegraf');
const {
  getPlayer,
  recalculateStats
} = require('../core/player/playerService');

function equippedLine(label, item) {
  if (!item) return `${label}: —`;

  return `${label}: ${item.name} ⭐`;
}

function buildInventoryHeader(player) {
  recalculateStats(player);

  const inventorySize = player.inventory?.length || 0;
  const maxSlots = player.maxInventory || 30;

  const weapon = player.equipment?.weapon || null;
  const armor = player.equipment?.armor || null;
  const accessory = player.equipment?.accessory || null;
  const soul = player.soulsEquipped?.[0] || null;

  return (
`🎒 *INVENTÁRIO* (${inventorySize}/${maxSlots})

⚔️ *ATK:* ${player.atk}
🛡️ *DEF:* ${player.def}
❤️ *HP:* ${player.maxHp}
✨ *CRIT:* ${player.crit}%

${equippedLine('⚔️ Arma', weapon)}
${equippedLine('🛡️ Armadura', armor)}
${equippedLine('📿 Joia', accessory)}
${soul ? `💀 Alma: ${soul.name}` : '💀 Alma: —'}

━━━━━━━━━━━━
*Escolha uma categoria:*`
  );
}

function inventoryKeyboard() {
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
      Markup.button.callback('🎨 Skins', 'inv_skins'),
      Markup.button.callback('💀 Almas', 'inv_souls')
    ],
    [
      Markup.button.callback('🏠 Menu', 'menu')
    ]
  ]);
}

async function safeEdit(ctx, text, extra = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      return await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...extra
      });
    }

    return await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...extra
    });
  } catch {
    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...extra
    });
  }
}

async function handleInventory(ctx) {
  const player = getPlayer(ctx.from.id);

  if (!player) {
    return ctx.reply('❌ Perfil não encontrado.');
  }

  const text = buildInventoryHeader(player);

  await safeEdit(ctx, text, inventoryKeyboard());
}

module.exports = {
  handleInventory
};