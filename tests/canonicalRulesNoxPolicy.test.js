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

function stringifyItemForPolicy(item) {
    return normalizeText([
        item.id,
        item.name,
        item.type,
        item.effect,
        item.description,
        JSON.stringify(item.rewards || {})
    ].join(' '));
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
    const forbidden = getNoxShopItems().filter(item => {
        const text = stringifyItemForPolicy(item);

        return (
            item.type === 'equipment' ||
            item.type === 'soul' ||
            item.type === 'key' ||
            item.effect === 'key' ||
            item.effect === 'soul' ||
            text.includes('alma') ||
            text.includes('soul') ||
            text.includes('chave') ||
            text.includes('key') ||
            text.includes('equipamento') ||
            text.includes('arma lendária') ||
            text.includes('arma mitica') ||
            text.includes('arma mítica')
        );
    });

    assert.deepEqual(
        forbidden.map(item => item.id),
        [],
        `Itens premium proibidos encontrados: ${forbidden.map(item => item.id).join(', ')}`
    );
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
