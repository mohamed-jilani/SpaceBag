/**
 * QRCodeModal — Affiche un QR code dans un modal
 *
 * Usage (côté transporteur) :
 *   <QRCodeModal visible={show} code={verificationCode} onClose={() => setShow(false)} />
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { Ionicons } from '@expo/vector-icons';

interface QRCodeModalProps {
  visible: boolean;
  code: string;
  onClose: () => void;
}

export function QRCodeModal({ visible, code, onClose }: QRCodeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>QR Code de livraison</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Présentez ce QR code au membre pour confirmer la livraison.
          </Text>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <QRCode
              value={code}
              size={200}
              backgroundColor={colors.white}
              color={colors.black}
            />
          </View>

          {/* Code manuel en backup */}
          <View style={styles.codeRow}>
            <Text style={styles.codeLabel}>Code manuel :</Text>
            <Text style={styles.codeValue}>{code}</Text>
          </View>

          <Text style={styles.hint}>
            Si le scan échoue, le membre peut entrer le code manuellement.
          </Text>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  codeValue: {
    ...typography.h3,
    color: colors.primary,
    letterSpacing: 4,
  },
  hint: {
    ...typography.tiny,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  doneBtnText: {
    ...typography.bodyBold,
    color: colors.black,
  },
});
