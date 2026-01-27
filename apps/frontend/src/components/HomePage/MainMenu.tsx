'use client';

import { motion } from 'motion/react';
import { Button } from '../shared/Button';
import { ScrollBg } from './assets/scroll-bg';
import { Tab } from '@/lib/enums/Tab';
import { useRouter } from 'next/navigation';
import { useMinaAppkit } from 'mina-appkit';

export function MainMenu({ setTab }: { setTab: (tab: Tab) => void }) {
  const router = useRouter();
  const { address, triggerWallet } = useMinaAppkit();

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 0 }}
        animate={{
          opacity: [0, 1, 1],
          y: [0, 0, -120],
        }}
        transition={{
          duration: 2,
          times: [0, 0.5, 1],
          ease: 'easeOut',
        }}
        className="font-pixel text-5xl font-bold text-white"
      >
        Wizard Battle
      </motion.h1>

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 1.8 }}
        className="relative w-full"
      >
        <div className="ml-2.5 flex flex-col items-center justify-center gap-2.5 p-4">
          <Button
            variant="gray"
            text="Play"
            onClick={() => {
              if (!address) {
                triggerWallet();
                return;
              }

              router.push('/play');
            }}
            className="w-88.5 h-15 text-2xl font-bold"
            enableHoverSound
            enableClickSound
          />
          <Button
            variant="gray"
            text="Tournaments"
            // onClick={() => setTab(Tab.TOURNAMENTS)}
            onClick={() => {
              alert('Coming soon..');
              return;
            }}
            className="w-88.5 h-15 text-2xl font-bold"
            enableHoverSound
            enableClickSound
          />
          <Button
            variant="gray"
            text="Customization"
            // onClick={() => setTab(Tab.CUSTOMIZATION)}
            onClick={() => {
              alert('Coming soon...');
              return;
            }}
            className="w-88.5 h-15 text-2xl font-bold"
            enableHoverSound
            enableClickSound
          />
          <Button
            variant="gray"
            text="How to play"
            onClick={() => setTab(Tab.HOW_TO_PLAY)}
            className="w-88.5 h-15 text-2xl font-bold"
            enableHoverSound
            enableClickSound
          />
          <Button
            variant="gray"
            text="Support"
            onClick={() => setTab(Tab.SUPPORT)}
            className="w-88.5 h-15 text-2xl font-bold"
            enableHoverSound
            enableClickSound
          />
        </div>
        {/* Background */}
        <div className="absolute inset-0 flex h-full w-full items-center justify-center">
          <ScrollBg className="w-143.5 h-165.5" />
        </div>
      </motion.div>
    </div>
  );
}
