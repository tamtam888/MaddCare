// src/utils/langPreference.js
// Persists the user's preferred speech-recognition language across sessions.

const LANG_KEY = "mc_transcription_lang";

export const SUPPORTED_LANGS = [
  { code: "en-US", label: "English" },
  { code: "he-IL", label: "עברית" },
  { code: "ar-IL", label: "العربية" },
  { code: "ru-RU", label: "Русский" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
  { code: "es-ES", label: "Español" },
];

export function getLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && SUPPORTED_LANGS.some((l) => l.code === stored)) return stored;
  } catch {
    // ignore
  }
  return "en-US";
}

export function setLang(code) {
  try {
    if (SUPPORTED_LANGS.some((l) => l.code === code)) {
      localStorage.setItem(LANG_KEY, code);
    }
  } catch {
    // ignore
  }
}
