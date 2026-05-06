# MedicalCare — Phase 1 Security Audit
**Branch:** `security/pilot-real-patients-auth`  
**Date:** 2026-05-06  
**Scope:** Supabase usage, authentication flow, patient ownership, migration requirements, and risk inventory.  
**Constraint:** Read-only. No code changes, no SQL, no UI changes made during this phase.

---

## 1. Supabase Tables and Fields in Use

### 1.1 `profiles` (therapist accounts)

| Column | Type | Notes |
|---|---|---|
| `national_id` | text (PK / unique) | 9-digit Israeli ID. Used as the primary key and as the therapist identity token stored in localStorage (`mc_therapistId`). |
| `username` | text | Login username. Matched case-insensitively via `ilike` at login. |
| `password` | text | **Plaintext password stored in the database.** Fetched to the browser during login and compared in JavaScript. |
| `full_name` | text | Display name shown in the sidebar. |
| `role` | text | `'admin'` or `'therapist'`. Controls sidebar navigation and patient filter logic. |
| `active` | boolean | Inactive accounts are blocked at login. |
| `gender` | text | `'male'`, `'female'`, or `'not_specified'`. |
| `work_days` | text[] | Array of abbreviated day names (Sun, Mon, …). |
| `phone` | text | |
| `email` | text | |
| `address` | text | |
| `created_at` | timestamptz | Set automatically by Supabase on insert. |
| `trial_start_date` | timestamptz | Nullable. Seeded on first login by `useTrialStatus`. |
| `trial_end_date` | timestamptz | Nullable. Set to `trial_start_date + 30 days`. |

**RLS status:** Disabled (no policies enforce row-level access).  
**Who can read it:** Any client holding the anon key — including unauthenticated users — can `SELECT *` from `profiles`, including the `password` column.

---

### 1.2 `mc_patients` (clinical patient records)

| Column | Type | Notes |
|---|---|---|
| `id_number` | text (PK / unique) | Patient's national ID number. |
| `data` | jsonb | Full clinical record: name, DOB, address, phone, diagnosis history, treatment reports, care plans, transcriptions. |
| `therapist_id` | text | The `national_id` of the therapist who owns this patient. Set by the client at upsert time. **Not enforced server-side.** |
| `allowed_therapists` | text[] | List of additional `national_id` values permitted to view this patient. **Not enforced server-side.** |
| `updated_at` | timestamptz | Set by the client at upsert time. |

**RLS status:** Disabled.  
**Who can read it:** Any client holding the anon key can `SELECT *` from `mc_patients`, returning every patient's full clinical JSONB blob regardless of which therapist they belong to.

---

### 1.3 Tables accessed via other means

`profiles` is also written by `bootstrapAdminIfNeeded()` on every LoginPage mount, upserting the hardcoded admin account (`national_id: '000000000'`, `username: 'admin'`, `password: '15951595'`) unconditionally on page load.

---

## 2. Current Login Flow (step by step)

**Step 1 — Page mount.**
`LoginPage` renders and immediately calls `bootstrapAdminIfNeeded()`. This fires a Supabase `upsert` to `profiles` with the hardcoded admin credentials, always overwriting the stored password. This runs on every page load, even for non-admin users.

**Step 2 — User submits the form.**
`handleSubmit` is called with the raw username and password strings from the input fields.

**Step 3 — Hardcoded admin bypass.**
The code checks: `username.toLowerCase() === "admin" && password === "15951595"`. If true, it sets four localStorage keys directly (`mc_logged_in=1`, `mc_role=admin`, `mc_therapistId=admin`, `mc_therapistName=Admin`) and calls `window.location.replace("/dashboard")`. No Supabase call is made for the admin path.

**Step 4 — Therapist login via Supabase.**
`verifyTherapistCredentials(username, password)` is called. Inside that function:
- A Supabase query runs: `SELECT national_id, full_name, username, password, role, active, gender, work_days, phone, email, address FROM profiles WHERE username ILIKE :username` (single row).
- The `password` column value is returned to the browser.
- JavaScript compares `row.password === inputPassword` on the client side.
- If the passwords match and `active !== false`, the therapist record is returned.
- If Supabase returns an infrastructure error (not a "not found" case), the function falls back to IndexedDB and performs the same username + password comparison against locally cached data.

**Step 5 — Session established (localStorage only).**
On a successful match, four localStorage keys are written:
- `mc_logged_in = "1"`
- `mc_role = "therapist"`
- `mc_therapistId = <9-digit national_id>`
- `mc_therapistName = <full_name>`

`window.location.replace("/dashboard")` navigates the user into the app.

**Step 6 — Session read on every route.**
`App.jsx` calls `isLoggedIn()` which reads `localStorage.getItem("mc_logged_in") === "1"`. `useAuthContext` reads `mc_role` and `mc_therapistId`. These three reads are synchronous and happen on every render. There is no JWT, no Supabase session, no server-side token, and no expiry.

