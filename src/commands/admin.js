const { getPlayer, savePlayer } = require('../core/player/playerService');
const { generateDrop } = require('../data/items');
const {
    addGold,
    addNox,
    addInventoryItem,
    applyXpReward,
    normalizePlayerForSave
} = require('../core/player/playerMutations');
const {
    getTodayMetrics,
    getMetricsByDate,
    buildMetricsSummary
} = require('../core/metrics/metricsService');

function isAdmin(ctx) {
    const adminIds = String(process.env.ADMIN_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    return adminIds.includes(String(ctx.from.id));
}

async function requireAdmin(ctx) {
    if (!isAdmin(ctx)) {
        await ctx.reply('⛔ Comando restrito ao administrador.');
        return false;
    }
    return true;
}

function extractMentionOrId(text = '') {
    const parts = text.trim().split(/\s+/);
    return parts[2] || null;
}

function extractTargetId(raw) {
    if (!raw) return null;
    return String(raw).replace('@', '').trim();
}

function extractAmount(text = '', fallback = 0) {
    const parts = text.trim().split(/\s+/);
    const last = Number(parts[parts.length - 1]);
    return Number.isFinite(last) ? last : fallback;
}

async function resolvePlayerFromCommand(ctx) {
    const text = ctx.message?.text || '';
    const rawTarget = extractMentionOrId(text);

    if (!rawTarget) {
        await ctx.reply('❌ Informe o alvo. Ex: /give gold 123456 500');
        return null;
    }

    const targetId = extractTargetId(rawTarget);
    const player = await getPlayer(targetId);

    if (!player) {
        await ctx.reply('❌ Jogador não encontrado.');
        return null;
    }

    return player;
}

/*
=================================
GIVE XP
=================================
*/

async function handleGiveXp(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerFromCommand(ctx);
    if (!player) return;

    const amount = extractAmount(ctx.message.text, 0);
    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    applyXpReward(player, amount);
    normalizePlayerForSave(player);
    await savePlayer(player.id, player);

    return ctx.reply(`✅ ${amount} XP concedido para ${player.name}.`);
}

/*
=================================
GIVE GOLD
=================================
*/

async function handleGiveGold(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerFromCommand(ctx);
    if (!player) return;

    const amount = extractAmount(ctx.message.text, 0);
    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    addGold(player, amount);
    normalizePlayerForSave(player);
    await savePlayer(player.id, player);

    return ctx.reply(`✅ ${amount} gold concedido para ${player.name}.`);
}

/*
=================================
GIVE NOX
=================================
*/

async function handleGiveNox(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerFromCommand(ctx);
    if (!player) return;

    const amount = extractAmount(ctx.message.text, 0);
    if (amount <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
    }

    addNox(player, amount);
    normalizePlayerForSave(player);
    await savePlayer(player.id, player);

    return ctx.reply(`✅ ${amount} Nox concedido para ${player.name}.`);
}

/*
=================================
GIVE ITEM
=================================
*/

async function handleGiveItem(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerFromCommand(ctx);
    if (!player) return;

    const item = generateDrop(player.currentMap === 'clareira_sombria' ? 1 : 2, {
        encounterTier: 'boss',
        rarityBias: 'mid_boss'
    });

    const result = addInventoryItem(player, item);
    if (!result.success) {
        return ctx.reply(`❌ Falha ao adicionar item: ${result.message}`);
    }

    normalizePlayerForSave(player);
    await savePlayer(player.id, player);

    return ctx.reply(`✅ Item ${item.name} concedido para ${player.name}.`);
}

/*
=================================
BAN / UNBAN
=================================
*/

async function handleBan(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const text = ctx.message?.text || '';
    const parts = text.trim().split(/\s+/);
    const targetId = parts[1];

    if (!targetId) {
        return ctx.reply('❌ Uso: /ban 123456');
    }

    const player = await getPlayer(targetId);
    if (!player) return ctx.reply('❌ Jogador não encontrado.');

    player.banned = true;
    await savePlayer(player.id, player);

    return ctx.reply(`⛔ ${player.name} foi banido.`);
}

async function handleUnban(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const text = ctx.message?.text || '';
    const parts = text.trim().split(/\s+/);
    const targetId = parts[1];

    if (!targetId) {
        return ctx.reply('❌ Uso: /unban 123456');
    }

    const player = await getPlayer(targetId);
    if (!player) return ctx.reply('❌ Jogador não encontrado.');

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
METRICS
=================================
*/

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

async function handleMetrics(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const text = ctx.message?.text || '';
    const parts = text.trim().split(/\s+/);
    const dateKey = parts[1];

    const metricsDoc = dateKey
        ? await getMetricsByDate(dateKey)
        : await getTodayMetrics();

    const summary = buildMetricsSummary(metricsDoc);
    return ctx.reply(renderMetricsMessage(summary), { parse_mode: 'Markdown' });
}

module.exports = {
    handleGiveXp,
    handleGiveGold,
    handleGiveNox,
    handleGiveItem,
    handleBan,
    handleUnban,
    handleReload,
    handleMetrics
};