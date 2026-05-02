import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentInputSchema, AppointmentStatus } from "./appointmentSchema";
import { toISODateTimeLocalInput, fromISODateTimeLocalInput } from "../utils/dateFormat";
import { capitalizeWords, isProbablyId, capitalizeSentences } from "../utils/textFormatters";
import "./AppointmentDrawer.css";
import { useLanguage } from "../i18n/LanguageContext";

const MEDIA_APP_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_MEDIA_APP_BASE_URL
    ? import.meta.env.VITE_MEDIA_APP_BASE_URL
    : "https://maddvideo.vercel.app";

function buildVideoUrl(patient, mode, therapistId) {
  const patientId = String(
    patient?.idNumber ?? patient?.patientId ?? patient?.id ?? ""
  ).replace(/\D/g, "");
  if (!patientId) return `${MEDIA_APP_BASE_URL}/patients`;

  const first = capitalizeWords(patient?.firstName || "");
  const last = capitalizeWords(patient?.lastName || "");
  const patientName = patient?.fullName
    ? capitalizeWords(patient.fullName)
    : `${first} ${last}`.trim();

  const params = new URLSearchParams();
  params.set("patientId", patientId);
  if (patientName) params.set("patientName", patientName);
  if (mode) params.set("mode", mode);
  params.set("source", "medicalcare");
  if (therapistId) params.set("tid", String(therapistId).trim());

  return `${MEDIA_APP_BASE_URL}/patients/${encodeURIComponent(patientId)}?${params.toString()}`;
}

function openVideo(patient, mode, therapistId) {
  const url = buildVideoUrl(patient, mode, therapistId);
  window.open(url, "_blank", "noopener,noreferrer");
}

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  return normalize(value).toLowerCase().replace(/\s+/g, " ");
}

function digitsOnly(value) {
  return normalize(value).replace(/\D/g, "");
}

function getPatientIdNumber(patient) {
  return digitsOnly(patient?.idNumber ?? patient?.patientId ?? patient?.id);
}

function getPatientName(patient) {
  if (!patient) return "";
  if (patient.fullName) return capitalizeWords(patient.fullName);

  const first = capitalizeWords(patient.firstName || "");
  const last = capitalizeWords(patient.lastName || "");
  return `${first} ${last}`.trim();
}

function getPatientLabel(patient) {
  const name = getPatientName(patient);
  const idn = getPatientIdNumber(patient);
  if (name && idn) return `${name} · ${idn}`;
  return name || idn || "Unknown patient";
}

function looksLikeId(input) {
  const raw = normalize(input);
  const d = digitsOnly(raw);
  if (!d) return false;
  const allDigits = d.length === raw.length;
  return allDigits || d.length >= 5;
}

function resolvePatient(list, input, t) {
  const raw = normalize(input);
  const d = digitsOnly(raw);

  if (!raw) return { kind: "empty", patient: null, idNumber: "", message: null };

  if (looksLikeId(raw)) {
    const match = list.find((p) => getPatientIdNumber(p) === d) || null;
    return {
      kind: "id",
      patient: match,
      idNumber: match ? getPatientIdNumber(match) : d,
      message: match ? null : t('patientNotFoundDrawer'),
    };
  }

  const q = normalizeText(raw);
  const matches = list.filter((p) => normalizeText(getPatientName(p)).includes(q));

  if (matches.length === 1) {
    const p = matches[0];
    return { kind: "name", patient: p, idNumber: getPatientIdNumber(p), message: null };
  }

  if (matches.length > 1) {
    return { kind: "ambiguous", patient: null, idNumber: "", message: t('multipleMatches') };
  }

  return { kind: "not_found", patient: null, idNumber: "", message: t('patientNotFoundDrawer') };
}

function buildSuggestions(list, query) {
  const q = normalizeText(query);
  const qDigits = digitsOnly(query);
  const hasQuery = Boolean(normalize(query));

  const filtered = hasQuery
    ? list.filter((p) => {
        const name = normalizeText(getPatientName(p));
        const idn = getPatientIdNumber(p);
        if (qDigits && (looksLikeId(query) || qDigits.length >= 3)) return idn.includes(qDigits);
        return name.includes(q);
      })
    : list;

  const uniqueById = new Map();
  for (const p of filtered) {
    const idn = getPatientIdNumber(p);
    const label = getPatientLabel(p);
    const key = idn || label;
    if (!key) continue;
    if (!uniqueById.has(key)) uniqueById.set(key, p);
  }

  return Array.from(uniqueById.values()).slice(0, 30);
}

