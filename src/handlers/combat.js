const { getPlayer, savePlayer, recalculateStats } = require('../core/player/playerService');
const { consumeEnergy } = require('../services/energyService');
const { processVictory } = require('../services/rewardService');
const {
  createFight,
  processPlayerTurn,
  processEnemyTurn,
  attemptFlee,
  useSoul
} = require('../core/combat/combatEngine');
const { combatMenu, postCombatMenu } = require('../menus/combatMenu');
const { progressBar } = require('../utils/formatters');
const { getRandomEnemy } = require('../core/world/enemies');

const activeFights = new Map();

function renderFightText(fight) {
  const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8);
  const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8);

  let text = `⚔️ *COMBATE* | Turno ${fight.turn}

`;
  text += `👤 *${fight.player.name}* (${fight.player.className})
`;
  text += `❤️ HP: ${fight.player.hp}/${fight.player.maxHp}
`;
  text += `[${playerBar}]

`;
  text += `👾 *${fight.enemy.name}* (Lv ${fight.enemy.level})
`;
  text += `❤️ HP: ${fight.enemy.hp}/${fight.enemy.maxHp}
`;
  text += `[${enemyBar}]

`;
  text += `📜 *Últimas ações:*
${fight.logs.slice(-4).join('
')}`;
  return text;
}

async function editMessage(ctx, text, options = {}) {
  try {
    await ctx.editMessageText(text, options);
  } catch {
    await ctx.reply(text, options);
  }
}

async function finishFight(ctx, fight) {
  const player = getPlayer(ctx.from.id);

  if (fight.status === 'win') {
    const rewards = processVictory(player, fight.enemy);
    player.hp = fight.player.hp;
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    activeFights.delete(ctx.from.id);

    await editMessage(
      ctx,
      `🏆 *VITÓRIA!*

📜 ${fight.logs.slice(-4).join('
')}

✨ +${rewards.xp} XP
💰 +${rewards.gold} Ouro${rewards.droppedSoul ? `
💀 Nova alma: ${rewards.droppedSoul.name}` : ''}`,
      { parse_mode: 'Markdown', ...postCombatMenu() }
    );
    return;
  }

  if (fight.status === 'loss') {
    player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
    savePlayer(ctx.from.id, player);
    activeFights.delete(ctx.from.id);

    await editMessage(
      ctx,
      `💀 *DERROTA...*

${fight.logs.slice(-4).join('
')}

Você reviveu com 25% de HP.`,
      { parse_mode: 'Markdown', ...postCombatMenu() }
    );
    return;
  }

  if (fight.status === 'fled') {
    player.hp = fight.player.hp;
    savePlayer(ctx.from.id, player);
    activeFights.delete(ctx.from.id);

    await editMessage(
      ctx,
      `🏃 *FUGA*

${fight.logs.slice(-4).join('
')}`,
      { parse_mode: 'Markdown', ...postCombatMenu() }
    );
  }
}

async function handleHunt(ctx) {
  try {
    const player = getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Perfil não encontrado.');

    if (player.energy < 1) {
      return ctx.answerCbQuery('⚡ Energia insuficiente.', true);
    }

    if (!consumeEnergy(player, 1)) {
      return ctx.answerCbQuery('⚡ Energia insuficiente.', true);
    }

    savePlayer(ctx.from.id, player);

    if (activeFights.has(ctx.from.id)) {
      const fight = activeFights.get(ctx.from.id);
      await editMessage(ctx, renderFightText(fight), { parse_mode: 'Markdown', ...combatMenu(fight) });
      return;
    }

    const mapId = player.currentMap || 'clareira_sombria';
    const enemy = getRandomEnemy(mapId, player.level);
    if (!enemy) return ctx.reply('❌ Nenhum inimigo encontrado neste local.');

    const fight = createFight(player, enemy);
    activeFights.set(ctx.from.id, fight);

    await editMessage(ctx, renderFightText(fight), { parse_mode: 'Markdown', ...combatMenu(fight) });
  } catch (err) {
    console.error('Erro em handleHunt:', err);
    await ctx.reply('❌ Erro ao iniciar combate. Tente novamente.');
  }
}

async function handleAttack(ctx) {
  try {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return ctx.answerCbQuery('Nenhum combate ativo.', true);

    processPlayerTurn(fight, false);
    if (fight.status === 'ongoing') {
      processEnemyTurn(fight);
    }

    if (fight.status !== 'ongoing') {
      await finishFight(ctx, fight);
      return;
    }

    await editMessage(ctx, renderFightText(fight), { parse_mode: 'Markdown', ...combatMenu(fight) });
  } catch (err) {
    console.error('Erro em handleAttack:', err);
    await ctx.answerCbQuery('Erro no ataque. Tente novamente.');
  }
}

async function handleSkill(ctx) {
  try {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return ctx.answerCbQuery('Nenhum combate ativo.', true);

    processPlayerTurn(fight, true);
    if (fight.status === 'ongoing') {
      processEnemyTurn(fight);
    }

    if (fight.status !== 'ongoing') {
      await finishFight(ctx, fight);
      return;
    }

    await editMessage(ctx, renderFightText(fight), { parse_mode: 'Markdown', ...combatMenu(fight) });
  } catch (err) {
    console.error('Erro em handleSkill:', err);
    await ctx.answerCbQuery('Erro ao usar habilidade.');
  }
}

async function handleSoul(ctx) {
  try {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    useSoul(fight, 0);
    if (fight.status === 'ongoing') {
      processEnemyTurn(fight);
    }

    if (fight.status !== 'ongoing') {
      await finishFight(ctx, fight);
      return;
    }

    await editMessage(ctx, renderFightText(fight), { parse_mode: 'Markdown', ...combatMenu(fight) });
  } catch (err) {
    console.error('Erro em handleSoul:', err);
    await ctx.answerCbQuery('Erro ao usar alma.');
  }
}

async function handleFlee(ctx) {
  try {
    await ctx.answerCbQuery();
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return;

    attemptFlee(fight);
    if (fight.status !== 'ongoing') {
      await finishFight(ctx, fight);
      return;
    }

    await editMessage(ctx, renderFightText(fight), { parse_mode: 'Markdown', ...combatMenu(fight) });
  } catch (err) {
    console.error('Erro em handleFlee:', err);
    await ctx.answerCbQuery('Erro ao fugir.');
  }
}

module.exports = {
  handleHunt,
  handleAttack,
  handleSkill,
  handleSoul,
  handleFlee,
  activeFights
};