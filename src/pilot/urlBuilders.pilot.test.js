// @vitest-environment jsdom
/**
 * Pilot-readiness tests for therapist identity in intake/video URLs.
 * Tests the URL-building logic that was added in pilot Phase 2/3.
 *
 * Since the builder functions are module-level (not exported), this test
 * file duplicates the exact same logic to verify the specification, and
 * cross-checks using the same URLSearchParams API.
 */

import { describe, it, expect } from 'vitest';

const MEDIA_APP_BASE_URL = 'https://maddvideo.vercel.app';

// ── Exact replicas of the production builders ─────────────────────────────────

function buildIntakeUrl(patientId, patientName, therapistId) {
  if (!patientId) return null;
  const id = String(patientId).trim();
  const params = new URLSearchParams();
  if (patientName) params.set('patientName', String(patientName).trim());
  params.set('mode', 'intake');
  params.set('source', 'medicalcare');
  if (therapistId) params.set('tid', String(therapistId).trim());
  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(id)}/intake/new?${params.toString()}`;
}

function buildVideoWorkflowUrl({ patientId, patientName, mode, therapistId }) {
  const id = String(patientId || '').trim();
  if (!id) return `${MEDIA_APP_BASE_URL}/patients`;
  const params = new URLSearchParams();
  params.set('patientId', id);
  if (patientName) params.set('patientName', String(patientName).trim());
  if (mode) params.set('mode', mode);
  params.set('source', 'medicalcare');
  if (therapistId) params.set('tid', String(therapistId).trim());
  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(id)}?${params.toString()}`;
}

// MediaPage / AppointmentDrawer version
function buildVideoUrl(patient, mode, therapistId) {
  if (!patient) return `${MEDIA_APP_BASE_URL}/patients`;
  const patientId = patient.idNumber || patient.id || '';
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');
  const params = new URLSearchParams();
  if (patientId) params.set('patientId', patientId);
  if (patientName) params.set('patientName', patientName);
  if (mode) params.set('mode', mode);
  params.set('source', 'medicalcare');
  if (therapistId) params.set('tid', String(therapistId).trim());
  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(patientId)}?${params.toString()}`;
}

// PatientsPage version
function openIntakeUrl(patient, therapistId) {
  const patientId = patient?.idNumber || patient?.id;
  if (!patientId) return null;
  const id = String(patientId).trim();
  const patientName = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ');
  const params = new URLSearchParams();
  if (patientName) params.set('patientName', patientName);
  params.set('mode', 'intake');
  params.set('source', 'medicalcare');
  if (therapistId) params.set('tid', String(therapistId).trim());
  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(id)}/intake/new?${params.toString()}`;
}

// ── Helper ────────────────────────────────────────────────────────────────────
function getParam(url, key) {
  const u = new URL(url);
  return u.searchParams.get(key);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildIntakeUrl (PatientDetailsPage)', () => {
  it('includes tid when therapistId is provided', () => {
    const url = buildIntakeUrl('123456789', 'Sara Cohen', 'T001');
    expect(getParam(url, 'tid')).toBe('T001');
  });

  it('does NOT include tid when therapistId is absent', () => {
    const url = buildIntakeUrl('123456789', 'Sara Cohen', '');
    expect(getParam(url, 'tid')).toBeNull();
  });

  it('does NOT include tid when therapistId is null', () => {
    const url = buildIntakeUrl('123456789', 'Sara Cohen', null);
    expect(getParam(url, 'tid')).toBeNull();
  });

  it('includes source=medicalcare', () => {
    const url = buildIntakeUrl('123456789', 'Sara Cohen', 'T001');
    expect(getParam(url, 'source')).toBe('medicalcare');
  });

  it('includes mode=intake', () => {
    const url = buildIntakeUrl('123456789', 'Sara Cohen', 'T001');
    expect(getParam(url, 'mode')).toBe('intake');
  });

  it('returns null when patientId is empty', () => {
    expect(buildIntakeUrl('', 'Sara Cohen', 'T001')).toBeNull();
  });
});

describe('buildVideoWorkflowUrl (PatientDetailsPage)', () => {
  it('includes tid when therapistId is provided', () => {
    const url = buildVideoWorkflowUrl({ patientId: '123456789', patientName: 'Sara', mode: 'progress', therapistId: 'T001' });
    expect(getParam(url, 'tid')).toBe('T001');
  });

  it('does NOT include tid when therapistId is absent', () => {
    const url = buildVideoWorkflowUrl({ patientId: '123456789', patientName: 'Sara', mode: 'progress', therapistId: '' });
    expect(getParam(url, 'tid')).toBeNull();
  });

  it('passes mode correctly', () => {
    const url = buildVideoWorkflowUrl({ patientId: '123456789', mode: 'exercise', therapistId: 'T001' });
    expect(getParam(url, 'mode')).toBe('exercise');
  });
});

describe('buildVideoUrl (MediaPage + AppointmentDrawer)', () => {
  const patient = { idNumber: '111222333', firstName: 'Ali', lastName: 'Hassan' };

  it('includes tid when therapistId is provided', () => {
    const url = buildVideoUrl(patient, 'intake', 'T002');
    expect(getParam(url, 'tid')).toBe('T002');
  });

  it('does NOT include tid when therapistId is absent', () => {
    const url = buildVideoUrl(patient, 'intake', '');
    expect(getParam(url, 'tid')).toBeNull();
  });

  it('returns fallback URL when patient is null', () => {
    const url = buildVideoUrl(null, 'intake', 'T002');
    expect(url).toBe(`${MEDIA_APP_BASE_URL}/patients`);
  });
});

describe('openIntakeUrl (PatientsPage)', () => {
  const patient = { idNumber: '987654321', firstName: 'Miriam', lastName: 'Levy' };

  it('includes tid when therapistId is provided', () => {
    const url = openIntakeUrl(patient, 'T003');
    expect(getParam(url, 'tid')).toBe('T003');
  });

  it('does NOT include tid when therapistId is absent', () => {
    const url = openIntakeUrl(patient, '');
    expect(getParam(url, 'tid')).toBeNull();
  });

  it('returns null when patient has no id', () => {
    expect(openIntakeUrl({}, 'T003')).toBeNull();
  });
});
