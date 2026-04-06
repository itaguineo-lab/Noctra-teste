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

function getRealSlot(item) {
    if (!item?.slot) return 'unknown';

    const validSlots = ['weapon', 'armor', 'necklace', 'ring', 'boots'];

    for (const slot of validSlots) {
        if (item.slot.startsWith(slot)) return slot;
    }

    return item.slot;
}

function formatItemLine(item, isEquipped = false) {
    const star = isEquipped ? '⭐ ' : '';
    const level = item.level ? ` [Lv${item.level}]` : '';

    const stats = [];
    if (item.atk) stats.push(`ATK+${item.atk}`);
    if (item.def) stats.push(`DEF+${item.def}`);
    if (item.hp) stats.push(`HP+${item.hp}`);
    if (item.crit) stats.push(`CRIT+${item.crit}%`);

    return `${star}${item.emoji || '⚪'} ${item.name}${level} (${stats.join(', ')})`;
}

function findItemById(inventory, slot, targetId) {
    return inventory.find(item =>
        getRealSlot(item) === slot &&
        String(item.id) === String(targetId)
    );
}

async function renderInventory(ctx, category = null) {
    const player = await getPlayer(ctx.from.id);
    const inventory = player.inventory || [];
    const equipped = player.equipment || {};

    const categories = {
        weapons: {
            title: '⚔️ Armas',
            slot: 'weapon'
        },
        armors: {
            title: '🛡️ Armaduras',
            slot: 'armor'
        },
        jewelry: {
            title: '💎 Joias',
            slots: ['necklace', 'ring']
        },
        boots: {
            title: '👢 Botas',
            slot: 'boots'
        }
    };

    if (!category) {
        return ctx.editMessageText(
            renderInventoryHeader(player),
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('⚔️ Armas', 'inv_weapons'),
                        Markup.button.callback('🛡️ Armaduras', 'inv_armors')
                    ],
                    [
                        Markup.button.callback('💎 Joias', 'inv_jewelry'),
                        Markup.button.callback('👢 Botas', 'inv_boots')
                    ],
                    [
                        Markup.button.callback('🏠 Menu', 'menu')
                    ]
                ])
            }
        );
    }

    const cat = categories[category];
    if (!cat) return;

    const items = inventory.filter(item => {
        const slot = getRealSlot(item);

        if (cat.slot) return slot === cat.slot;
        return cat.slots.includes(slot);
    });

    let text = `${renderInventoryHeader(player)}\n\n`;
    text += `*${cat.title}*\n\n`;

    const buttons = [];

    for (const item of items) {
        const realSlot = getRealSlot(item);
        const isEquipped =
            equipped[realSlot] &&
            String(equipped[realSlot].id) === String(item.id);

        text += `${formatItemLine(item, isEquipped)}\n`;

        if (isEquipped) {
            buttons.push([
                Markup.button.callback(
                    `⭐ Desequipar ${item.name}`,
                    `unequip_${realSlot}`
                )
            ]);
        } else {
            buttons.push([
                Markup.button.callback(
                    `🔹 Equipar ${item.name}`,
                    `equip_${realSlot}_${item.id}`
                )
            ]);
        }
    }

    buttons.push([
        Markup.button.callback('◀️ Voltar', 'inventory')
    ]);

    return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
}

async function handleEquipItem(ctx) {
    const match = ctx.callbackQuery.data.match(/^equip_(.+)_(.+)$/);

    if (!match) {
        return ctx.answerCbQuery('Erro interno.');
    }

    const [, slot, itemId] = match;

    const player = await getPlayer(ctx.from.id);

    const item = findItemById(player.inventory, slot, itemId);

    if (!item) {
        console.error(`[EQUIP ERROR] slot=${slot} id=${itemId}`);
        return ctx.answerCbQuery(
            '❌ Item não encontrado no inventário.',
            { show_alert: true }
        );
    }

    if (!player.equipment) player.equipment = {};

    const oldItem = player.equipment[slot];

    // devolve item antigo ao inventário
    if (oldItem) {
        player.inventory.push(oldItem);
    }

    // remove item novo do inventário
    player.inventory = player.inventory.filter(
        i => String(i.id) !== String(itemId)
    );

    // equipa
    player.equipment[slot] = item;

    recalculateStats(player);

    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`✅ ${item.name} equipado!`);

    if (slot === 'weapon') return renderInventory(ctx, 'weapons');
    if (slot === 'armor') return renderInventory(ctx, 'armors');
    if (slot === 'boots') return renderInventory(ctx, 'boots');
    return renderInventory(ctx, 'jewelry');
}

async function handleUnequipItem(ctx) {
    const match = ctx.callbackQuery.data.match(/^unequip_(.+)$/);

    if (!match) {
        return ctx.answerCbQuery('Erro interno.');
    }

    const slot = match[1];

    const player = await getPlayer(ctx.from.id);

    const item = player.equipment?.[slot];

    if (!item) {
        return ctx.answerCbQuery(
            '❌ Nada equipado.',
            { show_alert: true }
        );
    }

    // devolve para inventário
    player.inventory.push(item);

    // limpa slot
    player.equipment[slot] = null;

    recalculateStats(player);

    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`✅ ${item.name} removido!`);

    if (slot === 'weapon') return renderInventory(ctx, 'weapons');
    if (slot === 'armor') return renderInventory(ctx, 'armors');
    if (slot === 'boots') return renderInventory(ctx, 'boots');
    return renderInventory(ctx, 'jewelry');
}

module.exports = {
    renderInventory,
    handleInventory: (ctx) => renderInventory(ctx),
    handleInvWeapons: (ctx) => renderInventory(ctx, 'weapons'),
    handleInvArmors: (ctx) => renderInventory(ctx, 'armors'),
    handleInvJewelry: (ctx) => renderInventory(ctx, 'jewelry'),
    handleInvBoots: (ctx) => renderInventory(ctx, 'boots'),
    handleEquipItem,
    handleUnequipItem
};