# Banco de dados

PostgreSQL 17 + Prisma 7. Schema em `prisma/schema.prisma`, migrations em `prisma/migrations/`.

## Modelo

```
User ─┬─< CollectionItem >── Card ──< WishlistItem >── User
      │        │
      │        └─< Listing ──< Offer >── User (proposer)
      │                          │
      └─< Trade (proposer / recipient) ── 0..1 Offer
              └─< TradeItem >── Card, CollectionItem?, User (from / to)
```

| Tabela | Papel | Regras ligadas |
|---|---|---|
| `User` | conta: `username` e `email` únicos, `passwordHash` (bcrypt), dados de contato e endereço opcionais, `role` (`USER`/`ADMIN`), `accountStatus` (`PENDING_VERIFICATION`/`ACTIVE`/`INACTIVE`/`SUSPENDED`), `deletedAt` para soft delete | auth |
| `Card` | catálogo local: snapshot da carta da TCGdex com os campos usados em filtros e listagens (nome, set, série, lançamento, número, raridade, imagem, categoria, tipos, HP, estágio, ilustrador, nº da Pokédex, regulation mark, tipo de treinador/energia). Ataques, habilidades e preço ficam só no `CardCache`. `id` = id da TCGdex | RN-01, RN-09 |
| `CardCache` | cache HTTP do JSON completo da TCGdex (TTL 24h). Não é referenciado por FK | RN-09 |
| `CollectionItem` | posse: quanto de cada carta, em qual condição e variante, o usuário tem | RN-01, RN-02, RN-03, RN-08, RN-10 |
| `WishlistItem` | desejo: carta que o usuário quer | RN-04 |
| `Listing` | anúncio de um item da coleção (`SALE`, `TRADE`, `SALE_OR_TRADE`) | RN-05 |
| `Offer` | proposta em um anúncio (`PROPOSED → ACCEPTED/REJECTED/CANCELED`) | RN-06 |
| `Trade` | negociação entre dois usuários; pode nascer de uma oferta | RN-07 |
| `TradeItem` | o que cada lado entrega na troca | RN-07, RN-08 |

## Decisões

- **Catálogo × coleção (RN-01):** `CollectionItem.cardId` aponta para `Card`. Adicionar à coleção nunca duplica a carta: a linha de `Card` é criada uma vez (upsert com os dados da TCGdex) e reaproveitada.
- **Item de coleção único por `(userId, cardId, condition, finish, firstEdition)`:** a mesma carta em condição ou variante diferente é outro item; igual em tudo, soma em `quantity`.
- **Variante:** `finish` (`NORMAL`, `HOLO`, `REVERSE`) é o acabamento; `firstEdition` é o carimbo de 1ª edição, que combina com qualquer acabamento (existe "holo 1ª edição"). As combinações válidas de cada carta vêm de `variants` da TCGdex e são validadas no service. A wishlist não tem variante: quem deseja uma carta aceita qualquer versão.
- **Idioma:** fora do escopo. Todas as cartas são da edição em inglês.
- **Reserva (RN-08):** `reservedQuantity` guarda quanto do item está comprometido em negociação aberta. Disponível = `quantity - reservedQuantity`.
- **Privacidade (RN-10):** `CollectionItem.isPublic`, padrão `true`.
- **Preço em centavos (`priceCents`):** inteiro, sem erro de arredondamento.
- **`TradeItem` guarda cópia de `cardId`, `condition`, `finish`, `firstEdition`, `fromUserId` e `toUserId`:** o histórico da troca continua legível mesmo se o item de coleção for removido depois (`collectionItemId` vira `NULL`).
- **Exclusão:** usuário, carta e item de coleção com dependentes não podem ser apagados (FK `RESTRICT`); usuário é desativado por soft delete. Itens de troca são apagados junto com a troca (`CASCADE`).

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
| `listing_price_check` / `offer_price_check` | preço nunca negativo |
| `listing_price_required_for_sale_check` | `SALE` e `SALE_OR_TRADE` exigem preço |
| `offer_quantity_check` | oferta com `quantity > 0` |
| `offer_responded_at_check` | `PROPOSED` ⇔ `respondedAt` nulo: oferta finalizada não volta para `PROPOSED` sem apagar a data da resposta (RN-06) |
| `trade_distinct_parties_check` | ninguém troca consigo mesmo |
| `trade_completed_at_check` | `ACCEPTED` ⇔ `completedAt` preenchido |
| `trade_item_quantity_check` | item de troca com `quantity > 0` |
| `trade_item_distinct_parties_check` | `fromUserId <> toUserId` |
| `card_name_not_blank_check` | carta com nome |

Regras que dependem de outra tabela ficam no service: anúncio não pode passar do disponível no item (RN-05), só o destinatário responde a oferta (RN-06), a troca é revalidada e gravada em `$transaction` (RN-07/RN-08).

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

Senha de todos: `pokebox123`. Mais 10 cartas reais, 10 itens de coleção (1 privado), 4 itens de wishlist, 2 anúncios e 1 oferta em aberto. As cartas cobrem Pokémon, Treinador e Energia, holo de 1ª edição, reverse e o mesmo Pikachu em duas variantes.

### Cartas do seed

Os dados das cartas são reais e ficam versionados em `prisma/seed-data/cards.json`, para o seed funcionar sem internet. Para trocar a lista ou atualizar os dados, edite `CARD_IDS` em `scripts/snapshot-cards.js` e rode:

```bash
npm run db:snapshot-cards
```
