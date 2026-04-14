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

const assets = require('../data/assets');

/*
=================================
HELPERS
=================================
*/

function getPlayerMap(player) {
    return getMapById(player.currentMap) || maps[0];
}

function formatClassName(className = 'guerreiro') {
    const map = {
        guerreiro: 'Guerreiro',
        arqueiro: 'Arqueiro',
        mago: 'Mago'
    };
    return map[className] || className;
}

function detectBuild(player) {
    const cls = player.class;
    const souls = player.soulsEquipped || [];

    const totalAtk = player.atk || 0;
    const totalDef = player.def || 0;
    const totalHp = player.maxHp || 0;

    const hasHealingSoul = souls.some(
        soul => soul?.effect?.type === 'heal'
    );

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
        return '🏹 Caçador Sombrio';
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

    return `${slot}: ${item.emoji || '⚪'} ${item.name}\n   ${stats.join(' • ')}`;
}

function buildSoulsText(player) {
    const souls = player.soulsEquipped || [null, null];
    if (!souls.some(Boolean)) return '⬜ Nenhuma alma equipada';

    return souls.map((soul, index) => {
        if (!soul) return `⬜ Slot ${index + 1} vazio`;
        return `${getRarityEmoji(soul.rarity)} ${soul.name} • ${soul.rarity}`;
    }).join('\n');
}

function renderProfileCaption(player) {
    const xpNeeded = getXpToNextLevel(player.level);
    const map = getPlayerMap(player);
    const buildName = detectBuild(player);

    const xpBar = progressBar(player.xp, xpNeeded, 10, '🟨', '⬛');
    const hpBar = progressBar(player.hp, player.maxHp, 10, '🟥', '⬛');

    const eq = player.equipment || {};

    let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *PERFIL DO HERÓI*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `🌑 *${player.name}*\n`;
    msg += `🏹 ${formatClassName(player.class)}\n`;
    msg += `🧠 ${buildName}\n`;
    msg += `⭐ Nível ${player.level}\n\n`;

    msg += `✨ XP ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}\n`;
    msg += `[${xpBar}]\n\n`;

    msg += `❤️ HP ${player.hp}/${player.maxHp}\n`;
    msg += `[${hpBar}]\n\n`;

    msg += `⚔️ ATK ${player.atk}\n`;
    msg += `🛡️ DEF ${player.def}\n`;
    msg += `💥 CRIT ${player.crit}%\n`;
    msg += `⚡ Energia ${player.energy}/${player.maxEnergy}\n`;
    msg += `🗺️ ${map.emoji} ${map.name}\n\n`;

    msg += `🎒 *Equipamentos*\n`;
    msg += `${formatEquipmentLine('⚔️ Arma', eq.weapon)}\n`;
    msg += `${formatEquipmentLine('🛡️ Escudo', eq.shield)}\n`;
    msg += `${formatEquipmentLine('🥋 Armadura', eq.armor)}\n`;
    msg += `${formatEquipmentLine('💍 Anel', eq.ring)}\n`;
    msg += `${formatEquipmentLine('📿 Amuleto', eq.necklace)}\n`;
    msg += `${formatEquipmentLine('👢 Botas', eq.boots)}\n\n`;

    msg += `💀 *Almas*\n`;
    msg += `${buildSoulsText(player)}\n\n`;

    msg += `☠️ Abates: ${player.totalKills || 0}`;

    return msg;
}

/*
=================================
PROFILE HANDLER (COM FOTO)
=================================
*/

async function handleProfile(ctx) {
    await ctx.answerCbQuery?.();

    const player = await getPlayer(ctx.from.id);
    const caption = renderProfileCaption(player);
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📝 Renomear', 'rename_help'), Markup.button.callback('🔄 Classe', 'class_help')],
        [Markup.button.callback('◀️ Voltar', 'menu')]
    ]);

    const profileImage = assets?.profile?.[player.class];

    try {
        // Tenta editar a mensagem existente (pode ser texto ou foto)
        const chatId = ctx.chat.id;
        const messageId = ctx.callbackQuery?.message?.message_id;

        if (messageId) {
            if (profileImage) {
                // Se temos imagem, edita a legenda (assumindo que a mensagem atual é uma foto)
                await ctx.telegram.editMessageCaption(chatId, messageId, null, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                });
                return;
            } else {
                // Sem imagem, edita como texto
                await ctx.editMessageText(caption, {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                return;
            }
        }
    } catch (e) {
        // Se falhar, envia nova mensagem
    }

    // Envia nova mensagem (fallback)
    if (profileImage) {
        await ctx.replyWithPhoto(profileImage, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
        });
    } else {
        await ctx.reply(caption, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

module.exports = {
    handleProfile
};