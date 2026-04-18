# NOCTRA

Entre na escuridão. Evolua sem fim.

NOCTRA é um idle RPG / social RPG para Telegram com foco em sessões curtas, progressão viciante, loot, builds, rotina diária, dungeons, arena e monetização ética.

---

## 1. Visão do produto

### Proposta central
NOCTRA foi desenhado para ser um RPG sombrio, fácil de entrar, intuitivo no Telegram e difícil de largar.

A promessa emocional do produto é simples:

> sempre existe um próximo loot, uma próxima alma, um próximo boss ou uma build melhor.

### North Star do produto
Toda decisão de sistema, UX, economia e monetização deve responder:
- por que o jogador volta hoje?
- por que volta amanhã?
- por que continua após 30 dias?

### Pilares estratégicos
1. **Retenção diária**
   - energia
   - daily rewards
   - missões
   - retorno múltiplo ao dia
   - dungeons com cooldown

2. **Progressão viciante**
   - level
   - mapas
   - loot raro
   - souls
   - subclasses
   - builds

3. **Cooperação social**
   - ranking
   - arena
   - futuro sistema de guildas
   - futuro sistema de bosses cooperativos e eventos

4. **Monetização ética**
   - conveniência
   - cosméticos
   - VIP
   - QoL
   - nunca pay-to-win

---

## 2. Core loop oficial

### Sessão curta
Caçar → Combater → Loot → Upgrade → Repetir

### Meta loop
Level → Mapa → Boss → Dungeon → Alma → Build → Ranking → Guilda

### Regra de produto
Toda feature nova deve fortalecer esse loop.
Feature que distrai do loop principal enfraquece o produto.

---

## 3. Identidade, lore e tom

### Identidade
- RPG sombrio
- progressão clara
- loot raro
- builds profundas
- mapas escaláveis
- sensação constante de próxima melhoria

### Lore oficial
Noctra é um mundo consumido pela escuridão ancestral.
Criaturas corrompidas, almas fragmentadas e bosses lendários emergem de cada região.
Cada mapa representa uma camada mais profunda da corrupção.
Os jogadores são Caçadores da Noite, responsáveis por restaurar o equilíbrio através de combate, loot, almas e dungeons.

A lore deve continuar curta, forte e expansível para eventos futuros.

---

## 4. Estado atual do projeto

O projeto já saiu da fase de bot funcional desorganizado e entrou em um estágio de alpha mais coerente.

### Situação atual
Hoje o NOCTRA já possui:
- home mais limpa e mais orientada à ação
- menu principal com hierarquia melhor
- telas de energia e diário refinadas
- shop mais clara e com compra em quantidade para consumíveis
- inventário mais legível para comparação de equipamentos
- arena com mais peso visual e melhor apresentação
- perda de XP ao morrer em PvE / dungeon
- métricas básicas de operação e economia
- camada admin muito mais robusta

### O que isso não significa
O produto ainda **não** está validado comercialmente.
Ainda faltam:
- validação real de retenção
- auditoria dura de balanceamento
- tuning econômico baseado em dados
- redução de dívida técnica
- aprofundamento de sistemas futuros (guildas, eventos, world bosses, monetização V2)

---

## 5. Sistemas atualmente implementados

### 5.1 Home / menu principal
Melhorias realizadas:
- redução da poluição visual da home
- foco em status imediato + recursos + mapa
- melhor hierarquia dos botões do menu principal

Ordem atual da home:
- Hunt + Viajar
- Masmorra + Arena
- Perfil + Inventário
- Energia + Diário
- Loja + Ranking
- VIP + Online

### 5.2 Combate PvE
- caça por mapa
- inimigos por faixa e progressão
- interface por botões inline
- ataque, defesa, fuga, consumíveis e almas
- resultado de vitória, derrota e fuga
- perda de 5% do XP atual ao morrer em PvE

### 5.3 Energia
Regras oficiais:
- padrão: 20
- VIP: 40
- regeneração: 10 min normal / 8 min VIP
- combate normal consome 1 energia
- dungeon consome chave, não energia

Melhorias já feitas:
- tela de energia mais premium
- melhor leitura de regeneração
- descanso para recuperar HP em troca de energia
- reforço da proposta de valor do VIP

### 5.4 Daily / rotina
- centro diário com streak
- baú diário
- missões diárias
- timed chests
- melhor apresentação do loop diário

### 5.5 Inventário
- categorias por slot / tipo
- consumíveis
- souls
- skins / cosméticos
- melhor diferenciação entre equipamentos do mesmo tipo
- comparação mais clara entre item equipado e candidato
- indicação do item que será substituído

### 5.6 Loja principal
- loja com tabs
- compra e venda
- compra em quantidade para consumíveis (x1 / x5 / x10)
- melhor clareza de wallet
- retorno para a aba correta após compra

### 5.7 Arena
- hub da arena
- combate competitivo
- baús de arena
- ranking
- loja própria da arena
- melhor apresentação de vitória / derrota / fuga

### 5.8 Dungeons
- expedições por salas
- combate / elite / boss / tesouro / fonte / shrine / curse
- resumo final de run
- perda de XP ao morrer em dungeon
- dungeon como conteúdo superior ao farm comum

