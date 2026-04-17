-- Migration: Task 8b — Add Ringostat fields to User table
-- phone, sipExtension, ringostatId, department

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone"        TEXT,
  ADD COLUMN IF NOT EXISTS "sipExtension" TEXT,
  ADD COLUMN IF NOT EXISTS "ringostatId"  TEXT,
  ADD COLUMN IF NOT EXISTS "department"   TEXT;
