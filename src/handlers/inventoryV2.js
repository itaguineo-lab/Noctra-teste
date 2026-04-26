const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer,
    isVipActive
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
    getOffhandTypeLabel
} = require('../core/player/playerMutations');

const {
    sameItem,
    getItemKey,
    findInventoryItemByKey,
    ensureUniquePlayerItemKeys
} = require('../core/player/equipmentService');

const {
    inventoryMainMenu,
    buildInventoryCategoryRows,
    buildEquipmentCategoryRows,
    equipmentCategoryMenu,
    getRealSlot,
    getCategoryCount,
    normalizeCategoryKey
} = require('../menus/inventoryMenu');

const {
    navigateText,
    safeAnswer
} = require('../utils/uiNavigator');

const { BALANCE, getRarityEmoji } = require('../data/balance');

const PAGE_SIZE = 5;

const EQUIPMENT_CATEGORY_CONFIG = {
    weapons: { title: '⚔️ Armas', slots: ['weapon'], hint: 'Armas definem seu estilo principal de combate.' },
    offhands: { title: '🧤 Mão Secundária', slots: ['shield'], hint: 'Escudos, aljavas e orbes complementam sua build.' },
    armors: { title: '🛡️ Armaduras', slots: ['armor'], hint: 'Armaduras aumentam sua sobrevivência.' },
    boots: { title: '👢 Botas', slots: ['boots'], hint: 'Botas dão defesa, HP e às vezes crítico.' },
    rings: { title: '💍 Anéis', slots: ['ring'], hint: 'Anéis são joias flexíveis para refinar atributos.' },
    necklaces: { title: '📿 Colares', slots: ['necklace'], hint: 'Colares completam a construção da sua ficha.' }
};

const LEGACY_CATEGORY_ALIAS = {
    shields: 'offhands',
    jewels: 'rings',
    jewelry: 'rings',
    armors: 'armors',
    weapons: 'weapons',
    boots: 'boots',
    rings: 'rings',
    necklaces: 'necklaces'
};

const CLASS_LABELS = {
    guerreiro: 'Guerreiro',
    arqueiro: 'Arqueiro',
    mago: 'Mago'
};

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function truncateText(text = '', max = 26) {
    const value = String(text || '');
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
}

function getClassLabel(className = '') {
    return CLASS_LABELS[String(className || '').toLowerCase()] || className || 'Livre';
}

function getCategory(rawCategory = '') {
    return normalizeCategoryKey(LEGACY_CATEGORY_ALIAS[String(rawCategory || '').trim()] || rawCategory);
}

function getCosmeticTypeLabel(type) {
    if (type === 'title') return '🏷️ Título';
    if (type === 'aura') return '✨ Aura';
    return '🎖️ Emblema';
}

function getSlotLabel(slot, item = null) {
    if (slot === 'shield') {
        if (item?.offhandType) return getOffhandTypeLabel(item.offhandType);
        return 'Mão Secundária';
    }

    const labels = {
        weapon: 'Arma',
        armor: 'Armadura',
        necklace: 'Colar',
        ring: 'Anel',
        boots: 'Bota'
    };

    return labels[slot] || slot || 'Item';
}

function getSlotIcon(slot, item = null) {
    if (slot === 'shield') {
        if (item?.offhandType === 'quiver') return '🏹';
        if (item?.offhandType === 'orb') return '🔮';
        return '🛡️';
    }

    const icons = {
        weapon: '⚔️',
        armor: '🛡️',
        necklace: '📿',
        ring: '💍',
        boots: '👢'
    };

    return icons[slot] || '📦';
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
        if (!(slot in player.equipment) || !player.equipment[slot]) {
            player.equipment[slot] = null;
            continue;
        }

        const normalized = normalizeInventoryItem(player.equipment[slot], slot);
        player.equipment[slot] = normalized ? { ...normalized, __equipped: true } : null;
    }

    ensureUniquePlayerItemKeys(player);
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

function getAllowedClassesLabel(item = {}) {
    const allowed = Array.isArray(item.allowedClasses) ? item.allowedClasses : [];
    if (!allowed.length) return 'Livre';
    return allowed.map(getClassLabel).join(', ');
}

