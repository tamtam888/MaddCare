// src/pages/UsersPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, X, RefreshCw, Link2, Upload, Download, Eye, EyeOff } from "lucide-react";

const APP_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://medical-care-mu.vercel.app';

function copyInvite(therapist) {
  const username = normalizeString(therapist.username) || normalizeString(therapist.fullName);
  // Password is no longer fetched in the general therapist list — share it
  // via a secure channel (e.g. direct message). The invite link is still useful
  // for communicating the login URL and username.
  const text =
    `You have been invited to MedicalCare!\n` +
    `Login at: ${APP_URL}/login\n` +
    `Username: ${username}\n` +
    `Password: [share securely — not shown here]`;
  navigator.clipboard.writeText(text).then(() => {
    alert('Invite details copied to clipboard!');
  }).catch(() => {
    prompt('Copy this invite:', text);
  });
}
import { useLanguage } from "../i18n/LanguageContext";
import { useAuthContext } from "../hooks/useAuthContext";
import { getAllTherapists, upsertTherapist, deleteTherapist } from "../therapists/therapistsStore";
import "./UsersPage.css";

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_ALIASES = {
  sun: "Sun",
  sunday: "Sun",
  mon: "Mon",
  monday: "Mon",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  wed: "Wed",
  weds: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
};

const ACCENT_KEYS = [
  "accent-a",
  "accent-b",
  "accent-c",
  "accent-d",
  "accent-e",
  "accent-f",
  "accent-g",
  "accent-h",
  "accent-i",
  "accent-j",
  "accent-k",
  "accent-l",
];

function normalizeString(v) {
  return String(v ?? "").trim();
}

function normalizeDigits(v) {
  return normalizeString(v).replace(/\D/g, "");
}

function isValidIdNumber(value) {
  return /^\d{9}$/.test(normalizeDigits(value));
}

