import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import en from './en.json';
import te from './te.json';
import hi from './hi.json';
import { getLanguage, setLanguage as persistLanguage } from '../services/storage';

/**
 * Translation layer (spec section 26).
 * UI text lives in JSON files; adding a language means adding a file and one
 * entry to LANGUAGES.
 */

const CATALOGUES = { en, te, hi };

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' }
];

const I18nContext = createContext({ t: (k) => k, language: 'en', setLanguage: () => {} });

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getLanguage().then((code) => {
      if (CATALOGUES[code]) setLanguageState(code);
      setReady(true);
    });
  }, []);

  const value = useMemo(() => {
    const catalogue = CATALOGUES[language] || en;

    /**
     * Look up a key, falling back to English and then to the key itself, so a
     * missing translation degrades to readable text instead of blank space.
     * `params` fills {placeholders}.
     */
    const t = (key, params) => {
      let text = catalogue[key] ?? en[key] ?? key;
      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          text = text.split(`{${name}}`).join(String(replacement));
        }
      }
      return text;
    };

    const setLanguage = async (code) => {
      if (!CATALOGUES[code]) return;
      setLanguageState(code);
      await persistLanguage(code);
    };

    return { t, language, setLanguage, ready };
  }, [language, ready]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useTranslation = () => useContext(I18nContext);

export default I18nProvider;
