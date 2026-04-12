const ITEM_POOL = {
    level1: {
        weapon: [
            { name: 'Espada do Vigia', class: 'guerreiro' },
            { name: 'Machado Brutal', class: 'guerreiro' },
            { name: 'Arco do Caçador', class: 'arqueiro' },
            { name: 'Lança do Batedor', class: 'arqueiro' },
            { name: 'Varinha Arcana', class: 'mago' },
            { name: 'Grimório Antigo', class: 'mago' },
            { name: 'Orbe Azul', class: 'mago' }
        ],
        armor: [
            { name: 'Armadura do Soldado', class: null },
            { name: 'Escudo de Ferro', class: null },
            { name: 'Botas de Couro', class: null }
        ],
        jewelry: [
            { name: 'Anel Comum', class: null },
            { name: 'Amuleto Comum', class: null }
        ]
    },
    level8: {
        weapon: [
            { name: 'Espada Tumular', class: 'guerreiro' },
            { name: 'Machado Carniceiro', class: 'guerreiro' },
            { name: 'Arco dos Ossos', class: 'arqueiro' },
            { name: 'Lança Élfica', class: 'arqueiro' },
            { name: 'Cajado Tumular', class: 'mago' },
            { name: 'Grimório das Almas', class: 'mago' },
            { name: 'Orbe do Vazio', class: 'mago' }
        ],
        armor: [
            { name: 'Armadura do Cavaleiro Negro', class: null },
            { name: 'Escudo do Corvo', class: null },
            { name: 'Botas Sombrias', class: null }
        ],
        jewelry: [
            { name: 'Anel Incomum', class: null },
            { name: 'Amuleto Incomum', class: null }
        ]
    },
    level15: {
        weapon: [
            { name: 'Espada de Noctra', class: 'guerreiro' },
            { name: 'Machado do Caos', class: 'guerreiro' },
            { name: 'Arco do Eclipse', class: 'arqueiro' },
            { name: 'Lança Lunar', class: 'arqueiro' },
            { name: 'Cajado de Noctra', class: 'mago' },
            { name: 'Grimório do Eclipse', class: 'mago' },
            { name: 'Orbe da Eternidade', class: 'mago' }
        ],
        armor: [
            { name: 'Armadura do Eclipse', class: null },
            { name: 'Escudo do Abismo', class: null },
            { name: 'Botas do Vazio', class: null }
        ],
        jewelry: [
            { name: 'Anel Épico', class: null },
            { name: 'Amuleto Lendário', class: null }
        ]
    }
};

// BALANCEAMENTO: Multiplicadores de raridade reduzidos para evitar picos de poder
const RARITIES = [
    { name: 'Comum',    multiplier: 1.0 },
    { name: 'Incomum',  multiplier: 1.2 },
    { name: 'Raro',     multiplier: 1.4 }, // era 1.5
    { name: 'Épico',    multiplier: 1.7 }, // era 1.9
    { name: 'Lendário', multiplier: 2.0 }  // era 2.4
];

const CATEGORY_WEIGHTS = {
    weapon: 45,
    armor: 35,
    jewelry: 20
};

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function weightedCategory() {
    const total = Object.values(CATEGORY_WEIGHTS).reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
        roll -= weight;
        if (roll <= 0) return category;
    }
    return 'weapon';
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
    const scale = tier === 'level1' ? 1 : tier === 'level8' ? 1.8 : 2.8;

    if (slot === 'weapon') {
        return {
            atk: rand(4, 7) * scale,
            def: rand(0, 2),
            hp: rand(0, 5),
            crit: rand(2, 5)
        };
    }

    if (slot === 'shield') {
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

    return { atk: 1, def: 1, hp: 1, crit: 1 };
}

function rollRarity() {
    const roll = Math.random();
    if (roll < 0.45) return RARITIES[0];
    if (roll < 0.75) return RARITIES[1];
    if (roll < 0.90) return RARITIES[2];
    if (roll < 0.98) return RARITIES[3];
    return RARITIES[4];
}

function generateDrop(mapId = 1) {
    const tier = getTierByMap(mapId);
    const category = weightedCategory();
    const itemData = randomFrom(ITEM_POOL[tier][category]);
    const name = itemData.name;
    const classRestriction = itemData.class || null;
    const rarity = rollRarity();

    let slot = 'weapon';

    if (category === 'armor') {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('escudo')) {
            slot = 'shield';
        } else if (lowerName.includes('bota')) {
            slot = 'boots';
        } else {
            slot = 'armor';
        }
    }

    if (category === 'jewelry') {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('anel')) {
            slot = 'ring';
        } else if (lowerName.includes('amuleto')) {
            slot = 'necklace';
        } else {
            slot = Math.random() < 0.5 ? 'ring' : 'necklace';
        }
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
        power: atk * 2 + def * 2 + Math.floor(hp / 2) + crit * 3,
        slot,
        category,
        classRestriction
    };
}

module.exports = {
    generateDrop,
    ITEM_POOL
};