import request from 'supertest';
import { PrismaClient, Vertical, ConformanceGrade, RiskLevel, EvidenceCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { AuditScoringService } from '../src/services/audit-scoring.service';

const prisma = new PrismaClient();
const app = createApp();

describe('Milestone ISO-4: Evidence Locker & Executive/Event PDF Generator', () => {
  let licenseeA: any;
  let licenseeB: any;
  let partnerUserA: any;
  let partnerUserB: any;
  let tokenA: string;
  let tokenB: string;
  let reportA: any;

  beforeAll(async () => {
    // 1. Clean DB in foreign key order
    await prisma.auditEvidenceDocument.deleteMany();
    await prisma.customKeepsakeSpec.deleteMany();
    await prisma.auditMatrixRow.deleteMany();
    await prisma.auditInspectionReport.deleteMany();
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

    const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

    // 2. Seed Licensees
    licenseeA = await prisma.licensee.create({
      data: {
        id: 'lic_iso4_datacentre_01',
        name: 'Apex Hyperscale Infrastructure Ltd',
        vertical: Vertical.B2B_CLEAN_TECH,
        royaltyBps: 1500,
        stripeConnectedAccountId: 'acct_iso4_apex_test',
      },
    });

    licenseeB = await prisma.licensee.create({
      data: {
        id: 'lic_iso4_merch_02',
        name: 'Vanguard Industrial Steel Ltd',
        vertical: Vertical.B2B_HEAVY_MANUFACTURING,
        royaltyBps: 1500,
        stripeConnectedAccountId: 'acct_iso4_vanguard_test',
      },
    });

    // 3. Seed Portal Users
    partnerUserA = await prisma.portalUser.create({
      data: {
        email: 'auditor@apex-infrastructure.com',
        passwordHash,
        licenseeId: licenseeA.id,
        role: 'PARTNER',
      },
    });

    partnerUserB = await prisma.portalUser.create({
      data: {
        email: 'auditor@vanguard-steel.com',
        passwordHash,
        licenseeId: licenseeB.id,
        role: 'PARTNER',
      },
    });

    tokenA = jwt.sign({ userId: partnerUserA.id, licenseeId: licenseeA.id, role: 'PARTNER' }, JWT_SECRET);
    tokenB = jwt.sign({ userId: partnerUserB.id, licenseeId: licenseeB.id, role: 'PARTNER' }, JWT_SECRET);

    // 4. Seed Audit Report for Licensee A
    const templateRows = AuditScoringService.getTemplateRowsForFacility('DATA_CENTRE');
    const scoringService = new AuditScoringService(prisma);
    reportA = await scoringService.evaluateAuditReport({
      licenseeId: licenseeA.id,
      auditRefId: 'AR-2026-DH-01',
      facilityType: 'DATA_CENTRE',
      leadAuditorName: 'Lead Assurance Officer, GMC, LL.B.',
      evaluationDate: new Date(),
      rows: templateRows,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Evidence Document Registration & SHA-256 Hashing', () => {
    it('should upload evidence document and compute SHA-256 integrity hash', async () => {
      const res = await request(app)
        .post('/api/portal/iso/evidence/upload')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          licenseeId: licenseeA.id,
          reportId: reportA.id,
          fileName: 'SCADA_PUE_Hourly_Telemetry_Q3.csv',
          category: 'SCADA_TELEMETRY',
          fileSizeBytes: 204850,
          mimeType: 'text/csv',
        });

      expect(res.status).toBe(201);
      expect(res.body.evidenceDoc).toBeDefined();
      expect(res.body.evidenceDoc.fileName).toBe('SCADA_PUE_Hourly_Telemetry_Q3.csv');
      expect(res.body.evidenceDoc.category).toBe(EvidenceCategory.SCADA_TELEMETRY);
      expect(res.body.evidenceDoc.sha256Hash).toBeDefined();
      expect(res.body.evidenceDoc.sha256Hash.length).toBe(64); // Valid SHA-256 Hex
    });

    it('should reject evidence upload if category is invalid', async () => {
      const res = await request(app)
        .post('/api/portal/iso/evidence/upload')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          licenseeId: licenseeA.id,
          fileName: 'random_file.doc',
          category: 'INVALID_CATEGORY',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('category must be one of');
    });
  });

  describe('2. Multi-Tenant Evidence Locker Queries & Category Filtering', () => {
    it('should list evidence documents filtered by category', async () => {
      // Upload a second document of different category
      await request(app)
        .post('/api/portal/iso/evidence/upload')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          licenseeId: licenseeA.id,
          reportId: reportA.id,
          fileName: 'ThamesWater_Trade_Effluent_Discharge_Permit.pdf',
          category: 'WATER_TRADE_EFFLUENT_PERMIT',
          fileSizeBytes: 512000,
          mimeType: 'application/pdf',
        });

      // Query SCADA category specifically
      const scadaRes = await request(app)
        .get(`/api/portal/iso/evidence?licenseeId=${licenseeA.id}&category=SCADA_TELEMETRY`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(scadaRes.status).toBe(200);
      expect(scadaRes.body.documents.length).toBe(1);
      expect(scadaRes.body.documents[0].category).toBe('SCADA_TELEMETRY');

      // Query all documents
      const allRes = await request(app)
        .get(`/api/portal/iso/evidence?licenseeId=${licenseeA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(allRes.status).toBe(200);
      expect(allRes.body.totalDocuments).toBe(2);
    });
  });

  describe('3. Boardroom PDF Audit Report Generation & Streaming', () => {
    it('should stream signed ISO 14001 / 50001 PDF report with SHA-256 header and valid PDF buffer', async () => {
      const res = await request(app)
        .get(`/api/portal/iso/reports/${reportA.id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('ISO_Audit_Report_AR-2026-DH-01.pdf');
      expect(res.headers['x-document-integrity-sha256']).toBeDefined();
      expect(res.headers['x-document-integrity-sha256'].length).toBe(64);

      // Verify PDF binary buffer format (starts with %PDF)
      const pdfHeader = res.body.toString('ascii', 0, 4);
      expect(pdfHeader).toBe('%PDF');
    });

    it('should block PDF export with HTTP 423 Locked when unresolved baseline anomaly exists under ISO Clause 10.2', async () => {
      // Create an active non-conformance event for licenseeA
      const event = await prisma.nonConformanceEvent.create({
        data: {
          licenseeId: licenseeA.id,
          isoClause: 'ISO 50001:2018 Clause 9.1.1 (Energy Performance Evaluation)',
          assetTag: 'PUE-METER-01',
          metricName: 'PUE',
          baselineValue: 1.15,
          observedValue: 1.45,
          percentageVariance: 26.09,
          conformanceGrade: ConformanceGrade.MAJOR_NON_CONFORMANCE_GREENWASHING_RISK,
          isResolved: false,
        },
      });

      const resLocked = await request(app)
        .get(`/api/portal/iso/reports/${reportA.id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resLocked.status).toBe(423);
      expect(resLocked.body.error.code).toBe(423);
      expect(resLocked.body.error.status).toBe('RESOURCE_LOCKED');
      expect(resLocked.body.error.message).toContain('Transparency export locked');

      // Resolve the non-conformance event
      await prisma.nonConformanceEvent.update({
        where: { id: event.id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          rootCauseAnalysis: 'Recalibrated faulty sensor probe.',
          correctiveAction: 'Replaced thermocouple probe and performed zero-point calibration.',
        },
      });

      // Export must now unlock and succeed
      const resUnlocked = await request(app)
        .get(`/api/portal/iso/reports/${reportA.id}/pdf`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resUnlocked.status).toBe(200);
    });
  });

  describe('4. Multi-Tenant Row-Level Security on Evidence & PDF Exports', () => {
    it('should forbid Partner B from downloading Partner A PDF audit report (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/portal/iso/reports/${reportA.id}/pdf`)
        .set('Authorization', `Bearer ${tokenB}`); // Partner B token

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should forbid Partner B from querying Partner A evidence locker (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/portal/iso/evidence?licenseeId=${licenseeA.id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });
  });
});
