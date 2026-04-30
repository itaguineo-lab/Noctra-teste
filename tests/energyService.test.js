const test = require('node:test');
const assert = require('node:assert/strict');

const {
  updateEnergy,
  consumeEnergy,
  getTimeToNextEnergy,
  getRegenInterval
} = require('../src/services/energyService');

function restoreDateNow(originalNow) {
  Date.now = originalNow;
}

test('getRegenInterval respeita normal e VIP', () => {
  assert.equal(getRegenInterval({ vip: false }), 10 * 60 * 1000);
  assert.equal(getRegenInterval({ vip: true }), 8 * 60 * 1000);
});

test('consumeEnergy reduz energia e atualiza lastEnergyUpdate quando estava cheia', () => {
  const originalNow = Date.now;
  Date.now = () => 1_700_000_000_000;

  try {
    const player = {
      energy: 20,
      maxEnergy: 20,
      vip: false,
      lastEnergyUpdate: 1_699_999_000_000
    };

    const ok = consumeEnergy(player, 1);

    assert.equal(ok, true);
    assert.equal(player.energy, 19);
    assert.equal(player.lastEnergyUpdate instanceof Date, true);
    assert.equal(player.lastEnergyUpdate.getTime(), 1_700_000_000_000);
  } finally {
    restoreDateNow(originalNow);
  }
});

test('updateEnergy regenera energia proporcional ao tempo decorrido', () => {
  const originalNow = Date.now;
  Date.now = () => 2_000_000;

  try {
    const player = {
      energy: 5,
      maxEnergy: 20,
      vip: false,
      lastEnergyUpdate: 2_000_000 - (3 * 10 * 60 * 1000)
    };

    const changed = updateEnergy(player);

    assert.equal(changed, true);
    assert.equal(player.energy, 8);
  } finally {
    restoreDateNow(originalNow);
  }
});

test('getTimeToNextEnergy retorna 0 quando já está em energia máxima', () => {
  const player = {
    energy: 20,
    maxEnergy: 20,
    vip: false,
    lastEnergyUpdate: Date.now()
  };

  assert.equal(getTimeToNextEnergy(player), 0);
});
