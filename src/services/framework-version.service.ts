import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The current version of a framework is the most recent one already in effect and not retired.
 * New drafts start on it; existing submissions keep the version they started on.
 */
export function currentVersionInclude(now: Date = new Date()) {
  return {
    where: { retiredAt: null, effectiveFrom: { lte: now } },
    orderBy: [{ effectiveFrom: 'desc' as const }, { publishedAt: 'desc' as const }],
    take: 1,
    include: { questions: { orderBy: { orderIndex: 'asc' as const } } },
  };
}

export async function getCurrentVersion(db: Db, frameworkId: string, now: Date = new Date()) {
  const { include, ...query } = currentVersionInclude(now);
  return db.workflowFrameworkVersion.findFirst({ ...query, where: { ...query.where, frameworkId }, include });
}

export interface VersionQuestionContent {
  orderIndex: number;
  text: string;
  answerType: string;
  options: string[];
  evidenceRequired: boolean;
  isoClauseReference: string;
  guidanceNotes: string | null;
}

/** SHA-256 over the canonical question set. Any change to wording, order, type or evidence rules changes it. */
export function questionSetHash(questions: VersionQuestionContent[]): string {
  const canonical = questions
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((q) => [q.orderIndex, q.text, q.answerType, q.options, q.evidenceRequired, q.isoClauseReference, q.guidanceNotes ?? null]);
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** How a version is described wherever an assessment is shown: "2026.1 (ISO 14064-1:2018)". */
export function describeVersion(version: { version: string; standardReference: string }): string {
  return `${version.version} (${version.standardReference})`;
}
