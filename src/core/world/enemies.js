/**
 * Inimigos e bosses por mapa.
 * Versão rebalanceada + lore Noctra.
 */

const enemyPools = {
    clareira_sombria: {
        common: [
            {
                name: 'Rato das Sombras',
                lore: 'Roedores corrompidos pela névoa da noite.',
                hp: 35,
                atk: 5,
                def: 1,
                xp: 8,
                gold: 5
            },
            {
                name: 'Lobo Sombrio',
                lore: 'Predador que caça guiado por olhos espectrais.',
                hp: 45,
                atk: 6,
                def: 2,
                xp: 10,
                gold: 6
            },
            {
                name: 'Corvo do Véu',
                lore: 'Mensageiro das almas perdidas da floresta.',
                hp: 40,
                atk: 7,
                def: 1,
                xp: 9,
                gold: 5
            }
        ],
        bosses: [
            {
                name: '👑 Alfa da Névoa',
                lore: 'O primeiro guardião da Noite Eterna.',
                hp: 120,
                atk: 12,
                def: 4,
                xp: 50,
                gold: 25,
                isBoss: true,
                possibleSouls: ['soul_wolf']
            }
        ]
    },

    cripta_em_ruinas: {
        common: [
            {
                name: 'Esqueleto Errante',
                lore: 'Guerreiros esquecidos que não encontraram paz.',
                hp: 80,
                atk: 10,
                def: 4,
                xp: 18,
                gold: 10
            },
            {
                name: 'Arqueiro Maldito',
                lore: 'Atira flechas cobertas de energia necromântica.',
                hp: 75,
                atk: 11,
                def: 3,
                xp: 20,
                gold: 12
            },
            {
                name: 'Sacerdote Ossificado',
                lore: 'Canaliza magia profana da cripta.',
                hp: 85,
                atk: 12,
                def: 3,
                xp: 22,
                gold: 12
            }
        ],
        bosses: [
            {
                name: '👑 Necromante Velkan',
                lore: 'Senhor dos mortos e guardião das almas frias.',
                hp: 220,
                atk: 18,
                def: 6,
                xp: 90,
                gold: 45,
                isBoss: true,
                possibleSouls: ['soul_frost']
            }
        ]
    },

    pantano_corrompido: {
        common: [
            {
                name: 'Sapo Abissal',
                lore: 'Criatura mutada pelo veneno do pântano.',
                hp: 110,
                atk: 14,
                def: 4,
                xp: 28,
                gold: 15
            },
            {
                name: 'Serpente Pútrida',
                lore: 'Seu veneno enfraquece corpo e alma.',
                hp: 105,
                atk: 16,
                def: 4,
                xp: 30,
                gold: 16
            },
            {
                name: 'Mosca da Putrefação',
                lore: 'Inseto gigantesco que devora cadáveres.',
                hp: 95,
                atk: 15,
                def: 3,
                xp: 27,
                gold: 14
            }
        ],
        bosses: [
            {
                name: '👑 Rei do Lodo',
                lore: 'Monstro ancestral formado por carne e lama.',
                hp: 300,
                atk: 24,
                def: 8,
                xp: 120,
                gold: 60,
                isBoss: true,
                possibleSouls: ['soul_vampire']
            }
        ]
    },

    deserto_incandescente: {
        common: [
            {
                name: 'Escorpião Rubro',
                lore: 'Escorpião alimentado pelas chamas do deserto.',
                hp: 140,
                atk: 18,
                def: 5,
                xp: 40,
                gold: 22
            },
            {
                name: 'Andarilho de Cinzas',
                lore: 'Alma perdida envolta por brasas.',
                hp: 150,
                atk: 17,
                def: 6,
                xp: 42,
                gold: 23
            },
            {
                name: 'Hiena Flamejante',
                lore: 'Predadora rápida e cruel.',
                hp: 145,
                atk: 19,
                def: 5,
                xp: 41,
                gold: 22
            }
        ],
        bosses: [
            {
                name: '👑 Faraó das Brasas',
                lore: 'Último rei do deserto consumido pelo fogo.',
                hp: 420,
                atk: 28,
                def: 10,
                xp: 180,
                gold: 90,
                isBoss: true,
                possibleSouls: ['soul_fire']
            }
        ]
    }
};

function normalizeMapId(mapId) {
    if (!mapId) return 'clareira_sombria';
    return String(mapId).trim().toLowerCase();
}

function scaleEnemy(enemy, playerLevel = 1) {
    const level = Math.max(1, Number(playerLevel) || 1);
    const scale = 1 + (level * 0.08);

    return {
        ...enemy,
        hp: Math.floor(enemy.hp * scale),
        atk: Math.floor(enemy.atk * scale),
        def: Math.floor(enemy.def * scale),
        xp: Math.floor(enemy.xp * scale),
        gold: Math.floor(enemy.gold * scale),
        level
    };
}

function getRandomEnemy(mapId, playerLevel = 1) {
    const mapData =
        enemyPools[normalizeMapId(mapId)] ||
        enemyPools.clareira_sombria;

    const bossChance = Math.min(
        0.04 + (playerLevel * 0.001),
        0.08
    );

    const isBoss = Math.random() < bossChance;

    const pool = isBoss
        ? mapData.bosses
        : mapData.common;

    const enemy =
        pool[Math.floor(Math.random() * pool.length)];

    return scaleEnemy(enemy, playerLevel);
}

module.exports = {
    enemyPools,
    getRandomEnemy
};