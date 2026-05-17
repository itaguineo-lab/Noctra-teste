# COMBAT CONSOLIDATION PLAN (SAFE / NO RUNTIME CHANGE)

## Objetivo
Definir um plano técnico **gradual e seguro** para consolidar o combate no NOCTRA, mantendo o runtime atual intacto.

Escopo deste documento:
- mapear contrato público atual de combate;
- explicitar dependências e fronteiras;
- listar riscos de regressão;
- definir fases pequenas de migração futura;
- definir testes obrigatórios por fase;
- definir checklist de validação manual no Telegram.

Restrições explícitas desta fase de planejamento:
- não alterar comportamento do jogo;
- não mover lógica de `combatFixed` ainda;
- não mexer em loot, HP, energia, dungeon, callbacks;
- não apagar arquivos legados.

---

## Estado atual (baseline canônico)

### Cadeia ativa no runtime
- `index.js` importa combate via `./src/handlers/combatActive`.
- `combatActive.js` é o entrypoint oficial e faz `...combatFixed` + override de `handleSoulMenu`.
- `combatFixed.js` faz `...baseCombat` (onde `baseCombat = require('./combat')`) e sobrescreve handlers críticos.

Fluxo atual documentado:

`combatActive -> combatFixed -> combat`

---

## Mapeamento do contrato público (exports)

## 1) Funções públicas de `combat.js` (base histórica)
- `handleHunt`
- `handleAttack`
- `handleDefend`
- `handleFlee`
- `handleSoulMenu`
- `handleSoul`
- `handleConsumables`
- `handleUseConsumable`
- `handleCombatBack`
- `handleViewDroppedLoot`
- `handleEquipDroppedLoot`
- `finishFight`

## 2) Sobrescritas públicas em `combatFixed.js`
`combatFixed` exporta `...baseCombat` e sobrescreve:
- `handleAttack`
- `handleSoul`
- `handleViewDroppedLoot`
- `handleEquipDroppedLoot`
- `handleUseConsumable`

Obs.: `handleDefend`, `handleFlee`, `handleHunt`, `handleConsumables`, `handleCombatBack`, `handleSoulMenu` continuam vindos de `baseCombat` neste nível.

## 3) Sobrescritas públicas em `combatActive.js` (entrypoint oficial)
`combatActive` exporta `...combatFixed` e sobrescreve:
- `handleSoulMenu`

Portanto, no runtime atual:
- `handleSoulMenu` vem de `combatActive`;
- `handleAttack`, `handleSoul`, `handleViewDroppedLoot`, `handleEquipDroppedLoot`, `handleUseConsumable` vêm de `combatFixed`;
- demais handlers públicos vêm de `combat.js` (via herança de spreads).

---

## Fronteiras e acoplamentos críticos

1. **Callbacks do Telegram (não alterar na consolidação inicial)**
- `combat_attack`
- `combat_defend`
- `combat_soul_menu`
- `combat_soul_0`
- `combat_soul_1`
- `combat_consumables`
- `combat_use:potionHp|potionEnergy|tonicStrength|tonicDefense`
- `combat_loot:*`
- `combat_loot_equip:*`
- `combat_flee`
- `combat_back`

2. **Dependências de persistência de luta**
- `src/core/combat/fightService.js`
- `src/core/combat/fightPersistence.js`

3. **Dependências de UI de combate**
- `src/menus/combatMenu.js`

4. **Dependências de estado/recompensa**
- `playerService`, `playerMutations`, `progression`, `rewardService`, `metricsService`.

---

## Riscos de regressão

1. **Troca involuntária do handler ativo**
- Risco: `index.js` voltar a apontar para `combatFixed`/`combat`.
- Impacto: quebra da correção de soul menu e divergência de contrato.

2. **Quebra de contrato público por export acidental**
- Risco: remover/renomear handler exportado.
- Impacto: callback sem handler e dead-end no Telegram.

3. **Regressão de persistência de luta (`activeFight`)**
- Risco: sobrescrever estado stale ao salvar player.
- Impacto: perda de estado, HP/energia incoerentes pós-ação.

4. **Regressão de turno de consumível**
- Risco: poções voltarem a consumir contra-ataque imediato.
- Impacto: quebra de regra de UX/combate já protegida por testes.

5. **Regressão de pós-vitória/loot display**
- Risco: quebrar callbacks curtas, item token e fallback `latest`.
- Impacto: jogador não consegue inspecionar/equipar item dropado.

6. **Regressão de menu de almas**
- Risco: perder hidratação segura de `soulsEquipped` para `fight.player.souls`.
- Impacto: botão de almas vazio/inconsistente mesmo com alma equipada.

7. **Refactor transversal cedo demais**
- Risco: misturar combate com dungeon/economia/UI em um PR.
- Impacto: aumento de superfície de bug e rollback complexo.

---

## Estratégia de consolidação em fases (futuro)

