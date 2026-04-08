import { StripeProvider } from '@stripe/stripe-react-native';
import { ReactNode } from 'react';

export function StripeProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
    >
      <>{children}</>
    </StripeProvider>
  );
}
