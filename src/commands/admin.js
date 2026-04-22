const { randomUUID } = require('crypto');

const {
    getPlayer,
    savePlayer,
    recalculateStats,
    getPlayerCollection,
    normalizeVipState,
    applyInventoryCapacity,
    isVipActive
} = require('../core/player/playerService');

const { generateDrop } = require('../data/items');
const { BALANCE } = require('../data/balance');

const {
    addGold,
    addNox,
    addKeys,
    addGlorias,
    addInventoryItem,
    applyXpReward,
    restoreFullHp,
    restoreFullEnergy,
    normalizePlayerForSave,
    normalizeInventoryCollection,
    normalizeInventoryItem
} = require('../core/player/playerMutations');

const {
    ensureUniquePlayerItemKeys,
    getItemKey,
    sameItem
} = require('../core/player/equipmentService');

const {
    getTodayMetrics,
    getMetricsByDate,
    buildMetricsSummary
} = require('../core/metrics/metricsService');

const {
    getXpToNextLevel
} = require('../core/player/progression');

const {
    getSoulById,
    soulsList
} = require('../core/player/souls');

const captureSessions = new Set();

const VALID_SETPLAYER_FIELDS = new Set([
    'level',
    'gold',
    'nox',
    'energy',
    'hp',
    'keys',
    'glorias',
    'map',
    'vipdays'
]);

/*
=================================
ADMIN CHECK
=================================
*/

function getAdminIds() {
    return String(process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
}

function isAdmin(ctx) {
    return getAdminIds().includes(String(ctx.from.id));
}

function isProtectedPlayer(player) {
    const adminIds = getAdminIds();
    const playerId = String(player?.id || player?.telegramId || '');
    return adminIds.includes(playerId);
}

async function requireAdmin(ctx) {
    if (!isAdmin(ctx)) {
        await ctx.reply('⛔ Comando restrito ao administrador.');
        return false;
    }

    return true;
}

/*
=================================
UTILS
=================================
*/

function splitText(text = '') {
    return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function isNumericId(value = '') {
    return /^\d+$/.test(String(value).trim());
}

function normalizeRawTarget(raw) {
    return String(raw || '').replace('@', '').trim();
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function safeName(value, fallback = '—') {
    return value ? String(value) : fallback;
}

function escapeRegex(text = '') {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getReplyUserId(ctx) {
    return ctx.message?.reply_to_message?.from
        ? String(ctx.message.reply_to_message.from.id)
        : null;
}

function toPositiveNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, n) : NaN;
}

function normalizeText(value = '') {
    return String(value || '').trim();
}

function isPlaceholderName(value = '') {
    const name = normalizeText(value).toLowerCase();
    return !name || name === 'item sem nome';
}

function hasRealItemStats(item = {}) {
    return ['atk', 'def', 'hp', 'crit', 'power'].some(field => Number(item?.[field] || 0) > 0);
}

function isMeaningfulItem(item = {}) {
    if (!item || typeof item !== 'object') return false;

    const hasName = !isPlaceholderName(item.name);
    const hasStats = hasRealItemStats(item);

    const hasSlotHint = Boolean(normalizeText(item.slot));
    const hasCategoryHint = Boolean(normalizeText(item.category));
    const hasUiCategoryHint = Boolean(normalizeText(item.uiCategory));
    const hasEmoji = Boolean(normalizeText(item.emoji || item.icon));

    return hasName || (hasStats && (hasSlotHint || hasCategoryHint || hasUiCategoryHint || hasEmoji));
}

function getFallbackNameForSlot(slot) {
    if (slot === 'weapon') return 'Arma desconhecida';
    if (slot === 'shield') return 'Escudo desconhecido';
    if (slot === 'armor') return 'Armadura desconhecida';
    if (slot === 'boots') return 'Bota desconhecida';
    if (slot === 'ring') return 'Anel desconhecido';
    if (slot === 'necklace') return 'Colar desconhecido';
    return 'Item desconhecido';
}

function formatVipExpiry(player) {
    if (!player?.vipExpires) return '—';

    const date = new Date(player.vipExpires);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('pt-BR');
}

function buildVipStatusLine(player) {
    return isVipActive(player)
        ? `✅ Ativo até ${formatVipExpiry(player)}`
        : (player?.vip ? '⚠️ Expirado/inconsistente' : 'Não');
}

function buildEquipmentLines(player) {
    const eq = player.equipment || {};
    return [
        `⚔️ Arma: ${safeName(eq.weapon?.name)}`,
        `🛡️ Escudo: ${safeName(eq.shield?.name)}`,
        `🥋 Armadura: ${safeName(eq.armor?.name)}`,
        `📿 Amuleto: ${safeName(eq.necklace?.name)}`,
        `💍 Anel: ${safeName(eq.ring?.name)}`,
        `👢 Botas: ${safeName(eq.boots?.name)}`
    ].join('\n');
}

function buildSoulsLines(player) {
    const souls = Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [null, null];
    return [
        `💀 Alma 1: ${safeName(souls[0]?.name)}`,
        `💀 Alma 2: ${safeName(souls[1]?.name)}`
    ].join('\n');
}

async function saveAdminPlayer(player) {
    normalizeVipState(player);
    applyInventoryCapacity(player);
    normalizePlayerForSave(player);
    await savePlayer(player.id, player);
}

function validateMapValue(value) {
    const allowedMaps = new Set([
        'clareira_sombria',
        'cripta_em_ruinas',
        'pantano_corrompido',
        'deserto_incandescente',
        'citadela_lunar',
        'abismo_noctra'
    ]);

    return allowedMaps.has(String(value).trim());
}

function buildSoulInstance(template) {
    return {
        ...template,
        effect: JSON.parse(JSON.stringify(template.effect || {})),
        level: 1,
        exp: 0,
        shards: 0,
        awakenLevel: 0,
        instanceId: randomUUID()
    };
}

function pickRandomSoulForPlayer(player) {
    const playerLevel = Math.max(1, Number(player?.level || 1));
    const available = soulsList.filter(soul => soul.minLevel <= playerLevel);
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)] || null;
}

