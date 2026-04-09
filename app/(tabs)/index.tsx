import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Button, Card, Avatar } from '@/components/ui';
import { darkColors, spacing, typography, borderRadius } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTrips, TripFilters } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@/types';

type Colors = typeof darkColors;

// ─── Chip de filtre actif ─────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        chipStyles.chip,
        { backgroundColor: colors.primaryTint, borderColor: colors.primary + '40' },
      ]}
      onPress={onRemove}
    >
      <Text style={[chipStyles.label, { color: colors.primary }]}>{label}</Text>
      <Ionicons name="close" size={12} color={colors.primary} />
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
  label: { ...typography.tiny, fontWeight: '600' },
});

// ─── Carte de trajet ──────────────────────────────────────────────────────────

function TripCard({ item, onPress }: { item: Trip; onPress: () => void }) {
  const { colors } = useTheme();
  const remainingPct =
    item.maxWeight > 0
      ? (item.remainingWeight ?? item.maxWeight) / item.maxWeight
      : 1;
  const capacityColor =
    remainingPct <= 0 ? colors.error : remainingPct < 0.3 ? colors.warning : colors.success;

  return (
    <Card
      variant="elevated"
      style={{ ...tripCardStyles.card, backgroundColor: colors.backgroundSecondary } as ViewStyle}
      onPress={onPress}
    >
      <View style={tripCardStyles.routeRow}>
        <View style={tripCardStyles.cityCol}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={[tripCardStyles.cityName, { color: colors.text }]} numberOfLines={1}>
            {item.departure}
          </Text>
        </View>
        <View style={tripCardStyles.routeMiddle}>
          <View style={[tripCardStyles.routeLine, { backgroundColor: colors.primary + '40' }]} />
          <Ionicons name="airplane" size={16} color={colors.primary} />
          <View style={[tripCardStyles.routeLine, { backgroundColor: colors.primary + '40' }]} />
        </View>
        <View style={[tripCardStyles.cityCol, { alignItems: 'flex-end' }]}>
          <Ionicons name="location-sharp" size={14} color={colors.primary} />
          <Text style={[tripCardStyles.cityName, { color: colors.text }]} numberOfLines={1}>
            {item.arrival}
          </Text>
        </View>
      </View>

      <View
        style={[
          tripCardStyles.detailsRow,
          { backgroundColor: colors.backgroundTertiary },
        ]}
      >
        <View style={tripCardStyles.detailItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
          <Text style={[tripCardStyles.detailText, { color: colors.textSecondary }]}>
            {item.date}
          </Text>
        </View>
        <View style={tripCardStyles.detailItem}>
          <Ionicons name="scale-outline" size={13} color={colors.textSecondary} />
          <Text style={[tripCardStyles.detailText, { color: colors.textSecondary }]}>
            {item.maxWeight} kg max
          </Text>
        </View>
        <View style={tripCardStyles.detailItem}>
          <Ionicons name="wallet-outline" size={13} color={colors.textSecondary} />
          <Text style={[tripCardStyles.detailText, { color: colors.textSecondary }]}>
            €{item.price}/kg
          </Text>
        </View>
      </View>

      {item.remainingWeight !== undefined && (
        <View style={tripCardStyles.capacityRow}>
          <View
            style={[
              tripCardStyles.capacityTrack,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <View
              style={[
                tripCardStyles.capacityFill,
                {
                  width: `${Math.max(0, Math.min(1, remainingPct)) * 100}%` as any,
                  backgroundColor: capacityColor,
                },
              ]}
            />
          </View>
          <Text style={[tripCardStyles.capacityText, { color: capacityColor }]}>
            {item.remainingWeight} kg / {item.remainingParcels} colis restants
          </Text>
        </View>
      )}

      <Button variant="outline" size="sm" style={{ width: '100%' }} onPress={onPress}>
        Voir le trajet
      </Button>
    </Card>
  );
}

const tripCardStyles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  cityCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityName: { ...typography.bodyBold, flexShrink: 1 },
  routeMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 0.6,
    paddingHorizontal: spacing.xs,
  },
  routeLine: { flex: 1, height: 1 },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { ...typography.tiny },
  capacityRow: { gap: 4 },
  capacityTrack: {
    height: 5,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  capacityFill: { height: '100%', borderRadius: borderRadius.full },
  capacityText: { ...typography.tiny },
});

// ─── Panneau de filtres avancés ───────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: TripFilters;
  onChange: (f: Partial<TripFilters>) => void;
  onReset: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        filterStyles.panel,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.backgroundTertiary },
      ]}
    >
      <View style={filterStyles.row}>
        <View style={filterStyles.half}>
          <Text style={[filterStyles.label, { color: colors.textSecondary }]}>Départ</Text>
          <TextInput
            style={[
              filterStyles.input,
              {
                backgroundColor: colors.backgroundTertiary,
                color: colors.text,
                borderColor: colors.border + '40',
              },
            ]}
            placeholder="ex: Paris"
            placeholderTextColor={colors.textTertiary}
            value={filters.departure || ''}
            onChangeText={v => onChange({ departure: v || undefined })}
          />
        </View>
        <View style={filterStyles.half}>
          <Text style={[filterStyles.label, { color: colors.textSecondary }]}>Arrivée</Text>
          <TextInput
            style={[
              filterStyles.input,
              {
                backgroundColor: colors.backgroundTertiary,
                color: colors.text,
                borderColor: colors.border + '40',
              },
            ]}
            placeholder="ex: Londres"
            placeholderTextColor={colors.textTertiary}
            value={filters.arrival || ''}
            onChangeText={v => onChange({ arrival: v || undefined })}
          />
        </View>
      </View>
      <View style={filterStyles.row}>
        <View style={filterStyles.half}>
          <Text style={[filterStyles.label, { color: colors.textSecondary }]}>
            Date min (YYYY-MM-DD)
          </Text>
          <TextInput
            style={[
              filterStyles.input,
              {
                backgroundColor: colors.backgroundTertiary,
                color: colors.text,
                borderColor: colors.border + '40',
              },
            ]}
            placeholder="ex: 2025-06-01"
            placeholderTextColor={colors.textTertiary}
            value={filters.date || ''}
            onChangeText={v => onChange({ date: v || undefined })}
          />
        </View>
        <View style={filterStyles.half}>
          <Text style={[filterStyles.label, { color: colors.textSecondary }]}>Prix max (€)</Text>
          <TextInput
            style={[
              filterStyles.input,
              {
                backgroundColor: colors.backgroundTertiary,
                color: colors.text,
                borderColor: colors.border + '40',
              },
            ]}
            placeholder="ex: 30"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={filters.maxPrice !== undefined ? String(filters.maxPrice) : ''}
            onChangeText={v => onChange({ maxPrice: v ? parseFloat(v) : undefined })}
          />
        </View>
      </View>
      <View style={filterStyles.row}>
        <View style={filterStyles.half}>
          <Text style={[filterStyles.label, { color: colors.textSecondary }]}>
            Poids min accepté (kg)
          </Text>
          <TextInput
            style={[
              filterStyles.input,
              {
                backgroundColor: colors.backgroundTertiary,
                color: colors.text,
                borderColor: colors.border + '40',
              },
            ]}
            placeholder="ex: 2"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={filters.minWeight !== undefined ? String(filters.minWeight) : ''}
            onChangeText={v => onChange({ minWeight: v ? parseFloat(v) : undefined })}
          />
        </View>
        <View style={filterStyles.half}>
          <TouchableOpacity style={filterStyles.resetBtn} onPress={onReset}>
            <Ionicons name="refresh-outline" size={16} color={colors.error} />
            <Text style={[filterStyles.resetText, { color: colors.error }]}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const filterStyles = StyleSheet.create({
  panel: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1, gap: 4 },
  label: { ...typography.tiny },
  input: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    ...typography.caption,
    borderWidth: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resetText: { ...typography.caption },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

const EMPTY_FILTERS: TripFilters = {};

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user, profile, signOut } = useAuth();
  const isConnected = !!user;
  const isCarrier = profile?.role === 'carrier';

  const carrierId = isCarrier ? profile.uid : undefined;
  const { trips, loading, applyFilters } = useTrips(carrierId);
  const router = useRouter();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TripFilters>(EMPTY_FILTERS);

  const filteredTrips = useMemo(() => applyFilters(trips, filters), [trips, filters]);
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  const updateFilter = (partial: Partial<TripFilters>) =>
    setFilters(prev => ({ ...prev, ...partial }));
  const resetFilters = () => setFilters(EMPTY_FILTERS);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.departure) chips.push({ key: 'departure', label: `Départ: ${filters.departure}` });
    if (filters.arrival) chips.push({ key: 'arrival', label: `Arrivée: ${filters.arrival}` });
    if (filters.date) chips.push({ key: 'date', label: `Après: ${filters.date}` });
    if (filters.maxPrice !== undefined) chips.push({ key: 'maxPrice', label: `Max €${filters.maxPrice}` });
    if (filters.minWeight !== undefined) chips.push({ key: 'minWeight', label: `≥ ${filters.minWeight} kg` });
    return chips;
  }, [filters]);

  const s = useMemo(() => buildStyles(colors), [colors]);

  return (
    <Container backgroundColor={colors.background} style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.userInfo}>
          {isConnected ? (
            <>
              <Avatar
                name={profile?.displayName || 'User'}
                source={profile?.photoURL ? { uri: profile.photoURL } : undefined}
                size="md"
              />
              <View>
                <Text style={s.userName}>{profile?.displayName || 'Bonjour !'}</Text>
                <View style={s.roleRow}>
                  <Text style={s.userRole}>
                    {isCarrier ? '✈️ Transporteur' : '📦 Membre'}
                  </Text>
                  {profile?.kycVerified && (
                    <View style={s.kycBadge}>
                      <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                      <Text style={s.kycBadgeText}>Vérifié</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View>
              <Text style={s.userName}>SpaceBag ✈️</Text>
              <Text style={s.userRole}>Parcourez les trajets disponibles</Text>
            </View>
          )}
        </View>

        {isConnected ? (
          <TouchableOpacity onPress={signOut} style={s.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={s.loginBtn}
          >
            <Text style={s.loginBtnText}>Connexion</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Bannière inscription ── */}
      {!isConnected && (
        <TouchableOpacity
          style={s.loginBanner}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          <Text style={s.loginBannerText}>Créez un compte pour envoyer un colis →</Text>
        </TouchableOpacity>
      )}

      {/* ── Barre de recherche ── */}
      {!isCarrier && (
        <View style={s.searchBar}>
          <View style={s.searchInputWrapper}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher départ ou arrivée…"
              placeholderTextColor={colors.textTertiary}
              value={filters.departure || filters.arrival || ''}
              onChangeText={v => {
                updateFilter({ departure: v || undefined, arrival: v || undefined });
              }}
            />
            {(filters.departure || filters.arrival) && (
              <TouchableOpacity
                onPress={() => updateFilter({ departure: undefined, arrival: undefined })}
              >
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.filterToggle, hasActiveFilters && s.filterToggleActive]}
            onPress={() => setShowFilters(v => !v)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filtres avancés ── */}
      {showFilters && !isCarrier && (
        <FilterPanel filters={filters} onChange={updateFilter} onReset={resetFilters} />
      )}

      {/* ── Chips filtres actifs ── */}
      {activeChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {activeChips.map(chip => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              onRemove={() => updateFilter({ [chip.key]: undefined } as Partial<TripFilters>)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Titre + bouton action ── */}
      <View style={s.sectionHeader}>
        <View>
          <Text style={s.sectionTitle}>
            {isCarrier ? 'Mes trajets' : 'Trajets disponibles'}
          </Text>
          {!loading && (
            <Text style={s.sectionCount}>
              {filteredTrips.length} trajet{filteredTrips.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' (filtré)' : ''}
            </Text>
          )}
        </View>
        {isCarrier ? (
          <Button variant="primary" size="sm" onPress={() => router.push('/trips/new')}>
            + Publier
          </Button>
        ) : isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onPress={() => router.push('/(tabs)/requests')}
          >
            Mes demandes
          </Button>
        ) : null}
      </View>

      {/* ── Liste ── */}
      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Chargement en temps réel…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TripCard item={item} onPress={() => router.push(`/trips/${item.id}`)} />
          )}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="airplane-outline" size={56} color={colors.textTertiary} />
              <Text style={s.emptyTitle}>
                {hasActiveFilters
                  ? 'Aucun trajet ne correspond à vos critères'
                  : isCarrier
                  ? "Vous n'avez pas encore publié de trajet"
                  : 'Aucun trajet disponible pour le moment'}
              </Text>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={resetFilters}
                  style={{ marginTop: spacing.md }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
              {isCarrier && !hasActiveFilters && (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => router.push('/trips/new')}
                  style={{ marginTop: spacing.md }}
                >
                  Publier mon premier trajet
                </Button>
              )}
              {!isConnected && !hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/(auth)/signup')}
                  style={{ marginTop: spacing.md }}
                >
                  Créer un compte
                </Button>
              )}
            </View>
          }
        />
      )}
    </Container>
  );
}

// ─── buildStyles — styles dynamiques selon le thème ──────────────────────────

function buildStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    userName: { ...typography.bodyBold, color: colors.text },
    roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
    userRole: { ...typography.caption, color: colors.textSecondary },
    kycBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.successTint,
      borderRadius: borderRadius.full,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    kycBadgeText: { fontSize: 9, fontWeight: '700' as const, color: colors.success },
    logoutBtn: { padding: spacing.xs },
    loginBtn: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    loginBtnText: { ...typography.captionBold, color: colors.black },

    loginBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      backgroundColor: colors.primary + '15',
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.primary + '40',
    },
    loginBannerText: { ...typography.caption, color: colors.primary, flex: 1 },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.backgroundTertiary,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: colors.text,
      paddingVertical: 0,
    },
    filterToggle: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.backgroundTertiary,
    },
    filterToggleActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryTint,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    sectionTitle: { ...typography.h2, color: colors.text },
    sectionCount: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: { ...typography.body, color: colors.textSecondary },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    emptyContainer: { padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
    emptyTitle: { ...typography.h4, color: colors.textSecondary, textAlign: 'center' },
  });
}
