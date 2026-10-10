export type MerchProductKind = 'CATALOGUE' | 'CUSTOM_GARMENT' | 'EVENT_SOUVENIR';

/** A merch item as the store shows it. A null price means the item is sold by enquiry only. */
export interface MerchProduct {
  id: string;
  kind: MerchProductKind;
  title: string;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  imagePosition: string | null;
  pricePence: number | null;
  currency: string;
  lcaGrams: number | null;
  laborHours: number | null;
}

/** The administrator's view, with internal fields. */
export interface AdminMerchProduct extends MerchProduct {
  supplierCostPence: number | null;
  licenseeId: string;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}
