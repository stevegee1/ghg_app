import { Router, Request, Response, NextFunction } from 'express';
import { EntitlementStatus, PrismaClient, Scope3EnteredBy, ServiceLine } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';
import { runWithRls } from '../db/rls';
import { emailService } from '../services/email.service';
import { parseRange } from './fleet.route';
import {
  Scope3Error,
  addRecord,
  createChain,
  createInvite,
  findInvite,
  getChain,
  listChains,
  revokeInvite,
  scope3Summary,
} from '../services/scope3.service';

/** Scope 3 supply chains: client management, supplier submission by invite link, and the summary. */
export function createScope3Router(prisma: PrismaClient): Router {
  const router = Router();

  /** Supply chain records are part of the GHG service and of Fleet's handoff into it. */
  const requireAccess = async (req: Request, res: Response, next: NextFunction) => {
    const licenseeId = req.user?.licenseeId;
    if (!licenseeId) return res.status(403).json({ error: 'A client account is required.' });
    const active = await prisma.serviceEntitlement.count({
      where: { licenseeId, status: EntitlementStatus.ACTIVE, serviceLine: { in: [ServiceLine.GHG, ServiceLine.CARBON, ServiceLine.FLEET] } },
    });
    if (active === 0) return res.status(402).json({ error: 'Supply chain records need an active GHG or Fleet service.', code: 'SCOPE3_SERVICE_REQUIRED' });
    next();
  };
  router.use('/api/scope3', authenticateToken, requireAccess);

  const send = (res: Response, err: unknown, label: string) => {
    if (err instanceof Scope3Error) return res.status(err.status).json({ error: err.message });
    console.error(`[${label}]`, err);
    return res.status(500).json({ error: 'The request could not be completed.' });
  };
  const scope = (req: Request) => req.user!;
  const lic = (req: Request) => req.user!.licenseeId!;
  const baseUrl = (req: Request) => process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;

  router.get('/api/scope3/chains', async (req, res) => {
    try {
      return res.json({ chains: await runWithRls(prisma, scope(req), (tx) => listChains(tx, lic(req))) });
    } catch (err) {
      return send(res, err, 'SCOPE3 CHAINS');
    }
  });

  router.post('/api/scope3/chains', async (req, res) => {
    try {
      return res.status(201).json({ chain: await runWithRls(prisma, scope(req), (tx) => createChain(tx, lic(req), req.body || {})) });
    } catch (err) {
      return send(res, err, 'SCOPE3 CHAIN CREATE');
    }
  });

  router.get('/api/scope3/chains/:id', async (req, res) => {
    try {
      return res.json({ chain: await runWithRls(prisma, scope(req), (tx) => getChain(tx, lic(req), req.params.id)) });
    } catch (err) {
      return send(res, err, 'SCOPE3 CHAIN');
    }
  });

  router.post('/api/scope3/chains/:id/records', async (req, res) => {
    try {
      const record = await runWithRls(prisma, scope(req), (tx) =>
        addRecord(tx, lic(req), req.params.id, req.body || {}, { enteredBy: Scope3EnteredBy.CLIENT, userId: req.user!.userId })
      );
      return res.status(201).json({ record });
    } catch (err) {
      return send(res, err, 'SCOPE3 RECORD ADD');
    }
  });

  router.post('/api/scope3/chains/:id/invites', async (req, res) => {
    try {
      const { invite, token, chain } = await runWithRls(prisma, scope(req), (tx) => createInvite(tx, lic(req), req.params.id, req.body || {}));
      const licensee = await prisma.licensee.findUnique({ where: { id: lic(req) }, select: { name: true } });
      const sent = await emailService.sendSupplierInviteEmail({
        toEmail: invite.supplierEmail,
        submitUrl: `${baseUrl(req)}/supply-chain/submit?token=${encodeURIComponent(token)}`,
        clientName: licensee?.name ?? 'A client',
        chainName: chain.name,
        expiresOn: invite.expiresAt.toISOString().slice(0, 10),
      });
      return res.status(201).json({
        invite: { id: invite.id, supplierEmail: invite.supplierEmail, expiresAt: invite.expiresAt },
        emailSent: sent.success,
      });
    } catch (err) {
      return send(res, err, 'SCOPE3 INVITE');
    }
  });

  router.delete('/api/scope3/chains/:id/invites/:inviteId', async (req, res) => {
    try {
      await runWithRls(prisma, scope(req), (tx) => revokeInvite(tx, lic(req), req.params.id, req.params.inviteId));
      return res.status(204).send();
    } catch (err) {
      return send(res, err, 'SCOPE3 INVITE REVOKE');
    }
  });

  router.get('/api/scope3/summary', async (req, res) => {
    const range = parseRange(req);
    if (!range) return res.status(400).json({ error: 'from and to must be dates (YYYY-MM-DD), at most 3 years apart.' });
    try {
      return res.json(await runWithRls(prisma, scope(req), (tx) => scope3Summary(tx, lic(req), range.from, range.to)));
    } catch (err) {
      return send(res, err, 'SCOPE3 SUMMARY');
    }
  });

  // ── Supplier, by invite link (no account) ───────────────────────────────

  const ADMIN_SCOPE = { role: 'ADMIN', licenseeId: null };

  router.get('/api/supply-chain/invite', async (req, res) => {
    try {
      const invite = await runWithRls(prisma, ADMIN_SCOPE, (tx) => findInvite(tx, req.query.token));
      if (!invite) return res.status(404).json({ error: 'This link is invalid, expired or withdrawn.' });
      return res.json({
        clientName: invite.chain.licensee.name,
        chainName: invite.chain.name,
        category: invite.chain.category,
        supplierEmail: invite.supplierEmail,
        expiresAt: invite.expiresAt,
      });
    } catch (err) {
      return send(res, err, 'SUPPLIER INVITE');
    }
  });

  router.post('/api/supply-chain/invite/records', async (req, res) => {
    try {
      const invite = await runWithRls(prisma, ADMIN_SCOPE, (tx) => findInvite(tx, req.body?.token));
      if (!invite) return res.status(404).json({ error: 'This link is invalid, expired or withdrawn.' });
      const { token: _token, supersedesId: _supersedes, ...fields } = (req.body || {}) as Record<string, unknown>;
      const record = await runWithRls(prisma, { role: 'PARTNER', licenseeId: invite.licenseeId }, (tx) =>
        addRecord(tx, invite.licenseeId, invite.chainId, fields, { enteredBy: Scope3EnteredBy.SUPPLIER, inviteId: invite.id })
      );
      return res.status(201).json({ record });
    } catch (err) {
      return send(res, err, 'SUPPLIER RECORD ADD');
    }
  });

  return router;
}
