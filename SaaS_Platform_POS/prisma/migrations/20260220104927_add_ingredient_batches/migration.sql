-- DropForeignKey
ALTER TABLE "inventory_batches" DROP CONSTRAINT "inventory_batches_item_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_item_id_fkey";

-- AlterTable
ALTER TABLE "inventory_batches" ADD COLUMN     "ingredient_id" TEXT,
ALTER COLUMN "item_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "ingredient_id" TEXT,
ALTER COLUMN "item_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "inventory_batches_ingredient_id_idx" ON "inventory_batches"("ingredient_id");

-- CreateIndex
CREATE INDEX "purchase_items_ingredient_id_idx" ON "purchase_items"("ingredient_id");

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
