import { FleetProjectStatus, Prisma, PrismaClient } from '@prisma/client';
import { FleetValidationError } from './fleet-asset.service';

type Db = PrismaClient | Prisma.TransactionClient;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !DATE_RE.test(value)) throw new FleetValidationError(`${field} must be a date in the form YYYY-MM-DD.`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new FleetValidationError(`${field} is not a real date.`);
  return date;
}

function optionalDate(value: unknown, field: string): Date | null {
  return value === undefined || value === null || value === '' ? null : parseDate(value, field);
}

export const toIsoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

interface ProjectFields {
  name: string;
  reference: string | null;
  contractValuePence: bigint;
  budgetedMarginBps: number;
  currency: string;
  startDate: Date;
  endDate: Date | null;
}

/** Validates a project body. With partial, only the fields present are checked and returned. */
function parseProjectFields(body: Record<string, unknown>, partial: boolean): Partial<ProjectFields> {
  const out: Partial<ProjectFields> = {};
  const has = (k: string) => body[k] !== undefined;
  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200) throw new FleetValidationError('name is required (up to 200 characters).');
    out.name = body.name.trim();
  }
  if (has('reference')) {
    if (body.reference !== null && (typeof body.reference !== 'string' || body.reference.length > 100)) {
      throw new FleetValidationError('reference must be up to 100 characters.');
    }
    out.reference = typeof body.reference === 'string' && body.reference.trim() ? body.reference.trim() : null;
  }
  if (!partial || has('contractValuePence')) {
    const v = body.contractValuePence;
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v <= 0) {
      throw new FleetValidationError('contractValuePence must be a positive whole number of pence.');
    }
    out.contractValuePence = BigInt(v);
  }
  if (!partial || has('budgetedMarginBps')) {
    const m = body.budgetedMarginBps;
    if (typeof m !== 'number' || !Number.isInteger(m) || m < -10000 || m > 10000) {
      throw new FleetValidationError('budgetedMarginBps must be a whole number from -10000 to 10000 (basis points).');
    }
    out.budgetedMarginBps = m;
  }
  if (!partial || has('currency')) {
    if (typeof body.currency !== 'string' || !/^[A-Z]{3}$/.test(body.currency)) throw new FleetValidationError('currency must be a 3-letter ISO code.');
    out.currency = body.currency;
  }
  if (!partial || has('startDate')) out.startDate = parseDate(body.startDate, 'startDate');
  if (!partial || has('endDate')) out.endDate = optionalDate(body.endDate, 'endDate');
  return out;
}

export function serializeProject<T extends { contractValuePence: bigint; startDate: Date; endDate: Date | null }>(p: T) {
  return { ...p, contractValuePence: Number(p.contractValuePence), startDate: toIsoDate(p.startDate), endDate: toIsoDate(p.endDate) };
}

const projectInclude = {
  assignments: {
    orderBy: { fromDate: 'asc' as const },
    include: { asset: { select: { id: true, assetTag: true, name: true } } },
  },
};

type ProjectWithAssignments = Prisma.FleetProjectGetPayload<{ include: typeof projectInclude }>;

function serializeWithAssignments(p: ProjectWithAssignments) {
  return {
    ...serializeProject(p),
    assignments: p.assignments.map((a) => ({ ...a, fromDate: toIsoDate(a.fromDate), toDate: toIsoDate(a.toDate) })),
  };
}

export async function listProjects(db: Db, licenseeId: string) {
  const projects = await db.fleetProject.findMany({
    where: { licenseeId },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    include: projectInclude,
  });
  return projects.map(serializeWithAssignments);
}

export async function getProject(db: Db, licenseeId: string, projectId: string) {
  const project = await db.fleetProject.findFirst({ where: { id: projectId, licenseeId }, include: projectInclude });
  if (!project) throw new FleetValidationError('Project not found.', 404);
  return project;
}

function rethrowUnique(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new FleetValidationError('A project with this name already exists.', 409);
  }
  throw err;
}

export async function createProject(db: Db, licenseeId: string, body: Record<string, unknown>) {
  const f = parseProjectFields(body, false) as ProjectFields;
  if (f.endDate && f.endDate < f.startDate) throw new FleetValidationError('endDate must be on or after startDate.');
  try {
    const p = await db.fleetProject.create({ data: { licenseeId, ...f, reference: f.reference ?? null }, include: projectInclude });
    return serializeWithAssignments(p);
  } catch (err) {
    rethrowUnique(err);
  }
}

