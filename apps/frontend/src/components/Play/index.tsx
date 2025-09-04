'use client';

import { useEffect, useState } from 'react';
import { PlaySteps } from '@/lib/enums/PlaySteps';
import { ModeSelect } from './ModeSelect';
import { Navigation } from './Navigation';
import { PlayMode } from '@/lib/enums/PlayMode';
import CharacterSelect from '@/components/CharacterSelect';
import { cn, spellIdToSpell } from '@/lib/utils';
import MapEditor from '@/components/MapEditor';
import Matchmaking from './Matchmaking';
import GameResult from '../GameResult';
import { allWizards } from '../../../../common/wizards';
import { useUserInformationStore } from '@/lib/store/userInformationStore';

export default function Play() {
  const [playStep, setPlayStep] = useState<PlaySteps>(PlaySteps.SELECT_MODE);
  const [playMode, setPlayMode] = useState<PlayMode | undefined>(undefined);

  const { stater, setSelectedSkills, setCurrentWizard } =
    useUserInformationStore();

  console.log(allWizards.map((w) => w.id.toString()));
  console.log(stater?.state.wizardId.toString());

  // Reset selected skills when wizard changes
  // useEffect(() => {
  //   setSelectedSkills([]);
  // }, [stater?.state.playerId]);

  const noNavigation =
    playStep === PlaySteps.MATCHMAKING ||
    playStep === PlaySteps.LOSE ||
    playStep === PlaySteps.WIN;

  return (
    <section className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex flex-col gap-2.5">
        {!noNavigation && (
          <Navigation
            playStep={playStep}
            setPlayStep={setPlayStep}
            className={cn(playStep === PlaySteps.SELECT_CHARACTER && 'pl-25')}
          />
        )}
        {playStep === PlaySteps.SELECT_MODE && (
          <ModeSelect setPlayStep={setPlayStep} setPlayMode={setPlayMode} />
        )}
        {playStep === PlaySteps.SELECT_CHARACTER && (
          <CharacterSelect
            setPlayStep={setPlayStep}
            currentWizard={
              allWizards.find(
                (wizard) =>
                  wizard.id.toString() === stater?.state.wizardId.toString()
              )!
            }
            setCurrentWizard={(wizard) => setCurrentWizard(wizard.id)}
            selectedSkills={stater?.state.spellStats ?? []}
            setSelectedSkills={setSelectedSkills}
          />
        )}
        {playStep === PlaySteps.SELECT_MAP && <MapEditor />}
        {playStep === PlaySteps.MATCHMAKING && (
          <Matchmaking
            setPlayStep={setPlayStep}
            playMode={playMode ?? PlayMode.PVP}
          />
        )}
        {(playStep === PlaySteps.LOSE || playStep === PlaySteps.WIN) && (
          <GameResult
            type={playStep === PlaySteps.LOSE ? 'lose' : 'win'}
            setPlayStep={setPlayStep}
          />
        )}
      </div>
    </section>
  );
}
