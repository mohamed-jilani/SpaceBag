/**
 * Écran de suivi de colis simulé.
 * - [id] = requestId
 * - Affiche progression, étapes, et coordonnées simulées.
 * - Le transporteur peut avancer la simulation via un bouton.
 * - La position se met à jour en temps réel (onSnapshot) pour le membre.
 *
 * Note : react-native-maps n'est pas installé.
 * On utilise une représentation visuelle (progress bar + map placeholder).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useTracking } from '@/hooks/useTracking';
import { getStepLabel, TRACKING_STEP_LABELS } from '@/services/tracking';

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  picked_up: 'cube-outline',
  in_transit: 'airplane-outline',
  near_destination: 'location-outline',
  delivered: 'checkmark-circle-outline',
};

export default function TrackingScreen() {
  const router = useRouter();
  const { id, departure, arrival } = useLocalSearchParams<{
    id: string;
    departure?: string;
    arrival?: string;
  }>();
  const { profile } = useAuth();

  const {
    tracking,
    loading,
    isUpdating,
    startTracking,
    updateTracking,
  } = useTracking(id ?? '', departure, arrival);

  const isCarrier = profile?.role === 'carrier';
  const isDelivered = tracking?.status === 'delivered';
  const currentStep = tracking?.progressPercent ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi du colis</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Carte visuelle de la route */}
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapRoute}>
              <View style={styles.mapCity}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <Text style={styles.mapCityName}>{departure ?? 'Départ'}</Text>
              </View>
              <View style={styles.mapLine}>
                <View
                  style={[
                    styles.mapProgress,
                    { width: `${currentStep}%` as any },
                  ]}
                />
                {tracking && (
                  <View style={[styles.packageDot, { left: `${currentStep}%` as any }]}>
                    <Ionicons name="cube" size={18} color={colors.black} />
                  </View>
                )}
              </View>
              <View style={styles.mapCity}>
                <Ionicons name="location-sharp" size={20} color={colors.error} />
                <Text style={styles.mapCityName}>{arrival ?? 'Arrivée'}</Text>
              </View>
            </View>

            {tracking && (
              <View style={styles.coordsRow}>
                <Ionicons name="navigate-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.coords}>
                  {tracking.lat.toFixed(4)}, {tracking.lng.toFixed(4)}
                </Text>
              </View>
            )}
          </View>

          {/* Progression */}
          {tracking ? (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progression du trajet</Text>
                <Text style={styles.progressPct}>{tracking.progressPercent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${tracking.progressPercent}%` as any },
                  ]}
                />
              </View>
              <View style={styles.statusRow}>
                <Ionicons
                  name={STEP_ICONS[tracking.status] ?? 'cube-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.statusLabel}>{getStepLabel(tracking.status)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noTrackingCard}>
              <Ionicons name="locate-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.noTrackingTitle}>Suivi non démarré</Text>
              <Text style={styles.noTrackingBody}>
                {isCarrier
                  ? 'Appuyez sur "Démarrer le suivi" pour initialiser le suivi de ce colis.'
                  : 'Le transporteur n\'a pas encore démarré le suivi de ce colis.'}
              </Text>
            </View>
          )}

          {/* Étapes */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Étapes du trajet</Text>
            {TRACKING_STEP_LABELS.map((step, i) => {
              const stepPct = step.progressPercent;
              const done = currentStep >= stepPct;
              const active = tracking && tracking.progressPercent === stepPct;
              return (
                <View key={i} style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    done ? styles.stepDotDone : null,
                    active ? styles.stepDotActive : null,
                  ]}>
                    {done ? (
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    ) : (
                      <Text style={styles.stepDotNumber}>{i + 1}</Text>
                    )}
                  </View>
                  {i < TRACKING_STEP_LABELS.length - 1 && (
                    <View style={[styles.stepLine, done && styles.stepLineDone]} />
                  )}
                  <Text style={[
                    styles.stepLabel,
                    done && styles.stepLabelDone,
                    active && styles.stepLabelActive,
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Actions transporteur */}
          {isCarrier && !isDelivered && (
            <View style={styles.carrierActions}>
              {!tracking ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={startTracking}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={colors.black} />
                  ) : (
                    <>
                      <Ionicons name="play-circle-outline" size={22} color={colors.black} />
                      <Text style={styles.actionBtnText}>Démarrer le suivi</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={updateTracking}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={colors.black} />
                  ) : (
                    <>
                      <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.black} />
                      <Text style={styles.actionBtnText}>Mettre à jour le suivi</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {isDelivered && (
            <View style={styles.deliveredBanner}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.deliveredText}>Colis livré avec succès !</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...typography.h2, color: colors.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  // Carte visuelle
  mapPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
  },
  mapRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapCity: {
    alignItems: 'center',
    gap: 4,
    width: 70,
  },
  mapCityName: {
    ...typography.tiny,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapLine: {
    flex: 1,
    height: 8,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    overflow: 'visible',
    position: 'relative',
  },
  mapProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  packageDot: {
    position: 'absolute',
    top: -14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -16,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  coords: { ...typography.tiny, color: colors.textTertiary },

  // Progression
  progressCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { ...typography.bodyBold, color: colors.text },
  progressPct: { ...typography.h2, color: colors.primary },
  progressTrack: {
    height: 12,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusLabel: { ...typography.bodyBold, color: colors.primary },

  noTrackingCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  noTrackingTitle: { ...typography.h3, color: colors.textSecondary },
  noTrackingBody: { ...typography.body, color: colors.textTertiary, textAlign: 'center' },

  // Étapes
  stepsCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepsTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    position: 'relative',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: colors.backgroundTertiary,
  },
  stepDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stepDotNumber: { ...typography.tinyBold, color: colors.textTertiary },
  stepLine: {
    position: 'absolute',
    left: 13,
    top: 28,
    width: 2,
    height: 28,
    backgroundColor: colors.backgroundTertiary,
  },
  stepLineDone: { backgroundColor: colors.success },
  stepLabel: { ...typography.body, color: colors.textTertiary, paddingTop: 4 },
  stepLabelDone: { color: colors.text },
  stepLabelActive: { color: colors.primary, fontWeight: '600' },

  // Actions transporteur
  carrierActions: { gap: spacing.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  actionBtnText: { ...typography.bodyBold, color: colors.black },

  deliveredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  deliveredText: { ...typography.bodyBold, color: colors.success },
});
