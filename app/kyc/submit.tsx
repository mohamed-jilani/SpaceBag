/**
 * Écran de soumission KYC — upload de documents d'identité
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { uploadImage } from '@/lib/cloudinary';
import { submitKyc } from '@/services/kyc';
import { KycDocuments } from '@/types';

type DocumentSlot = {
  key: keyof KycDocuments;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  required: boolean;
  hint: string;
};

const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    key: 'idPhotoUrl',
    label: "Pièce d'identité (recto/verso)",
    icon: 'card-outline',
    required: true,
    hint: 'Carte d\'identité, passeport ou titre de séjour',
  },
  {
    key: 'selfieUrl',
    label: 'Selfie avec votre pièce d\'identité',
    icon: 'person-circle-outline',
    required: true,
    hint: 'Photo de vous tenant votre document',
  },
  {
    key: 'addressProofUrl',
    label: 'Justificatif de domicile',
    icon: 'home-outline',
    required: false,
    hint: 'Facture récente (eau, gaz, électricité, internet) — optionnel',
  },
];

export default function KycSubmitScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [docs, setDocs] = useState<Partial<Record<keyof KycDocuments, string>>>({});
  const [uploading, setUploading] = useState<Partial<Record<keyof KycDocuments, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const pickAndUpload = async (key: keyof KycDocuments) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const url = await uploadImage(result.assets[0].uri);
      setDocs(prev => ({ ...prev, [key]: url }));
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger la photo. Réessayez.');
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;

    const required = DOCUMENT_SLOTS.filter(s => s.required);
    const missing = required.filter(s => !docs[s.key]);
    if (missing.length > 0) {
      Alert.alert(
        'Documents manquants',
        `Veuillez ajouter : ${missing.map(m => m.label).join(', ')}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const documents: KycDocuments = {
        idPhotoUrl: docs.idPhotoUrl,
        selfieUrl: docs.selfieUrl,
        addressProofUrl: docs.addressProofUrl,
      };
      await submitKyc(profile.uid, documents);
      await updateProfile({ kycStatus: 'pending', kycDocuments: documents });

      Alert.alert(
        '✅ Demande envoyée',
        'Votre dossier KYC a été soumis. Vous serez informé dès qu\'il sera examiné par notre équipe.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Échec de la soumission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (profile?.kycStatus === 'pending') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification d'identité</Text>
        </View>
        <View style={styles.statusCard}>
          <Ionicons name="time-outline" size={64} color={colors.warning} />
          <Text style={styles.statusTitle}>En cours d'examen</Text>
          <Text style={styles.statusBody}>
            Votre dossier KYC a été soumis et est en cours de vérification. Vous recevrez une notification dès qu'il sera traité.
          </Text>
        </View>
      </View>
    );
  }

  if (profile?.kycStatus === 'verified') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification d'identité</Text>
        </View>
        <View style={styles.statusCard}>
          <Ionicons name="shield-checkmark" size={64} color={colors.success} />
          <Text style={[styles.statusTitle, { color: colors.success }]}>Identité vérifiée ✓</Text>
          <Text style={styles.statusBody}>
            Votre identité a été vérifiée avec succès. Le badge KYC est visible sur votre profil.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérification d'identité</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Intro */}
        {profile?.kycStatus === 'rejected' && (
          <View style={styles.rejectedBanner}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectedTitle}>Dossier rejeté</Text>
              {profile.kycRejectionReason && (
                <Text style={styles.rejectedReason}>
                  Motif : {profile.kycRejectionReason}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="shield-outline" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            La vérification d'identité renforce la confiance sur la plateforme. Vos documents sont traités de façon confidentielle et ne sont jamais partagés.
          </Text>
        </View>

        {/* Slots de documents */}
        {DOCUMENT_SLOTS.map(slot => (
          <View key={slot.key} style={styles.docSlot}>
            <View style={styles.docHeader}>
              <Ionicons name={slot.icon} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.docLabel}>
                  {slot.label}
                  {slot.required && <Text style={{ color: colors.error }}> *</Text>}
                </Text>
                <Text style={styles.docHint}>{slot.hint}</Text>
              </View>
            </View>

            {docs[slot.key] ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: docs[slot.key] }} style={styles.preview} />
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => pickAndUpload(slot.key)}
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                  <Text style={styles.changeBtnText}>Changer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => pickAndUpload(slot.key)}
                disabled={uploading[slot.key]}
              >
                {uploading[slot.key] ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                    <Text style={styles.uploadBtnText}>Sélectionner une photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Bouton soumettre */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color={colors.black} />
              <Text style={styles.submitBtnText}>Soumettre ma demande</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.legalNote}>
          En soumettant ce formulaire, vous acceptez que SpaceBag traite vos données personnelles dans le cadre de la vérification d'identité.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
  scroll: { padding: spacing.lg, gap: spacing.lg },

  statusCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  statusTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  statusBody: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },

  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.errorTint,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  rejectedTitle: { ...typography.bodyBold, color: colors.error },
  rejectedReason: { ...typography.caption, color: colors.error, marginTop: 2 },

  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignItems: 'flex-start',
  },
  infoText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 22 },

  docSlot: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
  },
  docHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  docLabel: { ...typography.bodyBold, color: colors.text },
  docHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  uploadBtn: {
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary + '50',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '08',
  },
  uploadBtnText: { ...typography.caption, color: colors.primary },

  previewContainer: { gap: spacing.sm },
  preview: { width: '100%', height: 160, borderRadius: borderRadius.md, resizeMode: 'cover' },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  changeBtnText: { ...typography.caption, color: colors.primary },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  submitBtnText: { ...typography.bodyBold, color: colors.black },

  legalNote: {
    ...typography.tiny,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
