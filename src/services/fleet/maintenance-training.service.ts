import crypto from 'crypto';
import { FleetMaintenanceModel, MaintenanceModelStatus, MaintenanceRuleSet, Prisma, PrismaClient } from '@prisma/client';
import { runWithRls } from '../../db/rls';
import { FleetValidationError } from './fleet-asset.service';
import { FAILURE_EVENT_TYPES } from './fleet-maintenance.service';
import { MachineHistory, computeFeatures } from './maintenance-features';
import { getActiveRuleSet, loadHistories } from './maintenance-insight.service';
import { FEATURE_SET_ID, MODEL_FEATURES, ModelWeights, evaluate, predict, topContributions, train, vectorize } from './maintenance-model';

type Db = PrismaClient | Prisma.TransactionClient;
const DAY_MS = 24 * 60 * 60 * 1000;
const ADMIN_SCOPE = { role: 'ADMIN', licenseeId: null };

/** Numerical settings of the fitting method, not business values: Newton's method converges in a few steps. */
const SOLVER = { maxIterations: 50, tolerance: 1e-6 };
/** How many factors are shown with each prediction. */
const FACTORS_SHOWN = 3;

export interface TrainingSettings {
  version: string;
  horizonDays: number;
  sampleEveryDays: number;
  holdoutFraction: number;
  l2: number;
  minPositives: number;
  minAuc: number;
  alertProbability: number;
}

function num(v: unknown, field: string, min: number, max: number, integer: boolean): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
    throw new FleetValidationError(`${field} must be ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`);
  }
  return v;
}

export function parseTrainingSettings(body: Record<string, unknown>): TrainingSettings {
  if (typeof body.version !== 'string' || !/^[A-Za-z0-9._-]{1,30}$/.test(body.version)) {
    throw new FleetValidationError('version must be 1 to 30 letters, digits, dots, dashes or underscores.');
  }
  return {
    version: body.version,
    horizonDays: num(body.horizonDays, 'horizonDays', 1, 365, true),
    sampleEveryDays: num(body.sampleEveryDays, 'sampleEveryDays', 1, 90, true),
    holdoutFraction: num(body.holdoutFraction, 'holdoutFraction', 0.05, 0.5, false),
    l2: num(body.l2, 'l2', 0, 1000, false),
    minPositives: num(body.minPositives, 'minPositives', 1, 100000, true),
    minAuc: num(body.minAuc, 'minAuc', 0.5, 1, false),
    alertProbability: num(body.alertProbability, 'alertProbability', 0.01, 0.99, false),
  };
}

interface Sample {
  t: number;
  x: number[];
  y: number;
}

/** True when anything at all was recorded for the machine in the window, so idle gaps are not taught as "healthy". */
const hasActivity = (x: number[]) => x[0] > 0 || x[MODEL_FEATURES.findIndex((m) => m.key === 'faultCount')] > 0;

/** Labelled examples from one machine: features at each sample time, and whether a failure followed within the horizon. */
export function samplesForMachine(history: MachineHistory, rules: MaintenanceRuleSet, settings: Pick<TrainingSettings, 'horizonDays' | 'sampleEveryDays'>, until: Date): Sample[] {
  const times = [
    ...history.usage.map((u) => u.periodStart.getTime()),
    ...history.meters.map((m) => m.observedAt.getTime()),
    ...history.faults.map((f) => f.observedAt.getTime()),
  ];
  if (times.length === 0) return [];
  const failures = history.maintenance.filter((m) => FAILURE_EVENT_TYPES.includes(m.type)).map((m) => m.occurredAt.getTime());
  const first = Math.min(...times) + rules.lookbackDays * DAY_MS;
  const last = until.getTime() - settings.horizonDays * DAY_MS;
  const out: Sample[] = [];
  for (let t = first; t <= last; t += settings.sampleEveryDays * DAY_MS) {
    const x = vectorize(computeFeatures(history, new Date(t), rules));
    if (!hasActivity(x)) continue;
    const y = failures.some((f) => f > t && f <= t + settings.horizonDays * DAY_MS) ? 1 : 0;
    out.push({ t, x, y });
  }
  return out;
}

