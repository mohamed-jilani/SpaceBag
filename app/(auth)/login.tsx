import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Container, Input, Button, Card } from '@/components/ui';
import { spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={styles.container} backgroundColor={colors.background}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.loginTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.loginSubtitle')}</Text>
        </View>

        <Card variant="elevated" style={{ ...styles.form, backgroundColor: colors.backgroundSecondary }}>
          {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

          <Input
            label={t('auth.email')}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label={t('auth.password')}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            variant="primary"
            onPress={handleLogin}
            loading={loading}
            style={styles.submitBtn}
          >
            {t('auth.signIn')}
          </Button>

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t('common.or')}</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.backgroundTertiary }]}>
              <Ionicons name="logo-google" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.backgroundTertiary }]}>
              <FontAwesome name="facebook" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.noAccount')} </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={[styles.linkText, { color: colors.primary }]}>{t('auth.joinNow')}</Text>
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
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xxxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
  form: {
    padding: spacing.lg,
  },
  errorText: {
    marginBottom: spacing.md,
    ...typography.small,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.tiny,
    marginHorizontal: spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  socialBtn: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  footerText: {
    ...typography.body,
  },
  linkText: {
    ...typography.bodyBold,
  },
});
