import {
  AssessmentDecisionEngine,
  IntakeAssessmentInput,
} from '../src/services/assessment.service';
import {
  FRAMEWORK_CHECKLIST_TEMPLATES,
} from '../src/services/preparation-checklist.service';
import {
  OrganisationSize,
  RevenueBand,
  IndustrySector,
  WorkflowType,
  ComplianceEffort,
  PrimaryRole,
} from '@prisma/client';

describe('Assessment Layer & Decision Engine (Sprint 0)', () => {
  describe('AssessmentDecisionEngine.evaluate', () => {
    it('mandates UK SECR for large UK enterprises (>250 staff or >£36m turnover)', () => {
      const input: IntakeAssessmentInput = {
        organisationCountry: 'GB',
        organisationSize: OrganisationSize.LARGE_250_PLUS,
        annualRevenueBand: RevenueBand.BAND_36M_PLUS,
        industrySector: IndustrySector.MANUFACTURING,
        hasPhysicalSites: true,
        hasProductionProcess: true,
        hasFleet: true,
        hasIoTMeters: false,
        isUKPublicContractor: false,
        hasPlanningConsent: false,
        makesPublicGreenClaims: false,
        hasGreenHydrogen: false,
      };

      const recommendations = AssessmentDecisionEngine.evaluate(input);
      const secr = recommendations.find((r) => r.frameworkCode === 'UK_SECR');

      expect(secr).toBeDefined();
      expect(secr?.isLegallyMandatory).toBe(true);
      expect(secr?.workflowType).toBe(WorkflowType.CARBON);
      expect(secr?.enforcementBody).toContain('Financial Reporting Council');
      expect(secr?.plainEnglishWhy).toContain('statutory duty under the Companies Act 2006');
    });

    it('does NOT mandate UK SECR for small non-UK companies', () => {
      const input: IntakeAssessmentInput = {
        organisationCountry: 'DE',
        organisationSize: OrganisationSize.SMALL_10_49,
        annualRevenueBand: RevenueBand.BAND_2M_10M,
        industrySector: IndustrySector.RETAIL_CONSUMER_GOODS,
        hasPhysicalSites: true,
        hasProductionProcess: false,
        hasFleet: false,
        hasIoTMeters: false,
        isUKPublicContractor: false,
        hasPlanningConsent: false,
        makesPublicGreenClaims: false,
        hasGreenHydrogen: false,
      };

      const recommendations = AssessmentDecisionEngine.evaluate(input);
      const secr = recommendations.find((r) => r.frameworkCode === 'UK_SECR');
      expect(secr).toBeUndefined();
    });

    it('mandates PPN 06/21 Carbon Reduction Plan for public sector contractors', () => {
      const input: IntakeAssessmentInput = {
        organisationCountry: 'GB',
        organisationSize: OrganisationSize.MEDIUM_50_249,
        annualRevenueBand: RevenueBand.BAND_10M_36M,
        industrySector: IndustrySector.CONSTRUCTION,
        hasPhysicalSites: true,
        hasProductionProcess: false,
        hasFleet: true,
        hasIoTMeters: false,
        isUKPublicContractor: true,
        hasPlanningConsent: false,
        makesPublicGreenClaims: false,
        hasGreenHydrogen: false,
      };

      const recommendations = AssessmentDecisionEngine.evaluate(input);
      const ppn = recommendations.find((r) => r.frameworkCode === 'UK_PPN_0621');

      expect(ppn).toBeDefined();
      expect(ppn?.isLegallyMandatory).toBe(true);
      expect(ppn?.consequenceIfSkipped).toContain('Mandatory disqualification from bidding');
    });

    it('mandates Section 106 and Job Creation for UK planning consent developments', () => {
      const input: IntakeAssessmentInput = {
        organisationCountry: 'GB',
        organisationSize: OrganisationSize.SMALL_10_49,
        annualRevenueBand: RevenueBand.BAND_2M_10M,
        industrySector: IndustrySector.REAL_ESTATE_PROPERTY,
        hasPhysicalSites: true,
        hasProductionProcess: false,
        hasFleet: false,
        hasIoTMeters: false,
        isUKPublicContractor: false,
        hasPlanningConsent: true,
        makesPublicGreenClaims: false,
        hasGreenHydrogen: false,
      };

      const recommendations = AssessmentDecisionEngine.evaluate(input);
      const s106 = recommendations.find((r) => r.frameworkCode === 'UK_SECTION_106');

      expect(s106).toBeDefined();
      expect(s106?.isLegallyMandatory).toBe(true);
      expect(s106?.workflowType).toBe(WorkflowType.JOB);
      expect(s106?.enforcementBody).toContain('Local Planning Authority');
    });

    it('mandates CMA Green Claims Code compliance when public claims are asserted', () => {
      const input: IntakeAssessmentInput = {
        organisationCountry: 'GB',
        organisationSize: OrganisationSize.MICRO_UNDER_10,
        annualRevenueBand: RevenueBand.UNDER_2M,
        industrySector: IndustrySector.RETAIL_CONSUMER_GOODS,
        hasPhysicalSites: false,
        hasProductionProcess: false,
        hasFleet: false,
        hasIoTMeters: false,
        isUKPublicContractor: false,
        hasPlanningConsent: false,
        makesPublicGreenClaims: true,
        hasGreenHydrogen: false,
      };

      const recommendations = AssessmentDecisionEngine.evaluate(input);
      const cma = recommendations.find((r) => r.frameworkCode === 'UK_GREEN_CLAIMS_CODE');

      expect(cma).toBeDefined();
      expect(cma?.isLegallyMandatory).toBe(true);
      expect(cma?.consequenceIfSkipped).toContain('CMA formal investigations');
      expect(cma?.consequenceIfSkipped).toContain('10% of worldwide turnover');
    });

    it('mandates CertifHy & LCHS for Green Hydrogen producers', () => {
      const input: IntakeAssessmentInput = {
        organisationCountry: 'GB',
        organisationSize: OrganisationSize.SMALL_10_49,
        annualRevenueBand: RevenueBand.BAND_2M_10M,
        industrySector: IndustrySector.GREEN_HYDROGEN,
        hasPhysicalSites: true,
        hasProductionProcess: true,
        hasFleet: false,
        hasIoTMeters: true,
        isUKPublicContractor: false,
        hasPlanningConsent: false,
        makesPublicGreenClaims: false,
        hasGreenHydrogen: true,
      };

      const recommendations = AssessmentDecisionEngine.evaluate(input);
      const h2 = recommendations.find((r) => r.frameworkCode === 'GREEN_HYDROGEN_CERTIFHY');

      expect(h2).toBeDefined();
      expect(h2?.isLegallyMandatory).toBe(true);
      expect(h2?.estimatedEffort).toBe(ComplianceEffort.HIGH);
      expect(h2?.consequenceIfSkipped).toContain('Ineligibility for Hydrogen Business Model');
    });

    it('always places legally mandatory frameworks first in displayOrder', () => {
      const input: IntakeAssessmentInput = {
        organisationCountry: 'GB',
        organisationSize: OrganisationSize.LARGE_250_PLUS,
        annualRevenueBand: RevenueBand.BAND_36M_PLUS,
        industrySector: IndustrySector.MANUFACTURING,
        hasPhysicalSites: true,
        hasProductionProcess: true,
        hasFleet: true,
        hasIoTMeters: true,
        isUKPublicContractor: true,
        hasPlanningConsent: true,
        makesPublicGreenClaims: true,
        hasGreenHydrogen: false,
      };

      const recommendations = AssessmentDecisionEngine.evaluate(input);
      expect(recommendations.length).toBeGreaterThanOrEqual(4);

      let seenNonMandatory = false;
      for (const rec of recommendations) {
        if (!rec.isLegallyMandatory) {
          seenNonMandatory = true;
        } else {
          expect(seenNonMandatory).toBe(false);
        }
      }

      // displayOrder should be sequential 1, 2, 3...
      recommendations.forEach((rec, idx) => {
        expect(rec.displayOrder).toBe(idx + 1);
      });
    });
  });

  describe('FRAMEWORK_CHECKLIST_TEMPLATES', () => {
    it('provides exhaustive templates for all statutory frameworks', () => {
      const expectedCodes = [
        'UK_SECR',
        'UK_PPN_0621',
        'UK_SECTION_106',
        'UK_GREEN_CLAIMS_CODE',
        'GREEN_HYDROGEN_CERTIFHY',
        'ISO_14064_1',
        'ISO_50001',
        'SOCIAL_VALUE_JOBS',
      ];

      for (const code of expectedCodes) {
        const templates = FRAMEWORK_CHECKLIST_TEMPLATES[code];
        expect(templates).toBeDefined();
        expect(templates.length).toBeGreaterThan(0);

        for (const item of templates) {
          expect(item.itemCode).toBeDefined();
          expect(item.plainEnglishLabel).toBeDefined();
          expect(item.plainEnglishGuidance).toBeDefined();
          expect(item.isoClauseReference).toBeDefined();
          expect(item.dataType).toBeDefined();
          expect(typeof item.isMandatory).toBe('boolean');
        }
      }
    });

    it('ensures UK_SECR template includes electricity, gas, intensity metric and narrative', () => {
      const templates = FRAMEWORK_CHECKLIST_TEMPLATES.UK_SECR;
      const codes = templates.map((t) => t.itemCode);

      expect(codes).toContain('SECR_ELECTRICITY_USAGE');
      expect(codes).toContain('SECR_GAS_COMBUSTION');
      expect(codes).toContain('SECR_INTENSITY_METRIC');
      expect(codes).toContain('SECR_ENERGY_EFFICIENCY_NARRATIVE');
    });
  });
});

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

