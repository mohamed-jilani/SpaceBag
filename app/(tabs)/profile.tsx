import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Button, Input, Avatar } from '@/components/ui';
import { darkColors, spacing, typography, borderRadius } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/lib/cloudinary';
import { getAverageRating } from '@/services/reviews';

type Colors = typeof darkColors;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phoneNumber || '');
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<{ average: number; count: number } | null>(null);

  const s = useMemo(() => buildStyles(colors), [colors]);

  useEffect(() => {
    if (profile?.uid) {
      getAverageRating(profile.uid).then(setRating).catch(() => {});
    }
  }, [profile?.uid]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      try {
        setLoading(true);
        const url = await uploadImage(result.assets[0].uri);
        await updateProfile({ photoURL: url });
        Alert.alert('Succès', 'Photo de profil mise à jour');
      } catch (error: any) {
        Alert.alert('Erreur', error.message || 'Échec du téléchargement');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await updateProfile({ displayName: name, phoneNumber: phone });
      setIsEditing(false);
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container backgroundColor={colors.background} style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.title}>Profil</Text>
          <TouchableOpacity onPress={signOut}>
            <Ionicons name="log-out-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View style={s.profileHeader}>
          <TouchableOpacity onPress={handlePickImage} disabled={loading}>
            <Avatar
              name={profile?.displayName || 'User'}
              source={profile?.photoURL ? { uri: profile.photoURL } : undefined}
              size="xl"
            />
            <View style={s.editBadge}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>
          <View style={s.profileMeta}>
            <View style={s.nameRow}>
              <Text style={s.displayName}>{profile?.displayName}</Text>
              {profile?.kycVerified && (
                <View style={s.kycBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.white} />
                  <Text style={s.kycText}>Vérifié</Text>
                </View>
              )}
            </View>
            <Text style={s.roleText}>{profile?.role.toUpperCase()}</Text>
            {rating && (
              <View style={s.ratingRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < Math.round(rating.average) ? 'star' : 'star-outline'}
                    size={16}
                    color="#F59E0B"
                  />
                ))}
                <Text style={s.ratingText}>
                  {rating.average.toFixed(1)} ({rating.count} avis)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Liens rapides ── */}
        <View style={s.quickLinks}>
          <TouchableOpacity style={s.quickLink} onPress={() => router.push('/wallet' as any)}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={s.quickLinkText}>Portefeuille</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={s.quickLinkDivider} />
          <TouchableOpacity
            style={s.quickLink}
            onPress={() => router.push('/(tabs)/settings' as any)}
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <Text style={s.quickLinkText}>Paramètres</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── KYC ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Vérification d'identité</Text>
          </View>
          {profile?.kycStatus === 'verified' || profile?.kycVerified ? (
            <View style={s.kycVerifiedRow}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={[s.infoValue, { color: colors.success }]}>Identité vérifiée ✓</Text>
            </View>
          ) : profile?.kycStatus === 'pending' ? (
            <View style={s.kycPendingRow}>
              <Ionicons name="time-outline" size={20} color={colors.warning} />
              <Text style={[s.kycPendingText, { color: colors.warning }]}>
                En cours de vérification…
              </Text>
            </View>
          ) : profile?.kycStatus === 'rejected' ? (
            <View style={{ gap: spacing.sm }}>
              <View style={s.kycPendingRow}>
                <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                <Text style={[s.kycPendingText, { color: colors.error }]}>
                  Dossier rejeté
                  {profile.kycRejectionReason ? ` : ${profile.kycRejectionReason}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/kyc/submit')} style={s.kycLink}>
                <Text style={s.kycLinkText}>Resoumettre mon dossier →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <View style={s.kycPendingRow}>
                <Ionicons name="shield-outline" size={20} color={colors.textSecondary} />
                <Text style={s.kycPendingText}>Non vérifié</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/kyc/submit')} style={s.kycLink}>
                <Text style={s.kycLinkText}>Vérifier mon identité →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Lien admin ── */}
        {profile?.role === 'admin' && (
          <TouchableOpacity
            style={s.adminLink}
            onPress={() => router.push('/admin/kyc')}
          >
            <Ionicons name="shield-half-outline" size={18} color={colors.accent} />
            <Text style={s.adminLinkText}>Administration KYC</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        )}

        {/* ── Informations personnelles ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Informations personnelles</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={s.editLink}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={s.form}>
              <Input
                label="Nom complet"
                value={name}
                onChangeText={setName}
                placeholder="Entrez votre nom"
              />
              <Input
                label="Téléphone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Entrez votre numéro"
                keyboardType="phone-pad"
              />
              <View style={s.btnRow}>
                <Button
                  variant="ghost"
                  onPress={() => setIsEditing(false)}
                  style={s.flex1}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onPress={handleUpdate}
                  loading={loading}
                  style={s.flex1}
                >
                  Sauvegarder
                </Button>
              </View>
            </View>
          ) : (
            <View style={s.infoList}>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{profile?.email}</Text>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Téléphone</Text>
                <Text style={s.infoValue}>{profile?.phoneNumber || 'Non renseigné'}</Text>
              </View>
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Membre depuis</Text>
                <Text style={s.infoValue}>
                  {new Date(profile?.createdAt || 0).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Button variant="outline" onPress={signOut} style={s.signOutBtn}>
          Se déconnecter
        </Button>
      </ScrollView>
    </Container>
  );
}

// ─── buildStyles ──────────────────────────────────────────────────────────────

function buildStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: spacing.lg, paddingTop: spacing.xl },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    title: { ...typography.h1, color: colors.text },

    profileHeader: { alignItems: 'center', marginBottom: spacing.xxl },
    editBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.background,
    },
    profileMeta: { alignItems: 'center', marginTop: spacing.md, gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    displayName: { ...typography.h2, color: colors.text },
    kycBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      gap: 3,
    },
    kycText: { ...typography.captionBold, color: colors.white, fontSize: 11 },
    roleText: {
      ...typography.captionBold,
      color: colors.primary,
      backgroundColor: colors.primary + '15',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    ratingText: { ...typography.caption, color: colors.textSecondary, marginLeft: 4 },

    // Liens rapides
    quickLinks: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    quickLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    quickLinkText: { ...typography.body, color: colors.text, flex: 1 },
    quickLinkDivider: {
      height: 1,
      backgroundColor: colors.backgroundTertiary,
      marginLeft: spacing.md + 20 + spacing.md,
    },

    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    cardTitle: { ...typography.h3, color: colors.text },
    editLink: { ...typography.bodyBold, color: colors.primary },
    kycVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    kycPendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    kycPendingText: { ...typography.body, color: colors.textSecondary },
    kycLink: { alignSelf: 'flex-start' },
    kycLinkText: {
      ...typography.captionBold,
      color: colors.primary,
      textDecorationLine: 'underline',
    },

    adminLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.accent + '15',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.accent + '40',
      marginBottom: spacing.md,
    },
    adminLinkText: { ...typography.bodyBold, color: colors.accent, flex: 1 },

    infoList: { gap: spacing.md },
    infoItem: { gap: 2 },
    infoLabel: { ...typography.caption, color: colors.textSecondary },
    infoValue: { ...typography.body, color: colors.text },

    form: { gap: spacing.md },
    btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
    flex1: { flex: 1 },
    signOutBtn: { marginTop: spacing.md, borderColor: colors.error, borderWidth: 1 },
  });
}
