'use client';

import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import dynamic from 'next/dynamic';

const BaseLayout = dynamic(() => import('@/components/BaseLayout'), {
  ssr: false,
  loading: () => <FullscreenLoader showWizard={false} />,
});

export default BaseLayout;
