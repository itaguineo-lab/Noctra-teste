# AGENTS.md — NOCTRA

Escopo: todo o repositório `itaguineo-lab/Noctra-teste`.

Este arquivo é o contrato operacional para qualquer agente de IA, Codex, assistente técnico ou automação que atue neste projeto. O NOCTRA deve ser tratado como produto comercial real: estável, viciante, original, escalável, monetizável sem pay-to-win e adequado à UX do Telegram.

---

## 1. Missão do projeto

NOCTRA é um RPG sombrio / menu-based / idle social RPG para Telegram.

Prioridade absoluta:
1. estabilidade técnica
2. retenção D1/D7/D30
3. economia saudável
4. clareza e fluidez no Telegram
5. progressão viciante sem inflação
6. código seguro, testável e compatível com dados existentes

Core loop:

`Caçar → Combater → Loot → Upgrade → Repetir`

Meta loop:

`Level → Novo mapa → Boss → Dungeon → Alma → Build → Ranking → Eventos/Guilda futura`

Referência estrutural permitida: jogos menu-based/idle RPG como Teletofus apenas para fluidez, menus, progressão, loot, combate, inventário e sensação de vício.

Proibido copiar nomes, textos, arte, personagens, narrativa, identidade visual, ícones ou sistemas fechados de qualquer jogo.

---

## 2. Regra de operação do agente

Antes de alterar qualquer arquivo, o agente deve:

1. Ler este `AGENTS.md`.
2. Ler `docs/AI_SYSTEM_PROMPT.md`.
3. Ler `package.json`.
4. Ler `index.js` quando a tarefa tocar callbacks, handlers, comandos, middleware, menu, Telegram ou boot.
5. Ler os arquivos reais envolvidos antes de sugerir ou alterar código.
6. Verificar testes existentes relacionados à área modificada.

Não avance com implementação baseada em suposição. Se não encontrar função, callback, schema, export ou arquivo, não invente.

---

## 3. Stack oficial

- Node.js
- Telegraf
- MongoDB/Mongoose
- dotenv
- fs-extra
- GitHub
- Render
- Telegram Bot API

Entrada principal:

- `index.js`

Scripts oficiais:

- `npm start` → `node index.js`
- `npm run dev` → `nodemon index.js`
- `npm test` → `node --test`

Dependências atuais principais:

- `telegraf`
- `express`
- `dotenv`
- `mongoose`
- `fs-extra`

Variáveis essenciais:

- `BOT_TOKEN`
- `MONGODB_URI` ou `MONGO_URI`
- `PORT` no Render

Nunca expor tokens, URIs reais, secrets ou dados privados em commit, PR ou resposta.

---

## 4. Workflow obrigatório de mudança

Fluxo ideal:

1. Criar branch para a tarefa.
2. Alterar apenas arquivos necessários.
3. Rodar `npm test`.
4. Criar PR.
5. Explicar escopo, testes e riscos.
6. Aguardar revisão humana antes de merge.

Não alterar `main` diretamente, salvo instrução humana explícita e consciente.

Commits/PRs devem ser pequenos. Uma tarefa deve corrigir um problema ou entregar uma melhoria coesa. Não misturar combate, economia, inventário e UX no mesmo PR sem necessidade real.

---

## 5. Definition of Done

Uma tarefa só está concluída quando o agente entregar:

1. problema tratado
2. arquivos alterados
3. motivo da alteração
4. testes executados e resultado
5. riscos técnicos residuais
6. impacto em retenção/economia/UX quando aplicável
7. como testar localmente
8. como testar no Telegram
9. o que não foi alterado

Se `npm test` não foi executado, declarar claramente. Não fingir que testou.

---

## 6. Arquivos sensíveis

Alterações nestes arquivos exigem leitura cuidadosa e testes:

