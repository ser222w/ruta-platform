/**
 * One-time import of Ringostat call history into PhoneCall table.
 *
 * Usage:
 *   DATABASE_URL="..." RINGOSTAT_AUTH_KEY="..." \
 *   npx tsx scripts/import-calls.ts --from 2026-04-10 --to 2026-04-17
 *
 * Idempotent: skips calls that already exist by externalId (uniqueid).
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const RINGOSTAT_BASE = 'https://api.ringostat.net';

const FIELDS = [
  'calldate',
  'caller',
  'dst',
  'uniqueid',
  'billsec',
  'duration',
  'waittime',
  'disposition',
  'call_type',
  'employee_fio',
  'department',
  'has_recording',
  'recording_wav',
  'recording',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'pool_name',
  'proper_flag',
  'repeated_flag',
  'landing',
  'refferrer',
  'client_id',
  'call_card'
].join(',');

interface RingostatCall {
  calldate: string;
  caller: string;
  dst: string;
  uniqueid: string;
  billsec: number | string;
  duration: number | string;
  waittime: number | string;
  disposition: string;
  call_type: string; // 'in' | 'out' | 'callback'
  employee_fio: string | null;
  department: string | null;
  has_recording: string | number;
  recording_wav: string;
  recording: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  pool_name: string;
  proper_flag: number | string;
  repeated_flag: number | string;
  landing: string;
  refferrer: string;
  client_id: string;
  call_card: string;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toBool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === '') return null;
  return Number(v) === 1;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const clean = phone.replace(/[^\d+]/g, '');
  if (!clean) return null;
  if (clean.startsWith('+380')) return clean;
  if (clean.startsWith('380')) return `+${clean}`;
  if (/^\d{10}$/.test(clean)) return `+38${clean}`;
  return clean;
}

function isSipCaller(caller: string): boolean {
  // SIP callers look like: "rutapolyanacom_hramovaI" <rutapolyanacom_hramovaI>
  return caller.includes('<') || caller.includes('rutapolyana') || caller.includes('bukovel');
}

function mapDisposition(
  disposition: string,
  billsec: number | null
): 'ACTIVE' | 'COMPLETED' | 'MISSED' | 'ABANDONED' {
  const d = disposition.toUpperCase();
  if (d === 'ANSWERED' || d === 'PROPER') return billsec && billsec > 0 ? 'COMPLETED' : 'ABANDONED';
  if (d === 'NO ANSWER' || d === 'CLIENT NO ANSWER' || d === 'VOICEMAIL') return 'MISSED';
  if (d === 'BUSY' || d === 'FAILED') return 'MISSED';
  if (d === 'IN PROGRESS') return 'ACTIVE';
  // REPEATED — treat as missed (caller didn't get through, called again)
  if (d === 'REPEATED') return 'MISSED';
  return billsec && billsec > 0 ? 'COMPLETED' : 'MISSED';
}

function mapDirection(
  callType: string
): 'INCOMING' | 'OUTGOING' | 'CALLBACK' {
  if (callType === 'out') return 'OUTGOING';
  if (callType === 'callback') return 'CALLBACK';
  return 'INCOMING';
}

async function fetchCalls(from: string, to: string): Promise<RingostatCall[]> {
  const authKey = process.env.RINGOSTAT_AUTH_KEY;
  if (!authKey) throw new Error('RINGOSTAT_AUTH_KEY is not set');

  const params = new URLSearchParams({
    export_type: 'json',
    from: `${from} 00:00:00`,
    to: `${to} 23:59:59`,
    fields: FIELDS
  });

  const url = `${RINGOSTAT_BASE}/calls/list?${params.toString()}`;
  console.log(`Fetching: ${url.slice(0, 100)}...`);

  const res = await fetch(url, { headers: { 'Auth-key': authKey } });
  if (!res.ok) throw new Error(`Ringostat API error: ${res.status}`);

  const text = await res.text();
  if (text.includes('incorrect field')) throw new Error(`Bad field names: ${text}`);

  return JSON.parse(text) as RingostatCall[];
}

async function importCalls(calls: RingostatCall[]): Promise<{
  imported: number;
  skipped: number;
  errors: number;
}> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const call of calls) {
    // Skip internal SIP-to-SIP calls (no external caller)
    if (isSipCaller(call.caller) && isSipCaller(call.dst)) {
      skipped++;
      continue;
    }

    if (!call.uniqueid) {
      skipped++;
      continue;
    }

    // Idempotency: skip if already exists
    const exists = await db.phoneCall.findUnique({
      where: { externalId: call.uniqueid },
      select: { id: true }
    });
    if (exists) {
      skipped++;
      continue;
    }

    try {
      const billsec = toInt(call.billsec);
      const direction = mapDirection(call.call_type);
      const status = mapDisposition(call.disposition, billsec);

      // For outgoing: caller is manager (SIP), dst is guest phone
      // For incoming: caller is guest phone, dst is hotel number
      const callerPhone =
        direction === 'OUTGOING'
          ? null // SIP caller — not a real phone
          : normalizePhone(call.caller);
      const calleePhone =
        direction === 'OUTGOING'
          ? normalizePhone(call.dst)
          : normalizePhone(call.dst);

      await db.phoneCall.create({
        data: {
          externalId: call.uniqueid,
          direction,
          status,
          callerPhone,
          calleePhone,
          employeeName: call.employee_fio?.trim() || null,
          waitTime: toInt(call.waittime),
          duration: billsec,
          hasRecording: Number(call.has_recording) === 1,
          recordingUrl: call.recording_wav || call.recording || null,
          utmSource: call.utm_source || null,
          utmMedium: call.utm_medium || null,
          utmCampaign: call.utm_campaign || null,
          utmContent: call.utm_content || null,
          utmTerm: call.utm_term || null,
          poolName: call.pool_name || null,
          isProper: toBool(call.proper_flag),
          isRepeated: toBool(call.repeated_flag),
          landingPage: call.landing || null,
          referrer: call.refferrer || null,
          clientUuid: call.client_id || null,
          callCardUrl: call.call_card || null,
          calledAt: new Date(call.calldate)
        }
      });

      imported++;
    } catch (e) {
      console.error(`Error importing ${call.uniqueid}:`, e instanceof Error ? e.message : e);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from');
  const toIdx = args.indexOf('--to');

  const from = fromIdx >= 0 ? args[fromIdx + 1] : '2026-04-10';
  const to = toIdx >= 0 ? args[toIdx + 1] : new Date().toISOString().slice(0, 10);

  console.log(`\nImporting Ringostat calls: ${from} → ${to}`);

  const calls = await fetchCalls(from, to);
  console.log(`Fetched ${calls.length} calls from Ringostat`);

  // Stats
  const byType: Record<string, number> = {};
  for (const c of calls) {
    byType[c.call_type] = (byType[c.call_type] ?? 0) + 1;
  }
  console.log('By type:', byType);

  const result = await importCalls(calls);

  console.log(`\n✅ Import complete:`);
  console.log(`   Imported: ${result.imported}`);
  console.log(`   Skipped (dup/SIP-internal): ${result.skipped}`);
  console.log(`   Errors: ${result.errors}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
