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
const {
    getXpToNextLevel
} = require('../core/player/progression');
const {
    recalculateStats
} = require('../core/player/playerService');

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

function extractFirstArg(text = '') {
    const parts = text.trim().split(/\s+/);
    return parts[1] || null;
}

function extractSetPlayerArgs(text = '') {
    const parts = text.trim().split(/\s+/);
    return {
        targetId: parts[1] || null,
        field: (parts[2] || '').toLowerCase(),
        value: parts.slice(3).join(' ').trim()
    };
}

async function resolvePlayerFromGiveCommand(ctx) {
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

async function resolvePlayerBySingleArg(ctx, usageExample) {
    const text = ctx.message?.text || '';
    const rawTarget = extractFirstArg(text);

    if (!rawTarget) {
        await ctx.reply(`❌ Uso: ${usageExample}`);
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

function formatNumber(value) {
    return Number(value || 0).toLocaleString('pt-BR');
}

function safeName(value, fallback = '—') {
    return value ? String(value) : fallback;
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

function renderAdminHelp() {
    return `🛠️ *PAINEL ADMIN — NOCTRA*

*Consulta / Operação*
• \`/adminhelp\` → mostra esta lista
• \`/metrics\` → métricas de hoje
• \`/metrics AAAA-MM-DD\` → métricas de uma data específica
• \`/findplayer ID\` → resumo rápido da conta
• \`/playerstate ID\` → inspeção detalhada da conta
• \`/reload\` → reload lógico

*Give / Ajuste de conta*
• \`/give xp ID 500\`
• \`/give gold ID 1000\`
• \`/give nox ID 50\`
• \`/give item ID\`

*Set direto*
• \`/setplayer ID level 10\`
• \`/setplayer ID gold 5000\`
• \`/setplayer ID nox 100\`
• \`/setplayer ID energy 20\`
• \`/setplayer ID map cripta_em_ruinas\`
• \`/setplayer ID vipdays 30\`

*Moderação*
• \`/ban ID\`
• \`/unban ID\`

*Reset*
• \`/reset\` → reseta o próprio personagem
• \`/resetplayer ID\` → reseta um jogador específico
• \`/resetall CONFIRMAR_RESET_TOTAL\` → reseta o jogo todo

*Observações*
• comandos com *ID* exigem o ID do jogador
• \`/resetall\` é destrutivo e apaga todos os jogadores
• use com extremo cuidado`;
}

async function handleAdminHelp(ctx) {
    if (!(await requireAdmin(ctx))) return;
    return ctx.reply(renderAdminHelp(), { parse_mode: 'Markdown' });
}

/*
=================================
PLAYER INSPECTION
=================================
*/

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

🎒 Inventário: ${formatNumber((player.inventory || []).length)}/${formatNumber(player.maxInventory || 20)}
💀 Almas no inventário: ${formatNumber((player.soulsInventory || []).length)}
✨ VIP: ${player.vip ? 'Sim' : 'Não'}
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
🎒 Inventário: ${formatNumber((player.inventory || []).length)}/${formatNumber(player.maxInventory || 20)}
💀 Almas inventário: ${formatNumber((player.soulsInventory || []).length)}
☠️ Total de kills: ${formatNumber(player.totalKills)}
📉 Soul pity: ${formatNumber(player.soulPityCounter)}

*Equipamentos*
${buildEquipmentLines(player)}

*Almas equipadas*
${buildSoulsLines(player)}

*Flags*
✨ VIP: ${player.vip ? 'Sim' : 'Não'}
⛔ Banido: ${player.banned ? 'Sim' : 'Não'}`;
}

async function handleFindPlayer(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerBySingleArg(ctx, '/findplayer 123456789');
    if (!player) return;

    return ctx.reply(renderFindPlayer(player), { parse_mode: 'Markdown' });
}

async function handlePlayerState(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerBySingleArg(ctx, '/playerstate 123456789');
    if (!player) return;

    return ctx.reply(renderPlayerState(player), { parse_mode: 'Markdown' });
}

/*
=================================
SET PLAYER
=================================
*/

async function handleSetPlayer(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const text = ctx.message?.text || '';
    const { targetId, field, value } = extractSetPlayerArgs(text);

    if (!targetId || !field || !value) {
        return ctx.reply(
            '❌ Uso: /setplayer ID campo valor\n\n' +
            'Campos suportados:\n' +
            '• level\n• gold\n• nox\n• energy\n• map\n• vipdays'
        );
    }

    const player = await getPlayer(extractTargetId(targetId));
    if (!player) {
        return ctx.reply('❌ Jogador não encontrado.');
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
        } else if (field === 'gold') {
            const amount = Math.max(0, Number(value));
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para gold.');
            }
            player.gold = amount;
        } else if (field === 'nox') {
            const amount = Math.max(0, Number(value));
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para nox.');
            }
            player.nox = amount;
        } else if (field === 'energy') {
            const amount = Math.max(0, Number(value));
            if (!Number.isFinite(amount)) {
                return ctx.reply('❌ Valor inválido para energy.');
            }
            player.energy = Math.min(amount, player.maxEnergy || amount);
        } else if (field === 'map') {
            player.currentMap = String(value).trim();
        } else if (field === 'vipdays') {
            const days = Math.max(0, Number(value));
            if (!Number.isFinite(days)) {
                return ctx.reply('❌ Valor inválido para vipdays.');
            }

            if (days === 0) {
                player.vip = false;
                player.vipExpires = null;
                player.maxEnergy = 20;
                player.maxInventory = 20;
                player.energy = Math.min(player.energy || 20, 20);
            } else {
                const now = Date.now();
                player.vip = true;
                player.vipExpires = new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
                player.maxEnergy = 40;
                player.maxInventory = Math.max(player.maxInventory || 20, 30);
                player.energy = Math.min(player.energy || 40, player.maxEnergy);
            }
        } else {
            return ctx.reply('❌ Campo inválido. Use: level, gold, nox, energy, map, vipdays');
        }

        normalizePlayerForSave(player);
        await savePlayer(player.id, player);

        const xpNext = getXpToNextLevel(player.level || 1);

        return ctx.reply(
            `✅ Jogador atualizado com sucesso.\n\n` +
            `👤 ${player.name}\n` +
            `⭐ Nível: ${player.level}\n` +
            `✨ XP: ${player.xp}/${xpNext}\n` +
            `💰 Ouro: ${player.gold}\n` +
            `💎 Nox: ${player.nox}\n` +
            `⚡ Energia: ${player.energy}/${player.maxEnergy}\n` +
            `🗺️ Mapa: ${player.currentMap}\n` +
            `✨ VIP: ${player.vip ? 'Sim' : 'Não'}`
        );
    } catch (error) {
        console.error('Erro em /setplayer:', error);
        return ctx.reply('❌ Erro ao atualizar jogador.');
    }
}

/*
=================================
GIVE XP
=================================
*/

async function handleGiveXp(ctx) {
    if (!(await requireAdmin(ctx))) return;

    const player = await resolvePlayerFromGiveCommand(ctx);
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

    const player = await resolvePlayerFromGiveCommand(ctx);
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

    const player = await resolvePlayerFromGiveCommand(ctx);
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

    const player = await resolvePlayerFromGiveCommand(ctx);
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
    handleAdminHelp,
    handleFindPlayer,
    handlePlayerState,
    handleSetPlayer,
    handleGiveXp,
    handleGiveGold,
    handleGiveNox,
    handleGiveItem,
    handleBan,
    handleUnban,
    handleReload,
    handleMetrics
};