- `index.js`
- `src/core/player/PlayerModel.js`
- `src/core/player/playerService.js`
- `src/core/player/playerSaveGuard.js`
- `src/services/energyService.js`
- `src/handlers/combatActive.js`
- `src/handlers/inventoryV3.js`
- `src/handlers/dungeon.js`
- `src/handlers/arena.js`
- `src/handlers/shop.js`
- `src/handlers/daily.js`
- `src/handlers/energy.js`
- `src/core/world/maps.js`
- `src/core/world/enemies.js`
- `src/data/balance.js`
- `src/data/assets.js`
- `src/data/items*.js`
- `src/core/combat/*`
- `src/core/dungeon/*`
- `src/core/arena/*`
- `src/core/economy/*`
- `src/core/metrics/*`
- `tests/*`

Nunca remover lógica desses arquivos para “simplificar” sem provar que ela está obsoleta.

---

## 7. Regras absolutas de código

1. Não inventar função, callback, import, export, schema, arquivo ou estrutura.
2. Não criar classe nova sem solicitação explícita.
3. Não adicionar atributo novo sem justificativa de balance e impacto técnico.
4. Não remover compatibilidade com dados antigos do MongoDB.
5. Não apagar `activeFight`, `activeArenaBattle` ou `dungeonProgress` sem entender o fluxo.
6. Não criar geração gratuita ou passiva de Nox.
7. Não transformar dungeon em fonte infinita de valor.
8. Não criar spam no Telegram.
9. Não quebrar callback existente registrado em `index.js`.
10. Não adicionar dependência externa sem necessidade forte e explicação.
11. Não fazer refactor amplo quando a tarefa é bugfix pontual.
12. Não deixar botão sem saída, menu morto ou callback sem handler.

---

## 8. Estrutura atual esperada

Estrutura conhecida:

- `index.js`
- `package.json`
- `docs/AI_SYSTEM_PROMPT.md`
- `tests/`
- `src/commands/`
- `src/core/arena/`
- `src/core/chests/`
- `src/core/combat/`
- `src/core/daily/`
- `src/core/dungeon/`
- `src/core/economy/`
- `src/core/metrics/`
- `src/core/player/`
- `src/core/world/`
- `src/data/`
- `src/handlers/`
- `src/menus/`
- `src/services/`
- `src/utils/`

Handlers conhecidos:

- `profile`
- `inventoryV3`
- `combatActive`
- `travel`
- `energy`
- `vip`
- `daily`
- `online`
- `ranking`
- `dungeon`
- `shop`
- `arena`
- `arenaShop`
- `expedition`

Se a estrutura real divergir, priorizar o código real do repositório, não este documento.

---

## 9. Callbacks críticos do Telegram

Antes de alterar handler ou menu, verificar `index.js`.

Callbacks principais conhecidos:

- `menu`
- `profile`
- `inventory`
- `energy`
- `travel`
- `shop`
- `daily`
- `vip`
- `online`
- `ranking`
- `hunt`
- `dungeon`
- `arena`
- `expedition`

Combate:

- `combat_attack`
- `combat_defend`
- `combat_soul_0`
- `combat_soul_1`
- `combat_soul_menu`
- `combat_consumables`
- `combat_use:potionHp`
- `combat_use:potionEnergy`
- `combat_use:tonicStrength`
- `combat_use:tonicDefense`
- `combat_loot:*`
- `combat_loot_equip:*`
- `combat_flee`
- `combat_back`

Inventário:

- `invcat:*`
- `invpage:*:*`
- `eqp:*:*:*`
- `eqid:*:*:*`
- `eq:*:*:*`
- `uneq:*:*:*`
- `equip_soul_slot:*:*`
- `equip_soul_*`
- `unequip_soul_*`
- `invskin:equip:*`
- `invskin:unequip:*`
- `use_potion_outside_hp`
- `use_tonic_strength`
- `use_tonic_defense`

Dungeon:

