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

function buildStatsBySlot(tier, slot, itemName = '') {
    const isShield = itemName.toLowerCase().includes('escudo');

    const scale =
        tier === 'level1'
            ? 1
            : tier === 'level8'
            ? 1.8
            : 2.8;

    if (slot === 'weapon') {
        return {
            atk: rand(4, 7) * scale,
            def: rand(0, 2),
            hp: rand(0, 5),
            crit: rand(2, 5)
        };
    }

    if (isShield) {
        return {
            atk: 0,
            def: rand(5, 8) * scale,
            hp: rand(8, 15) * scale,
            crit: 0
        };
    }

    if (slot === 'armor') {
        return {
            atk: 0,
            def: rand(4, 7) * scale,
            hp: rand(6, 12) * scale,
            crit: rand(0, 1)
        };
    }

    if (slot === 'boots') {
        return {
            atk: 0,
            def: rand(2, 4) * scale,
            hp: rand(4, 8) * scale,
            crit: rand(2, 4)
        };
    }

    if (slot === 'ring' || slot === 'necklace') {
        return {
            atk: rand(1, 3) * scale,
            def: rand(1, 2),
            hp: rand(4, 8) * scale,
            crit: rand(3, 6)
        };
    }

    return {
        atk: 1,
        def: 1,
        hp: 1,
        crit: 1
    };
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

    let slot = 'weapon';

    if (category === 'armor') {
        if (name.toLowerCase().includes('escudo')) {
            slot = 'armor';
        } else {
            slot = Math.random() < 0.35 ? 'boots' : 'armor';
        }
    }

    if (category === 'jewelry') {
        slot = Math.random() < 0.5 ? 'ring' : 'necklace';
    }

    const base = buildStatsBySlot(tier, slot, name);

    const atk = Math.round(base.atk * rarity.multiplier);
    const def = Math.round(base.def * rarity.multiplier);
    const hp = Math.round(base.hp * rarity.multiplier);
    const crit = Math.round(base.crit * rarity.multiplier);

    return {
        id: Date.now() + rand(1000, 9999),
        name,
        rarity: rarity.name,
        level: getLevelFromTier(tier),
        atk,
        def,
        hp,
        crit,
        power:
            atk * 2 +
            def * 2 +
            Math.floor(hp / 2) +
            crit * 3,
        slot,
        category
    };
}

module.exports = {
    generateDrop,
    ITEM_POOL
};