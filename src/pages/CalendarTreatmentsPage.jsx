// src/pages/CalendarTreatmentsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Bell, RefreshCw } from "lucide-react";

import { useAppointments } from "../appointments/useAppointments";
import AppointmentDrawer from "../appointments/AppointmentDrawer";
import { getAllTherapists } from "../therapists/therapistsStore";
import { useAuthContext } from "../hooks/useAuthContext";
import { medplum } from "../medplumClient";
import {
  computeAndStoreNotifications,
  createUserKey,
  dismissNotifications,
  fetchNotificationsFromMedplum,
  getDismissedIds,
  getStoredNotifications,
  pushNotificationsToMedplum,
  subscribeNotifications,
} from "../notifications/notificationsStore";
import "./CalendarTreatmentsPage.css";
import { useLanguage } from "../i18n/LanguageContext";

const CLINIC_START_TIME = "07:00:00";
const CLINIC_END_TIME = "22:00:00";

function normalizeId(value) {
  return String(value ?? "").trim();
}

function digitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

function timeToMinutes(hhmmss) {
  const parts = String(hhmmss || "00:00:00").split(":");
  const hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  const h = Number.isFinite(hh) ? hh : 0;
  const m = Number.isFinite(mm) ? mm : 0;
  return h * 60 + m;
}

const CLINIC_START_MIN = timeToMinutes(CLINIC_START_TIME);
const CLINIC_END_MIN = timeToMinutes(CLINIC_END_TIME);

function dateToMinutes(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

function isWithinClinicHours(date) {
  const mins = dateToMinutes(date);
  return mins >= CLINIC_START_MIN && mins < CLINIC_END_MIN;
}

function isRangeWithinClinicHours(start, end) {
  if (!start || !end) return false;
  const s = new Date(start);
  const e = new Date(end);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) return false;
  if (e.getTime() <= s.getTime()) return false;

  const startOk = isWithinClinicHours(s);
  const endMinus1ms = new Date(e.getTime() - 1);
  const endOk = isWithinClinicHours(endMinus1ms);

  return startOk && endOk;
}

function getPatientFullName(patient) {
  if (!patient) return "";
  if (patient.fullName) return String(patient.fullName).trim();
  const first = String(patient.firstName || "").trim();
  const last = String(patient.lastName || "").trim();
  return `${first} ${last}`.trim();
}

function getPatientId(patient, fallbackId) {
  return String(patient?.idNumber || patient?.id || patient?.patientId || fallbackId || "")
    .replace(/\D/g, "")
    .trim();
}

function buildEventTitle(patient, appointment, t) {
  const name = getPatientFullName(patient);
  const id = getPatientId(patient, appointment?.patientId);
  if (name && id) return `${name} · ${id}`;
  if (name) return name;
  if (id) return `Patient · ${id}`;
  return t('appointment');
}

function hashToIndex(str, modulo) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return modulo > 0 ? h % modulo : 0;
}

function toMs(value) {
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isFinite(t) ? t : NaN;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  const s1 = toMs(aStart);
  const e1 = toMs(aEnd);
  const s2 = toMs(bStart);
  const e2 = toMs(bEnd);
  if (![s1, e1, s2, e2].every(Number.isFinite)) return false;
  if (e1 <= s1 || e2 <= s2) return false;
  return s2 < e1 && e2 > s1;
}

