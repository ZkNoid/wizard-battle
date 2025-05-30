"use client";

import background from "../../../public/background.svg";
import winBackground from "../../../public/winBackground.svg";
import loseBackground from "../../../public/loseBackground.svg";
import Image from "next/image";
import Wallet from "@/components/Wallet";
import { SettingsBar } from "./SettingsBar";
import { useBackgroundImageStore } from "@/lib/store/backgroundImageStore";
import { useLayoutEffect, useState } from "react";

export default function BaseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { backgroundImage } = useBackgroundImageStore();
  const [currentBackground, setCurrentBackground] =
    useState<string>(backgroundImage);

  useLayoutEffect(() => {
    if (backgroundImage !== currentBackground) {
      setCurrentBackground(backgroundImage);
    }
  }, [backgroundImage]);

  return (
    <main className="relative flex h-screen w-screen">
      {/* Left Bar */}
      <div className="top-12.5 absolute left-20 z-10 w-[20%]">
        <SettingsBar />
      </div>

      {/* Right Bar */}
      <div className="top-12.5 absolute right-20 z-10 w-[20%]">
        <Wallet />
      </div>

      {/* Main Content */}
      {children}

      {/* Background */}
      <div className="absolute inset-0 -z-50 h-full w-full">
        <Image
          src={
            currentBackground === "win"
              ? winBackground
              : currentBackground === "lose"
                ? loseBackground
                : background
          }
          alt="background"
          className="h-full w-full object-cover object-center"
        />
      </div>
    </main>
  );
}
