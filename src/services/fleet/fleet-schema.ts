/**
 * The standard Fleet data schema. Every source (client API, manufacturer cloud, tracking device)
 * is normalised to these ISO 15143-3 (AEMP 2.0) data elements before anything is calculated.
 * A change to the field set is a new version with a new id; the migration that publishes a
 * version inserts exactly this specification.
 */
export const FLEET_SCHEMA_VERSION_ID = 'aemp2-2026.1';

export interface FleetSchemaField {
  field: string;
  iso15143Element: string;
  unit: string;
  description: string;
}

export const FLEET_SCHEMA_FIELDS: FleetSchemaField[] = [
  { field: 'observedAt', iso15143Element: 'Snapshot time', unit: 'ISO 8601 UTC', description: 'When the machine recorded the values.' },
  { field: 'cumulativeOperatingHours', iso15143Element: 'Cumulative Operating Hours', unit: 'hour', description: 'Engine hours meter.' },
  { field: 'cumulativeIdleHours', iso15143Element: 'Cumulative Idle Hours', unit: 'hour', description: 'Idle hours meter.' },
  { field: 'cumulativeFuelUsedLitres', iso15143Element: 'Fuel Used', unit: 'litre', description: 'Lifetime fuel used meter.' },
  { field: 'fuelRemainingPercent', iso15143Element: 'Fuel Remaining', unit: 'percent', description: 'Fuel level, 0 to 100.' },
  { field: 'odometerKm', iso15143Element: 'Distance', unit: 'kilometre', description: 'Odometer.' },
  { field: 'engineRunning', iso15143Element: 'Engine Status', unit: 'boolean', description: 'Engine running at the snapshot time.' },
  { field: 'latitude', iso15143Element: 'Location', unit: 'decimal degrees (WGS 84)', description: 'Latitude, -90 to 90.' },
  { field: 'longitude', iso15143Element: 'Location', unit: 'decimal degrees (WGS 84)', description: 'Longitude, -180 to 180.' },
  { field: 'altitudeM', iso15143Element: 'Location', unit: 'metre', description: 'Altitude.' },
  { field: 'faultCodes', iso15143Element: 'Fault Codes', unit: 'code list', description: 'Active fault or caution codes with severity.' },
];

export const FLEET_SCHEMA_STANDARD = 'ISO 15143-3:2016 (AEMP 2.0 telematics data)';
