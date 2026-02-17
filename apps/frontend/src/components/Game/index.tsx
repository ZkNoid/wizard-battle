'use client';

import { type ReactNode } from 'react';
import { Spells } from './Spells';
import { Button } from '../shared/Button';
import BoxButton from '../shared/BoxButton';
import { Clock } from './Clock';
import { Users } from './Users';
import { useRouter } from 'next/navigation';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import { spellIdToSpell } from '@/lib/utils';
import { TilemapBg } from './assets/tilemap-bg';
import { QuestionmarkIcon } from './assets/questionmark-icon';
import { SkillsBg } from './assets/skills-bg';
import { ActionsBg } from './assets/actions-bg';
import type { SpellStats } from '../../../../common/stater/structs';
import Image from 'next/image';
import type { IUserAction } from 'node_modules/@wizard-battle/common/types/gameplay.types';

export default function Game({
  children,
  actionInfo,
  preparedActions,
}: {
  children: [ReactNode, ReactNode];
  actionInfo?: { movementDone: boolean; spellCastDone: boolean };
  preparedActions?: IUserAction[];
}) {
  const router = useRouter();
  const { stater } = useUserInformationStore();
  const { gamePhaseManager } = useUserInformationStore();
  const { setIsQuickGuideModalOpen } = useMiscellaneousSessionStore();

  return (
    <div className="px-57 grid size-full flex-grow grid-cols-6 grid-rows-6 gap-5 pt-20">
      <Users />
      <div className="size-150 relative col-span-3 col-start-1 row-span-4 p-5">
        {children[0]}
        <TilemapBg className="-z-1 absolute inset-0 size-full" />
      </div>
      <div className="size-150 relative col-span-3 col-start-4 row-span-4 p-5">
        {children[1]}
        <TilemapBg className="-z-1 absolute inset-0 size-full" />
      </div>

      <div className="col-span-6 row-span-1 row-start-6 flex flex-row items-center gap-5">
        <div className="w-65 mr-5 flex h-28 flex-row items-end gap-2.5">
          <Button
            variant="blue"
            className="h-16 w-40"
            onClick={() => {
              const playerId =
                typeof window !== 'undefined'
                  ? window.sessionStorage.getItem('playerId') || ''
                  : '';
              gamePhaseManager?.surrender(playerId);
              // router.push('/');
            }}
            text="Give up"
          />
          <BoxButton
            color="gray"
            className="size-14"
            onClick={() => {
              setIsQuickGuideModalOpen(true);
            }}
          >
            <Image
              src={'/icons/question.png'}
              width={18}
              height={27}
              quality={100}
              unoptimized={true}
              alt="questionmark"
              className="w-4.5 h-7"
            />
          </BoxButton>
        </div>
        <div className="flex h-28 flex-row items-center">
          <ActionsBg
            className="size-28"
            actionInfo={actionInfo}
          />
          <div className="relative flex-1">
            <Spells
              // DEBUG FOR TESTING
              // skills={Array.from({ length: 5 }).map((_, idx) => ({
              //   id: idx + 1,
              //   name: `Skill ${idx + 1}`,
              //   description: `Random skill description ${idx + 1}`,
              //   image: `/wizards/skills/heal.svg`,
              //   manaCost: Math.floor(Math.random() * 10) + 1,
              //   cooldown: Math.floor(Math.random() * 5) + 1,
              //   currentCooldown: BigInt(Math.floor(Math.random() * 5)),
              // }))}
              skills={
                stater?.state.spellStats
                  .map((spell: SpellStats) => {
                    const spellData = spellIdToSpell(spell.spellId);
                    if (!spellData) return undefined;
                    return {
                      ...spellData,
                      currentCooldown: spell.currentCooldown,
                    };
                  })
                  .filter((spell) => spell !== undefined) ?? []
              }
            />
            <SkillsBg className="absolute top-1/2 -translate-y-1/2 left-0 right-0 -z-10 h-[150%]" />
          </div>
        </div>
        <div className="flex h-28 flex-row items-end gap-2.5">
          <Clock />
          <Button
            variant="gray"
            className="h-28 w-40"
            onClick={() => {
              gamePhaseManager?.submitPlayerActions({
                actions: preparedActions ?? [],
                signature: 'test_signature',
              });
            }}
            text="End turn"
          />
          <BoxButton className="size-14" onClick={() => {}} disabled={true}>
            <span className="text-main-gray text-sm">...</span>
          </BoxButton>
        </div>
      </div>
    </div>
  );
}
