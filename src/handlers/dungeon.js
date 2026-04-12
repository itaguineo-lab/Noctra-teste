const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { calculateDamage } = require('../core/combat/damageCalc');
const { processVictory } = require('../services/rewardService');
const { addXp } = require('../core/player/progression');
const { generateDrop } = require('../data/items');
const { getMapById, maps } = require('../core/world/maps');
const { progressBar, formatNumber } = require('../utils/formatters');
const { enemyPools } = require('../core/world/enemies');

// Cache de combates na masmorra
const dungeonFights = new Map();
const FIGHT_TIMEOUT = 10 * 60 * 1000;

// ================================================
// FUNÇÕES AUXILIARES
// ================================================

function escapeMarkdown(text = '') {
    return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function safeNumber(val) {
    return Number.isFinite(Number(val)) ? Number(val) : 0;
}

function getDungeonMap(player) {
    return getMapById(player.currentMap) || maps[0];
}

function getMapNumber(mapId) {
    const mapMap = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4,
        citadela_lunar: 5,
        abismo_noctra: 6
    };
    return mapMap[mapId] || 1;
}

// ================================================
// INIMIGOS TEMÁTICOS DA MASMORRA
// ================================================

function getDungeonEnemyPool(mapId) {
    const pool = enemyPools[mapId] || enemyPools.clareira_sombria;
    return {
        common: pool.common || [],
        elite: pool.elite || [],
        boss: pool.boss || []
    };
}

function getRandomDungeonEnemy(mapId, type, playerLevel, roomIndex) {
    const pool = getDungeonEnemyPool(mapId);
    const baseLevel = Math.max(1, playerLevel + roomIndex - 1);
    const bonus = type === 'elite' ? 1 : (type === 'boss' ? 2 : 0);
    const level = baseLevel + bonus;

    let enemyTemplate;
    if (type === 'boss') {
        enemyTemplate = pool.boss.length ? pool.boss[Math.floor(Math.random() * pool.boss.length)] : { name: 'Guardião do Vazio', emoji: '👑' };
    } else if (type === 'elite') {
        enemyTemplate = pool.elite.length ? pool.elite[Math.floor(Math.random() * pool.elite.length)] : { name: 'Elite Sombria', emoji: '🔥' };
    } else {
        enemyTemplate = pool.common.length ? pool.common[Math.floor(Math.random() * pool.common.length)] : { name: 'Criatura Sombria', emoji: '👹' };
    }

    // Ajusta atributos baseados no nível
    const hp = type === 'boss' ? 170 + level * 42 : (type === 'elite' ? 110 + level * 28 : 70 + level * 18);
    const atk = type === 'boss' ? 14 + level * 4 : (type === 'elite' ? 10 + level * 3 : 7 + level * 2);
    const def = type === 'boss' ? 10 + level * 3 : (type === 'elite' ? 8 + level * 2 : 5 + level);
    const crit = type === 'boss' ? 12 : (type === 'elite' ? 10 : 6);
    const xp = type === 'boss' ? 110 + level * 18 : (type === 'elite' ? 65 + level * 12 : 35 + level * 8);
    const gold = type === 'boss' ? 110 + level * 20 : (type === 'elite' ? 60 + level * 12 : 25 + level * 8);

    return {
        id: `${type}_${roomIndex}_${Date.now()}`,
        name: enemyTemplate.name,
        emoji: enemyTemplate.emoji || '👹',
        hp, maxHp: hp, atk, def, crit, level, xp, gold,
        isElite: type === 'elite', isBoss: type === 'boss',
        ability: enemyTemplate.ability || null,
        frozen: false
    };
}

// ================================================
// ESTADO DA MASMORRA
// ================================================

function normalizeDungeonState(player) {
    if (!player.dungeonProgress || typeof player.dungeonProgress !== 'object') {
        player.dungeonProgress = {};
    }
    const d = player.dungeonProgress;
    d.active ??= false;
    d.completed ??= false;
    d.aborted ??= false;
    d.startedAt ??= null;
    d.mapId ??= player.currentMap || 'clareira_sombria';
    d.maxRooms ??= 5;
    d.currentRoomIndex ??= 0;
    d.rooms ??= [];
    d.rewards ??= { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0 };
    d.summary ??= null;
    d.logs ??= []; // NOVO: logs de combate
    return d;
}