function uid() {
  return `local-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function pickRandomAccentKey() {
  const idx = Math.floor(Math.random() * ACCENT_KEYS.length);
  return ACCENT_KEYS[idx] || ACCENT_KEYS[0];
}

function normalizeAccentKey(value) {
  const v = normalizeString(value);
  if (!v) return "";
  return ACCENT_KEYS.includes(v) ? v : "";
}

function tokenizeDays(input) {
  const raw = normalizeString(input);
  if (!raw) return [];
  return raw
    .split(/[\s,.;/|]+/g)
    .map((x) => normalizeString(x))
    .filter(Boolean);
}

function normalizeOneDayToken(token) {
  const t = normalizeString(token).toLowerCase();
  if (!t) return "";
  return DAY_ALIASES[t] || "";
}

function normalizeWorkDaysFromText(text) {
  const tokens = tokenizeDays(text);
  const normalized = [];
  const invalid = [];
  const disallowed = [];

  for (const tok of tokens) {
    const day = normalizeOneDayToken(tok);
    if (!day) invalid.push(tok);
    else if (day === "Sat") disallowed.push(day);
    else normalized.push(day);
  }

  const unique = Array.from(new Set(normalized));
  unique.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  return { days: unique, invalid, disallowed };
}

function normalizeWorkDays(value) {
  if (Array.isArray(value)) {
    const normalized = [];
    for (const v of value) {
      const day = normalizeOneDayToken(v);
      if (!day) continue;
      if (day === "Sat") continue;
      if (!DAY_ORDER.includes(day)) continue;
      normalized.push(day);
    }
    const unique = Array.from(new Set(normalized));
    unique.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
    return unique;
  }
  const s = normalizeString(value);
  if (!s) return [];
  return normalizeWorkDaysFromText(s).days;
}

function formatWorkDays(days) {
  const list = normalizeWorkDays(days);
  return list.join(", ");
}

function normalizeFullName(value) {
  const raw = normalizeString(value).replace(/\s+/g, " ");
  if (!raw) return "";

  const parts = raw.split(" ").filter(Boolean);
  const normalized = parts.map((p) => {
    const cleaned = p.replace(/[^A-Za-z\u0590-\u05FF'-]/g, "");
    if (!cleaned) return "";
    const lower = cleaned.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });

  return normalized.filter(Boolean).join(" ");
}

function isValidFullName(value) {
  const normalized = normalizeFullName(value);
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length < 2) return false;
  return /^[A-Za-z\u0590-\u05FF][A-Za-z\u0590-\u05FF'-]*(\s[A-Za-z\u0590-\u05FF][A-Za-z\u0590-\u05FF'-]*)+$/.test(normalized);
}

function normalizePhone(value) {
  const raw = normalizeString(value);
  if (!raw) return "";

  const plus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (plus && digits.startsWith("972")) {
    digits = digits.slice(3);
    digits = `0${digits}`;
  }

  if (!digits.startsWith("0") && digits.length === 9) {
    digits = `0${digits}`;
  }

  return digits;
}

function isValidPhone(value) {
  const v = normalizeString(value);
  if (!v) return true;

  const digits = normalizePhone(v);
  if (!/^\d+$/.test(digits)) return false;

  if (digits.startsWith("05")) return digits.length === 10;
  if (digits.startsWith("0")) return digits.length >= 9 && digits.length <= 10;
  return digits.length >= 9 && digits.length <= 15;
}

function isValidEmail(value) {
  const v = normalizeString(value);
  if (!v) return true;
  return /^\S+@\S+\.\S+$/.test(v);
}

function isValidAddress(value) {
  const v = normalizeString(value);
  if (!v) return true;
  if (v.length < 6) return false;
  const hasLetter = /[A-Za-z]/.test(v);
  const hasNumber = /\d/.test(v);
  return hasLetter && hasNumber;
}

function validateForm(draft, workDaysText, isCreate = true) {
  const errors = {};

  const fullName = normalizeFullName(draft.fullName);
  if (!fullName) errors.fullName = "Full name is required.";
  else if (!isValidFullName(fullName)) {
    errors.fullName = "Enter first and last name. Each word must start with a capital letter.";
  }

  const idDigits = normalizeDigits(draft.idNumber);
  if (!idDigits) errors.idNumber = "ID number is required.";
  else if (!isValidIdNumber(idDigits)) errors.idNumber = "ID number must be 9 digits.";

  const username = normalizeString(draft.username).toLowerCase();
  if (!username) errors.username = "Username is required.";
  else if (!/^[\p{L}\p{N}_-]{2,32}$/u.test(username)) errors.username = "Username: 2–32 characters, letters/numbers/hyphens/underscores only.";

  if (isCreate && !normalizeString(draft.password)) errors.password = "Password is required.";

  if (!isValidPhone(draft.phone)) errors.phone = "Phone number is invalid.";
  if (!isValidEmail(draft.email)) errors.email = "Email is invalid.";
  if (!isValidAddress(draft.address)) errors.address = "Address should include letters and a street number.";

  const parsed = normalizeWorkDaysFromText(workDaysText);
  if (parsed.disallowed.length) errors.workDays = "Saturday is not allowed.";
  else if (parsed.invalid.length) errors.workDays = `Invalid work days: ${parsed.invalid.join(", ")}`;

  return errors;
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function genderNameClass(gender) {
  const g = normalizeString(gender).toLowerCase();
  if (g === "female") return "users-name-female";
  if (g === "male") return "users-name-male";
  return "users-name-none";
}

function maskIdNumber(idNumber) {
  const s = normalizeDigits(idNumber);
  if (!s) return "";
  if (s.length <= 4) return s;
  return `****${s.slice(-4)}`;
}

function defaultDraft() {
  return {
    id: "",
    fullName: "",
    idNumber: "",
    username: "",
    password: "",
    phone: "",
    address: "",
    email: "",
    workDays: [],
    active: true,
    gender: "not_specified",
    accentKey: pickRandomAccentKey(),
    remoteId: null,
  };
}

function normalizeTherapistRecord(raw) {
  const rawId = normalizeString(raw?.id);
  const rawIdNumber = normalizeDigits(raw?.idNumber);

  const idNumberCandidate =
    rawIdNumber ||
    (isValidIdNumber(rawId) ? rawId : "") ||
    normalizeDigits(raw?.therapistId) ||
    "";

  const fullNameCandidate =
    normalizeString(raw?.fullName) ||
    normalizeString(raw?.name) ||
    normalizeString(raw?.displayName) ||
    "";

  const stableId = idNumberCandidate ? idNumberCandidate : rawId || uid();

  const activeValue =
    typeof raw?.active === "boolean"
      ? raw.active
      : typeof raw?.isActive === "boolean"
        ? raw.isActive
        : true;

  return {
    id: stableId,
    fullName: fullNameCandidate,
    idNumber: idNumberCandidate,
    username: normalizeString(raw?.username || ""),
    password: normalizeString(raw?.password || ""),
    phone: normalizeString(raw?.phone || ""),
    address: normalizeString(raw?.address || ""),
    email: normalizeString(raw?.email || ""),
    workDays: normalizeWorkDays(raw?.workDays || []),
    active: Boolean(activeValue),
    gender: normalizeString(raw?.gender) || "not_specified",
    accentKey: normalizeAccentKey(raw?.accentKey) || pickRandomAccentKey(),
    remoteId: normalizeString(raw?.remoteId) || null,
  };
}

export default function UsersPage({ handleSyncAllTherapistsToMedplum }) {
  const navigate = useNavigate();
  const { isAdmin, therapistId } = useAuthContext();
  const { t } = useLanguage();

  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [draft, setDraft] = useState(() => defaultDraft());
  const [workDaysText, setWorkDaysText] = useState(() => formatWorkDays(defaultDraft().workDays));
  const [errors, setErrors] = useState({});

  const [showPassword, setShowPassword] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const importFileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const list = await getAllTherapists();
        if (!cancelled) setItems((Array.isArray(list) ? list : []).map(normalizeTherapistRecord));
      } catch (e) {
        console.error("[UsersPage] getAllTherapists failed:", e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(() => {
    if (isAdmin) return items;
    const tid = normalizeString(therapistId);
    if (!tid) return [];
    return items.filter((t) => normalizeString(t.id) === tid || normalizeString(t.idNumber) === tid);
  }, [isAdmin, items, therapistId]);

  const filtered = useMemo(() => {
    const q = normalizeString(query).toLowerCase();
    const base = visibleItems;

    if (!q) return base;

    return base.filter((t) => {
      const fullName = normalizeString(t.fullName).toLowerCase();
      const idNumber = normalizeString(t.idNumber).toLowerCase();
      const phone = normalizeString(t.phone).toLowerCase();
      const email = normalizeString(t.email).toLowerCase();
      return (
        fullName.includes(q) ||
        idNumber.includes(q) ||
        maskIdNumber(idNumber).toLowerCase().includes(q) ||
        phone.includes(q) ||
        email.includes(q)
      );
    });
  }, [visibleItems, query]);

  function openCreate() {
    if (!isAdmin) return;
    const next = defaultDraft();
    setMode("create");
    setDraft(next);
    setWorkDaysText(formatWorkDays(next.workDays));
    setErrors({});
    setIsModalOpen(true);
  }

  function openEdit(item) {
    const next = normalizeTherapistRecord(item);
    setMode("edit");
    setDraft(next);
    setWorkDaysText(formatWorkDays(next.workDays));
    setErrors({});
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  async function upsertItem(next) {
    const normalizedNext = normalizeTherapistRecord(next);

    setItems((prev) => {
      const prevList = Array.isArray(prev) ? prev : [];
      const key = normalizeDigits(normalizedNext.idNumber) || normalizeString(normalizedNext.id);

      const idx = prevList.findIndex((x) => {
        const kx = normalizeDigits(x.idNumber) || normalizeString(x.id);
        return kx === key;
      });

      if (idx === -1) return [normalizedNext, ...prevList];

      const copy = prevList.slice();
      copy[idx] = normalizedNext;
      return copy;
    });

    try {
      await upsertTherapist(normalizedNext);
    } catch (e) {
      console.error("[UsersPage] upsertTherapist failed:", e);
      alert(e?.message || "Save failed");
    }
  }

  async function onDelete(id) {
    if (!isAdmin) return;
    const target = normalizeDigits(id) || normalizeString(id);
    if (!target) return;
    const ok = window.confirm("Delete this user?");
    if (!ok) return;

    setItems((prev) =>
      (Array.isArray(prev) ? prev : []).filter((x) => {
        const kx = normalizeDigits(x.idNumber) || normalizeString(x.id);
        return kx !== target;
      })
    );

    try {
      await deleteTherapist(target);
    } catch (e) {
      console.error("[UsersPage] deleteTherapist failed:", e);
    }
  }

  function onBlurNormalize(field) {
    if (field === "fullName") {
      const v = normalizeFullName(draft.fullName);
      setDraft((p) => ({ ...p, fullName: v }));
      setErrors((p) => ({ ...p, fullName: validateForm({ ...draft, fullName: v }, workDaysText, mode === "create").fullName }));
      return;
    }

    if (field === "username") {
      const v = normalizeString(draft.username).toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, "");
      setDraft((p) => ({ ...p, username: v }));
      setErrors((p) => ({ ...p, username: validateForm({ ...draft, username: v }, workDaysText, mode === "create").username }));
      return;
    }

    if (field === "idNumber") {
      const v = normalizeDigits(draft.idNumber);
      setDraft((p) => ({ ...p, idNumber: v, id: v || p.id }));
      setErrors((p) => ({ ...p, idNumber: validateForm({ ...draft, idNumber: v }, workDaysText).idNumber }));
      return;
    }

    if (field === "phone") {
      const v = normalizePhone(draft.phone);
      setDraft((p) => ({ ...p, phone: v }));
      setErrors((p) => ({ ...p, phone: validateForm({ ...draft, phone: v }, workDaysText).phone }));
      return;
    }

    if (field === "email") {
      const v = normalizeString(draft.email);
      setDraft((p) => ({ ...p, email: v }));
      setErrors((p) => ({ ...p, email: validateForm({ ...draft, email: v }, workDaysText).email }));
      return;
    }

    if (field === "address") {
      const v = normalizeString(draft.address);
      setDraft((p) => ({ ...p, address: v }));
      setErrors((p) => ({ ...p, address: validateForm({ ...draft, address: v }, workDaysText).address }));
      return;
    }
  }

  function onWorkDaysBlur() {
    const parsed = normalizeWorkDaysFromText(workDaysText);
    const formatted = formatWorkDays(parsed.days);

    setDraft((p) => ({ ...p, workDays: parsed.days }));
    setWorkDaysText(formatted);

    const nextErrors = validateForm({ ...draft, workDays: parsed.days }, formatted);
    setErrors((p) => ({ ...p, workDays: nextErrors.workDays }));
  }

  async function onSubmit(e) {
    e.preventDefault();

    const isCreate = mode === "create";
    const idNumberDigits = normalizeDigits(draft.idNumber);

    const normalizedDraft = {
      ...draft,
      fullName: normalizeFullName(draft.fullName),
      idNumber: idNumberDigits,
      id: idNumberDigits || normalizeString(draft.id) || uid(),
      username: normalizeString(draft.username).toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, ""),
      phone: normalizePhone(draft.phone),
      email: normalizeString(draft.email),
      address: normalizeString(draft.address),
    };

    const parsed = normalizeWorkDaysFromText(workDaysText);
    const formattedDays = formatWorkDays(parsed.days);

    // On edit: if password field was cleared, keep the existing saved password
    const existingPassword = !isCreate
      ? normalizeString(items.find((x) => {
          const kx = normalizeDigits(x.idNumber) || normalizeString(x.id);
          const kt = idNumberDigits || normalizeString(draft.id);
          return kx === kt;
        })?.password || "")
      : "";

    const next = {
      ...normalizedDraft,
      password: normalizeString(normalizedDraft.password) || existingPassword,
      workDays: parsed.days,
      gender: normalizeString(normalizedDraft.gender) || "not_specified",
      active: Boolean(normalizedDraft.active),
      accentKey:
        mode === "create"
          ? pickRandomAccentKey()
          : normalizeAccentKey(normalizedDraft.accentKey) || pickRandomAccentKey(),
      remoteId: normalizeString(normalizedDraft.remoteId) || null,
    };

    const nextErrors = validateForm(next, formattedDays, isCreate);
    setErrors(nextErrors);
    setDraft(next);
    setWorkDaysText(formattedDays);

    if (hasErrors(nextErrors)) return;

    await upsertItem(next);
    closeModal();
  }

  useEffect(() => {
    if (!isAdmin) {
      const tid = normalizeString(therapistId);
      if (!tid) navigate("/login", { replace: true });
    }
  }, [isAdmin, therapistId, navigate]);

  const handleExportUsers = () => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `therapists-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportUsers = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : [];
      let count = 0;
      for (const t of list) {
        const normalized = normalizeTherapistRecord(t);
        if (!normalized.fullName) continue;
        await upsertTherapist(normalized);
        count++;
      }
      const updated = await getAllTherapists();
      setItems((Array.isArray(updated) ? updated : []).map(normalizeTherapistRecord));
      alert(`Import successful: ${count} therapist(s) loaded.`);
    } catch (err) {
      console.error("[handleImportUsers]", err);
      alert("Import failed. Make sure the file is a valid therapists JSON.");
    }
    e.target.value = "";
  };

  const handleClickSyncAll = async () => {
    if (!isAdmin) return;
    if (typeof handleSyncAllTherapistsToMedplum !== "function") return;
    if (syncing) return;

    try {
      setSyncing(true);
      await handleSyncAllTherapistsToMedplum(items);
    } catch (err) {
      console.error("Sync failed:", err);
      alert(`Sync failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  const pageTitle = isAdmin ? t('usersTitle') : t('myProfile');
  const pageSubtitle = isAdmin ? t('manageTherapistsSubtitle') : t('editProfileSubtitle');

  return (
    <div className="patients-page users-page">
      <div className="patients-page-header-row">
        <div className="patients-page-header-text">
          <h1 className="patients-page-title">{pageTitle}</h1>
          <p className="patients-page-subtitle">{pageSubtitle}</p>
        </div>

        <div className="patients-page-header-actions">
          {isAdmin ? (
            <>
              <button
                type="button"
                className="patients-toolbar-button"
                onClick={handleClickSyncAll}
                disabled={syncing || typeof handleSyncAllTherapistsToMedplum !== "function"}
              >
                <span className="patients-toolbar-button-icon">
                  <RefreshCw size={16} />
                </span>
                <span>{syncing ? t('syncing') : t('syncAll')}</span>
              </button>

              <button type="button" className="patients-toolbar-button" onClick={() => importFileRef.current?.click()}>
                <span className="patients-toolbar-button-icon"><Upload size={16} /></span>
                <span>{t('import')}</span>
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={handleImportUsers}
              />

              <button type="button" className="patients-toolbar-button" onClick={handleExportUsers}>
                <span className="patients-toolbar-button-icon"><Download size={16} /></span>
                <span>{t('export')}</span>
              </button>

              <button type="button" className="patients-add-button" onClick={openCreate}>
                <span className="patients-add-button-icon">
                  <Plus size={18} />
                </span>
                <span>{t('addUser')}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="patients-search-wrapper">
        <span className="patients-search-icon" aria-hidden="true">
          <Search size={16} />
        </span>
        <input
          className="patients-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchUsersPlaceholder')}
          inputMode="search"
          autoComplete="off"
        />
      </div>

      <div className="users-list-card">
        <table className="users-table" role="table">
          <thead>
            <tr>
              <th>{t('colName')}</th>
              <th>{t('colUsername')}</th>
              <th>{t('colWorkDays')}</th>
              <th>{t('colStatus')}</th>
              <th className="users-actions-col">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="users-empty-row">
                  {t('loading')}
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((usr) => (
                <tr key={usr.id}>
                  <td className="users-main-cell">
                    <div className="users-main">
                      <div className={`users-main-title ${genderNameClass(usr.gender)}`}>
                        {normalizeString(usr.fullName) || "—"}
                      </div>
                      <div className="users-main-subtitle">{normalizeString(usr.email) || ""}</div>
                    </div>
                  </td>

                  <td>{normalizeString(usr.username) || <span className="users-muted">—</span>}</td>

                  <td>
                    <div className="users-chips">
                      {normalizeWorkDays(usr.workDays).length ? (
                        normalizeWorkDays(usr.workDays).map((d) => (
                          <span key={`${usr.id}-${d}`} className="users-chip">
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="users-muted">—</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className={usr.active ? "users-status users-status-on" : "users-status users-status-off"}>
                      {usr.active ? t('statusActive') : t('statusInactive')}
                    </span>
                  </td>

                  <td className="users-row-actions">
                    {isAdmin ? (
                      <button
                        type="button"
                        className="users-icon-btn"
                        onClick={() => copyInvite(usr)}
                        aria-label={t('copyInvite')}
                        title={t('copyInviteLink')}
                      >
                        <Link2 size={16} />
                      </button>
                    ) : null}
                    <button type="button" className="users-icon-btn" onClick={() => openEdit(usr)} aria-label="Edit">
                      <Pencil size={16} />
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="users-icon-btn users-icon-btn-danger"
                        onClick={() => onDelete(usr.idNumber || usr.id)}
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="users-empty-row">
                  {t('noUsersFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <div className="users-modal-backdrop" role="dialog" aria-modal="true">
          <div className="users-modal">
            <div className="users-modal-header">
              <div className="users-modal-title">{mode === "create" ? t('addUserModal') : t('editUserModal')}</div>
              <button type="button" className="users-modal-close" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form className="users-modal-body" onSubmit={onSubmit}>
              <div className="users-form-grid">
                <label className="users-field">
                  <span className="users-label">{t('labelFullName')}</span>
                  <input
                    className={errors.fullName ? "users-input users-input-error" : "users-input"}
                    value={draft.fullName}
                    onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
                    onBlur={() => onBlurNormalize("fullName")}
                    placeholder={t('phFirstLast')}
                    autoComplete="name"
                  />
                  {errors.fullName ? <div className="users-error">{errors.fullName}</div> : null}
                </label>

                <label className="users-field">
                  <span className="users-label">{t('colUsername')}</span>
                  <input
                    className={errors.username ? "users-input users-input-error" : "users-input"}
                    value={draft.username}
                    onChange={(e) => setDraft((p) => ({ ...p, username: e.target.value }))}
                    onBlur={() => onBlurNormalize("username")}
                    placeholder={t('phUsername')}
                    autoComplete="off"
                  />
                  {errors.username ? <div className="users-error">{errors.username}</div> : null}
                </label>

                <label className="users-field">
                  <span className="users-label">{mode === "create" ? t('labelPassword') : t('labelPasswordEdit')}</span>
                  <div className="users-password-field">
                    <input
                      className={errors.password ? "users-input users-input-error" : "users-input"}
                      value={draft.password}
                      onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))}
                      placeholder={mode === "create" ? t('phPasswordCreate') : t('phPasswordEdit')}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="users-password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password ? <div className="users-error">{errors.password}</div> : null}
                </label>

                <label className="users-field">
                  <span className="users-label">{t('labelIdNumber')}</span>
                  <input
                    className={errors.idNumber ? "users-input users-input-error" : "users-input"}
                    value={draft.idNumber}
                    onChange={(e) => setDraft((p) => ({ ...p, idNumber: e.target.value }))}
                    onBlur={() => onBlurNormalize("idNumber")}
                    placeholder={t('ph9Digits')}
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={!isAdmin && mode === "edit"}
                  />
                  {errors.idNumber ? <div className="users-error">{errors.idNumber}</div> : null}
                </label>

                <label className="users-field">
                  <span className="users-label">{t('labelPhone')}</span>
                  <input
                    className={errors.phone ? "users-input users-input-error" : "users-input"}
                    value={draft.phone}
                    onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                    onBlur={() => onBlurNormalize("phone")}
                    placeholder={t('phPhone')}
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  {errors.phone ? <div className="users-error">{errors.phone}</div> : null}
                </label>

                <label className="users-field">
                  <span className="users-label">{t('labelEmail')}</span>
                  <input
                    className={errors.email ? "users-input users-input-error" : "users-input"}
                    value={draft.email}
                    onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                    onBlur={() => onBlurNormalize("email")}
                    placeholder={t('phEmail')}
                    inputMode="email"
                    autoComplete="email"
                  />
                  {errors.email ? <div className="users-error">{errors.email}</div> : null}
                </label>

                <label className="users-field users-field-full">
                  <span className="users-label">{t('labelAddress')}</span>
                  <input
                    className={errors.address ? "users-input users-input-error" : "users-input"}
                    value={draft.address}
                    onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
                    onBlur={() => onBlurNormalize("address")}
                    placeholder={t('phAddress')}
                    autoComplete="street-address"
                  />
                  {errors.address ? <div className="users-error">{errors.address}</div> : null}
                </label>

                <label className="users-field users-field-full">
                  <span className="users-label">{t('labelWorkDays')}</span>
                  <input
                    className={errors.workDays ? "users-input users-input-error" : "users-input"}
                    value={workDaysText}
                    onChange={(e) => setWorkDaysText(e.target.value)}
                    onBlur={onWorkDaysBlur}
                    placeholder={t('phWorkDays')}
                    autoComplete="off"
                  />
                  {errors.workDays ? <div className="users-error">{errors.workDays}</div> : null}
                  <div className="users-hint">{t('workDaysHint')}</div>
                </label>

                <label className="users-field">
                  <span className="users-label">{t('labelStatus')}</span>
                  <select
                    className="users-input"
                    value={draft.active ? "active" : "inactive"}
                    onChange={(e) => setDraft((p) => ({ ...p, active: e.target.value === "active" }))}
                    disabled={!isAdmin}
                  >
                    <option value="active">{t('statusActive')}</option>
                    <option value="inactive">{t('statusInactive')}</option>
                  </select>
                </label>

                <label className="users-field">
                  <span className="users-label">{t('labelGender')}</span>
                  <select
                    className="users-input"
                    value={draft.gender}
                    onChange={(e) => setDraft((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="not_specified">{t('genderNotSpecified')}</option>
                    <option value="male">{t('genderMale')}</option>
                    <option value="female">{t('genderFemale')}</option>
                  </select>
                </label>
              </div>

              <div className="users-modal-footer">
                <button type="button" className="patients-toolbar-button" onClick={closeModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="patients-add-button">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
