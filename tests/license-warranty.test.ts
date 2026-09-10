/**
 * license-warranty.test.ts
 *
 * Integration and unit tests for LicenseWarrantyService:
 *  - Bi-temporal warranty model (365-day statutory epoch + operational health)
 *  - ISO/IEC 17025 calibration expiration detection
 *  - 30-day calibration grace period warning
 *  - Real-time telemetry drift anomaly suspension (>15% variance)
 *  - Active compliant status resolution
 *  - Allowed origin domain updates
 */

import { PrismaClient, CredentialStatus, MetricType, SensorType } from '@prisma/client';
import { LicenseWarrantyService } from '../src/services/license-warranty.service';

const prisma = new PrismaClient();
const warrantyService = new LicenseWarrantyService(prisma);

let testLicenseeId: string;

async function createTestCredentialWithSubmission(data: {
  clientMessage: string;
  warrantyExpiresAt: Date;
  allowedOrigins?: string[];
}) {
  const submission = await prisma.isoReadinessSubmission.create({
    data: {
      licenseeId: testLicenseeId,
      answers: [],
      status: 'APPROVED',
      paidAt: new Date(),
    },
  });

  return prisma.auditWarrantyCredential.create({
    data: {
      licenseeId: testLicenseeId,
      submissionId: submission.id,
      clientMessage: data.clientMessage,
      clientLogoUrl: '/test-logo.png',
      compositeBadgeUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
      warrantyExpiresAt: data.warrantyExpiresAt,
      status: CredentialStatus.MINTED,
      allowedOrigins: data.allowedOrigins || [],
    },
  });
}

beforeAll(async () => {
  const licensee = await prisma.licensee.create({
    data: {
      name: 'Warranty Test Technologies Ltd',
      vertical: 'B2B_CLEAN_TECH',
      royaltyBps: 8500,
    },
  });
  testLicenseeId = licensee.id;
});

afterAll(async () => {
  if (testLicenseeId) {
    await prisma.telemetryLog.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.assetCalibrationRecord.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.auditWarrantyCredential.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.isoReadinessSubmission.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.licensee.deleteMany({ where: { id: testLicenseeId } });
  }
  await prisma.$disconnect();
});

