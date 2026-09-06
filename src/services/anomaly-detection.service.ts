import { PrismaClient, ConformanceGrade } from '@prisma/client';
import { alertComplianceOfficer } from './compliance.service';
import { runWithRls, UserAuthScope } from '../db/rls';

export interface TelemetryAnomalyEvaluationInput {
  licenseeId: string;
  assetTag: string;
  metricName: string;
  observedValue: number;
  baselineValue: number;
  isoClause?: string;
}

export interface ResolveNonConformanceInput {
  id: string;
  user: UserAuthScope;
  rootCauseAnalysis: string;
  correctiveAction: string;
  assignedOwner?: string;
  targetClosureDate?: Date;
  signOffSupervisorName?: string;
}

export class AnomalyDetectionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Evaluates operational technology (OT) telemetry against baseline models.
   * If percentage variance exceeds 15%, creates an ISO Clause 10.2 Non-Conformance event
   * and triggers compliance alerting.
   */
  async evaluateTelemetryAnomaly(input: TelemetryAnomalyEvaluationInput) {
    const {
      licenseeId,
      assetTag,
      metricName,
      observedValue,
      baselineValue,
      isoClause,
    } = input;

    if (baselineValue === 0) {
      // Prevent division by zero
      return { hasAnomaly: false, percentageVariance: 0, nonConformanceEvent: null };
    }

    const percentageVariance = Math.abs((observedValue - baselineValue) / baselineValue) * 100;
    const roundedVariance = Math.round(percentageVariance * 100) / 100;

    // 15% Anomaly Threshold Rule under ISO 50001 / 14001 Statutory Framework
    if (roundedVariance > 15.0) {
      // Determine Conformance Grade
      const conformanceGrade: ConformanceGrade =
        roundedVariance >= 25.0
          ? ConformanceGrade.MAJOR_NON_CONFORMANCE_GREENWASHING_RISK
          : ConformanceGrade.MINOR_NON_CONFORMANCE;

      const clauseMapping =
        isoClause ||
        (metricName === 'PUE' || metricName === 'MWH_LOAD'
          ? 'ISO 50001:2018 Clause 9.1.1 (Energy Performance Evaluation)'
          : metricName === 'WUE'
          ? 'ISO 14001:2015 Clause 8.1 (Operational Planning & Water Control)'
          : 'ISO 14001:2015 Clause 10.2 (Non-Conformity and Corrective Action)');

      // Persist Non-Conformance Event
      const nonConformanceEvent = await this.prisma.nonConformanceEvent.create({
        data: {
          licenseeId,
          isoClause: clauseMapping,
          assetTag,
          metricName,
          baselineValue,
          observedValue,
          percentageVariance: roundedVariance,
          conformanceGrade,
          isResolved: false,
        },
      });

      // Dispatch Compliance Officer Alert
      alertComplianceOfficer({
        reason: `ISO Baseline Variance Anomaly (${roundedVariance}%) detected on asset '${assetTag}'`,
        eventId: nonConformanceEvent.id,
        extra: {
          licenseeId,
          metricName,
          baselineValue,
          observedValue,
          percentageVariance: `${roundedVariance}%`,
          conformanceGrade,
          isoClause: clauseMapping,
        },
      });

      return {
        hasAnomaly: true,
        percentageVariance: roundedVariance,
        nonConformanceEvent,
      };
    }

    return {
      hasAnomaly: false,
      percentageVariance: roundedVariance,
      nonConformanceEvent: null,
    };
  }

  /**
   * Checks if a licensee has active, unresolved Non-Conformance events that lock data exports (HTTP 423).
   */
  async checkLicenseeExportLock(licenseeId: string) {
    const unresolvedEvents = await this.prisma.nonConformanceEvent.findMany({
      where: {
        licenseeId,
        isResolved: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      isLocked: unresolvedEvents.length > 0,
      activeEventsCount: unresolvedEvents.length,
      activeEvents: unresolvedEvents,
    };
  }

  /**
   * Resolves an open Non-Conformance event with mandatory root-cause analysis and supervisor sign-off.
   */
  async resolveNonConformance(input: ResolveNonConformanceInput) {
    const {
      id,
      user,
      rootCauseAnalysis,
      correctiveAction,
      assignedOwner,
      targetClosureDate,
      signOffSupervisorName,
    } = input;

    if (!rootCauseAnalysis || !rootCauseAnalysis.trim()) {
      throw new Error('Invalid input: rootCauseAnalysis is mandatory under ISO Clause 10.2.');
    }

    if (!correctiveAction || !correctiveAction.trim()) {
      throw new Error('Invalid input: correctiveAction plan is mandatory under ISO Clause 10.2.');
    }

    return runWithRls(this.prisma, user, async (tx) => {
      const event = await tx.nonConformanceEvent.findUnique({
        where: { id },
      });

      if (!event) {
        throw new Error(`Non-conformance event '${id}' not found or access denied.`);
      }

      // Security check: Partners can only resolve events belonging to their own licensee
      if (user.role === 'PARTNER' && event.licenseeId !== user.licenseeId) {
        throw new Error('Forbidden: Cannot resolve non-conformance events for other licensees.');
      }

      return tx.nonConformanceEvent.update({
        where: { id },
        data: {
          rootCauseAnalysis: rootCauseAnalysis.trim(),
          correctiveAction: correctiveAction.trim(),
          assignedOwner: assignedOwner ? assignedOwner.trim() : null,
          targetClosureDate: targetClosureDate || null,
          signOffSupervisor: signOffSupervisorName || 'LEAD_SUPERVISOR_GMC_LL.B',
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    });
  }

  /**
   * Retrieves RLS-scoped non-conformance events for a licensee dashboard.
   */
  async getNonConformanceEvents(licenseeId: string, user: UserAuthScope) {
    return runWithRls(this.prisma, user, async (tx) => {
      return tx.nonConformanceEvent.findMany({
        where: { licenseeId },
        orderBy: { createdAt: 'desc' },
      });
    });
  }
}
