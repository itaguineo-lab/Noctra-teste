const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

function formatItem(item) {
    if (!item) return '—';

    const stats = [];

    if (item.atk) stats.push(`ATK+${item.atk}`);
    if (item.def) stats.push(`DEF+${item.def}`);
    if (item.hp) stats.push(`HP+${item.hp}`);
    if (item.crit) stats.push(`CRIT+${item.crit}%`);

    return `${item.name} (${stats.join(', ')})`;
}

function buildInventoryText(player) {
    const eq = player.equipment || {};

    return `🎒 *Inventário* (${player.inventory.length}/${player.maxInventory || 20})

⚔️ ATK ${player.atk}
🛡️ DEF ${player.def}
❤️ HP ${player.maxHp}
🎯 CRIT ${player.crit}%

Arma: ${formatItem(eq.weapon)}
Armadura: ${formatItem(eq.armor)}
Bota: ${formatItem(eq.boots)}
Mochila: ${formatItem(eq.backpack)}
Colar: ${formatItem(eq.necklace)}
Anel: ${formatItem(eq.ring)}

💡 Itens equipados ocupam slot.`;
}

function buildInventoryMenu(player) {
    const rows = [
        [
            Markup.button.callback('⚔️ Armas', 'inv_weapons'),
            Markup.button.callback('🛡️ Armaduras', 'inv_armors')
        ],
        [
            Markup.button.callback('💎 Joias', 'inv_jewelry'),
            Markup.button.callback('🧪 Consumíveis', 'inv_consumables')
        ],
        [
            Markup.button.callback('🎨 Skins', 'inv_skins'),
            Markup.button.callback('✨ Almas', 'inv_souls')
        ]
    ];

    const eq = player.equipment || {};

    const equippedSlots = [
        'weapon',
        'armor',
        'boots',
        'backpack',
        'necklace',
        'ring'
    ];

    equippedSlots.forEach(slot => {
        const item = eq[slot];

        if (item) {
            rows.push([
                Markup.button.callback(
                    `⭐ Desequipar ${item.name}`,
                    `unequip_${slot}`
                )
            ]);
        }
    });

    player.inventory.forEach(item => {
        const equipped =
            player.equipment[item.slot]?.id === item.id;

        if (!equipped) {
            rows.push([
                Markup.button.callback(
                    `🔹 Equipar ${item.name}`,
                    `equip_${item.slot}_${item.id}`
                )
            ]);
        }
    });

    rows.push([
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function renderInventory(ctx) {
    const player = getPlayer(ctx.from.id);

    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();

            return await ctx.editMessageText(
                buildInventoryText(player),
                {
                    parse_mode: 'Markdown',
                    ...buildInventoryMenu(player)
                }
            );
        }

        return await ctx.reply(
            buildInventoryText(player),
            {
                parse_mode: 'Markdown',
                ...buildInventoryMenu(player)
            }
        );
    } catch {
        return ctx.reply(
            buildInventoryText(player),
            {
                parse_mode: 'Markdown',
                ...buildInventoryMenu(player)
            }
        );
    }
}

async function handleInventory(ctx) {
    return renderInventory(ctx);
}

async function handleInvWeapons(ctx) {
    return renderInventory(ctx);
}

async function handleInvArmors(ctx) {
    return renderInventory(ctx);
}

async function handleInvJewelry(ctx) {
    return renderInventory(ctx);
}

async function handleInvConsumables(ctx) {
    return renderInventory(ctx);
}

async function handleInvSouls(ctx) {
    return renderInventory(ctx);
}

async function handleEquipItem(ctx) {
    const match =
        ctx.callbackQuery.data.match(/^equip_(.+)_(.+)$/);

    if (!match) {
        return ctx.answerCbQuery('Item inválido');
    }

    const slot = match[1];
    const itemId = match[2];

    const player = getPlayer(ctx.from.id);

    const item = player.inventory.find(
        i =>
            i.slot === slot &&
            String(i.id) === String(itemId)
    );

    if (!item) {
        return ctx.answerCbQuery('Item inválido');
    }

    player.equipment[slot] = item;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return renderInventory(ctx);
}

async function handleUnequipItem(ctx) {
    const match =
        ctx.callbackQuery.data.match(/^unequip_(.+)$/);

    if (!match) {
        return ctx.answerCbQuery('Slot inválido');
    }

    const slot = match[1];

    const player = getPlayer(ctx.from.id);

    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return renderInventory(ctx);
}

async function handleEquipSoul(ctx) {
    return ctx.answerCbQuery('✨ Em breve');
}

async function handleUnequipSoul(ctx) {
    return ctx.answerCbQuery('✨ Em breve');
}

module.exports = {
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvConsumables,
    handleInvSouls,
    handleEquipItem,
    handleUnequipItem,
    handleEquipSoul,
    handleUnequipSoul
};