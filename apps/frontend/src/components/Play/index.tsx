'use client';

import { useEffect, useState } from 'react';
import { PlaySteps } from '@/lib/enums/PlaySteps';
import { useRouter, useSearchParams } from 'next/navigation';
import { ModeSelect } from './ModeSelect';
import { Navigation } from './Navigation';
import { PlayMode } from '@/lib/enums/PlayMode';
import { BotType } from '@/lib/enums/BotType';
import CharacterSelect from '@/components/CharacterSelect';
import { BotSelect } from './BotSelect';
import { cn, spellIdToSpell } from '@/lib/utils';
import MapEditor from '@/components/MapEditor';
import Matchmaking from './Matchmaking';
import GameResult from '../GameResult';
import { allWizards } from '../../../../common/wizards';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import Header from '../Header';
import Modals from '../Header/Modals';

export default function Play() {
  const router = useRouter();
  const [playStep, setPlayStep] = useState<PlaySteps>(PlaySteps.SELECT_MODE);
  const [playMode, setPlayMode] = useState<PlayMode | undefined>(undefined);
  const [botType, setBotType] = useState<BotType>(BotType.MAGE);
  const searchParams = useSearchParams();

  // Extract rewards from URL params if present (Gold only for now)
  const rewards =
    searchParams.get('gold') && searchParams.get('total')
      ? [
          {
            itemId: 'Gold',
            amount: parseInt(searchParams.get('gold')!),
            total: parseInt(searchParams.get('total')!),
          },
        ]
      : undefined;

  const { stater, setSelectedSkills, setCurrentWizard } =
    useUserInformationStore();

  // Re-runs whenever the URL gains `?tournamentId=`. We then strip the param
  // via router.replace so the next invocation returns early — this avoids a
  // ref-based one-shot guard that would silently drop tournament intent if the
  // user opens TournamentsModal from inside /play and clicks "Find Match"
  // while already mid-flow (the previous bug).
  useEffect(() => {
    const tid = searchParams.get('tournamentId');
    if (!tid) return;
    useTournamentStore.getState().setActiveMatchmakingTournament(tid);
    setPlayMode(PlayMode.PVP);
    setPlayStep(PlaySteps.SELECT_CHARACTER);
    router.replace('/play');
  }, [searchParams, router]);

  // Reset selected skills when wizard changes
  // useEffect(() => {
  //   setSelectedSkills([]);
  // }, [stater?.state.playerId]);

  const noNavigation =
    playStep === PlaySteps.MATCHMAKING ||
    playStep === PlaySteps.LOSE ||
    playStep === PlaySteps.WIN;

  return (
    <main className="relative flex h-screen w-full overflow-hidden">
      <Header />
      <section className="flex h-full w-full flex-col items-center justify-center">
        <div className="flex flex-col gap-2.5">
          {!noNavigation && (
            <Navigation
              playStep={playStep}
              setPlayStep={setPlayStep}
              playMode={playMode}
              className={cn(playStep === PlaySteps.SELECT_CHARACTER && 'pl-25')}
            />
          )}
          {playStep === PlaySteps.SELECT_MODE && (
            <ModeSelect setPlayStep={setPlayStep} setPlayMode={setPlayMode} />
          )}
          {playStep === PlaySteps.SELECT_CHARACTER && (
            <CharacterSelect
              setPlayStep={setPlayStep}
              playMode={playMode}
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
          {playStep === PlaySteps.SELECT_BOT && (
            <BotSelect setPlayStep={setPlayStep} setBotType={setBotType} />
          )}
          {playStep === PlaySteps.SELECT_MAP && <MapEditor />}
          {playStep === PlaySteps.MATCHMAKING && (
            <Matchmaking
              setPlayStep={setPlayStep}
              playMode={playMode ?? PlayMode.PVP}
              botType={botType}
            />
          )}
          {(playStep === PlaySteps.LOSE || playStep === PlaySteps.WIN) && (
            <GameResult
              type={playStep === PlaySteps.LOSE ? 'lose' : 'win'}
              setPlayStep={setPlayStep}
              rewards={rewards}
            />
          )}
        </div>
      </section>
      <Modals />
    </main>
  );
}
