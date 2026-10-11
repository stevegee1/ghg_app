import { Router, Request, Response } from 'express';
import { EntitlementStatus, PrismaClient, ServiceLine } from '@prisma/client';
import { requireFleetApiKey } from '../middleware/fleet-api-key.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { MCP_PROTOCOL_VERSIONS, MCP_SERVER_INFO, MCP_TOOLS, McpToolError, callTool, logQuery } from '../services/mcp/mcp.service';

type JsonRpcId = string | number | null;
const rpcError = (id: JsonRpcId, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });
const rpcResult = (id: JsonRpcId, result: unknown) => ({ jsonrpc: '2.0', id, result });

/**
 * MCP server (Streamable HTTP, JSON responses): POST /api/mcp with a Fleet API key that has the
 * fleet:read scope. Read-only tools over the key's own organisation; every request is logged.
 */
export function createMcpRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/api/mcp', (_req: Request, res: Response) => {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'This MCP server answers POST requests with JSON; it does not open event streams.' });
  });

  router.post('/api/mcp', requireFleetApiKey(prisma, 'fleet:read'), async (req: Request, res: Response) => {
    const { licenseeId, keyId } = req.fleetApiClient!;
    const entitlement = await prisma.serviceEntitlement.findUnique({ where: { licenseeId_serviceLine: { licenseeId, serviceLine: ServiceLine.FLEET } } });
    if (entitlement?.status !== EntitlementStatus.ACTIVE) {
      return res.status(402).json({ error: 'An active Fleet subscription is required.', code: 'FLEET_SUBSCRIPTION_REQUIRED' });
    }

    const msg = req.body as { jsonrpc?: unknown; id?: JsonRpcId; method?: unknown; params?: Record<string, unknown> } | unknown[];
    if (Array.isArray(msg) || !msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return res.status(400).json(rpcError(null, -32600, 'Send one JSON-RPC 2.0 request object.'));
    }
    const id = msg.id ?? null;
    const isNotification = msg.id === undefined;
    const method = msg.method;
    const params = (msg.params && typeof msg.params === 'object' ? msg.params : {}) as Record<string, unknown>;

    if (isNotification) {
      await logQuery(prisma, { licenseeId, apiKeyId: keyId, method, ok: true });
      return res.status(202).send();
    }

    switch (method) {
      case 'initialize': {
        const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : '';
        const protocolVersion = MCP_PROTOCOL_VERSIONS.includes(requested) ? requested : MCP_PROTOCOL_VERSIONS[0];
        await logQuery(prisma, { licenseeId, apiKeyId: keyId, method, ok: true });
        return res.json(
          rpcResult(id, {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: MCP_SERVER_INFO,
            instructions:
              'Read-only access to this organisation’s Fleet data: machines, activity, weather exposure, machine value and ownership cost, contract costs and the climate ledger. Figures carry their method versions; estimates are labelled as estimates.',
          })
        );
      }
      case 'ping':
        return res.json(rpcResult(id, {}));
      case 'tools/list':
        await logQuery(prisma, { licenseeId, apiKeyId: keyId, method, ok: true });
        return res.json(rpcResult(id, { tools: MCP_TOOLS }));
      case 'tools/call': {
        const name = typeof params.name === 'string' ? params.name : '';
        const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<string, unknown>;
        if (!MCP_TOOLS.some((t) => t.name === name)) {
          await logQuery(prisma, { licenseeId, apiKeyId: keyId, method, tool: name, args, ok: false, error: 'Unknown tool' });
          return res.json(rpcError(id, -32602, `Unknown tool: ${name}`));
        }
        try {
          const data = await callTool(prisma, licenseeId, name, args);
          await logQuery(prisma, { licenseeId, apiKeyId: keyId, method, tool: name, args, ok: true });
          return res.json(rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data, isError: false }));
        } catch (err) {
          const message = err instanceof McpToolError ? err.message : 'The tool could not complete the request.';
          if (!(err instanceof McpToolError)) console.error('[MCP TOOL ERROR]', err);
          await logQuery(prisma, { licenseeId, apiKeyId: keyId, method, tool: name, args, ok: false, error: message });
          return res.json(rpcResult(id, { content: [{ type: 'text', text: message }], isError: true }));
        }
      }
      default:
        await logQuery(prisma, { licenseeId, apiKeyId: keyId, method, ok: false, error: 'Method not found' });
        return res.json(rpcError(id, -32601, `Method not found: ${method}`));
    }
  });

  /** The organisation's MCP audit log, for the client portal. */
  router.get('/api/fleet/mcp-log', authenticateToken, async (req: Request, res: Response) => {
    const licenseeId = req.user?.licenseeId;
    if (!licenseeId) return res.status(403).json({ error: 'A client account is required.' });
    try {
      const entries = await runWithRls(prisma, req.user!, (tx) =>
        tx.mcpQueryLog.findMany({ where: { licenseeId }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, method: true, tool: true, ok: true, error: true, createdAt: true, apiKeyId: true } })
      );
      return res.json({ entries });
    } catch (err) {
      console.error('[MCP LOG LIST]', err);
      return res.status(500).json({ error: 'Failed to load the log.' });
    }
  });

  return router;
}
