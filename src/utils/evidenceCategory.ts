/**
 * Evidence category sent with a checklist upload. Must be one of the server's EvidenceCategory
 * values (prisma/schema.prisma), or the upload is refused.
 */
export function evidenceCategoryFor(itemCode: string | undefined): string {
  const code = itemCode ?? '';
  if (code.endsWith('_CALIBRATION')) return 'CALIBRATION_CERTIFICATE';
  if (code === 'SV_LOCAL_PAYROLL') return 'STAGING_PAYROLL_REGISTER';
  if (code === 'H2_PRODUCTION_METER_LOGS') return 'SCADA_TELEMETRY';
  if (code === 'H2_WATER_FEED_PURITY') return 'LAB_GAS_PURITY_CERT';
  return 'OTHER_AUDIT_PROOF';
}
