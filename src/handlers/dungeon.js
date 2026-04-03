const { Markup } = require('telegraf');
const {
    getPlayer,
    savePlayer,
    recalculateStats
} = require('../core/player/playerService');
const { calculateDamage } = require('../core/combat/damageCalc');

const DUNGEON_ENEMIES = [
    {
        name: '🐺 Lobo Sombrio',
        hp: 35,
        atk: 8,
        def: 4,
        gold: 25,
        xp: 20,
        emoji: '🐺'
    },
    {
        name: '☠️ Guardião Espectral',
        hp: 55,
        atk: 12,
        def: 6,
        gold: 45,
        xp: 35,
        emoji: '☠️'
    },
    {
        name: '👑 Lorde das Sombras',
        hp: 90,
        atk: 18,
        def: 10,
        gold: 100,
        xp: 70,
        emoji: '👑',
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

function createEnemy(stage) {
    return { ...DUNGEON_ENEMIES[stage] };
}

function getCurrentEnemy(player) {
    return player.dungeonProgress?.enemy;
}

async function handleDungeon(ctx) {
    await ctx.answerCbQuery?.();
    const player = getPlayer(ctx.from.id);
    const cooldownRemaining = getDungeonCooldown(player);
    if (cooldownRemaining > 0) {
        return ctx.reply(`⏳ *Masmorra em recarga*\n\nTempo restante: ${formatCooldown(cooldownRemaining)}`, { parse_mode: 'Markdown' });
    }
    if ((player.keys || 0) < 1) {
        return ctx.reply('🗝️ Você não possui chaves de masmorra.\n\nCompre na loja ou ganhe no baú diário.');
    }
    player.keys -= 1;
    player.dungeonProgress = { stage: 0, enemy: createEnemy(0) };
    savePlayer(ctx.from.id, player);
    return renderDungeonBattle(ctx, player);
}

async function renderDungeonBattle(ctx, player) {
    const enemy = getCurrentEnemy(player);
    if (!enemy) return ctx.reply('❌ Erro: inimigo não encontrado.');
    const stageNumber = player.dungeonProgress.stage + 1;
    return ctx.reply(
        `🏰 *MASMORRA — Sala ${stageNumber}/3*\n\n` +
        `${enemy.emoji} *${enemy.name}*\n` +
        `❤️ HP Inimigo: ${enemy.hp}\n` +
        `🛡️ DEF Inimigo: ${enemy.def || 0}\n\n` +
        `🧍 Seu HP: ${player.hp}/${player.maxHp}\n` +
        `⚔️ ATK: ${player.atk} | 🛡️ DEF: ${player.def} | 💥 CRIT: ${player.crit}%`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('⚔️ Atacar', 'dungeon_attack')],
                [Markup.button.callback('🏃 Fugir', 'dungeon_flee')]
            ])
        }
    );
}

async function handleDungeonAttack(ctx) {
    await ctx.answerCbQuery();
    const player = getPlayer(ctx.from.id);
    if (!player.dungeonProgress) return ctx.reply('❌ Nenhuma masmorra ativa.');
    const enemy = getCurrentEnemy(player);
    if (!enemy) {
        player.dungeonProgress = null;
        savePlayer(ctx.from.id, player);
        return ctx.reply('❌ Erro interno na masmorra.');
    }

    // Usa o sistema de dano padronizado
    const attackResult = calculateDamage(
        { atk: player.atk, crit: player.crit },
        { def: enemy.def || 0 },
        { multiplier: 1, critBonus: 1.6, minDamage: 1 }
    );
    const playerDamage = attackResult.damage;
    const isCrit = attackResult.isCrit;

    enemy.hp -= playerDamage;
    let combatText = `${isCrit ? '💥 *CRÍTICO!* \n' : ''}⚔️ Você causou *${playerDamage}* de dano!\n`;

    if (enemy.hp > 0) {
        const enemyResult = calculateDamage(
            { atk: enemy.atk, crit: enemy.crit || 5 },
            { def: player.def },
            { multiplier: 1, critBonus: 1.6, minDamage: 1 }
        );
        const enemyDamage = enemyResult.damage;
        player.hp -= enemyDamage;
        combatText += `${enemy.emoji} ${enemy.name} causou *${enemyDamage}* de dano!\n`;

        if (player.hp <= 0) {
            player.hp = player.maxHp;
            player.dungeonProgress = null;
            savePlayer(ctx.from.id, player);
            return ctx.reply(`💀 *DERROTA*\n\nVocê foi derrotado na masmorra e retornou à vila.`, { parse_mode: 'Markdown' });
        }
        savePlayer(ctx.from.id, player);
        return ctx.reply(
            combatText + `\n❤️ HP Inimigo: ${enemy.hp}\n🧍 Seu HP: ${player.hp}/${player.maxHp}`,
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard([ [Markup.button.callback('⚔️ Continuar', 'dungeon_attack')] ]) }
        );
    }
    return handleEnemyDefeat(ctx, player, enemy);
}

async function handleEnemyDefeat(ctx, player, enemy) {
    player.gold += enemy.gold;
    player.xp += enemy.xp;
    let rewardText = `✅ *${enemy.name} derrotado!*\n\n💰 +${enemy.gold} gold\n✨ +${enemy.xp} XP\n`;
    player.dungeonProgress.stage++;
    if (player.dungeonProgress.stage >= DUNGEON_ENEMIES.length) {
        player.lastDungeonRun = Date.now();
        player.dungeonProgress = null;
        recalculateStats(player);
        savePlayer(ctx.from.id, player);
        return ctx.reply(`🏆 *MASMORRA CONCLUÍDA*\n\n${rewardText}\n👑 Boss derrotado com sucesso!`, { parse_mode: 'Markdown' });
    }
    savePlayer(ctx.from.id, player);
    return ctx.reply(
        rewardText + `\n➡️ Avançar para a próxima sala?`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([ [Markup.button.callback('➡️ Próxima Sala', 'dungeon_next_room')] ]) }
    );
}

async function handleDungeonNextRoom(ctx) {
    await ctx.answerCbQuery();
    const player = getPlayer(ctx.from.id);
    if (!player.dungeonProgress) return ctx.reply('❌ Nenhuma masmorra ativa.');
    const stage = player.dungeonProgress.stage;
    player.dungeonProgress.enemy = createEnemy(stage);
    savePlayer(ctx.from.id, player);
    return renderDungeonBattle(ctx, player);
}

async function handleDungeonFlee(ctx) {
    await ctx.answerCbQuery();
    const player = getPlayer(ctx.from.id);
    player.dungeonProgress = null;
    savePlayer(ctx.from.id, player);
    return ctx.reply('🏃 Você fugiu da masmorra.');
}

module.exports = {
    handleDungeon,
    handleDungeonAttack,
    handleDungeonNextRoom,
    handleDungeonFlee
};