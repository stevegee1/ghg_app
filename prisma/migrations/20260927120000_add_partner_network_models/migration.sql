-- CreateEnum
CREATE TYPE "FulfillmentPartnerStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'CALL_SCHEDULED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CharityPartnerStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED_PENDING_ONBOARDING', 'APPROVED_ACTIVE', 'REJECTED');

-- CreateTable
CREATE TABLE "FulfillmentPartnerApplication" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionOfOperation" TEXT NOT NULL,
    "capabilities" TEXT[],
    "monthlyCapacityUnits" TEXT NOT NULL,
    "certifications" TEXT[],
    "message" TEXT,
    "status" "FulfillmentPartnerStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentPartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharityPartnerApplication" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "orgType" TEXT NOT NULL,
    "focusAreas" TEXT[],
    "annualReportUrl" TEXT,
    "website" TEXT,
    "message" TEXT,
    "status" "CharityPartnerStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharityPartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FulfillmentPartnerApplication_status_idx" ON "FulfillmentPartnerApplication"("status");

-- CreateIndex
CREATE INDEX "FulfillmentPartnerApplication_countryCode_idx" ON "FulfillmentPartnerApplication"("countryCode");

-- CreateIndex
CREATE INDEX "FulfillmentPartnerApplication_createdAt_idx" ON "FulfillmentPartnerApplication"("createdAt");

-- CreateIndex
CREATE INDEX "CharityPartnerApplication_status_idx" ON "CharityPartnerApplication"("status");

-- CreateIndex
CREATE INDEX "CharityPartnerApplication_countryCode_idx" ON "CharityPartnerApplication"("countryCode");

-- CreateIndex
CREATE INDEX "CharityPartnerApplication_createdAt_idx" ON "CharityPartnerApplication"("createdAt");
