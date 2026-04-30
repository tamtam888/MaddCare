import React, { useMemo, useState } from "react";
import "./CarePlanExercises.css";
import { formatDateDMY, fromISODateInput, toISODateInput } from "../utils/dateFormat";
import { useLanguage } from "../i18n/LanguageContext";

function toNumberOrUndefined(v) {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function createId(prefix) {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `${prefix}_${id}` : `${prefix}_${Date.now()}`;
}

const emptyDraft = {
  name: "",
  instructions: "",
  frequency: "",
  sets: "",
  reps: "",
  durationMin: "",
  startDate: "",
  endDate: "",
};

export default function CarePlanExercises({ value = [], onChange }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);

  const isEditing = Boolean(editingId);

  const sorted = useMemo(() => {
    const arr = Array.isArray(value) ? value : [];
    return [...arr].sort((a, b) => {
      const as = String(a?.startDate || "");
      const bs = String(b?.startDate || "");
      return as.localeCompare(bs);
    });
  }, [value]);

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft);
    setIsOpen(true);
  }

  function openEdit(ex) {
    setEditingId(ex.id);
    setDraft({
      name: ex.name || "",
      instructions: ex.instructions || "",
      frequency: ex.frequency || "",
      sets: ex.sets ?? "",
      reps: ex.reps ?? "",
      durationMin: ex.durationMin ?? "",
      startDate: ex.startDate ? toISODateInput(ex.startDate) : "",
      endDate: ex.endDate ? toISODateInput(ex.endDate) : "",
    });
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function remove(id) {
    const next = (value || []).filter((x) => x?.id !== id);
    onChange(next);
  }

  function validate(d) {
    if (!String(d.name || "").trim()) return "Exercise name is required.";
    if (!String(d.frequency || "").trim()) return "Frequency is required.";
    return null;
  }

  function save() {
    const err = validate(draft);
    if (err) {
      alert(err);
      return;
    }

    const payload = {
      name: String(draft.name || "").trim(),
      instructions: String(draft.instructions || ""),
      frequency: String(draft.frequency || "").trim(),
      sets: toNumberOrUndefined(draft.sets),
      reps: toNumberOrUndefined(draft.reps),
      durationMin: toNumberOrUndefined(draft.durationMin),
      startDate: draft.startDate ? fromISODateInput(draft.startDate) : undefined,
      endDate: draft.endDate ? fromISODateInput(draft.endDate) : undefined,
    };

    if (isEditing) {
      const next = (value || []).map((x) => (x?.id === editingId ? { ...x, ...payload } : x));
      onChange(next);
      close();
      return;
    }

    const next = [
      ...(value || []),
      {
        id: createId("ex"),
        ...payload,
      },
    ];

    onChange(next);
    close();
  }

  return (
    <div className="careplan-exercises">
      <div className="careplan-exercises-header">
        <div className="careplan-exercises-title">{t('exercises')}</div>
        <button type="button" className="header-chip-btn" onClick={openAdd}>
          {"+ " + t('addExercise')}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="careplan-empty">{t('noExercisesYet')}</div>
      ) : (
        <div className="careplan-exercises-list">
          {sorted.map((ex) => {
            const start = ex.startDate ? formatDateDMY(ex.startDate) : "";
            const end = ex.endDate ? formatDateDMY(ex.endDate) : "";
            const range = start || end ? `${start || "—"} → ${end || "—"}` : "";

            return (
              <div className="careplan-exercise-item" key={ex.id}>
                <div className="careplan-exercise-main">
                  <div className="careplan-exercise-name">{ex.name}</div>

                  <div className="careplan-exercise-meta">
                    <span className="careplan-pill">{ex.frequency}</span>
                    {typeof ex.sets === "number" && <span className="careplan-pill">{t('exerciseSets') + ': ' + ex.sets}</span>}
                    {typeof ex.reps === "number" && <span className="careplan-pill">{t('exerciseReps') + ': ' + ex.reps}</span>}
                    {typeof ex.durationMin === "number" && (
                      <span className="careplan-pill">{t('exerciseDuration') + ': ' + ex.durationMin}</span>
                    )}
                    {range && (
                      <span className="careplan-pill">
                        <bdi dir="ltr">{range}</bdi>
                      </span>
                    )}
                  </div>

                  {ex.instructions ? <div className="careplan-exercise-instructions">{ex.instructions}</div> : null}
                </div>

                <div className="careplan-exercise-actions">
                  <button type="button" className="careplan-action-btn" onClick={() => openEdit(ex)}>
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    className="careplan-action-btn careplan-action-danger"
                    onClick={() => remove(ex.id)}
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOpen ? (
        <div className="careplan-modal-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}>
          <div className="careplan-modal">
            <div className="careplan-modal-header">
              <div className="careplan-modal-title">{isEditing ? t('editExercise') : t('addExercise')}</div>
              <button type="button" className="careplan-modal-close" onClick={close}>
                ✕
              </button>
            </div>

            <div className="careplan-form">
              <label className="careplan-field">
                <span className="careplan-label">{t('labelName') + ' *'}</span>
                <input
                  className="inline-input"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder={t('exerciseNamePlaceholder')}
                />
              </label>

              <label className="careplan-field">
                <span className="careplan-label">{t('labelFrequency') + ' *'}</span>
                <input
                  className="inline-input"
                  value={draft.frequency}
                  onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
                  placeholder='e.g. "3x/week"'
                />
              </label>

              <label className="careplan-field">
                <span className="careplan-label">{t('labelInstructions')}</span>
                <textarea
                  className="careplan-textarea"
                  value={draft.instructions}
                  onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
                  rows={4}
                  placeholder={t('exerciseInstructionsPlaceholder')}
                />
              </label>

              <div className="careplan-grid-3">
                <label className="careplan-field">
                  <span className="careplan-label">{t('exerciseSets')}</span>
                  <input
                    className="inline-input"
                    inputMode="numeric"
                    value={draft.sets}
                    onChange={(e) => setDraft((d) => ({ ...d, sets: e.target.value }))}
                    placeholder="e.g. 3"
                  />
                </label>

                <label className="careplan-field">
                  <span className="careplan-label">{t('exerciseReps')}</span>
                  <input
                    className="inline-input"
                    inputMode="numeric"
                    value={draft.reps}
                    onChange={(e) => setDraft((d) => ({ ...d, reps: e.target.value }))}
                    placeholder="e.g. 10"
                  />
                </label>

                <label className="careplan-field">
                  <span className="careplan-label">{t('exerciseDuration')}</span>
                  <input
                    className="inline-input"
                    inputMode="numeric"
                    value={draft.durationMin}
                    onChange={(e) => setDraft((d) => ({ ...d, durationMin: e.target.value }))}
                    placeholder="e.g. 20"
                  />
                </label>
              </div>

              <div className="careplan-grid-2">
                <label className="careplan-field">
                  <span className="careplan-label">{t('exerciseStartDate')}</span>
                  <input
                    className="inline-input"
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                  />
                </label>

                <label className="careplan-field">
                  <span className="careplan-label">{t('exerciseEndDate')}</span>
                  <input
                    className="inline-input"
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                  />
                </label>
              </div>

              <div className="careplan-form-actions">
                <button type="button" className="header-chip-btn" onClick={close}>
                  {t('