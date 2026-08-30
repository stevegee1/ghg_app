-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW_RISK_CONFORMANT', 'MEDIUM_RISK_OFI', 'HIGH_RISK_GREENWASHING_EXPOSURE');

-- CreateTable
CREATE TABLE "AuditInspectionReport" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "auditRefId" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "leadAuditorName" TEXT NOT NULL,
    "evaluationDate" TIMESTAMP(3) NOT NULL,
    "weightedScore" DOUBLE PRECISION NOT NULL,
    "overallGrade" "ConformanceGrade" NOT NULL,
    "greenwashingRiskLevel" "RiskLevel" NOT NULL,
    "summaryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditInspectionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditMatrixRow" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "pillarIndex" INTEGER NOT NULL,
    "pillarName" TEXT NOT NULL,
    "isoClauseLink" TEXT NOT NULL,
    "legalMandate" TEXT NOT NULL,
    "targetDepartment" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "objectiveEvidenceTypes" TEXT NOT NULL,
    "auditorFindings" TEXT,
    "scorePoints" DOUBLE PRECISION NOT NULL,
    "complianceGrading" "ConformanceGrade" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "rootCause" TEXT,
    "mandatoryCorrectiveAction" TEXT,
    "assignedOwner" TEXT,
    "targetClosureDate" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditMatrixRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomKeepsakeSpec" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "garmentModel" TEXT NOT NULL,
    "inscribedText" TEXT NOT NULL,
    "threadColor" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "artisanLaborHours" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "lcaCarbonGrams" INTEGER NOT NULL DEFAULT 450,
    "openSeaTokenUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomKeepsakeSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditInspectionReport_auditRefId_key" ON "AuditInspectionReport"("auditRefId");

-- CreateIndex
CREATE INDEX "AuditInspectionReport_licenseeId_facilityType_idx" ON "AuditInspectionReport"("licenseeId", "facilityType");

-- CreateIndex
CREATE INDEX "AuditMatrixRow_reportId_pillarIndex_idx" ON "AuditMatrixRow"("reportId", "pillarIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CustomKeepsakeSpec_transactionId_key" ON "CustomKeepsakeSpec"("transactionId");

-- AddForeignKey
ALTER TABLE "AuditInspectionReport" ADD CONSTRAINT "AuditInspectionReport_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditMatrixRow" ADD CONSTRAINT "AuditMatrixRow_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AuditInspectionReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomKeepsakeSpec" ADD CONSTRAINT "CustomKeepsakeSpec_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
