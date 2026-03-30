const soulsList = [
    {
        id: 'soul_wolf',
        name: 'Alma do Lobo Sombrio',
        rarity: 'Comum',
        emoji: '🐺',
        effect: { type: 'damage', multiplier: 1.3 },
        dropChance: 0.15,
        minLevel: 1
    },
    {
        id: 'soul_heal',
        name: 'Alma Curadora',
        rarity: 'Comum',
        emoji: '💚',
        effect: { type: 'heal', multiplier: 0.3 },
        dropChance: 0.12,
        minLevel: 3
    }
];

function getSoulById(id) {
    return soulsList.find(soul => soul.id === id);
}

function dropSoul(playerLevel) {
    const available = soulsList.filter(
        soul => soul.minLevel <= playerLevel
    );

    if (!available.length) return null;

    const dropRoll = Math.random();

    for (const soul of available) {
        if (dropRoll <= soul.dropChance) {
            return {
                ...soul,
                instanceId: `${soul.id}_${Date.now()}`
            };
        }
    }

    return null;
}

function activateSoul(soul, state) {
    const effect = soul.effect;

    switch (effect.type) {
        case 'damage': {
            const damage = Math.floor(
                state.player.atk * effect.multiplier
            );

            state.enemy.hp -= damage;

            return {
                damage,
                message: `✨ ${soul.name} causou ${damage} de dano!`
            };
        }

        case 'heal': {
            const heal = Math.floor(
                state.player.maxHp * effect.multiplier
            );

            state.player.hp = Math.min(
                state.player.maxHp,
                state.player.hp + heal
            );

            return {
                heal,
                message: `💚 ${soul.name} curou ${heal} HP!`
            };
        }

        default:
            return {
                message: `✨ ${soul.name} ativada!`
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