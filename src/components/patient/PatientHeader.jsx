import { Download, RefreshCw, Upload, X, FileText } from "lucide-react";
import {
  buildInitials,
  formatDobForHeader,
  getGenderClass,
  getHeaderStatusClass,
  getStatusPillClass,
} from "../../utils/patientUtils";
import { useLanguage } from "../../i18n/LanguageContext";
import { useDemoMode } from "../../hooks/useDemoMode";

const SHOW_MEDPLUM_UI = import.meta.env.VITE_SHOW_MEDPLUM_UI !== "false";

export default function PatientHeader({
  patient,
  medplumPatientId,
  onStartTreatment,
  onStartIntake,
  onOpenMedia,
  onSyncPatient,
  onExport,
  onImportPatients,
  onClose,
}) {
  const { t } = useLanguage();
  const isDemo = useDemoMode();
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
              <strong>{t('labelId')}:</strong> {patient?.idNumber || "-"}
            </span>

            <span className="meta-chip">
              <strong>{t('labelDob')}:</strong> <bdi dir="ltr">{dobFormatted}</bdi>
            </span>

            <span className="meta-chip">
              <strong>{t('labelGender')}:</strong> {patient?.gender || t('notSet')}
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
            onClick={onStartIntake}
          >
            <span className="patients-toolbar-button-icon">
              <FileText size={16} />
            </span>
            <span>{isDemo ? t('viewIntake') : t('startIntake')}</span>
          </button>

          <button
            type="button"
            className="patients-toolbar-button"
            disabled={isDemo}
            onClick={onStartTreatment}
          >
            <span>{t('startTreatment')}</span>
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
            <span>{t('openInMedia')}</span>
          </button>
        </div>

        <div className="pd-actions-row pd-actions-row-close">
          <button
            type="button"
            className="patients-toolbar-button"
            onClick={onExport}
          >
            <span className="patients-toolbar-button-icon">
              <Download size={16} />
            </span>
            <span>{t('exportJson')}</span>
          </button>

          <label className="patients-toolbar-button">
            <span className="patients-toolbar-button-icon">
              <Upload size={16} />
            </span>
            <span>{t('import')}</span>
            <input
              type="file"
              accept="application/json"
              className="pd-hidden-file"
              onChange={handleImportChange}
            />
          </label>

          {SHOW_MEDPLUM_UI && (
            <button
              type="button"
              className="patients-toolbar-button"
              onClick={onSyncPatient}
            >
              <span className="patients-toolbar-button-icon">
                <RefreshCw size={16} />
              </span>
              <span>{t('syncPatient')}</span>
            </button>
          )}

          <button
            type="button"
            className="patients-toolbar-button pd-close-btn"
            onClick={onClose}
          >
            <span className="patients-toolbar-button-icon">
              <X size={16} />
            </span>
            <span style={{ fontWeight: 700 }}>{t('close')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}