function buildShortStatLine(item) {
    const parts = [];

    if (safeNumber(item.atk) > 0) parts.push(`⚔️ +${safeNumber(item.atk)}`);
    if (safeNumber(item.def) > 0) parts.push(`🛡️ +${safeNumber(item.def)}`);
    if (safeNumber(item.hp) > 0) parts.push(`❤️ +${safeNumber(item.hp)}`);
    if (safeNumber(item.crit) > 0) parts.push(`💥 +${safeNumber(item.crit)}%`);

    return parts.join('  ') || 'Sem bônus';
}

function buildVerticalStats(item) {
    const lines = [];

    if (safeNumber(item.atk) > 0) lines.push(`⚔️ ATK +${safeNumber(item.atk)}`);
    if (safeNumber(item.def) > 0) lines.push(`🛡️ DEF +${safeNumber(item.def)}`);
    if (safeNumber(item.hp) > 0) lines.push(`❤️ HP +${safeNumber(item.hp)}`);
    if (safeNumber(item.crit) > 0) lines.push(`💥 CRIT +${safeNumber(item.crit)}%`);

    return lines.length ? lines.join('\n') : 'Sem bônus relevantes.';
}

function getBuildRuleText(item = {}) {
    const slot = getRealSlot(item);

    if (slot === 'weapon') {
        if (item.weaponStyle === 'two_handed') return 'Usa duas mãos. Remove qualquer mão secundária.';
        if (item.requiredOffhandType) return `Combina com ${getOffhandTypeLabel(item.requiredOffhandType)}.`;
        return 'Pode ser usada sem mão secundária.';
    }

    if (slot === 'shield') {
        if (item.offhandType === 'quiver') return 'Mão secundária para Arcos.';
        if (item.offhandType === 'orb') return 'Mão secundária para Varinhas/Grimórios.';
        if (item.offhandType === 'shield') return 'Mão secundária para Espadas e Lanças.';
        return 'Mão secundária.';
    }

    return 'Item de equipamento.';
}

function getComparisonData(item, player, slot) {
    const equipped = player?.equipment?.[slot];

    if (!equipped) {
        return { delta: null, equipped: null, status: 'Slot vazio', detail: 'Nenhum item equipado neste slot.' };
    }

    if (sameItem(equipped, item)) {
        return { delta: 0, equipped, status: 'Equipado agora', detail: 'Este item já está equipado.' };
    }

    const delta = calcItemPower(item) - calcItemPower(equipped);
    const equippedName = equipped.name || 'item equipado';

    if (delta > 0) return { delta, equipped, status: `📈 +${delta} poder`, detail: `Melhor que ${equippedName}.` };
    if (delta < 0) return { delta, equipped, status: `📉 -${Math.abs(delta)} poder`, detail: `Pior que ${equippedName}.` };

    return { delta: 0, equipped, status: '➖ mesmo poder', detail: `Equivalente a ${equippedName}.` };
}

function renderEquippedSlotCompact(label, item, slot) {
    if (!item) return `${getSlotIcon(slot)} ${label}: —`;
    return `${getSlotIcon(slot, item)} ${label}: ${escapeMarkdown(truncateText(item.name, 24))}`;
}

