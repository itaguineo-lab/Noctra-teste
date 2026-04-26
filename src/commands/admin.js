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
    if (slot === 'shield') return 'Item de mão secundária';
    if (slot === 'armor') return 'Armadura desconhecida';
    if (slot === 'boots') return 'Botas desconhecidas';
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
        `🛡️ Mão Secundária: ${safeName(eq.shield?.name)}`,
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
        if (!soul) continue;

        const key = String(soul.instanceId || soul.id || '');
        if (!key) {
            player.soulsEquipped[i] = null;
            continue;
        }

        if (seenSoulIds.has(key)) {
            player.soulsEquipped[i] = null;
            continue;
        }

        seenSoulIds.add(key);
    }
}

function repairCorePlayerState(player) {
    if (!validateMapValue(player.currentMap)) {
        player.currentMap = 'clareira_sombria';
    }

    player.inventory ??= [];
    player.soulsInventory ??= [];
    player.soulsEquipped ??= [null, null];
    player.consumables ??= {
        potionHp: 0,
        potionEnergy: 0,
        tonicStrength: 0,
        tonicDefense: 0
    };

    player.buffs = Array.isArray(player.buffs) ? player.buffs.filter(Boolean) : [];

    normalizeVipState(player);
    applyInventoryCapacity(player);
    recalculateStats(player);

    player.hp = Math.max(1, Math.min(Number(player.hp || player.maxHp || 1), player.maxHp || 1));
    player.energy = Math.max(0, Math.min(Number(player.energy || player.maxEnergy || 0), player.maxEnergy || 0));
}

function buildPlayerFixSummary(player, repairReport, beforeSouls, afterSouls) {
    return (
        `🧹 *PLAYERFIX EXECUTADO*\n\n` +
        `👤 ${player.name}\n` +
        `🆔 \`${player.id}\`\n\n` +
        `*Inventário*\n` +
        `• Antes: ${repairReport.beforeInventory}\n` +
        `• Depois: ${repairReport.afterInventory}\n` +
        `• Lixo removido: ${repairReport.removedGhostItems}\n\n` +
        `*Equipamento*\n` +
        `• Itens reconstruídos: ${repairReport.repairedEquipmentItems}\n` +
        `• Arma: ${safeName(player.equipment?.weapon?.name)}\n` +
        `• Mão Secundária: ${safeName(player.equipment?.shield?.name)}\n` +
        `• Armadura: ${safeName(player.equipment?.armor?.name)}\n` +
        `• Colar: ${safeName(player.equipment?.necklace?.name)}\n` +
        `• Anel: ${safeName(player.equipment?.ring?.name)}\n` +
        `• Botas: ${safeName(player.equipment?.boots?.name)}\n\n` +
        `*Almas*\n` +
        `• Antes: ${beforeSouls}\n` +
        `• Depois: ${afterSouls}\n\n` +
        `*Estado final*\n` +
        `• HP: ${player.hp}/${player.maxHp}\n` +
        `• Energia: ${player.energy}/${player.maxEnergy}\n` +
        `• Inventário: ${player.inventory.length}/${player.maxInventory}\n` +
        `• VIP: ${buildVipStatusLine(player)}`
    );
}

/*
=================================
RENDER HELP
=================================
*/

