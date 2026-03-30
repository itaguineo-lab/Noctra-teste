const { getPlayer, savePlayer } = require('../core/player/playerService');
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
    } catch (err) {
        console.log('editMessageText falhou, usando reply:', err.message);
        await ctx.reply(text, options);
    }
}

async function finishFight(ctx, fight) {
    const player = getPlayer(ctx.from.id);
    
    if (fight.status === 'win') {
        const rewards = fight.rewards || { xp: 0, gold: 0 };
        player.xp += rewards.xp || 0;
        player.gold = (player.gold || 0) + (rewards.gold || 0);
        addXp(player, 0);
        player.hp = fight.player.hp;
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        
        await safeEdit(ctx,
            `🏆 *VITÓRIA!*\n\n📜 ${fight.logs.slice(-3).join('\n')}\n\n✨ +${rewards.xp} XP\n💰 +${rewards.gold} Ouro`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
        return;
    }
    
    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        await safeEdit(ctx,
            `💀 *DERROTA...*\n\n${fight.logs.slice(-3).join('\n')}\n\nVocê reviveu com 25% de HP.`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
        return;
    }
    
    if (fight.status === 'fled') {
        player.hp = fight.player.hp;
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        await safeEdit(ctx,
            `🏃 *FUGA*\n\n${fight.logs.slice(-3).join('\n')}`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
        return;
    }
}

async function handleHunt(ctx) {
    try {
        const player = getPlayer(ctx.from.id);
        if (!player) {
            return ctx.reply('❌ Perfil não encontrado.');
        }
        
        if (activeFights.has(ctx.from.id)) {
            const fight = activeFights.get(ctx.from.id);
            await safeEdit(ctx, renderFightText(fight), {
                parse_mode: 'Markdown',
                ...combatMenu(fight)
            });
            return;
        }
        
        const mapId = player.currentMap || 'clareira_sombria';
        const enemy = getRandomEnemy(mapId, player.level);
        if (!enemy) {
            return ctx.reply('❌ Nenhum inimigo encontrado neste local.');
        }
        
        const fight = createFight(player, enemy);
        activeFights.set(ctx.from.id, fight);
        
        await ctx.reply(renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('Erro em handleHunt:', err);
        await ctx.reply('❌ Erro ao iniciar combate. Tente novamente.');
    }
}

async function handleAttack(ctx) {
    try {
        await ctx.answerCbQuery(); // feedback imediato
        const fight = activeFights.get(ctx.from.id);
        if (!fight) {
            return;
        }
        
        processPlayerTurn(fight, false);
        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }
        if (fight.status !== 'ongoing') {
            await finishFight(ctx, fight);
            return;
        }
        
        await safeEdit(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('Erro em handleAttack:', err);
        await ctx.answerCbQuery('Erro no ataque. Tente novamente.');
    }
}

async function handleSkill(ctx) {
    try {
        await ctx.answerCbQuery();
        const fight = activeFights.get(ctx.from.id);
        if (!fight) return;
        
        processPlayerTurn(fight, true);
        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }
        if (fight.status !== 'ongoing') {
            await finishFight(ctx, fight);
            return;
        }
        
        await safeEdit(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('Erro em handleSkill:', err);
        await ctx.answerCbQuery('Erro ao usar habilidade.');
    }
}

async function handleSoul(ctx) {
    try {
        await ctx.answerCbQuery();
        const fight = activeFights.get(ctx.from.id);
        if (!fight) return;
        
        useSoul(fight, 0);
        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }
        if (fight.status !== 'ongoing') {
            await finishFight(ctx, fight);
            return;
        }
        
        await safeEdit(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('Erro em handleSoul:', err);
        await ctx.answerCbQuery('Erro ao usar alma.');
    }
}

async function handleFlee(ctx) {
    try {
        await ctx.answerCbQuery();
        const fight = activeFights.get(ctx.from.id);
        if (!fight) return;
        
        attemptFlee(fight);
        if (fight.status !== 'ongoing') {
            await finishFight(ctx, fight);
            return;
        }
        
        await safeEdit(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('Erro em handleFlee:', err);
        await ctx.answerCbQuery('Erro ao fugir.');
    }
}

module.exports = {
    handleHunt,
    handleAttack,
    handleSkill,
    handleSoul,
    handleFlee,
    activeFights
};