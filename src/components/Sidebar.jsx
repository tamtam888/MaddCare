import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  ClipboardList,
  CalendarDays,
  Users,
  Mic,
  LogOut,
  Clapperboard,
} from "lucide-react";
import { useAuthContext } from "../hooks/useAuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./Sidebar.css";

function normalize(value) {
  return String(value ?? "").trim();
}

function readDisplayNameFallback({ role, therapistId }) {
  try {
    const keys = ["mc_therapistName", "mc_display_name", "mc_user_full_name", "mc_user_name", "mc_full_name"];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && normalize(v)) return normalize(v);
    }
  } catch {}
  if (String(role || "").toLowerCase() === "admin") return "Admin";
  if (normalize(therapistId)) return normalize(therapistId);
  return "User";
}

function Sidebar() {
  const navigate = useNavigate();
  const { role, therapistId, isAdmin, setRole, setTherapistId } = useAuthContext();
  const { t, dir } = useLanguage();

  const displayName = readDisplayNameFallback({ role, therapistId });

  const handleSignOut = () => {
    try {
      localStorage.removeItem("mc_logged_in");
    } catch {}
    setRole("therapist");
    setTherapistId("local-therapist");
    navigate("/login", { replace: true });
  };

  return (
    <aside className={`app-sidebar ${dir === 'rtl' ? 'sidebar-rtl' : 'sidebar-ltr'}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <img src="/icon.png" alt="MedicalCare logo" className="sidebar-brand-logo-img" />
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">MedicalCare</div>
          <div className="sidebar-brand-subtitle">{t('treatmentManagement')}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}>
          <span className="sidebar-link-icon"><LayoutDashboard size={18} /></span>
          <span className="sidebar-link-label">{t('dashboard')}</span>
        </NavLink>

        <NavLink to="/patients" className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}>
          <span className="sidebar-link-icon"><Stethoscope size={18} /></span>
          <span className="sidebar-link-label">{t('patients')}</span>
        </NavLink>

        <NavLink to="/treatment" className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}>
          <span className="sidebar-link-icon"><Mic size={18} /></span>
          <span className="sidebar-link-label">{t('treatment')}</span>
        </NavLink>

        <NavLink to="/media" className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}>
          <span className="sidebar-link-icon"><Clapperboard size={18} /></span>
          <span className="sidebar-link-label">{t('media')}</span>
        </NavLink>

        {isAdmin ? (
          <NavLink to="/users" className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}>
            <span className="sidebar-link-icon"><Users size={18} /></span>
            <span className="sidebar-link-label">{t('users')}</span>
          </NavLink>
        ) : null}

        <div className="sidebar-section-title">{t('dataSection')}</div>

        <NavLink to="/data/care-plan" className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}>
          <span className="sidebar-link-icon"><ClipboardList size={18} /></span>
          <span className="sidebar-link-label">{t('carePlans')}</span>
        </NavLink>

        <NavLink to="/data/appointment" className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}>
          <span className="sidebar-link-icon"><CalendarDays size={18} /></span>
          <span className="sidebar-link-label">{t('appointments')}</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-role">{isAdmin ? t('admin') : t('therapist')}</div>
        </div>
        <button type="button" className="sidebar-logout" onClick={handleSignOut}>
          <span className="sidebar-logout-icon"><LogOut size={18} /></span>
          <span className="sidebar-logout-label">{t('signOut')}</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;