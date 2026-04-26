const test = require('node:test');
const assert = require('node:assert/strict');

const { BALANCE } = require('../src/data/balance');

test('Poção de Vida restaura 100% do HP em todos os contextos', () => {
  const potion = BALANCE.consumables.potionHp;

  assert.equal(potion.fullHeal, true);
  assert.equal(potion.combatHealPercent, 1);
  assert.equal(potion.outsideCombatHealPercent, 1);
  assert.equal(potion.dungeonHealPercent, 1);
});
