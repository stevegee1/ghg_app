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
  _count?: { readings: number };
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
  subscription: { status: FleetSubscriptionStatus; quantity: number; currentPeriodEnd: string | null } | null;
  lastImportAt: string | null;
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
