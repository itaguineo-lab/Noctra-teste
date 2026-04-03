const { getRarityEmoji } = require('../data/constants');

function progressBar(
    current,
    max,
    size = 10,
    fullChar = '🟩',
    emptyChar = '⬜'
) {
    const safeCurrent = Number(current) || 0;
    const safeMax = max > 0 ? max : 1;

    const percentage = Math.min(
        Math.max(safeCurrent / safeMax, 0),
        1
    );

    const filledSize = Math.round(size * percentage);
    const emptySize = size - filledSize;

    return (
        fullChar.repeat(filledSize) +
        emptyChar.repeat(emptySize)
    );
}

function formatNumber(n) {
    const value = Number(n) || 0;

    return new Intl.NumberFormat('pt-BR')
        .format(value);
}

function formatTime(ms) {
    if (ms <= 0) return '0s';

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

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

function formatItemName(item) {
    if (!item) return '❓ Vazio';

    const emoji = getRarityEmoji(item.rarity);

    return `${emoji} *${item.name}*`;
}

function formatSoulName(soul) {
    if (!soul) return '🌑 Slot Vazio';

    const emoji = getRarityEmoji(soul.rarity);

    return `${emoji} *${soul.name}*`;
}

function formatItemStats(item) {
    if (!item) return '';

    const stats = [];

    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);

    return stats.length
        ? ` (${stats.join(', ')})`
        : '';
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