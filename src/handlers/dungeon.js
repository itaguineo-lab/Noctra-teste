const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    calculateDamage
} = require('../core/combat/damageCalc');

const {
    processVictory
} = require('../services/rewardService');

const {
    addXp
} = require('../core/player/progression');

const {
    generateDrop
} = require('../data/items');

const {
    getMapById,
    maps
} = require('../core/world/maps');

/*
=================================
HELPERS
=================================
*/

function escapeMarkdown(text = '') {
    return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function getMapNumber(mapId) {
    const mapMap = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4
    };

    return mapMap[mapId] || 1;
}

function getDungeonMap(player) {
    return (
        getMapById(player.currentMap) ||
        maps[0]
    );
}

function normalizeDungeonState(player) {
    if (!player.dungeonProgress || typeof player.dungeonProgress !== 'object') {
        player.dungeonProgress = {};
    }

    const dungeon = player.dungeonProgress;

    dungeon.active ??= false;
    dungeon.completed ??= false;
    dungeon.aborted ??= false;
    dungeon.startedAt ??= null;
    dungeon.finishedAt ??= null;
    dungeon.mapId ??= player.currentMap || 'clareira_sombria';
    dungeon.maxRooms ??= 5;
    dungeon.currentRoomIndex ??= 0;
    dungeon.rooms ??= [];
    dungeon.summary ??= null;
    dungeon.rewards ??= {
        xp: 0,
        gold: 0,
        keys: 0,
        glorias: 0,
        items: 0
    };

    return dungeon;
}

function weightedPick(entries) {
    const total = entries.reduce(
        (sum, entry) => sum + (entry.weight || 0),
        0
    );

    let roll = Math.random() * total;

    for (const entry of entries) {
        roll -= entry.weight || 0;

        if (roll <= 0) {
            return entry.value;
        }
    }

    return entries[0]?.value || 'combat';
}

function buildDungeonRoomTypes() {
    const room2 = weightedPick([
        { value: 'combat', weight: 35 },
        { value: 'treasure', weight: 25 },
        { value: 'heal', weight: 20 },
        { value: 'curse', weight: 10 },
        { value: 'elite', weight: 10 }
    ]);

    const room3 = weightedPick([
        { value: 'combat', weight: 25 },
        { value: 'treasure', weight: 20 },
        { value: 'heal', weight: 20 },
        { value: 'curse', weight: 15 },
        { value: 'elite', weight: 20 }
    ]);

    const room4 = weightedPick([
        { value: 'combat', weight: 20 },
        { value: 'treasure', weight: 20 },
        { value: 'heal', weight: 20 },
        { value: 'curse', weight: 15 },
        { value: 'elite', weight: 25 }
    ]);

    const types = ['combat', room2, room3, room4, 'boss'];

    if (!types.includes('treasure')) {
        types[1] = 'treasure';
    }

    if (!types.includes('heal')) {
        types[2] = 'heal';
    }

    if (!types.includes('elite')) {
        types[3] = 'elite';
    }

    return types;
}

function roomMeta(type) {
    const meta = {
        combat: {
            emoji: '⚔️',
            title: 'Sala de Conflito',
            description: 'Uma câmara tomada por sombras hostis.'
        },
        elite: {
            emoji: '🔥',
            title: 'Câmara de Elite',
            description: 'A pressão no ar aumenta. Algo forte está à espreita.'
        },
        treasure: {
            emoji: '🎁',
            title: 'Sala do Tesouro',
            description: 'Relíquias e ouro espalhados pelo chão.'
        },
        heal: {
            emoji: '❤️',
            title: 'Fonte Sombria',
            description: 'Uma energia antiga pulsa no centro da sala.'
        },
        curse: {
            emoji: '💀',
            title: 'Santuário Corrompido',
            description: 'Escolhas perigosas trazem poder e dor.'
        },
        boss: {
            emoji: '👑',
            title: 'Trono do Guardião',
            description: 'O guardião final bloqueia sua passagem.'
        }
    };

    return meta[type] || meta.combat;
}

