import {
  AssessmentDecisionEngine,
  IntakeAssessmentInput,
} from '../src/services/assessment.service';
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
        services: ['GHG'],
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
      expect(secr?.workflowType).toBe(WorkflowType.GHG);
      expect(secr?.enforcementBody).toContain('Financial Reporting Council');
      expect(secr?.plainEnglishWhy).toContain('statutory duty under the Companies Act 2006');
    });

    it('does NOT mandate UK SECR for small non-UK companies', () => {
      const input: IntakeAssessmentInput = {
        services: ['GHG'],
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

    it('mandates the PPN 006 Carbon Reduction Plan for public sector contractors', () => {
      const input: IntakeAssessmentInput = {
        services: ['GHG'],
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
      const ppn = recommendations.find((r) => r.frameworkCode === 'UK_PPN_006');

      expect(ppn).toBeDefined();
      expect(ppn?.isLegallyMandatory).toBe(true);
      expect(ppn?.consequenceIfSkipped).toContain('Mandatory disqualification from bidding');
    });

    it('mandates Section 106 and Job Creation for UK planning consent developments', () => {
      const input: IntakeAssessmentInput = {
        services: ['WORKFORCE'],
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
        services: ['GHG'],
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

    it('mandates the Low Carbon Hydrogen Standard for green hydrogen producers', () => {
      const input: IntakeAssessmentInput = {
        services: ['GHG'],
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
      const h2 = recommendations.find((r) => r.frameworkCode === 'UK_LCHS');

      expect(h2).toBeDefined();
      expect(h2?.isLegallyMandatory).toBe(true);
      expect(h2?.estimatedEffort).toBe(ComplianceEffort.HIGH);
      expect(h2?.consequenceIfSkipped).toContain('Ineligibility for Hydrogen Business Model');
    });

    it('always places legally mandatory frameworks first in displayOrder', () => {
      const input: IntakeAssessmentInput = {
        services: ['GHG', 'WORKFORCE'],
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
});

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { syncFrameworkRegistry } from '../src/services/framework-registry';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

describe('Assessment API and Admin Readiness Tracker', () => {
  const prisma = new PrismaClient();
  const testApp = createApp();

  let testLicenseeId: string;
  let partnerUserId: string;
  let adminUserId: string;
  let partnerToken: string;
  let adminToken: string;

  let createdAssessmentId: string;
  let recommendationId: string;

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
      await prisma.workflowSubmission.deleteMany({ where: { licenseeId: testLicenseeId } });
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

    it('submits the GHG onboarding, generates recommendations, marks licensee completed', async () => {
      const intakePayload = {
        service: 'GHG',
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

      // Preparation is part of the questionnaire now: onboarding creates no separate checklist.
      expect(await prisma.preparationChecklist.count({ where: { licenseeId: testLicenseeId } })).toBe(0);
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

  describe('3. Admin Readiness Tracker', () => {
    it('forbids partner user from querying Admin Readiness Tracker', async () => {
      const res = await request(testApp)
        .get('/api/admin/readiness-tracker')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
    });

    it('shows each framework with how far its submission has got', async () => {
      await syncFrameworkRegistry(prisma);
      const rec = await prisma.complianceRecommendation.findFirstOrThrow({ where: { id: recommendationId } });
      const framework = await prisma.workflowFramework.findUniqueOrThrow({
        where: { code: rec.frameworkCode },
        include: { versions: { where: { retiredAt: null }, orderBy: { publishedAt: 'desc' }, include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
      });
      const version = framework.versions[0];
      const [first, second] = version.questions;
      await prisma.workflowSubmission.create({
        data: {
          licenseeId: testLicenseeId,
          workflowType: framework.workflowType,
          frameworkId: framework.id,
          frameworkVersionId: version.id,
          answers: {
            create: [
              { questionId: first.id, value: 'true' },
              { questionId: second.id, value: '' },
            ],
          },
        },
      });

      const res = await request(testApp).get('/api/admin/readiness-tracker').set('Authorization', `Bearer ${adminToken}`).expect(200);
      const row = res.body.licensees.find((l: any) => l.licenseeId === testLicenseeId);
      expect(row).toBeDefined();
      expect(row.hasCompletedAssessment).toBe(true);
      expect(row.primaryContact.email).toMatch(/^partner\.compliance\./);
      expect(row).not.toHaveProperty('readinessPercentage');

      const entry = row.frameworks.find((f: any) => f.frameworkCode === rec.frameworkCode);
      expect(entry.submission).toMatchObject({
        status: 'DRAFT',
        answeredCount: 1,
        questionCount: version.questions.length,
        missingEvidenceCount: version.questions.filter((q) => q.evidenceRequired).length,
      });
      const untouched = row.frameworks.filter((f: any) => f.frameworkCode !== rec.frameworkCode);
      for (const f of untouched) expect(f.submission).toBeNull();

      // The platform's own account is not a client.
      expect(res.body.licensees.some((l: any) => l.licenseeId === 'lic_ghg_official')).toBe(false);
    });
  });
});

describe('Onboarding routes each client to isolated services', () => {
  const prisma = new PrismaClient();
  const app = createApp();
  const created: { licenseeIds: string[]; userIds: string[] } = { licenseeIds: [], userIds: [] };

  const org = {
    organisationCountry: 'GB',
    organisationSize: 'LARGE_250_PLUS',
    annualRevenueBand: 'BAND_36M_PLUS',
    industrySector: 'CONSTRUCTION',
  };
  const ghgAnswers = {
    hasPhysicalSites: true,
    hasProductionProcess: false,
    hasFleet: true,
    hasIoTMeters: false,
    isUKPublicContractor: true,
    makesPublicGreenClaims: false,
    hasGreenHydrogen: false,
  };

  const makeClient = async (label: string) => {
    const suffix = `${label}_${Date.now().toString(36)}`;
    const licensee = await prisma.licensee.create({
      data: { id: `lic_route_${suffix}`, name: `Routing ${suffix}`, vertical: 'B2B_HEAVY_MANUFACTURING' },
    });
    const user = await prisma.portalUser.create({
      data: { email: `route.${suffix}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId: licensee.id },
    });
    created.licenseeIds.push(licensee.id);
    created.userIds.push(user.id);
    const token = jwt.sign({ userId: user.id, licenseeId: licensee.id, role: 'PARTNER' }, JWT_SECRET, { expiresIn: '1h' });
    return { licenseeId: licensee.id, userId: user.id, token };
  };

  const entitlement = (licenseeId: string, serviceLine: 'GHG' | 'CARBON' | 'JOB' | 'FLEET') =>
    prisma.serviceEntitlement.findUnique({ where: { licenseeId_serviceLine: { licenseeId, serviceLine } } });

  afterAll(async () => {
    const where = { licenseeId: { in: created.licenseeIds } };
    await prisma.complianceRecommendation.deleteMany({ where });
    await prisma.clientAssessment.deleteMany({ where });
    await prisma.serviceRoutingEvent.deleteMany({ where });
    await prisma.serviceEntitlement.deleteMany({ where });
    await prisma.portalUser.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.licensee.deleteMany({ where: { id: { in: created.licenseeIds } } });
    await prisma.$disconnect();
  });

  it('only recommends frameworks for the chosen service', () => {
    const base = { ...org, organisationSize: OrganisationSize.LARGE_250_PLUS, annualRevenueBand: RevenueBand.BAND_36M_PLUS, industrySector: IndustrySector.CONSTRUCTION, hasPlanningConsent: true, ...ghgAnswers };
    const ghg = AssessmentDecisionEngine.evaluate({ ...base, services: ['GHG'] });
    expect(ghg.some((r) => r.workflowType === WorkflowType.JOB)).toBe(false);
    expect(ghg.map((r) => r.frameworkCode)).toContain('UK_PPN_006');

    const workforce = AssessmentDecisionEngine.evaluate({ ...base, services: ['WORKFORCE'] });
    expect(workforce.every((r) => r.workflowType === WorkflowType.JOB)).toBe(true);
    expect(workforce.map((r) => r.frameworkCode)).toContain('UK_SECTION_106');

    expect(AssessmentDecisionEngine.evaluate({ ...base, services: ['FLEET'] })).toEqual([]);
  });

  it.each([
    [{ ...org, ...ghgAnswers }, /services must list one or more/],
    [{ ...org, service: 'MERCH', ...ghgAnswers }, /services must list one or more/],
    [{ ...org, services: ['GHG', 'MERCH'], ...ghgAnswers }, /services must list one or more/],
    [{ ...org, services: ['GHG', 'WORKFORCE'], ...ghgAnswers }, /hasPlanningConsent must be answered/],
    [{ ...org, service: 'GHG', ...ghgAnswers, hasFleet: 'yes' }, /hasFleet must be answered yes or no/],
    [{ ...org, service: 'WORKFORCE', isUKPublicContractor: true }, /hasPlanningConsent must be answered/],
    [{ ...org, service: 'FLEET', fleetProfile: { assetCountBand: '11_50', categories: [], cloudConnection: 'SOME' } }, /categories/],
    [{ ...org, service: 'FLEET', fleetProfile: { assetCountBand: 'LOTS', categories: ['EXCAVATOR'], cloudConnection: 'SOME' } }, /assetCountBand/],
  ])('rejects invalid onboarding answers %#', async (body, message) => {
    const client = await makeClient('invalid');
    const res = await request(app).post('/api/assessment').set('Authorization', `Bearer ${client.token}`).send(body).expect(400);
    expect(res.body.error).toMatch(message);
  });

  it('routes a GHG client, activates GHG and carbon frameworks only, and logs why', async () => {
    const client = await makeClient('ghg');
    const res = await request(app)
      .post('/api/assessment')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ ...org, service: 'GHG', ...ghgAnswers })
      .expect(200);

    expect(res.body.destination).toBe('/portal?tab=workflow&scope=CARBON_EMISSION');
    expect((await entitlement(client.licenseeId, 'GHG'))!.status).toBe('ACTIVE');
    expect((await entitlement(client.licenseeId, 'CARBON'))!.status).toBe('ACTIVE');
    expect(await entitlement(client.licenseeId, 'JOB')).toBeNull();
    expect(await entitlement(client.licenseeId, 'FLEET')).toBeNull();

    const events = await prisma.serviceRoutingEvent.findMany({ where: { licenseeId: client.licenseeId }, orderBy: { createdAt: 'asc' } });
    expect(events.map((e) => e.eventType)).toEqual(['SERVICE_SELECTED', 'SERVICE_ACTIVATED', 'SERVICE_ACTIVATED']);
    const selected = events[0].detail as { service: string; answers: { isUKPublicContractor: boolean } };
    expect(selected.service).toBe('GHG');
    expect(selected.answers.isUKPublicContractor).toBe(true);
    expect(events.every((e) => e.actor === client.userId)).toBe(true);
  });

  it('onboards several services at once, each with its own entitlements, landing on the first', async () => {
    const client = await makeClient('multi');
    const res = await request(app)
      .post('/api/assessment')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ ...org, services: ['WORKFORCE', 'GHG'], ...ghgAnswers, hasPlanningConsent: true })
      .expect(200);

    expect(res.body.destination).toBe('/portal?tab=workflow&scope=CARBON_EMISSION');
    expect((await entitlement(client.licenseeId, 'GHG'))!.status).toBe('ACTIVE');
    expect((await entitlement(client.licenseeId, 'JOB'))!.status).toBe('ACTIVE');
    expect(await entitlement(client.licenseeId, 'FLEET')).toBeNull();
    const codes = res.body.recommendations.map((r: { frameworkCode: string }) => r.frameworkCode);
    expect(codes).toEqual(expect.arrayContaining(['UK_PPN_006', 'UK_SECTION_106']));
  });

  it('keeps assessment history when onboarding is repeated and gates only on the current one', async () => {
    const client = await makeClient('history');
    const first = await request(app).post('/api/assessment').set('Authorization', `Bearer ${client.token}`).send({ ...org, service: 'GHG', ...ghgAnswers }).expect(200);
    const second = await request(app).post('/api/assessment').set('Authorization', `Bearer ${client.token}`).send({ ...org, service: 'GHG', ...ghgAnswers, isUKPublicContractor: false }).expect(200);

    const old = await prisma.clientAssessment.findUnique({ where: { id: first.body.assessment.id } });
    expect(old!.supersededAt).not.toBeNull();

    const current = await request(app).get('/api/assessment').set('Authorization', `Bearer ${client.token}`).expect(200);
    expect(current.body.assessment.id).toBe(second.body.assessment.id);
    expect(current.body.assessment.recommendations.map((r: { frameworkCode: string }) => r.frameworkCode)).not.toContain('UK_PPN_006');

  });

  it('adds Workforce later as a separate service and refuses to add it twice', async () => {
    const client = await makeClient('add');
    await request(app).post('/api/assessment').set('Authorization', `Bearer ${client.token}`).send({ ...org, service: 'GHG', ...ghgAnswers }).expect(200);

    const added = await request(app)
      .post('/api/assessment/services')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ service: 'WORKFORCE', isUKPublicContractor: true, hasPlanningConsent: true })
      .expect(200);
    expect(added.body.destination).toBe('/portal?tab=workflow&scope=JOB_REPORTING');
    expect((await entitlement(client.licenseeId, 'JOB'))!.status).toBe('ACTIVE');

    const assessment = await prisma.clientAssessment.findFirst({
      where: { licenseeId: client.licenseeId, supersededAt: null },
      include: { recommendations: true },
    });
    expect(assessment!.serviceLinesRequested).toEqual(expect.arrayContaining(['GHG', 'CARBON', 'JOB']));
    expect(assessment!.recommendations.map((r) => r.frameworkCode)).toContain('UK_SECTION_106');

    const addedEvent = await prisma.serviceRoutingEvent.findFirst({ where: { licenseeId: client.licenseeId, eventType: 'SERVICE_ADDED' } });
    expect((addedEvent!.detail as { service: string }).service).toBe('WORKFORCE');

    await request(app)
      .post('/api/assessment/services')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ service: 'WORKFORCE', isUKPublicContractor: true, hasPlanningConsent: true })
      .expect(409);
  });

  it('routes a Fleet client to Fleet with its profile and leaves activation to the subscription', async () => {
    const client = await makeClient('fleet');
    const res = await request(app)
      .post('/api/assessment')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ ...org, service: 'FLEET', fleetProfile: { assetCountBand: '11_50', categories: ['EXCAVATOR', 'GENERATOR', 'EXCAVATOR'], cloudConnection: 'SOME' } })
      .expect(200);

    expect(res.body.destination).toBe('/portal?tab=fleet');
    expect(res.body.recommendations).toEqual([]);
    expect((await entitlement(client.licenseeId, 'FLEET'))!.status).toBe('PENDING');
    const assessment = await prisma.clientAssessment.findUnique({ where: { id: res.body.assessment.id } });
    expect(assessment!.fleetProfile).toEqual({ assetCountBand: '11_50', categories: ['EXCAVATOR', 'GENERATOR'], cloudConnection: 'SOME' });
  });

  it('never reactivates a service an administrator suspended, and logs the attempt', async () => {
    const client = await makeClient('hold');
    await prisma.serviceEntitlement.create({
      data: { licenseeId: client.licenseeId, serviceLine: 'CARBON', status: 'SUSPENDED', revokedBy: 'admin_user', revokeReason: 'Non-conformance hold' },
    });

    await request(app).post('/api/assessment').set('Authorization', `Bearer ${client.token}`).send({ ...org, service: 'GHG', ...ghgAnswers }).expect(200);

    expect((await entitlement(client.licenseeId, 'CARBON'))!.status).toBe('SUSPENDED');
    expect((await entitlement(client.licenseeId, 'GHG'))!.status).toBe('ACTIVE');
    const blocked = await prisma.serviceRoutingEvent.findFirst({ where: { licenseeId: client.licenseeId, eventType: 'SERVICE_ACTIVATION_BLOCKED' } });
    expect(blocked!.serviceLine).toBe('CARBON');
  });
});

