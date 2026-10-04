import type { FleetAssetCategory } from '../../api/fleet.types';

export type ClientService = 'GHG' | 'WORKFORCE' | 'FLEET';

export const SERVICE_OPTIONS: { id: ClientService; title: string; summary: string }[] = [
  {
    id: 'GHG',
    title: 'GHG',
    summary: 'Greenhouse gas reporting and audit readiness: SECR, ISO 14064-1, ISO 50001, Carbon Reduction Plans and green claims.',
  },
  {
    id: 'WORKFORCE',
    title: 'Workforce',
    summary: 'Section 106 planning obligations and Social Value: local jobs, apprenticeships and fair work evidence.',
  },
  {
    id: 'FLEET',
    title: 'Fleet',
    summary: 'Fuel, runtime and CO2 from your equipment and vehicles in one dashboard, reported by GHG Protocol scope.',
  },
];

export interface YesNoQuestionDef<K extends string> {
  key: K;
  label: string;
  help: string;
}

export type GhgAnswerKey =
  | 'hasPhysicalSites'
  | 'hasProductionProcess'
  | 'hasFleet'
  | 'hasIoTMeters'
  | 'isUKPublicContractor'
  | 'makesPublicGreenClaims'
  | 'hasGreenHydrogen';

export type WorkforceAnswerKey = 'isUKPublicContractor' | 'hasPlanningConsent';

export const GHG_QUESTIONS: YesNoQuestionDef<GhgAnswerKey>[] = [
  { key: 'hasPhysicalSites', label: 'Do you own or operate buildings, sites or facilities?', help: 'Offices, depots, factories or yards whose energy use you control.' },
  { key: 'hasProductionProcess', label: 'Do you manufacture or process physical goods?', help: 'Production lines, plant or processing equipment.' },
  { key: 'hasFleet', label: 'Do you operate vehicles or mobile equipment?', help: 'Company cars, vans, trucks or construction plant.' },
  { key: 'hasIoTMeters', label: 'Do you have smart meters or automated metering?', help: 'Half-hourly meters, sub-meters, building management or SCADA systems.' },
  { key: 'isUKPublicContractor', label: 'Do you hold or bid for UK public sector contracts?', help: 'Central government contracts can require a published Carbon Reduction Plan.' },
  { key: 'makesPublicGreenClaims', label: 'Do you make environmental claims about your business or products?', help: 'For example "carbon neutral", "net zero" or "eco-friendly" on your website or packaging.' },
  { key: 'hasGreenHydrogen', label: 'Do you produce or supply green hydrogen?', help: 'Electrolysis, compression or distribution of low carbon hydrogen.' },
];

export const WORKFORCE_QUESTIONS: YesNoQuestionDef<WorkforceAnswerKey>[] = [
  { key: 'hasPlanningConsent', label: 'Does a planning permission place Section 106 obligations on you?', help: 'For example local hiring, apprenticeship or training commitments agreed with the council.' },
  { key: 'isUKPublicContractor', label: 'Do you hold or bid for UK public sector contracts?', help: 'Public contracts are scored on Social Value commitments.' },
];

export const FLEET_ASSET_COUNT_OPTIONS = [
  { id: '1_10', label: '1 to 10' },
  { id: '11_50', label: '11 to 50' },
  { id: '51_200', label: '51 to 200' },
  { id: '200_PLUS', label: 'More than 200' },
] as const;

export const FLEET_CONNECTION_OPTIONS = [
  { id: 'ALL', label: 'All of them', help: 'Every machine already sends data to a manufacturer or telematics platform.' },
  { id: 'SOME', label: 'Some of them', help: 'Newer machines are connected; older ones, such as generators, are not.' },
  { id: 'NONE', label: 'None of them', help: 'We will connect them with a tracking device.' },
  { id: 'NOT_SURE', label: 'Not sure', help: 'We will check each machine with you during setup.' },
] as const;

export type FleetAssetCountBand = (typeof FLEET_ASSET_COUNT_OPTIONS)[number]['id'];
export type FleetCloudConnection = (typeof FLEET_CONNECTION_OPTIONS)[number]['id'];

export interface FleetProfileAnswers {
  assetCountBand: FleetAssetCountBand | '';
  categories: FleetAssetCategory[];
  cloudConnection: FleetCloudConnection | '';
}
