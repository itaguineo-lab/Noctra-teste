const { getPlayer, savePlayer } = require('../core/player/playerService');
const { processVictory } = require('../services/rewardService');
const {
  createFight,
  processPlayerTurn,
  processEnemyTurn,
  attemptFlee,
  useSoul
} = require('../core/combat/combatEngine');
const { getRandomEnemy } = require('../core/world/enemies');
const { combatMenu, postCombatMenu } = require('../menus/combatMenu');

const activeFights = new Map();

function renderFightText(fight) {
  return `⚔️ *COMBATE*\n\n👤 ${fight.player.hp}/${fight.player.maxHp}\n👾 ${fight.enemy.name}: ${fight.enemy.hp}/${fight.enemy.maxHp}\n\n${fight.logs.join('\n')}`;
}

async function finishFight(ctx, fight) {
  const player = getPlayer(ctx.from.id);

  if (fight.status === 'win') {
    player.hp = fight.player.hp;
    const rewards = processVictory(player, fight.enemy);
    savePlayer(ctx.from.id, player);
    activeFights.delete(ctx.from.id);

    return ctx.editMessageText(
      `🏆 *VITÓRIA!*\n✨ +${rewards.xp} XP\n💰 +${rewards.gold} Ouro`,
      { parse_mode: 'Markdown', ...postCombatMenu() }
    );
  }
}

module.exports = { activeFights };