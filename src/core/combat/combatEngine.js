const { calculateDamage } = require('./damageCalc');
const { activateSoul } = require('../player/souls');

function trimLogs(logs, max = 8) {
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
      souls: Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [null, null],
      shield: 0,
      shieldDuration: 0
    },
    enemy: {
      id: enemy.id || enemy.name,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.hp,
      atk: enemy.atk,
      def: enemy.def,
      crit: enemy.crit || 5,
      level: enemy.level || 1,
      xp: enemy.xp || 0,
      gold: enemy.gold || 0,
      isBoss: !!enemy.isBoss,
      frozen: false,
      bleedTurns: 0,
      poisonTurns: 0,
      defReduction: null
    },
    turn: 1,
    status: 'ongoing',
    rewards: null,
    logs: [`⚔️ Um ${enemy.name} surgiu das sombras!`],
    classSkillUsedThisTurn: false,
    lastDamageDealt: 0,
    lastDamageReceived: 0
  };
}

function applyTurnEffects(fight) {
  if (fight.status !== 'ongoing') return false;

  if (fight.enemy.bleedTurns > 0) {
    const bleedDamage = Math.max(1, Math.floor(fight.enemy.maxHp * 0.05));
    fight.enemy.hp = Math.max(0, fight.enemy.hp - bleedDamage);
    fight.logs.push(`🩸 Sangramento causou *${bleedDamage}* dano.`);
    fight.enemy.bleedTurns--;
  }

  if (fight.enemy.poisonTurns > 0) {
    const poisonDamage = Math.max(1, Math.floor(fight.enemy.maxHp * 0.04));
    fight.enemy.hp = Math.max(0, fight.enemy.hp - poisonDamage);
    fight.logs.push(`☠️ Veneno causou *${poisonDamage}* dano.`);
    fight.enemy.poisonTurns--;
  }

  if (fight.enemy.defReduction && fight.enemy.defReduction.turns > 0) {
    fight.enemy.defReduction.turns--;
    if (fight.enemy.defReduction.turns === 0) {
      delete fight.enemy.defReduction;
      fight.logs.push('🛡️ A defesa do inimigo voltou ao normal.');
    }
  }

  if (fight.enemy.hp <= 0) {
    fight.status = 'win';
    fight.rewards = { xp: fight.enemy.xp, gold: fight.enemy.gold };
    fight.logs.push(`💀 ${fight.enemy.name} foi derrotado!`);
    return true;
  }

  return false;
}

function useClassSkill(fight) {
  if (fight.status !== 'ongoing') return null;
  if (fight.classSkillUsedThisTurn) {
    fight.logs.push('⏳ Você já usou sua habilidade neste turno.');
    return null;
  }

  const className = fight.player.className;
  let result = null;

  switch (className) {
    case 'guerreiro': {
      const dmg = calculateDamage(fight.player, fight.enemy, { multiplier: 1.4 });
      fight.enemy.hp = Math.max(0, fight.enemy.hp - dmg.damage);
      fight.enemy.defReduction = { value: Math.floor(fight.enemy.def * 0.3), turns: 3 };
      result = { damage: dmg.damage, isCrit: dmg.isCrit, effect: 'Defesa do inimigo reduzida em 30% por 3 turnos.' };
      fight.logs.push(dmg.isCrit ? `💥 CRÍTICO! Golpe Fraturante causou *${dmg.damage}* dano!` : `⚔️ Golpe Fraturante causou *${dmg.damage}* dano!`);
      break;
    }

    case 'arqueiro': {
      const dmg = calculateDamage(fight.player, fight.enemy, { multiplier: 1.2 });
      fight.enemy.hp = Math.max(0, fight.enemy.hp - dmg.damage);
      fight.enemy.bleedTurns = 3;
      result = { damage: dmg.damage, isCrit: dmg.isCrit, effect: 'Sangramento por 3 turnos.' };
      fight.logs.push(dmg.isCrit ? `💥 CRÍTICO! Flecha Sombria causou *${dmg.damage}* dano!` : `🏹 Flecha Sombria causou *${dmg.damage}* dano!`);
      break;
    }

    case 'mago': {
      const dmg = calculateDamage(fight.player, fight.enemy, { multiplier: 1.3 });
      fight.enemy.hp = Math.max(0, fight.enemy.hp - dmg.damage);
      const freezeChance = 0.35;
      if (Math.random() < freezeChance) {
        fight.enemy.frozen = true;
        result = { damage: dmg.damage, isCrit: dmg.isCrit, effect: 'Inimigo congelado! Perderá o próximo turno.' };
      } else {
        result = { damage: dmg.damage, isCrit: dmg.isCrit, effect: 'Toque gélido, mas não congelou.' };
      }
      fight.logs.push(dmg.isCrit ? `💥 CRÍTICO! Toque Gélido causou *${dmg.damage}* dano!` : `❄️ Toque Gélido causou *${dmg.damage}* dano!`);
      break;
    }

    default:
      return null;
  }

  fight.classSkillUsedThisTurn = true;
  if (result?.effect) fight.logs.push(`✨ ${result.effect}`);
  applyTurnEffects(fight);
  fight.logs = trimLogs(fight.logs);
  return result;
}

