/*
=================================
NOCTRA — ENEMY SYSTEM 4.2
INIMIGOS TEMÁTICOS + HABILIDADES + PROGRESSÃO CONTROLADA
FOCO EM LONGEVIDADE, IDENTIDADE DE MAPA E PACING
=================================
*/

// ================================================
// HABILIDADES ESPECIAIS
// ================================================

const ENEMY_ABILITIES = {
    POISON: {
        name: 'Veneno',
        emoji: '🧪',
        apply: (target, fight) => {
            // Se o alvo for o inimigo (ex: player usou algo), target é fight.enemy
            // Se o alvo for o player (ex: inimigo usou), target é fight.player
            if (!target.poisonTurns) target.poisonTurns = 0;
            target.poisonTurns += 2;
            const targetName = target.id === fight.player.id ? 'Você' : target.name;
            fight.logs.push(`🧪 ${targetName} foi envenenado`);
        },
        tick: (enemy, fight) => {
            if (enemy.poisonTurns > 0) {
                const damage = Math.max(1, Math.floor(enemy.maxHp * 0.05));
                enemy.hp = Math.max(0, enemy.hp - damage);
                fight.logs.push(`🧪 Veneno causa ${damage} de dano a ${enemy.name}`);
                enemy.poisonTurns--;
            }
        }
    },

    BLEED: {
        name: 'Sangramento',
        emoji: '🩸',
        apply: (target, fight) => {
            if (!target.bleedTurns) target.bleedTurns = 0;
            target.bleedTurns += 2;
            const targetName = target.id === fight.player.id ? 'Você' : target.name;
            fight.logs.push(`🩸 ${targetName} está sangrando`);
        },
        tick: (enemy, fight) => {
            if (enemy.bleedTurns > 0) {
                const damage = Math.max(1, Math.floor(enemy.maxHp * 0.04));
                enemy.hp = Math.max(0, enemy.hp - damage);
                fight.logs.push(`🩸 Sangramento causa ${damage} de dano a ${enemy.name}`);
                enemy.bleedTurns--;
            }
        }
    },

    STUN: {
        name: 'Atordoamento',
        emoji: '💫',
        apply: (target, fight) => {
            fight.player.stunned = true;
            fight.logs.push(`💫 ${fight.enemy.name} atordoou você`);
            return true;
        }
    },

    SHIELD: {
        name: 'Escudo Sombrio',
        emoji: '🛡️',
        apply: (enemy, fight) => {
            if (!enemy.shield) enemy.shield = 0;
            enemy.shield += Math.floor(enemy.maxHp * 0.15);
            fight.logs.push(`🛡️ ${enemy.name} ergueu um escudo sombrio`);
        }
    },

    HEAL: {
        name: 'Regeneração',
        emoji: '💚',
        apply: (enemy, fight) => {
            const heal = Math.floor(enemy.maxHp * 0.2);
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
            fight.logs.push(`💚 ${enemy.name} se regenerou em ${heal} HP`);
        }
    }
};

// ================================================
// DEFINIÇÃO DE INIMIGOS POR MAPA
// ================================================

