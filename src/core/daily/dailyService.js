const {
    applyGoldReward,
    applyXpReward,
    applyKeyReward,
    normalizePlayerForSave
} = require('../player/playerMutations');

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function createDailyMissionPool(player) {
    const level = player.level || 1;

    return [
        {
            id: 'kill_5',
            title: 'Mate 5 inimigos',
            type: 'kill',
            target: 5,
            progress: 0,
            completed: false,
            reward: {
                gold: 120 + level * 10,
                xp: 40 + level * 5
            }
        },
        {
            id: 'use_1_consumable',
            title: 'Use 1 consumível',
            type: 'use_consumable',
            target: 1,
            progress: 0,
            completed: false,
            reward: {
                gold: 80 + level * 8,
                xp: 25 + level * 4
            }
        },
        {
            id: 'win_1_arena',
            title: 'Vença 1 batalha na arena',
            type: 'arena_win',
            target: 1,
            progress: 0,
            completed: false,
            reward: {
                gold: 150 + level * 12,
                xp: 55 + level * 6,
                glorias: 1
            }
        },
        {
            id: 'complete_1_dungeon',
            title: 'Complete 1 dungeon',
            type: 'dungeon_complete',
            target: 1,
            progress: 0,
            completed: false,
            reward: {
                gold: 200 + level * 15,
                xp: 70 + level * 8,
                keys: 1
            }
        }
    ];
}

function ensureDailyMissionState(player) {
    player.dailyMissions ??= {
        dateKey: null,
        missions: [],
        claimedAll: false
    };

    const today = getTodayKey();

    if (player.dailyMissions.dateKey !== today) {
        player.dailyMissions = {
            dateKey: today,
            missions: createDailyMissionPool(player),
            claimedAll: false
        };
    }

    return player.dailyMissions;
}

function getMissionByType(player, type) {
    ensureDailyMissionState(player);
    return player.dailyMissions.missions.find(mission => mission.type === type) || null;
}

function updateMissionProgress(player, type, amount = 1) {
    ensureDailyMissionState(player);

    const mission = getMissionByType(player, type);
    if (!mission) return false;
    if (mission.completed) return false;

    mission.progress = Math.min(mission.target, mission.progress + amount);

    if (mission.progress >= mission.target) {
        mission.completed = true;
    }

    normalizePlayerForSave(player);
    return true;
}

function areAllMissionsCompleted(player) {
    ensureDailyMissionState(player);
    return player.dailyMissions.missions.length > 0 &&
        player.dailyMissions.missions.every(mission => mission.completed);
}

function claimAllMissionRewards(player) {
    ensureDailyMissionState(player);

    if (player.dailyMissions.claimedAll) {
        return {
            success: false,
            message: '❌ Recompensas das missões já resgatadas hoje.'
        };
    }

    if (!areAllMissionsCompleted(player)) {
        return {
            success: false,
            message: '❌ Complete todas as missões antes de resgatar.'
        };
    }

    let totalGold = 0;
    let totalXp = 0;
    let totalGlorias = 0;
    let totalKeys = 0;

    for (const mission of player.dailyMissions.missions) {
        const reward = mission.reward || {};

        if (reward.gold) {
            applyGoldReward(player, reward.gold);
            totalGold += reward.gold;
        }

        if (reward.xp) {
            applyXpReward(player, reward.xp);
            totalXp += reward.xp;
        }

        if (reward.glorias) {
            player.glorias = (player.glorias || 0) + reward.glorias;
            totalGlorias += reward.glorias;
        }

        if (reward.keys) {
            applyKeyReward(player, reward.keys);
            totalKeys += reward.keys;
        }
    }

    player.dailyMissions.claimedAll = true;
    normalizePlayerForSave(player);

    return {
        success: true,
        rewards: {
            gold: totalGold,
            xp: totalXp,
            glorias: totalGlorias,
            keys: totalKeys
        }
    };
}

function renderDailyMissionsText(player) {
    ensureDailyMissionState(player);

    let text = `╔══════════════════════════════╗\n`;
    text += `║        📜 *MISSÕES DIÁRIAS*       ║\n`;
    text += `╠══════════════════════════════╣\n`;

    for (const mission of player.dailyMissions.missions) {
        const status = mission.completed ? '✅' : '⬜';
        text += `║ ${status} ${mission.title}\n`;
        text += `║    ${mission.progress}/${mission.target}\n`;

        const rewardParts = [];
        if (mission.reward?.gold) rewardParts.push(`💰 ${mission.reward.gold}`);
        if (mission.reward?.xp) rewardParts.push(`✨ ${mission.reward.xp}`);
        if (mission.reward?.glorias) rewardParts.push(`🏅 ${mission.reward.glorias}`);
        if (mission.reward?.keys) rewardParts.push(`🗝️ ${mission.reward.keys}`);

        if (rewardParts.length) {
            text += `║    ${rewardParts.join(' | ')}\n`;
        }

        text += `║\n`;
    }

    if (player.dailyMissions.claimedAll) {
        text += `║ 🎁 Recompensas já resgatadas hoje\n`;
    } else if (areAllMissionsCompleted(player)) {
        text += `║ 🎁 Todas concluídas! Resgate disponível\n`;
    } else {
        text += `║ Continue jogando para completar todas\n`;
    }

    text += `╚══════════════════════════════╝`;

    return text;
}

module.exports = {
    getTodayKey,
    ensureDailyMissionState,
    updateMissionProgress,
    claimAllMissionRewards,
    renderDailyMissionsText,
    areAllMissionsCompleted
};