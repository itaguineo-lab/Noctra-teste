/*
=================================
NOX ECONOMY
=================================
*/

function ensureNoxBalance(player) {
    if (
        !player ||
        typeof player !== 'object'
    ) {
        throw new Error('Player inválido.');
    }

    if (
        typeof player.nox !== 'number' ||
        Number.isNaN(player.nox)
    ) {
        player.nox = 0;
    }

    return player;
}

function addNox(player, amount) {
    ensureNoxBalance(player);

    const value = Math.floor(
        Number(amount) || 0
    );

    if (value <= 0) {
        return false;
    }

    player.nox += value;

    return true;
}

function spendNox(player, amount) {
    ensureNoxBalance(player);

    const value = Math.floor(
        Number(amount) || 0
    );

    if (value <= 0) {
        return false;
    }

    if (player.nox < value) {
        return false;
    }

    player.nox -= value;

    return true;
}

/*
=================================
PACOTES PREMIUM
=================================
*/

function getNoxPack(packId) {
    const packs = {
        starter: {
            amount: 50,
            bonus: 0
        },
        hunter: {
            amount: 120,
            bonus: 10
        },
        legendary: {
            amount: 300,
            bonus: 40
        }
    };

    return packs[packId] || null;
}

function applyNoxPurchase(player, packId) {
    const pack = getNoxPack(packId);

    if (!pack) {
        return {
            success: false
        };
    }

    const total =
        pack.amount + pack.bonus;

    addNox(player, total);

    return {
        success: true,
        amount: total
    };
}

module.exports = {
    ensureNoxBalance,
    addNox,
    spendNox,
    getNoxPack,
    applyNoxPurchase
};