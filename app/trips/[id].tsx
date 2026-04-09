import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Container, Button, Card, Input, Avatar } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useTrips } from '@/hooks/useTrips';
import { useRequests } from '@/hooks/useRequests';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/lib/cloudinary';
import { Trip, Request } from '@/types';

// ─── Barre de capacité ────────────────────────────────────────────────────────

function CapacityBar({
  label,
  used,
  total,
  unit,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
}) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const barColor = pct >= 1 ? colors.error : pct >= 0.75 ? colors.warning : colors.success;

  return (
    <View style={capStyles.container}>
      <View style={capStyles.row}>
        <Text style={capStyles.label}>{label}</Text>
        <Text style={[capStyles.value, { color: pct >= 1 ? colors.error : colors.text }]}>
          {remaining} {unit} restant{remaining !== 1 && unit !== 'kg' ? 's' : ''}
        </Text>
      </View>
      <View style={capStyles.track}>
        <View style={[capStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const capStyles = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.tiny, color: colors.textSecondary },
  value: { ...typography.tinyBold },
  track: {
    height: 6,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: borderRadius.full },
});

// ─── Écran de détail du trajet ────────────────────────────────────────────────

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { profile, user } = useAuth();
  const { getTrip, getExistingRequest } = useTrips();
  const { createRequest } = useRequests();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  // Demande déjà existante du membre pour ce trajet
  const [existingRequest, setExistingRequest] = useState<Request | null>(null);

  // Formulaire de demande
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTrip = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTrip(id as string);
      setTrip(data);

      // Vérifier si le membre a déjà une demande active sur ce trajet
      if (data && user && profile?.role === 'member') {
        const existing = await getExistingRequest(data.id, user.uid);
        setExistingRequest(existing);
      }
    } catch (error) {
      console.error('Erreur chargement trajet :', error);
    } finally {
      setLoading(false);
    }
  }, [id, user, profile?.role]);

  useEffect(() => {
    if (id) loadTrip();
  }, [id]);

  // ── Sélection d'image ──────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  // ── Soumission de la demande ───────────────────────────────────────────────
  const handleSubmitRequest = async () => {
    if (!weight) {
      Alert.alert('Champ requis', 'Le poids est obligatoire.');
      return;
    }
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Poids invalide', 'Veuillez entrer un poids valide (ex : 2.5).');
      return;
    }
    if (trip && trip.remainingWeight !== undefined && parsedWeight > trip.remainingWeight) {
      Alert.alert(
        'Poids trop élevé',
        `La capacité restante est de ${trip.remainingWeight} kg. Votre colis pèse ${parsedWeight} kg.`
      );
      return;
    }
    if (!trip || !user) return;

    try {
      setSubmitting(true);
      let photoUrl: string | undefined;
      if (photoUri) {
        photoUrl = await uploadImage(photoUri);
      }

      await createRequest({
        tripId: trip.id,
        memberId: user.uid,
        carrierId: trip.carrierId,
        memberDisplayName: profile?.displayName,
        weight: parsedWeight,
        dimensions: dimensions || undefined,
        description: description || undefined,
        photoUrl,
      });

      // Réinitialiser
      setShowRequestForm(false);
      setWeight('');
      setDimensions('');
      setDescription('');
      setPhotoUri(null);

      Alert.alert(
        '✅ Demande envoyée !',
        'Le transporteur a été notifié. Vous serez informé dès qu\'il répond.',
        [
          { text: 'Voir mes demandes', onPress: () => router.push('/(tabs)/requests') },
          { text: 'Rester ici', style: 'cancel', onPress: loadTrip },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer la demande.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── États de chargement / erreur ───────────────────────────────────────────
  if (loading) {
    return (
      <Container style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Container>
    );
  }

  if (!trip) {
    return (
      <Container style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Trajet introuvable</Text>
        <Button variant="primary" onPress={() => router.back()}>Retour</Button>
      </Container>
    );
  }

  const isConnected = !!user;
  const isCarrier = trip.carrierId === user?.uid;
  const isMember = profile?.role === 'member' && !isCarrier;
  const isTripFull = trip.status === 'full';

  // Capacité utilisée pour les barres visuelles
  const usedWeight = (trip.maxWeight ?? 0) - (trip.remainingWeight ?? trip.maxWeight ?? 0);
  const usedParcels = (trip.maxParcels ?? 0) - (trip.remainingParcels ?? trip.maxParcels ?? 0);

  // Raison pour laquelle le membre ne peut pas demander
  const cannotRequestReason: string | null = (() => {
    if (!isMember) return null;
    if (isTripFull) return 'Ce trajet est complet, il n\'accepte plus de nouveaux colis.';
    if (existingRequest) {
      const labels: Record<string, string> = {
        pending: 'en attente de réponse',
        accepted: 'acceptée',
        paid: 'payée',
        in_transit: 'en cours de transit',
      };
      return `Vous avez déjà une demande ${labels[existingRequest.status] || ''} pour ce trajet.`;
    }
    return null;
  })();

  return (
    <Container style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détail du trajet</Text>
          {isTripFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>COMPLET</Text>
            </View>
          )}
        </View>

        {/* ── Carte principale trajet ── */}
        <Card variant="elevated" style={styles.tripCard}>
          <View style={styles.routeContainer}>
            <View style={styles.cityBlock}>
              <Text style={styles.cityLabel}>Départ</Text>
              <Text style={styles.cityName}>{trip.departure}</Text>
            </View>
            <View style={styles.routeMiddle}>
              <View style={styles.routeLine} />
              <Ionicons name="airplane" size={22} color={colors.primary} />
              <View style={styles.routeLine} />
            </View>
            <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.cityLabel}>Arrivée</Text>
              <Text style={styles.cityName}>{trip.arrival}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{trip.date}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Tarif</Text>
                <Text style={styles.infoValue}>€{trip.price} / kg</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="scale-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Poids max</Text>
                <Text style={styles.infoValue}>{trip.maxWeight} kg</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Colis max</Text>
                <Text style={styles.infoValue}>{trip.maxParcels}</Text>
              </View>
            </View>
          </View>

          {/* Barres de capacité (visibles si les données existent) */}
          {trip.remainingWeight !== undefined && (
            <View style={styles.capacitySection}>
              <Text style={styles.sectionTitle}>Capacité disponible</Text>
              <View style={styles.capacityBars}>
                <CapacityBar
                  label="Poids"
                  used={usedWeight}
                  total={trip.maxWeight}
                  unit="kg"
                />
                <CapacityBar
                  label="Colis"
                  used={usedParcels}
                  total={trip.maxParcels}
                  unit="colis"
                />
              </View>
            </View>
          )}

          {trip.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{trip.description}</Text>
            </View>
          ) : null}
        </Card>

        {/* ── CTA pour utilisateurs non connectés ── */}
        {!isConnected && (
          <View style={styles.actionSection}>
            <Card variant="elevated" style={styles.formCard}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
              <Text style={[styles.formTitle, { textAlign: 'center' }]}>
                Connectez-vous pour envoyer un colis
              </Text>
              <Button
                variant="primary"
                onPress={() => router.push('/(auth)/login')}
                style={{ marginTop: spacing.xs }}
              >
                Se connecter
              </Button>
              <Button
                variant="ghost"
                onPress={() => router.push('/(auth)/signup')}
              >
                Créer un compte
              </Button>
            </Card>
          </View>
        )}

        {/* ── Section membre : demande ── */}
        {isMember && (
          <View style={styles.actionSection}>

            {/* Demande déjà existante → afficher son statut */}
            {existingRequest && (
              <Card variant="elevated" style={styles.existingRequestCard}>
                <View style={styles.existingRequestHeader}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.existingRequestTitle}>Demande en cours</Text>
                </View>
                <Text style={styles.existingRequestText}>
                  Vous avez déjà une demande pour ce trajet (statut :{' '}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    {existingRequest.status === 'pending' ? 'en attente'
                      : existingRequest.status === 'accepted' ? 'acceptée'
                      : existingRequest.status === 'paid' ? 'payée'
                      : 'en transit'}
                  </Text>
                  ).
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/(tabs)/requests')}
                  style={{ marginTop: spacing.sm }}
                >
                  Voir mes demandes
                </Button>
              </Card>
            )}

            {/* Trajet complet */}
            {isTripFull && !existingRequest && (
              <Card variant="elevated" style={styles.fullCard}>
                <Ionicons name="lock-closed-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.fullCardTitle}>Trajet complet</Text>
                <Text style={styles.fullCardText}>
                  Ce trajet n'accepte plus de nouveaux colis. Consultez les autres trajets disponibles.
                </Text>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => router.back()}
                  style={{ marginTop: spacing.sm }}
                >
                  Voir d'autres trajets
                </Button>
              </Card>
            )}

            {/* Formulaire de demande (visible si pas de blocage) */}
            {!cannotRequestReason && (
              <>
                {showRequestForm ? (
                  <Card variant="elevated" style={styles.formCard}>
                    <Text style={styles.formTitle}>📦 Demander une livraison</Text>

                    <Input
                      label="Poids du colis (kg) *"
                      value={weight}
                      onChangeText={setWeight}
                      placeholder={`ex : 2.5 (max ${trip.remainingWeight ?? trip.maxWeight} kg)`}
                      keyboardType="numeric"
                    />
                    <Input
                      label="Dimensions (cm) — optionnel"
                      value={dimensions}
                      onChangeText={setDimensions}
                      placeholder="ex : 20×15×10"
                    />
                    <Input
                      label="Description — optionnel"
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Que souhaitez-vous envoyer ?"
                      multiline
                      numberOfLines={3}
                    />

                    <TouchableOpacity
                      style={styles.photoPicker}
                      onPress={handlePickImage}
                    >
                      {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera-outline" size={32} color={colors.textTertiary} />
                          <Text style={styles.photoText}>Ajouter une photo (optionnel)</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.formActions}>
                      <Button
                        variant="ghost"
                        onPress={() => setShowRequestForm(false)}
                        style={styles.flex1}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="primary"
                        onPress={handleSubmitRequest}
                        loading={submitting}
                        style={styles.flex1}
                      >
                        Envoyer
                      </Button>
                    </View>
                  </Card>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={() => setShowRequestForm(true)}
                    style={styles.fullWidthBtn}
                  >
                    Demander une livraison
                  </Button>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Section transporteur ── */}
        {isCarrier && (
          <View style={styles.actionSection}>
            <Button
              variant="outline"
              size="lg"
              onPress={() => router.push('/(tabs)/requests')}
              style={styles.fullWidthBtn}
            >
              Gérer les demandes
            </Button>
          </View>
        )}
      </ScrollView>
    </Container>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
  },
  fullBadge: {
    backgroundColor: colors.errorTint,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.error,
  },
  fullBadgeText: {
    ...typography.tinyBold,
    color: colors.error,
  },

  // Carte trajet
  tripCard: {
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.lg,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityBlock: {
    flex: 1,
  },
  routeMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: 4,
    flex: 0.8,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primary + '50',
  },
  cityLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cityName: {
    ...typography.h3,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '45%',
  },
  infoLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyBold,
    color: colors.text,
  },

  // Capacité
  capacitySection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  capacityBars: {
    gap: spacing.sm,
  },

  // Description
  descriptionSection: {
    gap: spacing.xs,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Section action
  actionSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  fullWidthBtn: {
    width: '100%',
  },

  // Demande existante
  existingRequestCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.sm,
  },
  existingRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  existingRequestTitle: {
    ...typography.bodyBold,
    color: colors.success,
  },
  existingRequestText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // Trajet complet
  fullCard: {
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullCardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  fullCardText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Formulaire
  formCard: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.md,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
  },
  photoPicker: {
    height: 140,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  flex1: { flex: 1 },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
});
