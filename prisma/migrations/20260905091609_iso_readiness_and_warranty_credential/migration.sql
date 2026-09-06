-- CreateEnum
CREATE TYPE "IsoReadinessStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REVISION_REQUIRED');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'COMPOSITED', 'MINTED', 'REVOKED');

-- CreateTable
CREATE TABLE "IsoReadinessSubmission" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "standardFramework" TEXT NOT NULL DEFAULT 'ISO_14001_50001_19011_2026',
    "answers" JSONB NOT NULL,
    "complianceScore" INTEGER,
    "status" "IsoReadinessStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewerNotes" TEXT,
    "paidAt" TIMESTAMP(3),
    "stripeSessionId" TEXT,
    "tierSelected" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsoReadinessSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditWarrantyCredential" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "clientMessage" TEXT NOT NULL,
    "clientLogoUrl" TEXT NOT NULL,
    "compositeBadgeUrl" TEXT,
    "tokenId" TEXT,
    "contractAddress" TEXT,
    "transactionHash" TEXT,
    "openSeaUrl" TEXT,
    "warrantyExpiresAt" TIMESTAMP(3),
    "verificationSeal" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditWarrantyCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsoReadinessSubmission_licenseeId_status_idx" ON "IsoReadinessSubmission"("licenseeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AuditWarrantyCredential_submissionId_key" ON "AuditWarrantyCredential"("submissionId");

-- CreateIndex
CREATE INDEX "AuditWarrantyCredential_licenseeId_status_idx" ON "AuditWarrantyCredential"("licenseeId", "status");

-- AddForeignKey
ALTER TABLE "IsoReadinessSubmission" ADD CONSTRAINT "IsoReadinessSubmission_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditWarrantyCredential" ADD CONSTRAINT "AuditWarrantyCredential_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditWarrantyCredential" ADD CONSTRAINT "AuditWarrantyCredential_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IsoReadinessSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
