# QA MANUAL — NOCTRA

Use este checklist antes de considerar uma sprint estável. Não pule etapas depois de mexer em loja, inventário, combate, arena, dungeon ou playerService.

---

## Regras de QA

1. Testar sempre pelo Telegram após deploy no Render.
2. Confirmar nos logs: `NOCTRA ONLINE`.
3. Testar com um personagem real e, quando possível, com um personagem novo.
4. Se um botão falhar, registrar:
   - tela onde estava;
   - botão clicado;
   - mensagem exibida;
   - log do Render;
   - último PR mesclado.
5. Nunca assumir que erro visual é só visual. Pode ser persistência, callback ou normalização.

---

## 1. Inicialização

- [ ] Render fez deploy sem erro.
- [ ] Logs mostram `NOCTRA ONLINE`.
- [ ] `/start` responde.
- [ ] Player existente abre menu principal.
- [ ] Player novo entra no fluxo de criação.
- [ ] Nome inválido é bloqueado.
- [ ] Classe inválida é bloqueada.
- [ ] Guerreiro cria corretamente.
- [ ] Arqueiro cria corretamente.
- [ ] Mago cria corretamente.

---

## 2. Menu principal

- [ ] Menu principal abre com imagem do mapa atual quando existir asset.
- [ ] Botão Perfil funciona.
- [ ] Botão Inventário funciona.
- [ ] Botão Caçar funciona.
- [ ] Botão Energia funciona.
- [ ] Botão Viajar funciona.
- [ ] Botão Loja funciona.
- [ ] Botão Dungeon funciona.
- [ ] Botão Arena funciona.
- [ ] Botão Daily funciona.
- [ ] Voltar ao menu não duplica telas em excesso.

---

## 3. Perfil

- [ ] Mostra nome correto.
- [ ] Mostra classe correta.
- [ ] Mostra level e XP.
- [ ] Mostra HP correto.
- [ ] Mostra ATK/DEF/CRIT corretos.
- [ ] Mostra ouro, Nox, Glórias e chaves.
- [ ] Mostra mapa atual.
- [ ] Mostra VIP quando ativo.
- [ ] Skins/cosméticos ativos aparecem corretamente.

---

## 4. Combate PvE

- [ ] Caçar consome 1 energia.
- [ ] Sem energia, caça é bloqueada.
- [ ] Inimigo aparece com HP e ações.
- [ ] Atacar causa dano.
- [ ] Defender reduz impacto ou aplica defesa.
- [ ] Fugir encerra luta corretamente.
- [ ] Poção de HP funciona e a vida não volta no turno seguinte.
- [ ] Tônico de força funciona.
- [ ] Tônico de defesa funciona.
- [ ] Alma equipada aparece no menu de almas.
- [ ] Usar alma causa efeito correto.
- [ ] Vitória dá XP e ouro.
- [ ] Derrota não corrompe HP.
- [ ] Item dropado pode ser visualizado.
- [ ] Item dropado pode ser equipado quando válido.
- [ ] Inventário cheio bloqueia item sem quebrar a luta.
- [ ] Nox não dropa em combate comum.

---

## 5. Drops e progressão

- [ ] Mapa 1 dropa itens de tier inicial.
- [ ] Mapa 2 exige level correto.
- [ ] Mapa 3 exige level correto.
- [ ] Mapa 4 exige level correto.
- [ ] Mapa 5 exige level correto.
- [ ] Mapa 6 exige level correto.
- [ ] Arqueiro recebe majoritariamente itens compatíveis.
- [ ] Guerreiro recebe majoritariamente itens compatíveis.
- [ ] Mago recebe majoritariamente itens compatíveis.
- [ ] Itens off-class ainda podem aparecer raramente, mas não dominar o drop.

---

## 6. Inventário V3

- [ ] Inventário abre corretamente.
- [ ] Mostra capacidade atual.
- [ ] Mostra equipamento atual.
- [ ] Categoria Armas abre.
- [ ] Categoria Armaduras abre.
- [ ] Categoria Joias abre.
- [ ] Categoria Consumíveis abre.
- [ ] Categoria Skins abre.
- [ ] Categoria Almas abre.
- [ ] Paginação funciona.
- [ ] Equipar item funciona.
- [ ] Desequipar item funciona.
- [ ] Arco não equipa com escudo inválido.
- [ ] Arco equipa com aljava quando exigido.
- [ ] Lança pode usar escudo quando regra permitir.
- [ ] Arma de duas mãos bloqueia mão secundária.
- [ ] Item equipado não aparece duplicado como item solto.
- [ ] Consumível fora de batalha funciona.
- [ ] Skin equipa e desequipa.
- [ ] Alma equipa e desequipa.

