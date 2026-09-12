/**
 * demo-booking.test.ts
 *
 * Automated test suite for Enterprise Demo Booking (Hybrid Flow backend):
 * - GET  /api/demo/slots   — Dynamic schedule slot availability
 * - POST /api/demo/book    — Corporate email validation, meeting URL generation, DB persistence
 */

import request from 'supertest';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';

const prisma = new PrismaClient();
let testApp: any;

beforeAll(async () => {
  const mockStripe = {
    paymentIntents: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
  } as unknown as Stripe;
  testApp = createApp(mockStripe);

  // Clean up any previous test demo bookings
  await prisma.demoBooking.deleteMany({
    where: {
      workEmail: {
        contains: 'test-demo',
      },
    },
  });
});

afterAll(async () => {
  await prisma.demoBooking.deleteMany({
    where: {
      workEmail: {
        contains: 'test-demo',
      },
    },
  });
  await prisma.$disconnect();
});

describe('Enterprise Demo Booking API', () => {
  it('GET /api/demo/slots returns available schedule slots for upcoming business days', async () => {
    const res = await request(testApp).get('/api/demo/slots');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);

    const firstSlot = res.body.slots[0];
    expect(firstSlot).toHaveProperty('iso');
    expect(firstSlot).toHaveProperty('formatted');
    expect(firstSlot).toHaveProperty('available');
    expect(typeof firstSlot.available).toBe('boolean');
  });

  it('POST /api/demo/book rejects missing full name with 400', async () => {
    const res = await request(testApp)
      .post('/api/demo/book')
      .send({
        fullName: '',
        workEmail: 'audit.lead@enterprise-energy.co.uk',
        companyName: 'Enterprise Energy Ltd',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/full name/i);
  });

  it('POST /api/demo/book rejects invalid email syntax with 400', async () => {
    const res = await request(testApp)
      .post('/api/demo/book')
      .send({
        fullName: 'Jane Doe, VP Sustainability',
        workEmail: 'not-an-email',
        companyName: 'Enterprise Energy Ltd',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  it('POST /api/demo/book rejects consumer/free webmail domains (@gmail.com) with 400', async () => {
    const res = await request(testApp)
      .post('/api/demo/book')
      .send({
        fullName: 'Jane Doe, VP Sustainability',
        workEmail: 'janedoe@gmail.com',
        companyName: 'Enterprise Energy Ltd',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/corporate or organizational work email/i);
  });

  it('POST /api/demo/book rejects missing company name with 400', async () => {
    const res = await request(testApp)
      .post('/api/demo/book')
      .send({
        fullName: 'Jane Doe, VP Sustainability',
        workEmail: 'test-demo.jane@enterprise-energy.co.uk',
        companyName: ' ',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/company or authority name/i);
  });

  it('POST /api/demo/book creates verified demo booking with Google Meet & calendar links', async () => {
    // Get a slot from GET /api/demo/slots
    const slotsRes = await request(testApp).get('/api/demo/slots');
    const targetSlot = slotsRes.body.slots[0].iso;

    const res = await request(testApp)
      .post('/api/demo/book')
      .send({
        fullName: 'Dr. Sarah Connor, Chief Environmental Officer',
        workEmail: 'test-demo.sarah@enterprise-energy.co.uk',
        companyName: 'Enterprise Energy UK plc',
        facilityCount: '12 Facilities (Scope 1 & 2)',
        primaryScope: 'DUAL_SCOPE',
        requestedSlot: targetSlot,
        ndaRequested: true,
        bookingMethod: 'FORM',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.id).toBeDefined();
    expect(res.body.booking.fullName).toBe('Dr. Sarah Connor, Chief Environmental Officer');
    expect(res.body.booking.workEmail).toBe('test-demo.sarah@enterprise-energy.co.uk');
    expect(res.body.booking.companyName).toBe('Enterprise Energy UK plc');
    expect(res.body.booking.primaryScope).toBe('DUAL_SCOPE');
    expect(res.body.booking.ndaRequested).toBe(true);
    expect(res.body.booking.status).toBe('CONFIRMED');

    expect(res.body.googleCalendarUrl).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render/);

    // Verify record in PostgreSQL database
    const dbRecord = await prisma.demoBooking.findUnique({
      where: { id: res.body.booking.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.workEmail).toBe('test-demo.sarah@enterprise-energy.co.uk');
  });

  it('GET /api/demo/slots reflects booked slot as unavailable', async () => {
    // Check that the previously booked slot now has available = false
    const slotsRes = await request(testApp).get('/api/demo/slots');
    const firstSlot = slotsRes.body.slots[0];
    expect(firstSlot.available).toBe(false);
  });

  it('GET /api/admin/demo-bookings rejects unauthenticated requests with 401', async () => {
    const res = await request(testApp).get('/api/admin/demo-bookings');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/demo-bookings returns list of inquiries when authenticated', async () => {
    const res = await request(testApp)
      .get('/api/admin/demo-bookings')
      .set('Authorization', 'Bearer dummy-admin-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bookings)).toBe(true);
    expect(res.body.bookings.length).toBeGreaterThan(0);
  });
});
