const { randomUUID } = require('crypto');
const { BALANCE } = require('../../data/balance');

/*
=================================
SOUL DATABASE
=================================
*/

const soulsList = [
    {
        id: 'soul_wolf',
        bossId: 'alpha_shadow_wolf',
        name: 'Alma do Lobo Sombrio',
        rarity: 'Raro',
        tier: 1,
        emoji: '🐺',
        minLevel: 1,
        shardValue: 5,
        cooldownTurns: 3,
        effect: {
            type: 'damage',
            multiplier: 1.35
        }
    },
    {
        id: 'soul_heal',
        bossId: 'forest_guardian',
        name: 'Alma Curadora',
        rarity: 'Raro',
        tier: 1,
        emoji: '💚',
        minLevel: 5,
        shardValue: 5,
        cooldownTurns: 4,
        effect: {
            type: 'heal',
            multiplier: 0.35
        }
    },
    {
        id: 'soul_frost',
        bossId: 'lord_of_crypt',
        name: 'Alma Gélida',
        rarity: 'Épico',
        tier: 2,
        emoji: '❄️',
        minLevel: 8,
        shardValue: 10,
        cooldownTurns: 3,
        effect: {
            type: 'damage',
            multiplier: 1.5,
            freezeChance: 0.25
        }
    },
    {
        id: 'soul_guardian',
        bossId: 'swamp_guardian',
        name: 'Alma Guardiã',
        rarity: 'Épico',
        tier: 2,
        emoji: '🛡️',
        minLevel: 12,
        shardValue: 10,
        cooldownTurns: 0,
        effect: {
            type: 'passive',
            defBonus: 10,
            hpBonus: 30
        }
    },
    {
        id: 'soul_vampire',
        bossId: 'lord_of_decay',
        name: 'Alma Vampírica',
        rarity: 'Lendário',
        tier: 3,
        emoji: '🩸',
        minLevel: 15,
        shardValue: 20,
        cooldownTurns: 4,
        effect: {
            type: 'lifesteal',
            multiplier: 1.65,
            healPercent: 0.25
        }
    },
    {
        id: 'soul_dragon',
        bossId: 'void_drake',
        name: 'Alma Dracônica',
        rarity: 'Mítico',
        tier: 4,
        emoji: '🐉',
        minLevel: 24,
        shardValue: 40,
        cooldownTurns: 0,
        effect: {
            type: 'passive',
            atkBonus: 18,
            critBonus: 6
        }
    },
    {
        id: 'soul_noctra',
        bossId: 'noctra_avatar',
        name: 'Alma de Noctra',
        rarity: 'Mítico',
        tier: 5,
        emoji: '🌑',
        minLevel: 35,
        shardValue: 60,
        cooldownTurns: 4,
        effect: {
            type: 'damage',
            multiplier: 2.1,
            freezeChance: 0.15
        }
    }
];

/*
=================================
RARITY WEIGHTS
=================================
*/

const rarityWeights = {
    Raro: 55,
    Épico: 25,
    Lendário: 15,
    Mítico: 5
};

const DEFAULT_COOLDOWNS_BY_EFFECT = {
    damage: 3,
    heal: 4,
    lifesteal: 4,
    passive: 0
};

/*
=================================
DROP SOURCES
=================================
=================================
*/

const SOUL_DROP_SOURCES = {
    field_elite_thematic: BALANCE.souls.fieldEliteThematicDropChance,
    field_miniboss_thematic: BALANCE.souls.fieldMiniBossThematicDropChance,
    field_boss: BALANCE.souls.fieldBossDropChance,
    dungeon_boss: BALANCE.souls.dungeonBossDropChance,
    world_boss: BALANCE.souls.worldBossDropChance,
    event_boss: BALANCE.souls.eventBossDropChance
};

const PITY_RULES = {
    boostAt: BALANCE.souls.pityBoostAt,
    multiplier: BALANCE.souls.pityMultiplier
};

/*
=================================
HELPERS
=================================
*/

function createSoulInstance(soul) {
    return {
        ...soul,
        level: 1,
        exp: 0,
        shards: 0,
        awakenLevel: 0,
        instanceId: randomUUID()
    };
}

function getSoulById(id) {
    return soulsList.find(soul => soul.id === id) || null;
}

function hasThemedSoul(enemyId) {
    return soulsList.some(soul => soul.bossId === enemyId);
}

function getRarityEmoji(rarity) {
    const map = {
        Raro: '🔵',
        Épico: '🟣',
        Lendário: '🟠',
        Mítico: '🔴'
    };

    return map[rarity] || '⚪';
}

function getSoulCooldownTurns(soul = {}) {
    const explicit = Number(soul.cooldownTurns);
    if (Number.isFinite(explicit)) return Math.max(0, explicit);

    const effectType = soul.effect?.type || 'damage';
    const fallback = DEFAULT_COOLDOWNS_BY_EFFECT[effectType];
    return Math.max(0, Number.isFinite(Number(fallback)) ? Number(fallback) : 3);
}

function isPassiveSoul(soul = {}) {
    return soul.effect?.type === 'passive';
}

function weightedRandom(list) {
    if (!Array.isArray(list) || !list.length) return null;

    const total = list.reduce((sum, soul) => sum + (rarityWeights[soul.rarity] || 1), 0);
    let roll = Math.random() * total;

    for (const soul of list) {
        roll -= rarityWeights[soul.rarity] || 1;
        if (roll <= 0) return soul;
    }

    return list[0] || null;
}

function getAvailableSoulsByLevel(playerLevel) {
    const safeLevel = Math.max(1, Number(playerLevel) || 1);
    return soulsList.filter(soul => soul.minLevel <= safeLevel);
}

