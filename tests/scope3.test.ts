import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { emailService } from '../src/services/email.service';
import { collectFingerprints, leafHashFor } from '../src/services/anchor/anchor-batch.service';
import { recordHash } from '../src/services/canonical-hash.service';

const prisma = new PrismaClient();
const app = createApp();
const s = Date.now().toString(36);

let licenseeId: string;
let otherLicensee: string;
let noServiceLicensee: string;
let token: string;
let otherToken: string;
let noServiceToken: string;
let chainId: string;

beforeAll(async () => {
  const lic = async (name: string, line: 'GHG' | 'FLEET' | null) => {
    const l = await prisma.licensee.create({ data: { name: `${name} ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    if (line) await prisma.serviceEntitlement.create({ data: { licenseeId: l.id, serviceLine: line, status: 'ACTIVE' } });
    return l.id;
  };
  licenseeId = await lic('Scope3 client', 'GHG');
  otherLicensee = await lic('Scope3 other', 'FLEET');
  noServiceLicensee = await lic('Scope3 none', null);
  const t = (id: string) => jwt.sign({ userId: `u_${id}`, role: 'PARTNER', licenseeId: id }, JWT_SECRET, { expiresIn: '1h' });
  token = t(licenseeId);
  otherToken = t(otherLicensee);
  noServiceToken = t(noServiceLicensee);
});

afterAll(async () => {
  const ids = [licenseeId, otherLicensee, noServiceLicensee];
  await prisma.serviceEntitlement.deleteMany({ where: { licenseeId: { in: ids } } });
  await prisma.licensee.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

const auth = (t = token) => ({ Authorization: `Bearer ${t}` });
const record = {
  stage: 'RAW_MATERIAL',
  description: 'Cement CEM I',
  supplierName: 'Midlands Cement Ltd',
  quantity: '40',
  unit: 'tonne',
  factorKgCo2ePerUnit: '912.5',
  factorSource: 'Supplier EPD S-P-01234, 2025',
  occurredOn: '2026-03-02',
};

describe('Scope 3 supply chains', () => {
  it('requires a GHG or Fleet service', async () => {
    await request(app).get('/api/scope3/chains').set(auth(noServiceToken)).expect(402);
  });

  it('creates a chain and validates it', async () => {
    await request(app).post('/api/scope3/chains').set(auth()).send({ name: 'Concrete', category: 'NOT_A_CATEGORY' }).expect(400);
    const res = await request(app).post('/api/scope3/chains').set(auth()).send({ name: 'Ready-mix concrete, A14', category: 'PURCHASED_GOODS_AND_SERVICES' }).expect(201);
    chainId = res.body.chain.id;
    await request(app).post('/api/scope3/chains').set(auth()).send({ name: 'Ready-mix concrete, A14', category: 'PURCHASED_GOODS_AND_SERVICES' }).expect(409);
  });

  it('records a stage with emissions = quantity x factor and a hash over every field', async () => {
    await request(app).post(`/api/scope3/chains/${chainId}/records`).set(auth()).send({ ...record, quantity: '0' }).expect(400);
    await request(app).post(`/api/scope3/chains/${chainId}/records`).set(auth()).send({ ...record, factorSource: '' }).expect(400);
    await request(app).post(`/api/scope3/chains/${chainId}/records`).set(auth()).send({ ...record, occurredOn: '2999-01-01' }).expect(400);
    const res = await request(app).post(`/api/scope3/chains/${chainId}/records`).set(auth()).send(record).expect(201);
    expect(res.body.record.kgCo2e).toBe('36500');
    expect(res.body.record.recordSha256).toBe(
      recordHash({
        chainId,
        stage: 'RAW_MATERIAL',
        description: record.description,
        supplierName: record.supplierName,
        quantity: '40',
        unit: 'tonne',
        factorKgCo2ePerUnit: '912.5',
        factorSource: record.factorSource,
        kgCo2e: '36500',
        occurredOn: '2026-03-02',
        enteredBy: 'CLIENT',
        supersedesId: null,
      })
    );
    await expect(prisma.scope3Record.update({ where: { id: res.body.record.id }, data: { description: 'changed' } })).rejects.toThrow();
  });

  it('corrects a record with a new one that supersedes it, once', async () => {
    const chain = await request(app).get(`/api/scope3/chains/${chainId}`).set(auth()).expect(200);
    const original = chain.body.chain.records[0];
    const fixed = await request(app)
      .post(`/api/scope3/chains/${chainId}/records`)
      .set(auth())
      .send({ ...record, quantity: '38', supersedesId: original.id })
      .expect(201);
    await request(app).post(`/api/scope3/chains/${chainId}/records`).set(auth()).send({ ...record, supersedesId: original.id }).expect(409);
    const after = await request(app).get(`/api/scope3/chains/${chainId}`).set(auth()).expect(200);
    expect(after.body.chain.records.find((r: { id: string }) => r.id === original.id).superseded).toBe(true);
    const list = await request(app).get('/api/scope3/chains').set(auth()).expect(200);
    expect(list.body.chains[0].kgCo2e).toBe(fixed.body.record.kgCo2e); // only the current record counts
  });

  it('lets an invited supplier add stages through the link, never another client', async () => {
    const sent = jest.spyOn(emailService, 'sendSupplierInviteEmail');
    await request(app).post(`/api/scope3/chains/${chainId}/invites`).set(auth()).send({ supplierEmail: 'someone@gmail.com' }).expect(400);
    const inv = await request(app).post(`/api/scope3/chains/${chainId}/invites`).set(auth()).send({ supplierEmail: 'sustainability@midlandshaulage.co.uk' }).expect(201);
    const supplierToken = new URL(sent.mock.calls[0][0].submitUrl).searchParams.get('token')!;
    sent.mockRestore();

    const info = await request(app).get(`/api/supply-chain/invite?token=${encodeURIComponent(supplierToken)}`).expect(200);
    expect(info.body).toMatchObject({ chainName: 'Ready-mix concrete, A14', category: 'PURCHASED_GOODS_AND_SERVICES' });
    const added = await request(app)
      .post('/api/supply-chain/invite/records')
      .send({ token: supplierToken, stage: 'TRANSPORT', description: 'Bulk tanker to site', supplierName: 'Midlands Haulage', quantity: '1520', unit: 'tonne_km', factorKgCo2ePerUnit: '0.107', factorSource: 'DESNZ 2025 HGV average laden', occurredOn: '2026-03-03' })
      .expect(201);
    expect(added.body.record).toMatchObject({ enteredBy: 'SUPPLIER', kgCo2e: '162.64' });

    await request(app).delete(`/api/scope3/chains/${chainId}/invites/${inv.body.invite.id}`).set(auth()).expect(204);
    await request(app).get(`/api/supply-chain/invite?token=${encodeURIComponent(supplierToken)}`).expect(404);
    await request(app).post('/api/supply-chain/invite/records').send({ token: 'x'.repeat(43), ...record }).expect(404);

    await request(app).get(`/api/scope3/chains/${chainId}`).set(auth(otherToken)).expect(404);
    const others = await request(app).get('/api/scope3/chains').set(auth(otherToken)).expect(200);
    expect(others.body.chains).toHaveLength(0);
  });

  it('summarises current records by category and stage, and fingerprints them for anchoring', async () => {
    const res = await request(app).get('/api/scope3/summary?from=2026-03-01&to=2026-03-31').set(auth()).expect(200);
    expect(res.body.recordCount).toBe(2);
    expect(res.body.tonnesCo2e).toBe('34.8376'); // 38 x 912.5 + 1520 x 0.107 = 34675 + 162.64 kg
    expect(res.body.byStage).toEqual([
      { stage: 'RAW_MATERIAL', tonnesCo2e: '34.675' },
      { stage: 'TRANSPORT', tonnesCo2e: '0.1626' },
    ]);

    await collectFingerprints(prisma);
    const rec = await prisma.scope3Record.findFirstOrThrow({ where: { chainId, stage: 'TRANSPORT' } });
    const leaf = await prisma.anchorLeaf.findUniqueOrThrow({ where: { kind_recordId: { kind: 'SCOPE3_RECORD', recordId: rec.id } } });
    expect(leaf.leafHash).toBe(leafHashFor('SCOPE3_RECORD', rec.id, rec.recordSha256));
  });
});
