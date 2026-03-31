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

function formatEquipmentItem(label, item) {
  if (!item) return `${label}: —`;

  const stats = [];

  if (item.atk) stats.push(`ATK+${item.atk}`);
  if (item.def) stats.push(`DEF+${item.def}`);
  if (item.hp) stats.push(`HP+${item.hp}`);
  if (item.crit) stats.push(`CRIT+${item.crit}%`);

  return `${label}: ${item.emoji || '⚪'} ${item.name} (${stats.join(', ')})`;
}

function buildInventoryOverview(player) {
  const eq = player.equipment || {};

  return `🎒 *INVENTÁRIO* (${(player.inventory || []).length}/${player.maxInventory || 20})

⚔️ ATK ${player.atk}    🛡️ DEF ${player.def}
❤️ HP ${player.hp}/${player.maxHp}    💥 CRIT ${player.crit}%

${formatEquipmentItem('⚔️ Arma', eq.weapon)}
${formatEquipmentItem('🛡️ Armadura', eq.armor)}
${formatEquipmentItem('📿 Acessório', eq.accessory)}
${formatEquipmentItem('👢 Bota', eq.boots)}
${formatEquipmentItem('📿 Colar', eq.necklace)}
${formatEquipmentItem('💍 Anel', eq.ring)}

💀 *Almas equipadas*
1. ${player.soulsEquipped?.[0]?.name || 'Slot vazio'}
2. ${player.soulsEquipped?.[1]?.name || 'Slot vazio'}

💡 Itens equipados não ocupam slots.
`;
}

async function handleInventory(ctx) {
  try {
    const player = getPlayer(ctx.from.id);

    await safeEdit(
      ctx,
      buildInventoryOverview(player),
      {
        parse_mode: 'Markdown',
        ...inventoryCategoryMenu()
      }
    );
  } catch (error) {
    console.error('Erro inventário:', error);
  }
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

      return `${rarity} *${item.name}*
${stats.length ? stats.join(' | ') : 'Sem atributos'}
\`/equip ${item.id}\``;
    })
    .join('\n\n');
}

async function handleInvWeapons(ctx) {
  const player = getPlayer(ctx.from.id);

  const items = (player.inventory || []).filter(
    item => item?.slot === 'weapon'
  );

  await safeEdit(
    ctx,
    `⚔️ *ARMAS* (${items.length})

${buildInventoryList(items, 'Nenhuma arma.')}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvArmors(ctx) {
  const player = getPlayer(ctx.from.id);

  const items = (player.inventory || []).filter(
    item => item?.slot === 'armor'
  );

  await safeEdit(
    ctx,
    `🛡️ *ARMADURAS* (${items.length})

${buildInventoryList(items, 'Nenhuma armadura.')}`,
    {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    }
  );
}

async function handleInvJewelry(ctx) {
  const player = getPlayer(ctx.from.id);

  const items = (player.inventory || []).filter(
    item =>
      item?.slot === 'accessory' ||
      item?.slot === 'ring' ||
      item?.slot === 'necklace'
  );

  await safeEdit(
    ctx,
    `💍 *JOIAS* (${items.length})

${buildInventoryList(items, 'Nenhuma joia.')}`,
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

async function handleInvSouls(ctx) {
  const player = getPlayer(ctx.from.id);

  const soulsInventory = player.soulsInventory || [];
  const equipped = player.soulsEquipped || [null, null];

  let text = `💀 *ALMAS*

📦 Inventário (${soulsInventory.length})
`;

  if (!soulsInventory.length) {
    text += `_Nenhuma alma obtida._\n`;
  } else {
    soulsInventory.forEach((soul, index) => {
      text += `${index + 1}. ${soul.emoji || '💀'} *${soul.name}*
\`/equipSoul ${soul.instanceId || soul.id}\`\n`;
    });
  }

  text += `\n🧷 Equipadas (${equipped.filter(Boolean).length}/2)\n`;

  equipped.forEach((soul, index) => {
    text += soul
      ? `${index + 1}. ${soul.emoji || '💀'} ${soul.name}\n`
      : `${index + 1}. ⬜ Slot vazio\n`;
  });

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...inventoryCategoryMenu()
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