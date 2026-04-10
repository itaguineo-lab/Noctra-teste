async function equipByCurrentList(ctx, category, page, absoluteIndex) {
    const player = normalizePlayerState(await getPlayer(ctx.from.id));
    const allItems = getCategoryItems(player, category);

    const item = allItems[absoluteIndex];
    if (!item) {
        await safeAnswer(ctx, '⚠️ Lista desatualizada. Abra o inventário novamente.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    const slot = getRealSlot(item);
    if (!slot || slot === 'unknown') {
        await safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    // ========== VERIFICAÇÃO DE RESTRIÇÃO DE CLASSE ==========
    if (item.classRestriction && item.classRestriction !== player.class) {
        const className = player.class === 'guerreiro' ? 'Guerreiros' : player.class === 'arqueiro' ? 'Arqueiros' : 'Magos';
        await safeAnswer(ctx, `❌ Apenas ${className} podem equipar ${item.name}.`, { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    const currentEquipped = player.equipment[slot];

    if (currentEquipped && !sameItem(currentEquipped, item)) {
        player.inventory.push({ ...currentEquipped, __equipped: false });
    }

    player.inventory = player.inventory.filter(invItem => !sameItem(invItem, item));
    player.equipment[slot] = { ...item, __equipped: true };

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await safeAnswer(ctx, `✅ ${item.name} equipado!`);
    return renderInventory(ctx, category, page);
}