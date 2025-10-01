'use client';

import { motion } from 'motion/react';
import BoxButton from '../shared/BoxButton';
import { DiscordIcon } from './assets/discord-icon';
import { XIcon } from './assets/x-icon';
import { TelegramIcon } from './assets/telegram-icon';
import { useRouter } from 'next/navigation';
import { SOCIALS } from '@/lib/constants/socials';

export function SocialLinks() {
  const router = useRouter();
  return (
    <motion.div
      // initial={{ opacity: 0, y: 50, scale: 0.9 }}
      // animate={{ opacity: 1, y: 0, scale: 1 }}
      // transition={{ duration: 0.7, ease: 'easeOut', delay: 2.5 }}
      className="flex items-center justify-end gap-4"
    >
      <div className="flex items-center gap-5">
        <BoxButton
          onClick={() => {
            router.push(SOCIALS.twitter);
          }}
          className="size-16"
        >
          <XIcon className="size-8" />
        </BoxButton>
        <BoxButton
          onClick={() => {
            router.push(SOCIALS.telegram);
          }}
          className="size-16"
        >
          <TelegramIcon className="size-8" />
        </BoxButton>
        <BoxButton
          onClick={() => {
            router.push(SOCIALS.discord);
          }}
          className="size-16"
        >
          <DiscordIcon className="size-8" />
        </BoxButton>
      </div>
    </motion.div>
  );
}
