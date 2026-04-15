function detectCosmeticType(cosmetic = {}) {
    const id = String(cosmetic.id || '').toLowerCase();
    const name = String(cosmetic.name || '').toLowerCase();
    const rawType = String(cosmetic.type || '').toLowerCase();

    if (rawType === 'title' || id.includes('title') || name.includes('título') || name.includes('title')) {
        return 'title';
    }
    if (rawType === 'aura' || id.includes('aura') || id.includes('skin') || name.includes('aura')) {
        return 'aura';
    }
    return 'badge';
}

function normalizeCosmetic(cosmetic = {}) {
    return {
        id: String(cosmetic.id || '').trim(),
        name: String(cosmetic.name || cosmetic.value || 'Cosmético').trim(),
        type: detectCosmeticType(cosmetic)
    };
}

function ensureCosmeticsState(player) {
    player.cosmetics ??= [];
    player.cosmetics = player.cosmetics
        .map(normalizeCosmetic)
        .filter(c => c.id);

    const unique = new Map();
    for (const cosmetic of player.cosmetics) {
        if (!unique.has(cosmetic.id)) unique.set(cosmetic.id, cosmetic);
    }
    player.cosmetics = Array.from(unique.values());

    player.activeCosmetics ??= { title: null, aura: null, badge: null };
    player.activeCosmetics.title ??= null;
    player.activeCosmetics.aura ??= null;
    player.activeCosmetics.badge ??= null;
    return player;
}

function addCosmeticToPlayer(player, cosmetic) {
    ensureCosmeticsState(player);
    const normalized = normalizeCosmetic(cosmetic);
    if (!normalized.id) {
        return { success: false, message: '❌ Cosmético inválido.' };
    }
    const exists = player.cosmetics.some(c => c.id === normalized.id);
    if (exists) {
        return { success: false, message: '❌ Você já possui este cosmético.' };
    }
    player.cosmetics.push(normalized);
    return { success: true, cosmetic: normalized };
}

function equipCosmetic(player, cosmeticId) {
    ensureCosmeticsState(player);
    const found = player.cosmetics.find(c => c.id === cosmeticId);
    if (!found) return { success: false, message: '❌ Skin não encontrada.' };

    player.activeCosmetics[found.type] = found.id;
    return { success: true, cosmetic: found };
}

function unequipCosmetic(player, slot) {
    ensureCosmeticsState(player);
    if (!['title', 'aura', 'badge'].includes(slot)) {
        return { success: false, message: '❌ Slot cosmético inválido.' };
    }
    player.activeCosmetics[slot] = null;
    return { success: true };
}

function getActiveCosmetic(player, slot) {
    ensureCosmeticsState(player);
    const activeId = player.activeCosmetics?.[slot];
    if (!activeId) return null;
    return player.cosmetics.find(c => c.id === activeId) || null;
}

module.exports = {
    detectCosmeticType,
    normalizeCosmetic,
    ensureCosmeticsState,
    addCosmeticToPlayer,
    equipCosmetic,
    unequipCosmetic,
    getActiveCosmetic
};
