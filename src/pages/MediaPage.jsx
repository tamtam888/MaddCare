const MEDIA_APP_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_MEDIA_APP_BASE_URL
    ? import.meta.env.VITE_MEDIA_APP_BASE_URL
    : "https://maddvideo.vercel.app";

function buildVideoUrl(patient, mode) {
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

  return `${base}/patients/${encodeURIComponent(patientId)}?${params.toString()}`;
}

function openVideo(patient, mode) {
  const url = buildVideoUrl(patient, mode);
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function MediaPage({ selectedPatient }) {
  const hasPatient = Boolean(selectedPatient);
  const patientLabel = hasPatient
    ? [selectedPatient.firstName, selectedPatient.lastName]
        .filter(Boolean)
        .join(" ") || selectedPatient.idNumber
    : null;

  return (
    <div className="page-placeholder">
      <h1 className="page-placeholder-title">Video Clinical Workflow</h1>

      <p className="page-placeholder-text">
        {hasPatient
          ? `Patient: ${patientLabel} — select a workflow below to open in the video module.`
          : "Select a patient from the patient list to launch a targeted video workflow, or open the general module."}
      </p>

      <div className="media-workflow-grid">
        <div className="media-workflow-card">
          <div className="media-workflow-card-icon">🎥</div>
          <h3 className="media-workflow-card-title">Intake Assessment</h3>
          <p className="media-workflow-card-desc">
            Record the initial video assessment to document baseline movement and function.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => openVideo(selectedPatient, "intake")}
          >
            {hasPatient ? "Start Intake Video" : "Open Video Module"}
          </button>
        </div>

        <div className="media-workflow-card">
          <div className="media-workflow-card-icon">📊</div>
          <h3 className="media-workflow-card-title">Progress Comparison</h3>
          <p className="media-workflow-card-desc">
            Compare videos side-by-side to track functional improvement over time.
          </p>
          <button
            type="button"
            className="primary-button"
            disabled={!hasPatient}
            onClick={() => openVideo(selectedPatient, "compare")}
          >
            Compare Videos
          </button>
        </div>

        <div className="media-workflow-card">
          <div className="media-workflow-card-icon">🏃</div>
          <h3 className="media-workflow-card-title">Treatment Review</h3>
          <p className="media-workflow-card-desc">
            Review exercise and treatment session recordings for clinical feedback.
          </p>
          <button
            type="button"
            className="primary-button"
            disabled={!hasPatient}
            onClick={() => openVideo(selectedPatient, "treatment")}
          >
            Review Sessions
          </button>
        </div>
      </div>

      {!hasPatient && (
        <p className="media-workflow-hint">
          Progress Comparison and Treatment Review require a patient to be selected first.
        </p>
      )}
    </div>
  );
}
