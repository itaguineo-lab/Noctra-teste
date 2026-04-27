const test = require('node:test');
const assert = require('node:assert/strict');

const {
    maps,
    MAP_LEVEL_REQUIREMENTS,
    canPlayerEnter,
    getAvailableMaps,
    getNextLockedMap
} = require('../src/core/world/maps');

const {
    generateDrop,
    TIER_META
} = require('../src/data/itemsV2');

test('mapas seguem progressão oficial de nível', () => {
    assert.deepEqual(MAP_LEVEL_REQUIREMENTS, {
        clareira_sombria: 1,
        cripta_em_ruinas: 8,
        pantano_corrompido: 15,
        deserto_incandescente: 24,
        citadela_lunar: 32,
        abismo_noctra: 42
    });

    assert.deepEqual(
        maps.map(map => [map.id, map.levelReq]),
        [
            ['clareira_sombria', 1],
            ['cripta_em_ruinas', 8],
            ['pantano_corrompido', 15],
            ['deserto_incandescente', 24],
            ['citadela_lunar', 32],
            ['abismo_noctra', 42]
        ]
    );
});

test('liberação de mapa respeita level gate oficial', () => {
    assert.equal(canPlayerEnter({ level: 7 }, 'cripta_em_ruinas'), false);
    assert.equal(canPlayerEnter({ level: 8 }, 'cripta_em_ruinas'), true);

    assert.equal(canPlayerEnter({ level: 14 }, 'pantano_corrompido'), false);
    assert.equal(canPlayerEnter({ level: 15 }, 'pantano_corrompido'), true);

    assert.equal(canPlayerEnter({ level: 23 }, 'deserto_incandescente'), false);
    assert.equal(canPlayerEnter({ level: 24 }, 'deserto_incandescente'), true);

    assert.equal(canPlayerEnter({ level: 31 }, 'citadela_lunar'), false);
    assert.equal(canPlayerEnter({ level: 32 }, 'citadela_lunar'), true);

    assert.equal(canPlayerEnter({ level: 41 }, 'abismo_noctra'), false);
    assert.equal(canPlayerEnter({ level: 42 }, 'abismo_noctra'), true);
});

test('getAvailableMaps e getNextLockedMap seguem a progressão oficial', () => {
    assert.deepEqual(
        getAvailableMaps(14).map(map => map.id),
        ['clareira_sombria', 'cripta_em_ruinas']
    );

    assert.equal(getNextLockedMap(14).id, 'pantano_corrompido');

    assert.deepEqual(
        getAvailableMaps(42).map(map => map.id),
        [
            'clareira_sombria',
            'cripta_em_ruinas',
            'pantano_corrompido',
            'deserto_incandescente',
            'citadela_lunar',
            'abismo_noctra'
        ]
    );

    assert.equal(getNextLockedMap(42), null);
});

test('tiers de drop continuam alinhados com os níveis oficiais dos mapas', () => {
    const mapToTier = [
        [1, 'level1'],
        [2, 'level8'],
        [3, 'level15'],
        [4, 'level24'],
        [5, 'level32'],
        [6, 'level42']
    ];

    for (const [mapNumber, tier] of mapToTier) {
        const drop = generateDrop(mapNumber, {
            encounterTier: 'common',
            rarityBias: 'early_common',
            playerClass: 'guerreiro'
        });

        assert.equal(drop.originTier, tier);
        assert.equal(drop.level, TIER_META[tier].level);
    }
});
