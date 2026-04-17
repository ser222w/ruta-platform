/**
 * Ringostat API client
 * Docs: https://help.ringostat.com/en/collections/106929-api-and-webhooks-documentation
 */

const RINGOSTAT_BASE = 'https://api.ringostat.net';

function getAuthKey(): string {
  const key = process.env.RINGOSTAT_AUTH_KEY;
  if (!key) throw new Error('RINGOSTAT_AUTH_KEY is not set');
  return key;
}

function getProjectId(): string {
  const id = process.env.RINGOSTAT_PROJECT_ID;
  if (!id) throw new Error('RINGOSTAT_PROJECT_ID is not set');
  return id;
}

// ─────────────────────────────────────────────
// A. Contact Sync → Smart Phone Screen Pop
// https://help.ringostat.com/en/articles/9221318
// ─────────────────────────────────────────────

export interface RingostatContact {
  /** Phone number (international format) */
  phone: string;
  name?: string;
  email?: string;
  /** Quick links shown in Smart Phone (max 3) */
  links?: Array<{ label: string; url: string }>;
  /** External CRM ID */
  externalId?: string;
}

export async function syncContactToSmartPhone(contact: RingostatContact): Promise<boolean> {
  const authKey = process.env.RINGOSTAT_AUTH_KEY;
  if (!authKey) return false; // silently skip in dev if not configured

  try {
    const body: Record<string, unknown> = {
      phone: contact.phone
    };
    if (contact.name) body.name = contact.name;
    if (contact.email) body.email = contact.email;
    if (contact.externalId) body.lead_id = contact.externalId;
    if (contact.links?.length) {
      body.links = contact.links.map((l) => ({ title: l.label, url: l.url }));
    }

    const res = await fetch(`${RINGOSTAT_BASE}/minicrm/contacts/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth-key': authKey,
        'x-project-id': getProjectId()
      },
      body: JSON.stringify(body)
    });

    return res.ok;
  } catch {
    // Non-critical — don't fail the webhook if sync fails
    return false;
  }
}

// ─────────────────────────────────────────────
// B. Click-to-Call (initiate outbound call)
// https://help.ringostat.com/en/articles/6312685
// ─────────────────────────────────────────────

export interface InitiateCallParams {
  /** Manager's SIP extension or phone number */
  extension: string;
  /** Guest phone number to call */
  destination: string;
}

export async function initiateCall(
  params: InitiateCallParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    const authKey = getAuthKey();

    const body = new URLSearchParams({
      extension: params.extension,
      destination: params.destination
    });

    const res = await fetch(`${RINGOSTAT_BASE}/callback/outward_call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Auth-key': authKey
      },
      body: body.toString()
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: text || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─────────────────────────────────────────────
// C. SIP Status — check manager availability
// https://help.ringostat.com/en/articles/6313081
// ─────────────────────────────────────────────

export interface SipStatusResult {
  online: string[]; // SIP accounts that are online
  speaking: string[]; // SIP accounts currently on a call
}

export async function getSipStatus(): Promise<SipStatusResult> {
  const authKey = process.env.RINGOSTAT_AUTH_KEY;
  if (!authKey) return { online: [], speaking: [] };

  try {
    const [onlineRes, speakingRes] = await Promise.all([
      fetch(`${RINGOSTAT_BASE}/sipstatus/online`, {
        headers: { 'Auth-key': authKey }
      }),
      fetch(`${RINGOSTAT_BASE}/sipstatus/speaking`, {
        headers: { 'Auth-key': authKey }
      })
    ]);

    const online = onlineRes.ok ? ((await onlineRes.json()) as string[]) : [];
    const speaking = speakingRes.ok ? ((await speakingRes.json()) as string[]) : [];

    return { online, speaking };
  } catch {
    return { online: [], speaking: [] };
  }
}

// ─────────────────────────────────────────────
// E. Employee Export
// https://help.ringostat.com/en/articles/9188142
// ─────────────────────────────────────────────

export interface RingostatEmployee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  sipAccount?: string;
  department?: string;
}

export async function getProjectEmployees(): Promise<RingostatEmployee[]> {
  const authKey = getAuthKey();
  const projectId = getProjectId();

  const res = await fetch(`${RINGOSTAT_BASE}/api/json-rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Auth-key': authKey
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'getProjectStaffListAndDirections',
      params: { projectId },
      id: 1
    })
  });

  if (!res.ok) throw new Error(`Ringostat API error: ${res.status}`);

  // result is an object keyed by staffId, not an array
  const data = (await res.json()) as {
    result?: Record<
      string,
      {
        id: number; // internal Ringostat employee ID
        staffId: number;
        fio?: string;
        email?: string;
        phone?: string;
        extensionNumber?: string; // SIP extension (e.g. "101")
        departments?: number[];
        directions?: {
          main?: Array<{ direction: string; type: string }>;
        };
      }
    >;
  };

  if (!data.result || typeof data.result !== 'object') return [];

  return Object.values(data.result).map((e) => ({
    id: String(e.staffId),
    name: e.fio?.trim() ?? '',
    email: e.email,
    phone: e.phone,
    sipAccount: e.extensionNumber, // SIP extension number
    department: e.departments?.[0]?.toString() // first department ID as string
  }));
}
