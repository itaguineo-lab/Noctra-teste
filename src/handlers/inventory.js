const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    ensureCosmeticsState,
    equipCosmetic,
    unequipCosmetic,
    getActiveCosmetic
} = require('../core/player/cosmetics');

const {
    applyEquipmentChange,
    removeEquipment,
    applySoulEquip,
    applySoulUnequip,
    applyBuff,
    consumeConsumable,
    normalizePlayerForSave,
    normalizeInventoryCollection,
    normalizeInventoryItem,
    getUiCategoryFromSlot
} = require('../core/player/playerMutations');

const {
    sameItem,
    getItemKey,
    findInventoryItemByKey
} = require('../core/player/equipmentService');

const {
    inventoryMainMenu,
    getRealSlot
} = require('../menus/inventoryMenu');

const {
    navigateText,
    safeAnswer
} = require('../utils/uiNavigator');

const { BALANCE, getRarityEmoji } = require('../data/balance');

const PAGE_SIZE = 6;
const MACRO_CATEGORY_CONFIG = {
    weapons: { title: '⚔️ Armas', slots: ['weapon'] },
    armors: { title: '🛡️ Armaduras', slots: ['shield', 'armor', 'boots'] },
    jewels: { title: '💎 Joias', slots: ['ring', 'necklace'] }
};

const LEGACY_CATEGORY_ALIAS = {
    shields: 'armors',
    boots: 'armors',
    armors: 'armors',
    rings: 'jewels',
    necklaces: 'jewels',
    weapons: 'weapons'
};

function escapeMarkdown(text = '') {
    return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function getClassNamePortuguese(className) {
    const map = {
        guerreiro: 'Guerreiros',
        arqueiro: 'Arqueiros',
        mago: 'Magos'
    };
    return map[className] || className;
}

function getCosmeticTypeLabel(type) {
    if (type === 'title') return '🏷️ Título';
    if (type === 'aura') return '✨ Aura';
    return '🎖️ Emblema';
}

function getSlotLabel(slot) {
    const labels = {
        weapon: 'Arma',
        shield: 'Escudo',
        armor: 'Armadura',
        necklace: 'Colar',
        ring: 'Anel',
        boots: 'Bota'
    };

    return labels[slot] || slot;
}

function getMacroCategory(category) {
    return LEGACY_CATEGORY_ALIAS[category] || category;
}

function normalizePlayerState(player) {
    if (!player) return null;

    if (!player.equipment || typeof player.equipment !== 'object') {
        player.equipment = {};
    }

    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!Array.isArray(player.soulsInventory)) player.soulsInventory = [];
    if (!Array.isArray(player.soulsEquipped)) player.soulsEquipped = [null, null];
    if (!player.consumables) player.consumables = {};

    player.inventory = normalizeInventoryCollection(player.inventory);

    for (const slot of ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots']) {
        if (!(slot in player.equipment)) {
            player.equipment[slot] = null;
        } else if (player.equipment[slot]) {
            player.equipment[slot] = { ...normalizeInventoryItem(player.equipment[slot]), __equipped: true };
        }
    }

    ensureCosmeticsState(player);
    return player;
}

async function loadPlayer(ctx) {
    const player = await getPlayer(ctx.from.id);
    return normalizePlayerState(player);
}

async function saveNormalizedPlayer(ctx, player) {
    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
}

async function sendScreen(ctx, text, options = {}) {
    return navigateText(ctx, text, options);
}

