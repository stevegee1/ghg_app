export type FleetAssetCategory =
  | 'EXCAVATOR'
  | 'DUMPER'
  | 'DUMP_TRUCK'
  | 'WHEEL_LOADER'
  | 'CRANE'
  | 'TELEHANDLER'
  | 'ROLLER'
  | 'GENERATOR'
  | 'HGV'
  | 'LIGHT_COMMERCIAL_VEHICLE'
  | 'CAR'
  | 'OTHER';

export type FleetOwnership = 'OWNED' | 'LEASED' | 'RENTED_IN' | 'RENTED_OUT';

export type FleetFuelType =
  | 'DIESEL_AVERAGE_BIOFUEL_BLEND'
  | 'DIESEL_MINERAL'
  | 'PETROL_AVERAGE_BIOFUEL_BLEND'
  | 'PETROL_MINERAL'
  | 'HVO'
  | 'LPG';

export type FleetSubscriptionStatus = 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'UNPAID' | 'CANCELED';

export const FLEET_CATEGORY_LABELS: Record<FleetAssetCategory, string> = {
  EXCAVATOR: 'Excavator',
  DUMPER: 'Dumper',
  DUMP_TRUCK: 'Dump truck',
  WHEEL_LOADER: 'Wheel loader',
  CRANE: 'Crane',
  TELEHANDLER: 'Telehandler',
  ROLLER: 'Roller',
  GENERATOR: 'Generator',
  HGV: 'HGV',
  LIGHT_COMMERCIAL_VEHICLE: 'Light commercial vehicle',
  CAR: 'Car',
  OTHER: 'Other',
};

export const FLEET_OWNERSHIP_LABELS: Record<FleetOwnership, string> = {
  OWNED: 'Owned',
  LEASED: 'Leased',
  RENTED_IN: 'Rented in',
  RENTED_OUT: 'Rented out',
};

export const FLEET_FUEL_LABELS: Record<FleetFuelType, string> = {
  DIESEL_AVERAGE_BIOFUEL_BLEND: 'Diesel (average biofuel blend)',
  DIESEL_MINERAL: 'Diesel (100% mineral)',
  PETROL_AVERAGE_BIOFUEL_BLEND: 'Petrol (average biofuel blend)',
  PETROL_MINERAL: 'Petrol (100% mineral)',
  HVO: 'HVO',
  LPG: 'LPG',
};

export interface FleetAsset {
  id: string;
  assetTag: string;
  name: string;
  category: FleetAssetCategory;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  fuelType: FleetFuelType;
  ownership: FleetOwnership;
  operationalControl: boolean;
  siteName: string | null;
  active: boolean;
  connectionBranch: FleetConnectionBranch;
  connectionConfirmedAt: string | null;
  _count?: { readings: number };
}

export type FleetConnectionBranch = 'UNCONFIRMED' | 'CLOUD_CONNECTED' | 'TRACKING_DEVICE' | 'MANUAL';

export const FLEET_CONNECTION_OPTIONS: { id: Exclude<FleetConnectionBranch, 'UNCONFIRMED'>; label: string; help: string }[] = [
  { id: 'CLOUD_CONNECTED', label: 'Connected to a cloud', help: 'It already reports to the manufacturer or a telematics provider. We pull its data from there.' },
  { id: 'TRACKING_DEVICE', label: 'Needs a tracking device', help: 'It does not report anywhere yet. We fit a tracker and book a short set-up call.' },
  { id: 'MANUAL', label: 'Fuel cards or uploads only', help: 'You send its fuel through fuel-card files or CSV uploads.' },
];

export const FLEET_CONNECTION_LABELS: Record<FleetConnectionBranch, string> = {
  UNCONFIRMED: 'Not confirmed',
  CLOUD_CONNECTED: 'Cloud connected',
  TRACKING_DEVICE: 'Tracking device',
  MANUAL: 'Uploads only',
};

export type FleetSetupRequestStatus = 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface FleetConnectionOverview {
  counts: Record<FleetConnectionBranch, number>;
  onboardingCloudConnection: 'ALL' | 'SOME' | 'NONE' | 'NOT_SURE' | null;
  setupRequests: { id: string; assetIds: string[]; status: FleetSetupRequestStatus; scheduledFor: string | null; preferredTimes: string | null; createdAt: string }[];
}

export interface FleetSetupRequestInput {
  assetIds: string[];
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  preferredTimes?: string;
  notes?: string;
}

