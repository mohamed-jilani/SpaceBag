/**
 * Écran d'onboarding — affiché une seule fois lors de la première ouverture.
 * AsyncStorage["hasSeenOnboarding"] = "true" après complétion.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/design';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'airplane' as const,
    title: 'Bienvenue sur SpaceBag',
    subtitle: 'La plateforme qui connecte voyageurs et expéditeurs de colis.',
    color: colors.primary,
  },
  {
    id: '2',
    icon: 'cube-outline' as const,
    title: 'Envoyez vos colis',
    subtitle: 'Trouvez un transporteur qui voyage dans votre direction et confiez-lui votre colis en toute confiance.',
    color: colors.accent,
  },
  {
    id: '3',
    icon: 'wallet-outline' as const,
    title: 'Gagnez de l\'argent',
    subtitle: 'Transporteur ? Rentabilisez votre voyage en portant des colis et en aidant votre communauté.',
    color: colors.success,
  },
  {
    id: '4',
    icon: 'shield-checkmark-outline' as const,
    title: 'En toute sécurité',
    subtitle: 'Profils vérifiés, code de livraison unique, évaluations post-livraison — votre sécurité est notre priorité.',
    color: colors.warning,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/login');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={80} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        {!isLast ? (
          <>
            <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Passer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
              <Text style={styles.nextText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.black} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={handleFinish} style={styles.startBtn}>
            <Text style={styles.startText}>Commencer</Text>
            <Ionicons name="rocket-outline" size={20} color={colors.black} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  skipBtn: {
    padding: spacing.md,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  nextText: {
    ...typography.bodyBold,
    color: colors.black,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  startText: {
    ...typography.bodyBold,
    color: colors.black,
  },
});
