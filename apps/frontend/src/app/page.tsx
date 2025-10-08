'use client';

import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import dynamicImport from 'next/dynamic';

const Home = dynamicImport(() => import('./Home'), {
  ssr: false,
  loading: () => <FullscreenLoader />,
});

export default function Page() {
  return <Home />;
}
