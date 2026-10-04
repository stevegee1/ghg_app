import { FleetFuelType, Prisma, PrismaClient } from '@prisma/client';
import { parseAssetFields } from './fleet-import.service';
import { FLEET_FUEL_UNIT } from './emission-factor.service';

type Db = PrismaClient | Prisma.TransactionClient;

export class FleetValidationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'FleetValidationError';
  }
}

function asText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  throw new FleetValidationError('Asset fields must be text, numbers or booleans.');
}

/** Creates one asset from an API body using the same rules as CSV import. */
export async function createFleetAsset(db: Db, licenseeId: string, body: Record<string, unknown>) {
  let fields;
  try {
    fields = parseAssetFields({
      asset_tag: asText(body.assetTag),
      name: asText(body.name),
      category: asText(body.category),
      make: asText(body.make),
      model: asText(body.model),
      serial_number: asText(body.serialNumber),
      fuel_type: asText(body.fuelType),
      ownership: asText(body.ownership),
      operational_control: asText(body.operationalControl),
      site_name: asText(body.siteName),
    });
  } catch (err) {
    throw err instanceof FleetValidationError ? err : new FleetValidationError((err as Error).message);
  }

  const duplicate = await db.fleetAsset.findUnique({
    where: { licenseeId_assetTag: { licenseeId, assetTag: fields.assetTag } },
  });
  if (duplicate) throw new FleetValidationError(`asset_tag ${fields.assetTag} is already registered.`, 409);

  return db.fleetAsset.create({ data: { licenseeId, ...fields } });
}

const BOUNDARY_FIELDS = ['fuelType', 'ownership', 'operationalControl', 'category', 'assetTag'] as const;

/**
 * Updates descriptive fields and the active flag. Fuel type, ownership, operational control,
 * category and tag are fixed once an asset has readings, so past Scope classifications never
 * change; a changed boundary is recorded as a new asset.
 */
export async function updateFleetAsset(db: Db, licenseeId: string, assetId: string, body: Record<string, unknown>) {
  const asset = await db.fleetAsset.findFirst({ where: { id: assetId, licenseeId } });
  if (!asset) throw new FleetValidationError('Asset not found.', 404);

  const boundaryChange = BOUNDARY_FIELDS.filter((f) => body[f] !== undefined);
  if (boundaryChange.length > 0) {
    const readings = await db.fleetReading.count({ where: { assetId } });
    if (readings > 0) {
      throw new FleetValidationError(
        `${boundaryChange.join(', ')} cannot change once an asset has data. Deactivate it and register a new asset instead.`,
        409
      );
    }
  }

  const merged = parseAssetFields({
    asset_tag: asText(body.assetTag) ?? asset.assetTag,
    name: asText(body.name) ?? asset.name,
    category: asText(body.category) ?? asset.category,
    make: body.make !== undefined ? asText(body.make) : asset.make ?? undefined,
    model: body.model !== undefined ? asText(body.model) : asset.model ?? undefined,
    serial_number: body.serialNumber !== undefined ? asText(body.serialNumber) : asset.serialNumber ?? undefined,
    fuel_type: asText(body.fuelType) ?? asset.fuelType,
    ownership: asText(body.ownership) ?? asset.ownership,
    operational_control: asText(body.operationalControl) ?? (asset.operationalControl ? 'yes' : 'no'),
    site_name: body.siteName !== undefined ? asText(body.siteName) : asset.siteName ?? undefined,
  });

  let active = asset.active;
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') throw new FleetValidationError('active must be true or false.');
    active = body.active;
  }

  return db.fleetAsset.update({ where: { id: assetId }, data: { ...merged, active } });
}

export interface EmissionFactorInput {
  source: unknown;
  publicationYear: unknown;
  fuelType: unknown;
  kgCo2ePerUnit: unknown;
  citation: unknown;
}

/** Records a published factor entered by an administrator. Values are never inferred. */
export async function createEmissionFactor(db: Db, input: EmissionFactorInput, adminUserId: string) {
  const currentYear = new Date().getUTCFullYear();
  if (typeof input.source !== 'string' || !input.source.trim() || input.source.length > 120) {
    throw new FleetValidationError('source is required (for example "UK DESNZ GHG Conversion Factors").');
  }
  if (typeof input.publicationYear !== 'number' || !Number.isInteger(input.publicationYear) || input.publicationYear < 2000 || input.publicationYear > currentYear + 1) {
    throw new FleetValidationError(`publicationYear must be a year between 2000 and ${currentYear + 1}.`);
  }
  if (typeof input.fuelType !== 'string' || !(Object.values(FleetFuelType) as string[]).includes(input.fuelType)) {
    throw new FleetValidationError(`fuelType must be one of: ${Object.values(FleetFuelType).join(', ')}.`);
  }
  if (typeof input.kgCo2ePerUnit !== 'string' || !/^\d{1,6}(\.\d{1,6})?$/.test(input.kgCo2ePerUnit) || Number(input.kgCo2ePerUnit) <= 0) {
    throw new FleetValidationError('kgCo2ePerUnit must be a positive number with up to 6 decimal places, sent as text.');
  }
  if (typeof input.citation !== 'string' || input.citation.trim().length < 10 || input.citation.length > 500) {
    throw new FleetValidationError('citation is required: name the publication, table and row the factor was taken from.');
  }

  try {
    return await db.emissionFactor.create({
      data: {
        source: input.source.trim(),
        publicationYear: input.publicationYear,
        fuelType: input.fuelType as FleetFuelType,
        unit: FLEET_FUEL_UNIT,
        kgCo2ePerUnit: input.kgCo2ePerUnit,
        citation: input.citation.trim(),
        createdByUserId: adminUserId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new FleetValidationError(
        'A factor for this source, year and fuel already exists. Factors are kept for audit and never overwritten; ' +
          'for a corrected publication, retire the old factor and use a source label that names the correction.',
        409
      );
    }
    throw err;
  }
}

export async function retireEmissionFactor(db: Db, factorId: string) {
  const factor = await db.emissionFactor.findUnique({ where: { id: factorId } });
  if (!factor) throw new FleetValidationError('Emission factor not found.', 404);
  if (factor.retiredAt) return factor;
  return db.emissionFactor.update({ where: { id: factorId }, data: { retiredAt: new Date() } });
}
