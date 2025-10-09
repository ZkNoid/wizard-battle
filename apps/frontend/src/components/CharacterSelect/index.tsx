'use client';

import { Carousel } from './Carousel';
import type { IWizard, ISkill } from '@/lib/types/IWizard';
import { SkillsBg } from './assets/skills-bg';
import { Button } from '../shared/Button';
import { PlaySteps } from '@/lib/enums/PlaySteps';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { MAX_SELECTED_SKILLS } from '@/lib/constants/wizards';
import { type Wizard } from '../../../../common/wizards';
import { allSpells } from '../../../../common/stater/spells';
import type { SpellStats } from '../../../../common/stater/structs';

export default function CharacterSelect({
  setPlayStep,
  currentWizard,
  setCurrentWizard,
  selectedSkills,
  setSelectedSkills,
}: {
  setPlayStep: (playStep: PlaySteps) => void;
  currentWizard: Wizard;
  setCurrentWizard: (wizard: Wizard) => void;
  selectedSkills: SpellStats[];
  setSelectedSkills: (skills: SpellStats[]) => void;
}) {
  const currentWizardSpells = allSpells.filter(
    (spell) => spell.wizardId === currentWizard.id
  );

  const selectedSkillsLength = selectedSkills.filter(
    (s) => s.spellId.toString() !== '0'
  ).length;

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
          {currentWizardSpells.map((spell) => (
            <div
              key={spell.id.toString()}
              className="size-22.5 relative flex cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-110"
            >
              <div className="relative z-10 size-full">
                <Image
                  className={cn(
                    'size-full border-4 border-black',
                    selectedSkills.some(
                      (s) => s.spellId.toString() === spell.id.toString()
                    ) && 'scale-110',
                    !selectedSkills.some(
                      (s) => s.spellId.toString() === spell.id.toString()
                    ) &&
                      selectedSkillsLength >= MAX_SELECTED_SKILLS &&
                      'hover:scale-none cursor-not-allowed opacity-50'
                  )}
                  src={spell.image ?? ''}
                  alt={'skill'}
                  width={22.5}
                  height={22.5}
                  onClick={() => {
                    if (
                      selectedSkills.some(
                        (s) => s.spellId.toString() === spell.id.toString()
                      )
                    ) {
                      setSelectedSkills(
                        selectedSkills.filter(
                          (s) => s.spellId.toString() !== spell.id.toString()
                        )
                      );
                    } else {
                      if (selectedSkillsLength < MAX_SELECTED_SKILLS) {
                        setSelectedSkills([
                          ...selectedSkills,
                          spell.defaultValue,
                        ]);
                      }
                    }
                  }}
                />
              </div>
            </div>
          ))}
          {/* Empty skills */}
          {Array.from({ length: 4 - (currentWizardSpells.length % 4) }).map(
            (_, index) => (
              <Image
                key={index}
                className="w-22.5 h-22.5 border-4 border-black"
                src={'/wizards/skills/empty.png'}
                alt={'empty skill'}
                width={90}
                height={90}
              />
            )
          )}
        </div>
        <div className="mt-auto flex w-full items-center justify-center">
          <Button
            variant="gray"
            className="w-106 h-15"
            // disabled={selectedSkillsLength != 4}
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
