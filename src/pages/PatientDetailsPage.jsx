import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import "./PatientDetailsPage.css";

import CollapsibleBlock from "../components/patient/CollapsibleBlock";
import InlineEditable from "../components/patient/InlineEditable";
import PatientHeader from "../components/patient/PatientHeader";

import AttachReports from "../components/AttachReports";
import CarePlanSection from "../components/CarePlanSection";
import PatientAppointments from "../components/PatientAppointments";
import PatientDocuments from "../components/PatientDocuments";
import PatientHistory from "../components/PatientHistory";

import AppointmentDrawer from "../appointments/AppointmentDrawer";
import { useAppointmentDrawer } from "../appointments/useAppointmentDrawer";
import { useAppointments } from "../appointments/useAppointments";

import { buildFullName, pickMedplumPatientId } from "../utils/patientUtils";
import { getLatestIntakeForPatient } from "../lib/intakeService";
import { getAllTherapists, getLastTherapistsSyncError } from "../therapists/therapistsStore";
import { useAuthContext } from "../hooks/useAuthContext";
import { formatDateDMY } from '../utils/dateFormat';

const MEDIA_APP_BASE_URL =
  import.meta.env.VITE_MEDIA_APP_BASE_URL || "https://maddvideo.vercel.app";

function buildMediaUrl({ medplumPatientId, patientId, lang }) {
  const params = new URLSearchParams();

  if (patientId) params.set("patientId", String(patientId).trim());
  if (medplumPatientId) params.set("medplumPatientId", String(medplumPatientId).trim());
  if (lang) params.set("lang", lang);

  const qs = params.toString();
  return `${MEDIA_APP_BASE_URL}/patients${qs ? `?${qs}` : ""}`;
}

function buildIntakeUrl(patientId, patientName, therapistId, activeIds = [], lang, discipline = '') {
  if (!patientId) return null;
  const id = String(patientId).trim();
  const params = new URLSearchParams();
  if (patientName) params.set("patientName", String(patientName).trim());
  params.set("mode", "intake");
  params.set("source", "medicalcare");
  if (lang) params.set("lang", lang);
  if (therapistId) params.set("tid", String(therapistId).trim());
  if (activeIds.length > 0) params.set("activePatients", activeIds.join(','));
  if (discipline) params.set("discipline", discipline);
  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(id)}/intake/new?${params.toString()}`;
}

function buildVideoWorkflowUrl({ patientId, patientName, mode, therapistId, activeIds = [], lang }) {
  const id = String(patientId || "").trim();
  if (!id) return `${MEDIA_APP_BASE_URL}/patients`;
  const params = new URLSearchParams();
  params.set("patientId", id);
  if (patientName) params.set("patientName", String(patientName).trim());
  if (mode) params.set("mode", mode);
  params.set("source", "medicalcare");
  if (lang) params.set("lang", lang);
  if (therapistId) params.set("tid", String(therapistId).trim());
  if (activeIds.length > 0) params.set("activePatients", activeIds.join(','));
  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(id)}?${params.toString()}`;
}

