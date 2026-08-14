-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('DIGITAL', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- AlterTable Licensee
ALTER TABLE "Licensee" ADD COLUMN "pricePerDropCents" INTEGER,
ADD COLUMN "b2bApiKeyHash" TEXT;

-- AlterTable TriggerEvent
ALTER TABLE "TriggerEvent" ADD COLUMN "deliveryType" "DeliveryType" NOT NULL DEFAULT 'DIGITAL',
ADD COLUMN "fulfillmentStatus" "FulfillmentStatus";

-- Remove temporary default after populating existing rows
ALTER TABLE "TriggerEvent" ALTER COLUMN "deliveryType" DROP DEFAULT;

-- Add Check Constraint enforcing Physical vs Digital fulfillment status rules
ALTER TABLE "TriggerEvent" ADD CONSTRAINT "check_delivery_fulfillment_status" CHECK (
  ("deliveryType" = 'PHYSICAL' AND "fulfillmentStatus" IS NOT NULL) OR
  ("deliveryType" = 'DIGITAL' AND "fulfillmentStatus" IS NULL)
);
