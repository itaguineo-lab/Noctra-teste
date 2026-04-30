const { calculateDamage } = require('../combat/damageCalc');
const { processVictory } = require('../../services/rewardService');
const { generatePolicyCompliantDrop } = require('../loot/dropPolicy');
const { BALANCE } = require('../../data/balance');

const {
    applyDamage,
    applyHeal,
    restoreEnergy,
    addInventoryItem,
    applyGoldReward,
    applyKeyReward,
    applyGloriaReward,
    applyXpReward
} = require('../player/playerMutations');

const {
    updateMissionProgress
} = require('../daily/dailyService');

const {
    recordDungeonRewardMetrics
} = require('../metrics/metricsService');

const {
    safeNumber,
    getMapNumber
} = require('./dungeonRooms');

const {
    getCompletionMinRarity,
    buildCompletionDropOptions,
    buildCompletionDropPolicy,
    getCompletionBonus,
    buildCompletionRewardTag
} = require('./dungeonRewardPolicy');

const RARITY_RANK = {
    Comum: 1,
    Incomum: 2,
    Raro: 3,
    Épico: 4,
    Epico: 4,
    Lendário: 5,
    Lendario: 5,
    Mítico: 6,
    Mitico: 6
};

function addDungeonLog(player, message) {
    player.dungeonProgress.logs.push(message);

    if (player.dungeonProgress.logs.length > 4) {
        player.dungeonProgress.logs.shift();
    }
}

function addSummaryNote(player, note) {
    const d = player.dungeonProgress;

    if (!d.summary) d.summary = { notes: [] };
    if (!d.summary.notes) d.summary.notes = [];

    d.summary.notes.push(note);
}

function ensureDungeonRewardShape(player) {
    const d = player.dungeonProgress;

    d.rewards ??= {};
    d.rewards.xp = safeNumber(d.rewards.xp);
    d.rewards.gold = safeNumber(d.rewards.gold);
    d.rewards.keys = safeNumber(d.rewards.keys);
    d.rewards.glorias = safeNumber(d.rewards.glorias);
    d.rewards.items = safeNumber(d.rewards.items);
    d.rewards.souls = safeNumber(d.rewards.souls);

    return d.rewards;
}

function recordDungeonRewardMetricsAsync(payload = {}) {
    recordDungeonRewardMetrics(payload).catch(error => {
        console.error('⚠️ recordDungeonRewardMetrics falhou:', error);
    });
}

function getRoomRewardScalar(roomType) {
    if (roomType === 'boss') return 1.28;
    if (roomType === 'elite') return 1.16;

    return 1.0;
}

function isEliteDungeonRun(player) {
    const d = player?.dungeonProgress;
    return Boolean(
        d?.isEliteDungeon ||
        d?.mode === 'elite' ||
        d?.difficulty === 'elite'
    );
}

function buildDungeonDropPolicy(player) {
    return {
        isDungeon: true,
        isEliteDungeon: isEliteDungeonRun(player)
    };
}

function getRarityRank(rarity) {
    return RARITY_RANK[rarity] || 0;
}

function isRarityAtLeast(rarity, minRarity) {
    return getRarityRank(rarity) >= getRarityRank(minRarity);
}

function formatDungeonItemNote(item, prefix = '✨') {
    const origin = item.originMap ? ` • ${item.originMap}` : '';
    const trait = item.traitLabel ? ` • ${item.traitLabel}` : '';
    return `${prefix} ${item.name} [${item.rarity}]${trait}${origin}`;
}

function generateDungeonDrop(player, mapNumber, dropOptions = {}) {
    return generatePolicyCompliantDrop(
        mapNumber,
        {
            playerClass: player.class,
            ...dropOptions
        },
        buildDungeonDropPolicy(player)
    );
}

function generateDungeonCompletionDrop(player, mapNumber, isEliteDungeon = false) {
    const minRarity = getCompletionMinRarity(mapNumber, isEliteDungeon);
    const dropOptions = buildCompletionDropOptions(player, mapNumber, isEliteDungeon);
    const policy = buildCompletionDropPolicy(isEliteDungeon);
    let fallback = null;

    for (let attempt = 0; attempt < 18; attempt += 1) {
        const rolled = generatePolicyCompliantDrop(mapNumber, dropOptions, policy);

        if (!fallback || getRarityRank(rolled?.rarity) > getRarityRank(fallback?.rarity)) {
            fallback = rolled;
        }

        if (isRarityAtLeast(rolled?.rarity, minRarity)) {
            return rolled;
        }
    }

    return fallback;
}

/*
=================================
TREASURE ROOM
=================================
*/