export interface AdminFleetSetupRequest {
  id: string;
  licensee: { id: string; name: string };
  assets: { id: string; assetTag: string; name: string; make: string | null; model: string | null }[];
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  preferredTimes: string | null;
  notes: string | null;
  status: FleetSetupRequestStatus;
  scheduledFor: string | null;
  adminNotes: string | null;
  createdAt: string;
}

export interface FleetAssetInput {
  assetTag: string;
  name: string;
  category: FleetAssetCategory;
  fuelType: FleetFuelType;
  ownership: FleetOwnership;
  operationalControl: boolean;
  make?: string;
  model?: string;
  serialNumber?: string;
  siteName?: string;
}

export interface FleetOverview {
  activeAssets: number;
  totalAssets: number;
  entitlementStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | null;
  /** False when Fleet does not charge in this environment: no subscription or price is shown. */
  billingEnabled: boolean;
  subscription: { status: FleetSubscriptionStatus; quantity: number; currentPeriodEnd: string | null } | null;
  lastImportAt: string | null;
  lastTelemetryAt: string | null;
  unconfirmedAssets: number;
}

export type FleetApiScope = 'telemetry:write' | 'fleet:read';

export interface FleetApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: FleetApiScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface RowRejection {
  line: number;
  reason: string;
}

export interface FleetImportResult {
  batchId: string | null;
  rowsReceived: number;
  rowsAccepted: number;
  rowsRejected: number;
  rejections: RowRejection[];
  totalKgCo2e: string;
}

export interface FleetAssetImportResult {
  rowsReceived: number;
  created: number;
  rejections: RowRejection[];
  billingSynced: boolean;
}

export interface FleetImportBatch {
  id: string;
  source: 'CSV_UPLOAD' | 'FUEL_CARD' | 'ISO_15143_3' | 'PARTNER_API';
  fileName: string;
  rowsReceived: number;
  rowsAccepted: number;
  rowsRejected: number;
  rejections: RowRejection[];
  createdAt: string;
}

export interface FleetTotals {
  fuelLitres: string;
  kgCo2e: string;
  engineHours: string;
  idleHours: string;
  idleSharePct: string | null;
}

export interface FleetSummary {
  period: { from: string; to: string };
  scope1: FleetTotals;
  scope3: FleetTotals;
  byAsset: (FleetTotals & { assetId: string; assetTag: string; name: string; siteName: string | null; scope: 'SCOPE_1' | 'SCOPE_3' })[];
  bySite: (FleetTotals & { siteName: string })[];
  byMonth: (FleetTotals & { month: string })[];
  coverage: { activeAssets: number; assetsWithData: number };
  factorsUsed: { source: string; publicationYear: number; fuelType: FleetFuelType; kgCo2ePerUnit: string; unit: string; citation: string }[];
}

export interface FleetEstimate {
  kgCo2e: string;
  isEstimate: true;
  factor: { source: string; publicationYear: number; kgCo2ePerUnit: string; unit: string; citation: string };
}

export interface EmissionFactorRecord {
  id: string;
  source: string;
  publicationYear: number;
  fuelType: FleetFuelType;
  unit: string;
  kgCo2ePerUnit: string;
  citation: string;
  createdAt: string;
  retiredAt: string | null;
  createdBy: { email: string };
}

export interface EmissionFactorInput {
  source: string;
  publicationYear: number;
  fuelType: FleetFuelType;
  kgCo2ePerUnit: string;
  citation: string;
}

export type FleetProviderAuthType = 'DEVICE_SHARED_KEY' | 'DEVICE_HMAC_SHA256';

export interface AdminFleetProvider {
  id: string;
  name: string;
  kind: 'TRACKING_DEVICE' | 'OEM_CLOUD';
  authType: FleetProviderAuthType;
  authConfig: { headerName?: string; signatureHeader?: string; timestampHeader?: string; toleranceSeconds?: number };
  fieldMapping: unknown;
  schemaVersionId: string;
  active: boolean;
  hasSecret: boolean;
  activeBindings?: number;
  createdAt: string;
}

export interface AdminFleetBinding {
  id: string;
  externalDeviceId: string;
  active: boolean;
  createdAt: string;
  deactivatedAt: string | null;
  asset: { id: string; assetTag: string; name: string };
  licensee: { id: string; name: string };
  provider: { id: string; name: string };
}