describe('Assessment and Preparation Checklist API End-to-End Suite', () => {
  const prisma = new PrismaClient();
  const testApp = createApp();

  let testLicenseeId: string;
  let partnerUserId: string;
  let adminUserId: string;
  let partnerToken: string;
  let adminToken: string;

  let createdAssessmentId: string;
  let recommendationId: string;
  let checklistId: string;
  let sampleItemId: string;

  beforeAll(async () => {
    const licensee = await prisma.licensee.create({
      data: {
        id: 'lic_e2e_babysitter_' + Date.now(),
        name: 'Nexus Clean Energy Systems Ltd',
        vertical: 'B2B_CLEAN_TECH',
        royaltyBps: 8500,
        organisationCountry: 'GB',
        industrySector: IndustrySector.MANUFACTURING,
        hasCompletedAssessment: false,
      },
    });
    testLicenseeId = licensee.id;

    const partnerUser = await prisma.portalUser.create({
      data: {
        email: `partner.compliance.${Date.now()}@nexusenergy.co.uk`,
        passwordHash: 'dummy-hash-test',
        role: 'PARTNER',
        licenseeId: testLicenseeId,
        firstName: 'Marcus',
        lastName: 'Vance',
        jobTitle: 'Head of Regulatory Affairs',
        primaryRole: PrimaryRole.COMPLIANCE_OFFICER,
        isOnboardingComplete: false,
      },
    });
    partnerUserId = partnerUser.id;

    const adminUser = await prisma.portalUser.create({
      data: {
        email: `admin.auditor.${Date.now()}@iso-auditor.org`,
        passwordHash: 'dummy-hash-test',
        role: 'ADMIN',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        jobTitle: 'Senior ISO Lead Auditor',
        primaryRole: PrimaryRole.LEGAL_OFFICER,
      },
    });
    adminUserId = adminUser.id;

    partnerToken = jwt.sign(
      { userId: partnerUserId, licenseeId: testLicenseeId, role: 'PARTNER' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    adminToken = jwt.sign(
      { userId: adminUserId, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
  });

  afterAll(async () => {
    if (testLicenseeId) {
      await prisma.preparationChecklistItem.deleteMany({
        where: { checklist: { licenseeId: testLicenseeId } },
      });
      await prisma.preparationChecklist.deleteMany({
        where: { licenseeId: testLicenseeId },
      });
      await prisma.complianceRecommendation.deleteMany({
        where: { licenseeId: testLicenseeId },
      });
      await prisma.clientAssessment.deleteMany({
        where: { licenseeId: testLicenseeId },
      });
      await prisma.portalUser.deleteMany({
        where: { id: { in: [partnerUserId, adminUserId] } },
      });
      await prisma.licensee.deleteMany({
        where: { id: testLicenseeId },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. POST /api/assessment', () => {
    it('rejects unauthenticated intake requests with 401', async () => {
      const res = await request(testApp)
        .post('/api/assessment')
        .send({});

      expect(res.status).toBe(401);
    });

    it('rejects missing required intake fields with 400', async () => {
      const res = await request(testApp)
        .post('/api/assessment')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          organisationCountry: 'GB',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Valid organisationSize is required');
    });

    it('submits valid 12-question intake, generates recommendations and checklists, marks licensee completed', async () => {
      const intakePayload = {
        organisationCountry: 'GB',
        organisationSize: 'LARGE_250_PLUS',
        annualRevenueBand: 'BAND_36M_PLUS',
        industrySector: 'MANUFACTURING',
        hasPhysicalSites: true,
        hasProductionProcess: true,
        hasFleet: true,
        hasIoTMeters: true,
        isUKPublicContractor: true,
        hasPlanningConsent: false,
        makesPublicGreenClaims: true,
        hasGreenHydrogen: false,
      };

      const res = await request(testApp)
        .post('/api/assessment')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send(intakePayload);

      expect(res.status).toBe(200);
      expect(res.body.assessment).toBeDefined();
      expect(res.body.assessment.licenseeId).toBe(testLicenseeId);
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(res.body.recommendations.length).toBeGreaterThan(0);

      createdAssessmentId = res.body.assessment.id;
      recommendationId = res.body.recommendations[0].id;

      // Check DB licensee updated
      const lic = await prisma.licensee.findUnique({ where: { id: testLicenseeId } });
      expect(lic?.hasCompletedAssessment).toBe(true);
      expect(lic?.industrySector).toBe('MANUFACTURING');

      // Check checklists auto-generated for accepted recommendations
      const checklists = await prisma.preparationChecklist.findMany({
        where: { licenseeId: testLicenseeId },
        include: { items: true },
      });
      expect(checklists.length).toBeGreaterThan(0);
      checklistId = checklists[0].id;
      expect(checklists[0].items.length).toBeGreaterThan(0);
      sampleItemId = checklists[0].items[0].id;
    });
  });

  describe('2. GET /api/assessment and Recommendations', () => {
    it('fetches latest assessment for authenticated licensee', async () => {
      const res = await request(testApp)
        .get('/api/assessment')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.assessment).toBeDefined();
      expect(res.body.assessment.id).toBe(createdAssessmentId);
      expect(Array.isArray(res.body.assessment.recommendations)).toBe(true);
    });

    it('fetches recommendations ordered with legally mandatory first', async () => {
      const res = await request(testApp)
        .get('/api/assessment/recommendations')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(res.body.recommendations.length).toBeGreaterThan(0);

      // Verify display order
      const recs = res.body.recommendations;
      let seenOptional = false;
      for (const rec of recs) {
        if (!rec.isLegallyMandatory) {
          seenOptional = true;
        } else {
          expect(seenOptional).toBe(false);
        }
      }
    });

    it('allows client to update acceptance decision on recommendation', async () => {
      const res = await request(testApp)
        .post(`/api/assessment/recommendations/${recommendationId}/decide`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          clientAccepted: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.recommendation.clientAccepted).toBe(true);
    });
  });

  describe('3. Preparation Checklist Console Endpoints', () => {
    it('lists all preparation checklists with completion rates', async () => {
      const res = await request(testApp)
        .get('/api/checklists')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.checklists)).toBe(true);
      expect(res.body.checklists.length).toBeGreaterThan(0);
    });

    it('fetches single preparation checklist by id with full items', async () => {
      const res = await request(testApp)
        .get(`/api/checklists/${checklistId}`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.checklist.id).toBe(checklistId);
      expect(Array.isArray(res.body.checklist.items)).toBe(true);
      // Client view must not expose raw internal clause reference in customer facing fields
      expect(res.body.checklist.items[0].plainEnglishLabel).toBeDefined();
    });

    it('updates checklist item status to COMPLETE', async () => {
      const res = await request(testApp)
        .patch(`/api/checklists/items/${sampleItemId}`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          status: 'COMPLETE',
        });

      expect(res.status).toBe(200);
      expect(res.body.checklist).toBeDefined();
      const updatedItem = res.body.checklist.items.find((i: any) => i.id === sampleItemId);
      expect(updatedItem).toBeDefined();
      expect(updatedItem.status).toBe('COMPLETE');
      expect(updatedItem.completedAt).toBeDefined();
    });
  });

  describe('4. Auditor Item Waiver and Admin Readiness Tracker', () => {
    it('forbids partner user from waiving a checklist item', async () => {
      const res = await request(testApp)
        .post(`/api/admin/checklists/items/${sampleItemId}/waive`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          reason: 'Partner attempting self waiver',
        });

      expect(res.status).toBe(403);
    });

    it('allows Admin / Lead Auditor to waive an item with audit reason', async () => {
      const res = await request(testApp)
        .post(`/api/admin/checklists/items/${sampleItemId}/waive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Auditor inspection confirmed utility meters consolidated under parent holding entity.',
        });

      expect(res.status).toBe(200);
      expect(res.body.checklist).toBeDefined();
      const waivedItem = res.body.checklist.items.find((i: any) => i.id === sampleItemId);
      expect(waivedItem).toBeDefined();
      expect(waivedItem.status).toBe('WAIVED');
      expect(waivedItem.waivedReason).toContain('Auditor inspection confirmed');
    });

    it('forbids partner user from querying Admin Readiness Tracker', async () => {
      const res = await request(testApp)
        .get('/api/admin/readiness-tracker')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
    });

    it('returns full readiness overview across all licensees for Admin', async () => {
      const res = await request(testApp)
        .get('/api/admin/readiness-tracker')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.licensees)).toBe(true);

      const targetLicensee = res.body.licensees.find((l: any) => l.licenseeId === testLicenseeId);
      expect(targetLicensee).toBeDefined();
      expect(targetLicensee.hasCompletedAssessment).toBe(true);
      expect(typeof targetLicensee.readinessPercentage).toBe('number');
      expect(Array.isArray(targetLicensee.frameworks)).toBe(true);
    });
  });
});

