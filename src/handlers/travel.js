const {
  getPlayer,
  savePlayer
} = require('../core/player/playerService');

const {
  maps,
  getMapById,
  canPlayerEnter
} = require('../core/world/maps');

const { Markup } = require('telegraf');
const { mainMenu } = require('../menus/mainMenu');

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

function buildTravelKeyboard(player) {
  const keyboard = maps.map(map => {
    const unlocked =
      player.level >= map.levelReq;

    const current =
      player.currentMap === map.id;

    const icon = current
      ? '📍'
      : unlocked
      ? '✅'
      : '🔒';

    return [
      Markup.button.callback(
        `${icon} ${map.emoji} ${map.name} (Lv ${map.levelReq})`,
        unlocked
          ? `travel_to_${map.id}`
          : 'travel_locked'
      )
    ];
  });

  keyboard.push([
    Markup.button.callback(
      '◀️ Voltar',
      'menu'
    )
  ]);

  return Markup.inlineKeyboard(
    keyboard
  );
}

async function handleTravel(ctx) {
  const player = getPlayer(ctx.from.id);

  if (!player.currentMap) {
    player.currentMap = maps[0].id;
    savePlayer(ctx.from.id, player);
  }

  const current =
    getMapById(player.currentMap) ||
    maps[0];

  await safeEdit(
    ctx,
    `🗺️ *MAPA DO MUNDO*

📍 Atual: ${current.emoji} *${current.name}*
${current.description}

Escolha seu destino:`,
    {
      parse_mode: 'Markdown',
      ...buildTravelKeyboard(player)
    }
  );
}

async function handleTravelTo(ctx) {
  const mapId = ctx.match?.[1];

  const player = getPlayer(ctx.from.id);
  const map = getMapById(mapId);

  if (!map) {
    return ctx.answerCbQuery(
      'Mapa inválido.',
      { show_alert: true }
    );
  }

  if (!canPlayerEnter(player, mapId)) {
    return ctx.answerCbQuery(
      `Nível ${map.levelReq} necessário.`,
      { show_alert: true }
    );
  }

  player.currentMap = mapId;
  savePlayer(ctx.from.id, player);

  await safeEdit(
    ctx,
    `🚶 *Viagem concluída!*

${map.emoji} *${map.name}*
${map.description}`,
    {
      parse_mode: 'Markdown',
      ...mainMenu()
    }
  );
}

async function handleTravelLocked(ctx) {
  await ctx.answerCbQuery(
    '🔒 Mapa bloqueado.',
    { show_alert: true }
  );
}

module.exports = {
  handleTravel,
  handleTravelTo,
  handleTravelLocked
};