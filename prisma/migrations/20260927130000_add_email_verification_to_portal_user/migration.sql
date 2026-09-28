-- AlterTable
ALTER TABLE "PortalUser" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailVerificationToken" TEXT,
ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PortalUser_emailVerificationToken_idx" ON "PortalUser"("emailVerificationToken");

-- Backfill: existing admin users and existing registered users are marked as verified so they are not interrupted
UPDATE "PortalUser" SET "emailVerified" = true;
