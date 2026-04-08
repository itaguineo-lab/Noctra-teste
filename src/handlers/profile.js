const { getPlayer } = require('../core/player/playerService');
const { getXpToNextLevel } = require('../core/player/progression');
const { getMapById, maps } = require('../core/world/maps');
const { Markup } = require('telegraf');

const {
    progressBar,
    formatNumber
} = require('../utils/formatters');

const {
    getRarityEmoji
} = require('../core/player/souls');

/*
=================================
HELPERS
=================================
*/

function getPlayerMap(player) {
    return getMapById(player.currentMap) || maps[0];
}

function formatClassName(className = 'guerreiro') {
    return className.charAt(0).toUpperCase() + className.slice(1);
}

function detectBuild(player) {
    const cls = player.class;
    const souls = player.soulsEquipped || [];

    const totalAtk = player.atk || 0;
    const totalDef = player.def || 0;
    const totalHp = player.maxHp || 0;

    const hasHealingSoul = souls.some(
        soul =>
            soul?.effect?.type === 'heal'
    );

    if (cls === 'mago') {
        if (hasHealingSoul || totalHp >= 140) {
            return '💚 Curandeiro Arcano';
        }

        if (totalAtk >= 35) {
            return '🔥 Mago Ofensivo';
        }

        return '✨ Mago Balanceado';
    }

    if (cls === 'guerreiro') {
        if (totalDef >= 35 || totalHp >= 180) {
            return '🛡️ Guardião';
        }

        if (totalAtk >= 40) {
            return '⚔️ Berserker';
        }

        return '⚔️ Guerreiro Balanceado';
    }

    if (cls === 'arqueiro') {
        if ((player.crit || 0) >= 20) {
            return '🎯 Sniper';
        }

        return '🏹 Caçador Sombrio';
    }

    return '⚪ Build padrão';
}

function formatEquipmentLine(slot, item) {
    if (!item) {
        return `${slot}: —`;
    }

    const stats = [];

    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);

    return `${slot}: ${item.emoji || '⚪'} ${item.name}\n   ${stats.join(' • ')}`;
}

function buildSoulsText(player) {
    const souls = player.soulsEquipped || [null, null];

    if (!souls.some(Boolean)) {
        return '⬜ Nenhuma alma equipada';
    }

    return souls.map((soul, index) => {
        if (!soul) {
            return `⬜ Slot ${index + 1} vazio`;
        }

        return `${getRarityEmoji(soul.rarity)} ${soul.name} • ${soul.rarity}`;
    }).join('\n');
}

/*
=================================
PROFILE
=================================
*/

async function handleProfile(ctx) {
    await ctx.answerCbQuery?.();

    const player = await getPlayer(ctx.from.id);

    const xpNeeded = getXpToNextLevel(player.level);
    const map = getPlayerMap(player);
    const buildName = detectBuild(player);

    const xpBar = progressBar(
        player.xp,
        xpNeeded,
        10,
        '🟨',
        '⬛'
    );

    const hpBar = progressBar(
        player.hp,
        player.maxHp,
        10,
        '🟥',
        '⬛'
    );

    const eq = player.equipment || {};

    let profileMsg = '';
    profileMsg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    profileMsg += `👤 *PERFIL DO HERÓI*\n`;
    profileMsg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    profileMsg += `🌑 *${player.name}*\n`;
    profileMsg += `🏹 ${formatClassName(player.class)}\n`;
    profileMsg += `🧠 ${buildName}\n`;
    profileMsg += `⭐ Nível ${player.level}\n\n`;

    profileMsg += `✨ XP ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}\n`;
    profileMsg += `[${xpBar}]\n\n`;

    profileMsg += `❤️ HP ${player.hp}/${player.maxHp}\n`;
    profileMsg += `[${hpBar}]\n\n`;

    profileMsg += `⚔️ ATK ${player.atk}\n`;
    profileMsg += `🛡️ DEF ${player.def}\n`;
    profileMsg += `💥 CRIT ${player.crit}%\n`;
    profileMsg += `⚡ Energia ${player.energy}/${player.maxEnergy}\n`;
    profileMsg += `🗺️ ${map.emoji} ${map.name}\n\n`;

    profileMsg += `🎒 *Equipamentos*\n`;
    profileMsg += `${formatEquipmentLine('⚔️ Arma', eq.weapon)}\n`;
    profileMsg += `${formatEquipmentLine('🛡️ Armadura', eq.armor)}\n`;
    profileMsg += `${formatEquipmentLine('💍 Anel', eq.ring)}\n`;
    profileMsg += `${formatEquipmentLine('📿 Colar', eq.necklace)}\n`;
    profileMsg += `${formatEquipmentLine('👢 Botas', eq.boots)}\n\n`;

    profileMsg += `💀 *Almas*\n`;
    profileMsg += `${buildSoulsText(player)}\n\n`;

    profileMsg += `☠️ Abates: ${player.totalKills || 0}\n`;

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('📝 Renomear', 'rename_help'),
            Markup.button.callback('🔄 Classe', 'class_help')
        ],
        [
            Markup.button.callback('◀️ Voltar', 'menu')
        ]
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

module.exports = {
    handleProfile
};