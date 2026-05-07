/*
=================================
NOCTRA — HANDLER OFICIAL DE COMBATE
=================================

Este é o entrypoint canônico de combate usado pelo index.js.

A cadeia histórica ainda existe:

- combat.js: base antiga do fluxo;
- combatFixed.js: correções críticas de vitória, consumíveis, loot e renderização;
- combatSoulFixed.js: correção final do menu de almas com luta ativa.

Não importe combat.js, combatFixed.js ou combatSoulFixed.js diretamente no index.js.

A consolidação definitiva deve acontecer movendo a lógica final para este arquivo em PR dedicado,
com testes e validação manual no Telegram. Por enquanto, este arquivo reduz o risco de alguém trocar
o import do index.js para um handler antigo por engano.
*/

module.exports = require('./combatSoulFixed');
