const { getPlayer, savePlayer } = require('../core/player/playerService');
const { generateItem } = require('../data/items');

function getDungeonByMap(mapId) {
    const dungeons = {
        clareira_sombria: {
            id: 'wolf_den',
            name: '🐺 Covil do Alfa',
            minLevel: 3,
            goldReward: 120,
            xpReward: 80
        },
        cripta_em_ruinas: {
            id: 'necro_crypt',
            name: '☠️ Cripta do Necromante',
            minLevel: 8,
            goldReward: 250,
            xpReward: 180
        },
        pantano_corrompido: {
            id: 'swamp_core',
            name: '🧪 Núcleo do Pântano',
            minLevel: 15,
            goldReward: 500,
            xpReward: 350
        },
        deserto_incandescente: {
            id: 'flame_tomb',
            name: '🔥 Tumba das Brasas',
            minLevel: 24,
            goldReward: 900,
            xpReward: 650
        }
    };

    return (
        dungeons[mapId] ||
        dungeons.clareira_sombria
    );
}

function canEnterDungeon(player, dungeon) {
    if (player.level < dungeon.minLevel) {
        return {
            success: false,
            message:
                `❌ Nível insuficiente.\n` +
                `Requer nível ${dungeon.minLevel}.`
        };
    }

    if ((player.energy || 0) < 3) {
        return {
            success: false,
            message:
                `⚡ Energia insuficiente.\n` +
                `Necessário: 3`
        };
    }

    return { success: true };
}

function getDungeonCooldown(player) {
    const now = Date.now();
    const lastRun = player.lastDungeonRun || 0;
    const cooldown = 6 * 60 * 60 * 1000; // 6 horas

    const remaining = cooldown - (now - lastRun);

    return Math.max(0, remaining);
}

function formatCooldown(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor(
        (ms % (1000 * 60 * 60)) / (1000 * 60)
    );

    return `${hours}h ${minutes}min`;
}

async function handleDungeon(ctx) {
    await ctx.answerCbQuery?.();

    const player = getPlayer(ctx.from.id);
    const dungeon = getDungeonByMap(player.currentMap);

    const cooldownRemaining = getDungeonCooldown(player);

    if (cooldownRemaining > 0) {
        return ctx.reply(
            `⏳ A masmorra já foi concluída recentemente.\n\n` +
            `Tempo restante: ${formatCooldown(cooldownRemaining)}`
        );
    }

    const check = canEnterDungeon(player, dungeon);

    if (!check.success) {
        return ctx.reply(check.message);
    }

    /*
      custo
    */
    player.energy -= 3;

    /*
      recompensa
    */
    const gold = dungeon.goldReward;
    const xp = dungeon.xpReward;

    player.gold += gold;
    player.xp += xp;

    /*
      loot garantido de boss
    */
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

    /*
      cooldown
    */
    player.lastDungeonRun = Date.now();

    savePlayer(ctx.from.id, player);

    let msg =
        `🏰 *MASMORRA CONCLUÍDA*\n\n` +
        `${dungeon.name}\n\n` +
        `✨ +${xp} XP\n` +
        `💰 +${gold} ouro\n`;

    if (droppedItem) {
        msg +=
            `\n🎁 Loot:\n` +
            `${droppedItem.emoji} ${droppedItem.name}`;
    }

    msg +=
        `\n\n⚡ -3 energia`;

    return ctx.reply(msg, {
        parse_mode: 'Markdown'
    });
}

module.exports = {
    handleDungeon
};