const {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee,
    useSoul,
    applyDefend
} = require('./combatEngine');

const {
    DEFAULT_FIGHT_TIMEOUT,
    saveActiveFight,
    loadActiveFight,
    updateActiveFight,
    updateFightMessageMetadata,
    clearActiveFight
} = require('./fightPersistence');

function buildFightMeta(record) {
    return {
        mode: record?.mode || 'hunt',
        createdAt: record?.createdAt || Date.now(),
        timeoutMs: DEFAULT_FIGHT_TIMEOUT,
        battleMessageId: record?.battleMessageId ?? null,
        isPhoto: record?.isPhoto ?? false
    };
}

async function resolveStoredFight(userId, storedOverride = null) {
    if (storedOverride?.fight && storedOverride?.meta) {
        return storedOverride;
    }

    const record = await loadActiveFight(userId);
    if (!record) return null;

    return {
        fight: record.payload,
        meta: buildFightMeta(record)
    };
}

async function createAndStoreFight(userId, player, enemy) {
    const fight = createFight(player, enemy);
    const createdAt = Date.now();

    await saveActiveFight(userId, fight, {
        mode: 'hunt',
        createdAt,
        timeoutMs: DEFAULT_FIGHT_TIMEOUT,
        battleMessageId: null,
        isPhoto: false
    });

    return fight;
}

async function getStoredFight(userId) {
    return resolveStoredFight(userId);
}

async function persistFightState(userId, fight, meta = {}) {
    await updateActiveFight(userId, fight, {
        mode: meta.mode || 'hunt',
        createdAt: meta.createdAt || Date.now(),
        timeoutMs: meta.timeoutMs || DEFAULT_FIGHT_TIMEOUT,
        battleMessageId: meta.battleMessageId ?? null,
        isPhoto: meta.isPhoto ?? false
    });
}

async function persistFightMessage(userId, battleMessageId, isPhoto) {
    await updateFightMessageMetadata(userId, battleMessageId, isPhoto);
}

async function removeStoredFight(userId) {
    await clearActiveFight(userId);
}

async function runAttack(userId, storedOverride = null) {
    const stored = await resolveStoredFight(userId, storedOverride);
    if (!stored) return null;

    const { fight, meta } = stored;

    processPlayerTurn(fight);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    await persistFightState(userId, fight, meta);
    return { fight, meta };
}

async function runDefend(userId, storedOverride = null) {
    const stored = await resolveStoredFight(userId, storedOverride);
    if (!stored) return null;

    const { fight, meta } = stored;

    applyDefend(fight);

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    await persistFightState(userId, fight, meta);
    return { fight, meta };
}

async function runFlee(userId, storedOverride = null) {
    const stored = await resolveStoredFight(userId, storedOverride);
    if (!stored) return null;

    const { fight, meta } = stored;
    const success = attemptFlee(fight);

    await persistFightState(userId, fight, meta);
    return { fight, meta, success };
}

async function runSoul(userId, soulIndex, storedOverride = null) {
    const stored = await resolveStoredFight(userId, storedOverride);
    if (!stored) return null;

    const { fight, meta } = stored;
    const result = useSoul(fight, soulIndex);

    if (!result) {
        await persistFightState(userId, fight, meta);
        return { fight, meta, result: null };
    }

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    await persistFightState(userId, fight, meta);
    return { fight, meta, result };
}

async function runEnemyOnlyTurn(userId, storedOverride = null) {
    const stored = await resolveStoredFight(userId, storedOverride);
    if (!stored) return null;

    const { fight, meta } = stored;

    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    await persistFightState(userId, fight, meta);
    return { fight, meta };
}

async function runConsumableTurn(userId, applyConsumableEffect, storedOverride = null, options = {}) {
    const stored = await resolveStoredFight(userId, storedOverride);
    if (!stored) return null;

    const { fight, meta } = stored;
    const skipEnemyTurn = Boolean(options.skipEnemyTurn || options.skipCounterattack);

    const effectResult = applyConsumableEffect(fight);
    if (effectResult?.success === false) {
        await persistFightState(userId, fight, meta);
        return { fight, meta, effectResult };
    }

    if (fight.status === 'ongoing' && !skipEnemyTurn) {
        processEnemyTurn(fight);
    }

    await persistFightState(userId, fight, meta);
    return { fight, meta, effectResult };
}

module.exports = {
    createAndStoreFight,
    getStoredFight,
    persistFightState,
    persistFightMessage,
    removeStoredFight,
    runAttack,
    runDefend,
    runFlee,
    runSoul,
    runEnemyOnlyTurn,
    runConsumableTurn
};
