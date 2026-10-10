import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { emailService } from '../src/services/email.service';

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

  it('rejects personal email providers', async () => {
    const res = await request(app).post('/api/partners/fulfillment/apply').send({ ...valid, workEmail: 'leedsbikes@gmail.com' }).expect(400);
    expect(res.body.error).toBeTruthy();
  });

  it('shows an application to administrators only after the applicant confirms the email link', async () => {
    const sent = jest.spyOn(emailService, 'sendPartnerVerificationEmail');
    const partner = jwt.sign({ userId: 'someone', role: 'PARTNER', licenseeId: 'lic_x' }, JWT_SECRET, { expiresIn: '1h' });
    const admin = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
    const listed = async () =>
      (await request(app).get('/api/admin/partners/fulfillment').set('Authorization', `Bearer ${admin}`).expect(200)).body.applications.some(
        (a: { companyName: string }) => a.companyName === COMPANY
      );

    const applied = await request(app).post('/api/partners/fulfillment/apply').send(valid).expect(201);
    expect(sent).toHaveBeenCalledWith(expect.objectContaining({ toEmail: valid.workEmail }));
    await request(app).get('/api/admin/partners/fulfillment').set('Authorization', `Bearer ${partner}`).expect(403);
    expect(await listed()).toBe(false);
    await request(app)
      .patch(`/api/admin/partners/fulfillment/${applied.body.applicationId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'APPROVED' })
      .expect(409);

    const verifyUrl = new URL(sent.mock.calls[sent.mock.calls.length - 1][0].verifyUrl);
    const token = verifyUrl.searchParams.get('token')!;
    await request(app).post('/api/partners/verify-email').send({ token: 'not-a-real-token' }).expect(400);
    const confirmed = await request(app).post('/api/partners/verify-email').send({ token }).expect(200);
    expect(confirmed.body.kind).toBe('DELIVERY');
    expect(await listed()).toBe(true);

    // Links are single use.
    await request(app).post('/api/partners/verify-email').send({ token }).expect(400);
    sent.mockRestore();
  });
});
