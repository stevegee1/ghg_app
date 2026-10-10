export type Scope3Category =
  | 'PURCHASED_GOODS_AND_SERVICES'
  | 'CAPITAL_GOODS'
  | 'FUEL_AND_ENERGY_RELATED'
  | 'UPSTREAM_TRANSPORTATION'
  | 'WASTE_IN_OPERATIONS';

export type Scope3Stage = 'RAW_MATERIAL' | 'PROCESSING' | 'MANUFACTURING' | 'TRANSPORT' | 'DELIVERY';

export const SCOPE3_CATEGORY_LABELS: Record<Scope3Category, string> = {
  PURCHASED_GOODS_AND_SERVICES: 'Purchased goods and services (category 1)',
  CAPITAL_GOODS: 'Capital goods (category 2)',
  FUEL_AND_ENERGY_RELATED: 'Fuel and energy related (category 3)',
  UPSTREAM_TRANSPORTATION: 'Upstream transport (category 4)',
  WASTE_IN_OPERATIONS: 'Waste in operations (category 5)',
};

export const SCOPE3_STAGE_LABELS: Record<Scope3Stage, string> = {
  RAW_MATERIAL: 'Raw material',
  PROCESSING: 'Processing',
  MANUFACTURING: 'Manufacturing',
  TRANSPORT: 'Transport',
  DELIVERY: 'Delivery',
};

export interface Scope3ChainSummary {
  id: string;
  name: string;
  category: Scope3Category;
  project: { id: string; name: string } | null;
  recordCount: number;
  kgCo2e: string;
}

export interface Scope3Record {
  id: string;
  stage: Scope3Stage;
  description: string;
  supplierName: string;
  quantity: string;
  unit: string;
  factorKgCo2ePerUnit: string;
  factorSource: string;
  kgCo2e: string;
  occurredOn: string;
  enteredBy: 'CLIENT' | 'SUPPLIER';
  supersedesId: string | null;
  superseded: boolean;
  recordSha256: string;
}

export interface Scope3ChainDetail {
  id: string;
  name: string;
  category: Scope3Category;
  project: { id: string; name: string } | null;
  records: Scope3Record[];
  invites: { id: string; supplierEmail: string; expiresAt: string }[];
}

export interface Scope3RecordInput {
  stage: Scope3Stage;
  description: string;
  supplierName: string;
  quantity: string;
  unit: string;
  factorKgCo2ePerUnit: string;
  factorSource: string;
  occurredOn: string;
  supersedesId?: string;
}
