const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { calculateDamage } = require('../core/combat/damageCalc');
const { BALANCE } = require('../data/balance');

const {
    applyDamage,
    restoreEnergy,
    consumeConsumable,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const {
    applyDeathXpPenalty
} = require('../core/player/progression');

const {
    getSoulCooldownTurns,
    isPassiveSoul
} = require('../core/player/souls');

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
    ensureDungeonCombatState,
    getDungeonSoulSlots,
    getDungeonSoulCooldownRemaining,
    isEliteDungeonRun,
    resolveTreasureRoom,
    resolveHealRoom,
    resolveCurseRoom,
    resolveShrineRoom,
    resolveCombatRoom,
    resolveDungeonSoul,
    finalizeDungeonRun
} = require('../core/dungeon/dungeonRewards');

const {
    recordDungeonStarted,
    recordDungeonCompleted,
    recordDungeonAbandoned,
    recordDungeonRoomCleared,
    recordConsumableUsed
} = require('../core/metrics/metricsService');

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

function normalizeSummaryNote(note = '') {
    return String(note || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function isSummaryNoiseNote(note = '') {
    const clean = normalizeSummaryNote(note).toLowerCase();

    if (!clean) return true;

    return [
        /^✨\s*\+\d+\s*xp/i,
        /^💰\s*\+\d+\s*ouro/i,
        /^❤️\s*\+\d+\s*hp/i,
        /^⚡\s*\+\d+\s*energia/i,
        /bônus da masmorra aplicado/i,
        /recompensa final:/i,
        /política de recompensa/i,
        /mínimo/i,
        /expedição perfeita/i
    ].some(pattern => pattern.test(clean));
}

function getCleanSummaryNotes(notes = []) {
    const seen = new Set();
    const result = [];

    for (const note of Array.isArray(notes) ? notes : []) {
        const clean = normalizeSummaryNote(note);
        const key = clean.toLowerCase();

        if (isSummaryNoiseNote(clean) || seen.has(key)) continue;

        seen.add(key);
        result.push(clean);
    }

    return result.slice(0, 4);
}

function formatDungeonItemLine(item) {
    if (!item) return null;

    const name = item.name || 'Item desconhecido';
    const rarity = item.rarity || item.rarityName || 'Sem raridade';
    const slot = item.slot || item.type || null;

    return slot
        ? `${name} • ${rarity} • ${slot}`
        : `${name} • ${rarity}`;
}

function buildDungeonSummary(player) {
    const d = normalizeDungeonState(player);
    const sum = d.summary || {};
    const map = getDungeonMap(player);
    const cleanNotes = getCleanSummaryNotes(sum.notes);
    const completionItemLine = formatDungeonItemLine(sum.completionItem);

    const title = d.completed
        ? '🏆 *MASMORRA CONCLUÍDA* 🏆'
        : d.aborted
            ? '🚪 *EXPEDIÇÃO ENCERRADA* 🚪'
            : '🏰 *MASMORRA*';

    const lines = [
        '━━━━━━━━━━━━━━━━━━━━━━',
        title,
        '━━━━━━━━━━━━━━━━━━━━━━',
        '',
        `🗺️ ${map.emoji} ${map.name}`,
        '',
        '📊 *Resultado*',
        `• Salas vencidas: ${sum.roomsCleared || 0}/${d.maxRooms}`,
        `• Salas visitadas: ${d.roomsVisited || 0}`,
        '',
        '💰 *Ganhos*',
        `• ✨ ${formatNumber(sum.xp || 0)} XP`,
        `• 💰 ${formatNumber(sum.gold || 0)} ouro`,
        `• 🏅 ${sum.glorias || 0} glórias`,
        `• 🗝️ ${sum.keys || 0} chaves`,
        `• 🌑 ${sum.souls || 0} almas`
    ];

    if (completionItemLine) {
        lines.push('', '🏁 *Recompensa Final*', `• 🎁 ${completionItemLine}`);
    }

    if ((sum.items || 0) > 0) {
        lines.push('', '🎒 *Itens obtidos*', `• ${sum.items} item(ns) no total`);
    }

    if (cleanNotes.length) {
        lines.push('', '📜 *Destaques*');
        cleanNotes.forEach(note => lines.push(`• ${note}`));
    }

    if (d.completed && (sum.roomsCleared || 0) >= d.maxRooms) {
        lines.push('', '🏁 *Expedição perfeita!*');
    }

    return lines.join('\n');
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

    ensureDungeonCombatState(player, room);

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
    text += `⚡ ${player.energy}/${player.maxEnergy} ${energyBar}\n`;

    if (d.playerStatus?.poisonTurns || d.playerStatus?.bleedTurns || d.playerStatus?.stunned) {
        const effects = [];
        if (d.playerStatus.poisonTurns) effects.push(`🧪 Veneno ${d.playerStatus.poisonTurns}t`);
        if (d.playerStatus.bleedTurns) effects.push(`🩸 Sangramento ${d.playerStatus.bleedTurns}t`);
        if (d.playerStatus.stunned) effects.push('💫 Atordoado');
        text += `☠️ ${effects.join(' • ')}\n`;
    }

    text += `\n`;

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

        if (e.shield || e.frozen || e.poisonTurns || e.bleedTurns) {
            const enemyEffects = [];
            if (e.shield) enemyEffects.push(`🛡️ Escudo ${e.shield}`);
            if (e.frozen) enemyEffects.push('❄️ Congelado');
            if (e.poisonTurns) enemyEffects.push(`🧪 Veneno ${e.poisonTurns}t`);
            if (e.bleedTurns) enemyEffects.push(`🩸 Sangramento ${e.bleedTurns}t`);
            text += `☠️ ${enemyEffects.join(' • ')}\n`;
        }

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
    text += `✨ XP: ${d.rewards.xp || 0}  💰 Ouro: ${d.rewards.gold || 0}  🗝️ Chaves: ${d.rewards.keys || 0}  🎁 Itens: ${d.rewards.items || 0}  🌑 Almas: ${d.rewards.souls || 0}\n`;

    return text;
}

function getDungeonSoulButtonLabel(player, index) {
    const souls = getDungeonSoulSlots(player);
    const soul = souls[index];

    if (!soul) return `⬜ Slot ${index + 1} vazio`;

    if (isPassiveSoul(soul)) {
        return `${soul.emoji || '💀'} Slot ${index + 1} • Passiva`;
    }

    const cooldown = getDungeonSoulCooldownRemaining(player, index);
    if (cooldown > 0) return `⏳ Slot ${index + 1} • ${cooldown}t`;

    return `${soul.emoji || '💀'} Slot ${index + 1} • ${soul.name}`;
}

function buildDungeonSoulKeyboard(player) {
    return Markup.inlineKeyboard([
        [Markup.button.callback(getDungeonSoulButtonLabel(player, 0), 'dungeon_soul_0')],
        [Markup.button.callback(getDungeonSoulButtonLabel(player, 1), 'dungeon_soul_1')],
        [Markup.button.callback('◀️ Voltar', 'dungeon')]
    ]);
}

function buildDungeonSoulText(player) {
    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);
    ensureDungeonCombatState(player, room);

    const souls = getDungeonSoulSlots(player);
    const lines = [
        '━━━━━━━━━━━━━━━━━━━━━━',
        '💀 *ALMAS DA MASMORRA*',
        '━━━━━━━━━━━━━━━━━━━━━━',
        '',
        'Escolha uma alma ativa para usar nesta sala.',
        'Almas passivas já fortalecem sua build quando equipadas.',
        ''
    ];

    souls.forEach((soul, index) => {
        if (!soul) {
            lines.push(`${index + 1}. ⬜ Slot vazio`);
            return;
        }

        const cooldown = getDungeonSoulCooldownRemaining(player, index);
        const cooldownText = isPassiveSoul(soul)
            ? 'Passiva'
            : cooldown > 0
                ? `Recarga ${cooldown}t`
                : `Pronta • recarga ${getSoulCooldownTurns(soul)}t`;

        lines.push(`${index + 1}. ${soul.emoji || '💀'} *${escapeMarkdown(soul.name)}*`);
        lines.push(`   ${cooldownText}`);
    });

    return lines.join('\n');
}

function buildDungeonKeyboard(player) {
    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!d.active || d.completed || d.aborted) {
        return Markup.inlineKeyboard([
            [Markup.button.callback(`⚔️ Nova expedição (${BALANCE.energy.dungeonEntryKeyCost}🗝️)`, 'dungeon_start')],
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
            [Markup.button.callback('💀 Almas', 'dungeon_soul_menu'), Markup.button.callback('🧪 Itens', 'dungeon_consumables')],
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

async function handleDungeon(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    normalizeDungeonState(player);
    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonStart(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    const keyCost = BALANCE.energy.dungeonEntryKeyCost;

    if (!player.keys || player.keys < keyCost) {
        await safeAnswer(ctx, `❌ Você precisa de ${keyCost} Chave de Masmorra para entrar.`, {
            show_alert: true
        });
        return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
    }

    await safeAnswer(ctx);
    player.keys -= keyCost;
    startDungeonRun(player);

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await recordDungeonStarted({ keysSpent: keyCost, isEliteDungeon: isEliteDungeonRun(player) });

    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonAttack(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    await safeAnswer(ctx);

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
        const penalty = applyDeathXpPenalty(player);
        const ratePercent = Math.round((penalty.rateApplied || 0) * 100);
        player.hp = 1;

        d.summary = {
            roomsCleared: d.rooms.filter(r => r.cleared).length,
            xp: d.rewards.xp || 0,
            gold: d.rewards.gold || 0,
            keys: d.rewards.keys || 0,
            glorias: d.rewards.glorias || 0,
            items: d.rewards.items || 0,
            souls: d.rewards.souls || 0,
            notes: [
                '💀 Derrotado na masmorra.',
                `📉 XP perdido: ${penalty.lostXp} (${ratePercent}%)`,
                ...(penalty.levelReduced ? [`⬇️ Nível reduzido: ${penalty.oldLevel} → ${penalty.newLevel}`] : []),
                '❤️ Você retornou com 1 de vida.'
            ]
        };

        d.active = false;
        d.completed = false;
        d.aborted = true;

        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordDungeonAbandoned({ isEliteDungeon: isEliteDungeonRun(player) });

        return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
    }

    await savePlayer(ctx.from.id, player);

    if (room.type === 'boss' && room.cleared) {
        finalizeDungeonRun(player, 'complete');
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordDungeonCompleted({ isEliteDungeon: isEliteDungeonRun(player) });

        return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
    }

    let msg = result.message || 'Ação concluída.';
    if (result.notes?.length) {
        msg += '\n' + result.notes.join('\n');
    }

    await safeAnswer(ctx, msg, { show_alert: true });
    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonSoulMenu(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    await safeAnswer(ctx);

    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!d.active || !room || room.cleared || !(room.type === 'combat' || room.type === 'elite' || room.type === 'boss')) {
        return safeAnswer(ctx, '❌ Não há combate ativo para usar almas.', { show_alert: true });
    }

    ensureDungeonCombatState(player, room);
    return safeSend(ctx, buildDungeonSoulText(player), buildDungeonSoulKeyboard(player));
}

async function handleDungeonSoul(ctx) {
    const soulIndex = Number(ctx.match?.[1]);
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    await safeAnswer(ctx);

    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!d.active || !room || room.cleared || !(room.type === 'combat' || room.type === 'elite' || room.type === 'boss')) {
        return safeAnswer(ctx, '❌ Não há combate ativo para usar almas.', { show_alert: true });
    }

    const result = await resolveDungeonSoul(player, room, soulIndex);
    normalizePlayerForSave(player);

    if (room.cleared) {
        await recordDungeonRoomCleared(1);
    }

    if (result.playerDefeated) {
        const penalty = applyDeathXpPenalty(player);
        const ratePercent = Math.round((penalty.rateApplied || 0) * 100);
        player.hp = 1;

        d.summary = {
            roomsCleared: d.rooms.filter(r => r.cleared).length,
            xp: d.rewards.xp || 0,
            gold: d.rewards.gold || 0,
            keys: d.rewards.keys || 0,
            glorias: d.rewards.glorias || 0,
            items: d.rewards.items || 0,
            souls: d.rewards.souls || 0,
            notes: [
                '💀 Derrotado na masmorra.',
                `📉 XP perdido: ${penalty.lostXp} (${ratePercent}%)`,
                ...(penalty.levelReduced ? [`⬇️ Nível reduzido: ${penalty.oldLevel} → ${penalty.newLevel}`] : []),
                '❤️ Você retornou com 1 de vida.'
            ]
        };

        d.active = false;
        d.completed = false;
        d.aborted = true;

        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordDungeonAbandoned({ isEliteDungeon: isEliteDungeonRun(player) });

        return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
    }

    await savePlayer(ctx.from.id, player);

    if (room.type === 'boss' && room.cleared) {
        finalizeDungeonRun(player, 'complete');
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordDungeonCompleted({ isEliteDungeon: isEliteDungeonRun(player) });

        return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
    }

    await safeAnswer(ctx, result.message || 'Alma usada.', { show_alert: true }).catch(() => {});
    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

async function handleDungeonNextRoom(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    await safeAnswer(ctx);

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
        await recordDungeonCompleted({ isEliteDungeon: isEliteDungeonRun(player) });

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
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    await safeAnswer(ctx);

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
        xp: d.rewards.xp || 0,
        gold: d.rewards.gold || 0,
        keys: d.rewards.keys || 0,
        glorias: d.rewards.glorias || 0,
        items: d.rewards.items || 0,
        souls: d.rewards.souls || 0,
        notes: [
            '🚪 Expedição abandonada.',
            '🗝️ A chave já foi consumida na entrada.'
        ]
    };

    if (BALANCE.dungeon.fleeConsumesEnergy) {
        // hoje a regra oficial é false
        // mantido apenas para permitir mudança central futura
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);
    await recordDungeonAbandoned({ isEliteDungeon: isEliteDungeonRun(player) });

    return safeSend(ctx, buildDungeonSummary(player), buildDungeonKeyboard(player));
}

async function handleDungeonConsumables(ctx) {
    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
    }

    await safeAnswer(ctx);

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
    const key = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return safeAnswer(ctx, '🧭 Você ainda não criou um personagem. Use /start para começar.', {
            show_alert: true
        });
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

    await safeAnswer(ctx);
    updateMissionProgress(player, 'use_consumable', 1);
    await recordConsumableUsed();

    const room = getCurrentRoom(player);
    let log = '';

    if (key === 'potionHp') {
        const before = player.hp;
        player.hp = player.maxHp;
        log = `❤️ Poção de Vida restaurou ${player.hp - before} HP e encheu sua vida.`;
    } else if (key === 'potionEnergy') {
        const before = player.energy;
        restoreEnergy(player, BALANCE.consumables.potionEnergy.restoreAmount);
        log = `⚡ Energia +${player.energy - before}.`;
    } else if (key === 'tonicStrength') {
        d.combatBonus.atk += BALANCE.consumables.tonicStrength.dungeonAtkBonus;
        log = `💪 Bônus de expedição: ATK +${BALANCE.consumables.tonicStrength.dungeonAtkBonus}.`;
    } else if (key === 'tonicDefense') {
        d.combatBonus.def += BALANCE.consumables.tonicDefense.dungeonDefBonus;
        log = `🛡️ Bônus de expedição: DEF +${BALANCE.consumables.tonicDefense.dungeonDefBonus}.`;
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

    await safeAnswer(ctx, '✅ Consumível usado!').catch(() => {});
    return safeSend(ctx, renderDungeonText(player), buildDungeonKeyboard(player));
}

module.exports = {
    escapeMarkdown,
    buildDungeonIntroText,
    normalizeSummaryNote,
    isSummaryNoiseNote,
    getCleanSummaryNotes,
    formatDungeonItemLine,
    buildDungeonSummary,
    renderDungeonText,
    getDungeonSoulButtonLabel,
    buildDungeonSoulKeyboard,
    buildDungeonSoulText,
    buildDungeonKeyboard,
    handleDungeon,
    handleDungeonStart,
    handleDungeonAttack,
    handleDungeonSoulMenu,
    handleDungeonSoul,
    handleDungeonNextRoom,
    handleDungeonFlee,
    handleDungeonConsumables,
    handleDungeonUseConsumable
};
