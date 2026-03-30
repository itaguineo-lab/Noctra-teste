const { getPlayer } = require('../core/player/playerService');
const { inventoryCategoryMenu } = require('../menus/inventoryMenu');
const { getRarityEmoji } = require('../core/player/souls');

async function safeEdit(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch {
    await ctx.reply(text, options);
  }
}

async function handleInventory(ctx) {
  await safeEdit(ctx, '🎒 *Seu Inventário*

Escolha uma categoria:', {
    parse_mode: 'Markdown',
    ...inventoryCategoryMenu()
  });
}

function buildInventoryList(items, emptyText = 'Vazio...') {
  if (!items.length) return emptyText;

  return items.map(item => {
    const rarity = getRarityEmoji(item.rarity || 'Comum');
    const stats = [];

    if (item.atk) stats.push(`⚔️ +${item.atk}`);
    if (item.def) stats.push(`🛡️ +${item.def}`);
    if (item.hp) stats.push(`❤️ +${item.hp}`);
    if (item.crit) stats.push(`✨ +${item.crit}`);

    return `${rarity} *${item.name}*
${stats.length ? stats.join(' | ') : 'Sem atributos'}`;
  }).join('

');
}

async function handleInvWeapons(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const items = (player.inventory || []).filter(item => item?.slot === 'weapon');
    const text = `⚔️ *ARMAS* (${items.length})

${buildInventoryList(items, 'Nenhuma arma.')}`;
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
  } catch (error) {
    console.error('Erro ao carregar armas:', error);
    await ctx.answerCbQuery('Erro ao carregar armas.');
  }
}

async function handleInvArmors(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const items = (player.inventory || []).filter(item => item?.slot === 'armor');
    const text = `🛡️ *ARMADURAS* (${items.length})

${buildInventoryList(items, 'Nenhuma armadura.')}`;
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
  } catch (error) {
    console.error('Erro ao carregar armaduras:', error);
    await ctx.answerCbQuery('Erro ao carregar armaduras.');
  }
}

async function handleInvJewelry(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const items = (player.inventory || []).filter(item => item?.slot === 'accessory');
    const text = `📿 *ACESSÓRIOS* (${items.length})

${buildInventoryList(items, 'Nenhum acessório.')}`;
    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
  } catch (error) {
    console.error('Erro ao carregar acessórios:', error);
    await ctx.answerCbQuery('Erro ao carregar acessórios.');
  }
}

async function handleInvConsumables(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const consumables = player.consumables || {};

    const text = `🧪 *CONSUMÍVEIS*

` +
      `❤️ Poções HP: ${consumables.potionHp || 0}
` +
      `⚡ Poções Energia: ${consumables.potionEnergy || 0}
` +
      `💪 Tônicos Força: ${consumables.tonicStrength || 0}
` +
      `🛡️ Tônicos Defesa: ${consumables.tonicDefense || 0}`;

    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
  } catch (error) {
    console.error('Erro ao carregar consumíveis:', error);
    await ctx.answerCbQuery('Erro ao carregar consumíveis.');
  }
}

async function handleInvSouls(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const soulsInventory = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `💀 *ALMAS*

`;
    text += `📦 Inventário de almas (${soulsInventory.length})
`;

    if (!soulsInventory.length) {
      text += `_Nenhuma alma obtida._
`;
    } else {
      soulsInventory.forEach((soul, index) => {
        text += `${index + 1}. ${soul.emoji || '💀'} *${soul.name}* — ${soul.rarity} \`\`${soul.instanceId || soul.id}\`\`
`;
      });
    }

    text += `
🧷 Equipadas (${equipped.filter(Boolean).length}/2)
`;
    equipped.forEach((soul, index) => {
      text += soul ? `${index + 1}. ${soul.emoji || '💀'} *${soul.name}*
` : `${index + 1}. ⬜ Slot vazio
`;
    });

    await safeEdit(ctx, text, { parse_mode: 'Markdown', ...inventoryCategoryMenu() });
  } catch (error) {
    console.error('Erro ao carregar almas:', error);
    await ctx.answerCbQuery('Erro ao carregar almas.');
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