### 5.9 Admin / operação
Atualmente o painel admin já oferece:
- `/adminhelp`
- `/metrics`
- `/findplayer`
- `/playerstate`
- `/setplayer`
- `/give xp`
- `/give gold`
- `/give nox`
- `/give item`
- `/ban`
- `/unban`
- `/reset`
- `/resetplayer`
- `/resetall`

---

## 6. Economia e monetização

### Princípios fixos
- moeda premium: **Nox**
- regra: **R$1 = 1 Nox**
- Nox nunca dropa
- proibido vender dano ou stats diretos
- monetização deve ser ética

### Estrutura econômica atual
- **ouro**: recursos básicos do loop
- **Nox**: conveniência, VIP, cosméticos, QoL
- **glórias**: camada competitiva / arena

### Loja principal
Hoje a loja foi reorganizada para refletir:
- ouro = base
- Nox = conveniência / premium / VIP / cosmético
- glórias = tático / competitivo

### Arena shop
A arena shop foi redesenhada para:
- utilidade tática limitada
- conveniência moderada
- prestígio competitivo
- evitar atalho exagerado para o PvE

### Situação real da economia
A economia está mais coerente do que no início, mas ainda **não está calibrada**.
Ela precisa de leitura de dados reais para ajuste de:
- preços
- sinks
- valor do VIP
- valor das chaves
- retorno líquido de dungeon
- valor relativo da arena

---

## 7. Progressão, drops e risco

### Classes base
- **Guerreiro**
  - fantasia: tank / sustain / crítico pesado
  - builds: Berserker / Guardião

- **Arqueiro**
  - fantasia: dano rápido / crítico / evasão
  - builds: Atirador / Lanceiro

- **Mago**
  - fantasia: burst mágico / debuffs / cura
  - builds: Veneno / Gélido / Necromante / Curandeiro

### Mapas oficiais
1. **Clareira Sombria** — nível 1–8
   - boss: Alfa da Matilha
2. **Cripta em Ruínas** — nível 8–15
   - boss: Necromante Ancestral
3. **Pântano Corrompido** — nível 15–24
   - boss: Guardião do Lodo
4. **Deserto Incandescente** — nível 24+
   - boss: Faraó das Brasas

### Drop philosophy
- early game = comum / incomum
- mid game = raro / épico
- late game = lendário / mítico
- lendário = bosses e dungeons
- mítico = dungeon elite / evento / world boss

### Souls
Diretrizes oficiais:
- boss comum = 3%
- boss dungeon = 8%
- world boss = 15%
- evento = 20%
- pity: após 10 bosses sem soul, o 11º deve ter chance dobrada

### Risco atual
- derrota PvE = perda de 5% do XP atual
- derrota em dungeon = perda de 5% do XP atual
- arena não remove XP, porque já pune competitivamente

---

## 8. Arquitetura técnica

### Estrutura base do projeto

```text
noctra-rpg-bot/
├── index.js
├── package.json
├── README.md
├── .env
└── src/
    ├── commands/
    ├── core/
    ├── data/
    ├── handlers/
    ├── menus/
    ├── services/
    └── utils/
```

### Regras de engenharia
1. modularidade
2. zero duplicidade quando possível
3. escalabilidade para mapas, guildas e eventos
4. performance
5. legibilidade

### Observação honesta
A arquitetura melhorou bastante, mas ainda há arquivos grandes demais e pontos de dívida técnica.

Arquivos que merecem atenção futura:
- `src/handlers/inventory.js`
- `src/handlers/shop.js`
- `src/handlers/arena.js`
- `src/commands/admin.js`
- `index.js`

---

## 9. O que já foi corrigido / melhorado na prática

### UX / produto
- home menos poluída
- melhor hierarquia de botões
- telas de energia e daily refinadas
- loja mais fluida
- inventário mais claro
- arena mais relevante visualmente

### Economia
- `shopLogic` mais segura
- compra múltipla para consumíveis
- shop items reorganizados
- arena shop mais coerente
- métricas econômicas básicas adicionadas

### Progressão / combate
- maior peso da morte
- uso de consumíveis mais valioso
- dungeon com custo / risco mais respeitável

### Operação
- ajuda admin
- inspeção de player
- edição de player
- resets
- métricas

---

## 10. Dívida técnica atual

### 10.1 Arquivos grandes
A aplicação ainda carrega arquivos muito grandes para a fase futura do projeto.
Isso ainda é aceitável em alpha, mas não deve crescer sem disciplina.

### 10.2 Renderização muito manual
Boa parte das mensagens é montada diretamente nos handlers.
Hoje funciona, mas depois dificulta:
- consistência visual
- manutenção
- padronização

### 10.3 Repetição de padrões de UI
Há padrões parecidos espalhados entre handlers diferentes.
No futuro, isso deve ser consolidado em helpers de renderização.

### 10.4 Painel admin em expansão
A camada admin melhorou muito, mas pode virar bagunça se crescer sem padrão.

---

## 11. Checklist de QA atual

