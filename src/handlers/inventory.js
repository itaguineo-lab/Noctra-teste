const { Markup } = require('telegraf');
const { getPlayer, recalculateStats } = require('../core/player/playerService');

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

function equippedLine(label, item) {
  if (!item) return `${label}: —`;

  const stats = [];

  if (item.atk) stats.push(`⚔️+${item.atk}`);
  if (item.def) stats.push(`🛡️+${item.def}`);
  if (item.hp) stats.push(`❤️+${item.hp}`);
  if (item.crit) stats.push(`✨+${item.crit}%`);

  return `${label}: ${item.emoji || '⚪'} ${item.name} (${stats.join(' | ')}) ⭐`;
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
${soul ? `💀 Alma: ${soul.emoji || '💀'} ${soul.name}` : '💀 Alma: —'}

━━━━━━━━━━━━
*Escolha uma categoria:*`
  );
}

function inventoryCategoryMenu() {
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

function buildInventoryList(items, emptyText = 'Nenhum item.') {
  if (!items.length) return emptyText;

  return items.map(item => {
    const stats = [];

    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`✨+${item.crit}%`);

    return `${item.emoji || '⚪'} *${item.name}*\n${stats.join(' | ')}`;
  }).join('\n\n');
}

async function handleInventory(ctx) {
  const player = getPlayer(ctx.from.id);

  if (!player) {
    return ctx.reply('❌ Perfil não encontrado.');
  }

  const text = buildInventoryHeader(player);

  await safeEdit(ctx, text, inventoryCategoryMenu());
}

async function handleInvWeapons(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = (player.inventory || []).filter(i => i.slot === 'weapon');

  const text =
`${buildInventoryHeader(player)}

⚔️ *ARMAS*
${buildInventoryList(items, 'Nenhuma arma encontrada.')}`;

  await safeEdit(ctx, text, inventoryCategoryMenu());
}

async function handleInvArmors(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = (player.inventory || []).filter(i => i.slot === 'armor');

  const text =
`${buildInventoryHeader(player)}

🛡️ *ARMADURAS*
${buildInventoryList(items, 'Nenhuma armadura encontrada.')}`;

  await safeEdit(ctx, text, inventoryCategoryMenu());
}

async function handleInvJewelry(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = (player.inventory || []).filter(i => i.slot === 'accessory');

  const text =
`${buildInventoryHeader(player)}

💎 *JOIAS*
${buildInventoryList(items, 'Nenhuma joia encontrada.')}`;

  await safeEdit(ctx, text, inventoryCategoryMenu());
}

async function handleInvConsumables(ctx) {
  const player = getPlayer(ctx.from.id);
  const consumables = player.consumables || {};

  const text =
`${buildInventoryHeader(player)}

🧪 *CONSUMÍVEIS*

❤️ Poções HP: ${consumables.potionHp || 0}
⚡ Poções Energia: ${consumables.potionEnergy || 0}
💥 Buff ATK: ${consumables.buffAtk || 0}
🛡️ Buff DEF: ${consumables.buffDef || 0}`;

  await safeEdit(ctx, text, inventoryCategoryMenu());
}

async function handleInvSouls(ctx) {
  const player = getPlayer(ctx.from.id);
  const souls = player.soulsInventory || [];

  const soulText = souls.length
    ? souls.map(s => `${s.emoji || '💀'} *${s.name}*`).join('\n')
    : 'Nenhuma alma encontrada.';

  const text =
`${buildInventoryHeader(player)}

💀 *ALMAS*
${soulText}`;

  await safeEdit(ctx, text, inventoryCategoryMenu());
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls
};