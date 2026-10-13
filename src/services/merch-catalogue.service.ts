import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MerchProduct, MerchProductKind, Prisma, PrismaClient } from '@prisma/client';
import { PLATFORM_LICENSEE_ID } from './platform-account.service';
import { resolveStorageKey, storageKeyFor } from './file-storage.service';

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
  category?: string | null;
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
  if (body.category !== undefined) {
    if (body.category !== null && (typeof body.category !== 'string' || body.category.length > 80)) {
      return { error: 'category must be text of at most 80 characters, or null.' };
    }
    value.category = typeof body.category === 'string' ? body.category.trim() || null : null;
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

/** Kinds an administrator can add: shop items, and garments for Frenzy Studio. */
export const CREATABLE_KINDS: MerchProductKind[] = [MerchProductKind.CATALOGUE, MerchProductKind.CUSTOM_GARMENT];

export interface MerchProductCreate {
  kind: MerchProductKind;
  title: string;
  description: string | null;
  category: string | null;
  /** Null sells the product by enquiry only ("contact for order"). */
  pricePence: number | null;
  active: boolean;
}

/** Validates a new product from an administrator. */
export function parseProductCreate(body: Record<string, unknown>): { value: MerchProductCreate } | { error: string } {
  if (typeof body.kind !== 'string' || !(CREATABLE_KINDS as string[]).includes(body.kind)) {
    return { error: 'kind must be CATALOGUE (shop item) or CUSTOM_GARMENT (Frenzy Studio garment).' };
  }
  if (body.title === undefined) return { error: 'title must be 1 to 200 characters.' };
  if (body.pricePence === undefined) return { error: 'Give the product a price, or choose contact for order (pricePence: null).' };
  const parsed = parseProductUpdate({
    title: body.title,
    description: body.description ?? null,
    category: body.category ?? null,
    pricePence: body.pricePence,
    active: body.active ?? false,
  });
  if ('error' in parsed) return parsed;
  const v = parsed.value;
  return {
    value: {
      kind: body.kind as MerchProductKind,
      title: v.title as string,
      description: v.description ?? null,
      category: v.category ?? null,
      pricePence: v.pricePence ?? null,
      active: v.active ?? false,
    },
  };
}

/** A readable, unique product id such as item_team_t_shirt_3f9a1c. */
function newProductId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `item_${slug || 'product'}_${crypto.randomBytes(3).toString('hex')}`;
}

/** Adds a product. New products go last in their section and belong to the platform account. */
export async function createProduct(prisma: PrismaClient, input: MerchProductCreate, adminUserId: string): Promise<MerchProduct> {
  const last = await prisma.merchProduct.findFirst({ where: { kind: input.kind }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  return prisma.merchProduct.create({
    data: {
      id: newProductId(input.title),
      kind: input.kind,
      title: input.title,
      description: input.description,
      category: input.category,
      pricePence: input.pricePence,
      active: input.active,
      sortOrder: (last?.sortOrder ?? 0) + 10,
      licenseeId: PLATFORM_LICENSEE_ID,
      updatedByUserId: adminUserId,
    },
  });
}

const IMAGE_MIME_BY_EXT: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

/** Public address of a product photo. The version changes with each upload so browsers fetch the new one. */
export function productImagePath(productId: string, storageKey: string): string {
  const version = crypto.createHash('sha256').update(storageKey).digest('hex').slice(0, 12);
  return `/api/merch/products/${encodeURIComponent(productId)}/image?v=${version}`;
}

/** Records an uploaded photo as the product's image and deletes the photo it replaces. */
export async function setProductImage(prisma: PrismaClient, productId: string, uploadedPath: string, adminUserId: string): Promise<MerchProduct> {
  const previous = await prisma.merchProduct.findUnique({ where: { id: productId }, select: { imageStorageKey: true } });
  if (!previous) throw new MerchCatalogueError('Product not found.', 404);
  const key = storageKeyFor(uploadedPath);
  const product = await prisma.merchProduct.update({
    where: { id: productId },
    data: { imageStorageKey: key, imageUrl: productImagePath(productId, key), imagePosition: 'center', updatedByUserId: adminUserId },
  });
  if (previous.imageStorageKey && previous.imageStorageKey !== key) {
    fs.unlink(resolveStorageKey(previous.imageStorageKey), (err) => {
      if (err && err.code !== 'ENOENT') console.error('[MERCH IMAGE CLEANUP ERROR]', err.code);
    });
  }
  return product;
}

/** The uploaded photo for a product, or null when it has none or the file is missing. */
export async function productImageFile(prisma: PrismaClient, productId: string): Promise<{ absolute: string; mimeType: string } | null> {
  const product = await prisma.merchProduct.findUnique({ where: { id: productId }, select: { imageStorageKey: true } });
  if (!product?.imageStorageKey) return null;
  const absolute = resolveStorageKey(product.imageStorageKey);
  const mimeType = IMAGE_MIME_BY_EXT[path.extname(absolute).toLowerCase()];
  if (!mimeType || !fs.existsSync(absolute)) return null;
  return { absolute, mimeType };
}
