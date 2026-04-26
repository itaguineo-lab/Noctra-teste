const { calculateDamage } = require('../combat/damageCalc');
const { processVictory } = require('../../services/rewardService');
const { generateDrop } = require('../../data/items');

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
    safeNumber,
    getMapNumber
} = require('./dungeonRooms');

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

function getRoomRewardScalar(roomType) {
    if (roomType === 'boss') return 1.28;
    if (roomType === 'elite') return 1.16;

    return 1.0;
}

/*
=================================
TREASURE ROOM
=================================
*/

function resolveTreasureRoom(player, room) {
    const d = player.dungeonProgress;
    const mapNumber = getMapNumber(d.mapId);

    const gold = Math.floor(60 + player.level * 14 + room.index * 12);
    applyGoldReward(player, gold);
    d.rewards.gold += gold;

    const notes = [`🎁 +${gold} ouro`];

    /*
    Chave na dungeon deve existir, mas não banalizar o sistema.
    */
    if (Math.random() < 0.16) {
        applyKeyReward(player, 1);
        d.rewards.keys += 1;
        notes.push('🗝️ +1 chave');
    }

    /*
    Tesouro pode dar item, mas agora respeita bias por classe.
    Isso aumenta chance de arqueiro ver aljava, mago ver orbe
    e guerreiro ver escudo/armadura própria.
    */
    if (Math.random() < 0.24) {
        const drop = generateDrop(mapNumber, {
            encounterTier: 'miniboss',
            rarityBias: mapNumber >= 4 ? 'late_elite' : 'mid_elite',
            playerClass: player.class
        });

        const addResult = addInventoryItem(player, drop);

        if (addResult.success) {
            d.rewards.items += 1;
            notes.push(`✨ ${drop.name} [${drop.rarity}]`);
        }
    }

    room.cleared = true;
    room.clearedAt = Date.now();

    notes.forEach(n => addSummaryNote(player, n));
    addDungeonLog(player, `🎁 Tesouro: +${gold} ouro`);

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
    const damage = Math.floor(player.maxHp * 0.18);
    const hpLoss = Math.min(damage, Math.max(0, player.hp - 1));
    const gold = Math.floor(95 + player.level * 16 + room.index * 12);

    applyDamage(player, hpLoss);
    applyGoldReward(player, gold);
    d.rewards.gold += gold;

    const notes = [`💀 -${hpLoss} HP`, `💰 +${gold} ouro`];

    if (Math.random() < 0.14) {
        applyKeyReward(player, 1);
        d.rewards.keys += 1;
        notes.push('🗝️ +1 chave');
    }

    room.cleared = true;
    room.clearedAt = Date.now();

    notes.forEach(n => addSummaryNote(player, n));
    addDungeonLog(player, `💀 Maldição: -${hpLoss} HP, +${gold} ouro`);

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
    const roomScalar = getRoomRewardScalar(room.type);

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
            isDungeonBoss: room.type === 'boss'
        });

        /*
        Dungeon precisa ser melhor que hunt:
        bônus adicional por vitória dentro da run.
        */
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
        if (rewards.loot?.length) d.rewards.items += rewards.loot.length;
        if (rewards.soulDropped) d.rewards.items += 0;

        result.defeated = true;
        result.message = `🏆 ${room.enemy.name} derrotado!`;
        result.notes = [
            `✨ +${safeNumber(rewards.xp) + dungeonBonusXp} XP`,
            `💰 +${safeNumber(rewards.gold) + dungeonBonusGold} ouro`
        ];

        if (rewards.loot?.length) {
            result.notes.push(...rewards.loot.map(l => `🎁 ${l}`));
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

    if (d.summary && (d.completed || d.aborted) && !d.active) {
        return d;
    }

    d.active = false;
    d.completed = reason === 'complete';
    d.aborted = reason === 'aborted';

    const cleared = d.rooms.filter(r => r.cleared).length;

    /*
    Conclusão precisa parecer premium.
    */
    const bonusXp = Math.floor(40 + cleared * 14 + player.level * 3.5);
    const bonusGold = Math.floor(90 + cleared * 24 + player.level * 7);
    const bonusKeys = reason === 'complete' ? 1 : 0;
    const bonusGlorias = reason === 'complete' ? 2 : 0;

    d.summary = {
        roomsCleared: cleared,
        xp: safeNumber(d.rewards.xp) + bonusXp,
        gold: safeNumber(d.rewards.gold) + bonusGold,
        keys: safeNumber(d.rewards.keys) + bonusKeys,
        glorias: safeNumber(d.rewards.glorias) + bonusGlorias,
        items: safeNumber(d.rewards.items),
        notes: d.summary?.notes || []
    };

    let completionItem = null;

    if (reason === 'complete') {
        const mapNumber = getMapNumber(d.mapId);

        const premiumDrop = generateDrop(mapNumber, {
            encounterTier: 'boss',
            rarityBias: mapNumber >= 4 ? 'late_boss' : 'mid_boss',
            playerClass: player.class
        });

        const addResult = addInventoryItem(player, premiumDrop);

        if (addResult.success) {
            completionItem = premiumDrop;
            d.summary.items += 1;
            d.summary.notes.push(`🎁 Recompensa final: ${premiumDrop.name} [${premiumDrop.rarity}]`);
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
            rarity: completionItem.rarity
        }
        : null;

    return d;
}

module.exports = {
    addDungeonLog,
    addSummaryNote,
    resolveTreasureRoom,
    resolveHealRoom,
    resolveCurseRoom,
    resolveShrineRoom,
    resolveCombatRoom,
    finalizeDungeonRun
};