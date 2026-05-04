// src/hooks/useTrialStatus.js
//
// Returns the 30-day trial status for the currently logged-in pilot therapist.
// Only active in environments where Supabase is configured (pilot deployments).
// Demo users and admins are always treated as non-expired.
//
// Return shape: { isExpired: boolean, daysLeft: number|null, isLoading: boolean }
//   isExpired  – true if trial_end_date is in the past
//   daysLeft   – whole days remaining (null if trial dates not present)
//   isLoading  – true while the async fetch is in flight

import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const TABLE = "profiles";

function getTherapistId() {
  try { return localStorage.getItem("mc_therapistId") || ""; } catch { return ""; }
}
function isDemoMode() {
  try { return localStorage.getItem("mc_demo_mode") === "true"; } catch { return false; }
}
function isAdmin() {
  try { return localStorage.getItem("mc_role") === "admin"; } catch { return false; }
}

/** Days remaining until dateStr (can be negative when expired). */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date();
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

const IDLE = { isExpired: false, daysLeft: null, isLoading: false };
const LOADING = { isExpired: false, daysLeft: null, isLoading: true };

export function useTrialStatus() {
  const [status, setStatus] = useState(LOADING);

  useEffect(() => {
    // ── Gate: pilot env only ──────────────────────────────────────────────────
    if (!isSupabaseConfigured) { setStatus(IDLE); return; }

    // ── Gate: demo mode and admin are never gated by trial ───────────────────
    if (isDemoMode() || isAdmin()) { setStatus(IDLE); return; }

    const therapistId = getTherapistId();
    if (!therapistId) { setStatus(IDLE); return; }

    let cancelled = false;

    async function fetchAndSeedTrial() {
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select("trial_start_date, trial_end_date")
          .eq("national_id", therapistId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          // Columns may not exist yet (DB not migrated) — fail open, never block.
          if (import.meta.env.DEV) {
            console.warn("[useTrialStatus] Supabase error:", error.message);
          }
          setStatus(IDLE);
          return;
        }

        // No matching profile row — fail open.
        if (!data) { setStatus(IDLE); return; }

        // ── STEP 2: Seed trial dates on first login ───────────────────────────
        if (data.trial_start_date === null) {
          const now = new Date();
          const end = new Date(now);
          end.setDate(end.getDate() + 30);

          const { error: seedError } = await supabase
            .from(TABLE)
            .update({
              trial_start_date: now.toISOString(),
              trial_end_date: end.toISOString(),
            })
            .eq("national_id", therapistId);

          if (!cancelled) {
            if (seedError && import.meta.env.DEV) {
              console.warn("[useTrialStatus] Seed error:", seedError.message);
            }
            // Fresh trial — 30 days left, definitely not expired.
            setStatus({ isExpired: false, daysLeft: 30, isLoading: false });
          }
          return;
        }

        // ── Normal path: calculate remaining days ─────────────────────────────
        const daysLeft = daysUntil(data.trial_end_date);
        const isExpired = daysLeft !== null && daysLeft <= 0;

        if (import.meta.env.DEV) {
          console.log("[useTrialStatus] trial_start_date:", data.trial_start_date);
          console.log("[useTrialStatus] trial_end_date:", data.trial_end_date);
          console.log("[useTrialStatus] daysLeft:", daysLeft, "| isExpired:", isExpired);
        }

        if (!cancelled) {
          setStatus({ isExpired, daysLeft, isLoading: false });
        }
      } catch {
        // Network failure — fail open, never block the app.
        if (!cancelled) setStatus(IDLE);
      }
    }

    fetchAndSeedTrial();
    return () => { cancelled = true; };
  }, []);

  return status;
}
