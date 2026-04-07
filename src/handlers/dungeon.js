const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { calculateDamage } = require('../core/combat/damageCalc');

async function handleDungeonAttack(ctx) {
    await ctx.answerCbQuery();

    const player = await getPlayer(ctx.from.id);
    const enemy = player.dungeonProgress?.enemy;

    if (!enemy) {
        return ctx.reply('❌ Nenhuma masmorra ativa.');
    }

    const playerHit = calculateDamage(
        { atk: player.atk, crit: player.crit },
        { def: enemy.def }
    );

    enemy.hp -= playerHit.damage;

    if (enemy.hp > 0) {
        const enemyHit = calculateDamage(
            { atk: enemy.atk, crit: enemy.crit || 5 },
            { def: player.def }
        );

        player.hp -= enemyHit.damage;

        if (player.hp <= 0) {
            player.hp = 1; // mantém resultado real, não full
            player.dungeonProgress = null;
            await savePlayer(ctx.from.id, player);

            return ctx.reply(
                `💀 *DERROTA*\n\nVocê terminou a batalha com ${player.hp} HP.`,
                { parse_mode: 'Markdown' }
            );
        }

        player.dungeonProgress.enemy = enemy;
        await savePlayer(ctx.from.id, player);

        return ctx.reply(
            `⚔️ Você causou ${playerHit.damage} dano\n` +
            `💥 Recebeu ${enemyHit.damage} dano\n\n` +
            `❤️ Seu HP: ${player.hp}/${player.maxHp}\n` +
            `👹 HP inimigo: ${enemy.hp}`,
            {
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('⚔️ Continuar', 'dungeon_attack')]
                ])
            }
        );
    }

    player.dungeonProgress = null;
    await savePlayer(ctx.from.id, player);

    return ctx.reply('🏆 Inimigo derrotado!');
}

module.exports = { handleDungeonAttack };
