-- Migration: service_routing
-- Onboarding routes each client to one or more isolated services (GHG, Workforce, Fleet).
-- Every routing decision and pipeline handoff is recorded in ServiceRoutingEvent.
-- Assessments are superseded rather than deleted, so their history is kept.

-- CreateEnum
CREATE TYPE "RoutingEventType" AS ENUM ('SERVICE_SELECTED', 'SERVICE_ADDED', 'SERVICE_ACTIVATED', 'SERVICE_ACTIVATION_BLOCKED', 'SERVICE_SUSPENDED', 'HANDOFF_STARTED', 'HANDOFF_COMPLETED');

-- AlterTable
ALTER TABLE "ClientAssessment" ADD COLUMN     "fleetProfile" JSONB,
ADD COLUMN     "supersededAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ServiceRoutingEvent" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "eventType" "RoutingEventType" NOT NULL,
    "serviceLine" "ServiceLine",
    "actor" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRoutingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRoutingEvent_licenseeId_createdAt_idx" ON "ServiceRoutingEvent"("licenseeId", "createdAt");

-- AddForeignKey
ALTER TABLE "ServiceRoutingEvent" ADD CONSTRAINT "ServiceRoutingEvent_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security: licensee isolation
ALTER TABLE "ServiceRoutingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceRoutingEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "ServiceRoutingEvent"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
