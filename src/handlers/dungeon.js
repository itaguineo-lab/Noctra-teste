const { Markup } = require('telegraf');

const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const {
    calculateDamage
} = require('../core/combat/damageCalc');

const {
    processVictory
} = require('../services/rewardService');

/*
=================================
HELPERS
=================================
*/

function ensureDungeonState(player) {
    if (!player.dungeonProgress) {
        player.dungeonProgress = {
            room: 1,
            maxRooms: 5,
            completed: false,
            enemy: null
        };
    }

    return player.dungeonProgress;
}

function createDungeonEnemy(player, room) {
    const level =
        Math.max(
            1,
            player.level + room - 1
        );

    const isBoss = room === 5;

    const hp = isBoss
        ? 80 + level * 35
        : 40 + level * 20;

    return {
        name: isBoss
            ? 'Guardião das Sombras'
            : `Criatura Sombria ${room}`,
        level,
        hp,
        maxHp: hp,
        atk: isBoss
            ? 8 + level * 3
            : 5 + level * 2,
        def: isBoss
            ? 6 + level * 2
            : 3 + level,
        crit: isBoss ? 10 : 5,
        xp: isBoss
            ? 60 + level * 10
            : 20 + level * 5,
        gold: isBoss
            ? 80 + level * 15
            : 20 + level * 8,
        isBoss
    };
}

function getCurrentEnemy(player) {
    const dungeon =
        ensureDungeonState(player);

    if (!dungeon.enemy) {
        dungeon.enemy =
            createDungeonEnemy(
                player,
                dungeon.room
            );
    }

    return dungeon.enemy;
}

function renderDungeonText(player, enemy, playerHit, enemyHit) {
    const room =
        player.dungeonProgress.room;

    const maxRooms =
        player.dungeonProgress.maxRooms;

    let text = `🏰 *MASMORRA*\n\n`;

    text += `🚪 Sala ${room}/${maxRooms}\n\n`;

    text += `⚔️ Você causou ${playerHit.damage} dano\n`;

    if (enemyHit) {
        text += `💥 Recebeu ${enemyHit.damage} dano\n\n`;
    } else {
        text += `✨ Inimigo derrotado!\n\n`;
    }

    text += `❤️ HP: ${player.hp}/${player.maxHp}\n`;
    text += `👹 ${enemy.name}: ${Math.max(0, enemy.hp)}/${enemy.maxHp}`;

    return text;
}

/*
=================================
PROGRESS
=================================
*/

function advanceRoom(player) {
    const dungeon =
        ensureDungeonState(player);

    dungeon.room++;

    if (dungeon.room > dungeon.maxRooms) {
        dungeon.completed = true;
        dungeon.enemy = null;
        return true;
    }

    dungeon.enemy =
        createDungeonEnemy(
            player,
            dungeon.room
        );

    return false;
}

/*
=================================
HANDLER
=================================
*/

async function handleDungeonAttack(ctx) {
    await ctx.answerCbQuery();

    const player =
        await getPlayer(ctx.from.id);

    const dungeon =
        ensureDungeonState(player);

    const enemy =
        getCurrentEnemy(player);

    /*
    player attack
    */

    const playerHit =
        calculateDamage(
            {
                atk: player.atk,
                crit:
                    player.crit
            },
            {
                def: enemy.def
            }
        );

    enemy.hp -=
        playerHit.damage;

    /*
    enemy dead
    */

    if (enemy.hp <= 0) {
        const rewards =
            processVictory(
                player,
                enemy
            );

        const finished =
            advanceRoom(player);

        await savePlayer(
            ctx.from.id,
            player
        );

        if (finished) {
            player.dungeonProgress =
                null;

            await savePlayer(
                ctx.from.id,
                player
            );

            let msg = `🏆 *MASMORRA CONCLUÍDA*\n\n`;
            msg += `👑 Você venceu todas as salas!\n`;
            msg += `✨ +${rewards.xp} XP\n`;
            msg += `💰 +${rewards.gold} ouro`;

            return ctx.reply(
                msg,
                {
                    parse_mode:
                        'Markdown'
                }
            );
        }

        return ctx.reply(
            `🚪 Sala concluída!\n\nPróxima sala liberada.`,
            {
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            '⚔️ Próxima Sala',
                            'dungeon_attack'
                        )
                    ]
                ])
            }
        );
    }

    /*
    enemy attack
    */

    const enemyHit =
        calculateDamage(
            {
                atk: enemy.atk,
                crit:
                    enemy.crit || 5
            },
            {
                def: player.def
            }
        );

    player.hp -=
        enemyHit.damage;

    /*
    defeat
    */

    if (player.hp <= 0) {
        player.hp = 1;
        player.dungeonProgress =
            null;

        await savePlayer(
            ctx.from.id,
            player
        );

        return ctx.reply(
            `💀 *DERROTA*\n\nVocê caiu na sala ${dungeon.room}.`,
            {
                parse_mode:
                    'Markdown'
            }
        );
    }

    /*
    persist
    */

    player.dungeonProgress.enemy =
        enemy;

    await savePlayer(
        ctx.from.id,
        player
    );

    return ctx.reply(
        renderDungeonText(
            player,
            enemy,
            playerHit,
            enemyHit
        ),
        {
            parse_mode:
                'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '⚔️ Continuar',
                        'dungeon_attack'
                    )
                ]
            ])
        }
    );
}

module.exports = {
    handleDungeonAttack
};