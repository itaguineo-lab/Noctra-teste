# NOCTRA — Regras Canônicas do Produto

Este documento é a fonte de verdade do NOCTRA.

Quando houver conflito entre conversa, ideia solta, teste manual ou implementação antiga, este arquivo vence. Qualquer mudança nestas regras precisa ser intencional, revisada e acompanhada de teste automatizado quando afetar economia, progressão, combate, loot, energia, dungeon, almas, loja, monetização ou retenção.

---

## 1. Norte do Produto

NOCTRA é um RPG sombrio para Telegram, construído para sessões curtas, retorno diário e progressão de longo prazo.

O jogo deve ser:

- simples de começar;
- difícil de largar;
- legível em tela pequena;
- viciante pelo ciclo de recompensa;
- estável tecnicamente;
- monetizável sem pay-to-win.

O jogo não deve virar um amontoado de sistemas antes de provar retenção.

---

## 2. Core Loop

Loop principal:

```text
Caçar → Combater → Loot → Upgrade → Repetir
```

Toda tela importante precisa empurrar o jogador de volta para pelo menos uma destas ações:

- caçar;
- melhorar equipamento;
- recuperar energia/vida;
- entrar em dungeon;
- perseguir objetivo de progressão.

Qualquer feature que não fortaleça esse loop deve ser tratada como secundária.

---

## 3. Meta Loop

Loop de progressão:

```text
Level → Novo mapa → Boss → Dungeon → Alma → Build → Ranking → Eventos/Guilda
```

A ordem importa. Guildas, eventos complexos e sistemas sociais profundos só devem vir depois de o core loop estar estável e medido.

---

## 4. Escopo da Versão 0.1

A versão 0.1 deve priorizar polimento e estabilidade, não expansão de conteúdo.

Escopo jogável principal:

1. Clareira Sombria
2. Cripta em Ruínas
3. Pântano Corrompido
4. Deserto Incandescente

Conteúdo futuro ou pós-0.1:

- Citadela Lunar
- Abismo de Noctra
- guildas
- world boss complexo
- temporadas completas
- cooperação real em dungeon
- trade/marketplace
- crafting profundo

Esses sistemas podem existir como base técnica, mas não devem consumir prioridade antes do D1/D7 estar forte.

---

## 5. Classes Oficiais

Classes oficiais:

- Guerreiro
- Arqueiro
- Mago

Não criar novas classes sem justificativa forte de produto.

Subclasses devem nascer de:

- equipamentos;
- armas;
- mão secundária;
- atributos;
- almas;
- escolhas de build.

Atributos principais:

- ATK
- HP
- DEF
- CRIT

Não adicionar atributos novos no curto prazo.

---

## 6. Energia

Regras oficiais:

```text
Energia padrão: 20
Energia VIP: 40
Caçar consome: 1 energia
Regeneração normal: 10 minutos
Regeneração VIP: 8 minutos
Dungeon consome: chave, não energia
```

Energia existe para controlar sessões, criar retorno e preservar economia.

Não transformar energia em punição excessiva. Energia precisa limitar ritmo sem impedir o jogador novo de entender o jogo.

---

## 7. Dungeon

Cada mapa principal deve ter sua dungeon.

Regras oficiais:

- dungeon consome chave;
- dungeon não consome energia;
- chave é rara;
- chave dropa principalmente de bosses de campo;
- recompensa final de dungeon precisa ser melhor que farm comum;
- dungeon deve parecer um pico de sessão;
- dungeon deve preparar cooperação futura sem depender dela agora.

A dungeon precisa ter:

- salas sequenciais;
- ameaça real;
- eventos especiais com moderação;
- boss final;
- resumo final limpo;
- recompensa final clara;
- métricas separadas de campo.

---

## 8. Almas

Almas são o sistema oficial de skills.

Regras:

- jogador pode equipar até 2 almas;
- almas são raras;
- bosses têm chance maior de dropar almas;
- dungeon pode melhorar chance, mas não pode banalizar almas;
- não criar sistema paralelo de skills fora das almas.

