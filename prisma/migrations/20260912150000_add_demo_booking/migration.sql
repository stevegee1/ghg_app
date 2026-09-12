-- CreateTable
CREATE TABLE "DemoBooking" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "facilityCount" TEXT,
    "primaryScope" TEXT NOT NULL DEFAULT 'CARBON_EMISSION',
    "requestedSlot" TIMESTAMP(3) NOT NULL,
    "meetUrl" TEXT,
    "ndaRequested" BOOLEAN NOT NULL DEFAULT true,
    "bookingMethod" TEXT NOT NULL DEFAULT 'FORM',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoBooking_workEmail_idx" ON "DemoBooking"("workEmail");

-- CreateIndex
CREATE INDEX "DemoBooking_requestedSlot_idx" ON "DemoBooking"("requestedSlot");
