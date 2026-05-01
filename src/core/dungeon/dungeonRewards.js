const { calculateDamage } = require('../combat/damageCalc');
const { processVictory } = require('../../services/rewardService');
const { generatePolicyCompliantDrop } = require('../loot/dropPolicy');
const { BALANCE } = require('../../data/balance');
const { ENEMY_ABILITIES } = require('../world/enemies');

const {
    activateSoul,
    getSoulCooldownTurns,
    isPassiveSoul
} = require('../player/souls');

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

const DUNGEON_STATUS = {
    poison: {
        key: 'poisonTurns',
        emoji: '🧪',
        label: 'Veneno',
        damagePercent: 0.04
    },
    bleed: {
        key: 'bleedTurns',
        emoji: '🩸',
        label: 'Sangramento',
        damagePercent: 0.035
    }
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

function ensureDungeonCombatState(player, room = null) {
    const d = player.dungeonProgress;

    d.combatBonus ??= { atk: 0, def: 0, crit: 0 };
    d.playerStatus ??= {
        poisonTurns: 0,
        bleedTurns: 0,
        stunned: false
    };

    d.playerStatus.poisonTurns = Math.max(0, Number(d.playerStatus.poisonTurns || 0));
    d.playerStatus.bleedTurns = Math.max(0, Number(d.playerStatus.bleedTurns || 0));
    d.playerStatus.stunned = Boolean(d.playerStatus.stunned);

    if (!Array.isArray(d.soulCooldowns)) {
        d.soulCooldowns = [0, 0];
    }

    while (d.soulCooldowns.length < 2) {
        d.soulCooldowns.push(0);
    }

    d.soulCooldowns = d.soulCooldowns
        .slice(0, 2)
        .map(value => Math.max(0, Number(value || 0)));

    if (room?.enemy) {
        room.enemy.frozen = Boolean(room.enemy.frozen);
        room.enemy.shield = Math.max(0, Number(room.enemy.shield || 0));
        room.enemy.poisonTurns = Math.max(0, Number(room.enemy.poisonTurns || 0));
        room.enemy.bleedTurns = Math.max(0, Number(room.enemy.bleedTurns || 0));
        room.enemy.maxHp = Math.max(1, Number(room.enemy.maxHp || room.enemy.hp || 1));
    }

    return d;
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

function getDungeonSoulSlots(player = {}) {
    const equipped = Array.isArray(player.soulsEquipped) ? player.soulsEquipped.slice(0, 2) : [];
    while (equipped.length < 2) equipped.push(null);
    return equipped;
}

function tickDungeonSoulCooldowns(player) {
    const d = ensureDungeonCombatState(player);
    d.soulCooldowns = d.soulCooldowns.map(value => Math.max(0, Number(value || 0) - 1));
    return d.soulCooldowns;
}

function getDungeonSoulCooldownRemaining(player, soulIndex) {
    const d = ensureDungeonCombatState(player);
    const index = Number(soulIndex);

    if (!Number.isInteger(index) || index < 0 || index >= 2) return 0;
    return Math.max(0, Number(d.soulCooldowns[index] || 0));
}

function setDungeonSoulCooldown(player, soulIndex, soul) {
    const d = ensureDungeonCombatState(player);
    const index = Number(soulIndex);

    if (!Number.isInteger(index) || index < 0 || index >= 2) return d.soulCooldowns;

    d.soulCooldowns[index] = getSoulCooldownTurns(soul);
    return d.soulCooldowns;
}

function applyShieldDamageToEnemy(player, enemy, rawDamage) {
    let damage = Math.max(0, Math.floor(Number(rawDamage || 0)));

    if ((enemy.shield || 0) > 0 && damage > 0) {
        const absorbed = Math.min(enemy.shield, damage);
        enemy.shield -= absorbed;
        damage -= absorbed;
        addDungeonLog(player, `🛡️ Escudo de ${enemy.name} absorveu ${absorbed} de dano`);
    }

    enemy.hp = Math.max(0, enemy.hp - damage);
    return damage;
}

function tickDungeonPlayerStatus(player) {
    const d = ensureDungeonCombatState(player);
    let playerDefeated = false;

    Object.values(DUNGEON_STATUS).forEach(status => {
        if ((d.playerStatus[status.key] || 0) <= 0) return;

        const damage = Math.max(1, Math.floor((player.maxHp || 1) * status.damagePercent));
        applyDamage(player, damage);
        d.playerStatus[status.key] -= 1;
        addDungeonLog(player, `${status.emoji} ${status.label} causou ${damage} de dano em você`);

        if (player.hp <= 1) playerDefeated = true;
    });

    return playerDefeated;
}

function tickDungeonEnemyStatus(player, enemy) {
    let enemyDefeated = false;

    Object.values(DUNGEON_STATUS).forEach(status => {
        if ((enemy[status.key] || 0) <= 0) return;

        const damage = Math.max(1, Math.floor((enemy.maxHp || enemy.hp || 1) * status.damagePercent));
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy[status.key] -= 1;
        addDungeonLog(player, `${status.emoji} ${status.label} causou ${damage} de dano em ${enemy.name}`);

        if (enemy.hp <= 0) enemyDefeated = true;
    });

    return enemyDefeated;
}

function applyDungeonEnemyAbility(player, room) {
    const d = ensureDungeonCombatState(player, room);
    const enemy = room?.enemy;
    const ability = enemy?.ability;

    if (!enemy || !ability) return { activated: false, skippedAttack: false };

    const abilityType = ability.type;
    const abilityDef = ENEMY_ABILITIES[abilityType];
    const chance = Number.isFinite(Number(ability.chance)) ? Number(ability.chance) : 0.3;

    if (!abilityDef || Math.random() >= chance) {
        return { activated: false, skippedAttack: false };
    }

    if (abilityType === 'POISON') {
        d.playerStatus.poisonTurns += 2;
        addDungeonLog(player, `🧪 ${enemy.name} envenenou você`);
        return { activated: true, skippedAttack: false };
    }

    if (abilityType === 'BLEED') {
        d.playerStatus.bleedTurns += 2;
        addDungeonLog(player, `🩸 ${enemy.name} abriu sangramento em você`);
        return { activated: true, skippedAttack: false };
    }

    if (abilityType === 'STUN') {
        d.playerStatus.stunned = true;
        addDungeonLog(player, `💫 ${enemy.name} atordoou você`);
        return { activated: true, skippedAttack: false };
    }

    if (abilityType === 'SHIELD') {
        const shield = Math.max(1, Math.floor(enemy.maxHp * 0.15));
        enemy.shield = Math.max(0, Number(enemy.shield || 0)) + shield;
        addDungeonLog(player, `🛡️ ${enemy.name} ergueu um escudo de ${shield}`);
        return { activated: true, skippedAttack: true };
    }

    if (abilityType === 'HEAL') {
        const heal = Math.max(1, Math.floor(enemy.maxHp * 0.2));
        const beforeHp = enemy.hp;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        addDungeonLog(player, `💚 ${enemy.name} regenerou ${enemy.hp - beforeHp} HP`);
        return { activated: true, skippedAttack: true };
    }

    abilityDef.apply(enemy, {
        player,
        enemy,
        logs: d.logs || []
    });

    return { activated: true, skippedAttack: false };
}

function processDungeonEnemyTurn(player, room) {
    const d = ensureDungeonCombatState(player, room);
    const enemy = room.enemy;

    if (enemy.hp <= 0) return { playerDefeated: false, enemySkipped: false };

    const enemyDiedByStatus = tickDungeonEnemyStatus(player, enemy);
    if (enemyDiedByStatus) {
        return { playerDefeated: false, enemyDefeated: true, enemySkipped: false };
    }

    if (enemy.frozen) {
        enemy.frozen = false;
        addDungeonLog(player, `❄️ ${enemy.name} está congelado e perdeu o turno`);
        return { playerDefeated: false, enemySkipped: true };
    }

    const abilityResult = applyDungeonEnemyAbility(player, room);
    if (abilityResult.skippedAttack) {
        return { playerDefeated: false, enemySkipped: true };
    }

    const enemyHit = calculateDamage(
        { atk: enemy.atk, crit: enemy.crit },
        { def: Math.max(0, (player.def || 0) + (d.combatBonus.def || 0)) }
    );

    applyDamage(player, enemyHit.damage);

    let enemyLog = `👹 ${enemy.name} causou ${enemyHit.damage} de dano`;
    if (enemyHit.isCrit) enemyLog += ' (💀 CRÍTICO!)';
    addDungeonLog(player, enemyLog);

    return {
        playerDefeated: player.hp <= 1,
        enemyDefeated: false,
        enemySkipped: false,
        damage: enemyHit.damage
    };
}

async function resolveDungeonVictory(player, room, roomScalar = 1, isEliteDungeon = false) {
    const d = player.dungeonProgress;
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

    const notes = [
        `✨ +${safeNumber(rewards.xp) + dungeonBonusXp} XP`,
        `💰 +${safeNumber(rewards.gold) + dungeonBonusGold} ouro`
    ];

    if (rewards.droppedItem) {
        notes.push(`🎁 ${rewards.loot.find(line => line.includes(rewards.droppedItem.name)) || rewards.droppedItem.name}`);
    }

    if (rewards.soulDropped && rewards.soulLootLine) {
        notes.push(`🌑 ${rewards.soulLootLine}`);
    }

    if (rewards.keyDropped) {
        notes.push('🗝️ Chave de Masmorra');
    }

    if (dungeonBonusXp > 0 || dungeonBonusGold > 0) {
        notes.push('🏰 Bônus da masmorra aplicado');
    }

    room.cleared = true;
    room.clearedAt = Date.now();

    notes.forEach(n => addSummaryNote(player, n));
    addDungeonLog(player, `🏆 ${room.enemy.name} foi derrotado!`);

    return {
        success: true,
        defeated: true,
        message: `🏆 ${room.enemy.name} derrotado!`,
        notes,
        rewards
    };
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
    const d = ensureDungeonCombatState(player, room);
    ensureDungeonRewardShape(player);

    const roomScalar = getRoomRewardScalar(room.type);
    const isEliteDungeon = isEliteDungeonRun(player);

    const result = {
        success: true,
        defeated: false,
        message: '',
        notes: []
    };

    tickDungeonSoulCooldowns(player);

    const playerDiedByStatus = tickDungeonPlayerStatus(player);
    if (playerDiedByStatus) {
        d.active = false;
        d.aborted = true;
        d.summary = d.summary || {};
        d.summary.notes = d.summary.notes || [];
        d.summary.notes.push('💀 Derrotado por efeitos sombrios na masmorra.');
        result.finished = true;
        result.playerDefeated = true;
        addDungeonLog(player, '💀 Você caiu pelos efeitos sombrios...');
        return result;
    }

    if (d.playerStatus.stunned) {
        d.playerStatus.stunned = false;
        addDungeonLog(player, '💫 Você está atordoado e perdeu o turno');

        const enemyTurn = processDungeonEnemyTurn(player, room);
        if (enemyTurn.enemyDefeated) {
            return resolveDungeonVictory(player, room, roomScalar, isEliteDungeon);
        }

        if (enemyTurn.playerDefeated) {
            d.active = false;
            d.aborted = true;
            result.finished = true;
            result.playerDefeated = true;
            addDungeonLog(player, '💀 Você foi derrotado...');
        }

        result.message = '💫 Você perdeu o turno por atordoamento.';
        return result;
    }

    const effectivePlayer = {
        atk: Math.max(1, (player.atk || 1) + (d.combatBonus.atk || 0)),
        crit: Math.max(0, Math.min(75, (player.crit || 0) + (d.combatBonus.crit || 0)))
    };

    const playerHit = calculateDamage(effectivePlayer, { def: room.enemy.def });
    const actualDamage = applyShieldDamageToEnemy(player, room.enemy, playerHit.damage);

    let playerLog = `⚔️ Você causou ${actualDamage} de dano`;
    if (playerHit.isCrit) playerLog += ' (💥 CRÍTICO!)';
    addDungeonLog(player, playerLog);

    if (room.enemy.hp <= 0) {
        return resolveDungeonVictory(player, room, roomScalar, isEliteDungeon);
    }

    const enemyTurn = processDungeonEnemyTurn(player, room);
    if (enemyTurn.enemyDefeated) {
        return resolveDungeonVictory(player, room, roomScalar, isEliteDungeon);
    }

    result.message = `⚔️ Você causou ${actualDamage} dano. ${room.enemy.emoji || '👹'} ${room.enemy.name} respondeu.`;

    if (enemyTurn.playerDefeated || player.hp <= 1) {
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

async function resolveDungeonSoul(player, room, soulIndex) {
    const d = ensureDungeonCombatState(player, room);
    ensureDungeonRewardShape(player);

    const index = Number(soulIndex);
    const souls = getDungeonSoulSlots(player);
    const soul = souls[index];
    const roomScalar = getRoomRewardScalar(room?.type);
    const isEliteDungeon = isEliteDungeonRun(player);

    const result = {
        success: false,
        message: 'Alma inválida.',
        notes: []
    };

    if (!room || !room.enemy || room.cleared) {
        result.message = 'Não há inimigo ativo nesta sala.';
        return result;
    }

    if (!Number.isInteger(index) || index < 0 || index >= 2 || !soul) {
        addDungeonLog(player, '❌ Slot de alma vazio');
        result.message = 'Slot de alma vazio.';
        return result;
    }

    if (isPassiveSoul(soul)) {
        addDungeonLog(player, `${soul.emoji || '💀'} ${soul.name} é passiva e já fortalece sua build`);
        result.message = 'Essa alma é passiva.';
        result.passive = true;
        return result;
    }

    const cooldown = getDungeonSoulCooldownRemaining(player, index);
    if (cooldown > 0) {
        addDungeonLog(player, `⏳ ${soul.name} recarrega em ${cooldown} turnos`);
        result.message = `Alma em recarga por ${cooldown} turnos.`;
        result.cooldown = cooldown;
        return result;
    }

    tickDungeonSoulCooldowns(player);

    const playerDiedByStatus = tickDungeonPlayerStatus(player);
    if (playerDiedByStatus) {
        d.active = false;
        d.aborted = true;
        result.finished = true;
        result.playerDefeated = true;
        result.message = 'Você caiu pelos efeitos sombrios.';
        addDungeonLog(player, '💀 Você caiu pelos efeitos sombrios...');
        return result;
    }

    const state = {
        player: {
            atk: Math.max(1, (player.atk || 1) + (d.combatBonus.atk || 0)),
            hp: player.hp,
            maxHp: player.maxHp
        },
        enemy: room.enemy
    };

    const activation = activateSoul(soul, state);
    player.hp = Math.max(1, Math.min(player.maxHp, state.player.hp));
    room.enemy.hp = Math.max(0, Math.min(room.enemy.maxHp, state.enemy.hp));

    if (!activation?.success) {
        if (activation?.message) addDungeonLog(player, activation.message);
        return activation || result;
    }

    setDungeonSoulCooldown(player, index, soul);

    if (activation.message) addDungeonLog(player, activation.message);
    const soulCooldown = getSoulCooldownTurns(soul);
    if (soulCooldown > 0) {
        addDungeonLog(player, `⏳ ${soul.name} recarrega em ${soulCooldown} turnos`);
    }

    if (room.enemy.hp <= 0) {
        return resolveDungeonVictory(player, room, roomScalar, isEliteDungeon);
    }

    const enemyTurn = processDungeonEnemyTurn(player, room);
    if (enemyTurn.enemyDefeated) {
        return resolveDungeonVictory(player, room, roomScalar, isEliteDungeon);
    }

    if (enemyTurn.playerDefeated || player.hp <= 1) {
        d.active = false;
        d.aborted = true;
        result.finished = true;
        result.playerDefeated = true;
        addDungeonLog(player, '💀 Você foi derrotado...');
    }

    return {
        success: true,
        message: activation.message || `${soul.name} ativada.`
    };
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
    ensureDungeonCombatState,
    isEliteDungeonRun,
    buildDungeonDropPolicy,
    getRarityRank,
    isRarityAtLeast,
    generateDungeonDrop,
    generateDungeonCompletionDrop,
    getDungeonSoulSlots,
    tickDungeonSoulCooldowns,
    getDungeonSoulCooldownRemaining,
    setDungeonSoulCooldown,
    applyDungeonEnemyAbility,
    processDungeonEnemyTurn,
    resolveDungeonVictory,
    resolveTreasureRoom,
    resolveHealRoom,
    resolveCurseRoom,
    resolveShrineRoom,
    resolveCombatRoom,
    resolveDungeonSoul,
    finalizeDungeonRun
};
