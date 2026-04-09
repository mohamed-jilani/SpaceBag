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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Button, Card, Avatar } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useTrips, TripFilters } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@/types';

// ─── Chip de filtre actif ─────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <TouchableOpacity style={chipStyles.chip} onPress={onRemove}>
      <Text style={chipStyles.label}>{label}</Text>
      <Ionicons name="close" size={12} color={colors.primary} />
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryTint,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  label: { ...typography.tiny, color: colors.primary, fontWeight: '600' },
});

// ─── Carte de trajet ──────────────────────────────────────────────────────────

function TripCard({ item, onPress }: { item: Trip; onPress: () => void }) {
  const remainingPct =
    item.maxWeight > 0
      ? (item.remainingWeight ?? item.maxWeight) / item.maxWeight
      : 1;
  const capacityColor =
    remainingPct <= 0 ? colors.error : remainingPct < 0.3 ? colors.warning : colors.success;

  return (
    <Card variant="elevated" style={styles.tripCard} onPress={onPress}>
      <View style={styles.routeRow}>
        <View style={styles.cityCol}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={styles.cityName} numberOfLines={1}>{item.departure}</Text>
        </View>
        <View style={styles.routeMiddle}>
          <View style={styles.routeLine} />
          <Ionicons name="airplane" size={16} color={colors.primary} />
          <View style={styles.routeLine} />
        </View>
        <View style={[styles.cityCol, { alignItems: 'flex-end' }]}>
          <Ionicons name="location-sharp" size={14} color={colors.primary} />
          <Text style={styles.cityName} numberOfLines={1}>{item.arrival}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="scale-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.maxWeight} kg max</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="wallet-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText}>€{item.price}/kg</Text>
        </View>
      </View>

      {item.remainingWeight !== undefined && (
        <View style={styles.capacityRow}>
          <View style={styles.capacityTrack}>
            <View
              style={[
                styles.capacityFill,
                {
                  width: `${Math.max(0, Math.min(1, remainingPct)) * 100}%` as any,
                  backgroundColor: capacityColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.capacityText, { color: capacityColor }]}>
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

// ─── Modal / panneau de filtres ───────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: TripFilters;
  onChange: (f: Partial<TripFilters>) => void;
  onReset: () => void;
}) {
  return (
    <View style={filterStyles.panel}>
      <View style={filterStyles.row}>
        <View style={filterStyles.half}>
          <Text style={filterStyles.label}>Départ</Text>
          <TextInput
            style={filterStyles.input}
            placeholder="ex: Paris"
            placeholderTextColor={colors.textTertiary}
            value={filters.departure || ''}
            onChangeText={v => onChange({ departure: v || undefined })}
          />
        </View>
        <View style={filterStyles.half}>
          <Text style={filterStyles.label}>Arrivée</Text>
          <TextInput
            style={filterStyles.input}
            placeholder="ex: Londres"
            placeholderTextColor={colors.textTertiary}
            value={filters.arrival || ''}
            onChangeText={v => onChange({ arrival: v || undefined })}
          />
        </View>
      </View>
      <View style={filterStyles.row}>
        <View style={filterStyles.half}>
          <Text style={filterStyles.label}>Date min (YYYY-MM-DD)</Text>
          <TextInput
            style={filterStyles.input}
            placeholder="ex: 2025-06-01"
            placeholderTextColor={colors.textTertiary}
            value={filters.date || ''}
            onChangeText={v => onChange({ date: v || undefined })}
          />
        </View>
        <View style={filterStyles.half}>
          <Text style={filterStyles.label}>Prix max (€)</Text>
          <TextInput
            style={filterStyles.input}
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
          <Text style={filterStyles.label}>Poids min accepté (kg)</Text>
          <TextInput
            style={filterStyles.input}
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
            <Text style={filterStyles.resetText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const filterStyles = StyleSheet.create({
  panel: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1, gap: 4 },
  label: { ...typography.tiny, color: colors.textSecondary },
  input: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    ...typography.caption,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resetText: { ...typography.caption, color: colors.error },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

const EMPTY_FILTERS: TripFilters = {};

export default function HomeScreen() {
  const { user, profile, signOut } = useAuth();
  const isConnected = !!user;
  const isCarrier = profile?.role === 'carrier';

  // Le transporteur voit ses propres trajets, les autres voient tous les trajets actifs
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

  return (
    <Container style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {isConnected ? (
            <>
              <Avatar
                name={profile?.displayName || 'User'}
                source={profile?.photoURL ? { uri: profile.photoURL } : undefined}
                size="md"
              />
              <View>
                <Text style={styles.userName}>{profile?.displayName || 'Bonjour !'}</Text>
                <View style={styles.roleRow}>
                  <Text style={styles.userRole}>
                    {isCarrier ? '✈️ Transporteur' : '📦 Membre'}
                  </Text>
                  {profile?.kycVerified && (
                    <View style={styles.kycBadge}>
                      <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                      <Text style={styles.kycBadgeText}>Vérifié</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          ) : (
            <View>
              <Text style={styles.userName}>SpaceBag ✈️</Text>
              <Text style={styles.userRole}>Parcourez les trajets disponibles</Text>
            </View>
          )}
        </View>

        {isConnected ? (
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.loginBtn}
          >
            <Text style={styles.loginBtnText}>Connexion</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Bannière "Connectez-vous" pour les utilisateurs non connectés ── */}
      {!isConnected && (
        <TouchableOpacity
          style={styles.loginBanner}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Ionicons name="person-add-outline" size={18} color={colors.primary} />
          <Text style={styles.loginBannerText}>
            Créez un compte pour envoyer un colis →
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Barre de recherche rapide (tous les utilisateurs) ── */}
      {!isCarrier && (
        <View style={styles.searchBar}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher départ ou arrivée…"
              placeholderTextColor={colors.textTertiary}
              value={filters.departure || filters.arrival || ''}
              onChangeText={v => {
                updateFilter({ departure: v || undefined, arrival: v || undefined });
              }}
            />
            {(filters.departure || filters.arrival) && (
              <TouchableOpacity onPress={() => updateFilter({ departure: undefined, arrival: undefined })}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterToggle, hasActiveFilters && styles.filterToggleActive]}
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

      {/* ── Panneau filtres avancés ── */}
      {showFilters && !isCarrier && (
        <FilterPanel filters={filters} onChange={updateFilter} onReset={resetFilters} />
      )}

      {/* ── Chips filtres actifs ── */}
      {activeChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
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

      {/* ── Titre section + bouton action ── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            {isCarrier ? 'Mes trajets' : 'Trajets disponibles'}
          </Text>
          {!loading && (
            <Text style={styles.sectionCount}>
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
          <Button variant="outline" size="sm" onPress={() => router.push('/(tabs)/requests')}>
            Mes demandes
          </Button>
        ) : null}
      </View>

      {/* ── Liste des trajets ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement en temps réel…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TripCard
              item={item}
              onPress={() => router.push(`/trips/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="airplane-outline" size={56} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                {hasActiveFilters
                  ? 'Aucun trajet ne correspond à vos critères'
                  : isCarrier
                  ? "Vous n'avez pas encore publié de trajet"
                  : 'Aucun trajet disponible pour le moment'}
              </Text>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onPress={resetFilters} style={{ marginTop: spacing.md }}>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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
  kycBadgeText: { fontSize: 9, fontWeight: '700', color: colors.success },
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

  tripCard: { padding: spacing.md, backgroundColor: colors.backgroundSecondary, gap: spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  cityCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityName: { ...typography.bodyBold, color: colors.text, flexShrink: 1 },
  routeMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 0.6,
    paddingHorizontal: spacing.xs,
  },
  routeLine: { flex: 1, height: 1, backgroundColor: colors.primary + '40' },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundTertiary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { ...typography.tiny, color: colors.textSecondary },
  capacityRow: { gap: 4 },
  capacityTrack: {
    height: 5,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  capacityFill: { height: '100%', borderRadius: borderRadius.full },
  capacityText: { ...typography.tiny },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: { ...typography.h4, color: colors.textSecondary, textAlign: 'center' },
});
