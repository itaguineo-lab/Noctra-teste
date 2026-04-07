const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');
const { inventoryMainMenu } = require('../menus/inventoryMenu');

const PAGE_SIZE = 5;

const CATEGORY_CONFIG = {
    weapons: {
        title: '⚔️ Armas',
        slots: ['weapon']
    },
    armors: {
        title: '🛡️ Armaduras',
        slots: ['armor']
    },
    jewelry: {
        title: '💎 Joias',
        slots: ['necklace', 'ring']
    },
    boots: {
        title: '👢 Botas',
        slots: ['boots']
    }
};

const RARITY_BADGES = {
    Comum: '⚪',
    Incomum: '🟢',
    Raro: '🔵',
    Épico: '🟣',
    Lendário: '🟠',
    Mítico: '🔴'
};

function escapeMarkdown(text = '') {
    return String(text).replace(/([_*[\]()])/g, '\\$1');
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function normalizePlayerState(player) {
    if (!player.equipment) player.equipment = {};
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];
    if (!player.consumables) player.consumables = {};
    return player;
}

function safeReplyMarkup(markupFactoryResult) {
    return markupFactoryResult || {};
}

async function sendScreen(ctx, text, options = {}) {
    const payload = {
        parse_mode: 'Markdown',
        ...options
    };

    try {
        if (ctx.callbackQuery?.message) {
            return await ctx.editMessageText(text, payload);
        }
        return await ctx.reply(text, payload);
    } catch (err) {
        try {
            return await ctx.reply(text, payload);
        } catch (err2) {
            console.error('Falha ao enviar tela de inventário:', err2);
        }
    }
}

async function safeAnswer(ctx, text = undefined, options = {}) {
    try {
        return await ctx.answerCbQuery(text, options);
    } catch (err) {
        return null;
    }
}

function calcItemPower(item) {
    if (!item || typeof item !== 'object') return 0;

    if (item.power !== undefined && item.power !== null && Number.isFinite(Number(item.power))) {
        return Math.max(1, Number(item.power));
    }

    const atk = safeNumber(item.atk);
    const def = safeNumber(item.def);
    const hp = safeNumber(item.hp);
    const crit = safeNumber(item.crit);

    return Math.max(1, Math.round((atk * 2) + (def * 1.5) + (hp * 0.5) + (crit * 3)));
}

function getPowerTier(power) {
    if (power <= 20) return 'Fraco';
    if (power <= 40) return 'Bom';
    if (power <= 70) return 'Forte';
    if (power <= 100) return 'Elite';
    return 'Lendário';
}

function getPowerBadge(power) {
    if (power <= 20) return '▫️';
    if (power <= 40) return '🔹';
    if (power <= 70) return '💎';
    if (power <= 100) return '🔥';
    return '👑';
}

function getPowerBar(power, width = 10) {
    const normalized = Math.max(0, Math.min(120, power));
    const filled = Math.max(1, Math.min(width, Math.round((normalized / 120) * width)));
    return `█`.repeat(filled) + `░`.repeat(width - filled);
}

function getRealSlot(item) {
    if (!item?.slot) return 'unknown';

    const validSlots = ['weapon', 'armor', 'necklace', 'ring', 'boots'];
    for (const validSlot of validSlots) {
        if (String(item.slot).startsWith(validSlot)) return validSlot;
    }

    return item.slot;
}

function getItemKey(item) {
    if (!item || typeof item !== 'object') return '';
    return String(
        item.id ??
        item._id ??
        item.instanceId ??
        `${item.slot || 'unknown'}|${item.name || 'item'}|${item.level || 0}|${item.atk || 0}|${item.def || 0}|${item.hp || 0}|${item.crit || 0}`
    );
}

function sameItem(a, b) {
    return getItemKey(a) === getItemKey(b);
}

function getComparisonDelta(item, player, slot) {
    const equipped = player?.equipment?.[slot];
    if (!equipped) return null;
    if (sameItem(equipped, item)) return 0;
    return calcItemPower(item) - calcItemPower(equipped);
}

function formatDelta(delta) {
    if (delta === null || delta === undefined) return '';
    if (delta === 0) return 'EQUIPADO';
    return delta > 0 ? `▲ +${delta}` : `▼ ${Math.abs(delta)}`;
}

