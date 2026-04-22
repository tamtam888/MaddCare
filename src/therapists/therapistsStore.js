import { get, set } from "idb-keyval";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const IDB_KEY = "mc_therapists_store_v2";
const LEGACY_LS_KEY = "mc_therapists";
const LEGACY_IDB_KEY = "mc_therapists_v1";
const TABLE = "profiles";

let lastTherapistsSyncError = null;
export function getLastTherapistsSyncError() { return lastTherapistsSyncError; }
function setLastError(msg) { lastTherapistsSyncError = String(msg || ""); }
function clearLastError() { lastTherapistsSyncError = null; }

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeString(v) {
  return String(v ?? "").trim();
}

function normalizeDigits(v) {
  return normalizeString(v).replace(/\D/g, "");
}

function isValidIdNumber(v) {
  return /^\d{9}$/.test(normalizeDigits(v));
}

function normalizeWorkDays(value) {
  const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const DAY_ALIASES = {
    sun: "Sun",
    sunday: "Sun",
    mon: "Mon",
    monday: "Mon",
    tue: "Tue",
    tues: "Tue",
    tuesday: "Tue",
    wed: "Wed",
    weds: "Wed",
    wednesday: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    thursday: "Thu",
    fri: "Fri",
    friday: "Fri",
    sat: "Sat",
    saturday: "Sat",
  };

  const normalizeOne = (tok) => {
    const t = normalizeString(tok).toLowerCase();
    if (!t) return "";
    return DAY_ALIASES[t] || "";
  };

  if (Array.isArray(value)) {
    const normalized = value.map(normalizeOne).filter((d) => d && d !== "Sat" && DAY_ORDER.includes(d));
    const unique = Array.from(new Set(normalized));
    unique.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
    return unique;
  }

  const s = normalizeString(value);
  if (!s) return [];
  const tokens = s.split(/[\s,.;/|]+/g).map((x) => normalizeString(x)).filter(Boolean);
  const normalized = tokens.map(normalizeOne).filter((d) => d && d !== "Sat" && DAY_ORDER.includes(d));
  const unique = Array.from(new Set(normalized));
  unique.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  return unique;
}

function normalizeTherapistRecord(raw) {
  const idNumber = normalizeDigits(raw?.idNumber || raw?.national_id || raw?.id || raw?.therapistId);
  const id = isValidIdNumber(idNumber) ? idNumber : normalizeString(raw?.id) || "";

  const fullName =
    normalizeString(raw?.fullName) ||
    normalizeString(raw?.full_name) ||
    normalizeString(raw?.name) ||
    normalizeString(raw?.displayName) ||
    "";

  return {
    id: idNumber || id || "",
    idNumber: idNumber || "",
    fullName,
    username: normalizeString(raw?.username || ""),
    password: normalizeString(raw?.password || ""),
    phone: normalizeString(raw?.phone || ""),
    address: normalizeString(raw?.address || ""),
    email: normalizeString(raw?.email || ""),
    workDays:
      raw?.workDays !== undefined || raw?.work_days !== undefined
        ? normalizeWorkDays(raw?.workDays ?? raw?.work_days)
        : undefined,
    active: raw?.active !== false,
    gender: normalizeString(raw?.gender || "not_specified").toLowerCase() || "not_specified",
    accentKey: normalizeString(raw?.accentKey || raw?.accent_key || ""),
    remoteId: normalizeString(raw?.remoteId || raw?.remote_id || "") || null,
    role: normalizeString(raw?.role || "therapist") || "therapist",
  };
}

function uniqueByIdNumber(list) {
  const map = new Map();
  for (const item of safeArray(list)) {
    const t = normalizeTherapistRecord(item);
    const key = normalizeDigits(t.idNumber) || normalizeDigits(t.id);
    if (!isValidIdNumber(key)) continue;
    map.set(key, t);
  }
  return Array.from(map.values());
}

function sortByName(list) {
  return safeArray(list)
    .slice()
    .sort((a, b) => normalizeString(a.fullName).localeCompare(normalizeString(b.fullName)));
}

async function readIdb(key) {
  try {
    const v = await get(key);
    return safeArray(v);
  } catch {
    return [];
  }
}

async function writeIdb(key, value) {
  try {
    await set(key, safeArray(value));
  } catch {
    // ignore
  }
}

function tryReadLegacyLocalStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return safeArray(parsed);
  } catch {
    return [];
  }
}

async function migrateLegacyIfNeeded() {
  const current = uniqueByIdNumber(await readIdb(IDB_KEY));
  if (current.length) return current;

  const legacyIdb = uniqueByIdNumber(await readIdb(LEGACY_IDB_KEY));
  const legacyLs = typeof window !== "undefined" ? uniqueByIdNumber(tryReadLegacyLocalStorage()) : [];

  const merged = uniqueByIdNumber([...legacyIdb, ...legacyLs]);
  if (merged.length) await writeIdb(IDB_KEY, merged);

  return merged;
}

function toSupabaseRow(t) {
  const rec = normalizeTherapistRecord(t);
  const idNumber = normalizeDigits(rec.idNumber);
  if (!isValidIdNumber(idNumber)) return null;

  const row = {
    national_id: idNumber,
    full_name: normalizeString(rec.fullName) || idNumber,
    username: normalizeString(rec.username) || null,
    role: normalizeString(rec.role) || "therapist",
    active: rec.active !== false,
    gender: normalizeString(rec.gender) || "not_specified",
    work_days: safeArray(rec.workDays),
    phone: normalizeString(rec.phone),
    email: normalizeString(rec.email),
    address: normalizeString(rec.address),
  };

  // Only include password in the upsert when it is explicitly provided.
  // Omitting the field means Supabase leaves the existing stored password unchanged.
  const pw = normalizeString(rec.password);
  if (pw) row.password = pw;

  return row;
}

