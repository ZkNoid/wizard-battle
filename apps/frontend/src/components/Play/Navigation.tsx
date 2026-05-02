'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '../shared/Button';
import { PlayStepOrder, PlayStepOrderPVE, PlaySteps } from '@/lib/enums/PlaySteps';
import { PlayMode } from '@/lib/enums/PlayMode';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUserInformationStore } from '@/lib/store/userInformationStore';

export function Navigation({
  playStep,
  setPlayStep,
  playMode,
  haveNextButton,
  className,
}: {
  playStep: PlaySteps;
  setPlayStep: (playStep: PlaySteps) => void;
  playMode?: PlayMode;
  haveNextButton?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const stepOrder = playMode === PlayMode.PVE ? PlayStepOrderPVE : PlayStepOrder;
  const [currentIndex, setCurrentIndex] = useState(
    stepOrder.indexOf(playStep)
  );
  const { stater } = useUserInformationStore();

  useEffect(() => {
    setCurrentIndex(stepOrder.indexOf(playStep));
  }, [playStep, stepOrder]);

  // Check if map has any empty tiles (TileType.Air = 0)
  const hasEmptyTiles = useMemo(() => {
    if (playStep !== PlaySteps.SELECT_MAP) return false;
    if (!stater?.state?.map) return true;

    const map = stater.state.map;
    return map.some((tile) => tile.toString() === '0');
  }, [playStep, stater?.state?.map]);

  const isNextDisabled = playStep === PlaySteps.SELECT_MAP && hasEmptyTiles;

  return (
    <nav
      className={cn('flex w-full items-center justify-between pt-5', className)}
    >
      {currentIndex >= 0 && (
        <Button
          variant="blue"
          className="w-70 h-15 mr-auto"
          onClick={() => {
            if (currentIndex === 0) router.push('/');

            if (currentIndex > 0) {
              const prevStep = stepOrder[currentIndex - 1];
              if (prevStep) setPlayStep(prevStep);
            }
          }}
          isLong={true}
          enableHoverSound
          enableClickSound
        >
          Back
        </Button>
      )}
      {currentIndex < stepOrder.length - 1 &&
        playStep !== PlaySteps.SELECT_MODE &&
        playStep !== PlaySteps.SELECT_CHARACTER &&
        playStep !== PlaySteps.SELECT_BOT && (
          <div className="relative ml-auto">
            <Button
              variant="blue"
              className={cn(
                'w-70 h-15',
                isNextDisabled && 'cursor-not-allowed opacity-50'
              )}
              onClick={() => {
                if (isNextDisabled) return;
                if (currentIndex < stepOrder.length - 1) {
                  const nextStep = stepOrder[currentIndex + 1];
                  if (nextStep) setPlayStep(nextStep);
                }
              }}
              enableHoverSound={!isNextDisabled}
              enableClickSound={!isNextDisabled}
              isLong={true}
            >
              Next
            </Button>
            {isNextDisabled && (
              <span className="font-pixel absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-red-400">
                Fill all tiles first
              </span>
            )}
          </div>
        )}
    </nav>
  );
}
