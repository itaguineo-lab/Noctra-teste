const { getPlayer } = require('../core/player/playerService');
const { Markup } = require('telegraf');

function line(icon, item) {
    return `${icon} ${item ? item.name : 'Vazio'}`;
}

async function handleProfile(ctx) {
    await ctx.answerCbQuery?.();

    const player = getPlayer(ctx.from.id);

    const eq = player.equipment;

    const text = `👤 *${player.name}* (${player.class})

⭐ Nível ${player.level}
✨ XP: ${player.xp}

❤️ HP: ${player.hp}/${player.maxHp}
⚡ Energia: ${player.energy}/${player.maxEnergy}

*Equipamentos*
${line('⚔️', eq.weapon)}
${line('🛡️', eq.armor)}
${line('📿', eq.necklace)}
${line('💍', eq.ring)}
${line('🥾', eq.boots)}
${line('🏹', eq.quiver)}
${line('🎒', eq.backpack)}

💀 Inimigos abatidos: ${player.totalKills || 0}`;

    return ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
            [
                Markup.button.callback('🏠 Menu', 'menu')
            ]
        ]).reply_markup
    });
}

module.exports = {
    handleProfile
};