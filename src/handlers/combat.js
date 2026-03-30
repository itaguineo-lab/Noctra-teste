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

async function editMessage(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
        console.log('✅ Mensagem editada com sucesso');
    } catch (err) {
        console.error('❌ Falha ao editar mensagem:', err.message);
        // Fallback: envia uma nova mensagem
        await ctx.reply(text, options);
    }
}

async function finishFight(ctx, fight) {
    console.log(`🏁 Finalizando combate para ${ctx.from.id}, status: ${fight.status}`);
    const player = getPlayer(ctx.from.id);
    
    if (fight.status === 'win') {
        const rewards = fight.rewards || { xp: 0, gold: 0 };
        player.xp += rewards.xp || 0;
        player.gold = (player.gold || 0) + (rewards.gold || 0);
        addXp(player, 0);
        player.hp = fight.player.hp;
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        
        await editMessage(ctx,
            `🏆 *VITÓRIA!*\n\n📜 ${fight.logs.slice(-3).join('\n')}\n\n✨ +${rewards.xp} XP\n💰 +${rewards.gold} Ouro`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
        return;
    }
    
    if (fight.status === 'loss') {
        player.hp = Math.max(1, Math.floor(player.maxHp * 0.25));
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        await editMessage(ctx,
            `💀 *DERROTA...*\n\n${fight.logs.slice(-3).join('\n')}\n\nVocê reviveu com 25% de HP.`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
        return;
    }
    
    if (fight.status === 'fled') {
        player.hp = fight.player.hp;
        savePlayer(ctx.from.id, player);
        activeFights.delete(ctx.from.id);
        await editMessage(ctx,
            `🏃 *FUGA*\n\n${fight.logs.slice(-3).join('\n')}`,
            { parse_mode: 'Markdown', ...postCombatMenu() }
        );
        return;
    }
}

async function handleHunt(ctx) {
    console.log(`🔍 handleHunt chamado por ${ctx.from.id}`);
    try {
        const player = getPlayer(ctx.from.id);
        if (!player) {
            return ctx.reply('❌ Perfil não encontrado.');
        }
        
        if (activeFights.has(ctx.from.id)) {
            const fight = activeFights.get(ctx.from.id);
            console.log(`⚔️ Combate já ativo para ${ctx.from.id}, reexibindo`);
            await editMessage(ctx, renderFightText(fight), {
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
        console.log(`🎮 Novo combate criado para ${ctx.from.id} contra ${enemy.name}`);
        
        await editMessage(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('Erro em handleHunt:', err);
        await ctx.reply('❌ Erro ao iniciar combate. Tente novamente.');
    }
}

async function handleAttack(ctx) {
    console.log(`⚔️ handleAttack chamado por ${ctx.from.id}`);
    try {
        await ctx.answerCbQuery();
        const fight = activeFights.get(ctx.from.id);
        if (!fight) {
            console.log(`❌ Nenhum combate ativo para ${ctx.from.id}`);
            await ctx.answerCbQuery('Nenhum combate ativo.', true);
            return;
        }
        
        console.log(`🔨 Processando ataque para ${ctx.from.id}, status atual: ${fight.status}`);
        processPlayerTurn(fight, false);
        console.log(`📊 Após ataque, status: ${fight.status}, HP inimigo: ${fight.enemy.hp}`);
        
        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
            console.log(`📊 Após turno inimigo, HP jogador: ${fight.player.hp}`);
        }
        
        if (fight.status !== 'ongoing') {
            await finishFight(ctx, fight);
            return;
        }
        
        await editMessage(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('❌ Erro em handleAttack:', err);
        await ctx.answerCbQuery('Erro no ataque. Tente novamente.');
    }
}

async function handleSkill(ctx) {
    console.log(`✨ handleSkill chamado por ${ctx.from.id}`);
    try {
        await ctx.answerCbQuery();
        const fight = activeFights.get(ctx.from.id);
        if (!fight) {
            console.log(`❌ Nenhum combate ativo para ${ctx.from.id}`);
            return;
        }
        
        processPlayerTurn(fight, true);
        if (fight.status === 'ongoing') {
            processEnemyTurn(fight);
        }
        if (fight.status !== 'ongoing') {
            await finishFight(ctx, fight);
            return;
        }
        
        await editMessage(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('❌ Erro em handleSkill:', err);
        await ctx.answerCbQuery('Erro ao usar habilidade.');
    }
}

async function handleSoul(ctx) {
    console.log(`💀 handleSoul chamado por ${ctx.from.id}`);
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
        
        await editMessage(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('❌ Erro em handleSoul:', err);
        await ctx.answerCbQuery('Erro ao usar alma.');
    }
}

async function handleFlee(ctx) {
    console.log(`🏃 handleFlee chamado por ${ctx.from.id}`);
    try {
        await ctx.answerCbQuery();
        const fight = activeFights.get(ctx.from.id);
        if (!fight) return;
        
        attemptFlee(fight);
        if (fight.status !== 'ongoing') {
            await finishFight(ctx, fight);
            return;
        }
        
        await editMessage(ctx, renderFightText(fight), {
            parse_mode: 'Markdown',
            ...combatMenu(fight)
        });
    } catch (err) {
        console.error('❌ Erro em handleFlee:', err);
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