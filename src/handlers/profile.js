const { getPlayer } = require('../core/player/playerService');
const { getXpToNextLevel } = require('../core/player/progression');
const { getMapById, maps } = require('../core/world/maps');
const { Markup } = require('telegraf');

const {
    progressBar,
    formatNumber
} = require('../utils/formatters');

const {
    getRarityEmoji
} = require('../core/player/souls');

const {
    getActiveCosmetic,
    ensureCosmeticsState
} = require('../core/player/cosmetics');

const {
    getTimeToNextEnergy,
    getTimeToFullEnergy,
    formatEnergyTime
} = require('../services/energyService');

const { navigateScreen, safeAnswer } = require('../utils/uiNavigator');
const assets = require('../data/assets');

const PROFILE_KEYBOARD = Markup.inlineKeyboard([
    [
        Markup.button.callback('🎒 Inventário', 'inventory'),
        Markup.button.callback('🗺️ Viajar', 'travel')
    ],
    [
        Markup.button.callback('📝 Renomear', 'rename_help'),
        Markup.button.callback('🔄 Classe', 'class_help')
    ],
    [
        Markup.button.callback('◀️ Voltar', 'menu')
    ]
]);

/*
=================================
HELPERS
=================================
*/

function getPlayerMap(player) {
    return getMapById(player.currentMap) || maps[0];
}

function formatClassName(className = 'guerreiro') {
    const map = {
        guerreiro: 'Guerreiro',
        arqueiro: 'Arqueiro',
        mago: 'Mago'
    };
    return map[className] || className;
}

function getPlayerPower(player) {
    const atk = Number(player.atk || 0);
    const def = Number(player.def || 0);
    const hp = Number(player.maxHp || 0);
    const crit = Number(player.crit || 0);

    return Math.max(1, Math.round((atk * 2) + (def * 1.5) + (hp * 0.5) + (crit * 3)));
}

function detectBuild(player) {
    const weapon = player.equipment?.weapon;
    const shield = player.equipment?.shield;
    const weaponName = weapon?.name?.toLowerCase() || '';
    const hasShield = !!shield;

    if (player.class === 'guerreiro') {
        if (weaponName.includes('machado') && !hasShield) return '⚔️ Berserker';
        if (weaponName.includes('espada') && hasShield) return '🛡️ Guardião';
        if ((player.def || 0) >= 35) return '🛡️ Guardião';
        if ((player.atk || 0) >= 40) return '⚔️ Executor';
        return '⚔️ Guerreiro Base';
    }

    if (player.class === 'arqueiro') {
        if (weaponName.includes('arco')) return '🏹 Caçador';
        if (weaponName.includes('lança') && hasShield) return '🛡️ Lanceiro';
        if ((player.crit || 0) >= 20) return '🎯 Sniper';
        return '🏹 Arqueiro Base';
    }

    if (player.class === 'mago') {
        if (weaponName.includes('cajado')) return '🔥 Ofensivo';
        if (weaponName.includes('varinha') || weaponName.includes('orbe')) return '💚 Curandeiro';
        if ((player.atk || 0) >= 35) return '🔥 Ofensivo';
        if ((player.maxHp || 0) >= 140) return '💚 Curandeiro';
        return '✨ Balanceado';
    }

    return '⚪ Build padrão';
}

function formatEquipmentLine(slot, item) {
    if (!item) return `${slot}: —`;

    const stats = [];
    if (item.atk) stats.push(`⚔️+${item.atk}`);
    if (item.def) stats.push(`🛡️+${item.def}`);
    if (item.hp) stats.push(`❤️+${item.hp}`);
    if (item.crit) stats.push(`💥+${item.crit}%`);

    return `${slot}: ${item.emoji || '⚪'} ${item.name}\n   ${stats.join(' • ')}`;
}

function buildSoulsText(player) {
    const souls = player.soulsEquipped || [null, null];
    if (!souls.some(Boolean)) return '⬜ Nenhuma alma equipada';

    return souls.map((soul, index) => {
        if (!soul) return `⬜ Slot ${index + 1} vazio`;
        
        const bonuses = [];
        if (soul.effect?.type === 'passive') {
            if (soul.effect.atkBonus) bonuses.push(`⚔️+${soul.effect.atkBonus}`);
            if (soul.effect.defBonus) bonuses.push(`🛡️+${soul.effect.defBonus}`);
            if (soul.effect.hpBonus) bonuses.push(`❤️+${soul.effect.hpBonus}`);
            if (soul.effect.critBonus) bonuses.push(`💥+${soul.effect.critBonus}%`);
        } else if (soul.effect?.type === 'damage') {
            bonuses.push(`💥 Ativa (Dano)`);
        } else if (soul.effect?.type === 'heal') {
            bonuses.push(`💚 Ativa (Cura)`);
        } else if (soul.effect?.type === 'lifesteal') {
            bonuses.push(`🧛 Ativa (Lifesteal)`);
        }

        const bonusText = bonuses.length > 0 ? `\n   Bônus: ${bonuses.join(' • ')}` : '';
        return `${getRarityEmoji(soul.rarity)} ${soul.name} • ${soul.rarity}${bonusText}`;
    }).join('\n');
}

