const { getPlayer } = require('../core/player/playerService');
const { getXpToNextLevel } = require('../core/player/progression');
const { getMapById, maps } = require('../core/world/maps');
const { Markup } = require('telegraf');
const { mainMenu } = require('../menus/mainMenu');
const { progressBar, formatNumber } = require('../utils/formatters');
const { getRarityEmoji } = require('../core/player/souls');

function getPlayerMap(player) {
  return getMapById(player.currentMap) || maps[0];
}

function formatClassName(className = 'guerreiro') {
  return className.charAt(0).toUpperCase() + className.slice(1);
}

function slotLabel(slot) {
  const map = { weapon: '⚔️', armor: '🛡️', accessory: '📿' };
  return map[slot] || '•';
}

function buildEquipmentText(player) {
  const equipment = player.equipment || {};
  const slots = ['weapon', 'armor', 'accessory'];
  let text = '';

  for (const slot of slots) {
    const item = equipment[slot];
    if (item) {
      text += `   ${slotLabel(slot)} ${item.name}
`;
      text += `      ⚔️ +${item.atk || 0} | 🛡️ +${item.def || 0} | ✨ +${item.crit || 0} | ❤️ +${item.hp || 0}
`;
    } else {
      text += `   ${slotLabel(slot)} Vazio
`;
    }
  }

  return text.trimEnd();
}

function buildSoulsText(player) {
  const souls = player.soulsEquipped || [null, null];
  if (!souls.length || !souls.some(Boolean)) return '   Nenhuma alma equipada.';

  let text = '';
  souls.forEach((soul, index) => {
    if (soul) {
      text += `   ${getRarityEmoji(soul.rarity)} ${soul.name} (${soul.rarity})
`;
      if (soul.description) text += `      ${soul.description}
`;
    } else {
      text += `   ⬜ Slot ${index + 1} vazio
`;
    }
  });

  return text.trimEnd();
}

async function safeEdit(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch {
    await ctx.reply(text, options);
  }
}

async function handleProfile(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    const xpNeeded = getXpToNextLevel(player.level);
    const xpBar = progressBar(player.xp || 0, xpNeeded || 1, 8);
    const hpBar = progressBar(player.hp || 0, player.maxHp || 1, 8);
    const map = getPlayerMap(player);

    const equipmentText = buildEquipmentText(player);
    const soulsText = buildSoulsText(player);

    const skinText = player.skin
      ? `🎨 Skin: ${player.skin.emoji || ''} ${player.skin.name || 'Sem nome'}
`
      : '🎨 Skin: Nenhuma
';

    const profileMsg =
      `👤 *${player.name || ctx.from.first_name}* (${formatClassName(player.class)})
` +
      `Nível ${player.level || 1} | XP: ${formatNumber(player.xp || 0)} / ${formatNumber(xpNeeded || 1)}
` +
      `[${xpBar}] ${Math.floor(((player.xp || 0) / (xpNeeded || 1)) * 100)}%

` +
      `❤️ HP: ${player.hp || 0}/${player.maxHp || 0}
` +
      `[${hpBar}] ${Math.floor(((player.hp || 0) / (player.maxHp || 1)) * 100)}%

` +
      `⚔️ ATK: ${player.atk || 0} | 🛡️ DEF: ${player.def || 0}
` +
      `✨ CRIT: ${player.crit || 0}%

` +
      `💰 Gold: ${formatNumber(player.gold || 0)} | 💎 Nox: ${formatNumber(player.nox || 0)} | 🏅 Glórias: ${formatNumber(player.glorias || 0)}
` +
      `⚡ Energia: ${player.energy || 0}/${player.maxEnergy || 0}
` +
      `🗝️ Chaves: ${player.keys || 0}
` +
      `🗺️ Mapa: ${map.emoji} ${map.name} (Lv ${map.levelReq || map.level || 1})

` +
      `${skinText}
` +
      `*Equipamentos:*
${equipmentText}

` +
      `💀 *Almas Equipadas (${(player.soulsEquipped || []).filter(Boolean).length}/2):*
${soulsText}`;

    const keyboard = [
      [Markup.button.callback('📝 Renomear', 'rename_help'), Markup.button.callback('🔄 Mudar Classe', 'class_help')],
      [Markup.button.callback('◀️ Voltar', 'menu')]
    ];

    await safeEdit(ctx, profileMsg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
  } catch (error) {
    console.error('Erro no perfil:', error);
    await ctx.answerCbQuery('Erro ao carregar perfil.', true);
  }
}

async function handleRenameAction(ctx) {
  await ctx.answerCbQuery('Use o comando /rename <novo_nome>', true);
}

async function handleChangeClassAction(ctx) {
  await ctx.answerCbQuery('Use o comando /class guerreiro | arqueiro | mago', true);
}

module.exports = {
  handleProfile,
  handleRenameAction,
  handleChangeClassAction
};