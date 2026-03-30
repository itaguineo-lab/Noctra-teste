const { getPlayer, savePlayer, recalculateStats } = require('../core/player/playerService');
const { addXp } = require('../core/player/progression');
const {
    createFight,
    processPlayerTurn,
    processEnemyTurn,
    attemptFlee,
    useSoul
} = require('../core/combat/combatEngine');
const { combatMenu, postCombatMenu } = require('../menus/combatMenu');
const { progressBar } = require('../utils/formatters');
const { getRandomEnemy } = require('../core/world/enemies');

const activeFights = new Map();

function renderFightText(fight) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8);
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8);
    
    let text = `⚔️ *COMBATE* | Turno ${fight.turn}\n\n`;
    text += `👤 *${fight.player.name}* (${fight.player.className})\n`;
    text += `❤️ HP: ${fight.player.hp}/${fight.player.maxHp}\n`;
    text += `[${playerBar}]\n\n`;
    text += `👾 *${fight.enemy.name}* (Lv ${fight.enemy.level})\n`;
    text += `❤️ HP: ${fight.enemy.hp}/${fight.enemy.maxHp}\n`;
    text += `[${enemyBar}]\n\n`;
    text += `📜 *Últimas ações:*\n${fight.logs.slice(-3).join('\n')}`;
    return text;
}

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch {
        await ctx.reply(text, options);
    }
}

async function finishFight(ctx, fight) {
    const player = getPlayer(ctx.from.id);
    
    if (fight.status === 'win') {
        const rewards = fight.rewards || { xp: 0, gold: 0 };
        player.xp += rewards.xp || 0;
        player.gold = (player.gold || 0) + (rewards.gold || 0);
        addXp(player, 0); // força checagem de level up
        player.hp = fight.player.hp; // atualiza HP
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        
        return safeEdit(ctx,
            `🏆 *VITÓRIA!*\n\n📜 ${fight.logs.slice(-3).join('\n')}\n\n✨ +${rewards.xp} XP\n💰 +${rewards.gold} Ouro`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
    }
    
    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        return safeEdit(ctx,
            `💀 *DERROTA...*\n\n${fight.logs.slice(-3).join('\n')}\n\nVocê reviveu com 25% de HP.`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
    }
    
    if (fight.status === 'fled') {
        player.hp = fight.player.hp;
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        return safeEdit(ctx,
            `🏃 *FUGA*\n\n${fight.logs.slice(-3).join('\n')}`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
    }
}

async function handleHunt(ctx) {
    const player = getPlayer(ctx.from.id);
    if (!player) return ctx.reply('❌ Perfil não encontrado.');
    
    if (activeFights.has(ctx.from.id)) {
        const fight = activeFights.get(ctx.from.id);
        return safeEdit(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    }
    
    // Consome energia (implementar depois)
    const enemy = getRandomEnemy(player.currentMap || 'clareira_sombria', player.level);
    if (!enemy) return ctx.reply('❌ Nenhum inimigo encontrado.');
    
    const fight = createFight(player, enemy);
    activeFights.set(ctx.from.id, fight);
    
    return ctx.reply(renderFightText(fight), {
        parse_mode: 'Markdown',
        ...combatMenu(fight)
    });
}

async function handleAttack(ctx) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return ctx.answerCbQuery('Nenhum combate ativo.');
    
    processPlayerTurn(fight, false); // ataque normal
    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }
    if (fight.status !== 'ongoing') return finishFight(ctx, fight);
    
    return safeEdit(ctx, renderFightText(fight), {
        parse_mode: 'Markdown',
        ...combatMenu(fight)
    });
}

async function handleSkill(ctx) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return ctx.answerCbQuery('Nenhum combate ativo.');
    
    processPlayerTurn(fight, true); // habilidade de classe
    if (fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }
    if (fight.status !== 'ongoing') return finishFight(ctx, fight);
    
    return safeEdit(ctx, renderFightText(fight), {
        parse_mode: 'Markdown',
        ...combatMenu(fight)
    });
}

async function handleSoul(ctx) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return ctx.answerCbQuery('Nenhum combate ativo.');
    
    // Pergunta qual alma usar (simplificado: usa a primeira)
    const soulIndex = 0;
    const result = useSoul(fight, soulIndex);
    if (result && fight.status === 'ongoing') {
        processEnemyTurn(fight);
    }
    if (fight.status !== 'ongoing') return finishFight(ctx, fight);
    
    return safeEdit(ctx, renderFightText(fight), {
        parse_mode: 'Markdown',
        ...combatMenu(fight)
    });
}

async function handleFlee(ctx) {
    const fight = activeFights.get(ctx.from.id);
    if (!fight) return ctx.answerCbQuery('Nenhum combate ativo.');
    
    attemptFlee(fight);
    if (fight.status !== 'ongoing') return finishFight(ctx, fight);
    
    return safeEdit(ctx, renderFightText(fight), {
        parse_mode: 'Markdown',
        ...combatMenu(fight)
    });
}

module.exports = {
    handleHunt,
    handleAttack,
    handleSkill,
    handleSoul,
    handleFlee,
    activeFights
};