/**
 * ThemeContext — gestion du thème clair / sombre
 *
 * Usage :
 *   const { isDark, colors, theme, setTheme, toggleTheme } = useTheme();
 *
 * Le thème est persisté dans AsyncStorage sous la clé 'appTheme'.
 * Valeurs possibles : 'dark' | 'light' | 'system'
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '@/constants/design';

export type AppTheme = 'dark' | 'light' | 'system';

type ColorPalette = typeof darkColors;

interface ThemeContextType {
  /** Thème choisi par l'utilisateur ('dark' | 'light' | 'system') */
  theme: AppTheme;
  /** Vrai si le thème actuel rendu est sombre */
  isDark: boolean;
  /** Palette de couleurs active (dépend de isDark) */
  colors: ColorPalette;
  /** Changer le thème */
  setTheme: (t: AppTheme) => void;
  /** Basculer dark ↔ light */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY = 'appTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null
  const [theme, setThemeState] = useState<AppTheme>('dark');
  const [ready, setReady] = useState(false);

  // Charger le thème depuis AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setThemeState(saved);
      }
      setReady(true);
    });
  }, []);

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t);
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Résoudre 'system' → dark ou light réel
  const isDark = useMemo(() => {
    if (theme === 'system') return systemScheme === 'dark';
    return theme === 'dark';
  }, [theme, systemScheme]);

  const colors: ColorPalette = useMemo(
    () => (isDark ? darkColors : lightColors),
    [isDark]
  );

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