function renderAdminHelp() {
    return `🛠️ *PAINEL ADMIN — NOCTRA*

*IDs e busca*
• \`/myid\` → mostra seu ID
• \`/id\` → mostra seu ID
• \`/id\` respondendo alguém → mostra o ID da pessoa
• \`/findplayer ID_ou_nome\`
• \`/findplayername NOME\`
• \`/playerstate ID_ou_nome\`

*Consulta / Operação*
• \`/adminhelp\` → mostra esta lista
• \`/metrics\` → métricas de hoje
• \`/metrics AAAA-MM-DD\` → métricas de uma data específica
• \`/reload\` → reload lógico
• \`/capture\` → ativa captura de imagem para pegar file_id
• \`/playerfix ID_ou_nome\` → repara inventário/equipment corrompidos

*Give / Ajuste de conta*
• \`/give xp ID_ou_nome 500\`
• \`/give gold ID_ou_nome 1000\`
• \`/give nox ID_ou_nome 50\`
• \`/give keys ID_ou_nome 5\`
• \`/give glorias ID_ou_nome 10\`
• \`/give item ID_ou_nome\`
• \`/give soul ID_ou_nome soul_wolf\`
• também funcionam respondendo a mensagem do jogador

*Set direto*
• \`/setplayer ID_ou_nome level 10\`
• \`/setplayer ID_ou_nome gold 5000\`
• \`/setplayer ID_ou_nome nox 100\`
• \`/setplayer ID_ou_nome hp 200\`
• \`/setplayer ID_ou_nome energy 20\`
• \`/setplayer ID_ou_nome keys 10\`
• \`/setplayer ID_ou_nome glorias 15\`
• \`/setplayer ID_ou_nome map cripta_em_ruinas\`
• \`/setplayer ID_ou_nome vipdays 30\`
• também funciona respondendo a mensagem do jogador

*Ferramentas rápidas*
• \`/heal ID_ou_nome\` → cura HP e energia
• \`/teleport ID_ou_nome mapa_id\`

*Moderação*
• \`/ban ID_ou_nome\`
• \`/unban ID_ou_nome\`
• também funciona respondendo a mensagem do jogador

*Captura de asset*
• use \`/capture\`
• depois envie uma foto com legenda
• o bot devolverá somente o file_id`;
}

function renderFindPlayer(player) {
    return `🔎 *PLAYER ENCONTRADO*

👤 Nome: *${safeName(player.name)}*
🆔 ID: \`${safeName(player.id)}\`
🏷️ Classe: ${safeName(player.class)}
⭐ Nível: ${formatNumber(player.level)}
🗺️ Mapa: ${safeName(player.currentMap)}
❤️ HP: ${formatNumber(player.hp)}/${formatNumber(player.maxHp)}
⚡ Energia: ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)}

💰 Ouro: ${formatNumber(player.gold)}
💎 Nox: ${formatNumber(player.nox)}
🏅 Glórias: ${formatNumber(player.glorias)}
🗝️ Chaves: ${formatNumber(player.keys)}

🎒 Inventário: ${formatNumber((player.inventory || []).length)}/${formatNumber(player.maxInventory || BALANCE.inventory.baseMax)}
💀 Almas no inventário: ${formatNumber((player.soulsInventory || []).length)}
✨ VIP: ${buildVipStatusLine(player)}
⛔ Banido: ${player.banned ? 'Sim' : 'Não'}`;
}

function renderPlayerState(player) {
    return `🧾 *PLAYER STATE*

👤 Nome: *${safeName(player.name)}*
🆔 ID: \`${safeName(player.id)}\`
🏷️ Classe: ${safeName(player.class)}
⭐ Nível: ${formatNumber(player.level)}
✨ XP: ${formatNumber(player.xp)}
🗺️ Mapa: ${safeName(player.currentMap)}

*Status*
❤️ HP: ${formatNumber(player.hp)}/${formatNumber(player.maxHp)}
⚡ Energia: ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)}
⚔️ ATK: ${formatNumber(player.atk)}
🛡️ DEF: ${formatNumber(player.def)}
💥 CRIT: ${formatNumber(player.crit)}%

*Economia*
💰 Ouro: ${formatNumber(player.gold)}
💎 Nox: ${formatNumber(player.nox)}
🏅 Glórias: ${formatNumber(player.glorias)}
🗝️ Chaves: ${formatNumber(player.keys)}

*Inventário / Progressão*
🎒 Inventário: ${formatNumber((player.inventory || []).length)}/${formatNumber(player.maxInventory || BALANCE.inventory.baseMax)}
💀 Almas inventário: ${formatNumber((player.soulsInventory || []).length)}
☠️ Total de kills: ${formatNumber(player.totalKills)}
📉 Soul pity: ${formatNumber(player.soulPityCounter)}

*Equipamentos*
${buildEquipmentLines(player)}

*Almas equipadas*
${buildSoulsLines(player)}

*Flags*
✨ VIP: ${buildVipStatusLine(player)}
⛔ Banido: ${player.banned ? 'Sim' : 'Não'}`;
}