**Step 7 — Sign-out.**
`Sidebar.jsx` calls `localStorage.removeItem("mc_logged_in")` and navigates to `/login`. The remaining keys (`mc_role`, `mc_therapistId`, `mc_therapistName`) are not removed on sign-out — they persist until the next successful login overwrites them.

---

## 3. Current Patient Ownership Logic

Patient isolation is enforced **client-side only**. There is no server-side enforcement at any layer.

**How filtering works:**
When `usePatients` initialises, it reads `mc_therapistId` and `mc_role` from localStorage. It then calls `loadPatientsFromSupabase(therapistId, isAdmin)`:

- If `isAdmin === true`: no filter is applied; all rows in `mc_patients` are fetched.
- If `therapistId` is present and is not the string `"local-therapist"`: the query applies an OR filter — `therapist_id = :therapistId OR allowed_therapists @> {therapistId}`.
- If `therapistId` is absent or equals `"local-therapist"`: no filter is applied; all rows are returned (offline fallback behaviour that leaks all patients in the online path too).

**How ownership is written:**
When a patient is upserted, the client writes `therapist_id: patient.therapistId` and `allowed_therapists: patient.allowedTherapists` into the payload. These values originate from the app's in-memory patient state, which was itself seeded from localStorage or from the cloud fetch. There is no server-side validation that the authenticated user is permitted to claim ownership of a given patient record.

**Critical gap:**
Because RLS is disabled, any holder of the anon key can query `mc_patients` directly — bypassing the client-side filter entirely — and receive every patient record from every therapist. The filter only exists in application code; it provides no security guarantee.

---

## 4. Required Schema Changes for Real Supabase Auth

The following changes are needed before strict RLS can be applied. None of these changes are being made in this phase — this is a planning list only.

**4.1 Add `user_id` to `profiles`**
A `uuid` column referencing `auth.users(id)`. This is the link between a Supabase Auth session (`auth.uid()`) and a therapist profile. Without it, RLS policies cannot identify which `profiles` row belongs to the currently logged-in user.

**4.2 Add `owner_user_id` to `mc_patients`**
A `uuid` column referencing `auth.users(id)`. This replaces `therapist_id` (a plain text string) as the authoritative ownership field for RLS policies. `therapist_id` cannot be used in RLS because it is a text value that any client can forge; `owner_user_id` is set from `auth.uid()` server-side.

**4.3 Create Supabase Auth users for all existing therapists**
Each row in `profiles` needs a corresponding entry in `auth.users`. The planned synthetic email format is `username@mc.internal`. This must be done with the service_role key from a secure server script — never from the browser.

**4.4 Populate `profiles.user_id` for all existing rows**
After creating auth users, the returned UUIDs must be written back to `profiles.user_id` so that RLS policies can join on them.

**4.5 Populate `mc_patients.owner_user_id` for all existing rows**
Map each row's `therapist_id` (national_id string) → `profiles.user_id` (UUID) and write the result into `owner_user_id`. Rows with no matching profile get `NULL` (handled by a fallback policy during the transition window).

**4.6 Drop or blank the `password` column from `profiles`**
Once all therapists are on Supabase Auth, the `password` column must be emptied and then dropped. Keeping it risks re-exposure even after RLS is applied, because a misconfigured policy could reveal it.

**4.7 Enable RLS on both tables**
`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY` and the same for `mc_patients`. This is a no-op until policies are written, but it must happen before any policy takes effect.