function createDungeonEnemy(player, roomIndex, type) {
    const baseLevel = Math.max(
        1,
        (player.level || 1) + roomIndex - 1
    );

    const difficultyBonus =
        type === 'elite' ? 1 :
        type === 'boss' ? 2 :
        0;

    const level = baseLevel + difficultyBonus;

    const hp =
        type === 'boss'
            ? 170 + (level * 42)
            : type === 'elite'
                ? 110 + (level * 28)
                : 70 + (level * 18);

    const atk =
        type === 'boss'
            ? 14 + (level * 4)
            : type === 'elite'
                ? 10 + (level * 3)
                : 7 + (level * 2);

    const def =
        type === 'boss'
            ? 10 + (level * 3)
            : type === 'elite'
                ? 8 + (level * 2)
                : 5 + level;

    const crit =
        type === 'boss' ? 12 :
        type === 'elite' ? 10 :
        6;

    const xp =
        type === 'boss'
            ? 110 + (level * 18)
            : type === 'elite'
                ? 65 + (level * 12)
                : 35 + (level * 8);

    const gold =
        type === 'boss'
            ? 110 + (level * 20)
            : type === 'elite'
                ? 60 + (level * 12)
                : 25 + (level * 8);

    const typeNames = {
        combat: 'Sombras Errantes',
        elite: 'Elite das Sombras',
        boss: 'Guardião do Vazio'
    };

    return {
        id: `${type}_${roomIndex}_${Date.now()}`,
        name: typeNames[type] || 'Criatura Sombria',
        hp,
        maxHp: hp,
        atk,
        def,
        crit,
        level,
        xp,
        gold,
        isElite: type === 'elite',
        isBoss: type === 'boss',
        frozen: false
    };
}

function createDungeonRoom(player, index, type) {
    const meta = roomMeta(type);

    const room = {
        index,
        type,
        title: meta.title,
        emoji: meta.emoji,
        description: meta.description,
        cleared: false,
        clearedAt: null,
        enemy: null,
        reward: null
    };

    if (type === 'combat' || type === 'elite' || type === 'boss') {
        room.enemy = createDungeonEnemy(player, index, type);
    }

    return room;
}

function buildDungeonRooms(player) {
    const types = buildDungeonRoomTypes();

    return types.map((type, index) =>
        createDungeonRoom(player, index + 1, type)
    );
}

function startDungeonRun(player) {
    const dungeon = normalizeDungeonState(player);

    dungeon.active = true;
    dungeon.completed = false;
    dungeon.aborted = false;
    dungeon.startedAt = Date.now();
    dungeon.finishedAt = null;
    dungeon.mapId = player.currentMap || 'clareira_sombria';
    dungeon.currentRoomIndex = 0;
    dungeon.rooms = buildDungeonRooms(player);
    dungeon.summary = null;
    dungeon.rewards = {
        xp: 0,
        gold: 0,
        keys: 0,
        glorias: 0,
        items: 0
    };

    return dungeon;
}

function getCurrentRoom(player) {
    const dungeon = normalizeDungeonState(player);
    return dungeon.rooms[dungeon.currentRoomIndex] || null;
}

function hasActiveDungeon(player) {
    const dungeon = normalizeDungeonState(player);
    return Boolean(dungeon.active && !dungeon.completed && !dungeon.aborted);
}

function buildDungeonKeyboard(player) {
    const dungeon = normalizeDungeonState(player);
    const room = getCurrentRoom(player);

    if (!dungeon.active || dungeon.completed || dungeon.aborted) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    '⚔️ Nova expedição',
                    'dungeon_attack'
                )
            ],
            [
                Markup.button.callback(
                    '🏠 Menu',
                    'menu'
                )
            ]
        ]);
    }

    if (!room) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    '⚔️ Continuar',
                    'dungeon_attack'
                )
            ],
            [
                Markup.button.callback(
                    '🏠 Menu',
                    'menu'
                )
            ]
        ]);
    }

    if (room.cleared) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    '➡️ Próxima sala',
                    'dungeon_next_room'
                )
            ],
            [
                Markup.button.callback(
                    '🏃 Sair da masmorra',
                    'dungeon_flee'
                )
            ],
            [
                Markup.button.callback(
                    '🏠 Menu',
                    'menu'
                )
            ]
        ]);
    }

    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                room.type === 'boss'
                    ? '👑 Enfrentar Guardião'
                    : room.type === 'elite'
                        ? '🔥 Enfrentar Elite'
                        : room.type === 'treasure'
                            ? '🎁 Abrir Tesouro'
                            : room.type === 'heal'
                                ? '❤️ Canalizar Fonte'
                                : room.type === 'curse'
                                    ? '💀 Quebrar Maldição'
                                    : '⚔️ Atacar',
                'dungeon_attack'
            )
        ],
        [
            Markup.button.callback(
                '🏃 Fugir',
                'dungeon_flee'
            )
        ],
        [
            Markup.button.callback(
                '🏠 Menu',
                'menu'
            )
        ]
    ]);
}

