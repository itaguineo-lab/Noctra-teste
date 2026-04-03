const enemyPools = {
    clareira_sombria: {
        common: [
            {
                id: 'shadow_wolf',
                name: 'Lobo Sombrio',
                hp: 50,
                atk: 9,
                def: 4,
                xp: 30,
                gold: 18
            },
            {
                id: 'giant_rat',
                name: 'Rato Gigante',
                hp: 40,
                atk: 7,
                def: 2,
                xp: 25,
                gold: 12
            }
        ],
        bosses: [
            {
                id: 'wolf_alpha',
                name: '👑 Alfa da Matilha',
                hp: 220,
                atk: 22,
                def: 10,
                xp: 120,
                gold: 80,
                isBoss: true,
                minLevel: 5
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
                xp: 45,
                gold: 28
            },
            {
                id: 'skeleton_mage',
                name: 'Mago Esqueleto',
                hp: 90,
                atk: 18,
                def: 6,
                xp: 50,
                gold: 32
            }
        ],
        bosses: [
            {
                id: 'necromancer_ancient',
                name: '👑 Necromante Ancestral',
                hp: 520,
                atk: 50,
                def: 30,
                xp: 500,
                gold: 350,
                isBoss: true,
                minLevel: 8
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
                xp: 70,
                gold: 45
            },
            {
                id: 'venom_serpent',
                name: 'Serpente Venenosa',
                hp: 120,
                atk: 24,
                def: 7,
                xp: 75,
                gold: 50
            }
        ],
        bosses: [
            {
                id: 'swamp_guardian',
                name: '👑 Guardião do Lodo',
                hp: 850,
                atk: 72,
                def: 42,
                xp: 750,
                gold: 550,
                isBoss: true,
                minLevel: 15
            }
        ]
    },

    deserto_incandescente: {
        common: [
            {
                id: 'infernal_scorpion',
                name: 'Escorpião Infernal',
                hp: 170,
                atk: 28,
                def: 11,
                xp: 95,
                gold: 60
            },
            {
                id: 'ash_wanderer',
                name: 'Andarilho de Cinzas',
                hp: 180,
                atk: 26,
                def: 12,
                xp: 100,
                gold: 65
            }
        ],
        bosses: [
            {
                id: 'pharaoh_flame',
                name: '👑 Faraó das Brasas',
                hp: 1250,
                atk: 92,
                def: 55,
                xp: 1100,
                gold: 850,
                isBoss: true,
                minLevel: 24
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
        'pântano corrompido': 'pantano_corrompido',
        'deserto incandescente': 'deserto_incandescente'
    };

    return aliases[normalized] || normalized;
}

function scaleEnemy(enemy, playerLevel = 1) {
    const level = Math.max(1, Number(playerLevel) || 1);

    return {
        ...enemy,
        hp: Math.floor(enemy.hp + (level * 8)),
        atk: Math.floor(enemy.atk + (level * 0.8)),
        def: Math.floor(enemy.def + (level * 0.5)),
        xp: Math.floor(enemy.xp + (level * 3)),
        gold: Math.floor(enemy.gold + (level * 2)),
        level
    };
}

function getRandomEnemy(mapId, playerLevel = 1) {
    const normalizedMapId = normalizeMapId(mapId);
    const mapData =
        enemyPools[normalizedMapId] ||
        enemyPools.clareira_sombria;

    let bossChance = 0.05 + ((playerLevel - 1) * 0.002);
    bossChance = Math.min(bossChance, 0.15);

    const isBossRoll = Math.random() < bossChance;

    const availableBosses = (mapData.bosses || []).filter(
        boss => !boss.minLevel || playerLevel >= boss.minLevel
    );

    if (isBossRoll && availableBosses.length > 0) {
        const boss =
            availableBosses[
                Math.floor(Math.random() * availableBosses.length)
            ];

        return scaleEnemy({ ...boss }, playerLevel);
    }

    const pool = mapData.common;

    if (!pool.length) return null;

    const enemy =
        pool[Math.floor(Math.random() * pool.length)];

    return scaleEnemy(
        {
            ...enemy,
            isBoss: false
        },
        playerLevel
    );
}

function getEnemyPool(mapId) {
    const normalized = normalizeMapId(mapId);
    return enemyPools[normalized] || enemyPools.clareira_sombria;
}

module.exports = {
    enemyPools,
    getRandomEnemy,
    getEnemyPool,
    normalizeMapId
};