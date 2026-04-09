/**
 * Écran Paramètres
 * - Thème (sombre / clair / système)
 * - Langue (Français / English)
 * - Permissions (état + demande)
 * - Portefeuille (lien)
 * - À propos (version, CGU, confidentialité)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES, SupportedLocale } from '@/contexts/LanguageContext';
import {
  AllPermissions,
  getAllPermissionsStatus,
  requestCameraPermission,
  requestMediaLibraryPermission,
  requestLocationPermission,
  openAppSettings,
} from '@/services/permissions';
import { spacing, typography, borderRadius } from '@/constants/design';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme, isDark, colors } = useTheme();
  const { t, locale, setLocale } = useLanguage();
  const [permissions, setPermissions] = useState<AllPermissions | null>(null);
  const [loadingPerm, setLoadingPerm] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoadingPerm(true);
    try {
      const p = await getAllPermissionsStatus();
      setPermissions(p);
    } finally {
      setLoadingPerm(false);
    }
  };

  const handleRequestPerm = async (type: 'camera' | 'mediaLibrary' | 'location') => {
    let status: string;
    if (type === 'camera') status = await requestCameraPermission();
    else if (type === 'mediaLibrary') status = await requestMediaLibraryPermission();
    else status = await requestLocationPermission();
    await loadPermissions();
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // ── Helpers UI ──────────────────────────────────────────────────────────────
  const s = buildStyles(colors);

  const PermRow = ({
    label,
    desc,
    status,
    onRequest,
  }: {
    label: string;
    desc: string;
    status?: string;
    onRequest: () => void;
  }) => {
    const isGranted = status === 'granted';
    const isDenied = status === 'denied';
    return (
      <View style={s.permRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.permLabel}>{label}</Text>
          <Text style={s.permDesc}>{desc}</Text>
        </View>
        {isGranted ? (
          <View style={[s.permBadge, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[s.permBadgeText, { color: colors.success }]}>{t('settings.permGranted')}</Text>
          </View>
        ) : isDenied ? (
          <TouchableOpacity style={[s.permBadge, { backgroundColor: colors.error + '15' }]} onPress={openAppSettings}>
            <Ionicons name="settings-outline" size={14} color={colors.error} />
            <Text style={[s.permBadgeText, { color: colors.error }]}>{t('settings.permOpenSettings')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.permBadge, { backgroundColor: colors.primary + '20' }]} onPress={onRequest}>
            <Text style={[s.permBadgeText, { color: colors.primary }]}>{t('settings.permRequest')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const THEME_OPTIONS: { value: AppTheme; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { value: 'dark', icon: 'moon-outline', label: t('settings.themeDark') },
    { value: 'light', icon: 'sunny-outline', label: t('settings.themeLight') },
    { value: 'system', icon: 'phone-portrait-outline', label: t('settings.themeSystem') },
  ];

  return (
    <ScrollView
      style={[s.container]}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.pageTitle}>{t('settings.title')}</Text>

      {/* ── Thème ── */}
      <SectionCard title={t('settings.theme')} colors={colors}>
        <View style={s.themeRow}>
          {THEME_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.themeBtn, theme === opt.value && s.themeBtnActive]}
              onPress={() => setTheme(opt.value)}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={theme === opt.value ? colors.primary : colors.textSecondary}
              />
              <Text style={[s.themeBtnText, theme === opt.value && { color: colors.primary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      {/* ── Langue ── */}
      <SectionCard title={t('settings.language')} colors={colors}>
        {SUPPORTED_LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[s.langRow, locale === lang.code && s.langRowActive]}
            onPress={() => setLocale(lang.code as SupportedLocale)}
          >
            <Text style={s.langFlag}>{lang.flag}</Text>
            <Text style={[s.langLabel, locale === lang.code && { color: colors.primary }]}>
              {lang.label}
            </Text>
            {locale === lang.code && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </SectionCard>

      {/* ── Permissions ── */}
      <SectionCard title={t('settings.permissions')} colors={colors}>
        {loadingPerm ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <PermRow
              label={t('settings.permCamera')}
              desc={t('settings.permCameraDesc')}
              status={permissions?.camera}
              onRequest={() => handleRequestPerm('camera')}
            />
            <View style={s.divider} />
            <PermRow
              label={t('settings.permStorage')}
              desc={t('settings.permStorageDesc')}
              status={permissions?.mediaLibrary}
              onRequest={() => handleRequestPerm('mediaLibrary')}
            />
            <View style={s.divider} />
            <PermRow
              label={t('settings.permLocation')}
              desc={t('settings.permLocationDesc')}
              status={permissions?.location}
              onRequest={() => handleRequestPerm('location')}
            />
          </>
        )}
      </SectionCard>

      {/* ── Portefeuille ── */}
      <SectionCard title={t('settings.wallet')} colors={colors}>
        <TouchableOpacity style={s.linkRow} onPress={() => router.push('/wallet' as any)}>
          <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          <Text style={s.linkText}>{t('profile.walletLink')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </SectionCard>

      {/* ── À propos ── */}
      <SectionCard title={t('settings.about')} colors={colors}>
        <View style={s.aboutRow}>
          <Text style={s.aboutLabel}>{t('settings.appVersion')}</Text>
          <Text style={s.aboutValue}>{appVersion}</Text>
        </View>
        <View style={s.divider} />
        <TouchableOpacity style={s.linkRow} onPress={() => router.push('/legal/cgu')}>
          <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
          <Text style={s.linkText}>{t('settings.cgu')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </SectionCard>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.backgroundTertiary }]}>
      <Text style={[cardStyles.title, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  title: {
    ...typography.tinyBold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
});

// ─── buildStyles ─────────────────────────────────────────────────────────────

function buildStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.lg, paddingTop: spacing.xl },
    pageTitle: { ...typography.h1, color: colors.text, marginBottom: spacing.xl },

    // Thème
    themeRow: { flexDirection: 'row', gap: spacing.sm },
    themeBtn: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    themeBtnActive: { borderColor: colors.primary },
    themeBtnText: { ...typography.tiny, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },

    // Langue
    langRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.xs,
    },
    langRowActive: { backgroundColor: colors.primary + '10' },
    langFlag: { fontSize: 22 },
    langLabel: { ...typography.body, color: colors.text, flex: 1 },

    // Permissions
    permRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    permLabel: { ...typography.captionBold, color: colors.text },
    permDesc: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
    permBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    permBadgeText: { ...typography.tiny, fontWeight: '600' },

    // Liens
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    linkText: { ...typography.body, color: colors.text, flex: 1 },

    // About
    aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    aboutLabel: { ...typography.body, color: colors.textSecondary },
    aboutValue: { ...typography.bodyBold, color: colors.text },

    divider: { height: 1, backgroundColor: colors.backgroundTertiary },
  });
}