function renderInventoryHeader(player) {
    const inventory = player.inventory || [];
    const maxInv = player.maxInventory || 20;

    const weapon = escapeMarkdown(player.equipment?.weapon?.name || '—');
    const armor = escapeMarkdown(player.equipment?.armor?.name || '—');
    const necklace = escapeMarkdown(player.equipment?.necklace?.name || '—');
    const ring = escapeMarkdown(player.equipment?.ring?.name || '—');
    const boots = escapeMarkdown(player.equipment?.boots?.name || '—');

    return `╔══════════════════════════════════╗
║            🎒 *INVENTÁRIO*            ║
╠══════════════════════════════════╣
║ 📦 ${inventory.length}/${maxInv}
║ ⚔️ ATK ${player.atk || 0}  🛡️ DEF ${player.def || 0}
║ ❤️ HP ${player.maxHp || 0}  💥 CRIT ${player.crit || 0}%
║ 💰 NOX ${player.nox || 0}
║ 🗝️ Chaves: ${player.keys || 0}
╠══════════════════════════════════╣
║ 🗡️ Arma: ${weapon}
║ 🛡️ Armadura: ${armor}
║ 💎 Amuleto: ${necklace}
║ 💍 Anel: ${ring}
║ 👢 Botas: ${boots}
╚══════════════════════════════════╝`;
}

function formatItemBlock(item, player = null) {
    const equipped = Boolean(item.__equipped);
    const star = equipped ? '⭐ ' : '';
    const rarityBadge = RARITY_BADGES[item.rarity] || '⚪';
    const level = item.level ? ` [Lv${item.level}]` : '';
    const power = calcItemPower(item);
    const tier = item.powerTier || getPowerTier(power);
    const powerBadge = getPowerBadge(power);
    const bar = getPowerBar(power);
    const slot = getRealSlot(item);
    const delta = player ? getComparisonDelta(item, player, slot) : null;
    const deltaText = equipped ? 'EQUIPADO' : formatDelta(delta);

    const line1 = `${star}${rarityBadge} ${escapeMarkdown(item.name)}${level}`;
    const line2 = `PODER ${power} ${powerBadge} ${bar} (${tier})${deltaText ? ` | ${deltaText}` : ''}`;
    const line3 = `ATK ${safeNumber(item.atk)} | DEF ${safeNumber(item.def)} | HP ${safeNumber(item.hp)} | CRIT ${safeNumber(item.crit)}%`;
    const line4 = `SLOT ${String(slot).toUpperCase()}`;

    return [line1, line2, line3, line4];
}

function getCategoryItems(player = {}, category = 'weapons') {
    const config = CATEGORY_CONFIG[category];
    if (!config) return [];

    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const equipment = player.equipment || {};

    const equippedItems = [];
    const equippedKeys = new Set();

    for (const slot of config.slots) {
        const equipped = equipment[slot];
        if (equipped) {
            equippedItems.push({ ...equipped, __equipped: true });
            equippedKeys.add(getItemKey(equipped));
        }
    }

    const inventoryItems = inventory
        .filter(item => config.slots.includes(getRealSlot(item)))
        .filter(item => !equippedKeys.has(getItemKey(item)))
        .map(item => ({ ...item, __equipped: false }))
        .sort((a, b) => calcItemPower(b) - calcItemPower(a));

    return [...equippedItems, ...inventoryItems];
}

function getPageItems(items, page) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;

    return {
        totalPages,
        page: safePage,
        start,
        items: items.slice(start, start + PAGE_SIZE)
    };
}

