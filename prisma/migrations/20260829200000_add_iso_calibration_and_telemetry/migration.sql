-- CreateEnum
CREATE TYPE "SensorType" AS ENUM ('ELECTRICITY_SUB_METER', 'WATER_FLOW_METER', 'GAS_CHROMATOGRAPH', 'THERMAL_FLOW_METER', 'EMISSIONS_CEMS');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('PUE', 'WUE', 'MWH_LOAD', 'H2_PURITY_PCT', 'THERMAL_KW', 'CO2_PPM');

-- CreateTable
CREATE TABLE "AssetCalibrationRecord" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "sensorType" "SensorType" NOT NULL,
    "calibrationDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "certDocumentUrl" TEXT NOT NULL,
    "certIntegrityHash" TEXT NOT NULL,
    "isCurrentlyValid" BOOLEAN NOT NULL DEFAULT true,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetCalibrationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryLog" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetCalibrationId" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "numericValue" DOUBLE PRECISION NOT NULL,
    "rawUnit" TEXT NOT NULL,
    "isWithinBaseline" BOOLEAN NOT NULL DEFAULT true,
    "requiresSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "rawTelemetryJson" JSONB,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetCalibrationRecord_licenseeId_assetTag_idx" ON "AssetCalibrationRecord"("licenseeId", "assetTag");

-- CreateIndex
CREATE INDEX "AssetCalibrationRecord_expiryDate_isCurrentlyValid_idx" ON "AssetCalibrationRecord"("expiryDate", "isCurrentlyValid");

-- CreateIndex
CREATE UNIQUE INDEX "TelemetryLog_transactionId_key" ON "TelemetryLog"("transactionId");

-- CreateIndex
CREATE INDEX "TelemetryLog_licenseeId_metricType_idx" ON "TelemetryLog"("licenseeId", "metricType");

-- CreateIndex
CREATE INDEX "TelemetryLog_assetTag_createdAt_idx" ON "TelemetryLog"("assetTag", "createdAt");

-- AddForeignKey
ALTER TABLE "AssetCalibrationRecord" ADD CONSTRAINT "AssetCalibrationRecord_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryLog" ADD CONSTRAINT "TelemetryLog_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "Licensee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryLog" ADD CONSTRAINT "TelemetryLog_assetCalibrationId_fkey" FOREIGN KEY ("assetCalibrationId") REFERENCES "AssetCalibrationRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryLog" ADD CONSTRAINT "TelemetryLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create PostgreSQL Trigger Function for Mandatory Calibration Gatekeeper
CREATE OR REPLACE FUNCTION check_active_calibration_on_telemetry()
RETURNS TRIGGER AS $$
DECLARE
  calib_rec RECORD;
BEGIN
  -- Fetch the calibration record
  SELECT "expiryDate", "isCurrentlyValid", "licenseeId", "assetTag" 
  INTO calib_rec 
  FROM "AssetCalibrationRecord" 
  WHERE id = NEW."assetCalibrationId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Telemetry ingestion rejected: AssetCalibrationRecord (%) does not exist.', NEW."assetCalibrationId";
  END IF;

  IF calib_rec."licenseeId" != NEW."licenseeId" THEN
    RAISE EXCEPTION 'Telemetry ingestion rejected: Calibration record licensee mismatch.';
  END IF;

  IF calib_rec."isCurrentlyValid" = FALSE THEN
    RAISE EXCEPTION 'Telemetry ingestion rejected: Calibration certificate for asset % is marked invalid.', calib_rec."assetTag";
  END IF;

  IF calib_rec."expiryDate" < NOW() THEN
    RAISE EXCEPTION 'Telemetry ingestion rejected: Calibration certificate for asset % expired on % under ISO 50001/14001 Class 35 rules.',
      calib_rec."assetTag", calib_rec."expiryDate";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to TelemetryLog table
CREATE TRIGGER enforce_active_calibration_on_telemetry
BEFORE INSERT OR UPDATE ON "TelemetryLog"
FOR EACH ROW EXECUTE FUNCTION check_active_calibration_on_telemetry();
