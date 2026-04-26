const test = require('node:test');
const assert = require('node:assert/strict');

const Player = require('../src/core/player/PlayerModel');
const { BALANCE } = require('../src/data/balance');
const {
    createFight,
    processEnemyTurn
} = require('../src/core/combat/combatEngine');

function getArraySubSchemaPath(arrayPath, childPath) {
    const schemaType = Player.schema.path(arrayPath);
    return schemaType?.schema?.path(childPath) || null;
}

test('PlayerModel preserva metadados críticos de equipamentos', () => {
    const criticalItemFields = [
        'allowedClasses',
        'weaponStyle',
        'offhandMode',
        'requiredOffhandType',
        'offhandType',
        '__equipped'
    ];

    for (const field of criticalItemFields) {
        assert.ok(
            getArraySubSchemaPath('inventory', field),
            `inventory deve preservar o campo ${field}`
        );
    }
});

test('PlayerModel preserva efeitos completos das almas como Mixed', () => {
    const effectPath = getArraySubSchemaPath('soulsInventory', 'effect');

    assert.ok(effectPath, 'soulsInventory.effect deve existir');
    assert.equal(
        effectPath.instance,
        'Mixed',
        'soulsInventory.effect precisa ser Mixed para preservar type, multiplier, freezeChance e bônus passivos'
    );
});

test('habilidade POISON de inimigo aplica veneno no jogador, não no próprio inimigo', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
        const fight = createFight(
            {
                id: 'player_test',
                name: 'Testador',
                class: 'guerreiro',
                level: 1,
                hp: 100,
                maxHp: 100,
                atk: 10,
                def: 999,
                crit: 0,
                energy: 20,
                maxEnergy: 20,
                soulsEquipped: [null, null]
            },
            {
                id: 'poison_enemy',
                name: 'Inimigo Venenoso',
                emoji: '🧪',
                hp: 50,
                atk: 1,
                def: 0,
                crit: 0,
                xp: 1,
                gold: 1,
                ability: { type: 'POISON', chance: 1 }
            }
        );

        processEnemyTurn(fight);

        assert.equal(fight.player.poisonTurns, 2);
        assert.equal(fight.enemy.poisonTurns, 0);
    } finally {
        Math.random = originalRandom;
    }
});

test('economia de chaves de dungeon não se autoalimenta por conclusão garantida', () => {
    assert.equal(BALANCE.energy.dungeonEntryKeyCost, 1);
    assert.equal(BALANCE.dungeon.dungeonCompletionKeyReward, 0);
    assert.ok(BALANCE.dungeon.fieldMiniBossKeyDropChance <= 0.10);
    assert.ok(BALANCE.dungeon.fieldBossKeyDropChance <= 0.25);
    assert.ok(BALANCE.dungeon.dungeonTreasureKeyDropChance <= 0.08);
    assert.ok(BALANCE.dungeon.dungeonCurseKeyDropChance <= 0.06);
});