function getCurrentRoom(player) {
    const d = normalizeDungeonState(player);
    return d.rooms[d.currentRoomIndex] || null;
}

function addDungeonLog(player, message) {
    const d = normalizeDungeonState(player);
    d.logs.push(message);
    if (d.logs.length > 4) d.logs.shift(); // Mantém apenas os últimos 4 logs
}

// ================================================
// GERAÇÃO DA MASMORRA
// ================================================

function weightedPick(entries) {
    const total = entries.reduce((sum, e) => sum + (e.weight || 0), 0);
    let roll = Math.random() * total;
    for (const e of entries) {
        roll -= e.weight || 0;
        if (roll <= 0) return e.value;
    }
    return entries[0]?.value || 'combat';
}

function buildDungeonRoomTypes() {
    const room2 = weightedPick([
        { value: 'combat', weight: 35 }, { value: 'treasure', weight: 25 },
        { value: 'heal', weight: 20 }, { value: 'curse', weight: 10 }, { value: 'elite', weight: 10 }
    ]);
    const room3 = weightedPick([
        { value: 'combat', weight: 25 }, { value: 'treasure', weight: 20 },
        { value: 'heal', weight: 20 }, { value: 'curse', weight: 15 }, { value: 'elite', weight: 20 }
    ]);
    const room4 = weightedPick([
        { value: 'combat', weight: 20 }, { value: 'treasure', weight: 20 },
        { value: 'heal', weight: 20 }, { value: 'curse', weight: 15 }, { value: 'elite', weight: 25 }
    ]);
    const types = ['combat', room2, room3, room4, 'boss'];
    if (!types.includes('treasure')) types[1] = 'treasure';
    if (!types.includes('heal')) types[2] = 'heal';
    if (!types.includes('elite')) types[3] = 'elite';
    return types;
}

function createDungeonRoom(player, index, type) {
    const mapId = player.currentMap || 'clareira_sombria';
    const meta = {
        combat: { emoji: '⚔️', title: 'Sala de Conflito', desc: 'Câmara tomada por sombras.' },
        elite: { emoji: '🔥', title: 'Câmara de Elite', desc: 'Algo forte está à espreita.' },
        treasure: { emoji: '🎁', title: 'Sala do Tesouro', desc: 'Relíquias espalhadas.' },
        heal: { emoji: '❤️', title: 'Fonte Sombria', desc: 'Energia ancestral pulsa.' },
        curse: { emoji: '💀', title: 'Santuário Corrompido', desc: 'Escolhas trazem poder e dor.' },
        boss: { emoji: '👑', title: 'Trono do Guardião', desc: 'O guardião final bloqueia a passagem.' }
    }[type] || { emoji: '❓', title: type, desc: '' };

    const room = {
        index, type, emoji: meta.emoji, title: meta.title, description: meta.desc,
        cleared: false, clearedAt: null, enemy: null, reward: null
    };
    if (type === 'combat' || type === 'elite' || type === 'boss') {
        room.enemy = getRandomDungeonEnemy(mapId, type, player.level || 1, index);
    }
    return room;
}

function startDungeonRun(player) {
    const d = normalizeDungeonState(player);
    d.active = true;
    d.completed = false;
    d.aborted = false;
    d.startedAt = Date.now();
    d.mapId = player.currentMap || 'clareira_sombria';
    d.currentRoomIndex = 0;
    d.rooms = buildDungeonRoomTypes().map((type, i) => createDungeonRoom(player, i + 1, type));
    d.rewards = { xp: 0, gold: 0, keys: 0, glorias: 0, items: 0 };
    d.summary = null;
    d.logs = [`🌑 Você adentrou a masmorra...`];
    return d;
}

// ================================================
// RESOLUÇÃO DE SALAS
// ================================================

function addSummaryNote(player, note) {
    const d = normalizeDungeonState(player);
    if (!d.summary) d.summary = { notes: [] };
    if (!d.summary.notes) d.summary.notes = [];
    d.summary.notes.push(note);
}

