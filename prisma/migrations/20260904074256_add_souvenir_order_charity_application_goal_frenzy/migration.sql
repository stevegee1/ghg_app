-- CreateEnum
CREATE TYPE "SouvenirOrderStatus" AS ENUM ('ORDER_PLACED', 'SPLIT_DISBURSED', 'QUEUED_FOR_PRINT', 'IN_PRODUCTION', 'QUALITY_INSPECTED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SouvenirEventCategory" AS ENUM ('SPORTS', 'GALA', 'TECH_SUMMIT', 'WEDDING');

-- CreateEnum
CREATE TYPE "CharityFocusPillar" AS ENUM ('REFORESTATION_AND_LAND', 'OCEAN_AND_WATER', 'COMMUNITY_AND_YOUTH');

-- CreateEnum
CREATE TYPE "CharityApplicationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'WAITLISTED');

-- AlterTable
ALTER TABLE "CustomKeepsakeSpec" ADD COLUMN     "frenzyClub" TEXT,
ADD COLUMN     "frenzyMinute" TEXT,
ADD COLUMN     "frenzyMoment" TEXT,
ADD COLUMN     "frenzyOpponent" TEXT,
ADD COLUMN     "frenzyQuote" TEXT,
ADD COLUMN     "isGoalFrenzy" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SouvenirOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "eventCategory" "SouvenirEventCategory" NOT NULL,
    "eventName" TEXT NOT NULL,
    "logoDropCount" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'GHG_LOGO_DROP',
    "shippingAddress" JSONB,
    "status" "SouvenirOrderStatus" NOT NULL DEFAULT 'ORDER_PLACED',
    "courierName" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "stripeSessionId" TEXT,
    "grossAmountCents" INTEGER NOT NULL,
    "licensorCents" INTEGER NOT NULL,
    "charityCents" INTEGER NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharityApplication" (
    "id" TEXT NOT NULL,
    "legalEntityName" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "registrationJurisdiction" TEXT NOT NULL,
    "headquartersAddress" TEXT NOT NULL,
    "focusPillar" "CharityFocusPillar" NOT NULL,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactEmail" TEXT NOT NULL,
    "stripeConnectedAccountId" TEXT,
    "annualFinancialStatementUrl" TEXT,
    "impactMetricDescription" TEXT NOT NULL,
    "authorizedSignatoryName" TEXT NOT NULL,
    "authorizedSignatoryTitle" TEXT NOT NULL,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "applicationStatus" "CharityApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharityApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirOrder_orderNumber_key" ON "SouvenirOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirOrder_transactionId_key" ON "SouvenirOrder"("transactionId");

-- CreateIndex
CREATE INDEX "SouvenirOrder_customerEmail_idx" ON "SouvenirOrder"("customerEmail");

-- CreateIndex
CREATE INDEX "SouvenirOrder_status_idx" ON "SouvenirOrder"("status");

-- CreateIndex
CREATE INDEX "CharityApplication_applicationStatus_idx" ON "CharityApplication"("applicationStatus");

-- CreateIndex
CREATE INDEX "CharityApplication_primaryContactEmail_idx" ON "CharityApplication"("primaryContactEmail");

-- AddForeignKey
ALTER TABLE "SouvenirOrder" ADD CONSTRAINT "SouvenirOrder_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "JobCreationReport_licenseeId_periodType_periodStart_period" RENAME TO "JobCreationReport_licenseeId_periodType_periodStart_periodE_key";