/*
=================================
PLAYER RESOLUTION
=================================
*/

async function findPlayersByName(name, limit = 10) {
    const collection = await getPlayerCollection();
    const safe = String(name || '').trim();

    if (!safe) return [];

    const exactRegex = new RegExp(`^${escapeRegex(safe)}$`, 'i');
    const partialRegex = new RegExp(escapeRegex(safe), 'i');

    const exact = await collection
        .find({ name: { $regex: exactRegex } })
        .limit(limit)
        .toArray();

    if (exact.length) return exact;

    return collection
        .find({ name: { $regex: partialRegex } })
        .limit(limit)
        .toArray();
}

async function resolvePlayerFlexible(rawTarget) {
    const target = normalizeRawTarget(rawTarget);
    if (!target) return null;

    if (isNumericId(target)) {
        const byId = await getPlayer(target);
        if (byId) return byId;
    }

    const matches = await findPlayersByName(target, 5);
    if (!matches.length) return null;

    return matches[0];
}

async function resolvePlayerFromReply(ctx) {
    const replyId = getReplyUserId(ctx);
    if (!replyId) return null;
    return getPlayer(replyId);
}

async function resolvePlayerForSingleTargetCommand(ctx, usageExample) {
    const replyPlayer = await resolvePlayerFromReply(ctx);
    if (replyPlayer) return replyPlayer;

    const parts = splitText(ctx.message?.text || '');
    const rawTarget = parts[1];

    if (!rawTarget) {
        await ctx.reply(`❌ Uso: ${usageExample}\n\nTambém funciona respondendo a mensagem do jogador.`);
        return null;
    }

    const player = await resolvePlayerFlexible(rawTarget);
    if (!player) {
        await ctx.reply('❌ Jogador não encontrado.');
        return null;
    }

    return player;
}

async function resolvePlayerFromGiveCommand(ctx) {
    const parts = splitText(ctx.message?.text || '');
    const replyPlayer = await resolvePlayerFromReply(ctx);

    let player = null;
    let amount = 0;

    if (replyPlayer) {
        player = replyPlayer;
        amount = Number(parts[2] || 0);
    } else {
        const rawTarget = parts[2];
        amount = Number(parts[3] || 0);

        if (!rawTarget) {
            await ctx.reply('❌ Informe o alvo. Ex: /give gold 123456 500\nTambém funciona respondendo a mensagem do jogador.');
            return null;
        }

        player = await resolvePlayerFlexible(rawTarget);
    }

    if (!player) {
        await ctx.reply('❌ Jogador não encontrado.');
        return null;
    }

    return {
        player,
        amount: Number.isFinite(amount) ? amount : 0
    };
}

