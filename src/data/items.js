const ITEM_POOL = {
    level1: {
        warrior: {
            weapons: [
                "Espada do Vigia",
                "Lâmina Ferrugem",
                "Espada de Bronze Sombrio",
                "Machado Brutal",
                "Machado do Executor"
            ],
            shields: [
                "Escudo de Ferro",
                "Broquel Sombrio"
            ],
            armors: [
                "Armadura do Soldado",
                "Peitoral de Ferro"
            ]
        },

        archer: {
            weapons: [
                "Arco do Caçador",
                "Arco de Carvalho",
                "Lança do Batedor",
                "Lança de Bronze"
            ],
            shields: [
                "Escudo Leve",
                "Escudo do Rastreador"
            ],
            armors: [
                "Armadura de Couro",
                "Manto do Explorador"
            ]
        },

        mage: {
            weapons: [
                "Varinha Arcana",
                "Cajado de Cristal"
            ],
            books: [
                "Grimório Antigo",
                "Livro do Aprendiz"
            ],
            orbs: [
                "Orbe Azul",
                "Orbe Vital"
            ],
            armors: [
                "Manto Arcano",
                "Vestes do Iniciado"
            ]
        }
    },

    level8: {
        warrior: {
            weapons: [
                "Espada Tumular",
                "Lâmina do Guardião",
                "Espada Profanada",
                "Machado Carniceiro",
                "Machado do Abismo"
            ],
            shields: [
                "Escudo do Corvo",
                "Muralha Profana"
            ],
            armors: [
                "Armadura do Cavaleiro Negro",
                "Peitoral Tumular"
            ]
        },

        archer: {
            weapons: [
                "Arco dos Ossos",
                "Arco Élfico Sombrio",
                "Arco do Corvo",
                "Lança Élfica",
                "Lança do Caçador"
            ],
            shields: [
                "Escudo Silencioso",
                "Escudo Lunar"
            ],
            armors: [
                "Armadura do Caçador Sombrio",
                "Manto do Corvo"
            ]
        },

        mage: {
            weapons: [
                "Cajado Tumular",
                "Varinha Profana",
                "Cetro Sombrio"
            ],
            books: [
                "Grimório das Almas",
                "Livro do Eclipse"
            ],
            orbs: [
                "Orbe do Vazio",
                "Orbe da Cura"
            ],
            armors: [
                "Vestes Profanas",
                "Manto das Sombras"
            ]
        }
    },

    level15: {
        warrior: {
            weapons: [
                "Espada do Rei Morto",
                "Lâmina de Noctra",
                "Espada do Eclipse",
                "Machado do Colosso",
                "Machado do Caos"
            ],
            shields: [
                "Escudo do Abismo",
                "Bastião de Noctra"
            ],
            armors: [
                "Armadura do Senhor Sombrio",
                "Armadura do Eclipse"
            ]
        },

        archer: {
            weapons: [
                "Arco do Eclipse",
                "Arco da Lua Negra",
                "Arco de Noctra",
                "Lança Lunar",
                "Lança do Eclipse"
            ],
            shields: [
                "Escudo da Névoa",
                "Escudo do Vazio"
            ],
            armors: [
                "Manto Fantasma",
                "Armadura do Eclipse"
            ]
        },

        mage: {
            weapons: [
                "Cajado de Noctra",
                "Cetro do Abismo"
            ],
            books: [
                "Grimório de Noctra",
                "Livro do Caos"
            ],
            orbs: [
                "Orbe do Eclipse",
                "Orbe da Eternidade"
            ],
            armors: [
                "Manto do Arcanista Supremo",
                "Vestes do Eclipse"
            ]
        }
    }
};

const RARITIES = [
    { name: "Comum", multiplier: 1 },
    { name: "Incomum", multiplier: 1.2 },
    { name: "Raro", multiplier: 1.5 },
    { name: "Épico", multiplier: 1.9 },
    { name: "Lendário", multiplier: 2.4 }
];

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getMapLevelTier(mapId) {
    if (mapId === 1) return "level1";
    if (mapId === 2) return "level8";
    return "level15";
}

function getLevelValue(tier) {
    if (tier === "level1") return 1;
    if (tier === "level8") return 8;
    return 15;
}

function buildBaseStats(tier) {
    if (tier === "level1") {
        return {
            atk: rand(3, 6),
            def: rand(1, 4),
            hp: rand(5, 12),
            crit: rand(1, 4)
        };
    }

    if (tier === "level8") {
        return {
            atk: rand(6, 10),
            def: rand(3, 6),
            hp: rand(10, 18),
            crit: rand(3, 6)
        };
    }

    return {
        atk: rand(10, 16),
        def: rand(5, 9),
        hp: rand(16, 26),
        crit: rand(5, 9)
    };
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
    const tier = getMapLevelTier(mapId);
    const classes = Object.keys(ITEM_POOL[tier]);

    const chosenClass = randomFrom(classes);
    const classPool = ITEM_POOL[tier][chosenClass];

    const categories = Object.keys(classPool);
    const chosenCategory = randomFrom(categories);

    const itemName = randomFrom(classPool[chosenCategory]);
    const rarity = rollRarity();
    const base = buildBaseStats(tier);

    const atk = Math.round(base.atk * rarity.multiplier);
    const def = Math.round(base.def * rarity.multiplier);
    const hp = Math.round(base.hp * rarity.multiplier);
    const crit = Math.round(base.crit * rarity.multiplier);

    return {
        id: Date.now() + rand(1000, 9999),
        name: itemName,
        classType: chosenClass,
        rarity: rarity.name,
        level: getLevelValue(tier),
        atk,
        def,
        hp,
        crit,
        power: atk * 2 + def + Math.floor(hp / 2) + crit * 3,
        slot: chosenCategory === "armors"
            ? "armor"
            : chosenCategory === "shields"
            ? "ring"
            : "weapon"
    };
}

module.exports = {
    ITEM_POOL,
    generateDrop
};