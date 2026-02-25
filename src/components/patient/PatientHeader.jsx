import { Download, RefreshCw, Upload, X } from "lucide-react";
import {
  buildInitials,
  formatDobForHeader,
  getGenderClass,
  getHeaderStatusClass,
  getStatusPillClass,
} from "../../utils/patientUtils";

export default function PatientHeader({
  patient,
  medplumPatientId,
  onStartTreatment,
  onOpenMedia,
  onSyncPatient,
  onExport,
  onImportPatients,
  onClose,
}) {
  const headerClass = `patient-header-wrapper ${getHeaderStatusClass(patient)}`;
  const statusPill = getStatusPillClass(patient);
  const dobFormatted = formatDobForHeader(patient);
  const mediaEnabled = Boolean(medplumPatientId);

  const handleImportChange = (e) => {
    const file = e?.target?.files?.[0] || null;
    if (e?.target) e.target.value = "";
    if (file) onImportPatients?.(file);
  };

  return (
    <div className={headerClass}>
      <div className="patient-header-left">
        <div className={`patient-avatar-details ${getGenderClass(patient)}`}>
          {buildInitials(patient)}
        </div>

        <div className="patient-header-title-block">
          <h1 className="patient-details-name">
            {(patient?.firstName || "").trim()}{" "}
            {(patient?.lastName || "").trim()}
          </h1>

          <div className="patient-details-meta">
            <span className="meta-chip">
              <strong>ID:</strong> {patient?.idNumber || "-"}
            </span>

            <span className="meta-chip">
              <strong>DOB:</strong> <bdi dir="ltr">{dobFormatted}</bdi>
            </span>

            <span className="meta-chip">
              <strong>Gender:</strong> {patient?.gender || "Not set"}
            </span>

            <span className={statusPill}>
              {patient?.clinicalStatus || "Not Active"}
            </span>
          </div>
        </div>
      </div>

      <div className="pd-actions-grid">
        <div className="pd-actions-row">
          <button
            type="button"
            className="patients-toolbar-button"
            onClick={onStartTreatment}
          >
            <span>Start Treatment</span>
          </button>

          <button
            type="button"
            className="patients-toolbar-button"
            disabled={!mediaEnabled}
            onClick={() => {
              if (!mediaEnabled) return;
              onOpenMedia?.();
            }}
          >
            <span>Open in Media</span>
          </button>

          <button
            type="button"
            className="patients-toolbar-button"
            onClick={onSyncPatient}
          >
            <span className="patients-toolbar-button-icon">
              <RefreshCw size={16} />
            </span>
            <span>Sync Patient</span>
          </button>
        </div>

        <div className="pd-actions-row pd-actions-row-bottom">
          <button
            type="button"
            className="patients-toolbar-button"
            onClick={onExport}
          >
            <span className="patients-toolbar-button-icon">
              <Download size={16} />
            </span>
            <span>Export JSON</span>
          </button>

          <label className="patients-toolbar-button">
            <span className="patients-toolbar-button-icon">
              <Upload size={16} />
            </span>
            <span>Import</span>
            <input
              type="file"
              accept="application/json"
              className="pd-hidden-file"
              onChange={handleImportChange}
            />
          </label>

          <button
            type="button"
            className="patients-toolbar-button pd-close-btn"
            onClick={onClose}
          >
            <span className="patients-toolbar-button-icon">
              <X size={16} />
            </span>
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
