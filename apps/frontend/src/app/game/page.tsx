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
import { allSpells } from '../../../../common/stater/spells';
import { useInGameStore } from '@/lib/store/inGameStore';

const PhaserGame = dynamic(
  () => import('@/PhaserGame').then((mod) => mod.PhaserGame),
  {
    ssr: false,
    loading: () => <FullscreenLoader />,
  }
);

export default function GamePage() {
  //  References to the PhaserGame component (game and scene are exposed)
  const { stater, opponentState } = useUserInformationStore();
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
  };

  const handleAllyMapClick = (x: number, y: number) => {
    console.log('Ally map clicked: ', x, y);
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
