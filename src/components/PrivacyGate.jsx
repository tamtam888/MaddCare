import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import "./PrivacyGate.css";

const PRIVACY_KEY = "mc_privacy_confidentiality_accepted_v1";

const content = {
  en: {
    title: "Privacy & Confidentiality Notice",
    introLines: [
      "This pilot environment is intended for authorized therapists only.",
      "During the pilot, therapists may enter accurate patient information when needed for the approved workflow, including patient records, appointments, treatment workflows, consent documentation, and progress tracking.",
    ],
    confirmIntro: "By continuing, I confirm that:",
    points: [
      "I will keep all patient, personal, clinical, photo, and video information confidential.",
      "I will not share login details or screenshots containing sensitive information.",
      "I will use this system only for the approved pilot workflow.",
      "I understand that accurate patient details may be entered where needed for patient management and treatment workflow.",
      "I understand that photo or video documentation may be used only when the patient has provided the required consent.",
      "I understand that AI-assisted summaries and reports are drafts and must be reviewed by the therapist before use.",
      "I will not include patient names, ID numbers, phone numbers, addresses, or other identifying details in AI-assisted summaries, AI-generated reports, or prompts sent to AI.",
      "When using AI-assisted features, I will use general wording such as ״the patient״ or ״the client״ instead of personal identifiers.",
    ],
    checkboxLabel: "I have read and agree to the Privacy & Confidentiality Notice.",
    continueButton: "Continue to Login",
    exitButton: "Exit",
  },
  he: {
    title: "הצהרת פרטיות וסודיות",
    introLines: [
      "סביבת הפיילוט מיועדת למטפלים מורשים בלבד.",
      "במסגרת הפיילוט ניתן להזין פרטים מדויקים של מטופלים כאשר הדבר נדרש לתהליך העבודה המאושר, כולל רשומות מטופלים, תורים, תהליך טיפול, תיעוד הסכמות ומעקב התקדמות.",
    ],
    confirmIntro: "בהמשך השימוש אני מאשר/ת כי:",
    points: [
      "אשמור על סודיות כל מידע אישי, רפואי, קליני, מצולם או מצולם בווידאו.",
      "לא אשתף פרטי התחברות או צילומי מסך הכוללים מידע רגיש.",
      "אשתמש במערכת רק במסגרת הפיילוט שאושר.",
      "אני מבין/ה שניתן להזין פרטי מטופל מדויקים כאשר הדבר נדרש לניהול המטופל ולתהליך הטיפול.",
      "אני מבין/ה שתיעוד בצילום או בווידאו ייעשה רק כאשר קיים אישור מתאים מהמטופל.",
      "אני מבין/ה שסיכומים ודוחות בעזרת AI הם טיוטאות ויש לבדוק ולאשר אותם לפני שימוש.",
      "לא אכלול שמות מטופלים, מספרי זהות, טלפונים, כתובות או פרטים מזהים אחרים בסיכומים, דוחות או פרומפטים שבהם מעורב AI.",
      "בעת שימוש בפיצ׳רים מבוססי AI אשתמש בניסוח כללי כמו ״המטופל״ או ״המטופלת״ במקום פרטים מזהים.",
    ],
    checkboxLabel: "קראתי ואני מאשר/ת את הצהרת הפרטיות והסודיות.",
    continueButton: "המשך למסך התחברות",
    exitButton: "יציאה",
  },
};

export default function PrivacyGate({ onAccept }) {
  const { lang, dir, setLang } = useLanguage();
  const [checked, setChecked] = useState(false);

  const c = content[lang] || content.en;
  const isRtl = dir === "rtl";

  const handleContinue = () => {
    if (!checked) return;
    try {
      localStorage.setItem(PRIVACY_KEY, "1");
    } catch {
      // localStorage may be unavailable in restricted contexts — proceed anyway
    }
    onAccept();
  };

  const handleExit = () => {
    try {
      window.close();
    } catch {
      // window.close() may be blocked by the browser — fall through to redirect
    }
    window.location.replace("about:blank");
  };

  return (
    <div className="privacy-gate-page" dir={dir}>
      <div className={`privacy-gate-card${isRtl ? " privacy-gate-card--rtl" : ""}`}>

        {/* Language toggle — mirrors the login page toggle */}
        <div className="privacy-gate-lang-toggle">
          <button
            type="button"
            className={`privacy-gate-lang-btn${lang === "en" ? " active" : ""}`}
            onClick={() => setLang("en")}
          >
            English
          </button>
          <span className="privacy-gate-lang-sep" aria-hidden="true">|</span>
          <button
            type="button"
            className={`privacy-gate-lang-btn${lang === "he" ? " active" : ""}`}
            onClick={() => setLang("he")}
          >
            &#x05E2;&#x05D1;&#x05E8;&#x05D9;&#x05EA;
          </button>
        </div>

        {/* Logo */}
        <div className="privacy-gate-logo-wrap" aria-hidden="true">
          <div className="privacy-gate-logo-ring">
            <img src="/icon.png" alt="MedicalCare" className="privacy-gate-logo" />
          </div>
        </div>

        <h1 className="privacy-gate-title">{c.title}</h1>

        {/* Intro paragraphs */}
        <div className="privacy-gate-intro-block">
          {c.introLines.map((line, i) => (
            <p key={i} className="privacy-gate-intro">{line}</p>
          ))}
        </div>

        {/* Confirm intro */}
        <p className="privacy-gate-confirm-intro">{c.confirmIntro}</p>

        {/* Bullet points */}
        <ul className="privacy-gate-points">
          {c.points.map((point, i) => (
            <li key={i} className="privacy-gate-point">{point}</li>
          ))}
        </ul>

        {/* Checkbox */}
        <label className="privacy-gate-checkbox-label">
          <input
            type="checkbox"
            className="privacy-gate-checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span className="privacy-gate-checkbox-text">{c.checkboxLabel}</span>
        </label>

        {/* Actions */}
        <div className="privacy-gate-actions">
          <button
            type="button"
            className="privacy-gate-continue"
            disabled={!checked}
            onClick={handleContinue}
          >
            {c.continueButton}
          </button>
          <button
            type="button"
            className="privacy-gate-exit"
            onClick={handleExit}
          >
            {c.exitButton}
          </button>
        </div>
      </div>
    </div>
  );
}