/** What training would have to work with right now. */
export async function trainingDataSummary(prisma: PrismaClient) {
  return runWithRls(prisma, ADMIN_SCOPE, async (tx) => {
    const consents = await tx.modelTrainingConsent.findMany({ where: { withdrawnAt: null }, select: { licenseeId: true } });
    const licenseeIds = consents.map((c) => c.licenseeId);
    const [machines, failures] = await Promise.all([
      tx.fleetAsset.count({ where: { licenseeId: { in: licenseeIds } } }),
      tx.fleetMaintenanceEvent.count({ where: { licenseeId: { in: licenseeIds }, type: { in: FAILURE_EVENT_TYPES } } }),
    ]);
    return { consentingClients: licenseeIds.length, machines, failureEvents: failures };
  });
}

/**
 * Trains a model on every consenting client's machines under the active rule set. The most recent
 * part of the timeline is held back to measure accuracy on data the model has not seen. The run is
 * always recorded; it can be published only if it met the administrator's minimums.
 */
export async function trainModel(prisma: PrismaClient, settings: TrainingSettings, userId: string, until = new Date()): Promise<FleetMaintenanceModel> {
  const rules = await getActiveRuleSet(prisma);
  if (!rules) throw new FleetValidationError('Publish a maintenance rule set first: the model uses its time windows.', 409);
  if (await prisma.fleetMaintenanceModel.findUnique({ where: { version: settings.version } })) {
    throw new FleetValidationError('That version already exists.', 409);
  }

  const { samples, clientCount, machineCount } = await runWithRls(prisma, ADMIN_SCOPE, async (tx) => {
    const consents = await tx.modelTrainingConsent.findMany({ where: { withdrawnAt: null }, select: { licenseeId: true } });
    const assets = await tx.fleetAsset.findMany({ where: { licenseeId: { in: consents.map((c) => c.licenseeId) } }, select: { id: true } });
    const histories = await loadHistories(tx, assets.map((a) => a.id), new Date(0), until);
    const all: Sample[] = [];
    let machinesWithData = 0;
    for (const history of histories.values()) {
      const s = samplesForMachine(history, rules, settings, until);
      if (s.length > 0) machinesWithData++;
      all.push(...s);
    }
    return { samples: all, clientCount: consents.length, machineCount: machinesWithData };
  });

  const positives = samples.filter((s) => s.y === 1).length;
  if (samples.length === 0 || positives === 0 || positives === samples.length) {
    throw new FleetValidationError(
      `Not enough labelled data to train: ${samples.length} examples, ${positives} followed by a breakdown. Both outcomes are needed.`,
      409
    );
  }

  samples.sort((a, b) => a.t - b.t);
  const cut = Math.floor(samples.length * (1 - settings.holdoutFraction));
  const trainSet = samples.slice(0, cut);
  const testSet = samples.slice(cut);
  const trainPositives = trainSet.filter((s) => s.y === 1).length;
  if (trainPositives === 0 || trainPositives === trainSet.length) {
    throw new FleetValidationError('The earlier part of the timeline has only one outcome, so the model cannot learn. Add history or change the held-back share.', 409);
  }

  let weights: ModelWeights;
  try {
    weights = train(trainSet.map((s) => s.x), trainSet.map((s) => s.y), { l2: settings.l2, ...SOLVER });
  } catch (err) {
    throw new FleetValidationError((err as Error).message, 409);
  }
  const score = (set: Sample[]) => set.map((s) => predict(weights, s.x));
  const trainMetrics = evaluate(score(trainSet), trainSet.map((s) => s.y), settings.alertProbability);
  const testMetrics = evaluate(score(testSet), testSet.map((s) => s.y), settings.alertProbability);

  const problems: string[] = [];
  if (testMetrics.positives < settings.minPositives) problems.push(`held-back breakdowns ${testMetrics.positives} < minimum ${settings.minPositives}`);
  if (testMetrics.auc === null || testMetrics.auc < settings.minAuc) problems.push(`held-back AUC ${testMetrics.auc ?? 'not measurable'} < minimum ${settings.minAuc}`);

  // The fingerprint covers only times, inputs and outcomes: no client, machine or user identity.
  const datasetSha256 = crypto.createHash('sha256').update(JSON.stringify(samples.map((s) => [s.t, s.x, s.y]))).digest('hex');

  return prisma.fleetMaintenanceModel.create({
    data: {
      version: settings.version,
      featureSetId: FEATURE_SET_ID,
      ruleSetId: rules.id,
      horizonDays: settings.horizonDays,
      settings: { ...settings, solver: SOLVER, iterations: (weights as ModelWeights & { iterations?: number }).iterations ?? null } as unknown as Prisma.InputJsonValue,
      weights: weights as unknown as Prisma.InputJsonValue,
      trainMetrics,
      testMetrics,
      clientCount,
      machineCount,
      sampleCount: samples.length,
      positiveCount: positives,
      datasetSha256,
      passedGate: problems.length === 0,
      gateNotes: problems.length === 0 ? 'Met the accuracy minimums on held-back data.' : `Not publishable: ${problems.join('; ')}.`,
      trainedByUserId: userId,
    },
  });
}

