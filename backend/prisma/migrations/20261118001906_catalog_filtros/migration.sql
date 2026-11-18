-- AlterTable
ALTER TABLE "CatalogCard" ADD COLUMN     "category" TEXT,
ADD COLUMN     "rarity" TEXT,
ADD COLUMN     "types" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CatalogSet" (
    "id" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CatalogSet_pkey" PRIMARY KEY ("id","lang")
);

-- CreateTable
CREATE TABLE "CatalogFilterValue" (
    "lang" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CatalogFilterValue_pkey" PRIMARY KEY ("lang","kind","value")
);

-- CreateIndex
CREATE INDEX "CatalogSet_lang_position_idx" ON "CatalogSet"("lang", "position");

-- CreateIndex
CREATE INDEX "CatalogCard_lang_category_idx" ON "CatalogCard"("lang", "category");

-- CreateIndex
CREATE INDEX "CatalogCard_lang_rarity_idx" ON "CatalogCard"("lang", "rarity");

-- CreateIndex
CREATE INDEX "CatalogCard_types_idx" ON "CatalogCard" USING GIN ("types");

ALTER TABLE "CatalogFilterValue"
  ADD CONSTRAINT "catalog_filter_value_kind_check" CHECK ("kind" IN ('type', 'rarity', 'category'));
