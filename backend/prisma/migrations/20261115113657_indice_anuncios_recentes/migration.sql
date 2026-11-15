-- DropIndex
DROP INDEX "Listing_status_idx";

-- CreateIndex
CREATE INDEX "Listing_status_createdAt_id_idx" ON "Listing"("status", "createdAt" DESC, "id");
