-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "marketPrice" DECIMAL(10,2),
ADD COLUMN     "marketPriceCurrency" TEXT,
ADD COLUMN     "marketPriceSource" TEXT,
ADD COLUMN     "marketPriceUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Card"
  ADD CONSTRAINT "card_market_price_check"
  CHECK ("marketPrice" IS NULL OR "marketPrice" >= 0);
