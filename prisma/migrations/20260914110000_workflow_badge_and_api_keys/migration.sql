-- AlterTable WorkflowSubmission to support badge compositing and on-chain minting metadata
ALTER TABLE "WorkflowSubmission" ADD COLUMN "clientMessage" TEXT;
ALTER TABLE "WorkflowSubmission" ADD COLUMN "clientLogoUrl" TEXT;
ALTER TABLE "WorkflowSubmission" ADD COLUMN "compositeBadgeUrl" TEXT;
ALTER TABLE "WorkflowSubmission" ADD COLUMN "tokenId" TEXT;
ALTER TABLE "WorkflowSubmission" ADD COLUMN "contractAddress" TEXT;
ALTER TABLE "WorkflowSubmission" ADD COLUMN "transactionHash" TEXT;
ALTER TABLE "WorkflowSubmission" ADD COLUMN "openSeaUrl" TEXT;
ALTER TABLE "WorkflowSubmission" ADD COLUMN "mintedAt" TIMESTAMP(3);

-- CreateTable WorkflowApiKey for Scoped Telemetry Access
CREATE TABLE "WorkflowApiKey" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "keyHash" TEXT NOT NULL,
    "maskedKey" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowApiKey_keyHash_key" ON "WorkflowApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "WorkflowApiKey_licenseeId_workflowType_idx" ON "WorkflowApiKey"("licenseeId", "workflowType");

-- AddForeignKey
ALTER TABLE "WorkflowApiKey" ADD CONSTRAINT "WorkflowApiKey_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) enforcement on WorkflowApiKey
ALTER TABLE "WorkflowApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowApiKey" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "WorkflowApiKey"
    FOR ALL
    USING (
        (current_setting('app.current_licensee_id'::text, true) = ''::text)
        OR
        ("licenseeId" = current_setting('app.current_licensee_id'::text, true))
    );
