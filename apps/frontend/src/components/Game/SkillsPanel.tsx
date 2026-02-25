'use client';

import { Spells } from './Spells';
import { ActionsBg } from './assets/actions-bg';
import { SkillsBg } from './assets/skills-bg';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { spellIdToSpell } from '@/lib/utils';
import type { SpellStats } from '../../../../common/stater/structs';

interface SkillsPanelProps {
  actionInfo?: { movementDone: boolean; spellCastDone: boolean };
}

export function SkillsPanel({ actionInfo }: SkillsPanelProps) {
  const { stater } = useUserInformationStore();

  const skills =
    stater?.state.spellStats
      .map((spell: SpellStats) => {
        const spellData = spellIdToSpell(spell.spellId);
        if (!spellData) return undefined;
        return {
          ...spellData,
          currentCooldown: spell.currentCooldown,
        };
      })
      .filter((spell) => spell !== undefined) ?? [];

  return (
    <div className="relative flex h-28 flex-1 flex-row items-center">
      <ActionsBg className="-ml-14 size-28 shrink-0" actionInfo={actionInfo} />
      <Spells skills={skills} />
      <SkillsBg className="absolute -left-4 top-1/2 -z-10 h-[150%] w-[calc(100%+2rem)] -translate-y-1/2" />
    </div>
  );
}
