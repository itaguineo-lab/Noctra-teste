const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    updateEnergy,
    getTimeToNextEnergy,
    getTimeToFullEnergy,
    getRegenInterval
} = require('../services/energyService');

const {
    consumeEnergy,
    normalizePlayerForSave
} = require('../core/player/playerMutations');

const {
    progressBar,
    formatTime,
    formatDuration
} = require('../utils/formatters');

const { Markup } = require('telegraf');
const { navigateText, safeAnswer } = require('../utils/uiNavigator');
const { BALANCE } = require('../data/balance');

const ENERGY_KEYBOARD = Markup.inlineKeyboard([
    [
        Markup.button.callback('🛌 Descansar', 'rest_energy'),
        Markup.button.callback('💎 VIP', 'vip')
    ],
    [
        Markup.button.callback('🛒 Loja', 'shop'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]
]);

const REST_ENERGY_COST = 1;

/*
=================================
RENDER
=================================
*/

async function renderEnergy(ctx) {
    const player = await getPlayer(ctx.from.id);

    if (!player) {
        return navigateText(ctx, '❌ Perfil não encontrado.');
    }

    const changed = updateEnergy(player);
    if (changed) {
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
    }

    const nextIn = getTimeToNextEnergy(player);
    const fullIn = getTimeToFullEnergy(player);
    const interval = getRegenInterval(player);

    const energyBar = progressBar(
        player.energy,
        player.maxEnergy,
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

    const energyPercent = Math.floor((player.energy / player.maxEnergy) * 100);
    const regenMinutes = Math.floor(interval / 60000);

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚡ *ENERGIA & DESCANSO*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `⚡ *Energia Atual*\n`;
    text += `${player.energy}/${player.maxEnergy}  ${energyBar}  ${energyPercent}%\n\n`;

    text += `❤️ *Vitalidade*\n`;
    text += `${player.hp}/${player.maxHp}  ${hpBar}\n\n`;

    text += `⏱️ *Regeneração*\n`;
    text += `+1 energia a cada ${regenMinutes} min\n`;

    if (player.energy < player.maxEnergy) {
        text += `⏳ Próxima energia: ${formatTime(nextIn)}\n`;
        text += `🔋 Energia cheia em: ${formatDuration(fullIn)}\n\n`;
    } else {
        text += `✅ Energia já está cheia\n\n`;
    }

    text += `🛌 *Descanso*\n`;
    text += `Restaura seu HP total por ${REST_ENERGY_COST} energia.\n\n`;

    if (player.vip) {
        text += `✨ *Status VIP ativo*\n`;
        text += `Energia máxima aumentada e regeneração acelerada.\n`;
    } else {
        text += `💎 *Sem VIP*\n`;
        text += `Ative VIP para ter ${BALANCE.energy.vipMax} de energia e regeneração em ${BALANCE.energy.vipRegenMinutes} min.\n`;
    }

    return navigateText(ctx, text, {
        parse_mode: 'Markdown',
        ...ENERGY_KEYBOARD
    });
}

/*
=================================
HANDLERS
=================================
*/

async function handleEnergy(ctx) {
    await safeAnswer(ctx);
    return renderEnergy(ctx);
}

async function handleRestEnergy(ctx) {
    try {
        await safeAnswer(ctx);

        const player = await getPlayer(ctx.from.id);

        if (!player) {
            return safeAnswer(ctx, 'Perfil não encontrado.', {
                show_alert: true
            });
        }

        updateEnergy(player);

        if (player.hp >= player.maxHp) {
            return safeAnswer(ctx, '❤️ Seu HP já está cheio.', {
                show_alert: true
            });
        }

        if (!consumeEnergy(player, REST_ENERGY_COST)) {
            return safeAnswer(ctx, '⚡ Energia insuficiente para descansar.', {
                show_alert: true
            });
        }

        player.hp = player.maxHp;
        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);

        await safeAnswer(ctx, '🛌 Você descansou e recuperou todo o HP.', {
            show_alert: true
        });

        return renderEnergy(ctx);
    } catch (error) {
        console.error('Erro ao descansar:', error);

        return safeAnswer(ctx, 'Erro ao descansar.', {
            show_alert: true
        });
    }
}

module.exports = {
    handleEnergy,
    handleRestEnergy
};