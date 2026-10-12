import { WorkflowType } from '@prisma/client';
import type { ClientService } from './service-routing.service';

/**
 * Whether each client service charges. Set per environment with GHG_BILLING_ENABLED,
 * WORKFORCE_BILLING_ENABLED and FLEET_BILLING_ENABLED ("true" or "false"). When a service's billing
 * is off it needs no fee or price configuration, shows no price, and nothing in it waits on payment.
 * Merch always takes payment and is not covered here.
 */
const BILLING_ENV: Record<ClientService, string> = {
  GHG: 'GHG_BILLING_ENABLED',
  WORKFORCE: 'WORKFORCE_BILLING_ENABLED',
  FLEET: 'FLEET_BILLING_ENABLED',
};

export class BillingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingConfigError';
  }
}

function readFlag(envName: string): boolean {
  const raw = process.env[envName]?.trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new BillingConfigError(`${envName} must be set to "true" or "false".`);
}

export function isBillingEnabled(service: ClientService): boolean {
  return readFlag(BILLING_ENV[service]);
}

/** The service a workflow type is billed under. GHG and CARBON share the GHG service. */
export function serviceForWorkflowType(workflowType: WorkflowType): ClientService {
  return workflowType === WorkflowType.JOB ? 'WORKFORCE' : 'GHG';
}

export function isWorkflowBillingEnabled(workflowType: WorkflowType): boolean {
  return isBillingEnabled(serviceForWorkflowType(workflowType));
}

/** Every service's switch, for clients deciding whether to show prices. */
export function billingByService(): Record<ClientService, boolean> {
  return { GHG: isBillingEnabled('GHG'), WORKFORCE: isBillingEnabled('WORKFORCE'), FLEET: isBillingEnabled('FLEET') };
}

/** Throws with every switch that is missing or invalid, so a misconfigured deploy fails at boot. */
export function validateBillingConfig(): void {
  const problems: string[] = [];
  for (const envName of Object.values(BILLING_ENV)) {
    try {
      readFlag(envName);
    } catch (err) {
      problems.push((err as Error).message);
    }
  }
  if (problems.length > 0) throw new BillingConfigError(problems.join(' '));
}
