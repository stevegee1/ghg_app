/**
 * Role and industry choices, matching the PrimaryRole and IndustrySector enums in the database.
 * The server rejects any other value, so every form must offer exactly these.
 */
export const PRIMARY_ROLE_OPTIONS = [
  { value: 'COMPLIANCE_OFFICER', label: 'CSO / Sustainability Lead' },
  { value: 'FINANCE_DIRECTOR', label: 'CFO / Finance Director' },
  { value: 'OPERATIONS_DIRECTOR', label: 'COO / Operations Director' },
  { value: 'LEGAL_OFFICER', label: 'General Counsel / Legal Officer' },
  { value: 'SUSTAINABILITY_CONSULTANT', label: 'ESG Consultant / Advisor' },
  { value: 'IT_DATA_MANAGER', label: 'IT and Data Systems Lead' },
  { value: 'OTHER', label: 'Other leadership role' },
] as const;

export const INDUSTRY_SECTOR_OPTIONS = [
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'DATA_CENTRE', label: 'Data centres and HPC' },
  { value: 'CONSTRUCTION', label: 'Construction and built environment' },
  { value: 'LOGISTICS_TRANSPORT', label: 'Logistics and fleet' },
  { value: 'GREEN_HYDROGEN', label: 'Green hydrogen and clean fuels' },
  { value: 'RETAIL_CONSUMER_GOODS', label: 'Consumer goods and retail' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial services' },
  { value: 'PUBLIC_SECTOR', label: 'Public sector and health' },
  { value: 'EVENTS_HOSPITALITY', label: 'Events and hospitality' },
  { value: 'REAL_ESTATE_PROPERTY', label: 'Property and real estate' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'OTHER', label: 'Other sector' },
] as const;