### Home / navegação
- `/start`
- abrir menu principal
- testar todos os botões
- validar retorno ao menu

### Combate
- iniciar caça
- atacar
- defender
- fugir
- usar consumível
- vencer
- morrer
- validar perda de XP

### Dungeon
- iniciar run
- vencer salas
- usar consumível
- fugir
- morrer
- validar perda de XP
- validar resumo final

### Inventário
- abrir categorias
- comparar itens parecidos
- equipar / desequipar
- abrir consumíveis
- abrir souls
- abrir skins

### Loja
- comprar item unitário
- comprar x1 / x5 / x10
- testar saldo insuficiente
- vender item
- validar retorno da aba

### Arena
- iniciar luta
- atacar / defender / fugir
- usar consumível
- abrir ranking
- abrir baú
- usar arena shop

### Admin
- `/adminhelp`
- `/findplayer`
- `/playerstate`
- `/setplayer`
- `/metrics`
- `/reset`
- `/resetplayer`
- `/resetall` (somente em ambiente seguro)

---

## 12. Estado real do balance

### O que já melhorou
- maior clareza de progressão
- maior risco em combate
- mais valor para consumível e preparo
- melhor peso relativo de dungeon / arena

### O que ainda falta auditar
- curva de level
- dificuldade por faixa de mapa
- pacing de boss
- valor esperado de dungeon
- valor esperado de arena
- drop rate real de souls
- custo / benefício de consumíveis

Tradução honesta:
O balance atual está **melhor**, mas ainda **não está validado**.

---

## 13. Estado real da retenção

### Melhorias nos drivers de retenção
Já foram fortalecidos:
- home e hierarquia de ação
- rotina diária
- energia
- dungeon
- arena
- valor do risco
- valor do loot e da gestão do inventário

### O que ainda não existe
Ainda não existe prova real de retenção D1 / D7 / D30.
Para isso, o projeto precisa de:
- uso real
- leitura de métricas
- auditoria de fluxo
- menos polimento no escuro

---

## 14. Prioridades corretas daqui para frente

### Prioridade 1 — validação real
Rodar o jogo, testar o loop e observar comportamento real.

### Prioridade 2 — usar métricas de verdade
Ler:
- combates iniciados / vencidos
- derrotas
- dungeon start / finish
- uso de consumíveis
- ouro entrando / saindo
- compras
- vendas

### Prioridade 3 — auditoria dura de balance
Fechar uma revisão séria de:
- progressão
- reward
- dificuldade
- dungeon superiority
- arena pacing

### Prioridade 4 — reduzir dívida técnica
Começar a quebrar arquivos gordos e padronizar renderização.

### Prioridade 5 — só depois abrir novas frentes
Exemplos de frentes futuras:
- subclasses reais
- achievements
- guildas
- eventos
- world boss
- monetização V2

---

## 15. Roadmap executivo

### 30 dias
Foco:
- bug fix
- balance
- loot
- souls
- scaling
- estabilidade do core loop
- leitura das métricas

### 60 dias
Foco:
- dungeons maduras
- subclasses
- missões melhores
- achievements
- aprofundamento de build

### 90 dias
Foco:
- ranking forte
- guildas
- eventos
- monetização V2
- world bosses
- live ops

---

## 16. Comandos admin atuais

### Consulta e operação
- `/adminhelp`
- `/metrics`
- `/metrics AAAA-MM-DD`
- `/findplayer ID`
- `/playerstate ID`
- `/reload`

### Ajuste de conta
- `/give xp ID VALOR`
- `/give gold ID VALOR`
- `/give nox ID VALOR`
- `/give item ID`
- `/setplayer ID level VALOR`
- `/setplayer ID gold VALOR`
- `/setplayer ID nox VALOR`
- `/setplayer ID energy VALOR`
- `/setplayer ID map MAPA_ID`
- `/setplayer ID vipdays DIAS`

### Moderação
- `/ban ID`
- `/unban ID`

### Reset
- `/reset`
- `/resetplayer ID`
- `/resetall CONFIRMAR_RESET_TOTAL`

---

## 17. Resumo executivo final

### O que o NOCTRA já é hoje
- um alpha bem mais coerente
- com loop principal mais claro
- com UX principal melhor
- com daily / energy melhores
- com loja mais fluida
- com economy mais adulta
- com inventário mais útil
- com arena mais respeitável
- com camada admin forte para a fase atual

### O que o NOCTRA ainda não é
- produto comercial validado
- economia calibrada
- retenção comprovada
- sistema social maduro
- arquitetura final de scale

### Frase de controle do projeto
O NOCTRA já não precisa só de mais ideias.
Agora precisa de:
- validação
- disciplina
- leitura de dados
- controle de escopo
- priorização correta

---

## 18. Scripts

- `npm start` → inicia o bot
- `npm run dev` → inicia com hot reload / nodemon
- `npm test` → executa testes configurados no projeto

---

## 19. Próximo passo recomendado

Antes de abrir novos sistemas, execute a seguinte sequência:
1. QA manual completo
2. leitura de `/metrics`
3. auditoria de balance
4. revisão da economia com dados reais
5. só então abrir novas frentes de produto
