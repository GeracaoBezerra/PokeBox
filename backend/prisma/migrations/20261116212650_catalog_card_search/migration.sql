CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX "CatalogCard_nameNormalized_trgm_idx"
  ON "CatalogCard" USING GIN ("nameNormalized" gin_trgm_ops);