async function resolvePlayerFromBanCommand(ctx, usageExample) {
    const replyPlayer = await resolvePlayerFromReply(ctx);
    if (replyPlayer) return replyPlayer;

    const parts = splitText(ctx.message?.text || '');
    const rawTarget = parts[1];

    if (!rawTarget) {
        await ctx.reply(`❌ Uso: ${usageExample}\nTambém funciona respondendo a mensagem do jogador.`);
        return null;
    }

    const player = await resolvePlayerFlexible(rawTarget);
    if (!player) {
        await ctx.reply('❌ Jogador não encontrado.');
        return null;
    }

    return player;
}

async function resolveSetPlayerPayload(ctx) {
    const parts = splitText(ctx.message?.text || '');
    const replyPlayer = await resolvePlayerFromReply(ctx);

    let rawTarget = null;
    let field = '';
    let value = '';

    if (replyPlayer) {
        field = (parts[1] || '').toLowerCase();
        value = parts.slice(2).join(' ').trim();

        if (!field || !value) {
            await ctx.reply('❌ Uso respondendo a mensagem: /setplayer campo valor');
            return null;
        }

        return { player: replyPlayer, field, value };
    }

    rawTarget = parts[1] || null;
    field = (parts[2] || '').toLowerCase();
    value = parts.slice(3).join(' ').trim();

    if (!rawTarget || !field || !value) {
        await ctx.reply(
            '❌ Uso: /setplayer ID_ou_nome campo valor\n\n' +
            'Exemplos:\n' +
            '/setplayer 123456789 level 10\n' +
            '/setplayer Italo gold 5000\n' +
            '/setplayer Italo hp 200\n' +
            '/setplayer Italo keys 10\n' +
            '/setplayer Italo glorias 15\n' +
            '/setplayer Italo map cripta_em_ruinas\n' +
            '/setplayer Italo vipdays 30\n\n' +
            'Também funciona respondendo a mensagem do jogador:\n' +
            '/setplayer level 10'
        );
        return null;
    }

    const player = await resolvePlayerFlexible(rawTarget);
    if (!player) {
        await ctx.reply('❌ Jogador não encontrado.');
        return null;
    }

    return { player, field, value };
}

async function resolveTeleportPayload(ctx) {
    const parts = splitText(ctx.message?.text || '');
    const replyPlayer = await resolvePlayerFromReply(ctx);

    if (replyPlayer) {
        const map = parts[1];
        if (!map) {
            await ctx.reply('❌ Uso respondendo a mensagem: /teleport mapa_id');
            return null;
        }
        return { player: replyPlayer, map: String(map).trim() };
    }

    const rawTarget = parts[1];
    const map = parts[2];

    if (!rawTarget || !map) {
        await ctx.reply('❌ Uso: /teleport ID_ou_nome mapa_id\nEx: /teleport Italo cripta_em_ruinas');
        return null;
    }

    const player = await resolvePlayerFlexible(rawTarget);
    if (!player) {
        await ctx.reply('❌ Jogador não encontrado.');
        return null;
    }

    return { player, map: String(map).trim() };
}

async function resolveGiveSoulPayload(ctx) {
    const parts = splitText(ctx.message?.text || '');
    const replyPlayer = await resolvePlayerFromReply(ctx);

    if (replyPlayer) {
        const soulId = String(parts[2] || 'random').trim();
        return { player: replyPlayer, soulId };
    }

    const rawTarget = parts[2];
    const soulId = String(parts[3] || 'random').trim();

    if (!rawTarget) {
        await ctx.reply('❌ Uso: /give soul ID_ou_nome soul_id\nEx: /give soul Italo soul_wolf\nUse random para alma aleatória.');
        return null;
    }

    const player = await resolvePlayerFlexible(rawTarget);
    if (!player) {
        await ctx.reply('❌ Jogador não encontrado.');
        return null;
    }

    return { player, soulId };
}

/*
=================================
PLAYERFIX AGRESSIVO
=================================
*/

