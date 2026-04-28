function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function ensureArenaCurrencyState(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    player.glorias = Math.max(0, Math.floor(Number(player.glorias || 0)));

    if (!player.arena || typeof player.arena !== 'object') {
        player.arena = {};
    }

    player.arena.coins = Math.max(0, Math.floor(Number(player.arena.coins || 0)));

    return player;
}

function migrateLegacyArenaCoinsToGlorias(player) {
    ensureArenaCurrencyState(player);

    const legacyCoins = Math.max(0, Math.floor(Number(player.arena.coins || 0)));

    if (legacyCoins > 0) {
        player.glorias += legacyCoins;
        player.arena.coins = 0;
    }

    return {
        player,
        migrated: legacyCoins
    };
}

function getArenaGloriasBalance(player, options = {}) {
    ensureArenaCurrencyState(player);

    const includeLegacy = options.includeLegacy !== false;
    const legacy = includeLegacy ? Number(player.arena.coins || 0) : 0;

    return Math.max(0, Math.floor(Number(player.glorias || 0) + legacy));
}

function canSpendArenaGlorias(player, amount) {
    const value = Math.max(0, Math.floor(Number(amount || 0)));
    return getArenaGloriasBalance(player) >= value;
}

function spendArenaGlorias(player, amount) {
    ensureArenaCurrencyState(player);

    const value = Math.max(0, Math.floor(Number(amount || 0)));
    if (value <= 0) {
        return {
            success: true,
            spent: 0,
            balance: getArenaGloriasBalance(player)
        };
    }

    migrateLegacyArenaCoinsToGlorias(player);

    if (player.glorias < value) {
        return {
            success: false,
            spent: 0,
            balance: player.glorias,
            message: `❌ Glórias insuficientes. Faltam ${formatNumber(value - player.glorias)}.`
        };
    }

    player.glorias -= value;

    return {
        success: true,
        spent: value,
        balance: player.glorias
    };
}

function addArenaGlorias(player, amount) {
    ensureArenaCurrencyState(player);

    const value = Math.max(0, Math.floor(Number(amount || 0)));
    player.glorias += value;

    return {
        success: true,
        added: value,
        balance: player.glorias
    };
}

module.exports = {
    ensureArenaCurrencyState,
    migrateLegacyArenaCoinsToGlorias,
    getArenaGloriasBalance,
    canSpendArenaGlorias,
    spendArenaGlorias,
    addArenaGlorias,
    formatNumber
};
