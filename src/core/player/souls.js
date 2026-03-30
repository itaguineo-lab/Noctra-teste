const soulsList = [
  {
    id: 'soul_wolf',
    name: 'Alma do Lobo Sombrio',
    rarity: 'Comum',
    emoji: '🐺',
    effect: { type: 'damage', multiplier: 1.3 },
    dropChance: 0.15,
    minLevel: 1
  },
  {
    id: 'soul_heal',
    name: 'Alma Curadora',
    rarity: 'Comum',
    emoji: '💚',
    effect: { type: 'heal', multiplier: 0.3 },
    dropChance: 0.12,
    minLevel: 3
  },
  {
    id: 'soul_frost',
    name: 'Alma Gélida',
    rarity: 'Raro',
    emoji: '❄️',
    effect: { type: 'damage', multiplier: 1.45 },
    dropChance: 0.08,
    minLevel: 8
  },
  {
    id: 'soul_guardian',
    name: 'Alma Guardiã',
    rarity: 'Raro',
    emoji: '🛡️',
    effect: { type: 'passive', defBonus: 8, hpBonus: 20 },
    dropChance: 0.06,
    minLevel: 12
  },
  {
    id: 'soul_vampire',
    name: 'Alma Vampírica',
    rarity: 'Épico',
    emoji: '🩸',
    effect: { type: 'damage', multiplier: 1.6 },
    dropChance: 0.04,
    minLevel: 15
  },
  {
    id: 'soul_thunder',
    name: 'Alma Trovejante',
    rarity: 'Épico',
    emoji: '⚡',
    effect: { type: 'damage', multiplier: 1.75 },
    dropChance: 0.03,
    minLevel: 20
  },
  {
    id: 'soul_dragon',
    name: 'Alma Dracônica',
    rarity: 'Lendário',
    emoji: '🐉',
    effect: { type: 'passive', atkBonus: 15, critBonus: 5 },
    dropChance: 0.01,
    minLevel: 24
  }
];

function getSoulById(id) {
  return soulsList.find(soul => soul.id === id) || null;
}

function dropSoul(playerLevel) {
  const available = soulsList.filter(soul => soul.minLevel <= playerLevel);
  if (!available.length) return null;

  const roll = Math.random();
  let cumulative = 0;

  for (const soul of available) {
    cumulative += soul.dropChance;
    if (roll <= cumulative) {
      return {
        ...soul,
        instanceId: `${soul.id}_${Date.now()}`
      };
    }
  }

  return null;
}

function activateSoul(soul, state) {
  if (!soul || !state) {
    return { message: '❌ Alma inválida.' };
  }

  const effect = soul.effect || {};

  switch (effect.type) {
    case 'damage': {
      const damage = Math.floor((state.player.atk || 1) * (effect.multiplier || 1));
      state.enemy.hp = Math.max(0, state.enemy.hp - damage);
      return { damage, message: `✨ ${soul.name} causou ${damage} de dano!` };
    }

    case 'heal': {
      const heal = Math.floor((state.player.maxHp || 1) * (effect.multiplier || 1));
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      return { heal, message: `💚 ${soul.name} curou ${heal} HP!` };
    }

    case 'passive':
      return { message: `✨ ${soul.name} ativa um efeito passivo.` };

    default:
      return { message: `✨ ${soul.name} ativada!` };
  }
}

function getRarityEmoji(rarity) {
  const map = {
    Comum: '⚪',
    Incomum: '🟢',
    Raro: '🔵',
    Épico: '🟣',
    Lendário: '🟡',
    Mítico: '🔴'
  };

  return map[rarity] || '⚪';
}

module.exports = {
  soulsList,
  getSoulById,
  dropSoul,
  activateSoul,
  getRarityEmoji
};