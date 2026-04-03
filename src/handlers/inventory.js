const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const { Markup } = require('telegraf');
const {
    inventoryMainMenu
} = require('../menus/inventoryMenu');

const EQUIPABLE_SLOTS = ['weapon', 'armor', 'necklace', 'ring', 'boots'];

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

function safeText(value) {
    return value && String(value).trim().length ? String(value) : '—';
}

function getCategoryConfig(category) {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.weapon;
}

function getCategoryItems(player, category) {
    const inventory = player.inventory || [];
    const cosmetics = player.cosmetics || [];
    const souls = player.soulsInventory || [];
    const consumables = player.consumables || {};

    switch (category) {
        case 'weapon':
            return inventory.filter(item => item.slot === 'weapon');

        case 'armor':
            return inventory.filter(item => item.slot === 'armor');

        case 'jewelry':
            return inventory.filter(item => ['ring', 'necklace'].includes(item.slot));

        case 'skin':
            return cosmetics.map(cosmetic => ({
                id: cosmetic.id,
                name: cosmetic.name,
                slot: 'skin',
                rarity: 'Cosmético',
                emoji: '🎨',
                atk: 0,
                def: 0,
                hp: 0,
                crit: 0
            }));

        case 'consumable': {
            const list = [];

            if ((consumables.potionHp || 0) > 0) {
                list.push({
                    id: 'consumable_potionHp',
                    name: 'Poção de Vida',
                    slot: 'consumable',
                    rarity: 'Consumível',
                    emoji: '❤️',
                    qty: consumables.potionHp
                });
            }

            if ((consumables.potionEnergy || 0) > 0) {
                list.push({
                    id: 'consumable_potionEnergy',
                    name: 'Poção de Energia',
                    slot: 'consumable',
                    rarity: 'Consumível',
                    emoji: '⚡',
                    qty: consumables.potionEnergy
                });
            }

            if ((consumables.tonicStrength || 0) > 0) {
                list.push({
                    id: 'consumable_tonicStrength',
                    name: 'Tônico de Força',
                    slot: 'consumable',
                    rarity: 'Consumível',
                    emoji: '💪',
                    qty: consumables.tonicStrength
                });
            }

            if ((consumables.tonicDefense || 0) > 0) {
                list.push({
                    id: 'consumable_tonicDefense',
                    name: 'Tônico de Defesa',
                    slot: 'consumable',
                    rarity: 'Consumível',
                    emoji: '🛡️',
                    qty: consumables.tonicDefense
                });
            }

            return list;
        }

        case 'soul':
            return souls;

        default:
            return [];
    }
}

function getEquippedBySlot(player, slot) {
    return (player.equipment || {})[slot] || null;
}

function getCategoryEquippedSummary(player, category) {
    const parts = [];

    if (category === 'weapon') {
        const item = getEquippedBySlot(player, 'weapon');
        parts.push(`⚔️ Arma: ${item ? `${item.emoji || '⚪'} ${item.name}` : '—'}`);
    }

    if (category === 'armor') {
        const item = getEquippedBySlot(player, 'armor');
        parts.push(`🛡️ Armadura: ${item ? `${item.emoji || '⚪'} ${item.name}` : '—'}`);
    }

    if (category === 'jewelry') {
        const ring = getEquippedBySlot(player, 'ring');
        const necklace = getEquippedBySlot(player, 'necklace');

        parts.push(`💍 Anel: ${ring ? `${ring.emoji || '⚪'} ${ring.name}` : '—'}`);
        parts.push(`📿 Colar: ${necklace ? `${necklace.emoji || '⚪'} ${necklace.name}` : '—'}`);
    }

    if (category === 'skin') {
        const cosmetics = player.cosmetics || [];
        parts.push(`🎨 Skins desbloqueadas: ${cosmetics.length}`);
    }

    if (category === 'consumable') {
        const consumables = player.consumables || {};
        parts.push(`❤️ Poção de Vida: ${consumables.potionHp || 0}`);
        parts.push(`⚡ Poção de Energia: ${consumables.potionEnergy || 0}`);
        parts.push(`💪 Tônico de Força: ${consumables.tonicStrength || 0}`);
        parts.push(`🛡️ Tônico de Defesa: ${consumables.tonicDefense || 0}`);
    }

    if (category === 'soul') {
        const souls = player.soulsEquipped || [null, null];
        parts.push(`💀 Slot 1: ${souls[0] ? souls[0].name : '—'}`);
        parts.push(`💀 Slot 2: ${souls[1] ? souls[1].name : '—'}`);
    }

    return parts.join('\n');
}

