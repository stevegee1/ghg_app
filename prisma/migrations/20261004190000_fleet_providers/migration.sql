-- CreateEnum
CREATE TYPE "FleetProviderKind" AS ENUM ('TRACKING_DEVICE', 'OEM_CLOUD');

-- CreateEnum
CREATE TYPE "FleetProviderAuthType" AS ENUM ('DEVICE_SHARED_KEY', 'DEVICE_HMAC_SHA256', 'OAUTH2_CLIENT_CREDENTIALS', 'HTTP_BASIC', 'API_KEY_HEADER');

-- CreateTable
CREATE TABLE "FleetDataProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "FleetProviderKind" NOT NULL,
    "authType" "FleetProviderAuthType" NOT NULL,
    "authConfig" JSONB NOT NULL,
    "secretCiphertext" TEXT,
    "fieldMapping" JSONB NOT NULL,
    "schemaVersionId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetDataProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetDeviceBinding" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalDeviceId" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "activeKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "FleetDeviceBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FleetDataProvider_name_key" ON "FleetDataProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FleetDeviceBinding_activeKey_key" ON "FleetDeviceBinding"("activeKey");

-- CreateIndex
CREATE INDEX "FleetDeviceBinding_providerId_externalDeviceId_idx" ON "FleetDeviceBinding"("providerId", "externalDeviceId");

-- CreateIndex
CREATE INDEX "FleetDeviceBinding_licenseeId_idx" ON "FleetDeviceBinding"("licenseeId");

-- CreateIndex
CREATE INDEX "FleetDeviceBinding_assetId_idx" ON "FleetDeviceBinding"("assetId");

-- AddForeignKey
ALTER TABLE "FleetDataProvider" ADD CONSTRAINT "FleetDataProvider_schemaVersionId_fkey" FOREIGN KEY ("schemaVersionId") REFERENCES "FleetSchemaVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetDataProvider" ADD CONSTRAINT "FleetDataProvider_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetDeviceBinding" ADD CONSTRAINT "FleetDeviceBinding_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "FleetDataProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetDeviceBinding" ADD CONSTRAINT "FleetDeviceBinding_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetDeviceBinding" ADD CONSTRAINT "FleetDeviceBinding_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Device bindings belong to a client: licensee isolation. Providers are platform configuration
-- managed by administrators and are never exposed to clients.
ALTER TABLE "FleetDeviceBinding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetDeviceBinding" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetDeviceBinding"
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR "licenseeId" = current_setting('app.current_licensee_id', true)
  );

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ghg_app_user;
