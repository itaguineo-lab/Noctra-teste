const RARITIES = {
    Comum: {
        emoji: '⚪',
        mult: 1.0,
        weight: 50
    },
    Incomum: {
        emoji: '🟢',
        mult: 1.3,
        weight: 25
    },
    Raro: {
        emoji: '🔵',
        mult: 1.7,
        weight: 15
    },
    Épico: {
        emoji: '🟣',
        mult: 2.3,
        weight: 7
    },
    Lendário: {
        emoji: '🟠',
        mult: 3.2,
        weight: 2.5
    },
    Mítico: {
        emoji: '🔴',
        mult: 5,
        weight: 0.5
    }
};

const SLOT_EMOJIS = {
    weapon: '⚔️',
    armor: '🛡️',
    necklace: '📿',
    ring: '💍',
    boots: '👢',
    consumable: '🧪'
};

const CLASSES = [
    'guerreiro',
    'arqueiro',
    'mago'
];

function getRarityEmoji(rarity) {
    return RARITIES[rarity]?.emoji || '⚪';
}

function getRarityMult(rarity) {
    return RARITIES[rarity]?.mult || 1;
}

function getSlotEmoji(slot) {
    return SLOT_EMOJIS[slot] || '📦';
}

module.exports = {
    RARITIES,
    SLOT_EMOJIS,
    CLASSES,
    getRarityEmoji,
    getRarityMult,
    getSlotEmoji
};