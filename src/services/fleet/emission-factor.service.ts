import { EmissionFactor, FleetFuelType, Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export const FLEET_FUEL_UNIT = 'litre';

export class EmissionFactorMissingError extends Error {
  constructor(public fuelType: FleetFuelType, public year: number) {
    super(`No emission factor is configured for ${fuelType} for ${year} or earlier. An administrator must add one before this data can be calculated.`);
    this.name = 'EmissionFactorMissingError';
  }
}

/**
 * Factor for a fuel and reporting year: the most recent non-retired factor published for that
 * year or earlier, in litres. Factors are never inferred; if none exists the caller must refuse.
 */
export async function resolveEmissionFactor(db: Db, fuelType: FleetFuelType, year: number): Promise<EmissionFactor> {
  const factor = await db.emissionFactor.findFirst({
    where: { fuelType, unit: FLEET_FUEL_UNIT, retiredAt: null, publicationYear: { lte: year } },
    orderBy: { publicationYear: 'desc' },
  });
  if (!factor) {
    throw new EmissionFactorMissingError(fuelType, year);
  }
  return factor;
}

/** kg CO2e for a fuel quantity, rounded to 3 decimal places, using exact decimal arithmetic. */
export function calculateKgCo2e(fuelQuantity: Prisma.Decimal, factor: Pick<EmissionFactor, 'kgCo2ePerUnit'>): Prisma.Decimal {
  return fuelQuantity.mul(factor.kgCo2ePerUnit).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
}
