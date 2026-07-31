-- CreateEnum
CREATE TYPE "Vertical" AS ENUM ('B2B_CLEAN_TECH', 'B2B_HEAVY_MANUFACTURING', 'B2C_SPORTS_MERCH', 'B2C_LIFESTYLE_EVENTS');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'REFUNDED', 'REVERSED');

-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('THIRD_PARTY_API', 'MANUAL_ATTESTATION', 'CONSUMER_OPT_IN');

-- CreateEnum
CREATE TYPE "PortalRole" AS ENUM ('PARTNER', 'ADMIN');

-- CreateTable
CREATE TABLE "Licensee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vertical" "Vertical" NOT NULL,
    "stripeConnectedAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licensee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerEvent" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "verificationSource" "VerificationSource" NOT NULL,
    "weatherCondition" TEXT,
    "eventType" TEXT,
    "policyMilestoneRef" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriggerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSplit" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "licensorRoyaltyCents" INTEGER NOT NULL,
    "charityGiftCents" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "charityStripeAccountId" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "licenseeId" TEXT,
    "role" "PortalRole" NOT NULL DEFAULT 'PARTNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_licenseeId_idx" ON "Transaction"("licenseeId");

-- CreateIndex
CREATE UNIQUE INDEX "TriggerEvent_transactionId_key" ON "TriggerEvent"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSplit_transactionId_key" ON "FinancialSplit"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_email_key" ON "PortalUser"("email");

-- CreateIndex
CREATE INDEX "PortalUser_licenseeId_idx" ON "PortalUser"("licenseeId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerEvent" ADD CONSTRAINT "TriggerEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSplit" ADD CONSTRAINT "FinancialSplit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
