const baseCombat = require('./combat');

const { Markup } = require('telegraf');
const { getPlayer, savePlayer } = require('../core/player/playerService');
const { processVictory } = require('../services/rewardService');
const {
    normalizeInventoryItem,
    normalizePlayerForSave,
    applyEquipmentChange,
    consumeConsumable,
    restoreEnergy
} = require('../core/player/playerMutations');
const {
    applyDeathXpPenalty,
    getXpToNextLevel
} = require('../core/player/progression');
const {
    getItemKey,
    findInventoryItemByKey
} = require('../core/player/equipmentService');
const {
    calcItemPower
} = require('../core/player/itemLorePresenter');
const {
    combatMenu,
    postCombatMenu
} = require('../menus/combatMenu');
const {
    tryDeleteCurrentMessage
} = require('../utils/uiNavigator');
const {
    progressBar
} = require('../utils/formatters');
const {
    getStoredFight,
    removeStoredFight,
    runAttack,
    runSoul,
    runConsumableTurn,
    persistFightState,
    persistFightMessage
} = require('../core/combat/fightService');
const {
    updateMissionProgress
} = require('../core/daily/dailyService');
const {
    recordCombatResult,
    recordConsumableUsed
} = require('../core/metrics/metricsService');
const { BALANCE } = require('../data/balance');
const assets = require('../data/assets');

function cleanText(value = '') {
    return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

async function deleteCurrentCallbackMessage(ctx) {
    return tryDeleteCurrentMessage(ctx).catch(() => false);
}

async function replyClean(ctx, text, options = {}) {
    await deleteCurrentCallbackMessage(ctx);
    return ctx.reply(text, options);
}

function getRealSlot(item = {}) {
    const slot = String(item.slot || '');
    const validSlots = ['weapon', 'shield', 'armor', 'necklace', 'ring', 'boots'];

    for (const validSlot of validSlots) {
        if (slot.startsWith(validSlot)) return validSlot;
    }

    return slot;
}

function getOffhandTypeLabel(type = '') {
    const labels = {
        shield: 'Escudo',
        quiver: 'Aljava',
        orb: 'Orbe'
    };

    return labels[String(type || '').toLowerCase()] || 'Mão Secundária';
}

function getSlotLabel(slot, item = null) {
    if (slot === 'shield') {
        if (item?.offhandType) return getOffhandTypeLabel(item.offhandType);
        return 'Mão Secundária';
    }

    const labels = {
        weapon: 'Arma',
        armor: 'Armadura',
        necklace: 'Colar',
        ring: 'Anel',
        boots: 'Bota'
    };

    return labels[slot] || slot || 'Item';
}

function getSlotIcon(slot, item = null) {
    if (slot === 'shield') {
        if (item?.offhandType === 'quiver') return '🏹';
        if (item?.offhandType === 'orb') return '🔮';
        return '🛡️';
    }

    const icons = {
        weapon: '⚔️',
        armor: '🛡️',
        necklace: '📿',
        ring: '💍',
        boots: '👢'
    };

    return icons[slot] || '📦';
}

function getBuildRuleText(item = {}) {
    const slot = getRealSlot(item);

    if (slot === 'weapon') {
        if (item.weaponStyle === 'two_handed') return 'Usa duas mãos. Remove qualquer mão secundária.';
        if (item.requiredOffhandType) return `Combina com ${getOffhandTypeLabel(item.requiredOffhandType)}.`;
        return 'Pode ser usada sem mão secundária.';
    }

    if (slot === 'shield') {
        if (item.offhandType === 'quiver') return 'Mão secundária para Arcos.';
        if (item.offhandType === 'orb') return 'Mão secundária para Varinhas/Grimórios.';
        if (item.offhandType === 'shield') return 'Mão secundária para Espadas e Lanças.';
        return 'Mão secundária.';
    }

    return 'Item de equipamento.';
}

function getComparisonData(item, player, slot) {
    const equipped = player?.equipment?.[slot];

    if (!equipped) {
        return {
            status: 'Slot vazio',
            detail: 'Nenhum item equipado neste slot.'
        };
    }

    const equippedKey = getItemKey(equipped);
    const itemKey = getItemKey(item);

    if (equippedKey && itemKey && equippedKey === itemKey) {
        return {
            status: 'Equipado agora',
            detail: 'Este item já está equipado.'
        };
    }

    const delta = calcItemPower(item) - calcItemPower(equipped);
    const equippedName = equipped.name || 'item equipado';

    if (delta > 0) {
        return {
            status: `+${delta} poder`,
            detail: `Melhor que ${equippedName}.`
        };
    }

    if (delta < 0) {
        return {
            status: `-${Math.abs(delta)} poder`,
            detail: `Pior que ${equippedName}.`
        };
    }

    return {
        status: 'Mesmo poder',
        detail: `Equivalente a ${equippedName}.`
    };
}

function normalizeKey(value = '') {
    return String(value || '').trim();
}

function findItemByRawIdentity(player, itemKey) {
    const key = normalizeKey(itemKey);
    if (!key) return null;

    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];

    return inventory.find(item => {
        if (!item || typeof item !== 'object') return false;

        return [
            item.id,
            item.instanceId,
            item.legacyBase,
            item._id
        ].some(value => normalizeKey(value) === key);
    }) || null;
}

