const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const { Markup } = require('telegraf');
const {
    inventoryMainMenu
} = require('../menus/inventoryMenu');

const EQUIPABLE_SLOTS = [
    'weapon',
    'armor',
    'necklace',
    'ring',
    'boots'
];

const CATEGORY_CONFIG = {
    weapon: {
        title: '⚔️ Armas',
        slots: ['weapon'],
        interactive: true
    },
    armor: {
        title: '🛡️ Armaduras',
        slots: ['armor'],
        interactive: true
    },
    jewelry: {
        title: '💍 Jóias',
        slots: ['ring', 'necklace'],
        interactive: true
    },
    skin: {
        title: '🎨 Skins',
        slots: ['skin'],
        interactive: false
    },
    consumable: {
        title: '🧪 Consumíveis',
        slots: ['consumable'],
        interactive: false
    },
    soul: {
        title: '💀 Almas',
        slots: ['soul'],
        interactive: false
    }
};

function getCategoryConfig(category) {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.weapon;
}

function getCategoryItems(player, category) {
    const inventory = player.inventory || [];

    switch (category) {
        case 'weapon':
            return inventory.filter(
                item => item.slot === 'weapon'
            );

        case 'armor':
            return inventory.filter(
                item => item.slot === 'armor'
            );

        case 'jewelry':
            return inventory.filter(item =>
                ['ring', 'necklace'].includes(
                    item.slot
                )
            );

        case 'skin':
            return inventory.filter(
                item => item.slot === 'skin'
            );

        case 'consumable':
            return inventory.filter(
                item => item.slot === 'consumable'
            );

        case 'soul':
            return player.soulsInventory || [];

        default:
            return [];
    }
}

function getEquippedBySlot(player, slot) {
    return player.equipment?.[slot] || null;
}

function formatItem(item, isEquipped = false) {
    const stats = [];

    if (item.atk)
        stats.push(`⚔️ +${item.atk}`);
    if (item.def)
        stats.push(`🛡️ +${item.def}`);
    if (item.hp)
        stats.push(`❤️ +${item.hp}`);
    if (item.crit)
        stats.push(`💥 +${item.crit}%`);

    return `${item.emoji || '⚪'} ${
        item.name
    } ${isEquipped ? '✅' : ''}
${stats.join(' | ') || 'Sem bônus'}`;
}

function buildCategoryText(
    player,
    category,
    items
) {
    const config = getCategoryConfig(category);

    let text = `🎒 *${config.title}*\n\n`;

    if (!items.length) {
        text += 'Nenhum item nesta categoria.';
        return text;
    }

    items.forEach(item => {
        const equipped =
            getEquippedBySlot(
                player,
                item.slot
            );

        const isEquipped =
            equipped &&
            String(equipped.id) ===
                String(item.id);

        text += `${formatItem(
            item,
            isEquipped
        )}\n\n`;
    });

    return text;
}

