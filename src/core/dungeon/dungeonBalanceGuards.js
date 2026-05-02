function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function isCombatRoomType(type) {
    return type === 'combat' || type === 'elite' || type === 'boss';
}

function getShieldChanceCap(roomType) {
    if (roomType === 'boss') return 0.10;
    if (roomType === 'elite') return 0.14;
    return 0.16;
}

function getShieldValueCap(roomType, maxHp) {
    const hp = Math.max(1, safeNumber(maxHp, 1));

    if (roomType === 'boss') return Math.max(8, Math.floor(hp * 0.08));
    if (roomType === 'elite') return Math.max(6, Math.floor(hp * 0.10));
    return Math.max(4, Math.floor(hp * 0.12));
}

function normalizeDungeonEnemyShield(enemy, roomType = 'combat') {
    if (!enemy || typeof enemy !== 'object') return enemy;

    enemy.maxHp = Math.max(1, safeNumber(enemy.maxHp || enemy.hp, 1));

    const currentShield = Math.max(0, safeNumber(enemy.shield, 0));
    const cap = getShieldValueCap(roomType, enemy.maxHp);

    enemy.shield = Math.min(currentShield, cap);
    enemy.shieldCap = cap;

    return enemy;
}

function normalizeDungeonEnemyAbility(enemy, roomType = 'combat') {
    if (!enemy || typeof enemy !== 'object') return enemy;

    normalizeDungeonEnemyShield(enemy, roomType);

    if (!enemy.ability || typeof enemy.ability !== 'object') {
        return enemy;
    }

    if (enemy.ability.type !== 'SHIELD') {
        return enemy;
    }

    const cap = getShieldChanceCap(roomType);
    const originalChance = safeNumber(enemy.ability.chance, cap);

    enemy.ability = {
        ...enemy.ability,
        chance: Math.max(0, Math.min(originalChance, cap)),
        shieldGuarded: true
    };

    return enemy;
}

function normalizeDungeonRoom(room) {
    if (!room || typeof room !== 'object') return room;

    if (isCombatRoomType(room.type) && room.enemy) {
        normalizeDungeonEnemyAbility(room.enemy, room.type);
    }

    return room;
}

module.exports = {
    safeNumber,
    isCombatRoomType,
    getShieldChanceCap,
    getShieldValueCap,
    normalizeDungeonEnemyShield,
    normalizeDungeonEnemyAbility,
    normalizeDungeonRoom
};