async function renderInventory(ctx, category = null, page = 1) {
    const player = normalizePlayerState(await getPlayer(ctx.from.id));

    if (!category) {
        return sendScreen(ctx, renderInventoryHeader(player), safeReplyMarkup(inventoryMainMenu(player)));
    }

    if (!CATEGORY_CONFIG[category]) {
        return sendScreen(ctx, 'Categoria inválida.', {});
    }

    const config = CATEGORY_CONFIG[category];
    const allItems = getCategoryItems(player, category);
    const { totalPages, page: safePage, start, items: pageItems } = getPageItems(allItems, page);

    let text = `${renderInventoryHeader(player)}\n\n`;
    text += `║ *${config.title}* — página ${safePage}/${totalPages}\n`;
    text += `╠══════════════════════════════════╣\n`;

    const buttons = [];

    if (pageItems.length === 0) {
        text += `║   Nenhum item encontrado.\n`;
    } else {
        pageItems.forEach((item, index) => {
            const realSlot = getRealSlot(item);
            const isEquipped = Boolean(item.__equipped);
            const [l1, l2, l3, l4] = formatItemBlock(item, player);

            text += `║ ${l1}\n`;
            text += `║ ${l2}\n`;
            text += `║ ${l3}\n`;
            text += `║ ${l4}\n`;
            text += `║\n`;

            if (isEquipped) {
                buttons.push([
                    Markup.button.callback(
                        `⭐ Desequipar ${escapeMarkdown(item.name)}`,
                        `uneq:${realSlot}:${category}:${safePage}`
                    )
                ]);
            } else {
                buttons.push([
                    Markup.button.callback(
                        `🔹 Equipar ${escapeMarkdown(item.name)}`,
                        `eq:${category}:${safePage}:${start + index}`
                    )
                ]);
            }
        });
    }

    text += `╚══════════════════════════════════╝`;

    const navRow = [];
    if (safePage > 1) navRow.push(Markup.button.callback('⬅️', `invpage:${category}:${safePage - 1}`));
    if (safePage < totalPages) navRow.push(Markup.button.callback('➡️', `invpage:${category}:${safePage + 1}`));
    if (navRow.length) buttons.push(navRow);

    buttons.push([Markup.button.callback('◀️ Voltar', 'inventory')]);

    return sendScreen(ctx, text, {
        ...Markup.inlineKeyboard(buttons)
    });
}

async function handleInventory(ctx) {
    await safeAnswer(ctx);
    return renderInventory(ctx);
}

async function handleInvWeapons(ctx) {
    await safeAnswer(ctx);
    return renderInventory(ctx, 'weapons', 1);
}

async function handleInvArmors(ctx) {
    await safeAnswer(ctx);
    return renderInventory(ctx, 'armors', 1);
}

async function handleInvJewelry(ctx) {
    await safeAnswer(ctx);
    return renderInventory(ctx, 'jewelry', 1);
}

async function handleInvBoots(ctx) {
    await safeAnswer(ctx);
    return renderInventory(ctx, 'boots', 1);
}

async function handleInvConsumables(ctx) {
    const player = normalizePlayerState(await getPlayer(ctx.from.id));
    const c = player.consumables || {};

    const text = `╔══════════════════════════════════╗
║            🧪 *CONSUMÍVEIS*          ║
╠══════════════════════════════════╣
║ ❤️ Poção de HP: ${c.potionHp || 0}
║ ⚡ Poção de Energia: ${c.potionEnergy || 0}
║ 💪 Tônico de Força: ${c.tonicStrength || 0}
║ 🛡️ Tônico de Defesa: ${c.tonicDefense || 0}
║ 🗝️ Chaves: ${player.keys || 0}
╚══════════════════════════════════╝`;

    const buttons = [];
    if (c.potionHp > 0) buttons.push([Markup.button.callback('❤️ Usar Poção de Vida', 'use_potion_outside_hp')]);
    buttons.push([Markup.button.callback('◀️ Voltar', 'inventory')]);

    return sendScreen(ctx, text, {
        ...Markup.inlineKeyboard(buttons)
    });
}

async function handleInvSouls(ctx) {
    const player = normalizePlayerState(await getPlayer(ctx.from.id));
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `╔══════════════════════════════════╗
║              💀 *ALMAS*              ║
╠══════════════════════════════════╣
║ *Inventário* (${souls.length})\n`;

    if (souls.length === 0) {
        text += `║   Nenhuma alma no inventário\n`;
    } else {
        souls.forEach(soul => {
            text += `║   🔹 ${escapeMarkdown(soul.name)} (${escapeMarkdown(soul.rarity || 'sem raridade')})\n`;
        });
    }

    text += `╠══════════════════════════════════╣
║ *Equipadas*\n`;

    equipped.forEach((soul, idx) => {
        text += soul
            ? `║   ⭐ Alma ${idx + 1}: ${escapeMarkdown(soul.name)}\n`
            : `║   ⬜ Slot ${idx + 1}: vazio\n`;
    });

    text += `╠══════════════════════════════════╣
║ 🗝️ Chaves: ${player.keys || 0}
╚══════════════════════════════════╝`;

    const rows = [];

    souls.forEach(soul => {
        rows.push([
            Markup.button.callback(
                `💀 Equipar ${escapeMarkdown(soul.name)}`,
                `equip_soul_${soul.instanceId || soul.id}`
            )
        ]);
    });

    equipped.forEach((soul, idx) => {
        if (soul) {
            rows.push([
                Markup.button.callback(
                    `⭐ Desequipar Alma ${idx + 1}`,
                    `unequip_soul_${idx}`
                )
            ]);
        }
    });

    rows.push([Markup.button.callback('◀️ Voltar', 'inventory')]);

    return sendScreen(ctx, text, {
        ...Markup.inlineKeyboard(rows)
    });
}

