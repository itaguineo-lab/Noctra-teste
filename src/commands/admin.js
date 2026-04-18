const {
    getPlayer,
    savePlayer,
    recalculateStats,
    getPlayerCollection
} = require('../core/player/playerService');

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

/*
=================================
ADMIN CHECK
=================================
*/

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

function getReplyUserId(ctx) {
    return ctx.message?.reply_to_message?.from
        ? String(ctx.message.reply_to_message.from.id)
        : null;
}

function getReplyUserLabel(ctx) {
    const from = ctx.message?.reply_to_message?.from;
    if (!from) return 'jogador';
    return from.username
        ? `@${from.username}`
        : (from.first_name || 'jogador');
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

async function resolvePlayerForSingleTargetCommand(ctx, usageExample) {
    const replyId = getReplyUserId(ctx);
    if (replyId) {
        const player = await getPlayer(replyId);
        if (!player) {
            await ctx.reply('❌ Jogador respondido não encontrado.');
            return null;
        }
        return player;
    }

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
    const replyId = getReplyUserId(ctx);

    let player = null;
    let amount = 0;

    if (replyId) {
        player = await getPlayer(replyId);
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
    const replyId = getReplyUserId(ctx);

    if (replyId) {
        const player = await getPlayer(replyId);
        if (!player) {
            await ctx.reply('❌ Jogador respondido não encontrado.');
            return null;
        }
        return player;
    }

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
    const replyId = getReplyUserId(ctx);

    let rawTarget = null;
    let field = '';
    let value = '';

    if (replyId) {
        field = (parts[1] || '').toLowerCase();
        value = parts.slice(2).join(' ').trim();

        const player = await getPlayer(replyId);
        if (!player) {
            await ctx.reply('❌ Jogador respondido não encontrado.');
            return null;
        }

        return { player, field, value };
    }

    rawTarget = parts[1] || null;
    field = (parts[2] || '').toLowerCase();
    value = parts.slice(3).join(' ').trim();

    if (!rawTarget || !field || !value) {
        await ctx.reply(
            '❌ Uso: /setplayer ID_ou_nome campo valor\n\n' +
            'Exemplos:\n' +
            '/setplayer 123456789 level 10\n' +
            '/setplayer Italo gold 5000\n\n' +
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

*Give / Ajuste de conta*
• \`/give xp ID_ou_nome 500\`
• \`/give gold ID_ou_nome 1000\`
• \`/give nox ID_ou_nome 50\`
• \`/give item ID_ou_nome\`
• também funcionam respondendo a mensagem do jogador

*Set direto*
• \`/setplayer ID_ou_nome level 10\`
• \`/setplayer ID_ou_nome gold 5000\`
• \`/setplayer ID_ou_nome nox 100\`
• \`/setplayer ID_ou_nome energy 20\`
• \`/setplayer ID_ou_nome map cripta_em_ruinas\`
• \`/setplayer ID_ou_nome vipdays 30\`
• também funciona respondendo a mensagem do jogador

*Moderação*
• \`/ban ID_ou_nome\`
• \`/unban ID_ou_nome\`
• também funciona respondendo a mensagem do jogador

*Reset*
• \`/reset\` → reseta o próprio personagem
• \`/resetplayer ID_ou_nome\` → reseta um jogador específico
• \`/resetplayer\` respondendo a mensagem do jogador
• \`/resetall CONFIRMAR_RESET_TOTAL\` → reseta o jogo todo

*Observações*
• busca por nome tenta encontrar o jogador mais compatível
• nomes únicos funcionam melhor
• para evitar erro, reply continua sendo a forma mais segura`;
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

function renderPlayerNameMatches(matches, query) {
    let text = `🔎 *RESULTADOS PARA:* ${safeName(query)}\n\n`;

    if (!matches.length) {
        return text + `Nenhum jogador encontrado.`;
    }

    matches.slice(0, 10).forEach((player, index) => {
        text += `${index + 1}. *${safeName(player.name)}*\n`;
        text += `   🆔 \`${safeName(player.id)}\`\n`;
        text += `   ⭐ Nível ${formatNumber(player.level)} | 🗺️ ${safeName(player.currentMap)}\n`;
        text += `   💰 ${formatNumber(player.gold)} ouro | 💎 ${formatNumber(player.nox)} nox\n\n`;
    });

    return text;
}

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
            `🆔 ${player.id}\n` +
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

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

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

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

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

    const resolved = await resolvePlayerFromGiveCommand(ctx);
    if (!resolved) return;

    const { player, amount } = resolved;

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

    let player = null;
    const replyId = getReplyUserId(ctx);
    const parts = splitText(ctx.message?.text || '');

    if (replyId) {
        player = await getPlayer(replyId);
    } else {
        const rawTarget = parts[2];
        if (!rawTarget) {
            return ctx.reply('❌ Uso: /give item ID_ou_nome\nTambém funciona respondendo a mensagem do jogador.');
        }
        player = await resolvePlayerFlexible(rawTarget);
    }

    if (!player) {
        return ctx.reply('❌ Jogador não encontrado.');
    }

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

    const player = await resolvePlayerFromBanCommand(ctx, '/ban 123456');
    if (!player) return;

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
    handleGiveItem,
    handleBan,
    handleUnban,
    handleReload,
    handleMetrics
};