function resolveTreasureRoom(player, room) {
    const d = player.dungeonProgress;
    ensureDungeonRewardShape(player);

    const mapNumber = getMapNumber(d.mapId);
    const isEliteDungeon = isEliteDungeonRun(player);

    const gold = Math.floor(60 + player.level * 14 + room.index * 12);
    applyGoldReward(player, gold);
    d.rewards.gold += gold;

    const notes = [`🎁 +${gold} ouro`];
    const metrics = {
        gold,
        xp: 0,
        keys: 0,
        items: 0,
        itemRarities: [],
        souls: 0,
        glorias: 0,
        completionItems: 0,
        isEliteDungeon
    };

    if (Math.random() < (BALANCE.dungeon.dungeonTreasureKeyDropChance || 0)) {
        applyKeyReward(player, 1);
        d.rewards.keys += 1;
        metrics.keys += 1;
        notes.push('🗝️ +1 chave');
    }

    if (Math.random() < 0.24) {
        const drop = generateDungeonDrop(player, mapNumber, {
            encounterTier: 'miniboss',
            rarityBias: mapNumber >= 4 ? 'late_elite' : 'mid_elite'
        });

        const addResult = addInventoryItem(player, drop);

        if (addResult.success) {
            const item = addResult.item || drop;
            d.rewards.items += 1;
            metrics.items += 1;
            if (item?.rarity) metrics.itemRarities.push(item.rarity);
            notes.push(formatDungeonItemNote(item));
        }
    }

    room.cleared = true;
    room.clearedAt = Date.now();

    notes.forEach(n => addSummaryNote(player, n));
    addDungeonLog(player, `🎁 Tesouro: +${gold} ouro`);
    recordDungeonRewardMetricsAsync(metrics);

    return {
        success: true,
        message: `🎁 Você encontrou ${gold} ouro!`,
        notes
    };
}

/*
=================================
HEAL ROOM
=================================
*/

function resolveHealRoom(player, room) {
    ensureDungeonRewardShape(player);

    const heal = Math.floor(player.maxHp * 0.45);
    const beforeHp = player.hp;
    const beforeEnergy = player.energy;

    applyHeal(player, heal);
    restoreEnergy(player, 1);

    room.cleared = true;
    room.clearedAt = Date.now();

    addSummaryNote(player, `❤️ +${player.hp - beforeHp} HP, ⚡ +${player.energy - beforeEnergy} energia`);
    addDungeonLog(player, `❤️ Fonte restaurou ${player.hp - beforeHp} HP e ${player.energy - beforeEnergy} energia`);

    return {
        success: true,
        message: `❤️ Fonte restaurou ${player.hp - beforeHp} HP e ${player.energy - beforeEnergy} energia.`
    };
}

/*
=================================
CURSE ROOM
=================================
*/

function resolveCurseRoom(player, room) {
    const d = player.dungeonProgress;
    ensureDungeonRewardShape(player);

    const isEliteDungeon = isEliteDungeonRun(player);
    const damage = Math.floor(player.maxHp * 0.18);
    const hpLoss = Math.min(damage, Math.max(0, player.hp - 1));
    const gold = Math.floor(95 + player.level * 16 + room.index * 12);

    applyDamage(player, hpLoss);
    applyGoldReward(player, gold);
    d.rewards.gold += gold;

    const notes = [`💀 -${hpLoss} HP`, `💰 +${gold} ouro`];
    const metrics = {
        gold,
        xp: 0,
        keys: 0,
        items: 0,
        itemRarities: [],
        souls: 0,
        glorias: 0,
        completionItems: 0,
        isEliteDungeon
    };

    if (Math.random() < (BALANCE.dungeon.dungeonCurseKeyDropChance || 0)) {
        applyKeyReward(player, 1);
        d.rewards.keys += 1;
        metrics.keys += 1;
        notes.push('🗝️ +1 chave');
    }

    room.cleared = true;
    room.clearedAt = Date.now();

    notes.forEach(n => addSummaryNote(player, n));
    addDungeonLog(player, `💀 Maldição: -${hpLoss} HP, +${gold} ouro`);
    recordDungeonRewardMetricsAsync(metrics);

    return {
        success: true,
        message: `💀 A maldição cobrou ${hpLoss} HP, mas rendeu ${gold} ouro.`,
        notes
    };
}

/*
=================================
SHRINE ROOM
=================================
*/

