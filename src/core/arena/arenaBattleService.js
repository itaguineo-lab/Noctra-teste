const { calculateDamage } = require('../combat/damageCalc');
const {
    createArenaBattle,
    ensureArenaState
} = require('./arenaService');

const {
    DEFAULT_ARENA_TIMEOUT,
    saveActiveArenaBattle,
    loadActiveArenaBattle,
    updateActiveArenaBattle,
    updateArenaMessageMetadata,
    clearActiveArenaBattle
} = require('./arenaPersistence');

function buildArenaMeta(record) {
    return {
        mode: record?.mode || 'arena',
        createdAt: record?.createdAt || Date.now(),
        timeoutMs: DEFAULT_ARENA_TIMEOUT,
        messageId: record?.messageId ?? null
    };
}

async function resolveStoredArenaBattle(userId, storedOverride = null) {
    if (storedOverride?.battle && storedOverride?.meta) {
        return storedOverride;
    }

    const record = await loadActiveArenaBattle(userId);
    if (!record) return null;

    return {
        battle: record.payload,
        meta: buildArenaMeta(record)
    };
}

async function createAndStoreArenaBattle(userId, playerSnapshot, enemySnapshot, startingHp) {
    const battle = createArenaBattle(playerSnapshot, enemySnapshot, startingHp);
    const createdAt = Date.now();

    await saveActiveArenaBattle(userId, battle, {
        createdAt,
        timeoutMs: DEFAULT_ARENA_TIMEOUT,
        messageId: null
    });

    return battle;
}

async function getStoredArenaBattle(userId) {
    return resolveStoredArenaBattle(userId);
}

async function persistArenaBattle(userId, battle, meta = {}) {
    await updateActiveArenaBattle(userId, battle, {
        createdAt: meta.createdAt || Date.now(),
        timeoutMs: meta.timeoutMs || DEFAULT_ARENA_TIMEOUT,
        messageId: meta.messageId ?? null
    });
}

async function persistArenaMessage(userId, messageId) {
    await updateArenaMessageMetadata(userId, messageId);
}

async function removeStoredArenaBattle(userId) {
    await clearActiveArenaBattle(userId);
}

async function runArenaAttack(userId, storedOverride = null) {
    const stored = await resolveStoredArenaBattle(userId, storedOverride);
    if (!stored) return null;

    const { battle, meta } = stored;

    const hit = calculateDamage(battle.player, battle.enemy);
    battle.enemy.hp = Math.max(0, battle.enemy.hp - hit.damage);
    battle.logs.push(`⚔️ Você causou ${hit.damage}`);
    battle.totalDamageDealt = (battle.totalDamageDealt || 0) + hit.damage;
    battle.lastDamageDealt = hit.damage;

    if (battle.enemy.hp > 0) {
        const enemyHit = calculateDamage(battle.enemy, battle.player);
        battle.player.hp = Math.max(0, battle.player.hp - enemyHit.damage);
        battle.logs.push(`👹 ${battle.enemy.name} causou ${enemyHit.damage}`);
        battle.totalDamageReceived = (battle.totalDamageReceived || 0) + enemyHit.damage;
        battle.lastDamageReceived = enemyHit.damage;
    } else {
        battle.status = 'win';
    }

    if (battle.player.hp <= 0 && battle.status !== 'win') {
        battle.status = 'loss';
    }

    await persistArenaBattle(userId, battle, meta);
    return { battle, meta };
}

async function runArenaDefend(userId, storedOverride = null) {
    const stored = await resolveStoredArenaBattle(userId, storedOverride);
    if (!stored) return null;

    const { battle, meta } = stored;

    const enemyHit = calculateDamage(battle.enemy, battle.player, { multiplier: 0.5 });
    battle.player.hp = Math.max(0, battle.player.hp - enemyHit.damage);
    battle.logs.push(`🛡️ Defesa reduziu dano para ${enemyHit.damage}`);
    battle.totalDamageReceived = (battle.totalDamageReceived || 0) + enemyHit.damage;
    battle.lastDamageReceived = enemyHit.damage;

    if (battle.player.hp <= 0) {
        battle.status = 'loss';
    }

    await persistArenaBattle(userId, battle, meta);
    return { battle, meta };
}

async function runArenaFlee(userId, storedOverride = null) {
    const stored = await resolveStoredArenaBattle(userId, storedOverride);
    if (!stored) return null;

    const { battle, meta } = stored;
    battle.status = 'fled';

    await persistArenaBattle(userId, battle, meta);
    return { battle, meta };
}

async function runArenaConsumable(userId, mutator, storedOverride = null) {
    const stored = await resolveStoredArenaBattle(userId, storedOverride);
    if (!stored) return null;

    const { battle, meta } = stored;
    const result = mutator(battle);

    if (battle.status === 'ongoing') {
        const enemyHit = calculateDamage(battle.enemy, battle.player);
        battle.player.hp = Math.max(0, battle.player.hp - enemyHit.damage);
        battle.logs.push(`👹 ${battle.enemy.name} respondeu com ${enemyHit.damage} de dano.`);
        battle.totalDamageReceived = (battle.totalDamageReceived || 0) + enemyHit.damage;
        battle.lastDamageReceived = enemyHit.damage;

        if (battle.player.hp <= 0) {
            battle.status = 'loss';
        }
    }

    await persistArenaBattle(userId, battle, meta);
    return { battle, meta, result };
}

module.exports = {
    ensureArenaState,
    createAndStoreArenaBattle,
    getStoredArenaBattle,
    persistArenaBattle,
    persistArenaMessage,
    removeStoredArenaBattle,
    runArenaAttack,
    runArenaDefend,
    runArenaFlee,
    runArenaConsumable
};