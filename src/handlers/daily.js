const { getPlayer, savePlayer } = require('../core/player/playerService');
const { mainMenu } = require('../menus/mainMenu');

function resetDailyMissionsIfNeeded(player) {
    const today = new Date().toDateString();
    if (player.lastDailyReset !== today) {
        player.lastDailyReset = today;
        player.dailyMissions = {
            kills: 0,
            energySpent: 0,
            dailyChestCollected: false,
            rewardsClaimed: false  // NOVO CAMPO
        };
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (player.lastLoginDate !== yesterday.toDateString()) {
            player.streak = 0;
        }
        player.lastLoginDate = today;
        savePlayer(player.id, player);
    }
}

function giveDailyChest(player) {
    const today = new Date().toDateString();
    if (player.lastDailyChest === today) return null;
    if (player.dailyMissions.dailyChestCollected) return null;

    player.lastDailyChest = today;
    player.dailyMissions.dailyChestCollected = true;

    let bonusGold = 100 + player.level * 20;
    let bonusKeys = 1;
    let bonusStreak = 0;

    player.streak = (player.streak || 0) + 1;
    if (player.streak >= 7) {
        bonusGold += 200;
        bonusKeys += 1;
        bonusStreak = 7;
    } else if (player.streak >= 3) {
        bonusGold += 100;
        bonusStreak = 3;
    }

    player.gold = (player.gold || 0) + bonusGold;
    player.keys = (player.keys || 0) + bonusKeys;

    return { gold: bonusGold, keys: bonusKeys, streak: player.streak, bonusStreak };
}

function getMissionRewards(player) {
    const missions = player.dailyMissions;
    const rewards = { gold: 0, keys: 0, xp: 0 };
    if (missions.kills >= 5) rewards.gold += 50;
    if (missions.kills >= 10) rewards.gold += 100;
    if (missions.energySpent >= 10) rewards.keys += 1;
    if (missions.dailyChestCollected) rewards.xp += 30;
    return rewards;
}

function applyMissionRewards(player) {
    if (player.dailyMissions.rewardsClaimed) return { gold: 0, keys: 0, xp: 0 };
    
    const rewards = getMissionRewards(player);
    if (rewards.gold > 0 || rewards.keys > 0 || rewards.xp > 0) {
        player.gold += rewards.gold;
        player.keys += rewards.keys;
        player.xp += rewards.xp;
        player.dailyMissions.rewardsClaimed = true;
        savePlayer(player.id, player);
    }
    return rewards;
}

async function safeEdit(ctx, text, options = {}) {
    try {
        await ctx.editMessageText(text, options);
    } catch {
        await ctx.reply(text, options);
    }
}

async function handleDaily(ctx) {
    try {
        const player = getPlayer(ctx.from.id, ctx.from.first_name);
        resetDailyMissionsIfNeeded(player);

        const chestReward = giveDailyChest(player);
        const missionRewards = applyMissionRewards(player);

        let msg = `╔══════════════════════════════════╗\n`;
        msg += `║            🎁 *BAÚ DIÁRIO*            ║\n`;
        msg += `╠══════════════════════════════════╣\n`;

        if (chestReward) {
            msg += `║ 📦 Você abriu o baú e encontrou:\n`;
            msg += `║ 💰 +${chestReward.gold} ouro\n`;
            msg += `║ 🗝️ +${chestReward.keys} chave\n`;
            if (chestReward.bonusStreak) {
                msg += `║ 🔥 Bônus de streak ${chestReward.streak} dias!\n`;
            }
        } else {
            msg += `║ ❌ Você já pegou o baú hoje.\n`;
        }

        msg += `╠══════════════════════════════════╣\n`;
        msg += `║ *📋 MISSÕES DIÁRIAS*\n`;
        msg += `║ 🗡️ Matar 5 inimigos: ${player.dailyMissions.kills}/5\n`;
        msg += `║ 🗡️ Matar 10 inimigos: ${player.dailyMissions.kills}/10\n`;
        msg += `║ ⚡ Gastar 10 energia: ${player.dailyMissions.energySpent}/10\n`;
        msg += `║ 🎁 Abrir baú diário: ${player.dailyMissions.dailyChestCollected ? '✅' : '❌'}\n`;
        msg += `╠══════════════════════════════════╣\n`;
        msg += `║ *🏆 RECOMPENSAS RECEBIDAS*\n`;
        if (player.dailyMissions.rewardsClaimed) {
            msg += `║ 💰 +${missionRewards.gold} ouro\n`;
            msg += `║ 🗝️ +${missionRewards.keys} chave\n`;
            msg += `║ ✨ +${missionRewards.xp} XP\n`;
        } else {
            msg += `║ ⏳ Complete as missões para receber!\n`;
        }
        msg += `╠══════════════════════════════════╣\n`;
        msg += `║ 🔥 *Streak atual:* ${player.streak || 0} dias\n`;
        msg += `╚══════════════════════════════════╝`;

        await safeEdit(ctx, msg, { parse_mode: 'Markdown', ...mainMenu() });
    } catch (error) {
        console.error('Erro daily:', error);
        await ctx.answerCbQuery('Erro ao abrir baú.');
    }
}

function checkMissionProgress(player, type, amount = 1) {
    if (!player.dailyMissions) return;
    if (type === 'kill') player.dailyMissions.kills += amount;
    if (type === 'energy') player.dailyMissions.energySpent += amount;
    // Reset flag de recompensas se as missões mudarem (opcional)
    if (type === 'kill' || type === 'energy') {
        player.dailyMissions.rewardsClaimed = false;
    }
    savePlayer(player.id, player);
}

module.exports = { handleDaily, checkMissionProgress };