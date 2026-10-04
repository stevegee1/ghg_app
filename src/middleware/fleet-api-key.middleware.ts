import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { runWithRls } from '../db/rls';
import { FleetApiScope, findActiveFleetApiKey } from '../services/fleet/fleet-api-key.service';

export interface FleetApiClient {
  keyId: string;
  licenseeId: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      fleetApiClient?: FleetApiClient;
    }
  }
}

/** Key lookups run as the system, before any licensee is known. */
const SYSTEM_SCOPE = { role: 'ADMIN', licenseeId: null };
const LAST_USED_RESOLUTION_MS = 5 * 60 * 1000;

/**
 * Authenticates a Fleet API request by its key (Authorization: Bearer flt_... or X-API-Key) and
 * requires the given scope. Unknown, revoked and malformed keys get the same 401.
 */
export function requireFleetApiKey(prisma: PrismaClient, scope: FleetApiScope) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const presented =
      (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : null) ??
      (header && header.startsWith('Bearer ') ? header.slice(7) : null);
    if (!presented) {
      return res.status(401).json({ error: 'Send your Fleet API key in the Authorization header as "Bearer <key>".' });
    }
    try {
      const key = await runWithRls(prisma, SYSTEM_SCOPE, (tx) => findActiveFleetApiKey(tx, presented.trim()));
      if (!key) return res.status(401).json({ error: 'The API key is not valid.' });
      if (!key.scopes.includes(scope)) return res.status(403).json({ error: `This key does not have the ${scope} scope.` });

      if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS) {
        await runWithRls(prisma, SYSTEM_SCOPE, (tx) => tx.fleetApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }));
      }
      req.fleetApiClient = { keyId: key.id, licenseeId: key.licenseeId, scopes: key.scopes };
      next();
    } catch (err) {
      console.error('[FLEET API KEY AUTH ERROR]', err);
      res.status(500).json({ error: 'The request could not be completed.' });
    }
  };
}
