import request from 'supertest';
import { PrismaClient, CharityStatus, Vertical } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { createApp } from '../src/expressApp';
import { emailService } from '../src/services/email.service';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { expireElapsedCharityContracts } from '../src/cron/charity-expiry.cron';
import { getOrComputeDefaultCharityAllocations } from '../src/services/charity-allocation.service';

const prisma = new PrismaClient();

describe('Part C — ESG Split Engine & Charity Lifecycle', () => {
  let app: any;
  let adminUser: any;
  let partnerUser: any;
  let licensee: any;
  let adminToken: string;
  let partnerToken: string;
  let mockStripe: any;
  let expiredCharityId: string;

  beforeAll(async () => {
    // 1. Clean charity records
    await prisma.charityAllocation.deleteMany();
    await prisma.charityApplication.deleteMany();
    await prisma.charity.deleteMany();

    const passwordHash = await bcrypt.hash('SecureCharityPass123!', 10);

    // Create Admin User
    adminUser = await prisma.portalUser.create({
      data: {
        email: 'lead.auditor@ghg-esg.org',
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Create Partner Licensee & User
    licensee = await prisma.licensee.create({
      data: {
        name: 'Green Horizon Logistics',
        vertical: Vertical.B2C_SPORTS_MERCH,
      },
    });

    partnerUser = await prisma.portalUser.create({
      data: {
        email: 'ops@greenhorizon.com',
        passwordHash,
        role: 'PARTNER',
        licenseeId: licensee.id,
      },
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, role: 'ADMIN', licenseeId: '' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    partnerToken = jwt.sign(
      { userId: partnerUser.id, role: 'PARTNER', licenseeId: licensee.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Mock Stripe instance with accounts & accountLinks support
    mockStripe = {
      accounts: {
        create: jest.fn().mockImplementation(async (data: any) => ({
          id: `acct_mock_${Date.now()}`,
          business_type: data.business_type,
          email: data.email,
        })),
        retrieve: jest.fn().mockImplementation(async (id: string) => ({
          id,
          details_submitted: true,
          charges_enabled: true,
          payouts_enabled: true,
        })),
      },
      accountLinks: {
        create: jest.fn().mockImplementation(async (data: any) => ({
          url: `https://connect.stripe.com/setup/s/${data.account}`,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        })),
      },
      transfers: {
        create: jest.fn().mockImplementation(async (params: any) => ({
          id: `tr_mock_${Date.now()}`,
          amount: params.amount,
          currency: params.currency,
          destination: params.destination,
        })),
      },
      webhooks: {
        constructEvent: jest.fn().mockImplementation((payload: any) => {
          if (Buffer.isBuffer(payload)) {
            return JSON.parse(payload.toString('utf8'));
          }
          if (typeof payload === 'string') {
            return JSON.parse(payload);
          }
          return payload;
        }),
      },
    };

    app = createApp(mockStripe as unknown as Stripe);
  });

  afterAll(async () => {
    await prisma.charityAllocation.deleteMany();
    await prisma.charityApplication.deleteMany();
    await prisma.charity.deleteMany();
    if (adminUser?.id) await prisma.portalUser.delete({ where: { id: adminUser.id } }).catch(() => {});
    if (partnerUser?.id) await prisma.portalUser.delete({ where: { id: partnerUser.id } }).catch(() => {});
    if (licensee?.id) await prisma.licensee.delete({ where: { id: licensee.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('1. Slot Capacity & Charity Application (Step 1)', () => {
    it('GET /api/charities/slots returns 3 available slots initially', async () => {
      const res = await request(app)
        .get('/api/charities/slots')
        .expect(200);

      expect(res.body.maxCapacity).toBe(3);
      expect(res.body.committedCount).toBe(0);
      expect(res.body.availableSlots).toBe(3);
      expect(res.body.registrationOpen).toBe(true);
    });

    it('POST /api/charities/apply successfully creates a PENDING_APPLICATION without Stripe info', async () => {
      const res = await request(app)
        .post('/api/charities/apply')
        .send({
          name: 'The Ocean Cleanup Foundation',
          registeredCharityNumber: 'NL-854291',
          contactEmail: 'contact@oceancleanup.org',
          statement: 'Advanced technologies to rid the oceans of plastic.',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.charity.name).toBe('The Ocean Cleanup Foundation');
      expect(res.body.charity.status).toBe(CharityStatus.PENDING_APPLICATION);

      const dbCharity = await prisma.charity.findUnique({ where: { id: res.body.charity.id } });
      expect(dbCharity).toBeDefined();
      expect(dbCharity!.stripeConnectedAccountId).toBeNull();
      expect(dbCharity!.emailVerifiedAt).toBeNull();
    });

    it('POST /api/charities/apply rejects personal email providers', async () => {
      await request(app)
        .post('/api/charities/apply')
        .send({ name: 'Personal Mail Charity', contactEmail: 'founder@gmail.com', statement: 'Tree planting.' })
        .expect(400);
    });

    it('POST /api/partners/verify-email confirms the contact email from the emailed link', async () => {
      const sent = jest.spyOn(emailService, 'sendPartnerVerificationEmail');
      const res = await request(app)
        .post('/api/charities/apply')
        .send({ name: 'Leeds Rivers Trust', contactEmail: 'hello@leedsrivers.org.uk', statement: 'River clean-ups.' })
        .expect(201);
      const token = new URL(sent.mock.calls[0][0].verifyUrl).searchParams.get('token')!;
      sent.mockRestore();

      const confirmed = await request(app).post('/api/partners/verify-email').send({ token }).expect(200);
      expect(confirmed.body.kind).toBe('CHARITY');
      const stored = await prisma.charity.findUnique({ where: { id: res.body.charity.id } });
      expect(stored!.emailVerifiedAt).not.toBeNull();
      await prisma.charity.delete({ where: { id: res.body.charity.id } });

      // The first application confirms its email the same way before review.
      await prisma.charity.updateMany({ where: { contactEmail: 'contact@oceancleanup.org' }, data: { emailVerifiedAt: new Date() } });
    });

    it('POST /api/charities/apply validates required fields', async () => {
      const res = await request(app)
        .post('/api/charities/apply')
        .send({
          name: '',
          contactEmail: 'invalid-email',
          statement: '',
        })
        .expect(400);

      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/charities/apply rejects duplicate applications from the same email', async () => {
      const res = await request(app)
        .post('/api/charities/apply')
        .send({
          name: 'The Ocean Cleanup Foundation Second Try',
          contactEmail: 'contact@oceancleanup.org',
          statement: 'Another statement',
        })
        .expect(409);

      expect(res.body.error).toContain('already exists');
    });
  });

  describe('2. Admin Dashboard & Approval Workflow (Step 2)', () => {
    let pendingCharityId: string;

    beforeAll(async () => {
      const c = await prisma.charity.findFirst({
        where: { contactEmail: 'contact@oceancleanup.org' },
      });
      pendingCharityId = c!.id;
    });

    it('GET /api/admin/charities enforces ADMIN role authorization', async () => {
      // 401 Unauthenticated
      await request(app)
        .get('/api/admin/charities')
        .expect(401);

      // 403 Forbidden for non-admin
      await request(app)
        .get('/api/admin/charities')
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(403);
    });

    it('GET /api/admin/charities returns 3 padded slots and the pending application queue', async () => {
      const res = await request(app)
        .get('/api/admin/charities')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.maxCapacity).toBe(3);
      expect(res.body.slots).toHaveLength(3);
      expect(res.body.pendingApplications).toHaveLength(1);
      expect(res.body.pendingApplications[0].name).toBe('The Ocean Cleanup Foundation');
    });

    it('POST /api/admin/charities/:id/approve rejects unauthorized non-admin', async () => {
      await request(app)
        .post(`/api/admin/charities/${pendingCharityId}/approve`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(403);
    });

    it('POST /api/admin/charities/:id/approve transitions status to APPROVED_AWAITING_STRIPE and returns onboardingUrl', async () => {
      const res = await request(app)
        .post(`/api/admin/charities/${pendingCharityId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.charity.status).toBe(CharityStatus.APPROVED_AWAITING_STRIPE);
      expect(res.body.charity.stripeConnectedAccountId).toBeDefined();
      expect(res.body.onboardingUrl).toBeDefined();

      const dbCharity = await prisma.charity.findUnique({ where: { id: pendingCharityId } });
      expect(dbCharity!.status).toBe(CharityStatus.APPROVED_AWAITING_STRIPE);
      expect(dbCharity!.stripeConnectedAccountId).toBeTruthy();
    });
  });

  describe('3. Stripe Webhook account.updated & 1-Year Contract Activation (Step 3)', () => {
    it('POST /webhooks/stripe with account.updated transitions charity to ACTIVE with 1-year contract', async () => {
      const charity = await prisma.charity.findFirst({
        where: { status: CharityStatus.APPROVED_AWAITING_STRIPE },
      });
      expect(charity).toBeDefined();

      const eventPayload = {
        id: `evt_test_${Date.now()}`,
        type: 'account.updated',
        data: {
          object: {
            id: charity!.stripeConnectedAccountId,
            details_submitted: true,
            charges_enabled: true,
            payouts_enabled: true,
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValueOnce(eventPayload);

      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'valid_test_sig')
        .send(JSON.stringify(eventPayload))
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(res.body.received).toBe(true);

      const activatedCharity = await prisma.charity.findUnique({
        where: { id: charity!.id },
      });
      expect(activatedCharity!.status).toBe(CharityStatus.ACTIVE);
      expect(activatedCharity!.contractStartDate).toBeDefined();
      expect(activatedCharity!.contractEndDate).toBeDefined();

      const diffDays = Math.round(
        (activatedCharity!.contractEndDate!.getTime() - activatedCharity!.contractStartDate!.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(365);
    });
  });

  describe('4. Proof of Partnership PDF (Step 4)', () => {
    let activeCharityId: string;

    beforeAll(async () => {
      const c = await prisma.charity.findFirst({
        where: { status: CharityStatus.ACTIVE },
      });
      activeCharityId = c!.id;
    });

    it('GET /api/charities/:id/partnership-pdf streams valid PDF with proper headers', async () => {
      const res = await request(app)
        .get(`/api/charities/${activeCharityId}/partnership-pdf`)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain(`GHG-Charity-Partnership-${activeCharityId}.pdf`);
      // PDF file signature begins with %PDF-
      expect(res.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });

  describe('5. Slot Cap Enforcement (Max 3 Committed)', () => {
    beforeAll(async () => {
      // We already have 1 ACTIVE charity. Add 2 more ACTIVE charities to fill all 3 slots.
      await prisma.charity.create({
        data: {
          name: 'Rainforest Trust UK',
          contactEmail: 'uk@rainforesttrust.org',
          status: CharityStatus.ACTIVE,
          stripeConnectedAccountId: 'acct_rf_trust',
          contractStartDate: new Date(),
          contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.charity.create({
        data: {
          name: 'Clean Air Task Force',
          contactEmail: 'partnerships@catf.us',
          status: CharityStatus.ACTIVE,
          stripeConnectedAccountId: 'acct_catf',
          contractStartDate: new Date(),
          contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    });

    it('POST /api/charities/apply locks with HTTP 423 when 3 slots are committed', async () => {
      const res = await request(app)
        .post('/api/charities/apply')
        .send({
          name: 'Fourth Charity Intender',
          contactEmail: 'fourth@charity.org',
          statement: 'Aiming to join filled slots',
        })
        .expect(423);

      expect(res.body.error).toContain('All 3 statutory charity positions are currently filled');
      expect(res.body.registrationOpen).toBe(false);
    });

    it('POST /api/admin/charities/:id/approve rejects approval if 3 slots are already committed', async () => {
      const pending = await prisma.charity.upsert({
        where: { id: 'test-pending-slot-cap' },
        update: { status: CharityStatus.PENDING_APPLICATION, emailVerifiedAt: new Date() },
        create: {
          id: 'test-pending-slot-cap',
          name: 'Pending Org For Cap Check',
          contactEmail: 'pending.cap@org.com',
          status: CharityStatus.PENDING_APPLICATION,
          emailVerifiedAt: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/admin/charities/${pending.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.error).toContain('All 3 statutory charity positions are already committed');
    });
  });

  describe('6. Scheduled Contract Expiry Job & Slot Reopening (Step 6)', () => {
    beforeAll(async () => {
      // Mark one active charity contract as elapsed (yesterday)
      const oneActive = await prisma.charity.findFirst({
        where: { status: CharityStatus.ACTIVE },
      });
      expiredCharityId = oneActive!.id;

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.charity.update({
        where: { id: expiredCharityId },
        data: { contractEndDate: yesterday },
      });
    });

    it('expireElapsedCharityContracts cron function transitions elapsed charity to EXPIRED', async () => {
      const result = await expireElapsedCharityContracts(prisma);

      expect(result.expiredCount).toBe(1);
      expect(result.expiredCharityIds).toContain(expiredCharityId);
      expect(result.reopenedSlotCount).toBe(1);

      const dbCharity = await prisma.charity.findUnique({ where: { id: expiredCharityId } });
      expect(dbCharity!.status).toBe(CharityStatus.EXPIRED);
    });

    it('GET /api/charities/slots shows slot reopened after expiration', async () => {
      const res = await request(app)
        .get('/api/charities/slots')
        .expect(200);

      // Now committed is 2 (3 - 1 expired), available is 1
      expect(res.body.committedCount).toBe(2);
      expect(res.body.availableSlots).toBe(1);
      expect(res.body.registrationOpen).toBe(true);
    });

    it('POST /api/admin/charities/check-expirations admin maintenance endpoint succeeds', async () => {
      const res = await request(app)
        .post('/api/admin/charities/check-expirations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('expiredCount');
    });
  });

  describe('7. ESG Split Engine & Missing Stripe Account Protection', () => {
    it('getOrComputeDefaultCharityAllocations strictly ignores EXPIRED and PENDING charities', async () => {
      const allocations = await getOrComputeDefaultCharityAllocations(prisma, 1500);

      // There are currently 2 ACTIVE charities in DB
      expect(allocations).toHaveLength(2);
      const totalAllocated = allocations.reduce((sum, a) => sum + a.amountCents, 0);
      expect(totalAllocated).toBe(1500);

      // Ensure the expired charity is not in allocations
      const expiredAlloc = allocations.find((a) => a.charityId === expiredCharityId);
      expect(expiredAlloc).toBeUndefined();
    });

    it('Webhook skips missing stripeConnectedAccountId and flags transferFailed without throwing or blocking transaction', async () => {
      // Create an active charity with missing stripeConnectedAccountId
      const noStripeCharity = await prisma.charity.create({
        data: {
          name: 'Charity With Missing Stripe',
          contactEmail: 'nostripe@charity.org',
          status: CharityStatus.ACTIVE,
          stripeConnectedAccountId: null, // missing account
        },
      });

      // Create transaction, financial split, and charity allocation
      const tx = await prisma.transaction.create({
        data: {
          licenseeId: licensee.id,
          grossAmountCents: 10000,
          currency: 'GBP',
          status: 'PENDING',
          financialSplit: {
            create: {
              licensorRoyaltyCents: 8500, // 85% platform
              charityGiftCents: 1500, // 15% charity
              charityAllocations: {
                create: [
                  {
                    charityId: noStripeCharity.id,
                    amountCents: 1500,
                    retryCount: 0,
                    transferFailed: false,
                  },
                ],
              },
            },
          },
        },
        include: {
          financialSplit: {
            include: { charityAllocations: true },
          },
        },
      });

      const allocId = tx.financialSplit!.charityAllocations[0].id;

      // Simulate payment_intent.succeeded webhook
      const webhookPayload = {
        id: `evt_pi_${Date.now()}`,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_test_${Date.now()}`,
            metadata: { transactionId: tx.id },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValueOnce(webhookPayload);

      const res = await request(app)
        .post('/webhooks/stripe')
        .set('stripe-signature', 'valid_test_sig')
        .send(JSON.stringify(webhookPayload))
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(res.body.received).toBe(true);

      // Verify transaction settled and platform 85% retained
      const updatedTx = await prisma.transaction.findUnique({
        where: { id: tx.id },
        include: { financialSplit: { include: { charityAllocations: true } } },
      });
      expect(updatedTx!.status).toBe('SETTLED');
      expect(updatedTx!.financialSplit!.licensorRoyaltyCents).toBe(8500);

      // Verify allocation marked transferFailed: true without crashing
      const updatedAlloc = updatedTx!.financialSplit!.charityAllocations[0];
      expect(updatedAlloc.id).toBe(allocId);
      expect(updatedAlloc.transferFailed).toBe(true);
      expect(updatedAlloc.stripeTransferId).toBeNull();

      // Clean up specific test transaction and split
      await prisma.charityAllocation.deleteMany({ where: { financialSplit: { transactionId: tx.id } } });
      await prisma.financialSplit.deleteMany({ where: { transactionId: tx.id } });
      await prisma.transaction.delete({ where: { id: tx.id } });
    });
  });
});
