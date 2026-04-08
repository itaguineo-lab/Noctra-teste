const { randomUUID } = require('crypto');

/*
=================================
SOUL DATABASE PREMIUM
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
        tier: 2,
        emoji: '🛡️',
        minLevel: 12,
        shardValue: 10,
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
        effect: {
            type: 'lifesteal',
            multiplier: 1.65,
            healPercent: 0.25
        }
    },

    {
        id: 'soul_dragon',
        bossId: 'dragon_of_void',
        name: 'Alma Dracônica',
        rarity: 'Mítico',
        tier: 4,
        emoji: '🐉',
        minLevel: 24,
        shardValue: 40,
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
PITY SYSTEM
=================================
*/

const pityLimits = {
    Épico: 8,
    Lendário: 15,
    Mítico: 25
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
    return (
        soulsList.find(
            soul => soul.id === id
        ) || null
    );
}

function getRarityEmoji(rarity) {
    const map = {
        Raro: '🔵',
        Épico: '🟣',
        Lendário: '🟡',
        Mítico: '🔴'
    };

    return map[rarity] || '⚪';
}

function weightedRandom(list) {
    const total = list.reduce(
        (sum, soul) =>
            sum +
            (rarityWeights[soul.rarity] || 1),
        0
    );

    let roll =
        Math.random() * total;

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
DROP WITH PITY
=================================
*/

function dropSoul(
    playerLevel,
    bossId = null,
    pityCounter = 0
) {
    const available = soulsList.filter(
        soul =>
            soul.minLevel <=
            playerLevel
    );

    if (!available.length) {
        return null;
    }

    /*
    guaranteed boss soul
    */

    if (bossId) {
        const bossSoul =
            available.find(
                soul =>
                    soul.bossId ===
                    bossId
            );

        if (
            bossSoul &&
            Math.random() <= 0.20
        ) {
            return createSoulInstance(
                bossSoul
            );
        }
    }

    /*
    pity
    */

    if (
        pityCounter >=
        pityLimits.Mítico
    ) {
        const mythic =
            available.filter(
                s =>
                    s.rarity ===
                    'Mítico'
            );

        if (mythic.length) {
            return createSoulInstance(
                weightedRandom(
                    mythic
                )
            );
        }
    }

    const selected =
        weightedRandom(
            available
        );

    return createSoulInstance(
        selected
    );
}

/*
=================================
FUSION
=================================
*/

function fuseSouls(
    soulA,
    soulB
) {
    if (
        !soulA ||
        !soulB
    ) {
        return null;
    }

    if (
        soulA.id !== soulB.id
    ) {
        return null;
    }

    const newSoul = {
        ...soulA
    };

    newSoul.awakenLevel =
        (soulA.awakenLevel || 0) + 1;

    newSoul.level =
        Math.max(
            soulA.level,
            soulB.level
        );

    if (
        newSoul.effect
            .multiplier
    ) {
        newSoul.effect.multiplier =
            Number(
                (
                    newSoul.effect
                        .multiplier +
                    0.10
                ).toFixed(2)
            );
    }

    if (
        newSoul.effect
            .atkBonus
    ) {
        newSoul.effect.atkBonus += 5;
    }

    return newSoul;
}

/*
=================================
SHARDS
=================================
*/

function dismantleSoul(
    soul
) {
    return (
        soul.shardValue || 5
    );
}

/*
=================================
ACTIVATION
=================================
*/

function activateSoul(
    soul,
    state
) {
    if (
        !soul ||
        !state
    ) {
        return {
            message:
                '❌ Alma inválida.'
        };
    }

    const effect =
        soul.effect || {};

    switch (
        effect.type
    ) {
        case 'damage': {
            const damage =
                Math.floor(
                    (state.player
                        .atk ||
                        1) *
                        (effect.multiplier ||
                            1)
                );

            state.enemy.hp =
                Math.max(
                    0,
                    state.enemy.hp -
                        damage
                );

            if (
                effect.freezeChance &&
                Math.random() <
                    effect.freezeChance
            ) {
                state.enemy.frozen =
                    true;
            }

            return {
                damage,
                message: `${soul.emoji} ${soul.name} causou ${damage} dano!`
            };
        }

        case 'heal': {
            const heal =
                Math.floor(
                    (state.player
                        .maxHp ||
                        1) *
                        (effect.multiplier ||
                            1)
                );

            state.player.hp =
                Math.min(
                    state.player
                        .maxHp,
                    state.player.hp +
                        heal
                );

            return {
                heal,
                message: `${soul.emoji} ${soul.name} curou ${heal} HP!`
            };
        }

        case 'lifesteal': {
            const damage =
                Math.floor(
                    (state.player
                        .atk ||
                        1) *
                        (effect.multiplier ||
                            1)
                );

            const heal =
                Math.floor(
                    damage *
                        (effect.healPercent ||
                            0.2)
                );

            state.enemy.hp =
                Math.max(
                    0,
                    state.enemy.hp -
                        damage
                );

            state.player.hp =
                Math.min(
                    state.player
                        .maxHp,
                    state.player.hp +
                        heal
                );

            return {
                damage,
                heal,
                message: `${soul.emoji} drenou ${damage} e curou ${heal}!`
            };
        }

        default:
            return {
                message: `${soul.emoji} ${soul.name} ativada!`
            };
    }
}

/*
=================================
UPGRADE
=================================
*/

function levelUpSoul(
    soul,
    expGain = 1
) {
    soul.exp =
        (soul.exp || 0) +
        expGain;

    const needed =
        soul.level * 3;

    if (
        soul.exp >= needed
    ) {
        soul.exp -= needed;
        soul.level++;

        if (
            soul.effect
                .multiplier
        ) {
            soul.effect.multiplier =
                Number(
                    (
                        soul.effect
                            .multiplier +
                        0.05
                    ).toFixed(2)
                );
        }

        if (
            soul.effect
                .atkBonus
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
    fuseSouls,
    dismantleSoul,
    activateSoul,
    getRarityEmoji,
    levelUpSoul
};