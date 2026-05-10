import React, { useEffect, useMemo, useRef, useState } from "react";
import "./CarePlanSection.css";
import { useLanguage } from "../i18n/LanguageContext";
import { useDemoMode } from "../hooks/useDemoMode";
import CarePlanGoals from "./CarePlanGoals";
import CarePlanExercises from "./CarePlanExercises";
import { formatDateTimeDMY } from "../utils/dateFormat";
import { toFhirCarePlanBundle, downloadJson as downloadFhirJson } from "../utils/fhirCarePlan";

function createId(prefix) {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `${prefix}_${id}` : `${prefix}_${Date.now()}`;
}

function downloadJsonInternal(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeImportedGoals(goalsRaw) {
  if (!Array.isArray(goalsRaw)) return [];
  return goalsRaw
    .filter(Boolean)
    .map((g) => ({
      id: g?.id || createId("goal"),
      title: String(g?.title || ""),
      status: String(g?.status || "Planned"),
      targetDate: g?.targetDate || undefined,
      notes: String(g?.notes || ""),
    }))
    .filter((g) => g.title.trim().length > 0);
}

function normalizeImportedExercises(exercisesRaw) {
  if (!Array.isArray(exercisesRaw)) return [];
  return exercisesRaw
    .filter(Boolean)
    .map((x) => ({
      id: x?.id || createId("ex"),
      name: String(x?.name || ""),
      instructions: String(x?.instructions || ""),
      frequency: String(x?.frequency || ""),
      sets: typeof x?.sets === "number" ? x.sets : undefined,
      reps: typeof x?.reps === "number" ? x.reps : undefined,
      durationMin: typeof x?.durationMin === "number" ? x.durationMin : undefined,
      startDate: x?.startDate || undefined,
      endDate: x?.endDate || undefined,
    }))
    .filter((x) => x.name.trim().length > 0 && x.frequency.trim().length > 0);
}

function normalizeImportedCarePlan(obj) {
  if (!obj || typeof obj !== "object") return null;

  return {
    id: obj.id || createId("cp"),
    title: String(obj.title || "Care plan"),
    updatedAt: obj.updatedAt || new Date().toISOString(),
    goals: normalizeImportedGoals(obj.goals),
    exercises: normalizeImportedExercises(obj.exercises),
  };
}

function buildCarePlanDescription(draft, t) {
  const goalsCount = Array.isArray(draft?.goals) ? draft.goals.length : 0;
  const exercisesCount = Array.isArray(draft?.exercises) ? draft.exercises.length : 0;

  const goalsPreview = Array.isArray(draft?.goals)
    ? draft.goals
        .slice(0, 3)
        .map((g) => String(g?.title || "").trim())
        .filter(Boolean)
        .join("; ")
    : "";

  const exPreview = Array.isArray(draft?.exercises)
    ? draft.exercises
        .slice(0, 3)
        .map((x) => String(x?.name || "").trim())
        .filter(Boolean)
        .join("; ")
    : "";

  const parts = [t('goals') + ': ' + goalsCount, t('exercises') + ': ' + exercisesCount];
  if (goalsPreview) parts.push(`Goal preview: ${goalsPreview}`);
  if (exPreview) parts.push(`Exercise preview: ${exPreview}`);

  return parts.join(" | ");
}

export default function CarePlanSection({ patient, onUpdatePatient, onSaveCarePlanEntry }) {
  const fileRef = useRef(null);
  const draft = patient?.carePlanDraft || null;

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const { t } = useLanguage();
  const isDemo = useDemoMode();

  useEffect(() => {
    const onClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const meta = useMemo(() => {
    return {
      goalsCount: Array.isArray(draft?.goals) ? draft.goals.length : 0,
      exerciseCount: Array.isArray(draft?.exercises) ? draft.exercises.length : 0,
      updatedText: draft?.updatedAt ? formatDateTimeDMY(draft.updatedAt) : "",
    };
  }, [draft]);

  function updateDraft(nextDraft) {
    if (isDemo) return;
    onUpdatePatient?.({
      ...patient,
      carePlanDraft: nextDraft,
    });
  }

  function createDraft() {
    updateDraft({
      id: createId("cp"),
      title: "Care plan",
      updatedAt: new Date().toISOString(),
      goals: [],
      exercises: [],
    });
  }

  function clearDraft() {
    if (!window.confirm("Delete the current care plan draft?")) return;
    updateDraft(null);
  }

  async function onImportFile(e) {
    if (isDemo) { if (e.target) e.target.value = ""; return; }
    const file = e?.target?.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const normalized = normalizeImportedCarePlan(parsed);
      if (!normalized) throw new Error();
      updateDraft({ ...normalized, updatedAt: new Date().toISOString() });
    } catch {
      alert("Invalid care plan file.");
    } finally {
      if (e.target) e.target.value = "";
    }
  }

  function exportInternal() {
    if (!draft) return;
    const filename = `${patient?.idNumber || "patient"}_careplan.internal.json`;
    downloadJsonInternal(filename, draft);
  }

  function exportFhir() {
    if (!draft) return;

    const bundle = toFhirCarePlanBundle({
      patient,
      carePlanDraft: draft,
      includePatient: true,
    });

    const filename = `${patient?.idNumber || "patient"}_careplan.fhir.bundle.json`;
    downloadFhirJson(filename, bundle);
  }

  function onGoalsChange(nextGoals) {
    const next = {
      ...(draft || {
        id: createId("cp"),
        title: "Care plan",
        updatedAt: new Date().toISOString(),
        goals: [],
        exercises: [],
      }),
      goals: nextGoals,
      exercises: draft?.exercises || [],
      updatedAt: new Date().toISOString(),
    };
    updateDraft(next);
  }

  function onExercisesChange(nextExercises) {
    const next = {
      ...(draft || {
        id: createId("cp"),
        title: "Care plan",
        updatedAt: new Date().toISOString(),
        goals: [],
        exercises: [],
      }),
      goals: draft?.goals || [],
      exercises: nextExercises,
      updatedAt: new Date().toISOString(),
    };
    updateDraft(next);
  }

  function handleSaveCarePlan() {
    if (isDemo) return;
    if (!draft) return;
    const patientId = patient?.idNumber || "";
    if (!patientId) {
      alert("Missing patient ID.");
      return;
    }

    const entry = {
      id: draft.id || createId("cp"),
      title: String(draft.title || "Care plan"),
      name: String(draft.title || "Care plan"),
      description: buildCarePlanDescription(draft, t),
      status: "active",
      intent: "plan",
      createdAt: draft.updatedAt || new Date().toISOString(),
      date: draft.updatedAt || new Date().toISOString(),
      draft: draft,
    };

    if (typeof onSaveCarePlanEntry === "function") {
      onSaveCarePlanEntry(patientId, entry);
      alert("Care plan saved to patient history.");
      return;
    }

    alert("Save is not connected.");
  }

  return (
    <div className="careplan-section">
      <div className="careplan-actions">
        {!isDemo && (
        draft ? (
          <>
            <button type="button" className="header-chip-btn" onClick={handleSaveCarePlan}>
              {t('save')}
            </button>

            <div className="export-dropdown" ref={exportRef}>
              <button type="button" className="header-chip-btn" onClick={() => setExportOpen((v) => !v)}>
                {t('export')} ▾
              </button>

              {exportOpen && (
                <div className="export-menu">
                  <button
                    type="button"
                    className="export-menu-item"
                    onClick={() => {
                      setExportOpen(false);
                      exportInternal();
                    }}
                  >
                    {t('exportMedicalCareJson')}
                  </button>

                  <button
                    type="button"
                    className="export-menu-item"
                    onClick={() => {
                      setExportOpen(false);
                      exportFhir();
                    }}
                  >
                    {t('exportFhirBundle')}
                  </button>
                </div>
              )}
            </div>

            <label className="header-chip-btn careplan-import-label">
                {t('importCarePlan')}
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="careplan-import-input"
                onChange={onImportFile}
               
              />
            </label>

            <button type="button" className="header-chip-btn careplan-danger" onClick={clearDraft}>
              {t('deleteDraft')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="header-chip-btn" onClick={createDraft}>
              {t('createCarePlan')}
            </button>

            <label className="header-chip-btn careplan-import-label">
                {t('importCarePlan')}
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="careplan-import-input"
                onChange={onImportFile}
               
              />
            </label>
          </>
        ))}
      </div>

      {draft ? (
        <>
          <div className="careplan-summary">
            <div className="careplan-summary-item">
              <span className="careplan-summary-label">{t('goals')}</span>
              <span className="careplan-summary-value">{meta.goalsCount}</span>
            </div>

            <div className="careplan-summary-item">
              <span className="careplan-summary-label">{t('exercises')}</span>
              <span className="careplan-summary-value">{meta.exerciseCount}</span>
            </div>

            <div className="careplan-summary-item">
              <span className="careplan-summary-label">{t('lastUpdate')}</span>
              <span className="careplan-summary-value">
                <bdi dir="ltr">{meta.updatedText || "—"}</bdi>
              </span>
            </div>
          </div>

          <CarePlanGoals value={draft.goals || []} onChange={onGoalsChange} />
          <CarePlanExercises value={draft.exercises || []} onChange={onExercisesChange} />
        </>
      ) : (
        <div className="careplan-empty">{t('noCarePlanDraft')}</div>
      )}
    </div>
  );
}