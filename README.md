# NOCTRA

Entre na escuridão. Evolua sem fim.

NOCTRA é um idle RPG / social RPG para Telegram com foco em sessões curtas, progressão viciante, loot, builds, rotina diária, dungeons, arena, rankings e monetização ética.

---

## 1. Visão do produto

NOCTRA foi desenhado para ser um RPG sombrio, fácil de entrar, intuitivo no Telegram e difícil de largar.

A promessa central do jogo é simples:

> sempre existe um próximo loot, uma próxima alma, um próximo boss, uma próxima dungeon ou uma build melhor.

### North Star

Toda decisão de sistema, UX, economia e monetização deve responder:

- por que o jogador volta hoje?
- por que volta amanhã?
- por que continua após 30 dias?

### Pilares

1. **Retenção diária**
   - energia
   - daily rewards
   - baús temporizados
   - missões
   - retorno múltiplo ao dia

2. **Progressão viciante**
   - level
   - mapas
   - loot raro
   - equipamentos
   - almas
   - builds

3. **Conteúdo social / competitivo**
   - ranking
   - arena
   - dungeons
   - futura camada de guildas
   - futuros bosses globais

4. **Monetização ética**
   - Nox
   - VIP
   - conveniência
   - cosméticos
   - qualidade de vida
   - nunca vender dano bruto como atalho pay-to-win

---

## 2. Core loop oficial

### Sessão curta

Caçar → Combater → Loot → Upgrade → Repetir

### Meta loop

Level → Mapa → Boss → Dungeon → Alma → Build → Ranking → Guilda

Regra de produto: feature que não fortalece esse loop deve ser tratada como distração.

---

## 3. Regras econômicas fixas

- Moeda premium: **Nox**
- Regra: **R$1 = 1 Nox**
- Nox não deve dropar em combate normal
- Ouro é recurso base do jogo
- Glórias são recurso competitivo da arena
- `arena.coins` é legado interno e não deve aparecer na UX
- Monetização deve priorizar conveniência, cosmético, prestígio e QoL
- Nox não deve comprar alma rara, item raro, dano bruto ou chave como atalho competitivo

---

## 4. Estado atual do projeto

O NOCTRA está em estágio **alpha jogável estruturado**.

Já existe:

- menu principal funcional
- criação de personagem
- classes base
- combate PvE
- sistema de energia
- mapas e inimigos
- drops V2 por mapa, classe, raridade e tipo de encontro
- inventário V3
- equipamentos com regras de mão secundária
- almas
- consumíveis
- loja principal
- venda de loot
- premium QoL sem pay-to-win
- arena
- arena shop
- Glórias consolidadas como moeda competitiva
- baús da arena
- dungeons
- daily rewards
- baús temporizados
- ranking
- VIP
- sistema admin
- métricas básicas
- testes automatizados em expansão
- assets via `file_id` do Telegram

O que ainda não existe de forma validada:

- retenção D1 / D7 / D30 medida com base real
- economia calibrada por dados reais
- balanceamento final de XP, ouro, Glórias, drops e baús
- UX V2 das almas
- renderer dedicado para telas grandes
- guildas
- world boss
- eventos sazonais maduros
- monetização V2

---

## 5. Estrutura real do repositório

Esta é a árvore funcional atual do repositório `Noctra-teste`. Alguns arquivos antigos ainda podem existir, mas os fluxos principais já usam versões novas como `inventoryV3.js`, `combatFixed.js` e `itemsV2.js`.

