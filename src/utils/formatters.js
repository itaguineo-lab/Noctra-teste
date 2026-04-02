const { getRarityColor } = require('../data/constants');

/**
 * Cria uma barra de progresso visual com quadrados
 * @param {number} current Valor atual
 * @param {number} max Valor máximo
 * @param {number} size Tamanho da barra (caracteres)
 * @param {string} fullChar Caractere para parte preenchida (padrão 🟩)
 * @param {string} emptyChar Caractere para parte vazia (padrão ⬜)
 */
function progressBar(current, max, size = 10, fullChar = '🟩', emptyChar = '⬜') {
    const safeMax = max > 0 ? max : 1;
    const percentage = Math.min(Math.max(current / safeMax, 0), 1);
    const filledSize = Math.round(size * percentage);
    const emptySize = size - filledSize;
    return fullChar.repeat(filledSize) + emptyChar.repeat(emptySize);
}

/**
 * Formata números com separador de milhar (Ex: 1.500)
 */
function formatNumber(n) {
    if (!n && n !== 0) return '0';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formata milissegundos em "Xm Ys" ou apenas segundos
 */
function formatTime(ms) {
    if (ms <= 0) return '0s';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

/**
 * Formata duração em milissegundos para "Xh Ym Zs"
 */
function formatDuration(ms) {
    if (ms <= 0) return '0s';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.join(' ');
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

/**
 * Gera string com os stats do item
 */
function formatItemStats(item) {
    if (!item) return '';
    const stats = [];
    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);
    return stats.length ? ` (${stats.join(', ')})` : '';
}

module.exports = { 
    progressBar, 
    formatNumber, 
    formatItemName, 
    formatSoulName,
    formatTime,
    formatItemStats,
    formatDuration
};