function useSoul(fight, soulIndex) {
  if (fight.status !== 'ongoing') return null;
  const soul = fight.player.souls[soulIndex];

  if (!soul) {
    fight.logs.push('❌ Nenhuma alma equipada neste slot.');
    return null;
  }

  const result = activateSoul(soul, fight);
  if (result?.message) fight.logs.push(result.message);

  if (fight.enemy.hp <= 0) {
    fight.status = 'win';
    fight.rewards = { xp: fight.enemy.xp, gold: fight.enemy.gold };
    fight.logs.push(`💀 ${fight.enemy.name} foi derrotado!`);
  }

  fight.logs = trimLogs(fight.logs);
  return result;
}

function normalAttack(fight) {
  const result = calculateDamage(fight.player, fight.enemy);
  fight.enemy.hp = Math.max(0, fight.enemy.hp - result.damage);
  fight.lastDamageDealt = result.damage;
  fight.logs.push(result.isCrit ? `💥 CRÍTICO! Você causou *${result.damage}* dano!` : `🗡️ Você causou *${result.damage}* dano!`);
  return result;
}

function processPlayerTurn(fight, isSkill = false) {
  if (fight.status !== 'ongoing') return null;
  fight.classSkillUsedThisTurn = false;

  const result = isSkill ? useClassSkill(fight) || normalAttack(fight) : normalAttack(fight);
  const enemySkipped = applyTurnEffects(fight);

  if (fight.enemy.hp <= 0) {
    fight.status = 'win';
    fight.rewards = { xp: fight.enemy.xp, gold: fight.enemy.gold };
    fight.logs.push(`💀 ${fight.enemy.name} foi derrotado!`);
  }

  fight.logs = trimLogs(fight.logs);
  return { result, enemySkipped };
}

function processEnemyTurn(fight) {
  if (fight.status !== 'ongoing') return null;

  if (fight.enemy.frozen) {
    fight.logs.push(`❄️ ${fight.enemy.name} está congelado e não atacou.`);
    fight.enemy.frozen = false;
    fight.turn++;
    fight.logs = trimLogs(fight.logs);
    return null;
  }

  const result = calculateDamage(fight.enemy, fight.player);
  fight.player.hp = Math.max(0, fight.player.hp - result.damage);
  fight.lastDamageReceived = result.damage;
  fight.logs.push(result.isCrit ? `💥 CRÍTICO! ${fight.enemy.name} causou *${result.damage}* dano em você!` : `👹 ${fight.enemy.name} causou *${result.damage}* dano!`);

  if (fight.player.hp <= 0) {
    fight.status = 'loss';
    fight.logs.push(`☠️ Você foi derrotado por ${fight.enemy.name}...`);
  }

  fight.turn++;
  fight.logs = trimLogs(fight.logs);
  return result;
}

function attemptFlee(fight) {
  if (fight.status !== 'ongoing') return false;

  const success = Math.random() <= 0.6;
  if (success) {
    fight.status = 'fled';
    fight.logs.push('🏃 Você fugiu com sucesso.');
  } else {
    fight.logs.push('🚫 Não conseguiu fugir!');
    processEnemyTurn(fight);
  }

  fight.logs = trimLogs(fight.logs);
  return success;
}

module.exports = {
  createFight,
  processPlayerTurn,
  processEnemyTurn,
  attemptFlee,
  useSoul
};