function formatItemCard(item, index, isEquipped = false) {
    const stats = [];

    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);

    const rarity = item.rarity ? ` • ${item.rarity}` : '';
    const equipped = isEquipped ? ' ✅ Equipado' : '';
    const qty = item.qty ? ` • x${item.qty}` : '';

    return `${index + 1}. ${item.emoji || '⚪'} ${safeText(item.name)}${rarity}${qty}${equipped}\n   ${stats.length ? stats.join(' | ') : 'Sem stats'}`;
}

function buildCategoryKeyboard(player, category, items) {
    const config = getCategoryConfig(category);
    const rows = [];

    if (config.interactive) {
        const equippedSlots = config.slots || [];

        equippedSlots.forEach(slot => {
            const equippedItem = getEquippedBySlot(player, slot);

            if (equippedItem) {
                rows.push([
                    Markup.button.callback(
                        `➖ Desequipar ${equippedItem.name}`,
                        `unequip_manual_${slot}`
                    )
                ]);
            }
        });

        items.forEach(item => {
            const equippedItem = getEquippedBySlot(player, item.slot);
            const isEquipped = equippedItem && String(equippedItem.id) === String(item.id);

            if (isEquipped) {
                rows.push([
                    Markup.button.callback(
                        `✅ ${item.name}`,
                        `unequip_manual_${item.slot}`
                    )
                ]);
            } else {
                rows.push([
                    Markup.button.callback(
                        `✨ Equipar ${item.name}`,
                        `equip_manual_${item.id}`
                    )
                ]);
            }
        });
    }

    rows.push([
        Markup.button.callback('◀️ Voltar', 'inventory')
    ]);

    return Markup.inlineKeyboard(rows);
}

function buildCategoryText(player, category, items) {
    const config = getCategoryConfig(category);
    const currentSummary = getCategoryEquippedSummary(player, category);
    const equipment = player.equipment || {};

    let text = `🎒 *INVENTÁRIO*\n`;
    text += `*${config.title}*\n\n`;

    text += `📊 *Build atual*\n`;
    text += `⚔️ ATK ${player.atk || 0} | 🛡️ DEF ${player.def || 0} | ❤️ HP ${player.maxHp || 0} | 💥 CRIT ${player.crit || 0}%\n\n`;

    if (currentSummary) {
        text += `*Equipado agora*\n${currentSummary}\n\n`;
    }

    if (!items.length) {
        text += `Nenhum item nesta categoria.`;
        return text;
    }

    text += `*Itens disponíveis*\n\n`;

    items.forEach((item, index) => {
        const equippedItem = item.slot && equipment[item.slot];
        const isEquipped = equippedItem && String(equippedItem.id) === String(item.id);
        text += `${formatItemCard(item, index, isEquipped)}\n\n`;
    });

    return text.trimEnd();
}

async function renderInventoryHome(ctx, player) {
    const equippedWeapon = player.equipment?.weapon;
    const equippedArmor = player.equipment?.armor;
    const ring = player.equipment?.ring;
    const necklace = player.equipment?.necklace;

    let text = `🎒 *INVENTÁRIO*\n\n`;
    text += `⚔️ Arma: ${equippedWeapon ? `${equippedWeapon.emoji || '⚪'} ${equippedWeapon.name}` : '—'}\n`;
    text += `🛡️ Armadura: ${equippedArmor ? `${equippedArmor.emoji || '⚪'} ${equippedArmor.name}` : '—'}\n`;
    text += `💍 Anel: ${ring ? `${ring.emoji || '⚪'} ${ring.name}` : '—'}\n`;
    text += `📿 Colar: ${necklace ? `${necklace.emoji || '⚪'} ${necklace.name}` : '—'}\n\n`;
    text += `Escolha uma categoria para gerenciar sua build.`;

    return ctx.reply(text, {
        parse_mode: 'Markdown',
        ...inventoryMainMenu(player)
    });
}

