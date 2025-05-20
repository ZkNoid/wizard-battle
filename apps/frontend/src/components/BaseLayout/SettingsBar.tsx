"use client";

import { motion } from "motion/react";
import AudioSelector from "../AudioSelector";
import { SettingsIcon } from "./assets/settings-icon";
import { usePathname } from "next/navigation";

export function SettingsBar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <motion.div
      initial={isHomePage ? { opacity: 0, y: 50, scale: 0.9 } : false}
      animate={isHomePage ? { opacity: 1, y: 0, scale: 1 } : false}
      transition={{ duration: 0.7, ease: "easeOut", delay: 2.5 }}
      className="flex items-center gap-4"
    >
      {/* Settings button */}
      <button className="group/button cursor-pointer transition-transform duration-300 hover:scale-105">
        <SettingsIcon className="h-20 w-20" />
      </button>
      {/* Audio */}
      <AudioSelector />
    </motion.div>
  );
}
