'use client';

import { useEffect, useState } from 'react';
import { Button } from '../shared/Button';
import { PlayStepOrder, PlaySteps } from '@/lib/enums/PlaySteps';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Navigation({
  playStep,
  setPlayStep,
  haveNextButton,
  className,
}: {
  playStep: PlaySteps;
  setPlayStep: (playStep: PlaySteps) => void;
  haveNextButton?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(
    PlayStepOrder.indexOf(playStep)
  );

  useEffect(() => {
    setCurrentIndex(PlayStepOrder.indexOf(playStep));
  }, [playStep]);

  return (
    <nav
      className={cn('flex w-full items-center justify-between pt-5', className)}
    >
      {currentIndex >= 0 && (
        <Button
          variant="blue"
          className="w-70 h-15 -ml-8 mr-auto"
          onClick={() => {
            if (currentIndex === 0) router.push('/');

            if (currentIndex > 0) {
              const prevStep = PlayStepOrder[currentIndex - 1];
              if (prevStep) setPlayStep(prevStep);
            }
          }}
          enableHoverSound
          enableClickSound
        >
          Back
        </Button>
      )}
      {currentIndex < PlayStepOrder.length - 1 &&
        playStep !== PlaySteps.SELECT_MODE &&
        playStep !== PlaySteps.SELECT_CHARACTER && (
          <Button
            variant="blue"
            className="w-70 h-15 -mr-8 ml-auto"
            onClick={() => {
              if (currentIndex < PlayStepOrder.length - 1) {
                const nextStep = PlayStepOrder[currentIndex + 1];
                if (nextStep) setPlayStep(nextStep);
              }
            }}
            enableHoverSound
            enableClickSound
          >
            Next
          </Button>
        )}
    </nav>
  );
}
