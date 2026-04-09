/**
 * Ajout d'une carte bancaire (simulation — aucun vrai traitement)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { addCard } from '@/services/wallet';
import { Input } from '@/components/ui';
import { spacing, typography, borderRadius } from '@/constants/design';

/** Formate le numéro de carte par blocs de 4 */
function formatCardNumber(raw: string) {
  return raw
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/** Formate MM/AA */
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export default function AddCardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [cardNumber, setCardNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 13) {
      Alert.alert(t('common.error'), 'Numéro de carte invalide (min 13 chiffres).');
      return;
    }
    if (!holder.trim()) {
      Alert.alert(t('common.error'), 'Le nom du titulaire est requis.');
      return;
    }
    const expiryClean = expiry.replace(/\D/g, '');
    if (expiryClean.length < 4) {
      Alert.alert(t('common.error'), "Date d'expiration invalide (MM/AA).");
      return;
    }
    if (cvv.length < 3) {
      Alert.alert(t('common.error'), 'CVV invalide (3 ou 4 chiffres).');
      return;
    }

    setLoading(true);
    try {
      await addCard(user!.uid, digits, holder.trim(), expiry);
      Alert.alert(t('common.success'), 'Carte enregistrée avec succès !', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.backgroundSecondary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('wallet.addCard')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Prévisualisation de la carte */}
        <CardPreview
          number={cardNumber}
          holder={holder}
          expiry={expiry}
          colors={colors}
        />

        <View style={[styles.form, { backgroundColor: colors.backgroundSecondary, borderColor: colors.backgroundTertiary }]}>
          <Input
            label={t('wallet.cardNumber')}
            placeholder={t('wallet.cardNumberPlaceholder')}
            value={cardNumber}
            onChangeText={v => setCardNumber(formatCardNumber(v))}
            keyboardType="number-pad"
            maxLength={19}
          />

          <Input
            label={t('wallet.cardHolder')}
            placeholder={t('wallet.cardHolderPlaceholder')}
            value={holder}
            onChangeText={setHolder}
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label={t('wallet.expiry')}
                placeholder={t('wallet.expiryPlaceholder')}
                value={expiry}
                onChangeText={v => setExpiry(formatExpiry(v))}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            <View style={styles.half}>
              <Input
                label={t('wallet.cvv')}
                placeholder={t('wallet.cvvPlaceholder')}
                value={cvv}
                onChangeText={v => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          <Text style={[styles.simNote, { color: colors.textTertiary }]}>
            🔒 {t('wallet.simulation')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#000" />
              <Text style={styles.saveBtnText}>{t('wallet.saveCard')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

// ─── Prévisualisation de carte ────────────────────────────────────────────────

function CardPreview({
  number,
  holder,
  expiry,
  colors,
}: {
  number: string;
  holder: string;
  expiry: string;
  colors: any;
}) {
  const displayNumber = number || '•••• •••• •••• ••••';
  const displayHolder = holder || 'PRÉNOM NOM';
  const displayExpiry = expiry || 'MM/AA';

  return (
    <View style={[previewStyles.card, { backgroundColor: colors.primary }]}>
      <View style={previewStyles.top}>
        <Ionicons name="wifi-outline" size={24} color="rgba(0,0,0,0.5)" style={{ transform: [{ rotate: '90deg' }] }} />
        <Text style={previewStyles.brand}>SpaceBag</Text>
      </View>
      <Text style={previewStyles.number}>{displayNumber}</Text>
      <View style={previewStyles.bottom}>
        <View>
          <Text style={previewStyles.metaLabel}>TITULAIRE</Text>
          <Text style={previewStyles.metaValue}>{displayHolder.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={previewStyles.metaLabel}>EXP.</Text>
          <Text style={previewStyles.metaValue}>{displayExpiry}</Text>
        </View>
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { ...typography.bodyBold, color: '#000', letterSpacing: 1 },
  number: { ...typography.h2, color: '#000', letterSpacing: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { ...typography.tiny, color: 'rgba(0,0,0,0.5)' },
  metaValue: { ...typography.captionBold, color: '#000' },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2 },
  scroll: { padding: spacing.lg },
  form: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  simNote: { ...typography.tiny, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  saveBtnText: { ...typography.bodyBold, color: '#000' },
});
