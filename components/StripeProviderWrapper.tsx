import { ReactNode } from 'react';

// Web fallback: Stripe is not supported on web, render children as-is
export function StripeProviderWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
