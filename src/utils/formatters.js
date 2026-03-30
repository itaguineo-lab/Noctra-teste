const { getRarityColor } = require('../data/constants');

/**
 * Cria uma barra de progresso visual
 * @param {number} current Valor atual
 * @param {number} max Valor máximo
 * @param {number} size Tamanho da barra (caracteres)
 */
function progressBar(current, max, size = 10) {
    const safeMax =
        max > 0 ? max : 1;

    const percentage = Math.min(
        Math.max(current / safeMax, 0),
        1
    );

    const filledSize = Math.round(
        size * percentage
    );

    const emptySize =
        size - filledSize;

    return (
        '🟩'.repeat(filledSize) +
        '⬜'.repeat(emptySize)
    );
}

/**
 * Formata números com separador de milhar (Ex: 1,500)
 */
function formatNumber(n) {
    if (!n) return '0';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formata o nome do item com cor de raridade para mensagens
 */
function formatItemName(item) {
    if (!item) return '❓ Vazio';
    const color = getRarityColor(item.rarity);
    return `${color} *${item.name}*`;
}

/**
 * Formata o nome da alma
 */
function formatSoulName(soul) {
    if (!soul) return '🌑 Slot Vazio';
    const color = getRarityColor(soul.rarity);
    return `${color} *${soul.name}*`;
}

module.exports = { 
    progressBar, 
    formatNumber, 
    formatItemName, 
    formatSoulName 
};
