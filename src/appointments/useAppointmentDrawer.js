import { useState } from "react";

function getAppointmentId(a) {
  return a?.id || a?.appointmentId || a?._id || null;
}

export function useAppointmentDrawer(patientIdNumber, {
  addAppointment,
  updateAppointment,
  deleteAppointment,
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [initialValues, setInitialValues] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    const pid = String(patientIdNumber || "").replace(/\D/g, "");
    if (!pid) return;
    setEditingId(null);
    setMode("add");
    setInitialValues({
      patientId: pid,
      therapistId: "",
      start: "",
      end: "",
      status: "scheduled",
      notes: "",
    });
    setOpen(true);
  };

  const openEdit = (appt) => {
    if (!appt) return;
    setEditingId(getAppointmentId(appt));
    setMode("edit");
    setInitialValues({
      patientId: appt.patientId,
      therapistId: appt.therapistId || "",
      start: appt.start || "",
      end: appt.end || "",
      status: appt.status || "scheduled",
      notes: appt.notes || "",
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setMode("add");
    setInitialValues(null);
  };

  const save = async (values) => {
    try {
      setSaving(true);
      if (mode === "edit") {
        if (!editingId) return;
        await updateAppointment(editingId, values);
      } else {
        await addAppointment(values);
      }
      close();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    const ok = window.confirm("Delete this appointment?");
    if (!ok) return;
    try {
      setSaving(true);
      await deleteAppointment(editingId);
      close();
    } finally {
      setSaving(false);
    }
  };

  return { open, mode, initialValues, editingId, saving, openAdd, openEdit, close, save, remove };
}
