const {
    getPlayer
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

const {
    ensureCosmeticsState,
    getActiveCosmetic
} = require('../core/player/cosmetics');

/*
=================================
PLAYER SAFE
=================================
*/

async function getPlayerSafe(id) {
    const player = await getPlayer(id);
    if (!player) return null;

    updateEnergy(player);
    ensureCosmeticsState(player);

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

function getClassLabel(className = 'guerreiro') {
    const map = {
        guerreiro: 'Guerreiro',
        arqueiro: 'Arqueiro',
        mago: 'Mago'
    };
    return map[className] || className;
}

function getBuildName(player) {
    const weapon = player.equipment?.weapon;
    const shield = player.equipment?.shield;
    const weaponName = weapon?.name?.toLowerCase() || '';
    const hasShield = !!shield;

    if (player.class === 'guerreiro') {
        if (weaponName.includes('machado') && !hasShield) return 'Berserker';
        if (weaponName.includes('espada') && hasShield) return 'Guardião';
        if ((player.def || 0) >= 35) return 'Guardião';
        return 'Guerreiro';
    }

    if (player.class === 'arqueiro') {
        if (weaponName.includes('arco')) return 'Caçador';
        if (weaponName.includes('lança') && hasShield) return 'Lanceiro';
        if ((player.crit || 0) >= 20) return 'Sniper';
        return 'Arqueiro';
    }

    if (player.class === 'mago') {
        if (weaponName.includes('cajado')) return 'Ofensivo';
        if (weaponName.includes('varinha') || weaponName.includes('orbe')) return 'Curandeiro';
        if ((player.atk || 0) >= 35) return 'Ofensivo';
        if ((player.maxHp || 0) >= 140) return 'Curandeiro';
        return 'Mago';
    }

    return 'Padrão';
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
MENU TEXT
=================================
*/

function buildMainMenuText(player, username) {
    if (!player) {
        return premiumFrame(
            '🌑 NOCTRA RPG',
            [
                `👋 Olá, ${username || 'Viajante'}!`,
                '',
                'Você ainda não possui personagem.',
                'Use /start para criar sua classe e iniciar sua jornada.'
            ].join('\n')
        );
    }

    const xpNeeded = getXpToNextLevel(player.level || 1);
    const location = getPlayerLocation(player);
    const nextEnergyTime = getTimeToNextEnergy(player);

    const hpBar = progressBar(player.hp, player.maxHp, 6, '🟩', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 6, '🟦', '⬛');
    const xpBar = progressBar(player.xp, xpNeeded, 6, '🟨', '⬛');

    const activeTitle = getActiveCosmetic(player, 'title');
    const activeAura = getActiveCosmetic(player, 'aura');

    const identityLine = `${player.name || username}${player.vip ? ' ✨' : ''}${activeAura ? ' ✨' : ''}`;
    const classLine = `${getClassLabel(player.class)} • ${getBuildName(player)} • Lv.${player.level}`;

    const lines = [
        identityLine,
        activeTitle ? `🏷️ ${activeTitle.name}` : null,
        classLine,
        '',
        `❤️ ${formatNumber(player.hp)}/${formatNumber(player.maxHp)} ${hpBar}`,
        `⚡ ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)} ${energyBar}`,
        `✨ ${formatNumber(player.xp)}/${formatNumber(xpNeeded)} ${xpBar}`,
        nextEnergyTime > 0 && player.energy < player.maxEnergy
            ? `⏳ Próx. energia: ${formatTime(nextEnergyTime)}`
            : null,
        '',
        `💰 ${formatNumber(player.gold)}   💎 ${formatNumber(player.nox)}   🗝️ ${formatNumber(player.keys || 0)}`,
        `🗺️ ${location.emoji} ${location.name}`
    ].filter(Boolean);

    return premiumFrame('🌑 NOCTRA RPG', lines.join('\n'));
}

async function getMainMenuText(playerId, username) {
    const player = await getPlayerSafe(playerId);
    return buildMainMenuText(player, username);
}

module.exports = {
    getPlayerSafe,
    getPlayerLocation,
    getClassLabel,
    getBuildName,
    premiumFrame,
    buildMainMenuText,
    getMainMenuText
};