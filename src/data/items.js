const rarityMultiplier = {
  Comum: 1,
  Incomum: 1.3,
  Raro: 1.7,
  Épico: 2.3,
  Lendário: 3.2,
  Mítico: 5
};

const rarityData = {
  Comum: { price: 50, emoji: '⚪' },
  Incomum: { price: 120, emoji: '🟢' },
  Raro: { price: 300, emoji: '🔵' },
  Épico: { price: 800, emoji: '🟣' },
  Lendário: { price: 2000, emoji: '🟠' },
  Mítico: { price: 5000, emoji: '🔴' }
};

const itemTypes = [
  { slot: 'weapon', namePrefix: 'Espada', atkBase: 5, defBase: 0, critBase: 2, hpBase: 0 },
  { slot: 'armor', namePrefix: 'Armadura', atkBase: 0, defBase: 5, critBase: 0, hpBase: 10 },
  { slot: 'necklace', namePrefix: 'Amuleto', atkBase: 2, defBase: 1, critBase: 3, hpBase: 5 },
  { slot: 'ring', namePrefix: 'Anel', atkBase: 3, defBase: 0, critBase: 4, hpBase: 3 },
  { slot: 'boots', namePrefix: 'Bota', atkBase: 0, defBase: 3, critBase: 1, hpBase: 4 }
];

/**
 * Raridades permitidas por mapa
 */
const mapRarityRules = {
  clareira_sombria: ['Comum', 'Incomum'],
  cripta_em_ruinas: ['Incomum', 'Raro'],
  pantano_corrompido: ['Raro', 'Épico'],
  deserto_incandescente: ['Épico']
};

/**
 * Escolhe raridade normal por mapa
 */
function getMapRarity(currentMap = 'clareira_sombria') {
  const allowed = mapRarityRules[currentMap] || ['Comum'];

  const weightedPool = [];

  allowed.forEach(rarity => {
    if (rarity === 'Comum') weightedPool.push(...Array(50).fill(rarity));
    if (rarity === 'Incomum') weightedPool.push(...Array(30).fill(rarity));
    if (rarity === 'Raro') weightedPool.push(...Array(15).fill(rarity));
    if (rarity === 'Épico') weightedPool.push(...Array(5).fill(rarity));
  });

  return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

/**
 * Loot exclusivo de boss
 */
function getBossRarity(currentMap = 'clareira_sombria', isDungeonBoss = false) {
  const roll = Math.random() * 100;

  if (isDungeonBoss) {
    if (roll <= 3) return 'Mítico';
    if (roll <= 25) return 'Lendário';
    if (roll <= 70) return 'Épico';
    return 'Raro';
  }

  switch (currentMap) {
    case 'clareira_sombria':
      return roll <= 20 ? 'Raro' : 'Incomum';

    case 'cripta_em_ruinas':
      if (roll <= 10) return 'Lendário';
      if (roll <= 45) return 'Épico';
      return 'Raro';

    case 'pantano_corrompido':
      if (roll <= 15) return 'Lendário';
      if (roll <= 60) return 'Épico';
      return 'Raro';

    case 'deserto_incandescente':
      if (roll <= 25) return 'Lendário';
      if (roll <= 30) return 'Mítico';
      return 'Épico';

    default:
      return 'Comum';
  }
}

/**
 * Geração principal
 */
function generateItem(playerLevel, forcedType = null, options = {}) {
  const {
    currentMap = 'clareira_sombria',
    isBoss = false,
    isDungeonBoss = false
  } = options;

  const type = forcedType
    ? itemTypes.find(t => t.slot === forcedType) || itemTypes[0]
    : itemTypes[Math.floor(Math.random() * itemTypes.length)];

  const rarityName = isBoss
    ? getBossRarity(currentMap, isDungeonBoss)
    : getMapRarity(currentMap);

  const rarity = rarityData[rarityName];
  const mult = rarityMultiplier[rarityName] || 1;
  const levelBonus = Math.max(1, Math.floor(playerLevel * 0.8));

  const id = `item_${Date.now()}_${Math.floor(Math.random() * 999999)}`;

  return {
    id,
    name: `${type.namePrefix} ${rarityName}`,
    slot: type.slot,
    rarity: rarityName,
    atk: Math.floor((type.atkBase + levelBonus) * mult),
    def: Math.floor((type.defBase + levelBonus) * mult),
    crit: Math.floor((type.critBase + levelBonus / 2) * mult),
    hp: Math.floor((type.hpBase + levelBonus * 2) * mult),
    price: Math.floor(rarity.price * (1 + playerLevel * 0.15)),
    emoji: rarity.emoji
  };
}

module.exports = {
  itemTypes,
  rarityMultiplier,
  generateItem,
  getMapRarity,
  getBossRarity
};