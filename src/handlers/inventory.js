const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

function formatStats(item) {
    const stats = [];

    if (item.atk) stats.push(`ATK+${item.atk}`);
    if (item.def) stats.push(`DEF+${item.def}`);
    if (item.hp) stats.push(`HP+${item.hp}`);
    if (item.crit) stats.push(`CRIT+${item.crit}%`);

    return stats.join(', ');
}

function getCategoryConfig(category) {
    const configs = {
        weapons: {
            slots: ['weapon'],
            title: '⚔️ Armas'
        },
        armors: {
            slots: ['armor', 'boots', 'backpack'],
            title: '🛡️ Armaduras'
        },
        jewelry: {
            slots: ['necklace', 'ring'],
            title: '💎 Joias'
        },
        consumables: {
            slots: [],
            title: '🧪 Consumíveis'
        }
    };

    return configs[category];
}

function buildText(player, category = null) {
    let text = `🎒 *Inventário* (${player.inventory.length}/${player.maxInventory || 20})

⚔️ ATK ${player.atk}
🛡️ DEF ${player.def}
❤️ HP ${player.maxHp}
🎯 CRIT ${player.crit}%`;

    if (category) {
        const config = getCategoryConfig(category);
        text += `\n\n${config.title}`;
    }

    return text;
}

function buildMenu(player, category = null) {
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

    if (category) {
        const config = getCategoryConfig(category);

        config.slots.forEach(slot => {
            const equipped = player.equipment?.[slot];

            if (equipped) {
                rows.push([
                    Markup.button.callback(
                        `⭐ Desequipar ${equipped.name} (${formatStats(equipped)})`,
                        `unequip_${slot}`
                    )
                ]);
            }

            const availableItems = player.inventory.filter(
                item => item.slot === slot
            );

            availableItems.forEach(item => {
                const isEquipped =
                    equipped?.id === item.id;

                if (!isEquipped) {
                    rows.push([
                        Markup.button.callback(
                            `🔹 Equipar ${item.name} (${formatStats(item)})`,
                            `equip_${slot}_${item.id}`
                        )
                    ]);
                }
            });
        });
    }

    rows.push([
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function renderInventory(ctx, category = null) {
    const player = getPlayer(ctx.from.id);

    const text = buildText(player, category);
    const keyboard = buildMenu(player, category);

    if (ctx.callbackQuery) {
        await ctx.answerCbQuery();

        return ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }

    return ctx.reply(text, {
        parse_mode: 'Markdown',
        ...keyboard
    });
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

async function handleInvConsumables(ctx) {
    return renderInventory(ctx, 'consumables');
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

    let category = null;

    if (slot === 'weapon') category = 'weapons';
    else if (
        ['armor', 'boots', 'backpack'].includes(slot)
    ) category = 'armors';
    else if (
        ['necklace', 'ring'].includes(slot)
    ) category = 'jewelry';

    return renderInventory(ctx, category);
}

async function handleUnequipItem(ctx) {
    const match =
        ctx.callbackQuery.data.match(/^unequip_(.+)$/);

    const slot = match[1];

    const player = getPlayer(ctx.from.id);

    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    let category = null;

    if (slot === 'weapon') category = 'weapons';
    else if (
        ['armor', 'boots', 'backpack'].includes(slot)
    ) category = 'armors';
    else if (
        ['necklace', 'ring'].includes(slot)
    ) category = 'jewelry';

    return renderInventory(ctx, category);
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