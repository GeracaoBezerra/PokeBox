-- CreateEnum
CREATE TYPE "OfferCancelReason" AS ENUM ('PROPOSER', 'LISTING_CLOSED', 'LISTING_BLOCKED', 'LISTING_TRADED', 'ACCOUNT_DEACTIVATED');

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'IN_TRADE';

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "cancelReason" "OfferCancelReason";

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "proposerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "recipientConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TradeListingHold" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeListingHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeListingHold_listingId_idx" ON "TradeListingHold"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeListingHold_tradeId_listingId_key" ON "TradeListingHold"("tradeId", "listingId");

-- AddForeignKey
ALTER TABLE "TradeListingHold" ADD CONSTRAINT "TradeListingHold_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeListingHold" ADD CONSTRAINT "TradeListingHold_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill
UPDATE "Trade"
SET "proposerConfirmedAt" = "completedAt",
    "recipientConfirmedAt" = "completedAt"
WHERE "status" = 'ACCEPTED';

-- AlterCheckConstraint
ALTER TABLE "Listing" DROP CONSTRAINT IF EXISTS "listing_quantity_check";

ALTER TABLE "Listing"
  ADD CONSTRAINT "listing_quantity_check"
  CHECK ("quantity" >= 0 AND ("status" <> 'ACTIVE' OR "quantity" > 0));

-- AddCheckConstraint
ALTER TABLE "Trade"
  ADD CONSTRAINT "trade_accepted_confirmed_check"
  CHECK ("status" <> 'ACCEPTED' OR ("proposerConfirmedAt" IS NOT NULL AND "recipientConfirmedAt" IS NOT NULL));

ALTER TABLE "TradeListingHold"
  ADD CONSTRAINT "trade_listing_hold_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "Offer"
  ADD CONSTRAINT "offer_cancel_reason_check"
  CHECK ("cancelReason" IS NULL OR "status" = 'CANCELED');
