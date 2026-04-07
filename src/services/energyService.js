function ensureEnergyFields(
    player
) {
    if (
        !player ||
        typeof player !==
            'object'
    ) {
        throw new Error(
            'Player inválido.'
        );
    }

    if (
        typeof player.maxEnergy !==
            'number' ||
        Number.isNaN(
            player.maxEnergy
        )
    ) {
        player.maxEnergy =
            player.vip
                ? 40
                : 20;
    }

    if (
        typeof player.energy !==
            'number' ||
        Number.isNaN(
            player.energy
        )
    ) {
        player.energy =
            player.maxEnergy;
    }

    if (
        !player.lastEnergyUpdate
    ) {
        player.lastEnergyUpdate =
            Date.now();
    }

    return player;
}

/*
=================================
INTERVALO
=================================
*/

function getRegenInterval(
    player
) {
    /*
    NORMAL 8 min
    VIP 6 min
    */

    return player.vip
        ? 6 *
              60 *
              1000
        : 8 *
              60 *
              1000;
}

/*
=================================
UPDATE
=================================
*/

function updateEnergy(
    player
) {
    ensureEnergyFields(
        player
    );

    const now = Date.now();

    const interval =
        getRegenInterval(
            player
        );

    const elapsed =
        now -
        player.lastEnergyUpdate;

    if (elapsed < interval) {
        return false;
    }

    if (
        player.energy >=
        player.maxEnergy
    ) {
        player.lastEnergyUpdate =
            now;

        return false;
    }

    const amount =
        Math.floor(
            elapsed /
                interval
        );

    player.energy =
        Math.min(
            player.maxEnergy,
            player.energy +
                amount
        );

    player.lastEnergyUpdate +=
        amount * interval;

    return true;
}

/*
=================================
CONSUMO
=================================
*/

function consumeEnergy(
    player,
    amount = 1
) {
    ensureEnergyFields(
        player
    );

    const value =
        Number(amount) || 1;

    if (value <= 0) {
        return false;
    }

    if (
        player.energy <
        value
    ) {
        return false;
    }

    const wasFull =
        player.energy ===
        player.maxEnergy;

    player.energy -= value;

    /*
    inicia cooldown
    */

    if (wasFull) {
        player.lastEnergyUpdate =
            Date.now();
    }

    return true;
}

/*
=================================
PRÓXIMO TICK
=================================
*/

function getTimeToNextEnergy(
    player
) {
    ensureEnergyFields(
        player
    );

    if (
        player.energy >=
        player.maxEnergy
    ) {
        return 0;
    }

    const interval =
        getRegenInterval(
            player
        );

    const elapsed =
        Date.now() -
        player.lastEnergyUpdate;

    return Math.max(
        0,
        interval - elapsed
    );
}

/*
=================================
FORMATAÇÃO
=================================
*/

function formatEnergyTime(
    ms
) {
    const minutes =
        Math.floor(
            ms / 60000
        );

    const seconds =
        Math.floor(
            (ms % 60000) /
                1000
        );

    return `${minutes}m ${seconds}s`;
}

module.exports = {
    updateEnergy,
    consumeEnergy,
    getTimeToNextEnergy,
    getRegenInterval,
    formatEnergyTime
};