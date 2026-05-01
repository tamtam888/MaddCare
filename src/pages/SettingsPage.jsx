// src/pages/SettingsPage.jsx
import { useLanguage } from "../i18n/LanguageContext";
import "./SettingsPage.css";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="patients-page settings-page">
      <div className="settings-header-row">
        <h1 className="settings-title">{t('settings')}</h1>
        <p className="settings-subtitle">{t('settingsSubtitle')}</p>
      </div>

      <div className="settings-sections">

        {/* Pilot status */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h2 className="settings-card-title">{t('settingsPilotTitle')}</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsPilotMode')}</span>
              <span className="settings-badge">{t('settingsPilotActive')}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsBranch')}</span>
              <span className="settings-row-value">pilot-therapists-v1</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsVersion')}</span>
              <span className="settings-row-value">{t('settingsVersionValue')}</span>
            </div>
          </div>
        </div>

        {/* Calendar settings */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h2 className="settings-card-title">{t('settingsCalendarTitle')}</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsClinicHours')}</span>
              <span className="settings-row-value" dir="ltr">07:00 – 22:00</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsApptDuration')}</span>
              <span className="settings-row-value">{t('settingsApptDurationValue')}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsDefaultView')}</span>
              <span className="settings-row-value">{t('settingsDefaultViewValue')}</span>
            </div>
            <div className="settings-note-row">
              <span className="settings-note">{t('settingsCalendarNote')}</span>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h2 className="settings-card-title">{t('settingsLanguageTitle')}</h2>
          </div>
          <div className="settings-card-body">
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsSupportedLangs')}</span>
              <span className="settings-row-value">{t('settingsSupportedLangsValue')}</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-label">{t('settingsRtl')}</span>
              <span className="settings-row-value">{t('settingsRtlValue')}</span>
            </div>
            <div className="settings-note-row">
              <span className="settings-note">{t('settingsLanguageNote')}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
