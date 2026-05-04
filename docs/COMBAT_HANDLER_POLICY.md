# Política do Handler de Combate do NOCTRA

## Regra oficial

O handler oficial de combate registrado no `index.js` deve ser:

```js
const combat = require('./src/handlers/combatSoulFixed');
```

## Motivo

O projeto ainda possui uma cadeia histórica de handlers:

```text
src/handlers/combat.js
src/handlers/combatFixed.js
src/handlers/combatSoulFixed.js
```

Essa cadeia existe porque o combate foi sendo corrigido em camadas:

1. `combat.js` contém a base antiga do fluxo de combate.
2. `combatFixed.js` corrige e estende pontos críticos do fluxo.
3. `combatSoulFixed.js` preserva `combatFixed`, mas corrige o menu de almas usando a luta ativa.

O bug dos botões de alma aconteceu porque uma correção foi feita no arquivo errado. O bot estava usando `combatFixed`, não `combat.js`.

## Proibição prática

Não trocar o import do `index.js` para:

```js
require('./src/handlers/combat')
require('./src/handlers/combatFixed')
```

sem um PR dedicado de consolidação completa.

## Consolidação futura correta

A consolidação definitiva deve acontecer em PR separado e com testes, seguindo este roteiro:

1. escolher um único arquivo oficial;
2. mover a lógica final para ele;
3. remover wrappers antigos;
4. atualizar `index.js`;
5. atualizar todos os testes de combate;
6. rodar teste manual completo no Telegram.

## Teste manual obrigatório depois de qualquer mudança em combate

1. iniciar caçada;
2. atacar até vitória;
3. testar derrota;
4. testar fuga;
5. testar poção de vida;
6. testar poção de energia;
7. testar alma ativa;
8. testar alma passiva;
9. verificar loot;
10. verificar botão de item dropado;
11. verificar retorno ao menu.

## Regra de produto

Combate é o core loop principal do NOCTRA:

```text
Caçar → Combater → Loot → Upgrade → Repetir
```

Qualquer mudança em combate tem risco alto de retenção. Não fazer patch rápido sem teste.
