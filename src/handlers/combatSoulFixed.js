const combatFixed = require('./combatFixed');
const { getPlayer } = require('../core/player/playerService');
const { getStoredFight, persistFightState } = require('../core/combat/fightService');
const { soulChoiceMenu } = require('../menus/combatMenu');

function normalizeTwoSlots(value) {
    const slots = Array.isArray(value) ? value.slice(0, 2) : [];
    while (slots.length < 2) slots.push(null);
    return slots;
}

function hasAnyEquippedSoul(slots) {
    return normalizeTwoSlots(slots).some(Boolean);
}

function hydrateFightSoulsFromPlayer(fight, player) {
    if (!fight || typeof fight !== 'object') return false;

    fight.player ??= {};

    const currentFightSouls = normalizeTwoSlots(fight.player.souls);
    if (hasAnyEquippedSoul(currentFightSouls)) {
        fight.player.souls = currentFightSouls;
        return false;
    }

    const equippedSouls = normalizeTwoSlots(player?.soulsEquipped);
    if (!hasAnyEquippedSoul(equippedSouls)) {
        fight.player.souls = currentFightSouls;
        return false;
    }

    fight.player.souls = equippedSouls;
    return true;
}

async function handleSoulMenu(ctx) {
    const stored = await getStoredFight(ctx.from.id);

    if (!stored) {
        return ctx.answerCbQuery('Esta luta expirou. Cace novamente se quiser.', {
            show_alert: true
        }).catch(() => {});
    }

    if (stored.fight.status !== 'ongoing') {
        return combatFixed.handleCombatBack(ctx);
    }

    const player = await getPlayer(ctx.from.id);
    const hydrated = hydrateFightSoulsFromPlayer(stored.fight, player);

    if (!hasAnyEquippedSoul(stored.fight.player?.souls)) {
        return ctx.answerCbQuery('Nenhuma alma equipada.', { show_alert: true }).catch(() => {});
    }

    if (hydrated) {
        await persistFightState(ctx.from.id, stored.fight, stored.meta).catch(() => {});
    }

    const menu = soulChoiceMenu(stored.fight);

    await ctx.answerCbQuery().catch(() => {});

    try {
        return await ctx.editMessageReplyMarkup(menu.reply_markup);
    } catch {
        return ctx.reply('Escolha uma alma:', menu);
    }
}

module.exports = {
    ...combatFixed,
    handleSoulMenu
};
