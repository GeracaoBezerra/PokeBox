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
| `CardCache` | cache HTTP do JSON completo da TCGdex (TTL 24h). Não é referenciado por FK | RN-09 |
| `CollectionItem` | posse: quanto de cada carta, em qual condição e variante, o usuário tem | RN-01, RN-02, RN-03, RN-08, RN-10 |
| `WishlistItem` | desejo: carta que o usuário quer | RN-04, RN-11 |
| `Listing` | anúncio de troca de um item da coleção | RN-05 |
| `Offer` | proposta em um anúncio (`PROPOSED → ACCEPTED/REJECTED/CANCELED`): quantas cartas do anúncio o proponente quer | RN-06 |
| `OfferItem` | o que o proponente oferece em troca: itens da coleção dele e a quantidade de cada um | RN-06 |
| `Trade` | negociação entre dois usuários; pode nascer de uma oferta | RN-07 |
| `TradeItem` | o que cada lado entrega na troca | RN-07, RN-08 |

## Decisões

- **Catálogo × coleção (RN-01):** `CollectionItem.cardId` aponta para `Card`. Adicionar à coleção nunca duplica a carta: a linha de `Card` é criada uma vez (upsert com os dados da TCGdex) e reaproveitada.
- **Item de coleção único por `(userId, cardId, condition, finish, firstEdition)`:** a mesma carta em condição ou variante diferente é outro item; igual em tudo, soma em `quantity`.
- **Variante:** `finish` (`NORMAL`, `HOLO`, `REVERSE`) é o acabamento; `firstEdition` é o carimbo de 1ª edição, que combina com qualquer acabamento (existe "holo 1ª edição"). As combinações válidas de cada carta vêm de `variants` da TCGdex e são validadas no service. A wishlist não tem variante: quem deseja uma carta aceita qualquer versão.
- **Idioma:** fora do escopo. Todas as cartas são da edição em inglês.
- **Reserva (RN-08):** `reservedQuantity` guarda quanto do item está comprometido numa troca aberta (`PROPOSED`). Disponível = `quantity - reservedQuantity`. Sobe quando a troca nasce (`POST /trades`), nos itens dos dois lados; desce quando a troca é recusada ou cancelada; no aceite, desce junto com `quantity`. Anúncio e oferta não reservam.
- **Coleção limpa a wishlist (RN-11):** quando uma carta entra em `CollectionItem` (por `POST /collection` ou recebida no aceite de uma troca), o `WishlistItem` daquele usuário com o mesmo `cardId` é apagado na mesma transação. Como a wishlist não tem variante, qualquer condição, acabamento ou 1ª edição conta.
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

Nova tabela ou coluna: altere o `schema.prisma`, rode `npx prisma migrate dev --name <descricao>` e atualize este arquivo no mesmo PR.

## Seed

```bash
cd backend
npm run db:seed
```

Idempotente: pode rodar várias vezes. Depois da migration `add_card_details_and_variants`, recrie o banco local (apague o volume, suba de novo e rode as migrations) antes do seed, porque a chave da coleção mudou.

Cria:

| Usuário | E-mail | Papel |
|---|---|---|
| `admin` | `admin@pokebox.dev` | ADMIN |
| `ash` | `ash@pokebox.dev` | USER |
| `misty` | `misty@pokebox.dev` | USER |

Senha de todos: `pokebox123`. Mais 10 cartas reais, 10 itens de coleção (1 privado), 4 itens de wishlist, 2 anúncios e 1 oferta em aberto (a misty oferece o Mew holo dela pelo Charizard do ash). Rodar o seed de novo volta essa oferta para `PROPOSED` e o anúncio do Charizard para `ACTIVE` com 1 unidade. O seed não cria troca; se a oferta já virou troca, ele avisa e não mexe nela: para voltar ao estado inicial, `npx prisma migrate reset` (apaga o banco local). As cartas cobrem Pokémon, Treinador e Energia, holo de 1ª edição, reverse e o mesmo Pikachu em duas variantes.

### Cartas do seed

Os dados das cartas são reais e ficam versionados em `prisma/seed-data/cards.json`, para o seed funcionar sem internet. Para trocar a lista ou atualizar os dados, edite `CARD_IDS` em `scripts/snapshot-cards.js` e rode:

```bash
npm run db:snapshot-cards
```
