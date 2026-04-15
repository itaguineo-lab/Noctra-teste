const test = require('node:test');
const assert = require('node:assert/strict');

const assets = require('../src/data/assets');
const { maps } = require('../src/core/world/maps');

test('todos os mapas possuem file_id de imagem configurado', () => {
    for (const map of maps) {
        const mapAsset = assets?.maps?.[map.id];
        assert.equal(
            typeof mapAsset,
            'string',
            `Asset do mapa "${map.id}" deveria ser string`
        );
        assert.ok(
            mapAsset.trim().length > 0,
            `Mapa "${map.id}" está sem file_id`
        );
    }
});

test('assets de mapas não possuem chaves órfãs', () => {
    const mapIds = new Set(maps.map(map => map.id));
    const orphanKeys = Object.keys(assets.maps || {}).filter(id => !mapIds.has(id));

    assert.deepEqual(
        orphanKeys,
        [],
        `Chaves sem mapa correspondente: ${orphanKeys.join(', ')}`
    );
});
