import { PrismaClient, SensorType, MetricType } from '@prisma/client';
import crypto from 'crypto';
import { runWithRls, UserAuthScope } from '../db/rls';

export interface UploadCalibrationInput {
  licenseeId: string;
  assetTag: string;
  sensorType: SensorType;
  calibrationDate: Date;
  expiryDate: Date;
  certDocumentUrl: string;
  certFileContent?: string | Buffer; // Raw buffer or base64 string to compute SHA-256
  providedHash?: string;
  verifiedBy?: string;
}

export interface IngestTelemetryInput {
  licenseeId: string;
  assetTag: string;
  metricType: MetricType;
  numericValue: number;
  rawUnit: string;
  rawTelemetryJson?: Record<string, any>;
  transactionId?: string;
  isWithinBaseline?: boolean;
  requiresSupervisor?: boolean;
}

export class IsoCalibrationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Registers a new Asset Calibration Certificate with cryptographic SHA-256 integrity hashing.
   */
  async registerCalibrationCertificate(input: UploadCalibrationInput) {
    const {
      licenseeId,
      assetTag,
      sensorType,
      calibrationDate,
      expiryDate,
      certDocumentUrl,
      certFileContent,
      providedHash,
      verifiedBy,
    } = input;

    if (!assetTag || !assetTag.trim()) {
      throw new Error('Invalid input: assetTag is required.');
    }

    if (!calibrationDate || isNaN(calibrationDate.getTime())) {
      throw new Error('Invalid input: valid calibrationDate is required.');
    }

    if (!expiryDate || isNaN(expiryDate.getTime())) {
      throw new Error('Invalid input: valid expiryDate is required.');
    }

    if (expiryDate <= calibrationDate) {
      throw new Error('Invalid input: expiryDate must be after calibrationDate.');
    }

    // Compute SHA-256 hash of certificate file content or use canonical metadata
    let certIntegrityHash = providedHash;
    if (certFileContent) {
      certIntegrityHash = crypto
        .createHash('sha256')
        .update(certFileContent)
        .digest('hex');
    } else if (!certIntegrityHash) {
      const canonicalCertMeta = JSON.stringify({
        licenseeId,
        assetTag,
        sensorType,
        calibrationDate: calibrationDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        certDocumentUrl,
      });
      certIntegrityHash = crypto
        .createHash('sha256')
        .update(canonicalCertMeta)
        .digest('hex');
    }

    return this.prisma.assetCalibrationRecord.create({
      data: {
        licenseeId,
        assetTag: assetTag.trim(),
        sensorType,
        calibrationDate,
        expiryDate,
        certDocumentUrl,
        certIntegrityHash,
        isCurrentlyValid: true,
        verifiedBy: verifiedBy || 'LEAD_AUDITOR_GMC_LL.B',
      },
    });
  }

  /**
   * Retrieves RLS-scoped asset calibration records for a licensee with expiration countdowns.
   */
  async getAssetsCalibrationStatus(licenseeId: string, user: UserAuthScope) {
    return runWithRls(this.prisma, user, async (tx) => {
      const records = await tx.assetCalibrationRecord.findMany({
        where: { licenseeId },
        orderBy: { createdAt: 'desc' },
      });

      const now = new Date();
      return records.map((record) => {
        const isExpired = record.expiryDate < now;
        const diffMs = record.expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return {
          id: record.id,
          assetTag: record.assetTag,
          sensorType: record.sensorType,
          calibrationDate: record.calibrationDate,
          expiryDate: record.expiryDate,
          isCurrentlyValid: record.isCurrentlyValid && !isExpired,
          isExpired,
          daysRemaining: isExpired ? 0 : daysRemaining,
          certDocumentUrl: record.certDocumentUrl,
          certIntegrityHash: record.certIntegrityHash,
          verifiedBy: record.verifiedBy,
          createdAt: record.createdAt,
        };
      });
    });
  }

  /**
   * Ingests operational technology (OT) telemetry, enforcing the calibration gatekeeper.
   * If the physical sensor lacks a valid, active calibration certificate, rejects the insert.
   */
  async ingestTelemetry(input: IngestTelemetryInput) {
    const {
      licenseeId,
      assetTag,
      metricType,
      numericValue,
      rawUnit,
      rawTelemetryJson,
      transactionId,
      isWithinBaseline = true,
      requiresSupervisor = false,
    } = input;

    if (typeof numericValue !== 'number' || isNaN(numericValue)) {
      throw new Error('Invalid input: numericValue must be a valid number.');
    }

    if (!rawUnit || !rawUnit.trim()) {
      throw new Error('Invalid input: rawUnit is required (e.g. kW/h, m3/h, %).');
    }

    // 1. Find the latest valid calibration record for this asset
    const activeCalibration = await this.prisma.assetCalibrationRecord.findFirst({
      where: {
        licenseeId,
        assetTag: assetTag.trim(),
        isCurrentlyValid: true,
        expiryDate: { gte: new Date() },
      },
      orderBy: { expiryDate: 'desc' },
    });

    if (!activeCalibration) {
      throw new Error(
        `Telemetry ingestion rejected: No active, unexpired calibration certificate found for asset '${assetTag}' under ISO 50001/14001 Class 35 rules.`
      );
    }

    // 2. Insert Telemetry Log (Protected by PostgreSQL safety trigger)
    return this.prisma.telemetryLog.create({
      data: {
        licenseeId,
        assetCalibrationId: activeCalibration.id,
        assetTag: assetTag.trim(),
        metricType,
        numericValue,
        rawUnit: rawUnit.trim(),
        isWithinBaseline,
        requiresSupervisor,
        rawTelemetryJson: rawTelemetryJson ?? undefined,
        transactionId: transactionId || null,
      },
      include: {
        assetCalibration: true,
      },
    });
  }
}
