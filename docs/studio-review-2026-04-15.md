# Noctra RPG — Studio Review (2026-04-15)

## Visão executiva

A base está sólida para um RPG por turnos no Telegram: há progressão, economia, masmorra, arena e separação razoável por domínios (`core`, `handlers`, `services`, `data`).

Principais oportunidades identificadas:

1. **Confiabilidade de fluxo**: evitar duplicidade de aplicação de recompensas/fechamento de runs.
2. **Performance em I/O**: reduzir leituras desnecessárias no Mongo em loops de combate.
3. **Escalabilidade de conteúdo**: mover mais balanceamento para dados versionáveis (tabelas/JSON por temporada).
4. **Observabilidade**: padronizar logs de eventos críticos (morte, drop raro, erro de edição Telegram).

---

## Bugs e riscos encontrados

### 1) Duplicidade potencial em encerramento de masmorra
- **Sintoma**: encerramento de run podia ser disparado em múltiplos pontos, elevando risco de bônus duplicados em cenários de regressão/refatoração.
- **Ação aplicada**:
  - `finalizeDungeonRun` tornou-se idempotente.
  - encerramento em `resolveCombatRoom` foi removido; agora o fechamento permanece no fluxo de handler.

### 2) Round-trip desnecessário ao banco no início de combate
- **Sintoma**: após `savePlayer` no `/hunt`, o código buscava o jogador novamente sem necessidade imediata.
- **Ação aplicada**:
  - removida leitura redundante (`getPlayer`) após persistência.
  - reduz latência média e carga de banco por batalha iniciada.

---

## Melhorias de design de jogo (roadmap sugerido)

## Fase 1 — “Live Ops base”
- Multiplicadores semanais por mapa (XP/Gold/Loot) em arquivo de configuração.
- Eventos de tempo limitado por tipo de sala.
- Seeds de run para reproduzir sessões e facilitar debug.

## Fase 2 — “Combate mais profundo”
- Ações de inimigo por arquétipo (ex.: Guardião, Assassino, Bruxo) com cooldown.
- Estados adicionais (sangramento, fraqueza, marca lunar) e resistências.
- Sistema de escolha pré-run (2 bênçãos iniciais entre 3 aleatórias).

## Fase 3 — “Retenção”
- Metaprogressão de conta (árvore de legado com glórias).
- Ciclos de temporada com reset parcial e recompensas cosméticas.
- Ranking de tempo por masmorra e melhor run semanal.

---

## Otimizações técnicas recomendadas

1. **Cache curto por usuário (5-15s) no player service** para callbacks encadeados.
2. **Batch save** em fluxos de ação múltipla (salas + combate) quando possível.
3. **Métricas mínimas**: duração média de run, taxa de abandono por sala, drop rate efetivo.
4. **Testes de regressão de economia** com snapshots (ouro/xp/chaves por run simulada).

---

## Nota final

Com as correções deste ciclo, a base já fica mais segura e rápida no fluxo crítico de combate/masmorra. O próximo salto de qualidade vem de instrumentação + balanceamento dirigido por dados.