---

## 7. Loja

- [ ] Loja abre sem `Personagem não encontrado` falso.
- [ ] Carteira mostra ouro correto.
- [ ] Carteira mostra Nox correto.
- [ ] Carteira mostra Glórias corretas.
- [ ] Comprar itens abre.
- [ ] Suprimentos abre.
- [ ] Premium abre.
- [ ] Arena abre.
- [ ] Item com saldo suficiente mostra disponível.
- [ ] Item sem saldo mostra bloqueado.
- [ ] Detalhe de compra mostra saldo atual.
- [ ] Detalhe de compra mostra saldo após compra.
- [ ] Compra x1 funciona.
- [ ] Compra x5 funciona quando aplicável.
- [ ] Compra x10 funciona quando aplicável.
- [ ] Saldo insuficiente é bloqueado.
- [ ] Cosmético duplicado é bloqueado.
- [ ] Pacote de compra única é bloqueado na segunda tentativa.
- [ ] Bolsa Sombria respeita limite máximo.
- [ ] Vender loot abre.
- [ ] Preview de venda mostra valor.
- [ ] Confirmar venda adiciona ouro.
- [ ] Item vendido sai do inventário.

---

## 8. Arena

- [ ] Arena abre.
- [ ] Mostra Glórias, não Moedas da Arena.
- [ ] Procurar oponente funciona.
- [ ] Tela `DUELO DA ARENA` aparece.
- [ ] Atacar funciona.
- [ ] Defender funciona.
- [ ] Consumíveis da Arena abre.
- [ ] Usar poção de HP funciona.
- [ ] Usar tônico funciona.
- [ ] Fugir encerra batalha e aplica penalidade.
- [ ] Vitória dá pontos.
- [ ] Vitória dá Glórias.
- [ ] Vitória pode gerar baú.
- [ ] Baús abre.
- [ ] Baú pronto pode ser aberto.
- [ ] Baú travado mostra tempo restante.
- [ ] Baú dá Glórias e ouro.
- [ ] Ranking abre.
- [ ] Loja Arena abre.
- [ ] Loja Arena usa Glórias.

---

## 9. Dungeon

- [ ] Dungeon abre.
- [ ] Sem chave, entrada é bloqueada.
- [ ] Com chave, entrada consome chave.
- [ ] Dungeon não consome energia.
- [ ] Sala 1 inicia.
- [ ] Atacar funciona.
- [ ] Consumíveis funcionam.
- [ ] Alma funciona quando equipada.
- [ ] Avançar sala funciona.
- [ ] Boss final concede recompensa.
- [ ] Fugir encerra corretamente.
- [ ] Morte encerra corretamente.
- [ ] Recompensa final não dá Nox.

---

## 10. Daily e baús temporizados

- [ ] Daily abre.
- [ ] Baú diário pode ser coletado quando disponível.
- [ ] Baú diário bloqueia coleta duplicada.
- [ ] Missões aparecem.
- [ ] Missões concluídas podem ser resgatadas.
- [ ] Baús temporizados aparecem.
- [ ] Baú temporizado pronto abre.
- [ ] Baú temporizado travado mostra tempo.

---

## 11. Admin

- [ ] `/myid` retorna ID.
- [ ] `/adminhelp` abre.
- [ ] `/findplayer ID` funciona.
- [ ] `/playerstate ID` funciona.
- [ ] `/give gold` funciona.
- [ ] `/give nox` funciona.
- [ ] `/give glorias` funciona.
- [ ] `/give keys` funciona.
- [ ] `/give soul` funciona.
- [ ] `/give item` funciona.
- [ ] `/setplayer` funciona com cuidado.
- [ ] `/heal` funciona.
- [ ] `/teleport` funciona.
- [ ] `/metrics` abre.

---

## 12. Regressões críticas que não podem voltar

- [ ] Loja não pode interpretar `next` do Telegraf como player.
- [ ] Loja não pode mostrar carteira 0/0/0 falsa.
- [ ] Loja não pode abrir `Personagem não encontrado` para player existente.
- [ ] Poção de HP em batalha não pode encerrar a luta indevidamente.
- [ ] Poção de HP não pode curar e depois voltar HP antigo.
- [ ] Arco não pode equipar com escudo incompatível.
- [ ] Nox não pode dropar em combate comum.
- [ ] Arena não pode voltar a mostrar Moedas da Arena na UX.
- [ ] Dungeon não pode consumir energia.
- [ ] Item equipado não pode duplicar no inventário.

---

## 13. Checklist mínimo antes de merge grande

```text
npm test
/start
Menu
Caçar
Inventário
Loja
Arena
Dungeon
Daily
```

Se um desses falhar, não avance para feature nova.
