'use client';

import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import { useMinaAppkit } from 'mina-appkit';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Play = dynamic(() => import('@/components/Play'), {
  ssr: false,
  loading: () => <FullscreenLoader />,
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

  return <Play />;
}
