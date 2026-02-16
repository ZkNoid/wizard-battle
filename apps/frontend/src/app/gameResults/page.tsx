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
  loading: () => <FullscreenLoader text="Calculating results" />,
});

function GameResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address } = useMinaAppkit();
  const [playStep, setPlayStep] = useState<PlaySteps>(PlaySteps.SELECT_MODE);

  // Get winner from URL parameter
  const winnerParam = searchParams.get('winner');
  const isWinner = winnerParam === 'true';

  // Get rewards from URL parameters
  const rewards = (() => {
    const rewardMap = new Map<
      string,
      { itemId: string; amount: number; total: number }
    >();

    // Parse all reward_* parameters
    searchParams.forEach((value, key) => {
      const match = /^reward_(.+)_(amount|total)$/.exec(key);
      if (match && value && match[1] && match[2]) {
        const itemId = match[1];
        const type = match[2] as 'amount' | 'total';
        if (!rewardMap.has(itemId)) {
          rewardMap.set(itemId, { itemId, amount: 0, total: 0 });
        }
        const reward = rewardMap.get(itemId)!;
        if (type === 'amount') {
          reward.amount = parseInt(value, 10);
        } else if (type === 'total') {
          reward.total = parseInt(value, 10);
        }
      }
    });

    return rewardMap.size > 0 ? Array.from(rewardMap.values()) : undefined;
  })();

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
          rewards={rewards}
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
