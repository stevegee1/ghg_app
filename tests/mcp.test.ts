import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient, Vertical } from '@prisma/client';
import { createApp } from '../src/expressApp';
import { JWT_SECRET } from '../src/middleware/auth.middleware';
import { createFleetApiKey } from '../src/services/fleet/fleet-api-key.service';

const prisma = new PrismaClient();
const app = createApp();
const s = Date.now().toString(36);
let licenseeId: string;
let otherId: string;
let readKey: string;
let writeOnlyKey: string;
let otherAssetId: string;

beforeAll(async () => {
  const mk = async (name: string) => {
    const l = await prisma.licensee.create({ data: { name: `${name} ${s}`, vertical: Vertical.B2B_HEAVY_MANUFACTURING } });
    await prisma.serviceEntitlement.create({ data: { licenseeId: l.id, serviceLine: 'FLEET', status: 'ACTIVE' } });
    return l.id;
  };
  licenseeId = await mk('MCP');
  otherId = await mk('MCP other');
  await prisma.fleetAsset.create({
    data: { licenseeId, assetTag: 'EX-M', name: 'Excavator', category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
  });
  otherAssetId = (
    await prisma.fleetAsset.create({
      data: { licenseeId: otherId, assetTag: 'EX-O', name: 'Other', category: 'EXCAVATOR', fuelType: 'DIESEL_MINERAL', ownership: 'OWNED', operationalControl: true },
    })
  ).id;
  const userId = (await prisma.portalUser.create({ data: { email: `mcp.${s}@test.example`, passwordHash: 'x', role: 'PARTNER', licenseeId } })).id;
  readKey = (await createFleetApiKey(prisma, licenseeId, userId, { name: 'AI', scopes: ['fleet:read'] })).key;
  writeOnlyKey = (await createFleetApiKey(prisma, licenseeId, userId, { name: 'Telemetry', scopes: ['telemetry:write'] })).key;
});

afterAll(async () => {
  for (const id of [licenseeId, otherId]) {
    await prisma.mcpQueryLog.deleteMany({ where: { licenseeId: id } });
    await prisma.fleetApiKey.deleteMany({ where: { licenseeId: id } });
    await prisma.portalUser.deleteMany({ where: { licenseeId: id } });
    await prisma.fleetAsset.deleteMany({ where: { licenseeId: id } });
    await prisma.serviceEntitlement.deleteMany({ where: { licenseeId: id } });
    await prisma.licensee.delete({ where: { id } });
  }
  await prisma.$disconnect();
});

const rpc = (body: unknown, key = readKey) => request(app).post('/api/mcp').set('Authorization', `Bearer ${key}`).send(body as object);

describe('MCP server', () => {
  it('needs a key with the fleet:read scope', async () => {
    await request(app).post('/api/mcp').send({ jsonrpc: '2.0', id: 1, method: 'tools/list' }).expect(401);
    await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, writeOnlyKey).expect(403);
    await request(app).get('/api/mcp').expect(405);
  });

  it('initialises, lists read-only tools and accepts notifications', async () => {
    const init = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } } }).expect(200);
    expect(init.body.result).toMatchObject({ protocolVersion: '2025-03-26', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'nftylogs-fleet' } });
    const unknownVersion = await rpc({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }).expect(200);
    expect(unknownVersion.body.result.protocolVersion).toBe('2025-06-18');
    await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' }).expect(202);

    const list = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/list' }).expect(200);
    const names = list.body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(['list_machines', 'get_machine_activity', 'get_weather_exposure', 'get_machine_valuations', 'get_project_costs', 'get_climate_ledger']);
    expect(list.body.result.tools.every((t: { inputSchema: { type: string } }) => t.inputSchema.type === 'object')).toBe(true);
  });

  it('answers tool calls for its own organisation only', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'list_machines', arguments: {} } }).expect(200);
    expect(res.body.result.isError).toBe(false);
    expect(res.body.result.structuredContent.machines.map((m: { assetTag: string }) => m.assetTag)).toEqual(['EX-M']);
    expect(JSON.parse(res.body.result.content[0].text)).toEqual(res.body.result.structuredContent);

    const other = await rpc({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'get_machine_activity', arguments: { assetId: otherAssetId, from: '2026-01-01', to: '2026-01-31' } },
    }).expect(200);
    expect(other.body.result).toMatchObject({ isError: true, content: [{ type: 'text', text: 'No machine with that id.' }] });

    const ledger = await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'get_climate_ledger', arguments: { from: '2026-01-01', to: '2026-01-31' } } }).expect(200);
    expect(ledger.body.result.structuredContent.schema).toMatch(/^NFTYLOGS-CLIMATE-LEDGER-/);
  });

  it('reports bad requests the JSON-RPC way', async () => {
    const badArgs = await rpc({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'get_weather_exposure', arguments: { from: 'yesterday' } } }).expect(200);
    expect(badArgs.body.result.isError).toBe(true);
    const unknownTool = await rpc({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'delete_everything', arguments: {} } }).expect(200);
    expect(unknownTool.body.error.code).toBe(-32602);
    const unknownMethod = await rpc({ jsonrpc: '2.0', id: 9, method: 'resources/list' }).expect(200);
    expect(unknownMethod.body.error.code).toBe(-32601);
    await rpc([{ jsonrpc: '2.0', id: 10, method: 'ping' }]).expect(400);
  });

  it('logs every request for the organisation and shows it in the portal', async () => {
    const logged = await prisma.mcpQueryLog.findMany({ where: { licenseeId } });
    expect(logged.some((l) => l.tool === 'list_machines' && l.ok)).toBe(true);
    expect(logged.some((l) => l.tool === 'delete_everything' && !l.ok)).toBe(true);
    const token = jwt.sign({ userId: 'u', role: 'PARTNER', licenseeId }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/fleet/mcp-log').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.entries.length).toBe(logged.length);
  });
});
