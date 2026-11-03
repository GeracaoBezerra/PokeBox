-- CreateEnum
CREATE TYPE "CardFinish" AS ENUM ('NORMAL', 'HOLO', 'REVERSE');

-- DropIndex
DROP INDEX "CollectionItem_userId_cardId_condition_key";

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "category" TEXT,
ADD COLUMN     "dexId" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "energyType" TEXT,
ADD COLUMN     "hp" INTEGER,
ADD COLUMN     "illustrator" TEXT,
ADD COLUMN     "regulationMark" TEXT,
ADD COLUMN     "releaseDate" DATE,
ADD COLUMN     "setSeries" TEXT,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "trainerType" TEXT,
ADD COLUMN     "types" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "CollectionItem" ADD COLUMN     "finish" "CardFinish" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "firstEdition" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CollectionItem" ALTER COLUMN "finish" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TradeItem" ADD COLUMN     "finish" "CardFinish" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "firstEdition" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TradeItem" ALTER COLUMN "finish" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Card_category_idx" ON "Card"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_userId_cardId_condition_finish_firstEdition_key" ON "CollectionItem"("userId", "cardId", "condition", "finish", "firstEdition");

-- ClearCache
DELETE FROM "CardCache";
