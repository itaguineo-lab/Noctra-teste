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

function normalizeDungeonEnemyAbility(enemy, roomType = 'combat') {
    if (!enemy || typeof enemy !== 'object') return enemy;

    enemy.shield = Math.max(0, safeNumber(enemy.shield, 0));
    enemy.maxHp = Math.max(1, safeNumber(enemy.maxHp || enemy.hp, 1));

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
    normalizeDungeonEnemyAbility,
    normalizeDungeonRoom
};
