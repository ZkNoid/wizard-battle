'use client';

import { wagmiAdapter, projectId, networks, config } from '@/lib/config/reown';
import { createAppKit } from '@reown/appkit/react';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider } from 'wagmi';
import { env } from '@/env';

const metadata = {
  name: env.NEXT_PUBLIC_PROJECT_NAME ?? 'Orbitrium XOrb',
  description:
    env.NEXT_PUBLIC_PROJECT_DESCRIPTION ?? 'A decentralized application',
  url:
    typeof window !== 'undefined'
      ? window.location.origin
      : (env.NEXT_PUBLIC_PROJECT_URL ?? 'https://localhost:3000'),
  icons: ['/favicon.ico'],
};

// Create the modal with better error handling
let modal: ReturnType<typeof createAppKit> | null = null;

try {
  if (!projectId) {
    throw new Error(
      'Reown project ID is not configured. Please check your environment variables.'
    );
  }

  modal = createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    defaultNetwork: networks[0],
    metadata,
    themeMode: 'dark',
    features: {
      analytics: true,
    },
    themeVariables: {
      '--w3m-accent': '#000000',
    },
    // Feature Auro Wallet prominently in the modal
    featuredWalletIds: ['auro-wallet'],
  });
} catch (error) {
  console.error('Failed to create AppKit modal:', error);
  console.error(
    'Make sure you have set NEXT_PUBLIC_REOWN_PROJECT_ID in your .env.local file'
  );
  console.error('Get your project ID from https://cloud.reown.com');
}

export { modal };

export default function ReownContext({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(config, cookies);
  return (
    <WagmiProvider config={config} initialState={initialState}>
      {children}
    </WagmiProvider>
  );
}
