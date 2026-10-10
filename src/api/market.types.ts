export type MarketIndexCategory = 'FUEL' | 'CARBON' | 'MATERIAL';

export interface MarketIndex {
  id: string;
  code: string;
  name: string;
  category: MarketIndexCategory;
  unit: string;
  currency: string;
  feed: 'MANUAL' | 'UK_WEEKLY_ROAD_FUEL';
  source: string;
  sourceUrl: string | null;
  active: boolean;
  latest: { effectiveDate: string; value: string } | null;
}

export interface MarketIndexValue {
  id: string;
  effectiveDate: string;
  value: string;
  sourceReference: string;
  enteredByUserId: string | null;
}
