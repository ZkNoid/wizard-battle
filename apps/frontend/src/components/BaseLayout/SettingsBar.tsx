'use client';

import { motion } from 'motion/react';
import AudioSelector from '../AudioSelector';
import { SettingsIcon } from './assets/settings-icon';
import { usePathname } from 'next/navigation';
import BoxButton from '../shared/BoxButton';
import { SupportIcon } from './assets/support-icon';
import { Tab } from '@/lib/enums/Tab';

export function SettingsBar({ setTab }: { setTab: (tab: Tab) => void }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <motion.div
      // initial={isHomePage ? { opacity: 0, y: 50, scale: 0.9 } : false}
      // animate={isHomePage ? { opacity: 1, y: 0, scale: 1 } : false}
      // transition={{ duration: 0.7, ease: 'easeOut', delay: 2.5 }}
      className="flex items-center gap-4"
    >
      {/* Support button */}
      <BoxButton
        onClick={() => setTab(Tab.HOW_TO_PLAY)}
        color="gray"
        className="size-16"
      >
        <SupportIcon className="size-8" />
      </BoxButton>
      {/* Settings button */}
      <BoxButton onClick={() => {}} color="gray" className="size-16">
        <SettingsIcon className="size-8" />
      </BoxButton>
      {/* Audio */}
      <AudioSelector />
    </motion.div>
  );
}