/** Publishes a model that met its minimums, retiring the one it replaces. */
export async function publishModel(prisma: PrismaClient, id: string, userId: string) {
  const model = await prisma.fleetMaintenanceModel.findUnique({ where: { id } });
  if (!model) throw new FleetValidationError('Model not found.', 404);
  if (!model.passedGate) throw new FleetValidationError(model.gateNotes, 409);
  if (model.status === MaintenanceModelStatus.PUBLISHED) return model;
  return prisma.$transaction(async (tx) => {
    await tx.fleetMaintenanceModel.updateMany({ where: { status: MaintenanceModelStatus.PUBLISHED }, data: { status: MaintenanceModelStatus.RETIRED } });
    return tx.fleetMaintenanceModel.update({ where: { id }, data: { status: MaintenanceModelStatus.PUBLISHED, publishedByUserId: userId, publishedAt: new Date() } });
  });
}

/** Withdraws the published model; clients then see the rule-based check only. */
export async function retirePublishedModel(prisma: PrismaClient) {
  return prisma.fleetMaintenanceModel.updateMany({ where: { status: MaintenanceModelStatus.PUBLISHED }, data: { status: MaintenanceModelStatus.RETIRED } });
}

export async function getPublishedModel(db: Db) {
  return db.fleetMaintenanceModel.findFirst({ where: { status: MaintenanceModelStatus.PUBLISHED }, include: { ruleSet: true } });
}

export interface MachinePrediction {
  probability: number;
  alert: boolean;
  horizonDays: number;
  modelVersion: string;
  factors: ReturnType<typeof topContributions>;
}

/** The published model's prediction for one machine, using the windows it was trained with. */
export function predictMachine(model: FleetMaintenanceModel & { ruleSet: MaintenanceRuleSet }, history: MachineHistory, at: Date): MachinePrediction {
  const weights = model.weights as unknown as ModelWeights;
  const settings = model.settings as unknown as TrainingSettings;
  const x = vectorize(computeFeatures(history, at, model.ruleSet));
  const probability = predict(weights, x);
  return {
    probability: Math.round(probability * 1000) / 1000,
    alert: probability >= settings.alertProbability,
    horizonDays: model.horizonDays,
    modelVersion: model.version,
    factors: topContributions(weights, x, FACTORS_SHOWN),
  };
}
