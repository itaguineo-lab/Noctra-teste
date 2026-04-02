const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');
const { formatItemStats } = require('../utils/formatters');

// Helper para renderizar inventário com bordas
function renderInventoryHeader(player) {
    return `╔════════════════════════╗
║      🎒 *INVENTÁRIO*      ║
╠════════════════════════╣
║ 📦 ${player.inventory.length}/${player.maxInventory || 20}
║ ⚔️ ATK ${player.atk}  🛡️ DEF ${player.def}
║ ❤️ HP ${player.maxHp}  💥 CRIT ${player.crit}%
╚════════════════════════╝`;
}

function renderEquipmentSection(player, category) {
    const eq = player.equipment || {};
    const slots = {
        weapons: ['weapon'],
        armors: ['armor'],
        jewelry: ['necklace', 'ring'],
        boots: ['boots']
    };
    const selectedSlots = slots[category] || [];

    if (!selectedSlots.length) return '';

    let text = `╠════════════════════════╣\n║ *Equipados*:\n`;
    selectedSlots.forEach(slot => {
        const item = eq[slot];
        const name = item ? `${item.name} ${formatItemStats(item)}` : '—';
        text += `║   ${slotLabel(slot)}: ${name}\n`;
    });
    return text;
}

function slotLabel(slot) {
    const map = {
        weapon: '⚔️',
        armor: '🛡️',
        necklace: '📿',
        ring: '💍',
        boots: '👢'
    };
    return map[slot] || '•';
}

function buildItemsList(items, equippedItems, category) {
    if (!items.length) return '║   Nenhum item disponível.\n';

    let text = '';
    items.forEach(item => {
        const isEquipped = equippedItems[item.slot]?.id === item.id;
        const prefix = isEquipped ? '⭐' : '🔹';
        text += `║   ${prefix} ${item.name}${formatItemStats(item)}\n`;
    });
    return text;
}

function buildMenuButtons(items, equippedItems, category, categorySlots) {
    const buttons = [];

    // Botões para equipar itens não equipados
    items.forEach(item => {
        if (equippedItems[item.slot]?.id !== item.id) {
            buttons.push([
                Markup.button.callback(
                    `🔹 Equipar ${item.name}`,
                    `equip_${item.slot}_${item.id}`
                )
            ]);
        }
    });

    // Botões para desequipar slots ocupados
    categorySlots.forEach(slot => {
        if (equippedItems[slot]) {
            buttons.push([
                Markup.button.callback(
                    `⭐ Desequipar ${equippedItems[slot].name}`,
                    `unequip_${slot}`
                )
            ]);
        }
    });

    // Voltar
    buttons.push([Markup.button.callback('◀️ Voltar', 'inventory')]);
    return Markup.inlineKeyboard(buttons);
}

async function renderInventory(ctx, category = null) {
    const player = getPlayer(ctx.from.id);
    const inventory = player.inventory || [];

    // Definição de categorias
    const categories = {
        weapons: { slots: ['weapon'], title: '⚔️ Armas', filter: i => i.slot === 'weapon' },
        armors: { slots: ['armor'], title: '🛡️ Armaduras', filter: i => i.slot === 'armor' },
        jewelry: { slots: ['necklace', 'ring'], title: '💎 Joias', filter: i => i.slot === 'necklace' || i.slot === 'ring' },
        boots: { slots: ['boots'], title: '👢 Botas', filter: i => i.slot === 'boots' }
    };

    if (!category) {
        // Tela principal de categorias
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
    const equipped = player.equipment || {};

    let text = `${renderInventoryHeader(player)}\n`;
    text += `╠════════════════════════╣\n`;
    text += `║ *${cat.title}*\n`;
    text += `╠════════════════════════╣\n`;
    text += buildItemsList(items, equipped, category);
    text += `╚════════════════════════╝`;

    const keyboard = buildMenuButtons(items, equipped, category, cat.slots);

    return ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
}

// Handlers de navegação
async function handleInventory(ctx) { return renderInventory(ctx); }
async function handleInvWeapons(ctx) { return renderInventory(ctx, 'weapons'); }
async function handleInvArmors(ctx) { return renderInventory(ctx, 'armors'); }
async function handleInvJewelry(ctx) { return renderInventory(ctx, 'jewelry'); }
async function handleInvBoots(ctx) { return renderInventory(ctx, 'boots'); }
async function handleInvConsumables(ctx) {
    const player = getPlayer(ctx.from.id);
    const c = player.consumables || {};
    const text = `╔════════════════════════╗
║      🧪 *CONSUMÍVEIS*      ║
╠════════════════════════╣
║ ❤️ Poção de HP: ${c.potionHp || 0}
║ ⚡ Poção de Energia: ${c.potionEnergy || 0}
║ 💪 Tônico de Força: ${c.tonicStrength || 0}
║ 🛡️ Tônico de Defesa: ${c.tonicDefense || 0}
╚════════════════════════╝`;
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('◀️ Voltar', 'inventory')]]);
    return ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
}
async function handleInvSouls(ctx) {
    const player = getPlayer(ctx.from.id);
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `╔════════════════════════╗
║      💀 *ALMAS*      ║
╠════════════════════════╣
║ *Inventário* (${souls.length})\n`;
    souls.forEach(soul => {
        text += `║   🔹 ${soul.name} (${soul.rarity})\n`;
    });
    text += `╠════════════════════════╣
║ *Equipadas*\n`;
    equipped.forEach((soul, idx) => {
        text += soul ? `║   ⭐ Alma ${idx+1}: ${soul.name}\n` : `║   ⬜ Slot ${idx+1}: vazio\n`;
    });
    text += `╚════════════════════════╝`;

    const keyboard = Markup.inlineKeyboard([
        ...souls.map(soul => [Markup.button.callback(`💀 Equipar ${soul.name}`, `equip_soul_${soul.instanceId || soul.id}`)]),
        ...equipped.map((soul, idx) => soul ? [Markup.button.callback(`⭐ Desequipar Alma ${idx+1}`, `unequip_soul_${idx}`)] : []),
        [Markup.button.callback('◀️ Voltar', 'inventory')]
    ]);
    return ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
}

