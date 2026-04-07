const ITEM_POOL = {
    level1: {
        weapon: [
            'Espada do Vigia',
            'Machado Brutal',
            'Arco do Caçador',
            'Lança do Batedor',
            'Varinha Arcana',
            'Grimório Antigo',
            'Orbe Azul'
        ],
        armor: [
            'Armadura do Soldado',
            'Escudo de Ferro',
            'Botas de Couro'
        ],
        jewelry: [
            'Anel Comum',
            'Amuleto Comum'
        ]
    },
    level8: {
        weapon: [
            'Espada Tumular',
            'Machado Carniceiro',
            'Arco dos Ossos',
            'Lança Élfica',
            'Cajado Tumular',
            'Grimório das Almas',
            'Orbe do Vazio'
        ],
        armor: [
            'Armadura do Cavaleiro Negro',
            'Escudo do Corvo',
            'Botas Sombrias'
        ],
        jewelry: [
            'Anel Incomum',
            'Amuleto Incomum'
        ]
    },
    level15: {
        weapon: [
            'Espada de Noctra',
            'Machado do Caos',
            'Arco do Eclipse',
            'Lança Lunar',
            'Cajado de Noctra',
            'Grimório do Eclipse',
            'Orbe da Eternidade'
        ],
        armor: [
            'Armadura do Eclipse',
            'Escudo do Abismo',
            'Botas do Vazio'
        ],
        jewelry: [
            'Anel Épico',
            'Amuleto Lendário'
        ]
    }
};

const RARITIES = [
    { name: 'Comum', multiplier: 1 },
    { name: 'Incomum', multiplier: 1.2 },
    { name: 'Raro', multiplier: 1.5 },
    { name: 'Épico', multiplier: 1.9 },
    { name: 'Lendário', multiplier: 2.4 }
];

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getTierByMap(mapId = 1) {
    if (mapId === 1) return 'level1';
    if (mapId === 2) return 'level8';
    return 'level15';
}

function getLevelFromTier(tier) {
    return tier === 'level1' ? 1 : tier === 'level8' ? 8 : 15;
}

function buildStats(tier) {
    if (tier === 'level1') {
        return { atk: rand(3, 6), def: rand(1, 4), hp: rand(5, 12), crit: rand(1, 4) };
    }
    if (tier === 'level8') {
        return { atk: rand(6, 10), def: rand(3, 6), hp: rand(10, 18), crit: rand(3, 6) };
    }
    return { atk: rand(10, 16), def: rand(5, 9), hp: rand(16, 26), crit: rand(5, 9) };
}

function rollRarity() {
    const roll = Math.random();
    if (roll < 0.45) return RARITIES[0];
    if (roll < 0.75) return RARITIES[1];
    if (roll < 0.9) return RARITIES[2];
    if (roll < 0.98) return RARITIES[3];
    return RARITIES[4];
}

function generateDrop(mapId = 1) {
    const tier = getTierByMap(mapId);
    const category = randomFrom(['weapon', 'armor', 'jewelry']);
    const name = randomFrom(ITEM_POOL[tier][category]);
    const rarity = rollRarity();
    const base = buildStats(tier);

    const atk = Math.round(base.atk * rarity.multiplier);
    const def = Math.round(base.def * rarity.multiplier);
    const hp = Math.round(base.hp * rarity.multiplier);
    const crit = Math.round(base.crit * rarity.multiplier);

    let slot = 'weapon';
    if (category === 'armor') {
        slot = Math.random() < 0.35 ? 'boots' : 'armor';
    }
    if (category === 'jewelry') {
        slot = Math.random() < 0.5 ? 'ring' : 'necklace';
    }

    return {
        id: Date.now() + rand(1000, 9999),
        name,
        rarity: rarity.name,
        level: getLevelFromTier(tier),
        atk,
        def,
        hp,
        crit,
        power: atk * 2 + def + Math.floor(hp / 2) + crit * 3,
        slot,
        category
    };
}

module.exports = { generateDrop, ITEM_POOL };