function resolveTreasureRoom(player, room) {
    const d = normalizeDungeonState(player);
    const mapNumber = getMapNumber(d.mapId);
    const gold = 45 + player.level * 12 + room.index * 8;
    player.gold = (player.gold || 0) + gold;
    d.rewards.gold += gold;
    d.rewards.items += 1;
    const notes = [`🎁 +${gold} ouro`];

    if (Math.random() < 0.25) {
        player.keys = (player.keys || 0) + 1;
        d.rewards.keys += 1;
        notes.push('🗝️ +1 chave');
    }
    if (Math.random() < 0.35) {
        const drop = generateDrop(mapNumber);
        if (drop && (player.inventory?.length || 0) < (player.maxInventory || 20)) {
            player.inventory.push(drop);
            notes.push(`✨ ${drop.name}`);
        }
    }
    room.cleared = true;
    notes.forEach(n => addSummaryNote(player, n));
    addDungeonLog(player, `🎁 Tesouro: +${gold} ouro`);
    return { success: true, message: `🎁 Você encontrou ${gold} ouro!`, notes };
}

function resolveHealRoom(player, room) {
    const d = normalizeDungeonState(player);
    const heal = Math.floor(player.maxHp * 0.45);
    const beforeHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    player.energy = Math.min(player.maxEnergy, player.energy + 1);
    room.cleared = true;
    addSummaryNote(player, `❤️ +${player.hp - beforeHp} HP, ⚡ +1 energia`);
    addDungeonLog(player, `❤️ Fonte restaurou ${player.hp - beforeHp} HP e 1 energia`);
    return { success: true, message: `❤️ Fonte restaurou ${player.hp - beforeHp} HP e 1 energia.` };
}

function resolveCurseRoom(player, room) {
    const d = normalizeDungeonState(player);
    const damage = Math.floor(player.maxHp * 0.18);
    const hpLoss = Math.min(damage, player.hp - 1);
    player.hp = Math.max(1, player.hp - hpLoss);
    const gold = 90 + player.level * 15 + room.index * 10;
    player.gold = (player.gold || 0) + gold;
    d.rewards.gold += gold;
    const notes = [`💀 -${hpLoss} HP`, `💰 +${gold} ouro`];
    if (Math.random() < 0.2) {
        player.keys = (player.keys || 0) + 1;
        d.rewards.keys += 1;
        notes.push('🗝️ +1 chave');
    }
    room.cleared = true;
    notes.forEach(n => addSummaryNote(player, n));
    addDungeonLog(player, `💀 Maldição: -${hpLoss} HP, +${gold} ouro`);
    return { success: true, message: `💀 Maldição cobrou ${hpLoss} HP, mas ganhou ${gold} ouro.`, notes };
}

function resolveCombatRoom(player, room) {
    const d = normalizeDungeonState(player);
    if (!room.enemy) room.enemy = getRandomDungeonEnemy(d.mapId, room.type, player.level || 1, room.index);

    const playerHit = calculateDamage({ atk: player.atk, crit: player.crit }, { def: room.enemy.def });
    room.enemy.hp = Math.max(0, room.enemy.hp - playerHit.damage);
    
    let playerLog = `⚔️ Você causou ${playerHit.damage} de dano`;
    if (playerHit.isCrit) playerLog += ` (💥 CRÍTICO!)`;
    addDungeonLog(player, playerLog);

    const result = { success: true, defeated: false, message: '', notes: [] };
    if (room.enemy.hp <= 0) {
        const rewards = processVictory(player, room.enemy);
        d.rewards.xp += safeNumber(rewards.xp);
        d.rewards.gold += safeNumber(rewards.gold);
        if (rewards.keyDropped) d.rewards.keys++;
        if (rewards.loot?.length) d.rewards.items += rewards.loot.length;
        result.defeated = true;
        result.message = `🏆 ${room.enemy.name} derrotado!`;
        result.notes = [`✨ +${rewards.xp} XP`, `💰 +${rewards.gold} ouro`];
        if (rewards.loot?.length) result.notes.push(...rewards.loot.map(l => `🎁 ${l}`));
        room.cleared = true;
        result.rewards = rewards;
        if (room.type === 'boss') finalizeDungeonRun(player, 'complete');
        result.notes.forEach(n => addSummaryNote(player, n));
        addDungeonLog(player, `🏆 ${room.enemy.name} foi derrotado!`);
        return result;
    }

    const enemyHit = calculateDamage({ atk: room.enemy.atk, crit: room.enemy.crit }, { def: player.def });
    player.hp = Math.max(0, player.hp - enemyHit.damage);
    
    let enemyLog = `👹 ${room.enemy.name} causou ${enemyHit.damage} de dano`;
    if (enemyHit.isCrit) enemyLog += ` (💀 CRÍTICO!)`;
    addDungeonLog(player, enemyLog);
    
    result.message = `⚔️ Você causou ${playerHit.damage} dano. ${room.enemy.emoji || '👹'} ${room.enemy.name} causou ${enemyHit.damage}.`;

    if (player.hp <= 0) {
        d.active = false; d.aborted = true;
        d.summary = d.summary || {};
        d.summary.notes = d.summary.notes || [];
        d.summary.notes.push('💀 Derrotado na masmorra.');
        player.hp = 1;
        player.energy = Math.max(0, player.energy - 1);
        result.finished = true;
        result.playerDefeated = true;
        addDungeonLog(player, `💀 Você foi derrotado...`);
    }
    return result;
}

