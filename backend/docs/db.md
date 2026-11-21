# Banco de dados

PostgreSQL 17 + Prisma 7. Schema em `prisma/schema.prisma`, migrations em `prisma/migrations/`.

## Modelo

```
User ─┬─< CollectionItem >── Card ──< WishlistItem >── User
      │        │  │
      │        │  └─< OfferItem >── Offer
      │        │
      │        └─< Listing ──< Offer >── User (proposer)
      │              │           │
      └─< Trade (proposer / recipient) ── 0..1 Offer
              ├─< TradeItem >── Card, CollectionItem?, User (from / to)
              └─< TradeListingHold >── Listing
```

| Tabela | Papel | Regras ligadas |
|---|---|---|
| `User` | conta: `username` e `email` únicos, `passwordHash` (bcrypt), dados de contato e endereço opcionais, `role` (`USER`/`ADMIN`), `accountStatus` (`PENDING_VERIFICATION`/`ACTIVE`/`INACTIVE`/`SUSPENDED`), `deletedAt` para soft delete | auth |
| `Card` | catálogo local: snapshot da carta da TCGdex com os campos usados em filtros e listagens (nome, set, série, lançamento, número, raridade, imagem, categoria, tipos, HP, estágio, ilustrador, nº da Pokédex, regulation mark, tipo de treinador/energia) e o preço de referência (`marketPrice`, `marketPriceCurrency`, `marketPriceSource`, `marketPriceUpdatedAt`). Ataques e habilidades ficam só no `CardCache`. `id` = id da TCGdex | RN-01, RN-09 |
| `CardCache` | JSON completo do detalhe da carta vindo da TCGdex, por `(cardId, lang)`. Preenchido pelo `catalog:sync` para todas as cartas de `en` e `pt` (#192) e, nos outros idiomas, na primeira vez que a carta é aberta. Sempre usado quando existe; com mais de 24 h, é atualizado por trás. Não é referenciado por FK | RN-09 |
| `CatalogCard` | resumo de **todas** as cartas da TCGdex, só para a busca (#78): `id` e `lang` (chave composta), `name`, `nameNormalized` (minúsculas e sem acento), `localId`, `setId`, `setName`, `imageUrl` (imagem pequena, `.../low.webp`), `types` (lista), `rarity`, `category` (#158) e `syncedAt`. Preenchida pelo `npm run catalog:sync`, não pela API (o seed grava um mini catálogo `en` e `pt` com as cartas dele, #92). Sem FK: não se mistura com `Card`, que guarda só as cartas que alguém tem ou quer | busca |
| `CatalogSet` | sets de cada idioma na ordem de lançamento da TCGdex (#158): `id` e `lang` (chave composta), `name`, `position`. Preenchida pelo sync; alimenta a lista de expansões do painel de filtros e o reconhecimento de set na busca | busca |
| `CatalogFilterValue` | valores aceitos nos filtros de cada idioma (#158): `lang`, `kind` (`type`, `rarity` ou `category`) e `value`, os três na chave. Preenchida pelo sync, por último: enquanto estiver vazia para um idioma, a busca com filtro de tipo, raridade ou categoria continua indo à TCGdex | busca |
| `CollectionItem` | posse: quanto de cada carta, em qual condição e variante, o usuário tem | RN-01, RN-02, RN-03, RN-08, RN-10 |
| `WishlistItem` | desejo: carta que o usuário quer | RN-04, RN-11, RN-12 |
| `Listing` | anúncio de troca de um item da coleção. `status`: `ACTIVE`, `PAUSED`, `IN_TRADE` (Em troca: todas as unidades estão numa troca em andamento, #213), `CLOSED`, `BLOCKED` | RN-05 |
| `Offer` | proposta em um anúncio (`PROPOSED → ACCEPTED/REJECTED/CANCELED`): quantas cartas do anúncio o proponente quer. `cancelReason` (#213) diz por que foi cancelada: `PROPOSER`, `LISTING_CLOSED`, `LISTING_BLOCKED`, `LISTING_TRADED`, `ACCOUNT_DEACTIVATED` (nulo nas outras e nos cancelamentos antigos) | RN-06 |
| `OfferItem` | o que o proponente oferece em troca: item da coleção dele, a quantidade e uma cópia da carta (`cardId`, `condition`, `finish`, `firstEdition`), que fica no histórico mesmo depois que a oferta encerra ou o item sai da coleção (`collectionItemId` vira `null`, #217) | RN-06 |
| `Trade` | negociação entre dois usuários; nasce quando o dono aceita a oferta (#213). `proposerConfirmedAt` e `recipientConfirmedAt` guardam quando cada parte confirmou o recebimento | RN-07 |
| `TradeItem` | o que cada lado entrega na troca; `cardId` também alimenta o ranking de cartas mais trocadas | RN-07, RN-08, #92 |
| `TradeListingHold` | quanto cada troca tirou de cada anúncio (`tradeId`, `listingId`, `quantity`; único por troca + anúncio), para devolver o valor exato se a troca cair (#213). Fica guardado depois que a troca termina; "hold aberto" é o de troca `PROPOSED` | RN-05, RN-08 |

## Decisões

- **Catálogo × coleção (RN-01):** `CollectionItem.cardId` aponta para `Card`. Adicionar à coleção nunca duplica a carta: a linha de `Card` é criada uma vez (upsert com os dados da TCGdex) e reaproveitada.
- **Item de coleção único por `(userId, cardId, condition, finish, firstEdition)`:** a mesma carta em condição ou variante diferente é outro item; igual em tudo, soma em `quantity`.
- **Variante:** `finish` (`NORMAL`, `HOLO`, `REVERSE`) é o acabamento; `firstEdition` é o carimbo de 1ª edição, que combina com qualquer acabamento (existe "holo 1ª edição"). As combinações válidas de cada carta vêm de `variants` da TCGdex e são validadas no service. A wishlist não tem variante: quem deseja uma carta aceita qualquer versão.
- **Idioma da coleção:** fora do escopo. Todas as cartas da coleção são da edição em inglês.
- **Catálogo local da busca (#78):** a `CatalogCard` é separada da `Card`. A `Card` tem o detalhe completo de poucas cartas (as que alguém usa); a `CatalogCard` tem o resumo das ~24 mil cartas em inglês e ~14 mil em português, só com o que a lista da busca mostra. A lista de cartas do set da TCGdex não traz tipo, raridade nem categoria; desde a #158, o sync preenche esses campos pelas listas filtradas da TCGdex (`/en/cards?types=eq:Fire`, uma chamada por valor de filtro, cerca de 60 por idioma) e grava os valores em `CatalogFilterValue` só no fim. Assim, a busca com filtro só passa a usar o banco quando todos os campos já foram gravados. A chave é `(id, lang)` e não só `id`, para um segundo idioma não sobrescrever o primeiro (hoje `en` e `pt` são sincronizados, #157).
- **`nameNormalized` em vez de `unaccent` no índice:** o índice não aceita `unaccent(name)`, porque a função não é `IMMUTABLE` (o Postgres responde `functions in index expression must be marked IMMUTABLE`). O sync grava `lower(unaccent(name))` na coluna `nameNormalized`, e o índice GIN de trigramas fica nela. Na busca, a palavra digitada passa pelo mesmo `lower(unaccent(...))`.
- **Reserva (RN-08):** `reservedQuantity` guarda quanto do item está comprometido numa troca aberta (`PROPOSED`). Disponível = `quantity - reservedQuantity`. Sobe quando a troca nasce (o dono aceita a oferta), nos itens dos dois lados; desce quando a troca é recusada ou cancelada; na conclusão (segunda confirmação), desce junto com `quantity`. Anúncio e oferta não reservam.
- **Invariantes da coleção (#213):** valem o tempo todo e são conferidos nos testes de integração (`tradeConservation.int.test.ts`, `tradeRollback.int.test.ts`) e pela consulta de conferência mais abaixo: (1) `reservedQuantity` de cada item = soma das quantidades dos `TradeItem` de trocas `PROPOSED` que usam o item; (2) soma de `quantity` dos anúncios `ACTIVE`, `PAUSED` e `IN_TRADE` do item + `reservedQuantity` ≤ `quantity`.
- **Coleção limpa a wishlist (RN-11):** quando uma carta entra em `CollectionItem` (por `POST /collection`, recebida no aceite de uma troca ou quando um item zerado volta a ter quantidade no `PATCH /collection/:id`), o `WishlistItem` daquele usuário com o mesmo `cardId` é apagado na mesma transação. Como a wishlist não tem variante, qualquer condição, acabamento ou 1ª edição conta.
- **Wishlist só do que falta (RN-12):** `POST /wishlist` recusa (409) a carta que a pessoa já tem: soma de `CollectionItem.quantity` com o mesmo `userId` e `cardId` maior que 0, em qualquer variante. Item zerado não conta; item privado conta. É uma regra do service, não uma constraint do banco.
- **Privacidade (RN-10):** `CollectionItem.isPublic`, padrão `true`.
- **Só trocas (D-08):** o PokeBox não tem venda, preço nem pagamento. Todo anúncio é de troca (não há tipo de anúncio) e a oferta diz o que o proponente dá em troca por meio de `OfferItem`. Quando a troca nasce (aceite da oferta), os `OfferItem` são copiados para `TradeItem` junto com o item do anúncio e continuam na oferta. O `marketPrice` do detalhe da carta vem da TCGdex e é só informativo.
- **Preço de referência (#53):** `Card.marketPrice` (`Decimal(10,2)`) é o preço da TCGdex (TCGplayer em USD ou, sem ele, Cardmarket em EUR), guardado só para exibir nas listas (coleção, perfil, wishlist) e ajudar a comparar o que se dá e o que se recebe numa troca. Não é preço de venda. É gravado quando a carta entra em `Card` e atualizado sempre que a TCGdex é consultada de novo (cache de 24h vencido). `marketPriceUpdatedAt` é a data do preço na fonte (`updated` da TCGdex), não a data em que a carta entrou na coleção. O preço é de uma variante só (holo, depois normal, depois reverse, no TCGplayer): é referência da carta, não do item específico. Rodar o seed de novo volta o preço das cartas do seed para o valor de `cards.json`. Carta sem preço na TCGdex fica com as quatro colunas nulas. Na resposta da API sai como número.
- **`TradeItem` guarda cópia de `cardId`, `condition`, `finish`, `firstEdition`, `fromUserId` e `toUserId`:** o histórico da troca continua legível mesmo se o item de coleção for removido depois (`collectionItemId` vira `NULL`).
- **Exclusão:** usuário, carta e item de coleção com dependentes não podem ser apagados (FK `RESTRICT`); usuário é desativado por soft delete. Item de coleção oferecido numa proposta aberta também não pode ser apagado (409). Itens de troca são apagados junto com a troca e itens oferecidos junto com a oferta (`CASCADE`); apagar o item da coleção deixa `collectionItemId` `null` no `TradeItem` e no `OfferItem` (`SET NULL`), e a cópia da carta continua.

## Constraints no banco

Além de PK, FK, `NOT NULL` e `UNIQUE`, existem estas CHECK constraints:

| Constraint | Garante |
|---|---|
| `user_username_format_check` | `username` com 3 a 20 caracteres, só `a-z`, `0-9` e `_` |
| `user_email_format_check` | `email` no formato `algo@dominio.ext` |
| `user_name_not_blank_check` | `name` com pelo menos 2 caracteres sem contar espaços |
| `collection_item_quantity_check` | `quantity >= 0` (RN-03) |
| `collection_item_reserved_quantity_check` | `0 <= reservedQuantity <= quantity` (RN-08) |
| `listing_quantity_check` | `quantity >= 0`, e `ACTIVE` só com `quantity > 0`. `IN_TRADE` fica com 0; `PAUSED` e `CLOSED` podem ficar com 0 depois de uma troca (#213) |
| `offer_quantity_check` | oferta com `quantity > 0` |
| `offer_item_quantity_check` | item oferecido com `quantity > 0` |
| `offer_responded_at_check` | `PROPOSED` ⇔ `respondedAt` nulo: oferta finalizada não volta para `PROPOSED` sem apagar a data da resposta (RN-06) |
| `trade_distinct_parties_check` | ninguém troca consigo mesmo |
| `trade_completed_at_check` | `ACCEPTED` ⇔ `completedAt` preenchido |
| `trade_accepted_confirmed_check` | troca `ACCEPTED` tem `proposerConfirmedAt` e `recipientConfirmedAt` (#213) |
| `trade_listing_hold_quantity_check` | hold com `quantity > 0` (#213) |
| `offer_cancel_reason_check` | `cancelReason` só em oferta `CANCELED` (#213) |
| `trade_item_quantity_check` | item de troca com `quantity > 0` |
| `trade_item_distinct_parties_check` | `fromUserId <> toUserId` |
| `card_name_not_blank_check` | carta com nome |
| `card_market_price_check` | preço de referência nulo ou `>= 0` |
| `catalog_filter_value_kind_check` | `kind` em `type`, `rarity` ou `category` (#158) |

Regras que dependem de outra tabela ficam no service: anúncio não pode passar do disponível no item (RN-05), o item oferecido é do proponente, cabe no disponível e a oferta tem pelo menos um item, proponente ≠ dono do anúncio, só o destinatário responde a oferta (RN-06), uma oferta `PROPOSED` por proponente em cada anúncio, a troca é revalidada e gravada em `$transaction` (RN-07/RN-08), uma troca por oferta (`offerId` único), os dois invariantes da coleção.

Efeitos colaterais feitos pelo service, na mesma transação da mudança:

- **Oferta recusada ou cancelada** mantém os `OfferItem` (histórico do que foi oferecido, #217). A carta não fica presa: só oferta aberta impede apagar o item da coleção, e a FK é `SET NULL`.
- **Anúncio fechado (`CLOSED`) ou bloqueado (`BLOCKED`)** cancela as ofertas `PROPOSED` dele (`CANCELED`, `respondedAt` = agora, `cancelReason` `LISTING_CLOSED` ou `LISTING_BLOCKED`), mantendo os `OfferItem`. Pausar ou diminuir não mexe nas ofertas (as que não cabem ficam em espera); desbloquear não as reabre.
- **Oferta não reserva:** criar oferta não muda `reservedQuantity`. A reserva nasce com a troca, no aceite.
- **Oferta em espera (#213):** oferta `PROPOSED` em anúncio `IN_TRADE`, ou que pede mais do que o anúncio tem agora (`offer.quantity > listing.quantity`), está em espera (`onHold` na resposta; não é coluna). Aceitar dá 422; quem ofertou pode cancelar e o dono pode recusar. Volta a valer sozinha quando a troca do anúncio cai (a quantidade volta) ou o dono aumenta o anúncio. É cancelada quando o anúncio fecha de verdade.
- **Apagar item de coleção** que está numa oferta `PROPOSED` → 409 com mensagem própria; com reserva (troca aberta) → 409.
- **Aceite da oferta = troca criada (`PATCH /offers/:id/status` com `ACCEPTED`, #213)**, numa transação: trava em ordem de id o item do anúncio e os oferecidos, depois a oferta; confere o anúncio (`ACTIVE`; `IN_TRADE` dá 422 com a mensagem de oferta em espera) e se a oferta ainda dá para cumprir (anúncio com a quantidade pedida, cartas oferecidas disponíveis), senão 422 e nada muda. Grava a oferta `ACCEPTED` e cria `Trade` (`PROPOSED`) e os `TradeItem` (um do anúncio, de dono para proponente, e um por `OfferItem`, de proponente para dono); `reservedQuantity += quantidade` em cada item de origem; o anúncio perde só a quantidade da oferta (em 0, vira `IN_TRADE`); anúncios abertos de quem ofertou que ficariam acima do disponível são reduzidos, dos mais novos para os mais antigos (em 0, `ACTIVE` vira `IN_TRADE` e `PAUSED` continua `PAUSED`); grava um `TradeListingHold` para cada anúncio que perdeu quantidade, com o quanto perdeu; os `OfferItem` ficam (oferta aceita de antes da #217, que ficou sem eles, mostra as cartas de quem ofertou a partir dos `TradeItem` da troca). As outras ofertas do anúncio **não** são canceladas: as que não cabem ficam em espera. O miolo é o `TradeOpener`, o mesmo do `POST /trades` (que hoje só cria troca para oferta `ACCEPTED` sem troca, dado antigo; com troca → 409, não aceita → 422).
- **Oferta aceita não muda mais** (409). Para desistir, recusa-se ou cancela-se a troca.
- **Confirmação (`POST /trades/:id/accept`, RN-07)**: vale para as duas partes. Trava em ordem de id os itens de origem e os de destino que já existem (buscados pela chave antes da transação), depois a troca. A primeira confirmação só grava a data de quem chamou. A segunda conclui: confere de novo cada item (existe, é de `fromUserId`, `quantity` e `reservedQuantity` ≥ quantidade), baixa `quantity` e `reservedQuantity` de quem entrega e soma em quem recebe pela chave única `(userId, cardId, condition, finish, firstEdition)`; se não houver item, cria um público. `status = ACCEPTED`, `completedAt` e a segunda confirmação = agora. Cada anúncio da troca que está `IN_TRADE`, ou `PAUSED` com quantidade 0, vira `CLOSED` se não houver outro hold aberto nele (e as ofertas `PROPOSED` dele viram `CANCELED` com `LISTING_TRADED`); com outro hold aberto, continua como está. Qualquer erro desfaz tudo. Quem entrega fica com o item, mesmo em 0. Confirmar de novo ou confirmar troca finalizada → 409.
- **Troca recusada ou cancelada** (também depois de uma confirmação): devolve a reserva; `completedAt` fica nulo; cada `TradeListingHold` da troca devolve a quantidade ao anúncio se ele ainda está `ACTIVE`, `PAUSED` ou `IN_TRADE` (`IN_TRADE` volta a `ACTIVE`; `PAUSED` continua `PAUSED`). Anúncio fechado ou bloqueado no meio-tempo não reabre: a carta só fica livre na coleção. As coleções ficam exatamente como antes da troca.
- **Anúncio `IN_TRADE`**: público como o `ACTIVE`, entra no fim do marketplace e não recebe oferta (422). O dono pausa ou fecha (fechar cancela as ofertas em espera com `LISTING_CLOSED`), mas não muda a quantidade nem reativa (409); o ADMIN bloqueia (`LISTING_BLOCKED`). Ninguém põe `IN_TRADE` à mão.
- **Conta desativada (`DELETE /user/me`, #213)**: com troca `PROPOSED` como qualquer parte → 409. Sem troca aberta, na mesma transação: ofertas `PROPOSED` feitas e recebidas viram `CANCELED` (`ACCOUNT_DEACTIVATED`), anúncios `ACTIVE`/`PAUSED`/`IN_TRADE` viram `CLOSED` e a conta fica `INACTIVE`.
- **Trocas antigas (antes da #213):** trocas `PROPOSED` criadas pelo `POST /trades` antigo não têm `TradeListingHold`. Se caírem, só a reserva volta (os anúncios delas já estavam `CLOSED`). As `ACCEPTED` antigas ganharam as duas confirmações com a data de conclusão na migration.
- **Condição congelada durante a negociação**: `PATCH /collection/:id` recusa mudar `condition` (409) se o item tem reserva, `OfferItem` em oferta `PROPOSED` (ou `ACCEPTED` sem troca, dado antigo) ou anúncio aberto (`ACTIVE`/`PAUSED`/`IN_TRADE`). O anúncio mostra a condição atual do item e a oferta a cópia gravada; sem isso, a cópia feita no `TradeItem` podia ser diferente do que foi anunciado ou oferecido. A conferência roda com o item travado, a mesma trava de criar anúncio e oferta.

## Índices

Além dos índices que o Postgres cria para PK e `UNIQUE`:

| Índice | Serve para |
|---|---|
| `Card` por `name`, `setId` e `category` | busca e filtros do catálogo local |
| `CollectionItem` e `WishlistItem` por `cardId` | achar quem tem ou quer uma carta (oportunidades da wishlist, detalhe da carta). A busca por dono usa a chave única, que começa por `userId` |
| `Listing` por `collectionItemId` | anúncios abertos de um item (RN-05, `GET /listings/me`) |
| `Listing` por `(status, createdAt DESC, id)` (#112) | `GET /listings`: o banco lê os anúncios ativos já na ordem de "mais recentes" e para no fim da página, em vez de ordenar todos. Também atende filtro só por `status` (o grupo `IN_TRADE` do fim da lista usa o mesmo índice) |
| `TradeListingHold` por `listingId` (#213) | conferir se ainda há troca aberta com hold no anúncio antes de fechá-lo |
| `CatalogCard` por `setId` | cartas de um set reconhecido na busca (`charizard base`) |
| `CatalogCard` por `(lang, rarity)` e `(lang, category)`, e GIN em `types` (#158) | busca e lista com filtro de raridade, categoria e tipo (`types @> ARRAY['Fire']`, o operador que o GIN atende) |
| `TradeItem` por `cardId` (#92) | agrega rapidamente as unidades de cada carta nas trocas concluídas |
| `CatalogSet` por `(lang, position)` | lista de sets na ordem de lançamento |
| `CatalogCard_nameNormalized_trgm_idx`: GIN com `gin_trgm_ops` em `nameNormalized` (#78) | busca tolerante a erro de digitação. Atende os operadores `<<%` (semelhança por palavra) e `LIKE '%texto%'` do `pg_trgm` |

O índice de `Listing` por `(status, createdAt DESC, id)` substituiu o que era só por `status`, que ficou redundante. Medido com o `EXPLAIN ANALYZE` num banco com 100 mil anúncios (20 mil ativos): a primeira página caiu de 6,3 ms para 0,3 ms. Detalhes e números no README, em "Performance".

### Índice de trigramas da busca (#78)

Medido com `EXPLAIN ANALYZE` no banco local com o catálogo inteiro (23.912 cartas), com as consultas que a API manda (parâmetros como no `PrismaCatalogSearchStore`). "Sem índice" é a mesma consulta com `SET enable_bitmapscan = off; SET enable_indexscan = off`:

| Consulta | Com índice | Sem índice (leitura da tabela toda) |
|---|---|---|
| `charzard`, primeira página | 1,5 ms | 33,4 ms |
| `pikachu`, segunda página | 2,0 ms | 26,7 ms |
| a palavra `pipi` existe em algum nome? (decide o `search.ignored`) | 0,1 ms | 22,7 ms |

O plano com índice é `Bitmap Index Scan on "CatalogCard_nameNormalized_trgm_idx"` (um para o `<<%` e outro para o `LIKE`, juntos num `BitmapOr`).

O `npm run catalog:sync` (`backend/scripts/sync-catalog.ts`) preenche a tabela: para cada idioma (`en` e `pt`, ou só os passados como argumento, entre esses dois: `npm run catalog:sync -- pt`), busca a lista de sets da TCGdex (`GET /{lang}/sets`), depois as cartas de cada set (`GET /{lang}/sets/{id}`), com 200 ms de pausa entre os sets, e grava em lotes de 500 com `INSERT ... ON CONFLICT (id, lang) DO UPDATE`. Rodar de novo atualiza as linhas, não duplica. Não apaga cartas que sumirem da TCGdex. Se algum set falhar (a TCGdex responde 502 e 503 em rajadas), os outros seguem; no fim do idioma o script tenta de novo os que falharam, em até três voltas (depois de 5, 15 e 30 s), e faz o mesmo com a lista de sets. Um idioma que falhe não impede o outro. O que ainda falhar é listado e o script termina com erro; basta rodar de novo.

## Migrations

| Migration | O que faz |
|---|---|
| `20261005042720_create_users` | cria `User` e os enums `AccountStatus` e `UserRole` |
| `20261006034308_add_username` | adiciona `username` único |
| `20261007143027_add_user_check_constraints` | CHECKs de `username`, `email` e `name` |
| `20261012150826_add_card_cache` | cria `CardCache` |
| `20261026190304_add_domain_tables` | cria `Card`, `CollectionItem`, `WishlistItem`, `Listing`, `Offer`, `Trade`, `TradeItem` e seus enums |
| `20261026190318_add_domain_check_constraints` | CHECKs das tabelas do domínio |
| `20261029120000_add_card_details_and_variants` | colunas novas em `Card`, enum `CardFinish`, `finish`/`firstEdition` em `CollectionItem` (na chave única) e `TradeItem`; limpa o `CardCache` para ele se refazer com os campos novos |
| `20261105220000_trade_only` | só trocas (D-08): remove `priceCents` de `Listing` e `Offer`, `Listing.type` e o enum `ListingType` e as CHECKs de preço; cria `OfferItem` com a CHECK `offer_item_quantity_check` |
| `20261106025357_add_card_market_price` | preço de referência em `Card` (`marketPrice`, `marketPriceCurrency`, `marketPriceSource`, `marketPriceUpdatedAt`) e a CHECK `card_market_price_check` |
| `20261115113657_indice_anuncios_recentes` | troca o índice de `Listing` por `status` pelo índice `(status, createdAt DESC, id)` (#112) |
| `20261116212649_catalog_card` | cria `CatalogCard` com o índice por `setId` (#78) |
| `20261116212650_catalog_card_search` | escrita à mão: cria as extensões `pg_trgm` e `unaccent` e o índice GIN de trigramas em `CatalogCard.nameNormalized` (#78). O índice também está no `schema.prisma` (`type: Gin`), para o Prisma não achar diferença entre o schema e o banco |
| `20261118001906_catalog_filtros` | `types`, `rarity` e `category` em `CatalogCard` com seus índices; cria `CatalogSet` e `CatalogFilterValue`; a CHECK `catalog_filter_value_kind_check` foi acrescentada à mão (#158) |
| `20261119120000_trade_item_card_ranking` | índice de `TradeItem.cardId` usado pelo ranking de cartas mais trocadas (#92) |
| `20261120194650_troca_redonda` | troca redonda (#213): `IN_TRADE` em `ListingStatus`, enum `OfferCancelReason` e `Offer.cancelReason`, `Trade.proposerConfirmedAt` e `recipientConfirmedAt`, tabela `TradeListingHold`. Escrito à mão no fim: as trocas `ACCEPTED` que já existem recebem as duas confirmações com a data de conclusão; `listing_quantity_check` passa a aceitar 0 fora de `ACTIVE`; CHECKs `trade_accepted_confirmed_check`, `trade_listing_hold_quantity_check` e `offer_cancel_reason_check` |
| `20261121015726_oferta_guarda_cartas` | oferta guarda as cartas (#217): `OfferItem` ganha `cardId`, `condition`, `finish` e `firstEdition` (preenchidos à mão a partir do item da coleção), `collectionItemId` opcional com FK `SET NULL` e FK para `Card` |

Nova tabela ou coluna: altere o `schema.prisma`, rode `npx prisma migrate dev --name <descricao>` e atualize este arquivo no mesmo PR.

## Seed

```bash
cd backend
npm run db:seed
```

No Compose local, o backend roda o seed sozinho só quando o banco está vazio (nenhum `User`), depois das migrations (`npm run db:seed-if-empty` no `docker-compose.yml`, lógica em `src/lib/seedIfEmpty.ts`). Com o banco populado, a subida pula o seed e não mexe nos dados; para rodar de novo, `make seed` ou `npm run db:seed`. Em produção (Render e `make prod-up`) o seed nunca roda sozinho. Idempotente: pode rodar várias vezes. Depois da migration `add_card_details_and_variants`, recrie o banco local (apague o volume, suba de novo e rode as migrations) antes do seed, porque a chave da coleção mudou.

Cria:

| Usuário | E-mail | Papel | Situação |
|---|---|---|---|
| `admin` | `admin@pokebox.dev` | ADMIN | ativo |
| `ash` | `ash@pokebox.dev` | USER | ativo |
| `misty` | `misty@pokebox.dev` | USER | ativo |
| `brock` | `brock@pokebox.dev` | USER | ativo |
| `gary` | `gary@pokebox.dev` | USER | ativo |
| `erika` | `erika@pokebox.dev` | USER | ativo |
| `dawn` | `dawn@pokebox.dev` | USER | ativo, coleção toda privada |
| `cynthia` | `cynthia@pokebox.dev` | USER | ativo |
| `lance` | `lance@pokebox.dev` | USER | `INACTIVE` com `deletedAt` (conta desativada) |

Senhas pelo `.env`: `SEED_ADMIN_PASSWORD` para o `admin` e `SEED_DEMO_PASSWORD` para os demais (obrigatórias, 8 a 72 caracteres, diferentes entre si; rodar o seed de novo aplica os valores atuais). Rodar de novo também volta nome, cidade, estado e situação da conta de cada usuário para os valores do seed.

| Tabela | O que o seed cria |
|---|---|
| `Card` | 87 cartas reais de 22 coleções (Base Set a Surging Sparks): 65 Pokémon, 12 Treinador, 10 Energia, todas com imagem |
| `CollectionItem` | 111 itens (20 privados), de 10 a 22 por usuário, com quantidade maior que 1 e variantes holo, reverse e 1ª edição; as trocas concluídas criam mais 10 (121 no total) |
| `WishlistItem` | 44 itens, de 1 a 7 por usuário, nenhum de carta que a pessoa já tem (RN-12); vários cruzam com cartas e anúncios de outros usuários, e alguns só têm dono desativado (0 oportunidades). Alguns repetem a mesma carta para o ranking de mais desejadas (#92): Umbreon VMAX `swsh7-215` em 7 wishlists de contas ativas, Charizard `base1-4` em 6, Charizard ex `sv03.5-199` em 5 e Blastoise `base1-2` em 4. As 3 do `lance` (desativado) não contam |
| `Listing` | 30 anúncios com `createdAt` espalhado em 45 dias: 19 `ACTIVE` (18 na vitrine, o do `lance` some), 2 `IN_TRADE` (Venusaur da erika e Double Turbo da cynthia, no fim da vitrine), 2 `PAUSED`, 1 `BLOCKED`, 6 `CLOSED` (2 fechados pelo dono e 4 pelas trocas concluídas, com quantidade 0) |
| `Offer` | 16 ofertas: 6 `PROPOSED` (1 em espera: a do gary no Venusaur da erika, que está em troca), 6 `ACCEPTED` (todas viraram troca), 2 `REJECTED`, 2 `CANCELED`. Nenhuma oferta aceita sem troca |
| `Trade` | 6 trocas, todas criadas pelo fluxo novo (aceitar a oferta e as confirmações): 4 `ACCEPTED` com as duas confirmações (erika ↔ brock, gary ↔ cynthia, misty ↔ brock e gary ↔ ash, que alimentam o ranking de mais trocadas, #92) e 2 `PROPOSED`: brock ↔ erika (Dialga pelo Venusaur, já confirmada pela erika, esperando o brock) e brock ↔ cynthia (2 Rare Candy pelas 2 Double Turbo, sem confirmação) |
| `TradeListingHold` | 6, um por troca (o anúncio de cada troca perdeu a quantidade da oferta) |
| `CatalogCard`, `CatalogSet`, `CatalogFilterValue` | mini catálogo da busca nos dois idiomas, para a home e os rankings (#92) funcionarem sem `npm run catalog:sync`. Em `en`: as 87 cartas, os 22 sets em ordem de lançamento e os valores de filtro delas (11 tipos, 16 raridades, 3 categorias). Em `pt`: as 62 cartas que existem em português na TCGdex (as 25 de Base Set a Diamond & Pearl só existem em inglês), os 16 sets delas com nome em português e a posição da lista de sets da TCGdex em `pt` (a mesma do sync), e os valores de filtro delas (10 tipos, 15 raridades, 3 categorias, como "Fogo" e "Treinador"). Não roda com `NODE_ENV=test` (a integração monta o catálogo dela). O `npm run catalog:sync` completa o catálogo; rodar o seed de novo depois dele regrava só essas cartas com os dados do `cards.json` e do `catalog-pt.json` |

Como fica idempotente:

- usuários, cartas, cartas do mini catálogo, itens de coleção e wishlist usam `upsert` pelas chaves únicas; sets e valores de filtro do catálogo usam `createMany` com `skipDuplicates`. Item de coleção que já existe não muda, para não desfazer o que as trocas já moveram;
- anúncios são procurados pelo item da coleção (`findFirst`); se já existe, fica como está;
- ofertas são procuradas pelo par anúncio + quem ofertou. As que o seed deixa em aberto voltam para `PROPOSED` a cada execução se alguém as encerrou, como a da misty pelo Charizard do ash, que o `make test` usa; o anúncio volta para `ACTIVE` só se não estiver em troca e a carta ainda couber (senão o seed avisa e não mexe). Se uma delas já virou troca, o seed avisa e não mexe: para voltar ao estado inicial, `npx prisma migrate reset` (apaga o banco local). Ofertas recusadas ou canceladas não são refeitas;
- as trocas do seed são criadas como na API: oferta, aceite do dono (a troca nasce) e as confirmações. Rodar de novo só completa a confirmação que faltar; troca concluída, recusada ou cancelada não é refeita. Oferta aceita sem troca (dado antigo) não vira troca: o seed avisa (em produção ela é apagada antes, ver "Produção" abaixo);
- item que saiu do seed é apagado: hoje só a Fire Energy `sve-002` da `misty` (o set `sve` não tem imagem; ela passou a ter a `base1-98`). Vale para bancos populados pelo seed antigo, como o de produção. Se o item estiver num anúncio, numa oferta ou reservado, o seed avisa e mantém;
- anúncios, ofertas e trocas são criados pelos services da API (`ListingService`, `OfferService`, `TradeService`), com as mesmas regras e transações (RN-05 a RN-08). Só duas coisas vão direto no banco: a data de criação dos anúncios (a API não deixa escolher) e a volta das ofertas em aberto para `PROPOSED` (a API não deixa uma oferta finalizada voltar).

Antes de gravar, o seed confere os próprios dados: toda carta existe no `cards.json` (inclusive as do catálogo em português), toda variante existe na carta e nenhuma wishlist pede carta que a pessoa já tem.

### Cartas do seed

Os dados das cartas são reais e ficam versionados em `prisma/seed-data/cards.json`, para o seed funcionar sem internet. O arquivo é gerado por `scripts/seed-cards.ts`, que busca na TCGdex a lista fixa `CARD_IDS` e recusa carta sem imagem ou com id fora do padrão `^[a-zA-Z0-9.\-]+$` (se recusar alguma, não grava nada e diz qual trocar). Para trocar a lista ou atualizar os dados (inclusive o preço de referência), edite `CARD_IDS` e rode:

```bash
npm run db:seed-cards
```

O mini catálogo em português fica em `prisma/seed-data/catalog-pt.json` (`sets` com `id`, `name` e `position`; `cards` com `id`, `localId`, `name`, `setId`, `setName`, `imageUrl`, `types`, `rarity` e `category`). Ele foi gerado uma vez a partir da TCGdex em `pt` (`/pt/cards/<id>`; 404 quer dizer que a carta não existe em português e fica de fora), com a mesma regra do `catalog:sync`: nome e número da lista de cartas do set, nome do set e posição da lista de sets, imagem pequena (`.../low.webp`) e tipo, raridade e categoria nos valores da TCGdex em português. Ao trocar as cartas do `cards.json`, esse arquivo precisa ser refeito do mesmo jeito; o seed recusa carta do catálogo em português que não esteja no `cards.json`.

## Produção: troca redonda (#213)

Roteiro para o Patrick rodar à mão no banco de produção (Neon), **depois** da release que traz a migration `troca_redonda`. Nada disso roda sozinho.

### 1. Apagar as ofertas aceitas que não viraram troca

No fluxo antigo, a oferta aceita esperava quem ofertou criar a troca. No fluxo novo, oferta aceita sempre tem troca. As que ficaram pelo caminho são apagadas (com os `OfferItem` delas). Confira antes quantas são:

```sql
SELECT count(*) FROM "Offer" o
WHERE o."status" = 'ACCEPTED'
  AND NOT EXISTS (SELECT 1 FROM "Trade" t WHERE t."offerId" = o."id");
```

Depois apague, numa transação:

```sql
BEGIN;

DELETE FROM "OfferItem" oi
USING "Offer" o
WHERE oi."offerId" = o."id"
  AND o."status" = 'ACCEPTED'
  AND NOT EXISTS (SELECT 1 FROM "Trade" t WHERE t."offerId" = o."id");

DELETE FROM "Offer" o
WHERE o."status" = 'ACCEPTED'
  AND NOT EXISTS (SELECT 1 FROM "Trade" t WHERE t."offerId" = o."id");

COMMIT;
```

### 2. Rodar o seed novo

`npm run db:seed` com o `DATABASE_URL` de produção. Ele cria a troca da erika com uma confirmação, a oferta em espera e o anúncio Em troca, e não refaz o que já existe.

### 3. Conferir os invariantes da coleção

Esta consulta tem que voltar **zero linhas**. Cada linha é um item de coleção com problema:

```sql
SELECT 'reserva diferente das trocas abertas' AS problema,
       ci."id", ci."userId", ci."cardId",
       ci."reservedQuantity" AS valor,
       COALESCE(t.reservado, 0) AS esperado
FROM "CollectionItem" ci
LEFT JOIN (
  SELECT ti."collectionItemId", SUM(ti."quantity")::int AS reservado
  FROM "TradeItem" ti
  JOIN "Trade" tr ON tr."id" = ti."tradeId"
  WHERE tr."status" = 'PROPOSED' AND ti."collectionItemId" IS NOT NULL
  GROUP BY ti."collectionItemId"
) t ON t."collectionItemId" = ci."id"
WHERE ci."reservedQuantity" <> COALESCE(t.reservado, 0)

UNION ALL

SELECT 'anunciado + reservado acima da quantidade',
       ci."id", ci."userId", ci."cardId",
       (COALESCE(l.anunciado, 0) + ci."reservedQuantity")::int,
       ci."quantity"
FROM "CollectionItem" ci
LEFT JOIN (
  SELECT "collectionItemId", SUM("quantity")::int AS anunciado
  FROM "Listing"
  WHERE "status" IN ('ACTIVE', 'PAUSED', 'IN_TRADE')
  GROUP BY "collectionItemId"
) l ON l."collectionItemId" = ci."id"
WHERE COALESCE(l.anunciado, 0) + ci."reservedQuantity" > ci."quantity";
```

Também vale conferir que não sobrou oferta aceita sem troca (a consulta do passo 1 tem que dar 0).