function renderDungeonSummary(player) {
    const dungeon = normalizeDungeonState(player);
    const summary = dungeon.summary || {};

    let text = '';

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (dungeon.completed) {
        text += `🏆 *MASMORRA CONCLUÍDA*\n`;
    } else if (dungeon.aborted) {
        text += `💀 *EXPEDIÇÃO ENCERRADA*\n`;
    } else {
        text += `🏰 *MASMORRA*\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    const map = getDungeonMap(player);

    text += `🗺️ ${map.emoji} ${map.name}\n`;

    if (dungeon.completed) {
        text += `👑 Você atravessou todas as salas.\n\n`;
    } else if (dungeon.aborted) {
        text += `🫥 A expedição foi interrompida.\n\n`;
    }

    text += `📊 Salas vencidas: ${summary.roomsCleared || 0}/${dungeon.maxRooms}\n`;
    text += `✨ XP ganho: ${safeNumber(summary.xp)}\n`;
    text += `💰 Ouro ganho: ${safeNumber(summary.gold)}\n`;
    text += `🗝️ Chaves: ${safeNumber(summary.keys)}\n`;
    text += `🏅 Glórias: ${safeNumber(summary.glorias)}\n`;
    text += `🎁 Itens: ${safeNumber(summary.items)}\n`;

    if (summary.notes?.length) {
        text += `\n📜 *Destaques*\n`;
        text += summary.notes.map(note => `• ${note}`).join('\n');
    }

    return text;
}

function renderDungeonText(player) {
    const dungeon = normalizeDungeonState(player);
    const room = getCurrentRoom(player);
    const map = getDungeonMap(player);

    if (!dungeon.active || dungeon.completed || dungeon.aborted) {
        return renderDungeonSummary(player);
    }

    if (!room) {
        return renderDungeonSummary(player);
    }

    const hpBar = require('../utils/formatters').progressBar(
        player.hp,
        player.maxHp,
        10,
        '🟥',
        '⬛'
    );

    const energyBar = require('../utils/formatters').progressBar(
        player.energy,
        player.maxEnergy,
        10,
        '🟦',
        '⬛'
    );

    let text = '';

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏰 *MASMORRA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🗺️ ${map.emoji} ${map.name}\n`;
    text += `🚪 Sala ${room.index}/${dungeon.maxRooms}\n`;
    text += `✨ ${room.emoji} ${room.title}\n`;
    text += `📖 ${room.description}\n\n`;

    text += `👤 *${escapeMarkdown(player.name)}*\n`;
    text += `❤️ ${player.hp}/${player.maxHp}\n`;
    text += `[${hpBar}]\n`;
    text += `⚡ ${player.energy}/${player.maxEnergy}\n`;
    text += `[${energyBar}]\n\n`;

    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        const enemyBar = require('../utils/formatters').progressBar(
            room.enemy.hp,
            room.enemy.maxHp,
            10,
            '🟥',
            '⬛'
        );

        const badge =
            room.type === 'boss' ? '👑 BOSS' :
            room.type === 'elite' ? '🔥 ELITE' :
            '👹 INIMIGO';

        text += `${badge}\n`;
        text += `👹 ${escapeMarkdown(room.enemy.name)} [Lv ${room.enemy.level}]\n`;
        text += `❤️ ${room.enemy.hp}/${room.enemy.maxHp}\n`;
        text += `[${enemyBar}]\n`;
        text += `⚔️ ATK ${room.enemy.atk} • 🛡️ DEF ${room.enemy.def} • 🎯 CRIT ${room.enemy.crit}%\n\n`;
    } else if (room.type === 'treasure') {
        text += `🎁 *Sala de Tesouro*\n`;
        text += `O cofre está diante de você. Há algo brilhando lá dentro.\n\n`;
    } else if (room.type === 'heal') {
        text += `❤️ *Fonte Sombria*\n`;
        text += `Uma energia ancestral pode restaurar seu corpo.\n\n`;
    } else if (room.type === 'curse') {
        text += `💀 *Santuário Corrompido*\n`;
        text += `Algo aqui cobra um preço. Mas pode valer a pena.\n\n`;
    }

    text += `📊 Progresso: ${dungeon.currentRoomIndex + 1}/${dungeon.maxRooms}\n`;

    if (dungeon.rewards) {
        text += `✨ XP acumulado: ${safeNumber(dungeon.rewards.xp)}\n`;
        text += `💰 Ouro acumulado: ${safeNumber(dungeon.rewards.gold)}\n`;
        text += `🗝️ Chaves acumuladas: ${safeNumber(dungeon.rewards.keys)}\n`;
        text += `🏅 Glórias acumuladas: ${safeNumber(dungeon.rewards.glorias)}\n`;
    }

    return text;
}