- `dungeon`
- `dungeon_start`
- `dungeon_confirm_start`
- `dungeon_attack`
- `dungeon_next_room`
- `dungeon_flee`
- `dungeon_soul_menu`
- `dungeon_soul_0`
- `dungeon_soul_1`
- `dungeon_consumables`
- `dungeon_use:potionHp`
- `dungeon_use:potionEnergy`
- `dungeon_use:tonicStrength`
- `dungeon_use:tonicDefense`

Arena:

- `arena`
- `arena_fight`
- `arena_attack`
- `arena_defend`
- `arena_flee`
- `arena_consumables`
- `arena_use:potionHp`
- `arena_use:potionEnergy`
- `arena_use:tonicStrength`
- `arena_use:tonicDefense`
- `arena_chests`
- `arena_open_chest:*`
- `arena_ranking`
- `arena_shop`
- `arena_shop_buy:*`

Shop:

- `shop_buy_menu`
- `shop_sell`
- `shop_sell_page_*`
- `sell_preview_*`
- `sell_confirm_key_*`
- `sell_confirm_*`
- `shop_village`
- `shop_castle`
- `shop_arena`
- `shop_buy_confirm:*:*`
- `shop_buyqty:*:*`
- `shop_backtab:*`
- `buy_*`

Expedition:

- `expedition`
- `exp_start:*`
- `exp_claim`

Preservar esses callbacks ou explicar claramente qualquer alteração.

---

## 10. Player state e persistência

Campos importantes do jogador:

- `id`
- `name`
- `class`
- `level`
- `xp`
- `hp`
- `maxHp`
- `atk`
- `def`
- `crit`
- `gold`
- `nox`
- `glorias`
- `keys`
- `energy`
- `maxEnergy`
- `lastEnergyUpdate`
- `vip`
- `vipExpires`
- `inventory`
- `maxInventory`
- `bonusInventory`
- `equipment`
- `consumables`
- `buffs`
- `soulsInventory`
- `soulsEquipped`
- `cosmetics`
- `activeCosmetics`
- `currentMap`
- `dungeonProgress`
- `lastDungeonRun`
- `soulPityCounter`
- `itemPityCounter`
- `arena`
- `expedition`
- `timedChests`
- `dailyMissions`
- `activeFight`
- `activeArenaBattle`

Regras:

1. `activeFight` e `activeArenaBattle` são estados transitórios críticos.
2. `dungeonProgress` não deve ser limpo fora do fluxo correto.
3. `soulsEquipped` pode conter `[null, null]`; tratar com cuidado.
4. `effect` de alma pode ter estrutura variável; não simplificar schema.
5. Itens podem ter `id`, `instanceId`, metadados legados e slots migrados.
6. `recalculateStats` não deve curar jogador para HP cheio sem regra explícita.
7. `savePlayer` deve preservar estados transitórios quando aplicável.

---

## 11. Classes oficiais

Classes permitidas:

- `guerreiro`
- `arqueiro`
- `mago`

Stats base conhecidos:

- Guerreiro: ATK 12, DEF 10, HP 120, CRIT 5
- Arqueiro: ATK 15, DEF 6, HP 100, CRIT 10
- Mago: ATK 18, DEF 4, HP 80, CRIT 8

Crescimento base:

- ATK: +2 por level
- DEF: +1 por level
- HP: +8 por level
- CRIT: +0,5 arredondado por level

Subclasses devem emergir de equipamentos, almas e builds, não de novas classes fixas.

---

## 12. Atributos oficiais

Atributos centrais:

- `atk`
- `hp`
- `def`
- `crit`

Evitar adicionar velocidade, mana, stamina, inteligência, força, destreza ou outros atributos antes de estabilidade do core loop.

Complexidade prematura aumenta bug e destrói balance.

---

## 13. Energia

Regras oficiais atuais:

- Energia base: 20
- Energia VIP: 40
- Regeneração normal: 10 minutos
- Regeneração VIP: 8 minutos
- Caçar consome 1 energia
- Dungeon não consome energia
- Dungeon consome chave
- Fugir da dungeon não consome energia

