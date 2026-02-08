import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function digitsOnly(v) {
  return String(v ?? "").trim().replace(/\D/g, "");
}

function normalize(v) {
  return String(v ?? "").trim();
}

function buildEmail(id) {
  return `${id}@maddcare.local`;
}

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return (data?.users ?? []).find((u) => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
}

async function ensureUser(email, password) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  return data.user;
}

async function upsertProfile(userId, profile) {
  const { error } = await supabase.from("profiles").upsert(
    [
      {
        id: userId,
        role: profile.role,
        full_name: profile.full_name,
        national_id: profile.national_id,
        active: profile.active,
        phone: profile.phone,
        email: profile.email,
      },
    ],
    { onConflict: "id" }
  );

  if (error) throw error;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error("Usage: node scripts/import-therapists.mjs <therapists-json-path>");

  const raw = fs.readFileSync(path.resolve(filePath), "utf8");
  const therapists = JSON.parse(raw);

  if (!Array.isArray(therapists)) throw new Error("Therapists file must be an array");

  for (const t of therapists) {
    const full_name = normalize(t.fullName);
    const national_id = digitsOnly(t.idNumber);
    const active = t.active !== false;

    if (!full_name || !national_id) continue;

    const email = buildEmail(national_id);
    const password = national_id;

    const user = await ensureUser(email, password);
    await upsertProfile(user.id, {
      role: "therapist",
      full_name,
      national_id,
      active,
      phone: normalize(t.phone),
      email: normalize(t.email),
    });
  }

  const adminEmail = "admin@maddcare.local";
  const adminPassword = "15951595";
  const adminUser = await ensureUser(adminEmail, adminPassword);
  await upsertProfile(adminUser.id, {
    role: "admin",
    full_name: "Admin",
    national_id: "15951595",
    active: true,
    phone: "",
    email: adminEmail,
  });

  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});