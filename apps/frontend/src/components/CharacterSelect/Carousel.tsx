"use client";

import { ArrowLeft } from "./assets/arrow-left";
import { AvatarBg } from "./assets/avatar-bg";
import Image from "next/image";
import { wizards } from "@/lib/constants/DEBUG_wizards";
import type { IWizard } from "@/lib/types/IWizard";

export function Carousel({
  currentWizard,
  setCurrentWizard,
}: {
  currentWizard: IWizard;
  setCurrentWizard: (wizard: IWizard) => void;
}) {
  return (
    <div className="flex items-center gap-5">
      {/* Previous button */}
      <button
        onClick={() => {
          const currentIndex = wizards.findIndex(
            (w) => w.id === currentWizard.id,
          );
          const previousWizard = wizards[currentIndex - 1];
          if (previousWizard) setCurrentWizard(previousWizard);
        }}
        className="cursor-pointer transition-transform duration-300 hover:scale-110"
      >
        <ArrowLeft className="h-22.5 w-20" />
      </button>
      {/* Wizard image */}
      <div className="w-106 h-143 relative overflow-hidden">
        <Image
          src={currentWizard.imageURL}
          alt={"baseWizard"}
          fill
          className="h-full w-full p-6"
        />
        <AvatarBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
      {/* Next button */}
      <button
        onClick={() => {
          const currentIndex = wizards.findIndex(
            (w) => w.id === currentWizard.id,
          );
          const nextWizard = wizards[currentIndex + 1];
          if (nextWizard) setCurrentWizard(nextWizard);
        }}
        className="cursor-pointer transition-transform duration-300 hover:scale-110"
      >
        <ArrowLeft className="h-22.5 w-20 rotate-180" />
      </button>
    </div>
  );
}
