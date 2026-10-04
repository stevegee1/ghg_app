/** Options offered on the partner forms. The server validates against the same ids. */
export const DELIVERY_CAPABILITIES = [
  { id: 'DELIVERY_CARGO_BIKE', label: 'Cargo bike delivery' },
  { id: 'DELIVERY_EV_VAN', label: 'Electric van delivery' },
  { id: 'DELIVERY_VAN', label: 'Van or courier delivery' },
  { id: 'DELIVERY_SAME_DAY', label: 'Same-day delivery' },
];

export const PRODUCTION_CAPABILITIES = [
  { id: 'DTG', label: 'Direct-to-garment printing' },
  { id: 'WATER_BASED_SCREEN', label: 'Water-based screen printing' },
  { id: 'EMBROIDERY', label: 'Embroidery' },
  { id: 'ECO_WAREHOUSING', label: 'Storage and pick-pack' },
];

export const CAPACITY_BANDS = [
  { id: 'UNDER_500', label: 'Under 500 orders a month' },
  { id: '500_2000', label: '500 to 2,000 a month' },
  { id: '2000_10000', label: '2,000 to 10,000 a month' },
  { id: 'OVER_10000', label: 'Over 10,000 a month' },
];

export const CERTIFICATIONS = [
  { id: 'ISO_14001', label: 'ISO 14001' },
  { id: 'B_CORP', label: 'B Corp' },
  { id: 'GOTS', label: 'GOTS' },
  { id: 'OEKO_TEX', label: 'OEKO-TEX Standard 100' },
  { id: 'FAIR_WEAR', label: 'Fair Wear / ETI' },
];