function renderPlayerNameMatches(matches, query) {
    let text = `🔎 *RESULTADOS PARA:* ${safeName(query)}\n\n`;

    if (!matches.length) {
        return text + 'Nenhum jogador encontrado.';
    }

    matches.slice(0, 10).forEach((player, index) => {
        text += `${index + 1}. *${safeName(player.name)}*\n`;
        text += `   🆔 \`${safeName(player.id)}\`\n`;
        text += `   ⭐ Nível ${formatNumber(player.level)} | 🗺️ ${safeName(player.currentMap)}\n`;
        text += `   💰 ${formatNumber(player.gold)} ouro | 💎 ${formatNumber(player.nox)} nox\n`;
        text += `   ✨ VIP: ${isVipActive(player) ? 'Sim' : 'Não'}\n\n`;
    });

    return text;
}

function renderMetricsMessage(summary) {
    const c = summary.counters;
    const d = summary.derived;

    return `📊 *NOCTRA METRICS — ${summary.dateKey}*

*Aquisição / Atividade*
• Players criados: ${c.playersCreated}
• Menu loads: ${c.menuLoads}

*Combate*
• Iniciados: ${c.combatsStarted}
• Vitórias: ${c.combatsWon}
• Derrotas: ${c.combatsLost}
• Fugas: ${c.combatsFled}
• Win rate: ${d.winRate}%

*Dungeon*
• Iniciadas: ${c.dungeonsStarted}
• Concluídas: ${c.dungeonsCompleted}
• Abandonadas: ${c.dungeonsAbandoned}
• Salas limpas: ${c.dungeonRoomsCleared}
• Finish rate: ${d.dungeonFinishRate}%

*Drops / Economia*
• Itens dropados: ${c.itemsDropped}
• Souls dropadas: ${c.soulsDropped}
• Keys dropadas: ${c.keysDropped}
• Ouro entregue: ${c.goldAwarded}
• XP entregue: ${c.xpAwarded}

*Uso*
• Consumíveis usados: ${c.consumablesUsed}

*Médias*
• Ouro por vitória: ${d.avgGoldPerCombat}
• XP por vitória: ${d.avgXpPerCombat}`;
}

/*
=================================
ID COMMANDS
=================================
*/

async function handleAdminHelp(ctx) {
    if (!(await requireAdmin(ctx))) return;
    return ctx.reply(renderAdminHelp(), { parse_mode: 'Markdown' });
}

async function handleMyId(ctx) {
    if (!(await requireAdmin(ctx))) return;

    return ctx.reply(
        `🆔 *SEU ID ADMIN*\n\n` +
        `Nome: *${safeName(ctx.from.first_name)}*\n` +
        `ID: \`${String(ctx.from.id)}\``,
        { parse_mode: 'Markdown' }
    );
}

async function handleId(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const replyUser = ctx.message?.reply_to_message?.from;

    if (replyUser) {
        const label = replyUser.username
            ? `@${replyUser.username}`
            : (replyUser.first_name || 'jogador');

        return ctx.reply(
            `🆔 *ID DO JOGADOR*\n\n` +
            `Jogador: *${safeName(label)}*\n` +
            `ID: \`${String(replyUser.id)}\``,
            { parse_mode: 'Markdown' }
        );
    }

    return ctx.reply(
        `🆔 *SEU ID*\n\n` +
        `Nome: *${safeName(ctx.from.first_name)}*\n` +
        `ID: \`${String(ctx.from.id)}\``,
        { parse_mode: 'Markdown' }
    );
}

/*
=================================
PLAYER INSPECTION
=================================
*/

