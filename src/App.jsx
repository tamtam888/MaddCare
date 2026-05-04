import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { get, set } from "idb-keyval";
import { usePatients } from "./hooks/usePatients";
import { LanguageProvider } from "./i18n/LanguageContext";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import PatientDetailsPage from "./pages/PatientDetailsPage";
import CarePlansPage from "./pages/CarePlansPage";
import CalendarTreatmentsPage from "./pages/CalendarTreatmentsPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import TreatmentPage from "./pages/TreatmentPage";
import MediaPage from "./pages/MediaPage";
import SettingsPage from "./pages/SettingsPage";
import { medplum } from "./medplumClient";
import Sidebar from "./components/Sidebar";
import { useTrialStatus } from "./hooks/useTrialStatus";
import TrialExpired from "./components/TrialExpired";
import "./App.css";

const LOGGED_IN_KEY = "mc_logged_in";
const THERAPISTS_KEY = "mc_therapists_v1";

function isLoggedIn() {
  try {
    return localStorage.getItem(LOGGED_IN_KEY) === "1";
  } catch {
    return false;
  }
}

function normalizeString(v) {
  return String(v ?? "").trim();
}

function digitsOnly(v) {
  return normalizeString(v).replace(/\D/g, "");
}

function pickTherapistName(t) {
  const fullName = normalizeString(t?.fullName);
  if (fullName) return fullName;
  const name = normalizeString(t?.name);
  if (name) return name;
  const first = normalizeString(t?.firstName);
  const last = normalizeString(t?.lastName);
  return `${first} ${last}`.trim();
}

function buildPractitioner(t) {
  const idNumber = digitsOnly(t?.idNumber || t?.id);
  const nameText = pickTherapistName(t);

  const telecom = [];
  const phone = normalizeString(t?.phone);
  const email = normalizeString(t?.email);
  if (phone) telecom.push({ system: "phone", value: phone, use: "work" });
  if (email) telecom.push({ system: "email", value: email, use: "work" });

  return {
    resourceType: "Practitioner",
    active: Boolean(t?.active ?? true),
    identifier: idNumber ? [{ system: "urn:medicalcare:therapist-id-number", value: idNumber }] : [],
    name: nameText ? [{ text: nameText }] : undefined,
    telecom: telecom.length ? telecom : undefined,
  };
}

async function findPractitionerIdByIdentifier(idNumber) {
  const idDigits = digitsOnly(idNumber);
  if (!idDigits) return "";
  const res = await medplum.search("Practitioner", {
    identifier: `urn:medicalcare:therapist-id-number|${idDigits}`,
    _count: "1",
  });
  return normalizeString(res?.entry?.[0]?.resource?.id);
}

