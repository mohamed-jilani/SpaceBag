import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  RefreshControl,
  Image,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Container, Button, Card, Avatar } from '@/components/ui';
import { darkColors, spacing, typography, borderRadius } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { Ionicons } from '@expo/vector-icons';
import { Request, RequestStatus } from '@/types';
import { useRouter } from 'expo-router';
import { createReview, hasUserReviewed } from '@/services/reviews';
import { payForRequest } from '@/services/wallet';
import { QRCodeModal } from '@/components/QRCodeModal';
import { QRScanner } from '@/components/QRScanner';

type Colors = typeof darkColors;

// ─── Badge de statut ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RequestStatus }) {
  const { colors } = useTheme();
  const cfg = getStatusConfig(colors)[status] ?? getStatusConfig(colors).pending;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[badgeStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function getStatusConfig(colors: Colors): Record<RequestStatus, { label: string; color: string; bg: string }> {
  return {
    pending:    { label: 'En attente',  color: colors.warning, bg: colors.warningTint  },
    accepted:   { label: 'Acceptée',    color: colors.success, bg: colors.successTint  },
    refused:    { label: 'Refusée',     color: colors.error,   bg: colors.errorTint    },
    paid:       { label: 'Payée',       color: colors.info,    bg: colors.infoTint     },
    in_transit: { label: 'En transit',  color: colors.primary, bg: colors.primaryTint  },
    delivered:  { label: 'Livré ✓',    color: colors.success, bg: colors.successTint  },
  };
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  text: { fontSize: 10, fontWeight: '700' },
});

// ─── Sélecteur d'étoiles ──────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange?.(star)}
          disabled={!onChange}
          activeOpacity={0.7}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? colors.warning : colors.textTertiary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Modal d'évaluation ───────────────────────────────────────────────────────

