function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function clonePlain(value) {
    if (!isObject(value)) return value || {};

    if (typeof value.toObject === 'function') {
        try {
            return value.toObject({ depopulate: true, virtuals: false, getters: true }) || {};
        } catch {
            // fallback abaixo
        }
    }

    if (isObject(value._doc)) {
        return value._doc;
    }

    return value;
}

function getNestedValue(source, path) {
    const plain = clonePlain(source);
    const parts = String(path || '').split('.').filter(Boolean);

    let current = plain;
    for (const part of parts) {
        if (!isObject(current) && typeof current !== 'function') return undefined;
        current = current?.[part];
    }

    return current;
}

function readValue(source, ...paths) {
    const plain = clonePlain(source);

    for (const path of paths) {
        const direct = getNestedValue(source, path);
        if (direct !== undefined && direct !== null && direct !== '') return direct;

        const fromPlain = getNestedValue(plain, path);
        if (fromPlain !== undefined && fromPlain !== null && fromPlain !== '') return fromPlain;
    }

    return undefined;
}

function toSafeNumber(value) {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) return 0;

        const normalized = raw
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.');

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    if (typeof value === 'bigint') {
        return Number(value);
    }

    if (isObject(value) && typeof value.valueOf === 'function') {
        const primitive = value.valueOf();
        if (primitive !== value) return toSafeNumber(primitive);
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCurrencyValue(value) {
    return Math.max(0, Math.floor(toSafeNumber(value)));
}

function readCurrency(source, paths) {
    for (const path of paths) {
        const raw = readValue(source, path);
        if (raw === null || raw === undefined || raw === '') continue;

        const parsed = normalizeCurrencyValue(raw);
        if (parsed > 0) return parsed;

        /*
        Retorna 0 apenas quando o campo existe de verdade e todos os campos
        posteriores também podem não existir. O getWallet faz fallback entre
        aliases antes de aceitar o zero final.
        */
    }

    return 0;
}

function getWallet(player = {}) {
    const source = clonePlain(player);

    const gold = readCurrency(source, [
        'gold',
        'ouro',
        'coins',
        'money',
        'wallet.gold',
        'wallet.ouro',
        'economy.gold',
        'economy.ouro',
        'currencies.gold',
        'currencies.ouro'
    ]);

    const nox = readCurrency(source, [
        'nox',
        'Nox',
        'wallet.nox',
        'wallet.Nox',
        'economy.nox',
        'economy.Nox',
        'currencies.nox',
        'currencies.Nox'
    ]);

    const glorias = readCurrency(source, [
        'glorias',
        'glories',
        'glory',
        'arena.glorias',
        'arena.glories',
        'wallet.glorias',
        'wallet.glories',
        'economy.glorias',
        'economy.glories',
        'currencies.glorias',
        'currencies.glories'
    ]);

    return { gold, nox, glorias };
}

function hasWalletFields(player = {}) {
    const source = clonePlain(player);

    const paths = [
        'gold', 'ouro', 'coins', 'money', 'wallet.gold', 'wallet.ouro', 'economy.gold', 'economy.ouro', 'currencies.gold', 'currencies.ouro',
        'nox', 'Nox', 'wallet.nox', 'wallet.Nox', 'economy.nox', 'economy.Nox', 'currencies.nox', 'currencies.Nox',
        'glorias', 'glories', 'glory', 'arena.glorias', 'arena.glories', 'wallet.glorias', 'wallet.glories', 'economy.glorias', 'economy.glories', 'currencies.glorias', 'currencies.glories'
    ];

    return paths.some(path => readValue(source, path) !== undefined);
}

function syncWalletToPlayer(player = {}) {
    if (!player) return player;

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

    return normalizeCurrencyValue(readValue(player, currency));
}

module.exports = {
    clonePlain,
    readValue,
    toSafeNumber,
    normalizeCurrencyValue,
    getWallet,
    hasWalletFields,
    syncWalletToPlayer,
    formatNumber,
    getWalletInline,
    getWalletText,
    getCurrencyBalance
};
