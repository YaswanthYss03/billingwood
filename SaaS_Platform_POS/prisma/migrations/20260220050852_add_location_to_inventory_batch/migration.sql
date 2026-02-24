-- AlterTable
ALTER TABLE "inventory_batches" ADD COLUMN     "location_id" TEXT;

-- CreateIndex
CREATE INDEX "inventory_batches_location_id_idx" ON "inventory_batches"("location_id");

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
