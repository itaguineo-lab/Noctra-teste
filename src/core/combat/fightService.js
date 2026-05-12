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

/*
=================================
LOCK DE COMBATE POR USUÁRIO
=================================

Motivo:
Callbacks do Telegram podem chegar quase ao mesmo tempo.
Sem lock, dois cliques rápidos em "Atacar" podem carregar a mesma luta
e aplicar dois turnos em paralelo.

Este lock é em memória e resolve o problema no cenário atual do Render
com uma instância Node.js. Se no futuro o NOCTRA escalar para múltiplas
instâncias, isso deve virar lock distribuído no MongoDB/Redis.
*/

const fightLocks = new Map();

function normalizeUserId(userId) {
    return String(userId || '').trim();
}

async function withFightLock(userId, operation) {
    const key = normalizeUserId(userId);

    if (!key) {
        return operation();
    }

    const previousLock = fightLocks.get(key) || Promise.resolve();

    let releaseCurrentLock;
    const currentLock = new Promise(resolve => {
        releaseCurrentLock = resolve;
    });

    const queuedLock = previousLock.then(
        () => currentLock,
        () => currentLock
    );

    fightLocks.set(key, queuedLock);

    try {
        await previousLock.catch(() => {});
        return await operation();
    } finally {
        releaseCurrentLock();

        if (fightLocks.get(key) === queuedLock) {
            fightLocks.delete(key);
        }
    }
}

function getActiveFightLockCount() {
    return fightLocks.size;
}

/*
=================================
META
=================================
*/

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
    return withFightLock(userId, async () => {
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
    });
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
    return withFightLock(userId, async () => {
        await clearActiveFight(userId);
    });
}

/*
=================================
AÇÕES DE COMBATE
=================================
*/

async function runAttack(userId, storedOverride = null) {
    return withFightLock(userId, async () => {
        const stored = await resolveStoredFight(userId, storedOverride);
        if (!stored) return null;

        const { fight, meta } = stored;

        if (fight.status !== 'ongoing') {
            await persistFightState(userId, fight, meta);
            return { fight, meta };
        }

        processPlayerTurn(fight);

        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }

        await persistFightState(userId, fight, meta);
        return { fight, meta };
    });
}

async function runDefend(userId, storedOverride = null) {
    return withFightLock(userId, async () => {
        const stored = await resolveStoredFight(userId, storedOverride);
        if (!stored) return null;

        const { fight, meta } = stored;

        if (fight.status !== 'ongoing') {
            await persistFightState(userId, fight, meta);
            return { fight, meta };
        }

        applyDefend(fight);

        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }

        await persistFightState(userId, fight, meta);
        return { fight, meta };
    });
}

async function runFlee(userId, storedOverride = null) {
    return withFightLock(userId, async () => {
        const stored = await resolveStoredFight(userId, storedOverride);
        if (!stored) return null;

        const { fight, meta } = stored;

        if (fight.status !== 'ongoing') {
            await persistFightState(userId, fight, meta);
            return { fight, meta, success: false };
        }

        const success = attemptFlee(fight);

        await persistFightState(userId, fight, meta);
        return { fight, meta, success };
    });
}

async function runSoul(userId, soulIndex, storedOverride = null) {
    return withFightLock(userId, async () => {
        const stored = await resolveStoredFight(userId, storedOverride);
        if (!stored) return null;

        const { fight, meta } = stored;

        if (fight.status !== 'ongoing') {
            await persistFightState(userId, fight, meta);
            return { fight, meta, result: null };
        }

        const result = useSoul(fight, soulIndex);

        if (!result || result.success === false) {
            await persistFightState(userId, fight, meta);
            return { fight, meta, result: result || null };
        }

        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }

        await persistFightState(userId, fight, meta);
        return { fight, meta, result };
    });
}

async function runEnemyOnlyTurn(userId, storedOverride = null) {
    return withFightLock(userId, async () => {
        const stored = await resolveStoredFight(userId, storedOverride);
        if (!stored) return null;

        const { fight, meta } = stored;

        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }

        await persistFightState(userId, fight, meta);
        return { fight, meta };
    });
}

async function runConsumableTurn(userId, applyConsumableEffect, storedOverride = null, options = {}) {
    return withFightLock(userId, async () => {
        const stored = await resolveStoredFight(userId, storedOverride);
        if (!stored) return null;

        const { fight, meta } = stored;
        const skipEnemyTurn = Boolean(options.skipEnemyTurn || options.skipCounterattack);

        if (fight.status !== 'ongoing') {
            await persistFightState(userId, fight, meta);
            return {
                fight,
                meta,
                effectResult: {
                    success: false,
                    reason: 'fight_not_ongoing'
                }
            };
        }

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
    });
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
    runConsumableTurn,

    _internals: {
        withFightLock,
        getActiveFightLockCount,
        normalizeUserId,
        buildFightMeta,
        resolveStoredFight
    }
};
