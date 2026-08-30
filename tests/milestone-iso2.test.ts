import request from 'supertest';
import { PrismaClient, Vertical, SensorType, MetricType, ConformanceGrade } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();
const app = createApp();

describe('Milestone ISO-2: 15% Anomaly Lock Engine & Clause 10.2 Non-Conformance Tracker', () => {
  let licenseeA: any;
  let licenseeB: any;
  let partnerUserA: any;
  let partnerUserB: any;
  let apiKeyA = 'sec_test_iso2_apiKeyA_2026';
  let apiKeyB = 'sec_test_iso2_apiKeyB_2026';
  let tokenA: string;
  let tokenB: string;
  let calibRecordA: any;

  beforeAll(async () => {
    // 1. Clean DB in foreign key order
    await prisma.nonConformanceEvent.deleteMany();
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

    // 2. Seed Licensee A (Data Centre)
    licenseeA = await prisma.licensee.create({
      data: {
        id: 'lic_iso2_datacentre_01',
        name: 'Apex Hyperscale Data Centre Ltd',
        vertical: Vertical.B2B_CLEAN_TECH,
        royaltyBps: 1500,
        b2bApiKeyHash: apiKeyHashA,
      },
    });

    // 3. Seed Licensee B (Manufacturing)
    licenseeB = await prisma.licensee.create({
      data: {
        id: 'lic_iso2_steel_02',
        name: 'Vanguard Industrial DRI Ltd',
        vertical: Vertical.B2B_HEAVY_MANUFACTURING,
        royaltyBps: 1500,
        b2bApiKeyHash: apiKeyHashB,
      },
    });

    // 4. Seed Portal Users
    partnerUserA = await prisma.portalUser.create({
      data: {
        email: 'supervisor@apex-dc.com',
        passwordHash,
        licenseeId: licenseeA.id,
        role: 'PARTNER',
      },
    });

    partnerUserB = await prisma.portalUser.create({
      data: {
        email: 'supervisor@vanguard-steel.com',
        passwordHash,
        licenseeId: licenseeB.id,
        role: 'PARTNER',
      },
    });

    tokenA = jwt.sign({ userId: partnerUserA.id, licenseeId: licenseeA.id, role: 'PARTNER' }, JWT_SECRET);
    tokenB = jwt.sign({ userId: partnerUserB.id, licenseeId: licenseeB.id, role: 'PARTNER' }, JWT_SECRET);

    // 5. Seed active calibration record for Licensee A
    const futureExpiry = new Date();
    futureExpiry.setFullYear(futureExpiry.getFullYear() + 1);

    calibRecordA = await prisma.assetCalibrationRecord.create({
      data: {
        licenseeId: licenseeA.id,
        assetTag: 'PDU-METER-04A',
        sensorType: SensorType.ELECTRICITY_SUB_METER,
        calibrationDate: new Date(),
        expiryDate: futureExpiry,
        certDocumentUrl: '/certs/pdu_meter_04a.pdf',
        certIntegrityHash: 'hash_sha256_mock_pdu_04a',
        isCurrentlyValid: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Normal Telemetry Ingestion within 15% Baseline (No Lock)', () => {
    it('should ingest telemetry with <= 15% variance without triggering an anomaly lock', async () => {
      // baseline = 1.15, observed = 1.25 (variance = 8.7%)
      const res = await request(app)
        .post('/api/iso/telemetry/ingest')
        .set('X-API-Key', apiKeyA)
        .send({
          licenseeId: licenseeA.id,
          assetTag: 'PDU-METER-04A',
          metricType: MetricType.PUE,
          numericValue: 1.25,
          baselineValue: 1.15,
          rawUnit: 'PUE_RATIO',
        });

      expect(res.status).toBe(201);
      expect(res.body.telemetryRecord.isWithinBaseline).toBe(true);
      expect(res.body.telemetryRecord.requiresSupervisor).toBe(false);
      expect(res.body.anomalyEvaluation.hasAnomaly).toBe(false);
      expect(res.body.anomalyEvaluation.exportLockActive).toBe(false);

      // Verify no non-conformance event was created
      const eventCount = await prisma.nonConformanceEvent.count({
        where: { licenseeId: licenseeA.id },
      });
      expect(eventCount).toBe(0);

      // Verify export status is clean (200 OK)
      const exportRes = await request(app)
        .get(`/api/iso/export-status?licenseeId=${licenseeA.id}`);
      expect(exportRes.status).toBe(200);
      expect(exportRes.body.isExportLocked).toBe(false);
    });
  });

  describe('2. Telemetry Anomaly >15% Drift Triggers Export Lock & Clause 10.2 Event', () => {
    let triggeredEventId: string;

    it('should detect >15% variance, log Clause 10.2 Non-Conformance, and lock data exports with HTTP 423', async () => {
      // baseline = 1.15, observed = 1.48 (variance = 28.7% > 25% -> MAJOR)
      const res = await request(app)
        .post('/api/iso/telemetry/ingest')
        .set('X-API-Key', apiKeyA)
        .send({
          licenseeId: licenseeA.id,
          assetTag: 'PDU-METER-04A',
          metricType: MetricType.PUE,
          numericValue: 1.48,
          baselineValue: 1.15,
          rawUnit: 'PUE_RATIO',
        });

      expect(res.status).toBe(201);
      expect(res.body.telemetryRecord.isWithinBaseline).toBe(false);
      expect(res.body.telemetryRecord.requiresSupervisor).toBe(true);
      expect(res.body.anomalyEvaluation.hasAnomaly).toBe(true);
      expect(res.body.anomalyEvaluation.exportLockActive).toBe(true);
      expect(res.body.anomalyEvaluation.nonConformanceEventId).toBeDefined();

      triggeredEventId = res.body.anomalyEvaluation.nonConformanceEventId;

      // Verify Non-Conformance Event in DB
      const dbEvent = await prisma.nonConformanceEvent.findUnique({
        where: { id: triggeredEventId },
      });
      expect(dbEvent).not.toBeNull();
      expect(dbEvent?.conformanceGrade).toBe(ConformanceGrade.MAJOR_NON_CONFORMANCE_GREENWASHING_RISK);
      expect(dbEvent?.isResolved).toBe(false);
      expect(dbEvent?.percentageVariance).toBeGreaterThan(15.0);

      // Verify Export Status Endpoint returns HTTP 423 Resource Locked
      const exportRes = await request(app)
        .get(`/api/iso/export-status?licenseeId=${licenseeA.id}`);

      expect(exportRes.status).toBe(423);
      expect(exportRes.body.error.code).toBe(423);
      expect(exportRes.body.error.status).toBe('RESOURCE_LOCKED');
      expect(exportRes.body.error.details.length).toBeGreaterThan(0);
      expect(exportRes.body.error.details[0].assetTag).toBe('PDU-METER-04A');
    });

    it('should list open non-conformance events for authenticated partner', async () => {
      const res = await request(app)
        .get('/api/iso/non-conformance')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.isExportLocked).toBe(true);
      expect(res.body.unresolvedCount).toBe(1);
      expect(res.body.events[0].id).toBe(triggeredEventId);
    });
  });

  describe('3. Supervisor Root-Cause Remediation Releases Export Lock', () => {
    it('should resolve non-conformance event with mandatory root-cause analysis and release export lock', async () => {
      // 1. Get the open event
      const openEvent = await prisma.nonConformanceEvent.findFirst({
        where: { licenseeId: licenseeA.id, isResolved: false },
      });
      expect(openEvent).not.toBeNull();

      // 2. Supervisor signs off resolution
      const res = await request(app)
        .patch(`/api/iso/non-conformance/${openEvent!.id}/resolve`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          rootCauseAnalysis: 'Secondary chiller loop pump failure during unseasonal ambient heat spike.',
          correctiveAction: 'Replaced coolant pump valve and re-benchmarked baseline with certified technician.',
          assignedOwner: 'Lead Facilities Engineer John Doe',
          signOffSupervisorName: 'SUPERVISOR_GMC_LL.B',
        });

      expect(res.status).toBe(200);
      expect(res.body.resolvedEvent.isResolved).toBe(true);
      expect(res.body.resolvedEvent.rootCauseAnalysis).toContain('chiller loop pump failure');
      expect(res.body.resolvedEvent.signOffSupervisor).toBe('SUPERVISOR_GMC_LL.B');
      expect(res.body.isExportLocked).toBe(false);

      // 3. Verify export status is now restored to 200 OK (Unlocked!)
      const exportRes = await request(app)
        .get(`/api/iso/export-status?licenseeId=${licenseeA.id}`);

      expect(exportRes.status).toBe(200);
      expect(exportRes.body.isExportLocked).toBe(false);
      expect(exportRes.body.status).toBe('VERIFIED_AUDIT_READY');
    });
  });

  describe('4. Security & Validation Rejection Covenants', () => {
    it('should reject resolving an event if rootCauseAnalysis is missing (400 Bad Request)', async () => {
      const mockEvent = await prisma.nonConformanceEvent.create({
        data: {
          licenseeId: licenseeA.id,
          isoClause: 'ISO 14001 Clause 10.2',
          assetTag: 'PDU-METER-04A',
          metricName: 'PUE',
          baselineValue: 1.15,
          observedValue: 1.50,
          percentageVariance: 30.43,
        },
      });

      const res = await request(app)
        .patch(`/api/iso/non-conformance/${mockEvent.id}/resolve`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          rootCauseAnalysis: '', // Empty
          correctiveAction: 'Fixed it.',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('rootCauseAnalysis is required');
    });

    it('should forbid Partner B from resolving Partner A non-conformance event (403 Forbidden)', async () => {
      const eventA = await prisma.nonConformanceEvent.findFirst({
        where: { licenseeId: licenseeA.id },
      });

      const res = await request(app)
        .patch(`/api/iso/non-conformance/${eventA!.id}/resolve`)
        .set('Authorization', `Bearer ${tokenB}`) // Partner B's token
        .send({
          rootCauseAnalysis: 'Unauthorized cross-tenant attempt',
          correctiveAction: 'Should fail',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });
  });
});
