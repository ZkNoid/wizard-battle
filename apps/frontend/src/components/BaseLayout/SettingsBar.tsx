'use client';

import { motion } from 'motion/react';
import AudioSelector from '../AudioSelector';
import BoxButton from '../shared/BoxButton';
import { Tab } from '@/lib/enums/Tab';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics/posthog-utils';
import { AnalyticsEvents } from '@/lib/analytics/events';
import type { GuideOpenedProps } from '@/lib/analytics/types';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';

export function SettingsBar({ setTab }: { setTab?: (tab: Tab) => void }) {
  const { setIsSoundSettingsModalOpen } = useMiscellaneousSessionStore();
  return (
    <motion.div className="flex items-center gap-4">
      {/* Support button */}
      <BoxButton
        onClick={() => {
          const props: GuideOpenedProps = {
            location: 'home',
          };
          trackEvent(AnalyticsEvents.GUIDE_OPENED, props);
          setTab?.(Tab.HOW_TO_PLAY);
        }}
        color="gray"
        className="size-16"
        enableHoverSound
        enableClickSound
      >
        <Image
          src={'/icons/question.png'}
          width={18}
          height={28}
          quality={100}
          unoptimized={true}
          alt="question"
          className="w-4.5 h-7"
        />
      </BoxButton>
      {/* Settings button */}
      <BoxButton
        onClick={() => setIsSoundSettingsModalOpen(true)}
        color="gray"
        className="size-16"
        enableHoverSound
        enableClickSound
      >
        <Image
          src={'/icons/gear.png'}
          width={30}
          height={30}
          quality={100}
          unoptimized={true}
          alt="settings"
          className="size-7.5"
        />
      </BoxButton>
      {/* Audio */}
      <AudioSelector />
    </motion.div>
  );
}