function ensureValidCategory(category) {
    return ['weapons', 'armors', 'jewels', 'consumables', 'skins', 'souls'].includes(getMacroCategory(category));
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

function getComparisonDelta(item, player, slot) {
    const equipped = player?.equipment?.[slot];
    if (!equipped) return null;
    if (sameItem(equipped, item)) return 0;
    return calcItemPower(item) - calcItemPower(equipped);
}

function formatDelta(delta) {
    if (delta === null || delta === undefined) return '';
    if (delta === 0) return '⭐ Equipado';
    return delta > 0 ? `▲ +${delta} poder` : `▼ ${Math.abs(delta)} poder`;
}

function buildShortStatLine(item) {
    const parts = [];
    if (safeNumber(item.atk) > 0) parts.push(`ATK+${safeNumber(item.atk)}`);
    if (safeNumber(item.def) > 0) parts.push(`DEF+${safeNumber(item.def)}`);
    if (safeNumber(item.hp) > 0) parts.push(`HP+${safeNumber(item.hp)}`);
    if (safeNumber(item.crit) > 0) parts.push(`CRIT+${safeNumber(item.crit)}%`);
    return parts.join(', ') || 'Sem bônus';
}

function buildItemSummaryLine(item, player) {
    const slot = getRealSlot(item);
    const delta = getComparisonDelta(item, player, slot);
    const rarityEmoji = getRarityEmoji(item.rarity);
    const name = `${rarityEmoji} ${item.name} [Lv${item.level || 1}]`;
    const statLine = `(${buildShortStatLine(item)})`;
    const deltaLine = item.__equipped ? '⭐ Equipado' : formatDelta(delta);

    return {
        title: `${item.__equipped ? '⭐ ' : ''}${escapeMarkdown(name)}`,
        stats: escapeMarkdown(statLine),
        delta: escapeMarkdown(deltaLine),
        slotLabel: escapeMarkdown(getSlotLabel(slot))
    };
}

function buildEquipButtonLabel(item, player) {
    const delta = getComparisonDelta(item, player, getRealSlot(item));
    if (delta === null) return '🔹 Equipar';
    if (delta > 0) return `🔺 Equipar (+${delta})`;
    if (delta < 0) return `🔻 Equipar (-${Math.abs(delta)})`;
    return '🔹 Equipar';
}

function renderInventoryHeader(player) {
    const inventory = player.inventory || [];
    const maxInv = player.maxInventory || BALANCE.inventory.baseMax;

    const weapon = escapeMarkdown(player.equipment?.weapon?.name || '—');
    const shield = escapeMarkdown(player.equipment?.shield?.name || '—');
    const armor = escapeMarkdown(player.equipment?.armor?.name || '—');
    const boots = escapeMarkdown(player.equipment?.boots?.name || '—');
    const necklace = escapeMarkdown(player.equipment?.necklace?.name || '—');
    const ring = escapeMarkdown(player.equipment?.ring?.name || '—');

    return (
        `🎒 *Inventário* (${inventory.length}/${maxInv})\n\n` +
        `⚔️ ATK ${player.atk || 0}   🛡️ DEF ${player.def || 0}\n` +
        `❤️ HP ${player.hp || 0}/${player.maxHp || 0}   💥 CRIT ${player.crit || 0}%\n\n` +
        `Arma: ${weapon}\n` +
        `Escudo: ${shield}\n` +
        `Armadura: ${armor}\n` +
        `Bota: ${boots}\n` +
        `Colar: ${necklace}\n` +
        `Anel: ${ring}\n\n` +
        `⭐ Itens equipados não ocupam slots visuais do menu.`
    );
}

function getCategoryItems(player = {}, rawCategory = 'weapons') {
    const category = getMacroCategory(rawCategory);
    const config = MACRO_CATEGORY_CONFIG[category];
    if (!config) return [];

    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const equipment = player.equipment || {};

    const equippedItems = [];
    const equippedKeys = new Set();

    for (const slot of config.slots) {
        const equipped = equipment[slot];
        if (!equipped) continue;

        const normalized = { ...normalizeInventoryItem(equipped), __equipped: true };
        equippedItems.push(normalized);
        equippedKeys.add(getItemKey(normalized));
    }

    const inventoryItems = inventory
        .map(item => ({ ...normalizeInventoryItem(item), __equipped: false }))
        .filter(item => config.slots.includes(getRealSlot(item)))
        .filter(item => !equippedKeys.has(getItemKey(item)))
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
        items: items.slice(start, start + PAGE_SIZE)
    };
}

function buildCompactEquipCallback(category, page, pageIndex) {
    return `eqp:${category}:${page}:${pageIndex}`;
}

function buildUnequipCallback(slot, category, page) {
    return `uneq:${slot}:${category}:${page}`;
}

