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
   - souls
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
- Monetização deve priorizar conveniência, cosmético, prestígio e QoL

---

## 4. Estado atual do projeto

O NOCTRA está em estágio alpha estruturado.

Já existe:

- menu principal funcional
- criação de personagem
- classes base
- combate PvE
- sistema de energia
- mapas e inimigos
- inventário
- equipamentos
- souls
- consumíveis
- loja principal
- arena
- arena shop
- dungeons
- daily rewards
- baús temporizados
- ranking
- VIP
- sistema admin
- métricas básicas
- testes iniciais
- assets via `file_id` do Telegram

O que ainda não existe de forma validada:

- retenção D1 / D7 / D30 medida com base real
- economia calibrada por dados
- balanceamento final
- guildas
- world boss
- eventos sazonais maduros
- monetização V2

---

## 5. Estrutura real do repositório

Esta é a árvore estrutural real observada no repositório `Noctra-teste`.

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
├── tests/
│   ├── cosmetics.test.js
│   ├── energyService.test.js
│   └── mapsAssets.test.js
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
    │   │   └── shopLogic.js
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
    │   └── shopItems.js
    │
    ├── handlers/
    │   ├── arena.js
    │   ├── arenaShop.js
    │   ├── combat.js
    │   ├── daily.js
    │   ├── dungeon.js
    │   ├── energy.js
    │   ├── inventory.js
    │   ├── inventoryPersistenceAdapter.js
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
    │   ├── energyService.js
    │   └── rewardService.js
    │
    └── utils/
        ├── formatters.js
        ├── helpers.js
        └── uiNavigator.js
```

---

## 6. Responsabilidade das pastas

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

Ponto de atenção: handlers não devem virar depósito de regra de negócio. Sempre que uma regra crescer, deve migrar para `core/` ou `services/`.

### `src/core/`

Coração do jogo. Contém regra estrutural de arena, combate, dungeon, economia, player, mundo, métricas e baús.

Esta é a camada mais importante para escalar o jogo.

### `src/data/`

Tabelas e configurações estáticas:

- itens
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

Testes automatizados iniciais.

Atualmente cobre:

- cosméticos
- energia
- assets dos mapas

---

## 7. Sistemas implementados

### Personagem

- criação de personagem
- nome
- classe
- progressão
- equipamentos
- souls
- cosméticos
- persistência no MongoDB

### Classes base

- Guerreiro
- Arqueiro
- Mago

As subclasses não precisam ser fixas no cadastro. A build deve emergir por equipamentos, stats e souls.

### Combate

- caça por mapa
- ataque
- defesa
- fuga
- uso de consumíveis
- uso de souls
- persistência de luta
- cálculo de dano separado

### Energia

- padrão: 20
- VIP: 40
- regeneração normal: 10 minutos
- regeneração VIP: 8 minutos
- caça consome energia
- dungeon consome chave, não energia

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
- glórias

### Daily / Chests

- daily service
- chest service
- baús temporizados
- rotina de retorno

### Métricas

- modelo de métricas
- serviço de métricas
- base para leitura de operação e economia

---

## 8. Dívida técnica atual

Principais pontos de risco:

1. `index.js` grande demais.
2. `src/handlers/inventory.js` tende a ficar pesado.
3. `src/handlers/shop.js` tende a misturar UI com economia.
4. `src/handlers/arena.js` precisa continuar delegando para `core/arena`.
5. `src/commands/admin.js` pode virar arquivo inchado se crescer sem separação.
6. Falta uma pasta `renderers/` para padronizar textos e telas.
7. Falta uma pasta `core/loot/` para centralizar drops, raridade, pity e recompensas.

---

## 9. Próxima arquitetura recomendada

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

1. Quebrar `index.js`.
2. Criar `renderers/`.
3. Criar `core/loot/`.
4. Reduzir peso de `inventory.js`.
5. Reduzir peso de `shop.js`.
6. Só depois abrir guildas, world boss e eventos.

---

## 10. Scripts

```bash
npm start
npm run dev
npm test
```

- `npm start` inicia o bot com `node index.js`
- `npm run dev` inicia com `nodemon index.js`
- `npm test` executa os testes com `node --test`

---

## 11. Checklist de QA manual

### Home

- `/start`
- criação de personagem
- menu principal
- retorno ao menu
- navegação entre telas

### Combate

- caçar
- atacar
- defender
- usar consumível
- usar soul
- fugir
- vencer
- morrer
- validar XP, ouro, drops e energia

### Dungeon

- iniciar dungeon
- consumir chave
- avançar salas
- vencer boss
- morrer
- fugir
- validar recompensa final

### Inventário

- abrir categorias
- equipar item
- desequipar item
- comparar item
- usar consumível
- equipar soul
- remover soul
- equipar skin

### Loja

- comprar item
- comprar quantidade
- vender item
- saldo insuficiente
- retorno para aba correta

### Arena

- iniciar luta
- atacar
- defender
- fugir
- usar consumível
- abrir ranking
- abrir baús
- usar arena shop

### Admin

- `/adminhelp`
- `/metrics`
- `/findplayer`
- `/playerstate`
- `/setplayer`
- `/give`
- `/ban`
- `/unban`
- `/reset`
- `/resetplayer`
- `/resetall`

---

## 12. Prioridades de produto

### Agora

- estabilidade
- QA manual
- correção de bugs
- balanceamento inicial
- leitura de métricas
- organização do código existente

### Depois

- loot avançado
- pity system
- achievements
- subclasses emergentes
- guildas
- eventos
- world boss
- monetização V2

---

## 13. Frase de controle

O NOCTRA não precisa de mais ideias soltas.

Precisa de:

- disciplina de escopo
- estabilidade
- balanceamento
- métricas
- retenção real
- refactor cirúrgico
- evolução modular
