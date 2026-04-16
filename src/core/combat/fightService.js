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
    const record = await loadActiveFight(userId);
    if (!record) return null;

    return {
        fight: record.payload,
        meta: buildFightMeta(record)
    };
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

async function runAttack(userId) {
    const stored = await getStoredFight(userId);
    if (!stored) return null;

    const { fight, meta } = stored;

    processPlayerTurn(fight);
    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    await persistFightState(userId, fight, meta);
    return { fight, meta };
}

async function runDefend(userId) {
    const stored = await getStoredFight(userId);
    if (!stored) return null;

    const { fight, meta } = stored;

    applyDefend(fight);
    processEnemyTurn(fight);

    await persistFightState(userId, fight, meta);
    return { fight, meta };
}

async function runFlee(userId) {
    const stored = await getStoredFight(userId);
    if (!stored) return null;

    const { fight, meta } = stored;
    const success = attemptFlee(fight);

    await persistFightState(userId, fight, meta);
    return { fight, meta, success };
}

async function runSoul(userId, soulIndex) {
    const stored = await getStoredFight(userId);
    if (!stored) return null;

    const { fight, meta } = stored;
    const result = useSoul(fight, soulIndex);

    if (result && fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }

    await persistFightState(userId, fight, meta);
    return { fight, meta, result };
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
    runSoul
};