function toTimestamp(value) {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return parsed;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function buildBuffsText(player) {
    if (!Array.isArray(player.buffs) || player.buffs.length === 0) {
        return '—';
    }

    const now = Date.now();
    const activeBuffs = player.buffs.filter(buff => {
        const expiresAt = toTimestamp(buff.expiresAt);
        if (!expiresAt) return true;
        return expiresAt > now;
    });

    if (activeBuffs.length === 0) return '—';

    return activeBuffs.map(buff => {
        const parts = [];
        if (buff.atk) parts.push(`⚔️+${buff.atk}`);
        if (buff.def) parts.push(`🛡️+${buff.def}`);
        if (buff.hp) parts.push(`❤️+${buff.hp}`);
        if (buff.crit) parts.push(`💥+${buff.crit}%`);

        let suffix = '';
        const expiresAt = toTimestamp(buff.expiresAt);
        if (expiresAt) {
            suffix = ` • ⏳ ${formatEnergyTime(Math.max(0, expiresAt - now))}`;
        }

        return `• ${parts.join(' ')}${suffix}`;
    }).join('\n');
}

function getEnergySummary(player) {
    const nextEnergy = getTimeToNextEnergy(player);
    const fullEnergy = getTimeToFullEnergy(player);

    return {
        nextText: nextEnergy > 0 ? formatEnergyTime(nextEnergy) : 'Cheio',
        fullText: fullEnergy > 0 ? formatEnergyTime(fullEnergy) : 'Cheio'
    };
}

function renderProfileCaption(player) {
    ensureCosmeticsState(player);

    const xpNeeded = getXpToNextLevel(player.level);
    const map = getPlayerMap(player);
    const buildName = detectBuild(player);
    const power = getPlayerPower(player);

    const activeTitle = getActiveCosmetic(player, 'title');
    const activeAura = getActiveCosmetic(player, 'aura');
    const activeBadge = getActiveCosmetic(player, 'badge');

    const xpBar = progressBar(player.xp, xpNeeded, 10, '🟨', '⬛');
    const hpBar = progressBar(player.hp, player.maxHp, 10, '🟥', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 10, '🟦', '⬛');
    const energySummary = getEnergySummary(player);

    const eq = player.equipment || {};

    let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *PERFIL DO HERÓI*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `🌑 *${player.name}*\n`;
    msg += `🏹 ${formatClassName(player.class)}\n`;
    if (activeTitle) msg += `🏷️ ${activeTitle.name}\n`;
    msg += `🧠 ${buildName}\n`;
    msg += `⭐ Nível ${player.level}\n`;
    msg += `🔥 Poder ${power}\n\n`;

    msg += `✨ XP ${formatNumber(player.xp)} / ${formatNumber(xpNeeded)}\n`;
    msg += `[${xpBar}]\n\n`;

    msg += `❤️ HP ${player.hp}/${player.maxHp}\n`;
    msg += `[${hpBar}]\n\n`;

    msg += `⚡ Energia ${player.energy}/${player.maxEnergy} • Próxima em: ${energySummary.nextText}\n`;
    msg += `🔋 Energia cheia em: ${energySummary.fullText}\n`;
    msg += `[${energyBar}]\n\n`;

    msg += `⚔️ ATK ${player.atk}\n`;
    msg += `🛡️ DEF ${player.def}\n`;
    msg += `💥 CRIT ${player.crit}%\n`;
    msg += `🗺️ ${map.emoji} ${map.name}\n\n`;

    msg += `🎒 *Equipamentos*\n`;
    msg += `${formatEquipmentLine('⚔️ Arma', eq.weapon)}\n`;
    msg += `${formatEquipmentLine('🛡️ Escudo', eq.shield)}\n`;
    msg += `${formatEquipmentLine('🥋 Armadura', eq.armor)}\n`;
    msg += `${formatEquipmentLine('💍 Anel', eq.ring)}\n`;
    msg += `${formatEquipmentLine('📿 Amuleto', eq.necklace)}\n`;
    msg += `${formatEquipmentLine('👢 Botas', eq.boots)}\n\n`;

    msg += `💀 *Almas*\n`;
    msg += `${buildSoulsText(player)}\n\n`;

    msg += `✨ *Buffs Ativos*\n`;
    msg += `${buildBuffsText(player)}\n\n`;

    msg += `🎨 *Cosméticos Ativos*\n`;
    msg += `✨ Aura: ${activeAura ? activeAura.name : '—'}\n`;
    msg += `🎖️ Emblema: ${activeBadge ? activeBadge.name : '—'}\n\n`;

    msg += `☠️ Abates: ${player.totalKills || 0}`;

    if (player.activeFight?.payload) {
        msg += `\n⚔️ Em combate: Sim`;
    }

    return msg;
}

/*
=================================
PROFILE HANDLER
=================================
*/

async function handleProfile(ctx) {
    await safeAnswer(ctx);

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return safeAnswer(ctx, '❌ Jogador não encontrado. Use /start.', { show_alert: true });
    }

    const caption = renderProfileCaption(player);
    const profileImage = assets?.profile?.[player.class];

    return navigateScreen(ctx, {
        text: caption,
        media: profileImage || null,
        options: PROFILE_KEYBOARD
    });
}

module.exports = {
    handleProfile
};
