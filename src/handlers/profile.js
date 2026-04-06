const { getPlayer } = require('../core/player/playerService');
const { getXpToNextLevel } = require('../core/player/progression');
const { getMapById, maps } = require('../core/world/maps');
const { Markup } = require('telegraf');
const { progressBar, formatNumber } = require('../utils/formatters');
const { getRarityEmoji } = require('../core/player/souls');

function getPlayerMap(player) {
    return getMapById(player.currentMap) || maps[0];
}

function formatClassName(className = 'guerreiro') {
    return className.charAt(0).toUpperCase() + className.slice(1);
}

function detectBuild(player) {
    const cls = player.class;
    const eq = player.equipment || {};
    const souls = player.soulsEquipped || [];

    const totalAtk = player.atk || 0;
    const totalDef = player.def || 0;
    const totalHp = player.maxHp || 0;

    const hasHealingSoul = souls.some(soul => soul && soul.effect && soul.effect.type === 'heal');
    const hasPassiveSoul = souls.some(soul => soul && soul.effect && soul.effect.type === 'passive');

    if (cls === 'mago') {
        if (hasHealingSoul || totalHp >= 140) return '💚 Curandeiro Arcano';
        if (totalAtk >= 35) return '🔥 Mago Ofensivo';
        return '✨ Mago Balanceado';
    }
    if (cls === 'guerreiro') {
        if (totalDef >= 35 || totalHp >= 180) return '🛡️ Guardião';
        if (totalAtk >= 40) return '⚔️ Berserker';
        return '⚔️ Guerreiro Balanceado';
    }
    if (cls === 'arqueiro') {
        if ((player.crit || 0) >= 20) return '🎯 Sniper';
        if (totalAtk >= 38) return '🏹 Caçador Sombrio';
        return '🏹 Arqueiro Balanceado';
    }
    return '⚪ Build padrão';
}

function formatEquipmentLine(slot, item) {
    if (!item) return `${slot}: —`;
    const stats = [];
    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);
    return `${slot}: ${item.emoji || '⚪'} ${item.name} (${stats.join(', ')})`;
}

function buildSoulsText(player) {
    const souls = player.soulsEquipped || [null, null];
    if (!souls.length || !souls.some(Boolean)) return '   Nenhuma alma equipada.';
    let text = '';
    souls.forEach((soul, index) => {
        if (soul) text += `   ${getRarityEmoji(soul.rarity)} ${soul.name} (${soul.rarity})\n`;
        else text += `   ⬜ Slot ${index + 1} vazio\n`;
    });
    return text.trimEnd();
}

function buildAchievementsText(player) {
    const ach = player.achievements || {};
    const list = [];
    if (ach.kill10) list.push('🏆 10 mortes');
    if (ach.kill100) list.push('🏆 100 mortes');
    if (list.length === 0) return '   Nenhuma conquista ainda.';
    return list.join('\n');
}

async function handleProfile(ctx) {
    await ctx.answerCbQuery?.();

    const player = await getPlayer(ctx.from.id);

    const xpNeeded = getXpToNextLevel(player.level);
    const xpBar = progressBar(player.xp || 0, xpNeeded || 1, 8, '🟨', '⬜');
    const hpBar = progressBar(player.hp || 0, player.maxHp || 1, 8, '🟥', '⬜');
    const map = getPlayerMap(player);
    const eq = player.equipment || {};
    const kills = player.totalKills || 0;
    const achievementsCount = Object.keys(player.achievements || {}).length;
    const buildName = detectBuild(player);

    let profileMsg = `╔══════════════════════════════════╗
║            👤 *PERFIL*             ║
╠══════════════════════════════════╣
║ 🤴 *${player.name}* (${formatClassName(player.class)})
║ 🧠 Build: ${buildName}
║ ⭐ Nível ${player.level}
║ ✨ XP: ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}
║ [${xpBar}]
╠══════════════════════════════════╣
║ ❤️ HP: ${player.hp}/${player.maxHp}
║ [${hpBar}]
║ ⚡ Energia: ${player.energy}/${player.maxEnergy}
║ 🗺️ ${map.emoji} ${map.name}
╠══════════════════════════════════╣
║ ⚔️ ATK: ${player.atk}
║ 🛡️ DEF: ${player.def}
║ 💥 CRIT: ${player.crit}%
╠══════════════════════════════════╣
║ *Equipamentos:*
║ ${formatEquipmentLine('⚔️ Arma', eq.weapon)}
║ ${formatEquipmentLine('🛡️ Armadura', eq.armor)}
║ ${formatEquipmentLine('💍 Anel', eq.ring)}
║ ${formatEquipmentLine('📿 Colar', eq.necklace)}
║ ${formatEquipmentLine('👢 Botas', eq.boots)}
╠══════════════════════════════════╣
║ 💀 *Almas equipadas:*
${buildSoulsText(player)}
╠══════════════════════════════════╣
║ 📊 *Estatísticas*
║    💀 Inimigos abatidos: ${kills}
║    🏆 Conquistas (${achievementsCount}):
${buildAchievementsText(player)}
╚══════════════════════════════════╝`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📝 Renomear', 'rename_help'), Markup.button.callback('🔄 Classe', 'class_help')],
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);

    try {
        await ctx.editMessageText(profileMsg, { parse_mode: 'Markdown', ...keyboard });
    } catch {
        await ctx.reply(profileMsg, { parse_mode: 'Markdown', ...keyboard });
    }
}

module.exports = { handleProfile };