function ReviewModal({
  visible,
  onClose,
  onSubmit,
  targetName,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  targetName: string;
}) {
  const { colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Note requise', 'Veuillez sélectionner une note avant de soumettre.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      setRating(0);
      setComment('');
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || "Impossible d'envoyer l'avis.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[modalStyles.handle, { backgroundColor: colors.backgroundTertiary }]} />
          <Text style={[modalStyles.title, { color: colors.text }]}>
            Évaluer {targetName}
          </Text>
          <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
            Donnez une note à votre expérience avec ce{' '}
            {targetName.toLowerCase().includes('transporteur') ? 'transporteur' : 'membre'}.
          </Text>

          <View style={modalStyles.starsRow}>
            <StarRating value={rating} onChange={setRating} size={40} />
          </View>
          {rating > 0 && (
            <Text style={[modalStyles.ratingLabel, { color: colors.warning }]}>
              {['', '😕 Très mauvais', '😐 Mauvais', '🙂 Correct', '😊 Bien', '🌟 Excellent !'][rating]}
            </Text>
          )}

          <TextInput
            style={[
              modalStyles.commentInput,
              {
                backgroundColor: colors.backgroundTertiary,
                color: colors.text,
                borderColor: colors.border + '40',
              },
            ]}
            placeholder="Laisser un commentaire (optionnel)…"
            placeholderTextColor={colors.textTertiary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
          <Text style={[modalStyles.charCount, { color: colors.textTertiary }]}>
            {comment.length}/300
          </Text>

          <View style={modalStyles.actions}>
            <Button variant="ghost" onPress={onClose} style={modalStyles.flex1}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              loading={submitting}
              style={modalStyles.flex1}
            >
              Envoyer l'avis
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h3, textAlign: 'center' },
  subtitle: { ...typography.body, textAlign: 'center', marginBottom: spacing.sm },
  starsRow: { alignItems: 'center' },
  ratingLabel: { ...typography.bodyBold, textAlign: 'center', marginTop: -spacing.sm },
  commentInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  charCount: { ...typography.tiny, textAlign: 'right', marginTop: -spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  flex1: { flex: 1 },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function RequestsScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requests, loading, error, updateRequestStatus, generateCode } = useRequests();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [qrModal, setQrModal] = useState<{ visible: boolean; code: string } | null>(null);
  const [qrScannerRequest, setQrScannerRequest] = useState<Request | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    visible: boolean;
    requestId: string;
    toUserId: string;
    targetName: string;
  } | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const isCarrier = profile?.role === 'carrier';
  const s = useMemo(() => buildStyles(colors), [colors]);

  // ── Modal d'évaluation ────────────────────────────────────────────────────
  const openReviewModal = useCallback(
    async (request: Request & { trip?: any }) => {
      const toUserId = isCarrier ? request.memberId : request.carrierId;
      const targetName = isCarrier ? (request.memberDisplayName || 'Membre') : 'Transporteur';
      try {
        const already = await hasUserReviewed(request.id, user!.uid);
        if (already) {
          Alert.alert('Déjà évalué', 'Vous avez déjà soumis un avis pour cette livraison.');
          return;
        }
        setReviewModal({ visible: true, requestId: request.id, toUserId, targetName });
      } catch {
        Alert.alert('Erreur', 'Impossible de vérifier les avis existants.');
      }
    },
    [isCarrier, user]
  );

  const handleReviewSubmit = useCallback(
    async (rating: number, comment: string) => {
      if (!reviewModal || !user) return;
      await createReview({
        requestId: reviewModal.requestId,
        fromUserId: user.uid,
        toUserId: reviewModal.toUserId,
        rating,
        comment: comment || undefined,
      });
      setReviewedIds(prev => new Set([...prev, reviewModal.requestId]));
      Alert.alert('Merci !', 'Votre avis a bien été enregistré.');
    },
    [reviewModal, user]
  );

  // ── Paiement portefeuille ─────────────────────────────────────────────────
  const handleWalletPay = useCallback(
    (request: Request & { trip?: any }) => {
      const amount = request.price ?? (request.trip?.pricePerKg ?? 10) * (request.weight ?? 1);
      Alert.alert(
        '💳 Payer via portefeuille',
        `Payer €${amount.toFixed(2)} au transporteur ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            onPress: async () => {
              try {
                setLoadingId(request.id);
                await payForRequest(
                  user!.uid,
                  request.carrierId,
                  amount,
                  request.id,
                  `Livraison ${request.trip?.departure ?? ''} → ${request.trip?.arrival ?? ''}`
                );
                await updateRequestStatus({ id: request.id, status: 'paid' });
                Alert.alert('✅ Paiement effectué', 'Le transporteur a été crédité.');
              } catch (err: any) {
                Alert.alert('Erreur', err.message || 'Paiement impossible.');
              } finally {
                setLoadingId(null);
              }
            },
          },
        ]
      );
    },
    [user, updateRequestStatus]
  );

  // ── Mise à jour du statut ──────────────────────────────────────────────────
  const handleStatusUpdate = useCallback(
    async (request: Request, status: RequestStatus | 'generate_code') => {
      try {
        setLoadingId(request.id);
        if (status === 'generate_code') {
          const code = generateCode();
          await updateRequestStatus({ id: request.id, status: 'in_transit', verificationCode: code });
          Alert.alert('🔑 Code généré !', `Code de livraison : ${code}\n\nCommuniquez-le au membre lors de la remise.`);
          return;
        }
        await updateRequestStatus({ id: request.id, status: status as RequestStatus });
        if (status === 'accepted') {
          Alert.alert('✅ Demande acceptée', 'Une conversation a été créée avec le membre.');
        } else if (status === 'refused') {
          Alert.alert('Demande refusée', 'Le membre en sera informé.');
        } else if (status === 'in_transit') {
          Alert.alert('📦 Colis récupéré', 'Générez le code quand vous êtes prêt à livrer.');
        }
      } catch (err: any) {
        Alert.alert('Erreur', err.message || 'Impossible de mettre à jour le statut');
      } finally {
        setLoadingId(null);
      }
    },
    [updateRequestStatus, generateCode]
  );

  // ── Validation du code ────────────────────────────────────────────────────
  const handleMemberValidateDelivery = useCallback(
    async (request: Request) => {
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
        Alert.alert(
          '🎉 Livraison confirmée !',
          'Vous avez bien reçu votre colis. Souhaitez-vous évaluer le transporteur ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            { text: 'Évaluer', onPress: () => openReviewModal(request) },
          ]
        );
      } catch (err: any) {
        Alert.alert('Erreur', err.message || 'Impossible de confirmer la livraison');
      } finally {
        setLoadingId(null);
      }
    },
    [codeInputs, updateRequestStatus, openReviewModal]
  );

  const handleOpenChat = useCallback(
    (request: Request) => {
      if (!request.chatId) {
        Alert.alert('Chat indisponible', "La conversation n'est pas encore créée.");
        return;
      }
      router.push(`/chat/${request.chatId}`);
    },
    [router]
  );

  // ── Rendu d'une carte ──────────────────────────────────────────────────────
  const renderRequest = useCallback(
    ({ item }: { item: Request & { trip?: any } }) => {
      const isLoading = loadingId === item.id;
      const isDelivered = item.status === 'delivered';
      const canReview = isDelivered && !reviewedIds.has(item.id);

      return (
        <Card variant="elevated" style={s.card}>
          {/* En-tête */}
          <View style={s.cardHeader}>
            <View style={s.routeInfo}>
              {item.trip ? (
                <View style={s.routeRow}>
                  <Ionicons name="location-outline" size={14} color={colors.primary} />
                  <Text style={s.routeText} numberOfLines={1}>{item.trip.departure}</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.textTertiary} />
                  <Ionicons name="location-sharp" size={14} color={colors.primary} />
                  <Text style={s.routeText} numberOfLines={1}>{item.trip.arrival}</Text>
                </View>
              ) : (
                <Text style={s.routeText}>Trajet inconnu</Text>
              )}
              <Text style={s.dateText}>
                {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          {/* Infos colis */}
          <View style={s.parcelRow}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={s.parcelPhoto} />
            ) : (
              <View style={[s.parcelPhoto, s.parcelPhotoPlaceholder]}>
                <Ionicons name="cube-outline" size={24} color={colors.textTertiary} />
              </View>
            )}
            <View style={s.parcelInfo}>
              {isCarrier && item.memberDisplayName && (
                <View style={s.memberRow}>
                  <Avatar name={item.memberDisplayName} size="xs" />
                  <Text style={s.memberName}>{item.memberDisplayName}</Text>
                </View>
              )}
              {item.description ? (
                <Text style={s.parcelDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <View style={s.specsRow}>
                <View style={s.specItem}>
                  <Ionicons name="scale-outline" size={13} color={colors.textSecondary} />
                  <Text style={s.specText}>{item.weight} kg</Text>
                </View>
                {item.dimensions ? (
                  <View style={s.specItem}>
                    <Ionicons name="cube-outline" size={13} color={colors.textSecondary} />
                    <Text style={s.specText}>{item.dimensions}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Zone code livraison */}
          {item.status === 'in_transit' && item.verificationCode && (
            <View style={s.codeSection}>
              {isCarrier ? (
                <View style={s.carrierCodeBox}>
                  <View style={s.codeHeaderRow}>
                    <Ionicons name="key" size={16} color={colors.primary} />
                    <Text style={s.codeTitle}>Code de livraison généré</Text>
                  </View>
                  <Text style={s.codeValue}>{item.verificationCode}</Text>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setQrModal({ visible: true, code: item.verificationCode! })}
                    style={{ marginTop: spacing.xs }}
                  >
                    <Ionicons name="qr-code-outline" size={15} color={colors.primary} />
                    {'  '}Afficher QR code
                  </Button>
                  <Text style={s.codeHint}>
                    Montrez le QR code ou communiquez le code manuellement.
                  </Text>
                </View>
              ) : (
                <View style={s.memberCodeBox}>
                  <View style={s.codeHeaderRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                    <Text style={[s.codeTitle, { color: colors.success }]}>
                      Votre colis est prêt !
                    </Text>
                  </View>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => setQrScannerRequest(item)}
                    style={{ marginTop: spacing.xs }}
                  >
                    <Ionicons name="scan-outline" size={15} color={colors.black} />
                    {'  '}Scanner le QR code
                  </Button>
                  <Text style={[s.codeHint, { marginTop: spacing.xs }]}>
                    Ou entrez le code manuellement :
                  </Text>
                  <View style={s.codeInputRow}>
                    <TextInput
                      style={s.codeInput}
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
                      variant="outline"
                      size="sm"
                      onPress={() => handleMemberValidateDelivery(item)}
                      loading={isLoading}
                      style={s.validateBtn}
                    >
                      Valider
                    </Button>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Info "prêt à générer" */}
          {item.status === 'in_transit' && !item.verificationCode && isCarrier && (
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={15} color={colors.info} />
              <Text style={s.infoText}>
                Générez le code quand vous êtes prêt à remettre le colis.
              </Text>
            </View>
          )}

          {/* Livraison terminée + évaluation */}
          {isDelivered && (
            <View style={s.deliveredSection}>
              <View style={s.deliveredHeader}>
                <Ionicons name="checkmark-done-circle" size={20} color={colors.success} />
                <Text style={s.deliveredText}>Livraison terminée avec succès</Text>
              </View>
              {canReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => openReviewModal(item)}
                  style={s.reviewBtn}
                >
                  ⭐ Évaluer {isCarrier ? 'le membre' : 'le transporteur'}
                </Button>
              )}
              {!canReview && reviewedIds.has(item.id) && (
                <Text style={s.reviewedText}>✓ Évaluation envoyée</Text>
              )}
            </View>
          )}

          {/* Barre d'actions */}
          <View style={s.actions}>
            {item.chatId && item.status !== 'refused' && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleOpenChat(item)}
                style={s.chatBtn}
              >
                <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                <Text style={s.chatBtnText}> Chat</Text>
              </Button>
            )}

            {isCarrier && item.status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => handleStatusUpdate(item, 'refused')}
                  loading={isLoading}
                  style={s.flex1}
                >
                  Refuser
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => handleStatusUpdate(item, 'accepted')}
                  loading={isLoading}
                  style={s.flex1}
                >
                  Accepter
                </Button>
              </>
            )}

            {!isCarrier && item.status === 'accepted' && (
              <Button
                variant="primary"
                size="sm"
                onPress={() => handleWalletPay(item)}
                loading={isLoading}
                style={s.flex1}
              >
                💳 Payer via portefeuille
              </Button>
            )}

            {isCarrier && item.status === 'paid' && (
              <Button
                variant="primary"
                size="sm"
                onPress={() => handleStatusUpdate(item, 'in_transit')}
                loading={isLoading}
                style={s.flex1}
              >
                📦 Colis récupéré
              </Button>
            )}

            {isCarrier && item.status === 'in_transit' && !item.verificationCode && (
              <Button
                variant="primary"
                size="sm"
                onPress={() => handleStatusUpdate(item, 'generate_code')}
                loading={isLoading}
                style={s.flex1}
              >
                🔑 Générer code livraison
              </Button>
            )}

            {item.status === 'in_transit' && item.trip && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() =>
                  router.push(
                    `/tracking/${item.id}?departure=${encodeURIComponent(item.trip!.departure)}&arrival=${encodeURIComponent(item.trip!.arrival)}`
                  )
                }
                style={s.flex1}
              >
                📍 Suivi du colis
              </Button>
            )}
          </View>
        </Card>
      );
    },
    [
      loadingId,
      isCarrier,
      codeInputs,
      reviewedIds,
      colors,
      s,
      handleStatusUpdate,
      handleWalletPay,
      handleMemberValidateDelivery,
      handleOpenChat,
      openReviewModal,
    ]
  );

  // ── Rendu principal ────────────────────────────────────────────────────────
  return (
    <Container backgroundColor={colors.background} style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>
            {isCarrier ? 'Demandes reçues' : 'Mes demandes'}
          </Text>
          {!loading && requests.length > 0 && (
            <Text style={s.subtitle}>
              {requests.length} demande{requests.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Chargement en temps réel…</Text>
        </View>
      ) : error ? (
        <View style={s.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderRequest}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="paper-plane-outline" size={56} color={colors.textTertiary} />
              <Text style={s.emptyTitle}>
                {isCarrier ? 'Aucune demande pour le moment' : 'Aucune demande en cours'}
              </Text>
              <Text style={s.emptySubtitle}>
                {isCarrier
                  ? "Les demandes apparaîtront ici en temps réel dès qu'un membre souhaite envoyer un colis."
                  : 'Trouvez un trajet et faites votre première demande !'}
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
      )}

      {reviewModal && (
        <ReviewModal
          visible={reviewModal.visible}
          onClose={() => setReviewModal(null)}
          onSubmit={handleReviewSubmit}
          targetName={reviewModal.targetName}
        />
      )}

      {qrModal && (
        <QRCodeModal
          visible={qrModal.visible}
          code={qrModal.code}
          onClose={() => setQrModal(null)}
        />
      )}

      {qrScannerRequest && (
        <QRScanner
          visible={!!qrScannerRequest}
          onScanned={scannedCode => {
            setCodeInputs(prev => ({ ...prev, [qrScannerRequest.id]: scannedCode }));
            setQrScannerRequest(null);
            if (scannedCode === qrScannerRequest.verificationCode) {
              handleMemberValidateDelivery({ ...qrScannerRequest });
            } else {
              Alert.alert(
                'Code incorrect',
                'Le code scanné ne correspond pas. Vérifiez auprès du transporteur.'
              );
            }
          }}
          onClose={() => setQrScannerRequest(null)}
        />
      )}
    </Container>
  );
}

// ─── buildStyles ──────────────────────────────────────────────────────────────

function buildStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    title: { ...typography.h1, color: colors.text },
    subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
    loadingText: { ...typography.body, color: colors.textSecondary },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

    card: {
      padding: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      gap: spacing.md,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    routeInfo: { flex: 1, marginRight: spacing.sm, gap: 4 },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    routeText: { ...typography.captionBold, color: colors.text, flexShrink: 1 },
    dateText: { ...typography.tiny, color: colors.textTertiary },

    parcelRow: { flexDirection: 'row', gap: spacing.md },
    parcelPhoto: {
      width: 64,
      height: 64,
      borderRadius: borderRadius.md,
      backgroundColor: colors.backgroundTertiary,
    },
    parcelPhotoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    parcelInfo: { flex: 1, gap: 6 },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    memberName: { ...typography.captionBold, color: colors.text },
    parcelDesc: { ...typography.caption, color: colors.textSecondary },
    specsRow: { flexDirection: 'row', gap: spacing.md },
    specItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    specText: { ...typography.tiny, color: colors.textSecondary },

    codeSection: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    carrierCodeBox: {
      backgroundColor: colors.backgroundTertiary,
      padding: spacing.md,
      gap: spacing.sm,
    },
    memberCodeBox: {
      backgroundColor: colors.successTint,
      padding: spacing.md,
      gap: spacing.sm,
    },
    codeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    codeTitle: { ...typography.captionBold, color: colors.primary },
    codeValue: {
      ...typography.h2,
      color: colors.primary,
      letterSpacing: 8,
      textAlign: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: borderRadius.sm,
    },
    codeHint: { ...typography.tiny, color: colors.textSecondary, textAlign: 'center' },
    codeInputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    codeInput: {
      flex: 1,
      height: 44,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      color: colors.text,
      ...typography.h4,
      textAlign: 'center',
      letterSpacing: 4,
    },
    validateBtn: { flexShrink: 0 },

    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.infoTint,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
    },
    infoText: { ...typography.tiny, color: colors.info, flex: 1 },

    deliveredSection: {
      backgroundColor: colors.successTint,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    deliveredHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    deliveredText: { ...typography.captionBold, color: colors.success },
    reviewBtn: { borderColor: colors.warning, borderWidth: 1 },
    reviewedText: { ...typography.caption, color: colors.success, textAlign: 'center' },

    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.backgroundTertiary,
      flexWrap: 'wrap',
    },
    flex1: { flex: 1 },
    chatBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
    chatBtnText: { ...typography.captionBold, color: colors.primary },

    empty: { padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
    emptyTitle: { ...typography.h4, color: colors.text, textAlign: 'center' },
    emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  });
}