const enemyPools = {
    clareira_sombria: {
        common: [
            {
                id: 'shadow_wolf',
                name: 'Lobo Sombrio',
                emoji: '🐺',
                hp: 44, atk: 8, def: 3, crit: 5,
                xp: 29, gold: 18,
                ability: null
            },
            {
                id: 'giant_rat',
                name: 'Rato Gigante',
                emoji: '🐀',
                hp: 34, atk: 6, def: 1, crit: 4,
                xp: 24, gold: 12,
                ability: { type: 'POISON', chance: 0.16 }
            },
            {
                id: 'forest_spider',
                name: 'Aranha da Floresta',
                emoji: '🕷️',
                hp: 40, atk: 8, def: 2, crit: 6,
                xp: 25, gold: 15,
                ability: { type: 'POISON', chance: 0.18 }
            },
            {
                id: 'dark_bat',
                name: 'Morcego Sombrio',
                emoji: '🦇',
                hp: 32, atk: 9, def: 1, crit: 8,
                xp: 27, gold: 14,
                ability: null
            }
        ],
        elite: [
            {
                id: 'alpha_shadow_wolf',
                name: 'Lobo Alfa Sombrio',
                emoji: '🐺',
                hp: 88, atk: 15, def: 7, crit: 10,
                xp: 65, gold: 40,
                isElite: true,
                ability: { type: 'BLEED', chance: 0.35 }
            },
            {
                id: 'webspinner',
                name: 'Tece-Trevas',
                emoji: '🕸️',
                hp: 80, atk: 13, def: 9, crit: 8,
                xp: 60, gold: 38,
                isElite: true,
                ability: { type: 'STUN', chance: 0.20 }
            }
        ],
        miniboss: [
            {
                id: 'dark_stag',
                name: 'Cervo Sombrio',
                emoji: '🦌',
                hp: 130, atk: 19, def: 10, crit: 12,
                xp: 100, gold: 70,
                isMiniBoss: true,
                ability: { type: 'SHIELD', chance: 0.45 }
            }
        ],
        boss: [
            {
                id: 'forest_guardian',
                name: 'Guardião da Clareira',
                emoji: '🌳',
                hp: 190, atk: 23, def: 13, crit: 14,
                xp: 160, gold: 110,
                isBoss: true,
                ability: { type: 'HEAL', chance: 0.25 }
            }
        ]
    },

    cripta_em_ruinas: {
        common: [
            {
                id: 'skeleton_warrior',
                name: 'Esqueleto Guerreiro',
                emoji: '💀',
                hp: 82, atk: 13, def: 7, crit: 6, // HP 92->82, ATK 14->13
                xp: 45, gold: 30,
                ability: null
            },
            {
                id: 'restless_spirit',
                name: 'Espírito Inquieto',
                emoji: '👻',
                hp: 68, atk: 15, def: 4, crit: 10, // HP 74->68, ATK 16->15
                xp: 50, gold: 28,
                ability: { type: 'STUN', chance: 0.18 }
            },
            {
                id: 'crypt_bat',
                name: 'Morcego da Cripta',
                emoji: '🦇',
                hp: 76, atk: 14, def: 5, crit: 8, // HP 84->76, ATK 15->14
                xp: 48, gold: 32,
                ability: { type: 'BLEED', chance: 0.18 }
            }
        ],
        elite: [
            {
                id: 'bone_knight',
                name: 'Cavaleiro Ósseo',
                emoji: '🛡️',
                hp: 180, atk: 25, def: 15, crit: 12,
                xp: 100, gold: 70,
                isElite: true,
                ability: { type: 'SHIELD', chance: 0.36 }
            },
            {
                id: 'wailing_banshee',
                name: 'Banshee Lamentosa',
                emoji: '👻',
                hp: 150, atk: 28, def: 8, crit: 15,
                xp: 110, gold: 65,
                isElite: true,
                ability: { type: 'STUN', chance: 0.30 }
            }
        ],
        miniboss: [
            {
                id: 'crypt_reaper',
                name: 'Ceifador da Cripta',
                emoji: '⚰️',
                hp: 240, atk: 31, def: 18, crit: 14,
                xp: 140, gold: 100,
                isMiniBoss: true,
                ability: { type: 'BLEED', chance: 0.45 }
            }
        ],
        boss: [
            {
                id: 'lord_of_crypt',
                name: 'Lorde da Cripta',
                emoji: '👑',
                hp: 305, atk: 36, def: 23, crit: 16,
                xp: 220, gold: 160,
                isBoss: true,
                ability: { type: 'HEAL', chance: 0.24 }
            }
        ]
    },

    pantano_corrompido: {
        common: [
            {
                id: 'swamp_zombie',
                name: 'Zumbi do Pântano',
                emoji: '🧟',
                hp: 160, atk: 22, def: 12, crit: 5,
                xp: 70, gold: 45,
                ability: { type: 'POISON', chance: 0.3 }
            },
            {
                id: 'venomous_frog',
                name: 'Sapo Venenoso',
                emoji: '🐸',
                hp: 140, atk: 25, def: 8, crit: 10,
                xp: 75, gold: 50,
                ability: { type: 'POISON', chance: 0.5 }
            },
            {
                id: 'bog_lurker',
                name: 'Espreitador do Brejo',
                emoji: '👹',
                hp: 180, atk: 20, def: 15, crit: 6,
                xp: 80, gold: 55,
                ability: null
            }
        ],
        elite: [
            {
                id: 'swamp_abomination',
                name: 'Abominação do Lodo',
                emoji: '🧪',
                hp: 280, atk: 35, def: 20, crit: 10,
                xp: 150, gold: 100,
                isElite: true,
                ability: { type: 'POISON', chance: 0.6 }
            },
            {
                id: 'bog_witch',
                name: 'Bruxa do Brejo',
                emoji: '🧙',
                hp: 240, atk: 40, def: 12, crit: 15,
                xp: 160, gold: 110,
                isElite: true,
                ability: { type: 'HEAL', chance: 0.3 }
            }
        ],
        miniboss: [
            {
                id: 'lord_of_decay',
                name: 'Lorde da Putrefação',
                emoji: '🍄',
                hp: 380, atk: 42, def: 24, crit: 12,
                xp: 220, gold: 160,
                isMiniBoss: true,
                ability: { type: 'POISON', chance: 0.7 }
            }
        ],
        boss: [
            {
                id: 'swamp_guardian',
                name: 'Guardião do Pântano',
                emoji: '🌿',
                hp: 500, atk: 50, def: 30, crit: 15,
                xp: 320, gold: 240,
                isBoss: true,
                ability: { type: 'SHIELD', chance: 0.4 }
            }
        ]
    },

    deserto_incandescente: {
        common: [
            {
                id: 'sand_scorpion',
                name: 'Escorpião da Areia',
                emoji: '🦂',
                hp: 220, atk: 32, def: 22, crit: 8,
                xp: 100, gold: 70,
                ability: { type: 'POISON', chance: 0.4 }
            },
            {
                id: 'dune_raider',
                name: 'Saqueador das Dunas',
                emoji: '🏜️',
                hp: 250, atk: 30, def: 24, crit: 10,
                xp: 110, gold: 80,
                ability: null
            },
            {
                id: 'fire_elemental',
                name: 'Elemental de Fogo',
                emoji: '🔥',
                hp: 200, atk: 38, def: 14, crit: 12,
                xp: 120, gold: 75,
                ability: { type: 'BLEED', chance: 0.3 }
            }
        ],
        elite: [
            {
                id: 'giant_scorpion',
                name: 'Escorpião Gigante',
                emoji: '🦂',
                hp: 380, atk: 48, def: 34, crit: 12,
                xp: 210, gold: 150,
                isElite: true,
                ability: { type: 'POISON', chance: 0.6 }
            },
            {
                id: 'sand_wurm',
                name: 'Verme da Areia',
                emoji: '🐛',
                hp: 450, atk: 45, def: 36, crit: 10,
                xp: 230, gold: 160,
                isElite: true,
                ability: { type: 'STUN', chance: 0.4 }
            }
        ],
        miniboss: [
            {
                id: 'pharaoh_guardian',
                name: 'Guardião do Faraó',
                emoji: '⚱️',
                hp: 550, atk: 55, def: 42, crit: 14,
                xp: 300, gold: 220,
                isMiniBoss: true,
                ability: { type: 'SHIELD', chance: 0.5 }
            }
        ],
        boss: [
            {
                id: 'pharaoh_of_embers',
                name: 'Faraó das Brasas',
                emoji: '🔥',
                hp: 700, atk: 65, def: 48, crit: 18,
                xp: 450, gold: 350,
                isBoss: true,
                ability: { type: 'HEAL', chance: 0.3 }
            }
        ]
    },

    citadela_lunar: {
        common: [
            {
                id: 'lunar_sentry',
                name: 'Sentinela Lunar',
                emoji: '🌙',
                hp: 350, atk: 45, def: 36, crit: 12,
                xp: 160, gold: 120,
                ability: null
            },
            {
                id: 'void_stalker',
                name: 'Espreitador do Vazio',
                emoji: '👤',
                hp: 320, atk: 50, def: 29, crit: 15,
                xp: 170, gold: 130,
                ability: { type: 'STUN', chance: 0.3 }
            },
            {
                id: 'moon_wisp',
                name: 'Fogo-Fátuo Lunar',
                emoji: '🔮',
                hp: 300, atk: 48, def: 33, crit: 14,
                xp: 165, gold: 125,
                ability: { type: 'HEAL', chance: 0.2 }
            }
        ],
        elite: [
            {
                id: 'lunar_knight',
                name: 'Cavaleiro Lunar',
                emoji: '🛡️',
                hp: 550, atk: 65, def: 59, crit: 15,
                xp: 280, gold: 210,
                isElite: true,
                ability: { type: 'SHIELD', chance: 0.5 }
            },
            {
                id: 'eclipse_mage',
                name: 'Mago do Eclipse',
                emoji: '🧙',
                hp: 480, atk: 75, def: 39, crit: 20,
                xp: 300, gold: 230,
                isElite: true,
                ability: { type: 'STUN', chance: 0.4 }
            }
        ],
        miniboss: [
            {
                id: 'void_harbinger',
                name: 'Arauto do Vazio',
                emoji: '🌑',
                hp: 750, atk: 75, def: 65, crit: 18,
                xp: 420, gold: 320,
                isMiniBoss: true,
                ability: { type: 'BLEED', chance: 0.5 }
            }
        ],
        boss: [
            {
                id: 'lunar_guardian',
                name: 'Guardião da Citadela',
                emoji: '🌕',
                hp: 1000, atk: 85, def: 78, crit: 20,
                xp: 600, gold: 480,
                isBoss: true,
                ability: { type: 'HEAL', chance: 0.35 }
            }
        ]
    },

    abismo_noctra: {
        common: [
            {
                id: 'void_spawn',
                name: 'Prole do Vazio',
                emoji: '🕳️',
                hp: 550, atk: 65, def: 56, crit: 15,
                xp: 250, gold: 200,
                ability: { type: 'BLEED', chance: 0.3 }
            },
            {
                id: 'shadow_demon',
                name: 'Demônio Sombrio',
                emoji: '👹',
                hp: 600, atk: 70, def: 63, crit: 18,
                xp: 270, gold: 220,
                ability: { type: 'STUN', chance: 0.3 }
            },
            {
                id: 'abyss_watcher',
                name: 'Vigia do Abismo',
                emoji: '👁️',
                hp: 500, atk: 75, def: 49, crit: 20,
                xp: 260, gold: 210,
                ability: null
            }
        ],
        elite: [
            {
                id: 'void_behemoth',
                name: 'Behemoth do Vazio',
                emoji: '🦍',
                hp: 900, atk: 95, def: 91, crit: 20,
                xp: 450, gold: 360,
                isElite: true,
                ability: { type: 'SHIELD', chance: 0.6 }
            },
            {
                id: 'nightmare_weaver',
                name: 'Tecelão de Pesadelos',
                emoji: '🕷️',
                hp: 800, atk: 100, def: 70, crit: 25,
                xp: 480, gold: 380,
                isElite: true,
                ability: { type: 'POISON', chance: 0.7 }
            }
        ],
        miniboss: [
            {
                id: 'void_drake',
                name: 'Draco do Vazio',
                emoji: '🐉',
                hp: 1300, atk: 110, def: 105, crit: 22,
                xp: 700, gold: 550,
                isMiniBoss: true,
                ability: { type: 'BLEED', chance: 0.6 }
            }
        ],
        boss: [
            {
                id: 'noctra_avatar',
                name: 'Avatar de Noctra',
                emoji: '🌑',
                hp: 1800, atk: 130, def: 126, crit: 25,
                xp: 1200, gold: 1000,
                isBoss: true,
                ability: { type: 'HEAL', chance: 0.4 }
            }
        ]
    }
};