## Fase 0 — Baseline congelado (obrigatória antes de mover código)
Objetivo:
- congelar o contrato atual e garantir cobertura mínima de segurança.

Ações:
- manter `combatActive` como único entrypoint no `index.js`;
- garantir testes de fronteira de import e contrato público.

Critério de saída:
- suíte de combate verde;
- nenhum callback de combate alterado.

## Fase 1 — Extração apenas de utilitários puros de render/normalização
Objetivo:
- reduzir tamanho de `combatFixed` sem mudar comportamento.

Ações:
- extrair funções puras (strings/layout/sanitização) para módulo de utilidades interno de combate;
- manter assinaturas e retorno idênticos;
- manter `combatFixed` chamando wrappers com mesmo fluxo.

Proibido na fase:
- tocar cálculo de dano, reward pipeline, persistência de estado.

Critério de saída:
- output textual idêntico nos testes existentes.

## Fase 2 — Encapsular orquestração de ações sem alterar handlers públicos
Objetivo:
- reduzir acoplamento interno, mantendo mesmas funções exportadas.

Ações:
- criar funções internas de orquestração (`attackFlow`, `soulFlow`, `consumableFlow`) chamadas pelos handlers atuais;
- preservar `module.exports` e nomes de handlers públicos.

Critério de saída:
- `combatActive` continua exportando mesmo contrato;
- testes de contrato/import continuam verdes.

## Fase 3 — Migração controlada de ownership para `combatActive`
Objetivo:
- `combatActive` tornar-se dono explícito de mais handlers, sem corte brusco.

Ações:
- mover 1 handler por PR (ex.: `handleAttack` primeiro), mantendo fallback em `combatFixed` até estabilizar;
- usar feature parity test-first (mesmo input, mesmo output observável).

Critério de saída:
- cada migração isolada com suíte verde + validação manual Telegram.

## Fase 4 — Encerramento de legado (somente quando 100% estável)
Objetivo:
- reduzir legado após várias releases estáveis.

Ações:
- somente após todos handlers críticos estarem consolidados e observados em produção,
  documentar plano de desativação de camada legada.

Critério de saída:
- sem regressão por múltiplos ciclos;
- aprovação humana explícita.

---

## Testes obrigatórios antes de cada fase

Executar sempre:
- `npm test`

Blocos mínimos obrigatórios (foco combate):
- `tests/combatActiveEntrypoint.test.js`
- `tests/combatHandlerPolicy.test.js`
- `tests/combatImportBoundaries.test.js`
- `tests/combatConsumableTurn.test.js`
- `tests/combatPotionNoFinish.test.js`
- `tests/combatPotionPersistence.test.js`
- `tests/combatSoulMenu.test.js`
- `tests/combatSoulMenuLabels.test.js`
- `tests/combatSoulDropDisplay.test.js`
- `tests/combatMessageCleanup.test.js`
- `tests/combatLayoutWider.test.js`

Critério de bloqueio:
- qualquer falha em contrato de handler, callbacks, persistência de HP/energia de luta, ou fluxo de consumíveis bloqueia a fase.

---

## Validação manual obrigatória no Telegram (a cada fase)

Checklist mínimo:
1. `/start` com personagem existente.
2. Abrir menu principal e iniciar caça.
3. `⚔️ Atacar` até finalizar luta.
4. Abrir `💀 Almas` durante luta com alma equipada e sem alma equipada.
5. Usar `🧪 Consumíveis`:
   - poção HP;
   - poção energia;
   - tônico força/defesa.
6. Confirmar que poções não geram contra-ataque imediato indevido.
7. Vencer luta com drop de item:
   - abrir `🎁 Ver item dropado`;
   - testar `✅ Equipar agora`.
8. Testar `🏃 Fugir` (sucesso e falha quando possível).
9. Confirmar botões de retorno (`combat_back`, `menu`, `inventory`, `hunt`).
10. Repetir 2–3 ciclos para checar persistência de estado e limpeza de mensagens.

Sinais de regressão a observar:
- callback sem resposta;
- menu sem saída;
- HP/energia divergente entre tela e estado do jogador;
- luta expirada sem fallback claro;
- texto quebrado/duplicado/spam de mensagens.

---

## O que NÃO fazer durante a consolidação
- não alterar loot table/pipeline;
- não alterar regra de HP persistente;
- não alterar energia;
- não alterar dungeon;
- não alterar callbacks de combate;
- não apagar `combat`, `combatFixed`, `combatSoulFixed` sem plano aprovado;
- não misturar mudanças de economia no mesmo PR.

---

## Definição de pronto de cada PR da consolidação
1. escopo mínimo (1 etapa/1 risco principal);
2. sem alteração de comportamento observável;
3. `npm test` verde;
4. validação manual Telegram registrada;
5. riscos residuais documentados;
6. rollback simples (reversão de 1 commit/PR).
