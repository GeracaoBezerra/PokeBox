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

Cada correção da revisão do Eduardo ganhou teste (com MSW, `renderHook` ou função pura). Na maioria, o teste falha com o código antigo; no achado 7 (Quero e Tenho), o hook e a função são novos, então não há versão antiga para comparar.

**O que ficou de fora:** cobertura e testes do resto dos hooks e páginas (#180) e os testes E2E (#181, #182). A ordem "pendentes primeiro" da #170 vale só dentro da página atual, porque a API não ordena por status.

## Testes de hooks, rota privada, página e cobertura do front (#180)

**Ferramenta:** Claude Code (Claude Opus), rodando no repositório, com acesso ao código e ao terminal. Não usou banco nem API: tudo roda com o MSW.

**O que foi pedido:** fazer o que a #180 pede e o pacotão (PR #195) ainda não tinha feito, sem repetir testes que já existiam: `matchMedia` falso, `renderWithProviders`, testes do `useCarregar`, do `useAcao`, do `usePendencias` e da `RotaPrivada`, a página da wishlist inteira com o MSW e a cobertura com mínimo na CI, no mesmo formato do backend (#109).

**O que a IA fez:**

- Escreveu 28 testes novos (de 238 para 266) em 5 arquivos, e o `renderWithProviders` com os mesmos providers e a mesma ordem do `main.jsx` (incluindo o `ToastProvider`, que entrou com a #176 depois que a issue foi escrita). A `criarSessaoFalsa` ficou num `.js` separado, para o ESLint não reclamar de um `.jsx` que exporta função que não é componente.
- Ligou o `@vitest/coverage-v8` (mesma versão do Vitest), mediu a cobertura e pôs o mínimo em medido menos uns 2 pontos, como o backend. Na CI, o job `frontend` mostra a tabela no resumo da execução (com um script igual ao do backend) e guarda o relatório como artefato `coverage-frontend`. A pasta `coverage` entrou no `globalIgnores` do ESLint, senão o `npm run lint` tentaria analisar os `.js` do relatório.

**O que a IA errou e foi corrigido rodando os testes:**

| Erro | Como apareceu | Como foi corrigido |
|---|---|---|
| Teste do `useAcao` com JSX (o `wrapper` do toast) num arquivo `.js` | o Vite não compilou o arquivo | renomeado para `.test.jsx` |
| Procurou o aviso de erro da página pelo papel `alert` | o toast também tem uma região `alert` (vazia), e a busca achou duas | o teste procura o texto do aviso |
| Procurou o item da wishlist pelo nome "Pikachu" | o nome aparece duas vezes (no card e embaixo dele) | o teste procura "Base · 58" |

**Como conferimos que os testes testam algo:** trocamos de propósito, um de cada vez, `"/login"` por `"/entrar"` na `RotaPrivada` (3 testes falharam), tiramos o `recarregar()` depois de remover na wishlist (1 falhou), tiramos a regra que esconde o erro antigo durante o recarregamento no `useCarregar` (1 falhou) e zeramos o intervalo de 1 minuto do `usePendencias` (2 falharam). Com o código de volta, todos passaram. Também rodamos a cobertura com um mínimo de 99% de linhas para ver o comando terminar com erro.

**O que ficou de fora:** testes das outras páginas. A issue pede uma página com o MSW para mostrar o padrão, e o pacotão já tinha o perfil público e o formulário de oferta.

## E2E com Cypress (#181)

**Ferramenta:** Claude Code (Claude Opus), rodando num worktree próprio, com acesso ao código, ao terminal e ao Docker local.

**O que foi pedido:** montar a base do E2E a partir da #181: pasta `e2e/` com o próprio `package.json`, task de reset do banco, `cy.login` com `cy.session`, o teste de autenticação e o workflow `E2E` na CI, conferindo seletores e textos nas telas depois do pacotão.

**O que a IA fez:**

- Conferiu no schema que o `TRUNCATE` da issue pega todas as tabelas com dado de usuário e nenhuma tabela do catálogo (`Card`, `CardCache`, `CatalogCard`, `CatalogSet`, `CatalogFilterValue` não têm chave estrangeira para elas), e contou as linhas do catálogo antes e depois do reset para confirmar que nada sumiu.
- Instalou o Cypress 16, em que `Cypress.env()` não existe mais: as senhas passaram a ser lidas com `cy.env()` e o endereço da API com `Cypress.expose()`, como a issue pedia conferir.
- Acrescentou um caso que a issue não tinha: entrar pela tela depois de ser mandado ao login volta para a página privada de origem (o pacotão passou a guardar essa página).
- Rodou a suíte duas vezes seguidas e uma vez com o texto do erro trocado de propósito, para ver o teste falhar e salvar o print.

**O que foi ajustado em relação à issue:**

| Na issue | Como está no código | Como ficou |
|---|---|---|
| botão com nome exato "Menu do usuário" | o pacotão mudou o nome para "Olá, Ash. Menu do usuário" | o teste procura o nome com `/Menu do usuário/` e, no `cy.login`, o nome completo |
| `Cypress.env('senhaDemo')` | removido no Cypress 16 | `cy.env(["senhaDemo"])` |
| `cypress-io/github-action@v6` | a versão atual é a v7 | `@v7`, rodando no Chrome (o Electron está marcado como obsoleto no Cypress 16) |

**O que ficou de fora:** comparar com `npx prisma migrate reset --force`. Ele apagaria o catálogo local de cartas, que leva uns 26 minutos para sincronizar; o `TRUNCATE` + seed ficou.

## E2E dos fluxos principais (#182)

**Ferramenta:** Claude Code (Claude Opus), no mesmo worktree da #181, numa branch empilhada sobre ela.

**O que foi pedido:** escrever o E2E dos fluxos da #182 (coleção, wishlist, anúncio, troca com dois usuários e moderação do admin), conferindo os botões e textos nas telas depois do pacotão.

**O que a IA fez:**

- Leu cada componente citado na issue antes de escrever o teste e ajustou o que o pacotão mudou: o formulário da coleção fica dentro de um "Adicionar à minha coleção" que precisa ser aberto; o botão da wishlist na página da carta tem o nome acessível "Adicionar à wishlist" (o texto "Quero esta carta" fica escondido dos leitores de tela); aceitar, concluir e bloquear abrem o modal de confirmação, e o teste confirma dentro do modal; a busca do marketplace é a busca geral do topo; a oferta lista a coleção paginada, então o teste busca o Psyduck antes de marcar.
- Leu o `id` do anúncio novo na resposta do `POST /listings` (`data.listing.id`, conferido no controller) com `cy.intercept`.
- Acrescentou três `data-cy` (`item-wishlist`, `cartao-oferta`, `cartao-troca`), os mesmos que a issue sugeria, porque esses cartões não têm papel nem rótulo próprios.
- Quebrou de propósito o texto do botão "Concluir troca" para ver o `troca.cy.js` falhar e salvar o print, e desfez.

**O que a IA errou e foi corrigido:** a primeira versão fazia o reset no `before`, como a issue pede. Ao testar a falha de propósito, a IA conferiu que o Cypress não repete o `before` quando tenta o teste de novo, e uma segunda tentativa da troca começaria com o anúncio e a oferta da primeira no banco. Nos arquivos dos fluxos, o reset passou para o `beforeEach` (cada arquivo tem um ou dois testes, então o custo é pequeno).

## Wishlist completa (#24)

**Ferramenta:** Claude Code (Claude Opus), num worktree separado a partir da `develop`.

**O que foi pedido:** fechar a #24, que estava com outro integrante, sem quebrar o que a #212 já tinha entregado na wishlist. Antes de codar, a IA comparou a issue com a `develop`, recortou a descrição para só o que faltava e conduziu uma rodada de perguntas (grilling) para decidir filtros, paginação, textos e o comportamento depois de cada ação.

**O que a IA fez:**

- Montou os filtros com as mesmas peças do marketplace (`PainelFiltros`, `GrupoFiltro`, `SelosFiltro`, `CampoBusca`, `Paginacao`) e a mesma leitura da URL do perfil público, em vez de criar componentes novos.
- Tirou do catálogo o `AdicionarNaColecao` para um componente próprio e usou no "Já consegui".
- Manteve os seis testes que já existiam na página, mudando só os textos que mudaram de propósito, e escreveu os novos cenários. Conferiu que os testes novos falham com o código antigo.
- Rodou o E2E inteiro e testou a tela num Chrome sem janela com a misty, em 1280 e 360 px.

**O que a IA errou e foi corrigido:**

- No grilling, a IA disse que a raridade não ia funcionar porque a wishlist mistura cartas em português e inglês. Ao conferir o banco, viu que a tabela `Card` não guarda idioma e a raridade é sempre em inglês, como o marketplace já usa. A raridade entrou.
- O "Já consegui" abria a carta sempre em português. No teste manual, o Charizard do Base Set deu "Carta base1-4 não encontrada", porque essa coleção não existe em português. A carta passou a cair para o inglês quando não existe em português (a mesma função do detalhe da carta), com um teste para isso.
- O teste manual tirou o Charizard da wishlist da misty, e o `make test` (que espera essa carta lá) falhou em quatro passos. A IA voltou o banco local para o seed e rodou de novo.
- Na revisão da PR #221 apareceu um bug: com mais de uma página, remover ou usar Já consegui na página 1 só tirava a carta da tela, e a primeira carta da página 2 (que no servidor subia para a página 1) não aparecia em lugar nenhum. Agora, quando existe página seguinte, a página é buscada de novo. O teste simula um servidor com 25 cartas e falha sem a correção. O `LIMITE_BUSCA` saiu de `utils/perfilPublico.js` para `utils/busca.js`, porque a wishlist dependia do arquivo do perfil público só por essa constante.
