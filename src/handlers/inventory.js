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

function filterItems(player, category) {
    const all = player.inventory || [];

    switch (category) {
        case 'weapons':
            return all.filter(i => i.slot === 'weapon');

        case 'armors':
            return all.filter(i =>
                ['armor', 'boots', 'backpack'].includes(i.slot)
            );

        case 'jewelry':
            return all.filter(i =>
                ['necklace', 'ring'].includes(i.slot)
            );

        case 'consumables':
            return all.filter(i => i.type === 'consumable');

        default:
            return all;
    }
}

function buildText(player, category = null) {
    const eq = player.equipment || {};
    const items = filterItems(player, category);

    let text = `🎒 *Inventário* (${items.length}/${player.maxInventory || 20})

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

`;

    if (items.length > 0) {
        text += `📦 *Itens da categoria*\n`;

        items.forEach(item => {
            text += `• ${formatItem(item)}\n`;
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

    const visibleItems = filterItems(player, category);

    visibleItems.forEach(item => {
        const equipped =
            player.equipment?.[item.slot]?.id === item.id;

        rows.push([
            Markup.button.callback(
                equipped
                    ? `⭐ Desequipar ${item.name}`
                    : `🔹 Equipar ${item.name}`,
                equipped
                    ? `unequip_${item.slot}`
                    : `equip_${item.slot}_${item.id}`
            )
        ]);
    });

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