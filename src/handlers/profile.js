const { getPlayer } = require('../core/player/playerService');
const { getXpToNextLevel } = require('../core/player/progression');
const { getMapById, maps } = require('../core/world/maps');
const { Markup } = require('telegraf');
const { mainMenu } = require('../menus/mainMenu');

const { progressBar, formatNumber } = require('../utils/formatters');
const { getRarityEmoji } = require('../core/player/souls');

function getPlayerMap(player) {
    const map = getMapById(player.currentMap);
    return map || maps[0];
}

function formatClassName(className = 'guerreiro') {
    return className.charAt(0).toUpperCase() + className.slice(1);
}

function buildEquipmentText(player) {
    const equipment = player.equipment || {};
    const slots = ['weapon', 'armor', 'accessory'];

    let text = '';

    for (const slot of slots) {
        const item = equipment[slot];

        if (item) {
            text += `   ${slotLabel(slot)} ${item.name}\n`;
            text += `      ⚔️ +${item.atk || 0} | 🛡️ +${item.def || 0} | ✨ +${item.crit || 0} | ❤️ +${item.hp || 0}\n`;
        } else {
            text += `   ${slotLabel(slot)} Vazio\n`;
        }
    }

    return text.trimEnd();
}

function buildSoulsText(player) {
    const souls = player.souls || [];
    let text = '';

    if (!souls.length) {
        return '   Nenhuma alma equipada.';
    }

    souls.forEach((soul, index) => {
        if (soul) {
            text += `   ${getRarityEmoji(soul.rarity)} ${soul.name} (${soul.rarity})\n`;
            if (soul.description) {
                text += `      ${soul.description}\n`;
            }
        } else {
            text += `   ⬜ Slot ${index + 1} vazio\n`;
        }
    });

    return text.trimEnd();
}

function slotLabel(slot) {
    const map = {
        weapon: '⚔️',
        armor: '🛡️',
        accessory: '📿'
    };

    return map[slot] || '•';
}

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch (error) {
        await ctx.reply(text, options);
    }
}

async function handleProfile(ctx) {
    try {
        const player = getPlayer(ctx.from.id);

        const xpNeeded = getXpToNextLevel(player.level);
        const xpBar = progressBar(player.xp || 0, xpNeeded || 1, 8);
        const hpBar = progressBar(player.hp || 0, player.maxHp || 1, 8);

        const map = getPlayerMap(player);

        const equipmentText = buildEquipmentText(player);
        const soulsText = buildSoulsText(player);

        const skinText = player.skin
            ? `🎨 Skin: ${player.skin.emoji || ''} ${player.skin.name || 'Sem nome'}\n`
            : '🎨 Skin: Nenhuma\n';

        const profileMsg =
            `👤 *${player.name || ctx.from.first_name}* (${formatClassName(player.class)})\n` +
            `Nível ${player.level || 1} | XP: ${formatNumber(player.xp || 0)} / ${formatNumber(xpNeeded || 1)}\n` +
            `[${xpBar}] ${Math.floor(((player.xp || 0) / (xpNeeded || 1)) * 100)}%\n\n` +
            `❤️ HP: ${player.hp || 0}/${player.maxHp || 0}\n` +
            `[${hpBar}] ${Math.floor(((player.hp || 0) / (player.maxHp || 1)) * 100)}%\n\n` +
            `⚔️ ATK: ${player.atk || 0} | 🛡️ DEF: ${player.def || 0}\n` +
            `✨ CRIT: ${player.crit || 0}%\n\n` +
            `💰 Gold: ${formatNumber(player.gold || 0)} | 💎 Nox: ${formatNumber(player.nox || 0)} | 🏅 Glórias: ${formatNumber(player.glorias || 0)}\n` +
            `⚡ Energia: ${player.energy || 0}/${player.maxEnergy || 0}\n` +
            `🗝️ Chaves: ${player.keys || 0}\n` +
            `🗺️ Mapa: ${map.emoji} ${map.name} (Lv ${map.levelReq || map.level || 1})\n\n` +
            `${skinText}\n` +
            `*Equipamentos:*\n${equipmentText}\n\n` +
            `💀 *Almas Equipadas (${(player.souls || []).filter(s => s !== null).length || 0}/2):*\n${soulsText}`;

        const keyboard = [
            [
                Markup.button.callback('📝 Renomear', 'rename_help'),
                Markup.button.callback('🔄 Mudar Classe', 'class_help')
            ],
            [
                Markup.button.callback('◀️ Voltar', 'menu')
            ]
        ];

        await safeEdit(ctx, profileMsg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(keyboard)
        });
    } catch (error) {
        console.error('Erro no perfil:', error);
        await ctx.answerCbQuery('Erro ao carregar perfil.', true);
    }
}

async function handleRenameAction(ctx) {
    await ctx.answerCbQuery('Use o comando /rename <novo_nome>', true);
}

async function handleChangeClassAction(ctx) {
    await ctx.answerCbQuery(
        'Use o comando /class guerreiro | arqueiro | mago',
        true
    );
}

module.exports = {
    handleProfile,
    handleRenameAction,
    handleChangeClassAction
};