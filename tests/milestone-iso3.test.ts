import request from 'supertest';
import { resolveActiveSplitConfig } from '../src/services/split-config.service';
import { PrismaClient, Vertical, ConformanceGrade, RiskLevel, VerificationSource, DeliveryType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { AuditScoringService } from '../src/services/audit-scoring.service';

const prisma = new PrismaClient();

function createMockStripe() {
  const mockPaymentIntentsCreate = jest.fn().mockImplementation(() =>
    Promise.resolve({
      id: 'pi_iso3_mock',
      client_secret: 'pi_iso3_mock_secret',
    })
  );
  const mockPaymentIntentsRetrieve = jest.fn();

  const mockStripe = {
    paymentIntents: {
      create: mockPaymentIntentsCreate,
      retrieve: mockPaymentIntentsRetrieve,
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  } as unknown as Stripe;

  return {
    stripe: mockStripe,
    mockPaymentIntentsCreate,
    mockPaymentIntentsRetrieve,
  };
}

const { stripe, mockPaymentIntentsCreate } = createMockStripe();
const app = createApp(stripe);

describe('Milestone ISO-3: Industrial, Event & Custom Keepsake Scoring Engine', () => {
  let licenseeA: any;
  let licenseeB: any;
  let partnerUserA: any;
  let partnerUserB: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // 1. Clean DB in foreign key order
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
        id: 'lic_iso3_fleet_01',
        name: 'ElectraFleet Commercial Transport Ltd',
        vertical: Vertical.B2B_CLEAN_TECH,
        royaltyBps: 1500,
        pricePerDropCents: 500,
      },
    });

    licenseeB = await prisma.licensee.create({
      data: {
        id: 'lic_iso3_merch_02',
        name: 'Meridian Sporting & Milestone Keepsakes Ltd',
        vertical: Vertical.B2C_SPORTS_MERCH,
        royaltyBps: 1500,
        pricePerDropCents: 500,
        stripeConnectedAccountId: 'acct_iso3_meridian_test',
      },
    });

    // 3. Seed Portal Users
    const adminUser = await prisma.portalUser.create({
      data: {
        id: 'usr_iso3_admin',
        email: 'admin@ghglogodrop.com',
        passwordHash,
        role: 'ADMIN',
      },
    });

    partnerUserA = await prisma.portalUser.create({
      data: {
        email: 'auditor@electrafleet.com',
        passwordHash,
        licenseeId: licenseeA.id,
        role: 'PARTNER',
      },
    });

    partnerUserB = await prisma.portalUser.create({
      data: {
        email: 'manager@meridian-keepsakes.com',
        passwordHash,
        licenseeId: licenseeB.id,
        role: 'PARTNER',
      },
    });

    // 4. Seed Active Charity and Platform Split Config
    await prisma.charity.createMany({
      data: [
        { id: 'charity_iso3_green', name: 'Green Earth Foundation', stripeConnectedAccountId: 'acct_ch_green', status: 'ACTIVE' },
      ],
      skipDuplicates: true,
    });

    await prisma.splitConfigHistory.create({
      data: {
        licenseeId: null,
        royaltyBps: 8500,
        charityAllocationBps: [{ charityId: 'charity_iso3_green', bps: 10000 }],
        changedByUserId: adminUser.id,
        isActive: true,
      },
    });

    tokenA = jwt.sign({ userId: partnerUserA.id, licenseeId: licenseeA.id, role: 'PARTNER' }, JWT_SECRET);
    tokenB = jwt.sign({ userId: partnerUserB.id, licenseeId: licenseeB.id, role: 'PARTNER' }, JWT_SECRET);
  });

  beforeEach(() => {
    mockPaymentIntentsCreate.mockResolvedValue({
      id: 'pi_iso3_mock',
      client_secret: 'pi_iso3_mock_secret',
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Questionnaire Template Retrieval & 5-Pillar Evaluation', () => {
    it('should return 5-pillar questionnaire templates for COMMERCIAL_FLEET', async () => {
      const res = await request(app).get('/api/iso/audits/templates/COMMERCIAL_FLEET');
      expect(res.status).toBe(200);
      expect(res.body.pillarCount).toBe(5);
      expect(res.body.templateRows[0].pillarName).toContain('Lithium-Ion Battery');
      expect(res.body.templateRows[0].weight).toBe(0.25);
    });

    it('should evaluate 5-pillar fleet scorecard and calculate accurate weighted score (Conformant)', async () => {
      const templateRows = AuditScoringService.getTemplateRowsForFacility('COMMERCIAL_FLEET');

      // Adjust scores: Row 3 (Powertrain) = 4.0, others 5.0
      // Weighted score = (5.0*0.25) + (5.0*0.20) + (4.0*0.15) + (5.0*0.20) + (5.0*0.20) = 1.25 + 1.0 + 0.6 + 1.0 + 1.0 = 4.85
      const scoredRows = templateRows.map((r, idx) =>
        idx === 2 ? { ...r, scorePoints: 4.0, complianceGrading: ConformanceGrade.OPPORTUNITY_FOR_IMPROVEMENT } : r
      );

      const res = await request(app)
        .post('/api/iso/audits/evaluate')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          licenseeId: licenseeA.id,
          auditRefId: 'SC-2026-AUTO-01',
          facilityType: 'COMMERCIAL_FLEET',
          leadAuditorName: 'Lead Assurance Officer, GMC, LL.B.',
          rows: scoredRows,
          summaryNotes: 'Commercial EV fleet evaluated under ISO 6469 / ISO 12405-4 standards.',
        });

      expect(res.status).toBe(201);
      expect(res.body.report.weightedScore).toBe(4.85);
      expect(res.body.report.greenwashingRiskLevel).toBe(RiskLevel.LOW_RISK_CONFORMANT);
      expect(res.body.report.overallGrade).toBe(ConformanceGrade.CONFORMANT);
      expect(res.body.report.matrixRows.length).toBe(5);
    });
  });

  describe('2. Critical Greenwashing Risk Detection on Missing Proof', () => {
    it('should automatically categorize report as HIGH_RISK_GREENWASHING_EXPOSURE if any critical pillar scores 0.0', async () => {
      const templateRows = AuditScoringService.getTemplateRowsForFacility('COMMERCIAL_FLEET');

      // Set Pillar 1 (Battery Runaway proof) to 0.0 points
      const failedRows = templateRows.map((r, idx) =>
        idx === 0
          ? {
              ...r,
              scorePoints: 0.0,
              complianceGrading: ConformanceGrade.MAJOR_NON_CONFORMANCE_GREENWASHING_RISK,
              rootCause: 'Supplier withheld thermal runaway cell-to-cell propagation test sheets.',
              mandatoryCorrectiveAction: 'Halt vehicle delivery pending ISO 12405-4 laboratory audit.',
            }
          : r
      );

      const res = await request(app)
        .post('/api/iso/audits/evaluate')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          licenseeId: licenseeA.id,
          auditRefId: 'SC-2026-AUTO-02-FAILED',
          facilityType: 'COMMERCIAL_FLEET',
          leadAuditorName: 'Lead Assurance Officer, GMC, LL.B.',
          rows: failedRows,
        });

      expect(res.status).toBe(201);
      expect(res.body.report.greenwashingRiskLevel).toBe(RiskLevel.HIGH_RISK_GREENWASHING_EXPOSURE);
      expect(res.body.report.overallGrade).toBe(ConformanceGrade.MAJOR_NON_CONFORMANCE_GREENWASHING_RISK);
    });
  });

  describe('3. Custom Milestone Keepsake Studio (Goal/Moment on Apparel)', () => {
    it('should generate live keepsake preview priced from the catalogue with ISO 14067 LCA carbon grams', async () => {
      const res = await request(app)
        .post('/api/custom-merch/preview')
        .send({
          garmentModel: 'HEAVYWEIGHT_HOODIE',
          inscribedText: "Bukayo Saka 89' Top-Corner Winner",
          threadColor: 'GOLD_METALLIC',
          placement: 'LEFT_CHEST',
          quantity: 2,
          unitPriceCents: 9000, // £90.00
        });

      expect(res.status).toBe(200);
      const preview = res.body.preview;
      const garment = await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'HEAVYWEIGHT_HOODIE' } });
      const split = await resolveActiveSplitConfig(prisma, garment.licenseeId);
      // The client's £90.00 is ignored; the catalogue price applies.
      expect(preview.financialSummary.grossAmountCents).toBe(garment.pricePence! * 2);
      expect(preview.financialSummary.charityPercentage).toBe((10000 - split.royaltyBps) / 100);
      expect(preview.dualImpactMetrics.estimatedLcaCarbonGrams).toBe(garment.lcaGrams! * 2);
      expect(preview.dualImpactMetrics.artisanLaborHours).toBe(garment.laborHours! * 2);
      expect(preview.canvasRenderSpec.threadHex).toBe('#D4AF37');
    });

    it('should complete bespoke keepsake checkout and persist CustomKeepsakeSpec', async () => {
      const res = await request(app)
        .post('/api/custom-merch/checkout')
        .send({
          licenseeId: licenseeB.id,
          garmentModel: 'HEAVYWEIGHT_HOODIE',
          inscribedText: 'Sarah & Alex Wedding — 28 August 2026',
          threadColor: 'STERLING_SILVER',
          placement: 'LEFT_CHEST',
          quantity: 1,
          unitPriceCents: 8500,
          currency: 'GBP',
        });

      expect(res.status).toBe(201);
      expect(res.body.transactionId).toBeDefined();
      expect(res.body.clientSecret).toBe('pi_iso3_mock_secret');
      const garment = await prisma.merchProduct.findUniqueOrThrow({ where: { id: 'HEAVYWEIGHT_HOODIE' } });
      expect(res.body.financialSummary.grossAmountCents).toBe(garment.pricePence);
      const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transactionId } });
      expect(tx.grossAmountCents).toBe(garment.pricePence);
      expect(tx.licenseeId).toBe(garment.licenseeId);
      expect(res.body.keepsakeSpec.inscribedText).toBe('Sarah & Alex Wedding — 28 August 2026');

      // Verify in DB that CustomKeepsakeSpec exists
      const savedSpec = await prisma.customKeepsakeSpec.findUnique({
        where: { transactionId: res.body.transactionId },
      });
      expect(savedSpec).not.toBeNull();
      expect(savedSpec?.garmentModel).toBe('HEAVYWEIGHT_HOODIE');
    });
  });

  describe('4. Multi-Tenant RLS Security on Audit Reports', () => {
    it('should forbid Partner B from reading Partner A audit reports (403 Forbidden)', async () => {
      const reportA = await prisma.auditInspectionReport.findFirst({
        where: { licenseeId: licenseeA.id },
      });
      expect(reportA).not.toBeNull();

      const res = await request(app)
        .get(`/api/iso/audits/${reportA!.id}`)
        .set('Authorization', `Bearer ${tokenB}`); // Partner B token

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should allow Partner A to list their own audit reports', async () => {
      const res = await request(app)
        .get('/api/iso/audits')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.licenseeId).toBe(licenseeA.id);
      expect(res.body.totalReports).toBeGreaterThanOrEqual(2);
    });
  });

  afterAll(async () => {
    await prisma.charityAllocation.deleteMany({ where: { charityId: 'charity_iso3_green' } }).catch(() => {});
    await prisma.splitConfigHistory.deleteMany({
      where: {
        charityAllocationBps: {
          equals: [{ charityId: 'charity_iso3_green', bps: 10000 }],
        },
      },
    }).catch(() => {});
    await prisma.charity.deleteMany({ where: { id: 'charity_iso3_green' } }).catch(() => {});
    await prisma.$disconnect();
  });
});

