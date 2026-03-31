const {
  getPlayer
} = require('../core/player/playerService');

const {
  getXpToNextLevel
} = require('../core/player/progression');

const {
  getMapById,
  maps
} = require('../core/world/maps');

const { Markup } = require('telegraf');

const {
  progressBar,
  formatNumber
} = require('../utils/formatters');

const {
  getRarityEmoji
} = require('../core/player/souls');

function getPlayerMap(player) {
  return getMapById(player.currentMap) || maps[0];
}

function formatClassName(className = 'guerreiro') {
  return className.charAt(0).toUpperCase() + className.slice(1);
}

function slotLabel(slot) {
  const map = {
    weapon: '⚔️',
    armor: '🛡️',
    accessory: '📿'
  };

  return map[slot] || '•';
}

function buildEquipmentText(player) {
  const equipment = player.equipment || {};
  const slots = ['weapon', 'armor', 'accessory'];

  let text = '';

  for (const slot of slots) {
    const item = equipment[slot];

    if (item) {
      text += `   ${slotLabel(slot)} ${item.name}\n`;
      text += `      ⚔️ +${item.atk || 0} | 🛡️ +${item.def || 0} | ✨ +${item.crit || 0} | ❤️ +${item.hp || 0}\n`;
    } else {
      text += `   ${slotLabel(slot)} Vazio\n`;
    }
  }

  return text.trimEnd();
}

function buildSoulsText(player) {
  const souls = player.soulsEquipped || [null, null];

  if (!souls.length || !souls.some(Boolean)) {
    return '   Nenhuma alma equipada.';
  }

  let text = '';

  souls.forEach((soul, index) => {
    if (soul) {
      text += `   ${getRarityEmoji(soul.rarity)} ${soul.name} (${soul.rarity})\n`;

      if (soul.description) {
        text += `      ${soul.description}\n`;
      }
    } else {
      text += `   ⬜ Slot ${index + 1} vazio\n`;
    }
  });

  return text.trimEnd();
}

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

async function handleProfile(ctx) {
  const player = getPlayer(ctx.from.id);

  const xpNeeded = getXpToNextLevel(player.level);
  const xpBar = progressBar(player.xp || 0, xpNeeded || 1, 8);
  const hpBar = progressBar(player.hp || 0, player.maxHp || 1, 8);
  const map = getPlayerMap(player);

  const equipmentText = buildEquipmentText(player);
  const soulsText = buildSoulsText(player);

  const profileMsg = `👤 *${player.name}* (${formatClassName(player.class)})

⭐ Nível ${player.level}
✨ XP: ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}
[${xpBar}]

❤️ HP: ${player.hp}/${player.maxHp}
[${hpBar}]

⚡ Energia: ${player.energy}/${player.maxEnergy}

🗺️ ${map.emoji} ${map.name}

*Equipamentos:*
${equipmentText}

💀 *Almas:*
${soulsText}`;

  const keyboard = [
    [
      Markup.button.callback('📝 Renomear', 'rename_help'),
      Markup.button.callback('🔄 Classe', 'class_help')
    ],
    [
      Markup.button.callback('◀️ Voltar', 'menu')
    ]
  ];

  await safeEdit(
    ctx,
    profileMsg,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    }
  );
}

module.exports = {
  handleProfile
};