function finalizeDungeonRun(player, reason = 'complete') {
    const dungeon = normalizeDungeonState(player);

    dungeon.active = false;
    dungeon.completed = reason === 'complete';
    dungeon.aborted = reason === 'aborted';
    dungeon.finishedAt = Date.now();

    const roomsCleared = dungeon.rooms.filter(room => room.cleared).length;
    const bonusXp = 20 + (roomsCleared * 10) + (player.level * 2);
    const bonusGold = 60 + (roomsCleared * 20) + (player.level * 5);
    const bonusKeys = reason === 'complete' ? 1 : 0;
    const bonusGlorias = reason === 'complete' ? 1 : 0;

    dungeon.summary = dungeon.summary || {};
    dungeon.summary.roomsCleared = roomsCleared;
    dungeon.summary.xp = safeNumber(dungeon.summary.xp) + bonusXp;
    dungeon.summary.gold = safeNumber(dungeon.summary.gold) + bonusGold;
    dungeon.summary.keys = safeNumber(dungeon.summary.keys) + bonusKeys;
    dungeon.summary.glorias = safeNumber(dungeon.summary.glorias) + bonusGlorias;
    dungeon.summary.items = safeNumber(dungeon.summary.items);
    dungeon.summary.notes = dungeon.summary.notes || [];

    addXp(player, bonusXp);
    player.gold = (player.gold || 0) + bonusGold;
    player.keys = (player.keys || 0) + bonusKeys;
    player.glorias = (player.glorias || 0) + bonusGlorias;

    if (reason === 'complete') {
        dungeon.summary.notes.push('Expedição perfeita concluída.');
    } else {
        dungeon.summary.notes.push('Expedição interrompida antes do fim.');
    }

    return dungeon;
}

function buildCombatTurnText(room, playerHit, enemyHit) {
    let text = '';

    text += `⚔️ Você causou ${playerHit.damage} dano\n`;

    if (playerHit.isCrit) {
        text += `💥 CRÍTICO!\n`;
    }

    if (enemyHit) {
        text += `👹 ${room.enemy.name} causou ${enemyHit.damage} dano\n`;
        if (enemyHit.isCrit) {
            text += `💥 O inimigo acertou um crítico!\n`;
        }
    }

    return text;
}

function addSummaryNote(player, note) {
    const dungeon = normalizeDungeonState(player);
    dungeon.summary = dungeon.summary || {};
    dungeon.summary.notes = dungeon.summary.notes || [];
    dungeon.summary.notes.push(note);
}

/*
=================================
ROOM RESOLUTION
=================================
*/

function resolveTreasureRoom(player, room) {
    const dungeon = normalizeDungeonState(player);
    const mapNumber = getMapNumber(dungeon.mapId);

    const gold = 45 + (player.level * 12) + (room.index * 8);
    player.gold = (player.gold || 0) + gold;

    dungeon.rewards.gold += gold;
    dungeon.rewards.items += 1;

    const notes = [`Tesouro: +${gold} ouro`];

    if (Math.random() < 0.25) {
        player.keys = (player.keys || 0) + 1;
        dungeon.rewards.keys += 1;
        notes.push('Tesouro: +1 chave');
    }

    if (Math.random() < 0.35) {
        const drop = generateDrop(mapNumber);
        if (drop) {
            player.inventory ??= [];
            if (player.inventory.length < (player.maxInventory || 20)) {
                player.inventory.push(drop);
                notes.push(`Tesouro: ${drop.name}`);
            }
        }
    }

    room.cleared = true;
    room.clearedAt = Date.now();
    room.reward = {
        gold
    };

    notes.forEach(note => addSummaryNote(player, note));

    return {
        success: true,
        message: `🎁 Você abriu o tesouro e ganhou ${gold} ouro!`,
        notes
    };
}

