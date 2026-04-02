const raridades = [
  { name: 'Comum', chance: 50, price: 50, emoji: '⚪' },
  { name: 'Incomum', chance: 25, price: 120, emoji: '🟢' },
  { name: 'Raro', chance: 15, price: 300, emoji: '🔵' },
  { name: 'Épico', chance: 7, price: 800, emoji: '🟣' },
  { name: 'Lendário', chance: 2.5, price: 2000, emoji: '🟠' },
  { name: 'Mítico', chance: 0.5, price: 5000, emoji: '🔴' }
];

const rarityMultiplier = {
  Comum: 1,
  Incomum: 1.3,
  Raro: 1.7,
  Épico: 2.3,
  Lendário: 3.2,
  Mítico: 5
};

const itemTypes = [
  { slot: 'weapon', namePrefix: 'Espada', atkBase: 5, defBase: 0, critBase: 2, hpBase: 0 },
  { slot: 'armor', namePrefix: 'Armadura', atkBase: 0, defBase: 5, critBase: 0, hpBase: 10 },
  { slot: 'necklace', namePrefix: 'Amuleto', atkBase: 2, defBase: 1, critBase: 3, hpBase: 5 },
  { slot: 'ring', namePrefix: 'Anel', atkBase: 3, defBase: 0, critBase: 4, hpBase: 3 },
  { slot: 'boots', namePrefix: 'Bota', atkBase: 0, defBase: 3, critBase: 1, hpBase: 4 }
];

function getRarity() {
  const roll = Math.random() * 100;
  let total = 0;
  for (const rarity of raridades) {
    total += rarity.chance;
    if (roll <= total) return rarity;
  }
  return raridades[0];
}

function generateItem(playerLevel, forcedType = null) {
  const type = forcedType
    ? itemTypes.find(t => t.slot === forcedType) || itemTypes[0]
    : itemTypes[Math.floor(Math.random() * itemTypes.length)];
  const rarity = getRarity();
  const mult = rarityMultiplier[rarity.name] || 1;
  const levelBonus = Math.max(1, Math.floor(playerLevel * 0.8));
  return {
    id: `item_${Date.now()}_${Math.floor(Math.random() * 9999)}`, // string única
    name: `${type.namePrefix} ${rarity.name}`,
    slot: type.slot,
    rarity: rarity.name,
    atk: Math.floor((type.atkBase + levelBonus) * mult),
    def: Math.floor((type.defBase + levelBonus) * mult),
    crit: Math.floor((type.critBase + levelBonus / 2) * mult),
    hp: Math.floor((type.hpBase + levelBonus * 2) * mult),
    price: Math.floor(rarity.price * (1 + playerLevel * 0.15)),
    emoji: rarity.emoji
  };
}

module.exports = { raridades, itemTypes, generateItem };
