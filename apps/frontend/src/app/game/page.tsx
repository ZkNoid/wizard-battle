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

  const handleEnemyMapClick = () => {
    console.log('Enemy map clicked:');
  };

  const handleAllyMapClick = () => {
    console.log('Ally map clicked:');
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
