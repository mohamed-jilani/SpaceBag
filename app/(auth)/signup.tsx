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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password || !name) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(email, password, name, role);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Join SpaceBag</Text>
          <Text style={styles.subtitle}>Start delivering or sending parcels today</Text>
        </View>

        <Card variant="elevated" style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleCard, role === 'member' && styles.roleCardActive]} 
              onPress={() => setRole('member')}
            >
              <Ionicons name="person" size={24} color={role === 'member' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleText, role === 'member' && styles.roleTextActive]}>Member</Text>
              <Text style={styles.roleDesc}>I want to send parcels</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleCard, role === 'carrier' && styles.roleCardActive]} 
              onPress={() => setRole('carrier')}
            >
              <Ionicons name="airplane" size={24} color={role === 'carrier' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleText, role === 'carrier' && styles.roleTextActive]}>Carrier</Text>
              <Text style={styles.roleDesc}>I want to deliver parcels</Text>
            </TouchableOpacity>
          </View>

          <Button 
            variant="primary" 
            onPress={handleSignup} 
            loading={loading}
            style={styles.submitBtn}
          >
            Create Account
          </Button>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Login</Text>
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
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
    ...typography.small,
  },
  label: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDarkMode,
    alignItems: 'center',
    backgroundColor: colors.backgroundTertiary,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint + '10', // 10 is 6% opacity approx
  },
  roleText: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  roleTextActive: {
    color: colors.primary,
  },
  roleDesc: {
    ...typography.tiny,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: spacing.md,
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
