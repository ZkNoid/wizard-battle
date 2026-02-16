'use client';

import { Button } from '../shared/Button';
import { useRouter } from 'next/navigation';

export function Page4() {
  const router = useRouter();
  return (
    <div className="gap-7.5 mt-7.5 flex flex-col">
      <div className="gap-7.5 flex flex-col">
        <div className="flex flex-col gap-4">
          <span className="font-pixel text-main-gray text-xl font-bold">
            6. Winning the game
          </span>
          <span className="font-pixel text-main-gray text-lg">
            The objective is simple: be the last wizard standing! Use your
            skills and strategic positioning to outmaneuver and outsmart your
            opponent. If you reduce your opponent&apos;s health to zero, you win
            the match!
          </span>
          <span className="font-pixel text-main-gray text-lg">
            After the match ends, you can review the results. You&apos;ll see
            key statistics about your performance and receive rewards based on
            your achievements.
          </span>
          <Button
            text="Play now!"
            variant="blue"
            onClick={() => router.push('/play')}
            className="h-15 w-90"
          />
        </div>
      </div>
    </div>
  );
}