// ================================================
// HELPERS
// ================================================

function getPool(mapId) {
    return enemyPools[mapId] || enemyPools.clareira_sombria;
}

function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function cloneEnemy(enemy) {
    return JSON.parse(JSON.stringify(enemy));
}

function getMapBaseLevel(mapId = 'clareira_sombria') {
    return {
        clareira_sombria: 1,
        cripta_em_ruinas: 8,
        pantano_corrompido: 15,
        deserto_incandescente: 24,
        citadela_lunar: 32,
        abismo_noctra: 42
    }[mapId] || 1;
}

function getSpawnProfile(mapId, playerLevel = 1) {
    const mapBaseLevel = getMapBaseLevel(mapId);
    const level = Number(playerLevel) || 1;
    const levelOffset = Math.max(0, level - mapBaseLevel);

    /*
    Todos os mapas têm common / elite / miniboss / boss
    em perfil real de spawn.
    */
    const baseProfiles = {
        clareira_sombria: { common: 0.82, elite: 0.12, miniboss: 0.04, boss: 0.02 },
        cripta_em_ruinas: { common: 0.76, elite: 0.15, miniboss: 0.06, boss: 0.03 },
        pantano_corrompido: { common: 0.70, elite: 0.17, miniboss: 0.08, boss: 0.05 },
        deserto_incandescente: { common: 0.64, elite: 0.19, miniboss: 0.10, boss: 0.07 },
        citadela_lunar: { common: 0.58, elite: 0.21, miniboss: 0.12, boss: 0.09 },
        abismo_noctra: { common: 0.52, elite: 0.23, miniboss: 0.14, boss: 0.11 }
    };

    const profile = { ...(baseProfiles[mapId] || baseProfiles.clareira_sombria) };

    /*
    Overlevel aumenta a chance de encontros relevantes.
    */
    const overlevelBonus = Math.min(0.08, levelOffset * 0.006);

    profile.elite += overlevelBonus * 0.50;
    profile.miniboss += overlevelBonus * 0.30;
    profile.boss += overlevelBonus * 0.20;
    profile.common -= overlevelBonus;

    /*
    Onboarding protegido:
    até nível 4, somente common.
    */
    if (level <= 4) {
        return {
            common: 1,
            elite: 0,
            miniboss: 0,
            boss: 0
        };
    }

    /*
    Clareira ainda segura até o 7.
    */
    if (level <= 7 && mapId === 'clareira_sombria') {
        return {
            common: 0.88,
            elite: 0.10,
            miniboss: 0.02,
            boss: 0
        };
    }

    const total = profile.common + profile.elite + profile.miniboss + profile.boss;

    return {
        common: profile.common / total,
        elite: profile.elite / total,
        miniboss: profile.miniboss / total,
        boss: profile.boss / total
    };
}

