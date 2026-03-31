const { Markup } = require('telegraf');
const { getPlayer, savePlayer, recalculateStats } = require('../core/player/playerService');
const { inventoryCategoryMenu } = require('../menus/inventoryMenu');

function formatEquipmentItem(label, item) {
  if (!item) return `${label}: —`;

  const stats = [];
  if (item.atk) stats.push(`ATK+${item.atk}`);
  if (item.def) stats.push(`DEF+${item.def}`);
  if (item.hp) stats.push(`HP+${item.hp}`);
  if (item.crit) stats.push(`CRIT+${item.crit}%`);

  return `${label}: ${item.emoji || '⚪'} ${item.name} (${stats.join(', ')})`;
}

function renderInventoryOverview(player, headline = '🎒 *INVENTÁRIO*') {
  const eq = player.equipment || {};
  const inventoryCount = (player.inventory || []).length;
  const inventoryMax = player.maxInventory || 20;

  return `${headline} (${inventoryCount}/${inventoryMax})

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
`;
}

function renderSoulOverview(player) {
  const soulsInventory = player.soulsInventory || [];
  const equipped = player.soulsEquipped || [null, null];

  let text = `💀 *ALMAS*

📦 Inventário (${soulsInventory.length})
`;

  if (!soulsInventory.length) {
    text += `_Nenhuma alma obtida._\n`;
  } else {
    soulsInventory.forEach((soul) => {
      text += `• ${soul.emoji || '💀'} *${soul.name}* — ${soul.rarity}
\`/equipSoul ${soul.instanceId || soul.id}\`\n`;
    });
  }

  text += `\n🧷 Equipadas (${equipped.filter(Boolean).length}/2)\n`;

  equipped.forEach((soul, index) => {
    text += soul
      ? `${index + 1}. ${soul.emoji || '💀'} *${soul.name}*\n`
      : `${index + 1}. ⬜ Slot vazio\n`;
  });

  return text;
}

async function refreshInventoryMessage(ctx, player) {
  const text = renderInventoryOverview(player);

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    });
  }
}

function equipItemById(player, itemId) {
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (!player.equipment || typeof player.equipment !== 'object') {
    player.equipment = {
      weapon: null,
      armor: null,
      accessory: null,
      boots: null,
      necklace: null,
      ring: null
    };
  }

  const itemIndex = player.inventory.findIndex(
    item => item && String(item.id) === String(itemId)
  );

  if (itemIndex === -1) {
    return { ok: false, message: '❌ Item não encontrado no inventário.' };
  }

  const item = player.inventory[itemIndex];
  const validSlots = ['weapon', 'armor', 'accessory', 'boots', 'necklace', 'ring'];

  if (!item.slot || !validSlots.includes(item.slot)) {
    return { ok: false, message: '❌ Este item não pode ser equipado.' };
  }

  const currentEquip = player.equipment[item.slot] || null;

  if (currentEquip && String(currentEquip.id) === String(item.id)) {
    return { ok: false, message: '⚠️ Este item já está equipado.' };
  }

  if (currentEquip) {
    player.inventory.push(currentEquip);
  }

  player.equipment[item.slot] = item;
  player.inventory.splice(itemIndex, 1);

  recalculateStats(player);

  if (player.hp > player.maxHp) player.hp = player.maxHp;

  return { ok: true, item, currentEquip };
}

function equipSoulById(player, soulId) {
  if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
  if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];

  const soulIndex = player.soulsInventory.findIndex(
    soul => soul && String(soul.instanceId || soul.id) === String(soulId)
  );

  if (soulIndex === -1) {
    return { ok: false, message: '❌ Alma não encontrada no inventário de almas.' };
  }

  const emptySlot = player.soulsEquipped.findIndex(soul => !soul);

  if (emptySlot === -1) {
    return { ok: false, message: '❌ Slots de almas cheios.' };
  }

  const soul = player.soulsInventory[soulIndex];

  player.soulsEquipped[emptySlot] = soul;
  player.souls = player.soulsEquipped;
  player.soulsInventory.splice(soulIndex, 1);

  recalculateStats(player);

  if (player.hp > player.maxHp) player.hp = player.maxHp;

  return { ok: true, soul, slot: emptySlot + 1 };
}

async function handleEquip(ctx) {
  try {
    const text = ctx.message?.text || '';
    const itemId = ctx.match?.[1] || text.split(' ').slice(1).join(' ').trim();

    if (!itemId) {
      return ctx.reply('❌ ID do item inválido.');
    }

    const player = getPlayer(ctx.from.id);
    const result = equipItemById(player, itemId);

    if (!result.ok) {
      return ctx.reply(result.message);
    }

    savePlayer(ctx.from.id, player);

    await ctx.reply(`⚔️ *Equipado:* ${result.item.name}`, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Erro ao equipar:', error);
    await ctx.reply('❌ Erro ao equipar item.');
  }
}

async function handleEquipSoul(ctx) {
  try {
    const text = ctx.message?.text || '';
    const soulId = ctx.match?.[1] || text.split(' ').slice(1).join(' ').trim();

    if (!soulId) {
      return ctx.reply('❌ Alma inválida.');
    }

    const player = getPlayer(ctx.from.id);
    const result = equipSoulById(player, soulId);

    if (!result.ok) {
      return ctx.reply(result.message);
    }

    savePlayer(ctx.from.id, player);

    await ctx.reply(`💀 *Alma equipada:* ${result.soul.name}`, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Erro ao equipar alma:', error);
    await ctx.reply('❌ Erro ao equipar alma.');
  }
}

async function handleEquipItemCallback(ctx) {
  try {
    await ctx.answerCbQuery();

    const itemId = ctx.match?.[1];
    if (!itemId) return;

    const player = getPlayer(ctx.from.id);
    const result = equipItemById(player, itemId);

    if (!result.ok) {
      return ctx.editMessageText(
        `❌ ${result.message.replace(/^❌\s*/, '')}`,
        {
          parse_mode: 'Markdown',
          ...inventoryCategoryMenu()
        }
      );
    }

    savePlayer(ctx.from.id, player);

    const text = `${renderInventoryOverview(player)}

✅ *${result.item.name} equipado com sucesso!*`;

    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    });
  } catch (error) {
    console.error('Erro callback equip item:', error);
  }
}

async function handleEquipSoulCallback(ctx) {
  try {
    await ctx.answerCbQuery();

    const soulId = ctx.match?.[1];
    if (!soulId) return;

    const player = getPlayer(ctx.from.id);
    const result = equipSoulById(player, soulId);

    if (!result.ok) {
      return ctx.editMessageText(
        `❌ ${result.message.replace(/^❌\s*/, '')}`,
        {
          parse_mode: 'Markdown',
          ...inventoryCategoryMenu()
        }
      );
    }

    savePlayer(ctx.from.id, player);

    const text = `${renderSoulOverview(player)}

✅ *${result.soul.name}* equipada com sucesso!`;

    return ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    });
  } catch (error) {
    console.error('Erro callback equip alma:', error);
  }
}

module.exports = {
  handleEquip,
  handleEquipSoul,
  handleEquipItemCallback,
  handleEquipSoulCallback,
  equipItemById,
  equipSoulById
};