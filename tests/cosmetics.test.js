const test = require('node:test');
const assert = require('node:assert/strict');

const {
    ensureCosmeticsState,
    addCosmeticToPlayer,
    equipCosmetic,
    getActiveCosmetic
} = require('../src/core/player/cosmetics');

test('classifica cosméticos por tipo e equipa corretamente', () => {
    const player = { cosmetics: [], activeCosmetics: null };
    ensureCosmeticsState(player);

    const title = addCosmeticToPlayer(player, { id: 'cosmetic_title_shadowlord', name: 'Título: Shadow Lord' });
    const aura = addCosmeticToPlayer(player, { id: 'arena_skin_shadow', name: 'Aura do Campeão' });

    assert.equal(title.success, true);
    assert.equal(aura.success, true);

    const equipTitle = equipCosmetic(player, 'cosmetic_title_shadowlord');
    const equipAura = equipCosmetic(player, 'arena_skin_shadow');

    assert.equal(equipTitle.success, true);
    assert.equal(equipAura.success, true);
    assert.equal(getActiveCosmetic(player, 'title')?.name, 'Título: Shadow Lord');
    assert.equal(getActiveCosmetic(player, 'aura')?.name, 'Aura do Campeão');
});

test('não permite cosmético duplicado', () => {
    const player = { cosmetics: [] };
    ensureCosmeticsState(player);

    const first = addCosmeticToPlayer(player, { id: 'cosmetic_aura', name: 'Aura Sombria' });
    const second = addCosmeticToPlayer(player, { id: 'cosmetic_aura', name: 'Aura Sombria' });

    assert.equal(first.success, true);
    assert.equal(second.success, false);
});
