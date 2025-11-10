'use client';

import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import dynamicImport from 'next/dynamic';

const Home = dynamicImport(() => import('./Home'), {
  ssr: false,
  loading: () => <FullscreenLoader showWizard={false} />,
});

export default function Page() {
  return <Home />;
}