function resolveShrineRoom(player, room) {
    const d = player.dungeonProgress;
    ensureDungeonRewardShape(player);

    const boons = [
        { atk: 4, def: 0, crit: 0, hpPercent: 0.10, note: '⚔️ Bênção de Força (+4 ATK)' },
        { atk: 0, def: 4, crit: 0, hpPercent: 0.08, note: '🛡️ Bênção de Guarda (+4 DEF)' },
        { atk: 0, def: 0, crit: 4, hpPercent: 0.05, note: '💥 Bênção de Precisão (+4% CRIT)' },
        { atk: 2, def: 2, crit: 2, hpPercent: 0.12, note: '✨ Bênção Equilibrada (+2 em ATK/DEF/CRIT)' }
    ];

    const selected = boons[Math.floor(Math.random() * boons.length)];

    d.combatBonus.atk += selected.atk;
    d.combatBonus.def += selected.def;
    d.combatBonus.crit += selected.crit;

    const heal = Math.max(5, Math.floor(player.maxHp * selected.hpPercent));
    const beforeHp = player.hp;

    applyHeal(player, heal);

    room.cleared = true;
    room.clearedAt = Date.now();

    addSummaryNote(player, selected.note);

    if (player.hp - beforeHp > 0) {
        addSummaryNote(player, `❤️ +${player.hp - beforeHp} HP`);
    }

    addDungeonLog(player, `✨ Altar concedeu: ${selected.note.replace(/^.\s/, '')}`);

    return {
        success: true,
        message: '✨ O altar respondeu ao seu toque.',
        notes: [selected.note, `❤️ Cura recebida: ${player.hp - beforeHp}`]
    };
}

/*
=================================
COMBAT ROOM
=================================
*/

async function resolveCombatRoom(player, room) {
    const d = player.dungeonProgress;
    ensureDungeonRewardShape(player);

    const roomScalar = getRoomRewardScalar(room.type);
    const isEliteDungeon = isEliteDungeonRun(player);

    const effectivePlayer = {
        atk: Math.max(1, (player.atk || 1) + (d.combatBonus.atk || 0)),
        crit: Math.max(0, Math.min(75, (player.crit || 0) + (d.combatBonus.crit || 0)))
    };

    const effectiveDefense = {
        def: Math.max(0, (player.def || 0) + (d.combatBonus.def || 0))
    };

    const playerHit = calculateDamage(effectivePlayer, { def: room.enemy.def });
    room.enemy.hp = Math.max(0, room.enemy.hp - playerHit.damage);

    let playerLog = `⚔️ Você causou ${playerHit.damage} de dano`;
    if (playerHit.isCrit) playerLog += ' (💥 CRÍTICO!)';
    addDungeonLog(player, playerLog);

    const result = {
        success: true,
        defeated: false,
        message: '',
        notes: []
    };

    if (room.enemy.hp <= 0) {
        const rewards = await processVictory(player, room.enemy, {
            isDungeon: true,
            isDungeonBoss: room.type === 'boss',
            isEliteDungeon
        });

        const dungeonBonusXp = Math.floor(safeNumber(rewards.xp) * (roomScalar - 1));
        const dungeonBonusGold = Math.floor(safeNumber(rewards.gold) * (roomScalar - 1));

        if (dungeonBonusXp > 0) {
            applyXpReward(player, dungeonBonusXp);
        }

        if (dungeonBonusGold > 0) {
            applyGoldReward(player, dungeonBonusGold);
        }

        d.rewards.xp += safeNumber(rewards.xp) + dungeonBonusXp;
        d.rewards.gold += safeNumber(rewards.gold) + dungeonBonusGold;

        if (rewards.keyDropped) d.rewards.keys += 1;
        if (rewards.droppedItem) d.rewards.items += 1;
        if (rewards.soulDropped) d.rewards.souls += 1;

        if (dungeonBonusXp > 0 || dungeonBonusGold > 0) {
            recordDungeonRewardMetricsAsync({
                gold: dungeonBonusGold,
                xp: dungeonBonusXp,
                isEliteDungeon
            });
        }

        result.defeated = true;
        result.message = `🏆 ${room.enemy.name} derrotado!`;
        result.notes = [
            `✨ +${safeNumber(rewards.xp) + dungeonBonusXp} XP`,
            `💰 +${safeNumber(rewards.gold) + dungeonBonusGold} ouro`
        ];

        if (rewards.droppedItem) {
            result.notes.push(`🎁 ${rewards.loot.find(line => line.includes(rewards.droppedItem.name)) || rewards.droppedItem.name}`);
        }

        if (rewards.soulDropped && rewards.soulLootLine) {
            result.notes.push(`🌑 ${rewards.soulLootLine}`);
        }

        if (rewards.keyDropped) {
            result.notes.push('🗝️ Chave de Masmorra');
        }

        if (dungeonBonusXp > 0 || dungeonBonusGold > 0) {
            result.notes.push('🏰 Bônus da masmorra aplicado');
        }

        room.cleared = true;
        room.clearedAt = Date.now();
        result.rewards = rewards;

        result.notes.forEach(n => addSummaryNote(player, n));
        addDungeonLog(player, `🏆 ${room.enemy.name} foi derrotado!`);

        return result;
    }

    const enemyHit = calculateDamage(
        { atk: room.enemy.atk, crit: room.enemy.crit },
        effectiveDefense
    );

    applyDamage(player, enemyHit.damage);

    let enemyLog = `👹 ${room.enemy.name} causou ${enemyHit.damage} de dano`;
    if (enemyHit.isCrit) enemyLog += ' (💀 CRÍTICO!)';
    addDungeonLog(player, enemyLog);

    result.message = `⚔️ Você causou ${playerHit.damage} dano. ${room.enemy.emoji || '👹'} ${room.enemy.name} causou ${enemyHit.damage}.`;

    if (player.hp <= 1) {
        d.active = false;
        d.aborted = true;
        d.summary = d.summary || {};
        d.summary.notes = d.summary.notes || [];
        d.summary.notes.push('💀 Derrotado na masmorra.');
        result.finished = true;
        result.playerDefeated = true;
        addDungeonLog(player, '💀 Você foi derrotado...');
    }

    return result;
}