Arquivos prováveis:

- `src/services/energyService.js`
- `src/data/balance.js`
- `src/handlers/energy.js`
- `src/handlers/combatActive.js`
- `src/handlers/dungeon.js`
- `src/core/player/playerService.js`
- `tests/energyService.test.js`

Regra crítica: HP não pode restaurar cheio ao iniciar nova luta. HP só deve mudar por dano, cura, level up controlado, descanso, admin heal ou regra explícita.

---

## 14. Economia e NOX

Moedas:

- `gold`: moeda comum
- `glorias`: status/arena
- `keys`: entrada de dungeon
- `nox`: premium real

Regra absoluta do NOX:

1. 1 Nox = R$1.
2. Nox nunca dropa em combate comum.
3. Nox nunca é recompensa padrão.
4. Nox não deve vir de daily comum, arena comum, dungeon comum ou baú comum.
5. Nox só pode ser obtido por compra real, comando admin explícito ou evento especial extremamente controlado.
6. Não criar pay-to-win.

Monetização permitida:

- cosméticos
- skins
- molduras
- títulos
- auras
- badges
- conveniência limitada
- energia extra limitada
- slots de inventário
- prestígio
- VIP moderado

VIP atual conhecido:

- Energia máxima: 40
- Regeneração: 8 minutos
- XP: +10%
- Gold: +10%
- Inventário: 30

Bônus VIP acima de 10% deve ser tratado como risco de pay-to-win.

---

## 15. Mapas oficiais atuais

Mapas atuais:

1. `clareira_sombria` — level 1 — lootTier 1 — dungeon: Bosque Profano
2. `cripta_em_ruinas` — level 8 — lootTier 2 — dungeon: Catacumbas Perdidas
3. `pantano_corrompido` — level 15 — lootTier 3 — dungeon: Covil da Putrefação
4. `deserto_incandescente` — level 24 — lootTier 4 — dungeon: Templo Escarlate
5. `citadela_lunar` — level 32 — lootTier 5 — dungeon: Torre do Eclipse
6. `abismo_noctra` — level 42 — lootTier 6 — dungeon: Trono do Vazio

Ao alterar mapas:

- atualizar `src/core/world/maps.js`
- verificar `src/core/world/enemies.js`
- verificar `src/data/assets.js`
- verificar drops/tiers em `src/data/items*.js`
- rodar `npm test`
- checar `tests/mapsAssets.test.js`

Não reduzir o mundo atual para quatro mapas. O projeto atual já trabalha com seis.

---

## 16. Inimigos e early game

Direção de balance:

- Level 1–3: predominância de inimigos fracos.
- Level 4–7: inimigos médios começam a aparecer com mais frequência.
- Boss/elite no early game deve existir como pico, não como parede frustrante.
- O jogador D1 precisa entender, matar, dropar, equipar e querer voltar.

Não tornar o começo difícil demais. Frustração antes do primeiro loop de recompensa mata retenção.

Arquivos prováveis:

- `src/core/world/enemies.js`
- `src/handlers/combatActive.js`
- `src/core/combat/*`
- `src/data/balance.js`
- `tests/combat*.test.js`
- `tests/coreRules.test.js`

---

## 17. Dungeon

Regras oficiais:

- Cada mapa tem dungeon própria.
- Dungeon usa chave, não energia.
- Entrada consome 1 chave.
- Chave deve ser rara.
- Chave pode dropar de bosses de campo com baixa chance.
- Dungeon tem salas sequenciais.
- Bosses ficam progressivamente mais fortes.
- Ao vencer sala, deve haver botão claro para avançar.
- Ao completar, recompensa final deve ser melhor que caça comum.
- Preparar cooperação futura sem implementar coop real cedo demais.

Balance conhecido de chaves:

- `fieldMiniBossKeyDropChance`: 0.07
- `fieldBossKeyDropChance`: 0.22
- `dungeonTreasureKeyDropChance`: 0.06
- `dungeonCurseKeyDropChance`: 0.04
- `dungeonCompletionKeyReward`: 0