function applyDangerProfile(profile, dangerLevel = 0, pool = {}) {
    const bonus = Math.min(0.08, Math.max(0, dangerLevel) * 0.012);

    const adjusted = { ...profile };

    if (pool.elite?.length) {
        adjusted.elite += bonus * 0.50;
        adjusted.common -= bonus * 0.35;
    }

    if (pool.miniboss?.length) {
        adjusted.miniboss += bonus * 0.30;
        adjusted.common -= bonus * 0.20;
    }

    if (pool.boss?.length) {
        adjusted.boss += bonus * 0.20;
        adjusted.common -= bonus * 0.12;
    }

    adjusted.common = Math.max(0.16, adjusted.common);

    const total = adjusted.common + adjusted.elite + adjusted.miniboss + adjusted.boss;

    return {
        common: adjusted.common / total,
        elite: adjusted.elite / total,
        miniboss: adjusted.miniboss / total,
        boss: adjusted.boss / total
    };
}

function rollEnemyTier(profile) {
    let roll = Math.random();

    if ((roll -= profile.boss) <= 0) return 'boss';
    if ((roll -= profile.miniboss) <= 0) return 'miniboss';
    if ((roll -= profile.elite) <= 0) return 'elite';
    return 'common';
}

function scaleEnemyForPlayer(baseEnemy, playerLevel = 1, mapId = 'clareira_sombria') {
    const enemy = cloneEnemy(baseEnemy);
    const level = Number(playerLevel) || 1;
    const mapBaseLevel = getMapBaseLevel(mapId);

    /*
    Scaling controlado:
    o mapa mantém identidade e não vira "conteúdo do seu level".
    */
    const delta = Math.max(0, level - mapBaseLevel);

    const statScale = Math.min(1 + delta * 0.026, 1.38);
    const atkScale = Math.min(1 + delta * 0.022, 1.32);
    const defScale = Math.min(1 + delta * 0.018, 1.28);
    const rewardScale = Math.min(1 + delta * 0.022, 1.28);

    enemy.hp = Math.max(1, Math.round(enemy.hp * statScale));
    enemy.atk = Math.max(1, Math.round(enemy.atk * atkScale));
    enemy.def = Math.max(0, Math.round(enemy.def * defScale));
    enemy.crit = Math.min(35, Math.round((enemy.crit || 0) * (1 + delta * 0.008)));

    enemy.xp = Math.max(1, Math.round((enemy.xp || 0) * rewardScale));
    enemy.gold = Math.max(1, Math.round((enemy.gold || 0) * rewardScale));

    enemy.level = Math.max(
        enemy.level || mapBaseLevel,
        Math.min(level, mapBaseLevel + 8)
    );

    return enemy;
}