async function renderInventory(ctx, rawCategory = null, page = 1) {
    const player = await loadPlayer(ctx);
    if (!player) {
        return sendScreen(ctx, '❌ Perfil não encontrado. Use /start.', {});
    }

    if (!rawCategory) {
        return sendScreen(ctx, renderInventoryHeader(player), inventoryMainMenu(player));
    }

    const category = getMacroCategory(rawCategory);
    if (!ensureValidCategory(category)) {
        return sendScreen(ctx, 'Categoria inválida.', {});
    }

    if (category === 'consumables') return handleInvConsumables(ctx);
    if (category === 'souls') return handleInvSouls(ctx);
    if (category === 'skins') return handleInvSkins(ctx);

    const config = MACRO_CATEGORY_CONFIG[category];
    const allItems = getCategoryItems(player, category);
    const { totalPages, page: safePage, items: pageItems } = getPageItems(allItems, page);

    let text = `${renderInventoryHeader(player)}\n\n`;
    text += `${config.title} — página ${safePage}/${totalPages}\n\n`;

    const buttons = [];

    if (!pageItems.length) {
        text += `Nenhum item encontrado nesta categoria.`;
    } else {
        pageItems.forEach((item, idx) => {
            const itemNumber = (safePage - 1) * PAGE_SIZE + idx + 1;
            const summary = buildItemSummaryLine(item, player);

            text += `*#${itemNumber}* ${summary.title}\n`;
            text += `${summary.stats}\n`;
            text += `Slot: ${summary.slotLabel}`;
            if (summary.delta) text += ` • ${summary.delta}`;
            text += `\n\n`;

            if (item.__equipped) {
                buttons.push([
                    Markup.button.callback(
                        `⭐ #${itemNumber} Desequipar`,
                        buildUnequipCallback(getRealSlot(item), category, safePage)
                    )
                ]);
            } else {
                buttons.push([
                    Markup.button.callback(
                        `#${itemNumber} ${buildEquipButtonLabel(item, player)}`,
                        buildCompactEquipCallback(category, safePage, idx)
                    )
                ]);
            }
        });
    }

    const navRow = [];
    if (safePage > 1) navRow.push(Markup.button.callback('⬅️', `invpage:${category}:${safePage - 1}`));
    if (safePage < totalPages) navRow.push(Markup.button.callback('➡️', `invpage:${category}:${safePage + 1}`));
    if (navRow.length) buttons.push(navRow);

    buttons.push([Markup.button.callback('◀️ Voltar', 'inventory')]);

    return sendScreen(ctx, text.trim(), Markup.inlineKeyboard(buttons));
}

function buildConsumablesText(player) {
    const c = player.consumables || {};
    const healCfg = BALANCE.consumables.potionHp;
    const healAmount = Math.max(
        healCfg.minHealFlat,
        Math.floor((player.maxHp || 0) * healCfg.outsideCombatHealPercent)
    );

    return (
        `🧪 *Consumíveis*\n\n` +
        `❤️ Poção de HP: ${c.potionHp || 0}\n` +
        `   Cura aproximada por uso: ${healAmount} HP\n` +
        `⚡ Poção de Energia: ${c.potionEnergy || 0}\n` +
        `💪 Tônico de Força: ${c.tonicStrength || 0}\n` +
        `🛡️ Tônico de Defesa: ${c.tonicDefense || 0}\n` +
        `🗝️ Chaves: ${player.keys || 0}`
    );
}

function buildConsumablesKeyboard(player) {
    const c = player.consumables || {};
    const buttons = [];

    if (c.potionHp > 0) buttons.push([Markup.button.callback('❤️ Usar Poção de Vida', 'use_potion_outside_hp')]);
    if (c.tonicStrength > 0) buttons.push([Markup.button.callback('💪 Usar Tônico de Força', 'use_tonic_strength')]);
    if (c.tonicDefense > 0) buttons.push([Markup.button.callback('🛡️ Usar Tônico de Defesa', 'use_tonic_defense')]);

    buttons.push([Markup.button.callback('◀️ Voltar', 'inventory')]);
    return Markup.inlineKeyboard(buttons);
}

async function handleInvConsumables(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }
    return sendScreen(ctx, buildConsumablesText(player), buildConsumablesKeyboard(player));
}

function buildSoulsText(player) {
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `💀 *Almas*\n\n`;
    text += `Inventário (${souls.length})\n`;

    if (!souls.length) {
        text += `• Nenhuma alma no inventário\n`;
    } else {
        souls.forEach(soul => {
            text += `• ${escapeMarkdown(soul.name)} (${escapeMarkdown(soul.rarity || 'Comum')})\n`;
        });
    }

    text += `\nEquipadas\n`;
    equipped.forEach((soul, idx) => {
        text += soul
            ? `⭐ Slot ${idx + 1}: ${escapeMarkdown(soul.name)}\n`
            : `⬜ Slot ${idx + 1}: vazio\n`;
    });

    return text;
}