function resolveHealRoom(player, room) {
    const dungeon = normalizeDungeonState(player);

    const heal = Math.max(
        1,
        Math.floor(player.maxHp * 0.45)
    );

    const energy = 1;
    const beforeHp = player.hp;
    const beforeEnergy = player.energy;

    player.hp = Math.min(player.maxHp, player.hp + heal);
    player.energy = Math.min(player.maxEnergy, player.energy + energy);

    room.cleared = true;
    room.clearedAt = Date.now();
    room.reward = {
        heal,
        energy
    };

    dungeon.rewards.items += 0;
    addSummaryNote(player, `Fonte Sombria: +${player.hp - beforeHp} HP`);
    addSummaryNote(player, `Fonte Sombria: +${player.energy - beforeEnergy} energia`);

    return {
        success: true,
        message: `❤️ A fonte restaurou ${player.hp - beforeHp} HP e ${player.energy - beforeEnergy} energia.`,
        notes: [
            `Fonte Sombria: +${player.hp - beforeHp} HP`,
            `Fonte Sombria: +${player.energy - beforeEnergy} energia`
        ]
    };
}

function resolveCurseRoom(player, room) {
    const dungeon = normalizeDungeonState(player);

    const damage = Math.max(
        1,
        Math.floor(player.maxHp * 0.18)
    );

    const hpLoss = Math.min(
        damage,
        Math.max(1, player.hp - 1)
    );

    player.hp = Math.max(1, player.hp - hpLoss);

    const gold = 90 + (player.level * 15) + (room.index * 10);
    player.gold = (player.gold || 0) + gold;
    dungeon.rewards.gold += gold;

    let notes = [
        `Maldição: -${hpLoss} HP`,
        `Maldição: +${gold} ouro`
    ];

    if (Math.random() < 0.2) {
        player.keys = (player.keys || 0) + 1;
        dungeon.rewards.keys += 1;
        notes.push('Maldição: +1 chave');
    }

    room.cleared = true;
    room.clearedAt = Date.now();
    room.reward = {
        gold,
        hpLoss
    };

    notes.forEach(note => addSummaryNote(player, note));

    return {
        success: true,
        message: `💀 A maldição cobrou ${hpLoss} HP, mas você obteve ${gold} ouro.`,
        notes
    };
}

function resolveCombatRoom(player, room) {
    const dungeon = normalizeDungeonState(player);

    if (!room.enemy) {
        room.enemy = createDungeonEnemy(player, room.index, room.type);
    }

    const playerHit = calculateDamage(
        {
            atk: player.atk,
            crit: player.crit
        },
        {
            def: room.enemy.def
        }
    );

    room.enemy.hp = Math.max(0, room.enemy.hp - playerHit.damage);

    const result = {
        success: true,
        finished: false,
        defeated: false,
        message: '',
        notes: []
    };

    if (room.enemy.hp <= 0) {
        const rewards = processVictory(player, room.enemy);

        dungeon.rewards.xp += safeNumber(rewards.xp);
        dungeon.rewards.gold += safeNumber(rewards.gold);
        dungeon.rewards.keys += rewards.keyDropped ? 1 : 0;
        dungeon.rewards.items += rewards.loot?.length ? rewards.loot.length : 0;

        result.defeated = true;
        result.message = `🏆 ${room.enemy.name} derrotado!`;

        result.notes.push(
            `XP +${rewards.xp}`,
            `Ouro +${rewards.gold}`
        );

        if (rewards.loot?.length) {
            result.notes.push(...rewards.loot.map(item => `Loot: ${item}`));
        }

        room.cleared = true;
        room.clearedAt = Date.now();
        room.reward = rewards;

        result.rewards = rewards;

        if (room.type === 'boss') {
            finalizeDungeonRun(player, 'complete');
            result.finished = true;
        }

        result.notes.forEach(note => addSummaryNote(player, note));
        return result;
    }

    const enemyHit = calculateDamage(
        {
            atk: room.enemy.atk,
            crit: room.enemy.crit
        },
        {
            def: player.def
        }
    );

    player.hp = Math.max(0, player.hp - enemyHit.damage);

    result.message = buildCombatTurnText(room, playerHit, enemyHit);

    if (player.hp <= 0) {
        dungeon.active = false;
        dungeon.aborted = true;
        dungeon.completed = false;
        dungeon.finishedAt = Date.now();
        dungeon.summary = dungeon.summary || {};
        dungeon.summary.notes = dungeon.summary.notes || [];
        dungeon.summary.notes.push('Você foi derrotado na masmorra.');

        player.hp = 1;
        player.energy = Math.max(0, player.energy - 1);

        result.finished = true;
        result.defeated = true;
        result.playerDefeated = true;
        result.notes.push('Você foi derrotado na masmorra.');
    }

    return result;
}

