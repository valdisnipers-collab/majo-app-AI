import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Language = 'lv' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('maju_parvaldnieks_lang');
    return (saved === 'ru' ? 'ru' : 'lv');
  });

  const [locales, setLocales] = useState<any>({});

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    localStorage.setItem('maju_parvaldnieks_lang', lang);
  };

  useEffect(() => {
    const loadLocales = async () => {
      try {
        // Ielādējam no saknes (kas atbilst 'public' mapei projektā)
        const lvResponse = await fetch(`/locales/lv.json?v=${Date.now()}`);
        const ruResponse = await fetch(`/locales/ru.json?v=${Date.now()}`);
        const lv = await lvResponse.json();
        const ru = await ruResponse.json();
        setLocales({ lv, ru });
      } catch (err) {
        console.error('Kļūda ielādējot valodu failus. Pārliecinieties, ka locales mape ir iekš PUBLIC!', err);
      }
    };
    loadLocales();
  }, []);

  const t = (path: string): string => {
    if (!locales[language]) return path;
    
    const keys = path.split('.');
    let result = locales[language];
    
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        let fallbackResult = locales['lv'];
        if (fallbackResult) {
          for (const fKey of keys) {
            if (fallbackResult && fallbackResult[fKey]) {
              fallbackResult = fallbackResult[fKey];
            } else {
              return path;
            }
          }
          return fallbackResult as string;
        }
        return path;
      }
    }
    
    return typeof result === 'string' ? result : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within LanguageProvider');
  return context;
};