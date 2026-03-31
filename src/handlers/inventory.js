const { Markup } = require('telegraf');
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

function extractKeyboardRows(markup) {
  if (!markup) return [];

  if (Array.isArray(markup)) {
    return markup;
  }

  if (markup.reply_markup?.inline_keyboard) {
    return markup.reply_markup.inline_keyboard;
  }

  if (markup.inline_keyboard) {
    return markup.inline_keyboard;
  }

  return [];
}

function mergeKeyboards(...markups) {
  const rows = markups.flatMap(extractKeyboardRows);
  return rows.length ? Markup.inlineKeyboard(rows) : undefined;
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
  const inventoryCount = (player.inventory || []).length;
  const inventoryMax = player.maxInventory || 20;

  return `🎒 *INVENTÁRIO* (${inventoryCount}/${inventoryMax})

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

function buildEquipButtons(items, callbackPrefix) {
  if (!items.length) return undefined;

  const rows = items.map((item) => [
    Markup.button.callback(
      `⚙️ Equipar ${item.name}`,
      `${callbackPrefix}:${item.id}`
    )
  ]);

  return Markup.inlineKeyboard(rows);
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

async function handleInvWeapons(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const items = (player.inventory || []).filter(
      (item) => item?.slot === 'weapon'
    );

    const text = `⚔️ *ARMAS* (${items.length})

${buildInventoryList(items, 'Nenhuma arma.')}`;

    const keyboard = mergeKeyboards(
      buildEquipButtons(items, 'equip_item'),
      inventoryCategoryMenu()
    );

    await safeEdit(ctx, text, {
      parse_mode: 'Markdown',
      ...(keyboard || inventoryCategoryMenu())
    });
  } catch (error) {
    console.error('Erro armas:', error);
  }
}

async function handleInvArmors(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const items = (player.inventory || []).filter(
      (item) => item?.slot === 'armor'
    );

    const text = `🛡️ *ARMADURAS* (${items.length})

${buildInventoryList(items, 'Nenhuma armadura.')}`;

    const keyboard = mergeKeyboards(
      buildEquipButtons(items, 'equip_item'),
      inventoryCategoryMenu()
    );

    await safeEdit(ctx, text, {
      parse_mode: 'Markdown',
      ...(keyboard || inventoryCategoryMenu())
    });
  } catch (error) {
    console.error('Erro armaduras:', error);
  }
}

async function handleInvJewelry(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const items = (player.inventory || []).filter(
      (item) =>
        item?.slot === 'accessory' ||
        item?.slot === 'ring' ||
        item?.slot === 'necklace'
    );

    const text = `💍 *JOIAS* (${items.length})

${buildInventoryList(items, 'Nenhuma joia.')}`;

    const keyboard = mergeKeyboards(
      buildEquipButtons(items, 'equip_item'),
      inventoryCategoryMenu()
    );

    await safeEdit(ctx, text, {
      parse_mode: 'Markdown',
      ...(keyboard || inventoryCategoryMenu())
    });
  } catch (error) {
    console.error('Erro joias:', error);
  }
}

async function handleInvConsumables(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const consumables = player.consumables || {};

    const text = `🧪 *CONSUMÍVEIS*

❤️ Poções HP: ${consumables.potionHp || 0}
⚡ Poções Energia: ${consumables.potionEnergy || 0}
💪 Tônicos Força: ${consumables.tonicStrength || 0}
🛡️ Tônicos Defesa: ${consumables.tonicDefense || 0}`;

    await safeEdit(ctx, text, {
      parse_mode: 'Markdown',
      ...inventoryCategoryMenu()
    });
  } catch (error) {
    console.error('Erro consumíveis:', error);
  }
}

async function handleInvSouls(ctx) {
  try {
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
        text += `${index + 1}. ${soul.emoji || '💀'} *${soul.name}* — ${soul.rarity}
\`/equipSoul ${soul.instanceId || soul.id}\`\n`;
      });
    }

    text += `\n🧷 Equipadas (${equipped.filter(Boolean).length}/2)\n`;

    equipped.forEach((soul, index) => {
      text += soul
        ? `${index + 1}. ${soul.emoji || '💀'} *${soul.name}*\n`
        : `${index + 1}. ⬜ Slot vazio\n`;
    });

    const soulEquipButtons = soulsInventory.length
      ? Markup.inlineKeyboard([
          ...soulsInventory.map((soul) => [
            Markup.button.callback(
              `💀 Equipar ${soul.name}`,
              `equip_soul:${soul.instanceId || soul.id}`
            )
          ]),
          ...extractKeyboardRows(inventoryCategoryMenu())
        ])
      : inventoryCategoryMenu();

    await safeEdit(ctx, text, {
      parse_mode: 'Markdown',
      ...(soulEquipButtons || inventoryCategoryMenu())
    });
  } catch (error) {
    console.error('Erro almas:', error);
  }
}

module.exports = {
  handleInventory,
  handleInvWeapons,
  handleInvArmors,
  handleInvJewelry,
  handleInvConsumables,
  handleInvSouls
};