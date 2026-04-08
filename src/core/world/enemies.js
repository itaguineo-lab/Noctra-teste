/*
=================================
NOCTRA — ENEMY SYSTEM
Sistema completo de inimigos
=================================
*/

const enemyPools = {
    clareira_sombria: {
        common: [
            {
                id: 'shadow_wolf',
                name: 'Lobo Sombrio',
                hp: 50,
                atk: 9,
                def: 4,
                crit: 5,
                xp: 30,
                gold: 18,
                rarity: 'common',
                type: 'beast',
                dropBias: 'weapon'
            },
            {
                id: 'giant_rat',
                name: 'Rato Gigante',
                hp: 40,
                atk: 7,
                def: 2,
                crit: 4,
                xp: 25,
                gold: 12,
                rarity: 'common',
                type: 'beast',
                dropBias: 'consumable'
            },
            {
                id: 'dark_boar',
                name: 'Javali Negro',
                hp: 55,
                atk: 8,
                def: 5,
                crit: 3,
                xp: 28,
                gold: 16,
                rarity: 'common',
                type: 'beast',
                dropBias: 'armor'
            },
            {
                id: 'forest_spider',
                name: 'Aranha da Floresta',
                hp: 45,
                atk: 10,
                def: 3,
                crit: 6,
                xp: 26,
                gold: 15,
                rarity: 'common',
                type: 'poison',
                dropBias: 'jewelry'
            },
            {
                id: 'night_bat',
                name: 'Morcego Noturno',
                hp: 35,
                atk: 11,
                def: 2,
                crit: 8,
                xp: 24,
                gold: 14,
                rarity: 'common',
                type: 'flying',
                dropBias: 'ring'
            }
        ],

        elite: [
            {
                id: 'alpha_shadow_wolf',
                name: 'Lobo Alfa Sombrio',
                hp: 90,
                atk: 15,
                def: 7,
                crit: 10,
                xp: 60,
                gold: 35,
                rarity: 'elite',
                type: 'beast',
                isElite: true,
                dropBias: 'weapon'
            }
        ],

        boss: [
            {
                id: 'forest_guardian',
                name: 'Guardião da Clareira',
                hp: 160,
                atk: 20,
                def: 10,
                crit: 12,
                xp: 120,
                gold: 80,
                rarity: 'boss',
                type: 'boss',
                isBoss: true,
                dropBias: 'armor'
            }
        ]
    },

    cripta_em_ruinas: {
        common: [
            {
                id: 'skeleton_warrior',
                name: 'Esqueleto Guerreiro',
                hp: 100,
                atk: 14,
                def: 8,
                crit: 5,
                xp: 45,
                gold: 28,
                rarity: 'common',
                type: 'undead'
            },
            {
                id: 'skeleton_mage',
                name: 'Mago Esqueleto',
                hp: 90,
                atk: 18,
                def: 6,
                crit: 8,
                xp: 50,
                gold: 32,
                rarity: 'common',
                type: 'undead'
            },
            {
                id: 'grave_hound',
                name: 'Cão da Cripta',
                hp: 95,
                atk: 16,
                def: 7,
                crit: 6,
                xp: 44,
                gold: 29,
                rarity: 'common',
                type: 'undead'
            },
            {
                id: 'bone_archer',
                name: 'Arqueiro Ósseo',
                hp: 85,
                atk: 17,
                def: 5,
                crit: 9,
                xp: 46,
                gold: 30,
                rarity: 'common',
                type: 'undead'
            },
            {
                id: 'crypt_guard',
                name: 'Guardião da Cripta',
                hp: 110,
                atk: 15,
                def: 9,
                crit: 5,
                xp: 48,
                gold: 31,
                rarity: 'common',
                type: 'undead'
            }
        ],

        elite: [
            {
                id: 'bone_knight',
                name: 'Cavaleiro Ósseo',
                hp: 180,
                atk: 24,
                def: 14,
                crit: 10,
                xp: 90,
                gold: 60,
                rarity: 'elite',
                type: 'undead',
                isElite: true
            }
        ],

        boss: [
            {
                id: 'lord_of_crypt',
                name: 'Lorde da Cripta',
                hp: 260,
                atk: 30,
                def: 18,
                crit: 14,
                xp: 180,
                gold: 120,
                rarity: 'boss',
                type: 'boss',
                isBoss: true
            }
        ]
    },

    pantano_corrompido: {
        common: [
            {
                id: 'corrupted_frog',
                name: 'Sapo Corrompido',
                hp: 130,
                atk: 20,
                def: 8,
                crit: 6,
                xp: 70,
                gold: 45,
                rarity: 'common',
                type: 'poison'
            },
            {
                id: 'venom_serpent',
                name: 'Serpente Venenosa',
                hp: 120,
                atk: 24,
                def: 7,
                crit: 10,
                xp: 75,
                gold: 50,
                rarity: 'common',
                type: 'poison'
            },
            {
                id: 'swamp_zombie',
                name: 'Zumbi do Lodo',
                hp: 140,
                atk: 19,
                def: 10,
                crit: 4,
                xp: 72,
                gold: 47,
                rarity: 'common',
                type: 'undead'
            },
            {
                id: 'mud_golem',
                name: 'Golem de Lama',
                hp: 150,
                atk: 18,
                def: 12,
                crit: 3,
                xp: 78,
                gold: 52,
                rarity: 'common',
                type: 'tank'
            },
            {
                id: 'toxic_crow',
                name: 'Corvo Tóxico',
                hp: 110,
                atk: 25,
                def: 6,
                crit: 11,
                xp: 73,
                gold: 49,
                rarity: 'common',
                type: 'flying'
            }
        ],

        elite: [
            {
                id: 'swamp_abomination',
                name: 'Abominação do Pântano',
                hp: 260,
                atk: 34,
                def: 16,
                crit: 10,
                xp: 130,
                gold: 90,
                rarity: 'elite',
                isElite: true
            }
        ],

        boss: [
            {
                id: 'lord_of_decay',
                name: 'Lorde da Putrefação',
                hp: 380,
                atk: 42,
                def: 22,
                crit: 15,
                xp: 250,
                gold: 160,
                rarity: 'boss',
                isBoss: true
            }
        ]
    }
};

/*
=================================
HELPERS
=================================
*/

function getPool(mapId) {
    return (
        enemyPools[mapId] ||
        enemyPools.clareira_sombria
    );
}

function getRandomFromArray(array) {
    return array[
        Math.floor(Math.random() * array.length)
    ];
}

/*
=================================
SPAWN
=================================
*/

function getRandomEnemy(mapId) {
    const pool = getPool(mapId);

    const roll = Math.random();

    if (roll <= 0.05 && pool.boss?.length) {
        return {
            ...getRandomFromArray(pool.boss),
            isBoss: true
        };
    }

    if (roll <= 0.20 && pool.elite?.length) {
        return {
            ...getRandomFromArray(pool.elite),
            isElite: true,
            isBoss: false
        };
    }

    return {
        ...getRandomFromArray(pool.common),
        isElite: false,
        isBoss: false
    };
}

/*
=================================
LOOKUP
=================================
*/

function getEnemyById(enemyId) {
    for (const map of Object.values(enemyPools)) {
        for (const tier of Object.values(map)) {
            const enemy = tier.find(
                e => e.id === enemyId
            );

            if (enemy) {
                return { ...enemy };
            }
        }
    }

    return null;
}

module.exports = {
    enemyPools,
    getRandomEnemy,
    getEnemyById
};