/*
=================================
RENDER / KEYBOARD
=================================
*/

async function safeAnswer(ctx, text = undefined, options = {}) {
    try {
        return await ctx.answerCbQuery(text, options);
    } catch {
        return null;
    }
}

async function safeSend(ctx, text, options = {}) {
    try {
        if (ctx.callbackQuery) {
            return await ctx.editMessageText(text, options);
        }

        return await ctx.reply(text, options);
    } catch {
        return await ctx.reply(text, options);
    }
}

function buildResultText(player, room, result) {
    const dungeon = normalizeDungeonState(player);
    const map = getDungeonMap(player);

    let text = '';

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (dungeon.completed) {
        text += `🏆 *MASMORRA CONCLUÍDA*\n`;
    } else if (dungeon.aborted) {
        text += `💀 *EXPEDIÇÃO ENCERRADA*\n`;
    } else {
        text += `🏰 *MASMORRA*\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🗺️ ${map.emoji} ${map.name}\n`;
    text += `🚪 Sala ${room.index}/${dungeon.maxRooms}\n`;
    text += `✨ ${room.emoji} ${room.title}\n\n`;

    if (result?.message) {
        text += `${result.message}\n\n`;
    }

    if (result?.notes?.length) {
        text += `📜 *Ganho da sala*\n`;
        text += result.notes.map(note => `• ${note}`).join('\n');
        text += `\n\n`;
    }

    text += `👤 *${escapeMarkdown(player.name)}*\n`;
    text += `❤️ ${player.hp}/${player.maxHp}\n`;
    text += `⚡ ${player.energy}/${player.maxEnergy}\n`;

    if (dungeon.summary) {
        text += `\n📊 *Resumo*\n`;
        text += `• Salas vencidas: ${dungeon.summary.roomsCleared || 0}/${dungeon.maxRooms}\n`;
        text += `• XP acumulado: ${safeNumber(dungeon.summary.xp)}\n`;
        text += `• Ouro acumulado: ${safeNumber(dungeon.summary.gold)}\n`;
        text += `• Chaves: ${safeNumber(dungeon.summary.keys)}\n`;
        text += `• Glórias: ${safeNumber(dungeon.summary.glorias)}\n`;
    }

    return text;
}

function buildActiveText(player) {
    const dungeon = normalizeDungeonState(player);
    const room = getCurrentRoom(player);
    const map = getDungeonMap(player);

    const hpBar = require('../utils/formatters').progressBar(
        player.hp,
        player.maxHp,
        10,
        '🟥',
        '⬛'
    );

    const energyBar = require('../utils/formatters').progressBar(
        player.energy,
        player.maxEnergy,
        10,
        '🟦',
        '⬛'
    );

    let text = '';

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏰 *MASMORRA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🗺️ ${map.emoji} ${map.name}\n`;
    text += `🚪 Sala ${room.index}/${dungeon.maxRooms}\n`;
    text += `✨ ${room.emoji} ${room.title}\n`;
    text += `📖 ${room.description}\n\n`;

    text += `👤 *${escapeMarkdown(player.name)}*\n`;
    text += `❤️ ${player.hp}/${player.maxHp}\n`;
    text += `[${hpBar}]\n`;
    text += `⚡ ${player.energy}/${player.maxEnergy}\n`;
    text += `[${energyBar}]\n\n`;

    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        const enemyBar = require('../utils/formatters').progressBar(
            room.enemy.hp,
            room.enemy.maxHp,
            10,
            '🟥',
            '⬛'
        );

        const badge =
            room.type === 'boss' ? '👑 BOSS' :
            room.type === 'elite' ? '🔥 ELITE' :
            '👹 INIMIGO';

        text += `${badge}\n`;
        text += `👹 ${escapeMarkdown(room.enemy.name)} [Lv ${room.enemy.level}]\n`;
        text += `❤️ ${room.enemy.hp}/${room.enemy.maxHp}\n`;
        text += `[${enemyBar}]\n`;
        text += `⚔️ ATK ${room.enemy.atk} • 🛡️ DEF ${room.enemy.def} • 🎯 CRIT ${room.enemy.crit}%\n\n`;
    } else if (room.type === 'treasure') {
        text += `🎁 *Sala do Tesouro*\n`;
        text += `Abra o cofre para coletar a recompensa.\n\n`;
    } else if (room.type === 'heal') {
        text += `❤️ *Fonte Sombria*\n`;
        text += `Canalize a energia da fonte para se recuperar.\n\n`;
    } else if (room.type === 'curse') {
        text += `💀 *Santuário Corrompido*\n`;
        text += `Aceite a maldição e receba o preço.\n\n`;
    }

    text += `📊 Progresso: ${dungeon.currentRoomIndex + 1}/${dungeon.maxRooms}\n`;

    if (dungeon.rewards) {
        text += `✨ XP acumulado: ${safeNumber(dungeon.rewards.xp)}\n`;
        text += `💰 Ouro acumulado: ${safeNumber(dungeon.rewards.gold)}\n`;
        text += `🗝️ Chaves acumuladas: ${safeNumber(dungeon.rewards.keys)}\n`;
        text += `🏅 Glórias acumuladas: ${safeNumber(dungeon.rewards.glorias)}\n`;
    }

    return text;
}

function buildDungeonText(player) {
    const dungeon = normalizeDungeonState(player);

    if (!dungeon.active || dungeon.completed || dungeon.aborted) {
        return renderDungeonSummary(player);
    }

    return buildActiveText(player);
}

/*
=================================
HANDLERS
=================================
*/

async function handleDungeon(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    normalizeDungeonState(player);

    if (!player.dungeonProgress.rooms?.length && !player.dungeonProgress.active) {
        startDungeonRun(player);
        await savePlayer(ctx.from.id, player);
    }

    return safeSend(
        ctx,
        buildDungeonText(player),
        {
            parse_mode: 'Markdown',
            ...buildDungeonKeyboard(player)
        }
    );
}

async function handleDungeonAttack(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    const dungeon = normalizeDungeonState(player);

    if (!dungeon.active || dungeon.completed || dungeon.aborted || !dungeon.rooms?.length) {
        startDungeonRun(player);
        await savePlayer(ctx.from.id, player);

        return safeSend(
            ctx,
            buildDungeonText(player),
            {
                parse_mode: 'Markdown',
                ...buildDungeonKeyboard(player)
            }
        );
    }

    const room = getCurrentRoom(player);

    if (!room) {
        return safeSend(
            ctx,
            renderDungeonSummary(player),
            {
                parse_mode: 'Markdown',
                ...buildDungeonKeyboard(player)
            }
        );
    }

    if (room.cleared) {
        return safeAnswer(
            ctx,
            '✅ Esta sala já foi resolvida. Avance para a próxima.',
            { show_alert: true }
        );
    }

    let result = null;

    if (room.type === 'combat' || room.type === 'elite' || room.type === 'boss') {
        result = resolveCombatRoom(player, room);
    } else if (room.type === 'treasure') {
        result = resolveTreasureRoom(player, room);
    } else if (room.type === 'heal') {
        result = resolveHealRoom(player, room);
    } else if (room.type === 'curse') {
        result = resolveCurseRoom(player, room);
    } else {
        result = {
            success: false,
            message: 'Sala inválida.'
        };
    }

    if (result?.rewards?.xp) {
        dungeon.rewards.xp += safeNumber(result.rewards.xp);
    }

    if (result?.rewards?.gold) {
        dungeon.rewards.gold += safeNumber(result.rewards.gold);
    }

    if (result?.rewards?.keys) {
        dungeon.rewards.keys += safeNumber(result.rewards.keys);
    }

    if (result?.rewards?.glorias) {
        dungeon.rewards.glorias += safeNumber(result.rewards.glorias);
    }

    if (result?.playerDefeated) {
        await savePlayer(ctx.from.id, player);
        return safeSend(
            ctx,
            buildResultText(player, room, result),
            {
                parse_mode: 'Markdown',
                ...buildDungeonKeyboard(player)
            }
        );
    }

    await savePlayer(ctx.from.id, player);

    if (room.type === 'boss' && room.cleared) {
        dungeon.summary = dungeon.summary || {};
        dungeon.summary.roomsCleared = dungeon.rooms.filter(r => r.cleared).length;
        dungeon.summary.xp = safeNumber(dungeon.rewards.xp);
        dungeon.summary.gold = safeNumber(dungeon.rewards.gold);
        dungeon.summary.keys = safeNumber(dungeon.rewards.keys);
        dungeon.summary.glorias = safeNumber(dungeon.rewards.glorias);
        dungeon.summary.items = safeNumber(dungeon.rewards.items);
        finalizeDungeonRun(player, 'complete');
        await savePlayer(ctx.from.id, player);

        return safeSend(
            ctx,
            buildResultText(player, room, result),
            {
                parse_mode: 'Markdown',
                ...buildDungeonKeyboard(player)
            }
        );
    }

    return safeSend(
        ctx,
        buildResultText(player, room, result),
        {
            parse_mode: 'Markdown',
            ...buildDungeonKeyboard(player)
        }
    );
}

async function handleDungeonNextRoom(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    const dungeon = normalizeDungeonState(player);

    if (!dungeon.active || dungeon.completed || dungeon.aborted || !dungeon.rooms?.length) {
        startDungeonRun(player);
        await savePlayer(ctx.from.id, player);

        return safeSend(
            ctx,
            buildDungeonText(player),
            {
                parse_mode: 'Markdown',
                ...buildDungeonKeyboard(player)
            }
        );
    }

    const room = getCurrentRoom(player);

    if (!room) {
        return safeAnswer(
            ctx,
            '⚠️ Sala inválida.',
            { show_alert: true }
        );
    }

    if (!room.cleared) {
        return safeAnswer(
            ctx,
            '⚠️ Resolva a sala atual primeiro.',
            { show_alert: true }
        );
    }

    if (dungeon.currentRoomIndex >= dungeon.maxRooms - 1) {
        dungeon.summary = dungeon.summary || {};
        dungeon.summary.roomsCleared = dungeon.rooms.filter(r => r.cleared).length;
        dungeon.summary.xp = safeNumber(dungeon.rewards.xp);
        dungeon.summary.gold = safeNumber(dungeon.rewards.gold);
        dungeon.summary.keys = safeNumber(dungeon.rewards.keys);
        dungeon.summary.glorias = safeNumber(dungeon.rewards.glorias);

        finalizeDungeonRun(player, 'complete');
        await savePlayer(ctx.from.id, player);

        return safeSend(
            ctx,
            renderDungeonSummary(player),
            {
                parse_mode: 'Markdown',
                ...buildDungeonKeyboard(player)
            }
        );
    }

    dungeon.currentRoomIndex += 1;
    dungeon.active = true;

    await savePlayer(ctx.from.id, player);

    return safeSend(
        ctx,
        buildDungeonText(player),
        {
            parse_mode: 'Markdown',
            ...buildDungeonKeyboard(player)
        }
    );
}

async function handleDungeonFlee(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    const dungeon = normalizeDungeonState(player);

    if (!dungeon.active || !dungeon.rooms?.length) {
        return safeAnswer(
            ctx,
            'Nenhuma expedição ativa.',
            { show_alert: true }
        );
    }

    dungeon.aborted = true;
    dungeon.active = false;
    dungeon.completed = false;
    dungeon.finishedAt = Date.now();
    dungeon.summary = dungeon.summary || {};
    dungeon.summary.roomsCleared = dungeon.rooms.filter(r => r.cleared).length;
    dungeon.summary.xp = safeNumber(dungeon.rewards.xp);
    dungeon.summary.gold = safeNumber(dungeon.rewards.gold);
    dungeon.summary.keys = safeNumber(dungeon.rewards.keys);
    dungeon.summary.glorias = safeNumber(dungeon.rewards.glorias);
    dungeon.summary.items = safeNumber(dungeon.rewards.items);
    dungeon.summary.notes = dungeon.summary.notes || [];
    dungeon.summary.notes.push('A expedição foi abandonada.');

    player.energy = Math.max(0, (player.energy || 0) - 1);

    await savePlayer(ctx.from.id, player);

    return safeSend(
        ctx,
        renderDungeonSummary(player),
        {
            parse_mode: 'Markdown',
            ...buildDungeonKeyboard(player)
        }
    );
}

module.exports = {
    handleDungeon,
    handleDungeonAttack,
    handleDungeonNextRoom,
    handleDungeonFlee
};