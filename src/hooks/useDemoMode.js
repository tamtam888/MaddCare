// src/hooks/useDemoMode.js
// Returns true when the app is running in Public Demo Mode.
// mc_demo_mode is set by LoginPage's "Try Demo" button and cleared on logout.

export function useDemoMode() {
  return localStorage.getItem("mc_demo_mode") === "true";
}

// Bilingual read-only message shown in place of mutation actions.
export const DEMO_READONLY_MSG = {
  en: "This is a demo. Editing is disabled.",
  he: "זוהי גרסת דמו. עריכה אינה זמינה.",
};
