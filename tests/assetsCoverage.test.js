const test = require('node:test');
const assert = require('node:assert/strict');

const assets = require('../src/data/assets');
const { enemyPools } = require('../src/core/world/enemies');

const OFFICIAL_CLASSES = ['guerreiro', 'arqueiro', 'mago'];

function collectEnemyIds() {
    const ids = new Set();

    for (const pool of Object.values(enemyPools || {})) {
        for (const tier of ['common', 'elite', 'miniboss', 'boss']) {
            for (const enemy of pool?.[tier] || []) {
                if (enemy?.id) ids.add(enemy.id);
            }
        }
    }

    return [...ids];
}

test('assets de perfil possuem file_id para todas as classes oficiais', () => {
    for (const classId of OFFICIAL_CLASSES) {
        const profileAsset = assets?.profile?.[classId];

        assert.equal(
            typeof profileAsset,
            'string',
            `Asset de perfil da classe "${classId}" deveria ser string`
        );

        assert.ok(
            profileAsset.trim().length > 0,
            `Classe "${classId}" está sem file_id de perfil`
        );
    }
});

test('todos os inimigos oficiais possuem file_id de asset', () => {
    const allEnemyIds = collectEnemyIds();

    const missing = allEnemyIds.filter((enemyId) => {
        const asset = assets?.enemies?.[enemyId];
        return typeof asset !== 'string' || asset.trim().length === 0;
    });

    assert.deepEqual(
        missing,
        [],
        `Inimigos sem file_id em assets.enemies: ${missing.join(', ')}`
    );
});