function buildSoulsKeyboard(player) {
    const rows = [];
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    souls.forEach(soul => {
        rows.push([
            Markup.button.callback(
                `💀 Equipar ${soul.name}`,
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
    return Markup.inlineKeyboard(rows);
}

async function handleInvSouls(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }
    return sendScreen(ctx, buildSoulsText(player), buildSoulsKeyboard(player));
}

function renderSkinsText(player) {
    const cosmetics = Array.isArray(player.cosmetics) ? player.cosmetics : [];
    const activeTitle = getActiveCosmetic(player, 'title');
    const activeAura = getActiveCosmetic(player, 'aura');
    const activeBadge = getActiveCosmetic(player, 'badge');

    let text = `🎨 *Skins & Cosméticos*\n\n`;
    text += `Ativos\n`;
    text += `• 🏷️ Título: ${activeTitle ? activeTitle.name : 'Nenhum'}\n`;
    text += `• ✨ Aura: ${activeAura ? activeAura.name : 'Nenhuma'}\n`;
    text += `• 🎖️ Emblema: ${activeBadge ? activeBadge.name : 'Nenhum'}\n\n`;

    if (!cosmetics.length) {
        text += `Você não possui skins ainda.`;
        return text;
    }

    text += `Coleção (${cosmetics.length})\n`;
    cosmetics.forEach((skin, idx) => {
        const equipped = player.activeCosmetics?.[skin.type] === skin.id ? ' ✅' : '';
        text += `${idx + 1}. ${getCosmeticTypeLabel(skin.type)} — *${escapeMarkdown(skin.name)}*${equipped}\n`;
    });

    return text;
}

function buildSkinsKeyboard(player) {
    const rows = [];
    const cosmetics = Array.isArray(player.cosmetics) ? player.cosmetics : [];

    cosmetics.forEach(cosmetic => {
        const equipped = player.activeCosmetics?.[cosmetic.type] === cosmetic.id;
        const prefix = equipped ? '✅' : '🎨';

        rows.push([
            Markup.button.callback(
                `${prefix} ${cosmetic.name}`,
                equipped
                    ? `invskin:unequip:${cosmetic.type}`
                    : `invskin:equip:${cosmetic.id}`
            )
        ]);
    });

    rows.push([Markup.button.callback('◀️ Voltar', 'inventory')]);
    return Markup.inlineKeyboard(rows);
}

async function handleInvSkins(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }
    return sendScreen(ctx, renderSkinsText(player), buildSkinsKeyboard(player));
}

async function handleUsePotionOutside(ctx, type) {
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }

    if (type === 'hp') {
        if (player.hp >= player.maxHp) {
            return safeAnswer(ctx, '❤️ Seu HP já está cheio.', { show_alert: true });
        }

        const consumeResult = consumeConsumable(player, 'potionHp', 1);
        if (!consumeResult.success) {
            return safeAnswer(ctx, '❌ Você não tem poções de vida.', { show_alert: true });
        }

        const healCfg = BALANCE.consumables.potionHp;
        const heal = Math.max(
            healCfg.minHealFlat,
            Math.floor(player.maxHp * healCfg.outsideCombatHealPercent)
        );

        const beforeHp = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + heal);

        await saveNormalizedPlayer(ctx, player);
        await safeAnswer(ctx, `🧪 Poção de Vida usada! Você recuperou ${player.hp - beforeHp} HP.`, { show_alert: true });
        return handleInvConsumables(ctx);
    }

    if (type === 'strength') {
        const consumeResult = consumeConsumable(player, 'tonicStrength', 1);
        if (!consumeResult.success) {
            return safeAnswer(ctx, '❌ Você não tem Tônicos de Força.', { show_alert: true });
        }

        applyBuff(player, {
            type: 'strength',
            atk: BALANCE.consumables.tonicStrength.atkBonus,
            expiresAt: Date.now() + (BALANCE.consumables.tonicStrength.durationMinutes * 60 * 1000)
        });

        await saveNormalizedPlayer(ctx, player);
        await safeAnswer(ctx, `💪 Tônico de Força usado! +${BALANCE.consumables.tonicStrength.atkBonus} ATK por ${BALANCE.consumables.tonicStrength.durationMinutes} minutos.`, { show_alert: true });
        return handleInvConsumables(ctx);
    }

    if (type === 'defense') {
        const consumeResult = consumeConsumable(player, 'tonicDefense', 1);
        if (!consumeResult.success) {
            return safeAnswer(ctx, '❌ Você não tem Tônicos de Defesa.', { show_alert: true });
        }

        applyBuff(player, {
            type: 'defense',
            def: BALANCE.consumables.tonicDefense.defBonus,
            expiresAt: Date.now() + (BALANCE.consumables.tonicDefense.durationMinutes * 60 * 1000)
        });

        await saveNormalizedPlayer(ctx, player);
        await safeAnswer(ctx, `🛡️ Tônico de Defesa usado! +${BALANCE.consumables.tonicDefense.defBonus} DEF por ${BALANCE.consumables.tonicDefense.durationMinutes} minutos.`, { show_alert: true });
        return handleInvConsumables(ctx);
    }

    return safeAnswer(ctx, 'Item inválido.', { show_alert: true });
}

async function handleUseStrengthTonic(ctx) {
    return handleUsePotionOutside(ctx, 'strength');
}

async function handleUseDefenseTonic(ctx) {
    return handleUsePotionOutside(ctx, 'defense');
}

async function equipByItemKey(ctx, rawCategory, page, itemKey) {
    const category = getMacroCategory(rawCategory);
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }

    const item = findInventoryItemByKey(player, itemKey);
    if (!item) {
        await safeAnswer(ctx, '⚠️ Item não encontrado. O inventário foi atualizado.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    const slot = getRealSlot(item);
    if (!slot || slot === 'unknown') {
        await safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    if (item.classRestriction && item.classRestriction !== player.class) {
        const restrictedClassName = getClassNamePortuguese(item.classRestriction);
        await safeAnswer(ctx, `❌ Apenas ${restrictedClassName} podem equipar ${item.name}.`, { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    const result = applyEquipmentChange(player, slot, item);
    if (!result.success) {
        await safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `✅ ${item.name} equipado!`);
    return renderInventory(ctx, category, page);
}

async function unequipBySlot(ctx, slot, rawCategory, page) {
    const category = getMacroCategory(rawCategory);
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }

    const result = removeEquipment(player, slot);
    if (!result.success) {
        await safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
        return renderInventory(ctx, category, page);
    }

    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `✅ ${result.item.name} removido!`);
    return renderInventory(ctx, category, page);
}

async function handleEquipItem(ctx) {
    const raw = ctx.callbackQuery?.data || '';

    const compact = raw.match(/^eqp:(weapons|armors|jewels|shields|rings|necklaces|boots):(\d+):(\d+)$/);
    if (compact) {
        const [, category, pageStr, pageIndexStr] = compact;
        const player = await loadPlayer(ctx);
        if (!player) {
            return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
        }

        const macroCategory = getMacroCategory(category);
        const { items } = getPageItems(getCategoryItems(player, macroCategory), Number(pageStr));
        const item = items[Number(pageIndexStr)];

        if (!item || item.__equipped) {
            await safeAnswer(ctx, '⚠️ Lista desatualizada. Abra o inventário novamente.', { show_alert: true });
            return renderInventory(ctx, macroCategory, Number(pageStr));
        }

        return equipByItemKey(ctx, macroCategory, Number(pageStr), getItemKey(item));
    }

    const byId = raw.match(/^eqid:(weapons|armors|jewels|shields|rings|necklaces|boots):(\d+):(.+)$/);
    if (byId) {
        const [, category, pageStr, encodedKey] = byId;
        return equipByItemKey(ctx, getMacroCategory(category), Number(pageStr), decodeURIComponent(encodedKey));
    }

    const legacy = raw.match(/^eq:(weapons|armors|jewels|shields|rings|necklaces|boots):(\d+):(\d+)$/);
    if (legacy) {
        const [, category, pageStr, absoluteIndexStr] = legacy;
        const player = await loadPlayer(ctx);
        if (!player) {
            return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
        }

        const macroCategory = getMacroCategory(category);
        const item = getCategoryItems(player, macroCategory)[Number(absoluteIndexStr)];
        if (!item) {
            await safeAnswer(ctx, '⚠️ Lista desatualizada. Abra o inventário novamente.', { show_alert: true });
            return renderInventory(ctx, macroCategory, Number(pageStr));
        }

        return equipByItemKey(ctx, macroCategory, Number(pageStr), getItemKey(item));
    }

    const legacyOld = raw.match(/^equip_(weapon|shield|armor|necklace|ring|boots)(?:_item_\d+)?_(.+)$/);
    if (legacyOld) {
        const [, slot, itemIdRaw] = legacyOld;
        const player = await loadPlayer(ctx);
        if (!player) {
            return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
        }

        const item = player.inventory.find(invItem => (
            getRealSlot(invItem) === slot && String(getItemKey(invItem)) === String(itemIdRaw)
        ));

        if (!item) {
            return safeAnswer(ctx, '❌ Item não encontrado no inventário.', { show_alert: true });
        }

        return equipByItemKey(ctx, getUiCategoryFromSlot(slot), 1, getItemKey(item));
    }

    return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
}

async function handleUnequipItem(ctx) {
    const raw = ctx.callbackQuery?.data || '';

    const match = raw.match(/^uneq:(weapon|shield|armor|necklace|ring|boots):(weapons|armors|jewels|shields|rings|necklaces|boots):(\d+)$/);
    if (match) {
        const [, slot, category, pageStr] = match;
        return unequipBySlot(ctx, slot, getMacroCategory(category), Number(pageStr));
    }

    const legacy = raw.match(/^unequip_(weapon|shield|armor|necklace|ring|boots)$/);
    if (legacy) {
        const slot = legacy[1];
        return unequipBySlot(ctx, slot, getUiCategoryFromSlot(slot), 1);
    }

    return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
}

async function handleInventory(ctx) {
    await safeAnswer(ctx);
    return renderInventory(ctx);
}

async function handleInventoryPage(ctx) {
    const match = ctx.callbackQuery?.data?.match(/^invpage:(weapons|armors|jewels|shields|rings|necklaces|boots):(\d+)$/);
    if (!match) {
        return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
    }

    const [, category, pageStr] = match;
    await safeAnswer(ctx);
    return renderInventory(ctx, getMacroCategory(category), Number(pageStr));
}

async function handleInventoryCategory(ctx) {
    const match = ctx.callbackQuery?.data?.match(/^invcat:(weapons|armors|jewels|consumables|skins|souls|shields|rings|necklaces|boots)$/);
    if (!match) {
        return safeAnswer(ctx, 'Erro interno.', { show_alert: true });
    }

    const category = getMacroCategory(match[1]);
    await safeAnswer(ctx);
    return renderInventory(ctx, category, 1);
}

async function handleEquipSoul(ctx) {
    const soulId = ctx.match?.[1];
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }

    const soul = player.soulsInventory.find(
        s => String(s.instanceId || s.id) === String(soulId)
    );

    if (!soul) {
        return safeAnswer(ctx, 'Alma não encontrada.', { show_alert: true });
    }

    const result = applySoulEquip(player, soul);
    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `💀 ${result.soul.name} equipada!`);
    return handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const slotIdx = parseInt(ctx.match?.[1], 10);
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }

    const result = applySoulUnequip(player, slotIdx);
    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `💀 ${result.soul.name} removida e devolvida!`);
    return handleInvSouls(ctx);
}

