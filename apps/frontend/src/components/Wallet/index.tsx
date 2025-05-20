"use client";

import { useState } from "react";
import { Button } from "../shared/Button";
import { motion } from "motion/react";
import { WalletBg } from "./assets/wallet-bg";
import { LevelBg } from "./assets/level-bg";
import BoxButton from "../shared/BoxButton";
import { DisconnectIcon } from "./assets/disconnect-icon";
import type { IUser } from "@/lib/types/IUser";
import { usePathname } from "next/navigation";

export default function Wallet() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const user: IUser = {
    name: "John Doe",
    level: 99999,
    address: "0x1234567890123456789012345678901234567890",
    xp: 100,
  };
  return (
    <motion.div
      initial={isHomePage ? { opacity: 0, y: 50, scale: 0.9 } : false}
      animate={isHomePage ? { opacity: 1, y: 0, scale: 1 } : false}
      transition={{ duration: 0.7, ease: "easeOut", delay: 2.5 }}
      className="w-full"
    >
      <>
        {isConnected ? (
          <div className="h-32.5 p-6.5 relative flex w-full flex-row items-center justify-between gap-8">
            <div className="flex w-full flex-col gap-1">
              {/* Username */}
              <span className="font-pixel text-main-gray text-2xl font-bold">
                {user.name}
              </span>
              {/* Level */}
              <div className="relative flex h-full w-full">
                <div className="z-[1] ml-2 mt-2 flex h-full w-full items-center justify-start">
                  <span className="font-pixel text-main-gray text-[0.417vw] font-bold">
                    Lvl. {user.level}
                  </span>
                </div>
                <LevelBg className="h-6.5 absolute inset-0 z-0 w-full" />
              </div>
            </div>
            {/* Disconnect */}
            <div className="flex min-w-20 items-center justify-end">
              <BoxButton
                onClick={() => {
                  setIsConnected(false);
                }}
                className="h-15 w-15"
              >
                <DisconnectIcon className="h-9 w-9" />
              </BoxButton>
            </div>
            {/* Background */}
            <WalletBg className="absolute inset-0 -z-[1] ml-auto h-full w-full" />
          </div>
        ) : (
          <Button
            variant="gray"
            text="Connect Wallet"
            onClick={() => {
              setIsConnected(!isConnected);
            }}
            className="w-70 h-15 ml-auto text-base font-bold"
          />
        )}
      </>
    </motion.div>
  );
}
