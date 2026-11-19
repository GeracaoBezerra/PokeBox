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

## Testes e pacotão do front (#179 e PR #195)

**Ferramenta:** Claude Code (Claude Opus), rodando no repositório, com acesso ao código, ao terminal, ao banco local e a um Chrome sem tela para conferir as telas.

**O que foi pedido:** implementar no front, numa branch só (`feat/front-pacotao`, PR #195), a #179 (Vitest) e as issues de acabamento das telas: #82, #167, #168, #172, #176, #178, #177, #174, #175, #169, #170, #171, #166, #185, #153, #162 e #173. Cada issue lida inteira (descrição e comentários) antes de começar, um commit por issue, README atualizado em cada commit e `lint`, `test` e `build` passando antes de cada commit.

**O que a IA fez:**

- Dividiu o trabalho em 5 etapas, cada uma feita por um agente com um roteiro comum (regras do projeto, como rodar e conferir, e o que foi aprendido nas etapas anteriores).
- Montou o Vitest com jsdom, Testing Library e MSW (#179) e, a partir daí, escreveu teste para cada função pura nova e para os componentes reaproveitáveis (modal, toast, abas, aviso).
- Conferiu cada tela no navegador com a API local, criando usuários e dados novos pela API.

**O que a IA errou e foi corrigido na revisão:**

| Erro | Quem pegou | Como foi corrigido |
|---|---|---|
| Na etapa 2, o teste de tela clicou no primeiro botão da lista e cancelou uma oferta do seed | revisão do Patrick | só no banco local: o seed rodou de novo, com um ajuste no banco; o roteiro passou a proibir mexer em registros do seed nos testes de tela |
| O selo de pendências recontava a cada navegação, e o limite de 20 cartas da oferta estava escrito à mão ("/20") | revisão do Patrick | recontagem só depois de 1 minuto e limite pela constante `LIMITE_CARTAS_OFERTA` (commit `15bc574`) |
| Um 401 atrasado de um token antigo encerrava a sessão nova | revisão do Eduardo | o `http.js` guarda o token que foi na requisição e só encerra a sessão se ele ainda é o salvo |
| "Carregar mais" pulava a página que falhou | revisão do Eduardo | o `useListaPaginada` guarda a última página carregada e repete a que falhou |
| A busca da oferta mostrava cartas que a API achou só pelo nome da expansão | revisão do Eduardo | o resultado da API passa pelo mesmo filtro do nome da carta |
| Uma carta marcada e escondida pela busca ia na oferta com quantidade vazia (0) | revisão do Eduardo | antes de enviar, todas as cartas marcadas são conferidas, e o resumo diz qual corrigir |
| O rascunho da busca do topo disparava uma busca ao trocar de página | revisão do Eduardo | o campo volta ao termo da URL a cada troca de página |
| Um filtro inválido no perfil público mostrava "Colecionador não encontrado" | revisão do Eduardo | só 404 ou 400 do `username` contam como não encontrado; busca longa demais não vai para a API e outro 400 mostra "Filtro inválido" com o campo de busca |
| Se a wishlist ou a coleção falhassem, o catálogo liberava "Quero" e "Tenho" com listas vazias | revisão do Eduardo | as duas consultas viraram independentes (`Promise.allSettled`), com aviso e "Tentar de novo", mantendo o último estado conhecido |
| Fechar um anúncio não atualizava o selo de pendências | revisão do Eduardo | o `AcoesAnuncio` avisa o selo depois de fechar |

Cada correção da revisão do Eduardo ganhou um teste que falha sem ela (com MSW, `renderHook` ou função pura).

**O que ficou de fora:** cobertura e testes do resto dos hooks e páginas (#180) e os testes E2E (#181, #182). A ordem "pendentes primeiro" da #170 vale só dentro da página atual, porque a API não ordena por status.

