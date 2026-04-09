/**
 * QRScanner — Scanner de QR code via expo-camera
 *
 * Usage (côté membre) :
 *   <QRScanner
 *     visible={show}
 *     onScanned={(code) => handleDelivery(code)}
 *     onClose={() => setShow(false)}
 *   />
 *
 * Compatible : garde la saisie manuelle en fallback.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { Ionicons } from '@expo/vector-icons';

interface QRScannerProps {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ visible, onScanned, onClose }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Réinitialiser à chaque ouverture
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setShowManual(false);
      setManualCode('');
    }
  }, [visible]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
    onClose();
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      Alert.alert('Code invalide', 'Le code doit être composé de 6 chiffres.');
      return;
    }
    onScanned(code);
    onClose();
  };

  const renderContent = () => {
    // Sur web, afficher directement la saisie manuelle
    if (Platform.OS === 'web') {
      return renderManualFallback();
    }

    // Demande de permission
    if (!permission) {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>Vérification des permissions…</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.message}>
            L'accès à la caméra est requis pour scanner le QR code.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualLink}
            onPress={() => setShowManual(true)}
          >
            <Text style={styles.manualLinkText}>Entrer le code manuellement</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (showManual) return renderManualFallback();

    return (
      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        {/* Viseur */}
        <View style={styles.overlay}>
          <View style={styles.viewfinder} />
          <Text style={styles.scanHint}>Centrez le QR code dans le cadre</Text>
          <TouchableOpacity
            style={styles.manualLink}
            onPress={() => setShowManual(true)}
          >
            <Text style={styles.manualLinkText}>Saisir le code manuellement</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderManualFallback = () => (
    <View style={styles.manualContainer}>
      <Ionicons name="keypad-outline" size={40} color={colors.primary} />
      <Text style={styles.manualTitle}>Saisir le code manuellement</Text>
      <Text style={styles.manualSubtitle}>
        Entrez le code à 6 chiffres fourni par le transporteur.
      </Text>
      <TextInput
        style={styles.codeInput}
        value={manualCode}
        onChangeText={setManualCode}
        placeholder="000000"
        placeholderTextColor={colors.textTertiary}
        keyboardType="numeric"
        maxLength={6}
        textAlign="center"
      />
      <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
        <Text style={styles.submitBtnText}>Confirmer la livraison</Text>
      </TouchableOpacity>
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.manualLink}
          onPress={() => setShowManual(false)}
        >
          <Text style={styles.manualLinkText}>← Retour au scanner</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Scanner le QR code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  permBtnText: {
    ...typography.bodyBold,
    color: colors.black,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  viewfinder: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  scanHint: {
    ...typography.caption,
    color: colors.white,
    backgroundColor: colors.overlayDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  manualLink: {
    paddingVertical: spacing.sm,
  },
  manualLinkText: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  manualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  manualTitle: {
    ...typography.h3,
    color: colors.text,
  },
  manualSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  codeInput: {
    ...typography.display,
    color: colors.primary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: 220,
    borderWidth: 2,
    borderColor: colors.primary,
    letterSpacing: 8,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  submitBtnText: {
    ...typography.bodyBold,
    color: colors.black,
  },
});