function repairEquipmentItem(rawItem, slot) {
    if (!rawItem || typeof rawItem !== 'object') {
        return null;
    }

    const normalized = normalizeInventoryItem({
        ...rawItem,
        slot
    });

    if (!normalized) return null;

    return {
        ...normalized,
        __equipped: true
    };
}

function dedupeInventory(items = []) {
    const result = [];
    const seen = new Set();

    for (const item of items) {
        if (!item) continue;

        const key = getItemKey(item);
        if (!key) continue;

        if (seen.has(key)) continue;
        seen.add(key);
        result.push(item);
    }

    return result;
}

function repairLegacyInventoryAndEquipment(player) {
    const beforeInventory = Array.isArray(player.inventory) ? player.inventory.length : 0;

    player.inventory = Array.isArray(player.inventory) ? player.inventory : [];
    player.equipment = (player.equipment && typeof player.equipment === 'object') ? player.equipment : {};

    const slots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    const repairedEquipment = {};
    const cleanedInventory = [];

    let removedGhostItems = 0;
    let repairedEquipmentItems = 0;
    let movedBrokenEquipmentToInventory = 0;

    for (const rawItem of player.inventory) {
        if (!isMeaningfulItem(rawItem)) {
            removedGhostItems += 1;
            continue;
        }

        const normalized = normalizeInventoryItem(rawItem);
        if (!normalized) {
            removedGhostItems += 1;
            continue;
        }

        cleanedInventory.push({
            ...normalized,
            __equipped: false
        });
    }

    for (const slot of slots) {
        const rawEquipped = player.equipment?.[slot];

        if (!rawEquipped) {
            repairedEquipment[slot] = null;
            continue;
        }

        const repaired = repairEquipmentItem(rawEquipped, slot);

        if (!repaired) {
            /*
            Se o item equipado está tão quebrado que nem dá para normalizar,
            ele sai do slot e não volta como lixo.
            */
            repairedEquipment[slot] = null;
            removedGhostItems += 1;
            continue;
        }

        /*
        Se o item ainda está com placeholder mas tem stats reais,
        normalizeInventoryItem já tentou salvar com nome fallback.
        */
        if (isPlaceholderName(repaired.name) && !hasRealItemStats(repaired)) {
            repairedEquipment[slot] = null;
            removedGhostItems += 1;
            continue;
        }

        repairedEquipment[slot] = repaired;
        repairedEquipmentItems += 1;
    }

    player.equipment = repairedEquipment;
    player.inventory = normalizeInventoryCollection(cleanedInventory);
    ensureUniquePlayerItemKeys(player);

    /*
    Remove do inventário qualquer item que esteja simultaneamente equipado
    com a mesma identidade.
    */
    const equippedKeys = new Set(
        slots
            .map(slot => player.equipment?.[slot])
            .filter(Boolean)
            .map(item => getItemKey(item))
    );

    player.inventory = player.inventory.filter(item => !equippedKeys.has(getItemKey(item)));
    player.inventory = dedupeInventory(player.inventory);
    ensureUniquePlayerItemKeys(player);

    const afterInventory = Array.isArray(player.inventory) ? player.inventory.length : 0;

    return {
        beforeInventory,
        afterInventory,
        removedGhostItems,
        repairedEquipmentItems,
        movedBrokenEquipmentToInventory
    };
}

function repairSouls(player) {
    player.soulsInventory = Array.isArray(player.soulsInventory)
        ? player.soulsInventory.filter(Boolean)
        : [];

    if (!Array.isArray(player.soulsEquipped)) {
        player.soulsEquipped = [null, null];
    }

    while (player.soulsEquipped.length < 2) {
        player.soulsEquipped.push(null);
    }

    if (player.soulsEquipped.length > 2) {
        player.soulsEquipped = player.soulsEquipped.slice(0, 2);
    }

    const seenSoulIds = new Set();
    player.soulsInventory = player.soulsInventory.filter(soul => {
        const key = String(soul?.instanceId || soul?.id || '');
        if (!key) return false;
        if (seenSoulIds.has(key)) return false;
        seenSoulIds.add(key);
        return true;
    });

    for (let i = 0; i < player.soulsEquipped.length; i++) {
        const soul = player.soulsEquipped[i];
        if (!s