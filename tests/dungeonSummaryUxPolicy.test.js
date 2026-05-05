const test = require('node:test');
const assert = require('node:assert/strict');

const {
    isSummaryNoiseNote,
    getCleanSummaryNotes
} = require('../src/handlers/dungeon');

test('dungeon summary filter removes micro economy and raw common item notes', () => {
    const noisyNotes = [
        '✨ +47 XP',
        '💰 +798 ouro',
        '❤️ +141 HP, ⚡ +0 energia',
        '🎁 Escudo Feral do Uivo Baixo Lv1 Incomum • Mão Secundária • Guardião • Clareira Sombria',
        '🎁 Espada Vigilante da Clareira Incomum • Equilibrado • Clareira Sombria',
        '🏰 Bônus da masmorra aplicado',
        '🎁 Recompensa final: Talismã Vigilante do Uivo Baixo Incomum',
        '📌 Política de recompensa: Comum mínimo Incomum',
        '🏁 Expedição perfeita!'
    ];

    noisyNotes.forEach(note => {
        assert.equal(isSummaryNoiseNote(note), true, `deveria filtrar: ${note}`);
    });
});

test('dungeon summary filter preserves only premium highlights', () => {
    const notes = [
        '✨ +47 XP',
        '💰 +798 ouro',
        '🎁 Escudo Feral do Uivo Baixo Lv1 Incomum • Mão Secundária • Guardião • Clareira Sombria',
        '🌑 Alma do Lobo Sombrio obtida!',
        '🗝️ Chave de Masmorra obtida!',
        '💀 Derrotado na masmorra.'
    ];

    assert.deepEqual(getCleanSummaryNotes(notes), [
        '🌑 Alma do Lobo Sombrio obtida!',
        '🗝️ Chave de Masmorra obtida!'
    ]);
});

test('dungeon summary highlights are capped to two relevant lines', () => {
    const notes = [
        '🌑 Alma rara obtida!',
        '🗝️ Chave de Masmorra obtida!',
        '🟡 Item lendário extra obtido!'
    ];

    assert.deepEqual(getCleanSummaryNotes(notes), [
        '🌑 Alma rara obtida!',
        '🗝️ Chave de Masmorra obtida!'
    ]);
});
