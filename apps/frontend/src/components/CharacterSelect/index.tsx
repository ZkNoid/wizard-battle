"use client";

import { Carousel } from "./Carousel";
import type { IWizard, ISkill } from "@/lib/types/IWizard";
import { SkillsBg } from "./assets/skills-bg";
import { Button } from "../shared/Button";
import { PlaySteps } from "@/lib/enums/PlaySteps";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MAX_SELECTED_SKILLS } from "@/lib/constants/wizards";

export default function CharacterSelect({
  setPlayStep,
  currentWizard,
  setCurrentWizard,
  selectedSkills,
  setSelectedSkills,
}: {
  setPlayStep: (playStep: PlaySteps) => void;
  currentWizard: IWizard;
  setCurrentWizard: (wizard: IWizard) => void;
  selectedSkills: ISkill[];
  setSelectedSkills: (skills: ISkill[]) => void;
}) {
  return (
    <div className="gap-15 flex">
      <Carousel
        currentWizard={currentWizard}
        setCurrentWizard={setCurrentWizard}
      />
      <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
        <span className="font-pixel text-main-gray mt-7 text-3xl">
          Choose Skills
        </span>
        <span className="font-pixel text-main-gray mt-4 text-center text-xs">
          Invisibility (passive) - The Arcane Sorcerer can blend seamlessly into
          their surroundings, becoming completely invisible to enemies.
        </span>
        {/* Skills */}
        <div className="mt-5 grid grid-cols-4 gap-5">
          {currentWizard.skills.map((skill) => (
            <Image
              key={skill.id}
              className={cn(
                "w-22.5 h-22.5 cursor-pointer transition-transform duration-300 hover:scale-110",
                selectedSkills.includes(skill) && "scale-110",
                !selectedSkills.includes(skill) &&
                  selectedSkills.length >= MAX_SELECTED_SKILLS &&
                  "hover:scale-none cursor-not-allowed opacity-50",
              )}
              src={skill.imageURL}
              alt={"skill"}
              width={22.5}
              height={22.5}
              onClick={() => {
                if (selectedSkills.includes(skill)) {
                  setSelectedSkills(selectedSkills.filter((s) => s !== skill));
                } else {
                  if (selectedSkills.length < MAX_SELECTED_SKILLS) {
                    setSelectedSkills([...selectedSkills, skill]);
                  }
                }
              }}
            />
          ))}
          {/* Empty skills */}
          {Array.from({ length: 4 - (currentWizard.skills.length % 4) }).map(
            (_, index) => (
              <Image
                key={index}
                className="w-22.5 h-22.5"
                src={"/wizards/skills/empty.svg"}
                alt={"empty skill"}
                width={90}
                height={90}
              />
            ),
          )}
        </div>
        <div className="mt-auto flex w-full items-center justify-center">
          <Button
            variant="gray"
            className="w-106 h-15"
            onClick={() => {
              setPlayStep(PlaySteps.SELECT_MAP);
            }}
          >
            Apply
          </Button>
        </div>
        <SkillsBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
    </div>
  );
}
