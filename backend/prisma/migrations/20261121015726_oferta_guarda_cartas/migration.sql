-- DropForeignKey
ALTER TABLE "OfferItem" DROP CONSTRAINT "OfferItem_collectionItemId_fkey";

-- AlterTable
ALTER TABLE "OfferItem" ADD COLUMN     "cardId" TEXT,
ADD COLUMN     "condition" "CardCondition",
ADD COLUMN     "finish" "CardFinish",
ADD COLUMN     "firstEdition" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "collectionItemId" DROP NOT NULL;

-- Backfill
UPDATE "OfferItem" oi
SET "cardId" = ci."cardId",
    "condition" = ci."condition",
    "finish" = ci."finish",
    "firstEdition" = ci."firstEdition"
FROM "CollectionItem" ci
WHERE ci."id" = oi."collectionItemId";

-- AlterTable
ALTER TABLE "OfferItem" ALTER COLUMN "cardId" SET NOT NULL,
ALTER COLUMN "condition" SET NOT NULL,
ALTER COLUMN "finish" SET NOT NULL;

-- CreateIndex
CREATE INDEX "OfferItem_cardId_idx" ON "OfferItem"("cardId");

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