async function readTherapistsIdb() {
  const raw = await get(THERAPISTS_KEY);
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

async function writeTherapistsIdb(items) {
  await set(THERAPISTS_KEY, Array.isArray(items) ? items.filter(Boolean) : []);
}

function SimplePage({ title, text }) {
  return (
    <div className="page-placeholder">
      <h1 className="page-placeholder-title">{title}</h1>
      <p className="page-placeholder-text">{text}</p>
    </div>
  );
}

function App() {
  const location = useLocation();
  const loggedIn = isLoggedIn();

  const patientsState = usePatients();
  const { patients } = patientsState;

  const [medplumProfile, setMedplumProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const { isExpired: trialExpired, daysLeft: trialDaysLeft } = useTrialStatus();

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          await medplum.processCode(code);
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, "", cleanUrl);
        }

        if (!medplum.isAuthenticated()) {
          if (!cancelled) setMedplumProfile(null);
          return;
        }

        try {
          const profile = medplum.getProfile();
          if (!cancelled) setMedplumProfile(profile || { ok: true });
        } catch {
          if (!cancelled) setMedplumProfile({ ok: true });
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Medplum auth init failed:", error);
        if (!cancelled) setMedplumProfile(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    initAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnectMedplum = async () => {
    try {
      if (medplum.isAuthenticated()) {
        const confirmDisconnect = window.confirm("Are you sure you want to disconnect from Medplum?");
        if (confirmDisconnect) {
          await medplum.signOut();
          setMedplumProfile(null);
        }
      } else {
        medplum.signInWithRedirect();
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Connect/disconnect failed:", error);
      alert("Failed to connect to Medplum. Please try again.");
    }
  };

  const handleSyncAllTherapistsToMedplum = useCallback(async (maybeItems) => {
    if (!medplum.isAuthenticated()) {
      throw new Error("Not connected to Medplum.");
    }

    const list = Array.isArray(maybeItems) && maybeItems.length ? maybeItems : await readTherapistsIdb();
    if (!list.length) return;

    const next = list.map((x) => ({ ...x }));

    for (let i = 0; i < next.length; i++) {
      const t = next[i];
      const idNumber = digitsOnly(t?.idNumber || t?.id);
      if (!idNumber) continue;

      const resource = buildPractitioner({ ...t, idNumber });
      const existingId = normalizeString(t?.remoteId) || (await findPractitionerIdByIdentifier(idNumber));

      const saved = existingId
        ? await medplum.updateResource({ ...resource, id: existingId })
        : await medplum.createResource(resource);

      next[i] = { ...t, remoteId: saved?.id || existingId || null };
    }

    await writeTherapistsIdb(next);
  }, []);

  const handleSaveTranscriptionFromTreatment = useCallback(
    (payload) => {
      const patientId = String(payload?.patientId || "").trim();
      const text = String(payload?.text || "").trim();
      const audioId = payload?.audioId ?? null;
      if (!patientId) return;
      patientsState.handleSaveTranscription(patientId, text, audioId);
    },
    [patientsState]
  );

  if (!authReady) {
    return <div className="app-loading">Loading MedicalCare...</div>;
  }

  const RequireAuth = ({ element }) => {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;
    return element;
  };

  const RedirectRoot = () => <Navigate to={loggedIn ? "/dashboard" : "/login"} replace />;

  const isLoginRoute = location.pathname === "/login";

  return (
    <LanguageProvider>
    {trialExpired && <TrialExpired />}
    <div className="app-shell">
      {loggedIn && !isLoginRoute ? <Sidebar /> : null}

      <div className="app-main-area">
        {loggedIn && !isLoginRoute && trialDaysLeft !== null && trialDaysLeft <= 7 && !trialExpired ? (
          <div className="trial-warning-banner">
            ⏳ Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left — contact us to continue your subscription.
          </div>
        ) : null}

        {loggedIn && !isLoginRoute ? (
          <header className="app-header">
            <div className="app-header-right">
              <button type="button" className="header-icon-button" title="Settings">
                ⚙️
              </button>

              <button type="button" className="primary-button medplum-header-button" onClick={handleConnectMedplum}>
                {medplumProfile ? "Medplum: Connected" : "Connect to Medplum"}
              </button>
            </div>
          </header>
        ) : null}

        <main className="app-main">
          <Routes>
            <Route path="/" element={<RedirectRoot />} />

            <Route path="/login" element={loggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

            <Route path="/dashboard" element={<RequireAuth element={<DashboardPage patients={patients} />} />} />

            <Route
              path="/users"
              element={
                <RequireAuth
                  element={<UsersPage handleSyncAllTherapistsToMedplum={handleSyncAllTherapistsToMedplum} />}
                />
              }
            />

            <Route
              path="/patients"
              element={
                <RequireAuth
                  element={
                    <PatientsPage
                      patients={patientsState.patients}
                      onAddPatient={patientsState.handleAddPatient}
                      onUpdatePatient={patientsState.handleUpdatePatient}
                      onDeletePatient={patientsState.handleDeletePatient}
                      onImportPatients={patientsState.handleImportPatients}
                      onExportPatients={patientsState.handleExportPatients}
                      onSelectPatient={patientsState.handleSelectPatient}
                      handleSyncAllToMedplum={patientsState.handleSyncAllToMedplum}
                    />
                  }
                />
              }
            />

            <Route
              path="/patients/:idNumber"
              element={
                <RequireAuth
                  element={
                    <PatientDetailsPage
                      patients={patientsState.patients}
                      selectedPatient={patientsState.selectedPatient}
                      selectedPatientFullName={patientsState.selectedPatientFullName}
                      handleSelectPatient={patientsState.handleSelectPatient}
                      handleAddReport={patientsState.handleAddReport}
                      handleDeleteReport={patientsState.handleDeleteReport}
                      handleSaveTranscription={patientsState.handleSaveTranscription}
                      handleEditPatient={patientsState.handleEditPatient}
                      onUpdatePatient={patientsState.handleUpdatePatientInline}
                      handleExportPatients={patientsState.handleExportPatients}
                      handleImportPatients={patientsState.handleImportPatients}
                      handleSaveReportEntry={patientsState.handleSaveReportEntry}
                      handleSyncPatientToMedplum={patientsState.handleSyncPatientToMedplum}
                      handleSaveCarePlanEntry={patientsState.handleSaveCarePlanEntry}
                    />
                  }
                />
              }
            />

            <Route
              path="/treatment"
              element={
                <RequireAuth
                  element={
                    <TreatmentPage
                      patients={patientsState.patients}
                      onSaveTranscription={handleSaveTranscriptionFromTreatment}
                    />
                  }
                />
              }
            />

            <Route
              path="/media"
              element={
                <RequireAuth
                  element={
                    <MediaPage selectedPatient={patientsState.selectedPatient} patients={patientsState.patients} />
                  }
                />
              }
            />

            <Route
              path="/data/care-plan"
              element={
                <RequireAuth
                  element={
                    <CarePlansPage
                      patients={patientsState.patients}
                      onUpdatePatient={patientsState.handleUpdatePatientInline}
                    />
                  }
                />
              }
            />

            <Route
              path="/data/appointment"
              element={
                <RequireAuth
                  element={
                    <CalendarTreatmentsPage
                      medplumProfile={medplumProfile}
                      patients={patientsState.patients}
                    />
                  }
                />
              }
            />

            <Route
              path="/settings"
              element={<RequireAuth element={<SettingsPage />} />}
            />

            <Route path="*" element={<Navigate to={loggedIn ? "/patients" : "/login"} replace />} />
          </Routes>
        </main>

        {loggedIn && !isLoginRoute ? (
          <footer className="app-footer" aria-label="App footer">
            <span className="app-footer-text">© 2026 MedicalCare. All rights reserved.</span>
            <span className="app-footer-sep">•</span>
            <span className="app-footer-text">by TK</span>
          </footer>
        ) : null}
      </div>
    </div>
    </LanguageProvider>
  );
}

export default App;