function renderInventoryHeader(player) {
    const inventory = player.inventory || [];
    const maxInv = player.maxInventory || BALANCE.inventory.baseMax;
    const vipLabel = isVipActive(player) ? '✨ VIP' : 'Padrão';
    const totalPower = ['weapon', 'shield', 'armor', 'boots', 'ring', 'necklace']
        .reduce((sum, slot) => sum + calcItemPower(player.equipment?.[slot]), 0);

    return (
        `🎒 *INVENTÁRIO*\n\n` +
        `👤 ${escapeMarkdown(player.name || 'Caçador')} • ${escapeMarkdown(getClassLabel(player.class))} Lv.${player.level || 1}\n` +
        `🎒 Espaço: ${inventory.length}/${maxInv} • ${vipLabel}\n` +
        `⚔️ Poder equipado: ${totalPower}\n\n` +
        `❤️ ${player.hp || 0}/${player.maxHp || 0}  ⚔️ ${player.atk || 0}  🛡️ ${player.def || 0}  💥 ${player.crit || 0}%\n\n` +
        `*Equipado*\n` +
        `${renderEquippedSlotCompact('Arma', player.equipment?.weapon, 'weapon')}\n` +
        `${renderEquippedSlotCompact('Mão Sec.', player.equipment?.shield, 'shield')}\n` +
        `${renderEquippedSlotCompact('Armadura', player.equipment?.armor, 'armor')}\n` +
        `${renderEquippedSlotCompact('Botas', player.equipment?.boots, 'boots')}\n` +
        `${renderEquippedSlotCompact('Anel', player.equipment?.ring, 'ring')}\n` +
        `${renderEquippedSlotCompact('Colar', player.equipment?.necklace, 'necklace')}`
    );
}

function getCategoryItems(player = {}, rawCategory = 'weapons') {
    const category = getCategory(rawCategory);
    const config = EQUIPMENT_CATEGORY_CONFIG[category];
    if (!config) return [];

    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const equipment = player.equipment || {};

    const equippedItems = [];
    const equippedKeys = new Set();

    for (const slot of config.slots) {
        const equipped = equipment[slot];
        if (!equipped) continue;

        const normalizedBase = normalizeInventoryItem(equipped, slot);
        if (!normalizedBase) continue;

        const normalized = { ...normalizedBase, __equipped: true };
        equippedItems.push(normalized);
        equippedKeys.add(getItemKey(normalized));
    }

    const inventoryItems = inventory
        .map(item => normalizeInventoryItem(item))
        .filter(Boolean)
        .map(item => ({ ...item, __equipped: false }))
        .filter(item => config.slots.includes(getRealSlot(item)))
        .filter(item => !equippedKeys.has(getItemKey(item)))
        .sort((a, b) => {
            const powerDiff = calcItemPower(b) - calcItemPower(a);
            if (powerDiff !== 0) return powerDiff;

            const levelDiff = safeNumber(b.level) - safeNumber(a.level);
            if (levelDiff !== 0) return levelDiff;

            return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
        });

    return [...equippedItems, ...inventoryItems];
}

function getPageItems(items, page) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;

    return { totalPages, page: safePage, items: items.slice(start, start + PAGE_SIZE) };
}

function buildItemCard(item, player, indexLabel) {
    const slot = getRealSlot(item);
    const comparison = getComparisonData(item, player, slot);
    const rarityEmoji = getRarityEmoji(item.rarity);
    const equippedMark = item.__equipped ? ' ⭐ EQUIPADO' : '';

    return (
        `${indexLabel}) ${item.emoji || getSlotIcon(slot, item)} *${escapeMarkdown(item.name || 'Item')}*${equippedMark}\n` +
        `${rarityEmoji} ${escapeMarkdown(item.rarity || 'Comum')} • Lv.${item.level || 1} • ${escapeMarkdown(getSlotLabel(slot, item))}\n` +
        `${escapeMarkdown(buildShortStatLine(item))}\n` +
        `Poder: ${calcItemPower(item)} • ${escapeMarkdown(comparison.status)}\n` +
        `Build: ${escapeMarkdown(getBuildRuleText(item))}`
    );
}

function renderEquipmentHubText(player) {
    return (
        `${renderInventoryHeader(player)}\n\n` +
        `⚔️ *EQUIPAMENTOS*\n\n` +
        `Escolha o tipo de item que quer analisar.\n\n` +
        `⚔️ Armas: ${getCategoryCount(player, 'weapons')}\n` +
        `🧤 Mão Secundária: ${getCategoryCount(player, 'offhands')}\n` +
        `🛡️ Armaduras: ${getCategoryCount(player, 'armors')}\n` +
        `👢 Botas: ${getCategoryCount(player, 'boots')}\n` +
        `💍 Anéis: ${getCategoryCount(player, 'rings')}\n` +
        `📿 Colares: ${getCategoryCount(player, 'necklaces')}\n\n` +
        `Regra rápida:\n` +
        `• Arco combina com Aljava\n` +
        `• Varinha/Grimório combinam com Orbe\n` +
        `• Espada/Lança combinam com Escudo\n` +
        `• Arma 2M deixa a mão secundária livre`
    );
}

