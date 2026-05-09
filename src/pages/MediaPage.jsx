import { useAuthContext } from "../hooks/useAuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useDemoMode } from "../hooks/useDemoMode";

const MEDIA_APP_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_MEDIA_APP_BASE_URL
    ? import.meta.env.VITE_MEDIA_APP_BASE_URL
    : "https://maddvideo.vercel.app";

function buildVideoUrl(patient, mode, therapistId, allPatients, lang) {
  const base = MEDIA_APP_BASE_URL;
  if (!patient) {
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    const qs = params.toString();
    return `${base}/patients${qs ? `?${qs}` : ''}`;
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
  if (lang) params.set("lang", lang);
  if (therapistId) params.set("tid", String(therapistId).trim());
  if (Array.isArray(allPatients) && allPatients.length > 0) {
    const activeIds = allPatients
      .map((p) => String(p?.idNumber || p?.id || "").trim())
      .filter(Boolean);
    if (activeIds.length > 0) params.set("activePatients", activeIds.join(","));
  }

  return `${base}/patients/${encodeURIComponent(patientId)}?${params.toString()}`;
}

function openVideo(patient, mode, therapistId, allPatients, lang) {
  const url = buildVideoUrl(patient, mode, therapistId, allPatients, lang);
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function MediaPage({ selectedPatient, patients = [] }) {
  const { therapistId } = useAuthContext();
  const { t, lang } = useLanguage();
  const isDemo = useDemoMode();
  const effectivePatient =
    selectedPatient ||
    (isDemo
      ? patients.find((p) => String(p?.idNumber || p?.id || '') === '102030401')
      : null);
  const hasPatient = Boolean(effectivePatient);
  const intakeEntry = isDemo && effectivePatient
    ? (effectivePatient.history || []).find((e) => e.id === 'hist-yael-intake-001')
    : null;
  const patientLabel = hasPatient
    ? [effectivePatient.firstName, effectivePatient.lastName]
        .filter(Boolean)
        .join(' ') || effectivePatient.idNumber
    : null;

  return (
    <div className="page-placeholder">
      <h1 className="page-placeholder-title">{t('videoSessions')}</h1>

      <p className="page-placeholder-text">
        {hasPatient
          ? `Patient: ${patientLabel} — choose a workflow below to open the video module.`
          : "Open a patient record first to launch a targeted video workflow, or open the video module directly."}
      </p>

      {intakeEntry && (
        <div className="pd-card" style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem 1.25rem 0.75rem' }}>
            <div className="history-title-line" style={{ marginBottom: '0.4rem' }}>{intakeEntry.title}</div>
            {intakeEntry.summary && (
              <p className="history-summary" style={{ margin: '0 0 0.5rem' }}>{intakeEntry.summary}</p>
            )}
            {intakeEntry.text && (
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--color-text-muted, #666)', margin: '0' }}>{intakeEntry.text}</pre>
            )}
          </div>
        </div>
      )}

      {isDemo && hasPatient && (
        <div className="demo-video-timeline">
          <div className="demo-video-timeline-header">
            <div className="demo-video-timeline-title">🎬 Video Progress Timeline</div>
            <div className="demo-video-timeline-subtitle">
              Simulated demo view showing how therapists compare movement and functional progress over time.
            </div>
          </div>

          <div className="demo-video-cards">
            <div className="demo-video-card">
              <div className="demo-video-card-top">
                <span className="demo-video-card-badge badge-baseline">Baseline</span>
                <span className="demo-video-card-date">Apr 25</span>
              </div>
              <div className="demo-video-card-icon">🎥</div>
              <div className="demo-video-card-label">Intake Video</div>
              <div className="demo-video-card-purpose">
                <span className="demo-video-card-purpose-label">Purpose:</span> baseline movement and posture assessment
              </div>
              <div className="demo-video-card-findings">
                Limited lumbar flexion, pain VAS 6/10, avoids walking
              </div>
            </div>

            <div className="demo-video-card">
              <div className="demo-video-card-top">
                <span className="demo-video-card-badge badge-session">Session 1</span>
                <span className="demo-video-card-date">Apr 28</span>
              </div>
              <div className="demo-video-card-icon">🎥</div>
              <div className="demo-video-card-label">Treatment Session</div>
              <div className="demo-video-card-purpose">
                <span className="demo-video-card-purpose-label">Purpose:</span> initial treatment and exercise instruction
              </div>
              <div className="demo-video-card-findings">
                Posture analysis, McKenzie protocol started, lumbar stabilization introduced
              </div>
            </div>

            <div className="demo-video-card">
              <div className="demo-video-card-top">
                <span className="demo-video-card-badge badge-week2">Week 2</span>
                <span className="demo-video-card-date">May 6</span>
              </div>
              <div className="demo-video-card-icon">🎥</div>
              <div className="demo-video-card-label">Progress Comparison</div>
              <div className="demo-video-card-purpose">
                <span className="demo-video-card-purpose-label">Purpose:</span> progress comparison
              </div>
              <div className="demo-video-card-findings">
                Pain VAS 2/10, lumbar ROM 75% normal, improved sitting tolerance and walking confidence
              </div>
            </div>
          </div>

          <div className="demo-video-compare">
            <div className="demo-video-compare-col demo-video-compare-before">
              <div className="demo-video-compare-col-label">Before</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Pain:</span> 6/10</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Lumbar ROM:</span> limited</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Sitting:</span> under 30 min</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Walking:</span> avoided</div>
            </div>

            <div className="demo-video-compare-arrow" aria-hidden="true">→</div>

            <div className="demo-video-compare-col demo-video-compare-after">
              <div className="demo-video-compare-col-label">After</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Pain:</span> 2/10</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Lumbar ROM:</span> 75% normal</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Sitting:</span> improving</div>
              <div className="demo-video-compare-row"><span className="demo-video-compare-metric">Walking:</span> resuming</div>
            </div>
          </div>

          <div className="demo-video-ai-insight">
            <span className="demo-video-ai-insight-label">✨ AI-assisted progress insight</span>
            <span className="demo-video-ai-insight-text">
              Video comparison suggests improved lumbar mobility, reduced pain behaviour, and better functional tolerance across the 10-day course.
            </span>
          </div>
        </div>
      )}

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
            disabled={isDemo || !hasPatient && !isDemo}
            onClick={() => !isDemo && openVideo(selectedPatient, "intake", therapistId, patients, lang)}
          >
            {isDemo ? "Demo preview" : hasPatient ? "Start Intake Video" : "Open Video Module"}
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
            disabled={isDemo || !hasPatient}
            onClick={() => !isDemo && openVideo(selectedPatient, "progress", therapistId, patients, lang)}
          >
            {isDemo ? "Demo preview" : "Compare Videos"}
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
            disabled={isDemo || !hasPatient}
            onClick={() => !isDemo && openVideo(selectedPatient, "exercise", therapistId, patients, lang)}
          >
            {isDemo ? "Demo preview" : "Review Exercises"}
          </button>
        </div>
      </div>

      {isDemo
        ? <p className="media-workflow-hint">Demo preview mode: Video recording, AI transcription, and live comparison are available in the full pilot workflow.</p>
        : !hasPatient && (
            <p className="media-workflow-hint">
              Progress Comparison and Exercise Review require a patient to be selected first. Open a patient from the Patients section, then return here.
            </p>
          )}
    </div>
  );
}
