'use client';

import type { ReactNode } from 'react';
import { Spells } from './Spells';
import { Button } from '../shared/Button';
import BoxButton from '../shared/BoxButton';
import { HelpIcon } from './assets/help-icon';
import { Clock } from './Clock';
import { Users } from './Users';
import { useRouter } from 'next/navigation';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { spellIdToSpell } from '@/lib/utils';
import type { GamePhase } from '../../../../common/types/gameplay.types';
import { useEffect, useState } from 'react';

export default function Game({
  children,
}: {
  children: [ReactNode, ReactNode];
}) {
  const router = useRouter();
  const { stater, gamePhaseManager } = useUserInformationStore();
  const [currentPhase, setCurrentPhase] = useState<GamePhase | null>(null);

  // gamePhaseManager?.onNewTurn();

  // useEffect(() => {
  //   if (gamePhaseManager) {
  //     setCurrentPhase(gamePhaseManager.onNewTurn());
  //   }
  // }, [gamePhaseManager]);

  return (
    <div className="flex h-full w-full flex-grow flex-col pt-40">
      <div className="flex h-full w-full flex-col">
        {/* Top bar */}
        <div className="h-1/5">
          <Users />
        </div>

        {/* Game area */}
        <div className="px-57 grid h-full w-full grid-cols-8">
          <div className="col-span-3">{children[0]}</div>
          <div className="col-span-2 mb-auto flex flex-col justify-center gap-5">
            <Clock />
            <span className="text-center text-2xl font-bold">
              CURRENT PHASE: {currentPhase?.toString() ?? 'No phase'}
            </span>
          </div>

          <div className="col-span-3">{children[1]}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="z-[1] grid w-full grid-cols-11 items-end justify-center gap-5">
        <Button
          variant="blue"
          text="Give up"
          onClick={() => {
            router.push('/');
          }}
          className="h-15 w-89 col-span-3 ml-auto"
        />
        <Spells
          skills={
            stater?.state.spellStats
              .map((spell) => spellIdToSpell(spell.spellId))
              .filter((spell) => spell !== undefined) ?? []
          }
          className="col-span-5 col-start-4"
        />
        <BoxButton onClick={() => {}} className="col-span-3 mr-auto h-20 w-20">
          <HelpIcon className="h-12.5 w-7.5" />
        </BoxButton>
      </div>
    </div>
  );
}
