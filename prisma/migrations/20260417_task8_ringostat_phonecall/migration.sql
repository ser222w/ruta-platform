-- Task 8: Ringostat PhoneCall model — full schema rewrite
-- Replaces old phone_calls table with enriched Ringostat-compatible schema

-- 1. Drop old table if exists (no data yet in prod for this table)
DROP TABLE IF EXISTS "phone_calls" CASCADE;
DROP TABLE IF EXISTS "call_transcriptions" CASCADE;
DROP TABLE IF EXISTS "call_gradings" CASCADE;

-- 2. Create enums
DO $$ BEGIN
  CREATE TYPE "PhoneCallStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'MISSED', 'ABANDONED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PhoneCallDirection" AS ENUM ('INCOMING', 'OUTGOING', 'CALLBACK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Create phone_calls table
CREATE TABLE "phone_calls" (
  "id"            TEXT NOT NULL,
  "externalId"    TEXT,
  "direction"     "PhoneCallDirection" NOT NULL DEFAULT 'INCOMING',
  "status"        "PhoneCallStatus" NOT NULL DEFAULT 'ACTIVE',
  "callerPhone"   TEXT,
  "calleePhone"   TEXT,
  "managerId"     TEXT,
  "managerEmail"  TEXT,
  "employeeName"  TEXT,
  "waitTime"      INTEGER,
  "duration"      INTEGER,
  "hasRecording"  BOOLEAN NOT NULL DEFAULT false,
  "recordingUrl"  TEXT,
  "recordingId"   TEXT,
  "utmSource"     TEXT,
  "utmMedium"     TEXT,
  "utmCampaign"   TEXT,
  "utmContent"    TEXT,
  "utmTerm"       TEXT,
  "poolName"      TEXT,
  "isProper"      BOOLEAN,
  "isRepeated"    BOOLEAN,
  "landingPage"   TEXT,
  "referrer"      TEXT,
  "clientUuid"    TEXT,
  "callCardUrl"   TEXT,
  "projectId"     TEXT,
  "inquiryId"     TEXT,
  "calledAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "phone_calls_pkey" PRIMARY KEY ("id")
);

-- 4. Unique + indexes
CREATE UNIQUE INDEX "phone_calls_externalId_key" ON "phone_calls"("externalId");
CREATE UNIQUE INDEX "phone_calls_inquiryId_key" ON "phone_calls"("inquiryId");
CREATE INDEX "phone_calls_callerPhone_idx" ON "phone_calls"("callerPhone");
CREATE INDEX "phone_calls_externalId_idx" ON "phone_calls"("externalId");
CREATE INDEX "phone_calls_managerId_idx" ON "phone_calls"("managerId");
CREATE INDEX "phone_calls_calledAt_idx" ON "phone_calls"("calledAt");

-- 5. FK to inquiries
ALTER TABLE "phone_calls" ADD CONSTRAINT "phone_calls_inquiryId_fkey"
  FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Recreate call_transcriptions
CREATE TABLE "call_transcriptions" (
  "id"        TEXT NOT NULL,
  "callId"    TEXT NOT NULL,
  "provider"  TEXT,
  "text"      TEXT,
  "segments"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "call_transcriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "call_transcriptions_callId_key" ON "call_transcriptions"("callId");

ALTER TABLE "call_transcriptions" ADD CONSTRAINT "call_transcriptions_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "phone_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Recreate call_gradings
CREATE TABLE "call_gradings" (
  "id"               TEXT NOT NULL,
  "callId"           TEXT NOT NULL,
  "transcriptionId"  TEXT,
  "cqrScore"         INTEGER,
  "greeting"         INTEGER,
  "needsIdentified"  INTEGER,
  "presentedOffer"   INTEGER,
  "handledObjection" INTEGER,
  "closingAttempt"   INTEGER,
  "summary"          TEXT,
  "strengths"        TEXT[],
  "weaknesses"       TEXT[],
  "gradedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "gradedBy"         TEXT NOT NULL DEFAULT 'deepseek',

  CONSTRAINT "call_gradings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "call_gradings_callId_key" ON "call_gradings"("callId");
CREATE UNIQUE INDEX "call_gradings_transcriptionId_key" ON "call_gradings"("transcriptionId");

ALTER TABLE "call_gradings" ADD CONSTRAINT "call_gradings_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "phone_calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "call_gradings" ADD CONSTRAINT "call_gradings_transcriptionId_fkey"
  FOREIGN KEY ("transcriptionId") REFERENCES "call_transcriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
