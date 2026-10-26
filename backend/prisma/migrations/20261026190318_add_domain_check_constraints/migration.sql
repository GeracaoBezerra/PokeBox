ALTER TABLE "Card"
  ADD CONSTRAINT "card_name_not_blank_check"
  CHECK (length(btrim("name")) >= 1);

ALTER TABLE "CollectionItem"
  ADD CONSTRAINT "collection_item_quantity_check"
  CHECK ("quantity" >= 0);

ALTER TABLE "CollectionItem"
  ADD CONSTRAINT "collection_item_reserved_quantity_check"
  CHECK ("reservedQuantity" >= 0 AND "reservedQuantity" <= "quantity");

ALTER TABLE "Listing"
  ADD CONSTRAINT "listing_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "Listing"
  ADD CONSTRAINT "listing_price_check"
  CHECK ("priceCents" IS NULL OR "priceCents" >= 0);

ALTER TABLE "Listing"
  ADD CONSTRAINT "listing_price_required_for_sale_check"
  CHECK ("type" = 'TRADE' OR "priceCents" IS NOT NULL);

ALTER TABLE "Offer"
  ADD CONSTRAINT "offer_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "Offer"
  ADD CONSTRAINT "offer_price_check"
  CHECK ("priceCents" IS NULL OR "priceCents" >= 0);

ALTER TABLE "Offer"
  ADD CONSTRAINT "offer_responded_at_check"
  CHECK (("status" = 'PROPOSED') = ("respondedAt" IS NULL));

ALTER TABLE "Trade"
  ADD CONSTRAINT "trade_distinct_parties_check"
  CHECK ("proposerId" <> "recipientId");

ALTER TABLE "Trade"
  ADD CONSTRAINT "trade_completed_at_check"
  CHECK (("status" = 'ACCEPTED') = ("completedAt" IS NOT NULL));

ALTER TABLE "TradeItem"
  ADD CONSTRAINT "trade_item_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "TradeItem"
  ADD CONSTRAINT "trade_item_distinct_parties_check"
  CHECK ("fromUserId" <> "toUserId");
