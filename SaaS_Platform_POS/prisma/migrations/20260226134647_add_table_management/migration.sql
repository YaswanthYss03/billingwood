-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('FREE', 'OCCUPIED', 'RESERVED', 'BILLED', 'CLEANING', 'OUT_OF_SERVICE');

-- AlterTable
ALTER TABLE "kots" ADD COLUMN     "table_id" TEXT;

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "table_number" TEXT NOT NULL,
    "table_name" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "section" TEXT,
    "floor" TEXT,
    "status" "TableStatus" NOT NULL DEFAULT 'FREE',
    "current_kot_id" TEXT,
    "occupied_at" TIMESTAMP(3),
    "last_billed_at" TIMESTAMP(3),
    "position_x" INTEGER,
    "position_y" INTEGER,
    "layout_zone" TEXT,
    "qr_code" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tables_qr_code_key" ON "tables"("qr_code");

-- CreateIndex
CREATE INDEX "tables_tenant_id_location_id_status_idx" ON "tables"("tenant_id", "location_id", "status");

-- CreateIndex
CREATE INDEX "tables_location_id_status_idx" ON "tables"("location_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_location_id_table_number_key" ON "tables"("location_id", "table_number");

-- CreateIndex
CREATE INDEX "kots_table_id_idx" ON "kots"("table_id");

-- AddForeignKey
ALTER TABLE "kots" ADD CONSTRAINT "kots_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
