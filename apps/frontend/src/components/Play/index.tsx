"use client";

import { useEffect, useState } from "react";
import { PlaySteps } from "@/lib/enums/PlaySteps";
import { ModeSelect } from "./ModeSelect";
import { Navigation } from "./Navigation";
import { PlayMode } from "@/lib/enums/PlayMode";
import CharacterSelect from "@/components/CharacterSelect";
import type { IWizard, ISkill } from "@/lib/types/IWizard";
import { wizards } from "@/lib/constants/DEBUG_wizards";
import { cn } from "@/lib/utils";
import MapEditor from "@/components/MapEditor";
import Matchmaking from "./Matchmaking";

export default function Play() {
  const [playStep, setPlayStep] = useState<PlaySteps>(PlaySteps.SELECT_MODE);
  const [playMode, setPlayMode] = useState<PlayMode | undefined>(undefined);
  const [currentWizard, setCurrentWizard] = useState<IWizard>(wizards[0]!);
  const [selectedSkills, setSelectedSkills] = useState<ISkill[]>([]);

  // Reset selected skills when wizard changes
  useEffect(() => {
    setSelectedSkills([]);
  }, [currentWizard]);

  return (
    <section className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex flex-col gap-5">
        {playStep !== PlaySteps.MATCHMAKING && (
          <Navigation
            playStep={playStep}
            setPlayStep={setPlayStep}
            className={cn(playStep === PlaySteps.SELECT_CHARACTER && "pl-25")}
          />
        )}
        {playStep === PlaySteps.SELECT_MODE && (
          <ModeSelect setPlayStep={setPlayStep} setPlayMode={setPlayMode} />
        )}
        {playStep === PlaySteps.SELECT_CHARACTER && (
          <CharacterSelect
            setPlayStep={setPlayStep}
            currentWizard={currentWizard}
            setCurrentWizard={setCurrentWizard}
            selectedSkills={selectedSkills}
            setSelectedSkills={setSelectedSkills}
          />
        )}
        {playStep === PlaySteps.SELECT_MAP && <MapEditor />}
        {playStep === PlaySteps.MATCHMAKING && (
          <Matchmaking setPlayStep={setPlayStep} />
        )}
      </div>
    </section>
  );
}
