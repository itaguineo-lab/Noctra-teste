/**
 * Gerencia a moeda premium Nox.
 */

function ensureNoxBalance(player) {
    if (!player || typeof player !== 'object') {
        throw new Error('Player inválido.');
    }

    if (typeof player.nox !== 'number' || Number.isNaN(player.nox)) {
        player.nox = 0;
    }

    return player;
}

function addNox(player, amount) {
    ensureNoxBalance(player);

    const value = Math.floor(Number(amount) || 0);
    if (value <= 0) return false;

    player.nox += value;
    return true;
}

function spendNox(player, amount) {
    ensureNoxBalance(player);

    const value = Math.floor(Number(amount) || 0);
    if (value <= 0) return false;

    if (player.nox < value) {
        return false;
    }

    player.nox -= value;
    return true;
}

function getVipNoxBonus(baseAmount, isVip = false, multiplier = 1.2) {
    const value = Math.floor(Number(baseAmount) || 0);
    if (value <= 0) return 0;

    return isVip ? Math.floor(value * multiplier) : value;
}

module.exports = {
    ensureNoxBalance,
    addNox,
    spendNox,
    getVipNoxBonus
};