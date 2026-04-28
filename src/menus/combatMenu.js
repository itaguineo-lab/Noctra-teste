const { Markup } = require('telegraf');

function combatMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🗡️ Atacar', 'combat_attack'),
            Markup.button.callback('🛡️ Defender', 'combat_defend')
        ],
        [
            Markup.button.callback('💀 Almas', 'combat_soul_menu'),
            Markup.button.callback('🧪 Itens', 'combat_consumables')
        ],
        [
            Markup.button.callback('🏃 Fugir', 'combat_flee')
        ]
    ]);
}

function getSoulButtonLabel(soul, index, cooldown = 0) {
    if (!soul) return `⬜ Slot ${index + 1} vazio`;

    const name = soul.name || `Alma ${index + 1}`;
    const emoji = soul.emoji || '💀';
    const effectType = soul.effect?.type || 'special';

    if (effectType === 'passive') return `${emoji} Slot ${index + 1} • Passiva`;
    if (cooldown > 0) return `⏳ Slot ${index + 1} • ${cooldown}t`;

    return `${emoji} Slot ${index + 1} • ${name}`;
}

function soulChoiceMenu(fight = null) {
    const souls = Array.isArray(fight?.player?.souls) ? fight.player.souls : [null, null];
    const cooldowns = Array.isArray(fight?.player?.soulCooldowns) ? fight.player.soulCooldowns : [0, 0];

    return Markup.inlineKeyboard([
        [
            Markup.button.callback(getSoulButtonLabel(souls[0], 0, cooldowns[0]), 'combat_soul_0')
        ],
        [
            Markup.button.callback(getSoulButtonLabel(souls[1], 1, cooldowns[1]), 'combat_soul_1')
        ],
        [
            Markup.button.callback('◀️ Voltar', 'combat_back')
        ]
    ]);
}

function postCombatMenu(options = {}) {
    const rows = [];

    if (options.droppedItemKey) {
        rows.push([
            Markup.button.callback('🎁 Ver item dropado', `combat_loot:${options.droppedItemKey}`)
        ]);
    }

    rows.push([
        Markup.button.callback('⚔️ Caçar novamente', 'hunt'),
        Markup.button.callback('🏰 Masmorra', 'dungeon')
    ]);

    rows.push([
        Markup.button.callback('🎒 Inventário', 'inventory'),
        Markup.button.callback('🏠 Menu', 'menu')
    ]);

    return Markup.inlineKeyboard(rows);
}

function postLootItemMenu(itemKey) {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Equipar agora', `combat_loot_equip:${itemKey}`)
        ],
        [
            Markup.button.callback('⚔️ Caçar novamente', 'hunt'),
            Markup.button.callback('🎒 Inventário', 'inventory')
        ],
        [
            Markup.button.callback('💰 Vender itens', 'shop_sell'),
            Markup.button.callback('🏠 Menu', 'menu')
        ]
    ]);
}

module.exports = {
    combatMenu,
    soulChoiceMenu,
    getSoulButtonLabel,
    postCombatMenu,
    postLootItemMenu
};
