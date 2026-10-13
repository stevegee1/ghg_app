import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { emailService } from '../src/services/email.service';

const prisma = new PrismaClient();
const app = createApp();

describe('Merchandise Enquiries and Keepsake Fulfillment Pipeline', () => {
  let adminUser: any;
  let partnerUser: any;
  let adminToken: string;
  let partnerToken: string;
  let sampleEnquiryId: string;
  let sampleKeepsakeId: string;

  beforeAll(async () => {
    // Clean test DB in foreign key order
    await prisma.merchEnquiry.deleteMany();
    await prisma.customKeepsakeSpec.deleteMany();
    await prisma.souvenirOrder.deleteMany();
    await prisma.charityAllocation.deleteMany();
    await prisma.financialSplit.deleteMany();
    await prisma.triggerEvent.deleteMany();
    await prisma.telemetryLog.deleteMany();
    await prisma.transaction.deleteMany({ where: { licenseeId: 'lic_merch_test' } });
    await prisma.portalUser.deleteMany({ where: { email: { in: ['admin-merch@greenwashing.tech', 'partner-merch@testcorp.com'] } } });

    const passwordHash = await bcrypt.hash('ProductionTest123!', 10);

    const licensee = await prisma.licensee.upsert({
      where: { id: 'lic_merch_test' },
      update: {},
      create: {
        id: 'lic_merch_test',
        name: 'Merch Test Licensee',
        vertical: 'B2B_CLEAN_TECH',
        royaltyBps: 8500,
      },
    });

    adminUser = await prisma.portalUser.create({
      data: {
        email: 'admin-merch@greenwashing.tech',
        passwordHash,
        role: 'ADMIN',
      },
    });

    partnerUser = await prisma.portalUser.create({
      data: {
        email: 'partner-merch@testcorp.com',
        passwordHash,
        role: 'PARTNER',
        licenseeId: licensee.id,
      },
    });

    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    partnerToken = jwt.sign(
      { userId: partnerUser.id, email: partnerUser.email, role: 'PARTNER', licenseeId: licensee.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Public Merchandise Enquiries (Contact for Order)', () => {
    it('should reject submission with missing required fields', async () => {
      const res = await request(app)
        .post('/api/merch/enquiry')
        .send({
          itemId: 'item_volcano_hoodie',
          itemTitle: 'Volcano Organic Hoodie',
          // missing contactName and contactEmail
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('should reject submission with invalid email format', async () => {
      const res = await request(app)
        .post('/api/merch/enquiry')
        .send({
          itemId: 'item_volcano_hoodie',
          itemTitle: 'Volcano Organic Hoodie',
          contactName: 'Jane Doe',
          contactEmail: 'not-a-valid-email',
          message: 'Interested in bulk order of 50 units',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid email/i);
    });

    it('should successfully submit public enquiry and persist in database', async () => {
      const res = await request(app)
        .post('/api/merch/enquiry')
        .send({
          itemId: 'item_volcano_hoodie',
          itemTitle: 'Volcano Organic Hoodie',
          contactName: 'Alex Mercer',
          contactEmail: 'alex.mercer@corporate-client.org',
          message: 'Requesting bespoke sizing and quote for 25 units.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.enquiryId).toBeDefined();
      sampleEnquiryId = res.body.enquiryId;

      const record = await prisma.merchEnquiry.findUnique({
        where: { id: sampleEnquiryId },
      });
      expect(record).not.toBeNull();
      expect(record?.contactName).toBe('Alex Mercer');
      expect(record?.contactEmail).toBe('alex.mercer@corporate-client.org');
      expect(record?.status).toBe('PENDING');
    });

    it('emails the team and acknowledges the customer', async () => {
      const savedAdmin = process.env.ADMIN_EMAIL;
      process.env.ADMIN_EMAIL = 'team@nftylogslabs.com';
      const notify = jest.spyOn(emailService, 'sendMerchEnquiryNotification').mockResolvedValue({ success: true, provider: 'TEST' });
      const ack = jest.spyOn(emailService, 'sendMerchEnquiryAcknowledgement').mockResolvedValue({ success: true, provider: 'TEST' });
      try {
        await request(app)
          .post('/api/merch/enquiry')
          .send({ itemId: 'tee', itemTitle: 'Team T-shirt', contactName: 'Sam', contactEmail: 'sam@club-example.org', message: '40 shirts' })
          .expect(201);
        expect(notify).toHaveBeenCalledWith(
          expect.objectContaining({ toEmail: 'team@nftylogslabs.com', itemTitle: 'Team T-shirt', contactEmail: 'sam@club-example.org', message: '40 shirts' })
        );
        expect(ack).toHaveBeenCalledWith({ toEmail: 'sam@club-example.org', contactName: 'Sam', itemTitle: 'Team T-shirt' });
      } finally {
        if (savedAdmin === undefined) delete process.env.ADMIN_EMAIL;
        else process.env.ADMIN_EMAIL = savedAdmin;
      }
    });

    it('still saves the enquiry when email delivery fails', async () => {
      jest.spyOn(emailService, 'sendMerchEnquiryAcknowledgement').mockRejectedValue(new Error('provider down'));
      const res = await request(app)
        .post('/api/merch/enquiry')
        .send({ itemId: 'tee', itemTitle: 'Team T-shirt', contactName: 'Kim', contactEmail: 'kim@club-example.org' })
        .expect(201);
      expect(await prisma.merchEnquiry.findUnique({ where: { id: res.body.enquiryId } })).not.toBeNull();
    });
  });

  describe('2. Admin Enquiry Moderation and Status Transitions', () => {
    it('should forbid unauthenticated access to admin enquiries', async () => {
      const res = await request(app).get('/api/admin/merch-enquiries');
      expect(res.status).toBe(401);
    });

    it('should forbid non-admin portal user from listing admin enquiries', async () => {
      const res = await request(app)
        .get('/api/admin/merch-enquiries')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to list enquiries and filter by status', async () => {
      const res = await request(app)
        .get('/api/admin/merch-enquiries?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.enquiries)).toBe(true);
      expect(res.body.enquiries.some((e: any) => e.id === sampleEnquiryId)).toBe(true);
    });

    it('should update enquiry status and admin notes', async () => {
      const res = await request(app)
        .patch(`/api/admin/merch-enquiries/${sampleEnquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'RESPONDED',
          adminNotes: 'Contacted client via email on 2026-09-24 with commercial quote.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.enquiry.status).toBe('RESPONDED');
      expect(res.body.enquiry.adminNotes).toContain('Contacted client');
    });
  });

  describe('3. Keepsake Orders Admin Fulfillment API', () => {
    beforeAll(async () => {
      // Create transaction and keepsake spec for fulfillment testing
      const tx = await prisma.transaction.create({
        data: {
          id: 'tx_keepsake_test_fulfillment',
          licenseeId: 'lic_merch_test',
          grossAmountCents: 14500,
          currency: 'GBP',
          triggerEvent: {
            create: {
              verificationSource: 'CONSUMER_OPT_IN',
              deliveryType: 'PHYSICAL',
              fulfillmentStatus: 'PENDING',
            },
          },
          financialSplit: {
            create: {
              licensorRoyaltyCents: 12325,
              charityGiftCents: 2175,
            },
          },
        },
      });

      const keepsake = await prisma.customKeepsakeSpec.create({
        data: {
          id: 'spec_keepsake_test_1',
          transactionId: tx.id,
          garmentModel: 'OVERSIZED_HOODIE_BLACK',
          inscribedText: 'ARSENAL 2-1 TOTTENHAM',
          threadColor: 'GOLD_METALLIC',
          placement: 'CHEST_CENTER',
          sportType: 'Football',
          garmentSize: 'L',
          frenzyClub: 'Arsenal FC',
          frenzyMoment: 'North London Derby Winner',
          customerEmail: 'gooner@emirates.co.uk',
          customerName: 'Sam Fan',
          fulfillmentStatus: 'PENDING',
          shippingAddress: {
            recipientName: 'Sam Fan',
            street: '75 Highbury Hill',
            city: 'London',
            postalCode: 'N5 1SZ',
            country: 'GB',
          },
        },
      });

      sampleKeepsakeId = keepsake.id;
    });

    it('should reject non-admin access to keepsake orders', async () => {
      const res = await request(app)
        .get('/api/admin/keepsake-orders')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to list all keepsake orders with shipping data', async () => {
      const res = await request(app)
        .get('/api/admin/keepsake-orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
      const found = res.body.orders.find((o: any) => o.id === sampleKeepsakeId);
      expect(found).toBeDefined();
      expect(found.garmentSize).toBe('L');
      expect(found.shippingAddress.city).toBe('London');
    });

    it('should allow admin to advance keepsake fulfillment status and assign tracking number', async () => {
      const res = await request(app)
        .patch(`/api/admin/keepsake-orders/${sampleKeepsakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fulfillmentStatus: 'DISPATCHED',
          trackingNumber: 'GB-ROYALMAIL-994821',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updated.fulfillmentStatus).toBe('DISPATCHED');
      expect(res.body.updated.trackingNumber).toBe('GB-ROYALMAIL-994821');
    });
  });
});