// Handlers de equipar/desequipar itens
async function handleEquipItem(ctx) {
    const [, slot, itemId] = ctx.callbackQuery.data.match(/^equip_(.+)_(.+)$/);
    const player = getPlayer(ctx.from.id);
    const item = player.inventory.find(i => i.slot === slot && String(i.id) === String(itemId));
    if (!item) return ctx.answerCbQuery('Item não encontrado.');

    player.equipment[slot] = item;
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`✅ ${item.name} equipado!`);

    // Redireciona para a categoria correspondente
    if (slot === 'weapon') return handleInvWeapons(ctx);
    if (slot === 'armor') return handleInvArmors(ctx);
    if (slot === 'necklace' || slot === 'ring') return handleInvJewelry(ctx);
    if (slot === 'boots') return handleInvBoots(ctx);
    return handleInventory(ctx);
}

async function handleUnequipItem(ctx) {
    const [, slot] = ctx.callbackQuery.data.match(/^unequip_(.+)$/);
    const player = getPlayer(ctx.from.id);
    const item = player.equipment[slot];
    if (!item) return ctx.answerCbQuery('Nada equipado.');

    player.equipment[slot] = null;
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`✅ ${item.name} removido!`);

    if (slot === 'weapon') return handleInvWeapons(ctx);
    if (slot === 'armor') return handleInvArmors(ctx);
    if (slot === 'necklace' || slot === 'ring') return handleInvJewelry(ctx);
    if (slot === 'boots') return handleInvBoots(ctx);
    return handleInventory(ctx);
}

async function handleEquipSoul(ctx) {
    const soulId = ctx.match[1];
    const player = getPlayer(ctx.from.id);
    const soul = player.soulsInventory.find(s => (s.instanceId || s.id) === soulId);
    if (!soul) return ctx.answerCbQuery('Alma não encontrada.');

    // Verificar se a alma já está equipada
    const alreadyEquipped = player.soulsEquipped.some(s => s && (s.instanceId || s.id) === soulId);
    if (alreadyEquipped) {
        return ctx.answerCbQuery('⚠️ Esta alma já está equipada.', { show_alert: true });
    }

    const emptySlot = player.soulsEquipped.findIndex(s => !s);
    if (emptySlot === -1) return ctx.answerCbQuery('Slots de almas cheios.');

    player.soulsEquipped[emptySlot] = soul;
    // Não remove do inventário (como no Teletofus)
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`💀 ${soul.name} equipada!`);
    return handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const slotIdx = parseInt(ctx.match[1]);
    const player = getPlayer(ctx.from.id);
    const soul = player.soulsEquipped[slotIdx];
    if (!soul) return ctx.answerCbQuery('Nada equipado.');

    // Devolve a alma ao inventário
    player.soulsInventory.push(soul);
    player.soulsEquipped[slotIdx] = null;
    recalculateStats(player);
    savePlayer(ctx.from.id, player);
    await ctx.answerCbQuery(`💀 ${soul.name} removida e devolvida ao inventário!`);
    return handleInvSouls(ctx);
}

module.exports = {
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
    handleUnequipSoul
};