function sameDay(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (!Number.isFinite(d1.getTime()) || !Number.isFinite(d2.getTime())) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatDMY(dateLike) {
  const d = new Date(dateLike);
  if (!Number.isFinite(d.getTime())) return "";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function hasTherapistConflict(allAppointments, candidate, ignoreId = null) {
  const therapistId = String(candidate?.therapistId || "").trim();
  if (!therapistId) return false;

  return (allAppointments || []).some((a) => {
    if (!a) return false;
    if (ignoreId && String(a.id) === String(ignoreId)) return false;
    if (String(a.therapistId || "").trim() !== therapistId) return false;
    return overlaps(a.start, a.end, candidate.start, candidate.end);
  });
}

function getTherapistNameById(map, id, t) {
  const key = String(id || "").trim();
  if (!key) return t('anotherTherapist');
  return map.get(key) || key;
}

function checkPatientSameDayAndOverlap({ allAppointments, candidate, ignoreId = null, therapistNameById, t }) {
  const patientId = digitsOnly(candidate?.patientId);
  const therapistId = String(candidate?.therapistId || "").trim();
  if (!patientId || !therapistId) return { ok: true, warned: false };

  const others = (allAppointments || []).filter((a) => {
    if (!a) return false;
    if (ignoreId && String(a.id) === String(ignoreId)) return false;
    const aPid = digitsOnly(a.patientId);
    if (!aPid || aPid !== patientId) return false;
    const aTid = String(a.therapistId || "").trim();
    return aTid && aTid !== therapistId;
  });

  if (!others.length) return { ok: true, warned: false };

  const overlapHit = others.find((a) => overlaps(a.start, a.end, candidate.start, candidate.end));
  if (overlapHit) {
    const otherName = getTherapistNameById(therapistNameById, overlapHit.therapistId, t);
    return {
      ok: false,
      warned: false,
      reason: t('sameTimePatientConflict').replace('{{therapist}}', otherName),
    };
  }

  const sameDayHit = others.find((a) => sameDay(a.start, candidate.start));
  if (sameDayHit) {
    const dmy = formatDMY(candidate.start);
    const otherName = getTherapistNameById(therapistNameById, sameDayHit.therapistId, t);
    const msg = t('sameDayPatientWarning').replace('{{date}}', dmy).replace('{{therapist}}', otherName);
    const ok = window.confirm(msg);
    if (!ok) return { ok: false, warned: true, reason: t('cancelledByUser') };
    return { ok: true, warned: true };
  }

  return { ok: true, warned: false };
}

async function syncAppointmentToMedplum(appointment, therapistMap) {
  if (!medplum.isAuthenticated()) throw new Error("Not connected to Medplum");

  const therapistRemoteId = therapistMap.get(String(appointment.therapistId || "").trim());

  const resource = {
    resourceType: "Appointment",
    status: appointment.status || "booked",
    start: appointment.start,
    end: appointment.end,
    participant: [
      {
        actor: {
          reference: therapistRemoteId
            ? `Practitioner/${therapistRemoteId}`
            : `Practitioner/${appointment.therapistId}`,
        },
        status: "accepted",
      },
    ],
    comment: appointment.notes || undefined,
  };

  const remoteId = String(appointment.remoteId || "").trim();
  if (remoteId) {
    const updated = await medplum.updateResource({ ...resource, id: remoteId });
    return updated.id;
  }
  const created = await medplum.createResource(resource);
  return created.id;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isToday(dateLike) {
  const d = new Date(dateLike);
  if (!Number.isFinite(d.getTime())) return false;
  return startOfDay(d).getTime() === startOfDay(new Date()).getTime();
}

function formatHM(dateLike) {
  const d = new Date(dateLike);
  if (!Number.isFinite(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeStatus(value) {
  const s = String(value || "").toLowerCase().trim();
  if (s === "cancel" || s === "canceled" || s === "cancelled") return "cancelled";
  if (s === "completed" || s === "complete" || s === "done") return "completed";
  if (s === "scheduled" || s === "casual" || s === "booked") return "neutral";
  if (!s) return "neutral";
  return s;
}

export default function CalendarTreatmentsPage({ medplumProfile, patients = [] }) {
  const navigate = useNavigate();
  const { isAdmin, therapistId } = useAuthContext();
  const { t } = useLanguage();
  const { appointments, loading, addAppointment, updateAppointment, deleteAppointment, refresh } = useAppointments();

  const [therapists, setTherapists] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const reloadRef = useRef(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifWrapRef = useRef(null);

  const userKey = useMemo(() => createUserKey({ isAdmin, therapistId }), [isAdmin, therapistId]);

  const [dismissedNotifs, setDismissedNotifs] = useState(() => getDismissedIds(userKey));
  const [notifTick, setNotifTick] = useState(0);
  const [medplumNotifs, setMedplumNotifs] = useState([]);

  const clickTimersRef = useRef(new Map());
  const lastClickRef = useRef({ id: null, ts: 0 });

  const reloadTherapists = async () => {
    try {
      const list = await getAllTherapists();
      setTherapists(Array.isArray(list) ? list : []);
    } catch {
      setTherapists([]);
    }
  };

  reloadRef.current = reloadTherapists;

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!notifOpen) return;
      const wrap = notifWrapRef.current;
      if (!wrap) return;
      if (wrap.contains(e.target)) return;
      setNotifOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setNotifOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notifOpen]);

  useEffect(() => {
    setDismissedNotifs(getDismissedIds(userKey));
  }, [userKey]);

  useEffect(() => {
    const unsub = subscribeNotifications(() => setNotifTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const list = await getAllTherapists();
        if (!alive) return;
        setTherapists(Array.isArray(list) ? list : []);
      } catch {
        if (!alive) return;
        setTherapists([]);
      }
    })();

    const onFocus = () => reloadRef.current?.();
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const therapistNameById = useMemo(() => {
    const map = new Map();
    for (const t of Array.isArray(therapists) ? therapists : []) {
      const id = String(t?.id || "").trim();
      if (!id) continue;
      map.set(id, String(t?.name || t?.fullName || id).trim() || id);
    }
    return map;
  }, [therapists]);

  const therapistRemoteIdMap = useMemo(() => {
    const map = new Map();
    for (const t of Array.isArray(therapists) ? therapists : []) {
      const id = String(t?.id || "").trim();
      const remoteId = String(t?.remoteId || "").trim();
      if (id && remoteId) map.set(id, remoteId);
    }
    return map;
  }, [therapists]);

  const therapistOptions = useMemo(() => {
    return (Array.isArray(therapists) ? therapists : [])
      .filter((t) => t && t.active !== false)
      .map((t) => ({
        value: String(t.id).trim(),
        label: String(t.name || t.fullName || t.id).trim(),
      }))
      .filter((t) => t.value)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [therapists]);

  const currentTherapistId = useMemo(() => {
    if (isAdmin) return "";
    return normalizeId(therapistId);
  }, [isAdmin, therapistId]);

  const visibleAppointments = useMemo(() => {
    if (isAdmin) return appointments || [];
    const tid = String(currentTherapistId || "").trim();
    if (!tid) return [];
    return (appointments || []).filter((a) => String(a.therapistId || "").trim() === tid);
  }, [appointments, isAdmin, currentTherapistId]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("create");
  const [activeId, setActiveId] = useState(null);
  const [initialValues, setInitialValues] = useState(null);

  const patientsById = useMemo(() => {
    const map = new Map();
    for (const p of Array.isArray(patients) ? patients : []) {
      const key = String(p?.idNumber || p?.id || p?.patientId || "").replace(/\D/g, "").trim();
      if (key) map.set(key, p);
    }
    return map;
  }, [patients]);

  const events = useMemo(() => {
    return (visibleAppointments || []).map((a) => {
      const patientKey = String(a?.patientId || "").replace(/\D/g, "").trim();
      const patient = patientsById.get(patientKey) || null;

      const therapistKey = String(a?.therapistId || currentTherapistId || "").trim();
      const therapistColorIndex = hashToIndex(therapistKey, 6);

      return {
        id: a.id,
        title: buildEventTitle(patient, a, t),
        start: a.start,
        end: a.end,
        extendedProps: {
          appointment: a,
          patient,
          therapistColorIndex,
        },
      };
    });
  }, [visibleAppointments, patientsById, currentTherapistId, t]);

  const getLabel = useMemo(() => {
    return (apptLike) => {
      const pid = digitsOnly(apptLike?.patientId);
      const patient = pid ? patientsById.get(pid) : null;
      return buildEventTitle(patient, apptLike, t);
    };
  }, [patientsById, t]);

  useEffect(() => {
    if (!appointments) return;

    computeAndStoreNotifications({
      isAdmin,
      therapistId: currentTherapistId,
      userKey,
      appointments,
      getLabel,
    });

    setNotifTick((t) => t + 1);
  }, [appointments, isAdmin, currentTherapistId, userKey, getLabel]);

  useEffect(() => {
    if (isAdmin) return;
    if (!medplum.isAuthenticated()) return;

    const rid =
      String(medplumProfile?.practitioner?.id || medplumProfile?.profile?.id || medplumProfile?.id || "").trim() || "";

    if (!rid) return;

    (async () => {
      const list = await fetchNotificationsFromMedplum({ medplum, recipientPractitionerId: rid, count: 50 });
      setMedplumNotifs(Array.isArray(list) ? list : []);
    })();
  }, [isAdmin, medplumProfile, notifTick]);

  const openCreateDrawer = (values) => {
    reloadRef.current?.();
    setDrawerMode("create");
    setActiveId(null);
    setInitialValues(values);
    setDrawerOpen(true);
  };

  const openEditDrawer = (appointment) => {
    if (!appointment) return;
    if (!isAdmin && String(appointment.therapistId || "").trim() !== String(currentTherapistId || "").trim()) return;

    reloadRef.current?.();
    setDrawerMode("edit");
    setActiveId(appointment.id);
    setInitialValues({
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      start: appointment.start,
      end: appointment.end,
      status: appointment.status,
      notes: appointment.notes,
    });
    setDrawerOpen(true);
  };

  const getDefaultSlot = () => {
    const now = new Date();
    const start = new Date(now);
    start.setSeconds(0, 0);

    if (start.getHours() < 9) start.setHours(9, 0, 0, 0);
    else if (start.getHours() >= 18) {
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
    } else {
      start.setHours(start.getHours() + 1, 0, 0, 0);
    }

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    return { start, end };
  };

  const handleAddClick = () => {
    const { start, end } = getDefaultSlot();

    if (!isRangeWithinClinicHours(start, end)) {
      alert(t('clinicHoursError'));
      return;
    }

    openCreateDrawer({
      patientId: "",
      therapistId: isAdmin ? "" : String(currentTherapistId || "").trim(),
      start: start.toISOString(),
      end: end.toISOString(),
      status: "scheduled",
      notes: "",
    });
  };

  const handleSelect = (selectInfo) => {
    if (!isRangeWithinClinicHours(selectInfo.start, selectInfo.end)) return;

    openCreateDrawer({
      patientId: "",
      therapistId: isAdmin ? "" : String(currentTherapistId || "").trim(),
      start: selectInfo.start.toISOString(),
      end: selectInfo.end.toISOString(),
      status: "scheduled",
      notes: "",
    });
  };

  const handleEventDrop = async (info) => {
    const appt = info.event.extendedProps?.appointment;
    const nextStart = info.event.start;
    const nextEnd = info.event.end || info.event.start;

    if (!isRangeWithinClinicHours(nextStart, nextEnd)) {
      info.revert();
      return;
    }

    const therapistIdLocal = String(appt?.therapistId || (isAdmin ? "" : currentTherapistId) || "").trim();
    if (!therapistIdLocal) {
      info.revert();
      return;
    }

    const candidate = {
      therapistId: therapistIdLocal,
      patientId: digitsOnly(appt?.patientId),
      start: nextStart.toISOString(),
      end: nextEnd.toISOString(),
    };

    if (hasTherapistConflict(appointments, candidate, info.event.id)) {
      alert(t('doubleBookingError'));
      info.revert();
      return;
    }

    const patientCheck = checkPatientSameDayAndOverlap({
      allAppointments: appointments,
      candidate,
      ignoreId: info.event.id,
      therapistNameById,
      t,
    });

    if (!patientCheck.ok) {
      if (patientCheck.reason && patientCheck.reason !== t('cancelledByUser')) alert(patientCheck.reason);
      info.revert();
      return;
    }

    try {
      await updateAppointment(info.event.id, { start: candidate.start, end: candidate.end, pendingSync: true });
    } catch (e) {
      info.revert();
      if (e?.message) alert(String(e.message));
    }
  };

  const handleEventResize = async (info) => {
    const appt = info.event.extendedProps?.appointment;
    const nextStart = info.event.start;
    const nextEnd = info.event.end || info.event.start;

    if (!isRangeWithinClinicHours(nextStart, nextEnd)) {
      info.revert();
      return;
    }

    const therapistIdLocal = String(appt?.therapistId || (isAdmin ? "" : currentTherapistId) || "").trim();
    if (!therapistIdLocal) {
      info.revert();
      return;
    }

    const candidate = {
      therapistId: therapistIdLocal,
      patientId: digitsOnly(appt?.patientId),
      start: nextStart.toISOString(),
      end: nextEnd.toISOString(),
    };

    if (hasTherapistConflict(appointments, candidate, info.event.id)) {
      alert(t('doubleBookingError'));
      info.revert();
      return;
    }

    const patientCheck = checkPatientSameDayAndOverlap({
      allAppointments: appointments,
      candidate,
      ignoreId: info.event.id,
      therapistNameById,
      t,
    });

    if (!patientCheck.ok) {
      if (patientCheck.reason && patientCheck.reason !== t('cancelledByUser')) alert(patientCheck.reason);
      info.revert();
      return;
    }

    try {
      await updateAppointment(info.event.id, { start: candidate.start, end: candidate.end, pendingSync: true });
    } catch (e) {
      info.revert();
      if (e?.message) alert(String(e.message));
    }
  };

  const handleSave = async (values) => {
    const s = new Date(values.start);
    const e = new Date(values.end);

    if (!isRangeWithinClinicHours(s, e)) {
      alert(t('clinicHoursError'));
      return;
    }

    const therapistIdLocal = isAdmin ? String(values.therapistId || "").trim() : String(currentTherapistId || "").trim();

    if (isAdmin && !therapistIdLocal) {
      alert(t('therapistRequired'));
      return;
    }

    const candidate = {
      therapistId: therapistIdLocal,
      patientId: digitsOnly(values.patientId),
      start: values.start,
      end: values.end,
    };

    const ignoreId = drawerMode === "edit" ? activeId : null;

    if (hasTherapistConflict(appointments, candidate, ignoreId)) {
      alert(t('doubleBookingError'));
      return;
    }

    const patientCheck = checkPatientSameDayAndOverlap({
      allAppointments: appointments,
      candidate,
      ignoreId,
      therapistNameById,
      t,
    });

    if (!patientCheck.ok) {
      if (patientCheck.reason && patientCheck.reason !== t('cancelledByUser')) alert(patientCheck.reason);
      return;
    }

    try {
      if (drawerMode === "edit" && activeId) {
        await updateAppointment(activeId, { ...values, therapistId: therapistIdLocal });
        setDrawerOpen(false);
        return;
      }

      await addAppointment({ ...values, therapistId: therapistIdLocal });
      setDrawerOpen(false);
    } catch (e2) {
      if (e2?.message) alert(String(e2.message));
    }
  };

  const handleDelete = async () => {
    if (!activeId) return;
    await deleteAppointment(activeId);
    setDrawerOpen(false);
  };

  const handleSyncAppointments = async () => {
    if (!isAdmin) return;
    if (syncing) return;

    if (!medplum.isAuthenticated()) {
      alert(t('notConnectedMedplum'));
      return;
    }

    try {
      setSyncing(true);

      const pending = (appointments || []).filter((a) => a && a.pendingSync === true);

      if (!pending.length) {
        alert("All appointments are already synced!");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const appt of pending) {
        try {
          const remoteId = await syncAppointmentToMedplum(appt, therapistRemoteIdMap);
          await updateAppointment(appt.id, {
            remoteId,
            pendingSync: false,
            syncError: null,
          });
          successCount++;
        } catch (err) {
          await updateAppointment(appt.id, {
            pendingSync: true,
            syncError: String(err?.message || "Sync failed"),
          });
          errorCount++;
        }
      }

      await refresh();

      if (errorCount === 0) alert(t('syncSuccess').replace('{{count}}', successCount));
      else alert(t('syncPartial').replace('{{success}}', successCount).replace('{{failed}}', errorCount));
    } catch (err) {
      alert(t('syncFailed').replace('{{error}}', err?.message || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const storedNotifications = useMemo(() => {
    void notifTick;
    return getStoredNotifications(userKey);
  }, [userKey, notifTick]);

  const notifications = useMemo(() => {
    const list = [];

    if (isAdmin) {
      const visible = Array.isArray(visibleAppointments) ? visibleAppointments : [];
      const failed = visible.filter((a) => a && a.syncError);
      const pending = visible.filter((a) => a && a.pendingSync === true);

      if (failed.length) {
        list.push({
          id: "sync-errors",
          type: "error",
          title: t('syncIssuesTitle'),
          message: t('syncIssuesMessage').replace('{{count}}', failed.length),
        });
      }

      if (pending.length) {
        list.push({
          id: "sync-pending",
          type: "info",
          title: t('pendingSyncTitle'),
          message: t('pendingSyncMessage').replace('{{count}}', pending.length),
        });
      }

      if (!failed.length && !pending.length) {
        list.push({
          id: "system-ok",
          type: "success",
          title: t('systemTitle'),
          message: t('noSyncIssues'),
        });
      }

      return list.filter((n) => n && !dismissedNotifs.includes(n.id));
    }

    const today = (Array.isArray(visibleAppointments) ? visibleAppointments : []).filter(
      (a) => a && a.start && isToday(a.start)
    );
    const count = today.length;

    if (count > 0) {
      const sorted = today.slice().sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      const first = sorted[0];
      const firstTime = first?.start ? formatHM(first.start) : "";
      list.push({
        id: "daily-summary",
        type: "info",
        title: t('todayTitle'),
        message: firstTime
          ? t('todayAppointments').replace('{{count}}', count) + ' ' + t('todayFirst').replace('{{time}}', firstTime)
          : t('todayAppointments').replace('{{count}}', count),
      });
    } else {
      list.push({
        id: "daily-empty",
        type: "success",
        title: t('todayTitle'),
        message: t('noAppointmentsToday'),
      });
    }

    const merged = [...medplumNotifs, ...storedNotifications, ...list];
    return merged.filter((n) => n && !dismissedNotifs.includes(n.id));
  }, [isAdmin, visibleAppointments, dismissedNotifs, storedNotifications, medplumNotifs, t]);

  const notifCount = notifications.length;

  const clearNotifications = async () => {
    const ids = notifications.map((n) => n.id);
    dismissNotifications(userKey, ids);
    setDismissedNotifs(getDismissedIds(userKey));
    setNotifOpen(false);

    if (!isAdmin && medplum.isAuthenticated()) {
      const rid =
        String(medplumProfile?.practitioner?.id || medplumProfile?.profile?.id || medplumProfile?.id || "").trim() ||
        "";
      if (rid) {
        const localOnly = storedNotifications.filter((n) => n && n.id && !String(n.id).startsWith("sync-"));
        await pushNotificationsToMedplum({ medplum, notifications: localOnly, recipientPractitionerId: rid });
      }
    }
  };

  const toggleNotifications = () => setNotifOpen((p) => !p);

  const eventDidMount = (arg) => {
    const el = arg?.el;
    const appointment = arg?.event?.extendedProps?.appointment;
    if (!el || !appointment) return;

    const eventId = String(arg.event.id);

    const clearTimer = () => {
      const t = clickTimersRef.current.get(eventId);
      if (t) clearTimeout(t);
      clickTimersRef.current.delete(eventId);
    };

    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      const last = lastClickRef.current;
      const isDouble = last.id === eventId && now - last.ts < 280;
      lastClickRef.current = { id: eventId, ts: now };

      clearTimer();
      if (isDouble) return;

      const timer = setTimeout(() => {
        openEditDrawer(appointment);
        clearTimer();
      }, 240);

      clickTimersRef.current.set(eventId, timer);
    };

    const onDblClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      clearTimer();

      const patientIdLocal = String(appointment.patientId || "").replace(/\D/g, "").trim();
      if (!patientIdLocal) {
        alert(t('noPatientId'));
        return;
      }
      navigate(`/patients/${patientIdLocal}`);
    };

    el.addEventListener("click", onClick);
    el.addEventListener("dblclick", onDblClick);

    const cleanupKey = `mc_cleanup_${eventId}`;
    el[cleanupKey] = () => {
      clearTimer();
      el.removeEventListener("click", onClick);
      el.removeEventListener("dblclick", onDblClick);
    };
  };

  const eventWillUnmount = (arg) => {
    const el = arg?.el;
    const eventId = String(arg?.event?.id || "");
    if (!el || !eventId) return;

    const cleanupKey = `mc_cleanup_${eventId}`;
    const fn = el[cleanupKey];
    if (typeof fn === "function") fn();
    try {
      delete el[cleanupKey];
    } catch {
      // noop
    }
  };

  const eventClassNames = (arg) => {
    const appt = arg?.event?.extendedProps?.appointment || null;
    const idx = arg?.event?.extendedProps?.therapistColorIndex;
    const therapistClass = Number.isInteger(idx) ? `mc-event--t${idx}` : "";

    const end = arg?.event?.end || arg?.event?.start;
    const isPast = end ? end.getTime() < Date.now() : false;

    const s = normalizeStatus(appt?.status);
    const statusClass =
      s === "cancelled" ? "mc-event--cancelled" : s === "completed" ? "mc-event--completed" : "mc-event--neutral";
    const pendingClass = appt?.pendingSync ? "mc-event--pending" : "";

    return ["mc-event", therapistClass, statusClass, pendingClass, isPast ? "mc-event--past" : "mc-event--active"].filter(
      Boolean
    );
  };

  return (
    <div className="mc-calendar-page">
      <div className="mc-calendar-header">
        <div className="mc-calendar-title-wrap">
          <h1 className="mc-calendar-title">{t('appointments')}</h1>
          <p className="mc-calendar-subtitle">
            {loading ? t('loadingAppointments') : t('appointmentsCount').replace('{{count}}', visibleAppointments.length)}
            {!loading && t('calendarHint')}
          </p>
        </div>

        <div className="mc-calendar-actions">
          <div className="mc-notifications-wrap" ref={notifWrapRef}>
            <button
              type="button"
              className="mc-icon-button mc-bell-button"
              onClick={toggleNotifications}
              aria-label={t('notifications')}
              title={t('notifications')}
            >
              <Bell size={18} />
              {notifCount > 0 ? <span className="mc-notification-badge">{notifCount}</span> : null}
            </button>

            {notifOpen ? (
              <div className="mc-notifications-popover" role="dialog" aria-modal="false">
                <div className="mc-notifications-head">
                  <div className="mc-notifications-title">{t('notifications')}</div>
                  <button type="button" className="mc-notifications-clear" onClick={clearNotifications} disabled={notifCount === 0}>
                    {t('clearAll')}
                  </button>
                </div>

                <div className="mc-notifications-body">
                  {notifications.length ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={[
                          "mc-notification-item",
                          n.type === "error"
                            ? "mc-notification-error"
                            : n.type === "success"
                            ? "mc-notification-success"
                            : "mc-notification-info",
                        ].join(" ")}
                      >
                        <div className="mc-notification-item-title">{n.title}</div>
                        <div className="mc-notification-item-msg">{n.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="mc-notifications-empty">{t('noNotifications')}</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="mc-icon-button"
              onClick={handleSyncAppointments}
              disabled={syncing}
              title={medplum.isAuthenticated() ? t('syncToMedplum') : t('connectMedplumFirst')}
            >
              <RefreshCw size={18} />
            </button>
          ) : null}

          <button type="button" className="mc-calendar-add" onClick={handleAddClick}>
            {'+ ' + t('addAppointment')}
          </button>
        </div>
      </div>

      <div className="mc-calendar-card">
        <div className="mc-calendar-shell">
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            locale="en-GB"
            initialView="timeGridWeek"
            initialDate={new Date()}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,timeGridDay,dayGridMonth",
            }}
            buttonText={{ today: t('calendarToday'), week: t('calendarWeek'), day: t('calendarDay'), month: t('calendarMonth') }}
            titleFormat={{ year: "numeric", month: "2-digit", day: "2-digit" }}
            dayHeaderFormat={{ weekday: "short", day: "2-digit", month: "2-digit" }}
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            nowIndicator
            allDaySlot={false}
            selectable
            selectMirror
            select={handleSelect}
            events={events}
            editable
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            slotDuration="00:15:00"
            snapDuration="00:15:00"
            slotMinTime={CLINIC_START_TIME}
            slotMaxTime={CLINIC_END_TIME}
            businessHours={{
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startTime: "07:00",
              endTime: "22:00",
            }}
            height="auto"
            expandRows
            scrollTime="07:00:00"
            navLinks
            navLinkDayClick={(date) => {
              const api = date.view.calendar;
              api.changeView("timeGridDay", date.date);
            }}
            navLinkWeekClick={(date) => {
              const api = date.view.calendar;
              api.changeView("timeGridWeek", date.date);
            }}
            dateClick={(info) => {
              if (info.view.type === "dayGridMonth") info.view.calendar.changeView("timeGridDay", info.date);
            }}
            dayCellDidMount={(arg) => {
              if (arg.view.type !== "dayGridMonth") return;
              arg.el.addEventListener("dblclick", () => arg.view.calendar.changeView("timeGridDay", arg.date));
            }}
            eventDidMount={eventDidMount}
            eventWillUnmount={eventWillUnmount}
            eventClassNames={eventClassNames}
          />
        </div>
      </div>

      <AppointmentDrawer
        open={drawerOpen}
        mode={drawerMode}
        patients={patients}
        initialValues={initialValues}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        loading={false}
        isAdmin={isAdmin}
        currentTherapistId={currentTherapistId}
        therapistOptions={therapistOptions}
      />
    </div>
  );
}
