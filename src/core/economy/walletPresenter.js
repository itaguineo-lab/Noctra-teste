function toSafeNumber(value) {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const normalized = value
            .trim()
            .replace(/\./g, '')
            .replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrencyValue(value) {
    return Math.max(0, Math.floor(toSafeNumber(value)));
}

function readFirstNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const parsed = normalizeCurrencyValue(value);
        if (parsed > 0) return parsed;
    }

    return 0;
}

function getWallet(player = {}) {
    const gold = readFirstNumber(
        player.gold,
        player.ouro,
        player.coins,
        player.money,
        player.wallet?.gold,
        player.economy?.gold
    );

    const nox = readFirstNumber(
        player.nox,
        player.Nox,
        player.wallet?.nox,
        player.economy?.nox
    );

    const glorias = readFirstNumber(
        player.glorias,
        player.glories,
        player.glory,
        player.arena?.glorias,
        player.wallet?.glorias,
        player.economy?.glorias
    );

    return { gold, nox, glorias };
}

function syncWalletToPlayer(player = {}) {
    const wallet = getWallet(player);

    player.gold = wallet.gold;
    player.nox = wallet.nox;
    player.glorias = wallet.glorias;

    return player;
}

function formatNumber(value) {
    return normalizeCurrencyValue(value).toLocaleString('pt-BR');
}

function getWalletInline(player = {}) {
    const wallet = getWallet(player);
    return `💰 ${formatNumber(wallet.gold)}   💎 ${formatNumber(wallet.nox)}   🏅 ${formatNumber(wallet.glorias)}`;
}

function getWalletText(player = {}) {
    const wallet = getWallet(player);

    return [
        `💰 ${formatNumber(wallet.gold)} ouro`,
        `💎 ${formatNumber(wallet.nox)} Nox`,
        `🏅 ${formatNumber(wallet.glorias)} glórias`
    ].join('\n');
}

function getCurrencyBalance(player = {}, currency = 'gold') {
    const wallet = getWallet(player);

    if (currency === 'gold') return wallet.gold;
    if (currency === 'nox') return wallet.nox;
    if (currency === 'glorias') return wallet.glorias;

    return normalizeCurrencyValue(player?.[currency]);
}

module.exports = {
    toSafeNumber,
    normalizeCurrencyValue,
    getWallet,
    syncWalletToPlayer,
    formatNumber,
    getWalletInline,
    getWalletText,
    getCurrencyBalance
};
