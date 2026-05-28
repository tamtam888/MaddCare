import { Download, RefreshCw, Upload, X, FileText } from "lucide-react";
import {
  buildInitials,
  formatDobForHeader,
  getGenderClass,
  getHeaderStatusClass,
  getStatusPillClass,
} from "../../utils/patientUtils";
import { useLanguage } from "../../i18n/LanguageContext";

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
  const headerClass = `patient-header-wrapper ${getHeaderStatusClass(patient)}`;
  const statusPill = getStatusPillClass(patient);
  const dobFormatted = formatDobForHeader(patient);
  const mediaEnabled = Boolean(medplumPatientId);

  const videoConsentGiven = Boolean(patient?.videoConsentGiven);
  const videoConsentDateFormatted = patient?.videoConsentDate
    ? new Date(patient.videoConsentDate).toLocaleDateString("en-GB")
    : null;

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

            <span className={`meta-chip${!videoConsentGiven ? " meta-chip--consent-pending" : ""}`}>
              📹 {videoConsentGiven
                ? `${t('videoConsentChipGiven')} ${videoConsentDateFormatted ?? t('dateNotRecorded')}`
                : t('videoConsentChipRequired')}
            </span>
          </div>
        </div>
      </div>

      <div className="pd-actions-grid">
        <div className="pd-actions-row">
          <button
            type="button"
            className="patients-toolbar-button"
            disabled={!videoConsentGiven}
            title={!videoConsentGiven ? t('videoConsentRequired') : undefined}
            onClick={onStartIntake}
          >
            <span className="patients-toolbar-button-icon">
              <FileText size={16} />
            </span>
            <span>{t('startIntake')}</span>
          </button>

          <button
            type="button"
            className="patients-toolbar-button"
            onClick={onStartTreatment}
          >
            <span>{t('startTreatment')}</span>
          </button>

          <button
            type="button"
            className="patients-toolbar-button"
            disabled={!mediaEnabled || !videoConsentGiven}
            title={!videoConsentGiven ? t('videoConsentRequired') : undefined}
            onClick={() => {
              if (!mediaEnabled || !videoConsentGiven) return;
              onOpenMedia?.();
            }}
          >
            <span>{t('openInMedia')}</span>
          </button>
        </div>

        {!videoConsentGiven && (
          <p className="privacy-inline-notice">
            {t('videoConsentRequired')}
          </p>
        )}

        <p className="privacy-inline-notice intake-privacy-notice">{t('intakePrivacyNotice')}</p>

        <div className="pd-actions-row">
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
        </div>

        <div className="pd-actions-row pd-actions-row-bottom">
          <button
            type="button"
            className="patients-toolbar-button pd-close-btn"
            onClick={onClose}
          >
            <span className="patients-toolbar-button-icon">
              <X size={16} />
            </span>
            <span>{t('close')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}