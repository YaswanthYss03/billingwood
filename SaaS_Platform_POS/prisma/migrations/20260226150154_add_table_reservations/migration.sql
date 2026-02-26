-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateTable
CREATE TABLE "table_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "number_of_people" INTEGER NOT NULL,
    "reservation_date" TIMESTAMP(3) NOT NULL,
    "reservation_time" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER DEFAULT 120,
    "special_requirements" TEXT,
    "pre_order_items" JSONB,
    "pre_order_notes" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "confirmation_code" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "table_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "table_reservations_confirmation_code_key" ON "table_reservations"("confirmation_code");

-- CreateIndex
CREATE INDEX "table_reservations_tenant_id_status_reservation_date_idx" ON "table_reservations"("tenant_id", "status", "reservation_date");

-- CreateIndex
CREATE INDEX "table_reservations_location_id_reservation_date_idx" ON "table_reservations"("location_id", "reservation_date");

-- CreateIndex
CREATE INDEX "table_reservations_table_id_status_idx" ON "table_reservations"("table_id", "status");

-- CreateIndex
CREATE INDEX "table_reservations_customer_phone_idx" ON "table_reservations"("customer_phone");

-- AddForeignKey
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
