import Image from 'next/image';
import { useState } from 'react';
import { useMinaAppkit } from 'mina-appkit';
import { Button } from '../shared/Button';
import { ModeBg } from './assets/mode-bg';
import { PveIcon } from './assets/pve-icon';
import { PvpIcon } from './assets/pvp-icon';
import { PlaySteps } from '@/lib/enums/PlaySteps';
import { PlayMode } from '@/lib/enums/PlayMode';
import { TOURNAMENT_MATCHMAKING_STORAGE_KEY } from '@/lib/constants/tournament-matchmaking';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import type { ITournament } from '@/lib/types/ITournament';

function findUserActiveTournament(
  tournaments: ITournament[]
): ITournament | undefined {
  return tournaments.find(
    (t) =>
      t.userStatus !== 'not-joined' &&
      (t.status === 'active' || t.status === 'upcoming')
  );
}

export function ModeSelect({
  setPlayStep,
  setPlayMode,
}: {
  setPlayStep: (playStep: PlaySteps) => void;
  setPlayMode: (playMode: PlayMode) => void;
}) {
  const { address } = useMinaAppkit();
  const { setIsTournamentsModalOpen } = useMiscellaneousSessionStore();
  const [isTournamentLoading, setIsTournamentLoading] = useState(false);

  const handleTournamentClick = async () => {
    if (isTournamentLoading) return;
    setIsTournamentLoading(true);
    try {
      await useTournamentStore.getState().loadTournaments(address ?? undefined);
      const joined = findUserActiveTournament(
        useTournamentStore.getState().tournaments
      );
      if (joined) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(TOURNAMENT_MATCHMAKING_STORAGE_KEY, joined.id);
        }
        setPlayMode(PlayMode.PVP);
        setPlayStep(PlaySteps.SELECT_CHARACTER);
      } else {
        setIsTournamentsModalOpen(true);
      }
    } finally {
      setIsTournamentLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      {/* Pvp */}
      <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
        <PvpIcon className="w-66 h-54" />
        <span className="font-pixel text-main-gray mt-7 text-3xl">PvP</span>
        <span className="font-pixel-klein text-main-gray mt-4 text-center text-xl leading-6">
          Engage in duels against other players. Show all your magical prowess
          and strategic skills to overpower your opponent and earn experience
          for each win.
        </span>
        <div className="mt-auto flex w-full items-center justify-center">
          <Button
            variant="gray"
            className="w-106 h-15"
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem(TOURNAMENT_MATCHMAKING_STORAGE_KEY);
              }
              setPlayStep(PlaySteps.SELECT_CHARACTER);
              setPlayMode(PlayMode.PVP);
            }}
            enableHoverSound
            enableClickSound
            isLong={true}
          >
            Start
          </Button>
        </div>
        <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
      {/* Pve */}
      <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
        <PveIcon className="w-71 h-52" />
        <span className="font-pixel text-main-gray mt-7 text-3xl">PvE</span>
        <span className="font-pixel-klein text-main-gray mt-4 text-center text-xl leading-6">
          Battle against a computer enemy to hone your skills in the Wizard
          training grounds.
        </span>
        <div className="mt-auto flex w-full items-center justify-center">
          <Button
            variant="gray"
            className="w-106 h-15"
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem(TOURNAMENT_MATCHMAKING_STORAGE_KEY);
              }
              setPlayStep(PlaySteps.SELECT_CHARACTER);
              setPlayMode(PlayMode.PVE);
            }}
            enableHoverSound
            enableClickSound
            isLong={true}
          >
            Start
          </Button>
        </div>
        <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
      {/* Tournament */}
      <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
        <Image
          src="/tournaments/TournamentChoice.png"
          alt="tournament"
          width={216}
          height={216}
          quality={100}
          unoptimized
          className="pixel-art h-54 w-54"
        />
        <span className="font-pixel text-main-gray mt-7 text-3xl">
          Tournament
        </span>
        <span className="font-pixel-klein text-main-gray mt-4 text-center text-xl leading-6">
          Compete in active tournaments for prize pools and glory. Resume your
          ongoing tournament or browse upcoming ones to join.
        </span>
        <div className="mt-auto flex w-full items-center justify-center">
          <Button
            variant="gray"
            className="w-106 h-15"
            onClick={() => void handleTournamentClick()}
            enableHoverSound
            enableClickSound
            isLong={true}
          >
            {isTournamentLoading ? 'Loading…' : 'Start'}
          </Button>
        </div>
        <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
    </div>
  );
}
