/**
 * intakeService — read-only access to mc_intakes in MedicalCare Supabase project.
 *
 * Used by PatientDetailsPage to display the latest intake summary per patient.
 * Therapist queries filter by BOTH patient_id AND therapist_id.
 * Admin queries filter by patient_id only — they see all intakes across therapists.
 * Errors are non-throwing — callers receive null or [] and handle gracefully.
 */

import { supabase, isSupabaseConfigured } from './supabase';

const TABLE = 'mc_intakes';

/**
 * Fetch the most recent intake for a patient + therapist pair.
 * Returns null if none found, Supabase is unconfigured, or an error occurs.
 *
 * @param {string} patientId   - patient national ID (matches mc_patients.id_number)
 * @param {string} therapistId - therapist national ID, digits-only
 * @returns {Promise<object|null>}
 */
export async function getLatestIntakeForPatient(patientId, therapistId, isAdmin = false) {
  if (!isSupabaseConfigured || !patientId) return null;
  // Therapist: must have a therapistId to scope the query.
  // Admin: skips therapist_id filter so they see all intakes for the patient.
  if (!isAdmin && !therapistId) return null;
  try {
    let query = supabase
      .from(TABLE)
      .select('id, session_date, discipline, status, therapist_id, created_at, updated_at')
      .eq('patient_id', String(patientId))
      .order('session_date', { ascending: false })
      .limit(1);

    if (!isAdmin) {
      query = query.eq('therapist_id', String(therapistId));
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn('[intakeService] getLatestIntakeForPatient failed:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[intakeService] unexpected error:', err?.message ?? err);
    return null;
  }
}

/**
 * Fetch all intakes for a patient + therapist pair, newest first.
 * Returns [] on error or if Supabase is unconfigured.
 *
 * @param {string} patientId
 * @param {string} therapistId
 * @returns {Promise<object[]>}
 */
export async function listIntakesForPatient(patientId, therapistId, isAdmin = false) {
  if (!isSupabaseConfigured || !patientId) return [];
  if (!isAdmin && !therapistId) return [];
  try {
    let query = supabase
      .from(TABLE)
      .select('id, session_date, discipline, status, therapist_id, created_at, updated_at')
      .eq('patient_id', String(patientId))
      .order('session_date', { ascending: false });

    if (!isAdmin) {
      query = query.eq('therapist_id', String(therapistId));
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[intakeService] listIntakesForPatient failed:', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn('[intakeService] unexpected error:', err?.message ?? err);
    return [];
  }
}
