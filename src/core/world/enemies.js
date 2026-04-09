/*
=================================
NOCTRA — ENEMY SYSTEM PREMIUM
SPAWN POR NÍVEL + MAPA
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
                tier: 1
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
                tier: 1
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
                tier: 1
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
                isElite: true
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
                isMiniBoss: true
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
                isBoss: true
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
                tier: 2
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
                isMiniBoss: true
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
                isBoss: true
            }
        ]
    }
};

function getPool(mapId) {
    return enemyPools[mapId] || enemyPools.clareira_sombria;
}

function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/*
=================================
SPAWN INTELIGENTE POR NÍVEL
=================================
*/

function getRandomEnemy(mapId, playerLevel = 1) {
    const pool = getPool(mapId);
    const level = Number(playerLevel) || 1;
    const roll = Math.random();

    /*
    LV 1–4 = SOMENTE COMUNS
    */
    if (level <= 4) {
        return { ...randomFrom(pool.common) };
    }

    /*
    LV 5–9 = chance pequena elite
    */
    if (level <= 9) {
        if (roll <= 0.12 && pool.elite?.length) {
            return {
                ...randomFrom(pool.elite),
                isElite: true
            };
        }

        return { ...randomFrom(pool.common) };
    }

    /*
    LV 10–14 = elite + miniboss raro
    */
    if (level <= 14) {
        if (roll <= 0.05 && pool.miniboss?.length) {
            return {
                ...randomFrom(pool.miniboss),
                isMiniBoss: true
            };
        }

        if (roll <= 0.22 && pool.elite?.length) {
            return {
                ...randomFrom(pool.elite),
                isElite: true
            };
        }

        return { ...randomFrom(pool.common) };
    }

    /*
    LV 15+ = progressão completa
    */
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

    return { ...randomFrom(pool.common) };
}

function getEnemyById(enemyId) {
    for (const map of Object.values(enemyPools)) {
        for (const tier of Object.values(map)) {
            const enemy = tier.find(e => e.id === enemyId);

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