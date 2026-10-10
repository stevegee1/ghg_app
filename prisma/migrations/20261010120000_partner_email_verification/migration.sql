-- Partner applications must confirm their email before admins see them.
ALTER TABLE "Charity" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Charity" ADD COLUMN "emailVerificationHash" TEXT;
ALTER TABLE "Charity" ADD COLUMN "emailVerificationExpires" TIMESTAMP(3);
CREATE UNIQUE INDEX "Charity_emailVerificationHash_key" ON "Charity"("emailVerificationHash");

ALTER TABLE "FulfillmentPartnerApplication" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "FulfillmentPartnerApplication" ADD COLUMN "emailVerificationHash" TEXT;
ALTER TABLE "FulfillmentPartnerApplication" ADD COLUMN "emailVerificationExpires" TIMESTAMP(3);
CREATE UNIQUE INDEX "FulfillmentPartnerApplication_emailVerificationHash_key" ON "FulfillmentPartnerApplication"("emailVerificationHash");

-- Records that predate verification were already reviewed by hand; keep them visible.
UPDATE "Charity" SET "emailVerifiedAt" = "createdAt";
UPDATE "FulfillmentPartnerApplication" SET "emailVerifiedAt" = "createdAt";
