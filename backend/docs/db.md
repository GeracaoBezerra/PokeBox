# Banco de dados

PostgreSQL 17 + Prisma 7. Schema em `prisma/schema.prisma`, migrations em `prisma/migrations/`.

## Modelo

```
User ─┬─< CollectionItem >── Card ──< WishlistItem >── User
      │        │  │
      │        │  └─< OfferItem >── Offer
      │        │
      │        └─< Listing ──< Offer >── User (proposer)
      │                          │
      └─< Trade (proposer / recipient) ── 0..1 Offer
              └─< TradeItem >── Card, CollectionItem?, User (from / to)
```

| Tabela | Papel | Regras ligadas |
|---|---|---|
| `User` | conta: `username` e `email` únicos, `passwordHash` (bcrypt), dados de contato e endereço opcionais, `role` (`USER`/`ADMIN`), `accountStatus` (`PENDING_VERIFICATION`/`ACTIVE`/`INACTIVE`/`SUSPENDED`), `deletedAt` para soft delete | auth |
| `Card` | catálogo local: snapshot da carta da TCGdex com os campos usados em filtros e listagens (nome, set, série, lançamento, número, raridade, imagem, categoria, tipos, HP, estágio, ilustrador, nº da Pokédex, regulation mark, tipo de treinador/energia) e o preço de referência (`marketPrice`, `marketPriceCurrency`, `marketPriceSource`, `marketPriceUpdatedAt`). Ataques e habilidades ficam só no `CardCache`. `id` = id da TCGdex | RN-01, RN-09 |
| `CardCache` | JSON completo do detalhe da carta vindo da TCGdex, por `(cardId, lang)`. Preenchido pelo `catalog:sync` para todas as cartas de `en` e `pt` (#192) e, nos outros idiomas, na primeira vez que a carta é aberta. Sempre usado quando existe; com mais de 24 h, é atualizado por trás. Não é referenciado por FK | RN-09 |
| `CatalogCard` | resumo de **todas** as cartas da TCGdex, só para a busca (#78): `id` e `lang` (chave composta), `name`, `nameNormalized` (minúsculas e sem acento), `localId`, `setId`, `setName`, `imageUrl` (imagem pequena, `.../low.webp`), `types` (lista), `rarity`, `category` (#158) e `syncedAt`. Preenchida pelo `npm run catalog:sync`, não pela API. Sem FK: não se mistura com `Card`, que guarda só as cartas que alguém tem ou quer | busca |
| `CatalogSet` | sets de cada idioma na ordem de lançamento da TCGdex (#158): `id` e `lang` (chave composta), `name`, `position`. Preenchida pelo sync; alimenta a lista de expansões do painel de filtros e o reconhecimento de set na busca | busca |
| `CatalogFilterValue` | valores aceitos nos filtros de cada idioma (#158): `lang`, `kind` (`type`, `rarity` ou `category`) e `value`, os três na chave. Preenchida pelo sync, por último: enquanto estiver vazia para um idioma, a busca com filtro de tipo, raridade ou categoria continua indo à TCGdex | busca |
| `CollectionItem` | posse: quanto de cada carta, em qual condição e variante, o usuário tem | RN-01, RN-02, RN-03, RN-08, RN-10 |
| `WishlistItem` | desejo: carta que o usuário quer | RN-04, RN-11, RN-12 |
| `Listing` | anúncio de troca de um item da coleção | RN-05 |
| `Offer` | proposta em um anúncio (`PROPOSED → ACCEPTED/REJECTED/CANCELED`): quantas cartas do anúncio o proponente quer | RN-06 |
| `OfferItem` | o que o proponente oferece em troca: itens da coleção dele e a quantidade de cada um | RN-06 |
| `Trade` | negociação entre dois usuários; pode nascer de uma oferta | RN-07 |
| `TradeItem` | o que cada lado entrega na troca | RN-07, RN-08 |

## Decisões

- **Catálogo × coleção (RN-01):** `CollectionItem.cardId` aponta para `Card`. Adicionar à coleção nunca duplica a carta: a linha de `Card` é criada uma vez (upsert com os dados da TCGdex) e reaproveitada.
- **Item de coleção único por `(userId, cardId, condition, finish, firstEdition)`:** a mesma carta em condição ou variante diferente é outro item; igual em tudo, soma em `quantity`.
- **Variante:** `finish` (`NORMAL`, `HOLO`, `REVERSE`) é o acabamento; `firstEdition` é o carimbo de 1ª edição, que combina com qualquer acabamento (existe "holo 1ª edição"). As combinações válidas de cada carta vêm de `variants` da TCGdex e são validadas no service. A wishlist não tem variante: quem deseja uma carta aceita qualquer versão.
- **Idioma da coleção:** fora do escopo. Todas as cartas da coleção são da edição em inglês.
- **Catálogo local da busca (#78):** a `CatalogCard` é separada da `Card`. A `Card` tem o detalhe completo de poucas cartas (as que alguém usa); a `CatalogCard` tem o resumo das ~24 mil cartas em inglês e ~14 mil em português, só com o que a lista da busca mostra. A lista de cartas do set da TCGdex não traz tipo, raridade nem categoria; desde a #158, o sync preenche esses campos pelas listas filtradas da TCGdex (`/en/cards?types=eq:Fire`, uma chamada por valor de filtro, cerca de 60 por idioma) e grava os valores em `CatalogFilterValue` só no fim. Assim, a busca com filtro só passa a usar o banco quando todos os campos já foram gravados. A chave é `(id, lang)` e não só `id`, para um segundo idioma não sobrescrever o primeiro (hoje `en` e `pt` são sincronizados, #157).
- **`nameNormalized` em vez de `unaccent` no índice:** o índice não aceita `unaccent(name)`, porque a função não é `IMMUTABLE` (o Postgres responde `functions in index expression must be marked IMMUTABLE`). O sync grava `lower(unaccent(name))` na coluna `nameNormalized`, e o índice GIN de trigramas fica nela. Na busca, a palavra digitada passa pelo mesmo `lower(unaccent(...))`.
- **Reserva (RN-08):** `reservedQuantity` guarda quanto do item está comprometido numa troca aberta (`PROPOSED`). Disponível = `quantity - reservedQuantity`. Sobe quando a troca nasce (`POST /trades`), nos itens dos dois lados; desce quando a troca é recusada ou cancelada; no aceite, desce junto com `quantity`. Anúncio e oferta não reservam.
- **Coleção limpa a wishlist (RN-11):** quando uma carta entra em `CollectionItem` (por `POST /collection`, recebida no aceite de uma troca ou quando um item zerado volta a ter quantidade no `PATCH /collection/:id`), o `WishlistItem` daquele usuário com o mesmo `cardId` é apagado na mesma transação. Como a wishlist não tem variante, qualquer condição, acabamento ou 1ª edição conta.
- **Wishlist só do que falta (RN-12):** `POST /wishlist` recusa (409) a carta que a pessoa já tem: soma de `CollectionItem.quantity` com o mesmo `userId` e `cardId` maior que 0, em qualquer variante. Item zerado não conta; item privado conta. É uma regra do service, não uma constraint do banco.
- **Privacidade (RN-10):** `CollectionItem.isPublic`, padrão `true`.
- **Só trocas (D-08):** o PokeBox não tem venda, preço nem pagamento. Todo anúncio é de troca (não há tipo de anúncio) e a oferta diz o que o proponente dá em troca por meio de `OfferItem`. Quando quem ofertou cria a troca a partir da oferta aceita, os `OfferItem` viram `TradeItem` junto com o item do anúncio e são apagados. O `marketPrice` do detalhe da carta vem da TCGdex e é só informativo.
- **Preço de referência (#53):** `Card.marketPrice` (`Decimal(10,2)`) é o preço da TCGdex (TCGplayer em USD ou, sem ele, Cardmarket em EUR), guardado só para exibir nas listas (coleção, perfil, wishlist) e ajudar a comparar o que se dá e o que se recebe numa troca. Não é preço de venda. É gravado quando a carta entra em `Card` e atualizado sempre que a TCGdex é consultada de novo (cache de 24h vencido). `marketPriceUpdatedAt` é a data do preço na fonte (`updated` da TCGdex), não a data em que a carta entrou na coleção. O preço é de uma variante só (holo, depois normal, depois reverse, no TCGplayer): é referência da carta, não do item específico. Rodar o seed de novo volta o preço das cartas do seed para o valor de `cards.json`. Carta sem preço na TCGdex fica com as quatro colunas nulas. Na resposta da API sai como número.
- **`TradeItem` guarda cópia de `cardId`, `condition`, `finish`, `firstEdition`, `fromUserId` e `toUserId`:** o histórico da troca continua legível mesmo se o item de coleção for removido depois (`collectionItemId` vira `NULL`).
- **Exclusão:** usuário, carta e item de coleção com dependentes não podem ser apagados (FK `RESTRICT`); usuário é desativado por soft delete. Item de coleção oferecido numa proposta também não pode ser apagado. Itens de troca são apagados junto com a troca e itens oferecidos junto com a oferta (`CASCADE`).

## Constraints no banco

Além de PK, FK, `NOT NULL` e `UNIQUE`, existem estas CHECK constraints:

| Constraint | Garante |
|---|---|
| `user_username_format_check` | `username` com 3 a 20 caracteres, só `a-z`, `0-9` e `_` |
| `user_email_format_check` | `email` no formato `algo@dominio.ext` |
| `user_name_not_blank_check` | `name` com pelo menos 2 caracteres sem contar espaços |
| `collection_item_quantity_check` | `quantity >= 0` (RN-03) |
| `collection_item_reserved_quantity_check` | `0 <= reservedQuantity <= quantity` (RN-08) |
| `listing_quantity_check` | anúncio com `quantity > 0` |
| `offer_quantity_check` | oferta com `quantity > 0` |
| `offer_item_quantity_check` | item oferecido com `quantity > 0` |
| `offer_responded_at_check` | `PROPOSED` ⇔ `respondedAt` nulo: oferta finalizada não volta para `PROPOSED` sem apagar a data da resposta (RN-06) |
| `trade_distinct_parties_check` | ninguém troca consigo mesmo |
| `trade_completed_at_check` | `ACCEPTED` ⇔ `completedAt` preenchido |
| `trade_item_quantity_check` | item de troca com `quantity > 0` |
| `trade_item_distinct_parties_check` | `fromUserId <> toUserId` |
| `card_name_not_blank_check` | carta com nome |
| `card_market_price_check` | preço de referência nulo ou `>= 0` |
| `catalog_filter_value_kind_check` | `kind` em `type`, `rarity` ou `category` (#158) |

Regras que dependem de outra tabela ficam no service: anúncio não pode passar do disponível no item (RN-05), o item oferecido é do proponente, cabe no disponível e a oferta tem pelo menos um item, proponente ≠ dono do anúncio, só o destinatário responde a oferta (RN-06), uma oferta `PROPOSED` por proponente em cada anúncio, a troca é revalidada e gravada em `$transaction` (RN-07/RN-08), uma troca por oferta (`offerId` único).

Efeitos colaterais feitos pelo service, na mesma transação da mudança:

- **Oferta recusada ou cancelada** apaga os `OfferItem` dela. Sem isso, a FK `RESTRICT` deixaria a carta oferecida presa na coleção para sempre.
- **Anúncio fechado (`CLOSED`) ou bloqueado (`BLOCKED`)** cancela as ofertas `PROPOSED` dele (`CANCELED`, `respondedAt` = agora) e apaga os `OfferItem` delas. Pausar não mexe nas ofertas; desbloquear não as reabre.
- **Oferta não reserva:** criar ou aceitar oferta não muda `reservedQuantity`. A reserva fica para a troca (RN-07/RN-08). Por isso o aceite trava e confere de novo o item do anúncio e as cartas oferecidas: anúncio com menos unidades do que a oferta pede ou carta oferecida sem disponível → 422.
- **Apagar item de coleção** que está numa oferta `PROPOSED` ou `ACCEPTED` → 409 com mensagem própria (o `OfferItem` da oferta aceita fica até a troca existir).
- **Troca criada (`POST /trades`)**, numa transação: cria `Trade` (`PROPOSED`) e os `TradeItem` (um do anúncio, de dono para proponente, e um por `OfferItem`, de proponente para dono); `reservedQuantity += quantidade` em cada item de origem; o anúncio baixa a quantidade da oferta (se chegar a 0, vira `CLOSED`, mantém a quantidade antiga e cancela as ofertas abertas dele); anúncios abertos de quem ofertou que ficarem acima do disponível são reduzidos, dos mais novos para os mais antigos (os que chegariam a 0 fecham e cancelam as ofertas abertas); apaga os `OfferItem`. A oferta fica `ACCEPTED`. Assim **anunciado + reservado ≤ quantidade** vale o tempo todo. Em cada anúncio que fecha ou diminui nesse passo, as **outras** ofertas `ACCEPTED` sem troca (travadas com `FOR UPDATE`) que não cabem mais (anúncio fechado, ou `offer.quantity` maior que o que sobrou) viram `CANCELED` (`respondedAt` = agora) e perdem os `OfferItem`; sem isso ficariam presas, sem poder virar troca nem ser canceladas. Fechar, diminuir ou bloquear o anúncio pelo `PATCH /listings/:id` ainda **não** faz isso (limitação conhecida).
- **Troca aceita (`POST /trades/:id/accept`, RN-07)**: trava em ordem de id os itens de origem e os itens de destino que já existem (buscados pela chave antes da transação), depois a troca, confere de novo cada item (existe, é de `fromUserId`, `quantity` e `reservedQuantity` ≥ quantidade), baixa `quantity` e `reservedQuantity` de quem entrega e soma em quem recebe pela chave única `(userId, cardId, condition, finish, firstEdition)`; se não houver item, cria um público. `status = ACCEPTED`, `completedAt = now()`. Qualquer erro desfaz tudo. Quem entrega fica com o item, mesmo em 0.
- **Troca recusada ou cancelada**: devolve a reserva; `completedAt` fica nulo. Os anúncios reduzidos não voltam.
- **Condição congelada durante a negociação**: `PATCH /collection/:id` recusa mudar `condition` (409) se o item tem reserva, `OfferItem` em oferta `PROPOSED`/`ACCEPTED` ou anúncio `ACTIVE`/`PAUSED`. Anúncio e oferta mostram a condição atual do item; sem isso, a cópia feita no `TradeItem` podia ser diferente do que foi anunciado ou oferecido. A conferência roda com o item travado, a mesma trava de criar anúncio e oferta.

## Índices

Além dos índices que o Postgres cria para PK e `UNIQUE`:

| Índice | Serve para |
|---|---|
| `Card` por `name`, `setId` e `category` | busca e filtros do catálogo local |
| `CollectionItem` e `WishlistItem` por `cardId` | achar quem tem ou quer uma carta (oportunidades da wishlist, detalhe da carta). A busca por dono usa a chave única, que começa por `userId` |
| `Listing` por `collectionItemId` | anúncios abertos de um item (RN-05, `GET /listings/me`) |
| `Listing` por `(status, createdAt DESC, id)` (#112) | `GET /listings`: o banco lê os anúncios ativos já na ordem de "mais recentes" e para no fim da página, em vez de ordenar todos. Também atende filtro só por `status` |
| `CatalogCard` por `setId` | cartas de um set reconhecido na busca (`charizard base`) |
| `CatalogCard` por `(lang, rarity)` e `(lang, category)`, e GIN em `types` (#158) | busca e lista com filtro de raridade, categoria e tipo (`types @> ARRAY['Fire']`, o operador que o GIN atende) |
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

Nova tabela ou coluna: altere o `schema.prisma`, rode `npx prisma migrate dev --name <descricao>` e atualize este arquivo no mesmo PR.

## Seed

```bash
cd backend
npm run db:seed
```

Idempotente: pode rodar várias vezes. Depois da migration `add_card_details_and_variants`, recrie o banco local (apague o volume, suba de novo e rode as migrations) antes do seed, porque a chave da coleção mudou.

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
| `CollectionItem` | 111 itens (20 privados), de 10 a 22 por usuário, com quantidade maior que 1 e variantes holo, reverse e 1ª edição; as trocas concluídas criam mais 6 (117 no total) |
| `WishlistItem` | 30 itens, 3 ou 4 por usuário, nenhum de carta que a pessoa já tem (RN-12); vários cruzam com cartas e anúncios de outros usuários, e alguns só têm dono desativado (0 oportunidades) |
| `Listing` | 30 anúncios com `createdAt` espalhado em 45 dias: 22 `ACTIVE` (21 na vitrine, o do `lance` some), 2 `PAUSED`, 1 `BLOCKED`, 5 `CLOSED` (2 fechados pelo dono e 3 pelas trocas) |
| `Offer` | 13 ofertas: 5 `PROPOSED`, 4 `ACCEPTED` (1 sem troca e 3 que viraram troca), 2 `REJECTED`, 2 `CANCELED` |
| `Trade` | 3 trocas: 2 `ACCEPTED` (erika ↔ brock, gary ↔ cynthia) e 1 `PROPOSED` (brock ↔ cynthia, com 2 cartas reservadas de cada lado) |

Como fica idempotente:

- usuários, cartas, itens de coleção e wishlist usam `upsert` pelas chaves únicas. Item de coleção que já existe não muda, para não desfazer o que as trocas já moveram;
- anúncios são procurados pelo item da coleção (`findFirst`); se já existe, fica como está;
- ofertas são procuradas pelo par anúncio + quem ofertou. As que o seed deixa em aberto voltam para `PROPOSED` (e o anúncio delas para `ACTIVE`) a cada execução, como a da misty pelo Charizard do ash, que o `make test` usa. Se uma delas já virou troca, o seed avisa e não mexe: para voltar ao estado inicial, `npx prisma migrate reset` (apaga o banco local). Ofertas recusadas, canceladas ou aceitas e as trocas já criadas não são refeitas;
- item que saiu do seed é apagado: hoje só a Fire Energy `sve-002` da `misty` (o set `sve` não tem imagem; ela passou a ter a `base1-98`). Vale para bancos populados pelo seed antigo, como o de produção. Se o item estiver num anúncio, numa oferta ou reservado, o seed avisa e mantém;
- anúncios, ofertas e trocas são criados pelos services da API (`ListingService`, `OfferService`, `TradeService`), com as mesmas regras e transações (RN-05 a RN-08). Só duas coisas vão direto no banco: a data de criação dos anúncios (a API não deixa escolher) e a volta das ofertas em aberto para `PROPOSED` (a API não deixa uma oferta finalizada voltar).

Antes de gravar, o seed confere os próprios dados: toda carta existe no `cards.json`, toda variante existe na carta e nenhuma wishlist pede carta que a pessoa já tem.

### Cartas do seed

Os dados das cartas são reais e ficam versionados em `prisma/seed-data/cards.json`, para o seed funcionar sem internet. O arquivo é gerado por `scripts/seed-cards.ts`, que busca na TCGdex a lista fixa `CARD_IDS` e recusa carta sem imagem ou com id fora do padrão `^[a-zA-Z0-9.\-]+$` (se recusar alguma, não grava nada e diz qual trocar). Para trocar a lista ou atualizar os dados (inclusive o preço de referência), edite `CARD_IDS` e rode:

```bash
npm run db:seed-cards
```
