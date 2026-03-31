const { getPlayer } = require('../core/player/playerService');
const { inventoryCategoryMenu } = require('../menus/inventoryMenu');
const { getRarityEmoji } = require('../core/player/souls');

async function safeEdit(ctx, text, options = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }
  } catch (err) {
    console.error('Erro inventory:', err);

    try {
      await ctx.reply(text, options);
    } catch {}
  }
}

function getInventoryArray(player) {
  return Array.isArray(player.inventory) ? player.inventory : [];
}

function buildInventoryList(items, emptyText = 'Vazio...') {
  if (!items.length) return emptyText;

  return items
    .map((item) => {
      const rarity = item.emoji || getRarityEmoji(item.rarity || 'Comum');
      const stats = [];

      if (item.atk) stats.push(`⚔️ +${item.atk}`);
      if (item.def) stats.push(`🛡️ +${item.def}`);
      if (item.hp) stats.push(`❤️ +${item.hp}`);
      if (item.crit) stats.push(`💥 +${item.crit}%`);

      return `${rarity} *${item.name}*\n${stats.length ? stats.join(' | ') : 'Sem atributos'}`;
    })
    .join('\n\n');
}

async function handleInventory(ctx) {
  const player = getPlayer(ctx.from.id);
  const inventory = getInventoryArray(player);

  const weaponCount = inventory.filter((item) => item?.slot === 'weapon').length;
  const armorCount = inventory.filter((item) => item?.slot === 'armor').length;
  const jewelryCount = inventory.filter(
    (item) =>
      item?.slot === 'accessory' ||
      item?.slot === 'ring' ||
      item?.slot === 'necklace'
  ).length;

  const soulsCount = player.soulsInventory?.length || 0;
  const skinsCount = player.skins?.length || 0;
  const consumablesCount = Object.values(player.consumables || {}).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );

  await safeEdit(
    ctx,
    `🎒 *INVENTÁRIO*

⚔️ Armas: ${weaponCount}
🛡️ Armaduras: ${armorCount}
💎 Jóias: ${jewelryCount}
🧪 Consumíveis: ${consumablesCount}
🎨 Skins: ${skinsCount}
💀 Almas: ${soulsCount}

Escolha uma categoria:`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvWeapons(ctx) {
  const player = getPlayer(ctx.from.id);
  const inventory = getInventoryArray(player);

  const items = inventory.filter((item) => item?.slot === 'weapon');

  await safeEdit(
    ctx,
    `⚔️ *ARMAS* (${items.length})

${buildInventoryList(items, 'Nenhuma arma encontrada.')}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvArmors(ctx) {
  const player = getPlayer(ctx.from.id);
  const inventory = getInventoryArray(player);

  const items = inventory.filter(
    (item) => item?.slot === 'armor' || item?.slot === 'boots'
  );

  await safeEdit(
    ctx,
    `🛡️ *ARMADURAS* (${items.length})

${buildInventoryList(items, 'Nenhuma armadura encontrada.')}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvJewelry(ctx) {
  const player = getPlayer(ctx.from.id);
  const inventory = getInventoryArray(player);

  const items = inventory.filter(
    (item) =>
      item?.slot === 'accessory' ||
      item?.slot === 'ring' ||
      item?.slot === 'necklace'
  );

  await safeEdit(
    ctx,
    `💎 *JÓIAS* (${items.length})

${buildInventoryList(items, 'Nenhuma jóia encontrada.')}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvConsumables(ctx) {
  const player = getPlayer(ctx.from.id);
  const consumables = player.consumables || {};

  await safeEdit(
    ctx,
    `🧪 *CONSUMÍVEIS*

❤️ Poções HP: ${consumables.potionHp || 0}
⚡ Poções Energia: ${consumables.potionEnergy || 0}
💪 Tônicos Força: ${consumables.tonicStrength || 0}
🛡️ Tônicos Defesa: ${consumables.tonicDefense || 0}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvSkins(ctx) {
  const player = getPlayer(ctx.from.id);
  const skins = Array.isArray(player.skins) ? player.skins : [];

  const text = skins.length
    ? skins.map((skin) => `🎨 *${skin.name}*`).join('\n')
    : 'Nenhuma skin desbloqueada.';

  await safeEdit(
    ctx,
    `🎨 *SKINS* (${skins.length})

${text}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvSouls(ctx) {
  const player = getPlayer(ctx.from.id);
  const souls = Array.isArray(player.soulsInventory) ? player.soulsInventory : [];

  const text = souls.length
    ? souls
        .map((soul) => `${soul.emoji || '💀'} *${soul.name}*`)
        .join('\n')
    : 'Nenhuma alma obtida.';

  await safeEdit(
    ctx,
    `💀 *ALMAS* (${souls.length})

${text}`,
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
  handleInvSkins,
  handleInvSouls
};