// @vitest-environment jsdom
/**
 * Pilot-readiness tests for therapist authentication and isolation.
 * Covers: verifyTherapistCredentials - Supabase path + offline IDB path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue(undefined),
}));

const mocks = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockIlike = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = vi.fn(() => ({ ilike: mockIlike }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockMaybeSingle, mockIlike, mockSelect, mockFrom };
});

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: mocks.mockFrom },
}));

import { get } from 'idb-keyval';
import { verifyTherapistCredentials } from './therapistsStore';

function makeSupabaseRow({ username, password, active = true }) {
  return {
    national_id: '123456789', full_name: 'Test Therapist',
    username, password, role: 'therapist', active,
    gender: 'not_specified', work_days: [], phone: '', email: '', address: '',
  };
}

function makeIdbRecord({ username = '', fullName = '', idNumber = '123456789', password = '' } = {}) {
  return { id: idNumber, idNumber, fullName, username, password, role: 'therapist', active: true };
}

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue([]);
  mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
});

describe('verifyTherapistCredentials - input validation', () => {
  it('returns null for empty username', async () => {
    expect(await verifyTherapistCredentials('', 'somepassword')).toBeNull();
  });
  it('returns null for empty password', async () => {
    expect(await verifyTherapistCredentials('therapist1', '')).toBeNull();
  });
  it('returns null for both empty', async () => {
    expect(await verifyTherapistCredentials('', '')).toBeNull();
  });
  it('returns null for whitespace-only username', async () => {
    expect(await verifyTherapistCredentials('   ', 'password')).toBeNull();
  });
});

describe('verifyTherapistCredentials - Supabase path (online)', () => {
  it('returns therapist record when username + password match', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({
      data: makeSupabaseRow({ username: 'drsarah', password: 'secret123' }),
      error: null,
    });
    const result = await verifyTherapistCredentials('drsarah', 'secret123');
    expect(result).not.toBeNull();
    expect(result.username).toBe('drsarah');
    expect(result.active).toBe(true);
  });

  it('returns null when password is wrong', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({
      data: makeSupabaseRow({ username: 'drsarah', password: 'secret123' }),
      error: null,
    });
    expect(await verifyTherapistCredentials('drsarah', 'wrongpassword')).toBeNull();
  });

  it('returns null when username does not exist', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await verifyTherapistCredentials('nonexistent', 'anypassword')).toBeNull();
  });

  it('normalises username to lowercase before querying', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({
      data: makeSupabaseRow({ username: 'drsarah', password: 'secret123' }),
      error: null,
    });
    const result = await verifyTherapistCredentials('DrSarah', 'secret123');
    expect(result).not.toBeNull();
    expect(mocks.mockIlike).toHaveBeenCalledWith('username', 'drsarah');
  });

  it('LEGACY REMOVED: fullName + nationalId does NOT authenticate', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await verifyTherapistCredentials('Test Therapist', '123456789')).toBeNull();
  });

  it('makes only ONE Supabase query after username miss (no second legacy query)', async () => {
    mocks.mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await verifyTherapistCredentials('nobody', 'pass');
    expect(mocks.mockMaybeSingle).toHaveBeenCalledTimes(1);
  });
});

describe('verifyTherapistCredentials - offline IDB fallback (Supabase network error)', () => {
  beforeEach(() => {
    mocks.mockMaybeSingle.mockRejectedValue(new Error('Network error'));
  });

  it('returns therapist from IDB when username + password match', async () => {
    get.mockResolvedValue([
      makeIdbRecord({ username: 'drali', fullName: 'Dr Ali', idNumber: '123456789', password: 'pass99' }),
    ]);
    const result = await verifyTherapistCredentials('drali', 'pass99');
    expect(result).not.toBeNull();
    expect(result.username).toBe('drali');
  });

  it('returns null when IDB password is wrong', async () => {
    get.mockResolvedValue([
      makeIdbRecord({ username: 'drali', password: 'pass99' }),
    ]);
    expect(await verifyTherapistCredentials('drali', 'wrongpassword')).toBeNull();
  });

  it('LEGACY REMOVED: record without username does NOT authenticate via fullName+idNumber', async () => {
    get.mockResolvedValue([
      makeIdbRecord({ username: '', fullName: 'Dr Ali Karwan', idNumber: '123456789', password: '' }),
    ]);
    expect(await verifyTherapistCredentials('Dr Ali Karwan', '123456789')).toBeNull();
  });

  it('returns null when IDB is empty', async () => {
    get.mockResolvedValue([]);
    expect(await verifyTherapistCredentials('anyone', 'anypass')).toBeNull();
  });
});
