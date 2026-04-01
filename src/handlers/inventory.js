const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

function formatStats(item) {
    if (!item) return '—';

    const stats = [];

    if (item.atk) stats.push(`ATK+${item.atk}`);
    if (item.def) stats.push(`DEF+${item.def}`);
    if (item.hp) stats.push(`HP+${item.hp}`);
    if (item.crit) stats.push(`CRIT+${item.crit}%`);

    return stats.join(', ');
}

function getCategoryConfig(category) {
    return {
        weapons: {
            title: '⚔️ Armas',
            slots: ['weapon'],
            label: 'Arma'
        },
        armors: {
            title: '🛡️ Armaduras',
            slots: ['armor', 'boots', 'backpack'],
            label: 'Equipamentos'
        },
        jewelry: {
            title: '💎 Joias',
            slots: ['necklace', 'ring'],
            label: 'Joias'
        },
        consumables: {
            title: '🧪 Consumíveis',
            slots: [],
            label: 'Itens'
        }
    }[category];
}

function buildText(player, category = null) {
    let text = `🎒 *Inventário* (${player.inventory.length}/${player.maxInventory || 20})

⚔️ ATK ${player.atk}
🛡️ DEF ${player.def}
❤️ HP ${player.maxHp}
🎯 CRIT ${player.crit}%`;

    if (!category) {
        return text;
    }

    const config = getCategoryConfig(category);

    text += `\n\n${config.title}\n`;

    config.slots.forEach(slot => {
        const equipped = player.equipment?.[slot];

        const slotName = {
            weapon: 'Arma',
            armor: 'Armadura',
            boots: 'Bota',
            backpack: 'Mochila',
            necklace: 'Colar',
            ring: 'Anel'
        }[slot] || slot;

        text += `\n${slotName}: `;

        if (equipped) {
            text += `${equipped.name} ⭐ (${formatStats(equipped)})`;
        } else {
            text += '—';
        }
    });

    text += `\n\n📦 *Itens disponíveis*\n`;

    const available = player.inventory.filter(item =>
        config.slots.includes(item.slot)
    );

    if (!available.length) {
        text += `Nenhum item disponível`;
    } else {
        available.forEach(item => {
            const isEquipped =
                player.equipment?.[item.slot]?.id === item.id;

            text += `\n${isEquipped ? '⭐' : '🔹'} ${item.name} (${formatStats(item)})`;
        });
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
                        `⭐ Desequipar ${equipped.name}`,
                        `unequip_${slot}`
                    )
                ]);
            }

            const items = player.inventory.filter(
                item => item.slot === slot
            );

            items.forEach(item => {
                const isEquipped =
                    equipped?.id === item.id;

                if (!isEquipped) {
                    rows.push([
                        Markup.button.callback(
                            `🔹 Equipar ${item.name}`,
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

    await ctx.answerCbQuery?.();

    return ctx.editMessageText(text, {
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
    const [, slot, itemId] =
        ctx.callbackQuery.data.match(/^equip_(.+)_(.+)$/);

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

    const category =
        slot === 'weapon'
            ? 'weapons'
            : ['armor', 'boots', 'backpack'].includes(slot)
            ? 'armors'
            : ['necklace', 'ring'].includes(slot)
            ? 'jewelry'
            : null;

    return renderInventory(ctx, category);
}

async function handleUnequipItem(ctx) {
    const [, slot] =
        ctx.callbackQuery.data.match(/^unequip_(.+)$/);

    const player = getPlayer(ctx.from.id);

    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    const category =
        slot === 'weapon'
            ? 'weapons'
            : ['armor', 'boots', 'backpack'].includes(slot)
            ? 'armors'
            : ['necklace', 'ring'].includes(slot)
            ? 'jewelry'
            : null;

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