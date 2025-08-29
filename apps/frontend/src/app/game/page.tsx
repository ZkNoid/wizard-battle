'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import type { IRefPhaserGame } from '@/PhaserGame';
import Game from '@/components/Game';
import { api } from '@/trpc/react';
import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
import { useMinaAppkit } from 'mina-appkit';
import { useRouter } from 'next/navigation';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { allSpells, SpellId } from '../../../../common/stater/spells';
import { useInGameStore } from '@/lib/store/inGameStore';
import type {
  IUserAction,
  IUserActions,
} from '../../../../common/types/gameplay.types';
import { Position } from '../../../../common/stater/structs';
import { Int64 } from 'o1js';

const PhaserGame = dynamic(
  () => import('@/PhaserGame').then((mod) => mod.PhaserGame),
  {
    ssr: false,
    loading: () => <FullscreenLoader />,
  }
);

export default function GamePage() {
  //  References to the PhaserGame component (game and scene are exposed)
  const { socket, stater, opponentState, gamePhaseManager } =
    useUserInformationStore();
  const { pickedSpellId } = useInGameStore();
  const phaserRefAlly = useRef<IRefPhaserGame | null>(null);
  const phaserRefEnemy = useRef<IRefPhaserGame | null>(null);
  const router = useRouter();
  const { address } = useMinaAppkit();

  const { data: tilemapData } = api.tilemap.getTilemap.useQuery(
    {
      userAddress: address ?? '',
      slot: '1',
    },
    {
      enabled: !!address,
    }
  );

  // Event emitted from the PhaserGame component
  const currentScene = (scene: Phaser.Scene) => {
    console.log('Scene changed:', scene);
  };

  // Redirect to home if no address is found
  useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address]);

  const handleEnemyMapClick = (x: number, y: number) => {
    console.log('Enemy map clicked: ', x, y);

    if (!pickedSpellId) {
      console.log('No spell picked');
      return;
    }

    const spell = allSpells.find(
      (spell) => spell.id.toString() === pickedSpellId.toString()
    );

    if (!spell) {
      console.log('Spell not found');
      return;
    }

    let cast = spell.cast(stater?.state!, opponentState!.playerId, {
      x,
      y,
    });
    console.log('Cast: ', cast);

    if (!opponentState?.playerId) {
      console.log('Opponent state not found');
      return;
    }

    const userAction: IUserAction = {
      playerId: opponentState!.playerId.toString(),
      spellId: spell.id.toString(),
      spellCastInfo: cast.additionalData,
    };

    const userActions: IUserActions = {
      actions: [userAction],
      signature: '',
    };

    gamePhaseManager?.submitPlayerActions(userActions);
  };

  const handleAllyMapClick = (x: number, y: number) => {
    console.log('Ally map clicked: ', x, y);

    let spellId = pickedSpellId;

    if (!pickedSpellId) {
      spellId = SpellId['Move'] ?? null;
    }

    if (!spellId) {
      console.log('No move spell id ');
      return;
    }

    const spell = allSpells.find(
      (spell) => spell.id.toString() === spellId.toString()
    );

    if (!spell) {
      console.log('Spell not found');
      return;
    }

    let cast = spell.cast(
      stater?.state!,
      opponentState!.playerId,
      new Position({
        x: Int64.from(x),
        y: Int64.from(y),
      })
    );
    console.log('Cast: ', cast);

    if (!stater?.state) {
      console.log('Stater state not found');
      return;
    }

    const userAction: IUserAction = {
      playerId: stater.state.playerId.toString(),
      spellId: spell.id.toString(),
      spellCastInfo: cast.additionalData,
    };

    const userActions: IUserActions = {
      actions: [userAction],
      signature: '',
    };

    gamePhaseManager?.submitPlayerActions(userActions);
  };

  return (
    <Game>
      <PhaserGame
        ref={phaserRefAlly}
        currentActiveScene={currentScene}
        container="game-container-ally"
        isEnemy={false}
        tilemapData={stater?.state?.map.map((tile) => +tile) || []}
        onMapClick={handleAllyMapClick}
      />
      <PhaserGame
        ref={phaserRefEnemy}
        currentActiveScene={currentScene}
        container="game-container-enemy"
        isEnemy={true}
        tilemapData={opponentState?.map.map((tile) => +tile) || []}
        onMapClick={handleEnemyMapClick}
      />
    </Game>
  );
}
