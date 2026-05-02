'use client';

export const dynamic = 'force-dynamic';

import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import { useMinaAppkit } from 'mina-appkit';
import dynamicImport from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { trackPageLoad } from '@/lib/analytics/performance';
import { trackEvent } from '@/lib/analytics/posthog-utils';
import { AnalyticsEvents } from '@/lib/analytics/events';
import type { WalletPromptShownProps } from '@/lib/analytics/types';

const Play = dynamicImport(() => import('@/components/Play'), {
  ssr: false,
  loading: () => <FullscreenLoader showWizard={false} />,
});

export default function PlayPage() {
  const router = useRouter();
  const { address } = useMinaAppkit();
  const playGatePromptedRef = useRef(false);

  // Redirect to home if no address is found
  useEffect(() => {
    if (address) {
      playGatePromptedRef.current = false;
      return;
    }
    if (!playGatePromptedRef.current) {
      const shown: WalletPromptShownProps = {
        prompt_context: 'play_route_requires_mina_wallet',
      };
      trackEvent(AnalyticsEvents.WALLET_PROMPT_SHOWN, shown);
      playGatePromptedRef.current = true;
    }
    router.replace('/');
  }, [address, router]);

  // Track page load performance
  useEffect(() => {
    trackPageLoad('play');
  }, []);

  return <Play />;
}
