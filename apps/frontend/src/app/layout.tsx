import '@/styles/globals.css';

import { type Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import {
  dePixel,
  dePixelBreit,
  dePixelKlein,
  dePixelSchmal,
} from '@/lib/fonts/dePixel';
import { headers } from 'next/headers';
import ReownContext from './context/ReownContext';

import { TRPCReactProvider } from '@/trpc/react';
import ClientInitializer from './ClientInitializer';
import { PostHogProvider } from '@/lib/analytics/posthog-provider';

export const metadata: Metadata = {
  title: 'Wizard Battle',
  description: 'Wizard Battle',
  icons: [{ rel: 'icon', url: '/favicon.png' }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');
  return (
    <html
      lang="en"
      className={`${dePixel.variable} ${dePixelBreit.variable} ${dePixelKlein.variable} ${dePixelSchmal.variable}`}
    >
      <body>
        <PostHogProvider>
          <ReownContext cookies={cookies}>
            <ClientInitializer />
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </ReownContext>
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