async function handleFindPlayer(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerForSingleTargetCommand(ctx, '/findplayer 123456789');
    if (!player) return;

    return ctx.reply(renderFindPlayer(player), { parse_mode: 'Markdown' });
}

async function handlePlayerState(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerForSingleTargetCommand(ctx, '/playerstate 123456789');
    if (!player) return;

    return ctx.reply(renderPlayerState(player), { parse_mode: 'Markdown' });
}

async function handleFindPlayerName(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const text = String(ctx.message?.text || '');
    const query = text.replace(/^\/findplayername(@\w+)?\s*/i, '').trim();

    if (!query) {
        return ctx.reply('❌ Uso: /findplayername NomeDoJogador');
    }

    const matches = await findPlayersByName(query, 10);
    return ctx.reply(renderPlayerNameMatches(matches, query), { parse_mode: 'Markdown' });
}

/*
=================================
SET PLAYER
=================================
*/

async function handleSetPlayer(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const payload = await resolveSetPlayerPayload(ctx);
    if (!payload) return;

    const { player, field, value } = payload;

    if (!VALID_SETPLAYER_FIELDS.has(field)) {
        return ctx.reply('❌ Campo inválido. Use: level, gold, nox, energy, hp, keys, glorias, map, vipdays');
    }

    try {
        if (field === 'level') {
            const level = Math.max(1, Number(value));
            if (!Number.isFinite(level)) {
                return ctx.reply('❌ Nível inválido.');
            }

            player.level = level;
            player.xp = 0;
            recalculateStats(player);
            player.hp = player.maxHp;
        }

        if (field === 'gold') {
            const amount = toPositiveNumber(value);
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para gold.');
            }
            player.gold = amount;
        }

        if (field === 'nox') {
            const amount = toPositiveNumber(value);
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para nox.');
            }
            player.nox = amount;
        }

        if (field === 'energy') {
            const amount = toPositiveNumber(value);
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para energy.');
            }
            player.energy = Math.min(amount, player.maxEnergy || amount);
        }

        if (field === 'hp') {
            const amount = toPositiveNumber(value);
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para hp.');
            }
            player.hp = Math.min(Math.max(1, amount), player.maxHp || amount);
        }

        if (field === 'keys') {
            const amount = toPositiveNumber(value);
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para keys.');
            }
            player.keys = amount;
        }

        if (field === 'glorias') {
            const amount = toPositiveNumber(value);
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para glorias.');
            }
            player.glorias = amount;
        }

        if (field === 'map') {
            if (!validateMapValue(value)) {
                return ctx.reply('❌ Mapa inválido.');
            }
            player.currentMap = String(value).trim();
        }

        if (field === 'vipdays') {
            const days = toPositiveNumber(value);
            if (!Number.isFinite(days)) {
                return ctx.reply('❌ Valor inválido para vipdays.');
            }

            if (days === 0) {
                player.vip = false;
                player.vipExpires = null;
                normalizeVipState(player);
                player.maxEnergy = BALANCE.energy.baseMax;
                player.energy = Math.min(player.energy || BALANCE.energy.baseMax, BALANCE.energy.baseMax);
                applyInventoryCapacity(player);
            } else {
                const now = Date.now();
                const currentExpire = player.vipExpires ? new Date(player.vipExpires).getTime() : now;
                const baseTime = Math.max(now, Number.isFinite(currentExpire) ? currentExpire : now);

                const oldMaxEnergy = Number(player.maxEnergy || BALANCE.energy.baseMax);

                player.vip = true;
                player.vipExpires = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
                normalizeVipState(player);

                player.maxEnergy = BALANCE.energy.vipMax;

                if (oldMaxEnergy < BALANCE.energy.vipMax) {
                    const diff = BALANCE.energy.vipMax - oldMaxEnergy;
                    player.energy = Math.min(BALANCE.energy.vipMax, (player.energy || 0) + diff);
                } else {
                    player.energy = Math.min(player.energy || BALANCE.energy.vipMax, BALANCE.energy.vipMax);
                }

                applyInventoryCapacity(player);
            }
        }

        await saveAdminPlayer(player);

        const xpNext = getXpToNextLevel(player.level || 1);

        return ctx.reply(
            `✅ Jogador atualizado com sucesso.\n\n` +
            `👤 ${player.name}\n` +
            `🆔 ${player.id}\n` +
            `⭐ Nível: ${player.level}\n` +
            `✨ XP: ${player.xp}/${xpNext}\n` +
            `❤️ HP: ${player.hp}/${player.maxHp}\n` +
            `💰 Ouro: ${player.gold}\n` +
            `💎 Nox: ${player.nox}\n` +
            `🏅 Glórias: ${player.glorias}\n` +
            `🗝️ Chaves: ${player.keys}\n` +
            `⚡ Energia: ${player.energy}/${player.maxEnergy}\n` +
            `🗺️ Mapa: ${player.currentMap}\n` +
            `✨ VIP: ${buildVipStatusLine(player)}`
        );
    } catch (error) {
        console.error('Erro em /setplayer:', error);
        return ctx.reply('❌ Erro ao atualizar jogador.');
    }
}