async function handleEquipSkin(ctx) {
    const skinId = ctx.match?.[1];
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }

    const result = equipCosmetic(player, skinId);
    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    await savePlayer(ctx.from.id, player);
    await safeAnswer(ctx, `✅ ${result.cosmetic.name} equipado(a)!`);
    return handleInvSkins(ctx);
}

async function handleUnequipSkin(ctx) {
    const slot = ctx.match?.[1];
    const player = await loadPlayer(ctx);
    if (!player) {
        return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    }

    const current = getActiveCosmetic(player, slot);
    const result = unequipCosmetic(player, slot);

    if (!result.success) {
        return safeAnswer(ctx, result.message, { show_alert: true });
    }

    await savePlayer(ctx.from.id, player);
    await safeAnswer(ctx, current ? `✅ ${current.name} removido(a).` : '✅ Slot cosmético limpo.');
    return handleInvSkins(ctx);
}

module.exports = {
    renderInventory,
    handleInventory,
    handleInvConsumables,
    handleInvSouls,
    handleInvSkins,
    handleEquipItem,
    handleUnequipItem,
    handleInventoryPage,
    handleInventoryCategory,
    handleEquipSoul,
    handleUnequipSoul,
    handleEquipSkin,
    handleUnequipSkin,
    handleUsePotionOutside,
    handleUseStrengthTonic,
    handleUseDefenseTonic
};