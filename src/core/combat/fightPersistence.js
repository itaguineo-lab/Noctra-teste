const { getPlayer, savePlayer } = require('../player/playerService');

const DEFAULT_FIGHT_TIMEOUT = 10 * 60 * 1000;

function normalizeFightRecord(record) {
    if (!record || typeof record !== 'object') return null;

    record.mode ??= 'hunt';
    record.createdAt ??= Date.now();
    record.expiresAt ??= record.createdAt + DEFAULT_FIGHT_TIMEOUT;
    record.battleMessageId ??= null;
    record.isPhoto ??= false;
    record.payload ??= null;

    return record;
}

function isFightExpired(record) {
    if (!record) return true;
    const expiresAt = Number(record.expiresAt || 0);
    if (!expiresAt) return true;
    return Date.now() > expiresAt;
}

async function saveActiveFight(userId, fight, metadata = {}) {
    const player = await getPlayer(userId);
    if (!player) return null;

    const createdAt = metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_FIGHT_TIMEOUT;

    player.activeFight = normalizeFightRecord({
        mode: metadata.mode || 'hunt',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        battleMessageId: metadata.battleMessageId ?? null,
        isPhoto: metadata.isPhoto ?? false,
        payload: fight
    });

    await savePlayer(userId, player);
    return player.activeFight;
}

async function loadActiveFight(userId) {
    const player = await getPlayer(userId);
    if (!player || !player.activeFight) return null;

    const record = normalizeFightRecord(player.activeFight);
    if (isFightExpired(record)) {
        await clearActiveFight(userId);
        return null;
    }

    return record;
}

async function updateActiveFight(userId, fight, metadata = {}) {
    const player = await getPlayer(userId);
    if (!player) return null;

    const existing = normalizeFightRecord(player.activeFight || {});
    const createdAt = existing?.createdAt || metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_FIGHT_TIMEOUT;

    player.activeFight = normalizeFightRecord({
        mode: metadata.mode || existing?.mode || 'hunt',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        battleMessageId: metadata.battleMessageId ?? existing?.battleMessageId ?? null,
        isPhoto: metadata.isPhoto ?? existing?.isPhoto ?? false,
        payload: fight
    });

    await savePlayer(userId, player);
    return player.activeFight;
}

async function updateFightMessageMetadata(userId, battleMessageId, isPhoto) {
    const player = await getPlayer(userId);
    if (!player || !player.activeFight) return null;

    player.activeFight = normalizeFightRecord(player.activeFight);
    player.activeFight.battleMessageId = battleMessageId ?? null;
    player.activeFight.isPhoto = !!isPhoto;

    await savePlayer(userId, player);
    return player.activeFight;
}

async function clearActiveFight(userId) {
    const player = await getPlayer(userId);
    if (!player) return null;

    player.activeFight = null;
    await savePlayer(userId, player);
    return true;
}

module.exports = {
    DEFAULT_FIGHT_TIMEOUT,
    normalizeFightRecord,
    isFightExpired,
    saveActiveFight,
    loadActiveFight,
    updateActiveFight,
    updateFightMessageMetadata,
    clearActiveFight
};