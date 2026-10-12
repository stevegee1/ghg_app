import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { areaDirectory, resolveStorageKey, storageKeyFor } from './file-storage.service';

/**
 * A client's profile logo, kept in private storage. It is shown only to the signed-in client and
 * can be reused when they set up a credential, so they upload it once.
 */

/** The authenticated path the portal loads the logo from; stored as Licensee.logoUrl when a logo exists. */
export const PROFILE_LOGO_PATH = '/api/portal/profile/logo';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function removeQuietly(absolute: string) {
  fs.unlink(absolute, (err) => {
    if (err && err.code !== 'ENOENT') console.error('[PROFILE LOGO CLEANUP ERROR]', err.code);
  });
}

/** Records a newly uploaded file as the profile logo and deletes the one it replaces. */
export async function setProfileLogo(prisma: PrismaClient, licenseeId: string, uploadedPath: string) {
  const key = storageKeyFor(uploadedPath);
  const previous = await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { logoStorageKey: true } });
  await prisma.licensee.update({ where: { id: licenseeId }, data: { logoStorageKey: key, logoUrl: PROFILE_LOGO_PATH } });
  if (previous?.logoStorageKey && previous.logoStorageKey !== key) removeQuietly(resolveStorageKey(previous.logoStorageKey));
  return { logoUrl: PROFILE_LOGO_PATH };
}

export async function removeProfileLogo(prisma: PrismaClient, licenseeId: string) {
  const previous = await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { logoStorageKey: true } });
  await prisma.licensee.update({ where: { id: licenseeId }, data: { logoStorageKey: null, logoUrl: null } });
  if (previous?.logoStorageKey) removeQuietly(resolveStorageKey(previous.logoStorageKey));
}

/** The stored logo file and its type, or null when there is none or the file is missing. */
export async function profileLogoFile(prisma: PrismaClient, licenseeId: string): Promise<{ absolute: string; mimeType: string } | null> {
  const licensee = await prisma.licensee.findUnique({ where: { id: licenseeId }, select: { logoStorageKey: true } });
  if (!licensee?.logoStorageKey) return null;
  const absolute = resolveStorageKey(licensee.logoStorageKey);
  const mimeType = MIME_BY_EXT[path.extname(absolute).toLowerCase()];
  if (!mimeType || !fs.existsSync(absolute)) return null;
  return { absolute, mimeType };
}

/**
 * A private copy of the profile logo for one credential, so replacing or removing the profile
 * logo later never changes the record of an issued credential. Null when there is no logo.
 */
export async function copyProfileLogoForCredential(prisma: PrismaClient, licenseeId: string): Promise<string | null> {
  const logo = await profileLogoFile(prisma, licenseeId);
  if (!logo) return null;
  const target = path.join(areaDirectory('logos', licenseeId), `${crypto.randomUUID()}${path.extname(logo.absolute).toLowerCase()}`);
  await fs.promises.copyFile(logo.absolute, target, fs.constants.COPYFILE_EXCL);
  return target;
}
