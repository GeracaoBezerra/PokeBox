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
| `Card` | catálogo local: snapshot mínimo da carta da TCGdex (nome, set, número, raridade, imagem). `id` = id da TCGdex | RN-01, RN-09 |
| `CardCache` | cache HTTP do JSON completo da TCGdex (TTL 24h). Não é referenciado por FK | RN-09 |
| `CollectionItem` | posse: quanto de cada carta, em qual condição, o usuário tem | RN-01, RN-02, RN-03, RN-08, RN-10 |
| `WishlistItem` | desejo: carta que o usuário quer | RN-04 |
| `Listing` | anúncio de um item da coleção (`SALE`, `TRADE`, `SALE_OR_TRADE`) | RN-05 |
| `Offer` | proposta em um anúncio (`PROPOSED → ACCEPTED/REJECTED/CANCELED`) | RN-06 |
| `Trade` | negociação entre dois usuários; pode nascer de uma oferta | RN-07 |
| `TradeItem` | o que cada lado entrega na troca | RN-07, RN-08 |

## Decisões

- **Catálogo × coleção (RN-01):** `CollectionItem.cardId` aponta para `Card`. Adicionar à coleção nunca duplica a carta: a linha de `Card` é criada uma vez (upsert com os dados da TCGdex) e reaproveitada.
- **Item de coleção único por `(userId, cardId, condition)`:** a mesma carta em condições diferentes são itens diferentes; na mesma condição, soma em `quantity`.
- **Reserva (RN-08):** `reservedQuantity` guarda quanto do item está comprometido em negociação aberta. Disponível = `quantity - reservedQuantity`.
- **Privacidade (RN-10):** `CollectionItem.isPublic`, padrão `true`.
- **Preço em centavos (`priceCents`):** inteiro, sem erro de arredondamento.
- **`TradeItem` guarda cópia de `cardId`, `condition`, `fromUserId` e `toUserId`:** o histórico da troca continua legível mesmo se o item de coleção for removido depois (`collectionItemId` vira `NULL`).
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

Nova tabela ou coluna: altere o `schema.prisma`, rode `npx prisma migrate dev --name <descricao>` e atualize este arquivo no mesmo PR.

## Seed

```bash
cd backend
npm run db:seed
```

Idempotente: pode rodar várias vezes. Cria:

| Usuário | E-mail | Papel |
|---|---|---|
| `admin` | `admin@pokebox.dev` | ADMIN |
| `ash` | `ash@pokebox.dev` | USER |
| `misty` | `misty@pokebox.dev` | USER |

Senha de todos: `pokebox123`. Mais 6 cartas reais da TCGdex, 5 itens de coleção (1 privado), 3 itens de wishlist, 2 anúncios e 1 oferta em aberto.
