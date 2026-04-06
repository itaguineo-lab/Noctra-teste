const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

function renderInventoryHeader(player) {
    const inventory = player.inventory || [];
    const maxInv = player.maxInventory || 20;
    return `╔══════════════════════════════════╗
║            🎒 *INVENTÁRIO*            ║
╠══════════════════════════════════╣
║ 📦 ${inventory.length}/${maxInv}
║ ⚔️ ATK ${player.atk || 0}  🛡️ DEF ${player.def || 0}
║ ❤️ HP ${player.maxHp || 0}  💥 CRIT ${player.crit || 0}%
║ 🗝️ Chaves: ${player.keys || 0}
╚══════════════════════════════════╝`;
}

function formatItemLine(item) {
    const level = item.level ? ` [Lv${item.level}]` : '';
    const stats = [];
    if (item.atk) stats.push(`ATK+${item.atk}`);
    if (item.def) stats.push(`DEF+${item.def}`);
    if (item.hp) stats.push(`HP+${item.hp}`);
    if (item.crit) stats.push(`CRIT+${item.crit}%`);
    return `${item.emoji || '⚪'} ${item.name}${level} (${stats.join(', ')})`;
}

function getRealSlot(item) {
    if (!item?.slot) return 'unknown';
    const validSlots = ['weapon', 'armor', 'necklace', 'ring', 'boots'];
    for (const validSlot of validSlots) {
        if (item.slot.startsWith(validSlot)) return validSlot;
    }
    return item.slot;
}

async function renderInventory(ctx, category = null) {
    const player = await getPlayer(ctx.from.id);
    const inventory = player.inventory || [];
    const equipped = player.equipment || {};

    const categories = {
        weapons: { title: '⚔️ Armas', filter: i => getRealSlot(i) === 'weapon' },
        armors: { title: '🛡️ Armaduras', filter: i => getRealSlot(i) === 'armor' },
        jewelry: { title: '💎 Joias', filter: i => getRealSlot(i) === 'necklace' || getRealSlot(i) === 'ring' },
        boots: { title: '👢 Botas', filter: i => getRealSlot(i) === 'boots' }
    };

    if (!category) {
        const header = renderInventoryHeader(player);
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('⚔️ Armas', 'inv_weapons'), Markup.button.callback('🛡️ Armaduras', 'inv_armors')],
            [Markup.button.callback('💎 Joias', 'inv_jewelry'), Markup.button.callback('👢 Botas', 'inv_boots')],
            [Markup.button.callback('🧪 Consumíveis', 'inv_consumables'), Markup.button.callback('💀 Almas', 'inv_souls')],
            [Markup.button.callback('🏠 Menu', 'menu')]
        ]);
        return ctx.editMessageText(header, { parse_mode: 'Markdown', ...keyboard });
    }

    const cat = categories[category];
    if (!cat) return ctx.editMessageText('Categoria inválida.', { parse_mode: 'Markdown' });

    const items = inventory.filter(cat.filter);
    if (items.length === 0) {
        return ctx.editMessageText(
            `${renderInventoryHeader(player)}\n\n║ *${cat.title}*\n║   Nenhum item encontrado.\n╚══════════════════════════════════╝`,
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Voltar', 'inventory')]]) }
        );
    }

    const buttons = [];
    let text = `${renderInventoryHeader(player)}\n`;
    text += `╠══════════════════════════════════╣\n`;
    text += `║ *${cat.title}*\n`;
    text += `╠══════════════════════════════════╣\n`;

    for (const item of items) {
        const realSlot = getRealSlot(item);
        const isEquipped = String(equipped[realSlot]?.id || '') === String(item.id);
        const line = formatItemLine(item);
        text += `║ ${line}\n`;

        if (isEquipped) {
            buttons.push([Markup.button.callback(`⭐ Desequipar ${item.name}`, `unequip_${realSlot}`)]);
        } else {
            buttons.push([Markup.button.callback(`🔹 Equipar ${item.name}`, `equip_${realSlot}_${item.id}`)]);
        }
    }

    text += `╚══════════════════════════════════╝`;

    buttons.push([Markup.button.callback('◀️ Voltar', 'inventory')]);
    const keyboard = Markup.inlineKeyboard(buttons);
    return ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
}

