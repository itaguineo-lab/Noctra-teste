const { randomUUID } = require('crypto');

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
        emoji: '🐺',
        minLevel: 1,
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
        emoji: '💚',
        minLevel: 5,
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
        emoji: '❄️',
        minLevel: 8,
        effect: {
            type: 'damage',
            multiplier: 1.5,
            freezeChance: 0.25
        }
    },

    {
        id: 'soul_guardian',
        bossId: 'swamp_abomination',
        name: 'Alma Guardiã',
        rarity: 'Épico',
        emoji: '🛡️',
        minLevel: 12,
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
        emoji: '🩸',
        minLevel: 15,
        effect: {
            type: 'lifesteal',
            multiplier: 1.65,
            healPercent: 0.25
        }
    },

    {
        id: 'soul_thunder',
        bossId: 'storm_titan',
        name: 'Alma Trovejante',
        rarity: 'Lendário',
        emoji: '⚡',
        minLevel: 20,
        effect: {
            type: 'damage',
            multiplier: 1.8,
            critBonus: 10
        }
    },

    {
        id: 'soul_dragon',
        bossId: 'dragon_of_void',
        name: 'Alma Dracônica',
        rarity: 'Mítico',
        emoji: '🐉',
        minLevel: 24,
        effect: {
            type: 'passive',
            atkBonus: 18,
            critBonus: 6
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
        instanceId: randomUUID()
    };
}

function getSoulById(id) {
    return (
        soulsList.find(
            soul => soul.id === id
        ) || null
    );
}

function getRarityEmoji(rarity) {
    const map = {
        Comum: '⚪',
        Incomum: '🟢',
        Raro: '🔵',
        Épico: '🟣',
        Lendário: '🟡',
        Mítico: '🔴'
    };

    return map[rarity] || '⚪';
}

function weightedRandom(list) {
    const totalWeight = list.reduce(
        (sum, soul) =>
            sum +
            (rarityWeights[soul.rarity] || 1),
        0
    );

    let roll =
        Math.random() * totalWeight;

    for (const soul of list) {
        roll -=
            rarityWeights[soul.rarity] || 1;

        if (roll <= 0) {
            return soul;
        }
    }

    return list[0];
}

/*
=================================
DROP SYSTEM
=================================
*/

function dropSoul(playerLevel, bossId = null) {
    const available = soulsList.filter(
        soul => soul.minLevel <= playerLevel
    );

    if (!available.length) {
        return null;
    }

    /*
    boss guaranteed soul bias
    */

    if (bossId) {
        const bossSoul = available.find(
            soul => soul.bossId === bossId
        );

        if (bossSoul) {
            return createSoulInstance(
                bossSoul
            );
        }
    }

    /*
    weighted random
    */

    const selected =
        weightedRandom(available);

    return createSoulInstance(
        selected
    );
}

/*
=================================
ACTIVATION
=================================
*/

function activateSoul(soul, state) {
    if (!soul || !state) {
        return {
            message: '❌ Alma inválida.'
        };
    }

    const effect =
        soul.effect || {};

    switch (effect.type) {
        case 'damage': {
            const damage = Math.floor(
                (state.player.atk || 1) *
                    (effect.multiplier || 1)
            );

            state.enemy.hp = Math.max(
                0,
                state.enemy.hp - damage
            );

            /*
            freeze chance
            */

            if (
                effect.freezeChance &&
                Math.random() <
                    effect.freezeChance
            ) {
                state.enemy.frozen = true;
            }

            return {
                damage,
                message: `${soul.emoji} ${soul.name} causou ${damage} de dano!`
            };
        }

        case 'heal': {
            const heal = Math.floor(
                (state.player.maxHp || 1) *
                    (effect.multiplier || 1)
            );

            state.player.hp = Math.min(
                state.player.maxHp,
                state.player.hp + heal
            );

            return {
                heal,
                message: `${soul.emoji} ${soul.name} curou ${heal} HP!`
            };
        }

        case 'lifesteal': {
            const damage = Math.floor(
                (state.player.atk || 1) *
                    (effect.multiplier || 1)
            );

            const heal = Math.floor(
                damage *
                    (effect.healPercent || 0.2)
            );

            state.enemy.hp = Math.max(
                0,
                state.enemy.hp - damage
            );

            state.player.hp = Math.min(
                state.player.maxHp,
                state.player.hp + heal
            );

            return {
                damage,
                heal,
                message: `${soul.emoji} ${soul.name} drenou ${damage} e curou ${heal} HP!`
            };
        }

        case 'passive':
            return {
                message: `${soul.emoji} ${soul.name} ativou seu poder passivo!`
            };

        default:
            return {
                message: `${soul.emoji} ${soul.name} ativada!`
            };
    }
}

/*
=================================
SOUL UPGRADE
=================================
*/

function levelUpSoul(soul, expGain = 1) {
    soul.exp =
        (soul.exp || 0) + expGain;

    const needed =
        soul.level * 3;

    if (soul.exp >= needed) {
        soul.exp -= needed;
        soul.level++;

        if (
            soul.effect.multiplier
        ) {
            soul.effect.multiplier =
                Number(
                    (
                        soul.effect
                            .multiplier + 0.05
                    ).toFixed(2)
                );
        }

        if (
            soul.effect.atkBonus
        ) {
            soul.effect.atkBonus += 2;
        }
    }

    return soul;
}

module.exports = {
    soulsList,
    getSoulById,
    dropSoul,
    activateSoul,
    getRarityEmoji,
    levelUpSoul
};