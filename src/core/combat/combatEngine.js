const { calculateDamage } = require('./damageCalc');
const { activateSoul } = require('../player/souls');

function trimLogs(logs, max = 6) {
  return logs.slice(-max);
}

function createFight(player, enemy) {
  return {
    player: {
      id: player.id,
      name: player.name,
      className: player.class,
      hp: player.hp,
      maxHp: player.maxHp,
      atk: player.atk,
      def: player.def,
      crit: player.crit || 5,
      souls: player.soulsEquipped || player.souls || [null, null]
    },
    enemy: {
      ...enemy,
      maxHp: enemy.hp
    },
    turn: 1,
    status: 'ongoing',
    rewards: null,
    logs: [`⚔️ Um ${enemy.name} surgiu das sombras!`]
  };
}

function normalAttack(fight) {
  const result = calculateDamage(fight.player, fight.enemy);
  fight.enemy.hp = Math.max(0, fight.enemy.hp - result.damage);
  fight.logs.push(`🗡️ Você causou *${result.damage}* dano!`);

  if (fight.enemy.hp <= 0) {
    fight.status = 'win';
    fight.rewards = {
      xp: fight.enemy.xp || 0,
      gold: fight.enemy.gold || 0
    };
    fight.logs.push(`💀 ${fight.enemy.name} foi derrotado!`);
  }

  fight.logs = trimLogs(fight.logs);
  return result;
}

function processPlayerTurn(fight, isSkill = false) {
  if (fight.status !== 'ongoing') return null;
  return normalAttack(fight);
}

function processEnemyTurn(fight) {
  if (fight.status !== 'ongoing') return null;

  const result = calculateDamage(fight.enemy, fight.player);
  fight.player.hp = Math.max(0, fight.player.hp - result.damage);
  fight.logs.push(`👹 ${fight.enemy.name} causou *${result.damage}* dano!`);

  if (fight.player.hp <= 0) {
    fight.status = 'loss';
  }

  fight.turn++;
  fight.logs = trimLogs(fight.logs);
  return result;
}

function useSoul(fight, slot = 0) {
  if (fight.status !== 'ongoing') return null;

  const soul = fight.player.souls[slot];
  if (!soul) {
    fight.logs.push('❌ Nenhuma alma equipada.');
    return null;
  }

  const result = activateSoul(soul, fight);
  if (result?.message) {
    fight.logs.push(result.message);
  }

  if (fight.enemy.hp <= 0) {
    fight.status = 'win';
    fight.rewards = {
      xp: fight.enemy.xp || 0,
      gold: fight.enemy.gold || 0
    };
  }

  fight.logs = trimLogs(fight.logs);
  return result;
}

function attemptFlee(fight) {
  if (fight.status !== 'ongoing') return false;

  const success = Math.random() <= 0.6;
  if (success) {
    fight.status = 'fled';
    fight.logs.push('🏃 Você fugiu com sucesso.');
  }

  return success;
}

module.exports = {
  createFight,
  processPlayerTurn,
  processEnemyTurn,
  attemptFlee,
  useSoul
};