-- CreateEnum (idempotent)
DO $$ BEGIN CREATE TYPE "PhoneCallStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'MISSED', 'ABANDONED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN CREATE TYPE "PhoneCallDirection" AS ENUM ('INCOMING', 'OUTGOING', 'CALLBACK'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "ChannelType_new" AS ENUM ('TELEGRAM', 'EMAIL', 'SMS', 'ECHAT_VIBER', 'ECHAT_TG_PERSONAL', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'UNKNOWN');
ALTER TABLE "Inbox" ALTER COLUMN "channelType" TYPE "ChannelType_new" USING ("channelType"::text::"ChannelType_new");
ALTER TABLE "Conversation" ALTER COLUMN "channel" TYPE "ChannelType_new" USING ("channel"::text::"ChannelType_new");
ALTER TABLE "WebhookEvent" ALTER COLUMN "channel" TYPE "ChannelType_new" USING ("channel"::text::"ChannelType_new");
ALTER TYPE "ChannelType" RENAME TO "ChannelType_old";
ALTER TYPE "ChannelType_new" RENAME TO "ChannelType";
DROP TYPE "public"."ChannelType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CallGrading" DROP CONSTRAINT "CallGrading_callId_fkey";

-- DropForeignKey
ALTER TABLE "CallTranscription" DROP CONSTRAINT "CallTranscription_callId_fkey";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "assignedTo",
DROP COLUMN "externalId",
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "externalThreadId" TEXT,
ADD COLUMN     "inboxId" TEXT NOT NULL,
ADD COLUMN     "unreadByManager" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "GuestProfile" ADD COLUMN     "externalIds" JSONB;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "body",
DROP COLUMN "mediaUrl",
ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "externalMetadata" JSONB,
ADD COLUMN     "inboxId" TEXT NOT NULL,
ADD COLUMN     "sentById" TEXT;

-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN     "conversationId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "PhoneCall";

-- CreateTable
CREATE TABLE "phone_calls" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "direction" "PhoneCallDirection" NOT NULL DEFAULT 'INCOMING',
    "status" "PhoneCallStatus" NOT NULL DEFAULT 'ACTIVE',
    "callerPhone" TEXT,
    "calleePhone" TEXT,
    "managerId" TEXT,
    "managerEmail" TEXT,
    "employeeName" TEXT,
    "waitTime" INTEGER,
    "duration" INTEGER,
    "hasRecording" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "recordingId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "poolName" TEXT,
    "isProper" BOOLEAN,
    "isRepeated" BOOLEAN,
    "landingPage" TEXT,
    "referrer" TEXT,
    "clientUuid" TEXT,
    "callCardUrl" TEXT,
    "projectId" TEXT,
    "inquiryId" TEXT,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inbox" (
    "id" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "externalId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inboxId" TEXT,
    "channel" "ChannelType" NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phone_calls_externalId_key" ON "phone_calls"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "phone_calls_inquiryId_key" ON "phone_calls"("inquiryId");

-- CreateIndex
CREATE INDEX "phone_calls_callerPhone_idx" ON "phone_calls"("callerPhone");

-- CreateIndex
CREATE INDEX "phone_calls_externalId_idx" ON "phone_calls"("externalId");

-- CreateIndex
CREATE INDEX "phone_calls_managerId_idx" ON "phone_calls"("managerId");

-- CreateIndex
CREATE INDEX "phone_calls_calledAt_idx" ON "phone_calls"("calledAt");

-- CreateIndex
CREATE INDEX "Inbox_brandId_idx" ON "Inbox"("brandId");

-- CreateIndex
CREATE INDEX "Inbox_channelType_isActive_idx" ON "Inbox"("channelType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Inbox_channelType_externalId_key" ON "Inbox"("channelType", "externalId");

-- CreateIndex
CREATE INDEX "WebhookEvent_processed_receivedAt_idx" ON "WebhookEvent"("processed", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_inboxId_idx" ON "WebhookEvent"("inboxId");

-- CreateIndex
CREATE INDEX "Conversation_channel_status_idx" ON "Conversation"("channel", "status");

-- CreateIndex
CREATE INDEX "Conversation_guestId_idx" ON "Conversation"("guestId");

-- CreateIndex
CREATE INDEX "Conversation_assignedToId_idx" ON "Conversation"("assignedToId");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_inboxId_externalThreadId_key" ON "Conversation"("inboxId", "externalThreadId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Message_inboxId_externalId_key" ON "Message"("inboxId", "externalId");

-- AddForeignKey
ALTER TABLE "phone_calls" ADD CONSTRAINT "phone_calls_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallTranscription" ADD CONSTRAINT "CallTranscription_callId_fkey" FOREIGN KEY ("callId") REFERENCES "phone_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallGrading" ADD CONSTRAINT "CallGrading_callId_fkey" FOREIGN KEY ("callId") REFERENCES "phone_calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_inboxId_fkey" FOREIGN KEY ("inboxId") REFERENCES "Inbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

