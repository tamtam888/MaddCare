import { formatDateDMY, parseFlexibleDate } from "./dateFormat";

export function buildFullName(p) {
  const first = (p?.firstName || "").trim();
  const last = (p?.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || "Unknown patient";
}

export function buildInitials(p) {
  const a = (p?.firstName || "?").trim().slice(0, 1);
  const b = (p?.lastName || "").trim().slice(0, 1);
  return `${a}${b}`.toUpperCase();
}

export function getGenderClass(p) {
  const g = String(p?.gender || "").trim().toLowerCase();
  if (g === "female" || g === "f") return "avatar-female";
  if (g === "male" || g === "m") return "avatar-male";
  return "avatar-other";
}

export function getHeaderStatusClass(p) {
  const s = String(p?.clinicalStatus || "").trim().toLowerCase();
  if (s === "active") return "header-active";
  if (s === "stable") return "header-stable";
  if (s === "disabled") return "header-disabled";
  if (s === "not active" || s === "not-active" || s === "notactive")
    return "header-not-active";
  return "header-inactive";
}

export function getStatusPillClass(p) {
  const s = String(p?.clinicalStatus || "").trim().toLowerCase();
  if (s === "active") return "status-pill status-active";
  if (s === "stable") return "status-pill status-stable";
  if (s === "disabled") return "status-pill status-disabled";
  if (s === "not active" || s === "not-active" || s === "notactive")
    return "status-pill status-not-active";
  return "status-pill status-inactive";
}

export function pickDobValue(p) {
  return (
    p?.dob ??
    p?.dateOfBirth ??
    p?.birthDate ??
    p?.birthDateTime ??
    p?.dobText ??
    ""
  );
}

export function formatDobForHeader(p) {
  const raw = pickDobValue(p);
  const d = parseFlexibleDate(raw);
  if (!d) return "-";
  return formatDateDMY(d);
}

export function pickMedplumPatientId(p) {
  const candidates = [
    p?.medplumPatientId,
    p?.medplumId,
    p?.fhirId,
    p?.fhirPatientId,
    p?.resourceId,
  ];
  for (const c of candidates) {
    const v = String(c || "").trim();
    if (v) return v;
  }
  return "";
}
