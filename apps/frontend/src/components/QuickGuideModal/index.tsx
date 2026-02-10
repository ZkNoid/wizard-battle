'use client';

import { Button } from '../shared/Button';
import { useModalSound } from '@/lib/hooks/useAudio';
import { QuickGuideBg } from './assets/quick-guide-bg';
import ModalTitle from '../shared/ModalTitle';
import HeroCharacteristicsPanel from './HeroCharacteristicsPanel';
import HeroActionPointsPanel from './HeroActionPointsPanel';
import HeroSkillsPanel from './HeroSkillsPanel';
import TimerPanel from './TimerPanel';

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
        className="w-150 h-185 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full w-full overflow-y-auto px-8 py-8">
          <ModalTitle title="Quick guide" onClose={onClose} />
          <div className="flex flex-col gap-4">
            <HeroCharacteristicsPanel />
            <HeroActionPointsPanel />
            <HeroSkillsPanel />
            <TimerPanel />
          </div>
        </div>
        <QuickGuideBg className="absolute inset-0 -z-10 size-full h-full w-full" />
      </div>
    </div>
  );
}