/*
=================================
FINALIZE DUNGEON RUN
=================================
*/

function finalizeDungeonRun(player, reason) {
    const d = player.dungeonProgress;
    ensureDungeonRewardShape(player);

    if (d.summary && (d.completed || d.aborted) && !d.active) {
        return d;
    }

    d.active = false;
    d.completed = reason === 'complete';
    d.aborted = reason === 'aborted';

    const isEliteDungeon = isEliteDungeonRun(player);
    const cleared = d.rooms.filter(r => r.cleared).length;
    const mapNumber = getMapNumber(d.mapId);
    const completionBonus = getCompletionBonus({
        playerLevel: player.level,
        clearedRooms: cleared,
        isEliteDungeon
    });

    const bonusXp = completionBonus.xp;
    const bonusGold = completionBonus.gold;
    const bonusKeys = reason === 'complete'
        ? Math.max(0, Number(BALANCE.dungeon.dungeonCompletionKeyReward || 0))
        : 0;
    const bonusGlorias = reason === 'complete' ? completionBonus.glorias : 0;

    d.summary = {
        roomsCleared: cleared,
        xp: safeNumber(d.rewards.xp) + bonusXp,
        gold: safeNumber(d.rewards.gold) + bonusGold,
        keys: safeNumber(d.rewards.keys) + bonusKeys,
        glorias: safeNumber(d.rewards.glorias) + bonusGlorias,
        items: safeNumber(d.rewards.items),
        souls: safeNumber(d.rewards.souls),
        notes: d.summary?.notes || []
    };

    let completionItem = null;
    const metrics = {
        gold: bonusGold,
        xp: bonusXp,
        keys: bonusKeys,
        glorias: bonusGlorias,
        items: 0,
        itemRarities: [],
        souls: 0,
        completionItems: 0,
        isEliteDungeon
    };

    if (reason === 'complete') {
        const premiumDrop = generateDungeonCompletionDrop(player, mapNumber, isEliteDungeon);
        const addResult = addInventoryItem(player, premiumDrop);

        if (addResult.success) {
            completionItem = addResult.item || premiumDrop;
            d.summary.items += 1;
            metrics.items += 1;
            metrics.completionItems += 1;
            if (completionItem?.rarity) metrics.itemRarities.push(completionItem.rarity);
            d.summary.notes.push(formatDungeonItemNote(completionItem, '🎁 Recompensa final:'));
            d.summary.notes.push(`📌 Política de recompensa: ${buildCompletionRewardTag(mapNumber, isEliteDungeon)}`);
        }

        d.summary.notes.push('🏁 Expedição perfeita!');
    } else {
        d.summary.notes.push('🚪 Expedição interrompida.');
    }

    applyXpReward(player, bonusXp);
    applyGoldReward(player, bonusGold);
    applyKeyReward(player, bonusKeys);
    applyGloriaReward(player, bonusGlorias);

    if (reason === 'complete') {
        updateMissionProgress(player, 'dungeon_complete', 1);
    }

    d.summary.completionItem = completionItem
        ? {
            name: completionItem.name,
            rarity: completionItem.rarity,
            originMap: completionItem.originMap,
            traitLabel: completionItem.traitLabel,
            minRarity: getCompletionMinRarity(mapNumber, isEliteDungeon),
            rewardTag: buildCompletionRewardTag(mapNumber, isEliteDungeon)
        }
        : null;

    recordDungeonRewardMetricsAsync(metrics);

    return d;
}

module.exports = {
    addDungeonLog,
    addSummaryNote,
    ensureDungeonRewardShape,
    isEliteDungeonRun,
    buildDungeonDropPolicy,
    getRarityRank,
    isRarityAtLeast,
    generateDungeonDrop,
    generateDungeonCompletionDrop,
    resolveTreasureRoom,
    resolveHealRoom,
    resolveCurseRoom,
    resolveShrineRoom,
    resolveCombatRoom,
    finalizeDungeonRun
};
