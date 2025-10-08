'use client';

export const dynamic = 'force-dynamic';

import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import { useMinaAppkit } from 'mina-appkit';
import dynamicImport from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { PlaySteps } from '@/lib/enums/PlaySteps';

const GameResult = dynamicImport(() => import('@/components/GameResult'), {
  ssr: false,
  loading: () => <FullscreenLoader />,
});

function GameResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useMinaAppkit();
  const [playStep, setPlayStep] = useState<PlaySteps>(PlaySteps.SELECT_MODE);

  // Get winner from URL parameter
  const winnerParam = searchParams.get('winner');
  const isWinner = winnerParam === 'true';

  // Redirect to home if no address is found
  useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address, router]);

  // Redirect to home if no winner parameter is provided
  useEffect(() => {
    if (winnerParam === null) {
      router.replace('/');
    }
  }, [winnerParam, router]);

  // Handle navigation from GameResult component
  const handleSetPlayStep = (step: PlaySteps) => {
    if (step === PlaySteps.SELECT_MODE) {
      router.push('/play');
    } else {
      setPlayStep(step);
    }
  };

  // Show loading while checking parameters
  if (winnerParam === null || !address) {
    return <FullscreenLoader />;
  }

  return (
    <section className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex flex-col gap-2.5">
        <GameResult
          type={isWinner ? 'win' : 'lose'}
          setPlayStep={handleSetPlayStep}
        />
      </div>
    </section>
  );
}

export default function GameResultsPage() {
  return (
    <Suspense fallback={<FullscreenLoader />}>
      <GameResultsContent />
    </Suspense>
  );
}