async function handleInventory(ctx) {
    const player = getPlayer(ctx.from.id);

    if (ctx.callbackQuery) {
        try {
            await ctx.answerCbQuery();
            return ctx.editMessageText(
                `🎒 *INVENTÁRIO*\n\nEscolha uma categoria para gerenciar sua build.`,
                {
                    parse_mode: 'Markdown',
                    ...inventoryMainMenu(player)
                }
            );
        } catch {
            return renderInventoryHome(ctx, player);
        }
    }

    return renderInventoryHome(ctx, player);
}

async function showCategory(ctx, category, title, options = {}) {
    const player = getPlayer(ctx.from.id);
    const config = getCategoryConfig(category);
    const items = getCategoryItems(player, category);

    if (!options.skipAnswer && ctx.callbackQuery) {
        await ctx.answerCbQuery();
    }

    const text = buildCategoryText(player, category, items);
    const keyboard = buildCategoryKeyboard(player, category, items);

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

function getBestItemForSlot(items, slot) {
    const slotItems = items.filter(item => item.slot === slot);

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

async function handleAutoEquip(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    const slots = ['weapon', 'armor', 'ring', 'necklace', 'boots'];
    let equipped = 0;

    slots.forEach(slot => {
        const best = getBestItemForSlot(player.inventory || [], slot);

        if (best) {
            player.equipment[slot] = best;
            equipped++;
        }
    });

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    const message =
        `✨ ${equipped} item(ns) equipados automaticamente!\n` +
        `🧠 Sua build foi atualizada.`;

    try {
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...inventoryMainMenu(player)
        });
    } catch {
        await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...inventoryMainMenu(player)
        });
    }
}

async function handleEquipManual(ctx) {
    await ctx.answerCbQuery();

    const itemId = ctx.match?.[1];
    const player = getPlayer(ctx.from.id);

    const item = (player.inventory || []).find(
        i => String(i.id) === String(itemId)
    );

    if (!item) {
        return ctx.answerCbQuery('❌ Item não encontrado.', {
            show_alert: true
        });
    }

    if (!EQUIPABLE_SLOTS.includes(item.slot)) {
        return ctx.answerCbQuery('❌ Esse item não pode ser equipado.', {
            show_alert: true
        });
    }

    player.equipment[item.slot] = item;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    const category =
        item.slot === 'weapon' ? 'weapon' :
        item.slot === 'armor' ? 'armor' :
        ['ring', 'necklace'].includes(item.slot) ? 'jewelry' :
        'weapon';

    const title =
        category === 'weapon' ? '⚔️ Armas' :
        category === 'armor' ? '🛡️ Armaduras' :
        '💍 Jóias';

    await ctx.answerCbQuery(`✅ ${item.name} equipado!`, {
        show_alert: false
    });

    return showCategory(ctx, category, title, { skipAnswer: true });
}

async function handleUnequipManual(ctx) {
    await ctx.answerCbQuery();

    const slot = ctx.match?.[1];
    const player = getPlayer(ctx.from.id);

    if (!slot || !player.equipment?.[slot]) {
        return ctx.answerCbQuery('❌ Nada equipado nesse slot.', {
            show_alert: true
        });
    }

    player.equipment[slot] = null;

    recalculateStats(player);
    savePlayer(ctx.from.id, player);

    const category =
        slot === 'weapon' ? 'weapon' :
        slot === 'armor' ? 'armor' :
        ['ring', 'necklace'].includes(slot) ? 'jewelry' :
        'weapon';

    const title =
        category === 'weapon' ? '⚔️ Armas' :
        category === 'armor' ? '🛡️ Armaduras' :
        '💍 Jóias';

    await ctx.answerCbQuery('✅ Item desequipado!', {
        show_alert: false
    });

    return showCategory(ctx, category, title, { skipAnswer: true });
}

module.exports = {
    handleInventory,
    handleAutoEquip,
    handleEquipManual,
    handleUnequipManual,
    showCategory
};