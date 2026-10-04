-- CreateEnum
CREATE TYPE "FleetConnectionBranch" AS ENUM ('UNCONFIRMED', 'CLOUD_CONNECTED', 'TRACKING_DEVICE', 'MANUAL');

-- CreateEnum
CREATE TYPE "FleetSetupRequestStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "RoutingEventType" ADD VALUE 'FLEET_ASSET_BRANCH_SET';

-- Every existing asset starts unconfirmed: a connection is never assumed.
-- AlterTable
ALTER TABLE "FleetAsset" ADD COLUMN     "connectionBranch" "FleetConnectionBranch" NOT NULL DEFAULT 'UNCONFIRMED',
ADD COLUMN     "connectionConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "connectionConfirmedById" TEXT;

-- CreateTable
CREATE TABLE "FleetSetupRequest" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assetIds" TEXT[],
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "preferredTimes" TEXT,
    "notes" TEXT,
    "status" "FleetSetupRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "scheduledFor" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetSetupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FleetSetupRequest_licenseeId_status_idx" ON "FleetSetupRequest"("licenseeId", "status");

-- CreateIndex
CREATE INDEX "FleetSetupRequest_status_createdAt_idx" ON "FleetSetupRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "FleetSetupRequest" ADD CONSTRAINT "FleetSetupRequest_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetSetupRequest" ADD CONSTRAINT "FleetSetupRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "PortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security: licensee isolation
ALTER TABLE "FleetSetupRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetSetupRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetSetupRequest"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
