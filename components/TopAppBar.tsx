/**
 * TopAppBar — barre d'en-tête commune à tous les écrans
 *
 * Props :
 *   title          Titre centré (optionnel)
 *   showBack       Affiche la flèche retour (default false)
 *   onBack         Callback retour (default: router.back())
 *   rightActions   Éléments à droite (icône thème, paramètres, etc.)
 *   showThemeToggle Affiche l'icône soleil/lune (default false)
 *   showLogo       Affiche le logo SpaceBag à gauche (default true si pas de retour)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/design';

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  showThemeToggle?: boolean;
  showLogo?: boolean;
}

export function TopAppBar({
  title,
  showBack = false,
  onBack,
  rightActions,
  showThemeToggle = false,
  showLogo,
}: TopAppBarProps) {
  const router = useRouter();
  const { isDark, toggleTheme, colors } = useTheme();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  // Par défaut : logo si pas de bouton retour
  const displayLogo = showLogo ?? !showBack;

  return (
    <View style={[styles.bar, { backgroundColor: colors.background, borderBottomColor: colors.backgroundSecondary }]}>
      {/* Gauche */}
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        {displayLogo && !showBack && (
          <View style={[styles.logoContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="airplane" size={18} color={colors.primary} />
            <Text style={[styles.logoText, { color: colors.primary }]}>SpaceBag</Text>
          </View>
        )}
      </View>

      {/* Centre */}
      {title ? (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}

      {/* Droite */}
      <View style={styles.right}>
        {showThemeToggle && (
          <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {rightActions}
      </View>
    </View>
  );
}

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: STATUS_BAR_HEIGHT + spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    minHeight: 56 + STATUS_BAR_HEIGHT,
  },
  left: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  titlePlaceholder: { flex: 1 },
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  logoText: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
});
