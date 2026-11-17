-- CreateTable
CREATE TABLE "CatalogCard" (
    "id" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogCard_pkey" PRIMARY KEY ("id","lang")
);

-- CreateIndex
CREATE INDEX "CatalogCard_setId_idx" ON "CatalogCard"("setId");
