import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getAllTherapists, getLastTherapistsSyncError } from "../therapists/therapistsStore";

const MEDIA_APP_BASE_URL =
  import.meta.env.VITE_MEDIA_APP_BASE_URL || "https://maddvideo.vercel.app";

function buildMediaUrl({ medplumPatientId, patientId }) {
  const params = new URLSearchParams();

  if (patientId) params.set("patientId", String(patientId).trim());
  if (medplumPatientId) params.set("medplumPatientId", String(medplumPatientId).trim());

  const qs = params.toString();
  return `${MEDIA_APP_BASE_URL}/patients${qs ? `?${qs}` : ""}`;
}

function buildIntakeUrl(patientId, patientName) {
  if (!patientId) return null;
  const id = String(patientId).trim();
  const params = new URLSearchParams();
  if (patientName) params.set("patientName", String(patientName).trim());
  params.set("mode", "intake");
  params.set("source", "medicalcare");
  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(id)}/intake/new?${params.toString()}`;
}

function buildVideoWorkflowUrl({ patientId, patientName, mode }) {
  const id = String(patientId || "").trim();
  if (!id) return `${MEDIA_APP_BASE_URL}/patients`;
  const params = new URLSearchParams();
  params.set("patientId", id);
  if (patientName) params.set("patientName", String(patientName).trim());
  if (mode) params.set("mode", mode);
  params.set("source", "medicalcare");
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

  const patientFromStore = useMemo(() => {
    const key = String(idNumberParam || "").trim();
    if (!key) return null;
    return patients.find((p) => String(p?.idNumber || "").trim() === key) || null;
  }, [patients, idNumberParam]);

  const [editablePatient, setEditablePatient] = useState(patientFromStore);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState(() => new Set());
  const [therapists, setTherapists] = useState([]);
  const [therapistsSyncError, setTherapistsSyncError] = useState(null);

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

  const mediaUrl = useMemo(
    () =>
      buildMediaUrl({
        medplumPatientId,
        patientId: localPatientId,
      }),
    [medplumPatientId, localPatientId]
  );

  const handleStartIntake = () => {
    const intakeUrl = buildIntakeUrl(localPatientId, patientFullName);
    if (!intakeUrl) return;
    window.open(intakeUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenMedia = () => {
    if (!mediaUrl) return;
    window.open(mediaUrl, "_blank", "noopener,noreferrer");
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
      });
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [localPatientId, patientFullName]
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
          <h2 className="section-title">Patient profile</h2>
          <div className="empty-state">Patient not found.</div>
          <button
            type="button"
            className="patients-toolbar-button"
            onClick={() => navigate("/patients")}
          >
            Back to patients list
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
    : "Edit contact details";

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
        <CollapsibleBlock title="Patient details" subtitle={detailsSubtitle} defaultOpen={false}>
          <div className="patient-details-top-row">
            <div className="details-row-inline">
              <span className="details-label">Phone</span>
              <InlineEditable
                value={editablePatient.phone || ""}
                placeholder="Add phone number"
                inputType="tel"
                onChange={(val) => updateField("phone", val)}
                className="details-value"
              />
            </div>

            <div className="details-row-inline">
              <span className="details-label">Email</span>
              <InlineEditable
                value={editablePatient.email || ""}
                placeholder="Add email"
                onChange={(val) => updateField("email", val)}
                className="details-value"
              />
            </div>

            <div className="details-row-inline">
              <span className="details-label">Address</span>
              <InlineEditable
                value={editablePatient.address || ""}
                placeholder="Street, city, country"
                onChange={(val) => updateField("address", val)}
                className="details-value"
              />
            </div>
          </div>

          <div className="status-row">
            <span className="details-label">Clinical status</span>
            <select
              className="inline-input status-select"
              value={editablePatient.clinicalStatus || ""}
              onChange={(e) => updateField("clinicalStatus", e.target.value)}
            >
              <option value="">Not Active</option>
              <option value="Active">Active</option>
              <option value="Stable">Stable</option>
              <option value="Inactive">Inactive</option>
              <option value="Disabled">Disabled</option>
              <option value="Not Active">Not Active</option>
            </select>
          </div>
        </CollapsibleBlock>

        <CollapsibleBlock title="Appointments" subtitle="Upcoming and past visits" defaultOpen={false}>
          <div className="patients-page-header-actions">
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={apptDrawer.openAdd}
            >
              <span>Add appointment</span>
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

        <CollapsibleBlock title="Treatment session" subtitle="Record, dictate and improve visit notes" defaultOpen={true}>
          <div className="patients-page-header-actions">
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={handleStartTreatment}
            >
              <span>Open Treatment</span>
            </button>
          </div>
        </CollapsibleBlock>

        <CollapsibleBlock title="Video sessions" subtitle="Intake, progress comparison and exercise review" defaultOpen={false}>
          <div className="patients-page-header-actions">
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={() => openVideoWorkflow("intake")}
            >
              <span>🎥 Intake Video</span>
            </button>
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={() => openVideoWorkflow("progress")}
            >
              <span>📊 Progress Comparison</span>
            </button>
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={() => openVideoWorkflow("exercise")}
            >
              <span>🏃 Exercise Review</span>
            </button>
          </div>
        </CollapsibleBlock>

        <CollapsibleBlock title="History" subtitle={historySubtitle} defaultOpen={false}>
          <PatientHistory
            patient={editablePatient}
            history={editablePatient.history || []}
            onChangeHistory={updateHistory}
            selectedIds={selectedHistoryIds}
            onToggleSelected={toggleHistorySelected}
          />
        </CollapsibleBlock>

        <CollapsibleBlock title="Care plan" subtitle="Goals and exercises" defaultOpen={false}>
          <CarePlanSection
            patient={editablePatient}
            onUpdatePatient={updatePatient}
            onSaveCarePlanEntry={handleSaveCarePlanEntry}
          />
        </CollapsibleBlock>

        <CollapsibleBlock title="Documents" subtitle="PDF, images and DOCX" defaultOpen={false}>
          <PatientDocuments patientKey={medplumPatientId} />
        </CollapsibleBlock>

        <CollapsibleBlock title="Reports" subtitle={reportsSubtitle} defaultOpen={false}>
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
      />
    </div>
  );
}

