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

function renderInventoryHeader(player) {
    const inventory = player.inventory || [];
    const maxInv = player.maxInventory || 20;

    const weapon = player.equipment?.weapon?.name || '—';
    const armor = player.equipment?.armor?.name || '—';
    const necklace = player.equipment?.necklace?.name || '—';
    const ring = player.equipment?.ring?.name || '—';
    const boots = player.equipment?.boots?.name || '—';

    return `╔══════════════════════════════════╗
║            🎒 *INVENTÁRIO*            ║
╠══════════════════════════════════╣
║ 📦 ${inventory.length}/${maxInv}
║ ⚔️ ATK ${player.atk || 0}  🛡️ DEF ${player.def || 0}
║ ❤️ HP ${player.maxHp || 0}  💥 CRIT ${player.crit || 0}%
║ 🗝️ Chaves: ${player.keys || 0}
╠══════════════════════════════════╣
║ 🗡️ Arma: ${weapon}
║ 🛡️ Armadura: ${armor}
║ 💎 Amuleto: ${necklace}
║ 💍 Anel: ${ring}
║ 👢 Botas: ${boots}
╚══════════════════════════════════╝`;
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function calcItemPower(item) {
    if (!item || typeof item !== 'object') return 0;

    if (Number.isFinite(Number(item.power))) {
        return Number(item.power);
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

function getRealSlot(item) {
    if (!item?.slot) return 'unknown';

    const validSlots = ['weapon', 'armor', 'necklace', 'ring', 'boots'];
    for (const validSlot of validSlots) {
        if (item.slot.startsWith(validSlot)) return validSlot;
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

function formatItemBlock(item, equipped = false, player = null) {
    const star = equipped ? '⭐ ' : '';
    const rarityBadge = RARITY_BADGES[item.rarity] || '⚪';
    const level = item.level ? ` [Lv${item.level}]` : '';
    const power = calcItemPower(item);
    const tier = item.powerTier || getPowerTier(power);
    const slot = getRealSlot(item);
    const delta = player ? getComparisonDelta(item, player, slot) : null;
    const deltaText = equipped ? 'EQUIPADO' : formatDelta(delta);

    const line1 = `${star}${rarityBadge} ${item.name}${level}`;
    const line2 = `PODER ${power} (${tier})${deltaText ? ` | ${deltaText}` : ''}`;
    const line3 = `ATK ${safeNumber(item.atk)} | DEF ${safeNumber(item.def)} | HP ${safeNumber(item.hp)} | CRIT ${safeNumber(item.crit)}%`;

    return [line1, line2, line3];
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
    const player = await getPlayer(ctx.from.id);

    if (!category) {
        return ctx.editMessageText(renderInventoryHeader(player), {
            parse_mode: 'Markdown',
            ...inventoryMainMenu(player)
        });
    }

    if (!CATEGORY_CONFIG[category]) {
        return ctx.editMessageText('Categoria inválida.', { parse_mode: 'Markdown' });
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
            const [l1, l2, l3] = formatItemBlock(item, isEquipped, player);

            text += `║ ${l1}\n`;
            text += `║ ${l2}\n`;
            text += `║ ${l3}\n`;
            text += `║\n`;

            if (isEquipped) {
                buttons.push([
                    Markup.button.callback(
                        `⭐ Desequipar ${item.name}`,
                        `uneq:${realSlot}:${category}:${safePage}`
                    )
                ]);
            } else {
                buttons.push([
                    Markup.button.callback(
                        `🔹 Equipar ${item.name}`,
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

    return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
}

async function handleInventory(ctx) {
    await ctx.answerCbQuery?.().catch(() => {});
    return renderInventory(ctx);
}

async function handleInvWeapons(ctx) {
    await ctx.answerCbQuery?.().catch(() => {});
    return renderInventory(ctx, 'weapons', 1);
}

async function handleInvArmors(ctx) {
    await ctx.answerCbQuery?.().catch(() => {});
    return renderInventory(ctx, 'armors', 1);
}

async function handleInvJewelry(ctx) {
    await ctx.answerCbQuery?.().catch(() => {});
    return renderInventory(ctx, 'jewelry', 1);
}

async function handleInvBoots(ctx) {
    await ctx.answerCbQuery?.().catch(() => {});
    return renderInventory(ctx, 'boots', 1);
}

async function handleInvConsumables(ctx) {
    const player = await getPlayer(ctx.from.id);
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

    return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
}

async function handleInvSouls(ctx) {
    const player = await getPlayer(ctx.from.id);
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `╔══════════════════════════════════╗
║              💀 *ALMAS*              ║
╠══════════════════════════════════╣
║ *Inventário* (${souls.length})\n`;

    souls.forEach(soul => {
        text += `║   🔹 ${soul.name} (${soul.rarity})\n`;
    });

    text += `╠══════════════════════════════════╣
║ *Equipadas*\n`;

    equipped.forEach((soul, idx) => {
        text += soul ? `║   ⭐ Alma ${idx + 1}: ${soul.name}\n` : `║   ⬜ Slot ${idx + 1}: vazio\n`;
    });

    text += `╠══════════════════════════════════╣
║ 🗝️ Chaves: ${player.keys || 0}
╚══════════════════════════════════╝`;

    const keyboard = Markup.inlineKeyboard([
        ...souls.map(soul => [Markup.button.callback(`💀 Equipar ${soul.name}`, `equip_soul_${soul.instanceId || soul.id}`)]),
        ...equipped.map((soul, idx) => soul ? [Markup.button.callback(`⭐ Desequipar Alma ${idx + 1}`, `unequip_soul_${idx}`)] : []),
        [Markup.button.callback('◀️ Voltar', 'inventory')]
    ]);

    return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

async function handleUsePotionOutside(ctx, type) {
    const player = await getPlayer(ctx.from.id);
    const consumables = player.consumables || {};

    if (type === 'hp') {
        if (!consumables.potionHp || consumables.potionHp <= 0) {
            return ctx.answerCbQuery('❌ Você não tem poções de vida.', { show_alert: true });
        }
        if (player.hp >= player.maxHp) {
            return ctx.answerCbQuery('❤️ Seu HP já está cheio.', { show_alert: true });
        }

        consumables.potionHp--;
        const heal = Math.floor(player.maxHp * 0.4);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        player.consumables = consumables;

        await savePlayer(ctx.from.id, player);
        await ctx.answerCbQuery(`🧪 Você usou uma poção e recuperou ${heal} HP!`, { show_alert: true });
        return handleInvConsumables(ctx);
    }
}

function sameItem(a, b) {
    return getItemKey(a) === getItemKey(b);
}

async function equipByCurrentList(ctx, category, page, index) {
    const player = await getPlayer(ctx.from.id);
    const items = getCategoryItems(player, category);
    const { items: pageItems, page: safePage, totalPages } = getPageItems(items, page);
    const item = pageItems[index];

    if (!item) {
        await ctx.answerCbQuery('⚠️ Lista desatualizada. Abra o inventário novamente.', { show_alert: true });
        return renderInventory(ctx, category, safePage > totalPages ? totalPages : safePage);
    }

    const slot = getRealSlot(item);
    if (!slot || slot === 'unknown') {
        await ctx.answerCbQuery('❌ Item inválido.', { show_alert: true });
        return renderInventory(ctx, category, safePage);
    }

    if (!player.equipment) player.equipment = {};
    if (!Array.isArray(player.inventory)) player.inventory = [];

    const currentEquipped = player.equipment[slot];

    if (currentEquipped && !sameItem(currentEquipped, item)) {
        player.inventory.push(currentEquipped);
    }

    player.inventory = player.inventory.filter(invItem => !sameItem(invItem, item));
    player.equipment[slot] = { ...item, __equipped: true };

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`✅ ${item.name} equipado!`);
    return renderInventory(ctx, category, safePage);
}

async function unequipBySlot(ctx, slot, category, page) {
    const player = await getPlayer(ctx.from.id);
    if (!player.equipment) player.equipment = {};
    if (!Array.isArray(player.inventory)) player.inventory = [];

    const item = player.equipment[slot];
    if (!item) {
        await ctx.answerCbQuery('❌ Nada equipado neste slot.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    player.inventory.push(item);
    player.equipment[slot] = null;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`✅ ${item.name} removido!`);
    return renderInventory(ctx, category, page);
}

async function handleEquipItem(ctx) {
    const raw = ctx.callbackQuery.data;

    let match = raw.match(/^eq:(weapons|armors|jewelry|boots):(\d+):(\d+)$/);
    if (match) {
        const [, category, pageStr, indexStr] = match;
        return equipByCurrentList(ctx, category, Number(pageStr), Number(indexStr));
    }

    const legacy = raw.match(/^equip_(weapon|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/);
    if (legacy) {
        const [, slot, itemIdRaw] = legacy;
        const player = await getPlayer(ctx.from.id);
        const inventory = player.inventory || [];

        const item = inventory.find(invItem => {
            return (
                getRealSlot(invItem) === slot &&
                String(invItem.id ?? invItem._id ?? invItem.instanceId) === String(itemIdRaw)
            );
        });

        if (!item) {
            console.error('[Equipar legado] Item NÃO encontrado:', raw);
            return ctx.answerCbQuery('❌ Item não encontrado no inventário.', { show_alert: true });
        }

        if (!player.equipment) player.equipment = {};
        if (!Array.isArray(player.inventory)) player.inventory = [];

        const currentEquipped = player.equipment[slot];
        if (currentEquipped && !sameItem(currentEquipped, item)) {
            player.inventory.push(currentEquipped);
        }

        player.inventory = player.inventory.filter(invItem => !sameItem(invItem, item));
        player.equipment[slot] = { ...item, __equipped: true };

        recalculateStats(player);
        await savePlayer(ctx.from.id, player);

        await ctx.answerCbQuery(`✅ ${item.name} equipado!`);
        return renderInventory(
            ctx,
            slot === 'weapon' ? 'weapons' : slot === 'armor' ? 'armors' : (slot === 'boots' ? 'boots' : 'jewelry'),
            1
        );
    }

    console.error('[Equipar] Formato inválido:', raw);
    return ctx.answerCbQuery('Erro interno.', { show_alert: true });
}

async function handleUnequipItem(ctx) {
    const raw = ctx.callbackQuery.data;

    let match = raw.match(/^uneq:(weapon|armor|necklace|ring|boots):(weapons|armors|jewelry|boots):(\d+)$/);
    if (match) {
        const [, slot, category, pageStr] = match;
        return unequipBySlot(ctx, slot, category, Number(pageStr));
    }

    const legacy = raw.match(/^unequip_(weapon|armor|necklace|ring|boots)$/);
    if (legacy) {
        const slot = legacy[1];
        const player = await getPlayer(ctx.from.id);
        const item = player.equipment?.[slot];

        if (!item) {
            return ctx.answerCbQuery('❌ Nada equipado neste slot.', { show_alert: true });
        }

        if (!Array.isArray(player.inventory)) player.inventory = [];
        player.inventory.push(item);
        player.equipment[slot] = null;

        recalculateStats(player);
        await savePlayer(ctx.from.id, player);

        await ctx.answerCbQuery(`✅ ${item.name} removido!`);
        return renderInventory(
            ctx,
            slot === 'weapon' ? 'weapons' : slot === 'armor' ? 'armors' : (slot === 'boots' ? 'boots' : 'jewelry'),
            1
        );
    }

    console.error('[Desequipar] Formato inválido:', raw);
    return ctx.answerCbQuery('Erro interno.', { show_alert: true });
}

async function handleInventoryPage(ctx) {
    const match = ctx.callbackQuery.data.match(/^invpage:(weapons|armors|jewelry|boots):(\d+)$/);
    if (!match) {
        return ctx.answerCbQuery('Erro interno.', { show_alert: true });
    }

    const [, category, pageStr] = match;
    return renderInventory(ctx, category, Number(pageStr));
}

async function handleInventoryCategory(ctx) {
    const match = ctx.callbackQuery.data.match(/^invcat:(weapons|armors|jewelry|boots|consumables|skins|souls)$/);
    if (!match) {
        return ctx.answerCbQuery('Erro interno.', { show_alert: true });
    }

    const category = match[1];
    await ctx.answerCbQuery();

    if (category === 'consumables') return handleInvConsumables(ctx);
    if (category === 'souls') return handleInvSouls(ctx);
    if (category === 'skins') {
        return ctx.editMessageText('🎨 *Skins*\n\nEm breve.', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('◀️ Voltar', 'inventory')]
            ])
        });
    }

    return renderInventory(ctx, category, 1);
}

async function handleEquipSoul(ctx) {
    const soulId = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);
    const souls = player.soulsInventory || [];
    const soul = souls.find(s => String(s.instanceId || s.id) === String(soulId));

    if (!soul) return ctx.answerCbQuery('Alma não encontrada.', { show_alert: true });
    if ((player.soulsEquipped || []).some(s => s && String(s.instanceId || s.id) === String(soulId))) {
        return ctx.answerCbQuery('⚠️ Já equipada.', { show_alert: true });
    }

    if (!player.soulsEquipped) player.soulsEquipped = [null, null];
    const emptySlot = player.soulsEquipped.findIndex(s => !s);
    if (emptySlot === -1) return ctx.answerCbQuery('Slots de almas cheios.', { show_alert: true });

    player.soulsEquipped[emptySlot] = soul;
    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`💀 ${soul.name} equipada!`);
    return handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const slotIdx = parseInt(ctx.match?.[1], 10);
    const player = await getPlayer(ctx.from.id);
    const soul = player.soulsEquipped?.[slotIdx];

    if (!soul) return ctx.answerCbQuery('Nada equipado.', { show_alert: true });

    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    player.soulsInventory.push(soul);
    player.soulsEquipped[slotIdx] = null;

    recalculateStats(player);
    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`💀 ${soul.name} removida e devolvida!`);
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
