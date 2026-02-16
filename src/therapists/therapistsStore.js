// src/therapists/therapistsStore.js
import { get, set } from "idb-keyval";
import { supabase } from "../lib/supabase";

const THERAPISTS_KEY = "mc_therapists_v1";
const LEGACY_LOCALSTORAGE_KEY = "mc_therapists";
const SUPABASE_TABLE = "profiles";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value ?? "").trim();
}

function digitsOnly(value) {
  return normalize(value).replace(/\D/g, "");
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const rr = Math.round((r + m) * 255);
  const gg = Math.round((g + m) * 255);
  const bb = Math.round((b + m) * 255);

  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
}

function hash32(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeStableColorFromSeed(seed) {
  const base = hash32(seed);
  const hue = base % 360;
  return hslToHex(hue, 70, 50);
}

function isValidTherapistId(id) {
  return /^\d{9}$/.test(String(id || ""));
}

function uniqueById(list) {
  const map = new Map();
  for (const item of safeArray(list)) {
    if (!item || !item.id) continue;
    const id = String(item.id);
    if (!map.has(id)) map.set(id, item);
  }
  return Array.from(map.values());
}

function sortByName(list) {
  return safeArray(list)
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function tryReadLegacyFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeFromLegacyItem(raw) {
  const id =
    digitsOnly(raw?.idNumber) ||
    digitsOnly(raw?.id_number) ||
    digitsOnly(raw?.id) ||
    digitsOnly(raw?.therapistId);

  if (!isValidTherapistId(id)) return null;

  const name =
    normalize(raw?.fullName) ||
    normalize(raw?.full_name) ||
    normalize(raw?.name) ||
    normalize(raw?.displayName) ||
    id;

  const active = raw?.active !== false;

  const colorRaw = normalize(raw?.color);
  const color =
    colorRaw && /^#([0-9a-fA-F]{6})$/.test(colorRaw)
      ? colorRaw.toLowerCase()
      : makeStableColorFromSeed(id);

  return { id, name, role: "therapist", active, color };
}

function normalizeFromIdbItem(raw) {
  const id = digitsOnly(raw?.id) || digitsOnly(raw?.idNumber) || digitsOnly(raw?.therapistId);
  if (!isValidTherapistId(id)) return null;

  const name =
    normalize(raw?.name) ||
    normalize(raw?.fullName) ||
    normalize(raw?.displayName) ||
    normalize(raw?.full_name) ||
    id;

  const role = normalize(raw?.role) || "therapist";
  const active = raw?.active !== false;

  const colorRaw = normalize(raw?.color);
  const color =
    colorRaw && /^#([0-9a-fA-F]{6})$/.test(colorRaw)
      ? colorRaw.toLowerCase()
      : makeStableColorFromSeed(id);

  return { id, name, role, active, color };
}

function normalizeFromSupabaseRow(row) {
  const id = digitsOnly(row?.national_id);
  if (!isValidTherapistId(id)) return null;

  const name = normalize(row?.full_name) || id;
  const role = normalize(row?.role) || "therapist";
  const active = row?.active !== false;

  return { id, name, role, active, color: makeStableColorFromSeed(id) };
}

async function readAllRaw() {
  try {
    const raw = await get(THERAPISTS_KEY);
    return safeArray(raw);
  } catch {
    return [];
  }
}

async function writeAll(list) {
  try {
    await set(THERAPISTS_KEY, safeArray(list));
  } catch {
    // never throw
  }
}

async function migrateOrRepairIfNeeded() {
  const idbRaw = await readAllRaw();
  const idbNormalized = uniqueById(idbRaw.map(normalizeFromIdbItem).filter(Boolean));

  const legacyRaw = typeof window !== "undefined" ? tryReadLegacyFromLocalStorage() : [];
  const legacyNormalized = uniqueById(legacyRaw.map(normalizeFromLegacyItem).filter(Boolean));

  if (idbNormalized.length === 0 && legacyNormalized.length > 0) {
    await writeAll(legacyNormalized);
    return legacyNormalized;
  }

  if (idbRaw.length !== idbNormalized.length) {
    await writeAll(idbNormalized);
  }

  return idbNormalized;
}

async function loadTherapistsFromSupabaseSafe() {
  // Debug marker: if you never see this in Vercel console, UI is not calling getAllTherapists()
  console.log("[therapistsStore] loading from Supabase...");

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("role, full_name, national_id, active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[profiles select] failed:", error);
      return [];
    }

    return safeArray(data).map(normalizeFromSupabaseRow).filter(Boolean);
  } catch (e) {
    console.warn("[profiles select] exception:", e);
    return [];
  }
}

async function upsertTherapistToSupabaseSafe(input) {
  const id = digitsOnly(input?.idNumber ?? input?.id ?? input?.therapistId ?? input?.national_id);
  if (!isValidTherapistId(id)) throw new Error("Therapist ID must be 9 digits.");

  const name =
    normalize(input?.name ?? input?.fullName ?? input?.displayName ?? input?.full_name) || id;

  const role = normalize(input?.role) || "therapist";
  const active = input?.active !== false;

  const payload = { national_id: id, full_name: name, role, active };

  const { error } = await supabase.from(SUPABASE_TABLE).upsert(payload, { onConflict: "national_id" });
  if (error) throw error;

  return { id, name, role, active, color: makeStableColorFromSeed(id) };
}

async function deleteTherapistFromSupabaseSafe(id) {
  const target = digitsOnly(id);
  if (!target) return true;

  const { error } = await supabase.from(SUPABASE_TABLE).delete().eq("national_id", target);
  if (error) throw error;

  return true;
}

// --- Public API (compatible with existing UI) ---

export async function getAllTherapists() {
  const localList = await migrateOrRepairIfNeeded();

  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!online) return sortByName(localList);

  const cloudList = await loadTherapistsFromSupabaseSafe();

  const merged = uniqueById([...cloudList, ...localList]);
  await writeAll(merged);

  return sortByName(merged);
}

export async function upsertTherapist(input) {
  // Update local immediately
  const existing = await getAllTherapists();

  const id = digitsOnly(input?.idNumber ?? input?.id ?? input?.therapistId ?? input?.national_id);
  if (!isValidTherapistId(id)) throw new Error("Therapist ID must be 9 digits.");

  const name =
    normalize(input?.name ?? input?.fullName ?? input?.displayName ?? input?.full_name) || id;
  const role = normalize(input?.role) || "therapist";
  const active = input?.active !== false;

  const existingIdx = existing.findIndex((t) => String(t.id) === String(id));
  const existingColor = existingIdx >= 0 ? String(existing[existingIdx]?.color || "").toLowerCase() : "";
  const color = existingColor || makeStableColorFromSeed(id);

  const next = { id, name, role, active, color };

  const updated =
    existingIdx >= 0 ? existing.map((t, i) => (i === existingIdx ? next : t)) : [next, ...existing];

  await writeAll(updated);

  // Best-effort cloud sync (never breaks UI)
  try {
    await upsertTherapistToSupabaseSafe(next);
  } catch (e) {
    console.warn("[profiles upsert] failed:", e);
  }

  return next;
}

export async function deleteTherapist(id) {
  const target = digitsOnly(id);
  if (!target) return true;

  const existing = await getAllTherapists();
  const next = existing.filter((t) => digitsOnly(t.id) !== target);
  await writeAll(next);

  // Best-effort cloud delete
  try {
    await deleteTherapistFromSupabaseSafe(target);
  } catch (e) {
    console.warn("[profiles delete] failed:", e);
  }

  return true;
}