/*
=================================
GIVE COMMANDS
=================================
*/

async function handleGiveXp(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    applyXpReward(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} XP concedido para ${player.name}.`);
}

async function handleGiveGold(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    addGold(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} gold concedido para ${player.name}.`);
}

async function handleGiveNox(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    addNox(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} Nox concedido para ${player.name}.`);
}

async function handleGiveKeys(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    addKeys(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} chave(s) concedida(s) para ${player.name}.`);
}

async function handleGiveGlorias(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    addGlorias(player, amount);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${amount} glória(s) concedida(s) para ${player.name}.`);
}

async function handleGiveItem(ctx) {
    if (!(await requireAdmin(ctx))) return;

    let player = await resolvePlayerFromReply(ctx);
    const parts = splitText(ctx.message?.text || '');

    if (!player) {
        const rawTarget = parts[2];
        if (!rawTarget) {
            return ctx.reply('❌ Uso: /give item ID_ou_nome\nTambém funciona respondendo a mensagem do jogador.');
        }
        player = await resolvePlayerFlexible(rawTarget);
    }

    if (!player) {
        return ctx.reply('❌ Jogador não encontrado.');
    }

    const mapToDropTable = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4,
        citadela_lunar: 5,
        abismo_noctra: 6
    };

    const mapNumber = mapToDropTable[player.currentMap] || 1;

    const item = generateDrop(mapNumber, {
        encounterTier: 'boss',
        rarityBias: mapNumber <= 2 ? 'mid_boss' : 'late_boss'
    });

    const result = addInventoryItem(player, item);
    if (!result.success) {
        return ctx.reply(`❌ Falha ao adicionar item: ${result.message}`);
    }

    await saveAdminPlayer(player);
    return ctx.reply(`✅ Item ${item.name} concedido para ${player.name}.`);
}

async function handleGiveSoul(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const resolved = await resolveGiveSoulPayload(ctx);
    if (!resolved) return;

    const { player, soulId } = resolved;
    let soulTemplate = null;

    if (soulId === 'random') {
        soulTemplate = pickRandomSoulForPlayer(player);
    } else {
        soulTemplate = getSoulById(soulId);
    }

    if (!soulTemplate) {
        return ctx.reply('❌ Alma inválida. Use um id válido ou random.');
    }

    player.soulsInventory ??= [];
    const soulInstance = buildSoulInstance(soulTemplate);
    player.soulsInventory.push(soulInstance);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ Alma ${soulTemplate.name} concedida para ${player.name}.`);
}

/*
=================================
UTILITY COMMANDS
=================================
*/