export default function AppointmentDrawer({
  open,
  mode,
  patients = [],
  initialValues,
  onClose,
  onSave,
  onDelete,
  loading,
  isAdmin = false,
  currentTherapistId = "",
  therapistOptions = [],
  therapists = [],
}) {
  const { t } = useLanguage();
  const list = Array.isArray(patients) ? patients : [];
  const safeTherapists = Array.isArray(therapistOptions) ? therapistOptions : [];
  const activeTherapists = Array.isArray(therapists)
    ? therapists.filter((th) => th.active !== false)
    : [];

  const form = useForm({
    resolver: zodResolver(appointmentInputSchema),
    defaultValues: {
      patientId: "",
      therapistId: "",
      start: "",
      end: "",
      status: AppointmentStatus.scheduled,
      notes: "",
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  const patientIdValue = watch("patientId");
  const startValue = watch("start");
  const endValue = watch("end");
  const notesValue = watch("notes");
  const therapistIdValue = watch("therapistId");

  const [query, setQuery] = useState("");

  const resolution = useMemo(() => resolvePatient(list, query, t), [list, query, t]);
  const suggestions = useMemo(() => buildSuggestions(list, query), [list, query]);

  const datalistId = "mc-patient-datalist";

  useEffect(() => {
    if (!open) return;

    const baseTherapistId = isAdmin
      ? String(initialValues?.therapistId || "").trim()
      : String(initialValues?.therapistId || currentTherapistId || "").trim();

    reset({
      patientId: initialValues?.patientId ? digitsOnly(initialValues.patientId) : "",
      therapistId: baseTherapistId,
      start: initialValues?.start || "",
      end: initialValues?.end || "",
      status: initialValues?.status || AppointmentStatus.scheduled,
      notes: initialValues?.notes || "",
    });
  }, [open, initialValues, reset, isAdmin, currentTherapistId]);

  useEffect(() => {
    if (!open) return;

    const pid = initialValues?.patientId ? digitsOnly(initialValues.patientId) : "";
    if (pid) {
      const p = list.find((x) => getPatientIdNumber(x) === pid) || null;
      setQuery(p ? getPatientLabel(p) : pid);
      return;
    }

    setQuery("");
  }, [open, initialValues, list]);

  useEffect(() => {
    if (!open) return;

    if (!normalize(query)) {
      setValue("patientId", "", { shouldValidate: true, shouldDirty: true });
      clearErrors("patientId");
      return;
    }

    if (resolution.patient && resolution.idNumber) {
      setValue("patientId", resolution.idNumber, { shouldValidate: true, shouldDirty: true });
      clearErrors("patientId");
      return;
    }

    setValue("patientId", "", { shouldValidate: true, shouldDirty: true });

    if (resolution.message) {
      setError("patientId", { type: "manual", message: resolution.message });
    } else {
      clearErrors("patientId");
    }
  }, [open, query, resolution, setValue, setError, clearErrors]);

  useEffect(() => {
    if (!open) return;
    if (isAdmin) return;

    const locked = String(currentTherapistId || "").trim();
    if (!locked) return;

    if (String(therapistIdValue || "").trim() !== locked) {
      setValue("therapistId", locked, { shouldValidate: true, shouldDirty: true });
    }
  }, [open, isAdmin, currentTherapistId, therapistIdValue, setValue]);

  const clearPatient = async () => {
    setQuery("");
    setValue("patientId", "", { shouldValidate: true, shouldDirty: true });
    clearErrors("patientId");
    await trigger("patientId");
  };

  const handleQueryChange = (value) => {
    const raw = String(value ?? "");
    if (isProbablyId(raw)) {
      setQuery(raw);
      return;
    }
    setQuery(capitalizeWords(raw));
  };

  const handleNotesBlur = () => {
    const next = capitalizeSentences(String(notesValue || ""));
    if (next !== notesValue) {
      setValue("notes", next, { shouldDirty: true, shouldValidate: true });
    }
  };

  const submit = async (values) => {
    const pid = digitsOnly(values.patientId);

    if (!pid || !resolution.patient) {
      setError("patientId", { type: "manual", message: resolution.message || t('patientRequired') });
      return;
    }

    const therapistId = isAdmin
      ? String(values.therapistId || "").trim()
      : String(currentTherapistId || values.therapistId || "").trim();

    if (isAdmin && !therapistId) {
      setError("therapistId", { type: "manual", message: t('therapistRequired') });
      return;
    }

    await onSave({
      ...values,
      patientId: pid,
      therapistId,
      notes: capitalizeSentences(String(values.notes || "")),
    });
  };

  if (!open) return null;

  const showLinked = Boolean(resolution.patient) && Boolean(resolution.idNumber);
  const therapistsEmpty = safeTherapists.length === 0;

  return (
    <div className="mc-drawer-overlay" onMouseDown={onClose}>
      <aside className="mc-drawer" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <header className="mc-drawer-header">
          <div className="mc-drawer-titlewrap">
            <h2 className="mc-drawer-title">{mode === "edit" ? t('editAppointment') : t('addAppointment')}</h2>
            <p className="mc-drawer-subtitle">{t('scheduleManage')}</p>
          </div>

          <button type="button" className="mc-drawer-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <form className="mc-drawer-body" onSubmit={handleSubmit(submit)}>
          <div className="mc-field">
            <div className="mc-field-row">
              <label className="mc-label">{t('patient')}</label>
              {(query || patientIdValue) && (
                <button type="button" className="mc-field-clear" onClick={clearPatient}>
                  {t('clear')}
                </button>
              )}
            </div>

            <input type="hidden" {...register("patientId")} />

            <div className="mc-combobox">
              <input
                className="mc-input"
                {...{placeholder: t('typeNameOrId')}}
                value={query}
                autoComplete="off"
                list={datalistId}
                onChange={(e) => handleQueryChange(e.target.value)}
              />

              <datalist id={datalistId}>
                {suggestions.map((p) => (
                  <option key={getPatientIdNumber(p) || getPatientLabel(p)} value={getPatientLabel(p)} />
                ))}
              </datalist>

              {showLinked ? (
                <div className="mc-combobox-empty">{t('linked')}: {getPatientLabel(resolution.patient)}</div>
              ) : resolution.message ? (
                <div className="mc-combobox-empty">{resolution.message}</div>
              ) : null}
            </div>

            {errors.patientId && <p className="mc-error">{errors.patientId.type === 'manual' ? String(errors.patientId.message) : t('patientRequired')}</p>}
          </div>

          <div className="mc-grid2">
            <div className="mc-field">
              <label className="mc-label">{t('start')}</label>
              <input
                className="mc-input"
                type="datetime-local"
                lang="en-GB"
                value={toISODateTimeLocalInput(startValue)}
                onChange={(e) => setValue("start", fromISODateTimeLocalInput(e.target.value), { shouldValidate: true })}
              />
              {errors.start && <p className="mc-error">{String(errors.start.message)}</p>}
            </div>

            <div className="mc-field">
              <label className="mc-label">{t('end')}</label>
              <input
                className="mc-input"
                type="datetime-local"
                lang="en-GB"
                value={toISODateTimeLocalInput(endValue)}
                onChange={(e) => setValue("end", fromISODateTimeLocalInput(e.target.value), { shouldValidate: true })}
              />
              {errors.end && <p className="mc-error">{String(errors.end.message)}</p>}
            </div>
          </div>

          <div className="mc-grid2">
            <div className="mc-field">
              <label className="mc-label">{t('therapist')}</label>

              {therapists.length > 0 ? (
                <select
                  className="mc-input"
                  {...register("therapistId")}
                  disabled={activeTherapists.length === 0}
                >
                  <option value="">
                    {activeTherapists.length === 0 ? t('noTherapists') : t('selectTherapist')}
                  </option>
                  {activeTherapists.map((th) => (
                    <option key={th.idNumber} value={th.idNumber}>
                      {th.fullName}
                    </option>
                  ))}
                </select>
              ) : isAdmin ? (
                <select className="mc-input" {...register("therapistId", { required: true })} disabled={therapistsEmpty}>
                  <option value="">{therapistsEmpty ? t('noTherapists') : t('selectTherapist')}</option>
                  {safeTherapists.map((th) => (
                    <option key={String(th.value)} value={String(th.value)}>
                      {String(th.label)}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input className="mc-input" {...register("therapistId")} disabled />
                  <p className="mc-combobox-empty">{t('therapistsUnavailable')}</p>
                </>
              )}

              {errors.therapistId && <p className="mc-error">{errors.therapistId.type === 'manual' ? String(errors.therapistId.message) : t('therapistRequired')}</p>}
            </div>

            <div className="mc-field">
              <label className="mc-label">{t('status')}</label>
              <select className="mc-input" {...register("status")}>
                <option value={AppointmentStatus.scheduled}>{t('scheduled')}</option>
                <option value={AppointmentStatus.completed}>{t('completed')}</option>
                <option value={AppointmentStatus.cancelled}>{t('cancelled')}</option>
              </select>
            </div>
          </div>

          <div className="mc-field">
            <label className="mc-label">{t('notes')}</label>
            <textarea className="mc-textarea" rows={4} {...register("notes")} onBlur={handleNotesBlur} />
          </div>

          {showLinked && resolution.patient && (
            <div className="mc-video-section">
              <span className="mc-video-label">{t('videoWorkflow')}</span>
              <div className="mc-video-buttons">
                <button
                  type="button"
                  className="mc-button mc-button--video"
                  onClick={() => openVideo(resolution.patient, "intake", currentTherapistId)}
                  title="Open intake video for this patient"
                >
                  {t('intakeVideo')}
                </button>
                <button
                  type="button"
                  className="mc-button mc-button--video"
                  onClick={() => openVideo(resolution.patient, "progress", currentTherapistId)}
                  title="Open progress comparison for this patient"
                >
                  📊 {t('progress')}
                </button>
              </div>
            </div>
          )}

          <footer className="mc-drawer-footer">
            {mode === "edit" ? (
              <button
                type="button"
                className="mc-button mc-button--danger"
                onClick={onDelete}
                disabled={loading || isSubmitting}
              >
                {t('delete')}
              </button>
            ) : (
              <span />
            )}

            <div className="mc-drawer-footer-actions">
              <button type="button" className="mc-button" onClick={onClose}>
                {t('cancel')}
              </button>
              <button type="submit" className="mc-button mc-button--primary" disabled={loading || isSubmitting}>
                {mode === "edit" ? t('saveChanges') : t('createAppointment')}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
