npm warn Unknown project config "shamefully-hoist". This will stop working in the next major version of npm.
warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

Loaded Prisma config from prisma.config.ts.

warn The Prisma config file in prisma.config.ts overrides the deprecated `package.json#prisma` property in package.json.
  For more information, see: https://pris.ly/prisma-config

Prisma config detected, skipping environment variable loading.
-- CreateEnum
CREATE TYPE "GuestSegment" AS ENUM ('SOLO', 'COUPLE', 'FAMILY', 'GROUP', 'CORPORATE');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('NO_CONTACT', 'ACTIVE', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COLD', 'CHURNED', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "SaleOrderState" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CertificateState" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('EARLY_BIRD', 'LAST_MINUTE', 'LONG_STAY', 'PACKAGE', 'SEASONAL', 'LOYALTY', 'SPECIAL');

-- DropForeignKey
ALTER TABLE "PaymentScheduleLine" DROP CONSTRAINT "PaymentScheduleLine_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralUsage" DROP CONSTRAINT "ReferralUsage_guestId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralUsage" DROP CONSTRAINT "ReferralUsage_referralLinkId_fkey";

-- DropForeignKey
ALTER TABLE "SaleOrder" DROP CONSTRAINT "SaleOrder_bookingId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedOutAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "farmerHandoffAt" TIMESTAMP(3),
ADD COLUMN     "graceDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "invoicedAt" TIMESTAMP(3),
ADD COLUMN     "lastProposalSentAt" TIMESTAMP(3),
ADD COLUMN     "paymentDeadline" TIMESTAMP(3),
ADD COLUMN     "paymentUrl" TEXT,
ADD COLUMN     "prepaidAt" TIMESTAMP(3),
ADD COLUMN     "qualifiedAt" TIMESTAMP(3),
ADD COLUMN     "referralLinkId" TEXT,
ADD COLUMN     "smsSentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telegramSentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmTerm" TEXT;

-- AlterTable
ALTER TABLE "GuestProfile" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'UA',
ADD COLUMN     "currentStatus" "GuestStatus" NOT NULL DEFAULT 'NO_CONTACT',
ADD COLUMN     "guestCode" TEXT,
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "lastStayDate" DATE,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "segment" "GuestSegment",
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bookingPrefix" CHAR(1),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "liqpayPrivateKey" TEXT,
ADD COLUMN     "liqpayPublicKey" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- DropTable
DROP TABLE "Certificate";

-- DropTable
DROP TABLE "LoyaltyRule";

-- DropTable
DROP TABLE "PaymentScheduleLine";

-- DropTable
DROP TABLE "ReferralLink";

-- DropTable
DROP TABLE "ReferralUsage";

-- DropTable
DROP TABLE "SaleOrder";

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guestProfileId" TEXT,
    "name" TEXT NOT NULL,
    "birthDate" DATE,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utm_touches" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "term" TEXT,
    "content" TEXT,
    "touchType" TEXT,
    "touchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utm_touches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wish_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "wish_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_profile_tags" (
    "guestId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "guest_profile_tags_pkey" PRIMARY KEY ("guestId","tagId")
);

-- CreateTable
CREATE TABLE "loyalty_rules" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "tier" "LoyaltyTier" NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "minNights" INTEGER NOT NULL DEFAULT 0,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "certAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "referralBonus" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATE,
    "validUntil" DATE,

    CONSTRAINT "loyalty_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_links" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT,
    "code" TEXT NOT NULL,
    "token" TEXT,
    "discountPct" INTEGER NOT NULL DEFAULT 5,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_usages" (
    "id" TEXT NOT NULL,
    "referralLinkId" TEXT NOT NULL,
    "guestId" TEXT,
    "bookingId" TEXT,
    "bonusAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonusCreditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_schedule_lines" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "pct" INTEGER NOT NULL DEFAULT 30,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentToken" TEXT,
    "liqpayOrderId" TEXT,
    "activityScheduled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payment_schedule_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_orders" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "liqpayOrderId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "state" "SaleOrderState" NOT NULL DEFAULT 'DRAFT',
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "rawResponse" JSONB,
    "invoiceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerId" TEXT,
    "initialAmount" DECIMAL(10,2) NOT NULL,
    "usedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "state" "CertificateState" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATE,
    "issuedReason" TEXT,
    "issuedByBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_logs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,

    CONSTRAINT "cron_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "portal_page_views" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "PromotionType" NOT NULL,
    "bookingDateFrom" DATE,
    "bookingDateTo" DATE,
    "stayDateFrom" DATE,
    "stayDateTo" DATE,
    "discountPct" DECIMAL(5,2),
    "discountAmount" DECIMAL(10,2),
    "prepayPctOverride" INTEGER,
    "minNights" INTEGER,
    "minGuests" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_guests_bookingId_idx" ON "booking_guests"("bookingId");

