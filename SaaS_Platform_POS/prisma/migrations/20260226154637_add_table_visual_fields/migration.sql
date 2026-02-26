-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "height" INTEGER DEFAULT 80,
ADD COLUMN     "rotation" INTEGER DEFAULT 0,
ADD COLUMN     "shape" TEXT DEFAULT 'rectangle',
ADD COLUMN     "width" INTEGER DEFAULT 80;
