const {
  getPlayer,
  savePlayer,
  recalculateStats
} = require('../core/player/playerService');

const { inventoryCategoryMenu } = require('../menus/inventoryMenu');

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

function isEquipped(player, item) {
  const equipment = player.equipment || {};

  return Object.values(equipment).some(
    equipped =>
      equipped &&
      equipped.id === item.id
  );
}

function buildEquipmentList(player, slot) {
  const inventory = player.inventory || [];

  return inventory.filter(
    item => item.slot === slot
  );
}

function renderItemList(player, items, title) {
  let text = `🎒 *${title}*\n\n`;

  if (!items.length) {
    return `${text}Nenhum item encontrado.`;
  }

  items.forEach((item, index) => {
    const equipped = isEquipped(player, item);

    text += `${index + 1}. ${equipped ? '⭐' : '⚪'} *${item.name}*\n`;
    text += `⚔️ ${item.atk || 0} | 🛡️ ${item.def || 0} | ❤️ ${item.hp || 0} | ✨ ${item.crit || 0}\n`;
    text += `${equipped ? '✅ Equipado' : '📦 No inventário'}\n\n`;
  });

  return text;
}

async function handleInvWeapons(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = buildEquipmentList(player, 'weapon');

  await safeEdit(
    ctx,
    renderItemList(player, items, 'ARMAS'),
    { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
  );
}

async function handleInvArmors(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = buildEquipmentList(player, 'armor');

  await safeEdit(
    ctx,
    renderItemList(player, items, 'ARMADURAS'),
    { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
  );
}

async function handleInvJewelry(ctx) {
  const player = getPlayer(ctx.from.id);
  const items = buildEquipmentList(player, 'accessory');

  await safeEdit(
    ctx,
    renderItemList(player, items, 'JOIAS'),
    { parse_mode: 'Markdown', ...inventoryCategoryMenu() }
  );
}

async function handleToggleEquip(ctx, itemId) {
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
    String(equipped.id) === String(itemId)
  ) {
    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return ctx.answerCbQuery(
      `🗑️ ${item.name} desequipado`
    );
  }

  player.equipment[slot] = item;

  recalculateStats(player);
  savePlayer(ctx.from.id, player);

  return ctx.answerCbQuery(
    `⚔️ ${item.name} equipado`
  );
}

module.exports = {
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleToggleEquip
};