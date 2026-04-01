const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');

const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory'];
const SOUL_SLOTS = 2;

function ensurePlayerState(player) {
    if (!player.equipment) {
        player.equipment = {};
    }

    for (const slot of ['weapon', 'armor', 'accessory', 'shield', 'ring', 'necklace', 'quiver', 'backpack']) {
        if (!Object.prototype.hasOwnProperty.call(player.equipment, slot)) {
            player.equipment[slot] = null;
        }
    }

    if (!Array.isArray(player.soulsEquipped)) {
        player.soulsEquipped = [null, null];
    }

    if (!Array.isArray(player.soulsInventory)) {
        player.soulsInventory = [];
    }

    if (!player.consumables) {
        player.consumables = {
            potionHp: 0,
            potionEnergy: 0,
            tonicStrength: 0,
            tonicDefense: 0
        };
    }

    if (!player.maxInventory) {
        player.maxInventory = player.vip ? 30 : 20;
    }

    return player;
}

async function safeReply(ctx, text, keyboard) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery();
            return await ctx.editMessageText(text, {
                parse_mode: 'Markdown',
                ...keyboard
            });
        }

        return await ctx.reply(text, {
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

function formatStats(item) {
    const parts = [];

    if (item.atk) parts.push(`⚔️ +${item.atk}`);
    if (item.def) parts.push(`🛡️ +${item.def}`);
    if (item.hp) parts.push(`❤️ +${item.hp}`);
    if (item.crit) parts.push(`✨ +${item.crit}%`);

    return parts.length ? ` (${parts.join(' | ')})` : '';
}

function slotLabel(slot) {
    const labels = {
        weapon: 'Arma',
        armor: 'Armadura',
        accessory: 'Jóia'
    };

    return labels[slot] || slot;
}

function buildHeader(player) {
    ensurePlayerState(player);
    recalculateStats(player);

    const invCount = player.inventory.length;
    const maxInv = player.maxInventory || (player.vip ? 30 : 20);
    const soulsEquippedCount = player.soulsEquipped.filter(Boolean).length;

    return `🎒 *INVENTÁRIO* (${invCount}/${maxInv})

⚔️ ATK: ${player.atk}
🛡️ DEF: ${player.def}
❤️ HP: ${player.maxHp}
✨ CRIT: ${player.crit}%

⚔️ Arma: ${player.equipment.weapon?.name || '—'}
🛡️ Armadura: ${player.equipment.armor?.name || '—'}
💎 Jóia: ${player.equipment.accessory?.name || '—'}
💀 Almas equipadas: ${soulsEquippedCount}/${SOUL_SLOTS}`;
}

function rootKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('⚔️ Armas', 'inv_weapons'),
            Markup.button.callback('🛡️ Armaduras', 'inv_armors')
        ],
        [
            Markup.button.callback('💎 Jóias', 'inv_jewelry'),
            Markup.button.callback('🧪 Consumíveis', 'inv_consumables')
        ],
        [
            Markup.button.callback('💀 Almas', 'inv_souls')
        ],
        [
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

function categoryKeyboard(slot, items, player) {
    const rows = [];

    if (items.length) {
        for (const item of items) {
            const equipped = player.equipment?.[slot]?.id === item.id;

            rows.push([
                Markup.button.callback(
                    equipped
                        ? `✅ Desequipar ${item.name}${formatStats(item)}`
                        : `⚔️ Equipar ${item.name}${formatStats(item)}`,
                    equipped
                        ? `unequip_${slot}`
                        : `equip_${slot}_${item.id}`
                )
            ]);
        }
    }

    rows.push([
        Markup.button.callback('⬅️ Voltar', 'inventory'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function handleInventory(ctx) {
    const player = ensurePlayerState(getPlayer(ctx.from.id));

    return safeReply(
        ctx,
        `${buildHeader(player)}

Escolha uma categoria:`,
        rootKeyboard()
    );
}

async function renderCategory(ctx, slot, title, emoji) {
    const player = ensurePlayerState(getPlayer(ctx.from.id));
    const items = player.inventory.filter(item => item.slot === slot);

    let text = `${buildHeader(player)}

${emoji} *${title}*

_Toque no item para equipar ou desequipar._`;

    if (!items.length) {
        text += `

_Nenhum item nesta categoria._`;
    } else {
        text += `

*Itens disponíveis:*`;
        items.forEach((item) => {
            const equipped = player.equipment?.[slot]?.id === item.id ? ' ★ equipado' : '';
            text += `
• *${item.name}*${equipped}${formatStats(item)}`;
        });
    }

    return safeReply(
        ctx,
        text,
        categoryKeyboard(slot, items, player)
    );
}

async function handleInvWeapons(ctx) {
    return renderCategory(ctx, 'weapon', 'ARMAS', '⚔️');
}

async function handleInvArmors(ctx) {
    return renderCategory(ctx, 'armor', 'ARMADURAS', '🛡️');
}

async function handleInvJewelry(ctx) {
    return renderCategory(ctx, 'accessory', 'JÓIAS', '💎');
}

async function handleInvConsumables(ctx) {
    const player = ensurePlayerState(getPlayer(ctx.from.id));
    const c = player.consumables || {};

    const text = `${buildHeader(player)}

🧪 *CONSUMÍVEIS*

❤️ Poção de HP: ${c.potionHp || 0}
⚡ Poção de Energia: ${c.potionEnergy || 0}
💪 Tônico de Força: ${c.tonicStrength || 0}
🛡️ Tônico de Defesa: ${c.tonicDefense || 0}`;

    return safeReply(ctx, text, rootKeyboard());
}

async function handleInvSouls(ctx) {
    const player = ensurePlayerState(getPlayer(ctx.from.id));
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `${buildHeader(player)}

💀 *ALMAS*

*Slots equipados:*`;

    equipped.forEach((soul, index) => {
        text += `
${index + 1}. ${soul ? `${soul.emoji || '💀'} *${soul.name}* (${soul.rarity || 'Comum'})` : '⬜ Slot vazio'}`;
    });

    text += `

*Almas no inventário:*`;

    if (!souls.length) {
        text += `
_Nenhuma alma encontrada._`;
    } else {
        souls.forEach((soul) => {
            const equippedIndex = equipped.findIndex(eq => eq && String((eq.instanceId || eq.id)) === String((soul.instanceId || soul.id)));

            text += `
• ${soul.emoji || '💀'} *${soul.name}* (${soul.rarity || 'Comum'})${equippedIndex !== -1 ? ` ★ no slot ${equippedIndex + 1}` : ''}${formatStats(soul)}`;
        });
    }

    const rows = [];

    equipped.forEach((soul, index) => {
        if (soul) {
            rows.push([
                Markup.button.callback(
                    `🔄 Desequipar ${soul.name}`,
                    `unequip_soul_${index}`
                )
            ]);
        }
    });

    souls.forEach((soul) => {
        const isEquipped = equipped.some(eq => eq && String((eq.instanceId || eq.id)) === String((soul.instanceId || soul.id)));
        if (!isEquipped) {
            rows.push([
                Markup.button.callback(
                    `💀 Equipar ${soul.name}`,
                    `equip_soul_${soul.instanceId || soul.id}`
                )
            ]);
        }
    });

    rows.push([
        Markup.button.callback('⬅️ Voltar', 'inventory'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return safeReply(ctx, text, Markup.inlineKeyboard(rows));
}

async function handleEquipItem(ctx) {
    const match = ctx.callbackQuery?.data.match(/^equip_(weapon|armor|accessory)_(.+)$/);

    if (!match) {
        return ctx.answerCbQuery('❌ Ação inválida', { show_alert: true });
    }

    const slot = match[1];
    const itemId = match[2];

    const player = ensurePlayerState(getPlayer(ctx.from.id));
    const item = player.inventory.find(i => String(i.id) === String(itemId) && i.slot === slot);

    if (!item) {
        return ctx.answerCbQuery('❌ Item não encontrado', { show_alert: true });
    }

    const current = player.equipment[slot];
    if (current && String(current.id) === String(item.id)) {
        return ctx.answerCbQuery('⚠️ Este item já está equipado', { show_alert: true });
    }

    player.equipment[slot] = item;

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`⚡ ${item.name} equipado`);

    const meta = {
        weapon: ['ARMAS', '⚔️'],
        armor: ['ARMADURAS', '🛡️'],
        accessory: ['JÓIAS', '💎']
    }[slot];

    if (meta) {
        return renderCategory(ctx, slot, meta[0], meta[1]);
    }

    return handleInventory(ctx);
}

async function handleUnequipItem(ctx) {
    const match = ctx.callbackQuery?.data.match(/^unequip_(weapon|armor|accessory)$/);

    if (!match) {
        return ctx.answerCbQuery('❌ Ação inválida', { show_alert: true });
    }

    const slot = match[1];

    const player = ensurePlayerState(getPlayer(ctx.from.id));
    const current = player.equipment[slot];

    if (!current) {
        return ctx.answerCbQuery('❌ Nada equipado neste slot', { show_alert: true });
    }

    player.equipment[slot] = null;

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`⭐ ${current.name} removido`);

    const meta = {
        weapon: ['ARMAS', '⚔️'],
        armor: ['ARMADURAS', '🛡️'],
        accessory: ['JÓIAS', '💎']
    }[slot];

    if (meta) {
        return renderCategory(ctx, slot, meta[0], meta[1]);
    }

    return handleInventory(ctx);
}

async function handleEquipSoul(ctx) {
    const match = ctx.callbackQuery?.data.match(/^equip_soul_(.+)$/);

    if (!match) {
        return ctx.answerCbQuery('❌ Ação inválida', { show_alert: true });
    }

    const soulId = match[1];

    const player = ensurePlayerState(getPlayer(ctx.from.id));
    const soul = player.soulsInventory.find(
        s => String(s.instanceId || s.id) === String(soulId)
    );

    if (!soul) {
        return ctx.answerCbQuery('❌ Alma não encontrada', { show_alert: true });
    }

    const alreadyEquipped = player.soulsEquipped.some(
        eq => eq && String(eq.instanceId || eq.id) === String(soul.instanceId || soul.id)
    );

    if (alreadyEquipped) {
        return ctx.answerCbQuery('⚠️ Esta alma já está equipada', { show_alert: true });
    }

    const emptySlot = player.soulsEquipped.findIndex(s => !s);

    if (emptySlot === -1) {
        return ctx.answerCbQuery('❌ Slots de almas cheios', { show_alert: true });
    }

    player.soulsEquipped[emptySlot] = soul;

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`💀 ${soul.name} equipada`);

    return handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const match = ctx.callbackQuery?.data.match(/^unequip_soul_(\d+)$/);

    if (!match) {
        return ctx.answerCbQuery('❌ Ação inválida', { show_alert: true });
    }

    const slotIndex = Number(match[1]);

    const player = ensurePlayerState(getPlayer(ctx.from.id));

    if (!player.soulsEquipped[slotIndex]) {
        return ctx.answerCbQuery('❌ Nada equipado neste slot', { show_alert: true });
    }

    const soul = player.soulsEquipped[slotIndex];
    player.soulsEquipped[slotIndex] = null;

    recalculateStats(player);
    if (player.hp > player.maxHp) player.hp = player.maxHp;

    savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`💀 ${soul.name} removida`);

    return handleInvSouls(ctx);
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