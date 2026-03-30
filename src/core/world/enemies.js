/**
 * Inimigos e bosses por mapa.
 * Chave sempre por `mapId`.
 */

const enemyPools = {
    clareira_sombria: {
        common: [
            {
                name: 'Lobo Sombrio',
                hp: 80,
                atk: 12,
                def: 5,
                xp: 20,
                gold: 15
            },
            {
                name: 'Rato Gigante',
                hp: 60,
                atk: 10,
                def: 3,
                xp: 15,
                gold: 10
            }
        ],
        bosses: [
            {
                name: '👑 Alfa da Matilha',
                hp: 350,
                atk: 35,
                def: 15,
                xp: 150,
                gold: 100,
                isBoss: true,
                possibleSouls: ['soul_wolf']
            }
        ]
    },

    cripta_em_ruinas: {
        common: [
            {
                name: 'Esqueleto Guerreiro',
                hp: 150,
                atk: 18,
                def: 10,
                xp: 40,
                gold: 25
            },
            {
                name: 'Mago Esqueleto',
                hp: 120,
                atk: 22,
                def: 8,
                xp: 45,
                gold: 30
            }
        ],
        bosses: [
            {
                name: '👑 Necromante Ancestral',
                hp: 800,
                atk: 70,
                def: 40,
                xp: 500,
                gold: 350,
                isBoss: true,
                possibleSouls: ['soul_heal', 'soul_frost']
            }
        ]
    },

    pantano_corrompido: {
        common: [
            {
                name: 'Sapo Corrompido',
                hp: 180,
                atk: 24,
                def: 9,
                xp: 55,
                gold: 35
            },
            {
                name: 'Serpente Venenosa',
                hp: 160,
                atk: 28,
                def: 8,
                xp: 60,
                gold: 38
            }
        ],
        bosses: [
            {
                name: '👑 Guardião do Lodo',
                hp: 1100,
                atk: 85,
                def: 45,
                xp: 700,
                gold: 500,
                isBoss: true,
                possibleSouls: ['soul_guardian', 'soul_vampire']
            }
        ]
    },

    deserto_incandescente: {
        common: [
            {
                name: 'Escorpião Infernal',
                hp: 220,
                atk: 32,
                def: 12,
                xp: 75,
                gold: 45
            },
            {
                name: 'Andarilho de Cinzas',
                hp: 240,
                atk: 30,
                def: 14,
                xp: 80,
                gold: 50
            }
        ],
        bosses: [
            {
                name: '👑 Faraó das Brasas',
                hp: 1600,
                atk: 110,
                def: 60,
                xp: 1000,
                gold: 700,
                isBoss: true,
                possibleSouls: ['soul_thunder', 'soul_dragon']
            }
        ]
    }
};

function normalizeMapId(mapId) {
    if (!mapId) return 'clareira_sombria';

    const normalized = String(mapId).trim().toLowerCase();

    const aliases = {
        'clareira sombria': 'clareira_sombria',
        'cripta em ruínas': 'cripta_em_ruinas',
        'cripta em ruinas': 'cripta_em_ruinas',
        'pântano corrompido': 'pantano_corrompido',
        'pantano corrompido': 'pantano_corrompido',
        'deserto incandescente': 'deserto_incandescente'
    };

    return aliases[normalized] || normalized;
}

function scaleEnemy(enemy, playerLevel = 1) {
    const level = Math.max(1, Number(playerLevel) || 1);
    const scale = Math.max(1, Math.floor(level / 10));

    return {
        ...enemy,
        hp: Math.floor(enemy.hp + (scale * 15)),
        atk: Math.floor(enemy.atk + (scale * 2)),
        def: Math.floor(enemy.def + scale),
        xp: Math.floor(enemy.xp + (scale * 5)),
        gold: Math.floor(enemy.gold + (scale * 3)),
        level
    };
}

function getRandomEnemy(mapId, playerLevel = 1) {
    const normalizedMapId = normalizeMapId(mapId);
    const mapData = enemyPools[normalizedMapId] || enemyPools.clareira_sombria;

    const bossChance = Math.min(0.10 + ((playerLevel - 1) * 0.002), 0.20);
    const isBossRoll = Math.random() < bossChance;

    if (isBossRoll && mapData.bosses && mapData.bosses.length > 0) {
        const boss = mapData.bosses[
            Math.floor(Math.random() * mapData.bosses.length)
        ];

        return scaleEnemy({ ...boss }, playerLevel);
    }

    const pool = mapData.common || mapData.bosses || [];

    if (!pool.length) {
        return null;
    }

    const enemy = pool[
        Math.floor(Math.random() * pool.length)
    ];

    return scaleEnemy(
        {
            ...enemy,
            isBoss: false
        },
        playerLevel
    );
}

function getEnemyPool(mapId) {
    const normalizedMapId = normalizeMapId(mapId);
    return enemyPools[normalizedMapId] || enemyPools.clareira_sombria;
}

module.exports = {
    enemyPools,
    getRandomEnemy,
    getEnemyPool,
    normalizeMapId
};