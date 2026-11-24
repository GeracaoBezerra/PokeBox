# Uso de IA no PokeBox

Registro de onde a IA ajudou, com o que foi pedido, o que saiu e o que precisou ser corrigido.

## Visão geral

A ferramenta principal foi o Claude Code (modelos Claude Opus), rodando dentro do repositório com acesso ao código, ao terminal, ao Docker e ao GitHub CLI. A IA entrou em todas as etapas, sempre com uma pessoa do time decidindo e revisando.

| Etapa | Como a IA ajudou | Evidência |
|---|---|---|
| Planejamento | Transformar o enunciado e o feedback da apresentação do MVP em issues, com dependências e prioridade (P0, P1, P2) para caber no prazo. Antes de codar, uma sessão de perguntas para fechar as decisões em aberto | Issues como #60, #113, #180, #181 e #213; decisões registradas em [`docs/decisoes/`](decisoes/README.md) |
| Descrição das tarefas | Cada issue sai com o que o colega precisa para começar sozinho: contexto, arquivos envolvidos, o que fazer, como testar, fora do escopo e "pronto quando". Para quem está aprendendo, as issues também trazem "O que pesquisar" (links e termos) e "Ferramentas e por quê" | 67 issues com "O que pesquisar" e 37 com "Ferramentas e por quê" (ex.: #113, #106, #181) |
| Apoio ao time | Revisões com tom didático, explicando o porquê de cada ajuste; um guia do backend e das regras para quem começou no Node (`backend/docs/guia-backend.md`); quando um colega travava, a IA lia a branch dele e apontava o que faltava | Comentários de revisão nas PRs da Débora (#151, #200, #206, #208, #209) e do Eduardo (#50, #143, #205) |
| Acompanhamento do projeto | Comparar o board com o Git (branch sem PR, card parado, issue fechada com PR aberta), resumir o status e propor a próxima tarefa | Divergências corrigidas no board (ex.: #214 e #215 movidas para Done em 23/11) |
| Execução | Implementar a issue a partir do plano, com um commit por issue e o README atualizado junto | 242 commits com `Co-Authored-By: Claude`; 75 de 101 PRs com "Generated with Claude Code" |
| Testes | Escrever testes de unidade, integração, front e E2E e provar que eles pegam erro quebrando o código de propósito | Seções abaixo (#106, #179, #180, #181, #182) |
| Revisão de PR | Rodar a PR de um colega do zero (lint, build, testes, Docker, teste à mão), simular o merge e escrever um comentário único com o que mudar | Comentários de revisão em 12 PRs de colegas (ex.: #143, #205, #206) e commits `(revisão #221)` |
| Performance | Medir antes e depois (autocannon, `EXPLAIN`) e propor índices, compressão e cache | #112 e #78 |
| Deploy e diagnóstico | Montar o pipeline, diagnosticar CORS, variável da Vercel e o agendamento do GitHub que não rodava | #103, #105, commit `569c713` |
| Bancada final | Rodar o roteiro da #60 do zero: testes automáticos, scripts contra a API, testes de tela com Cypress e produção | Resultado no topo da #60; bugs #228 e #229 |
| Documentação | Rascunho do README, do Swagger, do `backend/docs/db.md` e destes documentos, revisados pelo time | 45 commits `docs` |

Como o time conferia o que a IA entregava:

- Nada entra sem a CI verde (testes, cobertura mínima, lint e build).
- Teste novo só vale se falhar quando a regra é quebrada de propósito.
- A pessoa que pediu a tarefa testa à mão antes de abrir a PR, e um colega revisa.
- Os erros da IA ficam registrados no registro por entrega, abaixo.

O que aprendemos: a IA acerta rápido o que está escrito na issue e erra quando supõe um contrato sem conferir (nome de campo, enum, formato da resposta). Por isso as issues passaram a trazer o contrato e o "como testar", e os testes rodam antes de qualquer conclusão.


## Registro por entrega

Em todas as entregas abaixo a ferramenta foi o Claude Code (Claude Opus), rodando no repositório com acesso ao código e ao terminal. Cada uma diz o que foi pedido, o que a IA fez de diferente do previsto, onde ela errou e como o time conferiu que os testes testam algo.

### Testes de integração (#106)

Pedido: montar a base dos testes de integração (banco de teste, separação entre unidade e integração, CI) e escrever os casos de cada área a partir da issue e das regras do README.

O que a IA fez:

- Apontou partes desatualizadas da issue (senhas do seed no `.env`, limite de tentativas no login, logs do pino), o que virou um comentário na #106.
- Viu que `POST /collection` e `POST /wishlist` também chamam a TCGdex e montou uma TCGdex simulada como servidor local (apontado por `TCGDEX_BASE_URL`, gerado do `cards.json` do seed), no lugar do msw sugerido. O servidor local funciona com o Jest em ESM e não muda o código de produção.
- Rodou o seed uma vez só, com cada arquivo criando os próprios usuários, para a suíte não ficar lenta, e pôs uma trava que só deixa apagar banco com nome terminado em `_test`.
- Escreveu 93 casos. Na revisão, o Patrick perguntou pela RN-09: a IA tinha afirmado, sem conferir o PDF da aula, que a regra não existia no projeto. Ela existe (cópia local da carta) e ganhou 2 testes, chegando a 95.

Suposições erradas que os próprios testes pegaram:

| Suposição da IA | Como é de verdade |
|---|---|
| A troca nasce `PENDING` e termina `COMPLETED` | O enum é `PROPOSED` → `ACCEPTED` |
| `GET /cards` devolve `data.items` e `data.search` | Devolve a lista em `data` e `search` fora dele |
| `search.sets` traz objetos com `id` | Traz só os nomes (`["Base Set"]`) |
| O detalhe da carta tem um campo `owned` | Os campos são `inCollection`, `inWishlist` e `onTradeList` |
| O teste do 502 podia usar qualquer carta | Outro arquivo já tinha guardado a carta no cache; o teste passou a limpar o cache antes |

Nenhuma diferença era bug da API: os testes foram corrigidos para o comportamento documentado.

Prova: desligar de propósito a checagem de dono do item (RN-02) fez 2 testes falharem.

Ficou de fora: o 504 (TCGdex demorando mais de 8 s), já coberto pelos testes de unidade do `TcgdexClient`.

### Testes e acabamento do front (#179 e PR #195)

Pedido: numa branch só, o Vitest (#179) e 17 issues de acabamento das telas, com um commit por issue, README atualizado e lint, testes e build passando antes de cada commit.

A IA dividiu o trabalho em 5 etapas, cada uma feita por um agente com o mesmo roteiro (regras do projeto e o que as etapas anteriores aprenderam). Montou o Vitest com jsdom, Testing Library e MSW, testou cada função pura nova e os componentes reaproveitáveis, e conferiu cada tela no navegador contra a API local.

Erros pegos na revisão:

| Erro | Quem pegou |
|---|---|
| Um teste de tela cancelou uma oferta do seed no banco local; o roteiro passou a proibir mexer em dados do seed | Patrick |
| O selo de pendências recontava a cada navegação, e o limite de 20 cartas da oferta estava escrito à mão | Patrick |
| Um 401 atrasado de um token antigo encerrava a sessão nova | Eduardo |
| "Carregar mais" pulava a página que falhou | Eduardo |
| A busca da oferta mostrava cartas achadas só pelo nome da expansão | Eduardo |
| Uma carta marcada e escondida pela busca ia na oferta com quantidade 0 | Eduardo |
| O texto da busca do topo disparava uma busca ao trocar de página | Eduardo |
| Um filtro inválido no perfil público mostrava "Colecionador não encontrado" | Eduardo |
| Com a wishlist ou a coleção fora do ar, o catálogo liberava "Quero" e "Tenho" com listas vazias | Eduardo |
| Fechar um anúncio não atualizava o selo de pendências | Eduardo |

Cada correção da revisão do Eduardo ganhou teste, e na maioria o teste falha com o código antigo.

### Hooks, rota privada e cobertura do front (#180)

Pedido: o que a #180 pedia e o pacotão ainda não tinha (testes de hooks, da rota privada, de uma página inteira com MSW e cobertura mínima na CI).

A IA escreveu 28 testes (de 238 para 266), ligou a cobertura do Vitest com o mínimo em "medido menos uns 2 pontos", como no backend, e pôs a tabela de cobertura no resumo da CI.

Erros pegos rodando os testes: JSX num arquivo `.js`, busca pelo papel `alert` que também achava o toast e busca por um nome que aparece duas vezes no card. Os três foram corrigidos no teste.

Prova: quebrar de propósito, um de cada vez, a rota do login na `RotaPrivada` (3 testes falharam), o recarregamento depois de remover na wishlist (1), a regra do `useCarregar` (1) e o intervalo do `usePendencias` (2). A cobertura também foi rodada com mínimo de 99% para ver a CI falhar.

### E2E com Cypress (#181)

Pedido: a base do E2E (pasta `e2e/`, reset do banco, login rápido, teste de autenticação e workflow na CI).

A IA conferiu no schema que o reset por `TRUNCATE` apaga só os dados de usuário e preserva o catálogo de cartas (contou as linhas antes e depois). Adaptou a issue ao Cypress 16 (`cy.env()` e `Cypress.expose()` no lugar de `Cypress.env()`, action `@v7` no Chrome) e acrescentou um caso que a issue não tinha: depois de ser mandado ao login, entrar volta à página privada de origem. Rodou a suíte duas vezes seguidas e uma com o texto de erro trocado de propósito, para ver o teste falhar e salvar o print.

Ficou de fora: o reset com `prisma migrate reset`, que apagaria o catálogo local de cartas.

### E2E dos fluxos principais (#182)

Pedido: E2E de coleção, wishlist, anúncio, troca entre dois usuários e moderação do admin.

A IA leu cada componente antes de escrever o teste e ajustou o que tinha mudado desde a issue (formulário que precisa ser aberto, nome acessível do botão da wishlist, confirmações em modal, busca paginada na oferta). Acrescentou três `data-cy` nos cartões que não têm papel nem rótulo próprios e quebrou de propósito o texto de um botão para ver o `troca.cy.js` falhar.

Erro corrigido: a primeira versão fazia o reset no `before`. Testando a falha de propósito, a IA viu que o Cypress não repete o `before` numa nova tentativa, e a segunda tentativa começaria com os dados da primeira. O reset passou para o `beforeEach`.

### Wishlist completa (#24)

Pedido: fechar a #24 sem quebrar o que a #212 já tinha entregado. Antes de codar, a IA comparou a issue com a `develop`, recortou a descrição para só o que faltava e conduziu uma rodada de perguntas para decidir filtros, paginação, textos e o comportamento depois de cada ação.

A IA reaproveitou os componentes de filtro do marketplace em vez de criar novos, manteve os testes que já existiam e conferiu que os novos falham com o código antigo. Rodou o E2E inteiro e testou a tela em 1280 e 360 px.

Erros corrigidos:

- Disse que o filtro de raridade não funcionaria por causa do idioma; ao conferir o banco, viu que a raridade é sempre em inglês, e o filtro entrou.
- O "Já consegui" abria a carta sempre em português e falhava em cartas antigas, que só existem em inglês. Passou a cair para o inglês, com teste.
- O teste manual alterou a wishlist do seed e quebrou o `make test`; a IA voltou o banco ao seed.
- Na revisão da PR #221 apareceu um bug de paginação: remover uma carta na página 1 não puxava a primeira carta da página 2. Corrigido, com um teste que simula 25 cartas e falha sem a correção.
