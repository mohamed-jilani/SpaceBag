import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { Container, Button, Card, Avatar } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { Ionicons } from '@expo/vector-icons';
import { Request, RequestStatus } from '@/types';
import { useRouter } from 'expo-router';

// ─── Configuration des badges de statut ────────────────────────────────────

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'En attente',  color: colors.warning, bg: colors.warningTint  },
  accepted:   { label: 'Acceptée',    color: colors.success, bg: colors.successTint  },
  refused:    { label: 'Refusée',     color: colors.error,   bg: colors.errorTint    },
  paid:       { label: 'Payée',       color: colors.info,    bg: colors.infoTint     },
  in_transit: { label: 'En transit',  color: colors.primary, bg: colors.primaryTint  },
  delivered:  { label: 'Livré ✓',    color: colors.success, bg: colors.successTint  },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RequestsScreen() {
  const { user, profile } = useAuth();
  const { requestsQuery, updateRequestStatus, generateCode } = useRequests();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // Champ de saisie du code pour le MEMBRE (il entre le code donné par le transporteur)
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const router = useRouter();

  const isCarrier = profile?.role === 'carrier';

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleStatusUpdate = async (request: Request, status: RequestStatus) => {
    try {
      setLoadingId(request.id);

      // Transporteur marque "Générer code livraison" :
      // On génère le code, on le stocke sur la demande (status reste in_transit).
      // Ce code sera VISIBLE par le membre dans son interface.
      // Le transporteur pourra aussi le voir pour le donner physiquement au membre.
      if (status === 'generate_code' as any) {
        const code = generateCode();
        await updateRequestStatus({
          id: request.id,
          status: 'in_transit', // status inchangé
          verificationCode: code,
        });
        Alert.alert(
          'Code généré !',
          `Code de livraison : ${code}\n\nCe code est maintenant visible par le membre. Donnez-le lui lors de la remise physique du colis.`,
          [{ text: 'OK' }]
        );
        return;
      }

      await updateRequestStatus({ id: request.id, status });

      if (status === 'accepted') {
        Alert.alert(
          '✅ Demande acceptée',
          'Une conversation a été créée automatiquement. Vous pouvez maintenant discuter avec le membre.'
        );
      } else if (status === 'refused') {
        Alert.alert('Demande refusée', 'Le membre en sera informé.');
      } else if (status === 'in_transit') {
        Alert.alert(
          'Colis récupéré',
          'Vous pouvez maintenant générer le code de livraison quand vous êtes prêt à remettre le colis.'
        );
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le statut');
    } finally {
      setLoadingId(null);
    }
  };

  // Membre saisit le code fourni par le transporteur → confirme la réception
  const handleMemberValidateDelivery = async (request: Request) => {
    const inputCode = (codeInputs[request.id] || '').trim();
    if (!inputCode) {
      Alert.alert('Code requis', 'Veuillez entrer le code communiqué par le transporteur.');
      return;
    }
    if (inputCode !== request.verificationCode) {
      Alert.alert('Code incorrect', 'Le code saisi ne correspond pas. Vérifiez auprès du transporteur.');
      return;
    }
    try {
      setLoadingId(request.id);
      await updateRequestStatus({ id: request.id, status: 'delivered' });
      setCodeInputs(prev => ({ ...prev, [request.id]: '' }));
      Alert.alert('🎉 Livraison confirmée !', 'Vous avez bien reçu votre colis. Merci d\'avoir utilisé SpaceBag !');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de confirmer la livraison');
    } finally {
      setLoadingId(null);
    }
  };

  const handleOpenChat = (request: Request) => {
    if (!request.chatId) {
      Alert.alert('Chat indisponible', 'La conversation n\'est pas encore disponible.');
      return;
    }
    router.push(`/chat/${request.chatId}`);
  };

  // ── Rendu d'une carte ─────────────────────────────────────────────────────

  const renderRequest = ({ item }: { item: Request & { trip?: any } }) => {
    const isLoading = loadingId === item.id;

    return (
      <Card variant="elevated" style={styles.card}>

        {/* ── En-tête : trajet + date + statut ── */}
        <View style={styles.cardHeader}>
          <View style={styles.routeInfo}>
            {item.trip ? (
              <View style={styles.routeRow}>
                <Ionicons name="location-outline" size={14} color={colors.primary} />
                <Text style={styles.routeText} numberOfLines={1}>{item.trip.departure}</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
                <Ionicons name="location-sharp" size={14} color={colors.primary} />
                <Text style={styles.routeText} numberOfLines={1}>{item.trip.arrival}</Text>
              </View>
            ) : (
              <Text style={styles.routeText}>Trajet inconnu</Text>
            )}
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* ── Infos colis ── */}
        <View style={styles.parcelRow}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.parcelPhoto} />
          ) : (
            <View style={[styles.parcelPhoto, styles.parcelPhotoPlaceholder]}>
              <Ionicons name="cube-outline" size={24} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.parcelInfo}>
            {isCarrier && item.memberDisplayName && (
              <View style={styles.memberRow}>
                <Avatar name={item.memberDisplayName} size="xs" />
                <Text style={styles.memberName}>{item.memberDisplayName}</Text>
              </View>
            )}
            {item.description ? (
              <Text style={styles.parcelDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <View style={styles.specsRow}>
              <View style={styles.specItem}>
                <Ionicons name="scale-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.specText}>{item.weight} kg</Text>
              </View>
              {item.dimensions ? (
                <View style={styles.specItem}>
                  <Ionicons name="cube-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.specText}>{item.dimensions}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Zone code de livraison (statut in_transit avec code généré) ── */}
        {item.status === 'in_transit' && item.verificationCode && (
          <View style={styles.codeSection}>
            {isCarrier ? (
              // ─ TRANSPORTEUR : voit le code qu'il a généré ─
              <View style={styles.carrierCodeBox}>
                <View style={styles.carrierCodeHeader}>
                  <Ionicons name="key" size={18} color={colors.primary} />
                  <Text style={styles.carrierCodeTitle}>Code de livraison généré</Text>
                </View>
                <Text style={styles.carrierCodeValue}>{item.verificationCode}</Text>
                <Text style={styles.carrierCodeHint}>
                  Communiquez ce code au membre lors de la remise physique du colis.
                </Text>
              </View>
            ) : (
              // ─ MEMBRE : entre le code pour confirmer la réception ─
              <View style={styles.memberCodeBox}>
                <View style={styles.memberCodeHeader}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                  <Text style={styles.memberCodeTitle}>Votre colis est prêt !</Text>
                </View>
                <Text style={styles.memberCodeHint}>
                  Entrez le code que le transporteur vous communiquera lors de la remise du colis.
                </Text>
                <View style={styles.codeInputRow}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="_ _ _ _ _ _"
                    placeholderTextColor={colors.textTertiary}
                    value={codeInputs[item.id] || ''}
                    onChangeText={text =>
                      setCodeInputs(prev => ({ ...prev, [item.id]: text }))
                    }
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => handleMemberValidateDelivery(item)}
                    loading={isLoading}
                    style={styles.validateBtn}
                  >
                    Valider
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Bouton "en transit, code pas encore généré" pour le transporteur ── */}
        {item.status === 'in_transit' && !item.verificationCode && isCarrier && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.infoText}>
              Générez le code de livraison quand vous remettez le colis au membre.
            </Text>
          </View>
        )}

        {/* ── Barre d'actions ── */}
        <View style={styles.actions}>

          {/* Bouton Chat — dès l'acceptation */}
          {item.chatId && item.status !== 'refused' && (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => handleOpenChat(item)}
              style={styles.chatBtn}
            >
              <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
              <Text style={styles.chatBtnText}> Chat</Text>
            </Button>
          )}

          {/* TRANSPORTEUR — demande en attente */}
          {isCarrier && item.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleStatusUpdate(item, 'refused')}
                loading={isLoading}
                style={styles.flex1}
              >
                Refuser
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={() => handleStatusUpdate(item, 'accepted')}
                loading={isLoading}
                style={styles.flex1}
              >
                Accepter
              </Button>
            </>
          )}

          {/* MEMBRE — acceptée → payer (simulation) */}
          {!isCarrier && item.status === 'accepted' && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => handleStatusUpdate(item, 'paid')}
              loading={isLoading}
              style={styles.flex1}
            >
              💳 Payer (simulation)
            </Button>
          )}

          {/* TRANSPORTEUR — payée → marquer colis récupéré */}
          {isCarrier && item.status === 'paid' && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => handleStatusUpdate(item, 'in_transit')}
              loading={isLoading}
              style={styles.flex1}
            >
              📦 Colis récupéré
            </Button>
          )}

          {/* TRANSPORTEUR — en transit, sans code → générer le code */}
          {isCarrier && item.status === 'in_transit' && !item.verificationCode && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => handleStatusUpdate(item, 'generate_code' as any)}
              loading={isLoading}
              style={styles.flex1}
            >
              🔑 Générer code livraison
            </Button>
          )}
        </View>
      </Card>
    );
  };

  // ── Rendu principal ──────────────────────────────────────────────────────────

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isCarrier ? 'Demandes reçues' : 'Mes demandes'}
        </Text>
        {requestsQuery.data && requestsQuery.data.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{requestsQuery.data.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={requestsQuery.data ?? []}
        keyExtractor={item => item.id}
        renderItem={renderRequest}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={requestsQuery.isLoading && !!requestsQuery.data}
            onRefresh={requestsQuery.refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="paper-plane-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {isCarrier
                ? 'Aucune demande pour le moment'
                : 'Aucune demande en cours'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isCarrier
                ? 'Les demandes apparaîtront ici dès qu\'un membre souhaite envoyer un colis avec vous.'
                : 'Trouvez un trajet et demandez une livraison pour voir vos demandes ici.'}
            </Text>
            {!isCarrier && (
              <Button
                variant="primary"
                size="sm"
                onPress={() => router.push('/(tabs)')}
                style={{ marginTop: spacing.lg }}
              >
                Trouver un trajet
              </Button>
            )}
          </View>
        }
      />
    </Container>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    ...typography.tinyBold,
    color: colors.white,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // ── Carte ──
  card: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeInfo: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  routeText: {
    ...typography.captionBold,
    color: colors.text,
    flexShrink: 1,
  },
  dateText: {
    ...typography.tiny,
    color: colors.textTertiary,
  },

  // ── Badge ──
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Colis ──
  parcelRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  parcelPhoto: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
  },
  parcelPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  parcelInfo: {
    flex: 1,
    gap: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    ...typography.captionBold,
    color: colors.text,
  },
  parcelDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  specsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    ...typography.tiny,
    color: colors.textSecondary,
  },

  // ── Zone code ──
  codeSection: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Transporteur voit son code
  carrierCodeBox: {
    backgroundColor: colors.backgroundTertiary,
    padding: spacing.md,
    gap: spacing.sm,
  },
  carrierCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  carrierCodeTitle: {
    ...typography.captionBold,
    color: colors.primary,
  },
  carrierCodeValue: {
    ...typography.h2,
    color: colors.primary,
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },
  carrierCodeHint: {
    ...typography.tiny,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Membre entre le code
  memberCodeBox: {
    backgroundColor: colors.successTint,
    padding: spacing.md,
    gap: spacing.sm,
  },
  memberCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberCodeTitle: {
    ...typography.captionBold,
    color: colors.success,
  },
  memberCodeHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  codeInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  codeInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    ...typography.h4,
    textAlign: 'center',
    letterSpacing: 4,
  },
  validateBtn: {
    flexShrink: 0,
  },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.infoTint,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  infoText: {
    ...typography.tiny,
    color: colors.info,
    flex: 1,
  },

  // ── Actions ──
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
    flexWrap: 'wrap',
  },
  flex1: {
    flex: 1,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  chatBtnText: {
    ...typography.captionBold,
    color: colors.primary,
  },

  // ── Empty ──
  empty: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