function finalizeDungeonRun(player, reason) {
    const d = normalizeDungeonState(player);
    d.active = false;
    d.completed = reason === 'complete';
    d.aborted = reason === 'aborted';
    const cleared = d.rooms.filter(r => r.cleared).length;
    const bonusXp = 20 + cleared * 10 + player.level * 2;
    const bonusGold = 60 + cleared * 20 + player.level * 5;
    const bonusKeys = reason === 'complete' ? 1 : 0;
    const bonusGlorias = reason === 'complete' ? 1 : 0;

    d.summary = {
        roomsCleared: cleared,
        xp: safeNumber(d.rewards.xp) + bonusXp,
        gold: safeNumber(d.rewards.gold) + bonusGold,
        keys: safeNumber(d.rewards.keys) + bonusKeys,
        glorias: safeNumber(d.rewards.glorias) + bonusGlorias,
        items: safeNumber(d.rewards.items),
        notes: d.summary?.notes || []
    };
    if (reason === 'complete') d.summary.notes.push('🏁 Expedição perfeita!');
    else d.summary.notes.push('🚪 Expedição interrompida.');

    addXp(player, bonusXp);
    player.gold = (player.gold || 0) + bonusGold;
    player.keys = (player.keys || 0) + bonusKeys;
    player.glorias = (player.glorias || 0) + bonusGlorias;
    return d;
}

// ================================================
// RENDERIZAÇÃO DA INTERFACE
// ================================================