function buildCategoryKeyboard(
    player,
    category,
    items
) {
    const rows = [];

    items.forEach(item => {
        const equipped =
            getEquippedBySlot(
                player,
                item.slot
            );

        const isEquipped =
            equipped &&
            String(equipped.id) ===
                String(item.id);

        if (
            CATEGORY_CONFIG[category]
                .interactive
        ) {
            rows.push([
                isEquipped
                    ? Markup.button.callback(
                          `➖ Desequipar ${item.name}`,
                          `unequip_manual_${item.slot}`
                      )
                    : Markup.button.callback(
                          `✨ Equipar ${item.name}`,
                          `equip_manual_${item.id}`
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

async function handleInventory(ctx) {
    const player = getPlayer(
        ctx.from.id
    );

    await ctx.answerCbQuery?.();

    return ctx.reply(
        '🎒 *INVENTÁRIO*\n\nEscolha uma categoria:',
        {
            parse_mode: 'Markdown',
            ...inventoryMainMenu(player)
        }
    );
}

async function showCategory(
    ctx,
    category,
    title,
    options = {}
) {
    const player = getPlayer(
        ctx.from.id
    );

    if (
        !options.skipAnswer &&
        ctx.callbackQuery
    ) {
        await ctx.answerCbQuery();
    }

    const items = getCategoryItems(
        player,
        category
    );

    const text = buildCategoryText(
        player,
        category,
        items
    );

    const keyboard =
        buildCategoryKeyboard(
            player,
            category,
            items
        );

    try {
        return await ctx.editMessageText(
            text,
            {
                parse_mode: 'Markdown',
                ...keyboard
            }
        );
    } catch {
        return await ctx.reply(text, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

function getBestItemForSlot(
    items,
    slot
) {
    const slotItems = items.filter(
        item => item.slot === slot
    );

    if (!slotItems.length) return null;

    return slotItems.sort((a, b) => {
        const scoreA =
            (a.atk || 0) * 2 +
            (a.def || 0) * 1.5 +
            (a.hp || 0) +
            (a.crit || 0) * 2;

        const scoreB =
            (b.atk || 0) * 2 +
            (b.def || 0) * 1.5 +
            (b.hp || 0) +
            (b.crit || 0) * 2;

        return scoreB - scoreA;
    })[0];
}

async function handleAutoEquip(
    ctx
) {
    await ctx.answerCbQuery();

    const player = getPlayer(
        ctx.from.id
    );

    let equipped = 0;

    EQUIPABLE_SLOTS.forEach(slot => {
        const best =
            getBestItemForSlot(
                player.inventory || [],
                slot
            );

        if (best) {
            player.equipment[slot] =
                best;
            equipped++;
        }
    });

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    return ctx.reply(
        `✨ ${equipped} item(ns) equipados automaticamente!`
    );
}

async function handleEquipManual(
    ctx
) {
    await ctx.answerCbQuery();

    const itemId = ctx.match?.[1];

    const player = getPlayer(
        ctx.from.id
    );

    const item = (
        player.inventory || []
    ).find(
        i =>
            String(i.id) ===
            String(itemId)
    );

    if (!item) {
        return ctx.answerCbQuery(
            '❌ Item não encontrado.',
            { show_alert: true }
        );
    }

    player.equipment[item.slot] =
        item;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    const category =
        item.slot === 'weapon'
            ? 'weapon'
            : item.slot === 'armor'
            ? 'armor'
            : 'jewelry';

    const title =
        category === 'weapon'
            ? '⚔️ Armas'
            : category === 'armor'
            ? '🛡️ Armaduras'
            : '💍 Jóias';

    return showCategory(
        ctx,
        category,
        title,
        {
            skipAnswer: true
        }
    );
}

async function handleUnequipManual(
    ctx
) {
    const slot = ctx.match?.[1];

    const player = getPlayer(
        ctx.from.id
    );

    if (!slot) {
        return ctx.answerCbQuery(
            '❌ Slot inválido.',
            { show_alert: true }
        );
    }

    if (!player.equipment) {
        player.equipment = {};
    }

    const equippedItem =
        player.equipment[slot];

    if (!equippedItem) {
        return ctx.answerCbQuery(
            '❌ Nenhum item equipado.',
            { show_alert: true }
        );
    }

    // LIMPEZA REAL DO SLOT
    delete player.equipment[slot];
    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    const category =
        slot === 'weapon'
            ? 'weapon'
            : slot === 'armor'
            ? 'armor'
            : 'jewelry';

    const title =
        category === 'weapon'
            ? '⚔️ Armas'
            : category === 'armor'
            ? '🛡️ Armaduras'
            : '💍 Jóias';

    return showCategory(
        ctx,
        category,
        title,
        {
            skipAnswer: true
        }
    );
}

module.exports = {
    handleInventory,
    handleAutoEquip,
    handleEquipManual,
    handleUnequipManual,
    showCategory
};