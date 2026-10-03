/**
 * license-warranty.service.ts
 * Bi-temporal warranty and operational health state resolver for corporate licensees.
 *
 * Implements two distinct timelines:
 *  1. Statutory Epoch (Fixed 365-day window from issuance date)
 *  2. Operational Telemetry Health (Real-time IoT streaming, calibration, and drift checks)
 *
 * Operational Statuses:
 *  - ACTIVE_COMPLIANT: 365-day epoch valid, calibration unexpired, telemetry drift within limits
 *  - CALIBRATION_WARNING: Sensor calibration within 30 days of expiration
 *  - CALIBRATION_LAPSED: Primary metering asset has an expired ISO 17025 certificate
 *  - SUSPENDED_DRIFT: Telemetry stream has exceeded plus or minus 15% variance without approved engineering note
 *  - EXPIRED: Statutory 365-day epoch elapsed without renewal audit
 */

import { PrismaClient } from '@prisma/client';

export type OperationalHealthStatus =
  | 'ACTIVE_COMPLIANT'
  | 'CALIBRATION_WARNING'
  | 'CALIBRATION_LAPSED'
  | 'SUSPENDED_DRIFT'
  | 'EXPIRED';

export interface LicenseHealthEvaluation {
  licenseeId: string;
  licenseeName: string;
  status: OperationalHealthStatus;
  statutoryExpiresAt: string | null;
  daysRemainingInEpoch: number;
  hasActiveTelemetry: boolean;
  totalAssets: number;
  uncalibratedAssets: number;
  hasDriftLock: boolean;
  statusHeadline: string;
  statusDescription: string;
}

