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
    if (!souls.length || !souls.some(Boolean)) {
        return '   Nenhuma alma equipada.';
    }
    let text = '';
    souls.forEach((soul, index) => {
        if (soul) {
            text += `   ${getRarityEmoji(soul.rarity)} ${soul.name} (${soul.rarity})\n`;
        } else {
            text += `   ⬜ Slot ${index + 1} vazio\n`;
        }
    });
    return text.trimEnd();
}

async function handleProfile(ctx) {
    await ctx.answerCbQuery?.();

    const player = getPlayer(ctx.from.id);
    const xpNeeded = getXpToNextLevel(player.level);
    const xpBar = progressBar(player.xp || 0, xpNeeded || 1, 8, '🟨', '⬜');
    const hpBar = progressBar(player.hp || 0, player.maxHp || 1, 8, '🟥', '⬜');
    const map = getPlayerMap(player);

    const eq = player.equipment || {};
    const kills = player.totalKills || 0;
    const achievementsCount = Object.keys(player.achievements || {}).length;

    let profileMsg = `╔════════════════════════╗
║      👤 *PERFIL*       ║
╠════════════════════════╣
║ 🤴 *${player.name}* (${formatClassName(player.class)})
║ ⭐ Nível ${player.level}
║ ✨ XP: ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}
║ [${xpBar}]
╠════════════════════════╣
║ ❤️ HP: ${player.hp}/${player.maxHp}
║ [${hpBar}]
║ ⚡ Energia: ${player.energy}/${player.maxEnergy}
║ 🗺️ ${map.emoji} ${map.name}
╠════════════════════════╣
║ *Equipamentos:*
║ ${formatEquipmentLine('⚔️ Arma', eq.weapon)}
║ ${formatEquipmentLine('🛡️ Armadura', eq.armor)}
║ ${formatEquipmentLine('💍 Anel', eq.ring)}
║ ${formatEquipmentLine('📿 Colar', eq.necklace)}
║ ${formatEquipmentLine('👢 Botas', eq.boots)}
╠════════════════════════╣
║ 💀 *Almas:*
${buildSoulsText(player)}
╠════════════════════════╣
║ 📊 *Estatísticas*
║    💀 Inimigos abatidos: ${kills}
║    🏆 Conquistas: ${achievementsCount}
╚════════════════════════╝`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📝 Renomear', 'rename_help'), Markup.button.callback('🔄 Classe', 'class_help')],
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);

    try {
        await ctx.editMessageText(profileMsg, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch {
        await ctx.reply(profileMsg, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

module.exports = { handleProfile };
