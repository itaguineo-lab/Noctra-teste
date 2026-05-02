const { Markup } = require('telegraf');

function combatMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🗡️ Atacar', 'combat_attack'),
            Markup.button.callback('🧪 Consumíveis', 'combat_consumables')
        ],
        [
            Markup.button.callback('💀 Almas', 'combat_soul_menu'),
            Markup.button.callback('🏃 Fugir', 'combat_flee')
        ]
    ]);
}

function cooperativeCombatMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🗡️ Atacar', 'combat_attack'),
            Markup.button.callback('🛡️ Defender', 'combat_defend')
        ],
        [
            Markup.button.callback('💀 Almas', 'combat_soul_menu'),
            Markup.button.callback('🧪 Consumíveis', 'combat_consumables')
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

    if (soul.fallbackEquipped) return `${emoji} Slot ${index + 1} • Alma equipada`;
    if (effectType === 'passive') return `${emoji} Slot ${index + 1} • Passiva`;
    if (cooldown > 0) return `⏳ Slot ${index + 1} • ${cooldown}t`;

    return `${emoji} Slot ${index + 1} • ${name}`;
}

function buildFallbackEquippedSoul(index) {
    return {
        id: `fallback_equipped_soul_${index + 1}`,
        name: `Alma equipada ${index + 1}`,
        emoji: '💀',
        fallbackEquipped: true,
        effect: {
            type: 'active'
        }
    };
}

function resolveSoulMenuSlots(fight = null) {
    const hasFightSouls = Array.isArray(fight?.player?.souls);

    if (hasFightSouls) {
        return fight.player.souls.slice(0, 2);
    }

    /*
    Defesa de UX:
    O handler de combate atualmente valida as almas equipadas no player,
    mas abre o menu chamando soulChoiceMenu() sem passar a fight ativa.
    Sem fallback, o menu mostra "Slot vazio" mesmo quando a alma funciona
    ao clicar no callback combat_soul_0/1, porque o motor usa a fight salva.

    Este fallback impede a interface de mentir para o jogador enquanto
    preserva os callbacks existentes. O ajuste ideal futuro é o handler
    chamar soulChoiceMenu(stored.fight).
    */
    return [buildFallbackEquippedSoul(0), buildFallbackEquippedSoul(1)];
}

function resolveSoulCooldowns(fight = null) {
    if (Array.isArray(fight?.player?.soulCooldowns)) {
        return fight.player.soulCooldowns.slice(0, 2);
    }

    return [0, 0];
}

function soulChoiceMenu(fight = null) {
    const souls = resolveSoulMenuSlots(fight);
    const cooldowns = resolveSoulCooldowns(fight);

    while (souls.length < 2) souls.push(null);
    while (cooldowns.length < 2) cooldowns.push(0);

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
    cooperativeCombatMenu,
    soulChoiceMenu,
    getSoulButtonLabel,
    buildFallbackEquippedSoul,
    resolveSoulMenuSlots,
    resolveSoulCooldowns,
    postCombatMenu,
    postLootItemMenu
};
