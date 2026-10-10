-- Market inputs for costing contract activity. Index definitions only; values come from the UK
-- weekly road fuel price feed or are entered by administrators with their source and date.
CREATE TYPE "MarketIndexCategory" AS ENUM ('FUEL', 'CARBON', 'MATERIAL');
CREATE TYPE "MarketIndexFeed" AS ENUM ('MANUAL', 'UK_WEEKLY_ROAD_FUEL');

CREATE TABLE "MarketIndex" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MarketIndexCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "fuelTypes" "FleetFuelType"[],
    "feed" "MarketIndexFeed" NOT NULL DEFAULT 'MANUAL',
    "feedColumn" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketIndex_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketIndex_code_key" ON "MarketIndex"("code");

CREATE TABLE "MarketIndexValue" (
    "id" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "value" DECIMAL(14,6) NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "enteredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketIndexValue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MarketIndexValue_value_positive" CHECK ("value" > 0)
);
CREATE UNIQUE INDEX "MarketIndexValue_indexId_effectiveDate_key" ON "MarketIndexValue"("indexId", "effectiveDate");
CREATE INDEX "MarketIndexValue_indexId_effectiveDate_idx" ON "MarketIndexValue"("indexId", "effectiveDate");
ALTER TABLE "MarketIndexValue" ADD CONSTRAINT "MarketIndexValue_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "MarketIndex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MarketIndex" ("id", "code", "name", "category", "unit", "currency", "fuelTypes", "feed", "feedColumn", "source", "sourceUrl") VALUES
('mkt_uk_diesel', 'UK_DIESEL_EX_VAT', 'UK diesel pump price excluding VAT', 'FUEL', 'GBP_PER_LITRE', 'GBP',
 ARRAY['DIESEL_AVERAGE_BIOFUEL_BLEND', 'DIESEL_MINERAL']::"FleetFuelType"[], 'UK_WEEKLY_ROAD_FUEL', 'ULSD',
 'Department for Energy Security and Net Zero, Weekly road fuel prices (ULSD pump price less VAT)', 'https://www.gov.uk/government/statistics/weekly-road-fuel-prices'),
('mkt_uk_petrol', 'UK_PETROL_EX_VAT', 'UK petrol pump price excluding VAT', 'FUEL', 'GBP_PER_LITRE', 'GBP',
 ARRAY['PETROL_AVERAGE_BIOFUEL_BLEND', 'PETROL_MINERAL']::"FleetFuelType"[], 'UK_WEEKLY_ROAD_FUEL', 'ULSP',
 'Department for Energy Security and Net Zero, Weekly road fuel prices (ULSP pump price less VAT)', 'https://www.gov.uk/government/statistics/weekly-road-fuel-prices'),
('mkt_hvo', 'UK_HVO_EX_VAT', 'HVO price excluding VAT', 'FUEL', 'GBP_PER_LITRE', 'GBP',
 ARRAY['HVO']::"FleetFuelType"[], 'MANUAL', NULL, 'Supplier price or published HVO index, entered by an administrator', NULL),
('mkt_lpg', 'UK_LPG_EX_VAT', 'LPG price excluding VAT', 'FUEL', 'GBP_PER_LITRE', 'GBP',
 ARRAY['LPG']::"FleetFuelType"[], 'MANUAL', NULL, 'Supplier price or published LPG index, entered by an administrator', NULL),
('mkt_uk_ets', 'UK_ETS_CARBON_PRICE', 'UK ETS carbon price', 'CARBON', 'GBP_PER_TONNE_CO2E', 'GBP',
 ARRAY[]::"FleetFuelType"[], 'MANUAL', NULL, 'UK Emissions Trading Scheme auction clearing price, entered by an administrator', 'https://www.gov.uk/government/publications/participating-in-the-uk-ets'),
('mkt_steel_rebar', 'UK_STEEL_REBAR', 'Steel reinforcing bar', 'MATERIAL', 'GBP_PER_TONNE', 'GBP',
 ARRAY[]::"FleetFuelType"[], 'MANUAL', NULL, 'Published steel price index or supplier quotation, entered by an administrator', NULL),
('mkt_ready_mix', 'UK_READY_MIX_CONCRETE', 'Ready-mixed concrete', 'MATERIAL', 'GBP_PER_M3', 'GBP',
 ARRAY[]::"FleetFuelType"[], 'MANUAL', NULL, 'Published concrete price index or supplier quotation, entered by an administrator', NULL);
