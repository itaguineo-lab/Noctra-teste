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
const { ensureCosmeticsState, getActiveCosmetic } = require('../core/player/cosmetics');

/*
=================================
PLAYER SAFE
=================================
*/

async function getPlayerSafe(id, name = 'Viajante') {
    const player = await getPlayer(id);
    if (!player) return null;
    updateEnergy(player);
    recalculateStats(player);
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

/**
 * BUILD 2.0 – Baseada em equipamentos (fallback para atributos)
 */
function getBuildName(player) {
    const weapon = player.equipment?.weapon;
    const shield = player.equipment?.shield;
    const weaponName = weapon?.name?.toLowerCase() || '';
    const hasShield = !!shield;

    // ========== GUERREIRO ==========
    if (player.class === 'guerreiro') {
        // Machado sem escudo = Berserker
        if (weaponName.includes('machado') && !hasShield) {
            return '⚔️ Berserker';
        }
        // Espada com escudo = Guardião
        if (weaponName.includes('espada') && hasShield) {
            return '🛡️ Guardião';
        }
        // Fallback para atributos
        if ((player.def || 0) >= 35) return '🛡️ Guardião';
        return '⚔️ Berserker';
    }

    // ========== ARQUEIRO ==========
    if (player.class === 'arqueiro') {
        // Arco = Caçador
        if (weaponName.includes('arco')) {
            return '🏹 Caçador';
        }
        // Lança com escudo = Lanceiro
        if (weaponName.includes('lança') && hasShield) {
            return '🛡️ Lanceiro';
        }
        // Fallback para atributos
        if ((player.crit || 0) >= 20) return '🎯 Sniper';
        return '🏹 Caçador';
    }

    // ========== MAGO ==========
    if (player.class === 'mago') {
        // Cajado = Ofensivo
        if (weaponName.includes('cajado')) {
            return '🔥 Ofensivo';
        }
        // Varinha ou Orbe = Curandeiro
        if (weaponName.includes('varinha') || weaponName.includes('orbe')) {
            return '💚 Curandeiro';
        }
        // Fallback para atributos
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
RESUMO DE BUFFS ATIVOS
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
MENU TEXT (COM BUFFS)
=================================
*/

async function getMainMenuText(playerId, username) {
    const player = await getPlayerSafe(playerId, username);
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
    const energyTimeStr = nextEnergyTime > 0 ? ` ${formatTime(nextEnergyTime)}` : '';

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
        `🏹 ${player.class}  ${buildName}  Lv.${player.level}`,
        statsLine,
        '',
        `❤️ ${formatNumber(player.hp)}/${formatNumber(player.maxHp)} ${hpBar}`,
        `⚡ ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)}${energyTimeStr} ${energyBar}`,
        `✨ ${formatNumber(player.xp)}/${formatNumber(xpNeeded)} ${xpBar}`,
        '',
        `💰 ${formatNumber(player.gold)}  💎 ${formatNumber(player.nox)}`,
        `🗺️ ${location.emoji} ${location.name}  🏟️ ${formatNumber(arenaPoints)} ${arenaLeague}`
    ];

    const compactLines = lines.filter(Boolean);

    const buffsSummary = getBuffsSummary(player);
    if (buffsSummary) {
        compactLines.push(`✨ Buffs: ${buffsSummary}`);
    }

    compactLines.push(`💀 Souls: ${getSoulSummary(player)}`);
    compactLines.push(`☠️ ${formatNumber(player.totalKills || 0)} abates`);

    return premiumFrame('🌑 NOCTRA RPG', compactLines.join('\n'));
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
