export interface ComplianceAlertDetails {
  transactionId?: string;
  reason: string;
  eventId?: string;
  extra?: Record<string, any>;
}

export function alertComplianceOfficer(details: ComplianceAlertDetails): void {
  console.warn('[COMPLIANCE ALERT]', JSON.stringify(details, null, 2));
}
