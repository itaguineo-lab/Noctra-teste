const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const { Markup } = require('telegraf');
const {
    inventoryMainMenu
} = require('../menus/inventoryMenu');

function getCategoryItems(player, category) {
    const inventory = player.inventory || [];

    if (category === 'weapon') {
        return inventory.filter(i => i.slot === 'weapon');
    }

    if (category === 'armor') {
        return inventory.filter(i => i.slot === 'armor');
    }

    if (category === 'jewelry') {
        return inventory.filter(i =>
            ['ring', 'necklace'].includes(i.slot)
        );
    }

    return [];
}

function categoryFromSlot(slot) {
    if (slot === 'weapon') return 'weapon';
    if (slot === 'armor') return 'armor';
    return 'jewelry';
}

function titleFromCategory(category) {
    if (category === 'weapon') return '⚔️ Armas';
    if (category === 'armor') return '🛡️ Armaduras';
    return '💍 Jóias';
}

function renderCategoryText(player, category) {
    const items = getCategoryItems(player, category);

    let text = `🎒 *${titleFromCategory(category)}*\n\n`;

    const equippedSlots = player.equipment || {};

    items.forEach(item => {
        const equipped = equippedSlots[item.slot];
        const isEquipped =
            equipped &&
            equipped.name === item.name;

        text += `${item.emoji || '⚪'} ${item.name} ${isEquipped ? '✅' : ''}\n`;
        text += `⚔️ ${item.atk || 0} | 🛡️ ${item.def || 0} | ❤️ ${item.hp || 0} | 💥 ${item.crit || 0}%\n\n`;
    });

    return text;
}

function renderCategoryKeyboard(player, category) {
    const items = getCategoryItems(player, category);

    const rows = [];

    items.forEach(item => {
        const equipped =
            player.equipment?.[item.slot];

        const isEquipped =
            equipped &&
            equipped.name === item.name;

        if (isEquipped) {
            rows.push([
                Markup.button.callback(
                    `➖ Desequipar ${item.name}`,
                    `unequip_manual_${item.slot}`
                )
            ]);
        } else {
            rows.push([
                Markup.button.callback(
                    `✨ Equipar ${item.name}`,
                    `equip_manual_${item.name}`
                )
            ]);
        }
    });

    rows.push([
        Markup.button.callback(
            '◀️ Voltar',
            'inventory'
        )
    ]);

    return Markup.inlineKeyboard(rows);
}

async function showCategory(ctx, category) {
    const player = getPlayer(ctx.from.id);

    const text = renderCategoryText(player, category);

    const keyboard = renderCategoryKeyboard(
        player,
        category
    );

    try {
        return await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch {
        return await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

async function handleEquipManual(ctx) {
    await ctx.answerCbQuery();

    const itemName = ctx.match[1];

    const player = getPlayer(ctx.from.id);

    const item = (player.inventory || []).find(
        i => i.name === itemName
    );

    if (!item) {
        return ctx.reply('❌ Item não encontrado.');
    }

    player.equipment[item.slot] = item;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return showCategory(
        ctx,
        categoryFromSlot(item.slot)
    );
}

async function handleUnequipManual(ctx) {
    await ctx.answerCbQuery();

    const slot = ctx.match[1];

    const player = getPlayer(ctx.from.id);

    if (!player.equipment) {
        player.equipment = {};
    }

    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return showCategory(
        ctx,
        categoryFromSlot(slot)
    );
}

async function handleInventory(ctx) {
    const player = getPlayer(ctx.from.id);

    await ctx.answerCbQuery?.();

    return ctx.reply(
        '🎒 *INVENTÁRIO*',
        {
            parse_mode: 'Markdown',
            ...inventoryMainMenu(player)
        }
    );
}

module.exports = {
    handleInventory,
    handleEquipManual,
    handleUnequipManual,
    showCategory
};