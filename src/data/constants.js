const RARITY_COLORS = {
    Comum: '⚪',
    Incomum: '🟢',
    Raro: '🔵',
    Épico: '🟣',
    Lendário: '🟡',
    Mítico: '🔴'
};

const RARITY_EMOJIS = RARITY_COLORS;

const SLOT_EMOJIS = {
    weapon: '⚔️',
    armor: '🛡️',
    accessory: '📿',
    material: '🧩',
    consumable: '🧪'
};

const CLASSES = [
    'guerreiro',
    'arqueiro',
    'mago'
];

const RARITY_MULT = {
    Comum: 1.0,
    Incomum: 1.2,
    Raro: 1.5,
    Épico: 2.0,
    Lendário: 2.5,
    Mítico: 3.5
};

function getRarityColor(rarity) {
    return (
        RARITY_COLORS[rarity] ||
        '⚪'
    );
}

function getRarityEmoji(rarity) {
    return (
        RARITY_EMOJIS[rarity] ||
        '⚪'
    );
}

function getSlotEmoji(slot) {
    return (
        SLOT_EMOJIS[slot] ||
        '📦'
    );
}

module.exports = {
    RARITY_COLORS,
    RARITY_EMOJIS,
    SLOT_EMOJIS,
    CLASSES,
    RARITY_MULT,
    getRarityColor,
    getRarityEmoji,
    getSlotEmoji
};