Não transformar dungeon em caça premium infinita.

---

## 18. Almas

Almas são o sistema de skills.

Regras:

- Jogador equipa até 2 almas.
- Almas são raras.
- Bosses têm maior chance de dropar almas.
- Almas devem criar builds diferentes.
- Não criar skills genéricas fora do sistema de almas.
- Não criar árvore de classe ou skill fixa fora de almas neste estágio.

Balance conhecido:

- `fieldEliteThematicDropChance`: 0.01
- `fieldMiniBossThematicDropChance`: 0.02
- `fieldBossDropChance`: 0.05
- `dungeonBossDropChance`: 0.08
- `worldBossDropChance`: 0.15
- `eventBossDropChance`: 0.20
- `pityBoostAt`: 8
- `pityMultiplier`: 2.5

Dungeon pode ser melhor que campo, mas não pode virar fábrica de almas.

---

## 19. Inventário e equipamentos

Categorias desejadas:

- armas
- armaduras
- joias/acessórios
- consumíveis
- skins
- almas
- outros/chaves

Slots oficiais:

- `weapon`
- `shield`
- `armor`
- `necklace`
- `ring`
- `boots`

Regras:

1. Não duplicar item ao equipar/desequipar.
2. Não perder item silenciosamente.
3. Não equipar item em slot errado.
4. Respeitar `classRestriction` e `allowedClasses` quando existirem.
5. Preservar `instanceId`.
6. Preservar dados legados.
7. Recalcular stats corretamente.
8. Não destruir `inventoryV3`.

Capacidade conhecida:

- base: 20
- VIP: 30
- expansão premium: +5
- bônus máximo premium: +30

---

## 20. Combate

Combate deve ser simples, legível e viciante.

Mostrar quando aplicável:

- HP do jogador
- HP do inimigo
- barra visual de HP
- dano causado
- dano recebido
- crítico
- loot
- XP
- ouro/recompensa
- botões claros após vitória/derrota

Botões principais:

- ⚔️ Atacar
- ✨ Almas
- 🧪 Consumíveis
- 🏃 Fugir

Evitar:

- texto duplicado
- nome do inimigo duplicado
- HP restaurando indevidamente
- loop travado
- callback quebrado
- menu sem saída
- spam no chat
- mensagens antigas acumulando

`combatActive` é o entrypoint canônico atual para combate comum, salvo instrução explícita contrária.

Após vitória, oferecer caminho claro:

- caçar novamente
- ver loot/inventário
- menu

Após derrota, oferecer caminho claro:

- usar poção se disponível
- descansar/energia se aplicável
- menu

---

## 21. UX Telegram

Prioridade:

- menus bonitos
- hierarquia visual clara
- botões previsíveis
- feedback imediato
- pouca poluição no chat
- menos mensagens novas quando edição resolve
- evitar dead-ends
- preservar imagens quando menu usa media

Usar quando aplicável:

- `src/utils/uiNavigator.js`
- `navigateScreen`
- `tryDeleteCurrentMessage`

Padrão visual recomendado:

- separadores como `━━━━━━━━━━━━━━━━━━━━━━`
- títulos claros
- emojis com moderação
- blocos curtos
- botões por contexto
- botão de voltar/menu quando fizer sentido

---

## 22. Assets e imagens

Assets são controlados principalmente por `src/data/assets.js` e file_id do Telegram.

Categorias conhecidas:

- enemies
- maps
- profile
- bosses
- items
- ui

Direção visual:

- dark fantasy
- original
- sombrio
- consistente
- legível em tela pequena
- sem texto dentro da imagem
- sem copiar Teletofus
- composição clara
- adequada ao Telegram

Ao alterar assets:

- não inventar `file_id`
- não apagar asset existente sem justificar
- verificar IDs usados por mapas/inimigos/bosses/perfil
- rodar `npm test`
- verificar `tests/mapsAssets.test.js`

