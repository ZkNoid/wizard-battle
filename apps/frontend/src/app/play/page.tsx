'use client';

export const dynamic = 'force-dynamic';

import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import { useMinaAppkit } from 'mina-appkit';
import dynamicImport from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trackPageLoad } from '@/lib/analytics/performance';

const Play = dynamicImport(() => import('@/components/Play'), {
  ssr: false,
  loading: () => <FullscreenLoader showWizard={false} />,
});

export default function PlayPage() {
  const router = useRouter();
  const { address } = useMinaAppkit();

  // Redirect to home if no address is found
  useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address]);

  // Track page load performance
  useEffect(() => {
    trackPageLoad('play');
  }, []);

  return <Play />;
}
