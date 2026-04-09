/**
 * Écran CGU — Conditions Générales d'Utilisation
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { Ionicons } from '@expo/vector-icons';

export default function CguScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdate}>Dernière mise à jour : Janvier 2025</Text>

        <Section title="1. Objet">
          Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation de l'application mobile SpaceBag, plateforme de mise en relation entre voyageurs (transporteurs) et expéditeurs de colis (membres).
        </Section>

        <Section title="2. Inscription et compte">
          Pour utiliser les services de SpaceBag, vous devez créer un compte avec des informations exactes et à jour. Vous êtes responsable de la confidentialité de vos identifiants. SpaceBag se réserve le droit de suspendre tout compte en cas d'utilisation frauduleuse.
        </Section>

        <Section title="3. Services proposés">
          SpaceBag permet aux membres de publier des demandes d'envoi de colis et aux transporteurs de proposer de l'espace disponible dans leurs bagages. SpaceBag agit en tant qu'intermédiaire et n'est pas responsable des colis transportés.
        </Section>

        <Section title="4. Responsabilités">
          Les transporteurs s'engagent à déclarer fidèlement leurs capacités disponibles. Les membres s'engagent à déclarer honnêtement le contenu et le poids de leurs colis. Le transport de marchandises illicites est strictement interdit.
        </Section>

        <Section title="5. Vérification d'identité (KYC)">
          SpaceBag peut demander une vérification d'identité (KYC) pour sécuriser les transactions. Les documents soumis sont traités de manière confidentielle et ne sont utilisés qu'à des fins de vérification.
        </Section>

        <Section title="6. Paiements">
          Les transactions financières entre membres et transporteurs s'effectuent via la plateforme sécurisée Stripe. SpaceBag n'est pas responsable des litiges financiers entre les parties.
        </Section>

        <Section title="7. Évaluations">
          Après chaque livraison, les parties sont invitées à s'évaluer mutuellement. Les évaluations doivent être honnêtes et respectueuses. Tout abus pourra entraîner la suspension du compte.
        </Section>

        <Section title="8. Protection des données">
          SpaceBag collecte et traite vos données personnelles conformément au RGPD. Vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez : support@spacebag.app
        </Section>

        <Section title="9. Modification des CGU">
          SpaceBag se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés de toute modification substantielle via l'application.
        </Section>

        <Section title="10. Contact">
          Pour toute question relative aux présentes CGU : support@spacebag.app
        </Section>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <Text style={sectionStyles.body}>{children}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    ...typography.h4,
    color: colors.primary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xl + spacing.md,
    backgroundColor: colors.background,
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
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  lastUpdate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
});
