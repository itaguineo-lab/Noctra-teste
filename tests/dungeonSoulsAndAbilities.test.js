const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ensureDungeonCombatState,
    getDungeonSoulSlots,
    getDungeonSoulCooldownRemaining,
    applyDungeonEnemyAbility,
    resolveCombatRoom,
    resolveDungeonSoul
} = require('../src/core/dungeon/dungeonRewards');

const {
    buildDungeonKeyboard,
    buildDungeonSoulKeyboard,
    buildDungeonSoulText,
    renderDungeonText
} = require('../src/handlers/dungeon');

function soul(id = 'soul_wolf', overrides = {}) {
    return {
        id,
        instanceId: `${id}_instance`,
        name: 'Alma do Lobo Sombrio',
        rarity: 'Raro',
        emoji: '🐺',
        cooldownTurns: 3,
        effect: {
            type: 'damage',
            multiplier: 1.35
        },
        ...overrides
    };
}

function passiveSoul() {
    return soul('soul_guardian', {
        name: 'Alma Guardiã',
        emoji: '🛡️',
        cooldownTurns: 0,
        effect: {
            type: 'passive',
            defBonus: 10,
            hpBonus: 30
        }
    });
}

function enemy(overrides = {}) {
    return {
        id: 'crypt_bat',
        name: 'Morcego da Cripta',
        emoji: '🦇',
        hp: 120,
        maxHp: 120,
        atk: 20,
        def: 6,
        crit: 5,
        level: 12,
        xp: 30,
        gold: 20,
        frozen: false,
        shield: 0,
        poisonTurns: 0,
        bleedTurns: 0,
        ability: null,
        ...overrides
    };
}

function playerFixture(overrides = {}) {
    return {
        id: 'test-player',
        name: 'Admin',
        class: 'guerreiro',
        level: 20,
        hp: 200,
        maxHp: 240,
        atk: 40,
        def: 20,
        crit: 5,
        energy: 20,
        maxEnergy: 20,
        gold: 0,
        xp: 0,
        keys: 0,
        glorias: 0,
        inventory: [],
        equipment: {},
        consumables: {},
        soulsInventory: [],
        soulsEquipped: [soul(), null],
        buffs: [],
        missions: {},
        dungeonProgress: {
            active: true,
            completed: false,
            aborted: false,
            mapId: 'cripta_em_ruinas',
            currentRoomIndex: 0,
            maxRooms: 5,
            roomsVisited: 1,
            rooms: [
                {
                    index: 0,
                    type: 'combat',
                    emoji: '⚔️',
                    title: 'Sala de Conflito',
                    description: 'Câmara tomada por sombras.',
                    cleared: false,
                    enemy: enemy()
                }
            ],
            rewards: { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0, souls: 0 },
            logs: [],
            combatBonus: { atk: 0, def: 0, crit: 0 },
            summary: null,
            ...overrides.dungeonProgress
        },
        ...overrides
    };
}

function keyboardText(markup) {
    return JSON.stringify(markup.reply_markup);
}

test('buildDungeonKeyboard mostra botão Almas em sala de combate', () => {
    const player = playerFixture();
    const raw = keyboardText(buildDungeonKeyboard(player));

    assert.match(raw, /Almas/);
    assert.match(raw, /dungeon_soul_menu/);
    assert.match(raw, /Itens/);
    assert.match(raw, /dungeon_consumables/);
});

test('buildDungeonSoulKeyboard mostra duas almas e callback de slot', () => {
    const player = playerFixture({ soulsEquipped: [soul(), passiveSoul()] });
    ensureDungeonCombatState(player, player.dungeonProgress.rooms[0]);

    const raw = keyboardText(buildDungeonSoulKeyboard(player));

    assert.match(raw, /dungeon_soul_0/);
    assert.match(raw, /dungeon_soul_1/);
    assert.match(raw, /Passiva/);
});

test('buildDungeonSoulText comunica almas ativas e passivas', () => {
    const player = playerFixture({ soulsEquipped: [soul(), passiveSoul()] });
    const text = buildDungeonSoulText(player);

    assert.match(text, /ALMAS DA MASMORRA/);
    assert.match(text, /Alma do Lobo Sombrio/);
    assert.match(text, /Pronta/);
    assert.match(text, /Alma Guardiã/);
    assert.match(text, /Passiva/);
});

test('getDungeonSoulSlots sempre retorna dois slots', () => {
    const player = playerFixture({ soulsEquipped: [soul()] });
    const slots = getDungeonSoulSlots(player);

    assert.equal(slots.length, 2);
    assert.ok(slots[0]);
    assert.equal(slots[1], null);
});

test('resolveDungeonSoul usa alma de dano, aplica cooldown e inimigo responde', async () => {
    const player = playerFixture();
    const room = player.dungeonProgress.rooms[0];
    const originalRandom = Math.random;
    Math.random = () => 0.99;

    try {
        const beforeEnemyHp = room.enemy.hp;
        const beforePlayerHp = player.hp;
        const result = await resolveDungeonSoul(player, room, 0);

        assert.equal(result.success, true);
        assert.equal(room.enemy.hp < beforeEnemyHp, true);
        assert.equal(player.hp < beforePlayerHp, true);
        assert.equal(getDungeonSoulCooldownRemaining(player, 0), 3);
        assert.match(player.dungeonProgress.logs.join('\n'), /Alma do Lobo Sombrio/);
    } finally {
        Math.random = originalRandom;
    }
});

test('resolveDungeonSoul bloqueia alma passiva como ativável', async () => {
    const player = playerFixture({ soulsEquipped: [passiveSoul(), null] });
    const room = player.dungeonProgress.rooms[0];

    const result = await resolveDungeonSoul(player, room, 0);

    assert.equal(result.passive, true);
    assert.match(player.dungeonProgress.logs.join('\n'), /passiva/);
});

test('applyDungeonEnemyAbility aplica veneno no jogador em dungeon', () => {
    const player = playerFixture();
    const room = player.dungeonProgress.rooms[0];
    room.enemy.ability = { type: 'POISON', chance: 1 };

    const result = applyDungeonEnemyAbility(player, room);

    assert.equal(result.activated, true);
    assert.equal(player.dungeonProgress.playerStatus.poisonTurns, 2);
    assert.match(player.dungeonProgress.logs.join('\n'), /envenenou/);
});

test('resolveCombatRoom processa habilidade de stun do inimigo', async () => {
    const player = playerFixture();
    const room = player.dungeonProgress.rooms[0];
    room.enemy.ability = { type: 'STUN', chance: 1 };
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
        await resolveCombatRoom(player, room);
        assert.equal(player.dungeonProgress.playerStatus.stunned, true);
        assert.match(player.dungeonProgress.logs.join('\n'), /atordoou/);
    } finally {
        Math.random = originalRandom;
    }
});

test('renderDungeonText mostra status de jogador e inimigo', () => {
    const player = playerFixture();
    const room = player.dungeonProgress.rooms[0];
    ensureDungeonCombatState(player, room);

    player.dungeonProgress.playerStatus.poisonTurns = 2;
    room.enemy.shield = 30;
    room.enemy.frozen = true;

    const text = renderDungeonText(player);

    assert.match(text, /Veneno 2t/);
    assert.match(text, /Escudo 30/);
    assert.match(text, /Congelado/);
});
