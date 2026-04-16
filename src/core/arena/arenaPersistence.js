const { getPlayer, savePlayer } = require('../player/playerService');

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

async function saveActiveArenaBattle(userId, battle, metadata = {}) {
    const player = await getPlayer(userId);
    if (!player) return null;

    const createdAt = metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_ARENA_TIMEOUT;

    player.activeArenaBattle = normalizeArenaRecord({
        mode: 'arena',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        messageId: metadata.messageId ?? null,
        payload: battle
    });

    await savePlayer(userId, player);
    return player.activeArenaBattle;
}

async function loadActiveArenaBattle(userId) {
    const player = await getPlayer(userId);
    if (!player || !player.activeArenaBattle) return null;

    const record = normalizeArenaRecord(player.activeArenaBattle);
    if (isArenaBattleExpired(record)) {
        await clearActiveArenaBattle(userId);
        return null;
    }

    return record;
}

async function updateActiveArenaBattle(userId, battle, metadata = {}) {
    const player = await getPlayer(userId);
    if (!player) return null;

    const existing = normalizeArenaRecord(player.activeArenaBattle || {});
    const createdAt = existing?.createdAt || metadata.createdAt || Date.now();
    const timeoutMs = metadata.timeoutMs || DEFAULT_ARENA_TIMEOUT;

    player.activeArenaBattle = normalizeArenaRecord({
        mode: 'arena',
        createdAt,
        expiresAt: createdAt + timeoutMs,
        messageId: metadata.messageId ?? existing?.messageId ?? null,
        payload: battle
    });

    await savePlayer(userId, player);
    return player.activeArenaBattle;
}

async function updateArenaMessageMetadata(userId, messageId) {
    const player = await getPlayer(userId);
    if (!player || !player.activeArenaBattle) return null;

    player.activeArenaBattle = normalizeArenaRecord(player.activeArenaBattle);
    player.activeArenaBattle.messageId = messageId ?? null;

    await savePlayer(userId, player);
    return player.activeArenaBattle;
}

async function clearActiveArenaBattle(userId) {
    const player = await getPlayer(userId);
    if (!player) return null;

    player.activeArenaBattle = null;
    await savePlayer(userId, player);
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