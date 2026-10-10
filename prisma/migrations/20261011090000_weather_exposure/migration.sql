-- Weather exposure: hours each machine worked in harsh conditions, against versioned thresholds.
CREATE TABLE "WeatherThresholdSet" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "heatAboveC" DECIMAL(5,2) NOT NULL,
    "frostBelowC" DECIMAL(5,2) NOT NULL,
    "heavyRainMmPerHour" DECIMAL(6,2) NOT NULL,
    "highWindKmh" DECIMAL(6,2) NOT NULL,
    "source" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeatherThresholdSet_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WeatherThresholdSet_sane" CHECK ("frostBelowC" < "heatAboveC" AND "heavyRainMmPerHour" > 0 AND "highWindKmh" > 0)
);
CREATE UNIQUE INDEX "WeatherThresholdSet_version_key" ON "WeatherThresholdSet"("version");
-- At most one active set.
CREATE UNIQUE INDEX "WeatherThresholdSet_one_active" ON "WeatherThresholdSet"("active") WHERE "active" = true;

CREATE OR REPLACE FUNCTION "weather_threshold_immutable"() RETURNS trigger AS $$
BEGIN
  IF NEW."version" <> OLD."version" OR NEW."heatAboveC" <> OLD."heatAboveC" OR NEW."frostBelowC" <> OLD."frostBelowC"
     OR NEW."heavyRainMmPerHour" <> OLD."heavyRainMmPerHour" OR NEW."highWindKmh" <> OLD."highWindKmh" THEN
    RAISE EXCEPTION 'Threshold values cannot be changed; publish a new version instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "WeatherThresholdSet_values_fixed" BEFORE UPDATE ON "WeatherThresholdSet" FOR EACH ROW EXECUTE FUNCTION "weather_threshold_immutable"();

CREATE TABLE "FleetWeatherExposure" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "operatingHours" DECIMAL(8,3) NOT NULL,
    "heatHours" DECIMAL(8,3) NOT NULL,
    "frostHours" DECIMAL(8,3) NOT NULL,
    "heavyRainHours" DECIMAL(8,3) NOT NULL,
    "highWindHours" DECIMAL(8,3) NOT NULL,
    "thresholdSetId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FleetWeatherExposure_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FleetWeatherExposure_assetId_date_key" ON "FleetWeatherExposure"("assetId", "date");
CREATE INDEX "FleetWeatherExposure_licenseeId_date_idx" ON "FleetWeatherExposure"("licenseeId", "date");
ALTER TABLE "FleetWeatherExposure" ADD CONSTRAINT "FleetWeatherExposure_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FleetAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FleetWeatherExposure" ADD CONSTRAINT "FleetWeatherExposure_thresholdSetId_fkey" FOREIGN KEY ("thresholdSetId") REFERENCES "WeatherThresholdSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FleetWeatherExposure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FleetWeatherExposure" FORCE ROW LEVEL SECURITY;
CREATE POLICY licensee_isolation ON "FleetWeatherExposure"
  USING (current_setting('app.is_admin', true) = 'true' OR "licenseeId" = current_setting('app.current_licensee_id', true));