function getLatestInventoryItem(player) {
    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];

    for (let i = inventory.length - 1; i >= 0; i -= 1) {
        const item = inventory[i];
        const normalized = normalizeInventoryItem(item);
        if (normalized) return item;
    }

    return null;
}

function resolveDroppedLootItem(player, itemKey) {
    if (!player) return null;

    const exact = findInventoryItemByKey(player, itemKey);
    if (exact) return exact;

    const rawMatch = findItemByRawIdentity(player, itemKey);
    if (rawMatch) return rawMatch;

    return null;
}

function resolveDroppedLootAction(player, itemKey, action = 'view') {
    if (itemKey === 'latest') {
        return {
            item: null,
            error: action === 'equip'
                ? 'Esse item não pôde ser identificado. Abra o inventário para equipar.'
                : 'Esse item não pôde ser identificado. Abra o inventário.'
        };
    }

    return {
        item: resolveDroppedLootItem(player, itemKey),
        error: null
    };
}

function buildStatsText(item = {}) {
    const parts = [];

    if (Number(item.atk || 0) > 0) parts.push(`ATK +${item.atk}`);
    if (Number(item.def || 0) > 0) parts.push(`DEF +${item.def}`);
    if (Number(item.hp || 0) > 0) parts.push(`HP +${item.hp}`);
    if (Number(item.crit || 0) > 0) parts.push(`CRIT +${item.crit}%`);

    return parts.length ? parts.join('\n') : 'Sem bônus relevantes.';
}

function buildSafeLootDetail(player, item) {
    const normalizedItem = normalizeInventoryItem(item);
    const slot = getRealSlot(normalizedItem);
    const comparison = getComparisonData(normalizedItem, player, slot);
    const icon = normalizedItem.emoji || getSlotIcon(slot, normalizedItem);

    const lines = [
        '🎁 ITEM DROPADO',
        '',
        `${icon} ${cleanText(normalizedItem.name || 'Item')}`,
        `${cleanText(normalizedItem.rarity || 'Comum')} • Lv.${normalizedItem.level || 1}`,
        `Tipo: ${cleanText(normalizedItem.displayCategory || getSlotLabel(slot, normalizedItem))}`,
        `Build: ${cleanText(getBuildRuleText(normalizedItem))}`,
        '',
        'Atributos:',
        buildStatsText(normalizedItem),
        '',
        `Poder: ${calcItemPower(normalizedItem)}${normalizedItem.powerTier ? ` • ${cleanText(normalizedItem.powerTier)}` : ''}`,
        `Comparação: ${cleanText(comparison.status)}`,
        cleanText(comparison.detail)
    ];

    if (normalizedItem.originMap || normalizedItem.traitLabel || normalizedItem.setName) {
        lines.push('', 'Identidade:');
        if (normalizedItem.originMap) lines.push(`Origem: ${cleanText(normalizedItem.originMap)}`);
        if (normalizedItem.setName) lines.push(`Conjunto: ${cleanText(normalizedItem.setName)}`);
        if (normalizedItem.traitLabel) lines.push(`Traço: ${cleanText(normalizedItem.traitLabel)}`);
    }

    if (normalizedItem.flavor) {
        lines.push('', cleanText(normalizedItem.flavor).slice(0, 400));
    }

    return lines.join('\n').slice(0, 3500);
}

