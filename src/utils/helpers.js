const {
    getPlayer,
    recalculateStats
} = require('../core/player/playerService');

const {
    updateEnergy
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
    formatNumber
} = require('./formatters');

function getPlayerSafe(id) {
    const player = getPlayer(id);

    updateEnergy(player);
    recalculateStats(player);

    return player;
}

function getActiveEvents() {
    const now = new Date();
    const month = now.getMonth();

    const events = [];

    if (month === 9) {
        events.push('🎃 Halloween');
    }

    if (month === 11) {
        events.push('🎄 Natal');
    }

    return events.length
        ? events.join(' | ')
        : 'Nenhum';
}

function getPlayerLocation(player) {
    return (
        getMapById(
            player.currentMap
        ) || maps[0]
    );
}

function getMainMenuText(
    player,
    username
) {
    const xpNeeded =
        getXpToNextLevel(
            player.level
        );

    const vipStatus =
        player.vip
            ? '✨ *VIP*'
            : '👤 Comum';

    const location =
        getPlayerLocation(
            player
        );

    let text =
        `🌙 *NOCTRA RPG*\n`;

    text +=
        `━━━━━━━━━━━━━━\n`;

    text +=
        `🤴 *${player.name || username}* | ${vipStatus}\n`;

    text +=
        `🏹 Classe: ${player.class.charAt(0).toUpperCase() + player.class.slice(1)}\n`;

    text +=
        `🆙 Nível: ${player.level}\n\n`;

    text +=
        `❤️ HP: ${player.hp}/${player.maxHp}\n`;

    text +=
        `[${progressBar(player.hp, player.maxHp, 8)}]\n\n`;

    text +=
        `✨ XP: ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}\n`;

    text +=
        `[${progressBar(player.xp, xpNeeded, 8)}]\n\n`;

    text +=
        `⚡ Energia: ${player.energy}/${player.maxEnergy}\n`;

    text +=
        `💰 Ouro: ${formatNumber(player.gold || 0)} | 💎 Nox: ${formatNumber(player.nox || 0)}\n`;

    text +=
        `━━━━━━━━━━━━━━\n`;

    text +=
        `🌍 Local: *${location.emoji} ${location.name}*`;

    return text;
}

module.exports = {
    getPlayerSafe,
    getActiveEvents,
    getMainMenuText
};