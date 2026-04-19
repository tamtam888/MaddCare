// src/pages/TreatmentPage.jsx
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RecordAudio from "../components/RecordAudio";
import "./TreatmentPage.css";

function getPatientKey(p) {
  return String(p?.idNumber || p?.id || "").trim();
}

function getPatientName(p) {
  const name = `${p?.firstName || ""} ${p?.lastName || ""}`.trim();
  return name || p?.fullName || "Unknown patient";
}

function getInitials(p) {
  const first = String(p?.firstName || "").trim();
  const last = String(p?.lastName || "").trim();
  const a = (first[0] || "?").toUpperCase();
  const b = (last[0] || "").toUpperCase();
  return `${a}${b}`.trim() || "?";
}

function getGenderClass(p) {
  const g = String(p?.gender || "").trim().toLowerCase();
  if (g === "female" || g === "f") return "female";
  if (g === "male" || g === "m") return "male";
  return "other";
}

export default function TreatmentPage({ patients = [], onSaveTranscription }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const patientId = String(params.get("patientId") || "").trim();

  const selectedPatient = useMemo(() => {
    if (!patientId) return null;
    return (patients || []).find((p) => getPatientKey(p) === patientId) || null;
  }, [patients, patientId]);

  const filtered = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    if (!term) return patients || [];
    return (patients || []).filter((p) => {
      const id = getPatientKey(p).toLowerCase();
      const name = getPatientName(p).toLowerCase();
      return id.includes(term) || name.includes(term);
    });
  }, [patients, search]);

  const openPatient = (p) => {
    const id = getPatientKey(p);
    if (!id) return;
    setParams({ patientId: id });
  };

  const clearPatient = () => {
    setParams({});
  };

  const handleSave = (payload) => {
    if (typeof onSaveTranscription === "function") onSaveTranscription(payload);
    if (patientId) navigate(`/patients/${encodeURIComponent(patientId)}`);
  };

  // ── No patient selected — show search list ────────────────────────────────
  if (!selectedPatient) {
    return (
      <div className="treatment-page" dir="ltr">
        <div className="treatment-header-row">
          <div className="treatment-header-text">
            <h1 className="treatment-title">Treatment Session</h1>
            <p className="treatment-subtitle">
              Select a patient below to start recording their session notes.
            </p>
          </div>
        </div>

        <div className="treatment-search-wrapper">
          <div className="treatment-search-icon">🔍</div>
          <input
            className="treatment-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID number..."
            autoFocus
          />
        </div>

        <div className="treatment-list">
          {(filtered || []).map((p) => {
            const id = getPatientKey(p);
            const name = getPatientName(p);
            const initials = getInitials(p);
            const genderClass = getGenderClass(p);

            return (
              <div key={id || `${name}_${Math.random()}`} className="treatment-item">
                <div className="treatment-item-left">
                  <div className={`treatment-avatar treatment-avatar-${genderClass}`}>{initials}</div>

                  <div className="treatment-item-text">
                    <div className="treatment-item-name">{name}</div>
                    <div className="treatment-item-meta">{id ? `ID ${id}` : "No ID"}</div>
                  </div>
                </div>

                <div className="treatment-item-right">
                  <button type="button" className="treatment-start-btn" onClick={() => openPatient(p)}>
                    Start Session
                  </button>
                </div>
              </div>
            );
          })}

          {!filtered?.length ? (
            <div className="treatment-empty">
              {search
                ? "No patients match your search."
                : "No patients yet. Add patients from the Patients section first."}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Patient selected — show recording panel ───────────────────────────────
  const name = getPatientName(selectedPatient);

  return (
    <div className="treatment-page" dir="ltr">
      <div className="treatment-header-row">
        <div className="treatment-header-text">
          <h1 className="treatment-title">Treatment Session</h1>
          <p className="treatment-subtitle">
            {name}{patientId ? ` · ID ${patientId}` : ""}
          </p>
          <p className="treatment-hint">
            Record audio or dictate live · then use <strong>Improve with AI</strong> to refine the note · save to patient history when ready.
          </p>
        </div>

        <div className="treatment-header-actions">
          <button type="button" className="patients-toolbar-button" onClick={clearPatient}>
            Change patient
          </button>

          <button
            type="button"
            className="patients-toolbar-button"
            onClick={() => navigate(`/patients/${encodeURIComponent(patientId)}`)}
          >
            Back to patient
          </button>
        </div>
      </div>

      <RecordAudio selectedPatient={selectedPatient} onSaveTranscription={handleSave} />
    </div>
  );
}
