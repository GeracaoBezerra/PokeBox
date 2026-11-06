-- DropCheckConstraint
ALTER TABLE "Listing" DROP CONSTRAINT IF EXISTS "listing_price_check";
ALTER TABLE "Listing" DROP CONSTRAINT IF EXISTS "listing_price_required_for_sale_check";
ALTER TABLE "Offer" DROP CONSTRAINT IF EXISTS "offer_price_check";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "priceCents",
DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Offer" DROP COLUMN "priceCents";

-- DropEnum
DROP TYPE "ListingType";

-- CreateTable
CREATE TABLE "OfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "collectionItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferItem_collectionItemId_idx" ON "OfferItem"("collectionItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferItem_offerId_collectionItemId_key" ON "OfferItem"("offerId", "collectionItemId");

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddCheckConstraint
ALTER TABLE "OfferItem"
  ADD CONSTRAINT "offer_item_quantity_check"
  CHECK ("quantity" > 0);
