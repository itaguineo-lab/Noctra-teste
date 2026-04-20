const { BALANCE, getRarityEmoji, getRarityMult } = require('./balance');

const RARITIES = BALANCE.rarities;

const SLOT_EMOJIS = {
    weapon: '⚔️',
    shield: '🛡️',
    armor: '🥋',
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