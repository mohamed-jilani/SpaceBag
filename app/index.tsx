import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { Container, Button } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Container style={styles.container}>
      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>SpaceBag</Text>
        <Text style={styles.welcomeSubtitle}>Send parcels anywhere with trusted travelers</Text>
        
        <Button 
          variant="primary" 
          onPress={() => router.push('/(auth)/login')}
          style={styles.welcomeBtn}
        >
          Get Started
        </Button>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcome: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  welcomeTitle: {
    ...typography.display,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  welcomeBtn: {
    width: '100%',
  },
});
