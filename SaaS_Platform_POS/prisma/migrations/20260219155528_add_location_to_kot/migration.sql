-- AlterTable
ALTER TABLE "kots" ADD COLUMN     "location_id" TEXT;

-- CreateIndex
CREATE INDEX "kots_location_id_idx" ON "kots"("location_id");

-- AddForeignKey
ALTER TABLE "kots" ADD CONSTRAINT "kots_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
