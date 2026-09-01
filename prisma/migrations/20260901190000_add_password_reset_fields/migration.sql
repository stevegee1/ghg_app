-- AlterTable
ALTER TABLE "PortalUser" ADD COLUMN "passwordResetToken" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PortalUser_passwordResetToken_idx" ON "PortalUser"("passwordResetToken");