export interface AdminTrackingAsset {
  id: string;
  assetTag: string;
  name: string;
  make: string | null;
  model: string | null;
  licensee: { id: string; name: string };
  bindings: { id: string; externalDeviceId: string; provider: { name: string } }[];
}

export type MappingTestResult =
  | { index: number; ok: true; externalDeviceId: string; snapshot: Record<string, unknown> }
  | { index: number; ok: false; error: string };

export interface FleetProjectAssignment {
  id: string;
  assetId: string;
  fromDate: string;
  toDate: string | null;
  asset: { id: string; assetTag: string; name: string };
}

export interface FleetProject {
  id: string;
  name: string;
  reference: string | null;
  contractValuePence: number;
  budgetedMarginBps: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  status: 'ACTIVE' | 'CLOSED';
  assignments: FleetProjectAssignment[];
}

export interface FleetProjectInput {
  name: string;
  reference?: string | null;
  contractValuePence: number;
  budgetedMarginBps: number;
  currency: string;
  startDate: string;
  endDate?: string | null;
}

export interface FleetProjectMaterial {
  id: string;
  indexId: string;
  name: string;
  unit: string;
  quantity: string;
  budgetUnitPrice: string;
}

export interface FleetCostResults {
  currency: string;
  fuel: { litres: string; costPence: number; unpricedLitres: string };
  carbon: { tonnesCo2e: string; costPence: number; unpricedTonnesCo2e: string };
  idle: { hours: string; fuelCostPence: number };
  operatingHours: string;
  operatingCostPence: number;
  costPerOperatingHourPence: number | null;
  materials: { indexCode: string; name: string; unit: string; quantity: string; budgetUnitPrice: string; currentUnitPrice: string | null; exposurePence: number | null }[];
  materialExposurePence: number;
  totalExposurePence: number;
  budgetedMarginPence: number;
  exposureShareOfMarginPercent: string | null;
  marginAfterExposurePence: number;
  byAsset: { assetId: string; assetTag: string; name: string; litres: string; tonnesCo2e: string; operatingHours: string; costPence: number; costPerOperatingHourPence: number | null }[];
  warnings: string[];
}

export interface FleetCostRun {
  id: string;
  periodFrom: string;
  periodTo: string;
  methodVersion: string;
  results: FleetCostResults;
  recordSha256: string;
  createdAt: string;
}

export interface WeatherThresholdSet {
  id: string;
  version: string;
  heatAboveC: string;
  frostBelowC: string;
  heavyRainMmPerHour: string;
  highWindKmh: string;
  source: string;
  active: boolean;
  createdAt: string;
}

export interface FleetWeatherSummary {
  configured: boolean;
  activeThresholds: WeatherThresholdSet | null;
  thresholdVersions: string[];
  source: string;
  assets: {
    assetId: string;
    assetTag: string;
    name: string;
    category: string;
    daysMeasured: number;
    operatingHours: string;
    heatHours: string;
    frostHours: string;
    heavyRainHours: string;
    highWindHours: string;
  }[];
}

export interface FleetAssetFinance {
  assetId: string;
  currency: string;
  acquisitionCostPence: number;
  acquisitionDate: string;
  expectedLifeYears: string;
  expectedLifeHours: string | null;
  residualValuePence: number;
}

export interface FleetAssetFinanceRow {
  assetId: string;
  assetTag: string;
  name: string;
  category: string;
  active: boolean;
  finance: FleetAssetFinance | null;
}

export interface FleetValuation {
  id: string;
  assetId: string;
  asOf: string;
  methodVersion: string;
  recordSha256: string;
  createdAt: string;
  inputs: { wearCoefficients: { version: string; source: string } | null; weatherThresholdVersions: string[] };
  results: {
    currency: string;
    estimatedValuePence: number;
    valueLostPence: number;
    baseWearPence: number;
    weatherWearPence: number;
    baseWearBasis: 'OPERATING_HOURS' | 'AGE';
    operatingHours: string;
    ageYears: string;
    fuel: { litres: string; costPence: number; unpricedLitres: string };
    carbon: { tonnesCo2e: string; costPence: number };
    totalCostOfOwnershipPence: number;
    tcoPerOperatingHourPence: number | null;
    notIncluded: string[];
    warnings: string[];
  };
}

export interface WearCoefficientSetView {
  id: string;
  version: string;
  source: string;
  active: boolean;
  createdAt: string;
  coefficients: { category: string; heatPctPerHour: string; frostPctPerHour: string; rainPctPerHour: string; windPctPerHour: string }[];
}
