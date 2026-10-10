-- Scope 3 supply chains: stage records from raw material to delivery, entered by the client or by
-- invited suppliers, append-only and fingerprinted for blockchain anchoring.
CREATE TYPE "Scope3Category" AS ENUM ('PURCHASED_GOODS_AND_SERVICES', 'CAPITAL_GOODS', 'FUEL_AND_ENERGY_RELATED', 'UPSTREAM_TRANSPORTATION', 'WASTE_IN_OPERATIONS');
CREATE TYPE "Scope3Stage" AS ENUM ('RAW_MATERIAL', 'PROCESSING', 'MANUFACTURING', 'TRANSPORT', 'DELIVERY');
CREATE TYPE "Scope3EnteredBy" AS ENUM ('CLIENT', 'SUPPLIER');

CREATE TABLE "Scope3Chain" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "Scope3Category" NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scope3Chain_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Scope3Chain_licenseeId_name_key" ON "Scope3Chain"("licenseeId", "name");
CREATE INDEX "Scope3Chain_licenseeId_idx" ON "Scope3Chain"("licenseeId");
ALTER TABLE "Scope3Chain" ADD CONSTRAINT "Scope3Chain_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scope3Chain" ADD CONSTRAINT "Scope3Chain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FleetProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Scope3Record" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "stage" "Scope3Stage" NOT NULL,
    "description" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "quantity" DECIMAL(16,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "factorKgCo2ePerUnit" DECIMAL(14,6) NOT NULL,
    "factorSource" TEXT NOT NULL,
    "kgCo2e" DECIMAL(18,4) NOT NULL,
    "occurredOn" DATE NOT NULL,
    "enteredBy" "Scope3EnteredBy" NOT NULL,
    "enteredByUserId" TEXT,
    "inviteId" TEXT,
    "supersedesId" TEXT,
    "recordSha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scope3Record_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Scope3Record_positive" CHECK ("quantity" > 0 AND "factorKgCo2ePerUnit" >= 0 AND "kgCo2e" >= 0),
    CONSTRAINT "Scope3Record_hash_hex" CHECK ("recordSha256" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "Scope3Record_supersedesId_key" ON "Scope3Record"("supersedesId");
CREATE INDEX "Scope3Record_licenseeId_chainId_occurredOn_idx" ON "Scope3Record"("licenseeId", "chainId", "occurredOn");
-- Records go only when their client account is deleted (chain cascade); the app never deletes one record.
ALTER TABLE "Scope3Record" ADD CONSTRAINT "Scope3Record_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Scope3Chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scope3Record" ADD CONSTRAINT "Scope3Record_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Scope3Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "scope3_record_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Scope 3 records cannot be changed; add a correcting record instead';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Scope3Record_no_update" BEFORE UPDATE ON "Scope3Record" FOR EACH ROW EXECUTE FUNCTION "scope3_record_immutable"();

CREATE TABLE "Scope3SupplierInvite" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "supplierEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scope3SupplierInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Scope3SupplierInvite_tokenHash_key" ON "Scope3SupplierInvite"("tokenHash");
CREATE INDEX "Scope3SupplierInvite_licenseeId_chainId_idx" ON "Scope3SupplierInvite"("licenseeId", "chainId");
ALTER TABLE "Scope3SupplierInvite" ADD CONSTRAINT "Scope3SupplierInvite_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Scope3Chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security: licensee isolation
ALTER TABLE "Scope3Chain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scope3Chain" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "Scope3Chain"
  USING (current_setting('app.is_admin', true) = 'true' OR "licenseeId" = current_setting('app.current_licensee_id', true));
ALTER TABLE "Scope3Record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scope3Record" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "Scope3Record"
  USING (current_setting('app.is_admin', true) = 'true' OR "licenseeId" = current_setting('app.current_licensee_id', true));
ALTER TABLE "Scope3SupplierInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scope3SupplierInvite" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "Scope3SupplierInvite"
  USING (current_setting('app.is_admin', true) = 'true' OR "licenseeId" = current_setting('app.current_licensee_id', true));
