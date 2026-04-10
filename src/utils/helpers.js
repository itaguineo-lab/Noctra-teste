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
    return (
        getMapById(player.currentMap) ||
        maps[0]
    );
}

function getBuildName(player) {
    if (player.class === 'mago') {
        if ((player.maxHp || 0) >= 140) {
            return '💚 Curandeiro Arcano';
        }

        if ((player.atk || 0) >= 35) {
            return '🔥 Mago Ofensivo';
        }

        return '✨ Mago Balanceado';
    }

    if (player.class === 'guerreiro') {
        if ((player.def || 0) >= 35) {
            return '🛡️ Guardião';
        }

        return '⚔️ Berserker';
    }

    if (player.class === 'arqueiro') {
        if ((player.crit || 0) >= 20) {
            return '🎯 Sniper';
        }

        return '🏹 Caçador';
    }

    return '⚪ Build padrão';
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
    const souls = Array.isArray(player.soulsEquipped)
        ? player.soulsEquipped
        : [null, null];

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
MENU TEXT (BARRAS COLORIDAS E COMPACTAS)
=================================
*/

async function getMainMenuText(playerId, username) {
    const player = await getPlayerSafe(playerId, username);

    const xpNeeded = getXpToNextLevel(player.level || 1);
    const location = getPlayerLocation(player);
    const nextEnergyTime = getTimeToNextEnergy(player);
    const energyTimeStr = nextEnergyTime > 0
        ? ` • ${formatTime(nextEnergyTime)}`
        : ' • cheia';

    // Barras coloridas de 6 caracteres
    const hpBar = progressBar(player.hp, player.maxHp, 6, '🟩', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 6, '🟦', '⬛');
    const xpBar = progressBar(player.xp, xpNeeded, 6, '🟨', '⬛');

    const arenaPoints = player.arena?.points || 0;
    const arenaLeague = getLeagueName(player.arena?.leagueId || 'bronze');

    const vipStatus = player.vip ? '✨ VIP' : '👤 Comum';
    const buildName = getBuildName(player);

    const lines = [
        `🌙 ${player.name || username}  •  ${vipStatus}`,
        `🏹 ${player.class || 'Viajante'}  •  ${buildName}  •  Nível ${player.level || 1}`,
        `⚔️ ATK ${formatNumber(player.atk)}  •  🛡️ DEF ${formatNumber(player.def)}  •  💥 CRIT ${formatNumber(player.crit)}%`,
        '',
        `❤️ HP ${formatNumber(player.hp)}/${formatNumber(player.maxHp)}  ${hpBar}`,
        `⚡ Energia ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)}${energyTimeStr}  ${energyBar}`,
        `✨ XP ${formatNumber(player.xp)}/${formatNumber(xpNeeded)}  ${xpBar}`,
        '',
        `💰 Ouro: ${formatNumber(player.gold)}   💎 NOX: ${formatNumber(player.nox)}`,
        `🗺️ Local: ${location.emoji} ${location.name}   🏟️ Arena: ${formatNumber(arenaPoints)} pts • ${arenaLeague}`,
        `💀 Souls: ${getSoulSummary(player)}`,
        `☠️ Abates: ${formatNumber(player.totalKills || 0)}`
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