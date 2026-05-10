// src/pages/TreatmentPage.jsx
import { useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import RecordAudio from "../components/RecordAudio";
import { useDemoMode } from "../hooks/useDemoMode";
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
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const isDemo = useDemoMode();

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
      <div className="treatment-page">
        <div className="treatment-header-row">
          <div className="treatment-header-text">
            <h1 className="treatment-title">{t('treatmentSession')}</h1>
            <p className="treatment-subtitle">
              {t('treatmentSelectPatient')}
            </p>
          </div>
        </div>

        <div className="treatment-search-wrapper">
          <div className="treatment-search-icon">🔍</div>
          <input
            className="treatment-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('treatmentSearchPlaceholder')}
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
                    <div className="treatment-item-meta">{id ? `ID ${id}` : t('noId')}</div>
                  </div>
                </div>

                <div className="treatment-item-right">
                  <button type="button" className="treatment-start-btn" onClick={() => openPatient(p)}>
                    {t('startSession')}
                  </button>
                </div>
              </div>
            );
          })}

          {!filtered?.length ? (
            <div className="treatment-empty">
              {search
                ? t('noPatientMatch')
                : t('noPatientsYet')}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Patient selected — show recording panel ───────────────────────────────
  const name = getPatientName(selectedPatient);

  // ── Demo mode — read-only treatment preview ───────────────────────────────
  if (isDemo) {
    return (
      <div className="treatment-page">
        <div className="treatment-header-row">
          <div className="treatment-header-text">
            <h1 className="treatment-title">{t('treatmentSession')}</h1>
            <p className="treatment-subtitle">
              {name}{patientId ? ` · ID ${patientId}` : ""}
            </p>
          </div>
          <div className="treatment-header-actions">
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={() => navigate(`/patients/${encodeURIComponent(patientId)}`)}
            >
              {t('backToPatient')}
            </button>
          </div>
        </div>

        <div className="demo-treatment-workflow">
          <div className="demo-workflow-step">
            <span className="demo-workflow-icon" aria-hidden="true">🎙️</span>
            <span className="demo-workflow-label">Record Session</span>
          </div>
          <span className="demo-workflow-sep" aria-hidden="true">→</span>
          <div className="demo-workflow-step">
            <span className="demo-workflow-icon" aria-hidden="true">📝</span>
            <span className="demo-workflow-label">AI Transcription</span>
          </div>
          <span className="demo-workflow-sep" aria-hidden="true">→</span>
          <div className="demo-workflow-step">
            <span className="demo-workflow-icon" aria-hidden="true">📋</span>
            <span className="demo-workflow-label">Visit Summary</span>
          </div>
          <span className="demo-workflow-sep" aria-hidden="true">→</span>
          <div className="demo-workflow-step demo-workflow-step-highlight">
            <span className="demo-workflow-icon" aria-hidden="true">✨</span>
            <span className="demo-workflow-label">Improve with AI</span>
          </div>
        </div>

        <div className="demo-treatment-preview">
          <div className="demo-treatment-note-block">
            <div className="demo-treatment-block-label">Raw Therapist Note</div>
            <p className="demo-treatment-block-text">
              Patient reports reduced lower back pain. Practiced lumbar stabilization
              and walking tolerance. Sitting still limited but improving.
            </p>
          </div>

          <div className="demo-treatment-arrow">↓ AI Improvement</div>

          <div className="demo-treatment-ai-block">
            <div className="demo-treatment-block-label">AI Clinical Summary</div>
            <p className="demo-treatment-block-text">
              The patient reports reduced lower back pain compared with the previous
              session. Lumbar stabilization exercises were performed with improved
              control, and walking tolerance is gradually improving. Sitting tolerance
              remains limited but shows functional progress. Continue Phase 3
              stabilization and reassess in two weeks.
            </p>
          </div>

          <p className="demo-treatment-hint">
            Read-only demo preview — live recording, transcription, and AI
            improvement are available in the full pilot workflow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="treatment-page">
      <div className="treatment-header-row">
        <div className="treatment-header-text">
          <h1 className="treatment-title">{t('treatmentSession')}</h1>
          <p className="treatment-subtitle">
            {name}{patientId ? ` · ID ${patientId}` : ""}
          </p>
          <p className="treatment-hint">
            {t('treatmentHint')}
          </p>
        </div>

        <div className="treatment-header-actions">
          <button type="button" className="patients-toolbar-button" onClick={clearPatient}>
            {t('changePatient')}
          </button>

          <button
            type="button"
            className="patients-toolbar-button"
            onClick={() => navigate(`/patients/${encodeURIComponent(patientId)}`)}
          >
            {t('backToPatient')}
          </button>
        </div>
      </div>

      <RecordAudio selectedPatient={selectedPatient} onSaveTranscription={handleSave} />
    </div>
  );
}
