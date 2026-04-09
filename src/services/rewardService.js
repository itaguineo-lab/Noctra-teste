const { addXp } = require('../core/player/progression');
const { dropSoul } = require('../core/player/souls');
const { generateDrop } = require('../data/items');

/*
=================================
MAPA
=================================
*/

function getMapNumber(mapName) {
    const maps = {
        clareira_sombria: 1,
        cripta_em_ruinas: 2,
        pantano_corrompido: 3,
        deserto_incandescente: 4
    };
    return maps[mapName] || 1;
}

/*
=================================
TAXAS DE DROP (ALINHADAS AO PROMPT)
=================================
*/

function getEquipmentChance(enemy) {
    if (enemy.isBoss) return 1.0;       // 100% (boss sempre dropa equip)
    if (enemy.isMiniBoss) return 0.6;    // 60%
    if (enemy.isElite) return 0.4;       // 40%
    return 0.25;                         // 25% comum
}

function getSoulChance(enemy) {
    // Taxas ajustadas para raridade real
    if (enemy.isBoss) return 0.03;       // 3% (Prompt: boss comum 3%)
    if (enemy.isMiniBoss) return 0.015;  // 1.5%
    if (enemy.isElite) return 0.008;     // 0.8%
    return 0.001;                        // 0.1% comum
}

function getKeyChance(enemy) {
    if (enemy.isBoss) return 0.25;
    if (enemy.isMiniBoss) return 0.15;
    return 0.10;
}

function getVictoryTitle(enemy) {
    if (enemy.isBoss) return '👑 BOSS DERROTADO';
    if (enemy.isMiniBoss) return '💀 MINI BOSS DERROTADO';
    if (enemy.isElite) return '🔥 ELITE DERROTADO';
    return '🏆 VITÓRIA';
}

/*
=================================
PROCESSAMENTO DE RECOMPENSAS
=================================
*/

function processVictory(player, enemy) {
    // Inicializa estruturas
    player.inventory ??= [];
    player.soulsInventory ??= [];
    player.totalKills ??= 0;
    player.soulPityCounter ??= 0;
    player.keys ??= 0;
    player.gold ??= 0;

    /*
    =================================
    XP E OURO BASE (COM BÔNUS VIP)
    =================================
    */

    let baseXp = enemy.xp || 0;
    let baseGold = enemy.gold || 0;

    // VIP: +50% XP e Ouro
    if (player.vip) {
        baseXp = Math.floor(baseXp * 1.5);
        baseGold = Math.floor(baseGold * 1.5);
    }

    /*
    =================================
    BÔNUS ALEATÓRIO DE OURO
    =================================
    */

    const bonusGold = Math.random() < 0.15 ? Math.floor(baseGold * 0.5) : 0;

    /*
    =================================
    BÔNUS DE STREAK (A CADA 10 KILLS)
    =================================
    */

    const streakBonus = (player.totalKills > 0 && player.totalKills % 10 === 0)
        ? Math.floor(baseGold * 0.3)
        : 0;

    const finalGold = baseGold + bonusGold + streakBonus;
    player.gold += finalGold;

    /*
    =================================
    XP E LEVEL UP
    =================================
    */

    const previousLevel = player.level;
    addXp(player, baseXp);
    const leveledUp = player.level > previousLevel;

    /*
    =================================
    LOOT
    =================================
    */

    const loot = [];
    let droppedItem = null;
    let droppedSoul = null;

    const mapNumber = getMapNumber(player.currentMap);

    /*
    =================================
    DROP DE EQUIPAMENTO
    =================================
    */

    const equipmentChance = getEquipmentChance(enemy);
    if (Math.random() < equipmentChance) {
        droppedItem = generateDrop(mapNumber);
        if (player.inventory.length < (player.maxInventory || 20)) {
            player.inventory.push(droppedItem);
            loot.push(`🎁 ${droppedItem.name} [Lv${droppedItem.level}]`);
        }
    }

    /*
    =================================
    DROP DE ALMA (COM PITY SYSTEM)
    =================================
    */

    const soulChance = getSoulChance(enemy);
    const pityThreshold = 10;            // 10 bosses sem alma → próximo garantido
    const pityGuaranteed = player.soulPityCounter >= pityThreshold;

    let soulDropped = false;

    if (Math.random() < soulChance || pityGuaranteed) {
        droppedSoul = dropSoul(player.level, enemy.id, player.soulPityCounter);
        if (droppedSoul) {
            player.soulsInventory.push(droppedSoul);
            loot.push(`💀 ${droppedSoul.name}`);
            soulDropped = true;
        }
    }

    // Atualiza contador de pity apenas para bosses
    if (enemy.isBoss) {
        if (soulDropped) {
            player.soulPityCounter = 0;
        } else {
            player.soulPityCounter++;
        }
    }

    /*
    =================================
    DROP DE CHAVE
    =================================
    */

    const keyDropped = Math.random() < getKeyChance(enemy);
    if (keyDropped) {
        player.keys++;
        loot.push('🗝️ Chave Sombria');
    }

    /*
    =================================
    TOTAL DE ABATES
    =================================
    */

    player.totalKills++;

    return {
        title: getVictoryTitle(enemy),
        xp: baseXp,
        gold: finalGold,
        bonusGold,
        streakBonus,
        loot,
        droppedItem,
        droppedSoul,
        keyDropped,
        leveledUp,
        totalKills: player.totalKills
    };
}

module.exports = {
    processVictory
};