async function handleHeal(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerForSingleTargetCommand(ctx, '/heal 123456789');
    if (!player) return;

    restoreFullHp(player);
    restoreFullEnergy(player);
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${player.name} foi curado(a) totalmente. HP e energia restaurados.`);
}

async function handleTeleport(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const payload = await resolveTeleportPayload(ctx);
    if (!payload) return;

    const { player, map } = payload;

    if (!validateMapValue(map)) {
        return ctx.reply('❌ Mapa inválido.');
    }

    player.currentMap = map;
    await saveAdminPlayer(player);

    return ctx.reply(`✅ ${player.name} teleportado para ${map}.`);
}

async function handlePlayerFix(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerForSingleTargetCommand(ctx, '/playerfix 123456789');
    if (!player) return;

    try {
        const beforeSouls = Array.isArray(player.soulsInventory) ? player.soulsInventory.length : 0;

        repairCorePlayerState(player);
        const repairReport = repairLegacyInventoryAndEquipment(player);
        repairSouls(player);
        repairCorePlayerState(player);

        await saveAdminPlayer(player);

        const reloaded = await getPlayer(player.id);
        if (!reloaded) {
            return ctx.reply('❌ Falha ao recarregar jogador após playerfix.');
        }

        const afterSouls = Array.isArray(reloaded.soulsInventory) ? reloaded.soulsInventory.length : 0;

        return ctx.reply(
            buildPlayerFixSummary(reloaded, repairReport, beforeSouls, afterSouls),
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Erro em /playerfix:', error);
        return ctx.reply('❌ Erro ao executar playerfix.');
    }
}

/*
=================================
BAN / UNBAN
=================================
*/

async function handleBan(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerFromBanCommand(ctx, '/ban 123456');
    if (!player) return;

    if (isProtectedPlayer(player)) {
        return ctx.reply('❌ Este jogador está protegido. Não é possível banir um admin por este comando.');
    }

    player.banned = true;
    await savePlayer(player.id, player);

    return ctx.reply(`⛔ ${player.name} foi banido.`);
}

async function handleUnban(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerFromBanCommand(ctx, '/unban 123456');
    if (!player) return;

    player.banned = false;
    await savePlayer(player.id, player);

    return ctx.reply(`✅ ${player.name} foi desbanido.`);
}

/*
=================================
RELOAD
=================================
*/

async function handleReload(ctx) {
    if (!(await requireAdmin(ctx))) return;
    return ctx.reply('♻️ Reload lógico concluído. Reinicie manualmente se quiser rebuild total.');
}

/*
=================================
CAPTURE
=================================
*/

async function handleCapture(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const userId = String(ctx.from.id);
    captureSessions.add(userId);

    return ctx.reply('📸 Modo captura ativado. Envie uma imagem.');
}

async function handleCapturePhoto(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const userId = String(ctx.from.id);

    if (!captureSessions.has(userId)) {
        return;
    }

    const photos = ctx.message?.photo || [];

    if (!photos.length) {
        captureSessions.delete(userId);
        return ctx.reply('❌ Nenhuma foto encontrada.');
    }

    const bestPhoto = photos[photos.length - 1];
    const fileId = bestPhoto.file_id;

    captureSessions.delete(userId);

    return ctx.reply(fileId);
}

/*
=================================
METRICS
=================================
*/

async function handleMetrics(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const text = ctx.message?.text || '';
    const parts = splitText(text);
    const dateKey = parts[1];

    const metricsDoc = dateKey
        ? await getMetricsByDate(dateKey)
        : await getTodayMetrics();

    const summary = buildMetricsSummary(metricsDoc);
    return ctx.reply(renderMetricsMessage(summary), { parse_mode: 'Markdown' });
}

module.exports = {
    handleAdminHelp,
    handleMyId,
    handleId,
    handleFindPlayer,
    handleFindPlayerName,
    handlePlayerState,
    handleSetPlayer,
    handleGiveXp,
    handleGiveGold,
    handleGiveNox,
    handleGiveKeys,
    handleGiveGlorias,
    handleGiveItem,
    handleGiveSoul,
    handleHeal,
    handleTeleport,
    handlePlayerFix,
    handleBan,
    handleUnban,
    handleReload,
    handleCapture,
    handleCapturePhoto,
    handleMetrics
};