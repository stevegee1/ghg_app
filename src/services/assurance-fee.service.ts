import { WorkflowType } from '@prisma/client';

export interface AssuranceFee {
  amountPence: number;
  currency: string;
}

/**
 * Each client pipeline is charged one flat assurance fee, configured per environment.
 * GHG covers the GHG and CARBON frameworks; Workforce covers JOB frameworks.
 */
const FEE_ENV_BY_WORKFLOW: Record<WorkflowType, string> = {
  [WorkflowType.GHG]: 'GHG_ASSURANCE_FEE_PENCE',
  [WorkflowType.CARBON]: 'GHG_ASSURANCE_FEE_PENCE',
  [WorkflowType.JOB]: 'WORKFORCE_ASSURANCE_FEE_PENCE',
};

const CURRENCY_ENV = 'ASSURANCE_FEE_CURRENCY';

export class AssuranceFeeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssuranceFeeConfigError';
  }
}

function readAmount(envName: string): number {
  const raw = process.env[envName];
  if (!raw || !/^[1-9]\d*$/.test(raw.trim())) {
    throw new AssuranceFeeConfigError(`${envName} must be set to a positive whole number of pence.`);
  }
  return Number(raw.trim());
}

function readCurrency(): string {
  const raw = process.env[CURRENCY_ENV];
  if (!raw || !/^[A-Za-z]{3}$/.test(raw.trim())) {
    throw new AssuranceFeeConfigError(`${CURRENCY_ENV} must be set to a 3-letter ISO 4217 currency code.`);
  }
  return raw.trim().toUpperCase();
}

export function getAssuranceFee(workflowType: WorkflowType): AssuranceFee {
  return {
    amountPence: readAmount(FEE_ENV_BY_WORKFLOW[workflowType]),
    currency: readCurrency(),
  };
}

/**
 * Throws with every configuration problem listed, so a misconfigured deploy fails at boot.
 */
export function validateAssuranceFeeConfig(): void {
  const problems: string[] = [];
  for (const envName of new Set(Object.values(FEE_ENV_BY_WORKFLOW))) {
    try {
      readAmount(envName);
    } catch (err) {
      problems.push((err as Error).message);
    }
  }
  try {
    readCurrency();
  } catch (err) {
    problems.push((err as Error).message);
  }
  if (problems.length > 0) {
    throw new AssuranceFeeConfigError(problems.join(' '));
  }
}