async function renderEquipmentHub(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) return sendScreen(ctx, '❌ Perfil não encontrado. Use /start.', {});
    return sendScreen(ctx, renderEquipmentHubText(player), equipmentCategoryMenu(player));
}

function buildEquipmentListKeyboard(player, category, pageData) {
    const rows = [...buildEquipmentCategoryRows(player, category, false)];

    pageData.items.forEach((item, pageIndex) => {
        rows.push([
            Markup.button.callback(
                `${item.__equipped ? '⭐' : '🔎'} ${truncateText(item.name, 30)}`,
                `invcat:item:${category}:${pageData.page}:${pageIndex}`
            )
        ]);
    });

    const navRow = [];
    if (pageData.page > 1) navRow.push(Markup.button.callback('⬅️', `invpage:${category}:${pageData.page - 1}`));
    if (pageData.page < pageData.totalPages) navRow.push(Markup.button.callback('➡️', `invpage:${category}:${pageData.page + 1}`));
    if (navRow.length) rows.push(navRow);

    rows.push([
        Markup.button.callback('◀️ Equipamentos', 'invcat:equipment'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function renderEquipmentCategory(ctx, rawCategory = 'weapons', page = 1) {
    const player = await loadPlayer(ctx);
    if (!player) return sendScreen(ctx, '❌ Perfil não encontrado. Use /start.', {});

    const category = getCategory(rawCategory);
    const config = EQUIPMENT_CATEGORY_CONFIG[category];
    if (!config) return renderEquipmentHub(ctx);

    const allItems = getCategoryItems(player, category);
    const pageData = getPageItems(allItems, page);

    let text = `${renderInventoryHeader(player)}\n\n`;
    text += `${config.title.toUpperCase()} — Página ${pageData.page}/${pageData.totalPages}\n`;
    text += `${escapeMarkdown(config.hint)}\n\n`;

    if (!pageData.items.length) {
        text += 'Nenhum item encontrado nesta categoria.';
    } else {
        pageData.items.forEach((item, idx) => {
            const itemNumber = (pageData.page - 1) * PAGE_SIZE + idx + 1;
            text += `${buildItemCard(item, player, itemNumber)}\n\n`;
        });
    }

    return sendScreen(ctx, text.trim(), buildEquipmentListKeyboard(player, category, pageData));
}

async function renderItemDetail(ctx, rawCategory, page, pageIndex) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    const category = getCategory(rawCategory);
    const pageData = getPageItems(getCategoryItems(player, category), Number(page));
    const item = pageData.items[Number(pageIndex)];

    if (!item) {
        await safeAnswer(ctx, '⚠️ Item não encontrado. A lista foi atualizada.', { show_alert: true });
        return renderEquipmentCategory(ctx, category, page);
    }

    const slot = getRealSlot(item);
    const comparison = getComparisonData(item, player, slot);
    const rarityEmoji = getRarityEmoji(item.rarity);
    const equippedLabel = item.__equipped ? '\n⭐ *Status:* Equipado' : '';

    let text = `${item.emoji || getSlotIcon(slot, item)} *${escapeMarkdown(String(item.name || 'Item').toUpperCase())}*\n\n`;
    text += `${rarityEmoji} ${escapeMarkdown(item.rarity || 'Comum')} • Lv.${item.level || 1}\n`;
    text += `Tipo: ${escapeMarkdown(getSlotLabel(slot, item))}\n`;
    text += `Classe: ${escapeMarkdown(getAllowedClassesLabel(item))}\n`;
    text += `Build: ${escapeMarkdown(getBuildRuleText(item))}${equippedLabel}\n\n`;
    text += `*Atributos*\n${escapeMarkdown(buildVerticalStats(item))}\n\n`;
    text += `*Poder:* ${calcItemPower(item)}\n`;
    text += `*Comparação:* ${escapeMarkdown(comparison.status)}\n`;
    text += `${escapeMarkdown(comparison.detail)}\n\n`;
    text += `Ao equipar, o sistema remove automaticamente combinações inválidas. Nenhum item é perdido.`;

    const rows = [];

    if (item.__equipped) {
        rows.push([Markup.button.callback(`⭐ Desequipar ${truncateText(item.name, 22)}`, `uneq:${slot}:${category}:${pageData.page}`)]);
    } else {
        rows.push([Markup.button.callback(`✅ Equipar ${truncateText(item.name, 22)}`, `eqp:${category}:${pageData.page}:${pageIndex}`)]);
    }

    rows.push([
        Markup.button.callback('↩️ Voltar', `invpage:${category}:${pageData.page}`),
        Markup.button.callback('💰 Vender', 'shop_sell')
    ]);

    rows.push([Markup.button.callback('🏠 Menu', 'menu')]);

    return sendScreen(ctx, text.trim(), Markup.inlineKeyboard(rows));
}

async function renderInventory(ctx, rawCategory = null, page = 1) {
    const player = await loadPlayer(ctx);
    if (!player) return sendScreen(ctx, '❌ Perfil não encontrado. Use /start.', {});

    if (!rawCategory) {
        const text = `${renderInventoryHeader(player)}\n\nEscolha uma área para gerenciar:`;
        return sendScreen(ctx, text, inventoryMainMenu(player));
    }

    const category = getCategory(rawCategory);

    if (category === 'equipment') return renderEquipmentHub(ctx);
    if (category === 'consumables') return handleInvConsumables(ctx);
    if (category === 'souls') return handleInvSouls(ctx);
    if (category === 'skins') return handleInvSkins(ctx);

    return renderEquipmentCategory(ctx, category, page);
}

function buildSectionHeader(player, title) {
    return `${renderInventoryHeader(player)}\n\n${title}\n`;
}

function buildConsumablesText(player) {
    const c = player.consumables || {};
    const hpLabel = BALANCE.consumables.potionHp.fullHeal ? 'restaura 100% do HP' : 'cura parte do HP';

    return (
        `${buildSectionHeader(player, '🧪 *CONSUMÍVEIS*')}\n` +
        `❤️ Poção de HP: ${c.potionHp || 0} (${hpLabel})\n` +
        `⚡ Poção de Energia: ${c.potionEnergy || 0}\n` +
        `💪 Tônico de Força: ${c.tonicStrength || 0}\n` +
        `🛡️ Tônico de Defesa: ${c.tonicDefense || 0}\n` +
        `🗝️ Chaves: ${player.keys || 0}`
    );
}

function buildConsumablesKeyboard(player) {
    const c = player.consumables || {};
    const rows = [...buildInventoryCategoryRows(player, 'consumables', false)];

    if (c.potionHp > 0) rows.push([Markup.button.callback('❤️ Usar Poção de Vida', 'use_potion_outside_hp')]);
    if (c.tonicStrength > 0) rows.push([Markup.button.callback('💪 Usar Tônico de Força', 'use_tonic_strength')]);
    if (c.tonicDefense > 0) rows.push([Markup.button.callback('🛡️ Usar Tônico de Defesa', 'use_tonic_defense')]);

    rows.push([
        Markup.button.callback('◀️ Inventário', 'inventory'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function handleInvConsumables(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    return sendScreen(ctx, buildConsumablesText(player), buildConsumablesKeyboard(player));
}

function describeSoulEffect(soul = {}) {
    const effect = soul.effect || {};
    if (effect.type === 'damage') return `Dano: ${Math.round((effect.multiplier || 1) * 100)}% do ATK`;
    if (effect.type === 'heal') return 'Cura baseada no poder da alma';
    if (effect.type === 'lifesteal') return `Roubo de vida: ${Math.round((effect.healPercent || 0) * 100)}% do dano`;
    if (effect.type === 'passive') {
        const parts = [];
        if (effect.atkBonus) parts.push(`ATK +${effect.atkBonus}`);
        if (effect.defBonus) parts.push(`DEF +${effect.defBonus}`);
        if (effect.hpBonus) parts.push(`HP +${effect.hpBonus}`);
        if (effect.critBonus) parts.push(`CRIT +${effect.critBonus}%`);
        return parts.length ? `Passiva: ${parts.join(', ')}` : 'Passiva';
    }
    return 'Efeito especial';
}

function buildSoulsText(player) {
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    let text = `${buildSectionHeader(player, '💀 *ALMAS*')}\n`;
    text += `*Equipadas*\n`;
    equipped.forEach((soul, idx) => {
        text += soul ? `⭐ Slot ${idx + 1}: ${escapeMarkdown(soul.name)} — ${escapeMarkdown(describeSoulEffect(soul))}\n` : `⬜ Slot ${idx + 1}: vazio\n`;
    });

    text += `\n*Inventário* (${souls.length})\n`;
    if (!souls.length) {
        text += '• Nenhuma alma no inventário\n';
    } else {
        souls.forEach((soul, index) => {
            text += `${index + 1}. 💀 *${escapeMarkdown(soul.name)}*\n`;
            text += `   ${escapeMarkdown(soul.rarity || 'Comum')} • ${escapeMarkdown(describeSoulEffect(soul))}\n`;
        });
    }

    return text.trim();
}

function buildSoulsKeyboard(player) {
    const rows = [...buildInventoryCategoryRows(player, 'souls', false)];
    const souls = player.soulsInventory || [];
    const equipped = player.soulsEquipped || [null, null];

    souls.forEach(soul => {
        rows.push([Markup.button.callback(`💀 Equipar ${truncateText(soul.name, 22)}`, `equip_soul_${soul.instanceId || soul.id}`)]);
    });

    equipped.forEach((soul, idx) => {
        if (soul) rows.push([Markup.button.callback(`⭐ Desequipar Alma ${idx + 1}`, `unequip_soul_${idx}`)]);
    });

    rows.push([
        Markup.button.callback('◀️ Inventário', 'inventory'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function handleInvSouls(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    return sendScreen(ctx, buildSoulsText(player), buildSoulsKeyboard(player));
}

function renderSkinsText(player) {
    const cosmetics = Array.isArray(player.cosmetics) ? player.cosmetics : [];
    const activeTitle = getActiveCosmetic(player, 'title');
    const activeAura = getActiveCosmetic(player, 'aura');
    const activeBadge = getActiveCosmetic(player, 'badge');

    let text = `${buildSectionHeader(player, '🎨 *SKINS & COSMÉTICOS*')}\n`;
    text += `*Ativos*\n`;
    text += `• 🏷️ Título: ${activeTitle ? escapeMarkdown(activeTitle.name) : 'Nenhum'}\n`;
    text += `• ✨ Aura: ${activeAura ? escapeMarkdown(activeAura.name) : 'Nenhuma'}\n`;
    text += `• 🎖️ Emblema: ${activeBadge ? escapeMarkdown(activeBadge.name) : 'Nenhum'}\n\n`;

    if (!cosmetics.length) {
        text += 'Você não possui skins ainda.';
        return text;
    }

    text += `*Coleção* (${cosmetics.length})\n`;
    cosmetics.forEach((skin, idx) => {
        const equipped = player.activeCosmetics?.[skin.type] === skin.id ? ' ✅' : '';
        text += `${idx + 1}. ${getCosmeticTypeLabel(skin.type)} — *${escapeMarkdown(skin.name)}*${equipped}\n`;
    });

    return text.trim();
}

function buildSkinsKeyboard(player) {
    const rows = [...buildInventoryCategoryRows(player, 'skins', false)];
    const cosmetics = Array.isArray(player.cosmetics) ? player.cosmetics : [];

    cosmetics.forEach(cosmetic => {
        const equipped = player.activeCosmetics?.[cosmetic.type] === cosmetic.id;
        rows.push([
            Markup.button.callback(
                equipped ? `✅ Remover ${truncateText(cosmetic.name, 20)}` : `🎨 Equipar ${truncateText(cosmetic.name, 20)}`,
                equipped ? `invskin:unequip:${cosmetic.type}` : `invskin:equip:${cosmetic.id}`
            )
        ]);
    });

    rows.push([
        Markup.button.callback('◀️ Inventário', 'inventory'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

async function handleInvSkins(ctx) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    return sendScreen(ctx, renderSkinsText(player), buildSkinsKeyboard(player));
}

async function handleUsePotionOutside(ctx, type) {
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    if (type === 'hp') {
        if (player.hp >= player.maxHp) return safeAnswer(ctx, '❤️ Seu HP já está cheio.', { show_alert: true });
        const consumeResult = consumeConsumable(player, 'potionHp', 1);
        if (!consumeResult.success) return safeAnswer(ctx, '❌ Você não tem poções de vida.', { show_alert: true });
        const beforeHp = player.hp;
        player.hp = player.maxHp;
        await saveNormalizedPlayer(ctx, player);
        await safeAnswer(ctx, `🧪 Poção de Vida usada! Você recuperou ${player.hp - beforeHp} HP.`, { show_alert: true });
        return handleInvConsumables(ctx);
    }

    if (type === 'strength') {
        const consumeResult = consumeConsumable(player, 'tonicStrength', 1);
        if (!consumeResult.success) return safeAnswer(ctx, '❌ Você não tem Tônicos de Força.', { show_alert: true });
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
        if (!consumeResult.success) return safeAnswer(ctx, '❌ Você não tem Tônicos de Defesa.', { show_alert: true });
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

async function handleUseStrengthTonic(ctx) { return handleUsePotionOutside(ctx, 'strength'); }
async function handleUseDefenseTonic(ctx) { return handleUsePotionOutside(ctx, 'defense'); }

async function equipByItemKey(ctx, rawCategory, page, itemKey) {
    const category = getCategory(rawCategory);
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    const item = findInventoryItemByKey(player, itemKey);
    if (!item) {
        await safeAnswer(ctx, '⚠️ Item não encontrado. O inventário foi atualizado.', { show_alert: true });
        return renderEquipmentCategory(ctx, category, page);
    }

    const slot = getRealSlot(item);
    if (!slot || slot === 'unknown') {
        await safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        return renderEquipmentCategory(ctx, category, page);
    }

    const result = applyEquipmentChange(player, slot, item);
    if (!result.success) {
        await safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
        return renderEquipmentCategory(ctx, category, page);
    }

    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `✅ ${item.name} equipado!`, { show_alert: true });
    return renderEquipmentCategory(ctx, category, page);
}

async function equipByPageIndex(ctx, rawCategory, page, pageIndex) {
    const category = getCategory(rawCategory);
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    const { items } = getPageItems(getCategoryItems(player, category), Number(page));
    const item = items[Number(pageIndex)];
    if (!item) {
        await safeAnswer(ctx, '⚠️ Lista desatualizada. Abra o inventário novamente.', { show_alert: true });
        return renderEquipmentCategory(ctx, category, Number(page));
    }

    if (item.__equipped) {
        await safeAnswer(ctx, '⚠️ Este item já está equipado.', { show_alert: true });
        return renderItemDetail(ctx, category, Number(page), Number(pageIndex));
    }

    const slot = getRealSlot(item);
    if (!slot || slot === 'unknown') {
        await safeAnswer(ctx, '❌ Item inválido.', { show_alert: true });
        return renderEquipmentCategory(ctx, category, Number(page));
    }

    const result = applyEquipmentChange(player, slot, item);
    if (!result.success) {
        await safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
        return renderItemDetail(ctx, category, Number(page), Number(pageIndex));
    }

    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `✅ ${item.name} equipado!`, { show_alert: true });
    return renderEquipmentCategory(ctx, category, Number(page));
}

async function unequipBySlot(ctx, slot, rawCategory, page) {
    const category = getCategory(rawCategory);
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });

    const currentItem = player.equipment?.[slot] ? normalizeInventoryItem(player.equipment[slot], slot) : null;
    const result = removeEquipment(player, slot);
    if (!result.success) {
        await safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
        return renderEquipmentCategory(ctx, category, page);
    }

    await saveNormalizedPlayer(ctx, player);
    const itemName = result.item?.name || currentItem?.name || 'item';
    await safeAnswer(ctx, `✅ ${itemName} removido!`, { show_alert: true });
    return renderEquipmentCategory(ctx, category, page);
}

async function handleEquipItem(ctx) {
    const raw = ctx.callbackQuery?.data || '';
    const compact = raw.match(/^eqp:(.+):(\d+):(\d+)$/);
    if (compact) {
        const [, category, pageStr, pageIndexStr] = compact;
        return equipByPageIndex(ctx, category, Number(pageStr), Number(pageIndexStr));
    }

    const byId = raw.match(/^eqid:(.+):(\d+):(.+)$/);
    if (byId) {
        const [, category, pageStr, itemKey] = byId;
        return equipByItemKey(ctx, category, Number(pageStr), itemKey);
    }

    return safeAnswer(ctx, 'Ação inválida.', { show_alert: true });
}

async function handleUnequipItem(ctx) {
    const raw = ctx.callbackQuery?.data || '';
    const match = raw.match(/^uneq:(.+):(.+):(\d+)$/);
    if (!match) return safeAnswer(ctx, 'Ação inválida.', { show_alert: true });
    const [, slot, category, pageStr] = match;
    return unequipBySlot(ctx, slot, category, Number(pageStr));
}

async function handleEquipSoul(ctx) {
    const soulId = ctx.match?.[1];
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    const soul = player.soulsInventory.find(s => String(s.instanceId || s.id) === String(soulId));
    const result = applySoulEquip(player, soul);
    if (!result.success) return safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `✅ ${result.soul.name} equipada no slot ${result.slot + 1}!`, { show_alert: true });
    return handleInvSouls(ctx);
}

async function handleUnequipSoul(ctx) {
    const slot = Number(ctx.match?.[1]);
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    const result = applySoulUnequip(player, slot);
    if (!result.success) return safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `✅ ${result.soul.name} removida!`, { show_alert: true });
    return handleInvSouls(ctx);
}

async function handleEquipSkin(ctx) {
    const skinId = ctx.match?.[1];
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    const result = equipCosmetic(player, skinId);
    if (!result.success) return safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, `✅ ${result.cosmetic.name} equipado!`, { show_alert: true });
    return handleInvSkins(ctx);
}

async function handleUnequipSkin(ctx) {
    const type = ctx.match?.[1];
    const player = await loadPlayer(ctx);
    if (!player) return safeAnswer(ctx, 'Perfil não encontrado.', { show_alert: true });
    const result = unequipCosmetic(player, type);
    if (!result.success) return safeAnswer(ctx, `❌ ${result.message}`, { show_alert: true });
    await saveNormalizedPlayer(ctx, player);
    await safeAnswer(ctx, '✅ Cosmético removido!', { show_alert: true });
    return handleInvSkins(ctx);
}

async function handleInventory(ctx) {
    await safeAnswer(ctx).catch(() => {});
    return renderInventory(ctx);
}

async function handleInventoryCategory(ctx) {
    await safeAnswer(ctx).catch(() => {});
    const raw = ctx.match?.[1] || 'equipment';

    const itemDetail = raw.match(/^item:(.+):(\d+):(\d+)$/);
    if (itemDetail) {
        const [, category, pageStr, pageIndexStr] = itemDetail;
        return renderItemDetail(ctx, category, Number(pageStr), Number(pageIndexStr));
    }

    return renderInventory(ctx, raw, 1);
}

async function handleInventoryPage(ctx) {
    await safeAnswer(ctx).catch(() => {});
    const category = ctx.match?.[1] || 'weapons';
    const page = Number(ctx.match?.[2] || 1);
    return renderEquipmentCategory(ctx, category, page);
}

module.exports = {
    handleInventory,
    handleInventoryCategory,
    handleInventoryPage,
    handleEquipItem,
    handleUnequipItem,
    handleEquipSoul,
    handleUnequipSoul,
    handleEquipSkin,
    handleUnequipSkin,
    handleUsePotionOutside,
    handleUseStrengthTonic,
    handleUseDefenseTonic
};
