const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { calculateDamage } = require('../core/combat/damageCalc');

const {
    applyHeal,
    applyDamage,
    restoreEnergy,
    consumeConsumable,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const {
    applyDeathXpPenalty
} = require('../core/player/progression');

const {
    updateMissionProgress
} = require('../core/daily/dailyService');

const {
    navigateText,
    safeAnswer
} = require('../utils/uiNavigator');

const {
    progressBar,
    formatNumber
} = require('../utils/formatters');

const {
    normalizeDungeonState,
    getCurrentRoom,
    startDungeonRun,
    getDungeonMap
} = require('../core/dungeon/dungeonService');

const {
    addDungeonLog,
    resolveTreasureRoom,
    resolveHealRoom,
    resolveCurseRoom,
    resolveShrineRoom,
    resolveCombatRoom,
    finalizeDungeonRun
} = require('../core/dungeon/dungeonRewards');

const {
    recordDungeonStarted,
    recordDungeonCompleted,
    recordDungeonAbandoned,
    recordDungeonRoomCleared,
    recordConsumableUsed
} = require('../core/metrics/metricsService');

/*
=================================
HELPERS
=================================
*/

function escapeMarkdown(text = '') {
    return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function safeSend(ctx, text, options = {}) {
    return navigateText(ctx, text, {
        parse_mode: 'Markdown',
        ...options
    });
}

function buildDungeonIntroText(player) {
    const map = getDungeonMap(player);

    return [
        `━━━━━━━━━━━━━━━━━━━━━━`,
        `🏰 *MASMORRA 3.0*`,
        `━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `🗺️ Destino: ${map.emoji} ${map.name}`,
        `🗝️ Chaves disponíveis: ${player.keys || 0}`,
        `⚡ Energia atual: ${player.energy}/${player.maxEnergy}`,
        ``,
        `Expedição premium por salas:`,
        `• Combate, Elite e Boss`,
        `• Tesouro, Fonte, Maldição e Santuário`,
        `• Recompensa final superior ao farm`,
        `• Conteúdo ideal para build e progresso real`,
        ``,
        `*Regra:* a masmorra consome chave, não energia.`,
        ``,
        `Toque em *Nova expedição* para começar.`
    ].join('\n');
}

function buildDungeonSummary(player) {
    const d = normalizeDungeonState(player);
    const sum = d.summary || {};
    const map = getDungeonMap(player);

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (d.completed) {
        text += `🏆 *MASMORRA CONCLUÍDA* 🏆\n`;
    } else if (d.aborted) {
        text += `🚪 *EXPEDIÇÃO ENCERRADA* 🚪\n`;
    } else {
        text += `🏰 *MASMORRA*\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🗺️ ${map.emoji} ${map.name}\n\n`;
    text += `📊 Salas vencidas: ${sum.roomsCleared || 0}/${d.maxRooms}\n`;
    text += `🚪 Salas visitadas: ${d.roomsVisited || 0}\n`;
    text += `✨ XP: ${formatNumber(sum.xp || 0)}\n`;
    text += `💰 Ouro: ${formatNumber(sum.gold || 0)}\n`;
    text += `🗝️ Chaves: ${sum.keys || 0}\n`;
    text += `🏅 Glórias: ${sum.glorias || 0}\n`;
    text += `🎁 Itens: ${sum.items || 0}\n`;

    if (sum.completionItem) {
        text += `\n🏁 *Recompensa Final*\n`;
        text += `• ${sum.completionItem.name} [${sum.completionItem.rarity}]\n`;
    }

    if (sum.notes?.length) {
        text += `\n📜 *Destaques*\n`;
        text += sum.notes.map(note => `• ${note}`).join('\n');
    }

    return text;
}

function renderDungeonText(player) {
    const d = normalizeDungeonState(player);

    if (!d.active || d.completed || d.aborted) {
        const hasSummary = d.summary && (d.completed || d.aborted);
        if (!hasSummary) {
            return buildDungeonIntroText(player);
        }

        return buildDungeonSummary(player);
    }

    const room = getCurrentRoom(player);
    if (!room) {
        return buildDungeonSummary(player);
    }

    const map = getDungeonMap(player);
    const hpBar = progressBar(player.hp, player.maxHp, 8, '🟩', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 8, '🟦', '⬛');
    const progressPercent = Math.floor(((d.currentRoomIndex + 1) / d.maxRooms) * 100);
    const roomProgressBar = progressBar(d.currentRoomIndex + 1, d.maxRooms, 8, '🟪', '⬛');

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏰 *MASMORRA: ${map.name}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🚪 Sala ${d.currentRoomIndex + 1}/${d.maxRooms} ${roomProgressBar} ${progressPercent}%\n`;
    text += `${room.emoji} *${room.title}*\n`;
    text += `📖 ${room.description}\n\n`;
    text += `👤 ${escapeMarkdown(player.name)} Lv.${player.level}\n`;
    text += `❤️ ${player.hp}/${player.maxHp} ${hpBar}\n`;
    text += `⚡ ${player.energy}/${player.maxEnergy} ${energyBar}\n\n`;

    if (d.combatBonus.atk || d.combatBonus.def || d.combatBonus.crit) {
        text += `✨ *Bônus da Expedição*: ⚔️ +${d.combatBonus.atk}  🛡️ +${d.combatBonus.def}  💥 +${d.combatBonus.crit}%\n\n`;
    }

    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        const e = room.enemy;
        const enemyBar = progressBar(e.hp, e.maxHp, 8, '🟥', '⬛');
        const badge =
            room.type === 'boss'
                ? '👑 BOSS'
                : room.type === 'elite'
                    ? '🔥 ELITE'
                    : '👹 INIMIGO';

        text += `${badge}: ${e.emoji || '👹'} *${escapeMarkdown(e.name)}* Lv.${e.level}\n`;
        text += `❤️ ${e.hp}/${e.maxHp} ${enemyBar}\n`;
        text += `⚔️ ${e.atk} 🛡️ ${e.def} 💥 ${e.crit}%\n`;

        if (d.logs?.length) {
            text += `\n📜 *Últimas ações*\n`;
            text += d.logs.slice(-3).join('\n');
        }

        text += `\n`;
    } else {
        text += `Ação: ${
            room.type === 'treasure'
                ? 'Abrir tesouro'
                : room.type === 'heal'
                    ? 'Canalizar fonte'
                    : room.type === 'shrine'
                        ? 'Receber bênção'
                        : 'Aceitar maldição'
        }\n\n`;
    }

    text += `📊 *Acumulado da Run*\n`;
    text += `✨ XP: ${d.rewards.xp}  💰 Ouro: ${d.rewards.gold}  🗝️ Chaves: ${d.rewards.keys}  🎁 Itens: ${d.rewards.items}\n`;

    return text;
}

function buildDungeonKeyboard(player) {
    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!d.active || d.completed || d.aborted) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('⚔️ Nova expedição (1🗝️)', 'dungeon_start')],
            [Markup.button.callback('🏠 Menu', 'menu')]
        ]);
    }

    if (!room) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('⚔️ Continuar', 'dungeon_attack')],
            [Markup.button.callback('🏠 Menu', 'menu')]
        ]);
    }

    if (room.cleared) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('➡️ Próxima sala', 'dungeon_next_room')],
            [Markup.button.callback('🏃 Sair', 'dungeon_flee'), Markup.button.callback('🏠 Menu', 'menu')]
        ]);
    }

    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        return Markup.inlineKeyboard([
            [Markup.button.callback('⚔️ Atacar', 'dungeon_attack')],
            [Markup.button.callback('🧪 Itens', 'dungeon_consumables')],
            [Markup.button.callback('🏃 Fugir', 'dungeon_flee'), Markup.button.callback('🏠 Menu', 'menu')]
        ]);
    }

    return Markup.inlineKeyboard([
        [Markup.button.callback(
            room.type === 'treasure'
                ? '🎁 Abrir Tesouro'
                : room.type === 'heal'
                    ? '❤️ Canalizar'
                    : room.type === 'shrine'
                        ? '✨ Receber Bênção'
                        : '💀 Aceitar Maldição',
            'dungeon_attack'
        )],
        [Markup.button.callback('🏃 Sair', 'dungeon_flee'), Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

/*
=================================
HANDLERS
=================================
*/

async function handleDungeon(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    normalizeDungeonState(player);
    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonStart(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    if (!player.keys || player.keys < 1) {
        await safeAnswer(ctx, '❌ Você precisa de 1 Chave de Masmorra para entrar.', {
            show_alert: true
        });
        return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
    }

    player.keys -= 1;
    startDungeonRun(player);

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await recordDungeonStarted();

    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonAttack(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!room || room.cleared) {
        return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
    }

    let result;

    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        result = await resolveCombatRoom(player, room);
    } else if (room.type === 'treasure') {
        result = resolveTreasureRoom(player, room);
    } else if (room.type === 'heal') {
        result = resolveHealRoom(player, room);
    } else if (room.type === 'curse') {
        result = resolveCurseRoom(player, room);
    } else if (room.type === 'shrine') {
        result = resolveShrineRoom(player, room);
    } else {
        result = { success: false, message: 'Sala inválida.' };
    }

    normalizePlayerForSave(player);

    if (room.cleared) {
        await recordDungeonRoomCleared(1);
    }

    if (result.playerDefeated) {
        const penalty = applyDeathXpPenalty(player, 0.05);

        d.summary = {
            roomsCleared: d.rooms.filter(r => r.cleared).length,
            xp: d.rewards.xp,
            gold: d.rewards.gold,
            keys: d.rewards.keys,
            glorias: d.rewards.glorias,
            items: d.rewards.items,
            notes: [
                '💀 Derrotado na masmorra.',
                `📉 XP perdido: ${penalty.lostXp}`
            ]
        };

        d.active = false;
        d.completed = false;
        d.aborted = true;

        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordDungeonAbandoned();

        return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
    }

    await savePlayer(ctx.from.id, player);

    if (room.type === 'boss' && room.cleared) {
        finalizeDungeonRun(player, 'complete');
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordDungeonCompleted();

        return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
    }

    let msg = result.message || 'Ação concluída.';
    if (result.notes?.length) {
        msg += '\n' + result.notes.join('\n');
    }

    await safeAnswer(ctx, msg, { show_alert: true });
    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonNextRoom(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!room || !room.cleared) {
        await safeAnswer(ctx, '⚠️ Resolva a sala atual primeiro.', { show_alert: true });
        return;
    }

    if (d.currentRoomIndex >= d.maxRooms - 1) {
        finalizeDungeonRun(player, 'complete');
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordDungeonCompleted();

        return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
    }

    d.currentRoomIndex += 1;
    d.roomsVisited = Math.max(d.roomsVisited || 0, d.currentRoomIndex + 1);
    d.logs = [`🌑 Sala ${d.currentRoomIndex + 1}...`];

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonFlee(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    const d = normalizeDungeonState(player);

    if (!d.active) {
        await safeAnswer(ctx, 'Nenhuma expedição ativa.', { show_alert: true });
        return;
    }

    d.aborted = true;
    d.active = false;
    d.completed = false;

    d.summary = {
        roomsCleared: d.rooms.filter(r => r.cleared).length,
        xp: d.rewards.xp,
        gold: d.rewards.gold,
        keys: d.rewards.keys,
        glorias: d.rewards.glorias,
        items: d.rewards.items,
        notes: [
            '🚪 Expedição abandonada.',
            '🗝️ A chave já foi consumida na entrada.'
        ]
    };

    /*
    REGRA OFICIAL:
    dungeon consome chave, não energia.
    Portanto fugir NÃO consome energia adicional.
    */
    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await recordDungeonAbandoned();

    return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
}

async function handleDungeonSoulMenu(ctx) {
    return safeAnswer(
        ctx,
        '❌ Alma ainda não está habilitada na dungeon. Removido até implementação real.',
        { show_alert: true }
    );
}

async function handleDungeonConsumables(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeSend(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    const c = player.consumables || {};
    const rows = [];

    if ((c.potionHp || 0) > 0) {
        rows.push([Markup.button.callback(`❤️ Poção HP (${c.potionHp})`, 'dungeon_use:potionHp')]);
    }
    if ((c.potionEnergy || 0) > 0) {
        rows.push([Markup.button.callback(`⚡ Poção Energia (${c.potionEnergy})`, 'dungeon_use:potionEnergy')]);
    }
    if ((c.tonicStrength || 0) > 0) {
        rows.push([Markup.button.callback(`💪 Tônico Força (${c.tonicStrength})`, 'dungeon_use:tonicStrength')]);
    }
    if ((c.tonicDefense || 0) > 0) {
        rows.push([Markup.button.callback(`🛡️ Tônico Defesa (${c.tonicDefense})`, 'dungeon_use:tonicDefense')]);
    }

    rows.push([Markup.button.callback('◀️ Voltar', 'dungeon')]);

    if (rows.length === 1) {
        return safeAnswer(ctx, '❌ Você não possui consumíveis.', { show_alert: true });
    }

    return safeSend(ctx, '🧪 *Consumíveis da Masmorra*\nEscolha um item:', Markup.inlineKeyboard(rows));
}

async function handleDungeonUseConsumable(ctx) {
    await safeAnswer(ctx);

    const key = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return safeSend(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.');
    }

    const d = normalizeDungeonState(player);
    if (!d.active) {
        await safeAnswer(ctx, '❌ Não há expedição ativa.', { show_alert: true });
        return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
    }

    const consumeResult = consumeConsumable(player, key, 1);
    if (!consumeResult.success) {
        return safeAnswer(ctx, '❌ Item indisponível.', { show_alert: true });
    }

    updateMissionProgress(player, 'use_consumable', 1);
    await recordConsumableUsed();

    const room = getCurrentRoom(player);
    let log = '';

    if (key === 'potionHp') {
        const heal = Math.max(20, Math.floor(player.maxHp * 0.35));
        const before = player.hp;
        applyHeal(player, heal);
        log = `❤️ Poção restaurou ${player.hp - before} HP.`;
    } else if (key === 'potionEnergy') {
        const before = player.energy;
        restoreEnergy(player, 1);
        log = `⚡ Energia +${player.energy - before}.`;
    } else if (key === 'tonicStrength') {
        d.combatBonus.atk += 8;
        log = '💪 Bônus de expedição: ATK +8.';
    } else if (key === 'tonicDefense') {
        d.combatBonus.def += 8;
        log = '🛡️ Bônus de expedição: DEF +8.';
    } else {
        return safeAnswer(ctx, '❌ Consumível inválido.', { show_alert: true });
    }

    addDungeonLog(player, log);

    if (
        room &&
        (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') &&
        !room.cleared &&
        room.enemy?.hp > 0
    ) {
        const enemyHit = calculateDamage(
            { atk: room.enemy.atk, crit: room.enemy.crit },
            { def: Math.max(0, (player.def || 0) + (d.combatBonus.def || 0)) }
        );

        applyDamage(player, enemyHit.damage);
        addDungeonLog(player, `👹 ${room.enemy.name} aproveitou e causou ${enemyHit.damage} de dano.`);
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    await safeAnswer(ctx, '✅ Consumível usado!', { show_alert: true });
    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

module.exports = {
    handleDungeon,
    handleDungeonStart,
    handleDungeonAttack,
    handleDungeonNextRoom,
    handleDungeonFlee,
    handleDungeonSoulMenu,
    handleDungeonConsumables,
    handleDungeonUseConsumable
};