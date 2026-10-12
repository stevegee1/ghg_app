import { ConditionFeatures } from './maintenance-features';

/**
 * The predictive maintenance model: L2-regularised logistic regression fitted by Newton's method
 * (iteratively reweighted least squares), so results are deterministic and need no learning rate.
 * Pure functions only. A change to the feature list is a new FEATURE_SET_ID.
 */

export const FEATURE_SET_ID = 'mf-2026.1';

/** Model inputs, in order. Nullable features carry a separate "missing" input. */
export const MODEL_FEATURES = [
  { key: 'operatingHours', label: 'Engine hours, recent' },
  { key: 'avgDailyHours', label: 'Average daily use' },
  { key: 'idleRatioPct', label: 'Idle share' },
  { key: 'idleRatioMissing', label: 'Idle data missing' },
  { key: 'fuelDriftPct', label: 'Fuel burn change' },
  { key: 'fuelDriftMissing', label: 'Fuel baseline missing' },
  { key: 'faultCount', label: 'Fault codes, recent' },
  { key: 'highSeverityFaults', label: 'High-severity faults' },
  { key: 'maxFaultRecurrence', label: 'Repeated fault code' },
  { key: 'serviceIntervalUsed', label: 'Service interval used' },
  { key: 'serviceIntervalMissing', label: 'No service record' },
  { key: 'harshWeatherHours', label: 'Harsh-weather hours' },
  { key: 'priorFailures365', label: 'Breakdowns in the past year' },
] as const;

export type ModelFeatureKey = (typeof MODEL_FEATURES)[number]['key'];

export function vectorize(f: ConditionFeatures): number[] {
  const values: Record<ModelFeatureKey, number> = {
    operatingHours: f.operatingHours,
    avgDailyHours: f.avgDailyHours,
    idleRatioPct: f.idleRatioPct ?? 0,
    idleRatioMissing: f.idleRatioPct === null ? 1 : 0,
    fuelDriftPct: f.fuelDriftPct ?? 0,
    fuelDriftMissing: f.fuelDriftPct === null ? 1 : 0,
    faultCount: f.faultCount,
    highSeverityFaults: f.highSeverityFaults,
    maxFaultRecurrence: f.maxFaultRecurrence,
    serviceIntervalUsed: f.serviceIntervalUsed ?? 0,
    serviceIntervalMissing: f.serviceIntervalUsed === null ? 1 : 0,
    harshWeatherHours: f.harshWeatherHours,
    priorFailures365: f.priorFailures365,
  };
  return MODEL_FEATURES.map((m) => values[m.key]);
}

export interface ModelWeights {
  featureSetId: string;
  features: string[];
  means: number[];
  stds: number[];
  intercept: number;
  coefficients: number[];
}

export interface TrainingOptions {
  l2: number;
  maxIterations: number;
  tolerance: number;
}

const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

/** Solves A x = b by Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    if (Math.abs(M[pivot][c]) < 1e-12) throw new Error('The training data is degenerate: a feature has no variation the model can use.');
    [M[c], M[pivot]] = [M[pivot], M[c]];
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j];
    x[r] = s / M[r][r];
  }
  return x;
}

/**
 * Fits the model. Classes are weighted by their frequency so that rare breakdowns are not ignored;
 * features are standardised with the training set's mean and spread, which are stored with the model.
 */
