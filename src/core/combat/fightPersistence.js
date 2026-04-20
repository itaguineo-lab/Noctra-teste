const { getPlayerCollection } = require('../player/playerService');

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

async function loadFightRecordDoc(userId) {
    const collection = await getPlayerCollection();
    return collection.findOne(
        { id: String(userId) },
        { projection: { activeFight: 1 } }
    );
}

async function saveFightRecord(userId, record) {
    const collection = await getPlayerCollection();
    await collection.updateOne(
        { id: String(userId) },
        {
            $set: {
                activeFight: record,
                updatedAt: new Date()
            }
        }
    );
    return record;
}

async function saveActiveFight(userId, fight, metadata = {}) {
    const createdAt = metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_FIGHT_TIMEOUT;

    const record = normalizeFightRecord({
        mode: metadata.mode || 'hunt',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        battleMessageId: metadata.battleMessageId ?? null,
        isPhoto: metadata.isPhoto ?? false,
        payload: fight
    });

    return saveFightRecord(userId, record);
}

async function loadActiveFight(userId) {
    const doc = await loadFightRecordDoc(userId);
    if (!doc?.activeFight) return null;

    const record = normalizeFightRecord(doc.activeFight);
    if (isFightExpired(record)) {
        await clearActiveFight(userId);
        return null;
    }

    return record;
}

async function updateActiveFight(userId, fight, metadata = {}) {
    const doc = await loadFightRecordDoc(userId);
    const existing = normalizeFightRecord(doc?.activeFight || {});
    const createdAt = existing?.createdAt || metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_FIGHT_TIMEOUT;

    const record = normalizeFightRecord({
        mode: metadata.mode || existing?.mode || 'hunt',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        battleMessageId: metadata.battleMessageId ?? existing?.battleMessageId ?? null,
        isPhoto: metadata.isPhoto ?? existing?.isPhoto ?? false,
        payload: fight
    });

    return saveFightRecord(userId, record);
}

async function updateFightMessageMetadata(userId, battleMessageId, isPhoto) {
    const doc = await loadFightRecordDoc(userId);
    if (!doc?.activeFight) return null;

    const record = normalizeFightRecord(doc.activeFight);
    record.battleMessageId = battleMessageId ?? null;
    record.isPhoto = !!isPhoto;

    return saveFightRecord(userId, record);
}

async function clearActiveFight(userId) {
    const collection = await getPlayerCollection();
    await collection.updateOne(
        { id: String(userId) },
        {
            $unset: { activeFight: '' },
            $set: { updatedAt: new Date() }
        }
    );
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