**4.8 Write strict RLS policies**
For `profiles`: a user can read and update only their own row (`user_id = auth.uid()`). Admins can read all rows (via a `SECURITY DEFINER` helper function that checks `profiles.role = 'admin'` for the caller's `user_id`).

For `mc_patients`: a user can read and write only rows where `owner_user_id = auth.uid()` OR `auth.uid()` appears in a join through `allowed_therapists`. Admins bypass the filter.

**4.9 Update the client to use Supabase Auth sessions**
`LoginPage` must call `supabase.auth.signInWithPassword(...)` instead of comparing passwords in JavaScript. All subsequent Supabase requests automatically carry the user's JWT, which `auth.uid()` inside Postgres resolves to the correct UUID for RLS.

**4.10 Remove `bootstrapAdminIfNeeded`**
The function that upserts hardcoded admin credentials on every page load must be removed. The admin account should exist as a normal Supabase Auth user created once during setup.

---

## 5. Risks of the Current System

The following risks exist today on the `pilot-therapists-v1` / `security/pilot-real-patients-auth` branch.

**Risk 1 — Plaintext passwords readable by any network request**
Severity: Critical.
The `password` column in `profiles` is selected in `verifyTherapistCredentials` and returned to the browser. Because RLS is disabled, any HTTP client that knows the Supabase project URL and anon key can run `GET /rest/v1/profiles?select=username,password` and receive every therapist's username and password in a single unauthenticated request. The anon key is embedded in the client bundle and visible in browser DevTools.

**Risk 2 — All patient clinical data is unprotected**
Severity: Critical.
RLS is disabled on `mc_patients`. Any caller with the anon key can fetch every patient's full clinical record (name, ID, diagnosis history, treatment transcriptions, care plans) with a single unauthenticated request. There is no per-therapist isolation at the database layer.

**Risk 3 — No server-side session; sessions cannot be revoked**
Severity: High.
Authentication state is stored only in the browser's localStorage. There is no JWT, no token expiry, and no server-side session record. A logged-in session cannot be terminated remotely. If a therapist's device is lost or their account is deactivated in `profiles`, their browser remains authenticated indefinitely until they manually clear localStorage or a cookie.

**Risk 4 — `active = false` check is client-only**
Severity: High.
When a therapist account is marked `active = false` in `profiles`, the app blocks login for new sign-in attempts. However, existing sessions (stored in localStorage) are not invalidated. A deactivated therapist who is already logged in continues to have full access until they sign out.

**Risk 5 — Client-side patient filtering can be bypassed trivially**
Severity: High.
The `therapist_id` filter in `loadPatientsFromSupabase` exists only in application code. Any caller — including a logged-in therapist who edits their localStorage `mc_therapistId` value, or a direct API call — can fetch patients belonging to other therapists. The offline fallback path (when `therapistId` is absent) returns all patients with no filter applied.

**Risk 6 — Hardcoded admin credentials upserted on every page load**
Severity: High.
`bootstrapAdminIfNeeded` runs on every mount of `LoginPage` and always writes `username: 'admin', password: '15951595'` to `profiles`. This means the admin password cannot be changed — any change is overwritten the next time someone visits the login page. It also means the admin account is permanently present and cannot be deactivated.

**Risk 7 — The anon key grants write access to all tables**
Severity: High.
Because RLS is disabled, the anon key (embedded in the client bundle) can be used to insert, update, or delete any row in `profiles` or `mc_patients` without any authentication. An attacker can overwrite any patient's clinical record or any therapist's credentials.

**Risk 8 — `therapist_id` ownership can be forged**
Severity: Medium.
When a patient is saved, the client writes `therapist_id` from its own in-memory state. There is no server-side check that the caller is permitted to claim ownership of that patient ID. A logged-in therapist could reassign any patient to themselves or to another therapist by crafting a direct upsert call.

**Risk 9 — Sign-out leaves sensitive keys in localStorage**
Severity: Low–Medium.
Sign-out removes `mc_logged_in` but leaves `mc_role`, `mc_therapistId`, and `mc_therapistName` in localStorage. On a shared device, a subsequent user can read those values. The next login overwrites them but does not clear the previous therapist's identity before the new one is written.

**Risk 10 — No audit log**
Severity: Medium (compliance).
There is no record of who accessed or modified patient data, when they logged in, or what changes they made. For clinical data this may be a regulatory requirement depending on jurisdiction.

---

## 6. Proposed Migration Plan (high level, for review)

This is a proposed sequence. No work begins until each phase is reviewed and approved.

**Phase 2A — Eliminate plaintext password exposure (server-side RPC)**
Replace the `SELECT ... password ...` query in `verifyTherapistCredentials` with a `SECURITY DEFINER` Postgres function that performs the comparison inside the database and returns only the profile row (no password). This is the single highest-value change: it removes the most critical exposure without touching the login UI or any other flow. Estimated scope: one SQL function + one line change in `therapistsStore.js`.

**Phase 2B — Enable RLS with permissive-but-not-open policies**
Enable RLS on both tables. Write policies that allow the anon role to read/write only via the verify function and via session tokens. Block direct table reads from anon. This hardens the database layer without requiring Supabase Auth sessions yet.

**Phase 2C — Migrate therapists to Supabase Auth**
Add `user_id` to `profiles`. Run a one-time server-side migration script (service_role only) to create `auth.users` entries for all existing therapists and populate `profiles.user_id`. Update `LoginPage` to call `supabase.auth.signInWithPassword`. Update the client to use the Supabase session JWT for all requests. One file at a time, reviewed between each change.

**Phase 2D — Migrate patient ownership to UUID**
Add `owner_user_id` to `mc_patients`. Populate it from `profiles.user_id` for all existing rows. Update the patient upsert to write `owner_user_id: auth.uid()` (resolved server-side) rather than `therapist_id` (client string). Tighten RLS policies to enforce UUID-based ownership.

**Phase 2E — Drop the password column and remove bootstrap**
Once all therapists are on Supabase Auth: blank and drop `profiles.password`. Remove `bootstrapAdminIfNeeded`. Remove the hardcoded admin bypass in `LoginPage`. Create the admin account as a normal Supabase Auth user via a one-time setup script.

---

*End of Phase 1 audit. No code, SQL, or UI changes have been made. Awaiting review before Phase 2A begins.*
