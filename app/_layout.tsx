import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { StripeProviderWrapper } from '@/components/StripeProviderWrapper';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Empêcher le masquage automatique du splash
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

/**
 * Gère les redirections en fonction de l'état d'authentification
 * et de l'onboarding.
 */
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then(value => {
      setHasSeenOnboarding(value === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (loading || !onboardingChecked) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inLegal = segments[0] === 'legal';

    // Masquer le splash quand tout est prêt
    SplashScreen.hideAsync();

    // Si on est déjà sur l'onboarding ou un écran légal, rien à faire
    if (inOnboarding || inLegal) return;

    // Si connecté et sur la page auth → rediriger vers l'accueil
    if (user && inAuth) {
      router.replace('/');
      return;
    }

    // Si l'onboarding n'a pas été vu → vérifier AsyncStorage en temps réel
    // (l'état local peut être périmé si l'écran onboarding vient de l'écrire)
    if (!hasSeenOnboarding) {
      AsyncStorage.getItem('hasSeenOnboarding').then(freshValue => {
        if (freshValue !== 'true') {
          router.replace('/onboarding');
        }
        // Si 'true' : l'utilisateur vient de finir l'onboarding, on ne redirige pas
      });
    }
  }, [loading, user, onboardingChecked, hasSeenOnboarding, segments]);

  if (loading || !onboardingChecked) return null;

  return <>{children}</>;
}

function AppStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <StripeProviderWrapper>
            <AuthProvider>
              <NavigationGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
                  <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
                  <Stack.Screen name="trips/new" options={{ headerShown: false }} />
                  <Stack.Screen name="trips/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="tracking/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="kyc/submit" options={{ headerShown: false }} />
                  <Stack.Screen name="admin/kyc" options={{ headerShown: false }} />
                  <Stack.Screen name="legal/cgu" options={{ headerShown: false }} />
                  <Stack.Screen name="wallet/index" options={{ headerShown: false }} />
                  <Stack.Screen name="wallet/add-card" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <AppStatusBar />
              </NavigationGuard>
            </AuthProvider>
          </StripeProviderWrapper>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
