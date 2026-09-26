import { Router, Request, Response } from 'express';
import { PrismaClient, SensorType, MetricType, GhgScope } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EventEmitter } from 'events';
import { IsoCalibrationService } from '../services/iso-calibration.service';
import { AnomalyDetectionService } from '../services/anomaly-detection.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { UserAuthScope } from '../db/rls';

/**
 * Module-level singleton EventEmitter for real-time telemetry SSE stream.
 * Emitting 'telemetry' here broadcasts to all connected SSE clients.
 */
export const telemetryEmitter = new EventEmitter();
telemetryEmitter.setMaxListeners(500); // support up to 500 concurrent SSE subscribers

export function createIsoTelemetryRouter(prisma: PrismaClient): Router {
  const router = Router();
  const calibrationService = new IsoCalibrationService(prisma);
  const anomalyService = new AnomalyDetectionService(prisma);

  /**
   * POST /api/iso/calibration/upload
   * Registers a new asset calibration certificate with cryptographic SHA-256 integrity hash.
   */
  router.post('/api/iso/calibration/upload', async (req: Request, res: Response) => {
    try {
      const {
        licenseeId,
        assetTag,
        sensorType,
        calibrationDate,
        expiryDate,
        certDocumentUrl,
        certFileContent,
        providedHash,
        verifiedBy,
      } = req.body || {};

      if (!licenseeId || typeof licenseeId !== 'string') {
        return res.status(400).json({ error: 'Invalid input: licenseeId is required.' });
      }

      if (!assetTag || typeof assetTag !== 'string') {
        return res.status(400).json({ error: 'Invalid input: assetTag is required.' });
      }

      if (!sensorType || !Object.values(SensorType).includes(sensorType)) {
        return res.status(400).json({
          error: `Invalid input: sensorType must be one of: ${Object.values(SensorType).join(', ')}`,
        });
      }

      const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId.trim() } });
      if (!licensee) {
        return res.status(404).json({ error: `Licensee '${licenseeId}' not found.` });
      }

      const record = await calibrationService.registerCalibrationCertificate({
        licenseeId: licenseeId.trim(),
        assetTag: assetTag.trim(),
        sensorType,
        calibrationDate: new Date(calibrationDate),
        expiryDate: new Date(expiryDate),
        certDocumentUrl: certDocumentUrl || `/certs/${assetTag.toLowerCase()}_calibration.pdf`,
        certFileContent,
        providedHash,
        verifiedBy,
      });

      return res.status(201).json({
        message: 'Asset calibration certificate successfully verified and registered.',
        record,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to register calibration certificate.' });
    }
  });

  /**
   * GET /api/iso/calibration/assets
   * RLS-scoped asset registry with calibration expiration countdowns.
   */
  router.get('/api/iso/calibration/assets', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const queryLicenseeId = (req.query.licenseeId as string) || user.licenseeId;
      if (!queryLicenseeId) {
        return res.status(400).json({ error: 'Invalid query: licenseeId is required.' });
      }

      // Security check: Partners can only view their own licensee's assets
      if (user.role === 'PARTNER' && user.licenseeId !== queryLicenseeId) {
        return res.status(403).json({ error: 'Forbidden: Cannot access calibration records of other licensees.' });
      }

      const userScope: UserAuthScope = {
        role: user.role,
        licenseeId: user.licenseeId,
      };

      const assets = await calibrationService.getAssetsCalibrationStatus(queryLicenseeId, userScope);
      return res.status(200).json({
        licenseeId: queryLicenseeId,
        totalAssets: assets.length,
        assets,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve asset calibration status.' });
    }
  });

  /**
   * POST /api/iso/telemetry/ingest
   * Ingests OT telemetry, enforcing the calibration gatekeeper AND the 15% anomaly variance engine.
   * Authenticated via B2B API Key (bcrypt hash comparison).
   */
  router.post('/api/iso/telemetry/ingest', async (req: Request, res: Response) => {
    try {
      // 1. Authenticate via API Key
      const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
      const authHeader = req.headers.authorization;
      let rawApiKey: string | undefined = apiKeyHeader;

      if (!rawApiKey && authHeader && authHeader.startsWith('Bearer ')) {
        rawApiKey = authHeader.substring(7).trim();
      }

      if (!rawApiKey) {
        return res.status(401).json({ error: 'Unauthorized: B2B API key required in X-API-Key or Authorization header.' });
      }

      const {
        licenseeId,
        assetTag,
        metricType,
        numericValue,
        rawUnit,
        baselineValue,
        rawTelemetryJson,
        transactionId,
        isoClause,
        // GHG Protocol Scope 1/2/3 fields (ISO 14064-1:2018 Clause 5.2)
        ghgScope,
        activityAmount,
        unitOfMeasure,
        emissionFactorKgCo2PerUnit,
      } = req.body || {};

      if (!licenseeId || typeof licenseeId !== 'string') {
        return res.status(400).json({ error: 'Invalid input: licenseeId is required.' });
      }

      const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId.trim() } });
      if (!licensee || !licensee.b2bApiKeyHash) {
        return res.status(401).json({ error: 'Unauthorized: Invalid B2B API Key or licensee mismatch.' });
      }

      const isKeyValid = await bcrypt.compare(rawApiKey, licensee.b2bApiKeyHash);
      if (!isKeyValid) {
        return res.status(401).json({ error: 'Unauthorized: Invalid B2B API Key or licensee mismatch.' });
      }

      if (!assetTag || typeof assetTag !== 'string') {
        return res.status(400).json({ error: 'Invalid input: assetTag is required.' });
      }

      if (!metricType || !Object.values(MetricType).includes(metricType)) {
        return res.status(400).json({
          error: `Invalid input: metricType must be one of: ${Object.values(MetricType).join(', ')}`,
        });
      }

      const parsedNumeric = Number(numericValue);

      // 2. Evaluate 15% Anomaly Variance if baselineValue is provided
      let isWithinBaseline = true;
      let requiresSupervisor = false;
      let anomalyResult: any = null;

      if (typeof baselineValue === 'number' && baselineValue > 0) {
        anomalyResult = await anomalyService.evaluateTelemetryAnomaly({
          licenseeId: licensee.id,
          assetTag: assetTag.trim(),
          metricName: metricType,
          observedValue: parsedNumeric,
          baselineValue,
          isoClause,
        });

        if (anomalyResult.hasAnomaly) {
          isWithinBaseline = false;
          requiresSupervisor = true;
        }
      }

      // 3. Ingest Telemetry (Enforces Calibration Gatekeeper)
      // Calculate kgCO2e if emission factor and activity amount are provided
      const parsedActivityAmount = typeof activityAmount === 'number' ? activityAmount : undefined;
      const parsedEmissionFactor = typeof emissionFactorKgCo2PerUnit === 'number' ? emissionFactorKgCo2PerUnit : undefined;
      const calculatedKgCo2e =
        parsedActivityAmount !== undefined && parsedEmissionFactor !== undefined
          ? Math.round(parsedActivityAmount * parsedEmissionFactor * 1000) / 1000
          : undefined;

      // Validate ghgScope enum value if provided
      const validatedGhgScope: GhgScope | undefined =
        ghgScope && Object.values(GhgScope).includes(ghgScope as GhgScope)
          ? (ghgScope as GhgScope)
          : undefined;

      const telemetryRecord = await calibrationService.ingestTelemetry({
        licenseeId: licensee.id,
        assetTag: assetTag.trim(),
        metricType,
        numericValue: parsedNumeric,
        rawUnit: rawUnit || 'units',
        rawTelemetryJson,
        transactionId,
        isWithinBaseline,
        requiresSupervisor,
        ghgScope: validatedGhgScope,
        activityAmount: parsedActivityAmount,
        unitOfMeasure: unitOfMeasure || undefined,
        emissionFactorKgCo2PerUnit: parsedEmissionFactor,
        calculatedKgCo2e,
      });

      const responsePayload = {
        message: 'Telemetry successfully ingested and verified against active calibration certificate.',
        telemetryRecord,
        anomalyEvaluation: anomalyResult
          ? {
              hasAnomaly: anomalyResult.hasAnomaly,
              percentageVariance: `${anomalyResult.percentageVariance}%`,
              nonConformanceEventId: anomalyResult.nonConformanceEvent?.id || null,
              exportLockActive: anomalyResult.hasAnomaly,
            }
          : null,
      };

      // Broadcast to all SSE subscribers so the real-time stream claim holds
      telemetryEmitter.emit('telemetry', {
        licenseeId: telemetryRecord.licenseeId,
        assetTag: telemetryRecord.assetTag,
        metricType: telemetryRecord.metricType,
        numericValue: telemetryRecord.numericValue,
        rawUnit: telemetryRecord.rawUnit,
        ghgScope: telemetryRecord.ghgScope ?? null,
        calculatedKgCo2e: telemetryRecord.calculatedKgCo2e ?? null,
        isWithinBaseline: telemetryRecord.isWithinBaseline,
        requiresSupervisor: telemetryRecord.requiresSupervisor,
        hasAnomaly: anomalyResult?.hasAnomaly ?? false,
        recordedAt: telemetryRecord.createdAt ?? new Date(),
      });

      return res.status(201).json(responsePayload);
    } catch (err: any) {
      const isCalibrationError =
        err.message?.includes('calibration') || err.message?.includes('Calibration') || err.message?.includes('expired');
      const statusCode = isCalibrationError ? 422 : 400;
      return res.status(statusCode).json({ error: err.message || 'Telemetry ingestion rejected.' });
    }
  });

  /**
   * GET /api/iso/telemetry/stream
   * Server-Sent Events (SSE) real-time telemetry stream.
   * Authenticated via JWT bearer token. Broadcasts every successful telemetry ingest.
   * Clients connect with: EventSource('/api/iso/telemetry/stream', { headers: { Authorization: 'Bearer <token>' } })
   */
  router.get('/api/iso/telemetry/stream', authenticateToken, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx proxy buffering
    res.flushHeaders();

    // Send initial keepalive comment so the client knows the stream is live
    res.write(': connected\n\n');

    const onTelemetry = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    telemetryEmitter.on('telemetry', onTelemetry);

    // Heartbeat every 25s to prevent proxy/load-balancer idle timeouts
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      }
    }, 25000);

    // Clean up listener and interval when client disconnects
    req.on('close', () => {
      clearInterval(heartbeat);
      telemetryEmitter.off('telemetry', onTelemetry);
    });
  });

  /**
   * GET /api/iso/non-conformance
   * RLS-scoped list of open and resolved Clause 10.2 Non-Conformance events.
   */
  router.get('/api/iso/non-conformance', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const queryLicenseeId = (req.query.licenseeId as string) || user.licenseeId;
      if (!queryLicenseeId) {
        return res.status(400).json({ error: 'Invalid query: licenseeId is required.' });
      }

      if (user.role === 'PARTNER' && user.licenseeId !== queryLicenseeId) {
        return res.status(403).json({ error: 'Forbidden: Cannot access non-conformance records of other licensees.' });
      }

      const userScope: UserAuthScope = {
        role: user.role,
        licenseeId: user.licenseeId,
      };

      const events = await anomalyService.getNonConformanceEvents(queryLicenseeId, userScope);
      const lockStatus = await anomalyService.checkLicenseeExportLock(queryLicenseeId);

      return res.status(200).json({
        licenseeId: queryLicenseeId,
        isExportLocked: lockStatus.isLocked,
        unresolvedCount: lockStatus.activeEventsCount,
        events,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve non-conformance events.' });
    }
  });

  /**
   * PATCH /api/iso/non-conformance/:id/resolve
   * Resolves an open ISO Clause 10.2 Non-Conformance event with mandatory root-cause analysis.
   */
  router.patch('/api/iso/non-conformance/:id/resolve', authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }

      const { id } = req.params;
      const {
        rootCauseAnalysis,
        correctiveAction,
        assignedOwner,
        targetClosureDate,
        signOffSupervisorName,
      } = req.body || {};

      if (!rootCauseAnalysis || typeof rootCauseAnalysis !== 'string') {
        return res.status(400).json({ error: 'Invalid input: rootCauseAnalysis is required under ISO Clause 10.2.' });
      }

      if (!correctiveAction || typeof correctiveAction !== 'string') {
        return res.status(400).json({ error: 'Invalid input: correctiveAction plan is required under ISO Clause 10.2.' });
      }

      const userScope: UserAuthScope = {
        role: user.role,
        licenseeId: user.licenseeId,
      };

      const resolvedEvent = await anomalyService.resolveNonConformance({
        id,
        user: userScope,
        rootCauseAnalysis,
        correctiveAction,
        assignedOwner,
        targetClosureDate: targetClosureDate ? new Date(targetClosureDate) : undefined,
        signOffSupervisorName,
      });

      // Check if export lock is now released
      const lockStatus = await anomalyService.checkLicenseeExportLock(resolvedEvent.licenseeId);

      return res.status(200).json({
        message: 'Non-conformance event successfully resolved and verified under ISO Clause 10.2.',
        resolvedEvent,
        isExportLocked: lockStatus.isLocked,
      });
    } catch (err: any) {
      const isForbidden = err.message?.includes('Forbidden') || err.message?.includes('access denied');
      const statusCode = isForbidden ? 403 : 400;
      return res.status(statusCode).json({ error: err.message || 'Failed to resolve non-conformance event.' });
    }
  });

  /**
   * GET /api/iso/export-status
   * Checks if a licensee's data exports are locked due to unresolved baseline anomalies (HTTP 423).
   */
  router.get('/api/iso/export-status', async (req: Request, res: Response) => {
    try {
      const licenseeId = req.query.licenseeId as string;
      if (!licenseeId) {
        return res.status(400).json({ error: 'Invalid query: licenseeId is required.' });
      }

      const lockStatus = await anomalyService.checkLicenseeExportLock(licenseeId.trim());

      if (lockStatus.isLocked) {
        return res.status(423).json({
          error: {
            code: 423,
            status: 'RESOURCE_LOCKED',
            message: `Transparency export locked: ${lockStatus.activeEventsCount} unresolved baseline anomaly event(s) require supervisor verification under ISO Clause 10.2.`,
            details: lockStatus.activeEvents.map((evt) => ({
              eventId: evt.id,
              assetTag: evt.assetTag,
              metricName: evt.metricName,
              variance: `${evt.percentageVariance}%`,
              conformanceGrade: evt.conformanceGrade,
              isoClause: evt.isoClause,
            })),
          },
        });
      }

      return res.status(200).json({
        licenseeId,
        isExportLocked: false,
        status: 'VERIFIED_AUDIT_READY',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to check export status.' });
    }
  });

  return router;
}
