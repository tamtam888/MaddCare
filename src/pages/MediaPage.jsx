import { useAuthContext } from "../hooks/useAuthContext";
import { useLanguage } from "../i18n/LanguageContext";

const MEDIA_APP_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_MEDIA_APP_BASE_URL
    ? import.meta.env.VITE_MEDIA_APP_BASE_URL
    : "https://maddvideo.vercel.app";

function buildVideoUrl(patient, mode, therapistId) {
  const base = MEDIA_APP_BASE_URL;
  if (!patient) {
    return `${base}/patients`;
  }

  const patientId = patient.idNumber || patient.id || patient.medplumId || "";
  const patientName = [patient.firstName, patient.lastName]
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams();
  if (patientId) params.set("patientId", patientId);
  if (patientName) params.set("patientName", patientName);
  if (mode) params.set("mode", mode);
  params.set("source", "medicalcare");
  if (therapistId) params.set("tid", String(therapistId).trim());

  return `${base}/patients/${encodeURIComponent(patientId)}?${params.toString()}`;
}

function openVideo(patient, mode, therapistId) {
  const url = buildVideoUrl(patient, mode, therapistId);
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function MediaPage({ selectedPatient }) {
  const { therapistId } = useAuthContext();
  const { t } = useLanguage();
  const hasPatient = Boolean(selectedPatient);
  const patientLabel = hasPatient
    ? [selectedPatient.firstName, selectedPatient.lastName]
        .filter(Boolean)
        .join(" ") || selectedPatient.idNumber
    : null;

  return (
    <div className="page-placeholder">
      <h1 className="page-placeholder-title">{t('videoSessions')}</h1>

      <p className="page-placeholder-text">
        {hasPatient
          ? `Patient: ${patientLabel} — choose a workflow below to open the video module.`
          : "Open a patient record first to launch a targeted video workflow, or open the video module directly."}
      </p>

      <div className="media-workflow-grid">
        <div className="media-workflow-card">
          <div className="media-workflow-card-icon">🎥</div>
          <h3 className="media-workflow-card-title">{t('intakeAssessment')}</h3>
          <p className="media-workflow-card-desc">
            Record the initial video assessment to document baseline movement and function before treatment begins.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => openVideo(selectedPatient, "intake", therapistId)}
          >
            {hasPatient ? "Start Intake Video" : "Open Video Module"}
          </button>
        </div>

        <div className="media-workflow-card">
          <div className="media-workflow-card-icon">📊</div>
          <h3 className="media-workflow-card-title">{t('mediaProgressComparison')}</h3>
          <p className="media-workflow-card-desc">
            Compare recordings side-by-side to track functional improvement and share progress with the patient.
          </p>
          <button
            type="button"
            className="primary-button"
            disabled={!hasPatient}
            onClick={() => openVideo(selectedPatient, "progress", therapistId)}
          >
            Compare Videos
          </button>
        </div>

        <div className="media-workflow-card">
          <div className="media-workflow-card-icon">🏃</div>
          <h3 className="media-workflow-card-title">{t('mediaExerciseReview')}</h3>
          <p className="media-workflow-card-desc">
            Review exercise and treatment session recordings to give clinical feedback and adjust the plan.
          </p>
          <button
            type="button"
            className="primary-button"
            disabled={!hasPatient}
            onClick={() => openVideo(selectedPatient, "exercise", therapistId)}
          >
            Review Exercises
          </button>
        </div>
      </div>

      {!hasPatient && (
        <p className="media-workflow-hint">
          Progress Comparison and Exercise Review require a patient to