export class LicenseWarrantyService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Evaluates the bi-temporal health and operational validity of a licensee credential.
   */
  public async evaluateLicenseHealth(licenseeId: string): Promise<LicenseHealthEvaluation> {
    const licensee = await this.prisma.licensee.findUnique({
      where: { id: licenseeId },
      include: {
        auditWarrantyCredentials: {
          where: { status: 'ISSUED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        calibrationRecords: true,
        telemetryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!licensee) {
      throw new Error(`Licensee ${licenseeId} not found.`);
    }

    const latestCredential = licensee.auditWarrantyCredentials[0] || null;
    const now = new Date();

    // 1. Check Statutory 365-Day Epoch
    const expiresAt = latestCredential?.warrantyExpiresAt ? new Date(latestCredential.warrantyExpiresAt) : null;
    let daysRemaining = 0;
    if (expiresAt) {
      const diffMs = expiresAt.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    if (expiresAt && now > expiresAt) {
      return {
        licenseeId,
        licenseeName: licensee.name,
        status: 'EXPIRED',
        statutoryExpiresAt: expiresAt.toISOString(),
        daysRemainingInEpoch: 0,
        hasActiveTelemetry: licensee.telemetryLogs.length > 0,
        totalAssets: licensee.calibrationRecords.length,
        uncalibratedAssets: 0,
        hasDriftLock: false,
        statusHeadline: 'Statutory 365-Day Epoch Expired',
        statusDescription: 'The annual statutory audit warranty period has elapsed. Renewal audit required under ISO 14064-1.',
      };
    }

    // 2. Check Calibration Health across assets
    const totalAssets = licensee.calibrationRecords.length;
    let uncalibratedCount = 0;
    let warningCount = 0;

    for (const record of licensee.calibrationRecords) {
      if (!record.isCurrentlyValid || (record.expiryDate && new Date(record.expiryDate) < now)) {
        uncalibratedCount++;
      } else if (record.expiryDate) {
        const daysToCalibExpiry = Math.ceil((new Date(record.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToCalibExpiry <= 30) {
          warningCount++;
        }
      }
    }

    if (uncalibratedCount > 0) {
      return {
        licenseeId,
        licenseeName: licensee.name,
        status: 'CALIBRATION_LAPSED',
        statutoryExpiresAt: expiresAt?.toISOString() || null,
        daysRemainingInEpoch: daysRemaining,
        hasActiveTelemetry: licensee.telemetryLogs.length > 0,
        totalAssets,
        uncalibratedAssets: uncalibratedCount,
        hasDriftLock: false,
        statusHeadline: 'Sensor Calibration Lapsed',
        statusDescription: `${uncalibratedCount} primary measurement sensor(s) have expired ISO/IEC 17025 calibration certificates. Ingestion locked under ISO 50001 Clause 6.6.`,
      };
    }

    // 3. Check for Telemetry Drift Lock
    const hasDriftLock = licensee.telemetryLogs.some(
      (log) => !log.isWithinBaseline || log.requiresSupervisor
    );

    if (hasDriftLock) {
      return {
        licenseeId,
        licenseeName: licensee.name,
        status: 'SUSPENDED_DRIFT',
        statutoryExpiresAt: expiresAt?.toISOString() || null,
        daysRemainingInEpoch: daysRemaining,
        hasActiveTelemetry: licensee.telemetryLogs.length > 0,
        totalAssets,
        uncalibratedAssets: 0,
        hasDriftLock: true,
        statusHeadline: 'Operational Variance Lock Engaged',
        statusDescription: 'Primary telemetry has drifted by more than plus or minus 15% from calibrated baselines. Statutory export locked pending root-cause remediation notes.',
      };
    }

    if (warningCount > 0) {
      return {
        licenseeId,
        licenseeName: licensee.name,
        status: 'CALIBRATION_WARNING',
        statutoryExpiresAt: expiresAt?.toISOString() || null,
        daysRemainingInEpoch: daysRemaining,
        hasActiveTelemetry: licensee.telemetryLogs.length > 0,
        totalAssets,
        uncalibratedAssets: 0,
        hasDriftLock: false,
        statusHeadline: 'Calibration Expiration Notice',
        statusDescription: `${warningCount} sensor(s) expire within 30 days. Upload renewal calibration certificates to maintain uninterrupted assurance.`,
      };
    }

    // 4. Fully Active & Compliant
    return {
      licenseeId,
      licenseeName: licensee.name,
      status: 'ACTIVE_COMPLIANT',
      statutoryExpiresAt: expiresAt?.toISOString() || null,
      daysRemainingInEpoch: daysRemaining,
      hasActiveTelemetry: licensee.telemetryLogs.length > 0,
      totalAssets,
      uncalibratedAssets: 0,
      hasDriftLock: false,
      statusHeadline: 'Active Verified Audit-Ready',
      statusDescription: 'Statutory 365-day epoch active. Primary telemetry streaming with valid ISO 17025 calibration seals.',
    };
  }

  /**
   * Updates allowed origin domains for dynamic embed seal CORS checking.
   */
  public async updateAllowedOrigins(licenseeId: string, allowedOrigins: string[], client?: any) {
    const db = client || this.prisma;
    const cred = await db.auditWarrantyCredential.findFirst({
      where: { licenseeId },
      orderBy: { createdAt: 'desc' },
    });
    if (!cred) {
      const sub = await db.isoReadinessSubmission.findFirst({
        where: { licenseeId },
        orderBy: { createdAt: 'desc' },
      });
      if (sub) {
        return db.auditWarrantyCredential.upsert({
          where: { submissionId: sub.id },
          create: {
            licenseeId,
            submissionId: sub.id,
            clientMessage: 'Statutory ISO 14064-1 Audit Seal',
            clientLogoUrl: '',
            allowedOrigins,
            status: 'PENDING',
          },
          update: {
            allowedOrigins,
          },
        });
      }
      throw new Error(`Credential for licensee ${licenseeId} not found.`);
    }
    return db.auditWarrantyCredential.update({
      where: { id: cred.id },
      data: { allowedOrigins },
    });
  }
}
