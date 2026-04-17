const {
    getPlayer
} = require('../core/player/playerService');

const {
    updateEnergy,
    getTimeToNextEnergy,
    getTimeToFullEnergy
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
        if (weaponName.includes('machado') && !hasShield) return '⚔️ Berserker';
        if (weaponName.includes('espada') && hasShield) return '🛡️ Guardião';
        if ((player.def || 0) >= 35) return '🛡️ Guardião';
        return '⚔️ Berserker';
    }

    if (player.class === 'arqueiro') {
        if (weaponName.includes('arco')) return '🏹 Caçador';
        if (weaponName.includes('lança') && hasShield) return '🛡️ Lanceiro';
        if ((player.crit || 0) >= 20) return '🎯 Sniper';
        return '🏹 Caçador';
    }

    if (player.class === 'mago') {
        if (weaponName.includes('cajado')) return '🔥 Ofensivo';
        if (weaponName.includes('varinha') || weaponName.includes('orbe')) return '💚 Curandeiro';
        if ((player.atk || 0) >= 35) return '🔥 Ofensivo';
        if ((player.maxHp || 0) >= 140) return '💚 Curandeiro';
        return '✨ Balanceado';
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
BUFFS
=================================
*/

function getBuffsSummary(player) {
    if (!Array.isArray(player.buffs) || player.buffs.length === 0) {
        return null;
    }

    const activeBuffs = player.buffs.filter(buff => {
        if (!buff.expiresAt) return true;
        return buff.expiresAt > Date.now();
    });

    if (activeBuffs.length === 0) return null;

    const parts = [];

    activeBuffs.forEach(buff => {
        if (buff.atk) parts.push(`💪+${buff.atk}`);
        if (buff.def) parts.push(`🛡️+${buff.def}`);
        if (buff.hp) parts.push(`❤️+${buff.hp}`);
        if (buff.crit) parts.push(`💥+${buff.crit}%`);

        if (buff.expiresAt) {
            const remainingMs = Math.max(0, buff.expiresAt - Date.now());
            if (remainingMs > 0) {
                parts.push(`⏳${formatTime(remainingMs)}`);
            }
        }
    });

    return parts.join('  ');
}

/*
=================================
MENU TEXT
=================================
*/

async function getMainMenuText(playerId, username) {
    const player = await getPlayerSafe(playerId);
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
    const fullEnergyTime = getTimeToFullEnergy(player);

    const hpBar = progressBar(player.hp, player.maxHp, 6, '🟩', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 6, '🟦', '⬛');
    const xpBar = progressBar(player.xp, xpNeeded, 6, '🟨', '⬛');

    const arenaPoints = player.arena?.points || 0;
    const arenaLeague = getLeagueName(player.arena?.leagueId || 'bronze');

    const vipIcon = player.vip ? '✨' : '👤';
    const buildName = getBuildName(player);
    const activeTitle = getActiveCosmetic(player, 'title');
    const activeAura = getActiveCosmetic(player, 'aura');

    const statsLine = `⚔️${formatNumber(player.atk)}  🛡️${formatNumber(player.def)}  💥${formatNumber(player.crit)}%`;

    const lines = [
        `🌙 ${player.name || username}  ${vipIcon}${activeAura ? ' ✨' : ''}`,
        activeTitle ? `🏷️ ${activeTitle.name}` : null,
        `🏹 ${getClassLabel(player.class)}  ${buildName}  Lv.${player.level}`,
        statsLine,
        '',
        `❤️ ${formatNumber(player.hp)}/${formatNumber(player.maxHp)} ${hpBar}`,
        `⚡ ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)} ${energyBar}`,
        nextEnergyTime > 0
            ? `⏳ Próxima energia em ${formatTime(nextEnergyTime)}`
            : `⚡ Energia cheia`,
        fullEnergyTime > 0 && player.energy < player.maxEnergy
            ? `🔋 Energia cheia em ${formatTime(fullEnergyTime)}`
            : null,
        `✨ ${formatNumber(player.xp)}/${formatNumber(xpNeeded)} ${xpBar}`,
        '',
        `💰 ${formatNumber(player.gold)}  💎 ${formatNumber(player.nox)}  🗝️ ${formatNumber(player.keys || 0)}`,
        `🗺️ ${location.emoji} ${location.name}  🏟️ ${formatNumber(arenaPoints)} ${arenaLeague}`
    ];

    const compactLines = lines.filter(Boolean);

    const buffsSummary = getBuffsSummary(player);
    if (buffsSummary) {
        compactLines.push(`✨ Buffs: ${buffsSummary}`);
    }

    compactLines.push(`💀 Souls: ${getSoulSummary(player)}`);
    compactLines.push(`☠️ ${formatNumber(player.totalKills || 0)} abates`);

    if (player.activeFight?.payload) {
        compactLines.push(`⚔️ Luta ativa: em andamento`);
    }

    return premiumFrame('🌑 NOCTRA RPG', compactLines.join('\n'));
}

module.exports = {
    getPlayerSafe,
    getPlayerLocation,
    getClassLabel,
    getBuildName,
    getLeagueName,
    getSoulSummary,
    premiumFrame,
    getMainMenuText
};