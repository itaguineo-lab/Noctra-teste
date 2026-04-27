const baseCombat = require('./combatFixed');

const { getPlayer, savePlayer } = require('../core/player/playerService');
const {
    consumeConsumable,
    restoreEnergy,
    normalizePlayerForSave
} = require('../core/player/playerMutations');
const {
    getStoredFight,
    runConsumableTurn
} = require('../core/combat/fightService');
const {
    updateMissionProgress
} = require('../core/daily/dailyService');
const {
    recordConsumableUsed
} = require('../core/metrics/metricsService');
const { BALANCE } = require('../data/balance');

function syncPlayerFromFight(player, fight) {
    if (!player || !fight?.player) return player;

    player.hp = Math.max(1, Math.min(Number(fight.player.hp || 1), Number(player.maxHp || fight.player.maxHp || 1)));
    player.energy = Math.max(0, Math.min(Number(fight.player.energy || 0), Number(player.maxEnergy || fight.player.maxEnergy || 0)));

    return player;
}

function preventStaleActiveFightOverwrite(player) {
    if (!player || typeof player !== 'object') return player;

    /*
    IMPORTANTE:
    runConsumableTurn já persiste a activeFight atualizada no Mongo.
    O player carregado antes da poção ainda pode carregar activeFight antiga.
    Se salvarmos esse player inteiro, ele sobrescreve a luta ativa atualizada
    e o HP curado volta no próximo turno.

    Ao zerar activeFight aqui, savePlayer preserva o activeFight atual do Mongo
    via playerSaveGuard.preserveTransientStates().
    */
    player.activeFight = null;
    return player;
}

async function handleUseConsumable(ctx) {
    const key = ctx.match?.[1];
    const stored = await getStoredFight(ctx.from.id);

    if (!stored) {
        return ctx.answerCbQuery('⚠️ Esta luta expirou. Caçe novamente se quiser.', {
            show_alert: true
        }).catch(() => {});
    }

    if (stored.fight.status !== 'ongoing') {
        return baseCombat.finishFight(ctx, stored);
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return ctx.answerCbQuery('Use /start para criar seu personagem.', {
            show_alert: true
        }).catch(() => {});
    }

    const consumeResult = consumeConsumable(player, key, 1);
    if (!consumeResult.success) {
        return ctx.answerCbQuery('❌ Item indisponível.', {
            show_alert: true
        }).catch(() => {});
    }

    updateMissionProgress(player, 'use_consumable', 1);
    await recordConsumableUsed();

    const updated = await runConsumableTurn(ctx.from.id, (fight) => {
        let log = '';

        if (key === 'potionHp') {
            const before = Number(fight.player.hp || 1);
            fight.player.hp = Math.max(1, Number(fight.player.maxHp || fight.player.hp || 1));
            log = `❤️ Poção de Vida restaurou ${fight.player.hp - before} HP e encheu sua vida.`;
        } else if (key === 'potionEnergy') {
            const before = Number(player.energy || 0);
            restoreEnergy(player, BALANCE.consumables.potionEnergy.restoreAmount);
            fight.player.energy = player.energy;
            log = `⚡ Energia +${player.energy - before} com poção.`;
        } else if (key === 'tonicStrength') {
            fight.player.atk += BALANCE.consumables.tonicStrength.atkBonus;
            log = `💪 ATK +${BALANCE.consumables.tonicStrength.atkBonus} para esta batalha.`;
        } else if (key === 'tonicDefense') {
            fight.player.def += BALANCE.consumables.tonicDefense.defBonus;
            log = `🛡️ DEF +${BALANCE.consumables.tonicDefense.defBonus} para esta batalha.`;
        } else {
            fight.logs.push('❌ Consumível inválido.');
            return { success: false };
        }

        fight.logs.push(log);
        return { success: true };
    }, stored);

    if (!updated || updated.effectResult?.success === false) {
        return ctx.answerCbQuery('❌ Erro ao usar consumível.', {
            show_alert: true
        }).catch(() => {});
    }

    syncPlayerFromFight(player, updated.fight);
    preventStaleActiveFightOverwrite(player);
    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    if (updated.fight.status !== 'ongoing') {
        return baseCombat.finishFight(ctx, updated);
    }

    await ctx.answerCbQuery('✅ Consumível usado!').catch(() => {});
    return baseCombat.handleCombatBack(ctx);
}

module.exports = {
    ...baseCombat,
    handleUseConsumable,

    __private: {
        syncPlayerFromFight,
        preventStaleActiveFightOverwrite
    }
};
