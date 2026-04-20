const { getPlayerCollection } = require('../player/playerService');

const DEFAULT_ARENA_TIMEOUT = 10 * 60 * 1000;

function normalizeArenaRecord(record) {
    if (!record || typeof record !== 'object') return null;

    record.mode ??= 'arena';
    record.createdAt ??= Date.now();
    record.expiresAt ??= record.createdAt + DEFAULT_ARENA_TIMEOUT;
    record.messageId ??= null;
    record.payload ??= null;

    return record;
}

function isArenaBattleExpired(record) {
    if (!record) return true;
    const expiresAt = Number(record.expiresAt || 0);
    if (!expiresAt) return true;
    return Date.now() > expiresAt;
}

async function loadArenaRecordDoc(userId) {
    const collection = await getPlayerCollection();
    return collection.findOne(
        { id: String(userId) },
        { projection: { activeArenaBattle: 1 } }
    );
}

async function saveArenaRecord(userId, record) {
    const collection = await getPlayerCollection();
    await collection.updateOne(
        { id: String(userId) },
        {
            $set: {
                activeArenaBattle: record,
                updatedAt: new Date()
            }
        }
    );
    return record;
}

async function saveActiveArenaBattle(userId, battle, metadata = {}) {
    const createdAt = metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_ARENA_TIMEOUT;

    const record = normalizeArenaRecord({
        mode: 'arena',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        messageId: metadata.messageId ?? null,
        payload: battle
    });

    return saveArenaRecord(userId, record);
}

async function loadActiveArenaBattle(userId) {
    const doc = await loadArenaRecordDoc(userId);
    if (!doc?.activeArenaBattle) return null;

    const record = normalizeArenaRecord(doc.activeArenaBattle);
    if (isArenaBattleExpired(record)) {
        await clearActiveArenaBattle(userId);
        return null;
    }

    return record;
}

async function updateActiveArenaBattle(userId, battle, metadata = {}) {
    const doc = await loadArenaRecordDoc(userId);
    const existing = normalizeArenaRecord(doc?.activeArenaBattle || {});
    const createdAt = existing?.createdAt || metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_ARENA_TIMEOUT;

    const record = normalizeArenaRecord({
        mode: 'arena',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        messageId: metadata.messageId ?? existing?.messageId ?? null,
        payload: battle
    });

    return saveArenaRecord(userId, record);
}

async function updateArenaMessageMetadata(userId, messageId) {
    const doc = await loadArenaRecordDoc(userId);
    if (!doc?.activeArenaBattle) return null;

    const record = normalizeArenaRecord(doc.activeArenaBattle);
    record.messageId = messageId ?? null;

    return saveArenaRecord(userId, record);
}

async function clearActiveArenaBattle(userId) {
    const collection = await getPlayerCollection();
    await collection.updateOne(
        { id: String(userId) },
        {
            $unset: { activeArenaBattle: '' },
            $set: { updatedAt: new Date() }
        }
    );
    return true;
}

module.exports = {
    DEFAULT_ARENA_TIMEOUT,
    normalizeArenaRecord,
    isArenaBattleExpired,
    saveActiveArenaBattle,
    loadActiveArenaBattle,
    updateActiveArenaBattle,
    updateArenaMessageMetadata,
    clearActiveArenaBattle
};