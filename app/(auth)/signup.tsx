import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Container, Input, Button, Card } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [acceptedCgu, setAcceptedCgu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password || !name) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!acceptedCgu) {
      setError("Vous devez accepter les conditions d'utilisation pour continuer.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(email, password, name, role, true);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || "Échec de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Rejoindre SpaceBag</Text>
          <Text style={styles.subtitle}>Commencez à envoyer ou transporter des colis</Text>
        </View>

        <Card variant="elevated" style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Input
            label="Nom complet"
            placeholder="Jean Dupont"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            placeholder="votre@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Je suis…</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'member' && styles.roleCardActive]}
              onPress={() => setRole('member')}
            >
              <Ionicons name="person" size={24} color={role === 'member' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleText, role === 'member' && styles.roleTextActive]}>Membre</Text>
              <Text style={styles.roleDesc}>Je veux envoyer des colis</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, role === 'carrier' && styles.roleCardActive]}
              onPress={() => setRole('carrier')}
            >
              <Ionicons name="airplane" size={24} color={role === 'carrier' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleText, role === 'carrier' && styles.roleTextActive]}>Transporteur</Text>
              <Text style={styles.roleDesc}>Je veux transporter des colis</Text>
            </TouchableOpacity>
          </View>

          {/* CGU Checkbox */}
          <TouchableOpacity
            style={styles.cguRow}
            onPress={() => setAcceptedCgu(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedCgu && styles.checkboxChecked]}>
              {acceptedCgu && (
                <Ionicons name="checkmark" size={14} color={colors.black} />
              )}
            </View>
            <View style={styles.cguTextContainer}>
              <Text style={styles.cguText}>
                J'accepte les{' '}
                <Text
                  style={styles.cguLink}
                  onPress={() => router.push('/legal/cgu')}
                >
                  conditions générales d'utilisation
                </Text>
                {' '}et la politique de confidentialité.
              </Text>
            </View>
          </TouchableOpacity>

          <Button
            variant="primary"
            onPress={handleSignup}
            loading={loading}
            style={[styles.submitBtn, !acceptedCgu && styles.submitBtnDisabled]}
          >
            Créer mon compte
          </Button>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà inscrit ? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Se connecter</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.md,
  },
  errorText: {
    color: colors.error,
    ...typography.small,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  roleCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDarkMode,
    alignItems: 'center',
    backgroundColor: colors.backgroundTertiary,
    gap: 4,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint + '10',
  },
  roleText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  roleTextActive: {
    color: colors.primary,
  },
  roleDesc: {
    ...typography.tiny,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cguRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderDarkMode,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: colors.backgroundTertiary,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cguTextContainer: {
    flex: 1,
  },
  cguText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cguLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  linkText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});
