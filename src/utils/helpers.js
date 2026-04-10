const {
    getPlayer,
    recalculateStats
} = require('../core/player/playerService');

const {
    updateEnergy,
    getTimeToNextEnergy
} = require('../services/energyService');

const {
    getXpToNextLevel
} = require('../core/player/progression');

const {
    getMapById,
    maps
} = require('../core/world/maps');

const {
    progressBar,
    formatNumber,
    formatTime,
    formatSoulName
} = require('./formatters');

/*
=================================
PLAYER SAFE
=================================
*/

async function getPlayerSafe(id, name = 'Viajante') {
    const player = await getPlayer(id, name);
    updateEnergy(player);
    recalculateStats(player);
    return player;
}

/*
=================================
WORLD / BUILD
=================================
*/

function getPlayerLocation(player) {
    return getMapById(player.currentMap) || maps[0];
}

function getBuildName(player) {
    if (player.class === 'mago') {
        if ((player.maxHp || 0) >= 140) return '💚 Curandeiro';
        if ((player.atk || 0) >= 35) return '🔥 Ofensivo';
        return '✨ Balanceado';
    }
    if (player.class === 'guerreiro') {
        if ((player.def || 0) >= 35) return '🛡️ Guardião';
        return '⚔️ Berserker';
    }
    if (player.class === 'arqueiro') {
        if ((player.crit || 0) >= 20) return '🎯 Sniper';
        return '🏹 Caçador';
    }
    return '⚪ Padrão';
}

function getLeagueName(leagueId) {
    const map = {
        bronze: 'Bronze',
        silver: 'Prata',
        gold: 'Ouro',
        diamond: 'Diamante',
        master: 'Mestre',
        legend: 'Lendário'
    };
    return map[leagueId] || 'Bronze';
}

function getSoulSummary(player) {
    const souls = Array.isArray(player.soulsEquipped) ? player.soulsEquipped : [null, null];
    return souls
        .map(soul => soul ? formatSoulName(soul) : '⬜ Vazio')
        .join('  |  ');
}

function premiumFrame(title, body) {
    return [
        '━━━━━━━━━━━━━━━━━━━━━━',
        title,
        '━━━━━━━━━━━━━━━━━━━━━━',
        body
    ].join('\n');
}

/*
=================================
MENU TEXT (VERSÃO FINAL COM SOULS)
=================================
*/

async function getMainMenuText(playerId, username) {
    const player = await getPlayerSafe(playerId, username);

    const xpNeeded = getXpToNextLevel(player.level || 1);
    const location = getPlayerLocation(player);
    const nextEnergyTime = getTimeToNextEnergy(player);
    const energyTimeStr = nextEnergyTime > 0 ? ` ${formatTime(nextEnergyTime)}` : '';

    // Barras coloridas de 6 caracteres
    const hpBar = progressBar(player.hp, player.maxHp, 6, '🟩', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 6, '🟦', '⬛');
    const xpBar = progressBar(player.xp, xpNeeded, 6, '🟨', '⬛');

    const arenaPoints = player.arena?.points || 0;
    const arenaLeague = getLeagueName(player.arena?.leagueId || 'bronze');

    const vipIcon = player.vip ? '✨' : '👤';
    const buildName = getBuildName(player);

    // Linha de stats compacta
    const statsLine = `⚔️${formatNumber(player.atk)}  🛡️${formatNumber(player.def)}  💥${formatNumber(player.crit)}%`;

    const lines = [
        `🌙 ${player.name || username}  ${vipIcon}`,
        `🏹 ${player.class}  ${buildName}  Lv.${player.level}`,
        statsLine,
        '',
        `❤️ ${formatNumber(player.hp)}/${formatNumber(player.maxHp)} ${hpBar}`,
        `⚡ ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)}${energyTimeStr} ${energyBar}`,
        `✨ ${formatNumber(player.xp)}/${formatNumber(xpNeeded)} ${xpBar}`,
        '',
        `💰 ${formatNumber(player.gold)}  💎 ${formatNumber(player.nox)}`,
        `🗺️ ${location.emoji} ${location.name}  🏟️ ${formatNumber(arenaPoints)} ${arenaLeague}`,
        `💀 Souls: ${getSoulSummary(player)}`,
        `☠️ ${formatNumber(player.totalKills || 0)} abates`
    ];

    return premiumFrame('🌑 NOCTRA RPG', lines.join('\n'));
}

module.exports = {
    getPlayerSafe,
    getPlayerLocation,
    getBuildName,
    getLeagueName,
    getSoulSummary,
    premiumFrame,
    getMainMenuText
};