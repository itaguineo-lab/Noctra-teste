const { Markup } = require('telegraf');
const {
  getPlayer,
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

function equippedLine(label, item) {
  if (!item) return `${label}: —`;

  const stats = [];

  if (item.atk) stats.push(`⚔️+${item.atk}`);
  if (item.def) stats.push(`🛡️+${item.def}`);
  if (item.hp) stats.push(`❤️+${item.hp}`);
  if (item.crit) stats.push(`✨+${item.crit}%`);

  return `${label}: ${item.emoji || '⚪'} ${item.name} (${stats.join(' | ')})`;
}

function buildInventoryHeader(player) {
  recalculateStats(player);

  const inventorySize = player.inventory?.length || 0;
  const maxSlots = player.maxInventory || 30;

  return `🎒 *INVENTÁRIO* (${inventorySize}/${maxSlots})

⚔️ *ATK:* ${player.atk}
🛡️ *DEF:* ${player.def}
❤️ *HP:* ${player.maxHp}
✨ *CRIT:* ${player.crit}%

${equippedLine('⚔️ Arma', player.equipment?.weapon)}
${equippedLine('🛡️ Armadura', player.equipment?.armor)}
${equippedLine('📿 Joia', player.equipment?.accessory)}
${player.soulsEquipped?.[0]
  ? `💀 Alma: ${player.soulsEquipped[0].emoji || '💀'} ${player.soulsEquipped[0].name}`
  : '💀 Alma: —'}

━━━━━━━━━━━━
*Escolha uma categoria:*`;
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
  await safeEdit(ctx, buildInventoryHeader(player), inventoryCategoryMenu());
}

async function handleInvWeapons(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = (player.inventory || []).filter(i => i.slot === 'weapon');

  await safeEdit(
    ctx,
    `${buildInventoryHeader(player)}

⚔️ *ARMAS*
${buildInventoryList(items)}`,
    inventoryCategoryMenu()
  );
}

async function handleInvArmors(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = (player.inventory || []).filter(i => i.slot === 'armor');

  await safeEdit(
    ctx,
    `${buildInventoryHeader(player)}

🛡️ *ARMADURAS*
${buildInventoryList(items)}`,
    inventoryCategoryMenu()
  );
}

async function handleInvJewelry(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = (player.inventory || []).filter(i => i.slot === 'accessory');

  await safeEdit(
    ctx,
    `${buildInventoryHeader(player)}

💎 *JOIAS*
${buildInventoryList(items)}`,
    inventoryCategoryMenu()
  );
}

async function handleInvConsumables(ctx) {
  const player = getPlayer(ctx.from.id);
  const c = player.consumables || {};

  await safeEdit(
    ctx,
    `${buildInventoryHeader(player)}

🧪 *CONSUMÍVEIS*

❤️ HP: ${c.potionHp || 0}
⚡ Energia: ${c.potionEnergy || 0}`,
    inventoryCategoryMenu()
  );
}

async function handleInvSouls(ctx) {
  const player = getPlayer(ctx.from.id);
  const souls = player.soulsInventory || [];

  const text = souls.length
    ? souls.map(s => `${s.emoji || '💀'} *${s.name}*`).join('\n')
    : 'Nenhuma alma encontrada.';

  await safeEdit(
    ctx,
    `${buildInventoryHeader(player)}

💀 *ALMAS*
${text}`,
    inventoryCategoryMenu()
  );
}

async function handleInvSkins(ctx) {
  const player = getPlayer(ctx.from.id);
  const skins = player.skins || [];

  const text = skins.length
    ? skins.map(s => `${s.emoji || '🎨'} *${s.name}*`).join('\n')
    : 'Nenhuma skin encontrada.';

  await safeEdit(
    ctx,
    `${buildInventoryHeader(player)}

🎨 *SKINS*
${text}`,
    inventoryCategoryMenu()
  );
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls,
  handleInvSkins
};