-- CreateIndex
CREATE INDEX "utm_touches_bookingId_idx" ON "utm_touches"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "wish_tags_name_key" ON "wish_tags"("name");

-- CreateIndex
CREATE INDEX "loyalty_rules_tier_idx" ON "loyalty_rules"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_code_key" ON "referral_links"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_token_key" ON "referral_links"("token");

-- CreateIndex
CREATE INDEX "referral_links_referrerId_idx" ON "referral_links"("referrerId");

-- CreateIndex
CREATE INDEX "referral_usages_referralLinkId_idx" ON "referral_usages"("referralLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_schedule_lines_paymentToken_key" ON "payment_schedule_lines"("paymentToken");

-- CreateIndex
CREATE INDEX "payment_schedule_lines_bookingId_idx" ON "payment_schedule_lines"("bookingId");

-- CreateIndex
CREATE INDEX "payment_schedule_lines_status_dueDate_idx" ON "payment_schedule_lines"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "sale_orders_paymentToken_key" ON "sale_orders"("paymentToken");

-- CreateIndex
CREATE UNIQUE INDEX "sale_orders_liqpayOrderId_key" ON "sale_orders"("liqpayOrderId");

-- CreateIndex
CREATE INDEX "sale_orders_bookingId_idx" ON "sale_orders"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_code_key" ON "certificates"("code");

-- CreateIndex
CREATE INDEX "certificates_ownerId_idx" ON "certificates"("ownerId");

-- CreateIndex
CREATE INDEX "certificates_state_idx" ON "certificates"("state");

-- CreateIndex
CREATE INDEX "cron_logs_jobName_startedAt_idx" ON "cron_logs"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX "portal_page_views_bookingId_idx" ON "portal_page_views"("bookingId");

-- CreateIndex
CREATE INDEX "portal_page_views_token_idx" ON "portal_page_views"("token");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_propertyId_idx" ON "promotions"("propertyId");

-- CreateIndex
CREATE INDEX "Booking_stage_idx" ON "Booking"("stage");

-- CreateIndex
CREATE INDEX "Booking_guestId_idx" ON "Booking"("guestId");

-- CreateIndex
CREATE INDEX "Booking_propertyId_idx" ON "Booking"("propertyId");

-- CreateIndex
CREATE INDEX "Booking_closerId_idx" ON "Booking"("closerId");

-- CreateIndex
CREATE INDEX "Booking_checkinDate_idx" ON "Booking"("checkinDate");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "Booking_portalToken_idx" ON "Booking"("portalToken");

-- CreateIndex
CREATE INDEX "Booking_paymentToken_idx" ON "Booking"("paymentToken");

-- CreateIndex
CREATE UNIQUE INDEX "GuestProfile_guestCode_key" ON "GuestProfile"("guestCode");

-- CreateIndex
CREATE INDEX "GuestProfile_phone_idx" ON "GuestProfile"("phone");

-- CreateIndex
CREATE INDEX "GuestProfile_email_idx" ON "GuestProfile"("email");

-- CreateIndex
CREATE INDEX "GuestProfile_loyaltyTier_idx" ON "GuestProfile"("loyaltyTier");

-- CreateIndex
CREATE INDEX "GuestProfile_currentStatus_idx" ON "GuestProfile"("currentStatus");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "referral_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utm_touches" ADD CONSTRAINT "utm_touches_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profile_tags" ADD CONSTRAINT "guest_profile_tags_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profile_tags" ADD CONSTRAINT "guest_profile_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "wish_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_usages" ADD CONSTRAINT "referral_usages_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "referral_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_usages" ADD CONSTRAINT "referral_usages_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_schedule_lines" ADD CONSTRAINT "payment_schedule_lines_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_orders" ADD CONSTRAINT "sale_orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

