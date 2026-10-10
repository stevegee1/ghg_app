import { MerchProduct, MerchProductKind, Prisma, PrismaClient } from '@prisma/client';

export class MerchCatalogueError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'MerchCatalogueError';
  }
}

/** Largest quantity of one item in a single order. */
export const MAX_ORDER_QUANTITY = 50;

/** The fields shoppers see. Supplier cost is internal and never leaves the server. */
export function toPublicProduct(p: MerchProduct) {
  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    description: p.description,
    category: p.category,
    imageUrl: p.imageUrl,
    imagePosition: p.imagePosition,
    pricePence: p.pricePence,
    currency: p.currency,
    lcaGrams: p.lcaGrams,
    laborHours: p.laborHours,
  };
}

export async function listActiveProducts(prisma: PrismaClient, kind?: MerchProductKind): Promise<MerchProduct[]> {
  return prisma.merchProduct.findMany({
    where: { active: true, ...(kind ? { kind } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
}

/**
 * The product and total for an order, priced from the database. Rejects products that are
 * inactive, of the wrong kind or sold by enquiry only.
 */
export async function priceOrder(
  prisma: PrismaClient,
  params: { productId: unknown; kind: MerchProductKind; quantity: unknown }
): Promise<{ product: MerchProduct & { pricePence: number }; quantity: number; grossAmountPence: number }> {
  if (typeof params.productId !== 'string' || !params.productId.trim()) {
    throw new MerchCatalogueError('productId is required.', 400);
  }
  const quantity = params.quantity === undefined ? 1 : params.quantity;
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
    throw new MerchCatalogueError(`quantity must be a whole number from 1 to ${MAX_ORDER_QUANTITY}.`, 400);
  }
  const product = await prisma.merchProduct.findUnique({ where: { id: params.productId.trim() } });
  if (!product || !product.active || product.kind !== params.kind) {
    throw new MerchCatalogueError('This product is not available.', 404);
  }
  if (product.pricePence === null) {
    throw new MerchCatalogueError('This product is sold by enquiry only.', 409);
  }
  return { product: { ...product, pricePence: product.pricePence }, quantity, grossAmountPence: product.pricePence * quantity };
}

export interface MerchProductUpdate {
  title?: string;
  description?: string | null;
  pricePence?: number | null;
  active?: boolean;
  sortOrder?: number;
}

/** Validates an administrator's change to a product. Returns the fields to write or an error message. */
export function parseProductUpdate(body: Record<string, unknown>): { value: MerchProductUpdate } | { error: string } {
  const value: MerchProductUpdate = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) return { error: 'title must be 1 to 200 characters.' };
    value.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== 'string' || body.description.length > 2000)) {
      return { error: 'description must be text of at most 2000 characters, or null.' };
    }
    value.description = typeof body.description === 'string' ? body.description.trim() || null : null;
  }
  if (body.pricePence !== undefined) {
    if (body.pricePence !== null && (typeof body.pricePence !== 'number' || !Number.isInteger(body.pricePence) || body.pricePence <= 0)) {
      return { error: 'pricePence must be a positive whole number of pence, or null for enquiry only.' };
    }
    value.pricePence = body.pricePence as number | null;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') return { error: 'active must be true or false.' };
    value.active = body.active;
  }
  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== 'number' || !Number.isInteger(body.sortOrder)) return { error: 'sortOrder must be a whole number.' };
    value.sortOrder = body.sortOrder;
  }
  if (Object.keys(value).length === 0) return { error: 'Nothing to update.' };
  return { value };
}

export async function updateProduct(
  prisma: PrismaClient,
  id: string,
  change: MerchProductUpdate,
  adminUserId: string
): Promise<MerchProduct> {
  try {
    return await prisma.merchProduct.update({ where: { id }, data: { ...change, updatedByUserId: adminUserId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new MerchCatalogueError('Product not found.', 404);
    }
    throw err;
  }
}
