# Testes

Por que cada ferramenta: [decisão sobre testes](decisoes/0009-testes.md).

## Visão geral

| Andar da pirâmide | Ferramenta | Quantidade (26/11) | Comando |
|---|---|---|---|
| E2E | Cypress | 11 | `make e2e` |
| Front | Vitest + Testing Library + MSW | 519 | `cd frontend && npm test` |
| Integração (backend) | Jest + Supertest + PostgreSQL real | 195 | `make test-int` |
| Unidade (backend) | Jest | 948 | `cd backend && npm test` |

Cobertura: 98,3% das linhas no backend (mínimo de 95% na CI) e 87,0% no front (mínimo de 40%). Como a IA ajudou a escrever e conferir os testes: [`docs/ia.md`](ia.md).

## Backend

No backend são dois andares da pirâmide de testes, com comandos separados (o front tem os dele, em [Testes do front](#testes-do-front)):

| Tipo | Onde | O que testa | Precisa de banco |
|---|---|---|---|
| Unidade | `backend/src/**/*.test.ts` | regras puras, schemas, services e controllers, com as dependências falsas passadas no construtor | não |
| Integração | `backend/test/integration/*.int.test.ts` | requisição HTTP de verdade (supertest) passando por rota, middleware, controller, service e repository até um PostgreSQL de verdade | sim, um banco só de teste |

```bash
cd backend
npm test
```

`npm test` roda só os de unidade: é rápido e não precisa de nada no ar. `npm run typecheck` checa os tipos dos dois tipos de teste.

```bash
make test-int
```

`make test-int` cria o `backend/.env.test` a partir do `backend/.env.test.example` (se ainda não existir), sobe o banco de teste `tcg-db-test` (porta 5433, dados só em memória) e roda `npm run test:integration`. A cada execução, o banco de teste é apagado e recriado com as migrations e o seed. Por isso a suíte se recusa a rodar se o nome do banco não terminar em `_test`: o banco de desenvolvimento nunca é tocado. `make test-db-down` remove o banco de teste.

Como funcionam os testes de integração:

- Cada arquivo de teste monta o app de verdade (`buildContainer` + `createApp`) sem abrir porta, e cria os próprios usuários pelo `POST /auth/register`. Os usuários do seed entram com as senhas do `.env.test`.
- A TCGdex é simulada por um servidor local que responde com as 87 cartas de `prisma/seed-data/cards.json` no formato da TCGdex. Nenhum teste usa a internet, e dá para simular a TCGdex fora do ar (502).
- No `.env.test`, o limite de tentativas de login fica desligado (`AUTH_RATE_LIMIT=0`) e os logs ficam em silêncio (`LOG_LEVEL=silent`).
- A RN-07 tem um teste próprio (`tradeRollback.int.test.ts`): ele força um erro no meio da conclusão de uma troca (segunda confirmação) e no meio do aceite da oferta (a troca nascendo) e confere que quantidades, reservas, confirmações, oferta e anúncio ficaram iguais.
- A integridade da coleção (#213) tem um teste por caminho (`tradeConservation.int.test.ts`): concluir, recusar e cancelar depois de confirmar, aceite que falha, duas trocas no mesmo anúncio (uma conclui e a outra cancela: a quantidade volta ao anúncio), anúncio que fecha de verdade e anúncios de quem ofertou. Em cada um, o total de cada carta somando todas as coleções não muda, desistir deixa cada coleção (quantidade e reserva) igual ao início, concluir muda só as cartas da troca, e ao fim valem os dois invariantes: reserva de cada item = soma das trocas abertas que o usam, e anunciado + reservado ≤ quantidade.

O que a integração cobre (182 testes, um arquivo por área):

| Arquivo | Casos |
|---|---|
| `auth` | cadastro, e-mail e username repetidos (409), senha curta (400 com `details`), login certo e errado (401), sem token e token inválido (401), `admin-check` (403/200), limite de tentativas (429 com `Retry-After`, outro e-mail entra) |
| `user` | editar o perfil, campo inválido ou a mais (400), excluir a conta: login depois → 403 e perfil público → 404; com troca aberta (qualquer lado) → 409 e nada muda, nem as outras ofertas; sem troca, cancela as ofertas feitas e recebidas (`ACCOUNT_DEACTIVATED`) e fecha os anúncios |
| `collection` | adicionar e listar com `available`; RN-01 (a carta é gravada uma vez só); RN-02 (403 e 404); RN-03 (soma, quantidade negativa 400 e CHECK no banco); variante que a carta não tem (422); quantidade abaixo do anunciado (422) e apagar item anunciado (409); condição presa (409); RN-11 nos três caminhos |
| `wishlist` | adicionar, listar, remover; repetida (409); `opportunities` conta só item público de outra pessoa; RN-12 (tem a carta, mesmo privada → 409; item zerado → 201) |
| `profile` | RN-10: item privado, e-mail e reserva não aparecem; usuário inexistente (404) |
| `listings` | RN-05 (403, 422, soma dos anúncios abertos); pausar, fechar sem volta, bloqueio só do ADMIN; marketplace: `q`, `type`, `rarity`, filtros somados, `sort=name`, valor inválido (400 com `details`), `GET /listings/me`; Em troca: no fim do marketplace, também entre páginas; detalhe público sem dado da negociação; dono não muda a quantidade nem reativa (409), pausa, fecha (ofertas em espera canceladas); ADMIN bloqueia |
| `offers` | RN-06: próprio anúncio (422), anúncio pausado (404), anúncio em troca (422), carta de outra pessoa (403), mais do que tem (422), segunda oferta (409), quem aceita e quem cancela (403), oferta finalizada não muda (422); fechar e bloquear o anúncio cancelam as ofertas com o motivo; quem vê a oferta; carta em oferta aberta não é apagada (409); oferta recusada guarda as cartas oferecidas mesmo depois de o item sair da coleção |
| `trades` | aceitar cria a troca (tradeId, reserva dos dois lados, anúncio Em troca); cartas indisponíveis no aceite (422, nada muda); oferta aceita não muda (409); outras ofertas ficam em espera (aceitar 422, cancelar com motivo); `POST /trades` (409, 403, 422); as duas partes confirmam: a primeira só grava a data, confirmar de novo 409, a segunda troca as cartas (RN-07) com RN-11 e fecha o anúncio; troca finalizada não muda (409); recusar e cancelar (mesmo depois de confirmar) devolvem a reserva e a quantidade ao anúncio; anúncio fechado no meio-tempo não reabre, pausado recebe a quantidade e continua pausado, e fecha se a troca concluir; quem vê a troca (inclusive ADMIN → 403) |
| `tradeConservation` | conservação da coleção em cada caminho da troca (#213), descrita acima |
| `tradeRollback` | falha forçada no meio da conclusão e no meio do aceite da oferta: nada muda |
| `catalog` | catálogo local da busca (#78): com a tabela vazia a busca vai à TCGdex e não tolera erro de digitação; com a tabela preenchida pelas cartas do seed: `charzard` acha o Charizard sem chamar a TCGdex, `charizard base` põe o do Base Set primeiro, `pikachu` em duas páginas sem repetir, `flabebe` acha a Flabébé, palavras ignoradas, só o nome do set, filtro `set`, `sort=name&order=desc`, TCGdex fora do ar; salvar de novo não duplica. Com os filtros sincronizados (#158) e a TCGdex fora: `GET /cards/filters` (sem as coleções vazias, #196), `type` sem nome (sem diferenciar maiúscula), nome + `category`, lista sem nome paginada e valor que não existe (400); rankings `recent`, `wanted` e `traded` (#92) |
| `cards` | `user.myListing` com anúncio Em troca; busca, busca esperta (`charizard base`, palavras ignoradas), ids recusados fora da lista, `limit` acima de 100 (400), detalhe com e sem login, carta inexistente (404), id fora da regra (400); filtros: `GET /cards/filters` (e 502 com a TCGdex fora), TCGdex instável (#145: 503 uma vez responde 200; 503 três vezes → 502 depois de 3 chamadas), `type` sem nome, mesmo nome com tipos diferentes (cache separado), nome + raridade + set, `category` com `sort=name&order=desc` e duas páginas, valor que não existe (400 com `details`) |
| `pagination` | #77: sem parâmetro responde como antes; `limit`/`page` sem repetir item; `q`, `isPublic`, `type`, `finish`, `sort=recent`; `limit=500` (400 com `details`); wishlist `type=Fire` da misty; perfil público com `limit=1` sem itens privados; ofertas e trocas com `side` e sem `side`; ofertas recebidas com a pendente mais antiga na página 1 e as páginas seguintes sem repetir (#199), e as em espera depois das que dá para aceitar (#213); `page`/`limit` sem `side` (400); `GET /listings/me` paginado |
| `snapshot` | RN-09: com a TCGdex fora do ar, coleção, wishlist, perfil público e marketplace continuam respondendo com os dados da carta; o detalhe de uma carta já consultada sai da cópia guardada no banco; cópia vencida responde na hora e é atualizada por trás (#192); carta com o detalhe guardado entra na coleção com a TCGdex fora; a leitura ignora a caixa, mas `%` e `_` não viram curinga, e `POST /collection` e `/wishlist` com esses caracteres no `cardId` dão 400 |
| `health` e `errors` | `/health/ready`, TCGdex fora do ar (502), JSON malformado (400), corpo acima de 100 KB (413), rota inexistente (404), id que não é UUID (400), `x-request-id` |

O 504 (TCGdex demorando mais de 8 s) fica só nos testes de unidade do `TcgdexClient`, para a suíte não esperar 8 s. Como a IA ajudou a escrever esses testes, e o que ela errou, está em [`docs/ia.md`](ia.md).

### Testes de fumaça (smoke)

Fora da CI, o `Makefile` tem testes rápidos com curl contra a API local e os usuários do seed: `make test` (todos; precisa da API rodando), `make test-db` (CHECKs do banco) e `make test-collection`, `test-profile`, `test-wishlist`, `test-listings` e `test-offers`. `make unit` é o mesmo que `cd backend && npm test`.

## Testes do front

O front usa o **Vitest**, que aproveita a configuração do Vite (entende JSX, CSS Modules e `import.meta.env`). Os testes rodam no terminal, em segundos, sem navegador de verdade e sem backend:

```bash
cd frontend
npm test
```

`npm test` roda uma vez e termina (é o que a CI usa). `npm run test:watch` fica rodando e repete os testes a cada arquivo salvo.

| Andar | Onde | O que testa |
|---|---|---|
| Funções puras | `src/auth/validator.test.js`, `src/utils/*.test.js`, `src/api/mensagens.test.js`, `src/api/parametros.test.js` | parâmetros de página e filtros das listas (`semVazios`, `parametrosDaPagina`), busca sem acento, filtro do nome no resultado da API, conferência das quantidades oferecidas e textos do resumo da troca na oferta (`utils/oferta.js`), mensagem amigável de cada erro da API e erros por campo (`errosPorCampo`), regras do login e do cadastro (`Validator` + `rules.js`), filtros do marketplace, aba, status e página de Propostas e Trocas lidos da URL, resumo das trocas do perfil (`utils/negociacao.js`) e rótulos (variante, data, preço de referência, contagem de ofertas aguardando, resumo das cartas de uma troca, frase de próximo passo de cada oferta e troca, com oferta em espera, motivo do cancelamento e quem já confirmou a troca), trocas esperando a sua confirmação dos dois lados (`trocasEsperandoConfirmacao`), máscaras de telefone e CEP e validação do perfil |
| Service com fakes | `src/auth/authService.test.js`, `src/auth/gateways/httpAuthGateway.test.js` | `AuthService` com gateway e stores de mentira passados no construtor: login certo, formulário inválido sem chamar a API, API recusando (com mensagem amigável ou erro por campo), cadastro, sessão já salva, logout e inscrição; o `HttpAuthGateway` com um `http` de mentira manda só os campos da API |
| HTTP com a API simulada | `src/api/http.test.js`, `src/api/listas.test.js` | o `http` com respostas falsas do MSW: token no header, `ApiError` com status e `details`, 401 com o token salvo chama `aoExpirarSessao`, 401 do login e 401 sem token não chamam, 401 atrasado de um token antigo não derruba a sessão nova, 401 sem token com sessão na tela chama `aoPerderToken`; as funções de lista sem parâmetro devolvem o formato antigo e com opções mandam `page`, `limit` e só os filtros preenchidos |
| Hook | `src/hooks/useCarregar.test.js`, `src/hooks/useAcao.test.jsx`, `src/hooks/usePendencias.test.jsx`, `src/hooks/useListaPaginada.test.js`, `src/hooks/useMinhasCartas.test.js` | o hook rodando sozinho com o `renderHook` da Testing Library: o `useCarregar` (usado por quase todas as páginas) começa carregando, entrega os dados ou o erro, volta a carregar no `recarregar()` e na troca de chave, esconde o erro antigo enquanto recarrega e ignora a resposta atrasada de uma chave antiga; o `useAcao` devolve `{ ok, resultado }` ou `{ ok: false, erro }`, fica `ocupado` enquanto a ação roda e mostra o toast só quando dá certo; o `usePendencias` (selo do topo, com o MSW) não chama a API sem login, conta as ofertas recebidas que dá para aceitar (as em espera não contam) e as trocas em andamento, enviadas e recebidas, em que falta a sua confirmação, conta de novo no aviso de mudança e ao trocar de conta, volta a zero no logout e, ao trocar de página, só conta de novo depois de 1 minuto; o "carregar mais" junta as páginas, uma página que falha não é pulada (o próximo clique repete a mesma), trocar a busca volta para a página 1, `atualizarCarregadas()` busca de novo todas as páginas já abertas sem duplicar e sem esconder a lista, e `tentarDeNovo()` repete a busca que falhou; a wishlist e a coleção do catálogo com o MSW: falha na primeira vez não vira lista vazia, falha num recarregamento mantém o último estado conhecido |
| Rota privada | `src/components/RotaPrivada/RotaPrivada.test.jsx` | com o `MemoryRouter` (roteador que guarda a URL na memória): sem sessão, vai para o login guardando a página de origem com os filtros da URL em `state.de`; com sessão, mostra a página; se a sessão acaba com a página aberta, vai para o login |
| Formulário com a API simulada | `src/components/FormOferta/FormOferta.test.jsx`, `src/components/VoceEACarta/VoceEACarta.test.jsx` | o "Monte sua oferta" inteiro com a coleção vinda do MSW: uma carta marcada com a quantidade apagada e escondida pela busca bloqueia o envio e aparece no aviso; a busca "fire" não mostra a carta que a API achou só pelo nome da expansão; o atalho "Anunciar esta carta" do detalhe da carta: com uma cópia livre mostra a variante e anuncia essa cópia, com várias pergunta "Qual cópia?" e anuncia a escolhida, erro da API aparece no modal aberto, cópias todas reservadas mostram o aviso, Esc e Fechar não criam nada; com anúncio ativo, pausado ou em troca, "Ver meu anúncio" aponta para o próprio anúncio e o aviso diz se ele está ativo, pausado ou em troca; sem anúncio, aparece "Anunciar esta carta" |
| "Mais desejadas" da home com a API simulada | `src/components/GridCartas/GridCartas.test.jsx` | com o MSW: ranking em português vazio mostra o de inglês, com as cartas e o "Ver todas" em `lang=en`; com cartas em português, não busca em inglês; erro no português mostra o aviso e não busca em inglês |
| Página com a API simulada | `src/pages/wishlist.test.jsx`, `src/pages/myOffers.test.jsx`, `src/pages/listing.test.jsx`, `src/pages/publicPerfil.test.jsx`, `src/pages/catalog.test.jsx` | a wishlist (`/procuro`) inteira com o MSW e os mesmos providers do app (`renderWithProviders`): lista vazia com o card de adicionar, itens com expansão, colecionadores, preço de referência e "Procurar anúncios", a primeira página pedida com 23 cartas, remover só depois de confirmar no modal e a lista se atualiza sem recarregar, remoção que falha mostra o erro e a lista continua igual, o modal de adicionar busca no idioma escolhido, marca a carta que já está na wishlist (mesmo em outra página) e "Você já tem" para carta com unidade na coleção, e adiciona sem recarregar; "Já consegui" leva a carta para a coleção e tira da lista, e cai para o inglês quando a carta não existe em português; filtros, ordem e página lidos da URL, selos que tiram o filtro, busca, tipo, raridade e ordem pelo painel, busca de uma letra que não vai para a API, filtro sem resultado com "Limpar filtros", paginação com o card de adicionar em todas as páginas, volta à página anterior quando a última carta da página sai, remover ou Já consegui com 25 cartas (duas páginas) traz a carta 24 para a página 1 e a 25 fica na página 2, adicionar com filtro recarrega a página; API fora do ar mostra o aviso e o "Tentar de novo" carrega a lista; Propostas mantém os cartões na tela enquanto atualiza depois de recusar e tira só a oferta que saiu do filtro, e a galeria abre num diálogo com todas as cartas de um lado; Aceitar diz no modal que a troca nasce e reserva as cartas, chama o PATCH e leva para `/trocas?aba=recebidas&status=PROPOSED`, e o aceite que falha (422) mostra a mensagem da API; oferta que virou troca (`tradeId`) mostra "Virou troca" e "Ver troca", sem Recusar nem Cancelar, e com a troca concluída (`tradeStatus`) mostra "Troca concluída" e leva às trocas concluídas; oferta em espera (`onHold`) não deixa aceitar e diz por quê, e quem ofertou ainda pode cancelar; oferta cancelada mostra o motivo (`cancelReason`); oferta recusada continua mostrando as cartas oferecidas; o anúncio com oferta aberta esconde o formulário, e o anúncio em troca mostra o selo e o aviso sem formulário, mas quem tem oferta em espera nele continua vendo "Você já fez uma oferta aqui"; o perfil público com a coleção vinda do MSW: busca longa demais na URL não vai para a API e o perfil aparece; 400 de filtro mostra "Filtro inválido" com o campo de busca; 404 e username inválido mostram "Colecionador não encontrado"; o catálogo avisa as palavras ignoradas da busca (e o aviso some quando a nova busca não ignora nada, ou quando a lista vem vazia), mostra "Cartas de ..." para só o nome do set e avisa a palavra ignorada junto com o nome do set (#214), e o sem resultado tem o termo, "Limpar busca", "Limpar filtros" com filtro, sem paginação, e "Voltar para a primeira página" numa página vazia além da primeira |
| Componente | `src/components/Aviso/Aviso.test.jsx`, `src/components/AcoesAnuncio/AcoesAnuncio.test.jsx`, `src/components/header/BuscaGeral.test.jsx`, `src/components/ConfirmModal/ConfirmModal.test.jsx`, `src/components/ConfirmacaoProvider/ConfirmacaoProvider.test.jsx`, `src/components/ToastProvider/ToastProvider.test.jsx`, `src/components/ErroCampo/ErroCampo.test.jsx`, `src/components/ImagemCarta/ImagemCarta.test.jsx`, `src/components/SessaoExpirada/SessaoExpirada.test.jsx`, `src/components/Abas/Abas.test.jsx`, `src/components/CartaoTroca/CartaoTroca.test.jsx`, `src/components/CartaAnuncio/CartaAnuncio.test.jsx`, `src/components/Perfil/Perfil.test.jsx` | o componente renderizado com a Testing Library, procurado pelo papel e pelo texto, como a pessoa vê; o modal de confirmação abre com o texto certo, confirmar devolve `true`, cancelar e Esc devolvem `false`; o toast aparece na região viva certa, some sozinho, fecha no X, e o `useAcao` dispara o toast de sucesso; a mensagem do `ErroCampo` vira a descrição acessível do campo; carta sem imagem, ou com imagem que falha, mostra o placeholder com a descrição, e uma imagem nova tenta carregar de novo; o aviso de sessão expirada mostra o toast e leva ao login guardando a página de origem; as `Abas` têm os papéis ARIA, o Tab para só na aba ativa e as setas, Home e End trocam de aba; a busca do topo descarta o rascunho ao trocar de página e só pesquisa sozinha na página de resultados; fechar um anúncio (com o PATCH no MSW) avisa o selo de pendências e pausar não, e o anúncio em troca pode ser pausado ou fechado; o cartão da troca nos três estados de confirmação (ninguém, você, o outro), "Confirmar recebimento" com o resumo no modal chamando `POST /trades/:id/accept`, a segunda confirmação concluindo, e Recusar troca e Cancelar troca depois de ter confirmado; o selo "Em troca" no cartão do marketplace; o resumo de trocas do perfil contando as que esperam a sua confirmação e o 409 ao desativar a conta com troca aberta |
| Componente | `src/components/AcoesRapidas/AcoesRapidas.test.jsx` | os botões do catálogo (#162, #244): Wishlist e Tenho chamam a ação, o botão da wishlist fica pressionado (lixeira) com a carta na wishlist e desligado enquanto a wishlist atualiza, quem já tem a carta vê só Editar, e o bloqueio desliga os botões |

Como está montado:

- Cada teste fica ao lado do arquivo testado, com `.test.js` (ou `.test.jsx`) no nome, e importa `describe`, `it`, `expect` e `vi` do `vitest`.
- O ambiente é o **jsdom**, um navegador de mentira dentro do Node, com `document`, `window` e `localStorage`.
- `src/test/setup.js` roda antes dos testes: completa o `<dialog>` do jsdom (que não tem `showModal()` nem `close()`) com o mínimo para o modal funcionar, cria um `window.matchMedia` falso (o jsdom não tem, e componentes como `GradeCartas`, `PainelFiltros` e `CartaInterativa` usam), liga as verificações do jest-dom (`toBeInTheDocument()` e afins), limpa a tela e o `localStorage` depois de cada teste e liga o **MSW** (`src/test/server.js`), que intercepta as requisições HTTP. Cada teste coloca as respostas falsas de que precisa com `server.use(...)` (veja `src/api/http.test.js`), e qualquer requisição sem resposta combinada é barrada: o teste falha na hora em vez de depender da API.
- `src/test/renderWithProviders.jsx` renderiza um componente dentro do que o `main.jsx` monta (roteador, toast, sessão e confirmação), com o `MemoryRouter` no lugar do `BrowserRouter`. O teste escolhe a URL inicial (`rota`) e a sessão (`service`). `src/test/sessaoFalsa.js` cria uma sessão de mentira com `criarSessaoFalsa()` (Ash logado) ou `criarSessaoFalsa(null)` (sem login), com `entrar()` e `logout()` para trocar a sessão no meio do teste.
- O `npm run build` não leva os arquivos de teste para o `dist`.

### Cobertura do front

```bash
cd frontend
npm run test:coverage
```

Roda os mesmos testes do `npm test` medindo a cobertura com o `@vitest/coverage-v8`. A tabela aparece no terminal, e o relatório arquivo por arquivo, com as linhas cobertas em verde, fica em `frontend/coverage/index.html`. Entram na conta os `.js` e `.jsx` de `frontend/src`; ficam de fora os testes, a pasta `src/test` e o `main.jsx`, que só monta o app.

| Métrica | Medido | Mínimo exigido |
|---|---|---|
| Linhas | 87,0% | 40% |
| Comandos | 84,8% | 41% |
| Funções | 81,2% | 35% |
| Ramos (if/else) | 81,6% | 35% |

Números de 26/11/2026, com 519 testes. O mínimo foi definido em 19/11 pela mesma regra do backend (o valor medido na época, 266 testes e 42,7% das linhas, menos uns 2 pontos) e pode subir. Ele fica em `frontend/vite.config.js` (`test.coverage.thresholds`); abaixo dele, o `npm run test:coverage` termina com erro e a CI fica vermelha. A cobertura do front é mais baixa que a do backend porque a maioria das páginas ainda não tem teste próprio (as testadas mostram o padrão para as outras); quem acrescentar testes pode subir o mínimo.

## Cobertura

Cobertura é a porcentagem do código que os testes executaram pelo menos uma vez. Ela não prova que o código está certo, mas mostra onde nenhum teste passa.

```bash
make coverage
```

`make coverage` sobe o banco de teste e roda `npm run test:coverage`: os testes de unidade e os de integração numa execução só, somando a cobertura dos dois. O relatório, arquivo por arquivo e linha por linha, fica em `backend/coverage/lcov-report/index.html`.

Entram na conta os arquivos `.ts` de `backend/src`. Ficam de fora os testes, o client gerado do Prisma, o Swagger escrito à mão (`src/docs`), os mocks, os arquivos só de tipos e o `server.ts`, que só sobe o servidor.

| Métrica | Só unidade | Unidade + integração | Mínimo exigido |
|---|---|---|---|
| Linhas | 83,5% | 98,3% | 95% |
| Comandos | 81,9% | 96,8% | 94% |
| Funções | 73,6% | 97,8% | 95% |
| Ramos (if/else) | 76,0% | 90,3% | 86% |

Números de 26/11/2026, com 948 testes de unidade e 195 de integração. O mínimo é o valor medido menos uns 2 pontos, para uma mudança pequena não quebrar a CI. Abaixo dele, o `npm run test:coverage` termina com erro, a CI fica vermelha e o deploy não sai. A meta é manter os números e subir o mínimo dos ramos aos poucos; 100% não é meta, porque incentiva teste que só pinta linha. A cobertura do front tem a tabela dela em [Cobertura do front](#cobertura-do-front).

A CI (GitHub Actions, `.github/workflows/ci.yml`) roda em toda PR para `develop` e `main` e em todo push na `develop`:

| Job | O que roda |
|---|---|
| `backend` | sobe um PostgreSQL de teste; `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm run build` e `npm run test:coverage` (unidade + integração, com o mínimo de cobertura). Mostra a tabela de cobertura no resumo da execução e guarda o relatório completo como artefato `coverage-backend` |
| `frontend` | `npm ci`, `npm run lint`, `npm run test:coverage` (Vitest, com o mínimo de cobertura) e `npm run build`. Mostra a tabela de cobertura no resumo da execução e guarda o relatório completo como artefato `coverage-frontend` |

Os dois precisam passar para mergear. Na `main`, quem chama a CI é o workflow de deploy, antes de publicar (veja [Deploy](deploy-e-producao.md)).

## E2E com Cypress

E2E (ponta a ponta) é o topo da pirâmide: um navegador de verdade abre o PokeBox, entra, clica e confere a tela, com front, API e banco rodando juntos no Docker. São poucos testes, só dos caminhos que não podem quebrar. O Cypress fica na pasta `e2e/`, com o próprio `package.json`, para não pesar no `npm install` do front e do backend.

> **Atenção: o E2E apaga os dados de usuário do banco local.** Antes de cada arquivo de teste, ele limpa usuários, coleções, wishlist, anúncios, ofertas e trocas e roda o seed de novo, como se fosse um `make reset` só dessas tabelas. O catálogo de cartas (`Card`, `CardCache`, `CatalogCard`, `CatalogSet` e `CatalogFilterValue`) fica. Se você tem dados criados à mão que quer guardar, não rode o E2E nesse banco. Por isso o reset tem uma trava: ele só roda com a variável `E2E_PERMITIR_RESET=1`; sem ela, o primeiro teste falha com uma mensagem explicando. O `make e2e` e o workflow da CI já ligam a variável.

```bash
docker compose up -d --build --wait
cd e2e
npm ci
E2E_PERMITIR_RESET=1 npx cypress run
```

`E2E_PERMITIR_RESET=1 npx cypress run` (ou `make e2e`, da raiz) roda sem janela, como a CI. `E2E_PERMITIR_RESET=1 npx cypress open` abre a janela do Cypress para ver o teste rodando e escrever testes novos. Os prints das falhas ficam em `e2e/cypress/screenshots`.

Como está montado:

- **Reset do banco**: a task `resetarBanco` (`e2e/cypress.config.js`) roda um `TRUNCATE ... RESTART IDENTITY CASCADE` nas tabelas de usuário direto no Postgres do container `tcg-db` e depois o seed dentro do container `tcg-backend` (`npx prisma db seed`). Não existe rota de reset na API: uma rota que apaga o banco seria perigosa se escapasse para produção. Leva uns 2 a 3 segundos.
- **Senhas**: vêm do `.env` da raiz (`SEED_ADMIN_PASSWORD` e `SEED_DEMO_PASSWORD`), o mesmo que o compose usa, e são lidas no teste com `cy.env()`. Nenhuma senha fica escrita nos testes.
- **Login rápido**: `cy.login(email)` entra pela API e guarda o token (`pokebox.token`) e o usuário (`pokebox.user`) com `cy.session`, que reaproveita o login nos testes seguintes. O `validate` chama `GET /auth/me`; depois de um reset, o token antigo deixa de valer e o login é refeito. `cy.loginAdmin()` faz o mesmo com o admin.
- **Seletores**: pelo papel, rótulo e texto que a pessoa vê (`findByRole`, `findByLabelText`, da Testing Library para Cypress). Nada de classe CSS e nada de `cy.wait(ms)`.
- Na falha, o Cypress tenta o teste mais uma vez (`retries.runMode: 1`).
- Por que Cypress: é a ferramenta da aula. O Playwright seria a alternativa (mais rápido e com vários navegadores), mas o time ficou com o que estudou.

| Arquivo | O que cobre |
|---|---|
| `auth.cy.js` | login pela tela com o ash (cai na home com o menu do usuário), senha errada mostra "E-mail ou senha inválidos", página privada sem sessão manda para o login, entrar pela tela depois disso volta para a página privada, `cy.login` reaproveitando a sessão |
| `colecao.cy.js` | o ash abre o Bulbasaur do Base Set (`/cards/base1-44`), adiciona à coleção com os valores padrão, vê "Carta adicionada à coleção." e a linha do Bulbasaur em Minha coleção |
| `wishlist.cy.js` | o ash remove o Zapdos em `/procuro` e confirma no modal (sobram 3 cartas); depois abre o Squirtle do Base Set (`/cards/base1-63`), clica em "Quero esta carta" e vê o Squirtle na wishlist |
| `anuncio.cy.js` | o ash anuncia 1 Rowlet pela linha da coleção, vê "Anúncio criado. Veja em Meus anúncios." e acha o anúncio buscando "rowlet" no marketplace |
| `troca.cy.js` | a troca inteira com dois usuários: o ash anuncia o Rowlet (o `id` vem da resposta do `POST /listings`, com `cy.intercept`), a misty oferece 1 Psyduck, o ash aceita (o modal avisa que a troca nasce) e cai em Trocas com a troca já criada, a misty vê "Virou troca" na oferta (sem "Cancelar oferta"), abre "Ver troca" e confirma o recebimento, o ash vê "@misty já confirmou" e confirma, e o Rowlet aparece na coleção da misty e o Psyduck na do ash |
| `admin.cy.js` | o admin abre o anúncio do Blastoise da misty pelo marketplace, bloqueia na caixa "Moderação do anúncio" (confirmando no modal), e o anúncio some da busca "blastoise" |

Cada arquivo roda sozinho (`npx cypress run --spec cypress/e2e/troca.cy.js`). Nos arquivos dos fluxos, o reset roda antes de **cada** teste (`beforeEach`), e não só uma vez por arquivo: o Cypress não repete o `before` quando tenta um teste de novo, e uma segunda tentativa que começasse no meio de uma troca acharia o banco sujo. Para achar um pedaço da tela sem papel próprio, os componentes ganharam três atributos só para teste: `data-cy="item-wishlist"` (`ItemWishlist`), `data-cy="cartao-oferta"` (`CartaoOferta`) e `data-cy="cartao-troca"` (`CartaoTroca`). Quem mudar esses componentes mantém os atributos.

A suíte inteira (6 arquivos, 11 testes) leva uns 40 segundos no computador, com o compose já no ar.

Na CI, o workflow `E2E` (`.github/workflows/e2e.yml`) roda em toda PR para `develop` e `main` e pode ser disparado à mão na aba Actions. Ele cria um `.env` com valores só de teste (escritos no próprio workflow, sem secrets), sobe o compose, espera o front e a API responderem e roda o Cypress no Chrome. Se falhar, guarda os prints e o vídeo no artefato `cypress-falhas` (7 dias) e mostra os logs da API. Ele não é check obrigatório por enquanto.

A página da carta e o "adicionar à coleção/wishlist" dependem da TCGdex num banco novo como o da CI (o seed não preenche `CardCache` nem `CatalogCard`): no E2E, isso é o `colecao.cy.js` e a parte "adicionar" do `wishlist.cy.js`. Os runners do GitHub têm internet. Nesses dois testes, a primeira conferência espera até 15 s (a API pode levar até 8 s esperando a TCGdex, e o Cypress espera 4 s por padrão), e o `retries` cobre uma falha passageira. O teste de remover da wishlist confere um item a menos do que havia, sem depender de quantos itens o seed põe na wishlist do ash. Login, rota privada, a lista da coleção, marketplace, anúncio, oferta, troca, remover da wishlist e moderação usam só o banco. Os testes não usam o painel de filtros do marketplace, que também chama a TCGdex.
