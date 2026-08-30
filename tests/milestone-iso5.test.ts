import request from 'supertest';
import { PrismaClient, Vertical } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { LegalContractsService } from '../src/services/legal-contracts.service';
import { CmaValidatorService } from '../src/services/cma-validator.service';

const prisma = new PrismaClient();
const app = createApp();

describe('Milestone ISO-5: Class 35 Legal Firewall, CMA Validator & Onboarding Suite', () => {
  let licenseeA: any;
  let partnerUserA: any;
  let partnerUserB: any;
  let tokenA: string;
  let tokenB: string;

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

    licenseeA = await prisma.licensee.create({
      data: {
        id: 'lic_iso5_cleantech_01',
        name: 'Apex CleanTech Solutions Ltd',
        vertical: Vertical.B2B_CLEAN_TECH,
        royaltyBps: 1500,
      },
    });

    const licenseeB = await prisma.licensee.create({
      data: {
        id: 'lic_iso5_heavy_02',
        name: 'Vanguard Industrial Corp',
        vertical: Vertical.B2B_HEAVY_MANUFACTURING,
        royaltyBps: 1500,
      },
    });

    partnerUserA = await prisma.portalUser.create({
      data: {
        email: 'legal@apex-cleantech.com',
        passwordHash,
        licenseeId: licenseeA.id,
        role: 'PARTNER',
      },
    });

    partnerUserB = await prisma.portalUser.create({
      data: {
        email: 'legal@vanguard-heavy.com',
        passwordHash,
        licenseeId: licenseeB.id,
        role: 'PARTNER',
      },
    });

    tokenA = jwt.sign({ userId: partnerUserA.id, licenseeId: licenseeA.id, role: 'PARTNER' }, JWT_SECRET);
    tokenB = jwt.sign({ userId: partnerUserB.id, licenseeId: licenseeB.id, role: 'PARTNER' }, JWT_SECRET);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. UK CMA Green Claims Code Text Validator', () => {
    it('should flag absolute greenwashing terms and suggest compliant replacements', async () => {
      const res = await request(app)
        .post('/api/iso/cma/validate')
        .send({
          text: 'This is a 100% Green Hoodie with Zero Emissions Steel from our Carbon Neutral Event.',
        });

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(false);
      expect(res.body.score).toBeLessThanOrEqual(50);
      expect(res.body.flaggedPhrases.length).toBeGreaterThanOrEqual(3);

      const phrases = res.body.flaggedPhrases.map((f: any) => f.phrase.toLowerCase());
      expect(phrases.some((p: string) => p.includes('100% green'))).toBe(true);
      expect(phrases.some((p: string) => p.includes('zero emissions steel'))).toBe(true);
      expect(phrases.some((p: string) => p.includes('carbon neutral event'))).toBe(true);

      expect(res.body.suggestedCompliantText).toContain('ISO 14064');
      expect(res.body.suggestedCompliantText).toContain('ISO 22734');
    });

    it('should approve fully compliant and substantiated ISO lineage text (100% score)', async () => {
      const res = await request(app)
        .post('/api/iso/cma/validate')
        .send({
          text: 'Processes verified under the GHG Logo Drop methodology in strict accordance with ISO 14064-1 data.',
        });

      expect(res.status).toBe(200);
      expect(res.body.isValid).toBe(true);
      expect(res.body.score).toBe(100);
      expect(res.body.flaggedPhrases.length).toBe(0);
      expect(res.body.legalGuidance).toContain('complies with UK CMA');
    });
  });

  describe('2. Class 35 vs Class 36 Financial Separation Firewall', () => {
    it('should approve valid Class 35 fixed software and drop transaction fee models', () => {
      const legalService = new LegalContractsService(prisma);

      const result1 = legalService.validateClass35FeeStructure({
        billingModel: 'FIXED_SOFTWARE_LICENSE',
        feeCents: 50000,
        description: 'Monthly SaaS software assurance platform access',
      });
      expect(result1.isApproved).toBe(true);
      expect(result1.classification).toContain('CLASS_35');

      const result2 = legalService.validateClass35FeeStructure({
        billingModel: 'PER_TRANSACTION_DROP_FEE',
        feeCents: 500,
        description: 'Per-drop environmental transaction validation fee',
      });
      expect(result2.isApproved).toBe(true);
    });

    it('should reject carbon credit brokerage commission attempts with Class 36 Firewall Exception', () => {
      const legalService = new LegalContractsService(prisma);

      expect(() =>
        legalService.validateClass35FeeStructure({
          billingModel: 'CARBON_CREDIT_BROKERAGE_COMMISSION',
          feeCents: 15000,
          description: '5% Brokerage commission on carbon credit spot market trades',
        })
      ).toThrow(/CLASS 36 FIREWALL VIOLATION/);

      expect(() =>
        legalService.validateClass35FeeStructure({
          billingModel: 'OFFSET_TRADING_MARGIN',
          feeCents: 10000,
          description: 'Carbon offset trading fee margin',
        })
      ).toThrow(/CLASS 36 FIREWALL VIOLATION/);
    });
  });

  describe('3. Master Contract Addendum B & Onboarding Roadmap Generator', () => {
    it('should generate pre-filled Addendum B contract markdown with Section X clauses', async () => {
      const res = await request(app)
        .get(`/api/iso/legal/addendum-b?licenseeId=${licenseeA.id}&signatoryName=Director_Jane_Smith`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const addendum = res.body.addendum;
      expect(addendum.clientLegalName).toBe('Apex CleanTech Solutions Ltd');
      expect(addendum.authorizedSignatoryName).toBe('Director_Jane_Smith');
      expect(addendum.contractMarkdown).toContain('ADDENDUM B: TECHNICAL CLARIFICATION');
      expect(addendum.contractMarkdown).toContain('Nice Classification Class 35');
      expect(addendum.contractMarkdown).toContain('ISO 14065');
      expect(addendum.contractMarkdown).toContain('fifteen percent (15%)');
    });

    it('should return structured 30-60-90 Day Consultant Onboarding Roadmap', async () => {
      const res = await request(app)
        .get(`/api/iso/consulting/onboarding-roadmap?licenseeId=${licenseeA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const roadmap = res.body.roadmap;
      expect(roadmap.totalDurationDays).toBe(90);
      expect(roadmap.phases.length).toBe(3);
      expect(roadmap.phases[0].phaseName).toContain('Phase 1 (Days 1–30)');
      expect(roadmap.phases[1].phaseName).toContain('Phase 2 (Days 31–60)');
      expect(roadmap.phases[2].phaseName).toContain('Phase 3 (Days 61–90)');
    });

    it('should forbid Partner B from generating legal addenda for Partner A (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/iso/legal/addendum-b?licenseeId=${licenseeA.id}`)
        .set('Authorization', `Bearer ${tokenB}`); // Partner B token

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });
  });
});