// ================================================
// SPAWN INTELIGENTE
// ================================================

function getRandomEnemy(mapId, playerLevel = 1, dangerLevel = 0) {
    const pool = getPool(mapId);
    const baseProfile = getSpawnProfile(mapId, playerLevel);
    const profile = applyDangerProfile(baseProfile, dangerLevel, pool);

    let tier = rollEnemyTier(profile);

    if (!pool[tier]?.length) {
        if (tier === 'boss' && pool.miniboss?.length) tier = 'miniboss';
        else if (tier === 'miniboss' && pool.elite?.length) tier = 'elite';
        else if (tier === 'elite' && pool.common?.length) tier = 'common';
        else tier = 'common';
    }

    const enemy = randomFrom(pool[tier]);
    const cloned = scaleEnemyForPlayer(enemy, playerLevel, mapId);

    if (tier === 'elite') cloned.isElite = true;
    if (tier === 'miniboss') cloned.isMiniBoss = true;
    if (tier === 'boss') cloned.isBoss = true;

    return cloned;
}

function getEnemyById(enemyId) {
    for (const map of Object.values(enemyPools)) {
        for (const tier of Object.values(map)) {
            const enemy = tier.find(e => e.id === enemyId);
            if (enemy) return cloneEnemy(enemy);
        }
    }
    return null;
}

module.exports = {
    enemyPools,
    getRandomEnemy,
    getEnemyById,
    ENEMY_ABILITIES
};
