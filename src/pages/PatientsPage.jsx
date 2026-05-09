import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { Upload, Download, Plus, RefreshCw } from "lucide-react";
import PatientList from "../components/PatientList";
import PatientForm from "../components/PatientForm";
import "./PatientsPage.css";
import { useLanguage } from "../i18n/LanguageContext";
import { useDemoMode, DEMO_READONLY_MSG } from "../hooks/useDemoMode";

const MEDIA_APP_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_MEDIA_APP_BASE_URL
    ? import.meta.env.VITE_MEDIA_APP_BASE_URL
    : "https://maddvideo.vercel.app";

const SHOW_MEDPLUM_UI = import.meta.env.VITE_SHOW_MEDPLUM_UI !== "false";

function openIntakeForPatient(patient, therapistId, allPatients = [], lang) {
  const patientId = patient?.idNumber || patient?.id || patient?.medplumId;
  if (!patientId) return;
  const id = String(patientId).trim();
  const patientName = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ");
  const params = new URLSearchParams();
  params.set("patientId", id);
  if (patientName) params.set("patientName", patientName);
  params.set("mode", "intake");
  params.set("source", "medicalcare");
  if (lang) params.set("lang", lang);
  if (therapistId) params.set("tid", String(therapistId).trim());
  const activeIds = Array.from(new Set(
    [...allPatients, patient]
      .map((p) => String(p?.idNumber || p?.id || "").trim())
      .filter(Boolean)
  ));
  if (activeIds.length > 0) params.set("activePatients", activeIds.join(","));
  const url = `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(id)}/intake/new?${params.toString()}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function toDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function buildFullName(p) {
  const first = String(p?.firstName || "").trim();
  const last = String(p?.lastName || "").trim();
  return `${first} ${last}`.trim();
}

function PatientsPage(props) {
  const {
    patients = [],
    onAddPatient,
    onUpdatePatient,
    onDeletePatient,
    onImportPatients,
    onExportPatients,
    onSelectPatient,
    handleAddPatient,
    handleUpdatePatientInline,
    handleDeletePatient,
    handleImportPatients,
    handleExportPatients,
    handleSelectPatient,
    handleSyncAllToMedplum,
  } = props;

  const { therapistId } = useAuthContext();
  const { t, lang } = useLanguage();
  const isDemo = useDemoMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  function callAddPatient(patient) {
    if (typeof handleAddPatient === "function") {
      handleAddPatient(patient);
      return;
    }
    if (typeof onAddPatient === "function") {
      onAddPatient(patient);
    }
  }

  function callUpdatePatient(patient) {
    const id = patient?.idNumber || patient?.id || patient?.medplumId || null;

    if (typeof handleUpdatePatientInline === "function") {
      if (handleUpdatePatientInline.length >= 2) {
        handleUpdatePatientInline(id, patient);
      } else {
        handleUpdatePatientInline(patient);
      }
      return;
    }

    if (typeof onUpdatePatient === "function") {
      if (onUpdatePatient.length >= 2) {
        onUpdatePatient(id, patient);
      } else {
        onUpdatePatient(patient);
      }
    }
  }

  function callDeletePatient(patient) {
    if (isDemo) return;
    const id = patient?.idNumber || patient?.id || patient?.medplumId || null;

    if (typeof handleDeletePatient === "function") {
      if (handleDeletePatient.length >= 2) {
        handleDeletePatient(id, patient);
      } else {
        handleDeletePatient(id ?? patient);
      }
      return;
    }

    if (typeof onDeletePatient === "function") {
      if (onDeletePatient.length >= 2) {
        onDeletePatient(id, patient);
      } else {
        onDeletePatient(id ?? patient);
      }
    }
  }

  function callSelectPatient(patient) {
    if (typeof handleSelectPatient === "function") {
      handleSelectPatient(patient);
    } else if (typeof onSelectPatient === "function") {
      onSelectPatient(patient);
    }

    const id = patient?.idNumber || patient?.id || null;

    if (id) {
      navigate(`/patients/${encodeURIComponent(id)}`);
    }
  }

  function callImportPatients(file) {
    if (!file) return;
    if (typeof handleImportPatients === "function") {
      handleImportPatients(file);
      return;
    }
    if (typeof onImportPatients === "function") {
      onImportPatients(file);
    }
  }

  function callExportPatients() {
    if (typeof handleExportPatients === "function") {
      handleExportPatients();
      return;
    }
    if (typeof onExportPatients === "function") {
      onExportPatients();
    }
  }

  const sortedPatients = useMemo(() => {
    const list = Array.isArray(patients) ? [...patients] : [];

    list.sort((a, b) => {
      const aDigits = toDigits(a?.idNumber || a?.id || "");
      const bDigits = toDigits(b?.idNumber || b?.id || "");

      const aHas = aDigits.length > 0;
      const bHas = bDigits.length > 0;

      if (aHas && bHas) {
        const aNum = Number(aDigits);
        const bNum = Number(bDigits);
        if (aNum !== bNum) return aNum - bNum;
      } else if (aHas && !bHas) {
        return -1;
      } else if (!aHas && bHas) {
        return 1;
      }

      const aName = buildFullName(a).toLowerCase();
      const bName = buildFullName(b).toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    });

    return list;
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const termDigits = toDigits(searchTerm);

    if (!term) return sortedPatients;

    return sortedPatients.filter((p) => {
      const fullName = buildFullName(p).toLowerCase();
      const idRaw = String(p?.idNumber || p?.id || "").toLowerCase();
      const idDigits = toDigits(p?.idNumber || p?.id || "");

      const conditionsText = Array.isArray(p?.conditions)
        ? p.conditions.join(" ").toLowerCase()
        : String(p?.conditions || "").toLowerCase();

      const matchName = fullName.includes(term);
      const matchIdText = idRaw.includes(term);
      const matchIdDigits = termDigits.length > 0 && idDigits.includes(termDigits);
      const matchConditions = conditionsText.includes(term);

      return matchName || matchIdText || matchIdDigits || matchConditions;
    });
  }, [sortedPatients, searchTerm]);

  function handleClickAdd() {
    if (isDemo) return;
    setEditingPatient(null);
    setShowForm(true);
  }

  function handleEditPatient(patient) {
    if (isDemo) return;
    setEditingPatient(patient);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingPatient(null);
  }

  function handleSubmitForm(prepared) {
    const isNew = !editingPatient;
    if (editingPatient) {
      callUpdatePatient(prepared);
    } else {
      callAddPatient(prepared);
    }
    setShowForm(false);
    setEditingPatient(null);
    // Auto-open intake form only for newly added patients
    if (isNew) {
      openIntakeForPatient(prepared, therapistId, patients, lang);
    }
  }

  function handleClickImport() {
    if (isDemo) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      callImportPatients(file);
    }
  }

  function handleClickSyncAll() {
    if (isDemo) return;
    if (typeof handleSyncAllToMedplum === "function") handleSyncAllToMedplum();
  }

  return (
    <div className="patients-page">
      <div className="patients-page-header-row">
        <div className="patients-page-header-text">
          <h1 className="patients-page-title">{t('patientDirectory')}</h1>
          <p className="patients-page-subtitle">{t('managePatientsSubtitle')}</p>
        </div>

        <div className="patients-page-header-actions">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="application/json"
            onChange={handleFileChange}
          />

          {!isDemo && (
          <button type="button" className="patients-toolbar-button" onClick={handleClickImport}>
            <span className="patients-toolbar-button-icon">
              <Upload size={16} />
            </span>
            <span>{t('import')}</span>
          </button>
          )}

          {!isDemo && (
          <button type="button" className="patients-toolbar-button" onClick={callExportPatients}>
            <span className="patients-toolbar-button-icon">
              <Download size={16} />
            </span>
            <span>{t('exportJson')}</span>
          </button>
          )}

          {SHOW_MEDPLUM_UI && (
            <button type="button" className="patients-toolbar-button" onClick={handleClickSyncAll} disabled={isDemo}>
              <span className="patients-toolbar-button-icon">
                <RefreshCw size={16} />
              </span>
              <span>{t('syncAll')}</span>
            </button>
          )}

          <button type="button" className="patients-add-button" onClick={handleClickAdd} disabled={isDemo}>
            <span className="patients-toolbar-button-icon patients-add-button-icon">
              <Plus size={16} />
            </span>
            <span>{t('addPatient')}</span>
          </button>
        </div>
      </div>

      {isDemo && (
        <div className="demo-readonly-banner">
          {DEMO_READONLY_MSG[lang] || DEMO_READONLY_MSG.en}
        </div>
      )}

      {isDemo && (
        <div className="demo-ai-banner">
          <div className="demo-ai-banner-title">🚀 AI-Powered Clinical Assistant</div>
          <ul className="demo-ai-banner-list">
            <li>Generate treatment summaries automatically</li>
            <li>AI-powered reports from patient data</li>
            <li>Smart clinical insights for therapists</li>
          </ul>
          <div className="demo-ai-banner-footer">👉 Try it in Reports</div>
        </div>
      )}

      <div className="patients-search-wrapper">
        <div className="patients-search-icon">🔍</div>
        <input
          className="patients-search-input"
          type="text"
          placeholder={t('searchPatientsPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <PatientList
        patients={filteredPatients}
        onEditPatient={handleEditPatient}
        onDeletePatient={callDeletePatient}
        onViewPatient={callSelectPatient}
      />

      <PatientForm
        isOpen={showForm}
        initialValues={editingPatient}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}

export default PatientsPage;