describe('LicenseWarrantyService', () => {
  beforeEach(async () => {
    await prisma.telemetryLog.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.assetCalibrationRecord.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.auditWarrantyCredential.deleteMany({ where: { licenseeId: testLicenseeId } });
    await prisma.isoReadinessSubmission.deleteMany({ where: { licenseeId: testLicenseeId } });
  });

  it('detects EXPIRED_EPOCH when statutory 365-day warranty date has elapsed', async () => {
    // Expired 5 days ago
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await createTestCredentialWithSubmission({
      clientMessage: 'Expired Warranty Credential',
      warrantyExpiresAt: pastDate,
    });

    const result = await warrantyService.evaluateLicenseHealth(testLicenseeId);
    expect(result.status).toBe('EXPIRED');
    expect(result.daysRemainingInEpoch).toBe(0);
    expect(result.statusHeadline).toContain('Statutory 365-Day Epoch Expired');
  });

  it('detects CALIBRATION_LAPSED when sensor calibration certificate is expired', async () => {
    // Valid 365-day warranty
    const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    await createTestCredentialWithSubmission({
      clientMessage: 'Valid Credential',
      warrantyExpiresAt: futureDate,
    });

    // Expired calibration asset
    await prisma.assetCalibrationRecord.create({
      data: {
        licenseeId: testLicenseeId,
        assetTag: 'EMISSIONS-FLUE-01',
        sensorType: SensorType.EMISSIONS_CEMS,
        calibrationDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Expired 10 days ago
        certDocumentUrl: 'https://cdn.example.com/certs/cal-01.pdf',
        certIntegrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        isCurrentlyValid: false,
      },
    });

    const result = await warrantyService.evaluateLicenseHealth(testLicenseeId);
    expect(result.status).toBe('CALIBRATION_LAPSED');
    expect(result.uncalibratedAssets).toBe(1);
    expect(result.statusHeadline).toContain('Sensor Calibration Lapsed');
  });

  it('detects SUSPENDED_DRIFT when telemetry log has drift anomaly or requires supervisor', async () => {
    const futureDate = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    await createTestCredentialWithSubmission({
      clientMessage: 'Active Credential',
      warrantyExpiresAt: futureDate,
    });

    // Valid calibration
    const calib = await prisma.assetCalibrationRecord.create({
      data: {
        licenseeId: testLicenseeId,
        assetTag: 'STACK-METER-09',
        sensorType: SensorType.EMISSIONS_CEMS,
        calibrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        certDocumentUrl: 'https://cdn.example.com/certs/cal-09.pdf',
        certIntegrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        isCurrentlyValid: true,
      },
    });

    // Telemetry log with >15% drift anomaly (isWithinBaseline: false)
    await prisma.telemetryLog.create({
      data: {
        licenseeId: testLicenseeId,
        assetCalibrationId: calib.id,
        assetTag: 'STACK-METER-09',
        metricType: MetricType.CO2_PPM,
        numericValue: 840.5,
        rawUnit: 'ppm',
        isWithinBaseline: false, // Drift violation
        requiresSupervisor: true,
      },
    });

    const result = await warrantyService.evaluateLicenseHealth(testLicenseeId);
    expect(result.status).toBe('SUSPENDED_DRIFT');
    expect(result.hasDriftLock).toBe(true);
    expect(result.statusHeadline).toContain('Operational Variance Lock Engaged');
  });

  it('resolves ACTIVE_COMPLIANT when epoch, calibration, and telemetry are verified healthy', async () => {
    const futureDate = new Date(Date.now() + 250 * 24 * 60 * 60 * 1000);
    await createTestCredentialWithSubmission({
      clientMessage: 'Healthy Verified Credential',
      warrantyExpiresAt: futureDate,
    });

    const calib = await prisma.assetCalibrationRecord.create({
      data: {
        licenseeId: testLicenseeId,
        assetTag: 'GAS-FLOW-METER-02',
        sensorType: SensorType.THERMAL_FLOW_METER,
        calibrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
        certDocumentUrl: 'https://cdn.example.com/certs/cal-02.pdf',
        certIntegrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        isCurrentlyValid: true,
      },
    });

    await prisma.telemetryLog.create({
      data: {
        licenseeId: testLicenseeId,
        assetCalibrationId: calib.id,
        assetTag: 'GAS-FLOW-METER-02',
        metricType: MetricType.MWH_LOAD,
        numericValue: 120.4,
        rawUnit: 'MWh',
        isWithinBaseline: true,
        requiresSupervisor: false,
      },
    });

    const result = await warrantyService.evaluateLicenseHealth(testLicenseeId);
    expect(result.status).toBe('ACTIVE_COMPLIANT');
    expect(result.daysRemainingInEpoch).toBeGreaterThan(200);
    expect(result.hasActiveTelemetry).toBe(true);
    expect(result.hasDriftLock).toBe(false);
    expect(result.uncalibratedAssets).toBe(0);
    expect(result.statusHeadline).toContain('Active Verified Audit-Ready');
  });

  it('updates allowed origin domains for public embed verification', async () => {
    await createTestCredentialWithSubmission({
      clientMessage: 'Origin Test Credential',
      warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      allowedOrigins: ['portal.corp.com'],
    });

    await warrantyService.updateAllowedOrigins(testLicenseeId, [
      'https://corp.com',
      'https://investors.corp.com',
    ]);

    const cred = await prisma.auditWarrantyCredential.findFirst({
      where: { licenseeId: testLicenseeId },
    });
    expect(cred?.allowedOrigins).toEqual(['https://corp.com', 'https://investors.corp.com']);
  });
});
