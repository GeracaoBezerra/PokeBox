INSERT INTO "User" (id, username, name, email, "passwordHash", "accountStatus", "updatedAt")
SELECT gen_random_uuid(), 'bench' || g, 'Bench ' || g, 'bench' || g || '@bench.dev', 'x', 'ACTIVE', now()
FROM generate_series(1, 5000) g;

INSERT INTO "CollectionItem" (id, "userId", "cardId", quantity, condition, finish, "updatedAt")
SELECT gen_random_uuid(), u.id, c.id, 2, cond, 'NORMAL', now()
FROM "User" u CROSS JOIN "Card" c CROSS JOIN (VALUES ('NEAR_MINT'::"CardCondition"), ('GOOD'::"CardCondition")) v(cond)
WHERE u.username LIKE 'bench%';

INSERT INTO "Listing" (id, "collectionItemId", quantity, status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), ci.id, 1,
  (ARRAY['ACTIVE','CLOSED','CLOSED','PAUSED','CLOSED']::"ListingStatus"[])[1 + floor(random() * 5)::int],
  now() - random() * interval '365 days', now()
FROM "CollectionItem" ci JOIN "User" u ON u.id = ci."userId" WHERE u.username LIKE 'bench%';

ANALYZE;
