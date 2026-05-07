const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { shopItems } = require('../src/data/shopItems');
const { BALANCE } = require('../src/data/balance');

const REPO_ROOT = path.join(__dirname, '..');

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function normalizeText(value = '') {
    return String(value || '').toLowerCase();
}

function getNoxShopItems() {
    return shopItems.filter(item => item.currency === 'nox');
}

function getStructuredPolicyText(item) {
    return normalizeText([
        item.id,
        item.name,
        item.type,
        item.effect,
        item.cosmeticType,
        JSON.stringify(item.rewards || {})
    ].join(' '));
}

function getForbiddenPremiumRewardReasons(item) {
    const reasons = [];
    const structuredText = getStructuredPolicyText(item);
    const rewards = item.rewards || {};

    if (item.type === 'equipment') reasons.push('type=equipment');
    if (item.type === 'soul') reasons.push('type=soul');
    if (item.type === 'key') reasons.push('type=key');
    if (item.effect === 'key') reasons.push('effect=key');
    if (item.effect === 'soul') reasons.push('effect=soul');

    if (rewards.equipment || rewards.item || rewards.items || rewards.weapon || rewards.armor) {
        reasons.push('rewards.equipment');
    }

    if (rewards.soul || rewards.souls) {
        reasons.push('rewards.soul');
    }

    if (rewards.key || rewards.keys || rewards.dungeonKey || rewards.dungeonKeys) {
        reasons.push('rewards.key');
    }

    if (structuredText.includes('arma lendária') || structuredText.includes('arma mitica') || structuredText.includes('arma mítica')) {
        reasons.push('structured legendary weapon text');
    }

    return reasons;
}

test('documento canônico existe e fixa as regras centrais de produto', () => {
    const source = readProjectFile('docs/NOCTRA_CANONICAL_RULES.md');

    assert.match(source, /Core Loop/i);
    assert.match(source, /Caçar → Combater → Loot → Upgrade → Repetir/);
    assert.match(source, /1 NOX = R\$1/);
    assert.match(source, /NOX não pode ser recompensa padrão de gameplay/);
    assert.match(source, /dungeon consome chave/i);
    assert.match(source, /dungeon não consome energia/i);
    assert.match(source, /Guerreiro/);
    assert.match(source, /Arqueiro/);
    assert.match(source, /Mago/);
});

test('balance preserva regras oficiais de energia e dungeon', () => {
    assert.equal(BALANCE.energy.baseMax, 20);
    assert.equal(BALANCE.energy.vipMax, 40);
    assert.equal(BALANCE.energy.baseRegenMinutes, 10);
    assert.equal(BALANCE.energy.vipRegenMinutes, 8);
    assert.equal(BALANCE.energy.huntCost, 1);
    assert.equal(BALANCE.energy.dungeonEntryKeyCost, 1);

    assert.equal(BALANCE.dungeon.dungeonCompletionKeyReward, 0);
    assert.equal(BALANCE.dungeon.fleeConsumesEnergy, false);
});

test('loja NOX não vende alma, chave ou equipamento diretamente', () => {
    const offenders = getNoxShopItems()
        .map(item => ({
            id: item.id,
            reasons: getForbiddenPremiumRewardReasons(item)
        }))
        .filter(entry => entry.reasons.length > 0);

    assert.deepEqual(
        offenders,
        [],
        `Itens premium proibidos encontrados: ${offenders.map(entry => `${entry.id} (${entry.reasons.join(', ')})`).join(', ')}`
    );
});

test('descrição pode negar alma, chave ou equipamento sem virar recompensa proibida', () => {
    const starterPack = shopItems.find(item => item.id === 'starter_pack_shadow');

    assert.ok(starterPack, 'starter_pack_shadow deve existir para proteger a política do pacote inicial.');
    assert.match(starterPack.description, /não entrega arma, alma, chave/i);
    assert.deepEqual(getForbiddenPremiumRewardReasons(starterPack), []);
});

test('loja NOX fica restrita a cosmético, VIP, inventário, bundle leve e conveniência limitada', () => {
    const allowedTypes = new Set([
        'cosmetic',
        'vip',
        'inventoryExpansion',
        'bundle',
        'consumable'
    ]);

    const invalid = getNoxShopItems().filter(item => !allowedTypes.has(item.type));

    assert.deepEqual(
        invalid.map(item => `${item.id}:${item.type}`),
        [],
        `Tipos NOX inválidos: ${invalid.map(item => `${item.id}:${item.type}`).join(', ')}`
    );
});

test('rewardService não concede NOX em vitória de campo, dungeon ou boss', () => {
    const source = readProjectFile('src/services/rewardService.js');

    assert.doesNotMatch(source, /applyNoxReward\s*\(/);
    assert.doesNotMatch(source, /addNox\s*\(/);
    assert.doesNotMatch(source, /\.nox\s*(\+\+|\+=|=\s*[^=])/);
    assert.doesNotMatch(source, /nox\s*:/i);
});

test('handlers de gameplay não concedem NOX como recompensa padrão', () => {
    const gameplayFiles = [
        'src/handlers/combat.js',
        'src/handlers/combatFixed.js',
        'src/handlers/combatSoulFixed.js',
        'src/handlers/dungeon.js',
        'src/handlers/daily.js',
        'src/handlers/arena.js'
    ];

    const offenders = [];

    for (const file of gameplayFiles) {
        const source = readProjectFile(file);

        if (/applyNoxReward\s*\(/.test(source) || /addNox\s*\(/.test(source) || /\.nox\s*(\+\+|\+=)/.test(source)) {
            offenders.push(file);
        }
    }

    assert.deepEqual(offenders, [], `Gameplay não pode conceder NOX: ${offenders.join(', ')}`);
});
