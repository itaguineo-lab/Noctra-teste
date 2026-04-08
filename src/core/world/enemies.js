/*
=================================
NOCTRA — ENEMY SYSTEM PREMIUM
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
                tier: 1,
                type: 'beast',
                element: 'dark',
                dropBias: 'weapon',
                dropChance: 0.20,
                skill: 'bleed'
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
                tier: 1,
                type: 'beast',
                element: 'earth',
                dropBias: 'consumable',
                dropChance: 0.30
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
                tier: 1,
                type: 'poison',
                element: 'poison',
                dropBias: 'jewelry',
                dropChance: 0.25,
                skill: 'poison'
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
                tier: 2,
                type: 'beast',
                element: 'dark',
                isElite: true,
                dropBias: 'weapon',
                dropChance: 0.45,
                rewardMultiplier: 1.5,
                skill: 'bleed'
            }
        ],

        miniboss: [
            {
                id: 'dark_stag',
                name: 'Cervo Sombrio',
                hp: 130,
                atk: 18,
                def: 9,
                crit: 10,
                xp: 90,
                gold: 60,
                rarity: 'miniboss',
                tier: 3,
                type: 'beast',
                element: 'dark',
                isMiniBoss: true,
                dropBias: 'armor',
                dropChance: 0.65,
                rewardMultiplier: 2
            }
        ],

        boss: [
            {
                id: 'forest_guardian',
                name: 'Guardião da Clareira',
                hp: 180,
                atk: 22,
                def: 12,
                crit: 12,
                xp: 140,
                gold: 90,
                rarity: 'boss',
                tier: 4,
                type: 'boss',
                element: 'nature',
                isBoss: true,
                dropBias: 'armor',
                dropChance: 0.85,
                rewardMultiplier: 3,
                soulDropChance: 0.15
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
                tier: 2,
                type: 'undead',
                element: 'dark'
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
                tier: 2,
                type: 'undead',
                element: 'dark',
                skill: 'pierce'
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
                tier: 3,
                type: 'undead',
                element: 'dark',
                isElite: true
            }
        ],

        miniboss: [
            {
                id: 'crypt_reaper',
                name: 'Ceifador da Cripta',
                hp: 230,
                atk: 28,
                def: 16,
                crit: 12,
                xp: 120,
                gold: 80,
                rarity: 'miniboss',
                tier: 4,
                isMiniBoss: true,
                element: 'dark'
            }
        ],

        boss: [
            {
                id: 'lord_of_crypt',
                name: 'Lorde da Cripta',
                hp: 280,
                atk: 34,
                def: 20,
                crit: 14,
                xp: 190,
                gold: 130,
                rarity: 'boss',
                tier: 5,
                isBoss: true,
                element: 'dark',
                soulDropChance: 0.20
            }
        ]
    },

    pantano_corrompido: {
        common: [
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
                tier: 3,
                type: 'poison',
                element: 'poison',
                skill: 'poison'
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
                tier: 4,
                isElite: true,
                element: 'poison'
            }
        ],

        boss: [
            {
                id: 'lord_of_decay',
                name: 'Lorde da Putrefação',
                hp: 400,
                atk: 46,
                def: 24,
                crit: 15,
                xp: 260,
                gold: 180,
                rarity: 'boss',
                tier: 5,
                isBoss: true,
                element: 'poison',
                soulDropChance: 0.25
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

function randomFrom(array) {
    return array[
        Math.floor(Math.random() * array.length)
    ];
}

/*
=================================
SMART SPAWN
=================================
*/

function getRandomEnemy(mapId) {
    const pool = getPool(mapId);

    const roll = Math.random();

    if (roll <= 0.03 && pool.boss?.length) {
        return {
            ...randomFrom(pool.boss),
            isBoss: true
        };
    }

    if (roll <= 0.10 && pool.miniboss?.length) {
        return {
            ...randomFrom(pool.miniboss),
            isMiniBoss: true
        };
    }

    if (roll <= 0.25 && pool.elite?.length) {
        return {
            ...randomFrom(pool.elite),
            isElite: true
        };
    }

    return {
        ...randomFrom(pool.common)
    };
}

/*
=================================
BY TIER
=================================
*/

function getEnemyByTier(mapId, tier) {
    const pool = getPool(mapId);

    if (tier >= 5 && pool.boss?.length) {
        return randomFrom(pool.boss);
    }

    if (tier >= 4 && pool.miniboss?.length) {
        return randomFrom(pool.miniboss);
    }

    if (tier >= 3 && pool.elite?.length) {
        return randomFrom(pool.elite);
    }

    return randomFrom(pool.common);
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
    getEnemyById,
    getEnemyByTier
};