function getSoulDropChance(source = 'field_boss', pityCounter = 0) {
    let chance = SOUL_DROP_SOURCES[source] || 0;

    if (source === 'field_boss' && pityCounter >= PITY_RULES.boostAt) {
        chance *= PITY_RULES.multiplier;
    }

    return Math.min(1, chance);
}

function resolveSoulDrop({ playerLevel, enemy, source = 'field_boss' }) {
    const available = getAvailableSoulsByLevel(playerLevel);
    if (!available.length) return null;

    const themedSoul = enemy?.id
        ? available.find(soul => soul.bossId === enemy.id)
        : null;

    /*
    Elite e miniboss só dropam alma se forem temáticos.
    Não existe fallback aleatório nesses casos.
    */
    if (source === 'field_elite_thematic' || source === 'field_miniboss_thematic') {
        return themedSoul ? createSoulInstance(themedSoul) : null;
    }

    /*
    Bosses e fontes superiores:
    1) tenta alma temática
    2) se não houver, cai para rolagem ponderada
    */
    if (themedSoul) {
        return createSoulInstance(themedSoul);
    }

    const randomSoul = weightedRandom(available);
    if (!randomSoul) return null;

    return createSoulInstance(randomSoul);
}

function registerSoulPityFailure(player) {
    player.soulPityCounter = Math.max(0, Number(player.soulPityCounter || 0)) + 1;
    return player.soulPityCounter;
}

function resetSoulPity(player) {
    player.soulPityCounter = 0;
    return player.soulPityCounter;
}

/*
=================================
FUSION
=================================
*/

function fuseSouls(soulA, soulB) {
    if (!soulA || !soulB) return null;
    if (soulA.id !== soulB.id) return null;

    const newSoul = {
        ...soulA,
        awakenLevel: (soulA.awakenLevel || 0) + 1,
        level: Math.max(soulA.level || 1, soulB.level || 1)
    };

    if (newSoul.effect?.multiplier) {
        newSoul.effect.multiplier = Number((newSoul.effect.multiplier + 0.10).toFixed(2));
    }

    if (newSoul.effect?.atkBonus) {
        newSoul.effect.atkBonus += 5;
    }

    if (newSoul.effect?.defBonus) {
        newSoul.effect.defBonus += 3;
    }

    if (newSoul.effect?.hpBonus) {
        newSoul.effect.hpBonus += 10;
    }

    if (newSoul.effect?.critBonus) {
        newSoul.effect.critBonus += 2;
    }

    return newSoul;
}

/*
=================================
SHARDS
=================================
*/

function dismantleSoul(soul) {
    return soul?.shardValue || 5;
}

/*
=================================
ACTIVATION
=================================
*/

function activateSoul(soul, state) {
    if (!soul || !state) {
        return {
            success: false,
            message: '❌ Alma inválida.'
        };
    }

    const effect = soul.effect || {};

    if (effect.type === 'passive') {
        return {
            success: false,
            passive: true,
            message: `${soul.emoji || '💀'} ${soul.name} é uma alma passiva.`
        };
    }

    switch (effect.type) {
        case 'damage': {
            const damage = Math.floor((state.player.atk || 1) * (effect.multiplier || 1));
            state.enemy.hp = Math.max(0, state.enemy.hp - damage);

            if (effect.freezeChance && Math.random() < effect.freezeChance) {
                state.enemy.frozen = true;
            }

            return {
                success: true,
                damage,
                message: `${soul.emoji} ${soul.name} causou ${damage} dano!`
            };
        }

        case 'heal': {
            const heal = Math.floor((state.player.maxHp || 1) * (effect.multiplier || 1));
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);

            return {
                success: true,
                heal,
                message: `${soul.emoji} ${soul.name} curou ${heal} HP!`
            };
        }

        case 'lifesteal': {
            const damage = Math.floor((state.player.atk || 1) * (effect.multiplier || 1));
            const heal = Math.floor(damage * (effect.healPercent || 0.2));

            state.enemy.hp = Math.max(0, state.enemy.hp - damage);
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);

            return {
                success: true,
                damage,
                heal,
                message: `${soul.emoji} drenou ${damage} e curou ${heal}!`
            };
        }

        default:
            return {
                success: true,
                message: `${soul.emoji} ${soul.name} ativada!`
            };
    }
}

/*
=================================
UPGRADE
=================================
*/

function levelUpSoul(soul, expGain = 1) {
    soul.exp = (soul.exp || 0) + expGain;

    const needed = Math.max(1, (soul.level || 1) * 3);

    if (soul.exp >= needed) {
        soul.exp -= needed;
        soul.level = (soul.level || 1) + 1;

        if (soul.effect?.multiplier) {
            soul.effect.multiplier = Number((soul.effect.multiplier + 0.05).toFixed(2));
        }

        if (soul.effect?.atkBonus) {
            soul.effect.atkBonus += 2;
        }

        if (soul.effect?.defBonus) {
            soul.effect.defBonus += 1;
        }

        if (soul.effect?.hpBonus) {
            soul.effect.hpBonus += 4;
        }

        if (soul.effect?.critBonus) {
            soul.effect.critBonus += 1;
        }
    }

    return soul;
}

module.exports = {
    soulsList,
    SOUL_DROP_SOURCES,
    PITY_RULES,
    DEFAULT_COOLDOWNS_BY_EFFECT,
    getSoulById,
    hasThemedSoul,
    getSoulDropChance,
    resolveSoulDrop,
    registerSoulPityFailure,
    resetSoulPity,
    fuseSouls,
    dismantleSoul,
    activateSoul,
    getRarityEmoji,
    getSoulCooldownTurns,
    isPassiveSoul,
    levelUpSoul
};