function buildShortItemToken(item) {
    const key = normalizeKey(getItemKey(item));

    if (key && key.length <= 48) return key;

    const instanceId = normalizeKey(item?.instanceId);
    if (instanceId && instanceId.length <= 48) return instanceId;

    const id = normalizeKey(item?.id);
    if (id && id.length <= 48) return id;

    return 'latest';
}

function buildShortCallbackToken(value) {
    const token = normalizeKey(value);
    if (!token || token.length > 48) return 'latest';
    return token;
}

function postLootItemMenuSafe(itemToken) {
    const token = buildShortCallbackToken(itemToken);

    return Markup.inlineKeyboard([
        [Markup.button.callback('✅ Equipar agora', `combat_loot_equip:${token}`)],
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

function syncPlayerFromFight(player, fight) {
    if (!player || !fight?.player) return player;

    player.hp = Math.max(
        1,
        Math.min(
            Number(fight.player.hp || 1),
            Number(player.maxHp || fight.player.maxHp || 1)
        )
    );

    player.energy = Math.max(
        0,
        Math.min(
            Number(fight.player.energy || 0),
            Number(player.maxEnergy || fight.player.maxEnergy || 0)
        )
    );

    return player;
}

function preventStaleActiveFightOverwrite(player) {
    if (!player || typeof player !== 'object') return player;
    player.activeFight = null;
    return player;
}

function shouldSkipEnemyTurnForConsumable(key) {
    return key === 'potionHp' || key === 'potionEnergy';
}

async function savePlayerBattleState(userId, player, fight, meta = {}) {
    syncPlayerFromFight(player, fight);
    
    // Otimização: Em vez de anular o activeFight no player para depois salvar a luta separadamente,
    // vamos garantir que o player.activeFight contenha o estado atualizado da luta ANTES do savePlayer.
    // Isso reduz de 2 para 1 o número de escritas no MongoDB por turno de consumível/finalização.
    player.activeFight = {
        mode: meta.mode || 'hunt',
        createdAt: meta.createdAt || Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000), // Timeout padrão
        battleMessageId: meta.battleMessageId ?? null,
        isPhoto: meta.isPhoto ?? false,
        payload: fight
    };

    normalizePlayerForSave(player);
    await savePlayer(userId, player);
}

function getEnemyBadge(enemy) {
    if (enemy?.isBoss) return '👑 BOSS';
    if (enemy?.isMiniBoss) return '💀 MINI BOSS';
    if (enemy?.isElite) return '🔥 ELITE';
    return '👹 INIMIGO';
}

function buildEnemyStatusIcons(fight) {
    let icons = '';
    if (fight.enemy.poisonTurns > 0) icons += '🧪';
    if (fight.enemy.bleedTurns > 0) icons += '🩸';
    if (fight.enemy.shield > 0) icons += '🛡️';
    if (fight.enemy.frozen) icons += '❄️';
    return icons;
}

function escapeMarkdown(text = '') {
    return String(text || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function renderFightCaptionSafe(fight, playerLevel = null) {
    const playerBar = progressBar(fight.player.hp, fight.player.maxHp, 8, '🟩', '⬛');
    const enemyBar = progressBar(fight.enemy.hp, fight.enemy.maxHp, 8, '🟥', '⬛');
    const enemyStatusIcons = buildEnemyStatusIcons(fight);
    const level = playerLevel ?? fight.player.level ?? 1;

    let text = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚔️ *BATALHA*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `👤 *${escapeMarkdown(fight.player.name)}* [Lv ${level}]\n`;
    text += `❤️ ${fight.player.hp}/${fight.player.maxHp}  ${playerBar}\n`;
    text += `⚡ ${fight.player.energy}/${fight.player.maxEnergy}\n`;
    text += `⚔️ ${fight.player.atk} • 🛡️ ${fight.player.def}`;
    if (fight.player.defending) text += ` 🛡️`;
    if (fight.player.stunned) text += ` 💫`;
    text += `\n\n`;

    text += `${getEnemyBadge(fight.enemy)}\n`;
    text += `${fight.enemy.emoji || '👹'} *${escapeMarkdown(fight.enemy.name)}* [Lv ${fight.enemy.level}]`;
    if (enemyStatusIcons) text += ` ${enemyStatusIcons}`;
    text += `\n`;
    text += `❤️ ${fight.enemy.hp}/${fight.enemy.maxHp}  ${enemyBar}\n`;
    if (fight.enemy.shield > 0) text += `🛡️ Escudo: ${fight.enemy.shield}\n`;
    text += `⚔️ ${fight.enemy.atk} • 🛡️ ${fight.enemy.def} • 💥 ${fight.enemy.crit}%\n\n`;

    text += `📜 *Últimas ações*\n`;
    text += (fight.logs?.slice(-4).map(escapeMarkdown).join('\n') || '—');

    return text;
}

async function renderCurrentFightDirect(ctx, stored, playerLevel = null) {
    const { fight, meta } = stored;
    const caption = renderFightCaptionSafe(fight, playerLevel);
    const keyboard = combatMenu();
    const chatId = ctx.chat.id;
    const messageId = meta?.battleMessageId || ctx.callbackQuery?.message?.message_id;
    const isPhoto = Boolean(meta?.isPhoto || ctx.callbackQuery?.message?.photo);

    if (messageId) {
        try {
            if (isPhoto) {
                await ctx.telegram.editMessageCaption(chatId, messageId, null, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                });
            } else {
                await ctx.telegram.editMessageText(chatId, messageId, null, caption, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                });
            }

            return true;
        } catch (error) {
            console.error('Erro ao renderizar luta após consumível:', error);
        }
    }

    const enemyImage = assets?.enemies?.[fight.enemy.id];

    if (enemyImage) {
        const sent = await ctx.replyWithPhoto(enemyImage, {
            caption,
            parse_mode: 'Markdown',
            ...keyboard
        });
        await persistFightMessage(ctx.from.id, sent.message_id, true);
        return true;
    }

    const sent = await ctx.reply(caption, {
        parse_mode: 'Markdown',
        ...keyboard
    });
    await persistFightMessage(ctx.from.id, sent.message_id, false);
    return true;
}

async function sendPostCombatMessageSafe(ctx, meta, message, keyboard) {
    const chatId = ctx.chat.id;
    const messageId = meta?.battleMessageId || ctx.callbackQuery?.message?.message_id;
    const isPhoto = Boolean(meta?.isPhoto || ctx.callbackQuery?.message?.photo);

    if (!messageId) {
        return ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }

    try {
        if (isPhoto) {
            return await ctx.telegram.editMessageCaption(chatId, messageId, null, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        }

        return await ctx.telegram.editMessageText(chatId, messageId, null, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard.reply_markup
        });
    } catch {
        try {
            await ctx.telegram.deleteMessage(chatId, messageId);
        } catch {}

        return ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
}

function buildLootHighlight(rewards) {
    if (!rewards?.droppedItem) return '';

    const item = rewards.droppedItem;
    const slot = getRealSlot(item);

    return (
        `\n🎁 *Item encontrado*\n` +
        `${item.emoji || getSlotIcon(slot, item)} *${escapeMarkdown(item.name)}*\n` +
        `${escapeMarkdown(item.rarity || 'Comum')} • ${escapeMarkdown(item.displayCategory || getSlotLabel(slot, item))}` +
        `${item.traitLabel ? ` • ${escapeMarkdown(item.traitLabel)}` : ''}` +
        `${item.originMap ? ` • ${escapeMarkdown(item.originMap)}` : ''}\n` +
        `Poder: ${calcItemPower(item)}${item.powerTier ? ` • ${escapeMarkdown(item.powerTier)}` : ''}\n`
    );
}

function getRegularLootLines(rewards) {
    const loot = Array.isArray(rewards?.loot) ? rewards.loot : [];
    const droppedItemName = rewards?.droppedItem?.name || null;

    return loot.filter(line => {
        const value = String(line || '');
        if (!value) return false;
        if (value.includes('ALMA ENCONTRADA')) return false;
        if (droppedItemName && value.includes(droppedItemName)) return false;
        return true;
    });
}

function buildVictoryMessageWithSoulDrop(player, rewards) {
    const xpNeeded = getXpToNextLevel(player.level);
    const xpProgress = progressBar(player.xp, xpNeeded, 8, '🟨', '⬛');
    const hpBar = progressBar(player.hp, player.maxHp, 8, '🟩', '⬛');
    const energyBar = progressBar(player.energy, player.maxEnergy, 8, '🟦', '⬛');

    let msg = `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🏆 *VITÓRIA*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `🎖️ *${escapeMarkdown(player.name)}* • Nível ${player.level}\n`;
    msg += `✨ +${rewards.xp} XP  ${xpProgress}\n`;
    msg += `📈 ${player.xp}/${xpNeeded} para o próximo nível\n`;
    msg += `💰 +${rewards.gold} Ouro | Total: ${player.gold}\n\n`;

    msg += `❤️ ${player.hp}/${player.maxHp} ${hpBar}\n`;
    msg += `⚡ ${player.energy}/${player.maxEnergy} ${energyBar}\n`;

    const lootHighlight = buildLootHighlight(rewards);
    if (lootHighlight) {
        msg += lootHighlight;
    }

    if (rewards.soulDropped && rewards.soulDropText) {
        msg += `\n${rewards.soulDropText}\n`;
    } else if (rewards.soulDropped) {
        msg += `\n🌑 *ALMA ENCONTRADA*\n${escapeMarkdown(rewards.soulLootLine || rewards.droppedSoul?.name || 'Alma rara')}\n`;
    }

    const regularLoot = getRegularLootLines(rewards);
    if (regularLoot.length) {
        msg += `\n🎁 *Loot Obtido*\n`;
        regularLoot.forEach(item => {
            msg += `${escapeMarkdown(item)}\n`;
        });
    }

    if (rewards.inventoryFull) {
        msg += `\n🎒 *Inventário cheio!* Um item deixou de entrar.\n`;
    }

    if (rewards.keyDropped) {
        msg += `\n🗝️ *Chave de Masmorra obtida!*\n`;
    }

    if (rewards.leveledUp) {
        msg += `\n🌟 *LEVEL UP!* Agora você é nível ${player.level}!\n`;
    }

    msg += `\n🍀 Sorte: ${Math.min(100, Math.floor((player.itemPityCounter || 0) * 2.5))}%`;
    msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🌑 A escuridão recua... por enquanto.`;

    return msg;
}

function buildLossMessageSafe(player, penalty) {
    const ratePercent = Math.round((penalty?.rateApplied || 0) * 100);

    let msg = (
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💀 *DERROTA*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Você foi derrotado...\n\n` +
        `📉 XP perdido: ${penalty?.lostXp || 0} (${ratePercent}%)\n` +
        `✨ XP atual: ${player.xp}\n`
    );

    if (penalty?.levelReduced) {
        msg += `⬇️ Nível reduzido: ${penalty.oldLevel} → ${penalty.newLevel}\n`;
    }

    msg += (
        `\n❤️ HP restaurado para ${player.hp}/${player.maxHp}\n` +
        `⚡ Energia: ${player.energy}/${player.maxEnergy}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🌑 Reúna forças e tente novamente.`
    );

    return msg;
}

async function finishFightWithSoulDropDisplay(ctx, stored) {
    const { fight, meta } = stored || {};
    const player = await getPlayer(ctx.from.id);

    if (!player || !fight) {
        await removeStoredFight(ctx.from.id).catch(() => {});
        return ctx.reply('❌ Jogador não encontrado.');
    }

    await removeStoredFight(ctx.from.id);

    if (fight.status === 'win') {
        const rewards = await processVictory(player, fight.enemy);
        updateMissionProgress(player, 'kill', 1);

        syncPlayerFromFight(player, fight);
        normalizePlayerForSave(player);

        await savePlayer(ctx.from.id, player);
        await recordCombatResult('win');

        const droppedItemKey = rewards.droppedItem ? getItemKey(rewards.droppedItem) : null;

        return sendPostCombatMessageSafe(
            ctx,
            meta,
            buildVictoryMessageWithSoulDrop(player, rewards),
            postCombatMenu({ droppedItemKey })
        );
    }

    if (fight.status === 'loss') {
        const penalty = applyDeathXpPenalty(player);
        player.hp = 1;

        normalizePlayerForSave(player);
        await savePlayer(ctx.from.id, player);
        await recordCombatResult('loss');

        return sendPostCombatMessageSafe(
            ctx,
            meta,
            buildLossMessageSafe(player, penalty),
            postCombatMenu()
        );
    }

    return baseCombat.handleCombatBack(ctx);
}

async function handleAttack(ctx) {
    const stored = await getStoredFight(ctx.from.id);

    if (!stored) {
        return ctx.answerCbQuery('⚠️ Esta luta expirou. Caçe novamente se quiser.', {
            show_alert: true
        }).catch(() => {});
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFightWithSoulDropDisplay(ctx, stored);
    }

    const updated = await runAttack(ctx.from.id, stored);

    if (!updated || updated.fight.status !== 'ongoing') {
        return finishFightWithSoulDropDisplay(ctx, updated || stored);
    }

    await ctx.answerCbQuery().catch(() => {});
    return renderCurrentFightDirect(ctx, updated);
}

async function handleSoul(ctx) {
    const stored = await getStoredFight(ctx.from.id);

    if (!stored) {
        return ctx.answerCbQuery('⚠️ Esta luta expirou. Caçe novamente se quiser.', {
            show_alert: true
        }).catch(() => {});
    }

    if (stored.fight.status !== 'ongoing') {
        return finishFightWithSoulDropDisplay(ctx, stored);
    }

    const soulIndex = parseInt(ctx.match?.[1], 10);
    const updated = await runSoul(ctx.from.id, soulIndex, stored);

    if (!updated || !updated.result) {
        return ctx.answerCbQuery('❌ Alma inválida ou vazia.', { show_alert: true }).catch(() => {});
    }

    if (updated.fight.status !== 'ongoing') {
        return finishFightWithSoulDropDisplay(ctx, updated);
    }

    await ctx.answerCbQuery().catch(() => {});
    return renderCurrentFightDirect(ctx, updated);
}

async function handleViewDroppedLoot(ctx) {
    const itemKey = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player || !itemKey) {
        return ctx.answerCbQuery('Item não encontrado.', { show_alert: true }).catch(() => {});
    }

    const resolved = resolveDroppedLootAction(player, itemKey, 'view');
    if (resolved.error) {
        return ctx.answerCbQuery(resolved.error, { show_alert: true }).catch(() => {});
    }

    const item = resolved.item;
    const normalizedItem = normalizeInventoryItem(item);

    if (!normalizedItem) {
        return ctx.answerCbQuery('Esse item não está mais no inventário.', { show_alert: true }).catch(() => {});
    }

    await ctx.answerCbQuery().catch(() => {});

    const itemToken = buildShortItemToken(normalizedItem);

    return replyClean(
        ctx,
        buildSafeLootDetail(player, normalizedItem),
        postLootItemMenuSafe(itemToken)
    );
}

async function handleEquipDroppedLoot(ctx) {
    const itemKey = ctx.match?.[1];
    const player = await getPlayer(ctx.from.id);

    if (!player || !itemKey) {
        return ctx.answerCbQuery('Item não encontrado.', { show_alert: true }).catch(() => {});
    }

    const resolved = resolveDroppedLootAction(player, itemKey, 'equip');
    if (resolved.error) {
        return ctx.answerCbQuery(resolved.error, { show_alert: true }).catch(() => {});
    }

    const item = resolved.item;
    const normalizedItem = normalizeInventoryItem(item);

    if (!normalizedItem) {
        return ctx.answerCbQuery('Esse item não está mais no inventário.', { show_alert: true }).catch(() => {});
    }

    const slot = getRealSlot(normalizedItem);

    if (!slot) {
        return ctx.answerCbQuery('Item inválido.', { show_alert: true }).catch(() => {});
    }

    const result = applyEquipmentChange(player, slot, normalizedItem);

    if (!result.success) {
        return ctx.answerCbQuery(result.message || 'Não foi possível equipar.', { show_alert: true }).catch(() => {});
    }

    normalizePlayerForSave(player);
    await savePlayer(ctx.from.id, player);

    await ctx.answerCbQuery(`✅ ${normalizedItem.name} equipado!`, { show_alert: true }).catch(() => {});

    return replyClean(
        ctx,
        `✅ Item equipado!\n\n${normalizedItem.emoji || getSlotIcon(slot, normalizedItem)} ${cleanText(normalizedItem.name)} foi equipado com sucesso.`,
        postCombatMenu()
    );
}

async function handleUseConsumable(ctx) {
    const key = ctx.match?.[1];
    const stored = await getStoredFight(ctx.from.id);

    if (!stored) {
        return ctx.answerCbQuery('⚠️ Esta luta expirou. Caçe novamente se quiser.', {
            show_alert: true
        }).catch(() => {});
    }

    if (stored.fight.status !== 'ongoing') {
        return ctx.answerCbQuery('⚠️ A luta já terminou.', {
            show_alert: true
        }).catch(() => {});
    }

    const player = await getPlayer(ctx.from.id);
    if (!player) {
        return ctx.answerCbQuery('Use /start para criar seu personagem.', {
            show_alert: true
        }).catch(() => {});
    }

    const consumeResult = consumeConsumable(player, key, 1);
    if (!consumeResult.success) {
        return ctx.answerCbQuery('❌ Item indisponível.', {
            show_alert: true
        }).catch(() => {});
    }

    updateMissionProgress(player, 'use_consumable', 1);
    await recordConsumableUsed();

    const updated = await runConsumableTurn(ctx.from.id, (fight) => {
        let log = '';

        if (key === 'potionHp') {
            const before = Number(fight.player.hp || 1);
            fight.player.hp = Math.max(1, Number(fight.player.maxHp || fight.player.hp || 1));
            fight.status = 'ongoing';
            log = `❤️ Poção de Vida restaurou ${fight.player.hp - before} HP e encheu sua vida.`;
        } else if (key === 'potionEnergy') {
            const before = Number(player.energy || 0);
            restoreEnergy(player, BALANCE.consumables.potionEnergy.restoreAmount);
            fight.player.energy = player.energy;
            fight.status = 'ongoing';
            log = `⚡ Energia +${player.energy - before} com poção.`;
        } else if (key === 'tonicStrength') {
            fight.player.atk += BALANCE.consumables.tonicStrength.atkBonus;
            log = `💪 ATK +${BALANCE.consumables.tonicStrength.atkBonus} para esta batalha.`;
        } else if (key === 'tonicDefense') {
            fight.player.def += BALANCE.consumables.tonicDefense.defBonus;
            log = `🛡️ DEF +${BALANCE.consumables.tonicDefense.defBonus} para esta batalha.`;
        } else {
            fight.logs.push('❌ Consumível inválido.');
            return { success: false };
        }

        fight.logs.push(log);
        return { success: true };
    }, stored, {
        skipEnemyTurn: shouldSkipEnemyTurnForConsumable(key)
    });

    if (!updated || updated.effectResult?.success === false) {
        return ctx.answerCbQuery('❌ Erro ao usar consumível.', {
            show_alert: true
        }).catch(() => {});
    }

    await savePlayerBattleState(ctx.from.id, player, updated.fight, updated.meta);

    await ctx.answerCbQuery('✅ Consumível usado!').catch(() => {});

    return renderCurrentFightDirect(ctx, updated, player.level);
}

module.exports = {
    ...baseCombat,
    handleAttack,
    handleSoul,
    handleViewDroppedLoot,
    handleEquipDroppedLoot,
    handleUseConsumable,

    __private: {
        resolveDroppedLootItem,
        resolveDroppedLootAction,
        getLatestInventoryItem,
        findItemByRawIdentity,
        buildSafeLootDetail,
        buildShortItemToken,
        buildShortCallbackToken,
        replyClean,
        syncPlayerFromFight,
        preventStaleActiveFightOverwrite,
        shouldSkipEnemyTurnForConsumable,
        savePlayerBattleState,
        renderFightCaptionSafe,
        renderCurrentFightDirect,
        sendPostCombatMessageSafe,
        buildLootHighlight,
        getRegularLootLines,
        buildVictoryMessageWithSoulDrop,
        buildLossMessageSafe,
        finishFightWithSoulDropDisplay
    }
};