async function handleInventory(ctx) {
    return renderInventory(ctx);
}

async function handleInvWeapons(ctx) {
    return renderInventory(ctx, 'weapons');
}

async function handleInvArmors(ctx) {
    return renderInventory(ctx, 'armors');
}

async function handleInvJewelry(ctx) {
    return renderInventory(ctx, 'jewelry');
}

async function handleInvBoots(ctx) {
    return renderInventory(ctx, 'boots');
}

async function handleInvConsumables(ctx) {
    const player = await getPlayer(ctx.from.id);
    const c = player.consumables || {};
    const text = `╔══════════════════════════════════╗
║            🧪 *CONSUMÍVEIS*          ║
╠══════════════════════════════════╣
║ ❤️ Poção de HP: ${c.potionHp || 0}
║ ⚡ Poção de Energia: ${c.potionEnergy || 0}
║ 💪 Tônico de Força: ${c.tonicStrength || 0}
║ 🛡️ Tônico de Defesa: ${c.tonicDefense || 0}
║ 🗝️ Chaves: ${player.keys || 0}
╚══════════════════════════════════╝`;

    const buttons = [];
    if (c.potionHp > 0) buttons.push([Markup.button.callback('❤️ Usar Poção de Vida', 'use_potion_outside_hp')]);
    buttons.push([Markup.button.callback('◀️ Voltar', 'inventory')]);

    return ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
}

async function handleUsePotionOutside(ctx, type) {
    const player = await getPlayer(ctx.from.id);
    const consumables = player.consumables || {};

    if (type === 'hp') {
        if (!consumables.potionHp || consumables.potionHp <= 0) {
            return ctx.answerCbQuery('❌ Você não tem poções de vida.', { show_alert: true });
        }
        if (player.hp >= player.maxHp) {
            return ctx.answerCbQuery('❤️ Seu HP já está cheio.', { show_alert: true });
        }

        consumables.potionHp--;
        const heal = Math.floor(player.maxHp * 0.4);
        player.hp = Math.min(player.maxHp, player.hp + heal);

        await savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(`🧪 Você usou uma poção e recuperou ${heal} HP!`, { show_alert: true });
        return handleInvConsumables(ctx);
    }
}

async function handleInvSouls(ctx) {
    const player = await getPlayer(ctx.from.id);
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `╔══════════════════════════════════╗
║              💀 *ALMAS*              ║
╠══════════════════════════════════╣
║ *Inventário* (${souls.length})\n`;

    souls.forEach(soul => { text += `║   🔹 ${soul.name} (${soul.rarity})\n`; });

    text += `╠══════════════════════════════════╣
║ *Equipadas*\n`;

    equipped.forEach((soul, idx) => {
        text += soul ? `║   ⭐ Alma ${idx + 1}: ${soul.name}\n` : `║   ⬜ Slot ${idx + 1}: vazio\n`;
    });

    text += `╠══════════════════════════════════╣
║ 🗝️ Chaves: ${player.keys || 0}
╚══════════════════════════════════╝`;

    const keyboard = Markup.inlineKeyboard([
        ...souls.map(soul => [Markup.button.callback(`💀 Equipar ${soul.name}`, `equip_soul_${soul.instanceId || soul.id}`)]),
        ...equipped.map((soul, idx) => soul ? [Markup.button.callback(`⭐ Desequipar Alma ${idx + 1}`, `unequip_soul_${idx}`)] : []),
        [Markup.button.callback('◀️ Voltar', 'inventory')]
    ]);

    return ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
}

function findItemById(inventory, slot, targetId) {
    const normalizedTarget = String(targetId).trim();
    return inventory.find(item => {
        const realSlot = getRealSlot(item);
        if (realSlot !== slot) return false;
        return String(item.id) === normalizedTarget;
    });
}

