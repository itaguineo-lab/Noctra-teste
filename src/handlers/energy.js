const {
  getPlayer,
  savePlayer
} = require('../core/player/playerService');

const {
  updateEnergy,
  getTimeToNextEnergy
} = require('../services/energyService');

const {
  progressBar,
  formatTime
} = require('../utils/formatters');

const { Markup } = require('telegraf');

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

async function renderEnergy(ctx) {
  const player = getPlayer(ctx.from.id);

  if (!player) {
    return ctx.reply('❌ Perfil não encontrado.');
  }

  updateEnergy(player);

  const nextIn = getTimeToNextEnergy(player);

  const energyBar = progressBar(
    player.energy,
    player.maxEnergy,
    8,
    '🟨',
    '⬜'
  );

  const hpBar = progressBar(
    player.hp,
    player.maxHp,
    8,
    '🟥',
    '⬜'
  );

  const energyPercent = Math.floor(
    (player.energy / player.maxEnergy) * 100
  );

  let text = `╔════════════════════════╗
║       ⚡ *ENERGIA*       ║
╠════════════════════════╣
║ ⚡ ${player.energy}/${player.maxEnergy}
║ [${energyBar}] ${energyPercent}%
╠════════════════════════╣
║ ❤️ HP: ${player.hp}/${player.maxHp}
║ [${hpBar}]
╠════════════════════════╣
║ ⏱️ Regeneração: ${player.vip ? '1 a cada 3 min' : '1 a cada 6 min'}
`;

  if (nextIn > 0) {
    text += `║ ⏳ Próxima energia: ${formatTime(nextIn)}
`;
  } else {
    text += `║ ✅ Energia cheia!
`;
  }

  text += `╠════════════════════════╣
║ 🛌 Descansar = HP total
║ ⚡ Custo: 1 energia
╚════════════════════════╝`;

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '🛌 Descansar (-1⚡)',
        'rest'
      )
    ],
    [
      Markup.button.callback(
        '🏠 Menu',
        'menu'
      )
    ]
  ]);

  await safeEdit(ctx, text, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleEnergy(ctx) {
  return renderEnergy(ctx);
}

async function handleRest(ctx) {
  try {
    const player = getPlayer(ctx.from.id);

    if (!player) {
      return ctx.answerCbQuery(
        'Perfil não encontrado.',
        { show_alert: true }
      );
    }

    if (player.hp >= player.maxHp) {
      return ctx.answerCbQuery(
        '❤️ HP já está cheio.',
        { show_alert: true }
      );
    }

    if (player.energy < 1) {
      return ctx.answerCbQuery(
        '⚡ Energia insuficiente.',
        { show_alert: true }
      );
    }

    player.energy -= 1;
    player.hp = player.maxHp;

    savePlayer(ctx.from.id, player);

    return renderEnergy(ctx);
  } catch (error) {
    console.error('Erro ao descansar:', error);

    try {
      await ctx.answerCbQuery(
        'Erro ao descansar.',
        { show_alert: true }
      );
    } catch {}
  }
}

module.exports = {
  handleEnergy,
  handleRest
};