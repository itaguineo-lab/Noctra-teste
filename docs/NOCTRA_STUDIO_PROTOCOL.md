# NOCTRA — Studio Protocol e Fonte de Verdade

Este documento define como decisões de produto, engenharia, balanceamento e monetização devem ser tratadas no projeto NOCTRA.

Ele existe para impedir retrabalho, dispersão de escopo e mudanças feitas com base em prompts antigos que já foram superados pelo estado real do repositório.

---

## 1. Hierarquia de decisão

Quando houver conflito entre instruções antigas, conversas anteriores e código atual, usar esta ordem:

1. Código ativo no repositório.
2. `README.md` e `docs/ROADMAP.md` atuais.
3. Testes automatizados existentes.
4. Conversas recentes do projeto.
5. Prompts antigos.

Regra prática: prompt antigo não deve reverter evolução já implementada se o repositório mostra uma decisão mais recente e coerente.

---

## 2. North Star do produto

NOCTRA é um idle RPG/social RPG sombrio para Telegram.

Slogan oficial:

```text
Entre na escuridão. Evolua sem fim.
```

Promessa central:

```text
sempre existe um próximo loot, uma próxima alma, um próximo boss, uma próxima dungeon ou uma build melhor.
```

Toda feature deve responder:

- Por que o jogador volta hoje?
- Por que volta amanhã?
- Por que continua depois de 30 dias?

---

## 3. Loops oficiais

Loop de sessão curta:

```text
Caçar -> Combater -> Loot -> Upgrade -> Repetir
```

Meta loop de longo prazo:

```text
Level -> Mapa -> Boss -> Dungeon -> Alma -> Build -> Ranking -> Guilda
```

Feature que não fortalece esses loops deve ser tratada como distração.

---

## 4. Regras econômicas fixas

- NOX é moeda premium.
- Regra comercial: R$1 = 1 Nox.
- Nox não deve dropar em gameplay.
- Nox não compra vitória.
- Ouro é moeda base.
- Glórias são moeda competitiva da Arena.
- Dungeon consome chave, não energia.
- Chave deve ser rara, mas não invisível.
- Dungeon comum deve ser melhor que farm comum.
- Dungeon comum não deve banalizar Mítico.
- Mítico deve ficar reservado para dungeon elite, world boss, evento ou liberação explícita de LiveOps.
- Monetização permitida: conveniência, cosméticos, VIP, molduras, skins, títulos, qualidade de vida.
- Monetização proibida: venda direta de dano, venda direta de stats, alma rara comprável, item raro comprável ou atalho competitivo pay-to-win.

---

## 5. Estado atual que prevalece sobre prompt antigo

O repositório já está mais avançado que prompts iniciais.

Decisões atuais que devem ser preservadas até nova decisão explícita:

- Mapas já incluem progressão além dos 4 primeiros: Clareira, Cripta, Pântano, Deserto, Citadela Lunar e Abismo de Noctra.
- Fluxos ativos usam `inventoryV3.js`, `combatFixed.js` e `itemsV2.js`.
- Almas V2 já têm inventário, detalhe, slots, cooldowns, passivas e drop visual.
- A chance de alma foi ajustada para retenção: boss de campo 5%, boss de dungeon 12%, pity em 8 bosses com multiplicador 2.5x.
- Essa decisão não deve ser revertida para 3%/8%/pity 10 sem simulação ou métrica real, porque isso prejudica a primeira alma e reduz D7.
- Early game deve continuar protegido: níveis 1-4 só enfrentam comuns na Clareira.
- Lendário e Mítico devem respeitar a política de raridade por fonte.

---

## 6. Protocolo de engenharia

Antes de qualquer alteração técnica relevante:

1. Ler os arquivos ativos reais, não assumir nomes antigos.
2. Confirmar o `require` usado pelo `index.js`.
3. Identificar se o arquivo é ativo ou legado.
4. Alterar arquivos completos, nunca trechos soltos.
5. Evitar duplicar regra de negócio em handler.
6. Preferir lógica em `core/`, apresentação em `renderers/`, botões em `handlers/` e constantes em `data/`.
7. Proteger compatibilidade com MongoDB e jogadores existentes.
8. Atualizar testes quando a regra de produto mudar.
9. Só abrir PR quando a mudança tiver escopo técnico claro.

---

## 7. Dívida técnica prioritária

Prioridade real agora:

1. Auditar recompensa de dungeon comum vs dungeon elite.
2. Melhorar métricas econômicas e de drop por raridade.
3. Medir funil de primeira alma.
4. Medir funil de primeira dungeon concluída.
5. Ajustar Arena/Glórias/baús.
6. Refatorar renderers de combate, inventário e loja de forma cirúrgica.
7. Só depois avançar para guildas, world boss e eventos maduros.

Não iniciar guildas/world boss enquanto o loop básico não estiver medido.

---

## 8. Forma de entrega esperada

Toda decisão deve trazer:

1. Visão estratégica.
2. Impacto em retenção.
3. Impacto técnico.
4. Impacto econômico.
5. Próximos passos práticos.
6. Código completo quando houver código.

Código parcial, substituição vaga ou alteração sem leitura do arquivo atual não é aceitável.

---

## 9. Frase de controle

NOCTRA não precisa de mais ideias soltas.

Precisa de estabilidade, métrica, balanceamento, retenção real e execução modular.
