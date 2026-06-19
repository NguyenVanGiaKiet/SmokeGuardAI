import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from '@/translations/en.json';
import vi from '@/translations/vi.json';

type Language = 'en' | 'vi';

const translations = { en, vi };
const STORAGE_KEY = '@BreatheFree:language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLang) {
        setLanguageState(savedLang as Language);
      } else {
        // Fallback to system locale
        const systemLang = Localization.getLocales()[0].languageCode;
        setLanguageState(systemLang === 'vi' ? 'vi' : 'en');
      }
    } catch (e) {
      console.error('Failed to load language', e);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  };

  const t = useCallback((key: string) => {
    const keys = key.split('.');
    let translation: any = translations[language];
    for (const k of keys) {
      if (translation[k]) {
        translation = translation[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageContextProvider');
  }
  return context;
};
