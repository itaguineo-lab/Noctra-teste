const { Markup } = require('telegraf');
const { getPlayerCollection } = require('../core/player/playerService');

/*
=================================
ADMIN
=================================
*/

function isAdmin(ctx) {
    const adminIds = process.env.ADMIN_IDS
        ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
        : [];

    return adminIds.includes(String(ctx.from.id));
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

function normalizeRawTarget(value = '') {
    return String(value || '').replace('@', '').trim();
}

function escapeRegex(text = '') {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
=================================
TARGET EXTRACTION
=================================
*/

function extractTarget(ctx) {
    if (ctx.message?.reply_to_message?.from) {
        return {
            type: 'id',
            value: String(ctx.message.reply_to_message.from.id),
            label: ctx.message.reply_to_message.from.username
                ? `@${ctx.message.reply_to_message.from.username}`
                : (ctx.message.reply_to_message.from.first_name || 'jogador')
        };
    }

    const parts = splitText(ctx.message?.text || '');
    if (parts[1]) {
        const raw = normalizeRawTarget(parts.slice(1).join(' '));

        if (isNumericId(raw)) {
            return {
                type: 'id',
                value: raw,
                label: raw
            };
        }

        return {
            type: 'name',
            value: raw,
            label: raw
        };
    }

    return {
        type: 'id',
        value: String(ctx.from.id),
        label: ctx.from.first_name || 'jogador'
    };
}

/*
=================================
PLAYER RESOLUTION
=================================
*/

async function findPlayersByName(collection, name, limit = 10) {
    const safe = String(name || '').trim();
    if (!safe) return [];

    const exactRegex = new RegExp(`^${escapeRegex(safe)}$`, 'i');
    const partialRegex = new RegExp(escapeRegex(safe), 'i');

    const exact = await collection
        .find({
            name: { $regex: exactRegex }
        })
        .limit(limit)
        .toArray();

    if (exact.length) return exact;

    return collection
        .find({
            name: { $regex: partialRegex }
        })
        .limit(limit)
        .toArray();
}

async function resolveTargetPlayer(collection, target) {
    if (target.type === 'id') {
        return await collection.findOne({
            $or: [
                { id: target.value },
                { telegramId: target.value }
            ]
        });
    }

    const matches = await findPlayersByName(collection, target.value, 10);

    if (!matches.length) {
        return null;
    }

    if (matches.length === 1) {
        return matches[0];
    }

    return {
        multiple: true,
        matches
    };
}

function renderMultipleMatches(targetLabel, matches) {
    let text = `⚠️ Foram encontrados múltiplos jogadores para *${targetLabel}*.\n\n`;
    text += `Seja mais específico usando o ID ou responda a mensagem do jogador.\n\n`;

    matches.slice(0, 10).forEach((player, index) => {
        text += `${index + 1}. *${player.name || 'Sem nome'}*\n`;
        text += `   🆔 \`${player.id || 'sem_id'}\`\n`;
        text += `   ⭐ Nível ${player.level || 1} | 🗺️ ${player.currentMap || 'clareira_sombria'}\n\n`;
    });

    return text;
}

/*
=================================
RESET SELF
=================================
*/

async function handleReset(ctx) {
    return requestSelfResetConfirmation(ctx);
}

async function requestSelfResetConfirmation(ctx) {
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Sim, resetar meu personagem', 'reset_confirm'),
            Markup.button.callback('❌ Cancelar', 'reset_cancel')
        ]
    ]);

    await ctx.reply(
        '⚠️ *ATENÇÃO*\n\n' +
        'Você está prestes a *resetar completamente* seu personagem.\n' +
        'Todo o progresso, itens, ouro, NOX, almas e progresso de mapas serão *perdidos para sempre*.\n\n' +
        'Deseja realmente continuar?',
        {
            parse_mode: 'Markdown',
            ...keyboard
        }
    );
}

async function executeResetPlayer(ctx, target, isAdminAction = false) {
    try {
        const collection = await getPlayerCollection();
        const resolved = await resolveTargetPlayer(collection, target);

        if (!resolved) {
            return ctx.reply(
                target.type === 'id'
                    ? `❌ Jogador ${target.value} não encontrado.`
                    : `❌ Jogador ${target.label} não encontrado.`
            );
        }

        if (resolved.multiple) {
            return ctx.reply(
                renderMultipleMatches(target.label, resolved.matches),
                { parse_mode: 'Markdown' }
            );
        }

        const player = resolved;

        await collection.deleteOne({ _id: player._id });

        const message = isAdminAction
            ? `♻️ Personagem de *${player.name}* foi resetado com sucesso.\n🆔 ID: \`${player.id}\``
            : `♻️ Seu personagem foi resetado com sucesso.\n\nUse /start para começar novamente.`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Erro reset player:', error);
        await ctx.reply('❌ Erro ao resetar personagem.');
    }
}

async function handleResetConfirm(ctx) {
    await ctx.answerCbQuery();

    await executeResetPlayer(ctx, {
        type: 'id',
        value: String(ctx.from.id),
        label: ctx.from.first_name || 'jogador'
    }, false);

    try {
        await ctx.deleteMessage();
    } catch {}
}

async function handleResetCancel(ctx) {
    await ctx.answerCbQuery('Operação cancelada.');

    try {
        await ctx.deleteMessage();
    } catch {}
}

/*
=================================
RESET SPECIFIC PLAYER (ADMIN)
=================================
*/

async function handleResetPlayer(ctx) {
    if (!isAdmin(ctx)) {
        return ctx.reply('❌ Apenas administradores podem resetar outros jogadores.');
    }

    const target = extractTarget(ctx);

    if (!target?.value) {
        return ctx.reply(
            '❌ Informe um jogador válido para resetar.\n\n' +
            'Exemplos:\n' +
            '/resetplayer 123456789\n' +
            '/resetplayer Italo\n\n' +
            'Também funciona respondendo a mensagem do jogador.'
        );
    }

    if (target.type === 'id' && target.value === String(ctx.from.id)) {
        return ctx.reply(
            '❌ Para resetar seu próprio personagem, use /reset.\n' +
            'Não use /resetplayer em você mesmo.'
        );
    }

    return executeResetPlayer(ctx, target, true);
}

/*
=================================
RESET ALL PLAYERS (ADMIN)
=================================
*/

async function handleResetAll(ctx) {
    if (!isAdmin(ctx)) {
        return ctx.reply('❌ Apenas administradores podem resetar o jogo todo.');
    }

    const text = (ctx.message?.text || '').trim();
    const parts = text.split(/\s+/);
    const confirmation = parts[1];

    if (confirmation !== 'CONFIRMAR_RESET_TOTAL') {
        return ctx.reply(
            '⚠️ Comando extremamente destrutivo.\n\n' +
            'Para resetar o jogo todo, use exatamente:\n' +
            '`/resetall CONFIRMAR_RESET_TOTAL`',
            { parse_mode: 'Markdown' }
        );
    }

    try {
        const collection = await getPlayerCollection();
        const result = await collection.deleteMany({});

        return ctx.reply(
            `💥 Reset global concluído.\n\n` +
            `Jogadores removidos: ${result.deletedCount || 0}`
        );
    } catch (error) {
        console.error('Erro reset all:', error);
        return ctx.reply('❌ Erro ao resetar o jogo todo.');
    }
}

module.exports = {
    handleReset,
    handleResetConfirm,
    handleResetCancel,
    handleResetPlayer,
    handleResetAll
};