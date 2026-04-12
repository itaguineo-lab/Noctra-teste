const RARITY_EMOJIS = {
    Comum: '⚪',
    Incomum: '🟢',
    Raro: '🔵',
    Épico: '🟣',
    Lendário: '🟠',
    Mítico: '🔴'
};

function getRarityEmoji(rarity) {
    return RARITY_EMOJIS[rarity] || '⚪';
}

function progressBar(
    current,
    max,
    size = 6,
    fullChar = '🟩',
    emptyChar = '⬛'
) {
    const safeCurrent = Number(current) || 0;
    const safeMax = Number(max) > 0 ? Number(max) : 1;

    const percentage = Math.min(
        Math.max(safeCurrent / safeMax, 0),
        1
    );

    const filledSize = Math.round(size * percentage);
    const emptySize = Math.max(0, size - filledSize);

    return (
        fullChar.repeat(filledSize) +
        emptyChar.repeat(emptySize)
    );
}

function formatNumber(n) {
    const value = Number(n) || 0;
    return new Intl.NumberFormat('pt-BR').format(Math.trunc(value));
}

function formatTime(ms) {
    const safeMs = Math.max(0, Number(ms) || 0);
    if (safeMs <= 0) return '0s';

    const hours = Math.floor(safeMs / 3600000);
    const minutes = Math.floor((safeMs % 3600000) / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatDuration(ms) {
    const safeMs = Math.max(0, Number(ms) || 0);
    if (safeMs <= 0) return '0s';

    const hours = Math.floor(safeMs / 3600000);
    const minutes = Math.floor((safeMs % 3600000) / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

function formatPercent(value, decimals = 0) {
    const safeValue = Number(value) || 0;
    return `${safeValue.toFixed(decimals)}%`;
}

function formatCurrency(value, symbol = '💰') {
    return `${symbol} ${formatNumber(value)}`;
}

function formatItemName(item) {
    if (!item) return '❓ Vazio';
    const emoji = getRarityEmoji(item.rarity);
    const level = item.level ? ` [Lv${item.level}]` : '';
    return `${emoji} ${item.name}${level}`;
}

function formatSoulName(soul) {
    if (!soul) return '🌑 Slot Vazio';
    const emoji = getRarityEmoji(soul.rarity);
    const level = soul.level ? ` [Lv${soul.level}]` : '';
    return `${emoji} ${soul.name}${level}`;
}

function formatItemStats(item) {
    if (!item) return '';
    const stats = [];
    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);
    return stats.length ? ` (${stats.join(', ')})` : '';
}

function formatDelta(value) {
    const delta = Number(value) || 0;
    if (delta === 0) return 'EQUIPADO';
    return delta > 0 ? `+${delta}` : `${delta}`;
}

module.exports = {
    progressBar,
    formatNumber,
    formatItemName,
    formatSoulName,
    formatTime,
    formatItemStats,
    formatDuration,
    formatPercent,
    formatCurrency,
    formatDelta,
    getRarityEmoji
};
