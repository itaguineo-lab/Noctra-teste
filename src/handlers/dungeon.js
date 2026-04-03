const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer
} = require('../core/player/playerService');

const DUNGEON_ENEMIES = [
    {
        name: '🐺 Lobo Sombrio',
        hp: 30,
        atk: 8,
        gold: 25,
        xp: 20
    },
    {
        name: '☠️ Guardião Espectral',
        hp: 50,
        atk: 12,
        gold: 40,
        xp: 35
    },
    {
        name: '👑 Lorde das Sombras',
        hp: 80,
        atk: 18,
        gold: 80,
        xp: 60,
        boss: true
    }
];

function getDungeonCooldown(player) {
    const now = Date.now();
    const lastRun = player.lastDungeonRun || 0;
    const cooldown = 6 * 60 * 60 * 1000;

    return Math.max(0, cooldown - (now - lastRun));
}

function formatCooldown(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    return `${hours}h ${minutes}min`;
}

async function handleDungeon(ctx) {
    await ctx.answerCbQuery?.();

    const player = getPlayer(ctx.from.id);

    const cooldownRemaining = getDungeonCooldown(player);

    if (cooldownRemaining > 0) {
        return ctx.reply(
            `⏳ Masmorra em recarga.\nTempo restante: ${formatCooldown(cooldownRemaining)}`
        );
    }

    if ((player.energy || 0) < 3) {
        return ctx.reply(
            '⚡ Energia insuficiente. Necessário: 3'
        );
    }

    player.energy -= 3;

    player.dungeonProgress = {
        stage: 0,
        enemy: {
            ...DUNGEON_ENEMIES[0]
        }
    };

    savePlayer(ctx.from.id, player);

    return renderDungeonBattle(ctx, player);
}

async function renderDungeonBattle(ctx, player) {
    const enemy = player.dungeonProgress.enemy;

    return ctx.reply(
        `🏰 *MASMORRA*\n\n` +
            `${enemy.name}\n` +
            `❤️ HP: ${enemy.hp}\n\n` +
            `Seu HP: ${player.hp}/${player.maxHp}`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '⚔️ Atacar',
                        'dungeon_attack'
                    )
                ],
                [
                    Markup.button.callback(
                        '🏃 Fugir',
                        'dungeon_flee'
                    )
                ]
            ])
        }
    );
}

async function handleDungeonAttack(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    if (!player.dungeonProgress) {
        return ctx.reply(
            '❌ Nenhuma masmorra ativa.'
        );
    }

    const enemy = player.dungeonProgress.enemy;

    const playerDamage = Math.max(
        1,
        player.atk -
            Math.floor(Math.random() * 4)
    );

    enemy.hp -= playerDamage;

    let text =
        `⚔️ Você causou ${playerDamage} de dano!\n`;

    if (enemy.hp > 0) {
        const enemyDamage = Math.max(
            1,
            enemy.atk -
                Math.floor(
                    player.def / 3
                )
        );

        player.hp -= enemyDamage;

        text +=
            `${enemy.name} causou ${enemyDamage} de dano!\n`;

        if (player.hp <= 0) {
            player.hp = player.maxHp;
            player.dungeonProgress = null;

            savePlayer(ctx.from.id, player);

            return ctx.reply(
                `💀 Você foi derrotado na masmorra.\nRetornou à vila.`
            );
        }

        savePlayer(ctx.from.id, player);

        return ctx.reply(
            text +
                `\n❤️ ${enemy.name}: ${enemy.hp}\n` +
                `❤️ Você: ${player.hp}/${player.maxHp}`,
            {
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

    player.gold += enemy.gold;
    player.xp += enemy.xp;

    player.dungeonProgress.stage++;

    if (
        player.dungeonProgress.stage >=
        DUNGEON_ENEMIES.length
    ) {
        player.lastDungeonRun =
            Date.now();

        player.dungeonProgress =
            null;

        savePlayer(
            ctx.from.id,
            player
        );

        return ctx.reply(
            `🏆 Boss derrotado!\n💰 +${enemy.gold}\n✨ +${enemy.xp} XP`
        );
    }

    player.dungeonProgress.enemy =
        {
            ...DUNGEON_ENEMIES[
                player
                    .dungeonProgress
                    .stage
            ]
        };

    savePlayer(ctx.from.id, player);

    return ctx.reply(
        `✅ ${enemy.name} derrotado!\n\nPróxima sala...`,
        {
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '➡️ Avançar',
                        'dungeon_next_room'
                    )
                ]
            ])
        }
    );
}

async function handleDungeonNextRoom(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    return renderDungeonBattle(
        ctx,
        player
    );
}

async function handleDungeonFlee(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(
        ctx.from.id
    );

    player.dungeonProgress = null;

    savePlayer(ctx.from.id, player);

    return ctx.reply(
        '🏃 Você fugiu da masmorra.'
    );
}

module.exports = {
    handleDungeon,
    handleDungeonAttack,
    handleDungeonNextRoom,
    handleDungeonFlee
};