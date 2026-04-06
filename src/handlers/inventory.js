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

    const validSlots = [
        'weapon',
        'armor',
        'necklace',
        'ring',
        'boots'
    ];

    for (const validSlot of validSlots) {
        if (item.slot.startsWith(validSlot)) {
            return validSlot;
        }
    }

    return item.slot;
}

function findItemById(inventory, slot, targetId) {
    const normalizedTarget = String(targetId).trim();

    return inventory.find(item => {
        return (
            getRealSlot(item) === slot &&
            String(item.id) === normalizedTarget
        );
    });
}

async function handleEquipItem(ctx) {
    const rawData = ctx.callbackQuery.data;

    const match = rawData.match(
        /^equip_(weapon|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/
    );

    if (!match) {
        console.error('[Equipar] Formato inválido:', rawData);

        return ctx.answerCbQuery(
            '⚠️ Mensagem antiga. Abra o inventário novamente.',
            { show_alert: true }
        );
    }

    const [, slot, itemIdRaw] = match;
    const itemId = String(itemIdRaw).trim();

    const player = await getPlayer(ctx.from.id);
    const inventory = player.inventory || [];

    console.log(`[Equipar] Slot: ${slot}, ID: "${itemId}"`);

    const item = findItemById(
        inventory,
        slot,
        itemId
    );

    if (!item) {
        console.error(
            `[Equipar] Item NÃO encontrado: slot=${slot}, id=${itemId}`
        );

        return ctx.answerCbQuery(
            '❌ Item não encontrado no inventário.',
            { show_alert: true }
        );
    }

    if (!player.equipment) {
        player.equipment = {};
    }

    player.equipment[slot] = item;

    recalculateStats(player);

    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`✅ ${item.name} equipado!`);

    if (slot === 'weapon') return handleInvWeapons(ctx);
    if (slot === 'armor') return handleInvArmors(ctx);
    if (slot === 'necklace' || slot === 'ring') {
        return handleInvJewelry(ctx);
    }
    if (slot === 'boots') return handleInvBoots(ctx);

    return handleInventory(ctx);
}

/* MANTENHA O RESTANTE DO ARQUIVO IGUAL AO SEU */
module.exports = require('./inventory');
module.exports.handleEquipItem = handleEquipItem;