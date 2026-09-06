import request from 'supertest';
import { PrismaClient, Vertical, SensorType, MetricType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import crypto from 'crypto';

const prisma = new PrismaClient();
const app = createApp();

describe('Milestone ISO-1: Statutory Telemetry Ingestion & Mandatory Calibration Gatekeeper', () => {
  let licenseeA: any;
  let licenseeB: any;
  let partnerUserA: any;
  let partnerUserB: any;
  let adminUser: any;
  let apiKeyA = 'sec_test_iso1_apiKeyA_2026';
  let apiKeyB = 'sec_test_iso1_apiKeyB_2026';
  let tokenA: string;
  let tokenB: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    // 1. Clean test DB in correct foreign key dependency order
    await prisma.telemetryLog.deleteMany();
    await prisma.assetCalibrationRecord.deleteMany();
    await prisma.jobCreationReport.deleteMany();
    await prisma.splitConfigHistory.deleteMany();
    await prisma.charityAllocation.deleteMany();
    await prisma.financialSplit.deleteMany();
    await prisma.triggerEvent.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.portalUser.deleteMany();
    await prisma.licensee.deleteMany();

    const apiKeyHashA = await bcrypt.hash(apiKeyA, 10);
    const apiKeyHashB = await bcrypt.hash(apiKeyB, 10);
    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    // 2. Seed Licensee A (Data Centre Operator)
    licenseeA = await prisma.licensee.create({
      data: {
        id: 'lic_iso_datacentre_01',
        name: 'Apex Hyperscale Data Centre Ltd',
        vertical: Vertical.B2B_CLEAN_TECH,
        royaltyBps: 1500,
        b2bApiKeyHash: apiKeyHashA,
      },
    });

    // 3. Seed Licensee B (Green Steel Plant)
    licenseeB = await prisma.licensee.create({
      data: {
        id: 'lic_iso_greensteel_02',
        name: 'Vanguard Green Steel DRI Ltd',
        vertical: Vertical.B2B_HEAVY_MANUFACTURING,
        royaltyBps: 1500,
        b2bApiKeyHash: apiKeyHashB,
      },
    });

    // 4. Seed Portal Users
    partnerUserA = await prisma.portalUser.create({
      data: {
        email: 'engineer@apex-dc.com',
        passwordHash,
        licenseeId: licenseeA.id,
        role: 'PARTNER',
      },
    });

    partnerUserB = await prisma.portalUser.create({
      data: {
        email: 'engineer@vanguard-steel.com',
        passwordHash,
        licenseeId: licenseeB.id,
        role: 'PARTNER',
      },
    });

    adminUser = await prisma.portalUser.create({
      data: {
        email: 'lead.auditor@ghglogodrop.com',
        passwordHash,
        role: 'ADMIN',
      },
    });

    tokenA = jwt.sign({ userId: partnerUserA.id, licenseeId: licenseeA.id, role: 'PARTNER' }, JWT_SECRET);
    tokenB = jwt.sign({ userId: partnerUserB.id, licenseeId: licenseeB.id, role: 'PARTNER' }, JWT_SECRET);
    tokenAdmin = jwt.sign({ userId: adminUser.id, role: 'ADMIN' }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Calibration Certificate Registration & SHA-256 Hashing', () => {
    it('should register a valid Certificate of Calibration with SHA-256 integrity hash', async () => {
      const mockPdfContent = Buffer.from('%PDF-1.4 Mock Calibration Certificate for Power Sub-Meter 2026');
      const expectedHash = crypto.createHash('sha256').update(mockPdfContent).digest('hex');

      const calibDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(calibDate.getFullYear() + 1); // 1 year validity

      const res = await request(app)
        .post('/api/iso/calibration/upload')
        .send({
          licenseeId: licenseeA.id,
          assetTag: 'PDU-METER-04A',
          sensorType: SensorType.ELECTRICITY_SUB_METER,
          calibrationDate: calibDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          certDocumentUrl: '/certs/pdu_meter_04a_calib_2026.pdf',
          certFileContent: mockPdfContent.toString('utf-8'),
          verifiedBy: 'SGS_INDEPENDENT_CALIBRATION_BODY',
        });

      expect(res.status).toBe(201);
      expect(res.body.record).toBeDefined();
      expect(res.body.record.assetTag).toBe('PDU-METER-04A');
      expect(res.body.record.sensorType).toBe(SensorType.ELECTRICITY_SUB_METER);
      expect(res.body.record.certIntegrityHash).toBe(expectedHash);
      expect(res.body.record.isCurrentlyValid).toBe(true);

      const dbRecord = await prisma.assetCalibrationRecord.findUnique({
        where: { id: res.body.record.id },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.assetTag).toBe('PDU-METER-04A');
    });

    it('should reject calibration registration if expiryDate is before calibrationDate', async () => {
      const calibDate = new Date('2026-08-01');
      const invalidExpiryDate = new Date('2026-07-01'); // In the past relative to calibration

      const res = await request(app)
        .post('/api/iso/calibration/upload')
        .send({
          licenseeId: licenseeA.id,
          assetTag: 'WATER-FLOW-METER-01',
          sensorType: SensorType.WATER_FLOW_METER,
          calibrationDate: calibDate.toISOString(),
          expiryDate: invalidExpiryDate.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('expiryDate must be after calibrationDate');
    });
  });

  describe('2. Telemetry Ingestion on Active Calibrated Asset', () => {
    it('should successfully ingest telemetry when asset has an active calibration certificate', async () => {
      const res = await request(app)
        .post('/api/iso/telemetry/ingest')
        .set('X-API-Key', apiKeyA)
        .send({
          licenseeId: licenseeA.id,
          assetTag: 'PDU-METER-04A',
          metricType: MetricType.PUE,
          numericValue: 1.15,
          rawUnit: 'PUE_RATIO',
          rawTelemetryJson: {
            totalFacilityKw: 11500,
            itLoadKw: 10000,
            ambientTempC: 22.4,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.telemetryRecord).toBeDefined();
      expect(res.body.telemetryRecord.assetTag).toBe('PDU-METER-04A');
      expect(res.body.telemetryRecord.numericValue).toBe(1.15);
      expect(res.body.telemetryRecord.assetCalibrationId).toBeDefined();

      // Verify record is preserved in database
      const dbLog = await prisma.telemetryLog.findUnique({
        where: { id: res.body.telemetryRecord.id },
      });
      expect(dbLog).not.toBeNull();
      expect(dbLog?.numericValue).toBe(1.15);
      expect(dbLog?.isWithinBaseline).toBe(true);
    });
  });

  describe('3. Mandatory Calibration Gatekeeper Rejection (Uncalibrated Asset)', () => {
    it('should reject telemetry ingestion for an asset with no registered calibration certificate', async () => {
      const res = await request(app)
        .post('/api/iso/telemetry/ingest')
        .set('X-API-Key', apiKeyA)
        .send({
          licenseeId: licenseeA.id,
          assetTag: 'UNREGISTERED-GAS-SENSOR-99',
          metricType: MetricType.H2_PURITY_PCT,
          numericValue: 99.98,
          rawUnit: '%',
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toContain('No active, unexpired calibration certificate found');
      expect(res.body.error).toContain('ISO 50001/14001 statutory rules');

      // Verify no record was inserted
      const count = await prisma.telemetryLog.count({
        where: { assetTag: 'UNREGISTERED-GAS-SENSOR-99' },
      });
      expect(count).toBe(0);
    });
  });

  describe('4. PostgreSQL Trigger Layer Rejection (Expired Calibration Certificate)', () => {
    it('should physically reject telemetry insertion via DB trigger if calibration is expired', async () => {
      // 1. Create an expired calibration record
      const pastCalibDate = new Date('2024-01-01');
      const expiredDate = new Date('2025-01-01'); // Expired last year

      const expiredRecord = await prisma.assetCalibrationRecord.create({
        data: {
          licenseeId: licenseeA.id,
          assetTag: 'EXPIRED-CHILLER-METER-09',
          sensorType: SensorType.THERMAL_FLOW_METER,
          calibrationDate: pastCalibDate,
          expiryDate: expiredDate,
          certDocumentUrl: '/certs/expired_2024.pdf',
          certIntegrityHash: 'mock_expired_hash_123',
          isCurrentlyValid: true,
        },
      });

      // 2. Direct database insert bypassing service validation to test PostgreSQL trigger
      await expect(
        prisma.telemetryLog.create({
          data: {
            licenseeId: licenseeA.id,
            assetCalibrationId: expiredRecord.id,
            assetTag: 'EXPIRED-CHILLER-METER-09',
            metricType: MetricType.THERMAL_KW,
            numericValue: 450.0,
            rawUnit: 'kW',
          },
        })
      ).rejects.toThrow(/expired on/i);

      // Verify no row exists
      const count = await prisma.telemetryLog.count({
        where: { assetTag: 'EXPIRED-CHILLER-METER-09' },
      });
      expect(count).toBe(0);
    });
  });

  describe('5. Multi-Tenant Row-Level Security (RLS) Asset Isolation', () => {
    beforeAll(async () => {
      // Create calibration record for Licensee B
      const futureExpiry = new Date();
      futureExpiry.setFullYear(futureExpiry.getFullYear() + 1);

      await prisma.assetCalibrationRecord.create({
        data: {
          licenseeId: licenseeB.id,
          assetTag: 'STEEL-FURNACE-EAF-01',
          sensorType: SensorType.ELECTRICITY_SUB_METER,
          calibrationDate: new Date(),
          expiryDate: futureExpiry,
          certDocumentUrl: '/certs/eaf_meter_steel.pdf',
          certIntegrityHash: 'mock_eaf_hash_456',
        },
      });
    });

    it('should allow Partner A to view only Licensee A assets', async () => {
      const res = await request(app)
        .get('/api/iso/calibration/assets')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.licenseeId).toBe(licenseeA.id);
      const tags = res.body.assets.map((a: any) => a.assetTag);
      expect(tags).toContain('PDU-METER-04A');
      expect(tags).not.toContain('STEEL-FURNACE-EAF-01');
    });

    it('should forbid Partner A from querying Licensee B calibration assets (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/iso/calibration/assets?licenseeId=${licenseeB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should allow Admin user to query any licensee assets', async () => {
      const res = await request(app)
        .get(`/api/iso/calibration/assets?licenseeId=${licenseeB.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.licenseeId).toBe(licenseeB.id);
      expect(res.body.assets.length).toBeGreaterThan(0);
      expect(res.body.assets[0].assetTag).toBe('STEEL-FURNACE-EAF-01');
    });
  });
});
