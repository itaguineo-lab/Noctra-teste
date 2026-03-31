const {
  getPlayer,
  savePlayer,
  recalculateStats
} = require('../core/player/playerService');

const {
  consumeEnergy
} = require('../services/energyService');

const {
  processVictory
} = require('../services/rewardService');

const {
  createFight,
  processPlayerTurn,
  processEnemyTurn,
  attemptFlee,
  useSoul
} = require('../core/combat/combatEngine');

const {
  combatMenu,
  postCombatMenu
} = require('../menus/combatMenu');

const {
  progressBar
} = require('../utils/formatters');

const {
  getRandomEnemy
} = require('../core/world/enemies');

const activeFights = new Map();

function renderFightText(fight) {
  const playerBar = progressBar(
    fight.player.hp,
    fight.player.maxHp,
    8
  );

  const enemyBar = progressBar(
    fight.enemy.hp,
    fight.enemy.maxHp,
    8
  );

  return `⚔️ *COMBATE* | Turno ${fight.turn}

👤 *${fight.player.name}* (${fight.player.className})
❤️ HP: ${fight.player.hp}/${fight.player.maxHp}
[${playerBar}]

👾 *${fight.enemy.name}* (Lv ${fight.enemy.level})
❤️ HP: ${fight.enemy.hp}/${fight.enemy.maxHp}
[${enemyBar}]

📜 *Últimas ações:*
${fight.logs.slice(-4).join('\n')}`;
}

async function editMessage(ctx, text, options = {}) {
  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }
  } catch {
    await ctx.reply(text, options);
  }
}

async function finishFight(ctx, fight) {
  const player = getPlayer(ctx.from.id);

  if (fight.status === 'win') {
    const rewards = processVictory(
      player,
      fight.enemy
    );

    player.hp = fight.player.hp;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    activeFights.delete(ctx.from.id);

    return editMessage(
      ctx,
      `🏆 *VITÓRIA!*

📜 ${fight.logs.slice(-4).join('\n')}

✨ +${rewards.xp} XP
💰 +${rewards.gold} Ouro`,
      {
        parse_mode: 'Markdown',
        ...postCombatMenu()
      }
    );
  }

  if (fight.status === 'loss') {
    player.hp = Math.max(
      1,
      Math.floor(player.maxHp * 0.25)
    );

    savePlayer(ctx.from.id, player);
    activeFights.delete(ctx.from.id);

    return editMessage(
      ctx,
      `💀 *DERROTA*

${fight.logs.slice(-4).join('\n')}`,
      {
        parse_mode: 'Markdown',
        ...postCombatMenu()
      }
    );
  }

  if (fight.status === 'fled') {
    player.hp = fight.player.hp;

    savePlayer(ctx.from.id, player);
    activeFights.delete(ctx.from.id);

    return editMessage(
      ctx,
      `🏃 *FUGA*

${fight.logs.slice(-4).join('\n')}`,
      {
        parse_mode: 'Markdown',
        ...postCombatMenu()
      }
    );
  }
}

async function handleHunt(ctx) {
  const player = getPlayer(ctx.from.id);

  if (!player) {
    return ctx.reply('❌ Perfil não encontrado.');
  }

  if (player.energy < 1) {
    return ctx.reply('⚡ Energia insuficiente.');
  }

  consumeEnergy(player, 1);
  savePlayer(ctx.from.id, player);

  const enemy = getRandomEnemy(
    player.currentMap || 'clareira_sombria',
    player.level
  );

  const fight = createFight(player, enemy);

  activeFights.set(ctx.from.id, fight);

  await editMessage(
    ctx,
    renderFightText(fight),
    {
      parse_mode: 'Markdown',
      ...combatMenu()
    }
  );
}

async function handleAttack(ctx) {
  await ctx.answerCbQuery();

  const fight = activeFights.get(ctx.from.id);
  if (!fight) return;

  processPlayerTurn(fight, false);

  if (fight.status === 'ongoing') {
    processEnemyTurn(fight);
  }

  if (fight.status !== 'ongoing') {
    return finishFight(ctx, fight);
  }

  await editMessage(
    ctx,
    renderFightText(fight),
    {
      parse_mode: 'Markdown',
      ...combatMenu()
    }
  );
}

async function handleSoul(ctx) {
  await ctx.answerCbQuery();

  const fight = activeFights.get(ctx.from.id);
  if (!fight) return;

  useSoul(fight, 0);

  if (fight.status === 'ongoing') {
    processEnemyTurn(fight);
  }

  if (fight.status !== 'ongoing') {
    return finishFight(ctx, fight);
  }

  await editMessage(
    ctx,
    renderFightText(fight),
    {
      parse_mode: 'Markdown',
      ...combatMenu()
    }
  );
}

async function handleConsumables(ctx) {
  await ctx.answerCbQuery();

  const fight = activeFights.get(ctx.from.id);
  if (!fight) return;

  const player = getPlayer(ctx.from.id);

  if (
    !player.consumables ||
    (player.consumables.potionHp || 0) <= 0
  ) {
    return ctx.answerCbQuery(
      '❌ Você não possui poções.',
      { show_alert: true }
    );
  }

  player.consumables.potionHp -= 1;

  const heal = Math.floor(
    fight.player.maxHp * 0.4
  );

  fight.player.hp = Math.min(
    fight.player.maxHp,
    fight.player.hp + heal
  );

  fight.logs.push(
    `🧪 ${fight.player.name} usou uma poção (+${heal} HP)`
  );

  savePlayer(ctx.from.id, player);

  processEnemyTurn(fight);

  if (fight.status !== 'ongoing') {
    return finishFight(ctx, fight);
  }

  await editMessage(
    ctx,
    renderFightText(fight),
    {
      parse_mode: 'Markdown',
      ...combatMenu()
    }
  );
}

async function handleFlee(ctx) {
  await ctx.answerCbQuery();

  const fight = activeFights.get(ctx.from.id);
  if (!fight) return;

  attemptFlee(fight);

  return finishFight(ctx, fight);
}

module.exports = {
  handleHunt,
  handleAttack,
  handleSoul,
  handleConsumables,
  handleFlee,
  activeFights
};