export async function updateProject(db: Db, licenseeId: string, projectId: string, body: Record<string, unknown>) {
  const current = await getProject(db, licenseeId, projectId);
  const f = parseProjectFields(body, true);
  let status: FleetProjectStatus | undefined;
  if (body.status !== undefined) {
    if (!Object.values(FleetProjectStatus).includes(body.status as FleetProjectStatus)) throw new FleetValidationError('status must be ACTIVE or CLOSED.');
    status = body.status as FleetProjectStatus;
  }
  const start = f.startDate ?? current.startDate;
  const end = f.endDate !== undefined ? f.endDate : current.endDate;
  if (end && end < start) throw new FleetValidationError('endDate must be on or after startDate.');
  const outside = current.assignments.some((a) => a.fromDate < start || (end && (a.toDate === null || a.toDate > end)));
  if (outside) throw new FleetValidationError('Some machine assignments fall outside these dates. Adjust them first.', 409);
  try {
    const p = await db.fleetProject.update({ where: { id: projectId }, data: { ...f, ...(status ? { status } : {}) }, include: projectInclude });
    return serializeWithAssignments(p);
  } catch (err) {
    rethrowUnique(err);
  }
}

/** Assigns a machine to a project for a period inside the project's dates, never overlapping another assignment. */
export async function assignAsset(db: Db, licenseeId: string, projectId: string, body: Record<string, unknown>) {
  const project = await getProject(db, licenseeId, projectId);
  if (typeof body.assetId !== 'string') throw new FleetValidationError('assetId is required.');
  const asset = await db.fleetAsset.findFirst({ where: { id: body.assetId, licenseeId } });
  if (!asset) throw new FleetValidationError('Machine not found.', 404);
  const fromDate = parseDate(body.fromDate, 'fromDate');
  const toDate = optionalDate(body.toDate, 'toDate');
  if (toDate && toDate < fromDate) throw new FleetValidationError('toDate must be on or after fromDate.');
  if (fromDate < project.startDate) throw new FleetValidationError('The machine cannot start before the project starts.');
  if (project.endDate && (!toDate || toDate > project.endDate)) {
    throw new FleetValidationError('The assignment must end on or before the project end date.');
  }

  const clash = await db.fleetProjectAsset.findFirst({
    where: {
      assetId: asset.id,
      fromDate: toDate ? { lte: toDate } : undefined,
      OR: [{ toDate: null }, { toDate: { gte: fromDate } }],
    },
    include: { project: { select: { name: true } } },
  });
  if (clash) {
    throw new FleetValidationError(`${asset.name} is already on ${clash.project.name} for part of this period.`, 409);
  }
  await db.fleetProjectAsset.create({ data: { licenseeId, projectId, assetId: asset.id, fromDate, toDate } });
  return serializeWithAssignments(await getProject(db, licenseeId, projectId));
}

/** Sets or clears the last day of an assignment. */
export async function endAssignment(db: Db, licenseeId: string, projectId: string, assignmentId: string, body: Record<string, unknown>) {
  const project = await getProject(db, licenseeId, projectId);
  const assignment = project.assignments.find((a) => a.id === assignmentId);
  if (!assignment) throw new FleetValidationError('Assignment not found.', 404);
  const toDate = optionalDate(body.toDate, 'toDate');
  if (toDate && toDate < assignment.fromDate) throw new FleetValidationError('toDate must be on or after the start of the assignment.');
  if (project.endDate && (!toDate || toDate > project.endDate)) throw new FleetValidationError('The assignment must end on or before the project end date.');
  if (!toDate || !assignment.toDate || toDate > assignment.toDate) {
    const clash = await db.fleetProjectAsset.findFirst({
      where: {
        id: { not: assignment.id },
        assetId: assignment.assetId,
        fromDate: toDate ? { lte: toDate, gt: assignment.fromDate } : { gt: assignment.fromDate },
      },
    });
    if (clash) throw new FleetValidationError('The machine is on another project in that period.', 409);
  }
  await db.fleetProjectAsset.update({ where: { id: assignment.id }, data: { toDate } });
  return serializeWithAssignments(await getProject(db, licenseeId, projectId));
}

export async function removeAssignment(db: Db, licenseeId: string, projectId: string, assignmentId: string) {
  const project = await getProject(db, licenseeId, projectId);
  if (!project.assignments.some((a) => a.id === assignmentId)) throw new FleetValidationError('Assignment not found.', 404);
  await db.fleetProjectAsset.delete({ where: { id: assignmentId } });
  return serializeWithAssignments(await getProject(db, licenseeId, projectId));
}
