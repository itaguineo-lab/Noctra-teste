const { randomUUID } = require('crypto');

const soulsList = [
    {
        id: 'soul_wolf',
        bossId: 'wolf_alpha',
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
        bossId: 'forest_priest',
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
        bossId: 'necromancer_ancient',
        name: 'Alma Gélida',
        rarity: 'Épico',
        emoji: '❄️',
        minLevel: 8,
        effect: {
            type: 'damage',
            multiplier: 1.5
        }
    },
    {
        id: 'soul_guardian',
        bossId: 'swamp_guardian',
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
        bossId: 'blood_lord',
        name: 'Alma Vampírica',
        rarity: 'Lendário',
        emoji: '🩸',
        minLevel: 15,
        effect: {
            type: 'damage',
            multiplier: 1.65
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
            multiplier: 1.8
        }
    },
    {
        id: 'soul_dragon',
        bossId: 'pharaoh_flame',
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

function createSoulInstance(soul) {
    return {
        ...soul,
        instanceId: randomUUID()
    };
}

function getSoulById(id) {
    return soulsList.find(soul => soul.id === id) || null;
}

/*
  Drop por boss
  Agora totalmente controlado pelo rewardService
*/
function dropSoul(playerLevel, bossId = null) {
    let available = soulsList.filter(
        soul => soul.minLevel <= playerLevel
    );

    if (bossId) {
        const bossSoul = available.find(
            soul => soul.bossId === bossId
        );

        if (bossSoul) {
            return createSoulInstance(bossSoul);
        }
    }

    if (!available.length) return null;

    const randomSoul =
        available[Math.floor(Math.random() * available.length)];

    return createSoulInstance(randomSoul);
}

function activateSoul(soul, state) {
    if (!soul || !state) {
        return { message: '❌ Alma inválida.' };
    }

    const effect = soul.effect || {};

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

module.exports = {
    soulsList,
    getSoulById,
    dropSoul,
    activateSoul,
    getRarityEmoji
};