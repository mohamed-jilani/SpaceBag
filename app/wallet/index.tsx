/**
 * Écran portefeuille — solde, cartes, transactions
 * Accessible depuis le profil et les paramètres.
 */

import React, { useEffect, useState } from 'react';
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
import {
  Wallet,
  WalletCard,
  WalletTx,
  subscribeWallet,
  withdrawFunds,
  topUpWallet,
  removeCard,
} from '@/services/wallet';
import { spacing, typography, borderRadius } from '@/constants/design';

export default function WalletScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeWallet(user.uid, w => {
      setWallet(w);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleWithdraw = () => {
    if (!wallet || wallet.balance <= 0) return;
    Alert.alert(
      t('wallet.withdraw'),
      `Retirer €${wallet.balance.toFixed(2)} vers votre compte bancaire ? (simulation)`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('wallet.withdraw'),
          onPress: async () => {
            setActionLoading(true);
            try {
              await withdrawFunds(user!.uid, wallet.balance);
              Alert.alert(t('common.success'), t('wallet.withdrawSuccess'));
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTopUp = () => {
    Alert.alert(
      t('wallet.topUp'),
      'Recharger de 50 € (simulation) ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('wallet.topUp'),
          onPress: async () => {
            setActionLoading(true);
            try {
              await topUpWallet(user!.uid, 50);
              Alert.alert(t('common.success'), t('wallet.topUpSuccess'));
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteCard = (card: WalletCard) => {
    Alert.alert(
      'Supprimer la carte',
      `Supprimer la carte ${card.brand} ••••${card.last4} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await removeCard(user!.uid, card.id);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isCarrier = profile?.role === 'carrier';
  const totalEarnings = wallet?.transactions
    .filter(tx => tx.type === 'earning')
    .reduce((sum, tx) => sum + tx.amount, 0) ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.backgroundSecondary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('wallet.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Solde */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
          <Text style={styles.balanceAmount}>€ {(wallet?.balance ?? 0).toFixed(2)}</Text>
          {isCarrier && (
            <Text style={styles.earningsLabel}>
              {t('wallet.earnings')} : €{totalEarnings.toFixed(2)}
            </Text>
          )}
          <Text style={styles.simNote}>{t('wallet.simulation')}</Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={styles.balanceBtn}
              onPress={handleTopUp}
              disabled={actionLoading}
            >
              <Ionicons name="add-circle-outline" size={18} color="#000" />
              <Text style={styles.balanceBtnText}>{t('wallet.topUp')}</Text>
            </TouchableOpacity>
            {isCarrier && (
              <TouchableOpacity
                style={[styles.balanceBtn, { backgroundColor: 'rgba(0,0,0,0.15)' }]}
                onPress={handleWithdraw}
                disabled={actionLoading || (wallet?.balance ?? 0) <= 0}
              >
                <Ionicons name="arrow-down-circle-outline" size={18} color="#000" />
                <Text style={styles.balanceBtnText}>{t('wallet.withdraw')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Cartes */}
        <SectionTitle title={t('wallet.cards')} colors={colors} />
        {(wallet?.cards ?? []).length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t('wallet.noCards')}</Text>
        ) : (
          (wallet?.cards ?? []).map(card => (
            <CardItem key={card.id} card={card} colors={colors} onDelete={() => handleDeleteCard(card)} />
          ))
        )}
        <TouchableOpacity
          style={[styles.addCardBtn, { borderColor: colors.primary }]}
          onPress={() => router.push('/wallet/add-card' as any)}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={[styles.addCardText, { color: colors.primary }]}>{t('wallet.addCard')}</Text>
        </TouchableOpacity>

        {/* Transactions */}
        <SectionTitle title={t('wallet.transactions')} colors={colors} />
        {(wallet?.transactions ?? []).length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t('wallet.noTransactions')}</Text>
        ) : (
          (wallet?.transactions ?? []).slice(0, 20).map(tx => (
            <TxItem key={tx.id} tx={tx} colors={colors} t={t} />
          ))
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
      {title.toUpperCase()}
    </Text>
  );
}

function CardItem({ card, colors, onDelete }: { card: WalletCard; colors: any; onDelete: () => void }) {
  const BRAND_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    Visa: 'card-outline',
    Mastercard: 'card-outline',
    Amex: 'card-outline',
  };
  return (
    <View style={[styles.cardItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.backgroundTertiary }]}>
      <Ionicons name={BRAND_ICONS[card.brand] ?? 'card-outline'} size={28} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardBrand, { color: colors.text }]}>{card.brand} ••••{card.last4}</Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{card.holder} · Exp. {card.expiry}</Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );
}

function TxItem({ tx, colors, t }: { tx: WalletTx; colors: any; t: (k: string) => string }) {
  const isCredit = tx.amount > 0;
  const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    payment: 'arrow-up-circle-outline',
    earning: 'arrow-down-circle-outline',
    withdrawal: 'arrow-down-circle-outline',
    topup: 'add-circle-outline',
  };
  return (
    <View style={[styles.txItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.backgroundTertiary }]}>
      <Ionicons
        name={TYPE_ICONS[tx.type] ?? 'swap-horizontal-outline'}
        size={22}
        color={isCredit ? colors.success : colors.error}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>{tx.description}</Text>
        <Text style={[styles.txDate, { color: colors.textTertiary }]}>
          {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.error }]}>
        {isCredit ? '+' : ''}€{tx.amount.toFixed(2)}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...typography.h2 },
  scroll: { padding: spacing.lg, gap: spacing.sm },

  balanceCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  balanceLabel: { ...typography.caption, color: 'rgba(0,0,0,0.6)' },
  balanceAmount: { ...typography.display, color: '#000', fontWeight: '700' },
  earningsLabel: { ...typography.caption, color: 'rgba(0,0,0,0.5)' },
  simNote: { ...typography.tiny, color: 'rgba(0,0,0,0.4)', fontStyle: 'italic' },
  balanceActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  balanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  balanceBtnText: { ...typography.captionBold, color: '#000' },

  sectionTitle: {
    ...typography.tinyBold,
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: { ...typography.body, textAlign: 'center', marginVertical: spacing.md },

  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardBrand: { ...typography.bodyBold },
  cardMeta: { ...typography.caption },

  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  addCardText: { ...typography.bodyBold },

  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  txDesc: { ...typography.captionBold },
  txDate: { ...typography.tiny, marginTop: 2 },
  txAmount: { ...typography.bodyBold },
});