Almas devem criar builds diferentes e sensação de coleção.

---

## 9. NOX e Monetização

NOX é a moeda premium.

Regra absoluta:

```text
1 NOX = R$1
```

NOX não pode ser recompensa padrão de gameplay.

Proibido:

- NOX dropar em combate comum;
- NOX dropar em dungeon comum;
- NOX ser recompensa padrão de daily;
- NOX ser recompensa padrão de arena;
- vender alma diretamente por NOX;
- vender chave diretamente por NOX;
- vender equipamento diretamente por NOX;
- vender poder raro direto.

Permitido:

- compra real;
- comando admin controlado;
- evento especial extremamente controlado;
- cosméticos;
- títulos;
- molduras;
- auras;
- badges;
- expansão limitada de inventário;
- conveniência limitada;
- VIP sem quebrar competição.

A monetização deve financiar status, estética e conveniência, não vitória direta.

---

## 10. Loot e Inventário

Loot deve gerar dopamina sem destruir balanceamento.

Categorias oficiais:

- armas;
- armaduras;
- mão secundária;
- joias/acessórios;
- consumíveis;
- skins/cosméticos;
- almas;
- chaves/outros.

Raridades:

- Comum
- Incomum
- Raro
- Épico
- Lendário
- Mítico

Campo comum não deve distribuir raridade máxima. Raridades altas precisam estar associadas a fontes de maior esforço, risco ou escassez.

---

## 11. Combate

Combate precisa ser simples, legível e viciante.

Toda luta deve mostrar com clareza:

- HP do jogador;
- HP do inimigo;
- barras visuais quando possível;
- dano causado;
- dano recebido;
- crítico;
- status relevantes;
- botões claros.

Botões oficiais de combate:

- Atacar
- Almas
- Itens/Consumíveis
- Fugir

Skills genéricas fora das almas não devem voltar.

---

## 12. UX no Telegram

Qualidade no Telegram vem de:

- texto hierarquizado;
- botões previsíveis;
- pouca poluição no chat;
- feedback imediato;
- navegação consistente;
- menus com sensação premium;
- clareza do próximo objetivo.

Cada tela importante deve responder:

```text
O que aconteceu?
O que eu ganhei/perdi?
O que mudou no meu personagem?
Qual o próximo botão óbvio?
```

---

## 13. Métricas Obrigatórias

Métricas de economia são importantes, mas insuficientes.

O projeto precisa medir também:

- personagem criado;
- primeira caça;
- primeira vitória;
- primeira derrota;
- primeiro item;
- primeiro item equipado;
- primeiro level up;
- primeira chave;
- primeira dungeon iniciada;
- primeira dungeon concluída;
- retorno diário;
- caçadas por jogador;
- ações por sessão.

Sem essas métricas, balanceamento vira chute.

---

## 14. Prioridade de Produto

Prioridade atual:

1. Estabilidade do core loop
2. Onboarding D1
3. Clareza de progressão
4. Economia saudável
5. Dungeon recompensadora
6. Almas como build
7. Métricas reais
8. Monetização ética
9. LiveOps simples
10. Sistemas sociais futuros

Não adicionar feature nova se o core loop estiver instável.

---

## 15. Regra de Engenharia

Mudanças em arquivos sensíveis exigem cautela:

- `index.js`
- `src/core/player/playerService.js`
- `src/core/player/PlayerModel.js`
- `src/core/player/playerMutations.js`
- `src/handlers/combat*.js`
- `src/handlers/dungeon.js`
- `src/services/rewardService.js`
- `src/data/balance.js`
- `src/data/shopItems.js`

Sempre que uma mudança afetar economia, energia, loot, dungeon, combate ou player, deve haver teste automatizado ou justificativa explícita.

---

## 16. Princípio Final

NOCTRA não deve ser desenvolvido como hobby cheio de ideias soltas.

NOCTRA deve ser tratado como produto comercial real:

```text
core loop forte + economia protegida + UX clara + retenção medida + monetização ética
```
