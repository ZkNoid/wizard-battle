'use client';

import { type ReactNode } from 'react';
import { Users } from './Users';
import { TilemapBg } from './assets/tilemap-bg';
import { BottomPanel } from './BottomPanel';
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

      <div className="col-span-6 row-span-1 row-start-6">
        <BottomPanel actionInfo={actionInfo} preparedActions={preparedActions} />
      </div>
    </div>
  );
}
