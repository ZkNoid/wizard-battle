'use client';

import { Button } from '../shared/Button';
import { CraftBg } from '../CraftModal/assets/craft-bg';
import { useModalSound } from '@/lib/hooks/useAudio';

interface QuickGuideModalProps {
  onClose: () => void;
}

export default function QuickGuideModal({ onClose }: QuickGuideModalProps) {
  // Play modal sounds
  useModalSound();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="w-150 h-199 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-0 flex flex-row gap-2.5 px-5">
          <div className="flex h-20 w-full flex-row items-center justify-center">
            <span className="font-pixel text-main-gray text-2xl font-bold">
              Quick Guide
            </span>
          </div>
        </div>
        <div className="h-185 relative z-10 -mt-5 w-full">
          <div className="h-full w-full overflow-y-auto px-8 py-8">
            <div className="flex flex-col gap-4">
              <p className="font-pixel text-main-gray text-base">
                Welcome to Wizard Battle! This is a placeholder for the quick
                guide content.
              </p>
              <p className="font-pixel text-main-gray text-base">
                Here you will find helpful tips and instructions on how to play
                the game.
              </p>
              <div className="mt-4 flex justify-center">
                <Button
                  variant="blue"
                  className="h-16 w-40"
                  onClick={onClose}
                  text="Close"
                  enableClickSound
                />
              </div>
            </div>
          </div>
          <CraftBg className="absolute inset-0 -z-10 size-full h-full w-full" />
        </div>
      </div>
    </div>
  );
}
