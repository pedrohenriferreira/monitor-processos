-- AlterEnum
ALTER TYPE "ImportStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "imports" ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "processed_rows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "raw_rows" JSONB,
ADD COLUMN     "rejected_details" JSONB;