async function handleEquipItem(ctx) {
    const rawData = ctx.callbackQuery.data;

    const match = rawData.match(
        /^equip_(weapon|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/
    );

    if (!match) {
        console.error('[Equipar] Formato inválido:', rawData);
        return ctx.answerCbQuery('⚠️ Mensagem antiga. Abra o inventário novamente.', { show_alert: true });
    }

    const [, slot, itemIdRaw] = match;
    const itemId = String(itemIdRaw).trim();

    const player = await getPlayer(ctx.from.id);
    const inventory = player.inventory || [];

    console.log(`[Equipar] Slot: ${slot}, ID: "${itemId}"`);

    const item = findItemById(inventory, slot, itemId);

    if (!item) {
        console.error(`[Equipar] Item NÃO encontrado: slot=${slot}, id=${itemId}`);
        return ctx.answerCbQuery('❌ Item não encontrado no inventário.', { show_alert: true });
    }

    if (!player.equipment) player.equipment = {};
    player.equipment[slot] = item;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`✅ ${item.name} equipado!`);

    if (slot === 'weapon') return handleInvWeapons(ctx);
    if (slot === 'armor') return handleInvArmors(ctx);
    if (slot === 'necklace' || slot === 'ring') return handleInvJewelry(ctx);
    if (slot === 'boots') return handleInvBoots(ctx);
    return handleInventory(ctx);
}

async function handleUnequipItem(ctx) {
    const rawData = ctx.callbackQuery.data;
    const match = rawData.match(/^unequip_(weapon|armor|necklace|ring|boots)$/);

    if (!match) {
        console.error('[Desequipar] Formato inválido:', rawData);
        return ctx.answerCbQuery('Erro interno.', { show_alert: true });
    }

    const slot = match[1];
    const player = await getPlayer(ctx.from.id);
    const item = player.equipment?.[slot];

    if (!item) {
        return ctx.answerCbQuery('❌ Nada equipado neste slot.', { show_alert: true });
    }

    player.equipment[slot] = null;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`✅ ${item.name} removido!`);

    if (slot === 'weapon') return handleInvWeapons(ctx);
    if (slot === 'armor') return handleInvArmors(ctx);
    if (slot === 'necklace' || slot === 'ring') return handleInvJewelry(ctx);
    if (slot === 'boots') return handleInvBoots(ctx);
    return handleInventory(ctx);
}

async function handleEquipSoul(ctx) {
    const soulId = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);
    const soul = (player.soulsInventory || []).find(s => (s.instanceId || s.id) === soulId);

    if (!soul) return ctx.answerCbQuery('Alma não encontrada.');
    if ((player.soulsEquipped || []).some(s => s && (s.instanceId || s.id) === soulId)) {
        return ctx.answerCbQuery('⚠️ Já equipada.', { show_alert: true });
    }

    const emptySlot = (player.soulsEquipped || [null, null]).findIndex(s => !s);
    if (emptySlot === -1) return ctx.answerCbQuery('Slots de almas cheios.');

    if (!player.soulsEquipped) player.soulsEquipped = [null, null];
    player.soulsEquipped[emptySlot] = soul;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`💀 ${soul.name} equipada!`);
    return handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const slotIdx = parseInt(ctx.match?.[1], 10);
    const player = await getPlayer(ctx.from.id);
    const soul = player.soulsEquipped?.[slotIdx];

    if (!soul) return ctx.answerCbQuery('Nada equipado.');

    if (!player.soulsInventory) player.soulsInventory = [];
    player.soulsInventory.push(soul);
    player.soulsEquipped[slotIdx] = null;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`💀 ${soul.name} removida e devolvida!`);
    return handleInvSouls(ctx);
}

module.exports = {
    renderInventory,
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvBoots,
    handleInvConsumables,
    handleInvSouls,
    handleEquipItem,
    handleUnequipItem,
    handleEquipSoul,
    handleUnequipSoul,
    handleUsePotionOutside
};