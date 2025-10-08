import '@/styles/globals.css';

import { type Metadata } from 'next';
import { dePixel } from '@/lib/fonts/dePixel';

import { TRPCReactProvider } from '@/trpc/react';
import Initializer from './initializer';

export const metadata: Metadata = {
  title: 'Wizard Battle',
  description: 'Wizard Battle',
  icons: [{ rel: 'icon', url: '/favicon.png' }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dePixel.variable}`}>
      <body>
        <Initializer />
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
