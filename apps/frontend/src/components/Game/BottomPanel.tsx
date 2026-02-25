'use client';

import Image from 'next/image';
import { Button } from '../shared/Button';
import BoxButton from '../shared/BoxButton';
import { Clock } from './Clock';
import { SkillsPanel } from './SkillsPanel';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import { trackEvent } from '@/lib/analytics/posthog-utils';
import { AnalyticsEvents } from '@/lib/analytics/events';
import type { GuideOpenedProps } from '@/lib/analytics/types';
import type { IUserAction } from 'node_modules/@wizard-battle/common/types/gameplay.types';

interface BottomPanelProps {
  actionInfo?: { movementDone: boolean; spellCastDone: boolean };
  preparedActions?: IUserAction[];
}

export function BottomPanel({ actionInfo, preparedActions }: BottomPanelProps) {
  const { gamePhaseManager } = useUserInformationStore();
  const { setIsQuickGuideModalOpen } = useMiscellaneousSessionStore();

  return (
    <div className="flex w-full flex-row items-center justify-between gap-5">
      <div className="w-65 mr-5 flex h-28 flex-row items-end gap-2.5">
        <Button
          variant="blue"
          className="h-16 w-40"
          onClick={() => {
            const playerId =
              typeof window !== 'undefined'
                ? window.sessionStorage.getItem('playerId') || ''
                : '';
            gamePhaseManager?.surrender(playerId);
          }}
          text="Give up"
        />
        <BoxButton
          color="gray"
          className="size-14"
          onClick={() => {
            const props: GuideOpenedProps = {
              location: 'battle',
            };
            trackEvent(AnalyticsEvents.GUIDE_OPENED, props);
            setIsQuickGuideModalOpen(true);
          }}
        >
          <Image
            src={'/icons/question.png'}
            width={18}
            height={27}
            quality={100}
            unoptimized={true}
            alt="questionmark"
            className="w-4.5 h-7"
          />
        </BoxButton>
      </div>

      <SkillsPanel actionInfo={actionInfo} />

      <div className="flex h-28 flex-row items-end gap-2.5">
        <Clock />
        <Button
          variant="gray"
          className="h-28 w-40"
          onClick={() => {
            gamePhaseManager?.submitPlayerActions({
              actions: preparedActions ?? [],
              signature: 'test_signature',
            });
          }}
          text="End turn"
        />
        <BoxButton className="size-14" onClick={() => {}} disabled={true}>
          <span className="text-main-gray text-sm">...</span>
        </BoxButton>
      </div>
    </div>
  );
}
