import { WorkflowType } from '@prisma/client';
import { isWorkflowBillingEnabled } from './billing-config.service';

export interface AssuranceFee {
  amountPence: number;
  currency: string;
}

/**
 * Each client pipeline with billing on is charged one flat assurance fee, configured per environment.
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

/** The fee for a workflow type, or null when its service does not charge. */
export function getAssuranceFeeIfBilled(workflowType: WorkflowType): AssuranceFee | null {
  return isWorkflowBillingEnabled(workflowType) ? getAssuranceFee(workflowType) : null;
}

/**
 * Throws with every configuration problem listed, so a misconfigured deploy fails at boot.
 * Only services with billing on need a fee; the currency is needed when any of them does.
 */
export function validateAssuranceFeeConfig(): void {
  const problems: string[] = [];
  const billed = (Object.keys(FEE_ENV_BY_WORKFLOW) as WorkflowType[]).filter(isWorkflowBillingEnabled);
  if (billed.length === 0) return;
  for (const envName of new Set(billed.map((t) => FEE_ENV_BY_WORKFLOW[t]))) {
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