```text
Noctra-teste/
├── .github/
│   └── workflows/
│       └── backup-sync.yml
│
├── .gitignore
├── index.js
├── package.json
├── README.md
│
├── docs/
│   ├── QA_MANUAL.md
│   └── ROADMAP.md
│
├── tests/
│   ├── arenaGloriasPolish.test.js
│   ├── arenaShopGlorias.test.js
│   ├── arenaShopQol.test.js
│   ├── arenaUxPolish.test.js
│   ├── cosmetics.test.js
│   ├── energyService.test.js
│   ├── mapsAssets.test.js
│   ├── premiumShopQol.test.js
│   ├── shopPlayerValidation.test.js
│   ├── shopTelegrafNextParam.test.js
│   ├── shopWalletDisplay.test.js
│   └── shopWalletMongoose.test.js
│
└── src/
    ├── commands/
    │   ├── admin.js
    │   ├── class.js
    │   ├── equip.js
    │   ├── rename.js
    │   └── reset.js
    │
    ├── core/
    │   ├── arena/
    │   │   ├── arenaBattleService.js
    │   │   ├── arenaCurrency.js
    │   │   ├── arenaPersistence.js
    │   │   └── arenaService.js
    │   │
    │   ├── chests/
    │   │   └── chestService.js
    │   │
    │   ├── combat/
    │   │   ├── combatEngine.js
    │   │   ├── damageCalc.js
    │   │   ├── fightPersistence.js
    │   │   └── fightService.js
    │   │
    │   ├── daily/
    │   │   └── dailyService.js
    │   │
    │   ├── dungeon/
    │   │   ├── dungeonRewards.js
    │   │   ├── dungeonRooms.js
    │   │   └── dungeonService.js
    │   │
    │   ├── economy/
    │   │   ├── nox.js
    │   │   ├── shopLogic.js
    │   │   └── walletPresenter.js
    │   │
    │   ├── metrics/
    │   │   ├── MetricsModel.js
    │   │   └── metricsService.js
    │   │
    │   ├── player/
    │   │   ├── PlayerModel.js
    │   │   ├── README_AUDIT_REFACTOR.md
    │   │   ├── cosmetics.js
    │   │   ├── equipmentService.js
    │   │   ├── playerMutations.js
    │   │   ├── playerSaveGuard.js
    │   │   ├── playerService.js
    │   │   ├── progression.js
    │   │   └── souls.js
    │   │
    │   └── world/
    │       ├── enemies.js
    │       └── maps.js
    │
    ├── data/
    │   ├── arenaShopItems.js
    │   ├── assets.js
    │   ├── balance.js
    │   ├── constants.js
    │   ├── items.js
    │   ├── itemsV2.js
    │   └── shopItems.js
    │
    ├── handlers/
    │   ├── arena.js
    │   ├── arenaShop.js
    │   ├── combat.js
    │   ├── combatFixed.js
    │   ├── daily.js
    │   ├── dungeon.js
    │   ├── energy.js
    │   ├── inventory.js
    │   ├── inventoryPersistenceAdapter.js
    │   ├── inventoryV3.js
    │   ├── online.js
    │   ├── profile.js
    │   ├── ranking.js
    │   ├── shop.js
    │   ├── travel.js
    │   └── vip.js
    │
    ├── menus/
    │   ├── combatMenu.js
    │   ├── inventoryMenu.js
    │   ├── mainMenu.js
    │   └── shopMenu.js
    │
    ├── services/
    │   ├── banCacheService.js
    │   ├── energyService.js
    │   └── rewardService.js
    │
    └── utils/
        ├── formatters.js
        ├── helpers.js
        └── uiNavigator.js
```

---

## 6. Arquivos ativos importantes

### Entrada

- `index.js`: registra bot, comandos, callbacks, middlewares, criação de personagem, servidor HTTP e shutdown.

### Fluxos principais ativos

- Inventário ativo: `src/handlers/inventoryV3.js`
- Combate ativo: `src/handlers/combatFixed.js`
- Drops ativos: `src/data/itemsV2.js`
- Recompensas ativas: `src/services/rewardService.js`
- Loja ativa: `src/handlers/shop.js`
- Arena ativa: `src/handlers/arena.js`

### Arquivos legados ainda existentes

- `src/handlers/inventory.js`
- `src/handlers/combat.js`
- `src/data/items.js`

Regra: antes de mexer nesses arquivos, confirmar se ainda são usados por `index.js` ou por algum `require` ativo.

---

## 7. Responsabilidade das pastas

### `index.js`

Entrada principal do bot. Hoje concentra:

- carregamento de variáveis de ambiente
- inicialização do Telegraf
- conexão com MongoDB
- HTTP server para Render
- registro de comandos
- registro de callbacks
- middlewares
- fluxo de criação de personagem
- shutdown seguro

Ponto de atenção: o arquivo funciona, mas já está grande demais. Deve ser quebrado futuramente em camada de bootstrap.

### `src/commands/`

Comandos digitados pelo jogador ou admin.

Exemplos:

- `/rename`
- `/class`
- `/equip`
- `/reset`
- `/adminhelp`
- `/metrics`
- `/give`
- `/ban`
- `/unban`

### `src/handlers/`

Camada de interação com botões, telas e fluxos do Telegram.

Ponto de atenção: handlers não devem virar depósito de regra de negócio. Sempre que uma regra crescer, deve migrar para `core/`, `services/` ou `renderers/`.

### `src/core/`

Coração do jogo. Contém regra estrutural de arena, combate, dungeon, economia, player, mundo, métricas e baús.

### `src/data/`

Tabelas e configurações estáticas:

- itens
- drops V2
- loja
- arena shop
- assets
- balanceamento
- constantes

### `src/menus/`

