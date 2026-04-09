/**
 * Écran admin — Validation des demandes KYC
 *
 * Accessible uniquement si profile.role === 'admin'.
 * Pour créer un admin : dans Firestore, modifier `users/{uid}.role` à 'admin'.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { getPendingKycRequests, approveKyc, rejectKyc } from '@/services/kyc';
import { UserProfile } from '@/types';

export default function AdminKycScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Sécurité : réserver cet écran aux admins
  if (profile?.role !== 'admin') {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.error} />
        <Text style={styles.accessDeniedTitle}>Accès refusé</Text>
        <Text style={styles.accessDeniedBody}>
          Cet écran est réservé aux administrateurs.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getPendingKycRequests();
      setRequests(data);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (user: UserProfile) => {
    Alert.alert(
      'Approuver ce KYC ?',
      `Confirmer la vérification de ${user.displayName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          style: 'default',
          onPress: async () => {
            setProcessing(true);
            try {
              await approveKyc(user.uid);
              setSelected(null);
              await loadRequests();
              Alert.alert('✅ Approuvé', `${user.displayName} est maintenant vérifié.`);
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectConfirm = async () => {
    if (!selected) return;
    if (!rejectReason.trim()) {
      Alert.alert('Motif requis', 'Veuillez entrer un motif de rejet.');
      return;
    }
    setProcessing(true);
    try {
      await rejectKyc(selected.uid, rejectReason.trim());
      setShowRejectModal(false);
      setSelected(null);
      setRejectReason('');
      await loadRequests();
      Alert.alert('KYC rejeté', 'L\'utilisateur a été informé.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.displayName}</Text>
          <Text style={styles.cardEmail}>{item.email}</Text>
          <Text style={styles.cardRole}>{item.role}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validation KYC</Text>
        <TouchableOpacity onPress={loadRequests} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.uid}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
              <Text style={styles.emptyTitle}>Aucune demande en attente</Text>
            </View>
          }
        />
      )}

      {/* Détail + actions */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.headerBack}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Dossier KYC</Text>
            </View>

            <ScrollView contentContainerStyle={styles.detailScroll}>
              <View style={styles.detailUser}>
                <View style={[styles.avatar, { width: 64, height: 64, borderRadius: 32 }]}>
                  <Text style={[styles.avatarText, { fontSize: 24 }]}>
                    {selected.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.detailName}>{selected.displayName}</Text>
                <Text style={styles.detailEmail}>{selected.email}</Text>
              </View>

              {/* Documents */}
              {selected.kycDocuments?.idPhotoUrl && (
                <DocSection label="Pièce d'identité" uri={selected.kycDocuments.idPhotoUrl} />
              )}
              {selected.kycDocuments?.selfieUrl && (
                <DocSection label="Selfie avec pièce d'identité" uri={selected.kycDocuments.selfieUrl} />
              )}
              {selected.kycDocuments?.addressProofUrl && (
                <DocSection label="Justificatif de domicile" uri={selected.kycDocuments.addressProofUrl} />
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(selected)}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                      <Text style={styles.approveBtnText}>Approuver</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => setShowRejectModal(true)}
                  disabled={processing}
                >
                  <Ionicons name="close-circle" size={20} color={colors.white} />
                  <Text style={styles.rejectBtnText}>Rejeter</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Modal motif de rejet */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.rejectCard}>
            <Text style={styles.rejectTitle}>Motif de rejet</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex: Document illisible, selfie non conforme…"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
            <View style={styles.rejectActions}>
              <TouchableOpacity
                onPress={() => { setShowRejectModal(false); setRejectReason(''); }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRejectConfirm}
                style={styles.confirmRejectBtn}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.confirmRejectBtnText}>Rejeter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DocSection({ label, uri }: { label: string; uri: string }) {
  return (
    <View style={docStyles.container}>
      <Text style={docStyles.label}>{label}</Text>
      <Image source={{ uri }} style={docStyles.image} resizeMode="contain" />
    </View>
  );
}

const docStyles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.captionBold, color: colors.textSecondary },
  image: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...typography.h2, color: colors.text },
  refreshBtn: { padding: spacing.xs },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textSecondary },

  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...typography.h3, color: colors.primary },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { ...typography.bodyBold, color: colors.text },
  cardEmail: { ...typography.caption, color: colors.textSecondary },
  cardRole: { ...typography.tiny, color: colors.primary, textTransform: 'uppercase' },

  detailContainer: { flex: 1, backgroundColor: colors.background },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  detailScroll: { padding: spacing.lg, gap: spacing.md },
  detailUser: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  detailName: { ...typography.h2, color: colors.text },
  detailEmail: { ...typography.caption, color: colors.textSecondary },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  approveBtn: { backgroundColor: colors.success },
  approveBtnText: { ...typography.bodyBold, color: colors.white },
  rejectBtn: { backgroundColor: colors.error },
  rejectBtnText: { ...typography.bodyBold, color: colors.white },

  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  rejectCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    gap: spacing.md,
  },
  rejectTitle: { ...typography.h3, color: colors.text },
  rejectInput: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.borderDarkMode,
  },
  rejectActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDarkMode,
    alignItems: 'center',
  },
  cancelBtnText: { ...typography.bodyBold, color: colors.textSecondary },
  confirmRejectBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  confirmRejectBtnText: { ...typography.bodyBold, color: colors.white },

  accessDenied: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  accessDeniedTitle: { ...typography.h2, color: colors.error },
  accessDeniedBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtnText: { ...typography.bodyBold, color: colors.black },
});