function fromSupabaseRow(row) {
  return normalizeTherapistRecord({
    national_id: row?.national_id,
    full_name: row?.full_name,
    username: row?.username,
    // password intentionally omitted — not fetched in general list queries
    role: row?.role,
    active: row?.active,
    gender: row?.gender,
    work_days: row?.work_days ?? [],
    phone: row?.phone,
    email: row?.email,
    address: row?.address,
  });
}

async function loadFromSupabase() {
  if (!isSupabaseConfigured) {
    setLastError("Cloud sync disabled (missing configuration).");
    throw new Error("Cloud sync disabled (missing configuration).");
  }

  // password is intentionally excluded — use verifyTherapistCredentials() for login checks
  const { data, error } = await supabase
    .from(TABLE)
    .select("national_id, full_name, username, role, active, gender, work_days, phone, email, address, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    setLastError(error.message || "Failed to load from cloud.");
    throw error;
  }

  clearLastError();
  return safeArray(data).map(fromSupabaseRow).filter((t) => isValidIdNumber(t.idNumber));
}

async function upsertToSupabase(t) {
  if (!isSupabaseConfigured) {
    setLastError("Cloud sync disabled (missing configuration).");
    throw new Error("Cloud sync disabled (missing configuration).");
  }

  const payload = toSupabaseRow(t);
  if (!payload) throw new Error("Therapist ID number must be 9 digits.");

  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "national_id" });
  if (error) {
    setLastError(error.message || "Failed to save to cloud.");
    throw error;
  }

  clearLastError();
  return normalizeTherapistRecord(payload);
}

async function deleteFromSupabase(idNumber) {
  if (!isSupabaseConfigured) {
    setLastError("Cloud sync disabled (missing configuration).");
    return true;
  }

  const id = normalizeDigits(idNumber);
  if (!isValidIdNumber(id)) return true;

  const { error } = await supabase.from(TABLE).delete().eq("national_id", id);
  if (error) {
    setLastError(error.message || "Failed to delete from cloud.");
    throw error;
  }

  clearLastError();
  return true;
}

export async function getAllTherapists() {
  const local = await migrateLegacyIfNeeded();

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!online) return sortByName(local);

  let cloud = [];
  try {
    cloud = await loadFromSupabase();
  } catch {
    return sortByName(local);
  }

  const merged = uniqueByIdNumber([...cloud, ...local]);
  await writeIdb(IDB_KEY, merged);

  return sortByName(merged);
}

export async function upsertTherapist(input) {
  const next = normalizeTherapistRecord(input);
  const id = normalizeDigits(next.idNumber);
  if (!isValidIdNumber(id)) throw new Error("Therapist ID number must be 9 digits.");
  next.id = id;
  next.idNumber = id;

  const current = uniqueByIdNumber(await readIdb(IDB_KEY));
  const idx = current.findIndex((t) => normalizeDigits(t.idNumber) === id);
  const existing = idx >= 0 ? current[idx] : null;

  const updatedRecord = {
    ...existing,
    ...next,
    workDays: next.workDays ?? existing?.workDays ?? [],
    // Preserve the stored password when the incoming record has none (e.g. after
    // a general list fetch that intentionally omits the password column).
    password: next.password || existing?.password || "",
  };

  const updated =
    idx >= 0
      ? current.map((t, i) => (i === idx ? updatedRecord : t))
      : [updatedRecord, ...current];
  await writeIdb(IDB_KEY, updated);

  try {
    await upsertToSupabase(updatedRecord);
  } catch {
    // keep local
  }

  return updatedRecord;
}

export async function deleteTherapist(idNumber) {
  const id = normalizeDigits(idNumber);
  if (!isValidIdNumber(id)) return true;

  const current = uniqueByIdNumber(await readIdb(IDB_KEY));
  const updated = current.filter((t) => normalizeDigits(t.idNumber) !== id);
  await writeIdb(IDB_KEY, updated);

  try {
    await deleteFromSupabase(id);
  } catch {
    // keep local delete
  }

  return true;
}

/**
 * Verifies login credentials against the profiles table using a targeted
 * single-row query — never loads all therapists' passwords into the client.
 *
 * Returns the normalised therapist record on success, or null on failure.
 * Falls back to local IDB (cached data) when Supabase is unreachable.
 */
export async function verifyTherapistCredentials(username, password) {
  const uName = normalizeString(username).toLowerCase();
  const pwd   = normalizeString(password);

  if (!uName || !pwd) return null;

  // ── Supabase path (preferred) ──────────────────────────────────────────────
  if (isSupabaseConfigured) {
    try {
      // Primary: match by username (case-insensitive via ilike)
      const { data: byUsername, error: e1 } = await supabase
        .from(TABLE)
        .select("national_id, full_name, username, password, role, active, gender, work_days, phone, email, address")
        .ilike("username", uName)
        .maybeSingle();

      if (!e1 && byUsername && normalizeString(byUsername.password) === pwd) {
        return fromSupabaseRow(byUsername);
      }

      // Credentials not found in Supabase — no legacy fallback for pilot
      return null;
    } catch {
      // Network error — fall through to local IDB cache
    }
  }

  // ── Local IDB fallback (offline mode) ─────────────────────────────────────
  // IDB offline fallback — username + password only, no legacy idNumber path
  const local = await migrateLegacyIfNeeded();
  const match = local.find((t) => {
    const tUsername = normalizeString(t?.username).toLowerCase();
    if (!tUsername) return false;
    return tUsername === uName && normalizeString(t?.password) === pwd;
  });

  return match || null;
}