Teclados inline e menus reutilizáveis.

### `src/services/`

Serviços reaproveitáveis que não pertencem diretamente a um handler.

### `src/utils/`

Funções utilitárias, formatadores, helpers e navegação de UI.

### `tests/`

Testes automatizados com foco em regressões críticas.

---

## 8. Sistemas implementados

### Personagem

- criação de personagem
- nome
- classe
- progressão
- equipamentos
- almas
- cosméticos
- persistência no MongoDB

### Classes base

- Guerreiro
- Arqueiro
- Mago

As subclasses não precisam ser fixas no cadastro. A build deve emergir por equipamentos, stats e almas.

### Combate

- caça por mapa
- ataque
- defesa
- fuga
- uso de consumíveis
- uso de almas
- persistência de luta
- cálculo de dano separado
- visualização de item dropado
- equipar item dropado

### Energia

- padrão: 20
- VIP: 40
- regeneração normal: 10 minutos
- regeneração VIP: 8 minutos
- caça consome energia
- dungeon consome chave, não energia

### Drops V2

- drops por mapa
- drops por tier de encontro
- raridade progressiva
- viés por classe
- armas, armaduras, botas, mão secundária e joias
- traits de item
- origem do item por mapa

### Dungeon

- serviço próprio
- salas próprias
- recompensas próprias
- conteúdo de maior valor que farm comum

### Arena

- serviço de arena
- batalha de arena
- persistência de arena
- ranking competitivo
- loja própria
- Glórias como moeda competitiva oficial
- baús da arena
- UX visual polida

### Daily / Chests

- daily service
- chest service
- baús temporizados
- rotina de retorno

### Loja

- loja principal
- compra por ouro, Nox e Glórias
- venda de loot
- premium QoL
- carteira centralizada via `walletPresenter`

### Métricas

- modelo de métricas
- serviço de métricas
- base para leitura de operação e economia

---

## 9. Dívida técnica atual

Principais pontos de risco:

1. `index.js` grande demais.
2. `src/handlers/inventoryV3.js` tende a ficar pesado.
3. `src/handlers/shop.js` ainda mistura UI com economia e fluxo de botões.
4. `src/handlers/arena.js` precisa continuar delegando para `core/arena`.
5. `src/commands/admin.js` pode virar arquivo inchado se crescer sem separação.
6. Falta uma pasta `src/renderers/` para padronizar textos e telas.
7. Falta uma pasta `src/core/loot/` para centralizar drops, raridade, pity e recompensas.
8. README e docs precisam ser atualizados sempre que arquivo ativo mudar.

---

## 10. Próxima arquitetura recomendada

A próxima evolução estrutural deve ser gradual, não uma reescrita total.

```text
src/
├── app/
│   ├── bot.js
│   ├── httpServer.js
│   ├── registerActions.js
│   ├── registerCommands.js
│   └── registerMiddlewares.js
│
├── renderers/
│   ├── soulRenderer.js
│   ├── arenaRenderer.js
│   ├── combatRenderer.js
│   ├── dungeonRenderer.js
│   ├── inventoryRenderer.js
│   ├── profileRenderer.js
│   └── shopRenderer.js
│
└── core/
    ├── loot/
    │   ├── dropService.js
    │   ├── lootTables.js
    │   └── pityService.js
    │
    └── ...demais módulos atuais
```

Ordem correta:

1. Criar `src/renderers/soulRenderer.js`.
2. Melhorar UX de Almas no inventário.
3. Criar detalhe individual de Alma.
4. Melhorar drop visual de Alma em combate.
5. Balancear chance/pity com testes.
6. Só depois começar refactor maior de `index.js`.

---

## 11. Scripts

```bash
npm start
npm run dev
npm test
```

- `npm start` inicia o bot com `node index.js`
- `npm run dev` inicia com `nodemon index.js`
- `npm test` executa os testes com `node --test`

---

## 12. QA manual

O QA manual detalhado está em:

```text
docs/QA_MANUAL.md
```

Antes de qualquer merge grande, testar pelo menos:

- `/start`
- menu principal
- combate
- inventário
- loja
- arena
- dungeon
- daily

---

## 13. Roadmap

O roadmap operacional está em:

```text
docs/ROADMAP.md
```

Prioridade atual:

```text
Almas V2 → Balanceamento inicial → Dungeon V2 → Métricas de retenção → Guildas/World Boss
```

---

## 14. Frase de controle

O NOCTRA não precisa de mais ideias soltas.

Precisa de:

- disciplina de escopo
- estabilidade
- balanceamento
- métricas
- retenção real
- refactor cirúrgico
- evolução modular
