/**
 * LanguageContext — internationalisation (i18n) sans dépendance externe
 *
 * Usage :
 *   const { t, locale, setLocale } = useLanguage();
 *   t('auth.signIn')              // → "Se connecter" ou "Sign In"
 *   t('common.version', '1.2.3') // → "Version 1.2.3"
 *
 * La langue est persistée dans AsyncStorage sous la clé 'appLocale'.
 * Valeurs supportées : 'fr' | 'en'
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLocalization from 'expo-localization';

import fr from '@/locales/fr.json';
import en from '@/locales/en.json';

export type SupportedLocale = 'fr' | 'en';

const DICTIONARIES: Record<SupportedLocale, Record<string, unknown>> = { fr, en };

export const SUPPORTED_LANGUAGES: { code: SupportedLocale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const STORAGE_KEY = 'appLocale';

/** Résout un chemin pointé ex: 'auth.signIn' dans un objet imbriqué */
function resolvePath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (l: SupportedLocale) => void;
  /** Traduit une clé pointée, avec interpolation positionnelle optionnelle */
  t: (key: string, ...args: string[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectDeviceLocale(): SupportedLocale {
  const deviceLocale = ExpoLocalization.getLocales()[0]?.languageCode ?? 'fr';
  return deviceLocale.startsWith('fr') ? 'fr' : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('fr');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'fr' || saved === 'en') {
        setLocaleState(saved);
      } else {
        setLocaleState(detectDeviceLocale());
      }
      setReady(true);
    });
  }, []);

  const setLocale = (l: SupportedLocale) => {
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l);
  };

  const t = useCallback(
    (key: string, ...args: string[]): string => {
      const dict = DICTIONARIES[locale] as Record<string, unknown>;
      const value = resolvePath(dict, key)
        ?? resolvePath(DICTIONARIES.fr as Record<string, unknown>, key)
        ?? key; // fallback sur la clé elle-même

      // Interpolation positionnelle : remplace {{0}}, {{1}}… ou %s
      let result = value;
      args.forEach((arg, i) => {
        result = result.replace(`{{${i}}}`, arg).replace('%s', arg);
      });
      return result;
    },
    [locale]
  );

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
