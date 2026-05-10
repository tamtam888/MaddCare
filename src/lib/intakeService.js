/**
 * intakeService — read-only access to mc_intakes in MedicalCare Supabase project.
 *
 * Used by PatientDetailsPage to display the latest intake summary per patient.
 * All queries filter by BOTH patient_id AND therapist_id for strict isolation.
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
export async function getLatestIntakeForPatient(patientId, therapistId) {
  if (!isSupabaseConfigured || !patientId || !therapistId) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, session_date, discipline, status, created_at, updated_at')
      .eq('patient_id',   String(patientId))
      .eq('therapist_id', String(therapistId))
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle();
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
export async function listIntakesForPatient(patientId, therapistId) {
  if (!isSupabaseConfigured || !patientId || !therapistId) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, session_date, discipline, status, created_at, updated_at')
      .eq('patient_id',   String(patientId))
      .eq('therapist_id', String(therapistId))
      .order('session_date', { ascending: false });
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
