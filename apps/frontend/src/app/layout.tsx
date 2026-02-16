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
        <ReownContext cookies={cookies}>
          <TRPCReactProvider>
            <ClientInitializer />
            {children}
          </TRPCReactProvider>
        </ReownContext>
        <Analytics />
      </body>
    </html>
  );
}
