-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ReportSource" AS ENUM ('MANUAL_ATTESTATION', 'THIRD_PARTY_API');

-- CreateTable
CREATE TABLE "JobCreationReport" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "jobsCreated" INTEGER NOT NULL,
    "reportSource" "ReportSource" NOT NULL,
    "attestationNote" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCreationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobCreationReport_licenseeId_idx" ON "JobCreationReport"("licenseeId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCreationReport_licenseeId_periodType_periodStart_period" ON "JobCreationReport"("licenseeId", "periodType", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "JobCreationReport" ADD CONSTRAINT "JobCreationReport_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCreationReport" ADD CONSTRAINT "JobCreationReport_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