export function train(X: number[][], y: number[], options: TrainingOptions): ModelWeights & { iterations: number } {
  const n = X.length;
  const d = X[0].length;
  const means = Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[j], 0) / n);
  const stds = Array.from({ length: d }, (_, j) => {
    const v = X.reduce((s, r) => s + (r[j] - means[j]) ** 2, 0) / n;
    return v > 0 ? Math.sqrt(v) : 1;
  });
  const Z = X.map((r) => [1, ...r.map((v, j) => (v - means[j]) / stds[j])]);
  const positives = y.reduce((s, v) => s + v, 0);
  const wPos = n / (2 * positives);
  const wNeg = n / (2 * (n - positives));
  const sampleWeight = y.map((v) => (v === 1 ? wPos : wNeg));

  let beta = new Array(d + 1).fill(0);
  let iterations = 0;
  for (; iterations < options.maxIterations; iterations++) {
    const H = Array.from({ length: d + 1 }, () => new Array(d + 1).fill(0));
    const g = new Array(d + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const p = sigmoid(Z[i].reduce((s, v, j) => s + v * beta[j], 0));
      const w = sampleWeight[i] * p * (1 - p);
      const err = sampleWeight[i] * (y[i] - p);
      for (let a = 0; a <= d; a++) {
        g[a] += err * Z[i][a];
        for (let b = 0; b <= d; b++) H[a][b] += w * Z[i][a] * Z[i][b];
      }
    }
    // Ridge penalty on the coefficients, never on the intercept.
    for (let a = 1; a <= d; a++) {
      H[a][a] += options.l2;
      g[a] -= options.l2 * beta[a];
    }
    const step = solve(H, g);
    beta = beta.map((v, j) => v + step[j]);
    if (Math.max(...step.map(Math.abs)) < options.tolerance) {
      iterations++;
      break;
    }
  }
  return {
    featureSetId: FEATURE_SET_ID,
    features: MODEL_FEATURES.map((m) => m.key),
    means,
    stds,
    intercept: beta[0],
    coefficients: beta.slice(1),
    iterations,
  };
}

export function predict(model: ModelWeights, x: number[]): number {
  const z = model.intercept + x.reduce((s, v, j) => s + model.coefficients[j] * ((v - model.means[j]) / model.stds[j]), 0);
  return sigmoid(z);
}

/** The inputs pushing this prediction up most, for explaining it to the client. */
export function topContributions(model: ModelWeights, x: number[], count: number) {
  return x
    .map((v, j) => ({ key: MODEL_FEATURES[j].key, label: MODEL_FEATURES[j].label, value: v, effect: model.coefficients[j] * ((v - model.means[j]) / model.stds[j]) }))
    .filter((c) => c.effect > 0)
    .sort((a, b) => b.effect - a.effect)
    .slice(0, count)
    .map((c) => ({ ...c, effect: Math.round(c.effect * 1000) / 1000 }));
}

/** Area under the ROC curve (Mann-Whitney), with ties counted as half. */
export function auc(scores: number[], labels: number[]): number | null {
  const pos = scores.filter((_, i) => labels[i] === 1);
  const neg = scores.filter((_, i) => labels[i] === 0);
  if (pos.length === 0 || neg.length === 0) return null;
  const ranked = scores.map((s, i) => ({ s, y: labels[i] })).sort((a, b) => a.s - b.s);
  let rankSumPos = 0;
  for (let i = 0; i < ranked.length; ) {
    let j = i;
    while (j < ranked.length && ranked[j].s === ranked[i].s) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (ranked[k].y === 1) rankSumPos += avgRank;
    i = j;
  }
  return (rankSumPos - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length);
}

export function evaluate(scores: number[], labels: number[], alertProbability: number) {
  const flagged = scores.map((s) => s >= alertProbability);
  const tp = flagged.filter((f, i) => f && labels[i] === 1).length;
  const fp = flagged.filter((f, i) => f && labels[i] === 0).length;
  const fn = flagged.filter((f, i) => !f && labels[i] === 1).length;
  const brier = scores.reduce((s, p, i) => s + (p - labels[i]) ** 2, 0) / scores.length;
  const round = (v: number | null) => (v === null ? null : Math.round(v * 10000) / 10000);
  return {
    samples: scores.length,
    positives: labels.filter((l) => l === 1).length,
    auc: round(auc(scores, labels)),
    brier: round(brier),
    precision: round(tp + fp > 0 ? tp / (tp + fp) : null),
    recall: round(tp + fn > 0 ? tp / (tp + fn) : null),
  };
}
