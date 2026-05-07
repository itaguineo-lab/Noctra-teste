# Combat Active Entrypoint

`src/handlers/combatActive.js` é o novo ponto canônico para o combate do NOCTRA.

Neste momento ele apenas exporta o handler ativo atual:

```js
module.exports = require('./combatSoulFixed');
```

Isso é intencional.

O objetivo é criar um nome estável para o `index.js` e reduzir o risco de alguém voltar a importar um handler antigo diretamente.

Cadeia atual:

```text
combatActive -> combatSoulFixed -> combatFixed -> combat
```

Meta futura:

```text
combatActive -> lógica consolidada final
```

Regra prática:

- não adicionar mecânica nova em `combat.js`;
- não trocar handler ativo sem teste;
- não remover wrappers antigos enquanto houver dependência ativa;
- qualquer mudança de combate precisa validar ataque, vitória, derrota, fuga, consumíveis, almas e loot.
