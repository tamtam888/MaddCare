// src/i18n/LanguageContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { LANGUAGES, t as translate } from './translations';

const STORAGE_KEY = 'mc_ui_lang';

const LanguageContext = createContext({
  lang: 'en',
  dir: 'ltr',
  setLang: () => {},
  t: (key) => key,
  languages: LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && LANGUAGES.find((l) => l.code === stored)) return stored;
    } catch {}
    return 'en';
  });

  const langConfig = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const dir = langConfig.dir;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang, dir]);

  const setLang = (code) => {
    if (LANGUAGES.find((l) => l.code === code)) {
      setLangState(code);
    }
  };

  const tFn = (key) => translate(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, t: tFn, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
