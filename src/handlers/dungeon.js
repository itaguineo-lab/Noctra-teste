const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { generateItem } = require('../data/items');

const DUNGEON_STAGES = [
    {
        type: 'mob',
        name: '🐺 Sala 1 — Lobos Sombrio',
        xp: 20,
        gold: 30
    },
    {
        type: 'event',
        name: '🪙 Sala 2 — Baú Antigo',
        xp: 15,
        gold: 50
    },
    {
        type: 'elite',
        name: '☠️ Sala 3 — Guardião Elite',
        xp: 40,
        gold: 70
    },
    {
        type: 'boss',
        name: '👑 Sala Final — Boss',
        xp: 80,
        gold: 120
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
        return ctx.reply('⚡ Energia insuficiente. Necessário: 3');
    }

    player.energy -= 3;

    player.dungeonProgress = {
        stage: 0,
        startedAt: Date.now()
    };

    savePlayer(ctx.from.id, player);

    return showDungeonStage(ctx, player);
}

async function showDungeonStage(ctx, player) {
    const progress = player.dungeonProgress;
    const stage = DUNGEON_STAGES[progress.stage];

    return ctx.reply(
        `🏰 *MASMORRA*\n\n${stage.name}\n\nEscolha sua ação:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '⚔️ Avançar',
                        'dungeon_next'
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

async function handleDungeonNext(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    if (!player.dungeonProgress) {
        return ctx.reply('❌ Nenhuma masmorra ativa.');
    }

    const currentStage =
        DUNGEON_STAGES[player.dungeonProgress.stage];

    player.xp += currentStage.xp;
    player.gold += currentStage.gold;

    player.dungeonProgress.stage++;

    if (
        player.dungeonProgress.stage >=
        DUNGEON_STAGES.length
    ) {
        return finishDungeon(ctx, player);
    }

    savePlayer(ctx.from.id, player);

    return showDungeonStage(ctx, player);
}

async function finishDungeon(ctx, player) {
    let droppedItem = null;

    if (
        player.inventory.length <
        player.maxInventory
    ) {
        droppedItem = generateItem(
            player.level,
            null,
            {
                currentMap: player.currentMap,
                isBoss: true,
                isDungeonBoss: true
            }
        );

        player.inventory.push(droppedItem);
    }

    player.lastDungeonRun = Date.now();
    player.dungeonProgress = null;

    savePlayer(ctx.from.id, player);

    let msg =
        `🏆 *MASMORRA CONCLUÍDA*\n\n` +
        `✨ Dungeon finalizada com sucesso!\n`;

    if (droppedItem) {
        msg +=
            `\n🎁 Loot Final:\n` +
            `${droppedItem.emoji} ${droppedItem.name}`;
    }

    return ctx.reply(msg, {
        parse_mode: 'Markdown'
    });
}

async function handleDungeonFlee(ctx) {
    await ctx.answerCbQuery();

    const player = getPlayer(ctx.from.id);

    player.dungeonProgress = null;

    savePlayer(ctx.from.id, player);

    return ctx.reply(
        '🏃 Você abandonou a masmorra.'
    );
}

module.exports = {
    handleDungeon,
    handleDungeonNext,
    handleDungeonFlee
};