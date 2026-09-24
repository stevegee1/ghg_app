-- AlterTable CustomKeepsakeSpec
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN IF NOT EXISTS "sportType" TEXT;
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN IF NOT EXISTS "garmentSize" TEXT;
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;

-- CreateTable MerchEnquiry
CREATE TABLE IF NOT EXISTS "MerchEnquiry" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MerchEnquiry_status_idx" ON "MerchEnquiry"("status");
CREATE INDEX IF NOT EXISTS "MerchEnquiry_contactEmail_idx" ON "MerchEnquiry"("contactEmail");
CREATE INDEX IF NOT EXISTS "MerchEnquiry_createdAt_idx" ON "MerchEnquiry"("createdAt");

-- Grant permissions to ghg_app_user if present
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ghg_app_user') THEN
    GRANT ALL PRIVILEGES ON TABLE "MerchEnquiry" TO ghg_app_user;
  END IF;
END $$;
