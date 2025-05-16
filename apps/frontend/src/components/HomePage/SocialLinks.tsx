"use client";

import { motion } from "motion/react";
import BoxButton from "../shared/BoxButton";
import { DiscordIcon } from "./assets/discord-icon";
import { XIcon } from "./assets/x-icon";
import { TelegramIcon } from "./assets/telegram-icon";
import { useRouter } from "next/navigation";
import { SOCIALS } from "@/lib/constants/socials";

export function SocialLinks() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 2.5 }}
      className="ml-auto flex items-center gap-4"
    >
      <div className="flex items-center gap-5">
        <BoxButton
          onClick={() => {
            router.push(SOCIALS.twitter);
          }}
          className="h-20 w-20"
        >
          <XIcon className="h-10 w-10" />
        </BoxButton>
        <BoxButton
          onClick={() => {
            router.push(SOCIALS.telegram);
          }}
          className="h-20 w-20"
        >
          <TelegramIcon className="h-10 w-10" />
        </BoxButton>
        <BoxButton
          onClick={() => {
            router.push(SOCIALS.discord);
          }}
          className="h-20 w-20"
        >
          <DiscordIcon className="h-10 w-10" />
        </BoxButton>
      </div>
    </motion.div>
  );
}
