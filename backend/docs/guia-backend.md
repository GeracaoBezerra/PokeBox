# Guia do backend

Como o backend do PokeBox está montado e como as regras de negócio funcionam. Para detalhes de cada campo, use o Swagger em `/docs`. O modelo do banco está em [`db.md`](db.md).

## Ideia do app

O PokeBox é um app de trocas de cartas Pokémon TCG, sem venda nem pagamento. O colecionador cadastra as cartas que tem (coleção), marca as que quer (wishlist), anuncia cartas para troca e faz ofertas nos anúncios dos outros oferecendo cartas da própria coleção. Quando o dono do anúncio aceita, nasce uma troca; quando as duas partes confirmam o recebimento, as cartas mudam de dono.

Os dados das cartas (nome, imagem, variantes, preço) vêm da API pública da [TCGdex](https://tcgdex.dev). O banco guarda só o que é do usuário e uma cópia das cartas usadas.

## Como uma requisição anda

```
rota → middlewares → controller → service → repository → banco (Prisma)
```

| Camada | Pasta | Papel |
|---|---|---|
| Rotas | `src/routes` | ligam a URL ao controller e dizem se precisa de login |
| Middlewares | `src/middlewares` | `AuthMiddleware` (`requireAuth` para login obrigatório, `optionalAuth` para login opcional, `requireRole('ADMIN')`), `rateLimit` (login e cadastro), `requestLogger`, `validateCardParams` e o tratador de erros (`createErrorHandler`, com os tradutores de `src/errors/translators`) |
| Controllers | `src/controllers` | validam a entrada com zod (`src/schemas`), chamam o service e montam a resposta |
| Services | `src/services` | regras de negócio e transações |
| Repositories | `src/repositories` | consultas ao banco (Prisma). A TCGdex e os caches de carta ficam em `src/cards/catalog`, e a busca em `src/cards/search` |
| Regras puras | `src/utils/*Rules.ts` | funções sem banco, fáceis de testar (ex.: "esta oferta cabe no anúncio?") |
| Montagem | `src/container.ts`, `src/modules` | cada módulo (auth, cards, collection, wishlist, listings, trading) cria os repositories, services e controllers e diz em que caminho as rotas entram; o `container.ts` junta tudo |

Quando uma regra é violada, o service ou a regra lança um `AppError` ou uma das subclasses de `errors/domainErrors.ts` (`NotFoundError`, `ForbiddenError`, `ConflictError`, `UnprocessableError`). O `errorHandler` transforma qualquer erro na resposta padrão e traduz os erros do zod (400), do Prisma (duplicado → 409, não encontrado → 404, CHECK do banco → 422) e da TCGdex (502/504).

Toda resposta tem o mesmo formato:

```json
{ "success": true, "data": { } }
{ "success": false, "error": "mensagem", "details": [ ] }
```

`details` só aparece em erro de validação.

## Login e conta

O login devolve um JWT, válido por 1 dia (`JWT_EXPIRES_IN`), e o front manda esse token em `Authorization: Bearer <token>`. A cada requisição, o `requireAuth` confere o token e busca o usuário no banco. Conta desativada ou suspensa perde o acesso na hora (401), mesmo com o token ainda válido.

| Rota | O que faz |
|---|---|
| `POST /auth/register` | cria a conta (`username`, `name`, `email`, `password`) e já devolve o token. A senha é gravada com bcrypt |
| `POST /auth/login` | e-mail e senha → token. Conta suspensa ou inativa → 403. Muitas tentativas erradas (20 em 15 min, por IP + e-mail) → 429 |
| `GET /auth/me` | dados completos do usuário logado (inclui telefone e endereço) |
| `PATCH /user/me` | edita nome, telefone e endereço |
| `DELETE /user/me` | desativa a conta. Nada é apagado: o histórico de trocas continua. Com troca em andamento → 409 ("Conclua ou cancele suas trocas antes de desativar a conta."). Sem troca em andamento, cancela as ofertas abertas feitas e recebidas e fecha os anúncios abertos |
| `GET /auth/admin-check` | só responde 200 para ADMIN; serve para testar o papel |

Há dois papéis. `USER` é o padrão; o `ADMIN` só tem poder extra sobre anúncios (bloquear e desbloquear). Ele não mexe na coleção, nas ofertas nem nas trocas dos outros.

## Cartas

| Rota | O que faz |
|---|---|
| `GET /cards?name=&page=&limit=&lang=&type=&rarity=&set=&category=&sort=&order=` | busca no catálogo local do banco (sincronizado com `npm run catalog:sync` em `en` e `pt`); num idioma não sincronizado, vai à TCGdex. Paginada. Entende nome de set e ignora palavras que não acham nada (`charizard base x pipi popo` traz os Charizard, com o do Base Set primeiro). Cada item traz `set` e `number`, e a resposta traz `search` explicando como a busca foi entendida |
| `GET /cards/filters?lang=` | valores aceitos nos filtros (tipos, raridades, categorias, sets) |
| `GET /cards/:id` | detalhe da carta e os anúncios ativos dela. Com login, traz também o bloco `user`: quantas você tem, se está na sua wishlist e se você tem anúncio aberto dela (ativo, pausado ou em troca) |

A busca usa as funções puras de `utils/cardSearch.ts` (`tokenize`, `matchSets`, `rankCards`...) e as classes de `src/cards/search`. Os sets do catálogo local ficam 10 min em memória; na busca pela TCGdex, os sets ficam 1 dia e o resultado ranqueado, 10 min (trocar de página não chama a TCGdex de novo). Filtros e rankings em detalhe: [`docs/api.md`](../../docs/api.md).

Cache: em `en` e `pt`, o detalhe de todas as cartas já está no banco (`CardCache`), gravado pelo sync; nos outros idiomas, vai à TCGdex só na primeira vez. A cópia do banco responde na hora e, com mais de 24 h, é atualizada por trás; na memória fica 1 h. Se a TCGdex cair, a API usa a última cópia guardada. Sem cópia, responde 502 (fora do ar) ou 504 (demorou mais de 8 s).

Quando uma carta entra na coleção ou na wishlist, os dados dela são gravados uma vez na tabela `Card`, e os itens só apontam para ela.

## Coleção

Cada item da coleção é uma carta numa combinação de condição (`NEAR_MINT`, `PLAYED`...), acabamento (`finish`: `NORMAL`, `HOLO`, `REVERSE`) e primeira edição (`firstEdition`).

| Rota | O que faz |
|---|---|
| `GET /collection` | minha coleção. Cada item traz `quantity`, `reservedQuantity` e `available` (o que sobra para negociar) |
| `POST /collection` | adiciona `cardId`, `quantity`, `finish`, `firstEdition` e, opcionalmente, `condition` e `isPublic` |
| `PATCH /collection/:id` | muda `quantity`, `condition` ou `isPublic` |
| `DELETE /collection/:id` | apaga o item |
| `GET /users/:username/collection` | perfil público de outro colecionador (só itens públicos) |

Fluxo do `POST /collection`:

1. Busca a carta na TCGdex (ou no cache). Carta que não existe → 404.
2. Confere se a carta existe nessa variante (`finish` + `firstEdition`). Se não existe → 422.
3. Grava a carta na tabela `Card`, se ainda não estiver lá.
4. Se você já tem a mesma carta com a mesma condição e variante, soma na quantidade. Senão, cria um item novo.
5. Tira a carta da sua wishlist, se estiver lá (RN-11); a resposta diz isso em `removedFromWishlist`.

Regras:

- Só o dono vê e mexe nos próprios itens (outro usuário → 403, inclusive o ADMIN).
- A quantidade não pode ficar abaixo do que está reservado em troca nem do que está anunciado (422).
- Item com reserva, já anunciado ou numa oferta aberta ou aceita não pode ser apagado (409). Para tirá-lo do perfil, zere a quantidade ou deixe privado.
- Um `PATCH` que tira um item de 0 também tira a carta da wishlist (RN-11).
- A condição não muda enquanto o item está num anúncio aberto, numa oferta ou numa troca aberta (409). Assim, o que foi anunciado é o que chega.

## Wishlist

| Rota | O que faz |
|---|---|
| `GET /wishlist` | minhas cartas desejadas; cada uma com `opportunities` |
| `POST /wishlist` | adiciona `{ cardId }` |
| `DELETE /wishlist/:id` | remove (o `id` é o do item da wishlist, não o da carta) |

Fluxo do `POST /wishlist`: busca a carta na TCGdex (404 se não existir), grava na tabela `Card` se ainda não estiver lá e cria o item. A mesma carta duas vezes → 409. Carta que você já tem na coleção (quantidade maior que 0, em qualquer variante) → 409 (RN-12); item zerado não conta.

A wishlist não tem variante nem condição: quem deseja aceita qualquer versão. O campo `opportunities` conta quantos outros colecionadores têm essa carta pública e disponível, sem contar contas desativadas. É o gancho para o front sugerir "tem gente com essa carta".

## Processo de troca

A troca passa por três objetos: anúncio, oferta e troca, em 3 passos para quem usa: ofertar, aceitar (a troca nasce) e as duas partes confirmarem o recebimento.

```
ANÚNCIO   ACTIVE                      o dono anuncia uma carta da coleção
   │
   ▼
OFERTA    PROPOSED                    o interessado oferece cartas dele
   ├──► REJECTED                      o dono recusa
   ├──► CANCELED                      o interessado desiste
   ▼
          ACCEPTED                    o dono aceita: a troca nasce na mesma hora
   │
   ▼
TROCA     PROPOSED                    cartas reservadas dos dois lados
   │                                  cada parte confirma o recebimento (a primeira só grava a data)
   ├──► REJECTED                      o dono recusa: reserva liberada, quantidade volta ao anúncio
   ├──► CANCELED                      o interessado cancela: reserva liberada, quantidade volta ao anúncio
   ▼
          ACCEPTED                    a segunda confirmação: as cartas mudam de dono
```

### 1. Anunciar

`POST /listings` com `collectionItemId`, `quantity` e `description` opcional.

- Só anuncia item da própria coleção (403).
- Somando todos os anúncios abertos (ativos, pausados e em troca) do item, a quantidade anunciada não passa do disponível (422).
- Anunciar não reserva nada. A carta continua na coleção e pode ir para outros anúncios dentro do disponível.

`PATCH /listings/:id` muda a quantidade, a descrição ou o status:

| Status | Quem | O que acontece com as ofertas |
|---|---|---|
| `PAUSED` (pausar) | dono | some do marketplace; ofertas ficam como estão |
| `ACTIVE` (reativar) | dono | volta ao marketplace (pausado com quantidade 0 precisa informar a quantidade) |
| `CLOSED` (fechar) | dono | definitivo. Cancela as ofertas abertas (motivo `LISTING_CLOSED`) |
| `BLOCKED` (bloquear) | só ADMIN | igual a fechar (motivo `LISTING_BLOCKED`). Desbloquear volta como `PAUSED`, mas as ofertas canceladas não voltam |
| diminuir a quantidade | dono | nada é cancelado: oferta que pede mais do que sobrou fica em espera |

`IN_TRADE` (Em troca) é posto pelo sistema quando todas as unidades do anúncio estão numa troca em andamento. O anúncio continua público, aparece no fim do marketplace e não recebe oferta nova (422). O dono pode pausar ou fechar, mas não muda a quantidade nem reativa (409); o ADMIN pode bloquear. Se a troca cair, a quantidade volta e o anúncio volta a `ACTIVE`; se a troca concluir e não houver outra troca aberta nele, o anúncio fecha.

Leitura: `GET /listings` lista os ativos e, no fim, os em troca, para todo mundo (filtros `cardId`, `username`, `q`, `condition`, `finish`, `firstEdition`, `setId`, `type`, `rarity`, `sort` e paginação; ver [`docs/api.md`](../../docs/api.md)). `GET /listings/me` lista os meus em qualquer status. `GET /listings/:id` mostra um anúncio ativo ou em troca para todos; pausado, fechado ou bloqueado só para o dono e o ADMIN.

### 2. Ofertar

`POST /listings/:id/offers`:

```json
{
  "quantity": 1,
  "message": "Troco pela minha Mew",
  "items": [{ "collectionItemId": "...", "quantity": 1 }]
}
```

`quantity` é quantas cartas do anúncio você quer. `items` são de 1 a 20 cartas da sua coleção que você dá em troca.

- Só em anúncio ativo de outra pessoa (o próprio → 422; em troca → 422; pausado, fechado ou bloqueado → 404).
- `quantity` não passa da quantidade do anúncio.
- As cartas oferecidas são suas (403) e cabem no seu disponível (422).
- Uma oferta aberta por pessoa em cada anúncio (409).
- A oferta não reserva cartas.

### 3. Responder a oferta (aceitar cria a troca)

`PATCH /offers/:id/status` com `{ "status": ... }`:

| Status | Quem pode |
|---|---|
| `ACCEPTED` | dono do anúncio |
| `REJECTED` | dono do anúncio |
| `CANCELED` | quem fez a oferta (motivo `PROPOSER`) |

Aceitar cria a troca na mesma transação (o miolo fica em `services/TradeOpener.ts`, usado também pelo `POST /trades`). O backend confere tudo de novo: o anúncio está ativo e tem a quantidade pedida, e quem ofertou ainda tem as cartas. Se algo mudou → 422 e nada muda. Se deu certo:

- a oferta fica `ACCEPTED` e a resposta traz o `tradeId`;
- a troca nasce `PROPOSED` e reserva as cartas dos dois lados (`reservedQuantity` sobe);
- o anúncio perde só a quantidade da oferta; em 0, vira `IN_TRADE`;
- os anúncios de quem ofertou que passariam do disponível são reduzidos (em 0, ativo vira `IN_TRADE` e pausado continua pausado);
- o quanto saiu de cada anúncio fica guardado em `TradeListingHold`, para voltar se a troca cair;
- as outras ofertas do anúncio **não** são canceladas: as que não cabem ficam em espera (`onHold: true`). Aceitar uma oferta em espera → 422; quem ofertou pode cancelar.

Oferta aceita não muda mais (409): para desistir, recuse ou cancele a troca. Oferta recusada ou cancelada também não muda (422). Recusar ou cancelar solta as cartas oferecidas.

A oferta responde `tradeId` e `tradeStatus` (ou `null`), `cancelReason` (`PROPOSER`, `LISTING_CLOSED`, `LISTING_BLOCKED`, `LISTING_TRADED`, `ACCOUNT_DEACTIVATED` ou `null`) e `onHold`.

`GET /offers/me` separa `sent` (as que fiz) e `received` (nos meus anúncios). Em `received`, primeiro as que dá para aceitar, depois as em espera, depois as respondidas. Com `side=sent|received` e página, as listas vêm paginadas. `GET /offers/:id` mostra uma oferta só para quem ofertou e para o dono do anúncio (404 para os outros).

`POST /trades` com `{ "offerId": "..." }` continua existindo (é rota do PDF): só quem fez a oferta chama (403); oferta que não está aceita → 422; oferta que já virou troca → 409 (na prática, toda oferta aceita, já que aceitar cria a troca).

### 4. Confirmar o recebimento, recusar ou cancelar a troca

| Rota | Quem | Efeito |
|---|---|---|
| `POST /trades/:id/accept` | as duas partes | a primeira grava a confirmação; a segunda conclui: as cartas mudam de dono |
| `POST /trades/:id/reject` | dono do anúncio | a reserva é liberada e a quantidade volta aos anúncios |
| `POST /trades/:id/cancel` | quem fez a oferta | a reserva é liberada e a quantidade volta aos anúncios |

A troca responde `proposerConfirmedAt` e `recipientConfirmedAt`. Confirmar de novo → 409. Dá para desistir mesmo depois de ter confirmado. Não há prazo para confirmar.

A conclusão roda numa transação só. Ela trava as cartas, confere que cada uma ainda é de quem entrega e está reservada, tira de quem entrega e soma em quem recebe. Quem recebe ganha a carta no item igual em carta, condição e variante; se não tiver, o backend cria um item público, e a carta sai da wishlist de quem recebe (RN-11). O anúncio em troca (ou pausado com quantidade 0) fecha, se não houver outra troca aberta nele, e as ofertas abertas dele são canceladas com o motivo `LISTING_TRADED`. Se qualquer passo falha, nada muda. Quem entregou continua com o item, mesmo com quantidade 0.

Recusar ou cancelar devolve a cada anúncio a quantidade que a troca tirou, se ele ainda estiver aberto (em troca volta a ativo; pausado continua pausado). Anúncio fechado ou bloqueado no meio-tempo não reabre. As coleções ficam exatamente como antes da troca.

Troca finalizada não muda mais (409). Se duas pessoas agem ao mesmo tempo na mesma troca, uma passa e a outra recebe 409.

`GET /trades/me` separa `sent` e `received`. `GET /trades/:id` só é visível para as duas partes (outros, inclusive o ADMIN → 403).

## Reserva e disponível

```
available = quantity - reservedQuantity
```

- Só a troca reserva. Anúncio e oferta não reservam, mas respeitam o disponível.
- A reserva entra quando a troca nasce (o dono aceita a oferta) e sai quando ela termina, seja concluída, recusada ou cancelada.
- Dois invariantes valem sempre e são provados por teste (`backend/test/integration/tradeConservation.int.test.ts` e `tradeRollback.int.test.ts`): a reserva de cada item é a soma das trocas abertas que usam o item, e anunciado (ativo, pausado ou em troca) + reservado ≤ quantidade. A consulta de conferência para produção está em [`db.md`](db.md#3-conferir-os-invariantes-da-coleção).
- Operações que podem acontecer ao mesmo tempo no mesmo item (anunciar, ofertar, aceitar) travam a linha do item no banco e rodam uma de cada vez.

## Códigos de erro

| Código | Quando |
|---|---|
| 400 | dado inválido ou JSON quebrado |
| 401 | sem token, token inválido ou vencido, senha errada |
| 401 | também conta desativada ou suspensa com token ainda válido |
| 403 | logado, mas sem permissão (item de outro, rota de admin), ou login de conta suspensa ou inativa |
| 404 | não existe ou você não pode ver |
| 409 | conflito: duplicado, item em uso, troca já finalizada |
| 413 | corpo acima de 100 KB |
| 422 | regra de negócio violada (quantidade, disponível, status errado) |
| 429 | muitas tentativas de login ou cadastro sem sucesso em 15 min |
| 502 / 504 | TCGdex fora do ar ou lenta, sem cópia guardada |
| 503 | `GET /health/ready` sem banco |

## Para testar

- Swagger: `http://localhost:3000/docs`. Faça login, clique em Authorize e cole o token.
- Usuários do seed: `admin@pokebox.dev` (ADMIN), `ash`, `misty`, `brock`, `gary`, `erika`, `dawn` e `cynthia` (`@pokebox.dev`); `lance@pokebox.dev` está desativado. Senhas no `.env` (`SEED_ADMIN_PASSWORD` para o admin, `SEED_DEMO_PASSWORD` para os demais).
- Testes automáticos: `cd backend && npm test` (unidade) e `make test-int` (integração, sobe um banco de teste). Mais em [`docs/testes.md`](../../docs/testes.md).