async function handleUsePotionOutside(ctx, type) {
    const player = normalizePlayerState(await getPlayer(ctx.from.id));
    const consumables = player.consumables || {};

    if (type === 'hp') {
        if (!consumables.potionHp || consumables.potionHp <= 0) {
            return safeAnswer(ctx, '❌ Você não tem poções de vida.', { show_alert: true });
        }
        if (player.hp >= player.maxHp) {
            return safeAnswer(ctx, '❤️ Seu HP já está cheio.', { show_alert: true });
        }

        consumables.potionHp--;
        const heal = Math.floor(player.maxHp * 0.4);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        player.consumables = consumables;

        await savePlayer(ctx.from.id, player);
        await safeAnswer(ctx, `🧪 Você usou uma poção e recuperou ${heal} HP!`, { show_alert: true });
        return handleInvConsumables(ctx);
    }

    return safeAnswer(ctx, 'Item inválido.', { show_alert: true });
}

async function equipByCurrentList(ctx, category, page, absoluteIndex) {
    const player = normalizePlayerState(await getPlayer(ctx.from.id));
    const allItems = getCategoryItems(player, category);

    const item = allItems[absoluteIndex];
    if (!item) {
        await safeAnswer(ctx, '⚠️ Lista desatualizada. Abra o inventário novamente.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    const slot = getRealSlot(item);
    if (!slot || slot === 'unknown') {
        await safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    const currentEquipped = player.equipment[slot];

    if (currentEquipped && !sameItem(currentEquipped, item)) {
        player.inventory.push({ ...currentEquipped, __equipped: false });
    }

    player.inventory = player.inventory.filter(invItem => !sameItem(invItem, item));
    player.equipment[slot] = { ...item, __equipped: true };

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await safeAnswer(ctx, `✅ ${item.name} equipado!`);
    return renderInventory(ctx, category, page);
}

async function unequipBySlot(ctx, slot, category, page) {
    const player = normalizePlayerState(await getPlayer(ctx.from.id));

    const item = player.equipment[slot];
    if (!item) {
        await safeAnswer(ctx, '❌ Nada equipado neste slot.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    player.inventory.push({ ...item, __equipped: false });
    player.equipment[slot] = null;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await safeAnswer(ctx, `✅ ${item.name} removido!`);
    return renderInventory(ctx, category, page);
}

async function handleEquipItem(ctx) {
    const raw = ctx.callbackQuery?.data || '';

    const match = raw.match(/^eq:(weapons|armors|jewelry|boots):(\d+):(\d+)$/);
    if (match) {
        const [, category, pageStr, indexStr] = match;
        return equipByCurrentList(ctx, category, Number(pageStr), Number(indexStr));
    }

    const legacy = raw.match(/^equip_(weapon|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/);
    if (legacy) {
        const [, slot, itemIdRaw] = legacy;
        const player = normalizePlayerState(await getPlayer(ctx.from.id));
        const inventory = player.inventory;

        const item = inventory.find(invItem => {
            return (
                getRealSlot(invItem) === slot &&
                String(invItem.id ?? invItem._id ?? invItem.instanceId) === String(itemIdRaw)
            );
        });

        if (!item) {
            console.error('[Equipar legado] Item NÃO encontrado:', raw);
            return safeAnswer(ctx, '❌ Item não encontrado no inventário.', { show_alert: true });
        }

        const currentEquipped = player.equipment[slot];
        if (currentEquipped && !sameItem(currentEquipped, item)) {
            player.inventory.push({ ...currentEquipped, __equipped: false });
        }

        player.inventory = player.inventory.filter(invItem => !sameItem(invItem, item));
        player.equipment[slot] = { ...item, __equipped: true };

        recalculateStats(player);
        await savePlayer(ctx.from.id, player);

        await safeAnswer(ctx, `✅ ${item.name} equipado!`);

        return renderInventory(
            ctx,
            slot === 'weapon' ? 'weapons' : slot === 'armor' ? 'armors' : (slot === 'boots' ? 'boots' : 'jewelry'),
            1
        );
    }

    console.error('[Equipar] Formato inválido:', raw);
    return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
}

async function handleUnequipItem(ctx) {
    const raw = ctx.callbackQuery?.data || '';

    const match = raw.match(/^uneq:(weapon|armor|necklace|ring|boots):(weapons|armors|jewelry|boots):(\d+)$/);
    if (match) {
        const [, slot, category, pageStr] = match;
        return unequipBySlot(ctx, slot, category, Number(pageStr));
    }

    const legacy = raw.match(/^unequip_(weapon|armor|necklace|ring|boots)$/);
    if (legacy) {
        const slot = legacy[1];
        const player = normalizePlayerState(await getPlayer(ctx.from.id));
        const item = player.equipment?.[slot];

        if (!item) {
            return safeAnswer(ctx, '❌ Nada equipado neste slot.', { show_alert: true });
        }

        player.inventory.push({ ...item, __equipped: false });
        player.equipment[slot] = null;

        recalculateStats(player);
        await savePlayer(ctx.from.id, player);

        await safeAnswer(ctx, `✅ ${item.name} removido!`);
        return renderInventory(
            ctx,
            slot === 'weapon' ? 'weapons' : slot === 'armor' ? 'armors' : (slot === 'boots' ? 'boots' : 'jewelry'),
            1
        );
    }

    console.error('[Desequipar] Formato inválido:', raw);
    return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
}

async function handleInventoryPage(ctx) {
    const match = ctx.callbackQuery?.data?.match(/^invpage:(weapons|armors|jewelry|boots):(\d+)$/);
    if (!match) {
        return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
    }

    const [, category, pageStr] = match;
    await safeAnswer(ctx);
    return renderInventory(ctx, category, Number(pageStr));
}

async function handleInventoryCategory(ctx) {
    const match = ctx.callbackQuery?.data?.match(/^invcat:(weapons|armors|jewelry|boots|consumables|skins|souls)$/);
    if (!match) {
        return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
    }

    const category = match[1];
    await safeAnswer(ctx);

    if (category === 'consumables') return handleInvConsumables(ctx);
    if (category === 'souls') return handleInvSouls(ctx);

    if (category === 'skins') {
        return sendScreen(ctx, '🎨 *Skins*\n\nEm breve.', {
            ...Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Voltar', 'inventory')]
            ])
        });
    }

    return renderInventory(ctx, category, 1);
}

async function handleEquipSoul(ctx) {
    const soulId = ctx.match?.[1];
    const player = normalizePlayerState(await getPlayer(ctx.from.id));

    const soulIndex = player.soulsInventory.findIndex(
        s => String(s.instanceId || s.id) === String(soulId)
    );

    if (soulIndex === -1) {
        return safeAnswer(ctx, 'Alma não encontrada.', { show_alert: true });
    }

    const soul = player.soulsInventory[soulIndex];

    if ((player.soulsEquipped || []).some(s => s && String(s.instanceId || s.id) === String(soulId))) {
        return safeAnswer(ctx, '⚠️ Já equipada.', { show_alert: true });
    }

    const emptySlot = player.soulsEquipped.findIndex(s => !s);
    if (emptySlot === -1) {
        return safeAnswer(ctx, 'Slots de almas cheios.', { show_alert: true });
    }

    player.soulsInventory.splice(soulIndex, 1);
    player.soulsEquipped[emptySlot] = soul;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await safeAnswer(ctx, `💀 ${soul.name} equipada!`);
    return handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const slotIdx = parseInt(ctx.match?.[1], 10);
    const player = normalizePlayerState(await getPlayer(ctx.from.id));
    const soul = player.soulsEquipped?.[slotIdx];

    if (!soul) {
        return safeAnswer(ctx, 'Nada equipado.', { show_alert: true });
    }

    const alreadyInInventory = player.soulsInventory.some(
        s => String(s.instanceId || s.id) === String(soul.instanceId || soul.id)
    );

    if (!alreadyInInventory) {
        player.soulsInventory.push(soul);
    }

    player.soulsEquipped[slotIdx] = null;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await safeAnswer(ctx, `💀 ${soul.name} removida e devolvida!`);
    return handleInvSouls(ctx);
}

module.exports = {
    renderInventory,
    handleInventory,
    handleInvWeapons,
    handleInvArmors,
    handleInvJewelry,
    handleInvBoots,
    handleInvConsumables,
    handleInvSouls,
    handleEquipItem,
    handleUnequipItem,
    handleInventoryPage,
    handleInventoryCategory,
    handleEquipSoul,
    handleUnequipSoul,
    handleUsePotionOutside
};