-- CreateTable
CREATE TABLE "CardCache" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardCache_updatedAt_idx" ON "CardCache"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CardCache_cardId_lang_key" ON "CardCache"("cardId", "lang");
