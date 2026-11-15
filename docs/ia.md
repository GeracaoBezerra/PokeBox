# Uso de IA no PokeBox

Registro de onde a IA ajudou, com o que foi pedido, o que saiu e o que precisou ser corrigido. A documentação completa da avaliação está na #113.

## Testes de integração (#106)

**Ferramenta:** Claude Code (Claude Opus), rodando no repositório, com acesso ao código, ao terminal e ao banco de teste.

**O que foi pedido:** implementar a #106 a partir do plano da issue, começando pela base (banco de teste, separação entre unitário e integração, CI) e depois escrevendo os casos de cada área a partir da tabela da issue e das regras de negócio do README.

**O que a IA fez:**

- Leu a issue e o código e apontou o que estava desatualizado na issue: senhas do seed vindas do `.env`, limite de tentativas no login (os testes precisam de `AUTH_RATE_LIMIT=0`), logs do pino e o seed populado. Isso virou um comentário na #106.
- Percebeu que `POST /collection` e `POST /wishlist` também chamam a TCGdex, e não só as rotas de cartas. Por isso a TCGdex simulada foi feita antes de qualquer caso.
- Propôs e implementou a TCGdex simulada como um servidor local apontado por `TCGDEX_BASE_URL`, gerado a partir do `prisma/seed-data/cards.json`, no lugar do msw sugerido na issue. O motivo: o jest roda em ESM experimental, e o servidor local não precisa de biblioteca nova nem muda o código de produção.
- Propôs rodar o seed uma vez só e fazer cada arquivo criar os próprios usuários, no lugar de apagar o banco antes de cada teste (que deixaria a suíte lenta).
- Pôs a trava que impede a suíte de apagar um banco cujo nome não termina em `_test`.
- Escreveu os casos (93 na primeira leva). Ao revisar, o Patrick perguntou pela RN-09, que tinha ficado sem teste porque a IA afirmou, sem conferir o PDF da aula, que ela não existia no projeto. A regra existe (snapshot local da carta) e ganhou 2 testes, chegando a 95.

**O que a IA errou e foi corrigido rodando os testes:**

| Suposição da IA | Como é de verdade | Como apareceu |
|---|---|---|
| troca nasce `PENDING` e termina `COMPLETED` | o enum é `PROPOSED` → `ACCEPTED` (`prisma/schema.prisma`) | 2 testes falharam |
| `GET /cards` devolve `data.items` e `data.search` | devolve `data` (a lista) e `search` fora de `data` | 4 testes falharam |
| `search.sets` traz objetos com `id` | traz só os nomes dos sets (`["Base Set"]`) | 1 teste falhou |
| `user` do detalhe da carta tem um campo `owned` | os campos são `inCollection`, `inWishlist` e `onTradeList` | 1 teste falhou |
| o teste do 502 podia usar qualquer carta | outro arquivo já tinha guardado a carta no `CardCache`, e a API usou a cópia guardada (comportamento certo, documentado no README) | o teste passava sozinho e falhava com a suíte inteira; agora ele limpa o cache da carta antes |

Nenhuma dessas diferenças era bug da API. Em todos os casos, o teste foi corrigido para o comportamento documentado no README e no schema, e não o contrário.

**Como conferimos que os testes testam algo:** desligamos de propósito a checagem de dono do item (RN-02, `utils/collectionRules.ts`). Dois testes falharam (editar item de outra pessoa e anunciar item de outra pessoa). Com a checagem de volta, todos passaram.

**O que ficou de fora:** o 504 (TCGdex demorando mais de 8 s). O timeout é fixo no `cards.module.ts`, e um teste de integração dele levaria 8 s. Ele já é coberto pelos testes de unidade do `TcgdexClient`.
