import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { exVatPoundsPerLitre, importWeeklyFuelPrices, parseWeeklyFuelCsv, valueOn } from '../src/services/market-index.service';

const prisma = new PrismaClient();
const app = createApp();
const admin = jwt.sign({ userId: 'admin', role: 'ADMIN', licenseeId: '' }, JWT_SECRET, { expiresIn: '1h' });
const client = jwt.sign({ userId: 'usr_partner_001', role: 'PARTNER', licenseeId: 'lic_itm_power' }, JWT_SECRET, { expiresIn: '1h' });

// Shape of the DESNZ weekly road fuel prices CSV (header text as published).
const CSV = [
  '﻿Date,ULSP (Ultra low sulphur unleaded petrol) Pump price in pence/litre,ULSD (Ultra low sulphur diesel) Pump price in pence/litre,ULSP (Ultra low sulphur unleaded petrol) Duty rate in pence/litre,ULSD (Ultra low sulphur diesel) Duty rate in pence/litre,ULSP (Ultra low sulphur unleaded petrol) VAT percentage rate,ULSD (Ultra low sulphur diesel) VAT percentage rate',
  '28/09/2026,173.46,197.58,52.95,52.95,20,20',
  '05/10/2026,174.88,199.52,52.95,52.95,20,20',
].join('\n');
const META = JSON.stringify({ details: { attachments: [{ url: 'https://assets.example.gov.uk/fuel.csv', content_type: 'text/csv' }, { url: 'https://assets.example.gov.uk/fuel.xlsx', content_type: 'application/xlsx' }] } });
const fakeFetch = async (url: string) => ({ ok: true, status: 200, text: async () => (url.endsWith('.csv') ? CSV : META) });

const savedFeed = process.env.UK_FUEL_PRICE_FEED_URL;
afterAll(async () => {
  if (savedFeed === undefined) delete process.env.UK_FUEL_PRICE_FEED_URL;
  else process.env.UK_FUEL_PRICE_FEED_URL = savedFeed;
  await prisma.marketIndexValue.deleteMany({ where: { sourceReference: { contains: 'assets.example.gov.uk' } } });
  await prisma.marketIndexValue.deleteMany({ where: { sourceReference: 'Test quotation' } });
  await prisma.marketIndex.deleteMany({ where: { code: 'TEST_AGGREGATE' } });
  await prisma.$disconnect();
});

describe('UK weekly road fuel prices', () => {
  it('parses the published CSV by header text and converts to pounds per litre excluding VAT', () => {
    const rows = parseWeeklyFuelCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[1].date.toISOString().slice(0, 10)).toBe('2026-10-05');
    expect(rows[1].prices.ULSD).toEqual({ pumpPencePerLitre: 199.52, vatPercent: 20 });
    expect(exVatPoundsPerLitre(199.52, 20).toString()).toBe('1.662667');
    expect(() => parseWeeklyFuelCsv('Date,Something\n01/01/2026,1')).toThrow(/not recognised/);
  });

  it('is off when the feed URL is unset', async () => {
    delete process.env.UK_FUEL_PRICE_FEED_URL;
    await expect(importWeeklyFuelPrices(prisma, fakeFetch)).rejects.toThrow(/feed is off/);
  });

  it('imports into the diesel and petrol indices once, and values are looked up by date', async () => {
    process.env.UK_FUEL_PRICE_FEED_URL = 'https://www.gov.uk/api/content/test';
    const first = await importWeeklyFuelPrices(prisma, fakeFetch);
    const again = await importWeeklyFuelPrices(prisma, fakeFetch);
    expect(again.inserted).toBe(0);
    expect(first.latestDate).toBe('2026-10-05');

    const diesel = await prisma.marketIndex.findUniqueOrThrow({ where: { code: 'UK_DIESEL_EX_VAT' } });
    const midweek = await valueOn(prisma, diesel.id, new Date('2026-10-07T00:00:00Z'));
    expect(midweek?.value.toString()).toBe('1.662667');
    const before = await valueOn(prisma, diesel.id, new Date('2026-10-01T00:00:00Z'));
    expect(before?.effectiveDate.toISOString().slice(0, 10)).toBe('2026-09-28');
  });
});

describe('Administrators manage market inputs', () => {
  it('is admin only', async () => {
    await request(app).get('/api/admin/market-indices').set('Authorization', `Bearer ${client}`).expect(403);
  });

  it('records manual values with a source, refuses bad input and feed indices, and allows correction', async () => {
    const carbon = await prisma.marketIndex.findUniqueOrThrow({ where: { code: 'UK_ETS_CARBON_PRICE' } });
    const diesel = await prisma.marketIndex.findUniqueOrThrow({ where: { code: 'UK_DIESEL_EX_VAT' } });
    const post = (id: string, body: object) =>
      request(app).post(`/api/admin/market-indices/${id}/values`).set('Authorization', `Bearer ${admin}`).send(body);

    await post(carbon.id, { effectiveDate: '2026-10-01', value: '-5', sourceReference: 'Test quotation' }).expect(400);
    await post(carbon.id, { effectiveDate: '2999-01-01', value: '40', sourceReference: 'Test quotation' }).expect(400);
    await post(carbon.id, { effectiveDate: '2026-10-01', value: '40', sourceReference: '' }).expect(400);
    await post(diesel.id, { effectiveDate: '2026-10-01', value: '1.5', sourceReference: 'Test quotation' }).expect(409);

    const created = await post(carbon.id, { effectiveDate: '2026-10-01', value: '41.25', sourceReference: 'Test quotation' }).expect(201);
    expect(created.body.value.value).toBe('41.25');
    expect(created.body.value.enteredByUserId).toBe('admin');
    await post(carbon.id, { effectiveDate: '2026-10-01', value: '42', sourceReference: 'Test quotation' }).expect(409);

    const list = await request(app).get('/api/admin/market-indices').set('Authorization', `Bearer ${admin}`).expect(200);
    const listed = list.body.indices.find((i: { code: string }) => i.code === 'UK_ETS_CARBON_PRICE');
    expect(listed.latest.value).toBe('41.25');

    await request(app)
      .delete(`/api/admin/market-indices/${carbon.id}/values/${created.body.value.id}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(204);
  });

  it('creates new manual inputs with validated fields', async () => {
    const create = (body: object) => request(app).post('/api/admin/market-indices').set('Authorization', `Bearer ${admin}`).send(body);
    await create({ code: 'bad code', name: 'x', category: 'MATERIAL', unit: 'GBP_PER_TONNE', currency: 'GBP', source: 'Supplier' }).expect(400);
    const ok = await create({ code: 'TEST_AGGREGATE', name: 'Crushed aggregate', category: 'MATERIAL', unit: 'GBP_PER_TONNE', currency: 'GBP', source: 'Supplier list' }).expect(201);
    expect(ok.body.index.feed).toBe('MANUAL');
    await create({ code: 'TEST_AGGREGATE', name: 'Again', category: 'MATERIAL', unit: 'GBP_PER_TONNE', currency: 'GBP', source: 'Supplier list' }).expect(409);
  });
});
