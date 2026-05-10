import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { verifyTherapistCredentials } from "../therapists/therapistsStore";
import { useLanguage } from "../i18n/LanguageContext";
import "./LoginPage.css";


const LOGGED_IN_KEY = "mc_logged_in";
const ROLE_KEY = "mc_role";
const THERAPIST_ID_KEY = "mc_therapistId";
const DISPLAY_NAME_KEY = "mc_therapistName";

function normalize(value) {
  return String(value ?? "").trim();
}

function digitsOnly(value) {
  return normalize(value).replace(/\D/g, "");
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = useMemo(() => {
    return normalize(fullName).length > 0 && normalize(idNumber).length > 0 && !submitting;
  }, [fullName, idNumber, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const username = normalize(fullName);
    const password = normalize(idNumber);

    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setSubmitting(true);

    try {
      // All logins — including admin — go through the Supabase RPC.
      // The role (therapist / admin) is determined from the returned DB record.
      const match = await verifyTherapistCredentials(username, password);

      if (!match) {
        setError("Username or password is incorrect.");
        return;
      }

      if (match?.active === false) {
        setError("This account is currently inactive. Please contact the admin.");
        return;
      }

      const resolvedRole = normalize(match.role).toLowerCase() === "admin" ? "admin" : "therapist";

      try {
        localStorage.setItem(LOGGED_IN_KEY, "1");
        localStorage.setItem(ROLE_KEY, resolvedRole);
        localStorage.setItem(THERAPIST_ID_KEY, digitsOnly(match.idNumber || match.id));
        localStorage.setItem(DISPLAY_NAME_KEY, normalize(match.fullName));
      } catch {}

      window.location.replace("/dashboard");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Login failed:", err);
      setError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-lang-toggle">
          <button
            type="button"
            className={`login-lang-btn${lang === 'en' ? ' active' : ''}`}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <span className="login-lang-sep" aria-hidden="true">|</span>
          <button
            type="button"
            className={`login-lang-btn${lang === 'he' ? ' active' : ''}`}
            onClick={() => setLang('he')}
          >
            עברית
          </button>
        </div>

        <div className="login-logo-wrap" aria-hidden="true">
          <div className="login-logo-ring">
            <img src="/icon.png" alt="MedicalCare" className="login-logo" />
          </div>
        </div>

        <h1 className="login-title">MedicalCare</h1>
        <div className="login-subtitle">{t('therapistLogin')}</div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="login_full_name">
              {t('loginUsername')}
            </label>
            <input
              id="login_full_name"
              className="login-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('loginUsername')}
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login_id_number">
              {t('loginPassword')}
            </label>
            <div className="login-password-wrap">
              <input
                id="login_id_number"
                className="login-input"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={t('loginPassword')}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? <div className="login-error">{error}</div> : null}

          <button type="submit" className="login-submit" disabled={!canSubmit}>
            {submitting ? t('signingIn') : t('signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