function renderDungeonText(player) {
    const d = normalizeDungeonState(player);
    if (!d.active || d.completed || d.aborted) return renderDungeonSummary(player);

    const room = getCurrentRoom(player);
    if (!room) return renderDungeonSummary(player);

    const map = getDungeonMap(player);
    const hpBar = progressBar(player.hp, player.maxHp, 8, '🟩', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 8, '🟦', '⬛');
    const progressPercent = Math.floor((d.currentRoomIndex + 1) / d.maxRooms * 100);
    const roomProgressBar = progressBar(d.currentRoomIndex + 1, d.maxRooms, 8, '🟪', '⬛');

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏰 *MASMORRA: ${map.name}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🚪 Sala ${d.currentRoomIndex + 1}/${d.maxRooms}  ${roomProgressBar} ${progressPercent}%\n`;
    text += `${room.emoji} *${room.title}*\n`;
    text += `📖 ${room.description}\n\n`;
    text += `👤 ${escapeMarkdown(player.name)}  Lv.${player.level}\n`;
    text += `❤️ ${player.hp}/${player.maxHp} ${hpBar}\n`;
    text += `⚡ ${player.energy}/${player.maxEnergy} ${energyBar}\n\n`;

    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        const e = room.enemy;
        const enemyBar = progressBar(e.hp, e.maxHp, 8, '🟥', '⬛');
        const badge = room.type === 'boss' ? '👑 BOSS' : (room.type === 'elite' ? '🔥 ELITE' : '👹 INIMIGO');
        text += `${badge}: ${e.emoji || '👹'} *${escapeMarkdown(e.name)}* Lv.${e.level}\n`;
        text += `❤️ ${e.hp}/${e.maxHp} ${enemyBar}\n`;
        text += `⚔️ ${e.atk} 🛡️ ${e.def} 💥 ${e.crit}%\n`;
        
        // Exibe os logs de combate
        if (d.logs && d.logs.length > 0) {
            text += `\n📜 *Últimas ações*\n`;
            text += d.logs.slice(-3).join('\n');
        }
        text += `\n`;
    } else {
        text += `Ação: ${room.type === 'treasure' ? 'Abrir tesouro' : (room.type === 'heal' ? 'Canalizar fonte' : 'Quebrar maldição')}\n\n`;
    }

    text += `📊 *Recompensas acumuladas*\n`;
    text += `✨ XP: ${d.rewards.xp}  💰 Ouro: ${d.rewards.gold}  🗝️ Chaves: ${d.rewards.keys}\n`;

    return text;
}

function renderDungeonSummary(player) {
    const d = normalizeDungeonState(player);
    const sum = d.summary || {};
    const map = getDungeonMap(player);

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    if (d.completed) text += `🏆 *MASMORRA CONCLUÍDA* 🏆\n`;
    else if (d.aborted) text += `💀 *EXPEDIÇÃO ENCERRADA* 💀\n`;
    else text += `🏰 *MASMORRA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🗺️ ${map.emoji} ${map.name}\n\n`;
    text += `📊 Salas vencidas: ${sum.roomsCleared || 0}/${d.maxRooms}\n`;
    text += `✨ XP: ${formatNumber(sum.xp || 0)}\n`;
    text += `💰 Ouro: ${formatNumber(sum.gold || 0)}\n`;
    text += `🗝️ Chaves: ${sum.keys || 0}\n`;
    text += `🏅 Glórias: ${sum.glorias || 0}\n`;
    text += `🎁 Itens: ${sum.items || 0}\n`;
    if (sum.notes?.length) {
        text += `\n📜 *Destaques*\n${sum.notes.map(n => `• ${n}`).join('\n')}`;
    }
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
            [Markup.button.callback('💀 Alma', 'dungeon_soul_menu'), Markup.button.callback('🧪 Itens', 'dungeon_consumables')],
            [Markup.button.callback('🏃 Fugir', 'dungeon_flee'), Markup.button.callback('🏠 Menu', 'menu')]
        ]);
    }

    return Markup.inlineKeyboard([
        [Markup.button.callback(
            room.type === 'treasure' ? '🎁 Abrir Tesouro' : (room.type === 'heal' ? '❤️ Canalizar' : '💀 Aceitar Maldição'),
            'dungeon_attack'
        )],
        [Markup.button.callback('🏃 Sair', 'dungeon_flee'), Markup.button.callback('🏠 Menu', 'menu')]
    ]);
}

// ================================================
// HANDLERS PRINCIPAIS
// ================================================

async function safeSend(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery().catch(() => {});
            return await ctx.editMessageText(text, options);
        }
        return await ctx.reply(text, options);
    } catch {
        return await ctx.reply(text, options);
    }
}

async function safeAnswer(ctx, text, alert = true) {
    try { await ctx.answerCbQuery(text, { show_alert: alert }); } catch { }
}

async function handleDungeon(ctx) {
    await safeAnswer(ctx, '', false);
    const player = await getPlayer(ctx.from.id);
    normalizeDungeonState(player);

    if (!player.dungeonProgress.rooms?.length && !player.dungeonProgress.active) {
        startDungeonRun(player);
        await savePlayer(ctx.from.id, player);
    }

    return safeSend(ctx, renderDungeonText(player), {
        parse_mode: 'Markdown',
        ...buildDungeonKeyboard(player)
    });
}

async function handleDungeonStart(ctx) {
    await safeAnswer(ctx, '', false);
    const player = await getPlayer(ctx.from.id);

    // VERIFICA SE TEM CHAVE
    if (!player.keys || player.keys < 1) {
        await safeAnswer(ctx, '❌ Você precisa de 1 Chave de Masmorra para entrar.', true);
        return safeSend(ctx, renderDungeonSummary(player), {
            parse_mode: 'Markdown',
            ...buildDungeonKeyboard(player)
        });
    }

    // Consome 1 chave
    player.keys -= 1;
    startDungeonRun(player);
    await savePlayer(ctx.from.id, player);

    return safeSend(ctx, renderDungeonText(player), {
        parse_mode: 'Markdown',
        ...buildDungeonKeyboard(player)
    });
}

async function handleDungeonAttack(ctx) {
    await safeAnswer(ctx, '', false);
    const player = await getPlayer(ctx.from.id);
    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!room || room.cleared) {
        return safeSend(ctx, renderDungeonText(player), { parse_mode: 'Markdown', ...buildDungeonKeyboard(player) });
    }

    let result;
    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        result = resolveCombatRoom(player, room);
    } else if (room.type === 'treasure') {
        result = resolveTreasureRoom(player, room);
    } else if (room.type === 'heal') {
        result = resolveHealRoom(player, room);
    } else if (room.type === 'curse') {
        result = resolveCurseRoom(player, room);
    } else {
        result = { success: false, message: 'Sala inválida.' };
    }

    if (result.playerDefeated) {
        await savePlayer(ctx.from.id, player);
        return safeSend(ctx, renderDungeonSummary(player), { parse_mode: 'Markdown', ...buildDungeonKeyboard(player) });
    }

    await savePlayer(ctx.from.id, player);

    if (room.type === 'boss' && room.cleared) {
        finalizeDungeonRun(player, 'complete');
        await savePlayer(ctx.from.id, player);
        return safeSend(ctx, renderDungeonSummary(player), { parse_mode: 'Markdown', ...buildDungeonKeyboard(player) });
    }

    let msg = result.message;
    if (result.notes?.length) msg += '\n' + result.notes.join('\n');
    await safeAnswer(ctx, msg, true);
    return safeSend(ctx, renderDungeonText(player), { parse_mode: 'Markdown', ...buildDungeonKeyboard(player) });
}

async function handleDungeonNextRoom(ctx) {
    await safeAnswer(ctx, '', false);
    const player = await getPlayer(ctx.from.id);
    const d = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!room || !room.cleared) {
        await safeAnswer(ctx, '⚠️ Resolva a sala atual primeiro.', true);
        return;
    }

    if (d.currentRoomIndex >= d.maxRooms - 1) {
        finalizeDungeonRun(player, 'complete');
        await savePlayer(ctx.from.id, player);
        return safeSend(ctx, renderDungeonSummary(player), { parse_mode: 'Markdown', ...buildDungeonKeyboard(player) });
    }

    d.currentRoomIndex++;
    // Limpa logs ao mudar de sala
    d.logs = [`🌑 Sala ${d.currentRoomIndex + 1}...`];
    await savePlayer(ctx.from.id, player);
    return safeSend(ctx, renderDungeonText(player), { parse_mode: 'Markdown', ...buildDungeonKeyboard(player) });
}

async function handleDungeonFlee(ctx) {
    await safeAnswer(ctx, '', false);
    const player = await getPlayer(ctx.from.id);
    const d = normalizeDungeonState(player);

    if (!d.active) {
        await safeAnswer(ctx, 'Nenhuma expedição ativa.', true);
        return;
    }

    d.aborted = true; d.active = false; d.completed = false;
    d.summary = {
        roomsCleared: d.rooms.filter(r => r.cleared).length,
        xp: d.rewards.xp, gold: d.rewards.gold, keys: d.rewards.keys, glorias: d.rewards.glorias, items: d.rewards.items,
        notes: ['🚪 Expedição abandonada.']
    };
    player.energy = Math.max(0, player.energy - 1);
    await savePlayer(ctx.from.id, player);
    return safeSend(ctx, renderDungeonSummary(player), { parse_mode: 'Markdown', ...buildDungeonKeyboard(player) });
}

// Placeholders funcionais para alma/itens
async function handleDungeonSoulMenu(ctx) {
    await safeAnswer(ctx, '💀 Selecione uma alma para usar (em breve).', true);
}
async function handleDungeonConsumables(ctx) {
    await safeAnswer(ctx, '🧪 Selecione um item para usar (em breve).', true);
}

module.exports = {
    handleDungeon,
    handleDungeonStart,
    handleDungeonAttack,
    handleDungeonNextRoom,
    handleDungeonFlee,
    handleDungeonSoulMenu,
    handleDungeonConsumables
};