export default function PatientDetailsPage({
  patients = [],
  onUpdatePatient,
  handleSelectPatient,
  handleSaveTranscription,
  handleDeleteReport,
  handleExportPatients,
  handleImportPatients,
  handleSaveReportEntry,
  handleSyncPatientToMedplum,
  handleSaveCarePlanEntry,
}) {
  const navigate = useNavigate();
  const { idNumber: idNumberParam = "" } = useParams();
  const { therapistId, isAdmin } = useAuthContext();
  const { t, lang } = useLanguage();

  const patientFromStore = useMemo(() => {
    const key = String(idNumberParam || "").trim();
    if (!key) return null;
    return patients.find((p) => String(p?.idNumber || "").trim() === key) || null;
  }, [patients, idNumberParam]);

  const [editablePatient, setEditablePatient] = useState(patientFromStore);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState(() => new Set());
  const [therapists, setTherapists] = useState([]);
  const [therapistsSyncError, setTherapistsSyncError] = useState(null);
  const [latestIntake, setLatestIntake] = useState(null);

  useEffect(() => {
    getAllTherapists().then((list) => {
      setTherapists(list);
      setTherapistsSyncError(getLastTherapistsSyncError());
    });
  }, []);

  useEffect(() => {
    setEditablePatient(patientFromStore);
  }, [patientFromStore]);

  useEffect(() => {
    setSelectedHistoryIds(new Set());
  }, [editablePatient?.idNumber]);

  const toggleHistorySelected = (entryId) => {
    const id = String(entryId || "");
    if (!id) return;
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelectedHistory = () => setSelectedHistoryIds(new Set());

  const selectedHistoryEntries = useMemo(() => {
    const all = Array.isArray(editablePatient?.history) ? editablePatient.history : [];
    if (!selectedHistoryIds.size) return [];
    return all.filter((e) => selectedHistoryIds.has(String(e?.id || "")));
  }, [editablePatient?.history, selectedHistoryIds]);

  const updatePatient = (updated) => {
    setEditablePatient(updated);
    onUpdatePatient?.(updated);
  };

  const updateField = (field, value) => updatePatient({ ...editablePatient, [field]: value });

  const updateHistory = (nextHistory) => {
    const safe = Array.isArray(nextHistory) ? nextHistory : [];
    updatePatient({ ...editablePatient, history: safe });
  };

  const handleStartTreatment = () => {
    const pid = String(editablePatient?.idNumber || "").trim();
    if (!pid) return;
    navigate(`/treatment?patientId=${encodeURIComponent(pid)}`);
  };

  const handleClickSyncPatient = () => {
    const patientId = editablePatient?.idNumber;
    if (!patientId) return;
    if (typeof handleSyncPatientToMedplum === "function") {
      handleSyncPatientToMedplum(patientId);
    }
  };

  const handleExportClick = () => {
    if (typeof handleExportPatients === "function") handleExportPatients();
  };

  const onSaveTranscriptionLocal = useCallback(
    (payloadOrPatientId, maybeText, maybeAudioId) => {
      const patientId = editablePatient?.idNumber;
      if (!patientId) return;

      let text = "";
      let audioId = null;

      if (typeof payloadOrPatientId === "object" && payloadOrPatientId) {
        text = String(payloadOrPatientId.text || "").trim();
        audioId = payloadOrPatientId.audioId || null;
      } else {
        text = String(maybeText || "").trim();
        audioId = maybeAudioId || null;
      }

      if (!text && !audioId) return;

      handleSelectPatient?.(patientId);
      if (typeof handleSaveTranscription === "function") {
        handleSaveTranscription(patientId, text, audioId || null);
      }
    },
    [editablePatient?.idNumber, handleSelectPatient, handleSaveTranscription]
  );

  const medplumPatientId = useMemo(
    () => (editablePatient ? pickMedplumPatientId(editablePatient) : ""),
    [editablePatient]
  );

  const localPatientId = useMemo(
    () => String(editablePatient?.idNumber || editablePatient?.id || "").trim(),
    [editablePatient]
  );

  useEffect(() => {
    if (!localPatientId || !therapistId) return;
    getLatestIntakeForPatient(localPatientId, therapistId, isAdmin)
      .then(setLatestIntake)
      .catch(() => {});
  }, [localPatientId, therapistId]);

  // All patient IDs visible to the current therapist -- sent to MaddVideo
  // so it can filter out patients deleted in MedicalCare.
  const activePatientIds = useMemo(
    () => patients.map((p) => String(p.idNumber || p.id || '')).filter(Boolean),
    [patients]
  );

  const mediaUrl = useMemo(
    () =>
      buildMediaUrl({
        medplumPatientId,
        patientId: localPatientId,
        lang,
      }),
    [medplumPatientId, localPatientId, lang]
  );

  const handleStartIntake = () => {
    const discipline = editablePatient?.primaryCareDiscipline || '';
    const intakeUrl = buildIntakeUrl(localPatientId, patientFullName, therapistId, activePatientIds, lang, discipline);
    if (!intakeUrl) return;
    window.open(intakeUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenMedia = () => {
    if (!localPatientId) return;
    const url = buildVideoWorkflowUrl({
      patientId: localPatientId,
      patientName: patientFullName,
      therapistId,
      activeIds: activePatientIds,
      lang,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const patientFullName = useMemo(
    () => buildFullName(editablePatient) || "",
    [editablePatient]
  );

  const openVideoWorkflow = useCallback(
    (mode) => {
      const url = buildVideoWorkflowUrl({
        patientId: localPatientId,
        patientName: patientFullName,
        mode,
        therapistId,
        activeIds: activePatientIds,
        lang,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [localPatientId, patientFullName, therapistId, activePatientIds, lang]
  );

  const { addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const apptDrawer = useAppointmentDrawer(editablePatient?.idNumber, {
    addAppointment,
    updateAppointment,
    deleteAppointment,
  });

  if (!editablePatient) {
    return (
      <div className="patient-details-page">
        <div className="patient-card">
          <h2 className="section-title">{t('patientProfile')}</h2>
          <div className="empty-state">{t('patientNotFound')}</div>
          <button
            type="button"
            className="patients-toolbar-button"
            onClick={() => navigate("/patients")}
          >
            {t('backToPatientsList')}
          </button>
        </div>
      </div>
    );
  }

  const historyCount = Array.isArray(editablePatient.history) ? editablePatient.history.length : 0;
  const selectedCount = selectedHistoryEntries.length;
  const historySubtitle = `${selectedCount} selected • ${historyCount} entries`;
  const reportsUploadedCount = Array.isArray(editablePatient.reports) ? editablePatient.reports.length : 0;
  const reportsSubtitle = `${selectedCount} selected • ${reportsUploadedCount} uploaded`;

  const detailsSubtitleParts = [];
  if (String(editablePatient.phone || "").trim()) detailsSubtitleParts.push("phone");
  if (String(editablePatient.email || "").trim()) detailsSubtitleParts.push("email");
  if (String(editablePatient.address || "").trim()) detailsSubtitleParts.push("address");
  const detailsSubtitle = detailsSubtitleParts.length
    ? detailsSubtitleParts.join(" • ")
    : t('editContactDetails');

  return (
    <div className="patient-details-page">
      <PatientHeader
        patient={editablePatient}
        medplumPatientId={medplumPatientId || localPatientId}
        onStartTreatment={handleStartTreatment}
        onStartIntake={handleStartIntake}
        onOpenMedia={handleOpenMedia}
        onSyncPatient={handleClickSyncPatient}
        onExport={handleExportClick}
        onImportPatients={handleImportPatients}
        onClose={() => navigate("/patients")}
      />

      <div className="patient-sections-stack">
        <CollapsibleBlock title={t('patientDetailsSection')} subtitle={detailsSubtitle} defaultOpen={false}>
          <div className="patient-details-top-row">
            <div className="details-row-inline">
              <span className="details-label">{t('labelPhone')}</span>
              <InlineEditable
                value={editablePatient.phone || ""}
                placeholder={t('phAddPhone')}
                inputType="tel"
                onChange={(val) => updateField("phone", val)}
                className="details-value"
              />
            </div>

            <div className="details-row-inline">
              <span className="details-label">{t('labelEmail')}</span>
              <InlineEditable
                value={editablePatient.email || ""}
                placeholder={t('phAddEmail')}
                onChange={(val) => updateField("email", val)}
                className="details-value"
              />
            </div>

            <div className="details-row-inline">
              <span className="details-label">{t('labelAddress')}</span>
              <InlineEditable
                value={editablePatient.address || ""}
                placeholder={t('phStreetCity')}
                onChange={(val) => updateField("address", val)}
                className="details-value"
              />
            </div>
          </div>

          <div className="status-row">
            <span className="details-label">{t('clinicalStatus')}</span>
            <select
              className="inline-input status-select"
              value={["Active", "Stable", "Disabled", "Not Active"].includes(editablePatient.clinicalStatus) ? editablePatient.clinicalStatus : "Not Active"}
              onChange={(e) => updateField("clinicalStatus", e.target.value)}
            >
              <option value="Active">{t('active')}</option>
              <option value="Not Active">{t('notActive')}</option>
              <option value="Stable">{t('stable')}</option>
              <option value="Disabled">{t('disabled')}</option>
            </select>
          </div>

          <div className="status-row">
            <span className="details-label">{t('labelCareDiscipline')}</span>
            <select
              className="inline-input status-select"
              value={editablePatient.primaryCareDiscipline || ""}
              onChange={(e) => updateField("primaryCareDiscipline", e.target.value)}
            >
              <option value="">{t('disciplineNotSet')}</option>
              <option value="physiotherapy">{t('disciplinePhysiotherapy')}</option>
              <option value="hydrotherapy">{t('disciplineHydrotherapy')}</option>
              <option value="combined">{t('disciplineCombined')}</option>
            </select>
          </div>

          <div className="status-row">
            <span className="details-label">{t('intakeSummaryTitle')}</span>
            {latestIntake ? (
              <span className="intake-summary-meta">
                {formatDateDMY(latestIntake.session_date)}
                {" · "}
                <span className={`intake-status-badge intake-status-${latestIntake.status}`}>
                  {latestIntake.status === 'complete' ? t('intakeStatusComplete') : t('intakeStatusDraft')}
                </span>
              </span>
            ) : (
              <span className="details-value-muted">{t('noIntakeRecorded')}</span>
            )}
          </div>
        </CollapsibleBlock>

        <CollapsibleBlock title={t('appointments')} subtitle={t('upcomingAndPast')} defaultOpen={false}>
          <div className="patients-page-header-actions">
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={apptDrawer.openAdd}
            >
              <span>{t('addAppointment')}</span>
            </button>
          </div>

          {therapistsSyncError && (
            <p className="empty-state">{therapistsSyncError}</p>
          )}

          <PatientAppointments
            patient={editablePatient}
            patientFullName={buildFullName(editablePatient)}
            isAdmin={false}
            onOpenAppointment={apptDrawer.openEdit}
          />
        </CollapsibleBlock>

        <CollapsibleBlock title={t('treatmentSession')} subtitle={t('recordDictateImprove')} defaultOpen={false}>
          <div className="patients-page-header-actions">
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={handleStartTreatment}
            >
              <span>{t('openTreatment')}</span>
            </button>
          </div>
        </CollapsibleBlock>

        <CollapsibleBlock title={t('videoSessions')} subtitle={t('videoSessionsSubtitle')} defaultOpen={false}>
          <div className="patients-page-header-actions">
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={() => openVideoWorkflow("intake")}
            >
              <span>{t('intakeVideo')}</span>
            </button>
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={() => openVideoWorkflow("progress")}
            >
              <span>{t('progressComparison')}</span>
            </button>
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={() => openVideoWorkflow("exercise")}
            >
              <span>{t('exerciseReview')}</span>
            </button>
          </div>
        </CollapsibleBlock>

        <CollapsibleBlock title={t('historyTitle')} subtitle={historySubtitle} defaultOpen={false}>
          <PatientHistory
            patient={editablePatient}
            history={editablePatient.history || []}
            onChangeHistory={updateHistory}
            selectedIds={selectedHistoryIds}
            onToggleSelected={toggleHistorySelected}
          />
        </CollapsibleBlock>

        <CollapsibleBlock title={t('carePlanTitle')} subtitle={t('goalsAndExercises')} defaultOpen={false}>
          <CarePlanSection
            patient={editablePatient}
            onUpdatePatient={updatePatient}
            onSaveCarePlanEntry={handleSaveCarePlanEntry}
          />
        </CollapsibleBlock>

        <CollapsibleBlock title={t('documentsTitle')} subtitle={t('documentsSubtitle')} defaultOpen={false}>
          <PatientDocuments patientKey={medplumPatientId} />
        </CollapsibleBlock>

        <CollapsibleBlock title={t('reportsTitle')} subtitle={reportsSubtitle} defaultOpen={false}>
          <AttachReports
            patient={editablePatient}
            patientId={editablePatient.idNumber}
            existingReports={editablePatient.reports || []}
            onDeleteReport={handleDeleteReport}
            selectedEntries={selectedHistoryEntries}
            onClearSelected={clearSelectedHistory}
            totalHistoryCount={historyCount}
            medplumPatientId={medplumPatientId}
            onSaveReportEntry={(entry) => {
              const patientId = editablePatient?.idNumber;
              if (!patientId) return;

              handleSelectPatient?.(patientId);

              if (typeof handleSaveReportEntry === "function") {
                handleSaveReportEntry(patientId, entry);
                return;
              }

              const current = Array.isArray(editablePatient.history) ? editablePatient.history : [];
              const existingIndex = current.findIndex(
                (x) => String(x?.id || "") === String(entry?.id || "")
              );
              const next =
                existingIndex >= 0
                  ? current.map((x, idx) => (idx === existingIndex ? entry : x))
                  : [entry, ...current];
              updateHistory(next);
            }}
          />
        </CollapsibleBlock>

      {isAdmin && (
        <CollapsibleBlock title={t('sharedAccess')} subtitle={t('sharedAccessSubtitle')} defaultOpen={false}>
          <div className="details-row-inline">
            <span className="details-label">{t('addTherapist')}</span>
            <select
              className="inline-input"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const current = Array.isArray(editablePatient.allowedTherapists)
                  ? editablePatient.allowedTherapists
                  : [];
                if (current.includes(id)) return;
                updatePatient({ ...editablePatient, allowedTherapists: [...current, id] });
                e.target.value = "";
              }}
            >
              <option value="">-- select therapist --</option>
              {therapists
                .filter((t) => t.idNumber !== editablePatient.therapistId)
                .map((t) => (
                  <option key={t.idNumber} value={t.idNumber}>
                    {t.fullName} ({t.username})
                  </option>
                ))}
            </select>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            {Array.isArray(editablePatient.allowedTherapists) &&
            editablePatient.allowedTherapists.length > 0 ? (
              editablePatient.allowedTherapists.map((tid) => {
                const t = therapists.find((x) => x.idNumber === tid);
                return (
                  <div key={tid} className="details-row-inline" style={{ gap: "0.5rem" }}>
                    <span className="details-value">
                      {t ? `${t.fullName} (${t.username})` : tid}
                    </span>
                    <button
                      type="button"
                      className="patients-toolbar-button"
                      onClick={() => {
                        const next = editablePatient.allowedTherapists.filter((x) => x !== tid);
                        updatePatient({ ...editablePatient, allowedTherapists: next });
                      }}
                    >
                      {t('removeTherapist')}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="empty-state">{t('noAdditionalTherapists')}</p>
            )}
          </div>
        </CollapsibleBlock>
      )}
      </div>

      <AppointmentDrawer
        open={apptDrawer.open}
        mode={apptDrawer.mode}
        patients={patients}
        therapists={therapists}
        initialValues={apptDrawer.initialValues}
        onClose={apptDrawer.close}
        onSave={apptDrawer.save}
        onDelete={apptDrawer.remove}
        loading={apptDrawer.saving}
        currentTherapistId={therapistId}
      />
    </div>
  );
}

