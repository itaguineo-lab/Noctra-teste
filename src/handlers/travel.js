const { getPlayer, savePlayer } = require('../core/player/playerService');
const { maps, getMapById, canPlayerEnter } = require('../core/world/maps');
const { Markup } = require('telegraf');
const { mainMenu } = require('../menus/mainMenu');

async function safeEdit(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch {
    await ctx.reply(text, options);
  }
}

function buildTravelKeyboard(player) {
  const keyboard = [];

  for (const map of maps) {
    const unlocked = player.level >= map.levelReq;
    const current = player.currentMap === map.id;
    const prefix = current ? '📍' : unlocked ? '✅' : '🔒';
    const label = `${prefix} ${map.emoji} ${map.name} (Lv ${map.levelReq})`;

    keyboard.push([
      Markup.button.callback(label, unlocked ? `travel_to_${map.id}` : 'travel_locked')
    ]);
  }

  keyboard.push([Markup.button.callback('◀️ Voltar', 'menu')]);
  return Markup.inlineKeyboard(keyboard);
}

function renderTravelText(player) {
  const current = getMapById(player.currentMap) || maps[0];
  return `🗺️ *Mapa do Mundo*

📍 Atual: ${current.emoji} *${current.name}*
📖 ${current.description}

Escolha seu destino:`;
}

async function handleTravel(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    if (!player.currentMap) {
      player.currentMap = maps[0].id;
      savePlayer(ctx.from.id, player);
    }

    await safeEdit(ctx, renderTravelText(player), {
      parse_mode: 'Markdown',
      ...buildTravelKeyboard(player)
    });
  } catch (error) {
    console.error('Erro ao abrir viagem:', error);
    await ctx.answerCbQuery('Erro ao carregar mapas.');
  }
}

async function handleTravelTo(ctx) {
  try {
    const mapId = ctx.match?.[1];
    if (!mapId) return ctx.answerCbQuery('Mapa inválido!', true);

    const player = getPlayer(ctx.from.id);
    const map = getMapById(mapId);
    if (!map) return ctx.answerCbQuery('Mapa inválido!', true);
    if (!canPlayerEnter(player, mapId)) return ctx.answerCbQuery(`Você precisa ser nível ${map.levelReq}.`, true);
    if (player.currentMap === mapId) return ctx.answerCbQuery('📍 Você já está neste mapa.', true);

    player.currentMap = mapId;
    savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`🚶 Viajando para ${map.name}...`);
    await safeEdit(ctx, `🗺️ *Viagem concluída!*

${map.emoji} *${map.name}*
${map.description}`, {
      parse_mode: 'Markdown',
      ...mainMenu()
    });
  } catch (error) {
    console.error('Erro ao viajar:', error);
    await ctx.answerCbQuery('Erro ao viajar.');
  }
}

async function handleTravelLocked(ctx) {
  await ctx.answerCbQuery('🔒 Este mapa ainda está bloqueado. Suba de nível para desbloquear.', true);
}

module.exports = {
  handleTravel,
  handleTravelTo,
  handleTravelLocked
};