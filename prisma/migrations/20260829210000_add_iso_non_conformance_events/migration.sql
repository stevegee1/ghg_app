-- CreateEnum
CREATE TYPE "ConformanceGrade" AS ENUM ('CONFORMANT', 'OPPORTUNITY_FOR_IMPROVEMENT', 'MINOR_NON_CONFORMANCE', 'MAJOR_NON_CONFORMANCE_GREENWASHING_RISK');

-- CreateTable
CREATE TABLE "NonConformanceEvent" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "isoClause" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "observedValue" DOUBLE PRECISION NOT NULL,
    "percentageVariance" DOUBLE PRECISION NOT NULL,
    "conformanceGrade" "ConformanceGrade" NOT NULL DEFAULT 'MINOR_NON_CONFORMANCE',
    "rootCauseAnalysis" TEXT,
    "correctiveAction" TEXT,
    "assignedOwner" TEXT,
    "targetClosureDate" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "signOffSupervisor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonConformanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NonConformanceEvent_licenseeId_isResolved_idx" ON "NonConformanceEvent"("licenseeId", "isResolved");

-- CreateIndex
CREATE INDEX "NonConformanceEvent_assetTag_isResolved_idx" ON "NonConformanceEvent"("assetTag", "isResolved");

-- AddForeignKey
ALTER TABLE "NonConformanceEvent" ADD CONSTRAINT "NonConformanceEvent_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
