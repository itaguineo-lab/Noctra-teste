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
    formatTime
} = require('./formatters');

async function getPlayerSafe(id, name = 'Viajante') {
    const player = await getPlayer(id, name);
    updateEnergy(player);
    recalculateStats(player);
    return player;
}

function getPlayerLocation(player) {
    return (
        getMapById(player.currentMap) ||
        maps[0]
    );
}

function getEquipmentSummary(player) {
    const eq = player.equipment || {};

    const weapon = eq.weapon
        ? eq.weapon.name
        : '—';

    const armor = eq.armor
        ? eq.armor.name
        : '—';

    return `⚔️ ${weapon} | 🛡️ ${armor}`;
}

function getBuildName(player) {
    if (player.class === 'mago') {
        if (player.maxHp >= 140) {
            return '💚 Curandeiro Arcano';
        }

        if (player.atk >= 35) {
            return '🔥 Mago Ofensivo';
        }

        return '✨ Mago Balanceado';
    }

    if (player.class === 'guerreiro') {
        if (player.def >= 35) {
            return '🛡️ Guardião';
        }

        return '⚔️ Berserker';
    }

    if (player.class === 'arqueiro') {
        if (player.crit >= 20) {
            return '🎯 Sniper';
        }

        return '🏹 Caçador';
    }

    return '⚪ Build padrão';
}

async function getMainMenuText(playerId, username) {
    const player = await getPlayerSafe(playerId, username);
    const xpNeeded = getXpToNextLevel(player.level);
    const vipStatus = player.vip ? '✨ *VIP*' : '👤 Comum';
    const location = getPlayerLocation(player);
    const nextEnergyTime = getTimeToNextEnergy(player);
    const energyTimeStr = nextEnergyTime > 0 ? ` (${formatTime(nextEnergyTime)})` : ' (cheia)';
    const hpBar = progressBar(player.hp, player.maxHp, 8, '🟥', '⬜');
    const xpBar = progressBar(player.xp, xpNeeded, 8, '🟨', '⬜');
    const buildName = getBuildName(player);

    let text = `╔══════════════════════════════════╗\n`;
    text += `║         🌙 *NOCTRA RPG*          ║\n`;
    text += `╠══════════════════════════════════╣\n`;
    text += `║ 🤴 ${player.name || username} | ${vipStatus}\n`;
    text += `║ 🏹 Classe: ${player.class}\n`;
    text += `║ 🧠 Build: ${buildName}\n`;
    text += `║ 🆙 Nível: ${player.level}\n`;
    text += `║ ⚔️ ${player.atk} | 🛡️ ${player.def} | 💥 ${player.crit}%\n`;
    text += `╠══════════════════════════════════╣\n`;
    text += `║ ❤️ ${player.hp}/${player.maxHp}\n`;
    text += `║ [${hpBar}]\n`;
    text += `║ ⚡ ${player.energy}/${player.maxEnergy}${energyTimeStr}\n`;
    text += `╠══════════════════════════════════╣\n`;
    text += `║ ✨ ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}\n`;
    text += `║ [${xpBar}]\n`;
    text += `╠══════════════════════════════════╣\n`;
    text += `║ 💰 ${formatNumber(player.gold)} | 💎 ${formatNumber(player.nox)}\n`;
    text += `║ 🗺️ ${location.emoji} ${location.name}\n`;
    text += `║ 🎒 ${getEquipmentSummary(player)}\n`;
    text += `║ 💀 ${player.totalKills || 0} abates\n`;
    text += `╚══════════════════════════════════╝`;

    return text;
}

module.exports = {
    getPlayerSafe,
    getMainMenuText
};