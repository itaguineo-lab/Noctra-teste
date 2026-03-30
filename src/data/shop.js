const villageItems = [
  {
    id: 'hp_potion',
    name: 'Poção de Vida',
    type: 'consumable',
    effect: 'hp',
    effectKey: 'potionHp',
    quantity: 1,
    currency: 'gold',
    price: 50,
    description: 'Recupera HP.'
  },
  {
    id: 'energy_potion',
    name: 'Poção de Energia',
    type: 'consumable',
    effect: 'energy',
    effectKey: 'potionEnergy',
    quantity: 1,
    currency: 'gold',
    price: 60,
    description: 'Recupera energia.'
  },
  {
    id: 'strength_tonic',
    name: 'Tônico de Força',
    type: 'consumable',
    effect: 'buff_atk',
    effectKey: 'tonicStrength',
    quantity: 1,
    currency: 'gold',
    price: 120,
    description: 'Aumenta o ataque temporariamente.'
  }
];

const castleItems = [
  {
    id: 'vip_7d',
    name: 'VIP 7 Dias',
    type: 'vip',
    days: 7,
    currency: 'nox',
    price: 18,
    description: 'Acesso VIP por 7 dias.'
  },
  {
    id: 'castle_key',
    name: 'Chave Sombria',
    type: 'key',
    value: 1,
    currency: 'nox',
    price: 5,
    description: 'Chave de acesso especial.'
  }
];

const arenaItems = [
  {
    id: 'arena_blade',
    name: 'Lâmina da Arena',
    type: 'equipment',
    slot: 'weapon',
    atk: 25,
    def: 5,
    crit: 5,
    currency: 'glory',
    price: 100,
    description: 'Espada de campeão.'
  },
  {
    id: 'arena_armor',
    name: 'Armadura do Campeão',
    type: 'equipment',
    slot: 'armor',
    atk: 0,
    def: 20,
    hp: 50,
    currency: 'glory',
    price: 120,
    description: 'Proteção de elite.'
  }
];

module.exports = {
  villageItems,
  castleItems,
  arenaItems
};