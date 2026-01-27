"use client";

import { useState } from "react";
import { Background } from "./assets/background";
import { Navigation } from "./Navigation";
import { Cross } from "./assets/cross";
import { Tab } from "@/lib/enums/Tab";
import { motion } from "motion/react";
import { Page1 } from "./Page1";
import { Page2 } from "./Page2";
import { Page3 } from "./Page3";
import { Page4 } from "./Page4";
import { useModalSound, useClickSound, useHoverSound } from "@/lib/hooks/useAudio";

export default function HowToPlay({ setTab }: { setTab: (tab: Tab) => void }) {
  // Play modal sounds
  useModalSound();
  const playClickSound = useClickSound();
  const playHoverSound = useHoverSound();

  const [page, setPage] = useState<number>(1);
  return (
    <div className="w-291 h-172 relative flex flex-col items-center justify-center">
      <div className="py-12.5 px-37 flex h-full w-full flex-col">
        {/* Title */}
        <span className="font-pixel text-main-gray text-center text-3xl font-bold">
          Game guide
        </span>
        <span className="font-pixel text-main-gray mt-5 text-center text-base">
          Welcome to Wizard Battle, a turn-based strategy game where tactics and
          magical prowess determine the victory!
        </span>
        {page === 1 && <Page1 />}
        {page === 2 && <Page2 />}
        {page === 3 && <Page3 />}
        {page === 4 && <Page4 />}
      </div>
      <div className="pt-12.5 pr-12.5 absolute right-0 top-0">
        <motion.button
          onClick={() => {
            playClickSound();
            setTab(Tab.HOME);
          }}
          onMouseEnter={playHoverSound}
          className="flex cursor-pointer flex-col items-center justify-center"
          whileHover={{ rotate: 90 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <Cross className="h-9 w-9" />
        </motion.button>
      </div>
      <Background className="w-291 h-172 absolute left-0 top-0 -z-[1]" />
      <Navigation page={page} setPage={setPage} maxPages={4} />
    </div>
  );
}
