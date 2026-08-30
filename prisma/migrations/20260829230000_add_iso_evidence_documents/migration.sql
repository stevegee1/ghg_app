-- CreateEnum
CREATE TYPE "EvidenceCategory" AS ENUM ('SCADA_TELEMETRY', 'WATER_TRADE_EFFLUENT_PERMIT', 'LAB_GAS_PURITY_CERT', 'STAGING_PAYROLL_REGISTER', 'CALIBRATION_CERTIFICATE', 'OTHER_AUDIT_PROOF');

-- CreateTable
CREATE TABLE "AuditEvidenceDocument" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "reportId" TEXT,
    "matrixRowId" TEXT,
    "fileName" TEXT NOT NULL,
    "category" "EvidenceCategory" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvidenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvidenceDocument_licenseeId_category_idx" ON "AuditEvidenceDocument"("licenseeId", "category");

-- CreateIndex
CREATE INDEX "AuditEvidenceDocument_reportId_idx" ON "AuditEvidenceDocument"("reportId");

-- AddForeignKey
ALTER TABLE "AuditEvidenceDocument" ADD CONSTRAINT "AuditEvidenceDocument_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvidenceDocument" ADD CONSTRAINT "AuditEvidenceDocument_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AuditInspectionReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
