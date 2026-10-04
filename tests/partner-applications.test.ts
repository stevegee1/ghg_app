import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';

const prisma = new PrismaClient();
const app = createApp();
const COMPANY = `Leeds Cargo Bikes ${Date.now().toString(36)}`;

const valid = {
  companyName: COMPANY,
  workEmail: 'operations@leedscargobikes.co.uk',
  countryCode: 'GB',
  regionOfOperation: 'Leeds, LS1-LS17',
  capabilities: ['DELIVERY_CARGO_BIKE', 'DELIVERY_SAME_DAY'],
  monthlyCapacityUnits: '500_2000',
  certifications: ['B_CORP'],
};

afterAll(async () => {
  await prisma.fulfillmentPartnerApplication.deleteMany({ where: { companyName: COMPANY } });
  await prisma.$disconnect();
});

describe('Delivery and production partner applications', () => {
  it('accepts an application with known services', async () => {
    const res = await request(app).post('/api/partners/fulfillment/apply').send(valid).expect(201);
    const stored = await prisma.fulfillmentPartnerApplication.findUnique({ where: { id: res.body.applicationId } });
    expect(stored).toMatchObject({ capabilities: ['DELIVERY_CARGO_BIKE', 'DELIVERY_SAME_DAY'], regionOfOperation: 'Leeds, LS1-LS17', status: 'PENDING' });
  });

  it('rejects missing or unknown services, certifications and capacity', async () => {
    await request(app).post('/api/partners/fulfillment/apply').send({ ...valid, capabilities: [] }).expect(400);
    await request(app).post('/api/partners/fulfillment/apply').send({ ...valid, capabilities: ['TELEPORTATION'] }).expect(400);
    await request(app).post('/api/partners/fulfillment/apply').send({ ...valid, certifications: ['MADE_UP'] }).expect(400);
    await request(app).post('/api/partners/fulfillment/apply').send({ ...valid, monthlyCapacityUnits: 'LOTS' }).expect(400);
  });

  it('shows applications to administrators only', async () => {
    const partner = jwt.sign({ userId: 'someone', role: 'PARTNER', licenseeId: 'lic_x' }, JWT_SECRET, { expiresIn: '1h' });
    const admin = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
    await request(app).get('/api/admin/partners/fulfillment').set('Authorization', `Bearer ${partner}`).expect(403);
    const res = await request(app).get('/api/admin/partners/fulfillment').set('Authorization', `Bearer ${admin}`).expect(200);
    expect(res.body.applications.some((a: any) => a.companyName === COMPANY)).toBe(true);
  });
});
