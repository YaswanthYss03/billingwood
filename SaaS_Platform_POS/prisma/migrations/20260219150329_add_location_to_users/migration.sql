-- AlterTable
ALTER TABLE "users" ADD COLUMN     "location_id" TEXT;

-- CreateIndex
CREATE INDEX "users_location_id_idx" ON "users"("location_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