---

## 23. Testes

Sempre rodar:

```bash
npm test
```

Áreas que exigem atenção especial:

- energia → `tests/energyService.test.js`
- mapas/assets → `tests/mapsAssets.test.js`
- economia/core rules → `tests/coreRules.test.js`
- combate → `tests/combat*.test.js`
- dungeon → `tests/dungeon*.test.js`
- inventário → `tests/inventory*.test.js`
- shop → `tests/shop*.test.js`
- arena → `tests/arena*.test.js`
- métricas → `tests/metrics*.test.js`
- cosméticos → `tests/cosmetics.test.js`

Se uma mudança corrige bug sem teste, adicionar teste quando tecnicamente viável.

Teste manual mínimo no Telegram após mudança sensível:

1. `/start`
2. criar personagem
3. abrir menu
4. caçar
5. atacar
6. vencer
7. ver loot
8. abrir inventário
9. equipar/desequipar
10. usar consumível
11. viajar
12. entrar/preparar dungeon
13. arena
14. daily
15. shop

---

## 24. Métricas e retenção

Toda feature relevante deve considerar:

D1:

- jogador entende rápido?
- mata primeiros monstros?
- ganha loot cedo?
- vê progresso?
- volta?

D7:

- tem rotina diária?
- entende energia, dungeon, almas e inventário?
- já tem objetivo de build?
- tentou ranking/arena?

D30:

- tem coleção?
- tem raridade/status?
- tem ranking/evento?
- tem cosmético?
- tem objetivo longo?

Não adicionar feature bonita que não melhore estabilidade, retenção, economia, monetização ética ou clareza.

---

## 25. LiveOps futuro

Preparar arquitetura para:

- eventos semanais
- boss global
- ranking
- temporadas
- guildas
- loja rotativa
- baús
- cosméticos limitados
- missões diárias
- missões semanais
- passe não pay-to-win

Não implementar tudo de uma vez. Base estável primeiro.

---

## 26. Proibições estratégicas atuais

Não fazer agora sem ordem explícita:

1. criar novas classes
2. adicionar muitos atributos
3. refatorar tudo do zero
4. criar pay-to-win
5. permitir Nox dropável
6. criar skills fora de almas
7. implementar guilda complexa
8. implementar coop real antes da base estável
9. criar crafting/fusão avançada antes de inventário estar sólido
10. apagar arquivos grandes para “limpar” projeto

---

## 27. Formato de resposta técnica

Para bug:

- diagnóstico provável
- arquivos envolvidos
- fluxo quebrado
- correção proposta
- arquivos alterados
- testes executados
- teste manual no Telegram
- riscos

Para melhoria:

- decisão recomendada
- impacto em retenção
- impacto econômico
- impacto técnico
- risco de bug
- ordem de implementação

Para PR:

- resumo
- arquivos alterados
- testes
- riscos
- validação local
- validação Telegram
- pontos para revisão humana

---

## 28. Checklist antes de finalizar PR

- [ ] Escopo mínimo respeitado
- [ ] Arquivos reais lidos antes da alteração
- [ ] Sem callback quebrado
- [ ] Sem Nox em drop/recompensa comum
- [ ] Sem cura indevida de HP
- [ ] Sem dungeon consumindo energia
- [ ] Sem perda/duplicação de item
- [ ] Sem apagar estado transitório crítico
- [ ] Sem spam novo no Telegram
- [ ] Compatibilidade com dados antigos considerada
- [ ] `npm test` executado ou limitação declarada
- [ ] Teste manual descrito
- [ ] Riscos documentados

---

## 29. Princípio final

NOCTRA deve ser simples de começar, difícil de largar e profundo o suficiente para reter por meses.

O agente não deve agir como gerador de código solto. Deve agir como engenheiro de produto: proteger estabilidade, loops de retenção, economia e experiência do jogador.
